# StockPilot — données fictives et exécution des tests A/B

**Préparation uniquement — aucun appel réseau, aucune donnée de production.**

## Comptes de test
Créer dans **la branche Supabase de test uniquement** deux comptes fictifs via Auth, avec adresses de test contrôlées et mots de passe uniques. Ne jamais copier les utilisateurs, e-mails, secrets ou jetons de production.

| Alias | Propriétaire | Entreprise | Produit | Stock initial |
|---|---|---|---|---:|
| A1 | Compte A | Entreprise Alpha 1 | Produit Alpha 1 | 10 |
| A2 | Compte A | Entreprise Alpha 2 | Produit Alpha 2 | 20 |
| B1 | Compte B | Entreprise Beta 1 | Produit Beta 1 | 30 |

Les UUID des utilisateurs, entreprises et produits sont **générés par la base de test** et reportés dans un fichier local non versionné. Ne jamais fixer des identifiants de production dans le dépôt.

## Préconditions à vérifier
1. La branche Supabase de test est distincte de la production et n'a pas reçu de données réelles.
2. Les tables `companies`, `products`, `orders` et `order_items` ainsi que leurs politiques RLS sont présentes.
3. Les utilisateurs A/B sont confirmés et peuvent ouvrir deux sessions séparées.
4. Les entreprises A1 et A2 appartiennent à A, B1 appartient à B ; chaque produit est rattaché à sa propre entreprise.
5. La fonction V3 est installée **sur la branche de test uniquement**, et ses permissions sont vérifiées.
6. Un instantané des comptes de commandes, lignes, réceptions et quantités est pris avant chaque scénario.

## Appels de test (modèles, pas de jetons réels)

RPC `POST /rest/v1/rpc/stockpilot_v3_create_order` :

```json
{
  "p_company_id": "<UUID_ENTREPRISE_A1_DE_TEST>",
  "p_lines": [{"id": "<UUID_PRODUIT_A1_DE_TEST>", "qty": 2}]
}
```

- T02 et T03 : contrôler `status=draft`, `stock_flow=inbound`, `created_by=A`, bonne `company_id` et absence de variation de stock.
- T04, T05, T06 : contrôler le refus, puis l'absence de commande et de ligne supplémentaire.
- T07 à T14 : modifier uniquement `p_lines` selon le protocole, contrôler le refus et l'absence d'écriture.
- T15 et T16 : relire via REST avec la session B, puis sous l'entreprise A2 ; vérifier que les données de A1 restent invisibles dans les contextes non autorisés. **Attention : A est propriétaire de A1 et A2 et peut légalement lire les deux via les politiques RLS actuelles ; l'isolation A1/A2 doit être vérifiée au niveau du filtrage applicatif, pas prétendue garantie par RLS seule.**

## Résultats à consigner

| Test | Attendu | Observé | Statut | Preuve expurgée |
|---|---|---|---|---|
| T01–T16 | Voir protocole | Non exécuté | À faire | — |

Ne jamais publier les jetons JWT, mots de passe, clés secrètes ni les données clients dans les journaux, captures ou commits. Supprimer la branche de test après revue et export du compte rendu.
