const fs=require('node:fs');
const assert=require('node:assert/strict');
const sql=fs.readFileSync('docs/STOCKPILOT_V3_MULTI_COMPANY_RPC_PROPOSAL.sql','utf8');
const checks={
 explicitCompany:/stockpilot_v3_create_order\s*\(\s*p_company_id\s+uuid\s*,\s*p_lines\s+jsonb/i,
 authenticatedUser:/auth\.uid\(\)/i,
 ownerCheck:/c\.id\s*=\s*p_company_id\s+AND\s+c\.owner_user_id\s*=\s*v_uid/i,
 productCompanyCheck:/p\.company_id\s*=\s*p_company_id/i,
 draftOnly:/VALUES\s*\(\s*p_company_id\s*,\s*'draft'\s*,\s*v_uid\s*,\s*'inbound'\s*\)/i,
 denyPublic:/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.stockpilot_v3_create_order\(uuid,jsonb\)\s+FROM\s+PUBLIC\s*,\s*anon/i,
 allowAuthenticated:/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.stockpilot_v3_create_order\(uuid,jsonb\)\s+TO\s+authenticated/i,
 noLegacyReplacement:!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.stockpilot_v2_create_order/i.test(sql)
};
for(const [name,pattern] of Object.entries(checks))assert.ok(typeof pattern==='boolean'?pattern:pattern.test(sql),'SQL proposal guard missing: '+name);
console.log('PASS: '+Object.keys(checks).length+' SQL proposal structure checks (not a database test)');
