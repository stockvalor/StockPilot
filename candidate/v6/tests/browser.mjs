import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import bwip from 'bwip-js';

test('Chromium bureau et mobile, compte, stock, seuils, commandes et scan', async t => {
  const html = await readFile(new URL('../index.html',import.meta.url));
  const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>server.close());
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  t.after(()=>browser.close());
  const url='http://127.0.0.1:'+server.address().port;
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.setDefaultTimeout(8000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.type()==='prompt'?dialog.accept(dialog.message().includes('seuil')?'4':'3'):dialog.accept());
  await page.addInitScript(()=>{window.STOCKPILOT_TEST_CONFIG={url:'https://supabase.test',key:'test'}});
  await page.route('https://unpkg.com/**',route=>process.env.STOCKPILOT_SCANNER_JS?route.fulfill({path:process.env.STOCKPILOT_SCANNER_JS,contentType:'application/javascript'}):route.continue());
  await page.route(/https:\/\/world\./,route=>route.fulfill({json:{status:0}}));
  const products={A:[],B:[{id:'b',name:'Produit B',quantity:8,min_quantity:1,unit_price:1,sku:'SKU-B'}]};
  const orders=[];
  let backupValid=true;
  const backup={id:'backupA',created_at:'2026-11-13'};
  let logoutPending=false;
  let finishLogout;
  const logoutGate=new Promise(resolve=>{finishLogout=resolve;});
  t.after(finishLogout);
  await page.route('https://supabase.test/**',async route=>{
    const request=route.request();
    const path=new URL(request.url());
    const method=request.method();
    const data=request.postDataJSON();
    const uid=request.headers().authorization?.slice(-1);
    if(path.pathname==='/auth/v1/token'){
      const account=data.email.startsWith('a')?'A':'B';
      return route.fulfill({json:{access_token:'token'+account,refresh_token:'refresh'+account,user:{id:account,email:data.email}}});
    }
    if(path.pathname==='/auth/v1/logout'){
      if(uid==='A'){logoutPending=true;await logoutGate;}
      return route.fulfill({json:{}});
    }
    if(path.pathname.endsWith('/stockpilot_backups')){
      assert.equal(path.searchParams.get('company_id'),'eq.company'+uid);
      if(uid!=='A')return route.fulfill({json:[]});
      return route.fulfill({json:path.searchParams.get('select').startsWith('payload')?
        [{payload:{format:'stockpilot-products-v1',company_id:'companyA',products:[{unit_price:1.20}]},checksum:'stored-checksum'}]:[backup]});
    }
    if(path.pathname.endsWith('/stockpilot_preview_backup')){
      assert.equal(uid,'A');
      assert.equal(data.p_backup_id,backup.id);
      return route.fulfill({json:[{backup_id:backup.id,company_id:'companyA',checksum_valid:backupValid,product_count:1}]});
    }
    if(path.pathname==='/auth/v1/user')return route.fulfill({json:{id:uid}});
    if(path.pathname.endsWith('/companies'))return route.fulfill({json:[{id:'company'+uid,name:'Entreprise '+uid}]});
    if(path.pathname.endsWith('/products')){
      if(method==='POST')products[uid].push({...data,id:'p'+products[uid].length});
      const product=products[uid].find(p=>'eq.'+p.id===path.searchParams.get('id'));
      if(method==='PATCH'&&product)Object.assign(product,data);
      if(method==='DELETE'&&product)products[uid].splice(products[uid].indexOf(product),1);
      if(method!=='GET')return route.fulfill({json:product?[product]:[]});
      const sku=path.searchParams.get('sku');
      return route.fulfill({json:products[uid].filter(p=>!sku||sku==='eq.'+p.sku)});
    }
    if(path.pathname.endsWith('/stockpilot_v6_submit_order')){
      orders.push({id:'orderA',status:'confirmed',stock_flow:'inbound',created_at:'2026-11-13',lines:data.p_lines});
      return route.fulfill({json:'orderA'});
    }
    if(path.pathname.endsWith('/orders'))return route.fulfill({json:uid==='A'?orders:[]});
    if(path.pathname.endsWith('/order_items'))return route.fulfill({json:uid==='A'?orders.flatMap(o=>o.lines.map(l=>({order_id:o.id,product_id:l.id,quantity:l.qty}))):[]});
    if(path.pathname.endsWith('/stockpilot_receipts'))return route.fulfill({json:[]});
    return route.fulfill({status:404,json:{}});
  });
  const go=id=>page.evaluate(id=>window.go(id),id);
  const text=id=>page.locator('#'+id).textContent();
  async function login(email){
    await go('account');
    await page.locator('#spAuthEmail').fill(email);
    await page.locator('#spAuthPassword').fill('test-password');
    await page.locator('#spSignin').click();
    await page.waitForFunction(email=>document.getElementById('spCloudIdentity').textContent.includes(email),email);
  }
  await page.goto(url);
  assert.equal(await text('kpiLow'),'4');
  await login('a@example.test');
  await page.waitForFunction(()=>document.querySelector('#spDashboardSource').textContent==='Inventaire cloud');
  assert.equal(await text('kpiLow'),'0');
  assert.doesNotMatch(await text('spDashboardAlerts'),/Gants/);
  await go('scanner');
  await page.locator('#prodName').fill('Produit A test');
  await page.locator('#scanCode').fill('SKU-A');
  await page.locator('#prodQty').fill('2');
  await page.locator('#prodMin').fill('3');
  assert.equal(products.A.length,0);
  await page.locator('button[onclick="confirmProduct()"]').click();
  await page.waitForFunction(()=>document.querySelector('#spDashboardAlerts').textContent.includes('Produit A test'),null,{timeout:6000}).catch(async e=>{throw Error(JSON.stringify({errors,products,feedback:await text('spProductSaveFeedback'),stock:await text('spSecureProducts')}),{cause:e})});
  assert.equal(await text('kpiLow'),'1');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#spDashboardAlerts').textContent.includes('Produit A test'));
  await go('stock');
  const prompt=page.waitForEvent('dialog');
  await page.getByRole('button',{name:'Modifier quantité',exact:true}).click();
  assert.match((await prompt).message(),/Produit A test/);
  await page.waitForFunction(()=>document.querySelector('#kpiLow').textContent==='0');
  assert.equal(products.A[0].quantity,3);
  await page.getByRole('button',{name:'Modifier le seuil',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#spSecureProducts').textContent.includes('3 unité(s) · seuil 4'));
  assert.equal(products.A[0].min_quantity,4);
  assert.equal(await text('kpiLow'),'1');
  await go('orders');
  await page.getByRole('button',{name:/Analyser et proposer/}).click();
  await page.locator('#approveBtn').click();
  await page.waitForFunction(()=>document.querySelector('#orderHistory').textContent.includes('Validée'));
  assert.equal(orders.length,1);
  await go('account');
  await page.locator('#spCloudBackupList').click();
  const verify=page.getByRole('button',{name:'Vérifier la copie',exact:true});
  await verify.click();
  await page.waitForFunction(()=>document.querySelector('#spCloudBackupStatus').textContent.includes('1 produit'));
  backupValid=false;
  await verify.click();
  await page.waitForFunction(()=>document.querySelector('#spCloudBackupStatus').textContent.includes('Empreinte de sauvegarde invalide'));
  backupValid=true;
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Télécharger JSON',exact:true}).click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'StockPilot-cloud-backupA.json');
  assert.equal(JSON.parse(await readFile(await download.path(),'utf8')).company_id,'companyA');
  await page.locator('#spSignout').click();
  assert.equal(logoutPending,true);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('sp-v6-candidate-session')),null);
  assert.doesNotMatch(await text('spSecureProducts'),/Produit A test/);
  await page.waitForFunction(()=>document.querySelector('#spDashboardSource').textContent==='Inventaire local');
  await login('b@example.test');
  await page.waitForFunction(()=>document.querySelector('#spSecureProducts').textContent.includes('Produit B'));
  finishLogout();
  assert.equal(await text('kpiLow'),'0');
  assert.doesNotMatch(await text('orderHistory'),/Validée ·/);
  assert.doesNotMatch(await text('spDashboardAlerts'),/Produit A test/);
  await go('scanner');
  for(const [bcid,value] of [['ean13','5901234123457'],['qrcode','SP-TEST-QR']]){
    const buffer=await bwip.toBuffer({bcid,text:value,scale:5,paddingwidth:25,paddingheight:25});
    await page.locator('#scanGallery').setInputFiles({name:bcid+'.png',mimeType:'image/png',buffer});
    await page.waitForFunction(value=>document.querySelector('#scanCode').value===value,value,{timeout:8000});
  }
  await go('account');
  await page.locator('#spSignout').click();
  await page.waitForFunction(()=>document.querySelector('#spDashboardSource').textContent==='Inventaire local');
  await login('a@example.test');
  await page.waitForFunction(()=>document.querySelector('#spDashboardAlerts').textContent.includes('Produit A test'));
  assert.match(await text('orderHistory'),/Validée/);
  assert.deepEqual(errors,[]);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await mobile.route('https://unpkg.com/**',route=>route.abort());
  await mobile.goto(url);
  await mobile.locator('#spMobileMenu').click();
  await mobile.locator('#spNav').getByRole('button',{name:/Mes stocks/}).click();
  assert.equal(await mobile.locator('#stock').isVisible(),true);
  assert.equal(await mobile.locator('#spMobileMenu').getAttribute('aria-expanded'),'false');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth===window.innerWidth),true);
});
