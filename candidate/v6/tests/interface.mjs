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
