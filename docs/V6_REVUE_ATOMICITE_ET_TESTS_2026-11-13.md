# StockPilot V6 — Revue de la correction atomique
Statut : audit statique ; aucun déploiement ni écriture de stocks.
## Vérifié
- La fonction V2 vérifie identité, produits et appartenance à l'entreprise.
- Le trigger guard_order_item_insert impose une commande propriétaire en état draft et un produit de la même entreprise.
- La proposition V3 regroupe création, lignes et confirmation dans une transaction PostgreSQL.
## Correctifs obligatoires avant exécution
1. Au rejeu, vérifier status = confirmed, et refuser une commande annulée.
2. Persister côté navigateur la clé de demande et le contenu avant envoi ; réutiliser la même clé après erreur réseau ou rechargement.
3. Tester deux requêtes simultanées avec même clé : une seule commande.
4. Refuser même clé avec contenu différent.
5. Simuler erreur de ligne : rollback total, aucun brouillon orphelin.
6. Vérifier hypothèse une seule entreprise par utilisateur (SELECT INTO STRICT).
7. Tester isolation de deux entreprises, droits EXECUTE, absence de service_role dans navigateur.
8. Tester deux réceptions simultanées sans toucher aux stocks réels.
9. Préserver V5, anciennes commandes V2 et prévisualisation Chrome.
## Sortie
N'intégrer le frontend qu'après correction du SQL et tests dynamiques sur environnement isolé. Aucun test dynamique effectué dans cette revue.