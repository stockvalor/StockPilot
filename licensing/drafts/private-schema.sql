-- StockPilot AI commercial licensing — REVIEW BEFORE DEPLOYMENT
-- Draft only. Do not run against production without approval.
create schema if not exists stockpilot_licensing;
create table if not exists stockpilot_licensing.licenses (
 id uuid primary key default gen_random_uuid(),
 license_id text not null unique,
 customer_id uuid not null references auth.users(id),
 product text not null check (product='StockPilot AI'),
 edition text not null check (edition='lifetime'),
 key_id text not null,
 issued_at timestamptz not null default now(),
 payment_reference text not null unique,
 status text not null default 'issued' check(status in ('issued','refunded','replaced')),
 token_sha256 text unique,
 created_at timestamptz not null default now()
);
create table if not exists stockpilot_licensing.license_audit (
 id bigint generated always as identity primary key,
 license_id text,
 actor_user_id uuid,
 action text not null,
 happened_at timestamptz not null default now(),
 details jsonb not null default '{}'::jsonb
);
alter table stockpilot_licensing.licenses enable row level security;
alter table stockpilot_licensing.license_audit enable row level security;
revoke all on schema stockpilot_licensing from public, anon, authenticated;
revoke all on all tables in schema stockpilot_licensing from public, anon, authenticated;
-- No user-facing RLS policies: access only via controlled server service.
-- Admin authentication, verified payment and key storage must be implemented before issuing.
