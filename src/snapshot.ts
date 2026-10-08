import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchFtsIds, searchHybrid, searchVector } from "./search.ts";
import { SHELVES, shelfOf, type Shelf } from "./shelves.ts";

// Ranking snapshot. Before a change to the library (a new book, a chunker tweak, a model swap) save the
// ranked ids for a fixed set of queries, save again after, then diff. Only the guarded shelves are
// searched, so adding a shelf never changes the query set. Ids and scores only, never book text.
//   node src/snapshot.ts save before
//   node src/snapshot.ts diff before after
const GUARDED: readonly Shelf[] = ["product", "system-design"];
const ROOT = resolve(import.meta.dirname, "..");
const DIR = resolve(ROOT, "data/snapshots");
const TOP = 10;
const FTS_TOP = 20;

type Ranked = { id: string; score: number }[];
type Item = { query: string; shelf: Shelf; vector: Ranked; hybrid: Ranked; fts: string[] };

async function readJsonl<T>(file: string): Promise<T[]> {
  return (await readFile(resolve(ROOT, file), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

async function loadQueries(): Promise<{ query: string; shelf: Shelf }[]> {
  const golden = await readJsonl<{ question: string; book: string }>("eval/questions.jsonl");
  const guard = await readJsonl<{ query: string; shelf: Shelf }>("eval/guard-queries.jsonl");
  const fromGolden = golden.flatMap((g) => {
    const shelf = shelfOf(g.book);
    return shelf && GUARDED.includes(shelf) ? [{ query: g.question, shelf }] : [];
  });
  return [...fromGolden, ...guard.filter((g) => GUARDED.includes(g.shelf))];
}

async function save(name: string): Promise<void> {
  const items: Item[] = [];
  for (const { query, shelf } of await loadQueries()) {
    const books = SHELVES[shelf];
    const ranked = (hits: { id: string; score: number }[]): Ranked => hits.map((h) => ({ id: h.id, score: h.score }));
    items.push({
      query,
      shelf,
      vector: ranked(await searchVector(query, TOP, books)),
      hybrid: ranked(await searchHybrid(query, TOP, books)),
      fts: searchFtsIds(query, FTS_TOP, books),
    });
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(resolve(DIR, `${name}.json`), JSON.stringify(items));
  console.log(`saved ${items.length} queries to data/snapshots/${name}.json`);
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);
const ids = (r: Ranked, n: number) => r.slice(0, n).map((h) => h.id);

async function diff(beforeName: string, afterName: string): Promise<void> {
  const load = async (n: string) => JSON.parse(await readFile(resolve(DIR, `${n}.json`), "utf8")) as Item[];
  const [before, after] = [await load(beforeName), await load(afterName)];
  if (before.length !== after.length) throw new Error(`query sets differ: ${before.length} vs ${after.length}`);

  const rows = new Map<string, Record<string, number>>();
  const changed: string[] = [];
  let maxVectorDrift = 0;
  before.forEach((b, i) => {
    const a = after[i]!;
    const row = rows.get(b.shelf) ?? { queries: 0, vector10: 0, hybrid5: 0, hybrid10: 0, fts20: 0, fts5: 0 };
    row.queries! += 1;
    row.vector10! += same(ids(b.vector, TOP), ids(a.vector, TOP)) ? 1 : 0;
    row.hybrid5! += same(ids(b.hybrid, 5), ids(a.hybrid, 5)) ? 1 : 0;
    row.hybrid10! += same(ids(b.hybrid, TOP), ids(a.hybrid, TOP)) ? 1 : 0;
    row.fts20! += same(b.fts, a.fts) ? 1 : 0;
    row.fts5! += same(b.fts.slice(0, 5), a.fts.slice(0, 5)) ? 1 : 0;
    rows.set(b.shelf, row);
    b.vector.forEach((h, r) => (maxVectorDrift = Math.max(maxVectorDrift, Math.abs(h.score - (a.vector[r]?.score ?? Infinity)))));
    if (!same(ids(b.hybrid, 5), ids(a.hybrid, 5))) {
      changed.push(`  [${b.shelf}] "${b.query}"\n    before: ${ids(b.hybrid, 5).join(" ")}\n    after:  ${ids(a.hybrid, 5).join(" ")}`);
    }
  });

  for (const [shelf, r] of rows) {
    console.log(
      `${shelf}: ${r.queries} queries | identical vector top-10 ${r.vector10}, hybrid top-5 ${r.hybrid5}, hybrid top-10 ${r.hybrid10}, text-search top-5 ${r.fts5}, top-20 ${r.fts20}`,
    );
  }
  console.log(`largest vector score change: ${maxVectorDrift.toExponential(2)}`);
  console.log(changed.length ? `hybrid top-5 changed for ${changed.length} queries:\n${changed.join("\n")}` : "hybrid top-5 identical for every query");
}

if (process.argv[1] === import.meta.filename) {
  const [command, a, b] = process.argv.slice(2);
  if (command === "save" && a) await save(a);
  else if (command === "diff" && a && b) await diff(a, b);
  else throw new Error("usage: node src/snapshot.ts save <name> | diff <before> <after>");
}
