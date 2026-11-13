# StockPilot — isolation des inventaires (diagnostic, 2026-11-13)

Statut: anomalie reproduite par utilisateur sur deux comptes et en navigation privée. Ne pas déployer avant test de non-régression.

## Cause identifiée dans index.html (main)
- `DEFAULT_ITEMS` injecte des produits de démonstration.
- `loadOrderState()` lit `stockpilot-futuriste-orders-v2` ou `v1` sans identifiant utilisateur, et retombe sur `DEFAULT_ITEMS`.
- `renderStockList()` affiche `orderState.items`, pas `public.products` filtré par entreprise.
- La section Auth Supabase gère les sessions et entreprises mais n'alimente pas cet inventaire local.
- Les RLS des tables products et companies contrôlent le propriétaire, mais ne sécurisent pas l'affichage local.

## Correction requise (à implémenter et tester, non appliquée)
1. Séparer strictement le mode démonstration des stocks clients; ne jamais présenter DEFAULT_ITEMS comme des stocks réels.
2. Après authentification, charger l'entreprise autorisée via GET /rest/v1/companies?select=id,name et l'inventaire via GET /rest/v1/products?select=id,company_id,name,sku,quantity,min_quantity,unit_price&company_id=eq.<id>. L'autorisation reste imposée par RLS côté serveur.
3. En cas d'erreur ou d'absence de session, ne montrer aucun produit client, afficher un message d'état. Ne jamais retomber sur DEFAULT_ITEMS.
4. À la déconnexion, effacer l'état mémoire client et le DOM de stocks/commandes; ne pas effacer les données du serveur.
5. Les créations/modifications doivent passer par les API Supabase avec company_id validé, et être relues après écriture. Ne pas synchroniser aveuglément l'ancien localStorage vers le cloud.
6. Vérifier les modules Commandes IA, Scanner, KPI, export et sauvegardes, qui peuvent encore lire orderState.

## Tests d'acceptation
- Gmail: produits A visibles, produits B invisibles.
- Hotmail en navigation privée: produits B visibles, produits A invisibles.
- Compte sans entreprise: inventaire vide et action d'ajout bloquée.
- Déconnexion: aucune donnée du précédent utilisateur à l'écran.
- Accès API à l'UUID de l'autre entreprise: zéro ligne / refus en SELECT, INSERT, UPDATE, DELETE selon les règles.
- Actualisation/reconnexion: persistance cloud correcte.
- Aucune régression V5 et aucune publication sans autorisation.
