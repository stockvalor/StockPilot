# Intégration sécurisée du stockage multi-entreprises (proposition, non déployée)

## Point bloquant confirmé dans index.html
Le code actuel utilise `const storeKey='stockpilot-futuriste-orders-v2'`, puis `localStorage.getItem(storeKey)` dans `loadOrderState()` et `localStorage.setItem(storeKey,...)` dans `saveOrderState()`. Le mécanisme `collectBackup()` lit aussi les clés globales `stockpilot-futuriste-orders-v1`, `stockpilot-futuriste-orders-v2`, `stockpilot-forecast-v46`.

**Risque** : un navigateur partagé entre deux utilisateurs pourrait charger des données locales du précédent utilisateur, puis les sauvegarder dans l'entreprise du nouveau. Le fait de partitionner uniquement l'horodatage des sauvegardes ne règle pas ce problème.

## Migration sans perte — ordre obligatoire
1. Charger la session Supabase et vérifier l'utilisateur via `/auth/v1/user`.
2. Charger l'entreprise autorisée depuis Supabase et confirmer le choix si plusieurs entreprises existent.
3. Instancier `StockPilotTenantStorageDraft.forTenant(user.id, company.id)` ; ne jamais déduire une identité fiable d'un champ modifiable par le client.
4. Remplacer TOUS les accès aux trois clés globales (lecture, écriture, export, import, sauvegarde cloud, restauration) par des accès partitionnés. Les valeurs anciennes ne doivent pas être effacées.
5. Afficher une proposition explicite d'import des anciennes données, avec aperçu et confirmation humaine. Ne jamais importer automatiquement.
6. En cas de déconnexion ou changement d'entreprise : effacer l'état applicatif en mémoire, recharger le bon espace, désactiver les actions jusqu'à la fin de l'authentification.
7. Le contenu des sauvegardes doit porter l'identité de l'entreprise, et le serveur doit vérifier la correspondance via RLS ; ne pas se fier à un identifiant dans le navigateur.
8. Après tests d'isolation de bout en bout, seulement alors lever le verrou `TENANT_STORAGE_ISOLATION_VERIFIED` du planificateur expérimental.

## Tests indispensables
- Utilisateur A/entreprise A crée un produit ; B/entreprise B se connecte sur le même navigateur : aucun produit de A visible.
- Déconnexion B puis reconnexion A : les produits de A sont retrouvés.
- Sauvegarde cloud B : aucune donnée locale A incluse.
- Restauration d'une sauvegarde A depuis B : accès refusé par RLS.
- Données anciennes présentes : aucune attribution automatique ; export manuel possible avant import.
- Deux onglets, changement de compte, mode hors ligne, session expirée, échec réseau : aucun mélange de données.

**Statut : plan d'intégration uniquement. Ne pas déployer ni activer les sauvegardes automatiques.**
