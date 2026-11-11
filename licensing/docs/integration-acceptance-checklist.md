# StockPilot AI — protocole de recette des licences commerciales

## État
Les 10 tests unitaires du prototype de licence ont été exécutés sous Node.js 22 : 10 réussis, 0 échec. Cela **ne prouve pas** la sécurité du système commercial.

## Conditions obligatoires avant activation
1. Générer une paire ECDSA P-256 commerciale en environnement serveur sécurisé. La clé privée ne quitte jamais le gestionnaire de secrets.
2. Définir et vérifier un rôle administrateur côté serveur (app_metadata ou table privée), jamais user_metadata.
3. Vérifier le paiement côté serveur avec l'identifiant de commande du prestataire, signature de webhook, statut et montant. Un clic navigateur n'est jamais une preuve.
4. Émettre une seule licence par référence de paiement (contrainte unique et transaction idempotente).
5. Associer la licence à un client et enregistrer la trace d'émission dans le schéma privé.
6. Tester une licence réellement signée par le serveur dans le navigateur StockPilot, en ligne et hors ligne.
7. Tester le refus des licences modifiées, du mauvais client, d'une clé inconnue et d'un produit différent.
8. Définir transfert de licence, remboursement, support, sauvegarde et récupération de la clé privée.
9. Valider l'isolation multi-entreprises séparément : les tests de licence ne la prouvent pas.
10. Obtenir une revue de sécurité avant commercialisation.

## Séquence de tests d'intégration
- Commande de démonstration côté serveur (sans paiement réel).
- Autorisation administrateur vérifiée ; tentative non-admin rejetée.
- Création idempotente d'une licence de démonstration dans un environnement séparé.
- Signature serveur et vérification par clé publique cliente.
- Déconnexion du réseau : licence à vie toujours vérifiable.
- Répétition de la même demande : pas de seconde licence.
- Simulation d'une réponse de paiement falsifiée : refus.
- Journal d'audit et permissions de base de données contrôlés.

## Statut de déploiement
Aucun service d'émission commercial activé. Aucun secret ajouté à GitHub. V5 et V6.8.15 conservées.
