import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const { id } = await params;

  // Row level security limits this to the user's own documents.
  // Deleting the document also deletes its chunks (ON DELETE CASCADE).
  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("document delete failed:", error);
    return NextResponse.json(
      { error: "Could not delete the document. Try again." },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
