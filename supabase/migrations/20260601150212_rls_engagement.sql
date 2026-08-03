-- ── reviews: public read; insert via RPC (eligibility) later; admin manage ────
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (true);

-- ── conversations / messages: participants read. Send via RPC later ───────────
alter table public.conversations enable row level security;
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    participant_a_id = (select auth.uid())
    or participant_b_id = (select auth.uid())
    or (select public.is_admin())
  );

alter table public.messages enable row level security;
create policy messages_select on public.messages
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.participant_a_id, c.participant_b_id)
    )
  );

-- ── posts: public read; author insert; author/admin delete ────────────────────
alter table public.posts enable row level security;
create policy posts_public_read on public.posts
  for select to anon, authenticated using (true);
create policy posts_insert on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_delete on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- ── comments: public read; author insert; author/admin delete ─────────────────
alter table public.comments enable row level security;
create policy comments_public_read on public.comments
  for select to anon, authenticated using (true);
create policy comments_insert on public.comments
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));
