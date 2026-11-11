# Vérification des accès Supabase — 11 novembre 2026

## Contrôle réellement exécuté (lecture seule)
Interrogation de information_schema.role_table_grants pour les rôles anon et authenticated sur les tables public.

Résultat : aucune attribution directe de privilèges aux tables métier pour le rôle anon dans les résultats ; les privilèges sont accordés au rôle authenticated, selon la table.
- companies : SELECT, INSERT, UPDATE, DELETE
- products : SELECT, INSERT, UPDATE, DELETE
- orders : SELECT, INSERT
- order_items : SELECT, INSERT
- stock_movements : SELECT
- stockpilot_backups : SELECT, INSERT
- stockpilot_restore_requests : SELECT, INSERT

Les politiques RLS vérifiées dans l'audit précédent restreignent les accès à auth.uid() et aux entreprises propriétaires.

## Limites importantes
- Une lecture des privilèges ne remplace pas des appels réels avec deux JWT utilisateurs distincts.
- Les privilèges effectifs peuvent inclure des héritages de rôles ou d'autres voies d'accès : examiner les fonctions SECURITY DEFINER, vues et autres schémas.
- Aucune tentative de connexion avec des comptes de clients réels, aucune lecture de données personnelles, aucune modification de production.
- La protection des mots de passe compromis demeure signalée comme désactivée par Supabase.

## Prochaine séquence de tests (sur environnement de test)
1. Créer deux utilisateurs fictifs A et B avec deux entreprises distinctes.
2. Insérer des produits fictifs sous A et B.
3. Sous A, tenter SELECT, INSERT, UPDATE, DELETE ciblant l'entreprise B et vérifier refus ou zéro ligne.
4. Répéter en inversant A/B sur products, orders, order_items et stockpilot_backups.
5. Tester sauvegarde/restauration et confirmer qu'une sauvegarde de B ne peut pas être restaurée par A.
6. Ne jamais exécuter ces tests destructifs sur les données de production.

**Statut : contrôle de privilèges réussi en lecture seule ; isolation multi-comptes non encore démontrée.**
