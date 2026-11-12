# StockPilot V6 — plan de sécurisation des commandes (12 novembre 2026)

## Constat vérifié
- public.stockpilot_receive_order(text,jsonb) est SECURITY DEFINER, propriétaire postgres, EXECUTE accessible à authenticated.
- Elle vérifie auth.uid(), l'entreprise propriétaire, les quantités, les produits, les doublons et la référence.
- Elle ne lie pas les lignes reçues à une commande serveur validée.
- Au moment de l'audit : aucune ligne dans orders/order_items ; une réception dans stockpilot_receipts.
- Les brouillons de commande sont locaux.

## Stratégie sans régression
1. Conserver V5, toutes les V6 et la fonction existante inchangées pendant les tests.
2. Développer une nouvelle version isolée et une nouvelle fonction RPC de test, distincte de stockpilot_receive_order.
3. Enregistrer les commandes et leurs lignes côté serveur, sous l'entreprise authentifiée. Le client ne doit jamais pouvoir définir company_id, created_by ou le statut final arbitrairement.
4. Lors de la réception, charger la commande serveur, vérifier l'entreprise, le statut validé, les lignes et quantités autorisées ; verrouiller la commande dans une transaction.
5. Mettre à jour les stocks de façon atomique et enregistrer la réception ; rendre les répétitions idempotentes.
6. Restreindre EXECUTE de la nouvelle fonction, et contrôler les politiques RLS et les permissions des tables.
7. Tester avec deux comptes, tentatives inter-entreprises, répétition, falsification des quantités, reconnexion, export CSV/PDF.
8. Après validation uniquement : migrer la V6 vers le nouveau flux, puis retirer l'accès à l'ancienne fonction.

## Critères de validation
- Aucune réception sans commande serveur validée.
- Aucune modification de produits appartenant à une autre entreprise.
- Répétition d'une réception sans augmentation de stock.
- Quantités reçues conformes à la commande (ou réception partielle explicitement autorisée et tracée).
- Les anciennes versions restent disponibles et les données de test sont conservées.

Ce fichier est un plan, pas un correctif déployé.
