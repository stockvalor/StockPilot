const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function receiveCloudOrder(');
const end=html.indexOf('\nasync function cloudOrderHistory(',start);
assert.ok(start>=0&&end>start,'Receipt handler not found');
const source=html.slice(start,end);
let calls=[],lookups=[],confirms=0,alerts=[],reloads=0,account={id:'account-a'},switchOnLookup=false,switchOnToken=false,switchOnRpc=false;
let lookupResponse=[],rpcResponse={status:'received'};
const company={id:'company-a'};
const order={id:'order-a',company_id:'company-a',status:'confirmed',stock_flow:'inbound'};
const sandbox={
 Error,Array,encodeURIComponent,
 get user(){return account},access:true,
 token:async()=>{if(switchOnToken)account={id:'account-b'};return 'test-token'},
 request:async(path,method)=>{calls.push({path,method});if(method==='POST'&&switchOnRpc)account={id:'account-b'};if(method==='GET'&&switchOnLookup)account={id:'account-b'};return path.includes('/stockpilot_receipts?')?lookupResponse:rpcResponse},
 confirm:()=>{confirms++;return true},
 alert:(msg)=>alerts.push(msg),
 loadCloudStock:async()=>{reloads++}
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const receive=sandbox.receiveCloudOrder;
(async()=>{
 await assert.rejects(receive(company,{...order,company_id:'company-b'}),/ne peut pas être réceptionnée/);
 await assert.rejects(receive(company,{...order,status:'draft'}),/ne peut pas être réceptionnée/);
 assert.equal(calls.length,0,'Invalid company or order status must not contact server');
 sandbox.confirm=()=>{confirms++;return false};
 lookupResponse=[];
 await receive(company,order);
 assert.equal(calls.filter(x=>x.method==='POST').length,0,'User cancellation must never post receipt');
 sandbox.confirm=()=>{confirms++;return true};
 confirms=0;
 calls=[];
 lookupResponse=null;
 await assert.rejects(receive(company,order),/Contrôle de réception non confirmé/);
 assert.equal(calls.filter(x=>x.method==='POST').length,0,'Invalid lookup must never post receipt');
 assert.equal(confirms,0,'Invalid lookup must not request confirmation');
 lookupResponse=[{id:'receipt-a'}];
 await receive(company,order);
 assert.equal(calls.filter(x=>x.method==='POST').length,0,'Existing receipt must not post again');
 assert.equal(confirms,0,'Existing receipt must not ask for confirmation');
 lookupResponse=[];
 rpcResponse={status:'received'};
 await receive(company,order);
 assert.equal(calls.filter(x=>x.method==='POST').length,1,'Valid receipt must post exactly once');
 assert.equal(reloads,2,'Existing and successful receipt must reload');
 rpcResponse={status:'unknown'};
 await assert.rejects(receive(company,order),/Réception non attestée/);
 assert.equal(calls.filter(x=>x.method==='POST').length,2,'Unattested result must not retry automatically');
 account={id:'account-a'};switchOnLookup=true;
 const beforeLookupPosts=calls.filter(x=>x.method==='POST').length;
 await assert.rejects(receive(company,order),/Compte modifié/);
 assert.equal(calls.filter(x=>x.method==='POST').length,beforeLookupPosts,'Switch during receipt lookup must block POST');
 switchOnLookup=false;account={id:'account-a'};switchOnToken=true;
 await assert.rejects(receive(company,order),/Compte modifié avant réception/);
 assert.equal(calls.filter(x=>x.method==='POST').length,beforeLookupPosts,'Switch before receipt RPC must block POST');
 switchOnToken=false;account={id:'account-a'};switchOnRpc=true;rpcResponse={status:'received'};
 await assert.rejects(receive(company,order),/Compte modifié pendant la réception/);
 assert.equal(reloads,2,'Switch after receipt RPC must not reload old account');
 console.log('PASS: receipt duplicates, invalid responses, user cancellation, company/status and account-switch races');
})().catch(e=>{console.error(e);process.exitCode=1});
