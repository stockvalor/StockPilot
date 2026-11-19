-- StockPilot AI: recipe-only tested RPC. Do not apply to production without approval.
-- Existing product trigger records stock movements; this function annotates that record.
create unique index if not exists stock_movements_company_operation_ref_unique on public.stock_movements(company_id,operation_ref) where operation_ref is not null;
CREATE OR REPLACE FUNCTION public.stockpilot_scan_stock_out(p_product_id uuid, p_quantity integer, p_request_id uuid)
 RETURNS TABLE(product_id uuid, new_quantity integer, movement_id uuid, replayed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_before integer; v_after integer; v_previous public.stock_movements%rowtype; v_movement uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_product_id is null or p_request_id is null or p_quantity is null or p_quantity not between 1 and 1000000 then raise exception 'Invalid stock-out request' using errcode='22023'; end if;
 select c.id into v_company from public.companies c where c.owner_user_id=v_uid;
 if v_company is null then raise exception 'Company not found' using errcode='42501'; end if;
 if not exists(select 1 from stockpilot_internal.commercial_licenses l where l.customer_id=v_uid and l.activated_at is not null and l.revoked_at is null and l.expires_at>now()) then
  raise exception 'Active commercial license required' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company::text||':'||p_request_id::text,0));
 select * into v_previous from public.stock_movements m where m.company_id=v_company and m.operation_ref=p_request_id::text;
 if found then
  if v_previous.product_id<>p_product_id or v_previous.delta<>-p_quantity or v_previous.movement_reason<>'scanner_out' then
   raise exception 'Request ID already used with different operation' using errcode='22023';
  end if;
  return query select p_product_id,v_previous.quantity_after,v_previous.id,true;
  return;
 end if;
 select p.quantity into v_before from public.products p where p.id=p_product_id and p.company_id=v_company for update;
 if not found then raise exception 'Product inaccessible' using errcode='42501'; end if;
 if v_before<p_quantity then raise exception 'Insufficient stock' using errcode='22023'; end if;
 v_after:=v_before-p_quantity;
 update public.products p set quantity=v_after,updated_at=now() where p.id=p_product_id and p.company_id=v_company;
 update public.stock_movements m set movement_reason='scanner_out',operation_ref=p_request_id::text
 where m.id=(select m2.id from public.stock_movements m2
  where m2.company_id=v_company and m2.product_id=p_product_id and m2.actor_user_id=v_uid
  and m2.quantity_before=v_before and m2.quantity_after=v_after and m2.operation_ref is null
  and m2.xmin::text=pg_catalog.pg_current_xact_id()::text
  order by m2.created_at desc,m2.id desc limit 1)
 returning m.id into v_movement;
 if v_movement is null then raise exception 'Stock movement audit record missing'; end if;
 return query select p_product_id,v_after,v_movement,false;
end; $function$
;
revoke all on function public.stockpilot_scan_stock_out(uuid,integer,uuid) from public,anon;
grant execute on function public.stockpilot_scan_stock_out(uuid,integer,uuid) to authenticated;
