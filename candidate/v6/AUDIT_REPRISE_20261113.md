# Audit de reprise V6 — 2026-11-13

Branche isolée : work/v6-security-audit-20261113. Aucun déploiement ni changement de base.

## Constats vérifiés en lecture seule
- main: 6177895d67c6feeb5fcbf28373a3620511d63330.
- candidate: 1 commit devant main, 10 fichiers ajoutés sous candidate/v6.
- fix/stock-isolation-v6-8-18 et fix/cloud-inventory-sync-20261113 divergent de la candidate; ne pas fusionner aveuglément.
- Supabase ieogcyuqgqmaebjkvlns: ACTIVE_HEALTHY, 9 tables public avec RLS activée.
- Politiques products/orders/order_items fondées sur companies.owner_user_id = auth.uid().
- L'analyseur de sécurité signale 5 RPC SECURITY DEFINER accessibles à authenticated et la protection des mots de passe compromis désactivée.
- Les 5 RPC examinées vérifient auth.uid() et la propriété de l'entreprise; ceci ne remplace PAS les tests négatifs via deux sessions Auth réelles.
- Le diagnostic de fix/stock-isolation-v6-8-18 constate un stockage local global non isolé dans une ancienne préversion. Le module cloud de fix/cloud-inventory-sync-20261113 n'a pas été testé en navigateur réel.

## Matrice de recette (preuves antérieures documentées, NON réexécutées pendant cette reprise)
1. Inscription/connexion : BLOQUÉ (environnement Supabase isolé absent)
2. Création produit : BLOQUÉ cloud (simulation navigateur documentée)
3. Modification produit : BLOQUÉ cloud (simulation navigateur documentée)
4. Persistance : BLOQUÉ cloud (simulation navigateur documentée)
5. Déconnexion/reconnexion : BLOQUÉ cloud (simulation navigateur documentée)
6. Isolation deux comptes : BLOQUÉ Supabase (test PGlite documenté)
7. Création/validation commande : BLOQUÉ Supabase (test PGlite documenté)
8. Déduction/réception stock unique : BLOQUÉ Supabase (test PGlite entrant documenté; sortie non vérifiée)
9. Seuils : NON TESTÉ pendant reprise (test DOM antérieur documenté)
10. EAN/QR : NON TESTÉ pendant reprise (images Chromium antérieures documentées)
11. Reconnaissance photo sans code : ÉCHEC selon README candidate
12. Sécurité : BLOQUÉ Supabase (RLS et RPC auditées en lecture seule)
13. Mobile : NON TESTÉ sur appareil réel (émulation antérieure documentée)
14. Ordinateur : NON TESTÉ pendant reprise (Chromium simulé antérieurement)

## Actions suivantes avant commercialisation
- Identifier par SHA la V5 immuable, vérifier l'absence de modification de ses fichiers.
- Installer et exécuter les suites locales sur cette branche isolée; joindre logs et versions.
- Créer une base Supabase jetable avec deux utilisateurs fictifs; tester refus croisés en lecture, écriture, suppression et RPC, sans toucher aux données réelles.
- Tester commandes entrantes et sortantes, idempotence et concurrence.
- Vérifier scanner caméra, photo sans code, import/export, sauvegarde/restauration, mobile et desktop.
- Aucun déploiement ni migration de production sans autorisation.

Verdict provisoire : NON COMMERCIALISABLE (isolation réelle non démontrée, reconnaissance photo sans code absente, tests cloud bloqués).
