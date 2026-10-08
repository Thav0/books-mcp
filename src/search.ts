import { openDatabase } from "./db.ts";
import { embedQuery } from "./embedding.ts";

export type Hit = {
  id: string;
  book: string;
  headings: string[];
  text: string;
  timestamp: string | null;
  score: number;
};

type Row = { id: string; book: string; headings: string; text: string; timestamp: string | null; distance: number };

let db: ReturnType<typeof openDatabase> | null = null;
function getDb() {
  db ??= openDatabase({ readOnly: true });
  return db;
}

function placeholders(books: readonly string[]): string {
  return books.map(() => "?").join(", ");
}

function toHit(row: Omit<Row, "distance">, score: number): Hit {
  return { ...row, headings: JSON.parse(row.headings) as string[], score };
}

// With a book list the filter runs before ranking: every chunk of those books is scored
// (a brute-force scan, a few ms at this size), so a small book never comes back short.
// Without one, the vec0 KNN index ranks the whole library.
function nearest(vector: Float32Array, k: number, books?: readonly string[]): Row[] {
  if (!books) {
    return getDb()
      .prepare(
        `select c.id, c.book, c.headings, c.text, c.timestamp, v.distance
         from chunks_vec v join chunks c on c.id = v.id
         where v.embedding match ? and k = ${Math.trunc(k)}
         order by v.distance`,
      )
      .all(vector) as Row[];
  }
  return getDb()
    .prepare(
      `select c.id, c.book, c.headings, c.text, c.timestamp, vec_distance_cosine(v.embedding, ?) as distance
       from chunks_vec v cross join chunks c on c.id = v.id
       where c.book in (${placeholders(books)})
       order by distance limit ${Math.trunc(k)}`,
    )
    .all(vector, ...books) as Row[];
}

export async function searchVector(query: string, limit = 5, books?: readonly string[]): Promise<Hit[]> {
  return nearest(await embedQuery(query), limit, books).map((r) => toHit(r, 1 - r.distance));
}

export function formatHit(hit: Hit): string {
  const where = [hit.book, ...hit.headings].join(" > ");
  const time = hit.timestamp ? ` @ ${hit.timestamp}` : "";
  return `[${hit.score.toFixed(3)}] ${where}${time}\n${hit.text.slice(0, 200).replace(/\s+/g, " ")}...`;
}

const RRF_K = 60;

function toFtsQuery(text: string): string {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.map((w) => `"${w}"`).join(" ");
}

export function searchFtsIds(query: string, limit: number, books?: readonly string[]): string[] {
  const fts = toFtsQuery(query);
  if (!fts) return [];
  const sql = books
    ? `select f.id from chunks_fts f join chunks c on c.id = f.id
       where chunks_fts match ? and c.book in (${placeholders(books)})
       order by f.rank limit ${Math.trunc(limit)}`
    : `select id from chunks_fts where chunks_fts match ? order by rank limit ${Math.trunc(limit)}`;
  const rows = getDb()
    .prepare(sql)
    .all(fts, ...(books ?? [])) as { id: string }[];
  return rows.map((r) => r.id);
}

export async function searchHybrid(query: string, limit = 5, books?: readonly string[]): Promise<Hit[]> {
  const pool = limit * 4;
  const vectorIds = nearest(await embedQuery(query), pool, books).map((r) => r.id);
  const lists = [vectorIds, searchFtsIds(query, pool, books)];

  const scores = new Map<string, number>();
  for (const ids of lists) {
    ids.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1)));
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const select = getDb().prepare("select id, book, headings, text, timestamp from chunks where id = ?");
  const hits: Hit[] = [];
  for (const [id, score] of ranked) {
    const row = select.get(id) as Omit<Row, "distance"> | undefined;
    if (row) hits.push(toHit(row, score));
  }
  return hits;
}
