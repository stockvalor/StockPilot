const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const map=new Map();
const storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
const ctx={window:{localStorage:storage}};
for(const f of ['tenant-storage-draft.js','tenant-session-bridge-draft.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
const bridge=ctx.window.StockPilotTenantBridgeDraft;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const ca='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const k='stockpilot-futuriste-orders-v2';
test('fail closed before login and after logout',()=>{
  assert.throws(()=>bridge.read(k));
  bridge.activate(a,ca);bridge.write(k,'A');
  bridge.disconnect();assert.throws(()=>bridge.read(k));
});
test('account switch resets view and cannot read previous tenant',()=>{
  let reset=0;const unsubscribe=bridge.onReset(()=>reset++);
  bridge.activate(a,ca);bridge.write(k,'A');
  bridge.activate(b,cb);assert.equal(bridge.read(k),null);
  bridge.write(k,'B');bridge.activate(a,ca);assert.equal(bridge.read(k),'A');
  assert.ok(reset>=2);unsubscribe();bridge.disconnect();
});
test('invalid tenant activation fails closed',()=>{
  bridge.activate(a,ca);
  assert.throws(()=>bridge.activate('bad',cb));
  assert.throws(()=>bridge.read(k));
});
