export type Citation = {
  n: number; // the [n] marker used in the answer text
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number | null;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
};
