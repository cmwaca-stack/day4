-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 [Run] 하세요.
-- 회원별 "즐겨찾기" 테이블 (Pixabay 이미지 번호만 저장합니다)

create table if not exists public.favorites (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  image_id   bigint not null,
  tags       text,
  created_at timestamptz not null default now(),
  unique (user_id, image_id)
);

-- 행 단위 보안(RLS): 내 데이터만 보고, 넣고, 지울 수 있게 합니다
alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 회원별 "장바구니" 테이블 (Pixabay 이미지 번호 + 수량만 저장합니다)
-- ============================================================
create table if not exists public.cart_items (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  image_id   bigint not null,
  tags       text,
  quantity   int not null default 1 check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique (user_id, image_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "cart_select_own" on public.cart_items;
create policy "cart_select_own" on public.cart_items
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "cart_insert_own" on public.cart_items;
create policy "cart_insert_own" on public.cart_items
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "cart_update_own" on public.cart_items;
create policy "cart_update_own" on public.cart_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_delete_own" on public.cart_items;
create policy "cart_delete_own" on public.cart_items
  for delete to authenticated using (auth.uid() = user_id);
