# StockPilot AI — V6 security and cloud validation

Status: audit checklist; NOT a production release.

## Verified 2026-11-11
- Supabase project exists in eu-west-3.
- public.companies, public.products, public.stockpilot_backups have RLS enabled.
- Owner-scoped SELECT/INSERT/UPDATE/DELETE policies exist for companies and products.
- Backup policies restrict SELECT and INSERT to company owner.
- Supabase security advisor warns leaked-password protection is disabled.
- GitHub main index.html already identifies itself as V6.8.8; avoid overwriting it.

## Tests required before claiming production readiness
1. Create two separate test accounts and companies; ensure neither can read or mutate the other's products or backups (SELECT, INSERT, UPDATE, DELETE).
2. Verify anonymous requests cannot access company records.
3. Verify authenticated signup, email confirmation, login, logout, session expiration and password recovery.
4. Verify full local inventory and order history backup, checksum verification, restoration, conflict handling and no duplicate application.
5. Verify backups are not silently considered successful if cloud requests fail.
6. Test on Android Chrome and desktop; preserve existing V5 behavior.
7. Re-run security advisor; configure leaked-password protection if supported by plan.
8. Check client uses only publishable key, never secret/service_role key.

## Release rule
Do not deploy or merge to main until tests pass. No real client data in tests.
