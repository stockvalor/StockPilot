import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM, VirtualConsole } from 'jsdom';

test('Les indicateurs et alertes suivent les stocks affichés', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const errors=[];
  const console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(html,{
    runScripts:'dangerously',url:'http://localhost:8080',
    virtualConsole:console,
    beforeParse(window){window.structuredClone=structuredClone;}
  });
  try {
    const { window }=dom;
    await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
    const el=id=>window.document.getElementById(id);
    assert.equal(el('kpiLow').textContent,'4');
    window.eval("spSwitchInventoryOwner('test-a')");
    assert.equal(el('kpiRefs').textContent,'0');
    assert.equal(el('kpiLow').textContent,'0');
    assert.doesNotMatch(el('spDashboardAlerts').textContent,/Gants/);
    window.eval("orderState.items=[{id:'a',name:'Produit A',stock:2,min:3,price:1}];saveOrderState()");
    assert.equal(el('kpiLow').textContent,'1');
    assert.match(el('spDashboardAlerts').textContent,/Produit A/);
    window.eval('orderState.items[0].stock=3;saveOrderState()');
    assert.equal(el('kpiLow').textContent,'0');
    window.eval("spSetDraftBudget(45);spSwitchInventoryOwner('test-b')");
    assert.equal(window.eval('spGetDraftBudget()'),null);
    assert.doesNotMatch(el('spDashboardAlerts').textContent,/Produit A/);
    window.eval("spSwitchInventoryOwner('test-a')");
    assert.equal(window.eval('spGetDraftBudget()'),45);
    assert.equal(el('kpiRefs').textContent,'0');
    assert.deepEqual(errors,[]);
  } finally {
    dom.window.close();
  }
});

test('Une inscription en attente reste liée à son adresse et la déconnexion est immédiate', async t => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const companies={a:[],b:[]};
  let releaseLogout;
  const logout=new Promise(resolve=>{releaseLogout=resolve});
  const dom=new JSDOM(html,{
    runScripts:'dangerously',url:'http://localhost:8080',virtualConsole:new VirtualConsole(),
    beforeParse(window){
      window.structuredClone=structuredClone;
      window.STOCKPILOT_TEST_CONFIG={url:'https://supabase.test',key:'test'};
      window.fetch=async (url,{method,headers,body})=>{
        const path=new URL(url).pathname;
        const data=body&&JSON.parse(body);
        const uid=headers.Authorization?.slice(-1);
        let result=[];
        if(path.endsWith('/signup'))result={user:{id:'a'}};
        if(path.endsWith('/token')){
          const id=data.email[0];
          result={access_token:'access-'+id,refresh_token:'refresh-'+id,user:{id,email:data.email}};
        }
        if(path.endsWith('/user'))result={id:uid};
        if(path.endsWith('/companies')){
          if(method==='POST')companies[uid].push({id:uid,name:data.name});
          result=companies[uid];
        }
        if(path.endsWith('/logout')&&uid==='b')await logout;
        return {ok:true,json:async()=>result};
      };
    }
  });
  t.after(()=>dom.window.close());
  const {window}=dom;
  await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  const el=id=>window.document.getElementById(id);
  async function waitFor(predicate){
    for(let attempt=0;attempt<100;attempt++){
      if(predicate())return;
      await new Promise(resolve=>setTimeout(resolve,5));
    }
    assert.fail('État attendu absent');
  }
  function credentials(email){
    el('spAuthEmail').value=email;
    el('spAuthPassword').value='test-password';
  }
  credentials('a@example.test');
  el('spAuthCompany').value='Entreprise A';
  el('spSignup').click();
  await waitFor(()=>el('spAuthStatus').textContent.includes('Confirmez votre e-mail'));
  credentials('b@example.test');
  el('spSignin').click();
  await waitFor(()=>el('spCloudCompanies').textContent.includes('Aucune entreprise'));
  assert.deepEqual(companies.b,[]);
  el('spSignout').click();
  assert.equal(el('spCloudConnected').hidden,true);
  assert.equal(window.sessionStorage.getItem('sp-v6-candidate-session'),null);
  credentials('A@example.test');
  el('spSignin').click();
  await waitFor(()=>el('spCloudCompanies').textContent.includes('Entreprise A'));
  releaseLogout();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(el('spCloudIdentity').textContent,/a@example.test/);
  assert.deepEqual(companies.b,[]);
  assert.deepEqual(companies.a,[{id:'a',name:'Entreprise A'}]);
});
