import { createClient } from "@/lib/supabase/server";
import { signout } from "./login/actions";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chat with your documents</h1>
        <form action={signout}>
          <button className="rounded border px-3 py-1 text-sm">Sign out</button>
        </form>
      </header>
      <p className="text-sm text-gray-600">Logged in as {user?.email}</p>
      {/* Upload and chat UI will go here */}
    </main>
  );
}
