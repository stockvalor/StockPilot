const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function createCloudDraft(');
const end=html.indexOf('\nasync function confirmCloudOrder(',start);
assert.ok(start>=0&&end>start,'Draft handler not found');
let companies=[],rpcId='11111111-1111-4111-8111-111111111111',posts=0,reloads=0,confirmed=true;
const company={id:'company-a',name:'Alpha'};
const product={id:'product-a',company_id:'company-a',name:'Test product'};
const sandbox={
 Number,Error,Array,encodeURIComponent,
 user:{id:'account-a'},access:true,
 token:async()=> 'test-token',
 request:async(path,method)=>{if(method==='POST'){posts++;return rpcId}return companies},
 confirm:()=>confirmed,
 loadCloudStock:async()=>{reloads++}
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start,end),sandbox);
const draft=sandbox.createCloudDraft;
(async()=>{
 companies=null;
 await assert.rejects(draft(company,product,1),/serveur actuel exige une seule entreprise/);
 companies=[{id:'company-a'},{id:'company-b'}];
 await assert.rejects(draft(company,product,1),/serveur actuel exige une seule entreprise/);
 companies=[{id:'company-b'}];
 await assert.rejects(draft(company,product,1),/serveur actuel exige une seule entreprise/);
 assert.equal(posts,0,'Malformed or ambiguous company ownership must block RPC');
 companies=[{id:'company-a'}];
 await assert.rejects(draft(company,{...product,company_id:'company-b'},1),/incohérents/);
 await assert.rejects(draft(company,product,0),/Quantité de commande invalide/);
 confirmed=false;
 await draft(company,product,1);
 assert.equal(posts,0,'User cancellation must block RPC');
 confirmed=true;
 rpcId='not-an-uuid';
 await assert.rejects(draft(company,product,1),/Réponse serveur inattendue/);
 assert.equal(reloads,0,'Unconfirmed draft must not be treated as success');
 rpcId='11111111-1111-4111-8111-111111111111';
 await draft(company,product,1);
 assert.equal(posts,2,'Only valid single-company attempts should reach RPC');
 assert.equal(reloads,1,'Confirmed draft must reload cloud stock');
 console.log('PASS: multi-company blocked, malformed lookup blocked, invalid product/quantity, cancellation, UUID and success');
})().catch(e=>{console.error(e);process.exitCode=1});
