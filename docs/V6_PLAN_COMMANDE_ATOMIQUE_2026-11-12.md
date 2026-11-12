# StockPilot V6 — Plan de correction des commandes fournisseur

Statut : PROPOSITION TECHNIQUE, NON DÉPLOYÉE. Préserver V5 et la prévisualisation V6 existante.

## Diagnostic vérifié

La prévisualisation `preview/v6-cloud-history-copyfix-20261112/index.html` appelle successivement `stockpilot_v2_create_order` puis `stockpilot_v2_confirm_order`. Si le deuxième appel échoue, un brouillon persiste en base et une nouvelle tentative peut créer une seconde commande. La table `public.orders` n'a pas de clé d'idempotence.

## Correction proposée

1. Ajouter une clé `client_request_id uuid` à `public.orders`, nullable pour les commandes historiques. Index UNIQUE `(company_id, client_request_id)` sur les clés non nulles.
2. Créer un RPC transactionnel `public.stockpilot_v3_create_confirm_order(p_request_id uuid, p_lines jsonb)` : authentification par `auth.uid()`, entreprise propriétaire, validation de toutes les lignes (UUID, quantité 1..1000000, unicité, produit de la même entreprise), puis création de commande et lignes et confirmation dans un seul appel PostgreSQL. Ne pas modifier le stock à la confirmation d'une commande fournisseur.
3. Rejouer le même `p_request_id` doit renvoyer la même commande sans nouvelle insertion. Pour la concurrence, utiliser une contrainte unique et un verrou transactionnel par demande ou gérer explicitement les conflits après verrouillage ; vérifier que les lignes correspondent au contenu original (empreinte ou stockage de la demande) pour refuser une réutilisation de clé avec contenu différent.
4. Protéger le RPC `SECURITY DEFINER` : `search_path` fixe, vérification explicite d'appartenance et de rôle, `REVOKE EXECUTE FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated` seulement ; contrôler les privilèges des fonctions internes.
5. Frontend : générer une clé stable avant l'envoi et la conserver lors des réessais ; ne pas générer une nouvelle clé si l'utilisateur réessaie après un délai ou une erreur réseau ; ne déclarer la commande réussie qu'après réponse confirmée. Mettre à jour l'historique cloud et garder l'ancienne prévisualisation intacte jusqu'aux tests.

## Tests obligatoires avant déploiement

- Création unique : 1 commande, statut confirmed, lignes exactes, aucun mouvement de stock.
- Répétition de la même clé : même identifiant de commande, aucune ligne supplémentaire.
- Même clé avec contenu différent : erreur explicite.
- Deux requêtes concurrentes : une seule commande.
- Erreur sur une ligne : rollback complet, aucun brouillon orphelin.
- Compte B essayant de créer/lire/recevoir une commande du compte A : refus serveur.
- Réception deux fois / en parallèle : une seule augmentation de stock.
- Anciennes commandes V2 et V5 : aucune régression.

Ne pas effectuer les tests d'écriture sur les stocks des comptes réels ; utiliser une entreprise et des produits de test isolés. Aucun déploiement sans validation.