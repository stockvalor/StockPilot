# Recette transactionnelle des commandes V6 — 15 novembre 2026

Projet : Supabase V6 recette `qofvnaomefqkemtxhmoi`, jamais V5/production.

## Test 1 — création valide
Transaction `BEGIN` avec `SET LOCAL ROLE authenticated` et `request.jwt.claim.sub` simulé pour un propriétaire de la recette. Appel de `stockpilot_v2_create_order_for_company` avec un produit appartenant à son entreprise et quantité 1. Le nombre de commandes visibles dans la transaction est passé de 1 à 2. `ROLLBACK` explicite. Relecture hors transaction : **1 commande, 1 ligne**. Aucune commande de test conservée.

## Test 2 — parcours complet
Même approche transactionnelle. Dans un bloc PL/pgSQL :
1. Lire la quantité de départ du produit.
2. Créer une commande via `stockpilot_v2_create_order_for_company`.
3. Confirmer via `stockpilot_v2_confirm_order` et exiger `true`.
4. Réceptionner via `stockpilot_v2_receive_order` et exiger `status=received`.
5. Vérifier que la quantité du produit a augmenté exactement de 1.
6. Si une assertion échoue, lever une exception.

Toutes les assertions ont réussi. Avant annulation, 2 commandes étaient visibles dans la transaction. `ROLLBACK` explicite.

Relecture après annulation : **1 commande, quantité du produit 10, 1 réception** pour l'entreprise de test. Aucune écriture durable issue du test.

## Limites
Identité JWT **simulée par SQL**, et non connexion réelle par Supabase Auth ou l'interface. Le test ne valide ni l'API REST, ni les transactions concurrentes, ni les refus d'écriture croisée pour toutes les tables, ni la restauration de sauvegarde. Ne pas déployer avant les tests clients pilotes et validation.
