// Run: node --test backup/tests/tenant-backup-payload.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','tenant-backup-payload-draft.js'),'utf8');
const context={window:{}};
vm.runInNewContext(source,context);
const {createPayload,validatePayloadCompany}=context.window.StockPilotTenantBackupDraft;
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const key='stockpilot-futuriste-orders-v2';
test('backup reads only selected tenant store',()=>{
  const a={read:k=>k===key?'{"items":[],"history":[]}':null};
  const p=createPayload(a,(k,v)=>{assert.equal(k,key);JSON.parse(v);},A);
  assert.equal(p.companyId,A);
  assert.equal(p.data[key],'{"items":[],"history":[]}');
  assert.equal(validatePayloadCompany(p,A),true);
  assert.throws(()=>validatePayloadCompany(p,B));
});
test('rejects missing tenant data',()=>{
  assert.throws(()=>createPayload({read:()=>null},()=>{},A));
});
test('rejects invalid backup data and identity',()=>{
  assert.throws(()=>createPayload({read:()=>'{broken'},(k,v)=>JSON.parse(v),A));
  assert.throws(()=>createPayload({read:()=>null},()=>{},'bad'));
});
