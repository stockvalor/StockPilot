# StockPilot AI V6 · candidate du 13 novembre 2026

Base Git `6177895`, préversion `preview/v6-cloud-order-history-test-20261113/index.html`. La candidate réside exclusivement dans ce dossier.

## Lancer les vérifications

Depuis ce dossier, avec Node.js 24 et Chromium installé.

```sh
npm ci
npm run test:local
curl --fail --location https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js -o /tmp/stockpilot-scanner.js
CHROMIUM_PATH=/usr/bin/chromium STOCKPILOT_SCANNER_JS=/tmp/stockpilot-scanner.js npm run test:browser
python -m http.server 8080
```

Ouvrir [la candidate locale](http://localhost:8080/) dans un profil navigateur de test. Le mode démonstration fonctionne sans Supabase. Pour le mode cloud, injecter `window.STOCKPILOT_TEST_CONFIG = { url: 'https://<projet-de-test>.supabase.co', key: '<clé publiable du projet de test>' }` avant le chargement via un script d’initialisation du navigateur, ou l’insérer dans une copie locale de `index.html`. Utiliser un projet isolé, avec le schéma applicatif et les trois RPC v2 existantes, puis y appliquer `orders-candidate.sql`. Prévoir deux comptes fictifs, une entreprise par compte. Ajouter l’URL locale à la liste des redirections Auth du projet de test pour vérifier la récupération du mot de passe.

`tests/schema-snapshot.sql` est un schéma réduit pour PGlite. Il reproduit les tables, contraintes, droits de table et politiques publiques relevées le 13 novembre ainsi que les trois fonctions v2 de commande. Il simule l’identité authentifiée et ne reproduit pas Auth, PostgREST, les déclencheurs, les autres fonctions ni la configuration Supabase. Il ne doit pas être appliqué sur Supabase.

## Matrice de recette

| Nº | Parcours | Statut | Vérification ou reprise |
|---:|---|---|---|
| 1 | Inscription et connexion | RÉUSSI DOM avec API simulée / BLOQUÉ Supabase | Inscrire deux utilisateurs fictifs dans Supabase isolé, confirmer les e-mails et se connecter. Vérifier aussi la récupération du mot de passe. |
| 2 | Création d’un produit | RÉUSSI Chromium avec API simulée / BLOQUÉ Supabase | Créer une référence unique avec quantité 2 et seuil 3, confirmer et vérifier la ligne via le compte propriétaire. |
| 3 | Modification d’un produit | RÉUSSI Chromium avec API simulée / BLOQUÉ Supabase | Passer la quantité de 2 à 3, puis le seuil de 3 à 4. Vérifier la référence et les alertes. Tester aussi annulation et suppression d’une référence sans commande associée. |
| 4 | Actualisation et persistance | RÉUSSI Chromium avec API simulée / BLOQUÉ Supabase | Actualiser puis ouvrir une seconde session et vérifier les données cloud du compte. |
| 5 | Déconnexion et reconnexion | RÉUSSI Chromium avec API simulée / BLOQUÉ Supabase | Se déconnecter, vérifier l’effacement des données affichées, reconnecter le même compte et vérifier le rechargement. |
| 6 | Isolation entre deux comptes | RÉUSSI local / BLOQUÉ Supabase | PostgreSQL local avec deux identités fictives. Lire ses propres produits, refuser les lectures et modifications croisées et vérifier que les stocks des deux entreprises restent corrects. |
| 7 | Création et validation d’une commande | RÉUSSI local / BLOQUÉ Supabase | PostgreSQL local. Réessayer avec le même identifiant de demande et vérifier que le même ordre est renvoyé. La réutilisation de l’identifiant avec des lignes différentes est refusée. |
| 8 | Mise à jour du stock après commande | RÉUSSI local / BLOQUÉ Supabase | Réception de réapprovisionnement en PostgreSQL local. 2 + 3 = 5. Le second appel indique `already_received` et laisse le stock à 5. Sortie de stock dans le parcours V6 à confirmer. |
| 9 | Seuils d’alerte | RÉUSSI local | DOM exécuté. Une référence à 2 avec un seuil de 3 déclenche une alerte. Elle disparaît à 3. Le changement de compte efface les chiffres et alertes précédents. |
| 10 | Scan EAN et QR | RÉUSSI Chromium / NON TESTÉ caméra | Images EAN-13 `5901234123457` et QR `SP-TEST-QR` décodées avec html5-qrcode 2.3.8. Refaire avec l’appareil photo d’un téléphone. |
| 11 | Reconnaissance de produit par photo | ÉCHEC | Le code décode les codes-barres et interroge des catalogues par identifiant. Reconnaissance visuelle d’un produit sans code à implémenter puis tester. |
| 12 | Autorisations et sécurité | RÉUSSI local / BLOQUÉ Supabase | PostgreSQL local. Refus anonyme et accès croisés sur produits, commandes, lignes et réceptions. Rejouer sur la Data API isolée et couvrir aussi les RPC historiques et la restauration. En local, la lecture croisée des sauvegardes et les demandes de restauration à partir d’une sauvegarde étrangère sont refusées. |
| 13 | Mobile | RÉUSSI Chromium émulé / NON TESTÉ appareil réel | Menu ouvert, navigation vers Mes stocks et fermeture automatique à 390 × 844. Vérifier caméra et menu sur téléphone physique. |
| 14 | Ordinateur | RÉUSSI Chromium | Parcours inventaire et commandes à 1366 × 768 avec API simulée. Téléchargement des copies cloud et restauration à tester. |

## Résultats exécutés

`npm test` avec Chromium Headless Shell et le lecteur html5-qrcode 2.3.8 : 4 tests réussis, 0 échec. Les 16 tests existants de signature des licences ont également réussi. Régression Auth vérifiée avec une inscription en attente du compte A, une connexion du compte B puis une déconnexion distante retardée. Le compte B ne reçoit pas l’entreprise saisie par A. La session locale disparaît immédiatement et une reconnexion reste active après le retour tardif de la requête de déconnexion. Le fichier racine servi par GitHub Pages correspond octet pour octet à celui de `main` à `6177895`. La préversion publique de référence correspond également au dépôt.

## Blocages de sortie

- Critique. Confirmer l’isolation de deux comptes via Auth et la Data API d’un projet Supabase de test. Le projet accessible a neuf tables publiques sous RLS et aucune branche de test distincte. La consultation des métadonnées de production était en lecture seule.
- Élevé. Tester une sauvegarde d’inventaire cloud réelle, son empreinte et une restauration dans une base jetable. La nouvelle copie vise les produits. Une sauvegarde complète des commandes et mouvements reste à vérifier.
- Élevé. Vérifier les sorties de stock si elles font partie de la V6 commercialisée. La candidate valide le parcours de réapprovisionnement entrant. Le copilote utilise des règles locales. La reconnaissance visuelle sans code et l’activation commerciale de licence restent à terminer.
- Supabase signale cinq fonctions privilégiées accessibles aux comptes connectés et la protection contre les mots de passe compromis désactivée. Examiner les droits effectifs des RPC historiques et confirmer le niveau de service disponible avant tout changement de configuration.
