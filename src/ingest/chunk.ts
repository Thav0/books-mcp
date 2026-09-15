import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { DATA_CHUNKS } from "../paths.ts";
import { listBooks } from "./books.ts";

export type Chunk = {
  id: string;
  book: string;
  headings: string[];
  text: string;
  timestamp: string | null;
  tokens: number;
};

type Paragraph = { text: string; timestamp: string | null };
type Section = { headings: string[]; paragraphs: Paragraph[] };

// Roughly 800 tokens. Embedding models like focused input, and the
// "chars / 4" estimate is close enough for English prose.
const MAX_CHARS = 3200;
const OVERLAP_CHARS = 400;

const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const TIMESTAMP = /^<!--\s*t=(\d{2}:\d{2}:\d{2})\s*-->$/;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: MAX_CHARS,
  chunkOverlap: OVERLAP_CHARS,
});

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function cleanLine(line: string): string {
  return line
    .replace(/<span[^>]*><\/span>/g, "") // Marker page anchors
    .replace(/^!\[[^\]]*\]\([^)]*\)$/, "") // image references
    .trimEnd();
}

// Walk the file once. A heading of level N replaces the stack from N down,
// so every section knows its full path, e.g. ["Part 1", "Chapter 3", "Set Boundaries"].
export function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let stack: string[] = [];
  let paragraphs: Paragraph[] = [];
  let pending: string[] = [];
  let pendingTimestamp: string | null = null;

  const flushParagraph = () => {
    const text = pending.join(" ").replace(/\s+/g, " ").trim();
    if (text) paragraphs.push({ text, timestamp: pendingTimestamp });
    pending = [];
    pendingTimestamp = null;
  };
  const flushSection = () => {
    flushParagraph();
    if (paragraphs.length) sections.push({ headings: stack, paragraphs });
    paragraphs = [];
  };

  for (const rawLine of markdown.split("\n")) {
    const line = cleanLine(rawLine);
    const heading = HEADING.exec(line);
    const timestamp = TIMESTAMP.exec(line);

    if (heading) {
      flushSection();
      const level = heading[1]!.length;
      stack = [...stack.slice(0, level - 1), heading[2]!];
    } else if (timestamp) {
      flushParagraph();
      pendingTimestamp = timestamp[1]!;
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      pending.push(line);
    }
  }
  flushSection();

  return sections;
}

// Pack whole paragraphs up to MAX_CHARS. Only a single oversized paragraph
// gets cut mid-text, with overlap, so a sentence is never split otherwise.
async function packSection(section: Section): Promise<Omit<Chunk, "id" | "book">[]> {
  const chunks: Omit<Chunk, "id" | "book">[] = [];
  let buffer: Paragraph[] = [];
  let size = 0;

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.map((p) => p.text).join("\n\n");
    chunks.push({
      headings: section.headings,
      text,
      timestamp: buffer.find((p) => p.timestamp)?.timestamp ?? null,
      tokens: estimateTokens(text),
    });
    buffer = [];
    size = 0;
  };

  for (const paragraph of section.paragraphs) {
    if (paragraph.text.length > MAX_CHARS) {
      flush();
      for (const piece of await splitter.splitText(paragraph.text)) {
        chunks.push({
          headings: section.headings,
          text: piece,
          timestamp: paragraph.timestamp,
          tokens: estimateTokens(piece),
        });
      }
      continue;
    }
    if (size + paragraph.text.length > MAX_CHARS) flush();
    buffer.push(paragraph);
    size += paragraph.text.length + 2;
  }
  flush();

  return chunks;
}

export async function chunkMarkdown(markdown: string, book: string): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  for (const section of parseSections(markdown)) {
    for (const chunk of await packSection(section)) {
      chunks.push({ id: `${book}#${chunks.length}`, book, ...chunk });
    }
  }
  return chunks;
}

async function main(onlySlug?: string): Promise<void> {
  await mkdir(DATA_CHUNKS, { recursive: true });
  const books = (await listBooks()).filter((b) => !onlySlug || b.slug === onlySlug);
  if (!books.length) throw new Error(`no book found${onlySlug ? ` for "${onlySlug}"` : ""}`);

  for (const book of books) {
    const chunks = await chunkMarkdown(await readFile(book.path, "utf8"), book.slug);
    const outputPath = resolve(DATA_CHUNKS, `${book.slug}.jsonl`);
    await writeFile(outputPath, chunks.map((c) => JSON.stringify(c)).join("\n") + "\n");

    const tokens = chunks.map((c) => c.tokens);
    const avg = Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length);
    console.log(`${book.slug}: ${chunks.length} chunks, avg ${avg} tokens, max ${Math.max(...tokens)}`);
  }
}

if (process.argv[1] === import.meta.filename) {
  await main(process.argv[2]);
}
