/* StockPilot V6: opt-in multi-company adapter. Not loaded by existing pages. */
(function(root){
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function validateCompanyId(id){if(typeof id!=='string'||!UUID.test(id))throw Error('Identifiant entreprise invalide');return id;}
  function validateLines(lines){
    if(!Array.isArray(lines)||lines.length<1||lines.length>100)throw Error('Lignes de commande invalides');
    const seen=new Set();
    return lines.map(line=>{
      if(!line||!UUID.test(line.id)||!Number.isInteger(line.qty)||line.qty<1||line.qty>1000000)throw Error('Produit ou quantité invalide');
      if(seen.has(line.id.toLowerCase()))throw Error('Produit en double');
      seen.add(line.id.toLowerCase());
      return {id:line.id,qty:line.qty};
    });
  }
  async function listCompanies(request,token){
    const rows=await request('/rest/v1/companies?select=id,name&order=name.asc','GET',null,await token());
    if(!Array.isArray(rows))throw Error('Liste entreprises invalide');
    return rows;
  }
  function renderCompanySelect(select,companies){
    select.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choisir une entreprise';select.appendChild(placeholder);
    companies.forEach(c=>{const opt=document.createElement('option');opt.value=validateCompanyId(c.id);opt.textContent=c.name;select.appendChild(opt);});
    select.value='';
  }
  async function createOrder(request,token,companyId,lines){
    const p_company_id=validateCompanyId(companyId);
    const p_lines=validateLines(lines);
    // Authorization is enforced again in PostgreSQL, not by this client-side check.
    return request('/rest/v1/rpc/stockpilot_v2_create_order_for_company','POST',{p_company_id,p_lines},await token());
  }
  root.StockPilotMultiCompany={validateCompanyId,validateLines,listCompanies,renderCompanySelect,createOrder};
})(typeof globalThis!=='undefined'?globalThis:this);
