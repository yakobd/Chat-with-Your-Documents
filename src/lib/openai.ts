import OpenAI from "openai";

// Must match vector(1536) in the database. If you change the model,
// change the vector size in the SQL migration too.
export const EMBEDDING_MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;

// Created lazily so the build doesn't fail when the env var is missing.
export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    embeddings.push(...res.data.map((d) => d.embedding));
  }

  return embeddings;
}
