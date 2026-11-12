/**
 * StockPilot V6 — optional passkey integration (EXPERIMENTAL, not deployed).
 * Requires @supabase/supabase-js >= 2.105.0, configured Auth Passkeys,
 * stable WebAuthn RP ID/origin, and a verified HTTPS site.
 * Never store biometrics, passwords, session tokens, or secret keys here.
 * This adapter is intentionally not imported by the current V6 HTML.
 */
export function createOptionalPasskeys(supabase) {
  if (!supabase?.auth?.registerPasskey ||
      !supabase?.auth?.signInWithPasskey ||
      !supabase?.auth?.passkey?.list) {
    return { available: false, reason: 'Supabase passkey client unavailable' };
  }
  const supported = () => Boolean(
    globalThis.isSecureContext && globalThis.PublicKeyCredential &&
    globalThis.navigator?.credentials
  );
  async function enroll() {
    if (!supported()) throw new Error('Passkeys unavailable on this device');
    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email_confirmed_at) {
      throw new Error('Confirmed account and active session required');
    }
    const { data, error } = await supabase.auth.registerPasskey();
    if (error) throw error;
    return data;
  }
  async function signIn() {
    if (!supported()) throw new Error('Passkeys unavailable on this device');
    const { data, error } = await supabase.auth.signInWithPasskey();
    if (error) throw error;
    return data;
  }
  async function list() {
    const { data, error } = await supabase.auth.passkey.list();
    if (error) throw error;
    return data;
  }
  async function remove(passkeyId) {
    if (!passkeyId) throw new Error('Passkey ID required');
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    if (error) throw error;
  }
  return { available: supported(), enroll, signIn, list, remove };
}

/*
 * Integration in a future V6 test build only:
 * import { createClient } from '@supabase/supabase-js';
 * const supabase = createClient(url, publishableKey, {
 *   auth: { experimental: { passkey: true } }
 * });
 * const passkeys = createOptionalPasskeys(supabase);
 *
 * IMPORTANT: current StockPilot V6 uses custom fetch + token management.
 * A migration plan must preserve existing sessions and login/recovery.
 * Keep passkeys OPTIONAL and retain password login.
 * Do not enable on production until RP domain is stable and device tests pass.
 */
