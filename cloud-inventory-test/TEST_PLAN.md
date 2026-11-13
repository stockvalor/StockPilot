# StockPilot — validation du module cloud (branche isolée)

## Constat vérifié
- La racine `index.html` utilise `stockpilot-futuriste-orders-v2` dans `localStorage` pour le stock et les commandes.
- Les comptes Supabase possèdent leurs propres entreprises et la table `products` applique des politiques RLS fondées sur `companies.owner_user_id = auth.uid()`.
- La réception d'une commande locale ne modifie **pas** Supabase.

## Points bloquants avant toute mise en production
1. Le module de test `cloud-inventory-test/index.html` est sur une branche non déployée. Il ne remplace pas l'application.
2. Le module réutilise une session `sessionStorage` : ouvrir la page dans un nouvel onglet ne garantit pas la présence de la session. Il faut intégrer le module dans la page principale de la future préversion, ou lui donner une authentification propre. Ne jamais transférer un jeton dans une URL.
3. L'importation de stocks locaux doit être facultative et confirmée, et ne doit jamais écraser un produit cloud existant. Prévoir une transaction/idempotence pour éviter un import partiel lors d'une erreur réseau.
4. La réception doit passer par `stockpilot_v2_receive_order` avec un identifiant de commande cloud réel. Ne pas ajouter les quantités une seconde fois en local.
5. En cas de réseau indisponible, afficher clairement une erreur de synchronisation ; ne jamais afficher « enregistré dans le cloud » avant confirmation serveur.
6. Protéger la V5, ne pas modifier la racine publique sans accord, ne pas purger `localStorage`.

## Tests à exécuter
- [ ] Connexion Gmail, affichage uniquement de son entreprise et de ses produits.
- [ ] Création d'un produit test dans Supabase, puis rechargement dans une autre session du **même compte**.
- [ ] Modification de stock, rechargement et vérification en SQL.
- [ ] Connexion Hotmail : aucun produit ni commande Gmail visible ou modifiable, même en appel API forgé.
- [ ] Réception d'une commande cloud : incrément exactement une fois, deuxième réception rejetée.
- [ ] Test de panne réseau et jeton expiré : pas de faux message de réussite.
- [ ] Import contrôlé de Creatine (stock local 3) après comparaison des produits et sauvegarde préalable.
- [ ] Tests Chrome Android puis ordinateur, avant fusion ou déploiement.

**État** : prototype de connexion/inventaire enregistré ; pas de validation navigateur, pas de migration des données utilisateur, pas de déploiement.
