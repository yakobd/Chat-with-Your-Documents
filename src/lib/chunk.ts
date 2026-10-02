export type Chunk = {
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
};

// About 2000 characters is roughly 500 tokens. Overlap keeps sentences that
// fall on a boundary retrievable from either side.
const CHUNK_SIZE = 2000;
const OVERLAP = 300;

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "") // Postgres text columns cannot store NUL characters
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitText(raw: string): string[] {
  const text = cleanText(raw);
  if (!text) return [];

  const pieces: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    if (end < text.length) {
      // Prefer to cut at a paragraph break, then a sentence end, then a space.
      const window = text.slice(start, end);
      const minBreak = CHUNK_SIZE * 0.5;
      const breakAt = [
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf(" "),
      ].find((i) => i > minBreak);
      if (breakAt !== undefined) end = start + breakAt + 1;
    }

    const piece = text.slice(start, end).trim();
    if (piece) pieces.push(piece);

    if (end >= text.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }

  return pieces;
}

// pages: one string per PDF page, or a single string for a text file.
// Chunks never cross a page boundary, so every chunk has one page number.
export function chunkDocument(pages: string[], hasPages: boolean): Chunk[] {
  const chunks: Chunk[] = [];

  pages.forEach((pageText, pageIdx) => {
    for (const content of splitText(pageText)) {
      chunks.push({
        content,
        pageNumber: hasPages ? pageIdx + 1 : null,
        chunkIndex: chunks.length,
      });
    }
  });

  return chunks;
}
