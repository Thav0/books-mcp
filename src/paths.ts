import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export const DATA_RAW = resolve(ROOT, "data/raw");
export const DATA_MARKDOWN = resolve(ROOT, "data/markdown");
export const DATA_TMP = resolve(ROOT, "data/tmp");
