# StockPilot AI V6 — Matrice de recette avant publication

État : **tests à exécuter**, pas une attestation de réussite. Branche `fix/account-isolated-inventory`; ne pas modifier V5 ni publier sans validation.

## Contrôles techniques déjà effectués
- Présence dans le code des RPC de création atomique et de confirmation entrante.
- RLS activée pour `companies`, `products`, `orders`, `order_items`, `stockpilot_receipts`.
- Fonctions V2 de commandes exécutables par `authenticated`, pas par `anon`.
- Index unique `(company_id,order_ref)` sur les justificatifs de réception.
- Aucune implémentation WebAuthn/passkey active à ce jour.

## Recette manuelle (environnement de test, produits fictifs uniquement)
| ID | Test | Attendu | État |
|---|---|---|---|
| AUTH-01 | Connexion Gmail puis déconnexion | Session supprimée, inventaire cloud masqué | À tester |
| AUTH-02 | Connexion Hotmail en navigation privée | Aucun produit Gmail visible | À tester |
| AUTH-03 | Forcer requête produit d'une autre entreprise | Aucun accès en lecture/écriture | À tester |
| AUTH-04 | Expiration/renouvellement jeton | Identité préservée, pas de boucle ni chargement infini | À tester |
| STOCK-01 | Créer produit fictif Gmail | Visible uniquement chez Gmail après actualisation | À tester |
| STOCK-02 | Modifier quantité puis actualiser | Quantité persistée, vérifiée serveur | À tester |
| ORDER-01 | Créer brouillon entrant fictif | Une commande et une ligne créées atomiquement | À tester |
| ORDER-02 | Confirmer brouillon | Statut confirmé, aucun stock ajouté | À tester |
| ORDER-03 | Réception unique | Stock ajouté une seule fois et justificatif créé | Bloqué : UI non raccordée |
| ORDER-04 | Réception répétée | Aucun second mouvement | Bloqué : recette serveur |
| ORDER-05 | Réception sous mauvais compte | Refus côté serveur | À tester |
| PASSKEY-01 | Enrôlement passkey | Challenge et attestation validés serveur | Bloqué : non développé |
| PASSKEY-02 | Connexion empreinte/visage/PIN | Session Supabase valide après assertion vérifiée | Bloqué : non développé |
| PASSKEY-03 | Rejeu/mauvaise origine/autre compte | Refus sans session | Bloqué : non développé |
| BACKUP-01 | Export/restauration de données fictives | Intégrité et isolation préservées | À tester |
| UI-01 | Tests téléphone Android | Navigation et saisie utilisables | À tester |
| UI-02 | Tests ordinateur Chrome/Edge | Navigation et saisie utilisables | À tester |

## Critères de livraison
Tous les tests bloquants doivent être réussis; sauvegarde vérifiée; aucun accès croisé; aucune double réception; connexion biométrique opérationnelle seulement si vérification serveur réellement déployée; autorisation explicite avant mise en production.

**Ne pas affirmer qu'il ne reste que les tests ordinateur** tant que PASSKEY et ORDER-03/04 ne sont pas résolus.
