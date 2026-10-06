import { formatHit, searchHybrid, searchVector } from "./search.ts";
import { SHELVES, type Shelf } from "./shelves.ts";

const [question, scope] = process.argv.slice(2);
if (!question) throw new Error('usage: MODE=vector|hybrid node src/query.ts "question" [shelf or book]');

// The optional second argument is a shelf (product, system-design) or one book slug.
const books = !scope ? undefined : Object.hasOwn(SHELVES, scope) ? SHELVES[scope as Shelf] : [scope];
const search = process.env.MODE === "vector" ? searchVector : searchHybrid;
for (const hit of await search(question, 5, books)) {
  console.log(formatHit(hit) + "\n");
}
