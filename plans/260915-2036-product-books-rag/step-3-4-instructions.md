# Instructions: step 3 (embed, store, retrieve) and step 4 (MCP server)

Written 2026-09-15. One block at a time. Run the check at the end of each block before starting the next. If a check fails, stop and bring the output to the session.

All commands assume the repo root:

```bash
cd /Users/gusthvo/Documents/product-books-mcp
```

---

## Block 3a.1: the embedding model, alone

### Concept

An embedding model is a function `text -> Float32Array(768)`. Texts with similar meaning produce vectors that point in similar directions. The same model must be used for chunks at ingest and for questions at query time, otherwise the vectors are not comparable.

Nomic wants a prefix that says which side the text is on: `search_document: ` for chunks, `search_query: ` for questions. `normalize: true` scales every vector to length 1, so the dot product of two vectors is their cosine similarity (1 means same direction, 0 means unrelated).

React analogy: the loaded model is a module-level singleton, like an API client created once and reused across calls. `??=` is the lazy init, the model loads on the first call, not at import.

### Do

```bash
pnpm add @huggingface/transformers
```

pnpm blocks native build scripts by default (`onnxruntime-node`, `protobufjs`, `sharp` here). It writes a `pnpm-workspace.yaml` stub with an `allowBuilds` section, values need to be `true` before `pnpm install` will run them. `package.json`'s old `pnpm.onlyBuiltDependencies` field is no longer read by this pnpm version.

Create `src/embedding.ts`:

```ts
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const MODEL = "nomic-ai/nomic-embed-text-v1.5";
export const DIMENSIONS = 768;

let extractor: FeatureExtractionPipeline | null = null;

async function load(): Promise<FeatureExtractionPipeline> {
  extractor ??= await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  return extractor;
}

async function embed(texts: string[]): Promise<Float32Array[]> {
  const model = await load();
  const output = await model(texts, { pooling: "mean", normalize: true });
  const data = output.data as Float32Array;
  return texts.map((_, i) => data.slice(i * DIMENSIONS, (i + 1) * DIMENSIONS));
}

export function embedDocuments(texts: string[]): Promise<Float32Array[]> {
  return embed(texts.map((text) => `search_document: ${text}`));
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const [vector] = await embed([`search_query: ${text}`]);
  return vector!;
}

if (process.argv[1] === import.meta.filename) {
  const dot = (a: Float32Array, b: Float32Array) => a.reduce((sum, v, i) => sum + v * b[i]!, 0);
  const t0 = performance.now();
  const [related, unrelated] = await embedDocuments([
    "how much time the team is willing to spend on a feature",
    "a recipe for pancakes with blueberries",
  ]);
  const question = await embedQuery("what is appetite");
  console.log(`dims ${question.length}, ${(performance.now() - t0).toFixed(0)} ms including model load`);
  console.log(`similarity to the related text:   ${dot(question, related!).toFixed(3)}`);
  console.log(`similarity to the unrelated text: ${dot(question, unrelated!).toFixed(3)}`);
}
```

```bash
node src/embedding.ts
pnpm typecheck
```

The first run downloads the model (a few hundred MB) into `node_modules/@huggingface/transformers/.cache/`. Later runs are offline.

### Check

- `dims 768`.
- Similarity to the related text is clearly higher than to the unrelated one (expect something like 0.6 vs 0.3).
- `pnpm typecheck` is clean.

If the download fails with a message about a missing quantized file, remove `{ dtype: "q8" }` and run again. Report which one worked.

### Question to think about

Why does `embedQuery` use a different prefix than `embedDocuments`, when both go through the same model?

---

## Block 3a.2: the database and the embed script

### Concept

One SQLite file, three tables, all keyed by the chunk id:

- `chunks`: the normal table with text and metadata. This is what you show to the user.
- `chunks_vec`: a `vec0` virtual table from `sqlite-vec`, holding one 768-float vector per chunk. This is what you search by meaning.
- `chunks_fts`: an FTS5 virtual table, holding the same text tokenised for keyword search. This is what you search by exact term (block 3c).

