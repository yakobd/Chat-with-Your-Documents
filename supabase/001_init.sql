-- =====================================================================
-- Chat with Your Documents: initial schema
-- Run this once in the Supabase SQL Editor (or as a migration file).
-- Embedding size 1536 matches OpenAI text-embedding-3-small.
-- If you switch embedding models, change vector(1536) everywhere below.
-- =====================================================================

-- 1. Extension ---------------------------------------------------------
create extension if not exists vector with schema extensions;

-- 2. Tables ------------------------------------------------------------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  file_type     text not null check (file_type in ('pdf', 'txt')),
  file_size     bigint,
  page_count    int,
  status        text not null default 'processing'
                check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at    timestamptz not null default now()
);

create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content     text not null,
  page_number int,
  chunk_index int not null,
  embedding   extensions.vector(1536) not null,
  created_at  timestamptz not null default now()
);

create table public.chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now()
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  -- For assistant messages: array of
  -- {chunk_id, document_id, document_name, page_number, content}
  citations  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. Indexes -----------------------------------------------------------
create index documents_user_id_idx on public.documents (user_id);
create index chunks_document_id_idx on public.chunks (document_id);
create index chunks_user_id_idx on public.chunks (user_id);
create index chats_user_id_idx on public.chats (user_id);
create index messages_chat_id_idx on public.messages (chat_id, created_at);

-- Approximate nearest-neighbour index for cosine distance
create index chunks_embedding_idx
  on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- 4. Row Level Security -----------------------------------------------
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;
alter table public.chats     enable row level security;
alter table public.messages  enable row level security;

-- documents
create policy "documents_select_own" on public.documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "documents_insert_own" on public.documents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "documents_update_own" on public.documents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "documents_delete_own" on public.documents
  for delete to authenticated using ((select auth.uid()) = user_id);

-- chunks (insert must point at a document the user owns)
create policy "chunks_select_own" on public.chunks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "chunks_insert_own" on public.chunks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy "chunks_delete_own" on public.chunks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- chats
create policy "chats_select_own" on public.chats
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "chats_insert_own" on public.chats
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "chats_update_own" on public.chats
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "chats_delete_own" on public.chats
  for delete to authenticated using ((select auth.uid()) = user_id);

-- messages (insert must point at a chat the user owns)
create policy "messages_select_own" on public.messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "messages_insert_own" on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = (select auth.uid())
    )
  );
create policy "messages_delete_own" on public.messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 5. Similarity search function ---------------------------------------
-- Runs as the calling user (security invoker), so RLS applies.
-- IMPORTANT: call it from a Supabase client created with the user's
-- session, not the service_role key, so auth.uid() is set.
create or replace function public.match_chunks (
  query_embedding      extensions.vector(1536),
  match_count          int     default 5,
  filter_document_ids  uuid[]  default null,
  min_similarity       float   default 0.0
)
returns table (
  id            uuid,
  document_id   uuid,
  document_name text,
  page_number   int,
  content       text,
  similarity    float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    d.name as document_name,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = auth.uid()
    and d.status = 'ready'
    and (filter_document_ids is null or c.document_id = any (filter_document_ids))
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
