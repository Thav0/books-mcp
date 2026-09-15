# Research: MCP server SDK, embedding model, chunk-time fixes

Date: 2026-09-15. Everything below was checked against live sources today unless marked "not verified". Knowledge cutoff of the researcher is June 2026, so anything dated July 2026 or later comes only from the fetched pages.

## 1. MCP server SDK

### Verdict

The plan is correct. `@modelcontextprotocol/server` 2.0.0 is the current stable package, published 2026-07-28, and it is the only 2.x version so far (`dist-tags.latest` is 2.0.0). The `serveStdio` plus `registerTool` plus Zod object shape in the plan matches the official quickstart line for line. Nothing has moved since.

Facts from the npm registry (queried today with `npm view`):

| Package | Latest | Notes |
|---|---|---|
| `@modelcontextprotocol/server` | 2.0.0 | published 2026-07-28, `engines.node >=20`, ESM and CJS builds |
| `@modelcontextprotocol/core` | 2.0.0 | pulled in as a dependency, holds the raw `*Schema` constants |
| `@modelcontextprotocol/sdk` | 1.30.0 | the v1 line, last modified 2026-07-27, still maintained but not what you want |
| `zod` | 4.6.5 | the SDK declares `zod: ^4.2.0` as a regular dependency, not a peer |

Subpath exports confirmed: `.` and `./stdio` (both `import` and `require` conditions).

### Zod version

Zod 4, minimum 4.2.0. The migration guide is explicit that a Zod 3 range "installs and typechecks cleanly under v2 and only fails at runtime, and quietly": tool registration silently fails and the first `tools/list` call breaks. Because zod is a plain dependency of the SDK, add `zod@^4.2.0` to your own `package.json` too so pnpm resolves one copy and you can import it. The official examples import with `import * as z from 'zod/v4'`. With zod 4.x installed, plain `'zod'` is the same API, but follow the docs' specifier to avoid confusion.

### Minimal working example, Node 24, no build step

Node 24.19.0 runs `.ts` files natively and prints no experimental warning (tested today). The official quickstart uses `tsx` only because it targets older Node versions. The repo already uses explicit `.ts` import extensions, which native type stripping requires.

```ts
// src/server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { search } from "./search.ts";

function createServer(): McpServer {
  const server = new McpServer({ name: "product-books", version: "0.1.0" });

  server.registerTool(
    "search_product_knowledge",
    {
      description: "Search five product management books. Returns the best matching passages.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Natural language question"),
        book: z.string().optional().describe("Book slug to restrict the search to"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query, book, limit }) => {
      const hits = await search(query, { book, limit });
      if (hits.length === 0) {
        return { content: [{ type: "text", text: "No matching passages." }] };
      }
      return {
        content: hits.map((hit) => ({ type: "text", text: formatHit(hit) })),
      };
    },
  );

  return server;
}

const handle = serveStdio(createServer);
process.on("SIGINT", () => { void handle.close(); });
console.error("product-books MCP server listening on stdio");
```

Details verified in the SDK source (`packages/server/src/server/serveStdio.ts`):

- `serveStdio(factory, options = {})` is synchronous and returns a `StdioServerHandle` whose `close()` is async.
- The factory receives `{ era: 'legacy' | 'modern' }` and may return a Promise. You can ignore the argument.
- Options: `legacy?: 'serve' | 'reject'` (default `'serve'`), `transport?`, `onerror?`, `maxSubscriptions?`.
- Handler second argument is `ctx` (not `extra` as in v1). `ctx.mcpReq.signal` is the abort signal.
- Invalid arguments never reach the handler. The SDK returns an `isError: true` tool result with a message like `Input validation error: Invalid arguments for tool search: limit: Too big...`.
- Return shape: `{ content: [...], structuredContent?, isError? }`. Content types: `text`, `image`, `audio`, `resource`, `resource_link`.
- Log with `console.error` only. Stdout is the JSON-RPC channel.

### Breaking changes and deprecations to know

From the official v1 to v2 migration guide:

