# Avis de sécurité Supabase — V6 recette — 2026-11-15

Audit officiel `get_advisors(type=security)` et inspection SQL des droits, sans changement de configuration.

## Résultats
- **WARN : 4 fonctions SECURITY DEFINER** accessibles au rôle `authenticated` : `stockpilot_v2_create_order`, `stockpilot_v2_create_order_for_company`, `stockpilot_v2_confirm_order`, `stockpilot_v2_receive_order`. Contrôle SQL : pour chacune, `anon_execute=false`, `authenticated_execute=true`, `security_definer=true`. Les appels authentifiés sont nécessaires au parcours métier actuel ; la présence du WARN ne démontre pas à elle seule une vulnérabilité. Il faut poursuivre les tests d'autorisation et l'audit du code.
- **INFO : 2 tables internes RLS sans politique** : `stockpilot_internal.commercial_licenses`, `stockpilot_internal.v6_order_requests`. Cela peut correspondre à une stratégie de refus par défaut ; vérifier l'exposition et les opérations serveur avant toute modification.
- **WARN : protection des mots de passe compromis désactivée** dans Supabase Auth. Recommandation : évaluer son activation, sans modifier les paramètres sans validation.

## Documentation Supabase
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Conclusion
Ne pas déclarer la sécurité entièrement validée. Ne pas supprimer les droits d'exécution des RPC utilisées par l'application sans plan de remplacement et test de non-régression. Ne pas changer Auth, V5, production ni `main` sans autorisation.
