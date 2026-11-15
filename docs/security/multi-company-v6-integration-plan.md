# StockPilot V6 — préparation multi-entreprises (branche isolée)

Statut : préparation, **non déployé**, sans changement de l'interface de production.

## Constat vérifié
- La fonction `public.stockpilot_v2_create_order_for_company(uuid,jsonb)` a été ajoutée au projet Supabase V6 recette ; l'ancienne fonction reste présente.
- Le code `preview/v6-8-24/index.html` appelle `myCompany()` qui lit `companies?select=id,name&order=created_at.asc&limit=1` pour les sauvegardes. Cela ne garantit pas la sélection de la bonne entreprise.
- Le code de ce dépôt ne montre pas d'appel à la nouvelle RPC dans la prévisualisation inspectée.

## Intégration proposée (à tester avant toute activation)
1. Ajouter un sélecteur explicite d'entreprise pour le compte authentifié ; garder la sélection en mémoire de session.
2. Ne jamais choisir automatiquement la première entreprise pour une opération d'écriture ou de sauvegarde.
3. Pour créer une commande, appeler la RPC avec `p_company_id` et `p_lines` ; chaque ligne doit être `{"id":"UUID_PRODUIT","qty":ENTIER_POSITIF}`.
4. Filtrer l'affichage des produits, commandes et sauvegardes par entreprise sélectionnée ; le serveur doit continuer à contrôler les autorisations indépendamment du filtre client.
5. Tester avec deux comptes différents, puis deux entreprises appartenant au même compte ; refuser les produits d'une autre entreprise.
6. Tester la création, confirmation, réception, export et sauvegarde sans régression, puis demander validation explicite avant déploiement.

## Précautions
Ne pas modifier `main`, V5, production, ni les données de test existantes. Ne pas activer la RPC dans l'interface avant les tests d'autorisation et la vérification du format des lignes.
