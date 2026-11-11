# StockPilot AI — audit de préparation sécurité, cloud, licences
Date : 2026-11-11. Branche de travail uniquement. Aucun déploiement en production.

## Constat vérifié
- Projet Supabase actif : ieogcyuqgqmaebjkvlns.
- RLS activé sur companies, products, orders, order_items, stock_movements, stockpilot_backups, stockpilot_restore_requests.
- Les politiques SELECT/INSERT/UPDATE/DELETE existantes reposent sur auth.uid() et la propriété de l'entreprise.
- Les données de stock de l'interface restent en localStorage. La table de sauvegardes cloud existe et contient au moins un enregistrement ; cela ne démontre ni synchronisation automatique ni restauration réussie.
- Le panneau Licence V6.8.12 est expérimental ; aucune émission commerciale ni contrôle d'accès serveur.
- Alerte Supabase : protection des mots de passe compromis désactivée.

## Critères de validation avant vente
1. Deux comptes de test A/B avec entreprises distinctes : A ne doit pas lire, créer, modifier ou supprimer les produits, commandes et sauvegardes de B, y compris via API REST.
2. Sauvegarde : créer un produit fictif, sauvegarder, se reconnecter sur un second navigateur, restaurer après confirmation, vérifier checksum et identité de l'entreprise. Ne jamais écraser silencieusement les données.
3. Licence : émission exclusivement côté serveur ; identifiant de licence unique ; propriétaire/entreprise lié ; signature ou validation serveur ; révocation et expiration vérifiées côté serveur ; aucun secret privé dans le navigateur. Prévoir un mode hors ligne documenté.
4. Vérifier sauvegarde périodique, limites de stockage, rétention, journalisation et restauration après erreur.
5. Activer la protection contre les mots de passe compromis si disponible sur le plan ; tester les flux inscription/connexion/récupération.
6. Contrôler les politiques RLS et les privilèges des fonctions avant toute migration.

## Contrôles SQL en lecture seule
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public'
ORDER BY tablename;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;

SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;
```

## État
Audit statique commencé. Tests réels multi-comptes et restauration non effectués. Ne pas fusionner cette branche dans main avant leur réussite et l'accord explicite du propriétaire.
