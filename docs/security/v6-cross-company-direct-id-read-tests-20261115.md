# Contrôle croisé RLS A/B — V6 recette — 15 novembre 2026

Tests SQL exécutés sur le projet recette `qofvnaomefqkemtxhmoi`, `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, `set_config('request.jwt.claim.sub', ... , true)`, `ROLLBACK`.

Deux entreprises existantes appartenant à deux propriétaires distincts ont été ciblées directement par leur UUID dans des requêtes SELECT sur `public.companies`, `public.products` et `public.orders`.

| Identité simulée | Entreprise étrangère visible | Produits étrangers visibles | Commandes étrangères visibles |
|---|---:|---:|---:|
| A vers B | 0 | 0 | 0 |
| B vers A | 0 | 0 | 0 |

**Résultat :** aucune ligne étrangère visible dans ces six requêtes, en contexte de rôle `authenticated` avec identité simulée.

**Précautions :** test de lecture uniquement ; pas de véritable JWT, pas d'appel REST authentifié, pas de tentative de modification. Les contrôles manuels rapportés séparément par l'utilisateur (Gmail et Hotmail connectés, entreprises différentes, inventaires cloud 3 et 2 produits, quatre copies Gmail vérifiées, zéro copie visible Hotmail) ne doivent pas être présentés comme une preuve complète de résistance à l'accès direct par identifiant.

Aucune donnée ni aucun schéma modifié. V5, production et branche main inchangées.