- One package became several: `@modelcontextprotocol/server`, `/client`, `/core`, plus framework adapters `/node`, `/express`, `/hono`, `/fastify`.
- `server.tool()`, `.prompt()`, `.resource()` variadic forms are removed. `registerTool` with a config object is the only form. Passing a raw shape `{ q: z.string() }` as `inputSchema` still works but is marked deprecated. Wrap in `z.object()`.
- `StdioServerTransport` still exists but moved to `@modelcontextprotocol/server/stdio`. `serveStdio` is the documented entry point and handles both protocol eras.
- `SSEServerTransport` and `WebSocketClientTransport` are gone.
- Error classes renamed: `McpError` to `ProtocolError`, `ErrorCode` to `ProtocolErrorCode`.
- Handler registration by schema constant (`setRequestHandler(CallToolRequestSchema, ...)`) became method strings (`setRequestHandler('tools/call', ...)`). Irrelevant when using `McpServer`.
- Deprecated but functional under spec 2026-07-28: `Server.createMessage`, `Server.listRoots`, `Server.sendLoggingMessage`, and the `roots`, `sampling`, `logging` capability fields. Push-style `ctx.mcpReq.elicitInput()` fails on 2026-era connections; the replacement is returning `inputRequired(...)`. None of this touches a tool-only server.
- Spec 2026-07-28 support: the `support-2026-07-28.md` guide states that servers using `registerTool` need no changes to work on either era. On modern connections the SDK adds `ttlMs: 0` and `cacheScope: 'private'` to results automatically. Optional: set `ServerOptions.cacheHints` so clients cache your static tool list. Not needed for one tool.
- Node 20 minimum, ESM only for the examples (the package itself ships CJS too).

The codemod `npx @modelcontextprotocol/codemod@latest v1-to-v2 .` exists but is irrelevant here since nothing was written against v1.

### Registering with Claude Code

The command is unchanged:

```bash
claude mcp add --transport stdio product-books -- node /Users/gusthvo/Documents/product-books-mcp/src/server.ts
claude mcp list
claude mcp get product-books
```

Verified points from the current Claude Code docs:

- `--` is mandatory. Everything after it goes to the child process untouched.
- `--scope local` is the default (stored in `~/.claude.json` for this project). `--scope project` writes `.mcp.json` for sharing, `--scope user` applies everywhere.
- If you use `--env KEY=value`, place another option such as `--transport stdio` between the last `--env` and the server name, or the CLI reads the name as another env pair.
- Claude Code sets `CLAUDE_PROJECT_DIR` in the server's environment. `paths.ts` can keep resolving from `import.meta.dirname`; this is only useful if the server ever runs from another cwd.
- Verification: `claude mcp list` prints `✔ Connected` or `✘ Failed to connect`; `/mcp` inside a session shows the same.
- The Claude Code changelog has no entry about `claude mcp add` changing. Its 2.1.233 entry mentions fixing `subscriptions/listen` streams on "MCP v2 connections", which indicates Claude Code already negotiates the 2026-07-28 era. Either way the server serves both eras by default, so this does not affect you.

One practical trap: Claude Code spawns `node` from its own `PATH`. If the default nvm alias points to a Node older than 22.18, type stripping fails and the server dies on start. Use the absolute Node 24 binary in the command, or run `nvm alias default 24`.

## 2. Embedding model choice

### Verdict

Keep `nomic-ai/nomic-embed-text-v1.5` at `q8` for now, fix one post-processing gap (below), and let the block 3d eval decide whether EmbeddingGemma earns the switch. Two reasons. First, on a 798 chunk corpus with hybrid search, the BM25 half is what catches "appetite", "betting table" and "OKR" as exact terms; the vector half mainly helps paraphrased questions, so model differences are second order here. Second, none of the public numbers compare the two candidates on the same benchmark version, so only your golden set can rank them for this corpus.

### The candidates

| Model | Params | Dims | Context | Retrieval numbers found | ONNX for transformers.js |
|---|---|---|---|---|---|
| nomic-embed-text-v1.5 | 137M, 12 layers | 768 (Matryoshka to 64) | 8192 | MTEB v1 62.28 overall at 768d (card) | official repo: fp32 547 MB, q8 137 MB, int8, uint8, fp16, q4, bnb4, q4f16 |
| onnx-community/embeddinggemma-300m-ONNX | 308M total (about 100M transformer, about 200M vocabulary), 24 layers | 768 (Matryoshka to 128) | 2048 | MTEB English v2 mean 69.67 at 768d (card); no per-task retrieval column published on the card | fp32 1.23 GB, q8 309 MB, q4 197 MB, fp16 617 MB (fp16 unsupported by the model) |
| onnx-community/granite-embedding-english-r2-ONNX | 149M, ModernBERT | 768 | 8192 | MTEB v2 retrieval 56.4, BEIR 53.1 (Granite R2 paper), above bge-base 54.8 and gte-base 55.5 | exists, but only 52 downloads, so barely exercised in transformers.js |

