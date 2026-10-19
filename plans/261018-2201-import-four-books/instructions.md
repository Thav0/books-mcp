# Import the four Inventory books into the RAG

Status: done on 2026-10-18 for all four books. The results are recorded in plan steps 9 and 10 (`plans/260915-2036-product-books-rag/plan.md`). The blocks stay here for a rebuild: run a book's block again after its master copy changes.

Imports four books, one block per book, on two new shelves:
- `ai`, served by `search_ai_knowledge`: The AI Playbook (Eric Siegel, 2024) and AI Engineering (Chip Huyen, 2025).
- `inventory-pricing`, served by `search_inventory_pricing_knowledge`: Inventory Optimization (Nicolas Vandeput, 2020) and Pricing and Revenue Optimization (Robert L. Phillips, 2nd edition, 2021).

Both shelves and both tools are already registered in `src/shelves.ts` and `src/server.ts`: `pnpm typecheck` is clean and the server lists six tools. The backup and the baseline are done too (see below), so the blocks start with the books. Run one block, paste its Check output, then go to the next. Nothing here asks you to paste book text.

## How it works

The converted books in `~/Downloads/courses/Inventory/` are the master copy, like `src/` in a Next.js app. The first command of each book block is the build step, like `next build` writing `.next/`: it joins the book's chapter files into one file under `data/markdown/`, which is the input of the RAG pipeline, and leaves out the pages that only add noise to search (cover, copyright, contents, index, bibliography, acknowledgments, O'Reilly boilerplate). Then the block chunks the book, embeds it, counts the rows in the database and runs one test search. After the four books, the golden questions work as the unit tests of search, and the snapshot diff works as a visual regression test for the old shelves. If a master copy changes later, run that book's block again: it rebuilds the file and replaces the book's rows.

## Before each embed: memory

Embedding runs the model inside one Node process, which can grow to several GB, and each block starts by printing the swap. If `used` is more than a few GB, close the browsers and other memory-heavy apps first. The progress bar shows the time left, and when that estimate keeps growing, the cause is memory, not a hang. The times below come from trials on 2026-10-18: the short one is a quiet Mac, the long one is a Mac with 15 to 21 GB of swap in use.

## Done: backup and baseline (2026-10-18 22:06)

- Backup: `data/db/books.sqlite.bak-261018-2206`, byte-identical to `books.sqlite` (49 MB).
- Snapshot: `saved 70 queries to data/snapshots/before-books.json`.
- Baseline eval: `vector: recall@5 = 34/36 (product 9/10, system-design 9/10, grokking 16/16)` and the same for `hybrid`, with the two known misses (the Inspired feature team question and the FoSA architecture characteristics question).

## Book 1. The AI Playbook (1 to 4 minutes)

Keeps files 09 (Foreword) to 21 (Conclusion).

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Inventory"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$B/The AI Playbook"/{09,1?,20,21}-*.md > data/markdown/the-ai-playbook.md
wc -c < data/markdown/the-ai-playbook.md
node src/ingest/chunk.ts the-ai-playbook
node src/ingest/embed.ts the-ai-playbook
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'the-ai-playbook'"
node src/query.ts "what are the six steps of the BizML practice" the-ai-playbook
```

Check:
- `wc -c` prints 433455.
- `chunk.ts` prints `the-ai-playbook: 196 chunks, avg 539 tokens, max 799`.
- `embed.ts` ends with `the-ai-playbook: 196 chunks in ...`, and `sqlite3` prints 196.
- The first hit, or at least one of the five, sits under `the-ai-playbook > 0 BizML: Six Steps to Machine Learning Deployment`. Paste only the first line of each hit (score, book and heading path), not the text under it.

## Book 2. AI Engineering (3 to 17 minutes)

Keeps files 05 (Preface) to 16 (Epilogue), without five O'Reilly boilerplate sections of the preface.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Inventory"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" }
  /^## (Conventions Used in This Book|Using Code Examples|O.*Reilly Online Learning|How to Contact Us|Acknowledgments)$/ { skip = 1; next }
  /^##? / { skip = 0 }
  !skip' "$B/AI Engineering"/{0[5-9],1[0-6]}-*.md > data/markdown/ai-engineering.md
wc -c < data/markdown/ai-engineering.md
node src/ingest/chunk.ts ai-engineering
node src/ingest/embed.ts ai-engineering
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'ai-engineering'"
node src/query.ts "how do you use an AI model as a judge to evaluate another model's outputs and what are its limits" ai-engineering
```

Check:
- `wc -c` prints 1086468.
- `chunk.ts` prints `ai-engineering: 531 chunks, avg 494 tokens, max 800`.
- `embed.ts` ends with `ai-engineering: 531 chunks in ...`, and `sqlite3` prints 531.
- The first hit, or at least one of the five, sits under `ai-engineering > Chapter 3. Evaluation Methodology > AI as a Judge`.

## Book 3. Inventory Optimization (2 to 8 minutes)

