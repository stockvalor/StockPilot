-- PROPOSITION NON APPLIQUÉE : revue et validation nécessaires avant migration.
-- Nouvelle fonction distincte : ne modifie pas stockpilot_v2_create_order.
-- Préconditions : public.companies(owner_user_id), products(company_id), orders, order_items.
-- Contrôles : utilisateur authentifié, entreprise propriétaire, lignes valides et distinctes,
-- chaque produit appartient à l'entreprise, création atomique (transaction PostgreSQL).
CREATE OR REPLACE FUNCTION public.stockpilot_v3_create_order(
  p_company_id uuid,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order uuid;
  v_line jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.owner_user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Unauthorized company';
  END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid lines';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lines) AS x
    WHERE jsonb_typeof(x) IS DISTINCT FROM 'object'
      OR x->>'id' IS NULL
      OR (x->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR (x->>'qty') IS NULL
      OR (x->>'qty') !~ '^[0-9]{1,7}$'
      OR (x->>'qty')::numeric NOT BETWEEN 1 AND 1000000
  ) THEN
    RAISE EXCEPTION 'Invalid item';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_lines))
    <> (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(p_lines) AS x) THEN
    RAISE EXCEPTION 'Duplicate item';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lines) AS x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = (x->>'id')::uuid AND p.company_id = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized item';
  END IF;
  INSERT INTO public.orders(company_id,status,created_by,stock_flow)
  VALUES (p_company_id,'draft',v_uid,'inbound')
  RETURNING id INTO v_order;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.order_items(order_id,product_id,quantity)
    VALUES (v_order,(v_line->>'id')::uuid,(v_line->>'qty')::int);
  END LOOP;
  RETURN v_order;
END
$function$;

-- IMPORTANT : restreindre explicitement EXECUTE avant exposition API.
REVOKE ALL ON FUNCTION public.stockpilot_v3_create_order(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stockpilot_v3_create_order(uuid,jsonb) TO authenticated;

-- Plan de vérification AVANT déploiement :
-- 1. Auth anonyme -> refus.
-- 2. Utilisateur A, entreprise A -> création d'un brouillon A.
-- 3. Utilisateur A, entreprise B appartenant à B -> refus, aucune commande.
-- 4. Produit B avec entreprise A -> refus, aucune commande.
-- 5. Deux entreprises appartenant à A -> chaque commande créée dans la bonne entreprise.
-- 6. Répétition d'ID, quantités 0/1000001, JSON invalide -> refus.
-- 7. Vérifier les autorisations de la fonction et les advisors de sécurité.
-- 8. Prévoir bascule frontend vers v3 seulement après validation serveur.
