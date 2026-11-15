# Compatibilité commande mono/multi-entreprises — V6 recette — 15/11/2026

## Inspection directe de la fonction existante
`public.stockpilot_v2_create_order(p_lines jsonb)` fait `SELECT id INTO STRICT v_company FROM public.companies WHERE owner_user_id=v_uid`.

- Avec **exactement une entreprise** pour le propriétaire, cette sélection fonctionne.
- Avec **plusieurs entreprises** pour le même propriétaire, `INTO STRICT` provoque `TOO_MANY_ROWS` : l'ancienne RPC ne sait pas laquelle utiliser.
- Avec aucune entreprise, `NO_DATA_FOUND`.
- La contrainte `companies_id_owner_user_id_key` est `UNIQUE (id, owner_user_id)`, **pas** `UNIQUE(owner_user_id)` ; plusieurs entreprises par propriétaire sont donc possibles.
- À la date de l'inspection, aucune entreprise ne partage son propriétaire avec une autre dans les 5 enregistrements observés.

## Recommandation
Conserver l'ancienne RPC pour les parcours mono-entreprise et utiliser `stockpilot_v2_create_order_for_company(p_company_id,p_lines)` uniquement après tests et branchement explicite dans l'interface multi-entreprises expérimentale. Ne pas remplacer silencieusement la RPC existante.

## Recette à compléter
Créer un jeu de données dédié et jetable, vérifier plusieurs entreprises pour un même utilisateur, les permissions, les transitions des commandes et les refus d'accès croisés. Demander validation avant une opération qui modifie les données existantes ou avant déploiement.
