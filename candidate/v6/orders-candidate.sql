-- Apply to the isolated test schema first. Existing order endpoints are preserved.
begin;
create schema if not exists stockpilot_internal;

create table stockpilot_internal.v6_order_requests (
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null,
  lines jsonb not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  primary key (company_id, request_id)
);
alter table stockpilot_internal.v6_order_requests enable row level security;
revoke all on stockpilot_internal.v6_order_requests from public, anon, authenticated;

create function stockpilot_internal.v6_submit_order(p_request_id uuid, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_previous stockpilot_internal.v6_order_requests%rowtype;
  v_order uuid;
begin
  if v_user is null or p_request_id is null then
    raise exception 'Authentication and request ID required';
  end if;
  select id into strict v_company from public.companies where owner_user_id = v_user;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_company::text || ':' || p_request_id::text, 0)
  );
  select * into v_previous
  from stockpilot_internal.v6_order_requests
  where company_id = v_company and request_id = p_request_id;
  if found then
    if v_previous.lines is distinct from p_lines then
      raise exception 'Request already used with different order lines';
    end if;
    return v_previous.order_id;
  end if;

  v_order := public.stockpilot_v2_create_order(p_lines);
  if not public.stockpilot_v2_confirm_order(v_order) then
    raise exception 'Order confirmation failed';
  end if;
  insert into stockpilot_internal.v6_order_requests(company_id,request_id,lines,order_id)
  values(v_company,p_request_id,p_lines,v_order);
  return v_order;
end;
$$;

create function public.stockpilot_v6_submit_order(p_request_id uuid, p_lines jsonb)
returns uuid language sql security invoker set search_path = ''
as $$ select stockpilot_internal.v6_submit_order(p_request_id,p_lines) $$;

revoke all on function stockpilot_internal.v6_submit_order(uuid,jsonb) from public,anon;
revoke all on function public.stockpilot_v6_submit_order(uuid,jsonb) from public,anon;
grant usage on schema stockpilot_internal to authenticated;
grant execute on function stockpilot_internal.v6_submit_order(uuid,jsonb) to authenticated;
grant execute on function public.stockpilot_v6_submit_order(uuid,jsonb) to authenticated;
commit;
