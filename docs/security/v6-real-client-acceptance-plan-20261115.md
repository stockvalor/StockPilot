# StockPilot V6 — protocole de recette clients et critères de sortie

Date : 15 novembre 2026. **Document préparatoire uniquement**. Aucun déploiement, aucune modification de données.

## Déjà observé (déclarations de l'utilisateur)
- Deux sessions réelles Gmail/Hotmail ouvertes en parallèle sur V6 recette.
- Gmail : une entreprise et trois produits dans l'inventaire cloud ; quatre copies affichées et vérifiées dans l'interface.
- Hotmail : une entreprise distincte et deux produits dans l'inventaire cloud ; aucune copie affichée.
- Ces constats UI ne suffisent pas à prouver l'absence d'IDOR/BOLA.

## Contrôles techniques préalables
1. Tester une lecture REST authentifiée A→B et B→A sur companies/products/orders/backups avec de **vrais jetons**, sans les copier dans un chat, log ou rapport. Exécuter les tests dans un environnement sûr ; ne jamais exposer les secrets.
2. Vérifier les permissions des RPC create/confirm/receive avec des identifiants d'entreprise et de commande étrangers : échec attendu ; effectuer uniquement des essais sans effets durables (transaction rollback) tant qu'une campagne d'essai contrôlée n'est pas validée.
3. Vérifier la cohérence des entreprises, stocks et commandes après reconnexion, rafraîchissement et changement de compte.
4. Confirmer les limites du flux de commande legacy quand un compte possède plusieurs entreprises et utiliser le RPC explicite `stockpilot_v2_create_order_for_company`.
5. Vérifier les alertes Supabase Security Advisor : fonctions SECURITY DEFINER authentifiées et protection mots de passe divulgués désactivée ; ne pas changer la configuration sans validation.
6. Contrôler le parcours de restauration sur une copie de données de test isolée avant tout essai de restauration de sauvegarde réelle.

## Recette utilisateur — sans perturber les données existantes
- Connexion/déconnexion et réinitialisation mot de passe déjà essayées ; vérifier le résultat attendu à chaque session.
- Ajouter un produit **fictif** seulement après accord sur un environnement de recette isolé ; vérifier qu'il n'apparaît pas chez l'autre client.
- Créer, confirmer et recevoir une commande **fictive** ; vérifier calculs, quantités, journal, historique, idempotence et absence de changement chez l'autre client.
- Vérifier affichage mobile, messages d'erreur, navigation et scanner photo/EAN dans les navigateurs réellement utilisés.
- Tester le comportement après reconnexion et interruption réseau.
- Documenter chaque résultat avec date, compte pseudonymisé, action, résultat attendu, résultat observé, capture expurgée.

## Go/no-go avant pilotes externes
**Bloquants** : accès inter-comptes possible ; perte ou altération de stock ; restauration non maîtrisée ; commandes incorrectes ; fuite de secret ; absence de sauvegarde/récupération vérifiée.

**Décision** : aucune invitation client ni bascule production avant tests de sécurité réels et accord explicite du propriétaire.

## Préservation
Ne pas modifier V5, production, branche main, interface validée, ni config SMTP/Auth. Ne jamais demander mots de passe, JWT, clés ou codes de récupération dans le chat.
