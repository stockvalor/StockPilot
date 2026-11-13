import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('Deux propriétaires : RLS, commandes et réceptions dans PostgreSQL local', async () => {
  const db = await PGlite.create();
  try {
    for (const name of ['./schema-snapshot.sql', '../orders-candidate.sql']) {
      await db.exec(await readFile(new URL(name, import.meta.url), 'utf8'));
    }
    const userA = '10000000-0000-4000-8000-000000000001';
    const userB = '10000000-0000-4000-8000-000000000002';
    const companyA = '20000000-0000-4000-8000-000000000001';
    const companyB = '20000000-0000-4000-8000-000000000002';
    const productA = '30000000-0000-4000-8000-000000000001';
    const productB = '30000000-0000-4000-8000-000000000002';
    const requestId = '40000000-0000-4000-8000-000000000001';
    await db.query('insert into auth.users values ($1),($2)',[userA,userB]);
    await db.query("insert into companies(id,name,owner_user_id) values ($1,'Client A',$2),($3,'Client B',$4)",[companyA,userA,companyB,userB]);
    await db.query("insert into products(id,company_id,name,quantity,min_quantity) values ($1,$2,'Produit A',2,3),($3,$4,'Produit B',7,1)",[productA,companyA,productB,companyB]);
    async function signIn(user,role='authenticated') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
      await db.exec('set role '+role);
    }
    const submit = (lines, key=requestId) => db.query('select stockpilot_v6_submit_order($1,$2::jsonb) id',[key,JSON.stringify(lines)]);
    const getStock = id => db.query('select quantity from products where id=$1',[id]);
    await signIn(userA);
    assert.deepEqual((await getStock(productA)).rows,[{quantity:2}]);
    assert.deepEqual((await getStock(productB)).rows,[]);
    assert.equal((await db.query('update products set quantity=9 where id=$1',[productB])).affectedRows,0);
    assert.equal((await db.query('delete from products where id=$1',[productB])).affectedRows,0);
    await assert.rejects(db.query("insert into products(company_id,name,quantity) values ($1,'Refus',1)",[companyB]),/row-level security/);
    await assert.rejects(submit([{id:productB,qty:3}]),/Unauthorized item/);
    const lines=[{id:productA,qty:3}];
    const {id:order}=(await submit(lines)).rows[0];
    assert.equal((await submit(lines)).rows[0].id,order);
    await assert.rejects(submit([{id:productA,qty:4}]),/different order lines/);
    assert.deepEqual((await db.query('select status from orders where id=$1',[order])).rows,[{status:'confirmed'}]);
    const {id:backup}=(await db.query(
      'insert into stockpilot_backups(company_id,payload,checksum) values ($1,$2,$3) returning id',
      [companyA,'{"products":[]}','0'.repeat(64)]
    )).rows[0];
    const restoreRequest=(company,owner)=>db.query(
      'insert into stockpilot_restore_requests(company_id,backup_id,requested_by) values ($1,$2,$3) returning id',
      [company,backup,owner]
    );
    assert.equal((await restoreRequest(companyA,userA)).rows.length,1);
    await signIn(userB);
    assert.deepEqual((await getStock(productB)).rows,[{quantity:7}]);
    assert.deepEqual((await getStock(productA)).rows,[]);
    assert.deepEqual((await db.query('select id from orders where id=$1',[order])).rows,[]);
    assert.deepEqual((await db.query('select id from order_items where order_id=$1',[order])).rows,[]);
    await assert.rejects(db.query('select stockpilot_v2_receive_order($1)',[order]),/Order not found/);
    await assert.rejects(db.query('select stockpilot_v2_confirm_order($1)',[order]),/Order not found/);
    assert.notEqual((await submit([{id:productB,qty:1}])).rows[0].id,order);
    assert.deepEqual((await db.query('select id from stockpilot_backups where id=$1',[backup])).rows,[]);
    assert.deepEqual((await db.query('select id from stockpilot_restore_requests')).rows,[]);
    await assert.rejects(restoreRequest(companyB,userB),/row-level security/);
    await assert.rejects(restoreRequest(companyA,userB),/row-level security/);
    await signIn(userA);
    const receive = () => db.query('select stockpilot_v2_receive_order($1) result',[order]);
    assert.equal((await receive()).rows[0].result.status,'received');
    assert.equal((await receive()).rows[0].result.status,'already_received');
    assert.deepEqual((await getStock(productA)).rows,[{quantity:5}]);
    await signIn('', 'anon');
    await assert.rejects(getStock(productA),/permission denied/);
    await assert.rejects(submit(lines),/permission denied/);
    await signIn(userB);
    assert.deepEqual((await db.query('select id from stockpilot_receipts')).rows,[]);
    assert.deepEqual((await getStock(productB)).rows,[{quantity:7}]);
  } finally {
    await db.close();
  }
});