The text embedded is heading path plus chunk text, so the vector knows its chapter. A book is always rewritten as a whole: delete its rows in the three tables, then insert again. No partial updates, no id drift.

React analogy: `chunks` is the normalised entity store, the other two are derived indexes, like a memoised selector. If the source changes, rebuild the derived data.

Gotcha found in testing: with `node:sqlite`, `vec0` rejects an integer primary key passed as a JS number (it binds as a double). A text primary key with the chunk id works directly.

### Do

```bash
pnpm add sqlite-vec
mkdir -p data/db
```

Add one line to `src/paths.ts`:

```ts
export const DATA_DB = resolve(ROOT, "data/db");
```

Create `src/db.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import * as sqliteVec from "sqlite-vec";
import { DATA_DB } from "./paths.ts";
import { DIMENSIONS } from "./embedding.ts";

export const DB_PATH = resolve(DATA_DB, "books.sqlite");

export function openDatabase(options: { readOnly?: boolean } = {}): DatabaseSync {
  const db = new DatabaseSync(DB_PATH, { allowExtension: true, readOnly: options.readOnly ?? false });
  sqliteVec.load(db);
  return db;
}

export function createSchema(db: DatabaseSync): void {
  db.exec(`
    create table if not exists chunks (
      id text primary key,
      book text not null,
      headings text not null,
      text text not null,
      timestamp text,
      tokens integer not null
    );
    create index if not exists chunks_book on chunks(book);
    create virtual table if not exists chunks_vec using vec0(
      id text primary key,
      embedding float[${DIMENSIONS}] distance_metric=cosine
    );
    create virtual table if not exists chunks_fts using fts5(id unindexed, headings, text);
  `);
}
```

Create `src/ingest/embed.ts`:

```ts
import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createSchema, openDatabase } from "../db.ts";
import { embedDocuments } from "../embedding.ts";
import { DATA_CHUNKS } from "../paths.ts";
import type { Chunk } from "./chunk.ts";

const BATCH = 16;

async function listChunkFiles(onlySlug?: string): Promise<{ slug: string; path: string }[]> {
  const names = (await readdir(DATA_CHUNKS)).filter((n) => n.endsWith(".jsonl"));
  return names
    .map((n) => ({ slug: basename(n, ".jsonl"), path: resolve(DATA_CHUNKS, n) }))
    .filter((f) => !onlySlug || f.slug === onlySlug)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function readChunks(path: string): Promise<Chunk[]> {
  const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line) as Chunk);
}

export async function embedBook(db: ReturnType<typeof openDatabase>, slug: string, chunks: Chunk[]): Promise<void> {
  const insertChunk = db.prepare(
    "insert into chunks (id, book, headings, text, timestamp, tokens) values (?, ?, ?, ?, ?, ?)",
  );
  const insertVec = db.prepare("insert into chunks_vec (id, embedding) values (?, ?)");
  const insertFts = db.prepare("insert into chunks_fts (id, headings, text) values (?, ?, ?)");
  const deleteVec = db.prepare("delete from chunks_vec where id = ?");
  const deleteFts = db.prepare("delete from chunks_fts where id = ?");

  db.exec("begin");
  try {
    const old = db.prepare("select id from chunks where book = ?").all(slug) as { id: string }[];
    for (const { id } of old) {
      deleteVec.run(id);
      deleteFts.run(id);
    }
    db.prepare("delete from chunks where book = ?").run(slug);

    for (let start = 0; start < chunks.length; start += BATCH) {
      const batch = chunks.slice(start, start + BATCH);
      const vectors = await embedDocuments(batch.map((c) => `${c.headings.join(" > ")}\n\n${c.text}`));
      batch.forEach((c, i) => {
        const headings = c.headings.join(" > ");
        insertChunk.run(c.id, c.book, JSON.stringify(c.headings), c.text, c.timestamp, c.tokens);
        insertVec.run(c.id, vectors[i]!);
        insertFts.run(c.id, headings, c.text);
      });
      process.stderr.write(`\r${slug}: ${Math.min(start + BATCH, chunks.length)}/${chunks.length}`);
    }
    db.exec("commit");
    process.stderr.write("\n");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

async function main(onlySlug?: string): Promise<void> {
  const files = await listChunkFiles(onlySlug);
  if (!files.length) throw new Error(`no chunk file found${onlySlug ? ` for "${onlySlug}"` : ""}`);

  const db = openDatabase();
  createSchema(db);
  for (const file of files) {
    const chunks = await readChunks(file.path);
    const t0 = performance.now();
    await embedBook(db, file.slug, chunks);
    console.log(`${file.slug}: ${chunks.length} chunks in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
  db.close();
}

