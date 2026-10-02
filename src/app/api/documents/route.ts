import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { chunkDocument } from "@/lib/chunk";
import { embedTexts } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel serverless functions reject request bodies above about 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

// Errors whose message is safe to show to the user.
class ProcessingError extends Error {}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Please log in again.", 401);

  // ---- Validate the upload -------------------------------------------
  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return fail("Could not read the upload.", 400);
  }

  if (!file) return fail("No file was uploaded.", 400);
  if (file.size === 0) return fail("The file is empty.", 400);
  if (file.size > MAX_BYTES) {
    return fail("The file is too large. The maximum size is 4 MB.", 413);
  }

  const lowerName = file.name.toLowerCase();
  const fileType = lowerName.endsWith(".pdf")
    ? "pdf"
    : lowerName.endsWith(".txt")
      ? "txt"
      : null;
  if (!fileType) {
    return fail("Unsupported format. Please upload a PDF or TXT file.", 415);
  }

  // ---- Create the document row ---------------------------------------
  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({ name: file.name, file_type: fileType, file_size: file.size })
    .select("id")
    .single();

  if (insertError || !doc) {
    console.error("documents insert failed:", insertError);
    return fail("Could not save the document. Please try again.", 500);
  }

  // ---- Extract, chunk, embed, store ----------------------------------
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let pages: string[];
    let pageCount: number | null = null;

    if (fileType === "pdf") {
      let result;
      try {
        const pdf = await getDocumentProxy(bytes);
        result = await extractText(pdf, { mergePages: false });
      } catch {
        throw new ProcessingError(
          "This PDF could not be read. It may be damaged or password protected."
        );
      }
      pages = result.text;
      pageCount = result.totalPages;
    } else {
      pages = [new TextDecoder("utf-8").decode(bytes)];
    }

    const chunks = chunkDocument(pages, fileType === "pdf");
    if (chunks.length === 0) {
      throw new ProcessingError(
        "No readable text was found. Scanned or image-only PDFs are not supported."
      );
    }

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const rows = chunks.map((c, i) => ({
      document_id: doc.id,
      content: c.content,
      page_number: c.pageNumber,
      chunk_index: c.chunkIndex,
      embedding: embeddings[i],
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase
        .from("chunks")
        .insert(rows.slice(i, i + 50));
      if (error) {
        console.error("chunks insert failed:", error);
        throw new ProcessingError("Could not save the document passages.");
      }
    }

    await supabase
      .from("documents")
      .update({ status: "ready", page_count: pageCount })
      .eq("id", doc.id);

    return NextResponse.json({
      id: doc.id,
      name: file.name,
      chunks: chunks.length,
    });
  } catch (err) {
    const message =
      err instanceof ProcessingError
        ? err.message
        : "Something went wrong while processing this file.";
    if (!(err instanceof ProcessingError)) console.error("processing failed:", err);

    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", doc.id);
    // Remove any partial chunks so a failed document leaves nothing behind.
    await supabase.from("chunks").delete().eq("document_id", doc.id);

    return fail(message, 422);
  }
}
