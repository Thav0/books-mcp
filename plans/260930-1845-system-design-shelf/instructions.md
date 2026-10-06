# System design shelf: one book at a time

Adds the five system design books to the RAG so the daily lessons can use them as their reference. The order follows the roadmap: System Design Interview and DDIA feed week 1, The Hard Parts starts in week 8, Fundamentals of Software Architecture starts in week 10, and Building Evolutionary Architectures supports weeks 14 to 16. Run one block, paste its check output, then go to the next. Nothing here prints book text.

All five books are PDFs (checked 2026-09-30 19:20; the earlier EPUB copies of The Hard Parts and FoSA were removed from the Downloads folder), so every book follows the same three steps: probe, convert, then chunk and embed.

## Before you start

**Where each book stands.** Run this any time. It prints only yes or no and counts. If a book already shows `markdown:yes` from an earlier run, skip its probe and convert steps and go straight to its chunk and embed step. Never convert the same book twice: the EPUB route writes `data/markdown/<slug>.md`, Marker writes `data/markdown/<slug>/<slug>.md`, and chunking would pick up both.

```bash
cd ~/Documents/product-books-mcp
for s in system-design-interview designing-data-intensive-applications software-architecture-the-hard-parts fundamentals-of-software-architecture building-evolutionary-architectures; do
  raw=no; md=no; chunks=0
  { [ -e data/raw/$s.pdf ] || [ -e data/raw/$s.epub ]; } && raw=yes
  { [ -e data/markdown/$s.md ] || [ -e data/markdown/$s/$s.md ]; } && md=yes
  [ -e data/chunks/$s.jsonl ] && chunks=$(wc -l < data/chunks/$s.jsonl | tr -d ' ')
  rows=$(sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$s'")
  printf '%-40s raw:%-4s markdown:%-4s chunks:%-6s db:%s\n' "$s" "$raw" "$md" "$chunks" "$rows"
done
```

**Progress while Marker runs.** Marker draws its own progress bar for each stage, but between stages it can stay quiet for minutes while it loads models or writes the file. With OCR on, it also runs a vision model on every scanned page, which is the slow path. Start this in a second terminal tab after Marker starts. It prints a line every 20 seconds: if the elapsed time keeps growing and the CPU is above zero, Marker is working, not stuck.

```bash
while pid=$(pgrep -nf marker_single); do
  ps -o etime=,%cpu=,rss= -p "$pid" | awk '{printf "marker alive: %s elapsed, cpu %s%%, mem %d MB\n", $1, $2, $3/1024}'
  sleep 20
done; echo "marker finished"
```

**Progress while embedding.** `embed.ts` draws a bar with the percent done and the time left, like `[##########--------------------] 320/960 33% 1m04s elapsed, ~2m08s left`. The first batch also loads the model, so the estimate settles after the first minute.

**The probe rule (used by every book).** The probe converts 10 pages from the middle with OCR turned off.
- Over about 5,000 bytes means the PDF has a text layer, so convert with `--disable_ocr`. The full run takes about (probe seconds x pages / 10), a little less because the probe also loads the models.
- Under about 1,000 bytes means the pages are scanned images, so convert without `--disable_ocr`. OCR ran at about 10 pages a minute on this Mac for Inspired.

## Book 1: System Design Interview

### 1a. Probe (about 1 minute)

```bash
cd ~/Documents/product-books-mcp
S=system-design-interview
cp "$HOME/Downloads/cursos/System Design Books"/System*.pdf data/raw/$S.pdf
mdls -name kMDItemNumberOfPages "$HOME/Downloads/cursos/System Design Books"/System*.pdf
time marker_single data/raw/$S.pdf --output_dir data/tmp/probe --output_format markdown --disable_image_extraction --disable_ocr --page_range 20-29
wc -c < data/tmp/probe/$S/$S.md
```

### 1b. Convert and check

Run only one of the two blocks, based on the probe. Pasting both would convert the book twice.

If the probe was over 5,000 bytes (text layer, fast path):

```bash
cd ~/Documents/product-books-mcp
S=system-design-interview
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

If the probe was under 1,000 bytes (scanned, OCR, about 10 pages a minute):

```bash
cd ~/Documents/product-books-mcp
S=system-design-interview
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

Check: the file is several hundred KB or more, with at least 16 `#` or `##` headings (16 chapters) and more at deeper levels.

### 1c. Chunk, embed and verify (a few minutes)

```bash
cd ~/Documents/product-books-mcp
S=system-design-interview
node src/ingest/chunk.ts $S
node src/ingest/embed.ts $S
wc -l < data/chunks/$S.jsonl
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$S'"
```

Check: `chunk.ts` prints a max of 800 tokens or less, and the last two numbers are equal.

## Book 2: Designing Data-Intensive Applications

### 2a. Probe (about 1 minute)

```bash
cd ~/Documents/product-books-mcp
S=designing-data-intensive-applications
cp "$HOME/Downloads/cursos/System Design Books"/Designing*.pdf data/raw/$S.pdf
mdls -name kMDItemNumberOfPages "$HOME/Downloads/cursos/System Design Books"/Designing*.pdf
time marker_single data/raw/$S.pdf --output_dir data/tmp/probe --output_format markdown --disable_image_extraction --disable_ocr --page_range 20-29
wc -c < data/tmp/probe/$S/$S.md
```

### 2b. Convert and check

If the probe was under 1,000 bytes, remove `--disable_ocr` from the Marker line before running it.

