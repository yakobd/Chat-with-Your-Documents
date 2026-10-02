import OpenAI from "openai";

// If OPENROUTER_API_KEY is set, requests go through OpenRouter's
// OpenAI-compatible API. Otherwise the app uses OPENAI_API_KEY directly.
const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

// Must produce 1536 dimensions to match vector(1536) in the database.
// OpenRouter model names are prefixed with the provider.
export const EMBEDDING_MODEL = useOpenRouter
  ? "openai/text-embedding-3-small"
  : "text-embedding-3-small";

export const DEFAULT_CHAT_MODEL = useOpenRouter
  ? "openai/gpt-4o-mini"
  : "gpt-4o-mini";

let client: OpenAI | null = null;

// Created lazily so the build doesn't fail when env vars are missing.
export function getOpenAI(): OpenAI {
  if (!client) {
    client = useOpenRouter
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
