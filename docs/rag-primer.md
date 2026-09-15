# RAG primer, mapped to this repo

Written 2026-09-15 for the owner, a React and Next.js developer building the pipeline step by step. Every concept points at the file that implements it.

## The problem RAG solves

A language model only knows what was in its training data and what is in the prompt. Your books are in neither. You could paste a whole book into the prompt, but that is slow, expensive and the model gets lost in 300 pages. RAG (Retrieval Augmented Generation) is the alternative: before the model answers, a search step finds the five passages most likely to contain the answer and puts only those in the prompt.

React analogy: you do not ship the whole database to the browser, you fetch the rows the page needs. RAG is the fetch. The model is the component that renders the rows.

## The four moves

**1. Parse (`src/ingest/*-to-md.ts`, Marker, pandoc).** Turn every format into one shape, Markdown with headings. This is normalising the API response before it touches state. If the headings are wrong here, every later stage inherits the mistake, which is why step 1 was accepted only when each file had real `#` lines.

**2. Chunk (`src/ingest/chunk.ts`).** Search works on pieces, not on books. A piece must be small enough to be about one thing and big enough to make sense alone. We cut at headings and pack whole paragraphs up to about 800 tokens. Each chunk keeps its heading path (`["Part 2", "Chapter 5", "Set boundaries"]`), which is what makes a citation possible later. Think of it as a list item that carries its own breadcrumb.

**3. Embed and store (`src/ingest/embed.ts`, step 3).** An embedding model turns text into a list of 768 numbers, a point in space, placed so that texts with similar meaning land close together. "How much time should we spend on this?" lands near a passage about appetite even though they share no word. We store the vector in `sqlite-vec` and the raw text in a normal table, plus a full-text index (FTS5) of the same text.

Why both indexes? Vectors are fuzzy in a good way: they catch paraphrase. They are also fuzzy in a bad way: a rare exact term like "betting table" is only a neighbourhood to them. Full text (BM25, the classic search engine scoring) is the opposite: exact terms are its whole game. Running both and merging the ranks (Reciprocal Rank Fusion) is called hybrid search, and it is a few lines of SQL. Analogy: a fuzzy `includes` filter and a strict `===` filter, unioned, with the items that pass both floated to the top.

**4. Retrieve and serve (`src/query.ts`, `src/server.ts`, step 4).** At question time: embed the question with the same model, ask SQLite for the nearest vectors and the best full-text matches, fuse, take the top five, return text plus citation. The MCP server is just that function behind a tool schema, so Claude Code can call it. It is an API route with one handler.

## Two things people skip and regret

**Measure before tuning.** Chunk size, model choice, the RRF constant, all of them are knobs with no correct value. The only honest way to turn a knob is a golden set: ten questions you know the answer to, and a script that reports how often the right book is in the top five. That is `src/eval.ts` in step 3d. Analogy: a snapshot test for the search results.

**Same model both sides.** The vector for a question is only comparable with vectors from the same model. Change the model, re-embed everything. That is why the model name is one constant and why embed rewrites a whole book at a time.

## Glossary

- **Token.** Roughly four characters of English. Models count in tokens, we estimate with `chars / 4`.
- **Embedding.** A vector of floats representing meaning. Same model on both sides, always.
- **Cosine distance.** How far apart two vectors point. Zero means identical direction.
- **KNN.** K nearest neighbours, the query "give me the k closest vectors".
- **BM25.** Full-text ranking by term frequency and rarity. What FTS5 computes.
- **RRF.** Reciprocal Rank Fusion, `sum(1 / (60 + rank))` across result lists. Merges rankings without caring about score scales.
- **Recall@5.** Share of golden questions whose expected source appears in the top five results.
- **MCP.** Model Context Protocol. A JSON-RPC contract that lets a model call local tools over stdio.
