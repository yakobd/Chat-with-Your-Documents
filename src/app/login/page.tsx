import Logo from "@/components/Logo";
import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: shows what the product does */}
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo />

        <div className="max-w-md space-y-8">
          <h1 className="font-read text-4xl leading-tight">
            Answers that show where they came from.
          </h1>

          <div className="space-y-4 rounded-xl bg-white/10 p-5 text-sm">
            <p className="ml-auto w-fit rounded-2xl rounded-br-sm bg-white px-4 py-2 text-ink">
              When does the lease end?
            </p>
            <div className="border-l-2 border-mark pl-4">
              <p className="font-read text-base leading-relaxed">
                The lease ends on 31 August 2027.
                <sup className="mx-0.5 rounded bg-white px-1 py-px font-sans text-[0.65rem] font-medium text-ink">
                  1
                </sup>
              </p>
              <p className="mt-3 text-xs text-white/70">
                Lease_Agreement.pdf, page 2
              </p>
              <p className="mt-1 font-read leading-relaxed">
                <span className="mark text-ink">
                  The term of this lease shall expire on 31 August 2027.
                </span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/70">
          Each account only sees its own documents and chats.
        </p>
      </section>

      {/* Right: form */}
      <section className="flex items-center justify-center p-6">
        <form className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="font-read text-2xl">Log in or create an account</h2>
            <p className="mt-1 text-sm text-muted">
              Upload documents, then ask questions about them.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
            />
            <p className="text-xs text-muted">At least 6 characters.</p>
          </div>

          <div className="flex gap-3">
            <button
              formAction={login}
              className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-medium text-white hover:bg-ink/90"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-lg border border-line bg-white py-2.5 text-sm font-medium hover:border-ink"
            >
              Create account
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
