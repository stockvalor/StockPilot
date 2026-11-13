const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function changeCloudQuantity(');
const end=html.indexOf('\nfunction cloudForm(',start);
assert.ok(start>=0&&end>start,'Cloud stock quantity handler not found');
const source=html.slice(start,end);
let calls=[];
let currentUser={id:'account-a'};
let access='token-a';
let refreshCount=0;
let response=[];
const sandbox={
 Number,Error,encodeURIComponent,
 get user(){return currentUser},
 get access(){return access},
 token:async()=>access,
 request:async(...args)=>{calls.push(args);return response},
 loadCloudStock:async()=>{refreshCount++}
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const save=sandbox.changeCloudQuantity;
(async()=>{
 await save('company-a','product-a',10,10);
 assert.equal(calls.length,0,'Unchanged quantity must not write');
 response=[];
 await assert.rejects(save('company-a','product-a',8,10),/Modification non confirmée/);
 assert.equal(refreshCount,1,'Conflict must reload stock');
 assert.ok(calls[0][0].includes('quantity=eq.10'),'Missing optimistic lock');
 // Reject an unconfirmed server response even if it contains one row.
 response=[{id:'product-a',company_id:'other-company',quantity:8}];
 await assert.rejects(save('company-a','product-a',8,10),/Modification non confirmée/);
 assert.equal(refreshCount,2,'Mismatched company must reload stock');
 assert.equal(calls.length,2,'Mismatched response must not trigger a second write');
 response=[{id:'product-a',company_id:'company-a',quantity:8}];
 await save('company-a','product-a',8,10);
 assert.equal(refreshCount,3,'Success must reload stock');
 console.log('PASS: stock no-op, optimistic-lock conflict and confirmed update');
})().catch(e=>{console.error(e);process.exitCode=1});
