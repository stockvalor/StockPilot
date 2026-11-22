import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const adminOrigins = new Set([
  "http://127.0.0.1:4173",
  "https://stockpilot-ai-admin-recette.triplepheasant4.chatgpt.site",
]);
const recipeUrl = "https://qofvnaomefqkemtxhmoi.supabase.co";
const publicKey = "BGfsikP42JZ1339Vvs7vE08G4v7oUZmvurntKDazO8dFvLIXwYj_0OTnyCab6L3pVYb1K_Rqbc8mX3zdLHkzQy0";
const baseHeaders = {
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey,x-client-info",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const bytes = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const base64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const encode = (value: string) => new TextEncoder().encode(value);
const auth = { persistSession: false, autoRefreshToken: false };

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = new Headers(baseHeaders);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (!origin || !adminOrigins.has(origin)) return json({error: "ORIGIN_DENIED"}, 403);
  headers.set("Access-Control-Allow-Origin", origin);
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers});
  if (req.method !== "POST") return json({error: "METHOD_DENIED"}, 405);

  try {
    const jwt = /^Bearer ([^ ]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
    if (!jwt) return json({error: "AUTH_REQUIRED"}, 401);

    if (Deno.env.get("SUPABASE_URL") !== recipeUrl) {
      return json({error: "RECIPE_PROJECT_REQUIRED"}, 503);
    }
    const db = createClient(recipeUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth});
    const {data: {user}, error: authError} = await db.auth.getUser(jwt);
    if (authError || !user) return json({error: "AUTH_REQUIRED"}, 401);
    if (user.app_metadata.stockpilot_recipe_license_admin !== true) {
      return json({error: "ADMIN_REQUIRED"}, 403);
    }

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action === "lookup") {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      if (query.length < 2 || query.length > 120) return json({error: "INVALID_SEARCH"}, 400);
      const { data, error } = await db.rpc("stockpilot_find_license_companies", {p_query: query});
      if (error) return json({error: "COMPANY_LOOKUP_UNAVAILABLE"}, 503);
      return json({companies: data});
    }
    if (action !== "signing_status" && action !== "issue") {
      return json({error: "ACTION_REQUIRED"}, 400);
    }
    const key = Deno.env.get("STOCKPILOT_RECIPE_SIGNING_PKCS8_B64");
    if (!key) return json({error: "SIGNING_KEY_REQUIRED"}, 503);
    const algorithm = {name: "ECDSA", hash: "SHA-256"};
    const params = {name: "ECDSA", namedCurve: "P-256"};
    let privateKey: CryptoKey;
    try {
      privateKey = await crypto.subtle.importKey("pkcs8", bytes(key), params, false, ["sign"]);
    } catch {
      return json({error: "INVALID_SIGNING_KEY"}, 503);
    }
    const verifier = await crypto.subtle.importKey("raw", bytes(publicKey), params, false, ["verify"]);
    if (action === "signing_status") {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const proof = await crypto.subtle.sign(algorithm, privateKey, challenge);
      if (!await crypto.subtle.verify(algorithm, verifier, proof, challenge)) {
        return json({error: "WRONG_SIGNING_KEY"}, 503);
      }
      return json({signingReady: true});
    }
    const companyId = body.companyId;
    const durationDays = body.durationDays;
    if (durationDays !== 7 && durationDays !== 15) return json({error: "INVALID_DURATION"}, 400);
    if (typeof companyId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(companyId)) {
      return json({error: "COMPANY_REQUIRED"}, 400);
    }
    const {data: company, error: lookupError} = await db.from("companies")
      .select("owner_user_id").eq("id", companyId).maybeSingle();
    if (lookupError) return json({error: "COMPANY_LOOKUP_UNAVAILABLE"}, 503);
    if (!company?.owner_user_id) return json({error: "COMPANY_REQUIRED"}, 404);
    const customer = company.owner_user_id;
    const now = Date.now();
    const expiresAt = new Date(now + durationDays * 86400000).toISOString();
    const id = "SP-RECETTE-" + crypto.randomUUID().replaceAll("-", "").toUpperCase();
    const payload = encode(JSON.stringify({
      schema: 1, product: "StockPilot AI", edition: "lifetime", license_id: id,
      issued_at: new Date(now).toISOString(), expires_at: expiresAt,
      customer_id: customer, key_id: "stockpilot-v6-recette",
    }));
    const signature = await crypto.subtle.sign(algorithm, privateKey, payload);
    if (!await crypto.subtle.verify(algorithm, verifier, signature, payload)) {
      return json({error: "WRONG_SIGNING_KEY"}, 503);
    }
    const token = base64url(payload) + "." + base64url(new Uint8Array(signature));
    const {data: inserted, error} = await db.rpc("stockpilot_register_company_pilot_license", {
      p_license_id: id, p_company: companyId, p_customer: customer, p_token: token, p_expires_at: expiresAt,
    });
    if (error || inserted !== true) return json({error: "LICENSE_NOT_REGISTERED"}, 503);
    return json({token, licenseId: id, expiresAt});
  } catch {
    return json({error: "LICENSE_ISSUER_UNAVAILABLE"}, 503);
  }
});
