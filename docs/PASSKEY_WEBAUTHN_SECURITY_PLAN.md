# StockPilot AI — Authentification biométrique par passkeys (WebAuthn)

Statut : **spécification approuvée, non implémentée, non déployée**.

## Objectif
Permettre aux clients de se connecter avec une passkey, déverrouillée par l'empreinte digitale, la reconnaissance faciale ou le code/PIN de l'appareil selon son système. L'application ne reçoit ni ne stocke d'empreinte biométrique.

## Exigences de sécurité
1. Utiliser WebAuthn/FIDO2 avec vérification cryptographique **côté serveur** : challenge aléatoire à usage unique et expiration courte, contrôle de l'origine HTTPS, du RP ID, de l'authenticator data, du challenge, de la signature et de l'authentification utilisateur (user verification).
2. Associer chaque identifiant de passkey au compte Supabase Auth stable (user ID), et non à une adresse e-mail modifiable ou à une entreprise sélectionnée par le navigateur.
3. Ne jamais considérer `navigator.credentials.get()` comme une connexion suffisante : **aucune session Supabase ne doit être créée avant la validation serveur**. Aucun contournement de RLS.
4. Enrôlement uniquement depuis une session authentifiée et récemment revérifiée. Prévoir suppression/révocation des passkeys avec réauthentification.
5. Conserver la connexion e-mail/mot de passe et récupération de compte, avec contrôles anti-abus; ne jamais stocker de clé privée ou de données biométriques.
6. Protéger les défis contre le rejeu; ne pas mettre les jetons d'accès, challenges ni secrets dans les logs. Rate limiting, journalisation d'événements non sensibles.
7. Tester Android, iOS et navigateurs desktop; prévoir les cas sans biométrie, appareil perdu et synchronisation des passkeys.
8. Vérifier l'isolement des entreprises et les politiques RLS avec deux comptes distincts après chaque connexion passkey.

## Implémentation envisagée
- Étudier d'abord la prise en charge officielle des passkeys par la version de Supabase Auth utilisée; si absente, prévoir un service WebAuthn serveur spécialisé et audité, relié à l'identité Supabase par un mécanisme de session documenté, sans fabriquer de JWT dans le frontend.
- API d'enrôlement : début challenge -> `navigator.credentials.create` -> vérification serveur -> enregistrement de la clé publique et credential ID.
- API de connexion : début challenge -> `navigator.credentials.get` -> vérification serveur -> création de session Auth autorisée.
- UI : « Se connecter avec une passkey » uniquement quand le backend est opérationnel; expliquer que le système peut demander empreinte, visage ou PIN.

## Conditions avant activation
- Tests de rejeu, mauvaise origine, mauvais compte, identifiant inconnu, authenticator sans user verification, session expirée et perte d'appareil.
- Tests d'accès inter-entreprises Gmail/Hotmail.
- Validation de sécurité avant déploiement. Préserver V5 et `main` inchangés.

**Ne pas commercialiser la connexion biométrique tant que l'authentification de bout en bout n'est pas opérationnelle et testée.**

## Documentation Supabase vérifiée le 13 novembre 2026
La documentation officielle [Passkey authentication](https://supabase.com/docs/guides/auth/passkeys) décrit désormais un support **expérimental** intégré à Supabase Auth. Elle indique `@supabase/supabase-js >= 2.105.0`, l'option client `auth.experimental.passkey: true`, puis `auth.registerPasskey()` et `auth.signInWithPasskey()`. Le serveur Supabase Auth réalise la vérification WebAuthn et émet la session.

**Conséquence :** privilégier cette intégration officielle plutôt qu'un service WebAuthn maison. L'activation nécessite la configuration explicite dans Authentication → Passkeys, RP ID et origines HTTPS correspondant au domaine définitif de StockPilot. Le changement de RP ID invalide les passkeys déjà créées. Ne pas activer avant choix du domaine et tests de compatibilité. Prévoir une intégration contrôlée avec la session existante, qui utilise actuellement un appel Auth REST manuel; ne pas introduire deux sources de session concurrentes.
