# StockPilot V6 — exécution native des tests sur ordinateur

**Objectif : vérifier les 7 tests avec Node.js réel, sans frais Supabase et sans toucher à V5.**

## Prérequis
- Un ordinateur personnel Windows 10/11, macOS ou Linux ; éviter l'ordinateur de l'employeur.
- Git et Node.js 22 LTS installés.
- Accès autorisé au dépôt privé `stockvalor/StockPilot`.

## Commandes (PowerShell / terminal)

```bash
git clone https://github.com/stockvalor/StockPilot.git
cd StockPilot
git switch fix/account-isolated-inventory
node --version
node tests/check-v6-static.cjs
node tests/check-v6-behavior.cjs
node tests/check-v6-receipt-behavior.cjs
node tests/check-v6-product-behavior.cjs
node tests/check-v6-draft-behavior.cjs
node tests/check-v6-confirm-behavior.cjs
node tests/check-v3-sql-proposal.cjs
```

Chaque commande doit afficher `PASS` et terminer avec le code de sortie 0. Si un test échoue, **ne pas déployer** ; conserver le nom du test et l'erreur complète, en supprimant toute donnée sensible.

## Vérification de la branche

```bash
git branch --show-current
git status --short
git rev-parse --short HEAD
```

La branche affichée doit être `fix/account-isolated-inventory`. Ne pas fusionner vers `main` et ne pas modifier le site public pendant les tests.

## Limites
- Les tests sont unitaires et statiques : ils n'attestent pas l'isolation réelle des comptes Supabase ni le fonctionnement de la fonction SQL V3 sur PostgreSQL.
- Ne pas copier les clés API, jetons, identifiants réels ou données clients dans des journaux partagés.
- Les tests multi-clients réels nécessitent une base Supabase isolée et une validation séparée avant toute dépense.
