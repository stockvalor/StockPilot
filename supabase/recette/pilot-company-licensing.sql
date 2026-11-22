begin;

create function public.stockpilot_find_license_companies(p_query text)
returns table (id uuid, name text)
language sql
stable
set search_path = pg_catalog
as $$
  select c.id, c.name from public.companies c
  where c.owner_user_id is not null
    and length(btrim(p_query)) between 2 and 120
    and strpos(lower(c.name), lower(btrim(p_query))) > 0
  order by c.name, c.id
  limit 30
$$;

create function public.stockpilot_register_company_pilot_license(
  p_license_id text, p_company uuid, p_customer uuid, p_token text, p_expires_at timestamptz
)
returns boolean
language plpgsql
set search_path = pg_catalog
as $$
begin
  if p_customer is null
    or p_license_id is null or p_license_id !~ '^SP-RECETTE-[A-F0-9]{32}$'
    or p_token is null or octet_length(p_token) not between 100 and 5600
    or p_expires_at is null or p_expires_at <= statement_timestamp()
    or p_expires_at > statement_timestamp() + interval '360 hours' then
    return false;
  end if;

  insert into stockpilot_internal.commercial_licenses (license_id, customer_id, token_hash, expires_at)
  select p_license_id, c.owner_user_id, extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), p_expires_at
  from public.companies c
  where c.id = p_company and c.owner_user_id = p_customer;
  return found;
end
$$;

revoke all on function public.stockpilot_find_license_companies(text) from public, anon, authenticated;
revoke all on function public.stockpilot_register_company_pilot_license(text, uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.stockpilot_find_license_companies(text) to service_role;
grant execute on function public.stockpilot_register_company_pilot_license(text, uuid, uuid, text, timestamptz) to service_role;

commit;
