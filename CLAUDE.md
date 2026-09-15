# CLAUDE.md

Instructions for Claude sessions in this repo. Read `plans/260915-2036-product-books-rag/plan.md` before doing anything, it holds every decision, the current step and the acceptance criteria.

## What this is

A local RAG pipeline over copyrighted product books, served to Claude Code as an MCP tool. Node 24 + TypeScript, run directly with `node file.ts`, no build step. SQLite via `node:sqlite` with `sqlite-vec` and FTS5. Embeddings in-process with `@huggingface/transformers`. See `README.md` for the user-facing view and `docs/rag-primer.md` for the concepts.

## Working style (the owner is learning RAG and backend, this matters more than speed)

- Act as a Staff Engineer mentor. Explain the concept first in plain words with a React or Next.js analogy, say why, then give exactly one block to run (one command or one script) and stop. Wait for the owner's test output before the next block.
- One or two Socratic questions at most, after the explanation, answerable from frontend experience.
- Never scaffold several steps at once. Never write the whole codebase. A step is done when its acceptance criterion in the plan passes on the owner's terminal.
- Reply in English unless the owner switches language.
- No em dashes anywhere, in prose, code comments or commits.

## Hard rules

- Never open, cat, grep, head or quote anything under `data/`. The books are copyrighted. Structural checks that print no book text (line counts, file sizes, exit codes) are the limit, and only when asked.
- `data/` stays gitignored. Nothing derived from book text is committed, except the questions and chapter titles in `eval/questions.jsonl`.
- No external daemons (no Ollama, no Chroma, no Docker). Everything is a Node process or a one-off CLI.
- Keep TypeScript inside `erasableSyntaxOnly`: no enums, no parameter properties, no namespaces. `pnpm typecheck` must stay clean.
- Each pipeline stage reads the previous stage's files on disk and writes its own. Never chain stages in memory.
- Export the pure function of each stage. CLI entry points are `if (process.argv[1] === import.meta.filename) await main(...)`.
- Markdown files only in `plans/` or `docs/`, except `README.md` and this file.

## Commands

```bash
pnpm typecheck
node src/ingest/chunk.ts [slug]
node src/ingest/embed.ts [slug]       # step 3a
node src/query.ts "question"          # step 3b, 3c
node src/eval.ts                      # step 3d
```

## Current step

Step 6 (publish) is the only step left. Steps 0-4 are done, step 5 moved out of this repo: skills are written in the projects that consume the tool, never here. The MCP server is registered at user scope, so any Claude Code session on this machine gets `search_product_knowledge` at start, no daemon needed (`claude mcp get product-books` shows scope and status). Step 3 baseline recall@5 = 9/10 both modes (see plan.md).

## Skills worth using here

- None for authoring. Skills grounded in the books are created in the consuming project, not in this repo, so do not scaffold `.claude/skills/` here.
- `tlc-plan` only if a step's criterion feels vague and needs rewriting as observable checks. Skip `tlc-discover`, `tlc-implement`, `tlc-spec-*`, they add ceremony this repo does not need.
