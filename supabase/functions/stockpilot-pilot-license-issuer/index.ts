import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const adminOrigin = "https://stockvalor.github.io";
const adminAuthUrl = "https://ieogcyuqgqmaebjkvlns.supabase.co";
const publicKey = "BGfsikP42JZ1339Vvs7vE08G4v7oUZmvurntKDazO8dFvLIXwYj_0OTnyCab6L3pVYb1K_Rqbc8mX3zdLHkzQy0";
const headers = {
  "Access-Control-Allow-Origin": adminOrigin,
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const bytes = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const base64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const encode = (value: string) => new TextEncoder().encode(value);
const auth = { persistSession: false, autoRefreshToken: false };

Deno.serve(async (req) => {
  if (req.headers.get("Origin") !== adminOrigin) return json({error: "ORIGIN_DENIED"}, 403);
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers});
  if (req.method !== "POST") return json({error: "METHOD_DENIED"}, 405);

  try {
    const jwt = /^Bearer ([^ ]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
    if (!jwt) return json({error: "AUTH_REQUIRED"}, 401);

    const admin = await fetch(adminAuthUrl + "/functions/v1/stockpilot-admin-read", {
      method: "POST",
      headers: {Authorization: "Bearer " + jwt, "Content-Type": "application/json"},
      body: JSON.stringify({action: "companies"}),
    });
    await admin.body?.cancel();
    if (!admin.ok) return json({error: "ADMIN_REQUIRED"}, admin.status === 401 ? 401 : 403);

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254) return json({error: "TEST_ACCOUNT_REQUIRED"}, 400);
    const durationDays = body.durationDays === undefined ? 15 : body.durationDays;
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 15) {
      return json({error: "INVALID_DURATION"}, 400);
    }
    const key = Deno.env.get("STOCKPILOT_RECIPE_SIGNING_PKCS8_B64");
    if (!key) return json({error: "SIGNING_KEY_REQUIRED"}, 503);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth});
    const {data: customer, error: lookupError} = await db.rpc("stockpilot_pilot_license_recipient", {p_email: email});
    if (lookupError || typeof customer !== "string") return json({error: "TEST_ACCOUNT_UNAVAILABLE"}, 503);
    const now = Date.now();
    const expiresAt = new Date(now + durationDays * 86400000).toISOString();
    const id = "SP-RECETTE-" + crypto.randomUUID().replaceAll("-", "").toUpperCase();
    const payload = encode(JSON.stringify({
      schema: 1, product: "StockPilot AI", edition: "lifetime", license_id: id,
      issued_at: new Date(now).toISOString(), expires_at: expiresAt,
      customer_id: customer, key_id: "stockpilot-v6-recette",
    }));
    const algorithm = {name: "ECDSA", hash: "SHA-256"};
    const params = {name: "ECDSA", namedCurve: "P-256"};
    const privateKey = await crypto.subtle.importKey("pkcs8", bytes(key), params, false, ["sign"]);
    const verifier = await crypto.subtle.importKey("raw", bytes(publicKey), params, false, ["verify"]);
    const signature = await crypto.subtle.sign(algorithm, privateKey, payload);
    if (!await crypto.subtle.verify(algorithm, verifier, signature, payload)) {
      return json({error: "WRONG_SIGNING_KEY"}, 503);
    }
    const token = base64url(payload) + "." + base64url(new Uint8Array(signature));
    const {data: inserted, error} = await db.rpc("stockpilot_register_pilot_license", {
      p_license_id: id, p_customer: customer, p_token: token, p_expires_at: expiresAt,
    });
    if (error || inserted !== true) return json({error: "LICENSE_NOT_REGISTERED"}, 503);
    return json({token, expiresAt});
  } catch {
    return json({error: "LICENSE_ISSUER_UNAVAILABLE"}, 503);
  }
});
