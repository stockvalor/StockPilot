# Revue des fonctions de commande — V6 recette — 2026-11-15

Inspection en lecture seule de `pg_get_functiondef` sur les trois fonctions suivantes : `stockpilot_v2_create_order_for_company`, `stockpilot_v2_confirm_order`, `stockpilot_v2_receive_order`.

## Constats vérifiés
- La création contrôle `auth.uid()`, puis vérifie que `p_company_id` appartient à cet utilisateur.
- Chaque produit est vérifié comme appartenant à l'entreprise demandée avant insertion.
- La création refuse un tableau de lignes vide ou de plus de 100 lignes et refuse les doublons.
- La confirmation sélectionne la commande via une jointure vers l'entreprise appartenant à `auth.uid()`, verrouille la ligne, exige le statut `draft`, puis passe à `confirmed`.
- La réception sélectionne également la commande avec contrôle du propriétaire et verrouillage, exige une commande entrante confirmée, met à jour les stocks de la même entreprise et enregistre un reçu.
- Les trois fonctions utilisent `SECURITY DEFINER` et `SET search_path TO ''`. Les contrôles internes d'autorisation sont donc essentiels.

## Limites
Il s'agit d'une **revue statique**, pas d'un test d'accès authentifié entre comptes. Il reste à tester l'isolation, les erreurs, les transitions de statut, la non-réception en double, la concurrence et la restauration/sauvegarde. Aucun changement SQL ni donnée métier n'a été réalisé.

## Décision de sécurité
Ne pas déployer ni raccorder la nouvelle fonction à la V6 existante avant une recette complète. Toute modification de fonction ou d'interface existante fera l'objet d'une revue séparée.
