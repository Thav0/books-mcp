import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import * as sqliteVec from "sqlite-vec";
import { DATA_DB } from "./paths.ts";
import { DIMENSIONS } from "./embedding.ts";

export const DB_PATH = resolve(DATA_DB, "books.sqlite");

export function openDatabase(options: { readOnly?: boolean } = {}): DatabaseSync {
  const db = new DatabaseSync(DB_PATH, { allowExtension: true, readOnly: options.readOnly ?? false });
  sqliteVec.load(db);
  return db;
}

export function createSchema(db: DatabaseSync): void {
  db.exec(`
    create table if not exists chunks (
      id text primary key,
      book text not null,
      headings text not null,
      text text not null,
      timestamp text,
      tokens integer not null
    );
    create index if not exists chunks_book on chunks(book);
    create virtual table if not exists chunks_vec using vec0(
      id text primary key,
      embedding float[${DIMENSIONS}] distance_metric=cosine
    );
    create virtual table if not exists chunks_fts using fts5(id unindexed, headings, text);
  `);
}