Not in scope by your 300M rule: snowflake-arctic-embed-m-v2.0 (305M, MTEB v2 retrieval 58.4) and Qwen3-Embedding-0.6B.

The 62.28 for nomic is MTEB v1 and the 69.67 for EmbeddingGemma is MTEB English v2. They are not comparable. What can be said with confidence: EmbeddingGemma is the strongest open model at this size on the current leaderboards, and its own card shows the Q8_0 quantization aware checkpoint losing only 0.18 points of mean task score (69.49 vs 69.67), so quantization is not a reason to avoid it.

Cost of switching to EmbeddingGemma, expected rather than measured: twice the layers means roughly twice the per-token CPU time, and the q8 file is 309 MB versus 137 MB. Indexing 798 chunks is a one-off, so the cost that matters is query latency inside an MCP call, which is a single short string either way. The 2048 token context is fine for 800 token chunks.

One genuine fit in EmbeddingGemma's favor: its document prompt is `title: {title | "none"} | text: {content}`, so the heading path slots into the `title` field the model was trained with, instead of being glued onto the text. The query prompt is `task: search result | query: {content}`.

### transformers.js quirks found

nomic-embed-text-v1.5, the one actionable finding. The reference post-processing on the model card is mean pooling, then `layer_norm` over the 768 dims, then truncation (optional), then L2 normalize. Every example on the card (Sentence Transformers, Transformers, Transformers.js) applies `layer_norm`, and the card's Transformers.js snippet is:

```js
import { pipeline, layer_norm } from '@huggingface/transformers';
let embeddings = await extractor(texts, { pooling: 'mean' });
embeddings = layer_norm(embeddings, [embeddings.dims[1]])
    .slice(null, [0, matryoshka_dim])
    .normalize(2, -1);
```

`src/embedding.ts` currently does `{ pooling: "mean", normalize: true }` and skips `layer_norm`. The card shows the step in the Matryoshka context, so it is arguable whether it is required at the full 768 dims, but there is field evidence that it matters: qdrant/fastembed issue #204 reported that nomic vectors produced without the layer norm agreed with the reference vectors at only 0.85 cosine, and fastembed changed its pipeline to add it. Layer norm subtracts each vector's mean across dimensions before L2 normalization, which changes cosine geometry, not just scale. Recommendation: add `layer_norm` between pooling and normalize on both the document and the query side, re-embed (798 chunks, minutes), rerun the sanity check, and keep the sharper of the two configurations once the 3d eval exists. `layer_norm(input, normalized_shape, { eps })` is exported from `@huggingface/transformers` 4.x (confirmed in the API docs).

Other nomic notes: `dtype: "q8"` loads `model_quantized.onnx` (dynamic uint8 weight quantization of the MatMuls). The int8 and uint8 files in the repo are the same size as it. The 8192 token limit is far above your chunks, so no truncation surprises.

