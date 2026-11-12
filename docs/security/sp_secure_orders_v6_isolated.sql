-- Isolated V6 secure order workflow. Existing V5/V6 objects untouched.
create table if not exists public.sp_secure_orders (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 created_by uuid not null,
 status text not null default 'validated' check(status in ('validated','received')),
 lines jsonb not null,
 created_at timestamptz not null default now(),
 received_at timestamptz
);
create index if not exists sp_secure_orders_company_idx on public.sp_secure_orders(company_id);
alter table public.sp_secure_orders enable row level security;
revoke all on public.sp_secure_orders from public,anon,authenticated;
grant select on public.sp_secure_orders to authenticated;
drop policy if exists sp_secure_orders_owner_select on public.sp_secure_orders;
create policy sp_secure_orders_owner_select on public.sp_secure_orders for select to authenticated
using (exists(select 1 from public.companies c where c.id=company_id and c.owner_user_id=(select auth.uid())));
create or replace function public.sp_secure_create_order(p_lines jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_company uuid; v_id uuid; v_qty integer; v_line jsonb; v_order uuid;
begin
 if v_uid is null then raise exception 'Connexion requise'; end if;
 select id into strict v_company from public.companies where owner_user_id=v_uid;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Lignes invalides'; end if;
 if exists(select 1 from jsonb_array_elements(p_lines) x where (x->>'id') is null or (x->>'qty') is null or (x->>'qty') !~ '^[0-9]{1,7}$' or (x->>'qty')::numeric not between 1 and 1000000) then raise exception 'Ligne invalide'; end if;
 if (select count(*) from jsonb_array_elements(p_lines))<>(select count(distinct x->>'id') from jsonb_array_elements(p_lines) x) then raise exception 'Doublon'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
   begin v_id:=(v_line->>'id')::uuid; exception when others then raise exception 'Identifiant invalide'; end;
   if not exists(select 1 from public.products where id=v_id and company_id=v_company) then raise exception 'Produit non autorisé'; end if;
 end loop;
 insert into public.sp_secure_orders(company_id,created_by,lines)
 values(v_company,v_uid,(select jsonb_agg(jsonb_build_object('id',x->>'id','qty',(x->>'qty')::integer)) from jsonb_array_elements(p_lines) x))
 returning id into v_order;
 return v_order;
end $$;
create or replace function public.sp_secure_receive_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_company uuid; v_order public.sp_secure_orders%rowtype; v_line jsonb; v_id uuid; v_qty integer;
begin
 if v_uid is null then raise exception 'Connexion requise'; end if;
 select id into strict v_company from public.companies where owner_user_id=v_uid;
 select * into v_order from public.sp_secure_orders where id=p_order_id and company_id=v_company for update;
 if not found then raise exception 'Commande absente ou non autorisée'; end if;
 if v_order.status='received' then return jsonb_build_object('status','already_received'); end if;
 if v_order.status<>'validated' then raise exception 'Commande non validée'; end if;
 for v_line in select value from jsonb_array_elements(v_order.lines) loop
   v_id:=(v_line->>'id')::uuid; v_qty:=(v_line->>'qty')::integer;
   update public.products set quantity=quantity+v_qty where id=v_id and company_id=v_company and quantity<=1000000-v_qty;
   if not found then raise exception 'Produit absent ou quantité excessive'; end if;
 end loop;
 update public.sp_secure_orders set status='received',received_at=now() where id=p_order_id;
 return jsonb_build_object('status','received','order_id',p_order_id);
end $$;
revoke all on function public.sp_secure_create_order(jsonb) from public,anon,authenticated;
revoke all on function public.sp_secure_receive_order(uuid) from public,anon,authenticated;
grant execute on function public.sp_secure_create_order(jsonb) to authenticated;
grant execute on function public.sp_secure_receive_order(uuid) to authenticated;
