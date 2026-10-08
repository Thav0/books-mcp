# Plan: local RAG over product books, exposed to Claude via MCP

Written 2026-09-15, reviewed the same evening (see "Review log" at the end). Goal: query five product engineering books from Claude Code through a local `search_product_knowledge` tool, available in every session on this machine. Skills, content and anything else built from the books are written in the consuming project, not here.

Pipeline: `pdf / epub / srt -> markdown with headings -> chunks (jsonl) -> embeddings + full-text index in SQLite -> MCP server`.

## Decisions

- Everything runs locally. The books are copyrighted and nothing leaves the machine. `data/` is gitignored.
- Ingest is separate from serve. Ingest is a set of one-off scripts, the MCP server only reads what they produced.
- Every stage writes its output to disk (`data/markdown`, `data/chunks`, `data/db`), so a failure in one stage never forces a rerun of the previous one.
- Node 24 runs TypeScript directly, no compile step, no `tsx`. `erasableSyntaxOnly` in tsconfig keeps the code inside what Node can strip.
- Parsing stays in external tools: Marker for PDF (OCR only when the PDF has no text layer), pandoc for EPUB, Whisper output (SRT) for audio. TypeScript orchestrates and cleans, never parses PDFs itself.
- Chunks are cut at headings, never at a fixed size, except inside a single oversized paragraph. Each chunk carries its full heading path.
- Vector store is SQLite + `sqlite-vec`, a single file with no server process. Chroma was rejected for needing a running server.
- SQLite comes from `node:sqlite`, built into Node 24. Verified 2026-09-15 on this machine: `new DatabaseSync(path, { allowExtension: true })` loads `sqlite-vec` 0.1.9 and FTS5 is compiled in. No `better-sqlite3`, no native build for people who clone the repo. `better-sqlite3` stays as the documented fallback if someone's Node build refuses `loadExtension`.
- Embeddings run in-process with `@huggingface/transformers` (ONNX runtime). No Ollama, no daemon, same reasoning as rejecting Chroma. Model: `nomic-ai/nomic-embed-text-v1.5`, 768 dimensions, `dtype: "q8"`. It needs the `search_document: ` prefix at ingest and `search_query: ` at query time. Swap candidate if quality disappoints: `onnx-community/embeddinggemma-300m-ONNX` (also 768 dims, better MTEB score, about twice the size). The model name lives in one constant, and the eval script in step 3d decides. Research 2026-09-15 (report above): keep nomic until 3d exists, then A/B three configs by changing only constants in `embedding.ts`, nomic q8, nomic fp32, EmbeddingGemma q8 with its own prompts (`task: search result | query: ` and `title: <heading path> | text: `). No fp16 on CPU for either model.

