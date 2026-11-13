const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked=0;
for(const [,attrs,source] of scripts){
 if(/\bsrc\s*=/.test(attrs)||!source.trim())continue;
 if(/\btype\s*=\s*['\"]module['\"]/.test(attrs))continue;
 new vm.Script(source,{filename:'index.html inline script '+(++checked)});
}
assert.ok(checked>0,'No inline JavaScript checked');
for(const [name,needle] of Object.entries({
 accountScopedInventory:'identity!==user?.id',
 isolatedStockPanel:'panel.replaceChildren(staged)',
 stockConcurrencyGuard:'&quantity=eq.',
 serverReceipt:'stockpilot_v2_receive_order',
 authRaceGuard:'authGeneration++',
 immediateLocalLogout:'access=refresh=user=null',
 cloudDemoSeparation:'Inventaire privé masqué'
}))assert.ok(html.includes(needle),'Missing security invariant: '+name);
console.log('PASS: '+checked+' inline scripts parse; 7 security invariants present.');
