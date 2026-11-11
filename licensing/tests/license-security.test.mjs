// StockPilot AI — standalone licensing security regression tests (Node.js >=20).
// Uses ephemeral keys. No production key, payment or commercial activation.
import { generateKeyPairSync, sign, verify, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

const b64 = x => Buffer.from(x).toString('base64url');
const unb64 = x => Buffer.from(x, 'base64url');
const { privateKey, publicKey } = generateKeyPairSync('ec', {namedCurve:'prime256v1'});
const fixture = {
  schema:1, product:'StockPilot AI', edition:'lifetime',
  license_id:'SP-DEMO-12345678', customer_id:randomUUID(),
  issued_at:'2026-11-11T00:00:00.000Z', key_id:'test-2026'
};
function issue(payload) {
  const data=Buffer.from(JSON.stringify(payload));
  const signature=sign('sha256',data,{key:privateKey,dsaEncoding:'ieee-p1363'});
  return b64(data)+'.'+b64(signature);
}
function check(token, expectedCustomer=fixture.customer_id) {
  if(typeof token!=='string'||token.length>8192) return false;
  const parts=token.split('.');
  if(parts.length!==2) return false;
  let data,sig,p;
  try {data=unb64(parts[0]);sig=unb64(parts[1]);p=JSON.parse(data.toString('utf8'));}
  catch{return false;}
  if(data.length>4096||sig.length!==64) return false;
  if(!verify('sha256',data,{key:publicKey,dsaEncoding:'ieee-p1363'},sig))return false;
  return p.schema===1&&p.product==='StockPilot AI'&&p.edition==='lifetime'
    &&p.customer_id===expectedCustomer&&p.key_id==='test-2026'
    &&/^SP-[A-Z0-9-]{8,64}$/.test(p.license_id);
}
const valid=issue(fixture);
test('valid signature and matching customer',()=>assert.equal(check(valid),true));
test('tampered payload rejected',()=>{
 const [p,s]=valid.split('.');const altered={...fixture,license_id:'SP-DEMO-87654321'};
 assert.equal(check(b64(JSON.stringify(altered))+'.'+s),false);
});
test('tampered signature rejected',()=>{
 const [p,s]=valid.split('.');const bytes=unb64(s);bytes[0]^=1;
 assert.equal(check(p+'.'+b64(bytes)),false);
});
test('wrong customer rejected',()=>assert.equal(check(valid,randomUUID()),false));
test('wrong product rejected',()=>assert.equal(check(issue({...fixture,product:'Other'})),false));
test('wrong edition rejected',()=>assert.equal(check(issue({...fixture,edition:'subscription'})),false));
test('unknown key id rejected',()=>assert.equal(check(issue({...fixture,key_id:'unknown'})),false));
test('malformed token rejected',()=>assert.equal(check('SP-TEST-1234'),false));
test('oversized token rejected',()=>assert.equal(check('A'.repeat(8193)),false));
test('truncated signature rejected',()=>{const [p,s]=valid.split('.');assert.equal(check(p+'.'+b64(unb64(s).subarray(0,30))),false)});
