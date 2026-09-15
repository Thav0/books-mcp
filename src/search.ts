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

export async function searchVector(query: string, limit = 5, book?: string): Promise<Hit[]> {
  const k = Math.trunc(book ? limit * 5 : limit);
  const rows = getDb()
    .prepare(
      `select c.id, c.book, c.headings, c.text, c.timestamp, v.distance
       from chunks_vec v join chunks c on c.id = v.id
       where v.embedding match ? and k = ${k}
       order by v.distance`,
    )
    .all(await embedQuery(query)) as Row[];

  return rows
    .filter((r) => !book || r.book === book)
    .slice(0, limit)
    .map((r) => ({ ...r, headings: JSON.parse(r.headings) as string[], score: 1 - r.distance }));
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

function searchFtsIds(query: string, limit: number): string[] {
  const fts = toFtsQuery(query);
  if (!fts) return [];
  const rows = getDb()
    .prepare(`select id from chunks_fts where chunks_fts match ? order by rank limit ${Math.trunc(limit)}`)
    .all(fts) as { id: string }[];
  return rows.map((r) => r.id);
}

async function searchVectorIds(query: string, limit: number): Promise<string[]> {
  const rows = getDb()
    .prepare(`select id from chunks_vec where embedding match ? and k = ${Math.trunc(limit)} order by distance`)
    .all(await embedQuery(query)) as { id: string }[];
  return rows.map((r) => r.id);
}

export async function searchHybrid(query: string, limit = 5, book?: string): Promise<Hit[]> {
  const pool = book ? limit * 8 : limit * 4;
  const lists = [await searchVectorIds(query, pool), searchFtsIds(query, pool)];

  const scores = new Map<string, number>();
  for (const ids of lists) {
    ids.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1)));
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const select = getDb().prepare("select id, book, headings, text, timestamp from chunks where id = ?");
  const hits: Hit[] = [];
  for (const [id, score] of ranked) {
    const row = select.get(id) as Omit<Row, "distance"> | undefined;
    if (!row || (book && row.book !== book)) continue;
    hits.push({ ...row, headings: JSON.parse(row.headings) as string[], score });
    if (hits.length === limit) break;
  }
  return hits;
}
