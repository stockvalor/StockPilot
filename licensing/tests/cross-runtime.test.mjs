// Cross-runtime signing compatibility: Node.js server-style signer -> WebCrypto browser-style verifier.
// Demo keys generated per run. No production signing key or commercial issuance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomUUID, webcrypto } from 'node:crypto';

const encoder = new TextEncoder();
const payload = {
  schema: 1, product: 'StockPilot AI', edition: 'lifetime',
  license_id: 'SP-DEMO-CROSSRUNTIME-1234', customer_id: randomUUID(),
  key_id: 'demo-only', issued_at: new Date().toISOString()
};
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const rawPublicKey = publicKey.export({ type: 'spki', format: 'der' });
const data = encoder.encode(JSON.stringify(payload));
const signature = sign('sha256', Buffer.from(data), { key: privateKey, dsaEncoding: 'ieee-p1363' });
const subtle = webcrypto.subtle;

async function browserVerify(message, sig) {
  const key = await subtle.importKey(
    'spki', rawPublicKey,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
  );
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, message);
}

test('server ECDSA P-256 signature verifies with WebCrypto', async () => {
  assert.equal(signature.length, 64);
  assert.equal(await browserVerify(data, signature), true);
});
test('WebCrypto rejects a changed signed payload', async () => {
  const altered = encoder.encode(JSON.stringify({ ...payload, edition: 'trial' }));
  assert.equal(await browserVerify(altered, signature), false);
});
test('WebCrypto rejects a changed signature', async () => {
  const changed = Uint8Array.from(signature); changed[0] ^= 1;
  assert.equal(await browserVerify(data, changed), false);
});

test('WebCrypto rejects signature from a different issuer', async () => {
  const other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const otherSignature = sign('sha256', Buffer.from(data), {
    key: other.privateKey, dsaEncoding: 'ieee-p1363'
  });
  assert.equal(await browserVerify(data, otherSignature), false);
});
test('WebCrypto rejects a signature with a wrong size', async () => {
  assert.equal(await browserVerify(data, signature.subarray(0, 32)), false);
});
test('WebCrypto rejects altered customer binding', async () => {
  const altered = encoder.encode(JSON.stringify({ ...payload, customer_id: randomUUID() }));
  assert.equal(await browserVerify(altered, signature), false);
});
