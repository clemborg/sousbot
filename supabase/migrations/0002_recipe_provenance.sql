-- Tracks Git-archive provenance for idempotent JSON imports.
-- Apply after 0001_foundation.sql via Supabase SQL Editor or approved migration channel.

create table public.recipe_provenance (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  origin_path text not null unique,
  content_sha text not null,
  imported_at timestamptz not null default now()
);

create index recipe_provenance_sha_idx on public.recipe_provenance (content_sha);

alter table public.recipe_provenance enable row level security;
