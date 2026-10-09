-- Sousbot's initial Supabase PostgreSQL schema.
-- Run ONCE using Supabase SQL Editor (after reviewing) or via an approved migration tool.
-- Never run migrations automatically on API server startup.
-- Uses auth.users, a table managed by Supabase Auth.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  servings text,
  directions jsonb,
  directions_display_policy text not null default 'source_only'
    check (directions_display_policy in ('source_only','authorized')),
  status text not null default 'draft'
    check (status in ('draft','source_checked','published','flagged','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (directions is null or jsonb_typeof(directions) = 'array')
);
create table public.recipe_authors (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  primary key (recipe_id, author_id)
);
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  raw_text text not null,
  normalized_name text,
  importance text not null default 'supporting'
    check (importance in ('primary','supporting','garnish')),
  unique (recipe_id, ordinal)
);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);
create index recipe_ingredients_name_idx on public.recipe_ingredients(normalized_name);
create index recipe_ingredients_raw_trgm on public.recipe_ingredients using gin (raw_text gin_trgm_ops);
create index recipes_title_trgm on public.recipes using gin (title gin_trgm_ops);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null
);
create table public.book_editions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  isbn13 text unique,
  label text,
  publication_year integer
);
create table public.recipe_book_refs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  edition_id uuid references public.book_editions(id),
  page integer check (page is null or page > 0),
  book_verified boolean not null default false,
  page_verified boolean not null default false,
  evidence_url text,
  check (not page_verified or (book_verified and page is not null and edition_id is not null and evidence_url is not null))
);
create index recipe_book_refs_recipe_idx on public.recipe_book_refs(recipe_id);
create index recipe_book_refs_book_idx on public.recipe_book_refs(book_id);
create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  url text not null,
  kind text not null default 'web'
);
create index recipe_sources_recipe_idx on public.recipe_sources(recipe_id);

create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  edition_id uuid references public.book_editions(id),
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);
create index user_books_owner_idx on public.user_books(user_id);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  cooked_on date not null,
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cooking_sessions_owner_recipe_date_idx
  on public.cooking_sessions(user_id, recipe_id, cooked_on desc, created_at desc);

-- Default direct PostgREST access to catalog is CLOSED.
-- Node API uses database connection and exposes only published recipe DTOs.
alter table public.authors enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_authors enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.books enable row level security;
alter table public.book_editions enable row level security;
alter table public.recipe_book_refs enable row level security;
alter table public.recipe_sources enable row level security;

-- Personal tables are scoped to the JWT subject when accessed through Supabase.
-- Node API uses owner-scoped queries independently, because privileged DB
-- connections may bypass RLS; NEVER rely on these policies alone.
alter table public.user_books enable row level security;
alter table public.cooking_sessions enable row level security;
create policy user_books_owner on public.user_books
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy cooking_sessions_owner on public.cooking_sessions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
