/* StockPilot AI — cloud backup payload from tenant-scoped storage.
 * Standalone development module, not loaded by production index.html.
 * Requires a verified Supabase session/company binding by the caller.
 */
(function(global) {
  'use strict';
  const KEYS = Object.freeze([
    'stockpilot-futuriste-orders-v1',
    'stockpilot-futuriste-orders-v2',
    'stockpilot-forecast-v46'
  ]);
  function createPayload(tenantStore, validateRestoreKey, companyId) {
    if (!tenantStore || typeof tenantStore.read !== 'function') throw Error('Stockage entreprise indisponible');
    if (typeof validateRestoreKey !== 'function') throw Error('Validateur indisponible');
    if (typeof companyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(companyId)) throw Error('Entreprise invalide');
    const data = {};
    for (const key of KEYS) {
      const value = tenantStore.read(key);
      if (value !== null) {
        validateRestoreKey(key, value);
        data[key] = value;
      }
    }
    if (!Object.keys(data).length) throw Error('Aucune donnée de cette entreprise à sauvegarder');
    return { format: 'stockpilot-cloud-backup-v2', companyId, createdAt: new Date().toISOString(), data };
  }
  function validatePayloadCompany(payload, companyId) {
    if (!payload || payload.format !== 'stockpilot-cloud-backup-v2' || payload.companyId !== companyId) {
      throw Error('Sauvegarde non attribuée à cette entreprise');
    }
    return true;
  }
  global.StockPilotTenantBackupDraft = Object.freeze({ createPayload, validatePayloadCompany });
})(window);
