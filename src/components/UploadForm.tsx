"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 4 * 1024 * 1024;

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".txt")) {
      setError("Unsupported format. Upload a PDF or TXT file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("The file is too large. The maximum size is 4 MB.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body });

      let data: { error?: string; name?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (for example a platform size limit)
      }

      if (!res.ok) {
        setError(data.error ?? "Upload failed. Try again.");
        return;
      }

      setSuccess(`"${data.name ?? file.name}" is ready to chat with.`);
      if (inputRef.current) inputRef.current.value = "";
      setFileName("");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="h-fit rounded-xl border border-line bg-white p-5"
    >
      <h2 className="font-read text-lg">Add a document</h2>

      <label
        htmlFor="file"
        className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center text-sm hover:border-ink focus-within:border-ink"
      >
        <span className="font-medium">
          {fileName || "Choose a PDF or TXT file"}
        </span>
        <span className="text-xs text-muted">Up to 4 MB</span>
        <input
          ref={inputRef}
          id="file"
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          disabled={uploading}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="sr-only"
        />
      </label>

      <button
        type="submit"
        disabled={uploading}
        className="mt-4 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {uploading ? "Processing..." : "Upload"}
      </button>
      <p className="mt-3 text-xs text-muted">
        Scanned PDFs without selectable text can&apos;t be read.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </p>
      )}
    </form>
  );
}
