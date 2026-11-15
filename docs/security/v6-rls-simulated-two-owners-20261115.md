# Test RLS par rôle simulé — V6 recette — 15/11/2026

**Méthode** : deux transactions SQL `BEGIN READ ONLY` / `ROLLBACK`, `SET LOCAL ROLE authenticated` et `set_config('request.jwt.claim.sub', owner_uuid, true)`. Aucun compte n'a été connecté par navigateur, aucun jeton JWT réel n'a été utilisé. Aucun INSERT/UPDATE/DELETE.

**Profil simulé A** : `current_user=authenticated`, une entreprise visible, entreprise B invisible (0), produits de B invisibles (0).

**Profil simulé B** : `current_user=authenticated`, une entreprise visible, entreprise A invisible (0), commandes de A invisibles (0), lignes de commandes de A invisibles (0).

**Conclusion limitée** : la séparation RLS en lecture se comporte comme attendu pour ces deux propriétaires dans cette simulation SQL. Cela **ne valide pas** les vrais JWT, l'API REST, les fonctions SECURITY DEFINER, les écritures, les sauvegardes, ni tous les autres propriétaires.

**Suite** : tests d'API authentifiés de bout en bout sur recette, vérification des refus d'écriture croisée et RPC, puis approbation explicite avant tout déploiement.
