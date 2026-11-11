// Run with: node --test backup/tests/tenant-storage.test.cjs
// No Supabase credentials and no production data required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'tenant-storage-draft.js'), 'utf8');
const values = new Map();
const storage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const context = { window: { localStorage: storage } };
vm.runInNewContext(source, context, { filename: 'tenant-storage-draft.js' });
const adapter = context.window.StockPilotTenantStorageDraft;
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
const companyA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const companyB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const key = 'stockpilot-futuriste-orders-v2';

test('isolation entre utilisateurs et entreprises', () => {
  const a = adapter.forTenant(userA, companyA, storage);
  const b = adapter.forTenant(userB, companyB, storage);
  const aOtherCompany = adapter.forTenant(userA, companyB, storage);
  a.write(key, '{"items":[{"id":"A"}]}');
  b.write(key, '{"items":[{"id":"B"}]}');
  assert.equal(a.read(key), '{"items":[{"id":"A"}]}');
  assert.equal(b.read(key), '{"items":[{"id":"B"}]}');
  assert.equal(aOtherCompany.read(key), null);
  assert.deepEqual(Object.keys(a.export()), [key]);
  assert.deepEqual(Object.keys(b.export()), [key]);
  a.remove(key);
  assert.equal(a.read(key), null);
  assert.equal(b.read(key), '{"items":[{"id":"B"}]}');
});

test('pas de migration automatique des données historiques', () => {
  storage.setItem(key, 'LEGACY');
  const a = adapter.forTenant(userA, companyA, storage);
  assert.equal(a.read(key), null);
  assert.equal(storage.getItem(key), 'LEGACY');
});

test('identifiants et sections invalides refusés', () => {
  assert.throws(() => adapter.forTenant('not-a-uuid', companyA, storage));
  const a = adapter.forTenant(userA, companyA, storage);
  assert.throws(() => a.write('unknown', '{}'));
  assert.throws(() => a.write(key, 12));
  assert.throws(() => a.write(key, 'x'.repeat(1000001)));
});
