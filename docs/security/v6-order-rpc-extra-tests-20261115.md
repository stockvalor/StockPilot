# Tests RPC supplémentaires — V6 recette — 15/11/2026

Tous les appels : `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, JWT simulé via `request.jwt.claim.sub`. Aucune insertion effectuée.

- Entreprise A + produit appartenant à B : **`Unauthorized item`**, refus conforme.
- Entreprise A + même produit deux fois : **`Duplicate item`**, refus conforme.
- Entreprise A + son produit + quantité 1 : les validations préalables passent, puis PostgreSQL refuse l'INSERT avec **`25006: cannot execute INSERT in a read-only transaction`**. Cela ne prouve **pas** qu'une création réelle réussirait dans une transaction autorisant l'écriture.

Restent à tester : création/confirmation/réception réelle en recette avec données de test autorisées, isolation avec véritables sessions JWT, comportement concurrent, sauvegarde/restauration. Ne pas utiliser les données clients existantes pour un test destructif.
