-- Functions from the Supabase schema, for isolated PGlite tests only.
create schema extensions;
create extension pgcrypto with schema extensions;
CREATE OR REPLACE FUNCTION stockpilot_internal.canonical_jsonb(value jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog'
AS $function$
select case jsonb_typeof(value)
 when 'object' then '{'||coalesce((select string_agg(to_jsonb(k)::text||':'||stockpilot_internal.canonical_jsonb(v),',' order by k collate "C") from jsonb_each(value) as e(k,v)),'')||'}'
 when 'array' then '['||coalesce((select string_agg(stockpilot_internal.canonical_jsonb(v),',' order by ord) from jsonb_array_elements(value) with ordinality as e(v,ord)),'')||']'
 else value::text end
$function$;

CREATE OR REPLACE FUNCTION stockpilot_internal.validate_backup_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
 if new.checksum is null or new.checksum !~ '^[0-9a-f]{64}$' then raise exception 'Invalid backup checksum format'; end if;
 if new.checksum <> encode(extensions.digest(convert_to(stockpilot_internal.canonical_jsonb(new.payload),'UTF8'),'sha256'),'hex') then
 raise exception 'Backup checksum does not match payload'; end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.stockpilot_create_backup(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare v_owner uuid; v_payload jsonb; v_id uuid;
begin
 v_owner:=auth.uid();
 if v_owner is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.companies c where c.id=p_company_id and c.owner_user_id=v_owner) then
  raise exception 'Company inaccessible';
 end if;
 select pg_catalog.jsonb_build_object(
  'format','stockpilot-products-v1',
  'company_id',p_company_id,
  'products',coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('id',p.id,'name',p.name,'sku',p.sku,'quantity',p.quantity,'min_quantity',p.min_quantity,'unit_price',p.unit_price)
    order by p.id
  ) filter (where p.id is not null),'[]'::jsonb)
 ) into v_payload
 from public.products p where p.company_id=p_company_id;
 if pg_catalog.octet_length(v_payload::text)>1048576 then raise exception 'Backup exceeds 1 MiB limit'; end if;
 insert into public.stockpilot_backups(owner_user_id,company_id,payload,checksum)
 values(v_owner,p_company_id,v_payload,pg_catalog.encode(extensions.digest(pg_catalog.convert_to(stockpilot_internal.canonical_jsonb(v_payload),'UTF8'),'sha256'),'hex'))
 returning id into v_id;
 return v_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.stockpilot_preview_backup(p_backup_id uuid)
 RETURNS TABLE(backup_id uuid, company_id uuid, product_count integer, changed_products integer, missing_products integer, checksum_valid boolean)
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare b record;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select s.id,s.company_id,s.payload,s.checksum into b
 from public.stockpilot_backups s
 join public.companies c on c.id=s.company_id and c.owner_user_id=auth.uid()
 where s.id=p_backup_id and s.owner_user_id=auth.uid();
 if not found then raise exception 'Backup inaccessible'; end if;
 if b.payload->>'format'<>'stockpilot-products-v1' or b.payload->>'company_id'<>b.company_id::text
 or jsonb_typeof(b.payload->'products')<>'array' then raise exception 'Unsupported backup format'; end if;
 if b.checksum<>encode(extensions.digest(convert_to(stockpilot_internal.canonical_jsonb(b.payload),'UTF8'),'sha256'),'hex') then
  raise exception 'Backup integrity verification failed';
 end if;
 return query
 with entries as (
  select x.value as entry from jsonb_array_elements(b.payload->'products') x
 ), compared as (
  select p.id,p.name,p.sku,p.quantity,p.min_quantity,p.unit_price,e.entry
  from entries e left join public.products p on p.id=(e.entry->>'id')::uuid and p.company_id=b.company_id
 )
 select b.id,b.company_id,(select count(*)::integer from entries),
 count(*) filter(where id is not null and
 (name is distinct from entry->>'name' or sku is distinct from entry->>'sku'
 or quantity is distinct from (entry->>'quantity')::integer
 or min_quantity is distinct from (entry->>'min_quantity')::integer
 or unit_price is distinct from (entry->>'unit_price')::numeric))::integer,
 count(*) filter(where id is null)::integer,true
 from compared;
end; $function$;

