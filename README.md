# books-mcp

A local search index for knowledge you own, served to AI tools through MCP.

Put in books, courses, talks or notes, and the pipeline builds a search index from them on your machine. Claude Code, or any other MCP client, can then ask "how does Shape Up define appetite?" and get back the passages that answer it, with the source and the chapter path. Your files are never uploaded.

It started as a tool for product engineering books. Today it works for any text that is useful to you: if you can turn it into Markdown with headings, it can go in.

## Why use it

- **Your sources stay yours.** Parsing, indexing and search all run on your machine, with no API keys and no upload. The only text that reaches a model is the few passages a search returns.
- **Answers you can check.** Every passage comes with its source and chapter path, and with a timestamp for audio. The model can cite it, and you can open the original at the right place.
- **A small prompt, not a whole book.** The model gets about five passages of up to 800 tokens each, so the answer stays focused and the cost stays low.
- **Knowledge the model does not have.** Private, new or niche material, such as your own books, course notes or internal documents, becomes something an AI tool can use.
- **It finds the idea and the exact word.** Vector search catches a paraphrase, and full-text search catches an exact term such as a name or an acronym. The two rankings are merged.
- **One index, many tools.** Build it once, and every MCP client, script or program can use it. The data is in open formats, JSONL and SQLite.
- **Easy to run and to grow.** It is one SQLite file with no daemon and no vector database server. Shelves keep subjects apart, and the eval and snapshot checks show if a new source made the old ones worse.

## Ways to use it

- **Ask your library.** In Claude Code or another MCP client, ask "how does Shape Up define appetite?" and get the passage, the chapter and the source back.
- **Ground what you write in sources.** Write lessons, summaries, study notes or documentation that cite a book and a chapter instead of the model's memory. The author writes study lessons in another project that call the search tool for the passages they need.
- **Compare sources.** Ask the same question once per book with the `book` option, then compare what each one says.
- **Study from a course or a talk.** Index lecture subtitles and saved course pages, then ask questions, ask for a quiz, or find the moment in a recording, because audio results carry a timestamp.
- **Search your own notes and documents.** Meeting transcripts, runbooks, design documents or saved web pages are searchable as soon as they are Markdown. It is a single-user tool, so each person runs their own copy.
- **Build on top of it.** Read the JSONL chunks in your own scripts, for example to make flashcards or a static site, or import the search functions into an app. A skill or an agent can be grounded in one method book by calling the tool for the passages it needs.

The technical routes are in "Let other tools use the knowledge" below.

## How it works

```
pdf / epub / srt / any text  ->  markdown with headings  ->  chunks (jsonl)  ->  SQLite (vectors + full text)  ->  MCP server
```

1. **Parse.** Each source becomes one Markdown file with real `#` headings. Marker reads PDF, pandoc reads EPUB and many other formats, and a small script reads Whisper subtitles.
2. **Chunk.** The Markdown is cut at headings, never at a fixed size, so every chunk carries its chapter path.
3. **Embed and store.** Each chunk gets a vector from a local embedding model and a row in a full-text index. Both live in one SQLite file.
4. **Serve.** An MCP server offers one search tool per shelf. A shelf is a group of sources, for example "product books" or "system design". A search only looks inside its shelf, so a new subject does not compete with the old ones for the top results.

The whole pipeline and the server run on your machine. There are no API keys, no daemon and no vector database server. The folder `data/` is gitignored, so your sources never reach git.

New to RAG? Read [docs/rag-primer.md](docs/rag-primer.md) first.

## What can go in

| Source | How it becomes Markdown |
| --- | --- |
| PDF | Marker, with or without OCR |
| EPUB | `src/ingest/epub-to-md.ts`, which uses pandoc |
| Subtitles from audio or video | `src/ingest/srt-to-md.ts`, for any Whisper that writes `.srt` |
| Web pages, Word files, notes, saved course pages | pandoc or any converter that writes Markdown with headings, for example `pandoc notes.docx -t gfm -o data/markdown/my-notes.md` |

The only rule is a Markdown file in `data/markdown/` with real headings. A file with a single `#` and nothing else still works, but citations will only name the source. For audio, a comment on its own line such as `<!-- t=00:12:30 -->` before a paragraph adds a timestamp to the chunk.

## Requirements

