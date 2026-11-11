# Résultat des tests du stockage multi-entreprises — 2026-11-11

Commande : `node --test backup/tests/tenant-storage.test.cjs`

Exécution locale sous Node.js v22.16.0, à partir du code de l'adaptateur et des scénarios enregistrés sur la branche.

Résultat : **3 tests réussis, 0 échec**.

1. Isolation des clés par identifiant utilisateur et entreprise, y compris suppression d'une clé sans toucher à l'autre entreprise : PASS.
2. Absence de migration automatique des anciennes clés non cloisonnées : PASS.
3. Rejet des identifiants, sections et valeurs invalides : PASS.

**Limites :** tests unitaires simulant localStorage, pas des essais Chrome ni deux connexions Supabase. Le module n'est pas intégré à index.html et la sauvegarde automatique reste bloquée tant que l'isolation de bout en bout n'est pas validée. Ne pas fusionner sans essais navigateur et backend.