The same research flagged a possible gap (nomic card pipeline is mean pooling, then `layer_norm`, then L2 normalize; `embedding.ts` skips `layer_norm`; fastembed issue #204 reported 0.85 cosine disagreement without it) but marked it unresolved, "not documented by Nomic, measure before and after." Measured 2026-09-15 (see gotcha under step 3): using the real `layer_norm` export from `@huggingface/transformers` on this model, this dtype, across 6 texts from a two-word query to a full paragraph, the change in cosine similarity is at most 0.0001, floating point noise, not a real effect. Root cause: this model's per-token hidden states are already LayerNorm'd inside the transformer, so a mean-pooled vector inherits a near-zero mean (measured 0.005 to 0.007 across all 6 texts), and once mean is negligible, `layer_norm` reduces to a per-vector scalar rescale that L2-normalize cancels exactly, regardless of variance. Not adding it, verified no-op for this pipeline. The fastembed disagreement likely traces to something else in their pipeline, not to this model's geometry in `@huggingface/transformers`.
- Retrieval is hybrid: vector KNN plus FTS5 BM25, fused with Reciprocal Rank Fusion in SQL. Product vocabulary is exact-term heavy ("appetite", "betting table", "OKR", "opportunity solution tree"), and BM25 catches the literal term where an embedding only gets the neighbourhood.
- MCP SDK is v2: `@modelcontextprotocol/server` 2.0.0 (spec 2026-07-28), with `serveStdio` from `@modelcontextprotocol/server/stdio` and Zod 4 schemas. Not the v1 `@modelcontextprotocol/sdk` that most tutorials still show. Re-verified 2026-09-15 against npm and the SDK source (`plans/reports/research-260915-2134-mcp-sdk-embedding-chunking.md`): 2.0.0 is the only 2.x release, zod is a plain dependency pinned `^4.2.0`, so the repo adds `zod@^4.2.0` itself and imports `import * as z from "zod/v4"`. Zod 3 typechecks and then fails silently at the first `tools/list`. A tool-only server needs nothing extra for the 2026-07-28 era, `serveStdio` serves both eras by default.
- The pure functions of every stage are exported (`parseSrt`, `promoteHeadings`, `chunkMarkdown`) so a later UI or job worker reuses them, see `docs/ideas/ingest-ui.md`.

## Books

| slug | origin | route | notes |
| --- | --- | --- | --- |
| shape-up | pdf, 176 pages, text layer | Marker | done |
| inspired | pdf, 298 pages, scanned | Marker with OCR, 32 min | done, OCR promoted many section titles to h1 |
| escaping-the-build-trap | pdf, 199 pages, text layer | Marker `--disable_ocr` | done, heading levels skewed to h1 |
| continuous-discovery-habits | epub with styled paragraphs | `epub-to-md.ts` then pandoc | done, 6 / 22 / 99 headings |
| lean-analytics | srt, about one hour of audio, no chapters | `srt-to-md.ts` | done, one h1, 28 timestamped paragraphs |

## Steps

### 0. Repo setup. Done

`package.json` with `"type": "module"`, `tsconfig.json`, `.gitignore`, `src/paths.ts`. Accepted: `node` runs a `.ts` file directly and `pnpm typecheck` passes.

### 1. Parse to Markdown. Done

`src/ingest/srt-to-md.ts`, `src/ingest/epub-to-md.ts`, Marker from the CLI. Accepted: five files under `data/markdown/`, each with real `#` headings, no `<div>`, `<span>` or image references left (Marker page anchors are stripped in step 2).

### 2. Chunk. Done, tuning open

`src/ingest/books.ts` lists books across the two layouts (flat file and Marker folder). `src/ingest/chunk.ts` walks each file, keeps a heading stack, cuts at every heading, packs whole paragraphs up to about 800 tokens, and only sub-splits a single oversized paragraph with `RecursiveCharacterTextSplitter` (400 chars overlap). Output `data/chunks/<slug>.jsonl` with `{ id, book, headings, text, timestamp, tokens }`.

Result on 2026-09-15: 798 chunks, average 240 to 660 tokens per book, max 800.

Accepted when a random chunk can be placed in its chapter from `headings` alone without opening the book.

Tuning backlog, none blocking, revisit only after the eval in 3d shows a problem:
- Tiny chunks under 50 tokens (39 in Shape Up, 14 in the Build Trap book). Root cause is the greedy flush in `packSection`. Fix in this order (research 2026-09-15): balanced packing first, `k = ceil(sectionChars / MAX_CHARS)` chunks of about equal size, which removes most tails; then merge a trailing chunk under 50 tokens into the previous chunk of the same section when the result stays under about 1.15 x MAX_CHARS; then merge a whole section under 50 tokens into the next section's first chunk when they share a parent heading (Docling `merge_peers` behaviour). Drop only fragments under about 15 tokens with no sentence punctuation. Merge, never drop, otherwise.
- Front matter noise (table of contents, copyright, index) becomes chunks. Skip sections by heading pattern if they show up in results. Confirmed in block 3b: querying "difference between outputs and outcomes" filtered to escaping-the-build-trap returns an index-page chunk (heading "O", score 0.634) at rank 5, wedged between real prose hits scoring 0.63-0.68. Not blocking, scores are low and correctly ranked last, but a real example to test any heading-pattern skip against later. Second instance in block 3c: hybrid search for "betting table" (an exact-term match) pulls a **Contents** (table of contents) chunk into rank 4, ahead of two real prose hits, because BM25 matches "Betting Table" literally in the TOC line. Vector-only search on the same query did not surface it. Two independent confirmations now, same fix applies: skip front-matter sections by heading pattern (`Contents`, single-letter index headings) at chunk time. Research 2026-09-15 adds two structural signals that beat string matching: (1) Marker page anchors `<span id="page-N-M">`, which `cleanLine` currently deletes, give every section a page number, and Marker's `_meta.json` `table_of_contents` gives the first and last chapter page, so anything outside that span is front or back matter by construction; (2) for the EPUB, `epub:type` values `toc`, `index`, `frontmatter`, `backmatter` can be dropped in `epub-to-md.ts` before pandoc. Fallback shape score per section: short median line length, lines ending in numbers, lines equal to headings elsewhere in the same book (TOC signature), single-letter alphabetical headings (index). Skip when a heading pattern matches, or when the shape score is high and the section sits in the first or last 15 percent of the book. Log skipped sections as heading plus line count, never text.
- Heading levels from OCR are skewed (Inspired has 47 h1). Metadata reflects the file as is, fix only if citations read wrong. Possible first real signal, block 3d: "feature team vs empowered product team" (an Inspired-specific distinction) misses Inspired entirely in both vector and hybrid top 5. Not confirmed as the cause yet, recheck after any heading or chunk-size change, per the eval baseline above.
- Chunk ids are positional (`book#12`), so re-chunking a book after an edit shifts every id after the change. Fine while embed always rebuilds the whole book. If incremental re-embedding is ever wanted, switch to a content hash: `sha256(book + heading path + normalized text)`, which is what LangChain's indexing API and LlamaIndex's ingestion pipeline do. Rules from the research: include the book slug in the hash input, exclude `timestamp` and `tokens`, keep an `ordinal` column because hashes lose order, drop the later copy when two chunks hash the same (repeated boilerplate), and incremental mode must delete ids in the DB that are missing from the new jsonl for that book or edited paragraphs leave stale vectors. Any chunker change rewrites every id, which is correct.
- `@langchain/textsplitters` pulls `@langchain/core` in for one function that only runs on oversized paragraphs. A 15-line sentence splitter would remove the biggest dependency in the repo. Nice for a public repo, not urgent.

### 3. Embed, store, retrieve. Next

Performance measured on 2026-09-15 with `node:sqlite` + `sqlite-vec` in memory: inserting 800 vectors of 768 floats took 14 ms, a KNN query over them 0.56 ms. Search is never the bottleneck at this corpus size. The only slow stage is computing embeddings on CPU: confirmed 2026-09-15 running `src/ingest/embed.ts` for real, about 150-200 ms/chunk on this machine (continuous-discovery-habits 179 chunks/35s, escaping-the-build-trap 195/43s, inspired 222/37s, lean-analytics 7/1s, shape-up 195/32s), total under 2.5 minutes for all 798 chunks, and it runs once per book.

Gotcha found in the same test: `vec0` with an integer primary key rejects ids passed as JS numbers from `node:sqlite` ("Only integers are allows for primary key values"), because they bind as doubles. Use a text primary key holding the chunk id, which works directly.

Gotcha found validating block 3a.1: the self-test pair in `src/embedding.ts` ("how much time the team is willing to spend on a feature" vs "a recipe for pancakes with blueberries") scores 0.476 vs 0.495 against "what is appetite", nearly tied and inverted. Confirmed this is not a pipeline bug: swapping in blatantly unrelated pairs (chemistry, geography) against the same query scores 0.37-0.39, and a blatant paraphrase of the Shape Up definition scores 0.81, both consistent with the pipeline working correctly (checked dtype q8 vs fp32, batch vs isolated embedding, self-similarity = 1.000, all ruled out as causes). Root cause: "appetite" and "pancake recipe" share surface food vocabulary even though Shape Up's appetite is a time budget, a hard lexical-overlap case for a 137M q8 model at zero shot, not a defect. Judge real retrieval quality with the eval script in 3d, not this pair.

Gotcha found resolving the research pass: tested the real `layer_norm` export from `@huggingface/transformers` (the model card's documented post-pooling step, see the embedding model decision above) against plain `normalize: true` on 6 texts including a full paragraph, not just the one short query vector checked earlier. Raw pooled vector mean stayed 0.005 to 0.007 in every case regardless of text length, and cosine similarity to the query changed by at most 0.0001 with or without `layer_norm`. Confirmed structurally, not a fluke: nomic-bert's per-token output is already LayerNorm'd inside the transformer, so mean-pooling across tokens inherits a near-zero mean, and layer-norming a near-zero-mean vector is a pure per-vector rescale that L2-normalize erases exactly. `embedding.ts` stays as it is, no `layer_norm` added.

Split into four blocks, one per session block, each testable on its own:

**3a. `src/ingest/embed.ts`.** Reads every `data/chunks/*.jsonl`, opens `data/db/books.sqlite`, creates three tables: `chunks` (id text primary key, book, headings json, text, timestamp), `chunks_vec` (`vec0`, `id text primary key, embedding float[768] distance_metric=cosine`), `chunks_fts` (`fts5(id unindexed, headings, text)`). Embeds the string `search_document: <heading path> \n\n <text>` so the vector knows its context. One transaction per book, and a book is deleted and rewritten as a whole. Accepted when `select count(*)` matches the jsonl line count for every book.

**3b. `src/query.ts "some question"`, vector only.** Embeds `search_query: <question>`, runs `where embedding match ? and k = 5`, joins `chunks`, prints book, heading path, distance and the first 200 characters. Accepted when `node src/query.ts "how to define appetite"` returns Shape Up chunks in the top 5.

**3c. Hybrid.** Add the FTS5 query (`bm25()` ordered, top 20), take top 20 from the vector side, fuse with RRF (`score = sum(1 / (60 + rank))`), return the top 5. Compare against 3b on the same questions. Accepted when hybrid is never worse than vector-only on the golden set below, and better on at least one exact-term question.

**3d. `src/eval.ts` and a golden set.** Ten questions with the expected book, and where obvious the expected heading, in `eval/questions.jsonl` (questions and chapter titles only, no book text, so it can be committed). The script prints recall@5 per mode. This is the feedback loop for every tuning decision from here on: chunk size, model swap, RRF constant, tiny chunk merge. Nothing in the backlog gets changed without a before and after number from this script.

Baseline recorded 2026-09-15: vector 9/10, hybrid 9/10, both above the "hybrid never worse" bar. First run was 8/10 both, with one golden question mislabeled: "difference between outputs and outcomes" was assigned to escaping-the-build-trap, but unfiltered search correctly ranked continuous-discovery-habits top 5, its Chapter Three is literally titled "Focusing on Outcomes over Outputs", a more central treatment than Build Trap's. Not a retrieval bug, a bad label, replaced with a Build-Trap-unique question ("what is the value exchange system in a company"). One genuine miss remains in both modes: "difference between a feature team and an empowered product team" (inspired) returns nothing from Inspired in the top 5 at all. Candidate cause: the OCR heading skew already in this backlog (Inspired has 47 h1 headings), worth checking after a heading-pattern or chunk-size change, not before, per the no-change-without-a-number rule above.

### 4. MCP server. Done

`src/server.ts` with `@modelcontextprotocol/server` 2.0.0: `serveStdio(() => { const server = new McpServer({ name: "product-books", version }); server.registerTool("search_product_knowledge", { description, inputSchema: z.object({ query: z.string(), book: z.string().optional(), limit: z.number().int().min(1).max(10).default(5) }) }, handler); return server; })`. The handler calls the same `search()` function `query.ts` uses (export it from a `src/search.ts`, the CLI and the server never duplicate logic) and returns one text block per hit: book, heading path, timestamp when present, then the chunk text.

Performance rules for the server: open the database read-only, load the embedding model lazily on the first call so Claude Code's session start is not delayed, keep both as module-level singletons for the life of the process. Log to stderr only, stdout is the protocol channel.

Handler signature is `async ({ query, book, limit }, ctx)`, invalid arguments never reach it (the SDK answers with an `isError` result). Built and registered 2026-09-15: smoke test (`initialize` + `tools/list` piped over stdin) returned a valid `search_product_knowledge` listing, and the process exited cleanly on stdin EOF without needing a manual `SIGINT`/`handle.close()` handler, so the doc's bare `serveStdio(() => {...})` call was left as written. Server negotiated protocol `2025-11-25` rather than echoing the `2026-07-28` sent, normal version negotiation, not an error. Registered with `claude mcp add --transport stdio product-books -- /Users/gusthvo/.nvm/versions/node/v24.19.0/bin/node "$(pwd)/src/server.ts"` (absolute Node 24 path, this machine's nvm default could differ), `claude mcp list` shows it connected. Accepted when a question about outcomes in a **new** Claude Code session (this one started before registration, MCP servers load at session start) triggers the tool, and the answer cites a book and heading. Live check passed 2026-09-15 in a fresh session: a question about appetite triggered the tool and the answer cited `shape-up > Shape Up > Set Boundaries`. Step 4 accepted.

Scope gotcha found the same night: `claude mcp add` defaults to `--scope local`, which is private to the project directory it was run in, so sessions started in any other repo never saw the server. Re-registered with `--scope user` (`claude mcp remove product-books -s local`, then `claude mcp add --transport stdio --scope user product-books -- <node24> <repo>/src/server.ts`), confirmed with `claude mcp list` from `/private/tmp`. Now every Claude Code session on this machine loads it at start, which is what step 5 needs since skills get authored from other repos. Nothing runs permanently: Claude Code spawns the stdio process when a session starts and kills it when the session ends, there is no daemon to turn on.

### 5. Skills. Out of this repo

Decided 2026-09-15: no skills are authored here. This repo ends at the MCP server. Skills get written inside whichever project the owner is working in, grounded in passages pulled through `search_product_knowledge` from that project's own Claude Code session, because a skill is only useful next to the code and conventions it applies to. Nothing under `.claude/skills/` in this repo, nothing about skills in `README.md`. `ak-skill-creator` and `harness-eval` are consumer-repo concerns.

This is also why step 4 registers the server at user scope: the consumer repo is never this one.

### 6. Publish

Only after step 4 is accepted. Checklist: MIT `LICENSE`, `README.md` already written, confirm `git ls-files` contains nothing from `data/`, `eval/questions.jsonl` holds questions and chapter titles only, `pnpm typecheck` clean, tag `v0.1.0`. Anyone cloning brings their own books; the repo ships the pipeline, not the corpus.

### 7. System design shelf. Done

Added 2026-09-30: five system design books (`designing-data-intensive-applications`, `system-design-interview`, `fundamentals-of-software-architecture`, `software-architecture-the-hard-parts`, `building-evolutionary-architectures`), all PDFs through Marker since the EPUB copies were removed the same evening, go through the same pipeline, to ground daily study lessons generated in a consumer repo. Blocks and checks: `plans/260930-1845-system-design-shelf/instructions.md`. Open decision: split search into a second MCP tool (`search_system_design_knowledge`) or add a shelf filter, so product searches without a `book` filter stay clean. Accepted when the row counts match the jsonl line counts for all five books and a replication question returns DDIA hits.

Progress 2026-09-30 19:37 (owner's status table): `software-architecture-the-hard-parts` 662 chunks and `fundamentals-of-software-architecture` 907 chunks are embedded, jsonl and database counts equal, both converted through the EPUB route before the EPUB copies were removed. `system-design-interview`, `designing-data-intensive-applications` and `building-evolutionary-architectures` are not copied yet.

Progress 2026-09-30 19:50: all five embedded, jsonl and database counts equal: system-design-interview 328, designing-data-intensive-applications 985, software-architecture-the-hard-parts 662, fundamentals-of-software-architecture 907, building-evolutionary-architectures 437 (3,319 chunks, next to 798 product chunks). Next: rerun `eval.ts` to see whether product recall@5 held against the 9/10 baseline, then add 10 system design golden questions for a shelf baseline.

Eval 2026-09-30 19:56, owner's run. Product questions only, mixed index: vector 8/10, hybrid 9/10 (baseline 9/10 both); the new vector miss is "what is the one metric that matters" (lean-analytics has 7 chunks and is the easiest to crowd out), and hybrid, which the MCP server uses, held. With the 10 system design questions added: vector 15/20, hybrid 16/20, so the shelf scores 7/10 in both modes. DDIA, The Hard Parts and Building Evolutionary Architectures are 2/2 each. Misses: both System Design Interview questions (rate limiter, news feed fanout) and FoSA's "identify architecture characteristics". Open question: label problem (heading needles "rate limiter" and "news feed" against headings that may say "rate limiting" or "newsfeed") or ingestion problem (chapter titles missing from SDI heading paths, which would leave every chapter under the same "Step 1" to "Step 4" headings).

Decision 2026-09-30 20:10, owner asked for filtering: shelves. `src/shelves.ts` groups the books (`product`, `system-design`); `search.ts` takes an optional list of books and filters before ranking (vector side: `vec_distance_cosine` over the listed books through a `cross join`, FTS side: a join on `chunks` with `book in (...)`), which also fixes the old post-filter that could return fewer than 5 hits for a small book; `server.ts` registers one tool per shelf (`search_product_knowledge`, `search_system_design_knowledge`) with `book` as an enum of that shelf; `query.ts` takes a shelf or a book as its second argument; `eval.ts` searches each question inside the shelf of its expected book and prints recall per shelf. SQL verified on an in-memory database, `pnpm typecheck` clean. Waiting for the owner's eval numbers.

Eval 2026-09-30 20:20 with shelves: vector 16/20 and hybrid 16/20, product 9/10 in both modes (back to the baseline, only the known Inspired miss), system-design 7/10 in both. Diagnosis from the owner's hit headers (first lines only):
- Both System Design Interview misses were label problems. All 5 hits for the rate limiter question are the right SDI sections ("Token bucket algorithm", "Algorithms for rate limiting", "Sliding window counter algorithm", ...) and all 5 for the fanout question sit under "Fanout service". The needles "rate limiter" and "news feed" failed because SDI heading paths carry no chapter title. Fix: relabel them to "rate limiting" and "fanout" (command handed to the owner the same evening).
- SDI conversion quality (Marker): 205 `#`/`##` headings for a 16-chapter book, no chapter titles in the paths, bold markers kept inside heading text (`**Token bucket algorithm**`), "Pros:" and "Cons:" promoted to headings, odd nesting ("Monitoring > Step 4 - Wrap up"). Retrieval still lands on the right sections, so not blocking. Backlog, each only with a before and after eval: strip `*` emphasis from heading text in `chunk.ts` (affects every Marker book), promote SDI chapter titles above section headings, demote label headings that end with ":".
- The FoSA "identify architecture characteristics" miss is a real retrieval miss, kept as is: the shelf's top 5 are Building Evolutionary Architectures and The Hard Parts chunks (same authors, same vocabulary), and FTS5 has no stemming, so "architecture" does not match FoSA 2nd edition's "architectural". Backlog: try the FTS5 `porter` tokenizer with a before and after eval. Lessons are not affected, because they pass `book` from the roadmap tag.

Accepted 2026-09-30 20:25 after the relabel: vector 18/20 and hybrid 18/20, product 9/10 and system-design 9/10 in both modes. The two misses left are real and known (Inspired feature team, FoSA characteristics). New baseline for any tuning from here. Lessons are generated in the consumer repo `~/Documents/system-design-study`, never here.

Marker 2.0 facts from `marker_single --help` (2026-09-30): tqdm bars are on by default, one per stage, with quiet gaps between stages. `--LayoutBuilder_mode` defaults to `fast` (rf-detr/onnx) on MPS and `balanced` (VLM) on GPU. `--disable_ocr` is the pure text-layer path with no VLM and no inference server, so it is the fast route for any PDF with a text layer. `--page_range 20-29` converts a 10-page probe that shows whether a text layer exists (output size) and how long the full book will take. A user run of about 20 minutes looked stuck, so the blocks now include a `pgrep`/`ps` watcher for a second tab, and `embed.ts` draws a bar with percent, elapsed and time left.

### 8. Grokking shelf. Done

Added 2026-10-08: the owner's DesignGurus course "Grokking the System Design Interview", 62 lessons (the 3 appendix pages are left out), as the book `grokking-system-design-interview` on its own shelf `grokking` with its own tool `search_grokking_knowledge`. The 65 saved HTML lessons were extracted to per-lesson Markdown and JSON under `data/grokking-sdi/` (the extractor lives there on purpose, gitignored, so the public repo never ships a paid-course scraper). `data/grokking-sdi/tools/assemble_book.py` then concatenates the lessons into `data/markdown/grokking-system-design-interview.md` with headings shifted so a chunk path reads course section > lesson > heading. Result: 611 chunks, average 233 tokens, 66 under 50 tokens, embedded in 122 s. A database backup from before the ingestion is `data/db/books.sqlite.bak-261008-0741`.

Decision, the owner asked that the other content must not get poorer: a shelf of its own instead of the system-design shelf, so the existing tools never see these short, keyword-dense chunks. Vector search filters by book before ranking, so it cannot change. The FTS5 text index is table-wide though: BM25 uses the document counts of the whole table, so new rows nudge the text scores of every shelf. Measured with `src/snapshot.ts` on 70 queries against the two old shelves (the 20 golden questions plus 50 in `eval/guard-queries.jsonl`), before and after the ingestion: vector top-10 identical on 70/70 (largest score change 0), hybrid top-5 identical on 69/70, the one change swaps ranks 1 and 2 inside the same five chunks, text-search top-20 changed for 4 of 30 product queries and 2 of 40 system design queries. Eval: product 9/10 and system-design 9/10 unchanged, grokking 16/16 in both modes, with the expected lesson first in 15/16 (hybrid) and 16/16 (vector). If a later ingestion makes the drift visible, the fix is one FTS table per shelf, then a snapshot diff that must show zero changes.

## Commands

```bash
pnpm typecheck
node src/ingest/srt-to-md.ts data/raw/<slug>.srt
node src/ingest/epub-to-md.ts data/raw/<slug>.epub
marker_single data/raw/<slug>.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction [--disable_ocr]
node src/ingest/chunk.ts [slug]
node src/ingest/embed.ts [slug]          # step 3a
node src/query.ts "question"             # step 3b, 3c
node src/eval.ts                         # step 3d
node src/snapshot.ts save <name>         # step 8, ranked ids for 70 queries; save before and after any change to the library
node src/snapshot.ts diff <before> <after>
```

## Review log

2026-09-15 evening, review of the plan before step 3:

- `better-sqlite3` dropped in favour of `node:sqlite`, verified on this machine. One less native module for cloners.
- Embedding provider decided: in-process `@huggingface/transformers`, model `nomic-embed-text-v1.5`. Ollama rejected for the same reason as Chroma (daemon), and it is not installed here.
- Hybrid retrieval (FTS5 + RRF) added as 3c, eval script added as 3d. Both are cheap and they are the part of RAG worth learning, since tuning without a number is guessing.
- MCP SDK version corrected to v2 (`@modelcontextprotocol/server`), API shape recorded in step 4.
- Step 6 (publish) added. `README.md` and `CLAUDE.md` written at the repo root, `docs/rag-primer.md` written as the learning companion.
- 2026-09-15 late, research pass on three open questions, full report in `plans/reports/research-260915-2134-mcp-sdk-embedding-chunking.md`: MCP SDK plan confirmed unchanged (zod dependency detail added), chunk backlog rewritten with structural TOC signals, balanced packing and content-hash rules. Both accepted as written, MCP SDK section has direct npm/source citations and nothing to contradict it yet (step 4 not built), chunk-fix section is deferred backlog either way.
- 2026-09-15 later, the research flagged a possible `layer_norm` gap in `embedding.ts` but marked it unresolved ("measure before and after"). Measured directly with the real `@huggingface/transformers` `layer_norm` export against 6 texts: no measurable effect on this model and dtype (see gotcha under step 3). Plan and code both left as is, this is why research findings get verified against this repo's own output before being treated as an action item, not applied on citation alone.
- Tech Leads Club skills checked: `tlc-plan` can turn any single step here into a task with observable criteria if a step ever feels vague, `harness-eval` is the right audit for step 5. `tlc-discover`, `tlc-implement`, `tlc-spec-lean` and `tlc-spec-driven` add ceremony this five-step learning repo does not need.