CREATE OR REPLACE FUNCTION stockpilot_internal.record_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authenticated user required for stock change';
    END IF;
    INSERT INTO public.stock_movements
      (company_id, product_id, actor_user_id, quantity_before, quantity_after, movement_reason, operation_ref)
    VALUES
      (NEW.company_id, NEW.id, auth.uid(), OLD.quantity, NEW.quantity, 'non_classe', NULL);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION stockpilot_internal.apply_restore(p_request_id uuid, p_confirmation text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare v_user uuid:=auth.uid();v_request record;v_backup record;v_safety uuid;v_entry jsonb;v_product uuid;v_total integer;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_confirmation is distinct from 'RESTAURER MES STOCKS' then raise exception 'Explicit confirmation required'; end if;
 select r.id,r.company_id,r.backup_id,r.status into v_request from public.stockpilot_restore_requests r
 join public.companies c on c.id=r.company_id
 where r.id=p_request_id and r.requested_by=v_user and c.owner_user_id=v_user for update of r;
 if not found or v_request.status<>'pending' then raise exception 'Restore request unavailable'; end if;
 select b.payload,b.checksum into v_backup from public.stockpilot_backups b
 where b.id=v_request.backup_id and b.company_id=v_request.company_id and b.owner_user_id=v_user;
 if not found then raise exception 'Backup unavailable'; end if;
 if v_backup.payload->>'format'<>'stockpilot-products-v1'
 or v_backup.payload->>'company_id'<>v_request.company_id::text
 or jsonb_typeof(v_backup.payload->'products')<>'array'
 or v_backup.checksum<>encode(extensions.digest(convert_to(stockpilot_internal.canonical_jsonb(v_backup.payload),'UTF8'),'sha256'),'hex')
 then raise exception 'Backup integrity or format invalid'; end if;
 v_total:=jsonb_array_length(v_backup.payload->'products');
 if v_total>10000 then raise exception 'Too many products'; end if;
 perform 1 from public.companies where id=v_request.company_id for update;
 perform 1 from public.products where company_id=v_request.company_id order by id for update;
 for v_entry in select value from jsonb_array_elements(v_backup.payload->'products') loop
  v_product:=(v_entry->>'id')::uuid;
  if not exists(select 1 from public.products where id=v_product and company_id=v_request.company_id)
  then raise exception 'A snapshot product is missing; restore refused'; end if;
  if (v_entry->>'quantity')::integer<0 or (v_entry->>'min_quantity')::integer<0 then raise exception 'Invalid stock quantities'; end if;
 end loop;
 v_safety:=public.stockpilot_create_backup(v_request.company_id);
 for v_entry in select value from jsonb_array_elements(v_backup.payload->'products') loop
  update public.products p set name=v_entry->>'name',sku=v_entry->>'sku',
  quantity=(v_entry->>'quantity')::integer,min_quantity=(v_entry->>'min_quantity')::integer,
  unit_price=(v_entry->>'unit_price')::numeric
  where p.id=(v_entry->>'id')::uuid and p.company_id=v_request.company_id;
 end loop;
 update public.stockpilot_restore_requests set status='applied',applied_at=now() where id=p_request_id;
 return v_safety;
end $function$;

CREATE OR REPLACE FUNCTION public.stockpilot_apply_restore(p_request_id uuid, p_confirmation text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'pg_catalog'
AS $function$ select stockpilot_internal.apply_restore(p_request_id,p_confirmation); $function$;

create trigger stockpilot_validate_backup_integrity before insert on public.stockpilot_backups for each row execute function stockpilot_internal.validate_backup_integrity();
create trigger stockpilot_record_stock_movement after update of quantity on public.products for each row execute function stockpilot_internal.record_stock_movement();
revoke execute on function public.stockpilot_apply_restore(uuid,text),public.stockpilot_create_backup(uuid),public.stockpilot_preview_backup(uuid),stockpilot_internal.apply_restore(uuid,text),stockpilot_internal.canonical_jsonb(jsonb) from public,anon;
grant execute on function public.stockpilot_apply_restore(uuid,text),public.stockpilot_create_backup(uuid),public.stockpilot_preview_backup(uuid),stockpilot_internal.apply_restore(uuid,text),stockpilot_internal.canonical_jsonb(jsonb) to authenticated;
grant usage on schema extensions to authenticated;