Keeps files 05 to 09, without Acknowledgments, About the Author, Bibliography and List of Symbols. The Glossary, the Python and Proofs appendices and the footnotes stay. The code under each code picture was read by OCR, so it can be found by search.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Inventory"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" }
  /^# (Acknowledgments|About the Author|Bibliography|List of Symbols)$/ { skip = 1; next }
  /^# |^## Notes$/ { skip = 0 }
  !skip' "$B/Inventory Optimization"/0[5-9]-*.md > data/markdown/inventory-optimization.md
wc -c < data/markdown/inventory-optimization.md
node src/ingest/chunk.ts inventory-optimization
node src/ingest/embed.ts inventory-optimization
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'inventory-optimization'"
node src/query.ts "how do I compute safety stock for a target service level" inventory-optimization
```

Check:
- `wc -c` prints 574357.
- `chunk.ts` prints `inventory-optimization: 376 chunks, avg 359 tokens, max 798`.
- `embed.ts` ends with `inventory-optimization: 376 chunks in ...`, and `sqlite3` prints 376.
- The first hit, or at least one of the five, sits under `inventory-optimization > Part II Stochastic Supply Chains > 4 Safety Stocks`.

## Book 4. Pricing and Revenue Optimization (3 to 10 minutes)

Keeps files 03 (Preface) to 19 (Appendix B), which leaves out the front matter, the contents, the references and the index.

```bash
cd ~/Documents/product-books-mcp
B="$HOME/Downloads/courses/Inventory"
sysctl vm.swapusage
awk 'FNR == 1 && NR > 1 { print "" } { print }' "$B/Pricing and Revenue Optimization"/{03,0[4-9],1[0-9]}-*.md > data/markdown/pricing-and-revenue-optimization.md
wc -c < data/markdown/pricing-and-revenue-optimization.md
node src/ingest/chunk.ts pricing-and-revenue-optimization
node src/ingest/embed.ts pricing-and-revenue-optimization
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = 'pricing-and-revenue-optimization'"
node src/query.ts "what is Littlewood's rule for allocating capacity between two fare classes" pricing-and-revenue-optimization
```

Check:
- `wc -c` prints 1220478.
- `chunk.ts` prints `pricing-and-revenue-optimization: 528 chunks, avg 554 tokens, max 799`.
- `embed.ts` ends with `pricing-and-revenue-optimization: 528 chunks in ...`, and `sqlite3` prints 528.
- The first hit, or at least one of the five, sits under `pricing-and-revenue-optimization > 9 Capacity Allocation > 9.1 THE TWO-CLASS PROBLEM`.

## After the four books: golden questions and eval (about 2 minutes)

Done by Claude on 2026-10-18 22:22: the 40 golden questions (8, 12, 10 and 10 per book, questions and section titles only) are appended to `eval/questions.jsonl`, which now holds 76. Do not append them again. Run the eval and the snapshot diff together:

```bash
cd ~/Documents/product-books-mcp
node src/eval.ts
node src/snapshot.ts save after-books
node src/snapshot.ts diff before-books after-books
```

Check for the eval:
- It prints `vector: recall@5 = 74/76 (product 9/10, system-design 9/10, grokking 16/16, ai 20/20, inventory-pricing 20/20)` and the same for `hybrid`, with only the two known misses. The trials got 20/20 for both new shelves in both modes. One new miss in hybrid mode is still fine, because the real text index counts all the books; tell me which question missed and I will send the exact command to diagnose it.

## After the eval: snapshot diff

The commands are in the block above. Check for the diff:
- The diff prints `largest vector score change: 0.00e+0` and identical vector top-10 for all 70 queries, because vector search filters by book before it ranks.
- Hybrid top-5 is identical for all, or nearly all, of the 70 queries. The Grokking import changed 1 of 70 (ranks 1 and 2 swapped inside the same five chunks). If more than about 5 queries change their top 5, stop and paste the diff.

## Last: live check in a new Claude Code session

MCP servers load when a session starts, so open a new session in any folder.

```bash
claude mcp get product-books
```

Check:
- The server shows as connected, and `/mcp` in the new session lists six product-books tools, including `search_ai_knowledge` and `search_inventory_pricing_knowledge`.
- Ask: "Search my AI books: how do I use an LLM as a judge, and what are its limits?" Claude calls `search_ai_knowledge`, and the answer cites `ai-engineering > Chapter 3. Evaluation Methodology > AI as a Judge`.
- Ask: "Search my inventory books: how do I compute safety stock for a target service level?" Claude calls `search_inventory_pricing_knowledge`, and the answer cites `inventory-optimization` with a heading under `4 Safety Stocks`.

## If something goes wrong

This puts the backup from 22:06 back over the database, which removes every new book and leaves the old shelves exactly as they were:

```bash
cd ~/Documents/product-books-mcp
cp data/db/books.sqlite.bak-261018-2206 data/db/books.sqlite
```

## When every check passes

Paste the Check lines. I will record the results as plan steps 9 and 10, update the current step in `CLAUDE.md` and the shelf list in `README.md`, and commit on main. The backup can be deleted once the live check passes.

## Two questions to think about

1. The snapshot was saved before any book was added. In frontend terms, why is a visual regression baseline that you capture after your CSS change useless?
2. Each book block runs its own `embed.ts` process instead of embedding all four books in one process. What does that buy you on a machine that is already swapping?
