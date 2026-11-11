/* StockPilot AI development: authenticated tenant storage bridge.
 * No production dependency. This module never reads legacy shared keys.
 * Caller MUST pass a user id verified by Supabase and a company id returned
 * by a server query scoped through RLS. Caller must reset UI on switch.
 */
(function(global){
'use strict';
let active=null,store=null;
const events=new Set();
function requireActive(){if(!active||!store)throw Error('Aucun espace entreprise authentifié');return store;}
function activate(userId,companyId){
  if(!global.StockPilotTenantStorageDraft)throw Error('Adaptateur entreprise manquant');
  let next;try{next=global.StockPilotTenantStorageDraft.forTenant(userId,companyId)}catch(error){disconnect();throw error;}
  const changed=!active||active.userId!==userId||active.companyId!==companyId;
  if(changed){store=null;active=null;for(const fn of events)fn();}
  store=next;
  active=Object.freeze({userId,companyId});
  return active;
}
function disconnect(){
  store=null;active=null;for(const fn of events)fn();
}
global.StockPilotTenantBridgeDraft=Object.freeze({
  activate,disconnect,
  identity(){return active;},
  read(key){return requireActive().read(key);},
  write(key,value){return requireActive().write(key,value);},
  remove(key){return requireActive().remove(key);},
  export(){return requireActive().export();},
  onReset(fn){if(typeof fn!=='function')throw Error('Callback invalide');events.add(fn);return()=>events.delete(fn)}
});
})(window);
