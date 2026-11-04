-- PLACEHOLDER for later: the cloud database version of floor 3 (Supabase = hosted Postgres).
-- Same fields as 3-data/listing.schema.json. Not used yet; the local file is used until
-- RACKD moves online. To switch, run this in the Supabase SQL editor, put SUPABASE_URL and
-- SUPABASE_SERVICE_KEY in .env, and change 3-data/store.js to read and write here.

create extension if not exists vector;   -- pgvector, for FashionCLIP fingerprints

create table if not exists listings (
  id                  text primary key,              -- source:sourceId
  source              text not null,
  source_id           text not null,
  url                 text not null,
  affiliate_url       text,
  title               text not null,
  brand               text,
  price               numeric(10,2) not null,
  original_price      numeric(10,2),
  currency            text not null default 'USD',
  size                text,
  category            text,
  condition           text,
  style               text,
  photo_url           text not null,
  photo_urls          text[] default '{}',
  seller_rating       numeric(3,2),
  seller_review_count integer,
  status              text not null default 'active' check (status in ('active','sold','removed')),
  missed_checks       integer not null default 0,
  first_seen_at       timestamptz not null default now(),
  last_checked_at     timestamptz not null default now(),
  sold_at             timestamptz,
  fingerprint         vector(512)                    -- FashionCLIP style fingerprint
);

create index if not exists listings_active_idx on listings (status, last_checked_at);
