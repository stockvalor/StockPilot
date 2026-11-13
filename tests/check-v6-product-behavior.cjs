const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function createCloudProduct(');
const end=html.indexOf('\nasync function changeCloudQuantity(',start);
assert.ok(start>=0&&end>start,'Cloud product creation handler not found');
let response=[],posts=0,reloads=0,account={id:'account-a'};
const validId='11111111-1111-4111-8111-111111111111';
const fields={name:'Fictitious product',sku:'TEST',quantity:2,min_quantity:1,unit_price:1.5};
const sandbox={
 Error,Array,
 get user(){return account},
 access:true,
 token:async()=> 'test-token',
 request:async()=>{posts++;return response},
 loadCloudStock:async()=>{reloads++}
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start,end),sandbox);
const create=sandbox.createCloudProduct;
(async()=>{
 response=[];
 await assert.rejects(create('company-a',fields),/Création non confirmée/);
 response=[{id:validId,company_id:'company-b'}];
 await assert.rejects(create('company-a',fields),/Création non confirmée/);
 response=[{id:'not-a-uuid',company_id:'company-a'}];
 await assert.rejects(create('company-a',fields),/Création non confirmée/);
 assert.equal(reloads,0,'Unconfirmed creation must not claim a refreshed list');
 response=[{id:validId,company_id:'company-a'}];
 await create('company-a',fields);
 assert.equal(reloads,1,'Confirmed creation must reload inventory');
 const postsBefore=posts;
 account=null;
 await assert.rejects(create('company-a',fields),/Connexion nécessaire/);
 assert.equal(posts,postsBefore,'Logged-out user must not create product');
 console.log('PASS: missing response, wrong company, invalid UUID, confirmed creation, logged-out user');
})().catch(e=>{console.error(e);process.exitCode=1});
