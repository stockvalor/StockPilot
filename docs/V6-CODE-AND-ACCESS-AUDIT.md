# StockPilot V6 — Audit complémentaire du code et des autorisations

Date: 2026-11-11. Branche de travail: v6-securisation. Aucun déploiement effectué.

## Constats dans index.html
- La page se présente comme V6.8.8 et possède déjà une interface de connexion Supabase.
- Le navigateur utilise une clé publishable (acceptable côté client), pas de clé service_role trouvée.
- Les sauvegardes cloud sont manuelles, stockées en JSON et accompagnées d'une empreinte SHA-256.
- Les sauvegardes téléchargées sont vérifiées avant export.
- Le texte de l'interface indique que les sauvegardes ne sont pas chiffrées côté serveur et qu'il faut utiliser des données de test.
- Aucun mécanisme de restauration cloud automatique identifié; la récupération se fait par téléchargement JSON.
- Le code annonce explicitement que stocks et commandes restent locaux.

## Contrôles SQL supplémentaires
- Simulation du propriétaire de l'entreprise: une entreprise visible.
- Simulation d'une autre identité: aucune entreprise visible.
- Tentative UPDATE sous autre identité dans une transaction avec ROLLBACK: aucune ligne retournée.
- Ces simulations ne remplacent pas deux vraies sessions Auth indépendantes.

## Points bloquants avant clients
1. Vérifier connexion et sauvegarde de bout en bout dans le navigateur.
2. Tester les autorisations sur deux comptes de test réels.
3. Vérifier le contenu exhaustif de la sauvegarde (inventaire, commandes, paramètres) et restaurer sans écrasement inattendu.
4. Décider de la politique de chiffrement et de conservation des données.
5. Corriger l'avertissement Supabase de protection des mots de passe compromis.
6. Réviser les avertissements de version contradictoires dans l'interface.

Aucune donnée client ou de production n'a été modifiée.
