import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { DATA_MARKDOWN } from "../paths.ts";

type Cue = { start: number; end: number; text: string };
type Paragraph = { start: number; text: string };

// A pause longer than this between two cues starts a new paragraph.
const MAX_GAP_SECONDS = 2;
// A paragraph never grows past this many words, so chunks stay focused.
const MAX_WORDS = 120;

const TIME_RANGE = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3}) --> (\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

function toSeconds(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function parseSrt(raw: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split("\n");
    const rangeIndex = lines.findIndex((line) => TIME_RANGE.test(line));
    if (rangeIndex === -1) continue;

    const match = TIME_RANGE.exec(lines[rangeIndex]!)!;
    const text = lines
      .slice(rangeIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    cues.push({
      start: toSeconds(match[1]!, match[2]!, match[3]!, match[4]!),
      end: toSeconds(match[5]!, match[6]!, match[7]!, match[8]!),
      text,
    });
  }

  return cues;
}

export function toParagraphs(cues: Cue[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let current: Paragraph | null = null;
  let previousEnd = 0;
  let words = 0;

  for (const cue of cues) {
    const gap = cue.start - previousEnd;
    if (current && (gap > MAX_GAP_SECONDS || words >= MAX_WORDS)) {
      paragraphs.push(current);
      current = null;
    }

    if (!current) {
      current = { start: cue.start, text: cue.text };
      words = 0;
    } else {
      current.text += ` ${cue.text}`;
    }

    words += cue.text.split(" ").length;
    previousEnd = cue.end;
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

export function srtToMarkdown(raw: string, title: string): string {
  const body = toParagraphs(parseSrt(raw))
    .map((p) => `<!-- t=${formatTime(p.start)} -->\n${p.text}`)
    .join("\n\n");
  return `# ${title}\n\n${body}\n`;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function main(inputPath: string): Promise<void> {
  const slug = basename(inputPath, ".srt");
  const outputPath = resolve(DATA_MARKDOWN, `${slug}.md`);

  const raw = await readFile(inputPath, "utf8");
  const markdown = srtToMarkdown(raw, titleFromSlug(slug));

  await mkdir(DATA_MARKDOWN, { recursive: true });
  await writeFile(outputPath, markdown);

  const paragraphs = markdown.split("\n\n").length - 1;
  console.log(`wrote ${outputPath} (${paragraphs} paragraphs)`);
}

if (process.argv[1] === import.meta.filename) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: node src/ingest/srt-to-md.ts <file.srt>");
    process.exit(1);
  }
  await main(resolve(inputPath));
}
