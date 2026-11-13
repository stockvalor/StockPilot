# V6.8.18 — Isolation des stocks : diagnostic et critères de correction

Statut : diagnostic confirmé dans le code, correctif non appliqué, aucun déploiement.

## Cause observée

`preview/v6-8-18-menu-ajuste/index.html` charge l'inventaire via la clé globale `stockpilot-futuriste-orders-v2` (repli `-v1`) dans `localStorage`, sans lier cette clé à l'identité Supabase. Deux comptes sur le même navigateur peuvent donc voir le même inventaire local. Les stocks locaux ne prouvent pas la persistance dans `products` Supabase.

## Contraintes de sécurité

- Ne pas modifier V5 ni l'interface approuvée.
- Ne pas effacer, déplacer ou attribuer automatiquement les 11 produits locaux à un compte.
- Préserver une copie exportable avant toute migration.
- Ne jamais utiliser un simple préfixe localStorage comme mécanisme de sécurité multi-tenant.
- L'accès aux données serveur doit être conditionné à la session Auth et aux politiques RLS, par `company_id` contrôlé côté serveur.
- Sans session, ne pas afficher des données privées d'une session précédente.
- La déconnexion doit vider les états mémoire et les vues de l'ancien compte.
- Éviter toute récupération automatique d'un inventaire local non attribué sur un autre compte.

## Étapes à réaliser

1. Auditer les handlers Auth, les changements de session, les tables et politiques RLS et les autres clés locales (commandes, prévisions, sauvegardes).
2. Construire une migration explicite et réversible des données locales vers une entreprise choisie et autorisée, après export JSON et confirmation utilisateur.
3. Charger les produits par entreprise depuis Supabase; refuser les opérations non authentifiées; vérifier les contrôles RLS en lecture et écriture.
4. Tester Gmail / Hotmail sur le même appareil et dans deux navigateurs : chaque entreprise voit uniquement ses produits, y compris après changement de compte et rafraîchissement.
5. Tester conservation des 11 produits, absence de perte, rollback et sauvegarde cloud.
6. Obtenir une validation explicite avant fusion ou déploiement.

Aucune réussite de test n'est revendiquée par ce document.
