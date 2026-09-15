# Idea: local web UI for ingest jobs

Status: idea only, not planned. Written 2026-09-15. Prerequisite: pipeline steps 1 to 4 working from the CLI.

## What

A small local web app where you drop a book file (pdf, epub, srt, or an already parsed md) and the ingest pipeline runs in the background. The page shows each book with its current stage and a log tail, no terminal needed.

## Why

- Ingest takes minutes per book, so it must run outside the HTTP request. This forces a job queue and a worker, which is the next backend concept worth learning after the pipeline itself.
- Upload and forget is a better workflow than remembering four CLI commands per book.

## Shape

- One process, two roles: an HTTP server (Hono or a Next.js route handler) and a worker loop in the same Node process. Single user, localhost only, no auth.
- Upload handler: save the file to `data/raw/<slug>.<ext>`, insert a job row, return the job id. Nothing else, the request ends in milliseconds.
- Jobs table in the same SQLite file the vector store uses: `id, book, stage, status, log, created_at, updated_at`. A table instead of an in-memory queue so a crash or restart does not lose the job.
- Worker: polls the table for `queued` jobs, runs the stages in order (parse, chunk, embed), updates `stage` and `log` as it goes, marks `done` or `failed`.
- Stages call the same functions the CLI scripts use (`parseBook`, `chunkBook`, `embedBook`). The CLI stays as the first entry point and as the test harness for the pipeline. UI and CLI never duplicate logic.
- An uploaded `.md` skips the parse stage. Parse for pdf and epub still shells out to Marker and pandoc as child processes.
- Progress to the browser via Server-Sent Events, or polling every two seconds. Polling is enough for one user.
- Book id is the filename slug. Uploading the same slug again replaces the book: delete its chunks and vectors, then rerun.

## Frontend analogy

The upload handler is a form action that only writes to a database. The worker is a background effect that reacts to that write. The page is a list subscribed to the job rows, like a query with refetch on interval.

## Settings page

A single settings page, saved to `data/settings.json` (gitignored). The worker reads it when a job starts and stores a snapshot in the job row, so each book records the exact settings it was processed with and a later change never silently alters old results.

- Hugging Face token, optional. Speeds up model downloads by lifting the anonymous rate limit. Masked input, never shown back, never logged, never stored in the jobs table. On save the app writes it to the same file `hf auth login` uses (`~/.cache/huggingface/token`, permissions 600), so Marker picks it up with no env var and the app never has to hand the value around. Empty field means anonymous downloads, which work.
- Parse output: output directory (default `data/markdown`), image extraction on or off, force OCR on or off, optional page range for testing a few pages before a full run.
- Chunking: max tokens per chunk and overlap.
- Embeddings: model name.

Defaults match the CLI flags used today, so the first run needs no settings at all.

## Open questions

- Hono versus Next.js for the server. Hono is smaller and the UI is one page, Next.js is familiar.
- Whether the MCP server and the worker should share one process or stay separate. Separate keeps the MCP server light.
