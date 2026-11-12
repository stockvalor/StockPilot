-- PROPOSITION NON APPLIQUÉE : StockPilot V6, création atomique et idempotente.
-- Déployer uniquement après validation sur une base de test isolée.
-- IMPORTANT : brouillon non testé dynamiquement ; ne pas exécuter en production.
-- Rejeu : ne renvoie que les commandes confirmées et appartenant au demandeur.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS stockpilot_orders_company_request_unique
  ON public.orders(company_id,client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.stockpilot_v3_create_confirm_order(
  p_request_id uuid, p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_order uuid;
  v_expected jsonb;
  v_actual jsonb;
  v_existing_status text;
  v_existing_owner uuid;
  v_line jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100
  THEN RAISE EXCEPTION 'Invalid lines'; END IF;
  SELECT id INTO STRICT v_company FROM public.companies
    WHERE owner_user_id = v_uid;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lines) x
    WHERE jsonb_typeof(x) <> 'object'
      OR (x->>'id') IS NULL
      OR (x->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR (x->>'qty') IS NULL
      OR (x->>'qty') !~ '^[0-9]{1,7}$'
      OR (x->>'qty')::numeric NOT BETWEEN 1 AND 1000000
  ) THEN RAISE EXCEPTION 'Invalid item'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_lines))
     <> (SELECT count(DISTINCT (x->>'id')::uuid) FROM jsonb_array_elements(p_lines) x)
  THEN RAISE EXCEPTION 'Duplicate item'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lines) x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = (x->>'id')::uuid AND p.company_id = v_company
    )
  ) THEN RAISE EXCEPTION 'Unauthorized item'; END IF;

  SELECT jsonb_agg(jsonb_build_object('id',(x->>'id')::uuid,'qty',(x->>'qty')::int)
                   ORDER BY (x->>'id')::uuid)
    INTO v_expected FROM jsonb_array_elements(p_lines) x;

  INSERT INTO public.orders(company_id,status,created_by,client_request_id)
    VALUES(v_company,'draft',v_uid,p_request_id)
    ON CONFLICT (company_id,client_request_id)
      WHERE client_request_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_order;

  IF v_order IS NULL THEN
    SELECT id,status,created_by INTO v_order,v_existing_status,v_existing_owner
      FROM public.orders
      WHERE company_id=v_company AND client_request_id=p_request_id
      FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Retry request'; END IF;
    IF v_existing_owner IS DISTINCT FROM v_uid OR v_existing_status <> 'confirmed' THEN
      RAISE EXCEPTION 'Existing request is not an owned confirmed order';
    END IF;
    SELECT jsonb_agg(jsonb_build_object('id',i.product_id,'qty',i.quantity)
                     ORDER BY i.product_id)
      INTO v_actual FROM public.order_items i WHERE i.order_id=v_order;
    IF v_actual IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'Request ID reused with different items';
    END IF;
    RETURN v_order;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.order_items(order_id,product_id,quantity)
      VALUES(v_order,(v_line->>'id')::uuid,(v_line->>'qty')::int);
  END LOOP;
  UPDATE public.orders SET status='confirmed',confirmed_at=now()
    WHERE id=v_order AND company_id=v_company;
  RETURN v_order;
END;
$fn$;

REVOKE ALL ON FUNCTION public.stockpilot_v3_create_confirm_order(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stockpilot_v3_create_confirm_order(uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.stockpilot_v3_create_confirm_order(uuid,jsonb) TO authenticated;