EmbeddingGemma. Needs transformers.js 4.x (the repo has ^4.2.0). The bidirectional attention fix and Gemma3 embedding support landed in v4.0.0 on 2026-02-09 (PR #1382); v3 produced wrong embeddings for this model, which is what issue #1418 was about. `fp16` is unsupported by the model itself; use `fp32`, `q8` or `q4`. The model card recommends the `sentence-similarity` or `feature-extraction` pipeline with mean pooling and the prompts above.

Both models on CPU: do not use `fp16`. ONNX Runtime's CPU execution provider falls back to slow paths for fp16 ops, and for EmbeddingGemma the activations overflow.

### Is q8 safe for nomic

Yes, with a caveat about evidence. There is no published quality table for the ONNX q8 export of nomic-embed-text-v1.5. The closest data points are: the official GGUF repo's MSE table where Q8_0 is near the F16 and F32 rows (different quantizer, indicative only), Google's Q8_0 result for EmbeddingGemma losing 0.18 points, and your own 0.81 versus 0.37 to 0.39 separation. Dynamic uint8 quantization of a 137M encoder is the standard safe level. The cheap insurance is a one-line `dtype: "fp32"` run of the same eval; fp32 costs 547 MB on disk and some query latency, nothing else at this corpus size.

### How to decide

Build the golden set and `eval.ts` first (block 3d). Then run the same eval under three embedding configurations by changing only the constants in `embedding.ts`: nomic q8 with `layer_norm`, nomic fp32 with `layer_norm`, EmbeddingGemma q8 with its prompts. All three produce 768 dims, so the `vec0` table needs no schema change. Report recall at 5 for vector only and for hybrid. Switch only if hybrid recall improves.

## 3. Chunk-time fixes

### Are pattern skips and content hashes the standard fixes

Yes on both, with refinements.

Content addressed ids are what the major pipelines do. LangChain's indexing API hashes `page_content` plus the JSON serialization of `metadata` with sorted keys (SHA-1 by default, `sha256`, `sha512`, `blake2b` selectable via `key_encoder`) and uses the hash as the record id; it deduplicates repeated hashes within a batch in order, keeping the first. LlamaIndex's `IngestionPipeline` keeps a map of `doc_id` to document hash and skips a node whose hash is unchanged. Your plan of sha256 over heading path plus text is the same idea.

Heading pattern skips are the common first cut, but pipelines that handle books well use structural signals first and text heuristics second (see below).

### Better front matter, TOC and index detection

Use the signals the converters already give you, in this order.

1. EPUB structure. EPUB 3 marks sections with `epub:type` values from the Structural Semantics Vocabulary: `toc`, `index`, `frontmatter`, `backmatter`, `titlepage`, `copyright-page`, `acknowledgments`, `dedication`, `glossary`, `bibliography`. The nav document also lists `landmarks`. `epub-to-md.ts` can drop those spine items or sections before pandoc sees them. Older EPUB 2 files carry a `toc.ncx` instead, and the guide type there is the equivalent hint.

2. PDF page position via Marker. Marker's markdown carries page anchors as `<span id="page-N-M"></span>`, which `cleanLine` currently deletes. Record the page number before stripping it and store it on the section. Marker also writes `_meta.json` with `table_of_contents` (title, heading level, page id per detected heading). With that you know which page the first chapter starts on and which page the last chapter ends on; any section outside that span is front or back matter by construction, no text patterns needed.

3. Shape heuristics for the remaining cases, computed per section without printing text. A TOC or index section has most of these: median line length under about 60 characters with many lines, a high share of lines ending in a number or containing dot leaders, a high share of lines that exactly equal a heading title found elsewhere in the same book (the self-reference ratio is the strongest TOC signature), a high share of lines with no sentence ending punctuation, and for an index, lines shaped like `term, 12, 45-47` grouped under single-letter headings in alphabetical sequence. Digit density above about 10 percent of characters is another cheap discriminator.

4. Position rule. Combine: skip when the heading matches a pattern list (`Contents`, `Table of Contents`, `Index`, `Copyright`, `Praise for`, `About the Author`, `Notes`, `Bibliography`, `Acknowledgments`, single capital letter), or when the shape score is high and the section sits in the first 15 percent or last 15 percent of the book. Log every skipped section as heading plus line count plus which rule fired, so you can audit skips without reading book text.

An alternative that does not touch the chunker is to stop the FTS side from matching TOC lines by not indexing the `headings` column, but that also removes useful heading matches from real chunks. Skipping at chunk time is the cleaner fix and it also shrinks the index.

### Tiny chunks

Merge, do not drop, unless the fragment is pure noise. The two established implementations:

- Docling `HybridChunker` splits only oversized chunks and then, with `merge_peers=True` (the default), "merges chunks only when possible, i.e. undersized successive chunks with same headings and captions".
- Unstructured `chunk_by_title` uses `combine_text_under_n_chars` to merge sequential small sections so misdetected titles do not produce undersized chunks.

Concrete recipe for `packSection`:

1. Balanced packing instead of greedy flush. Compute `k = ceil(sectionChars / MAX_CHARS)` and target `sectionChars / k` per chunk, so a 3300 character section becomes two chunks of about 1650 instead of 3200 plus 100. This removes most trailing fragments before any merging is needed.
2. Tail merge within a section. If the last chunk is under `MIN_TOKENS` (50 is reasonable, 100 is safer for embedding quality), append it to the previous chunk when the result stays under about 1.15 times `MAX_CHARS`.
3. Peer merge across sections. A section whose whole body is under `MIN_TOKENS` (a heading followed by one sentence, typical after OCR promoted titles to h1) merges into the next section's first chunk when they share the same parent heading. Otherwise it stays as is.
4. Drop only when the text has no sentence ending punctuation and is under about 15 tokens. Those are heading echoes or page furniture.

Keep the timestamp of the first paragraph on merges, as `packSection` already does.

### sha256 id pitfalls

- Duplicates. Two chunks with identical heading path and text hash to the same id and collide on the `chunks` primary key. LangChain drops the later duplicate within a batch. For a book, a repeated identical passage is almost always boilerplate, so dropping is correct. If you ever need both, append an occurrence counter (`#2`) to the hash input for the second and later copies; ids then shift only inside that duplicate group.
- Include the book slug in the hash input. Two books quoting the same passage under the same heading text would otherwise share an id, and `book` is a column you filter on.
- Hash the normalized text you store, after whitespace collapse and cleaning, and exclude volatile fields such as `timestamp` and `tokens`. Otherwise a cosmetic reconversion churns every id.
- Any chunker change (MAX_CHARS, cleaning regex, merge rules) rewrites all ids. That is correct behavior, but it means incremental re-embedding only pays off for source edits, not for pipeline edits. Your current "delete the book and rewrite" is LangChain's `full` cleanup mode and is the right default until incremental is actually needed.
- Incremental mode needs orphan cleanup: after upserting the new jsonl for a book, delete every id in `chunks`, `chunks_vec` and `chunks_fts` that belongs to that book and is not in the new set (LangChain's `scoped_full` semantics). Without this step, edited paragraphs leave stale vectors behind.
- Hash ids lose ordering. Keep an `ordinal` integer column (position within the book) for neighbor expansion, adjacent hit merging, and stable result ordering on ties.
- Length. 64 hex characters is fine as a primary key in SQLite and `vec0`, but 16 characters (64 bits) is collision safe for a corpus of hundreds of thousands of chunks and keeps logs readable. Prefix with the slug for readability: `shape-up#3f9a...`.

## Unresolved

- No source states EmbeddingGemma's MTEB v2 retrieval subscore or nomic v1.5's score on MTEB v2, so the two are not directly comparable from published numbers. The eval decides.
- Whether `layer_norm` changes ranking quality at full 768 dims for nomic is not documented by Nomic; the fastembed report shows it changes the vectors materially. Measure before and after.
- The Claude Code changelog fetch only covered versions 2.1.257 to 2.1.273, so the claim that Claude Code negotiates spec 2026-07-28 rests on one changelog line about "MCP v2 connections". It does not affect the server because `serveStdio` serves both eras by default.

## Sources

- https://www.npmjs.com/package/@modelcontextprotocol/server (versions and dependencies queried via `npm view`)
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/serveStdio.ts
- https://code.claude.com/docs/en/mcp
- https://claude.com/blog/bringing-mcp-2026-07-28-to-claude
- https://www.mcpjam.com/blog/mcp-client-changelog-august-2026
- https://huggingface.co/nomic-ai/nomic-embed-text-v1.5 (card, `modules.json`, `onnx/` tree)
- https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF
- https://github.com/qdrant/fastembed/issues/204
- https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX (card and `onnx/` tree)
- https://huggingface.co/google/embeddinggemma-300m
- https://huggingface.co/blog/embeddinggemma
- https://github.com/huggingface/transformers.js/issues/1418
- https://github.com/huggingface/transformers.js/pull/1382
- https://huggingface.co/docs/transformers.js/guides/dtypes
- https://huggingface.co/docs/transformers.js/api/utils/tensor
- https://arxiv.org/html/2508.21085 (Granite Embedding R2 paper, Tables 2 and 4)
- https://huggingface.co/onnx-community/granite-embedding-english-r2-ONNX
- https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/indexing/api.py
- https://developers.llamaindex.ai/python/framework/module_guides/loading/ingestion_pipeline/
- https://docling-project.github.io/docling/concepts/chunking/
- https://docs.unstructured.io/open-source/core-functionality/chunking
- https://www.w3.org/TR/epub-ssv-11/
- https://github.com/datalab-to/marker (README, output metadata)
