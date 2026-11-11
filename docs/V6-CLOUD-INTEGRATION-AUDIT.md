# StockPilot V6 — Audit d'intégration cloud (11 novembre 2026)

## État vérifié
- La branche `v6-securisation` contient une interface HTML avec authentification Supabase et stockage local des stocks et commandes.
- L'interface sauvegarde un objet `stockpilot-cloud-backup-v1` à partir de `localStorage`.
- La base possède un second format `stockpilot-products-v1` pour les instantanés des produits cloud.
- **Ne pas confondre les deux formats.** La restauration SQL `stockpilot_apply_restore` n'accepte que `stockpilot-products-v1`.
- Le contrôle SQL de l'empreinte utilise le texte JSONB PostgreSQL ; le navigateur utilise une sérialisation JSON canonique triée. Les empreintes ne sont pas nécessairement identiques. Le bouton de sauvegarde cloud de l'interface peut donc échouer. À corriger avant toute utilisation client.
- Les commandes locales de l'interface ne sont pas encore liées aux commandes transactionnelles de la base.

## Plan prioritaire (sans toucher à la version principale)
1. Conserver l'interface V5 et la branche principale intactes ; faire toutes les modifications sur `v6-securisation`.
2. Séparer clairement « sauvegarde locale de démonstration » et « sauvegarde des produits cloud ».
3. Brancher les produits sur `public.products` avec sélection explicite de l'entreprise et authentification Supabase.
4. Appeler les fonctions `stockpilot_adjust_stock`, `stockpilot_confirm_order`, `stockpilot_cancel_order` depuis les parcours appropriés.
5. Ajouter un bouton de prévisualisation `stockpilot_preview_backup` et une double confirmation avant `stockpilot_apply_restore`.
6. Tester dans Chrome deux comptes réels, deux entreprises, les accès refusés, les stocks concurrents, la restauration et le mode mobile.

## Sécurité
Ne pas utiliser de données clients réelles avant la fin des tests. L'alerte Supabase « leaked password protection disabled » reste ouverte. Les clés service_role ne doivent jamais être présentes dans le HTML public.

## Statut
Audit de code et fonctions SQL effectués. Intégration front-end et essais navigateur non validés.