```bash
cd ~/Documents/product-books-mcp
S=designing-data-intensive-applications
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

Check: over 1 MB, with at least 12 `#` or `##` headings (12 chapters) and many more at deeper levels.

### 2c. Chunk, embed and verify

```bash
cd ~/Documents/product-books-mcp
S=designing-data-intensive-applications
node src/ingest/chunk.ts $S
node src/ingest/embed.ts $S
wc -l < data/chunks/$S.jsonl
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$S'"
```

Check: the same as 1c.

## Book 3: Software Architecture: The Hard Parts

Done 2026-09-30 through the EPUB route: 662 chunks, database count equal. Do not convert it again.

### 3a. Probe (about 1 minute)

```bash
cd ~/Documents/product-books-mcp
S=software-architecture-the-hard-parts
cp "$HOME/Downloads/cursos/System Design Books"/*hard-parts*.pdf data/raw/$S.pdf
mdls -name kMDItemNumberOfPages "$HOME/Downloads/cursos/System Design Books"/*hard-parts*.pdf
time marker_single data/raw/$S.pdf --output_dir data/tmp/probe --output_format markdown --disable_image_extraction --disable_ocr --page_range 20-29
wc -c < data/tmp/probe/$S/$S.md
```

### 3b. Convert and check

If the probe was under 1,000 bytes, remove `--disable_ocr` from the Marker line before running it.

```bash
cd ~/Documents/product-books-mcp
S=software-architecture-the-hard-parts
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

Check: at least 15 `#` or `##` headings (15 chapters) and more at deeper levels.

### 3c. Chunk, embed and verify

```bash
cd ~/Documents/product-books-mcp
S=software-architecture-the-hard-parts
node src/ingest/chunk.ts $S
node src/ingest/embed.ts $S
wc -l < data/chunks/$S.jsonl
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$S'"
```

Check: the same as 1c.

## Book 4: Fundamentals of Software Architecture, 2nd edition

Done 2026-09-30 through the EPUB route: 907 chunks, database count equal. Do not convert it again.

### 4a. Probe (about 1 minute)

```bash
cd ~/Documents/product-books-mcp
S=fundamentals-of-software-architecture
cp "$HOME/Downloads/cursos/System Design Books"/fundamentals-of-software-architecture*.pdf data/raw/$S.pdf
mdls -name kMDItemNumberOfPages "$HOME/Downloads/cursos/System Design Books"/fundamentals-of-software-architecture*.pdf
time marker_single data/raw/$S.pdf --output_dir data/tmp/probe --output_format markdown --disable_image_extraction --disable_ocr --page_range 20-29
wc -c < data/tmp/probe/$S/$S.md
```

### 4b. Convert and check

If the probe was under 1,000 bytes, remove `--disable_ocr` from the Marker line before running it.

```bash
cd ~/Documents/product-books-mcp
S=fundamentals-of-software-architecture
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

Check: at least 20 `#` or `##` headings and more at deeper levels.

### 4c. Chunk, embed and verify

```bash
cd ~/Documents/product-books-mcp
S=fundamentals-of-software-architecture
node src/ingest/chunk.ts $S
node src/ingest/embed.ts $S
wc -l < data/chunks/$S.jsonl
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$S'"
```

Check: the same as 1c.

## Book 5: Building Evolutionary Architectures, 2nd edition

Where it fits: fitness functions and automated governance support weeks 14 and 15 (architecture characteristics, modularity), and its chapter on evolutionary data supports week 16 (online migrations).

### 5a. Probe (about 1 minute)

```bash
cd ~/Documents/product-books-mcp
S=building-evolutionary-architectures
cp "$HOME/Downloads/cursos/System Design Books"/*evolutionary-architectures*.pdf data/raw/$S.pdf
mdls -name kMDItemNumberOfPages "$HOME/Downloads/cursos/System Design Books"/*evolutionary-architectures*.pdf
time marker_single data/raw/$S.pdf --output_dir data/tmp/probe --output_format markdown --disable_image_extraction --disable_ocr --page_range 20-29
wc -c < data/tmp/probe/$S/$S.md
```

### 5b. Convert and check

If the probe was under 1,000 bytes, remove `--disable_ocr` from the Marker line before running it.

```bash
cd ~/Documents/product-books-mcp
S=building-evolutionary-architectures
time marker_single data/raw/$S.pdf --output_dir data/markdown --output_format markdown --disable_image_extraction --disable_ocr
wc -c < data/markdown/$S/$S.md
grep -oE '^#{1,6} ' data/markdown/$S/$S.md | sort | uniq -c
```

Check: at least 9 `#` or `##` headings (9 chapters) and more at deeper levels.

### 5c. Chunk, embed and verify

```bash
cd ~/Documents/product-books-mcp
S=building-evolutionary-architectures
node src/ingest/chunk.ts $S
node src/ingest/embed.ts $S
wc -l < data/chunks/$S.jsonl
sqlite3 data/db/books.sqlite "select count(*) from chunks where book = '$S'"
```

Check: the same as 1c.

## After each book: one test question

```bash
cd ~/Documents/product-books-mcp
node src/query.ts "how do quorums work in leaderless replication"
```

When you paste the result, paste only the first line of each hit (score, book and heading path), not the text under it. Until the search is split into two tools, `search_product_knowledge` also sees these books when nobody passes a `book` filter. Lessons pass `book`, so nothing is blocked.
