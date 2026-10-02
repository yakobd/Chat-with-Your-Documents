# DocChat: chat with your documents

Upload PDF and text files, then ask questions about them. Answers are generated only from the uploaded content and show the passages they came from.

**Stack:** Next.js (App Router, TypeScript, Tailwind CSS), Supabase (Auth, Postgres, pgvector), OpenAI API, Vercel.

## How it works

1. **Upload:** a PDF or TXT file (up to 4 MB) is sent to `/api/documents`.
2. **Processing:** text is extracted page by page, split into overlapping chunks of about 2,000 characters (roughly 500 tokens), and each chunk is turned into an embedding with OpenAI `text-embedding-3-small`. Chunks, page numbers, and embeddings are stored in Supabase (pgvector).
3. **Chat:** the question is embedded, the most similar chunks are retrieved with the `match_chunks` SQL function, and the model is told to answer only from those numbered passages.
4. **Citations:** the answer contains markers like [1]. The app shows the passages the answer actually cites, with document name and page. If nothing relevant is found, the app says so instead of guessing.
5. **Privacy:** Row Level Security makes sure each user can only read and write their own documents, chunks, chats, and messages.

## Moving the project to your own accounts

You need three accounts: **Supabase**, **OpenAI**, and **Vercel** (plus GitHub, where this repo lives). Follow the steps in order. Nothing in this project depends on the developer's accounts.

### Step 1: Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**. Choose a name, a strong database password (save it), and a region near your users.
2. Wait until the project finishes setting up.
3. Open **SQL Editor → New query**, paste the full contents of [`supabase/001_init.sql`](supabase/001_init.sql), and click **Run**. This single file:
   - enables the `vector` extension (pgvector),
   - creates the tables `documents`, `chunks`, `chats`, `messages`,
   - creates the indexes (including the vector index),
   - enables Row Level Security with per-user policies,
   - creates the `match_chunks` search function.
4. Check **Table Editor**: you should see the four tables.
5. Open **Project Settings → API** (or **API Keys**) and copy:
   - the **Project URL**,
   - the **anon / publishable** key.

   Do not use the `service_role` / secret key. This app does not need it.

No storage bucket is required: files are processed in memory and only the extracted text chunks are stored.

### Step 2: Choose the sign-up behavior

Go to **Authentication → Sign In / Providers → Email**. The **Confirm email** option decides whether new users must click a link in an email before logging in.

- **On (recommended for production):** users confirm their email, then log in with their password.
- **Off:** users are logged in immediately after sign-up. Handy for testing.

Supabase's built-in email sender is rate limited. For real use, set up your own SMTP provider under **Authentication → Emails → SMTP Settings**.

### Step 3: Create the OpenAI API key

1. Sign in at [platform.openai.com](https://platform.openai.com).
2. Open **API keys → Create new secret key**. Copy it right away; it can't be shown again.
3. Open **Billing** and add credit. The API will not work without it.

The app uses `text-embedding-3-small` for embeddings and `gpt-4o-mini` for answers by default. To use another chat model, set `OPENAI_CHAT_MODEL` (see below). The embedding model must stay compatible with the database column `vector(1536)`.

### Step 4: Deploy to Vercel

1. Make sure the code is in a GitHub repository you control.
2. Sign in at [vercel.com](https://vercel.com) with GitHub, then click **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Before clicking **Deploy**, open **Environment Variables** and add the variables from the table below.
4. Click **Deploy** and wait for the build to finish. Copy your production URL (for example `https://your-app.vercel.app`).

### Step 5: Tell Supabase your site URL

Without this, links in confirmation emails point to `localhost`.

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel production URL.
3. Add `https://your-app.vercel.app/**` to **Redirect URLs**.

If you use **Confirm email**, a new user clicks the link in the email and is then taken to the app; they log in with the email and password they chose.

### Step 6: Test everything

Run the checklist at the bottom of this file against the deployed URL.

## Environment variables

| Variable | Required | What it is for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | The Supabase anon / publishable key. Safe for the browser because Row Level Security protects the data. |
| `OPENAI_API_KEY` | Yes | OpenAI key used on the server for embeddings and answers. Never expose it in the browser. |
| `OPENAI_CHAT_MODEL` | No | Model used to write answers. Defaults to `gpt-4o-mini`. |

After changing environment variables on Vercel, **redeploy** so they take effect.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open <http://localhost:3000>.

## Limits and notes

- **File size:** 4 MB per file (Vercel serverless functions reject larger request bodies).
- **File types:** PDF and TXT. Scanned or image-only PDFs have no selectable text and are rejected with a clear message.
- **Follow-up questions:** retrieval uses the latest question, so very short follow-ups may find nothing. Rephrase with more detail.
- **Cost:** each upload makes one embeddings request per batch of chunks, and each question makes one embeddings request and one answer request.

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| Upload fails with "Something went wrong" | Check the Vercel function logs. Usually the OpenAI key is missing or the account has no billing credit. |
| "Model not found" in the logs | Set `OPENAI_CHAT_MODEL` to a model available to your OpenAI account. |
| Everything redirects to the login page after deploying | The Supabase URL or anon key on Vercel is wrong. Fix it and redeploy. |
| Confirmation email links open `localhost` | Set the Site URL in **Authentication → URL Configuration** (Step 5). |
| "Could not save the document passages" | The SQL in `supabase/001_init.sql` was not fully run. Run it again on a fresh project. |
| Answers always say nothing was found | The document may still be processing or failed. Check its status on the Documents page. |

## Test checklist

Run these after setup (locally or on Vercel).

- [ ] Sign up with a new email, confirm it if required, and log in.
- [ ] Log out and log back in. Visiting `/` while logged out redirects to the login page.
- [ ] Upload a small `.txt` file. It shows **Ready** on the Documents page.
- [ ] Upload a PDF with selectable text. It shows **Ready** with a page count.
- [ ] In Supabase **Table Editor → chunks**, rows exist with content, page number, and embedding.
- [ ] Ask a question the document answers. The answer shows numbered sources, and expanding one shows the quoted passage with the right page.
- [ ] Ask an unrelated question (for example a general knowledge question). The app says it couldn't find it in your documents.
- [ ] Refresh the page. The chat appears in the sidebar and its messages are still there.
- [ ] Under **Searching**, select a single document and confirm answers come only from it.
- [ ] Upload a file over 4 MB: a clear "too large" message appears.
- [ ] Upload an unsupported file (for example `.docx`): a clear "unsupported format" message appears.
- [ ] Upload a scanned or image-only PDF: a clear "no readable text" message appears.
- [ ] Delete a document. It disappears from the list and its chunks are removed.
- [ ] Sign up a second user and confirm they cannot see the first user's documents or chats.
