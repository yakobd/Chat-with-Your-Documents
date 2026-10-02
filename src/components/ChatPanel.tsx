"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMessage, Citation } from "@/lib/types";

type Doc = { id: string; name: string };

type ChatResponse = {
  error?: string;
  chatId?: string;
  answer?: string;
  citations?: Citation[];
};

// Turns "[1]" markers in an answer into small numbered chips.
function renderAnswer(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup
        key={i}
        className="mx-0.5 rounded bg-ink px-1 py-px font-sans text-[0.65rem] font-medium text-white"
      >
        {part.slice(1, -1)}
      </sup>
    ) : (
      part
    )
  );
}

export default function ChatPanel({
  chatId,
  initialMessages,
  documents,
}: {
  chatId: string | null;
  initialMessages: ChatMessage[];
  documents: Doc[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Empty selection means "search all documents".
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleDoc(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    const pending: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      citations: [],
    };
    setMessages((prev) => [...prev, pending]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message: text,
          documentIds: selectedIds,
        }),
      });

      let data: ChatResponse = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok || !data.answer) {
        setError(data.error ?? "Something went wrong. Try again.");
        setMessages((prev) => prev.filter((m) => m.id !== pending.id));
        setInput(text); // give the question back so nothing is lost
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer!,
          citations: data.citations ?? [],
        },
      ]);

      // First message of a new chat: move to its URL so it shows in history.
      if (!chatId && data.chatId) {
        router.replace(`/chat?c=${data.chatId}`);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setMessages((prev) => prev.filter((m) => m.id !== pending.id));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  const noDocs = documents.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Which documents to search */}
      <details className="border-b border-line bg-white px-6 py-3 text-sm">
        <summary className="cursor-pointer text-muted">
          Searching{" "}
          <span className="font-medium text-ink">
            {selectedIds.length === 0
              ? "all documents"
              : `${selectedIds.length} selected`}
          </span>
        </summary>
        <div className="mt-3 space-y-2">
          {noDocs && (
            <p className="text-muted">
              No documents are ready yet.{" "}
              <Link href="/" className="underline">
                Upload one
              </Link>
              .
            </p>
          )}
          {documents.map((d) => (
            <label key={d.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(d.id)}
                onChange={() => toggleDoc(d.id)}
                className="h-4 w-4 accent-[#14213d]"
              />
              {d.name}
            </label>
          ))}
        </div>
      </details>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8">
          {messages.length === 0 && !loading && (
            <div className="py-16 text-center">
              <h2 className="font-read text-3xl">What do you want to know?</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                Ask about anything in your documents. Answers come only from
                what you uploaded, with the passages shown underneath.
              </p>
              {noDocs && (
                <Link
                  href="/"
                  className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
                >
                  Upload a document
                </Link>
              )}
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-white">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={m.id} className="border-l-2 border-mark pl-4">
                <div className="whitespace-pre-wrap font-read text-[1.05rem] leading-relaxed">
                  {renderAnswer(m.content)}
                </div>

                {m.citations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted">Sources</p>
                    {m.citations.map((c) => (
                      <details
                        key={c.chunk_id}
                        className="rounded-lg border border-line bg-white"
                      >
                        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                          <span className="rounded bg-ink px-1.5 py-px font-medium text-white">
                            {c.n}
                          </span>
                          <span className="truncate font-medium">
                            {c.document_name}
                          </span>
                          {c.page_number && (
                            <span className="shrink-0 text-muted">
                              page {c.page_number}
                            </span>
                          )}
                        </summary>
                        <p className="whitespace-pre-wrap border-t border-line px-3 py-3 font-read text-sm leading-relaxed">
                          <span className="mark">{c.content}</span>
                        </p>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {loading && (
            <p className="text-sm text-muted motion-safe:animate-pulse">
              Reading your documents...
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              disabled={loading || noDocs}
              placeholder={
                noDocs ? "Upload a document first" : "Ask about your documents"
              }
              className="flex-1 resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm disabled:bg-paper"
            />
            <button
              type="submit"
              disabled={loading || noDocs || !input.trim()}
              className="rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
