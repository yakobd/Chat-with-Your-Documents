import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Chat with your documents</h1>

        {error && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        {message && (
          <p className="rounded bg-green-50 p-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border p-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded border p-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            formAction={login}
            className="flex-1 rounded bg-black p-2 text-white"
          >
            Log in
          </button>
          <button formAction={signup} className="flex-1 rounded border p-2">
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