- Node 24 or newer (TypeScript runs directly, there is no build step) and pnpm.
- For PDF: [Marker](https://github.com/datalab-to/marker), installed with `uv tool install marker-pdf` (it needs Python 3.12, for example `uv --python 3.12`).
- For EPUB and other formats: `pandoc` (`brew install pandoc`).
- For audio: any Whisper that writes `.srt`. On Apple Silicon, `uv tool install mlx-whisper`.

You only need the tools for the formats you have.

## Setup

```bash
git clone https://github.com/Thav0/books-mcp.git
cd books-mcp
pnpm install
mkdir -p data/raw data/markdown data/chunks data/db
```

## Add a source

Copy the file into `data/raw/` with a short name such as `my-book.pdf`. The name (the slug) becomes the source id in every citation.

Parse it into `data/markdown/` with the command for its format:

```bash
# PDF with a text layer
marker_single data/raw/my-book.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr

# Scanned PDF (slow, uses OCR)
marker_single data/raw/my-book.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction

# EPUB
node src/ingest/epub-to-md.ts data/raw/my-book.epub

# Subtitles from an audiobook or a video
node src/ingest/srt-to-md.ts data/raw/my-book.srt
```

Build the index for it, then try a search from the terminal:

```bash
node src/ingest/chunk.ts my-book
node src/ingest/embed.ts my-book
node src/query.ts "your question" my-book
```

The first `embed` run downloads the embedding model `nomic-embed-text-v1.5` (a few hundred MB) into the Hugging Face cache. Later runs work offline. Leave out the name to process every source.

Last, put the source on a shelf. Open `src/shelves.ts` and add the slug to a shelf. For a new shelf, add an entry to `TOOLS` in `src/server.ts` as well, with a tool name and a description. The description tells the model when to call the tool, so write what the shelf covers. The shelves in the repo belong to the author's own library and are only an example, so replace them with yours.

## Use it from Claude Code

```bash
claude mcp add --transport stdio --scope user books-mcp -- "$(which node)" "$(pwd)/src/server.ts"
```

Run it from the repo folder. `--scope user` makes the tools available in every Claude Code session on this machine, not only in this repo.

Claude Code starts `node` from its own `PATH`. If your default Node is older than 22.18, it cannot strip the TypeScript types and the server fails to start without a message. In that case use the absolute path to a Node 24 binary instead of `$(which node)`.

Restart Claude Code, or open a new session anywhere, and ask a question about your sources.

## Let other tools use the knowledge

The author uses the index from Claude Code. Other tools can use it in three ways.

**Over MCP.** Any MCP client that can start a stdio server can call the search tools. Give it the command `node` with the argument `/absolute/path/to/books-mcp/src/server.ts`. Most clients take a JSON entry like this one, and only the key names change from client to client:

```json
{
  "mcpServers": {
    "books-mcp": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/books-mcp/src/server.ts"]
    }
  }
}
```

Each tool takes `query`, an optional `book` (one source of that shelf) and a `limit` from 1 to 10 (default 5). It returns one text block per passage. Each block starts with `Source: book > chapter path`, followed by ` @ hh:mm:ss` for audio, then the passage text.

**As plain files.** `data/chunks/my-book.jsonl` has one JSON object per line with the fields `id`, `book`, `headings`, `text`, `timestamp` and `tokens`, so any script can read it. The SQLite file `data/db/books.sqlite` holds the same chunks in the table `chunks`, next to the vectors and the full-text index.

**As code.** `src/search.ts` exports `searchHybrid(query, limit, books)` and `searchVector(query, limit, books)`. Import them from your own TypeScript on Node 24.

## Check that it works

`eval/questions.jsonl` holds golden questions, one JSON object per line: `{"question": "...", "book": "my-book", "heading": "words from the expected chapter title"}`. The heading is optional. `node src/eval.ts` prints recall@5 for each mode and each shelf, so you can see if a change made search better or worse. The file holds questions and chapter titles only, never book text, so it is safe to commit.

Adding a source can move the results of the shelves you already use, because the full-text scores use statistics from the whole index. To measure it, run `node src/snapshot.ts save before`, add the source, run `node src/snapshot.ts save after`, then run `node src/snapshot.ts diff before after`. The diff lists every query whose top five results changed. The queries come from `eval/guard-queries.jsonl` and from the list `GUARDED` at the top of `src/snapshot.ts`. Both match the author's shelves, so change them to yours.

## Limits

- Only text is indexed. Images and diagrams are not searched.
- The tool returns passages, not answers. The model that calls it writes the answer.
- The passages a search returns are sent to the model you use. With a cloud model, its provider receives those passages as part of the conversation.
- The embedding model is fixed to `nomic-embed-text-v1.5`. Its name is one constant in `src/embedding.ts`, and changing it means embedding every source again.
- It is a single-user tool for one machine. There are no accounts and no sharing.

## Layout

```
src/paths.ts            data/ folder constants
src/ingest/             one script per stage: srt-to-md, epub-to-md, chunk, embed
src/search.ts           vector, full-text and hybrid search, shared by the server and the terminal
src/shelves.ts          which sources belong to which shelf
src/server.ts           the MCP server, one tool per shelf
src/query.ts            search from the terminal
src/eval.ts             recall check against the golden questions
src/snapshot.ts         save and compare ranked results before and after a change
eval/                   golden questions and guard queries
docs/                   the primer and ideas
plans/                  the plan with every decision and why, plus research reports
```

The detailed plan is in `plans/260915-2036-product-books-rag/plan.md`.

## License

MIT. The pipeline is yours to reuse. The sources you feed it stay yours and are never part of this repo. Only index content you have the right to use.
