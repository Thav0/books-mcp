import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchHybrid, searchVector, type Hit } from "./search.ts";

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

for (const [name, search] of Object.entries(modes)) {
  let found = 0;
  const misses: string[] = [];
  for (const g of golden) {
    const hits = await search(g.question, LIMIT);
    if (hits.some((h) => matches(h, g))) found += 1;
    else misses.push(g.question);
  }
  console.log(`${name}: recall@${LIMIT} = ${found}/${golden.length}`);
  for (const m of misses) console.log(`  miss: ${m}`);
}
