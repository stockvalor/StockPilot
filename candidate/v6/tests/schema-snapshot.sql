-- Schéma réduit de test, construit à partir des métadonnées du 13 novembre 2026.
-- Aucun enregistrement réel. Ce fichier sert uniquement au test PGlite.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
create table public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
create table public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL
);
create table public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone,
  stock_flow text NOT NULL DEFAULT 'outbound'::text
);
create table public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit_price numeric(12,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
create table public.sp_secure_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'validated'::text,
  lines jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  received_at timestamp with time zone
);
create table public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  product_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  delta integer GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  movement_reason text,
  operation_ref text
);
create table public.stockpilot_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid NOT NULL,
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
create table public.stockpilot_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_ref text NOT NULL,
  received_by uuid NOT NULL,
  lines jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
create table public.stockpilot_restore_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  backup_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone
);
alter table public.companies add UNIQUE (id, owner_user_id);
alter table public.companies add CHECK (((char_length(TRIM(BOTH FROM name)) >= 2) AND (char_length(TRIM(BOTH FROM name)) <= 160)));
alter table public.companies add PRIMARY KEY (id);
alter table public.order_items add UNIQUE (order_id, product_id);
alter table public.order_items add PRIMARY KEY (id);
alter table public.order_items add CHECK ((quantity > 0));
alter table public.orders add PRIMARY KEY (id);
alter table public.orders add CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'cancelled'::text, 'received'::text])));
alter table public.orders add CHECK ((stock_flow = ANY (ARRAY['inbound'::text, 'outbound'::text])));
alter table public.products add CHECK ((min_quantity >= 0));
alter table public.products add CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200)));
alter table public.products add PRIMARY KEY (id);
alter table public.products add CHECK ((quantity >= 0));
alter table public.products add CHECK (((unit_price IS NULL) OR (unit_price >= (0)::numeric)));
alter table public.sp_secure_orders add PRIMARY KEY (id);
alter table public.sp_secure_orders add CHECK ((status = ANY (ARRAY['validated'::text, 'received'::text])));
alter table public.stock_movements add PRIMARY KEY (id);
alter table public.stock_movements add CHECK ((quantity_after >= 0));
alter table public.stock_movements add CHECK ((quantity_before >= 0));
alter table public.stockpilot_backups add CHECK ((checksum ~ '^[0-9a-f]{64}$'::text));
alter table public.stockpilot_backups add CHECK ((pg_column_size(payload) <= 1048576));
alter table public.stockpilot_backups add PRIMARY KEY (id);
alter table public.stockpilot_receipts add UNIQUE (company_id, order_ref);
alter table public.stockpilot_receipts add PRIMARY KEY (id);
alter table public.stockpilot_restore_requests add UNIQUE (id, company_id);
alter table public.stockpilot_restore_requests add PRIMARY KEY (id);
alter table public.stockpilot_restore_requests add CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'cancelled'::text])));
alter table public.companies add FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.order_items add FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public.order_items add FOREIGN KEY (product_id) REFERENCES products(id);
alter table public.orders add FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table public.orders add FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.products add FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table public.sp_secure_orders add FOREIGN KEY (company_id) REFERENCES companies(id);
alter table public.stock_movements add FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
alter table public.stock_movements add FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table public.stock_movements add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.stockpilot_backups add FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table public.stockpilot_backups add FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.stockpilot_receipts add FOREIGN KEY (company_id) REFERENCES companies(id);
alter table public.stockpilot_receipts add FOREIGN KEY (received_by) REFERENCES auth.users(id);
alter table public.stockpilot_restore_requests add FOREIGN KEY (backup_id) REFERENCES stockpilot_backups(id);
alter table public.stockpilot_restore_requests add FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table public.stockpilot_restore_requests add FOREIGN KEY (requested_by) REFERENCES auth.users(id);
alter table public.companies enable row level security;
create policy companies_insert_owner on public.companies for INSERT to authenticated with check ((owner_user_id = ( SELECT auth.uid() AS uid)));
create policy companies_select_owner on public.companies for SELECT to authenticated using ((owner_user_id = ( SELECT auth.uid() AS uid)));
create policy companies_update_owner on public.companies for UPDATE to authenticated using ((owner_user_id = ( SELECT auth.uid() AS uid))) with check ((owner_user_id = ( SELECT auth.uid() AS uid)));
alter table public.order_items enable row level security;
create policy order_items_insert_owner on public.order_items for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM ((orders o
     JOIN companies c ON ((c.id = o.company_id)))
     JOIN products p ON (((p.id = order_items.product_id) AND (p.company_id = o.company_id))))
  WHERE ((o.id = order_items.order_id) AND (o.status = 'draft'::text) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
create policy order_items_read_owner on public.order_items for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM (orders o
     JOIN companies c ON ((c.id = o.company_id)))
  WHERE ((o.id = order_items.order_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
alter table public.orders enable row level security;
create policy orders_insert_owner on public.orders for INSERT to authenticated with check (((status = 'draft'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = orders.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
create policy orders_read_owner on public.orders for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = orders.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
alter table public.products enable row level security;
create policy products_delete_owner on public.products for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = products.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
create policy products_insert_owner on public.products for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = products.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
create policy products_select_owner on public.products for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = products.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
create policy products_update_owner on public.products for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = products.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = products.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
alter table public.sp_secure_orders enable row level security;
create policy sp_secure_orders_owner_select on public.sp_secure_orders for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = sp_secure_orders.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
alter table public.stock_movements enable row level security;
create policy stock_movements_read_owner on public.stock_movements for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stock_movements.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))));
alter table public.stockpilot_backups enable row level security;
create policy stockpilot_backup_insert on public.stockpilot_backups for INSERT to authenticated with check (((( SELECT auth.uid() AS uid) = owner_user_id) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stockpilot_backups.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
create policy stockpilot_backup_read on public.stockpilot_backups for SELECT to authenticated using (((( SELECT auth.uid() AS uid) = owner_user_id) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stockpilot_backups.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
alter table public.stockpilot_receipts enable row level security;
create policy stockpilot_receipts_read_owner on public.stockpilot_receipts for SELECT to authenticated using (((received_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stockpilot_receipts.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
alter table public.stockpilot_restore_requests enable row level security;
create policy restore_requests_insert_owner on public.stockpilot_restore_requests for INSERT to authenticated with check (((status = 'pending'::text) AND (applied_at IS NULL) AND (requested_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stockpilot_restore_requests.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM stockpilot_backups b
  WHERE ((b.id = stockpilot_restore_requests.backup_id) AND (b.company_id = stockpilot_restore_requests.company_id) AND (b.owner_user_id = ( SELECT auth.uid() AS uid)))))));
create policy restore_requests_read_owner on public.stockpilot_restore_requests for SELECT to authenticated using (((requested_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = stockpilot_restore_requests.company_id) AND (c.owner_user_id = ( SELECT auth.uid() AS uid)))))));
grant INSERT, SELECT, UPDATE on public.companies to authenticated;
grant INSERT, SELECT on public.order_items to authenticated;
grant INSERT, SELECT on public.orders to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on public.products to authenticated;
grant SELECT on public.sp_secure_orders to authenticated;
grant SELECT on public.stock_movements to authenticated;
grant INSERT, SELECT on public.stockpilot_backups to authenticated;
grant SELECT on public.stockpilot_receipts to authenticated;
grant INSERT, SELECT on public.stockpilot_restore_requests to authenticated;
CREATE OR REPLACE FUNCTION public.stockpilot_v2_confirm_order(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_order public.orders%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select o.* into v_order from public.orders o join public.companies c on c.id=o.company_id where o.id=p_order_id and c.owner_user_id=v_uid for update of o;
 if not found then raise exception 'Order not found'; end if;
 if v_order.stock_flow<>'inbound' then raise exception 'Wrong confirmation method: inbound orders only'; end if;
 if v_order.status='confirmed' then return true; end if;
 if v_order.status<>'draft' then raise exception 'Invalid status'; end if;
 if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'Empty order'; end if;
 update public.orders set status='confirmed',confirmed_at=now() where id=p_order_id;
 return true;
end $function$;
CREATE OR REPLACE FUNCTION public.stockpilot_v2_create_order(p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid := auth.uid(); v_company uuid; v_order uuid; v_line jsonb; v_pid uuid; v_qty integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid lines'; END IF;
 SELECT id INTO STRICT v_company FROM public.companies WHERE owner_user_id=v_uid;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE jsonb_typeof(x.value) IS DISTINCT FROM 'object'
    OR (x.value->>'id') IS NULL OR (x.value->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR (x.value->>'qty') IS NULL OR (x.value->>'qty') !~ '^[0-9]{1,7}$'
    OR (x.value->>'qty')::numeric NOT BETWEEN 1 AND 1000000) THEN RAISE EXCEPTION 'Invalid item'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_lines)) <> (SELECT count(DISTINCT (x.value->>'id')::uuid) FROM jsonb_array_elements(p_lines) x) THEN RAISE EXCEPTION 'Duplicate item'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=(x.value->>'id')::uuid AND p.company_id=v_company)) THEN RAISE EXCEPTION 'Unauthorized item'; END IF;
 INSERT INTO public.orders(company_id,status,created_by,stock_flow) VALUES(v_company,'draft',v_uid,'inbound') RETURNING id INTO v_order;
 FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
   v_pid := (v_line->>'id')::uuid; v_qty := (v_line->>'qty')::integer;
   INSERT INTO public.order_items(order_id,product_id,quantity) VALUES(v_order,v_pid,v_qty);
 END LOOP;
 RETURN v_order;
END $function$;
CREATE OR REPLACE FUNCTION public.stockpilot_v2_receive_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%rowtype; v_line record; v_existing uuid; v_count integer:=0;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT o.* INTO v_order FROM public.orders o JOIN public.companies c ON c.id=o.company_id WHERE o.id=p_order_id AND c.owner_user_id=v_uid FOR UPDATE OF o;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF v_order.stock_flow <> 'inbound' THEN RAISE EXCEPTION 'Wrong receipt method: inbound orders only'; END IF;
 SELECT id INTO v_existing FROM public.stockpilot_receipts WHERE company_id=v_order.company_id AND order_ref='v2:'||p_order_id::text;
 IF v_existing IS NOT NULL THEN
   IF v_order.status <> 'received' THEN UPDATE public.orders SET status='received' WHERE id=p_order_id AND company_id=v_order.company_id; END IF;
   RETURN jsonb_build_object('status','already_received','receipt_id',v_existing);
 END IF;
 IF v_order.status <> 'confirmed' THEN RAISE EXCEPTION 'Order not confirmed'; END IF;
 FOR v_line IN SELECT i.product_id,i.quantity FROM public.order_items i WHERE i.order_id=p_order_id ORDER BY i.product_id LOOP
   IF v_line.quantity NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
   UPDATE public.products SET quantity=quantity+v_line.quantity WHERE id=v_line.product_id AND company_id=v_order.company_id AND quantity<=1000000-v_line.quantity;
   IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
   v_count:=v_count+1;
 END LOOP;
 IF v_count=0 THEN RAISE EXCEPTION 'Empty order'; END IF;
 INSERT INTO public.stockpilot_receipts(company_id,order_ref,received_by,lines)
 SELECT v_order.company_id,'v2:'||p_order_id::text,v_uid,jsonb_agg(jsonb_build_object('id',product_id,'qty',quantity))
 FROM public.order_items WHERE order_id=p_order_id;
 UPDATE public.orders SET status='received' WHERE id=p_order_id AND company_id=v_order.company_id;
 RETURN jsonb_build_object('status','received','lines',v_count);
END $function$;
revoke all on function public.stockpilot_v2_create_order(jsonb),public.stockpilot_v2_confirm_order(uuid),public.stockpilot_v2_receive_order(uuid) from public,anon;
grant execute on function public.stockpilot_v2_create_order(jsonb),public.stockpilot_v2_confirm_order(uuid),public.stockpilot_v2_receive_order(uuid) to authenticated;
