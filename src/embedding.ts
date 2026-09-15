import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const MODEL = "nomic-ai/nomic-embed-text-v1.5";
export const DIMENSIONS = 768;

let extractor: FeatureExtractionPipeline | null = null;

async function load(): Promise<FeatureExtractionPipeline> {
  extractor ??= await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  return extractor;
}

async function embed(texts: string[]): Promise<Float32Array[]> {
  const model = await load();
  const output = await model(texts, { pooling: "mean", normalize: true });
  const data = output.data as Float32Array;
  return texts.map((_, i) => data.slice(i * DIMENSIONS, (i + 1) * DIMENSIONS));
}

export function embedDocuments(texts: string[]): Promise<Float32Array[]> {
  return embed(texts.map((text) => `search_document: ${text}`));
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const [vector] = await embed([`search_query: ${text}`]);
  return vector!;
}

if (process.argv[1] === import.meta.filename) {
  const dot = (a: Float32Array, b: Float32Array) => a.reduce((sum, v, i) => sum + v * b[i]!, 0);
  const t0 = performance.now();
  const [related, unrelated] = await embedDocuments([
    "how much time the team is willing to spend on a feature",
    "a recipe for pancakes with blueberries",
  ]);
  const question = await embedQuery("what is appetite");
  console.log(`dims ${question.length}, ${(performance.now() - t0).toFixed(0)} ms including model load`);
  console.log(`similarity to the related text:   ${dot(question, related!).toFixed(3)}`);
  console.log(`similarity to the unrelated text: ${dot(question, unrelated!).toFixed(3)}`);
}
