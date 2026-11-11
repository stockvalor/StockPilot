# StockPilot V6 — Security test results (2026-11-11)

Tests executed against Supabase project ieogcyuqgqmaebjkvlns using SQL transaction role impersonation, without changing application data.

| Check | Result | Limitation |
|---|---|---|
| anon SELECT companies | 0 rows | A zero-row result alone does not prove non-disclosure if there are no accessible fixtures |
| anon SELECT products | 0 rows | Products table currently empty |
| anon SELECT stockpilot_backups | permission denied (42501) | Stronger restriction; no anon SELECT grant |
| authenticated SELECT companies without user JWT | 0 rows | Does not simulate a signed-in customer |
| RLS policy inspection | owner-based policies present | Must test real signed-in users A/B |
| leaked-password protection | security advisor warning | Requires configuration |

## Next required tests
- Create two dedicated test users and two company fixtures through normal auth; test cross-tenant read/write, then delete fixtures.
- Verify signup/login/reset and cloud backup/restore through browser UI.
- No production release or main branch changes until those tests pass.
