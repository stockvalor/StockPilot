// StockPilot AI — commercial license issuer, intentionally disabled.
// This file is NOT deployed. No signing keys belong in the GitHub repository.
// To enable later: implement authenticated admin authorization, trusted payment
// confirmation, idempotent DB transaction, signing with secret manager key,
// audit logging, rate limiting and abuse protection, then security-review.
Deno.serve((_request: Request) => {
  return new Response(JSON.stringify({
    error: "LICENSE_ISSUANCE_DISABLED",
    message: "Émission commerciale indisponible tant que les contrôles de sécurité ne sont pas validés."
  }), {
    status: 503,
    headers: {"Content-Type": "application/json; charset=utf-8","Cache-Control":"no-store"}
  });
});
