-- StockPilot V6: transactional RLS checks, to be run manually by an authorized tester.
-- No fixture is persisted. Never run on main deployment without reviewing.
-- The account IDs below are deliberately synthetic; use two real test accounts
-- for the final browser-level acceptance tests.

BEGIN;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;

-- Should show no companies owned by another identity.
SELECT count(*) AS other_companies_visible FROM public.companies;

-- Should return no rows; a no-op UPDATE still exercises UPDATE RLS.
UPDATE public.companies SET name = name
WHERE owner_user_id <> auth.uid()
RETURNING id;

ROLLBACK;

-- Separate transaction: expected ERROR 42501, which aborts its transaction.
-- BEGIN;
-- SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
-- SET LOCAL ROLE authenticated;
-- INSERT INTO public.companies(name,owner_user_id)
-- VALUES ('RLS_TEST_MUST_FAIL','00000000-0000-4000-8000-000000000002');
-- ROLLBACK;
