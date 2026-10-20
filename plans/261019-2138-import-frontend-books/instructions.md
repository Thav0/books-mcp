# Import the frontend books and the Frontend System Design Essentials course into the RAG

Status: done on 2026-10-20, every check passed, and the results are plan step 11 in `plans/260915-2036-product-books-rag/plan.md`. The backup of this run is `data/db/books.sqlite.bak-261020-frontend`, because `bak-261019` already held an older backup, so the restore command below uses that name.

Imports six sources, one block each, onto the `typescript` shelf, served by `search_typescript_knowledge`. That shelf already holds Node.js Design Patterns, The Conscious Node and the Frontend Architecture for Design Systems summary, and from now on it covers JavaScript and TypeScript work on both sides, Node.js and frontend:
- Advanced React (Nadia Makarevich, 2023), slug `advanced-react`.
- Web Performance Fundamentals (Nadia Makarevich, 2025), slug `web-performance-fundamentals`.
- Building Large Scale Web Apps: A React Field Guide (Addy Osmani and Hassan Djirdeh, 2024), slug `building-large-scale-web-apps`.
- Building Micro-Frontends, 2nd edition (Luca Mezzalira, 2025), slug `building-micro-frontends`.
- Frontend System Design Essentials (Juntao Qiu), the course book, slug `frontend-system-design-essentials`.
- Frontend System Design Essentials, the 47 video lessons as transcripts, slug `frontend-system-design-essentials-videos`.

The course book and the videos are two sources on purpose: a passage then says whether it comes from the written chapter or from the spoken lesson, and you can search either one with `book`. The six slugs are already on the shelf in `src/shelves.ts`, and the tool description in `src/server.ts` now names the frontend topics, so Claude picks this tool for frontend questions too: `pnpm typecheck` is clean and the server still lists six tools. Run one block, paste its Check output, then go to the next. Nothing here asks you to paste book text.

## How it works

