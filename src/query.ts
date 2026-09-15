import { formatHit, searchHybrid, searchVector } from "./search.ts";

const [question, book] = process.argv.slice(2);
if (!question) throw new Error('usage: MODE=vector|hybrid node src/query.ts "question" [book]');

const search = process.env.MODE === "vector" ? searchVector : searchHybrid;
for (const hit of await search(question, 5, book)) {
  console.log(formatHit(hit) + "\n");
}
