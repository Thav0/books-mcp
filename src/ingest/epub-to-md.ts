import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import AdmZip from "adm-zip";
import { DATA_MARKDOWN, DATA_TMP } from "../paths.ts";

const run = promisify(execFile);

// Some EPUBs mark titles with styled paragraphs instead of <h1>..<h3>.
// pandoc only turns real heading tags into "#", so we rewrite the paragraphs first.
// Key: the paragraph class. Value: the heading level it becomes.
const HEADING_CLASSES: Record<string, number> = {
  part: 1,
  part1: 1,
  chap: 2, // chapter number, e.g. "CHAPTER ONE"
  chapt: 2, // chapter title, merged with the number when they are adjacent
  chapt1: 2,
  head: 3,
  subhead: 3,
  subhead01a: 3,
};

const STYLED_PARAGRAPH = /<p class="([a-z0-9]+)"[^>]*>([\s\S]*?)<\/p>/g;
const NUMBER_THEN_TITLE = /<h2 data-kind="chap">([^<]*)<\/h2>\s*<h2 data-kind="chapt1?">([^<]*)<\/h2>/g;

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function promoteHeadings(html: string): string {
  const withHeadings = html.replace(STYLED_PARAGRAPH, (whole, cls: string, inner: string) => {
    const level = HEADING_CLASSES[cls];
    if (!level) return whole;
    return `<h${level} data-kind="${cls}">${plainText(inner)}</h${level}>`;
  });

  return withHeadings
    .replace(NUMBER_THEN_TITLE, (_, number: string, title: string) => `<h2>${number}: ${title}</h2>`)
    .replace(/ data-kind="[a-z0-9]+"/g, "");
}

function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, "") // image references, we dropped the images
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

async function main(inputPath: string): Promise<void> {
  const slug = basename(inputPath, ".epub");
  const fixedEpubPath = resolve(DATA_TMP, `${slug}.fixed.epub`);
  const outputPath = resolve(DATA_MARKDOWN, `${slug}.md`);

  const zip = new AdmZip(inputPath);
  let rewritten = 0;
  for (const entry of zip.getEntries()) {
    if (!/\.x?html?$/.test(entry.entryName)) continue;
    const html = entry.getData().toString("utf8");
    const fixed = promoteHeadings(html);
    if (fixed !== html) rewritten++;
    zip.updateFile(entry, Buffer.from(fixed, "utf8"));
  }

  await mkdir(DATA_TMP, { recursive: true });
  await mkdir(DATA_MARKDOWN, { recursive: true });
  zip.writeZip(fixedEpubPath);

  const { stdout } = await run("pandoc", [fixedEpubPath, "-t", "gfm-raw_html", "--wrap=none"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  await writeFile(outputPath, cleanMarkdown(stdout));

  console.log(`rewrote ${rewritten} html files, wrote ${outputPath}`);
}

if (process.argv[1] === import.meta.filename) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: node src/ingest/epub-to-md.ts <file.epub>");
    process.exit(1);
  }
  await main(resolve(inputPath));
}
