// StockPilot AI — isolated DEMO issuer, disabled by default.
// Never use this function to issue paid licences. No private key stored in code.
// Deployment must keep JWT verification enabled. Explicit admin authorization required.
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
Deno.serve(async (req:Request)=>{
  if(req.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
  if(Deno.env.get("STOCKPILOT_DEMO_ISSUER_ENABLED")!=="true")
    return json({error:"ISSUER_DISABLED"},503);
  // Fail closed: the authentication and authorization adapter is not installed.
  // Never infer admin rights from request body, user_metadata, or browser localStorage.
  return json({error:"ADMIN_AUTHORIZATION_NOT_CONFIGURED"},403);
});
