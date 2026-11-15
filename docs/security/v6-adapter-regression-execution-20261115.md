# Exécution locale des tests de régression — 15 novembre 2026

Sources relues via le connecteur GitHub, branche `test/multi-entreprises-v6-20261115` :
- `preview/multi-company-experimental/adapter.js`
- `preview/multi-company-experimental/adapter.regression.test.cjs`

Les contenus récupérés ont été reproduits dans l'environnement local, puis la commande suivante a été exécutée :

```sh
node adapter.regression.test.cjs
```

Résultat constaté :

```text
PASS: UUID, quantities, duplicates, token forwarding, REST paths, no request on invalid input
```

Tests réalisés : validation UUID, bornes de quantité, détection des doublons (y compris casse UUID), contrat REST, passage du jeton de session, absence d'envoi de requête pour une entrée invalide, refus d'une réponse entreprise mal formée.

**Portée :** requêtes simulées (mock) uniquement ; pas de connexion Supabase, pas de navigateur, pas de création de commande, pas de mutation de base. Les fichiers ont été récupérés depuis GitHub par connecteur puis reproduits localement, faute de résolution DNS externe dans le conteneur. Ce résultat ne prouve pas encore la conformité du parcours réel de l'application.

V5, production et branche main inchangées.
