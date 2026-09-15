# product-books-mcp

Local RAG over your own product engineering books, exposed to Claude Code as an MCP tool.

Drop a book in `data/raw/`, run the pipeline, and Claude can answer "how does Shape Up define appetite?" with a passage and a citation, without any text leaving your machine.

## How it works

```
pdf / epub / srt  ->  markdown with headings  ->  chunks (jsonl)  ->  SQLite (vectors + full text)  ->  MCP server
```

1. **Parse.** External tools turn each book into Markdown with real `#` headings: Marker for PDF, pandoc for EPUB, a small script for Whisper subtitles.
2. **Chunk.** Markdown is cut at headings, never at a fixed size, so every chunk carries its chapter path.
3. **Embed and store.** Each chunk gets a vector from a local embedding model and a full-text index row, both in one SQLite file.
4. **Serve.** An MCP server exposes `search_product_knowledge(query, book?, limit)`. Claude Code calls it like any other tool.

Everything runs on your machine. No API keys, no daemon, no vector database server. `data/` is gitignored, so the books never reach git.

New to RAG? Read [docs/rag-primer.md](docs/rag-primer.md) first.

## Requirements

- Node 24 or newer (TypeScript runs directly, no build step) and pnpm.
- For PDF books: [Marker](https://github.com/datalab-to/marker), installed with `uv tool install marker-pdf` (needs Python 3.12 via `uv --python 3.12`).
- For EPUB books: `pandoc` (`brew install pandoc`).
- For audiobooks: any Whisper that outputs `.srt`. On Apple Silicon, `uv tool install mlx-whisper`.

Only the tools for the formats you have are needed.

## Setup

```bash
git clone <this repo>
cd product-books-mcp
pnpm install
mkdir -p data/raw data/markdown data/chunks data/db
```

## Add your books

Copy each book into `data/raw/` as `<slug>.pdf`, `<slug>.epub` or `<slug>.srt`. The slug becomes the book id in citations, so pick something short like `shape-up`.

Then parse each one into `data/markdown/`:

```bash
# PDF with a text layer
marker_single data/raw/<slug>.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr

# Scanned PDF (slow, OCR)
marker_single data/raw/<slug>.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction

# EPUB
node src/ingest/epub-to-md.ts data/raw/<slug>.epub

# Subtitles from an audiobook
node src/ingest/srt-to-md.ts data/raw/<slug>.srt
```

Check the output has real headings. A file with one `#` and nothing else will still work, but citations will only name the book.

## Build the index

```bash
node src/ingest/chunk.ts          # all books, or pass a slug
node src/ingest/embed.ts          # downloads the embedding model on first run
node src/query.ts "how to define appetite"
```

The first `embed` run downloads `nomic-embed-text-v1.5` (a few hundred MB) into the Hugging Face cache. Later runs are offline.

## Use from Claude Code

```bash
claude mcp add --transport stdio --scope user product-books -- "$(which node)" "$(pwd)/src/server.ts"
```

`--scope user` registers the tool for every Claude Code session on this machine, not just this repo, since you never actually ask about your books from inside this repo. Skills and anything else built from the books live in whichever project you're working in, not here.

Claude Code spawns `node` from its own `PATH`. If your default is older than 22.18, it can't strip TypeScript's types and the server dies on start silently, use the absolute path to a Node 24 binary instead of `$(which node)` if that happens.

Restart Claude Code (or open a new session anywhere), then ask a question about your books. The tool returns passages with book, chapter path and, for audio, a timestamp.

## Status

| step | state |
| --- | --- |
| parse to markdown | done |
| chunk at headings | done |
| embed, store, hybrid search | done, recall@5 = 9/10 |
| MCP server | done |

The detailed plan, with every decision and why, is in `plans/260915-2036-product-books-rag/plan.md`.

## Layout

```
src/paths.ts            data/ folder constants
src/ingest/             one script per stage, pure functions exported
src/query.ts            search from the terminal
src/server.ts           MCP server (step 4)
eval/questions.jsonl    golden questions for recall checks (step 3d)
docs/                   primer and ideas
plans/                  the plan and its review log
```

## License

MIT. The pipeline is yours to reuse. The books you feed it stay yours and are never part of this repo.
