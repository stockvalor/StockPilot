# V6 — Isolation des entreprises : plan d'implémentation prudent

Statut : architecture proposée, **non déployée**. V5 et branche principale inchangées.

## Diagnostic vérifié
Supabase possède `companies` (id, owner_user_id), `products` (company_id, stock, prix) et `stockpilot_backups` (company_id, owner_user_id, payload). L'interface V6 utilise encore les clés `localStorage` globales pour stocks/commandes. L'authentification et les RLS cloud ne suffisent donc pas à isoler les données locales.

## Solution retenue
1. **Source de vérité cloud** : stocks produits par entreprise dans `products` avec RLS. Les commandes nécessitent un schéma dédié (commandes + lignes) et des politiques RLS explicites avant migration.
2. **Sélection explicite d'entreprise** : ne jamais déduire silencieusement l'entreprise active de la première ligne retournée. Contrôler son appartenance à chaque lecture/écriture.
3. **Aucun accès aux données professionnelles sans session valide**. L'espace de démonstration reste séparé et marqué comme fictif.
4. **Migration sans perte** : exporter une copie JSON locale, vérifier son intégrité, afficher le nombre de fiches et commandes, demander confirmation de l'entreprise cible, importer par lots idempotents, relire côté serveur et comparer les comptes. Ne jamais effacer automatiquement les anciennes données.
5. **Mode hors ligne ultérieur** : cache indexé par utilisateur ET entreprise, nettoyé au changement de session ; ne pas le présenter comme sécurisé contre un autre utilisateur du même navigateur sans chiffrement et modèle de clés vérifié.
6. **Sauvegarde** : conserver l'export manuel jusqu'à validation de l'import/restauration et des règles d'accès.

## Conditions de validation
- Deux comptes et deux entreprises réels : chacun ne voit, ne modifie ni n'exporte les données de l'autre.
- Requêtes REST directes avec identifiant d'entreprise étranger : refus vérifié pour SELECT, INSERT, UPDATE, DELETE.
- Déconnexion et changement de compte, y compris requêtes en cours : aucune donnée ni réponse obsolète visible.
- Migration test avec données fictives : quantités, prix, historique et références préservés ; doublons évités.
- Échec réseau et session expirée : aucune écriture dans une mauvaise entreprise ; reprise contrôlée.
- Contrôle de sécurité Supabase et essai sur Chrome Android avant publication.

## Décision de livraison
Ne pas fusionner V6 vers main ni annoncer la commercialisation avant ces tests. Le développement doit se faire par petites étapes réversibles sur `v6-securisation`.
