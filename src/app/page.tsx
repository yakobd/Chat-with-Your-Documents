import Link from "next/link";
import Logo from "@/components/Logo";
import DeleteButton from "@/components/DeleteButton";
import UploadForm from "@/components/UploadForm";
import { createClient } from "@/lib/supabase/server";
import { signout } from "./login/actions";

const STATUS = {
  ready: { label: "Ready", cls: "bg-emerald-50 text-emerald-800" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-800" },
  processing: { label: "Processing", cls: "bg-amber-50 text-amber-800" },
} as const;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, status, page_count, error_message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="rounded-md bg-paper px-3 py-1.5 font-medium">
                Documents
              </Link>
              <Link
                href="/chat"
                className="rounded-md px-3 py-1.5 text-muted hover:bg-paper"
              >
                Chat
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user?.email}</span>
            <form action={signout}>
              <button className="rounded-md border border-line px-3 py-1.5 hover:bg-paper">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-read text-3xl">Your documents</h1>
            <p className="mt-1 max-w-prose text-muted">
              Upload PDFs or text files, then ask questions in chat. Every answer
              shows the passages it came from.
            </p>
          </div>
          <Link
            href="/chat"
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
          >
            Ask a question
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
          <UploadForm />

          <section>
            {!documents || documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
                <p className="font-read text-lg">No documents yet</p>
                <p className="mt-1 text-sm text-muted">
                  Upload your first file to start asking questions.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {documents.map((doc) => {
                  const status =
                    STATUS[doc.status as keyof typeof STATUS] ?? STATUS.processing;
                  return (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted">
                          {doc.page_count ? `${doc.page_count} pages, ` : ""}
                          uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        {doc.status === "failed" && doc.error_message && (
                          <p className="mt-1 text-xs text-red-700">
                            {doc.error_message}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}
                        >
                          {status.label}
                        </span>
                        <DeleteButton id={doc.id} name={doc.name} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
