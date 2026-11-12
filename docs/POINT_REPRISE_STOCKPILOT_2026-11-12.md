# StockPilot AI — Point de reprise sécurisé — 2026-11-12

## Règles impératives
- Préserver **V5 intacte** : version de référence / secours.
- Préserver V6 actuelle, son interface approuvée et les données clients.
- Ne pas déployer, modifier DNS, acheter le domaine ni migrer les connexions sans validation explicite.
- Ne jamais exposer les clés secrètes, mots de passe ou jetons.
- Ne pas confondre ce document de reprise avec une sauvegarde complète de la base.

## Avancement
- V6 : **90 % d'avancement fonctionnel estimé**, chiffre de suivi, pas audit indépendant.
- Comptes Gmail/Hotmail : tests de séparation des produits et commandes réussis.
- Produits, commandes, réception, mise à jour des stocks, CSV et impression testés.
- Supabase : politiques RLS contrôlées, plusieurs vérifications d'isolement réalisées.
- Sauvegardes : deux snapshots produits supplémentaires créés, quatre sauvegardes dont intégrité SHA-256 contrôlée ; **restauration complète non testée**, commandes/comptes non couverts par snapshots produits.
- Sécurité encore à finir : vérification des fonctions SECURITY DEFINER, protection des mots de passe compromis, tests de restauration et recette.

## Passkeys facultatives
- Décision validée : empreinte digitale / reconnaissance faciale / PIN via WebAuthn, optionnel ; e-mail/mot de passe conservés.
- Code expérimental ajouté **uniquement** dans `experiments/passkeys/optional-passkeys.js` sur la branche `feature/v6-optional-passkeys-experimental`.
- Commit initial : `cacfdc7b5093ccb0981fe19a073cab4808c18a09`.
- Ce module **n'est pas connecté à la V6**, pas déployé et non testé sur appareils.
- L'application actuelle emploie une authentification Supabase REST personnalisée. Vérifier la migration vers supabase-js et la configuration expérimentale Passkeys avant toute intégration.

## Domaine
- Choix validé : acheter `stockpilot.fr` chez OVH, disponibilité et tarif définitif à confirmer avant paiement.
- Architecture souhaitée : `stockpilot.fr` site commercial, `app.stockpilot.fr` application clients.
- RP ID WebAuthn et origines HTTPS à fixer sur domaine définitif avant inscriptions passkeys.
- Aucun achat ou changement DNS effectué.

## Point exact de reprise
1. Vérifier disponibilité et prix du domaine chez OVH, avec l'utilisateur avant achat.
2. Préparer le raccordement passkeys sur branche de test, sans changer la V5 ni la V6 publique.
3. Vérifier configuration Supabase, tests multi-appareils, puis demander validation avant déploiement.
4. Finaliser contrôles sécurité, sauvegarde/restauration et recette finale.

## Références
- Projet Supabase : `ieogcyuqgqmaebjkvlns`.
- Dépôt : `stockvalor/StockPilot`.
- V6 test utilisée : `preview/v6-cloud-history-copyfix-20261112/index.html`.
- Branche passkeys : `feature/v6-optional-passkeys-experimental`.

**Attention :** Ce fichier sauvegarde les décisions et le point de reprise. Il ne sauvegarde ni tout le code de toutes les branches ni les données Supabase ; une vraie stratégie de sauvegarde technique reste nécessaire.
