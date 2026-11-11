-- StockPilot AI licensing schema PROPOSAL ONLY — DO NOT RUN IN PRODUCTION WITHOUT REVIEW
-- License activation must be performed by a trusted backend, never from a public browser.
create table if not exists public.stockpilot_licenses (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete restrict,
 license_hash text not null unique check (license_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'inactive' check (status in ('inactive','active','suspended','revoked')),
 plan text not null check (plan in ('monthly','lifetime')),
 starts_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (expires_at is null or starts_at is null or expires_at > starts_at)
);
alter table public.stockpilot_licenses enable row level security;
revoke all on public.stockpilot_licenses from anon, authenticated;
-- No direct client access; backend with server-side authorization checks only.
-- Do not store plaintext license codes. Hash codes with SHA-256 and sufficient random entropy.
-- A lifetime license must be revocable; monthly licenses need server-side expiry.
-- The backend must verify the authenticated user's ownership of company_id.
-- Never put service_role or signing secrets in GitHub Pages or client-side JavaScript.
