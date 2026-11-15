# Tests négatifs RPC — V6 recette — 2026-11-15

Exécution sur le projet V6 recette uniquement, avec `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, simulation de `request.jwt.claim.sub`. Les appels provoquant une exception n'ont produit aucune commande.

1. Identité simulée A, entreprise de B : erreur PostgreSQL `P0001: Unauthorized company` (attendu).
2. Identité simulée B, entreprise de A : erreur `P0001: Unauthorized company` (attendu).
3. Identité simulée A, entreprise de A, lignes vides `[]` : erreur `P0001: Invalid lines` (attendu). Confirme que le contrôle d'appartenance réussit puis que la validation des lignes refuse le tableau vide.

**Limites** : simulation SQL du JWT, pas une session Auth réelle. Aucun test positif d'insertion, de réception ou de modification des stocks. Les refus ci-dessus ne prouvent pas à eux seuls l'isolation complète. Aucun changement de production, de V5, de `main` ou du schéma SQL.
