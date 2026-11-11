/* StockPilot AI — prototype de planificateur de sauvegardes (branche de développement).
 * À intégrer seulement après tests. N'est PAS chargé par index.html.
 * Prérequis : fonctions saveCloudBackup, token, myCompany disponibles.
 * Sauvegarde uniquement sur opt-in explicite, lorsque la page est ouverte.
 * Ne remplace pas une sauvegarde serveur périodique ni une synchronisation multi-appareils.
 */
(function () {
  'use strict';
  const INTERVAL_MS = 30 * 60 * 1000;
  const MIN_GAP_MS = 30 * 60 * 1000;
  const OPT_IN_KEY = 'stockpilot-cloud-autobackup-enabled-v1';
  const LAST_PREFIX = 'stockpilot-cloud-autobackup-last-v2:';
  // Horodatage par utilisateur ET entreprise pour éviter les interférences entre comptes.
  let timer = null;
  let inFlight = false;

  function enabled() {
    try { return localStorage.getItem(OPT_IN_KEY) === 'yes'; }
    catch (_) { return false; }
  }
  function lastSuccess(key) {
    try { return Number(localStorage.getItem(key) || 0) || 0; }
    catch (_) { return 0; }
  }
  async function run() {
    if (!enabled() || inFlight || document.visibilityState !== 'visible' ||
        !navigator.onLine) return false;
    if (typeof saveCloudBackup !== 'function' || typeof token !== 'function' ||
        typeof myCompany !== 'function') return false;
    inFlight = true;
    try {
      const accessToken = await token();
      const company = await myCompany();
      // L'identité est dérivée du JWT uniquement pour partitionner le cache local.
      // Les autorisations restent contrôlées par Supabase RLS.
      const segment = accessToken.split('.')[1];
      if (!segment) throw Error('Session invalide');
      const claims = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
      if (!claims.sub || !company.id) throw Error('Identité entreprise invalide');
      const lastKey = LAST_PREFIX + claims.sub + ':' + company.id;
      if (Date.now() - lastSuccess(lastKey) < MIN_GAP_MS) return false;
      await saveCloudBackup(); // Vérifie le checksum côté application.
      localStorage.setItem(lastKey, String(Date.now()));
      document.dispatchEvent(new CustomEvent('stockpilot:backup', { detail: { ok: true } }));
      return true;
    } catch (error) {
      document.dispatchEvent(new CustomEvent('stockpilot:backup', {
        detail: { ok: false, message: String(error && error.message || 'Échec') }
      }));
      return false;
    } finally { inFlight = false; }
  }
  function stop() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }
  function start() {
    stop();
    if (!enabled()) return;
    timer = setInterval(run, INTERVAL_MS);
    void run();
  }
  // À appeler uniquement après consentement explicite de l'utilisateur.
  window.StockPilotAutoBackupDraft = Object.freeze({
    enable() { localStorage.setItem(OPT_IN_KEY, 'yes'); start(); },
    disable() { localStorage.removeItem(OPT_IN_KEY); stop(); },
    isEnabled: enabled,
    runNow: run,
    stop
  });
  start();
})();
