const normalize = (value) => value.trim().normalize('NFC').toLowerCase();

export function applyDocument(state, document, photoHash) {
  const imports = state.documentImports ?? [];
  const documentKey = document.number
    ? JSON.stringify([document.kind, normalize(document.supplier), normalize(document.number)])
    : null;
  if (imports.some((entry) => entry.photoHash === photoHash || (documentKey && entry.documentKey === documentKey))) {
    throw new Error('Ce document a déjà été importé dans ce stock.');
  }

  const next = structuredClone(state);
  const products = new Map(next.items.map((item) => [item.id, item]));
  const references = new Set();
  for (const [index, row] of document.lines.entries()) {
    const { id, name, qty, price } = row;
    const label = 'Ligne ' + (index + 1);
    if (!id || id.length > 100 || !name || name.length > 250 || !Number.isSafeInteger(qty) || qty < 1 || qty > 1000000) {
      throw new Error(label + ' : vérifiez le nom, la référence et la quantité entière.');
    }
    if (references.has(id)) {
      throw new Error(label + ' : référence répétée. Regroupez les quantités sur une seule ligne.');
    }
    references.add(id);
    const existing = products.get(id);
    if ((price === null && !existing) || (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000000))) {
      throw new Error(label + ' : renseignez un prix unitaire HT valide.');
    }
    if (existing) {
      if (existing.stock + qty > 1000000) {
        throw new Error(label + ' : la quantité totale dépasserait la limite du stock.');
      }
      existing.stock += qty;
      if (price !== null) existing.price = price;
    } else {
      next.items.push({ id, name, stock: qty, min: 0, target: 0, price });
    }
  }
  next.documentImports = [...imports, {
    photoHash, documentKey, kind: document.kind, supplier: document.supplier,
    date: document.date, number: document.number,
  }];
  return next;
}
