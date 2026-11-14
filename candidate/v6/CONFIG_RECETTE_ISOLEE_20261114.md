# StockPilot AI V6 — configuration de recette isolée (14/11/2026)

État : **préparée, non déployée, non testée sur navigateur**.

## Cible unique
- Projet Supabase : `StockPilot-V6-RECETTE`
- Project ref : `qofvnaomefqkemtxhmoi`
- URL : `https://qofvnaomefqkemtxhmoi.supabase.co`
- Ne jamais utiliser la configuration de `preview/v6-8-8/index.html` pour cette recette : elle référence la production.
- Ne modifier ni V5, ni production, ni design ; ne pas publier ni fusionner sans validation.

## Injection de configuration dans la candidate
La candidate `candidate/v6/index.html` lit `window.STOCKPILOT_TEST_CONFIG` avant l'initialisation de l'application.

Dans **une copie locale de recette seulement**, injecter avant le script principal :

```html
<script>
window.STOCKPILOT_TEST_CONFIG = {
  url: 'https://qofvnaomefqkemtxhmoi.supabase.co',
  key: 'REMPLACER_PAR_LA_CLE_PUBLIABLE_DE_RECETTE'
};
</script>
```

La clé doit être la **clé publiable/anon de la recette uniquement**, jamais une `service_role` ni un secret. Ne pas la committer dans ce dépôt.

## Validation avant tout essai
1. Vérifier que l'URL de connexion utilisée pointe vers `qofvnaomefqkemtxhmoi` et non vers la production.
2. Vérifier que les redirections Auth autorisent uniquement l'URL de test prévue.
3. Se connecter avec Gmail et Hotmail dans deux sessions séparées.
4. Ces comptes ont actuellement **0 entreprise** dans la recette ; les 2 entreprises existantes appartiennent à d'autres comptes fictifs. Créer une entreprise fictive pour chaque compte seulement après confirmation de la cible et des droits, sans modifier les deux entreprises existantes.
5. Tester les lectures croisées, puis une sauvegarde et une restauration avec données fictives, en contrôlant les effets sur les commandes et mouvements.
6. Les 2 licences temporaires actuellement actives concernent les propriétaires des entreprises fictives existantes, **pas Gmail et Hotmail**. Ne pas supposer que ces deux comptes peuvent écrire ; prévoir une autorisation de test limitée avant leurs essais.

## Point d'arrêt
Ce document prépare la configuration et les garde-fous. Il ne constitue pas un déploiement, ne fournit pas de clé ni d'URL de preview prête à ouvrir, et ne valide pas les sessions réelles.
