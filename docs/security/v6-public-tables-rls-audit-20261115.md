# Audit complémentaire RLS — V6 recette — 15/11/2026

Projet recette `qofvnaomefqkemtxhmoi`. Inspections SQL en lecture seule, aucun changement de données ou de schéma.

## Inventaire
9 tables du schéma `public` : `companies`, `order_items`, `orders`, `products`, `sp_secure_orders`, `stock_movements`, `stockpilot_backups`, `stockpilot_receipts`, `stockpilot_restore_requests`.

Pour les 9 tables : `relrowsecurity=true`, `has_table_privilege('anon',oid,'SELECT')=false`, `has_table_privilege('authenticated',oid,'SELECT')=true`.

## Politiques supplémentaires examinées
- `sp_secure_orders` et `stock_movements` : SELECT uniquement si propriétaire de l'entreprise.
- `stockpilot_backups` : SELECT/INSERT avec identité du propriétaire et entreprise correspondante.
- `stockpilot_receipts` : SELECT exige `received_by=auth.uid()` **et** propriété de l'entreprise. Attention : cette règle peut cacher à un propriétaire les réceptions effectuées par un autre opérateur, si un système multi-utilisateur est introduit.
- `stockpilot_restore_requests` : SELECT limité au demandeur/propriétaire ; INSERT exige statut pending, applied_at NULL, sauvegarde correspondante et propriété.

## Simulation inter-entreprises
Transaction `BEGIN READ ONLY` / `ROLLBACK`, rôle `authenticated`, identité du propriétaire A simulée. Recherche de lignes de l'entreprise B dans `stockpilot_backups`, `stockpilot_receipts`, `stock_movements`, `stockpilot_restore_requests` : **0 ligne visible dans les quatre cas**.

Limite : si les tables n'ont aucune ligne pour B, ce résultat est non concluant à lui seul ; la protection repose aussi sur l'inspection des politiques. JWT réel et tests d'écriture non exécutés.
