// Node test: isolated adapter validation. No network/database writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/adapter.js','utf8'),context);
const m=context.StockPilotMultiCompany;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
assert.equal(m.validateCompanyId(A),A);
assert.throws(()=>m.validateCompanyId('x'));
assert.equal(m.validateLines([{id:A,qty:2}]).length,1);
assert.throws(()=>m.validateLines([]));
assert.throws(()=>m.validateLines([{id:A,qty:0}]));
assert.throws(()=>m.validateLines([{id:A,qty:1},{id:A,qty:2}]));
(async()=>{
 let called;
 const request=async (...args)=>{called=args;return 'order-id'};
 const token=async()=> 'test-token';
 assert.equal(await m.createOrder(request,token,A,[{id:B,qty:3}]),'order-id');
 assert.equal(called[0],'/rest/v1/rpc/stockpilot_v2_create_order_for_company');
 assert.equal(called[2].p_company_id,A);
 assert.equal(called[2].p_lines[0].qty,3);
 await assert.rejects(()=>m.createOrder(request,token,'invalid',[{id:B,qty:3}]));
 console.log('PASS: validation + RPC contract; no live DB mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
