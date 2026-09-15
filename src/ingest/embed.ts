import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createSchema, openDatabase } from "../db.ts";
import { embedDocuments } from "../embedding.ts";
import { DATA_CHUNKS } from "../paths.ts";
import type { Chunk } from "./chunk.ts";

const BATCH = 16;

async function listChunkFiles(onlySlug?: string): Promise<{ slug: string; path: string }[]> {
  const names = (await readdir(DATA_CHUNKS)).filter((n) => n.endsWith(".jsonl"));
  return names
    .map((n) => ({ slug: basename(n, ".jsonl"), path: resolve(DATA_CHUNKS, n) }))
    .filter((f) => !onlySlug || f.slug === onlySlug)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function readChunks(path: string): Promise<Chunk[]> {
  const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line) as Chunk);
}

export async function embedBook(db: ReturnType<typeof openDatabase>, slug: string, chunks: Chunk[]): Promise<void> {
  const insertChunk = db.prepare(
    "insert into chunks (id, book, headings, text, timestamp, tokens) values (?, ?, ?, ?, ?, ?)",
  );
  const insertVec = db.prepare("insert into chunks_vec (id, embedding) values (?, ?)");
  const insertFts = db.prepare("insert into chunks_fts (id, headings, text) values (?, ?, ?)");
  const deleteVec = db.prepare("delete from chunks_vec where id = ?");
  const deleteFts = db.prepare("delete from chunks_fts where id = ?");

  db.exec("begin");
  try {
    const old = db.prepare("select id from chunks where book = ?").all(slug) as { id: string }[];
    for (const { id } of old) {
      deleteVec.run(id);
      deleteFts.run(id);
    }
    db.prepare("delete from chunks where book = ?").run(slug);

    for (let start = 0; start < chunks.length; start += BATCH) {
      const batch = chunks.slice(start, start + BATCH);
      const vectors = await embedDocuments(batch.map((c) => `${c.headings.join(" > ")}\n\n${c.text}`));
      batch.forEach((c, i) => {
        const headings = c.headings.join(" > ");
        insertChunk.run(c.id, c.book, JSON.stringify(c.headings), c.text, c.timestamp, c.tokens);
        insertVec.run(c.id, vectors[i]!);
        insertFts.run(c.id, headings, c.text);
      });
      process.stderr.write(`\r${slug}: ${Math.min(start + BATCH, chunks.length)}/${chunks.length}`);
    }
    db.exec("commit");
    process.stderr.write("\n");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

async function main(onlySlug?: string): Promise<void> {
  const files = await listChunkFiles(onlySlug);
  if (!files.length) throw new Error(`no chunk file found${onlySlug ? ` for "${onlySlug}"` : ""}`);

  const db = openDatabase();
  createSchema(db);
  for (const file of files) {
    const chunks = await readChunks(file.path);
    const t0 = performance.now();
    await embedBook(db, file.slug, chunks);
    console.log(`${file.slug}: ${chunks.length} chunks in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
  db.close();
}

if (process.argv[1] === import.meta.filename) {
  await main(process.argv[2]);
}
