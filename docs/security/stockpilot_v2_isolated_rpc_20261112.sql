-- Isolated v2 order workflow; existing RPC untouched.
create or replace function public.stockpilot_v2_create_order(p_lines jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_company uuid; v_order uuid; v_line jsonb; v_pid uuid; v_qty int;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid lines'; end if;
 select id into strict v_company from public.companies where owner_user_id=v_uid;
 if exists(select 1 from jsonb_array_elements(p_lines) x where (x->>'id') is null or (x->>'qty') is null or (x->>'qty') !~ '^[0-9]{1,7}$' or (x->>'qty')::numeric not between 1 and 1000000) then raise exception 'Invalid item'; end if;
 if (select count(*) from jsonb_array_elements(p_lines))<>(select count(distinct x->>'id') from jsonb_array_elements(p_lines) x) then raise exception 'Duplicate item'; end if;
 if exists(select 1 from jsonb_array_elements(p_lines) x where not exists(select 1 from public.products p where p.id=(x->>'id')::uuid and p.company_id=v_company)) then raise exception 'Unauthorized item'; end if;
 insert into public.orders(company_id,status,created_by) values(v_company,'draft',v_uid) returning id into v_order;
 for v_line in select value from jsonb_array_elements(p_lines) loop
   v_pid := (v_line->>'id')::uuid; v_qty := (v_line->>'qty')::int;
   insert into public.order_items(order_id,product_id,quantity) values(v_order,v_pid,v_qty);
 end loop;
 return v_order;
end $$;
create or replace function public.stockpilot_v2_confirm_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_order public.orders%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select o.* into v_order from public.orders o join public.companies c on c.id=o.company_id where o.id=p_order_id and c.owner_user_id=v_uid for update of o;
 if not found then raise exception 'Order not found'; end if;
 if v_order.status='confirmed' then return true; end if;
 if v_order.status<>'draft' then raise exception 'Invalid status'; end if;
 if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'Empty order'; end if;
 update public.orders set status='confirmed',confirmed_at=now() where id=p_order_id;
 return true;
end $$;
create or replace function public.stockpilot_v2_receive_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_order public.orders%rowtype; v_line record; v_existing uuid; v_count int:=0;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select o.* into v_order from public.orders o join public.companies c on c.id=o.company_id where o.id=p_order_id and c.owner_user_id=v_uid for update of o;
 if not found then raise exception 'Order not found'; end if;
 select id into v_existing from public.stockpilot_receipts where company_id=v_order.company_id and order_ref='v2:'||p_order_id::text;
 if v_existing is not null then return jsonb_build_object('status','already_received','receipt_id',v_existing); end if;
 if v_order.status<>'confirmed' then raise exception 'Order not confirmed'; end if;
 for v_line in select i.product_id,i.quantity from public.order_items i where i.order_id=p_order_id loop
   update public.products set quantity=quantity+v_line.quantity where id=v_line.product_id and company_id=v_order.company_id and quantity<=1000000-v_line.quantity;
   if not found then raise exception 'Product unavailable'; end if;
   v_count:=v_count+1;
 end loop;
 if v_count=0 then raise exception 'Empty order'; end if;
 insert into public.stockpilot_receipts(company_id,order_ref,received_by,lines)
 select v_order.company_id,'v2:'||p_order_id::text,v_uid,jsonb_agg(jsonb_build_object('id',product_id,'qty',quantity))
 from public.order_items where order_id=p_order_id;
 return jsonb_build_object('status','received','lines',v_count);
end $$;
revoke all on function public.stockpilot_v2_create_order(jsonb) from public,anon;
revoke all on function public.stockpilot_v2_confirm_order(uuid) from public,anon;
revoke all on function public.stockpilot_v2_receive_order(uuid) from public,anon;
grant execute on function public.stockpilot_v2_create_order(jsonb) to authenticated;
grant execute on function public.stockpilot_v2_confirm_order(uuid) to authenticated;
grant execute on function public.stockpilot_v2_receive_order(uuid) to authenticated;
