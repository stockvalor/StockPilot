import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const base = process.env.STOCKPILOT_RECETTE_URL
const key = process.env.STOCKPILOT_RECETTE_KEY
assert.ok(base && key && process.env.STOCKPILOT_RECETTE_ACCOUNTS, 'Set the isolated recipe URL, publishable key and accounts file')
assert.equal(new URL(base).hostname, 'qofvnaomefqkemtxhmoi.supabase.co', 'This suite writes fixtures to the StockPilot V6 recipe project only')
const accounts = JSON.parse(readFileSync(process.env.STOCKPILOT_RECETTE_ACCOUNTS))
async function request(path, {token, method='GET', data}={}) {
  const headers = {apikey:key, 'Content-Type':'application/json', Prefer:'return=representation'}
  if (token) headers.Authorization = 'Bearer '+token
  const response = await fetch(base+path,{headers,method,signal:AbortSignal.timeout(12000),body:JSON.stringify(data)})
  const value = await response.text(); console.log(method,path.split("?")[0],response.status)
  return {status:response.status,value:value ? JSON.parse(value) : null}
}
function ok(result) {
  assert.ok(result.status>=200 && result.status<300, JSON.stringify(result))
  return result.value
}
function refused(result) {
  assert.ok([400,401,403,404].includes(result.status), JSON.stringify(result))
}
const login = async credentials => ok(await request('/auth/v1/token?grant_type=password',{method:'POST',data:credentials}))
assert.equal(accounts.length,2)
const [a,b]=await Promise.all(accounts.map(login))
assert.notEqual(a.user.id,b.user.id)
console.log('PASS Auth: two independent password sessions')
const api = (session,path,method,data) => request('/rest/v1/'+path,{token:session?.access_token,method,data})
const rpc = (session,name,data) => api(session,'rpc/'+name,'POST',data)
const first = async (session,path,method,data) => ok(await api(session,path,method,data))[0]
async function seed(session,label) {
 const companies=ok(await api(session,'companies'))
 assert.ok(companies.length<=1, 'Order RPCs expect exactly one company per test account')
 const company=companies[0] ?? await first(session,'companies','POST',{name:'Recette '+label,owner_user_id:session.user.id})
 const product=await first(session,'products','POST',{company_id:company.id,name:'Produit '+label,sku:label+'-'+randomUUID(),quantity:2,min_quantity:3})
 return {company,product}
}
const [ar,br]=await Promise.all([seed(a,"A"),seed(b,"B")])
const prod=id=>'products?id=eq.'+id
for(const [session,other] of [[a,br],[b,ar]]) {
 assert.deepEqual(ok(await api(session,prod(other.product.id))),[])
 assert.deepEqual(ok(await api(session,prod(other.product.id),'PATCH',{quantity:99})),[])
 assert.deepEqual(ok(await api(session,prod(other.product.id),'DELETE')),[])
 refused(await api(session,'products','POST',{company_id:other.company.id,name:'Synthetic'}))
 refused(await rpc(session,'stockpilot_create_backup',{p_company_id:other.company.id}))
 refused(await rpc(session,'stockpilot_v2_create_order',{p_lines:[{id:other.product.id,qty:1}]}))
}
refused(await api(null,'products'))
console.log('PASS RLS: own rows created, cross-account read/update/delete denied in both directions, anonymous denied')
const submission={p_request_id:randomUUID(),p_lines:[{id:ar.product.id,qty:3}]}
const order=ok(await rpc(a,'stockpilot_v6_submit_order',submission))
assert.equal(ok(await rpc(a,'stockpilot_v6_submit_order',submission)),order)
assert.equal(ok(await api(a,'order_items?order_id=eq.'+order)).length,1)
assert.deepEqual(ok(await api(b,'order_items?order_id=eq.'+order)),[])
assert.deepEqual(ok(await api(b,'orders?id=eq.'+order)),[])
refused(await rpc(b,'stockpilot_v2_confirm_order',{p_order_id:order}))
refused(await rpc(b,'stockpilot_v2_receive_order',{p_order_id:order}))
assert.equal(ok(await rpc(a,'stockpilot_v2_confirm_order',{p_order_id:order})),true)
const receipts=await Promise.all([1,2].map(()=>rpc(a,'stockpilot_v2_receive_order',{p_order_id:order})))
assert.deepEqual(receipts.map(r=>ok(r).status).sort(),['already_received','received'])
assert.equal((await first(a,prod(ar.product.id))).quantity,5)
console.log('PASS inbound: confirmation, concurrent receipt idempotency, stock 2 to 5')
const backup=ok(await rpc(a,'stockpilot_create_backup',{p_company_id:ar.company.id}))
assert.equal(ok(await rpc(a,'stockpilot_preview_backup',{p_backup_id:backup}))[0].checksum_valid,true)
refused(await rpc(b,'stockpilot_preview_backup',{p_backup_id:backup}))
assert.deepEqual(ok(await api(b,'stockpilot_backups?id=eq.'+backup)),[])
const after=await first(a,prod(ar.product.id),'PATCH',{quantity:9,min_quantity:4})
assert.equal(after.quantity,9)
assert.equal(after.min_quantity,4)
const restore=await first(a,'stockpilot_restore_requests','POST',{company_id:ar.company.id,backup_id:backup,requested_by:a.user.id})
const args={p_request_id:restore.id,p_confirmation:'RESTAURER MES STOCKS'}
refused(await rpc(b,'stockpilot_apply_restore',args))
assert.deepEqual(ok(await api(b,'stockpilot_restore_requests?id=eq.'+restore.id)),[])
const safety=ok(await rpc(a,'stockpilot_apply_restore',args))
assert.equal((await first(a,'stockpilot_backups?id=eq.'+safety)).payload.products.find(product=>product.id===ar.product.id).quantity,9)
refused(await rpc(a,'stockpilot_apply_restore',args))
const moves=ok(await api(a,'stock_movements?product_id=eq.'+ar.product.id))
assert.deepEqual(moves.map(m=>m.delta).sort((x,y)=>x-y),[-4,3,4])
assert.deepEqual(ok(await api(b,'stock_movements?product_id=eq.'+ar.product.id)),[])
assert.equal((await first(b,prod(br.product.id))).quantity,2)
ok(await request('/auth/v1/logout',{method:'POST',token:a.access_token}))
const newA=await login(accounts[0])
const current=await first(newA,prod(ar.product.id))
assert.equal(current.quantity,5)
assert.equal(current.min_quantity,3)
console.log('PASS backup checksum, restore, safety snapshot, movement history, logout/relogin persistence')
const {id:outbound}=await first(newA,'orders','POST',{company_id:ar.company.id,created_by:newA.user.id,stock_flow:'outbound'})
ok(await api(newA,'order_items','POST',{order_id:outbound,product_id:ar.product.id,quantity:2}))
refused(await rpc(b,'stockpilot_confirm_order',{p_order_id:outbound}))
refused(await rpc(b,'stockpilot_cancel_order',{p_order_id:outbound}))
ok(await rpc(newA,'stockpilot_confirm_order',{p_order_id:outbound}))
assert.equal((await first(newA,prod(ar.product.id))).quantity,3)
const {id:draft}=await first(newA,'orders','POST',{company_id:ar.company.id,created_by:newA.user.id,stock_flow:'outbound'})
ok(await rpc(newA,'stockpilot_cancel_order',{p_order_id:draft}))
assert.equal((await first(newA,'orders?id=eq.'+draft)).status,'cancelled')
console.log('PASS outbound: cross-account confirmation/cancellation denied, stock 5 to 3')
