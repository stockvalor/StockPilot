# V6 recette — contrôle de sécurité en lecture seule (15 novembre 2026)

Projet testé : StockPilot-V6-RECETTE (`qofvnaomefqkemtxhmoi`). Aucune donnée modifiée.

## Résultats vérifiés par SQL
- 5 entreprises, 5 propriétaires distincts.
- `companies`, `products`, `orders`, `order_items` : RLS activée sur les quatre tables.
- Pour les quatre tables : `anon` n'a pas le privilège SELECT ; `authenticated` dispose de SELECT, soumis aux politiques RLS.
- Les politiques SELECT des entreprises comparent `owner_user_id` à `auth.uid()`.
- Les politiques SELECT produits, commandes et lignes de commande vérifient l'appartenance de l'entreprise à `auth.uid()`.
- La RPC `stockpilot_v2_create_order_for_company(uuid,jsonb)` est exécutable par `authenticated` et pas par `anon`.

## Points bloquants avant validation
- Il faut un test authentifié de bout en bout avec deux comptes distincts, chacun sur sa propre entreprise, pour prouver l'isolation réelle (SELECT, INSERT, UPDATE et RPC).
- Il faut tester les refus d'accès croisés, les commandes réelles en recette et l'absence de fuite via les autres tables / fonctions.
- L'audit Supabase signale 4 fonctions SECURITY DEFINER exposées aux utilisateurs authentifiés et la protection contre les mots de passe compromis désactivée. Une revue de leur code et autorisations est nécessaire.

## Garde-fous
Aucun déploiement, aucune modification de `main`, V5 ou production. Ne pas conclure que l'isolation est validée tant que les tests authentifiés ne sont pas exécutés.
