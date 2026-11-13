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

test('La création différée de société reste liée à l’adresse inscrite', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const accounts = new Map([['a@example.test', 'A'], ['b@example.test', 'B']]);
  const companies = new Map();
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost:8080',
    beforeParse(window) {
      window.structuredClone = structuredClone;
      window.STOCKPILOT_TEST_CONFIG = {url: 'https://supabase.test', key: 'test'};
      window.fetch = async (url, options = {}) => {
        const { pathname } = new URL(url);
        const body = options.body && JSON.parse(options.body);
        const account = options.headers?.Authorization?.slice(-1);
        if (pathname === '/auth/v1/signup') {
          if (!accounts.has(body.email)) {
            return Response.json({code: 'email_address_invalid'}, {status: 400});
          }
          return Response.json({});
        }
        if (pathname === '/auth/v1/token') {
          const id = accounts.get(body.email);
          return Response.json({access_token: 'token' + id, user: {id, email: body.email}});
        }
        if (pathname === '/auth/v1/user') return Response.json({id: account});
        if (pathname === '/rest/v1/companies') {
          if (options.method === 'POST') {
            companies.set(account, [{id: account, name: body.name}]);
          }
          return Response.json(companies.get(account) ?? []);
        }
        return Response.json([]);
      };
    }
  });

  try {
    const { window } = dom;
    const el = id => window.document.getElementById(id);
    const pending = () => window.sessionStorage.getItem('sp-v6-candidate-pending-company');
    async function submit(button, email) {
      el('spAuthEmail').value = email;
      el('spAuthPassword').value = 'test-password';
      el(button).click();
      await new Promise(resolve => setImmediate(resolve));
    }
    el('spAuthCompany').value = 'Société A';
    await submit('spSignup', 'refusee@example.test');
    assert.match(el('spAuthStatus').textContent, /Adresse e-mail refusée/);
    assert.equal(pending(), null);
    await submit('spSignup', 'a@example.test');
    assert.equal(JSON.parse(pending()).email, 'a@example.test');
    await submit('spSignin', 'b@example.test');
    assert.equal(companies.size, 0);
    assert.equal(JSON.parse(pending()).email, 'a@example.test');
    el('spSignout').click();
    await submit('spSignin', 'a@example.test');
    assert.equal(companies.get('A')[0].name, 'Société A');
    assert.equal(pending(), null);
  } finally {
    dom.window.close();
  }
});
