# Réexécution des tests après correction UUID — 15/11/2026

Les contenus de `adapter.js` et `adapter.regression.test.cjs` ont été inspectés sur la branche isolée `test/multi-entreprises-v6-20261115`. Une reproduction locale du code et de la suite de tests a été exécutée sous Node.js.

Commande : `node adapter.regression.test.cjs`

Sortie : `PASS: validation and REST contract`

Le cas ajouté `{id:{toString:()=>validUuid},qty:1}` est refusé ; les validations UUID, quantité, doublon, chemin REST, transmission du token et refus d'envoi en cas d'entrée invalide passent.

**Limite :** les fichiers ont été reproduits manuellement à partir du contenu inspecté ; il ne s'agit pas d'un lancement CI directement sur GitHub. Requêtes mockées, aucune session JWT réelle, aucun appel Supabase, aucune écriture. Avant intégration, exécuter la suite dans le checkout GitHub ou en CI, puis tests E2E avec sessions de recette.

Aucun changement de V5, production, main, ni déploiement.
