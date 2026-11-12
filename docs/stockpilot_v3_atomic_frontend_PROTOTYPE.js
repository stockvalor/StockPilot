/* StockPilot V6 — prototype NON BRANCHÉ, NON DÉPLOYÉ.
 * À intégrer seulement après validation de la fonction serveur V3.
 * Une demande en attente est propre à un utilisateur ET à une entreprise.
 * Le navigateur doit conserver la même clé après une réponse réseau incertaine.
 */
(function(){
  const PREFIX='stockpilot-v6-pending-order-v3:';
  function canonical(lines){
    if(!Array.isArray(lines)||!lines.length) throw Error('Commande vide');
    const normalized=lines.map(x=>({id:String(x.id).toLowerCase(),qty:Number(x.qty)}))
      .sort((a,b)=>a.id.localeCompare(b.id));
    if(normalized.some(x=>!Number.isSafeInteger(x.qty)||x.qty<1||x.qty>1000000))
      throw Error('Quantité invalide');
    if(new Set(normalized.map(x=>x.id)).size!==normalized.length)
      throw Error('Produit répété');
    return JSON.stringify(normalized);
  }
  function key(userId,companyId){
    if(!userId||!companyId)throw Error('Identité cloud requise');
    return PREFIX+userId+':'+companyId;
  }
  function pending(userId,companyId){
    const raw=localStorage.getItem(key(userId,companyId));
    if(!raw)return null;
    const value=JSON.parse(raw);
    if(!value||typeof value.requestId!=='string'||typeof value.lines!=='string')
      throw Error('Demande locale corrompue : intervention nécessaire');
    return value;
  }
  function prepare(userId,companyId,lines){
    const serialized=canonical(lines);
    const old=pending(userId,companyId);
    if(old){
      if(old.lines!==serialized)
        throw Error('Commande précédente en attente : reprendre ou résoudre avant une nouvelle commande');
      return old;
    }
    if(!globalThis.crypto?.randomUUID)
      throw Error('Identifiant sécurisé indisponible');
    const value={requestId:crypto.randomUUID(),lines:serialized,createdAt:new Date().toISOString()};
    localStorage.setItem(key(userId,companyId),JSON.stringify(value));
    // Important : la persistance locale peut échouer (quota ou mode privé).
    if(localStorage.getItem(key(userId,companyId))!==JSON.stringify(value))
      throw Error('Impossible de conserver la demande');
    return value;
  }
  async function submit({userId,companyId,lines,requestRpc}){
    if(typeof requestRpc!=='function')throw Error('RPC indisponible');
    const p=prepare(userId,companyId,lines);
    // La clé est stable tant que la confirmation serveur n'est pas connue.
    const orderId=await requestRpc('stockpilot_v3_create_confirm_order',{
      p_request_id:p.requestId,p_lines:JSON.parse(p.lines)
    });
    if(typeof orderId!=='string'||!orderId)throw Error('Réponse serveur non vérifiée');
    // Une réponse positive de la fonction atomique confirme la transaction.
    localStorage.removeItem(key(userId,companyId));
    return orderId;
  }
  // Prototype isolé ; ne modifie pas les handlers de la prévisualisation actuelle.
  globalThis.StockPilotAtomicOrderDraft={canonical,pending,prepare,submit};
})();
