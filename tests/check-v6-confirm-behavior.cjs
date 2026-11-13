const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function confirmCloudOrder(');
const end=html.indexOf('\nasync function receiveCloudOrder(',start);
assert.ok(start>=0&&end>start,'Order confirmation handler not found');
let account={id:'account-a'},approved=true,reply=true,posts=0,reloads=0,switchOnToken=false,switchOnPost=false;
const company={id:'company-a'};
const order={id:'11111111-1111-4111-8111-111111111111',company_id:'company-a',status:'draft',stock_flow:'inbound'};
const sandbox={
 Error,
 get user(){return account},access:true,
 confirm:()=>approved,
 token:async()=>{if(switchOnToken)account={id:'account-b'};return 'test-token'},
 request:async()=>{posts++;if(switchOnPost)account={id:'account-b'};return reply},
 loadCloudStock:async()=>{reloads++}
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start,end),sandbox);
const confirmOrder=sandbox.confirmCloudOrder;
(async()=>{
 await assert.rejects(confirmOrder(company,{...order,company_id:'company-b'}),/ne peut pas être confirmée/);
 await assert.rejects(confirmOrder(company,{...order,status:'confirmed'}),/ne peut pas être confirmée/);
 await assert.rejects(confirmOrder(company,{...order,id:'not-a-uuid'}),/ne peut pas être confirmée/);
 await assert.rejects(confirmOrder(company,null),/ne peut pas être confirmée/);
 assert.equal(posts,0,'Invalid company/status must block RPC');
 approved=false;
 await confirmOrder(company,order);
 assert.equal(posts,0,'Cancelled confirmation must block RPC');
 approved=true;
 switchOnToken=true;
 await assert.rejects(confirmOrder(company,order),/Compte modifié avant confirmation/);
 assert.equal(posts,0,'Account switch before RPC must block write');
 switchOnToken=false;account={id:'account-a'};
 reply=false;
 await assert.rejects(confirmOrder(company,order),/Confirmation non attestée/);
 assert.equal(reloads,0,'Unattested confirmation must not reload as success');
 reply=true;switchOnPost=true;
 await assert.rejects(confirmOrder(company,order),/Session changée/);
 assert.equal(reloads,0,'Account switch after RPC must not refresh old account');
 switchOnPost=false;account={id:'account-a'};
 await confirmOrder(company,order);
 assert.equal(posts,3,'Only authorized confirmed attempts should post');
 assert.equal(reloads,1,'Successful confirmation must refresh stock');
 console.log('PASS: wrong company/status, cancellation, session switches, invalid and valid RPC response');
})().catch(e=>{console.error(e);process.exitCode=1});
