import Link from "next/link";
import { redirect } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chats } = await supabase
    .from("chats")
    .select("id, title")
    .order("created_at", { ascending: false });

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name")
    .eq("status", "ready")
    .order("name");

  // Only load messages for a chat that really belongs to this user.
  const activeChat = chats?.find((chat) => chat.id === c) ?? null;

  let messages: ChatMessage[] = [];
  if (activeChat) {
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, citations")
      .eq("chat_id", activeChat.id)
      .order("created_at", { ascending: true });
    messages = (data ?? []) as ChatMessage[];
  }

  const chatList =
    !chats || chats.length === 0 ? (
      <p className="px-3 py-2 text-sm text-muted">No chats yet.</p>
    ) : (
      <ul className="space-y-0.5">
        {chats.map((chat) => (
          <li key={chat.id}>
            <Link
              href={`/chat?c=${chat.id}`}
              className={`block truncate border-l-2 px-3 py-2 text-sm hover:bg-paper ${
                chat.id === activeChat?.id
                  ? "border-mark bg-paper font-medium"
                  : "border-transparent"
              }`}
            >
              {chat.title}
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="space-y-4 p-4">
          <Logo />
          <Link
            href="/chat"
            className="block rounded-lg bg-ink py-2.5 text-center text-sm font-medium text-white hover:bg-ink/90"
          >
            New chat
          </Link>
          <Link
            href="/"
            className="block rounded-lg border border-line py-2.5 text-center text-sm font-medium hover:border-ink"
          >
            Upload documents
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto pb-2">{chatList}</nav>
        <div className="border-t border-line p-4 text-sm">
          <Link href="/" className="text-muted hover:text-ink">
            Manage documents
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <details className="relative">
            <summary className="cursor-pointer rounded-md border border-line px-3 py-1.5">
              Chats
            </summary>
            <div className="absolute right-0 z-10 mt-2 max-h-72 w-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
              {chatList}
            </div>
          </details>
          <Link href="/chat" className="rounded-md bg-ink px-3 py-1.5 text-white">
            New
          </Link>
          <Link href="/" className="text-muted">
            Documents
          </Link>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1">
        <ChatPanel
          key={activeChat?.id ?? "new"}
          chatId={activeChat?.id ?? null}
          initialMessages={messages}
          documents={documents ?? []}
        />
      </main>
    </div>
  );
}
