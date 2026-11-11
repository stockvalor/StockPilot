/* StockPilot AI — isolated tenant storage adapter, NOT integrated in production.
 * This adapter does not migrate or read legacy unscoped keys.
 * It must be tested with two distinct users before integration.
 */
(function (global) {
  'use strict';
  const PREFIX = 'stockpilot:tenant:v1:';
  const ALLOWED = Object.freeze([
    'stockpilot-futuriste-orders-v1',
    'stockpilot-futuriste-orders-v2',
    'stockpilot-forecast-v46'
  ]);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function scope(userId, companyId) {
    if (!UUID.test(userId) || !UUID.test(companyId)) throw Error('Identité invalide');
    return PREFIX + userId.toLowerCase() + ':' + companyId.toLowerCase() + ':';
  }
  function storageKey(userId, companyId, name) {
    if (!ALLOWED.includes(name)) throw Error('Section non autorisée');
    return scope(userId, companyId) + name;
  }
  function forTenant(userId, companyId, storage = global.localStorage) {
    const prefix = scope(userId, companyId);
    return Object.freeze({
      read(name) { return storage.getItem(storageKey(userId, companyId, name)); },
      write(name, value) {
        if (typeof value !== 'string' || value.length > 1000000) throw Error('Taille invalide');
        storage.setItem(storageKey(userId, companyId, name), value);
      },
      remove(name) { storage.removeItem(storageKey(userId, companyId, name)); },
      export() {
        const data = {};
        for (const name of ALLOWED) {
          const value = storage.getItem(prefix + name);
          if (value !== null) data[name] = value;
        }
        return data;
      }
    });
  }
  // Legacy migration requires an explicit, user-confirmed import into the selected
  // tenant after authentication. NEVER automatically assign shared local data.
  global.StockPilotTenantStorageDraft = Object.freeze({ forTenant, storageKey });
})(window);
