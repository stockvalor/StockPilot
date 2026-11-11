# StockPilot AI — Émission de licences (architecture V6.8.15)

État : **conception / non déployé en production**. Aucun code commercial ne peut être émis pour le moment.

## Contrat de licence proposé

- Format : `base64url(UTF-8 JSON).base64url(signature ECDSA P-256 SHA-256)`.
- Payload canonique avec champs : `schema`, `product`, `edition`, `license_id`, `issued_at`, `customer_id`, `key_id`.
- Clé privée ECDSA P-256 conservée exclusivement côté serveur dans un gestionnaire de secrets. Ne jamais l'inclure dans GitHub Pages, dans un dépôt ou dans le navigateur.
- Clé publique correspondante intégrée au client pour vérifier la signature hors ligne.
- Les clés de démonstration de V6.8.13/V6.8.14 ne sont **pas** des clés commerciales.

## Processus d'émission

1. Administrateur authentifié avec droits serveur vérifiés (ne pas se fier à user_metadata).
2. Vérification du paiement et de la commande par une source serveur fiable.
3. Attribution d'un identifiant de licence unique et d'un client ; opération idempotente.
4. Enregistrement serveur dans une table privée non exposée avec audit, statut et empreinte du jeton ; contraintes d'unicité.
5. Signature côté serveur, renvoi au client et conservation de la preuve d'achat.
6. Client : validation de signature, de l'identité du produit, de l'édition, du schéma, du key_id et du contexte de licence ; aucune clé privée exposée.
7. Licence à vie : accès local préservé sans contrôle réseau récurrent ; sauvegarde cloud séparée et facultative.

## Vérifications indispensables avant vente

- Gestion des comptes et isolation entre entreprises prouvées par tests multi-comptes.
- Clé commerciale réellement générée et gérée hors du dépôt, rotation et sauvegarde des clés.
- Validation de jetons valides, falsifiés, expirés si applicable, incompatibles et dupliqués ; tests en ligne et hors ligne.
- Politique de transfert d'appareil et de réinstallation, prévention de la fraude, et limites du contrôle anti-copie sur application HTML locale.
- Tests de paiement et délivrance, remboursements, restauration et support.

**Ne pas commercialiser la V6.8.15 comme système de licences achevé.**
