# StockPilot — protocole de tests d'isolation multi-clients

**Statut : préparation uniquement. Ne pas exécuter sur la base de production.**

## Préparation
- Utiliser une instance Supabase de test distincte, avec données fictives et deux utilisateurs fictifs A et B.
- A possède deux entreprises (A1 et A2), B possède une entreprise B1.
- Chaque entreprise possède un produit fictif différent ; créer les sessions utilisateur séparément.
- Installer uniquement dans cet environnement la proposition `docs/STOCKPILOT_V3_MULTI_COMPANY_RPC_PROPOSAL.sql`, après revue et exécution dans une transaction.
- Vérifier que la fonction est inaccessible au rôle `anon` et accessible au rôle `authenticated`.

## Scénarios obligatoires

| Test | Session | Entreprise / produits | Attendu |
| --- | --- | --- | --- |
| T01 | Anonyme | A1 / produit A1 | Refus, 0 commande |
| T02 | A | A1 / produit A1 | 1 brouillon dans A1, aucun stock modifié |
| T03 | A | A2 / produit A2 | 1 brouillon dans A2, aucun stock modifié |
| T04 | A | B1 / produit B1 | Refus, 0 commande |
| T05 | A | A1 / produit B1 | Refus, 0 commande |
| T06 | B | A1 / produit A1 | Refus, 0 commande |
| T07 | A | A1 / deux fois produit A1 | Refus, 0 commande |
| T08 | A | A1 / quantité 0 | Refus, 0 commande |
| T09 | A | A1 / quantité 1000001 | Refus, 0 commande |
| T10 | A | A1 / UUID invalide | Refus, 0 commande |
| T11 | A | A1 / JSON non-tableau | Refus, 0 commande |
| T12 | A | A1 / quantité texte non numérique | Refus, 0 commande |
| T13 | A | A1 / liste vide | Refus, 0 commande |
| T14 | A | A1 / 101 lignes | Refus, 0 commande |
| T15 | A | A1 / produit A1, puis relecture B | B ne voit ni commande ni lignes A |
| T16 | A | A1 / produit A1, puis relecture A2 | Commande visible uniquement sous A1 |

## Vérifications après chaque refus
- Nombre de commandes et lignes inchangé ; stocks inchangés ; aucune réception enregistrée.
- Vérifier l'absence d'exposition d'identifiants ou de détails de l'autre entreprise dans les erreurs.
- Vérifier les autorisations et les journaux de sécurité, sans y consigner les jetons de session.

## Conditions de validation
- Tous les tests passent avec de véritables jetons de test A/B, pas seulement une simulation du navigateur.
- Les appels REST et les appels RPC sont testés séparément.
- Vérifier l'absence de régression des fonctions V2 existantes.
- Documenter résultats, captures/logs expurgés, date et version avant toute proposition de déploiement.
