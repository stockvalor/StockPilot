# StockPilot AI V6 — bilan final provisoire des vérifications (15 novembre 2026)

## Vérifications exécutées directement aujourd'hui

Projet **V6 recette** uniquement : `qofvnaomefqkemtxhmoi`. Aucune mutation.

- Catalogue PostgreSQL : **9/9 tables public avec RLS activé** et au moins une politique chacune.
- Volumétrie lue : 5 entreprises, 13 produits, 8 commandes, 12 sauvegardes (ensemble de la base, pas par compte).
- Supabase Security Advisors : 4 avertissements de fonctions `SECURITY DEFINER` exécutables par `authenticated`, 1 avertissement sur la protection contre les mots de passe compromis désactivée ; 2 informations sur les tables privées `stockpilot_internal.commercial_licenses` et `stockpilot_internal.v6_order_requests` avec RLS mais sans politique.
- Tests SQL précédents : simulation de deux propriétaires et lectures ciblées A→B / B→A, zéro ligne étrangère visible pour entreprises, produits et commandes. Simulation d'un cycle de commande en transaction annulée.
- Suite JavaScript isolée : tests locaux de l'adaptateur multi-entreprises rapportés comme passés ; appels mockés, pas de CI ou d'essai E2E réel.

## Tests utilisateur déjà rapportés

- Deux connexions réelles Gmail et Hotmail dans deux sessions distinctes.
- Entreprises différentes, 3 produits cloud pour Gmail, 2 pour Hotmail.
- Quatre sauvegardes visibles sur Gmail et déclarées « copie vérifiée » par l'application ; aucune sauvegarde visible sur Hotmail.
- Connexion, réinitialisation de mot de passe et reconnexion déjà essayées.

## Ce qui n'est PAS validé

1. Test REST avec vrais JWT de deux utilisateurs, sans exposer les jetons (lecture directe d'UUID étrangers et refus d'écriture).
2. Parcours E2E de commande créer → confirmer → réceptionner dans l'interface V6 actuelle, pour deux comptes, sans effets indésirables.
3. Test de restauration sur copie isolée ; intégrité indépendante des sauvegardes et récupération après incident.
4. Tests complets de scanner EAN/photo, réseau dégradé, mobile et persistance en conditions clients.
5. Revue de nécessité et de durcissement des quatre fonctions SECURITY DEFINER, et décision sur la protection mots de passe compromis.
6. Vérification d'intégration effective de l'adaptateur expérimental : il n'est pas chargé par l'interface existante.

## Décision

**NO-GO commercialisation générale** à ce stade. Les fondations et tests intermédiaires sont encourageants, mais les contrôles restants exigent un environnement de test authentifié ou une interaction navigateur. Ne pas inventer de résultats.

**Aucun déploiement, aucune modification de schéma/données, aucune modification V5/main/production.**

Références Supabase :
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