if (process.argv[1] === import.meta.filename) {
  await main(process.argv[2]);
}
```

Run one book first, then all:

```bash
node src/ingest/embed.ts shape-up
node src/ingest/embed.ts
pnpm typecheck
```

### Check

Row counts must match the jsonl line counts, book by book:

```bash
wc -l data/chunks/*.jsonl
node -e '
const { DatabaseSync } = require("node:sqlite");
const sqliteVec = require("sqlite-vec");
const db = new DatabaseSync("data/db/books.sqlite", { allowExtension: true, readOnly: true });
sqliteVec.load(db);
console.log(db.prepare("select book, count(*) n from chunks group by book").all());
console.log(db.prepare("select (select count(*) from chunks) c, (select count(*) from chunks_vec) v, (select count(*) from chunks_fts) f").get());
'
```

- Every book count equals its `wc -l` line count.
- `c`, `v` and `f` are equal (798 on the run from 2026-09-15).
- Note the seconds per book. That number goes in the plan.

### Question to think about

Why delete and reinsert the whole book instead of updating changed chunks? What would you need to store to make updates safe?

---

## Block 3b: vector search from the terminal

### Concept

Retrieval is: embed the question, ask `vec0` for the k nearest vectors, join back to `chunks` for the text. `distance` is cosine distance, 0 means identical direction, so lower is better.

The search function lives in `src/search.ts` and is exported. `query.ts` is only a thin CLI over it. In step 4 the MCP server calls the same function. CLI and server never duplicate logic, same rule as the ingest scripts.

The optional `book` filter over-fetches (k times 5) and filters in JS. Simple and correct for five books.

### Do

Create `src/search.ts`:

```ts
import { openDatabase } from "./db.ts";
import { embedQuery } from "./embedding.ts";

export type Hit = {
  id: string;
  book: string;
  headings: string[];
  text: string;
  timestamp: string | null;
  score: number;
};

type Row = { id: string; book: string; headings: string; text: string; timestamp: string | null; distance: number };

let db: ReturnType<typeof openDatabase> | null = null;
function getDb() {
  db ??= openDatabase({ readOnly: true });
  return db;
}

export async function searchVector(query: string, limit = 5, book?: string): Promise<Hit[]> {
  const k = Math.trunc(book ? limit * 5 : limit);
  const rows = getDb()
    .prepare(
      `select c.id, c.book, c.headings, c.text, c.timestamp, v.distance
       from chunks_vec v join chunks c on c.id = v.id
       where v.embedding match ? and k = ${k}
       order by v.distance`,
    )
    .all(await embedQuery(query)) as Row[];

  return rows
    .filter((r) => !book || r.book === book)
    .slice(0, limit)
    .map((r) => ({ ...r, headings: JSON.parse(r.headings) as string[], score: 1 - r.distance }));
}

export function formatHit(hit: Hit): string {
  const where = [hit.book, ...hit.headings].join(" > ");
  const time = hit.timestamp ? ` @ ${hit.timestamp}` : "";
  return `[${hit.score.toFixed(3)}] ${where}${time}\n${hit.text.slice(0, 200).replace(/\s+/g, " ")}...`;
}
```

Create `src/query.ts`:

```ts
import { formatHit, searchVector } from "./search.ts";

const [question, book] = process.argv.slice(2);
if (!question) throw new Error('usage: node src/query.ts "question" [book]');

for (const hit of await searchVector(question, 5, book)) {
  console.log(formatHit(hit) + "\n");
}
```

```bash
node src/query.ts "how to define appetite"
node src/query.ts "what is an opportunity solution tree"
node src/query.ts "difference between outputs and outcomes" escaping-the-build-trap
pnpm typecheck
```

### Check

- The appetite question returns Shape Up in the top 5.
- The opportunity solution tree question returns Continuous Discovery Habits near the top.
- The book filter returns only that book.
- Note any result that looks like front matter (table of contents, copyright). That feeds the chunk tuning backlog.

---

## Block 3c: hybrid search

### Concept

Vectors catch paraphrase but blur exact terms. BM25 (what FTS5 computes) is the opposite: it rewards documents containing the literal rare words of the query. Hybrid search runs both and merges the two rankings with Reciprocal Rank Fusion: each result gets `1 / (60 + rank)` from every list it appears in, summed. Ranks, not scores, so the two scales never need to agree. A chunk that is top 3 in both lists floats above one that is top 1 in only one.

FTS5 has its own query syntax (`AND`, `NOT`, `*`), so user text must be quoted word by word before it is passed as a match expression.

React analogy: two independent filters on the same list, then a merge that boosts items present in both.

### Do

Add to `src/search.ts`:

```ts
const RRF_K = 60;

function toFtsQuery(text: string): string {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.map((w) => `"${w}"`).join(" ");
}

function searchFtsIds(query: string, limit: number): string[] {
  const fts = toFtsQuery(query);
  if (!fts) return [];
  const rows = getDb()
    .prepare(`select id from chunks_fts where chunks_fts match ? order by rank limit ${Math.trunc(limit)}`)
    .all(fts) as { id: string }[];
  return rows.map((r) => r.id);
}

async function searchVectorIds(query: string, limit: number): Promise<string[]> {
  const rows = getDb()
    .prepare(`select id from chunks_vec where embedding match ? and k = ${Math.trunc(limit)} order by distance`)
    .all(await embedQuery(query)) as { id: string }[];
  return rows.map((r) => r.id);
}

export async function searchHybrid(query: string, limit = 5, book?: string): Promise<Hit[]> {
  const pool = book ? limit * 8 : limit * 4;
  const lists = [await searchVectorIds(query, pool), searchFtsIds(query, pool)];

  const scores = new Map<string, number>();
  for (const ids of lists) {
    ids.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1)));
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const select = getDb().prepare("select id, book, headings, text, timestamp from chunks where id = ?");
  const hits: Hit[] = [];
  for (const [id, score] of ranked) {
    const row = select.get(id) as Omit<Row, "distance"> | undefined;
    if (!row || (book && row.book !== book)) continue;
    hits.push({ ...row, headings: JSON.parse(row.headings) as string[], score });
    if (hits.length === limit) break;
  }
  return hits;
}
```

Change `src/query.ts` to pick the mode from an environment variable, so both stay comparable:

```ts
import { formatHit, searchHybrid, searchVector } from "./search.ts";

const [question, book] = process.argv.slice(2);
if (!question) throw new Error('usage: MODE=vector|hybrid node src/query.ts "question" [book]');

const search = process.env.MODE === "vector" ? searchVector : searchHybrid;
for (const hit of await search(question, 5, book)) {
  console.log(formatHit(hit) + "\n");
}
```

```bash
MODE=vector node src/query.ts "betting table"
MODE=hybrid node src/query.ts "betting table"
MODE=vector node src/query.ts "how should a team decide how much time to invest"
MODE=hybrid node src/query.ts "how should a team decide how much time to invest"
pnpm typecheck
```

### Check

- The exact-term question ("betting table") is at least as good in hybrid, likely better.
- The paraphrase question is not worse in hybrid.
- RRF scores are small numbers (around 0.03), that is normal.

### Question to think about

What happens to hybrid if the question contains a word that appears in every chunk, like "product"? Why does BM25 not care much?

---

## Block 3d: the golden set and the eval script

### Concept

Every knob from here (chunk size, model, RRF constant, tiny chunk merge) changes results in ways you cannot judge by eye. A golden set is ten questions where you know which book, and ideally which chapter, holds the answer. `recall@5` is the share of questions whose expected source shows up in the top 5. Run it before and after every change. No number, no change.

React analogy: a snapshot test for search. Cheap to write, and the only thing that stops "it looks better" arguments.

The file holds questions and chapter titles only, never passage text, so it can be committed.

### Do

Create `eval/questions.jsonl`, one JSON object per line. Write your own ten. Format:

```json
{"question": "how to define appetite", "book": "shape-up", "heading": "Appetite"}
{"question": "what is an opportunity solution tree", "book": "continuous-discovery-habits"}
```

`heading` is optional and matched case-insensitively as a substring of any level of the heading path.

Create `src/eval.ts`:

```ts
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
```

```bash
node src/eval.ts
pnpm typecheck
```

### Check

- Both modes print a recall line.
- Hybrid is greater than or equal to vector. If not, bring the misses to the session.
- Record both numbers in the plan under step 3d. They are the baseline for every future tuning.

Step 3 is accepted here.

---

## Block 4: the MCP server

### Concept

MCP is JSON-RPC over stdio. Claude Code launches your script as a child process, writes requests to its stdin, reads responses from its stdout. Two consequences: never `console.log` in the server (stdout is the protocol channel, use `console.error`), and the process lives for the whole session, so the model and database are loaded once and reused.

The tool is one function with a Zod schema. The SDK validates every call before your handler runs. Your handler is `searchHybrid` plus formatting. React analogy: an API route handler with a validated body.

The model loads lazily on the first call, so Claude Code's session start is not delayed.

### Do

```bash
pnpm add @modelcontextprotocol/server zod
```

Create `src/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { searchHybrid } from "./search.ts";

const BOOKS_HINT = "slug of one book, e.g. shape-up, inspired, escaping-the-build-trap, continuous-discovery-habits, lean-analytics";

serveStdio(() => {
  const server = new McpServer({ name: "product-books", version: "0.1.0" });

  server.registerTool(
    "search_product_knowledge",
    {
      description:
        "Search a local library of product engineering books. Returns the most relevant passages with book, chapter path and, for audio sources, a timestamp. Use it whenever a question touches product discovery, prioritisation, shaping work, outcomes, metrics or product management practice.",
      inputSchema: z.object({
        query: z.string().min(2).describe("The question or topic, in natural language"),
        book: z.string().optional().describe(`Restrict to one book. ${BOOKS_HINT}`),
        limit: z.number().int().min(1).max(10).default(5),
      }),
    },
    async ({ query, book, limit }) => {
      const hits = await searchHybrid(query, limit, book);
      if (!hits.length) return { content: [{ type: "text", text: "No passages found." }] };
      return {
        content: hits.map((hit) => {
          const where = [hit.book, ...hit.headings].join(" > ");
          const time = hit.timestamp ? ` @ ${hit.timestamp}` : "";
          return { type: "text" as const, text: `Source: ${where}${time}\n\n${hit.text}` };
        }),
      };
    },
  );

  return server;
});
```

Smoke test by hand before registering. Paste the two lines below into the running process, one at a time:

```bash
node src/server.ts
```

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2026-07-28","capabilities":{},"clientInfo":{"name":"manual","version":"0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

Expect a JSON response to each, the second listing `search_product_knowledge`. Ctrl+C to stop.

If the import of `@modelcontextprotocol/server/stdio` or `zod/v4` fails, check the current shape at https://ts.sdk.modelcontextprotocol.io/v2/ before changing anything else. Bring the error to the session.

Register in Claude Code:

```bash
claude mcp add product-books -- node "$(pwd)/src/server.ts"
claude mcp list
```

Open a new Claude Code session in any folder and ask: "According to Shape Up, what is appetite and how is it different from an estimate?"

### Check

- `claude mcp list` shows `product-books` as connected.
- The question triggers the tool (visible in the session) and the answer names the book and a chapter.
- A question about something outside the books does not trigger it, or the tool returns nothing useful and Claude says so.

Step 4 is accepted here. Next is step 5 (skills), in a separate instruction file when you get there.
