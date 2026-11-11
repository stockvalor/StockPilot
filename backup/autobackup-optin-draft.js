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
  const LAST_KEY = 'stockpilot-cloud-autobackup-last-v1';
  let timer = null;
  let inFlight = false;

  function enabled() {
    try { return localStorage.getItem(OPT_IN_KEY) === 'yes'; }
    catch (_) { return false; }
  }
  function lastSuccess() {
    try { return Number(localStorage.getItem(LAST_KEY) || 0) || 0; }
    catch (_) { return 0; }
  }
  async function run() {
    if (!enabled() || inFlight || document.visibilityState !== 'visible' ||
        !navigator.onLine || Date.now() - lastSuccess() < MIN_GAP_MS) return false;
    if (typeof saveCloudBackup !== 'function' || typeof token !== 'function' ||
        typeof myCompany !== 'function') return false;
    inFlight = true;
    try {
      await token();
      await myCompany();
      await saveCloudBackup(); // Vérifie le checksum côté application.
      localStorage.setItem(LAST_KEY, String(Date.now()));
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
