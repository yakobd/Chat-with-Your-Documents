"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let message = "Could not delete the document. Try again.";
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {
          // Non-JSON response
        }
        setError(message);
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted">Delete this document?</span>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="font-medium text-red-700 hover:underline disabled:opacity-50"
        >
          {busy ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-muted hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
        className="text-xs text-muted hover:text-red-700"
      >
        Delete
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