It is the same pipeline as steps 9 and 10. The converted books in `~/Downloads/courses/Frontend/` are the master copy, like `src/` in a Next.js app: one Markdown file per chapter or lesson, with the images in `images/` next to them. The first command of each block is the build step, like `next build` writing `.next/`: it joins the chapter files into one file under `data/markdown/`, which is the input of the RAG pipeline, and leaves out the pages that only add noise to search (cover, copyright, contents, index, about the author, O'Reilly boilerplate). Then the block chunks the source, embeds it, counts the rows in the database and runs one test search. After the six sources, the golden questions work as the unit tests of search, and the snapshot diff works as a visual regression test for the old shelves. If a master copy changes later, run that book's block again: it rebuilds the file and replaces the book's rows.

How the master copies were made, for the record:
- Web Performance Fundamentals is an EPUB, converted with the user skill `epub-to-markdown`. Every word of the source reached the Markdown, its 192 footnotes sit under `## Notes` at the end of the chapter that cites them, and the link that the download site injected into every file was removed.
- The three PDFs went through Marker (`--disable_ocr`, under a minute each). Marker gave sibling sections different heading levels, so a new script of the same skill, `marker_by_fonts.py`, rebuilt the levels from the font sizes in the PDF text layer. Every chapter and section bookmark of the three PDFs is a heading in the result, and every word of Marker's output reached the chapter files.
- One limitation: Marker found no code blocks in these three PDFs, so their code is plain lines without fences. The words are all there, so search finds them, but in the master copy the code reads like text. Advanced React's end-note list is left out (it is mostly links), so its `[12]` style markers point nowhere.
- The course book is an EPUB that keeps every chapter in one XHTML file, so the converter split it into one file per chapter, in `book/` inside the course folder. Its 177 code blocks are kept as fences without their line numbers, and its 53 tip boxes became quotes. The PDF in the same folder is the same book, so it is not used.
- The video lessons were Whisper transcripts, one line per spoken segment. They became one Markdown file per lesson in `videos/` inside the course folder, with the lesson title as heading and the segments joined into paragraphs, every word kept.

## Before each embed: memory

Embedding runs the model inside one Node process, which can grow to several GB, and each block starts by printing the swap. If `used` is more than a few GB, close the browsers and other memory-heavy apps first. The progress bar shows the time left, and when that estimate keeps growing, the cause is memory, not a hang. In the trial on 2026-10-19, with 14 GB of swap in use, each source embedded in 26 seconds to 2 minutes; the longer times below leave room for a Mac that swaps harder.

## Block 0. Backup and baseline (about 2 minutes)

```bash
cd ~/Documents/product-books-mcp
cp data/db/books.sqlite data/db/books.sqlite.bak-261019
cmp data/db/books.sqlite data/db/books.sqlite.bak-261019 && echo identical
node src/snapshot.ts save before-frontend
node src/eval.ts
```

Check:
- `cmp` prints `identical`.
- The snapshot prints `saved 85 queries to data/snapshots/before-frontend.json`: the 70 product and system design queries of earlier imports, plus 15 new guard queries for the typescript shelf (8 pure Node.js topics, 6 that overlap with frontend topics such as caching, cancellation and security, and 1 about CSS architecture for design systems).
- The eval prints `vector: recall@5 = 74/76 (product 9/10, system-design 9/10, grokking 16/16, ai 20/20, inventory-pricing 20/20)` and the same for `hybrid`, with the two known misses (the Inspired feature team question and the FoSA architecture characteristics question).

## Book 1. Advanced React (1 to 4 minutes)

Keeps files 03 (Introduction) to 19 (Chapter 16), which leaves out the front matter, the contents, the closing "Forewords" page and the end-note list.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Frontend"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$B/Advanced React"/{0[3-9],1[0-9]}-*.md > data/markdown/advanced-react.md
wc -c < data/markdown/advanced-react.md
node src/ingest/chunk.ts advanced-react
node src/ingest/embed.ts advanced-react
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'advanced-react'"
node src/query.ts "why should you never define a component inside another component" advanced-react
```

Check:
- `wc -c` prints 352477.
- `chunk.ts` prints `advanced-react: 185 chunks, avg 467 tokens, max 798`.
- `embed.ts` ends with `advanced-react: 185 chunks in ...`, and `sqlite3` prints 185.
- The first hit, or at least one of the five, sits under `advanced-react > Chapter 6. Deep dive into diffing and reconciliation > Why we can't define components inside other components`. Paste only the first line of each hit (score, book and heading path), not the text under it.

## Book 2. Web Performance Fundamentals (2 to 5 minutes)

Keeps files 04 (1. Hello and Welcome!) to 17 (14. Final Words), which leaves out the cover, the copyright page and the contents. The footnotes stay.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Frontend"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$B/Web Performance Fundamentals"/{0[4-9],1[0-7]}-*.md > data/markdown/web-performance-fundamentals.md
wc -c < data/markdown/web-performance-fundamentals.md
node src/ingest/chunk.ts web-performance-fundamentals
node src/ingest/embed.ts web-performance-fundamentals
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'web-performance-fundamentals'"
node src/query.ts "why can server-side rendering make LCP worse" web-performance-fundamentals
```

Check:
- `wc -c` prints 405883.
- `chunk.ts` prints `web-performance-fundamentals: 221 chunks, avg 436 tokens, max 798`.
- `embed.ts` ends with `web-performance-fundamentals: 221 chunks in ...`, and `sqlite3` prints 221.
- The first hit, or at least one of the five, sits under `web-performance-fundamentals > 6. Intro to Rendering on the Server (SSR) > SSR can make LCP Worse`.

## Book 3. Building Large Scale Web Apps (2 to 5 minutes)

Keeps files 03 (Preface) to 19 (Conclusions), which leaves out the title page with the contents and the About the Authors page.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Frontend"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$B/Building Large Scale Web Apps"/{0[3-9],1[0-9]}-*.md > data/markdown/building-large-scale-web-apps.md
wc -c < data/markdown/building-large-scale-web-apps.md
node src/ingest/chunk.ts building-large-scale-web-apps
node src/ingest/embed.ts building-large-scale-web-apps
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'building-large-scale-web-apps'"
node src/query.ts "what are design tokens and how are they used in a design system" building-large-scale-web-apps
```

Check:
- `wc -c` prints 411568.
- `chunk.ts` prints `building-large-scale-web-apps: 304 chunks, avg 329 tokens, max 798`.
- `embed.ts` ends with `building-large-scale-web-apps: 304 chunks in ...`, and `sqlite3` prints 304.
- The first hit, or at least one of the five, sits under `building-large-scale-web-apps > Design Systems > Design Tokens`.

## Book 4. Building Micro-Frontends (2 to 8 minutes)

Keeps files 03 (Foreword for the 1st Edition) to 18 (Chapter 14), without five O'Reilly boilerplate sections of the preface. That leaves out the cover pages, the contents, the index, About the Author and the colophon.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Frontend"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" }
  /^## (Conventions Used in This Book|Using Code Examples|O.*Reilly Online Learning|How to Contact Us|Acknowledgments)$/ { skip = 1; next }
  /^##? / { skip = 0 }
  !skip' "$B/Building Micro-Frontends"/{0[3-9],1[0-8]}-*.md > data/markdown/building-micro-frontends.md
wc -c < data/markdown/building-micro-frontends.md
node src/ingest/chunk.ts building-micro-frontends
node src/ingest/embed.ts building-micro-frontends
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'building-micro-frontends'"
node src/query.ts "how do Next.js multi-zones compose server-side rendered micro-frontends" building-micro-frontends
```

Check:
- `wc -c` prints 824667.
- `chunk.ts` prints `building-micro-frontends: 466 chunks, avg 431 tokens, max 799`.
- `embed.ts` ends with `building-micro-frontends: 466 chunks in ...`, and `sqlite3` prints 466.
- The first hit, or at least one of the five, sits under `building-micro-frontends > Chapter 5. Server-Side Rendering Micro-Frontends > Next.js Multi-Zones`.

## Book 5. Frontend System Design Essentials, the course book (1 to 4 minutes)

Keeps files 03 (Preface) to 28 (The Architectural Roadmap), which leaves out the cover and the copyright page. The awk has one more rule than the other blocks: five shell comments inside code blocks start with `# `, and `chunk.ts` reads any line that starts with `# ` as a heading, even inside a code fence. So the build step puts one space in front of a `#` line inside a fence, the way you escape a character that would otherwise be read as markup.

```bash
cd ~/Documents/product-books-mcp
C="$HOME/Downloads/courses/Frontend/Frontend System Design Essentials Juntao Qiu"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" }
  /^[ \t>]*```/ { fence = !fence }
  fence && /^#/ { $0 = " " $0 }
  { print }' "$C/book"/{0[3-9],1[0-9],2[0-8]}-*.md > data/markdown/frontend-system-design-essentials.md
wc -c < data/markdown/frontend-system-design-essentials.md
node src/ingest/chunk.ts frontend-system-design-essentials
node src/ingest/embed.ts frontend-system-design-essentials
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'frontend-system-design-essentials'"
node src/query.ts "what is the CCDAO framework for frontend system design" frontend-system-design-essentials
```

Check:
- `wc -c` prints 228144.
- `chunk.ts` prints `frontend-system-design-essentials: 292 chunks, avg 180 tokens, max 776`.
- `embed.ts` ends with `frontend-system-design-essentials: 292 chunks in ...`, and `sqlite3` prints 292.
- At least one of the five hits sits under `frontend-system-design-essentials > Chapter 2 - Introducing the CCDAO Framework`.

## Book 6. Frontend System Design Essentials, the video lessons (under 2 minutes)

Keeps all 47 lessons.

```bash
cd ~/Documents/product-books-mcp
C="$HOME/Downloads/courses/Frontend/Frontend System Design Essentials Juntao Qiu"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$C/videos"/*.md > data/markdown/frontend-system-design-essentials-videos.md
wc -c < data/markdown/frontend-system-design-essentials-videos.md
node src/ingest/chunk.ts frontend-system-design-essentials-videos
node src/ingest/embed.ts frontend-system-design-essentials-videos
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'frontend-system-design-essentials-videos'"
node src/query.ts "what are the six pillars of frontend system design" frontend-system-design-essentials-videos
```

Check:
- `wc -c` prints 292989.
- `chunk.ts` prints `frontend-system-design-essentials-videos: 121 chunks, avg 601 tokens, max 795`.
- `embed.ts` ends with `frontend-system-design-essentials-videos: 121 chunks in ...`, and `sqlite3` prints 121.
- The first hit, or at least one of the five, sits under `frontend-system-design-essentials-videos > 46. Recap the Six Pillars of Frontend System Design`.

## After the six sources: golden questions, eval and snapshot diff (about 3 minutes)

The 60 golden questions (10 per source, questions and section or lesson titles only) are in `golden.jsonl` next to this guide. The first command appends them to `eval/questions.jsonl` once, and does nothing when they are already there.

```bash
cd ~/Documents/product-books-mcp
P=plans/261019-2138-import-frontend-books
grep -q 'micro-frontend decision framework' eval/questions.jsonl || cat "$P/golden.jsonl" >> eval/questions.jsonl
wc -l < eval/questions.jsonl
node src/eval.ts
node src/snapshot.ts save after-frontend
node src/snapshot.ts diff before-frontend after-frontend
```

Check for the eval:
- `wc -l` prints 136.
- It prints `vector: recall@5 = 134/136 (product 9/10, system-design 9/10, grokking 16/16, ai 20/20, inventory-pricing 20/20, typescript 60/60)` and the same for `hybrid`, with only the two known misses. The 60 new questions count under `typescript`, the shelf of their books. The trial on an in-memory copy of the six sources got 60/60 in both modes, but it could not include the shelf's three older books, which now compete for the same top 5.
- One or two new misses are still fine, because the real text index counts all the books and the three older books join the race. The likeliest is the Web Performance Fundamentals hydration question, which ranked fifth in the trial since the course book also has a hydration section; tell me which question missed and I will send the exact command to diagnose it.

Check for the diff:
- The save prints `saved 145 queries`, because the 60 new golden questions belong to the typescript shelf, and the diff prints `60 queries only in after-frontend (golden questions added since before-frontend) are not compared`.
- The `product` and `system-design` lines show identical vector top-10 for all 30 and 40 queries and `largest vector score change 0.00e+0`, because vector search filters by book before it ranks.
- Hybrid top-5 stays identical for all, or nearly all, of those 70 queries. Steps 9 and 10 changed 4 of 70 (the same five chunks in a new order). If more than about 5 of them change, stop and paste the diff.
- The `typescript` line is the measurement of the merge, so paste it together with the typescript entries of the changed list (ids only). An id starts with its book slug, so a frontend passage that entered a Node.js query's top 5 shows up as, say, `advanced-react#77`. Expect changes in the overlap queries and the CSS one. If several of the 8 pure Node.js queries (event loop, reactor, backpressure, modules, concurrency limit, EventEmitter, cluster, graceful shutdown) lose Node.js passages from their top 5, we talk about splitting the shelf again.

## Last: live check in a new Claude Code session

MCP servers load when a session starts, so open a new session in any folder.

```bash
claude mcp get product-books
```

Check:
- The server shows as connected, and `/mcp` in the new session lists the same six product-books tools.
- Ask: "Search my frontend books: how do Next.js multi-zones work for micro-frontends?" Claude calls `search_typescript_knowledge`, and the answer cites `building-micro-frontends` with a heading under `Next.js Multi-Zones`.
- Ask: "Search my frontend books: why can SSR make LCP worse?" The answer cites `web-performance-fundamentals > 6. Intro to Rendering on the Server (SSR) > SSR can make LCP Worse`.
- Ask: "Search my frontend books: what are the six pillars of frontend system design?" The answer cites `frontend-system-design-essentials-videos > 46. Recap the Six Pillars of Frontend System Design`.

## If something goes wrong

This puts the block 0 backup back over the database, which removes every new book and leaves the old shelves exactly as they were. The second command undoes the golden questions.

```bash
cd ~/Documents/product-books-mcp
cp data/db/books.sqlite.bak-261020-frontend data/db/books.sqlite
git checkout eval/questions.jsonl
```

## When every check passes

Paste the Check lines. I will record the results as plan step 11, update the current step and the shelf list in `CLAUDE.md` and `README.md`, and commit on main. The backup can be deleted once the live check passes.

## Two questions to think about

1. Advanced React and Web Performance Fundamentals share an author and several topics (re-renders, memoization, data fetching), and each golden question names a section, not only a book. In Testing Library terms, why is `getByRole('button', { name: 'Save' })` a stronger test than `getByRole('button')`, and how does that map to "right section in the top 5" versus "right book in the top 5"?
2. The frontend books now share one shelf with the two Node.js books, like two features sharing one route group and one layout in Next.js. A Node.js question and a React question now compete for the same top 5. What would you expect to see in search results if the shelf ever needed to split again, and which of the checks above would show it first?
