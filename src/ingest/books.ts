import { access, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { DATA_MARKDOWN } from "../paths.ts";

export type Book = { slug: string; path: string };

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Two layouts live in data/markdown: flat "<slug>.md" from our scripts,
// and "<slug>/<slug>.md" from Marker. Callers only see { slug, path }.
export async function listBooks(): Promise<Book[]> {
  const entries = await readdir(DATA_MARKDOWN, { withFileTypes: true });
  const books: Book[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      books.push({ slug: basename(entry.name, ".md"), path: resolve(DATA_MARKDOWN, entry.name) });
    } else if (entry.isDirectory()) {
      const candidate = resolve(DATA_MARKDOWN, entry.name, `${entry.name}.md`);
      if (await exists(candidate)) books.push({ slug: entry.name, path: candidate });
    }
  }

  return books.sort((a, b) => a.slug.localeCompare(b.slug));
}
