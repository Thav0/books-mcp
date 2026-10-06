import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchHybrid, searchVector, type Hit } from "./search.ts";
import { SHELVES, shelfOf } from "./shelves.ts";

type Golden = { question: string; book: string; heading?: string };

const LIMIT = 5;
const path = resolve(import.meta.dirname, "../eval/questions.jsonl");
const golden = (await readFile(path, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as Golden);

function matches(hit: Hit, g: Golden): boolean {
  if (hit.book !== g.book) return false;
  if (!g.heading) return true;
  const needle = g.heading.toLowerCase();
  return hit.headings.some((h) => h.toLowerCase().includes(needle));
}

const modes = { vector: searchVector, hybrid: searchHybrid } as const;

// Each question is searched inside the shelf of its expected book, the same way each MCP tool searches.
for (const [name, search] of Object.entries(modes)) {
  const tally = new Map<string, { found: number; total: number }>();
  const misses: string[] = [];
  for (const g of golden) {
    const shelf = shelfOf(g.book);
    const hits = await search(g.question, LIMIT, shelf ? SHELVES[shelf] : undefined);
    const found = hits.some((h) => matches(h, g));
    const key = shelf ?? "no shelf";
    const t = tally.get(key) ?? { found: 0, total: 0 };
    tally.set(key, { found: t.found + (found ? 1 : 0), total: t.total + 1 });
    if (!found) misses.push(g.question);
  }
  const perShelf = [...tally].map(([shelf, t]) => `${shelf} ${t.found}/${t.total}`).join(", ");
  console.log(`${name}: recall@${LIMIT} = ${golden.length - misses.length}/${golden.length} (${perShelf})`);
  for (const m of misses) console.log(`  miss: ${m}`);
}
