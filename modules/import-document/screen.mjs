import { applyDocument } from './stock.mjs';

const messages = {
  401: 'Connectez-vous à StockPilot, puis rouvrez cet écran.',
  403: 'Votre compte n’a pas accès à la lecture de documents.',
  413: 'Choisissez une image de 8 Mo maximum.',
  415: 'Choisissez une photo JPEG, PNG ou WebP.',
  422: 'Document illisible ou sans ligne exploitable. Reprenez la photo avec un meilleur éclairage.',
  429: 'Le service est occupé. Réessayez dans un instant.',
};

export function openImportScreen({ readPhoto, readStock, commitStock, closeRoute }) {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'import-document-title');
  Object.assign(dialog.style, {
    width: 'min(92vw, 45rem)', maxHeight: '90dvh', overflow: 'auto',
    padding: '1.25rem', borderRadius: '1rem', color: '#eef5ff', background: '#101b2d',
  });
  dialog.innerHTML = `
    <h1 id="import-document-title">Importer une facture ou un bon de livraison</h1>
    <button type="button" data-close>Fermer</button>
    <p>La photo est transmise au service de lecture. Vérifiez les lignes avant de les ajouter au stock.</p>
    <p><button type="button" data-camera>Prendre une photo</button>
    <button type="button" data-gallery>Choisir une photo</button></p>
    <input hidden type="file" accept="image/*" capture="environment">
    <input hidden type="file" accept="image/jpeg,image/png,image/webp">
    <p role="status" aria-live="polite"></p>
    <form hidden>
      <p><label>Type de document <select name="kind"><option value="invoice">Facture</option><option value="delivery">Bon de livraison</option><option value="" selected>À vérifier</option></select></label></p>
      <p><label>Fournisseur <input name="supplier" maxlength="250" required></label></p>
      <p><label>Date du document <input name="date" type="date"></label></p>
      <p><label>Numéro du document <input name="number" maxlength="100"></label></p>
      <p>Pour une référence existante, la quantité est ajoutée au stock. Un prix renseigné remplace le prix actuel. Si un prix manque, vous pouvez conserver le prix d’un produit existant.</p>
      <div data-lines></div>
      <p><label><input name="verified" type="checkbox" required> J’ai vérifié les lignes et je confirme que les produits sont entrés en stock.</label></p>
      <button type="submit">Confirmer l’ajout au stock</button>
    </form>`;
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role="status"]');
  const lines = dialog.querySelector('[data-lines]');
  const [camera, gallery] = dialog.querySelectorAll('input[type=file]');
  const controller = new AbortController();
  let photoHash;
  let reading = false;

  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.querySelector('[data-camera]').onclick = () => camera.click();
  dialog.querySelector('[data-gallery]').onclick = () => gallery.click();
  dialog.addEventListener('close', () => {
    controller.abort();
    dialog.remove();
    closeRoute();
  }, { once: true });

  for (const picker of [camera, gallery]) {
    picker.addEventListener('change', async () => {
      const file = picker.files[0];
      picker.value = '';
      if (!file || reading) return;
      form.hidden = true;
      lines.replaceChildren();
      form.reset();
      if (file.size > 8 * 1024 * 1024) {
        status.textContent = messages[413];
        return;
      }
      reading = true;
      status.textContent = 'Lecture de la photo…';
      try {
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        const result = await readPhoto(bytes, controller.signal);
        if (controller.signal.aborted) return;
        photoHash = hash;
        for (const key of ['kind', 'supplier', 'date', 'number']) {
          form.elements[key].value = result[key] ?? '';
        }
        result.lines.forEach((row, index) => lines.append(buildRow(row, index)));
        form.hidden = false;
        status.textContent = result.lines.length + ' ligne(s) à relire avant confirmation.';
      } catch (error) {
        if (!controller.signal.aborted) {
          status.textContent = messages[error.status] ?? 'Lecture indisponible. Réessayez ou choisissez une autre photo.';
        }
      } finally {
        reading = false;
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = form.elements;
    const rows = Array.from(lines.querySelectorAll('fieldset'), (row) => ({
      id: row.querySelector('[name=id]').value.trim(),
      name: row.querySelector('[name=product]').value.trim(),
      qty: row.querySelector('[name=qty]').valueAsNumber,
      price: row.querySelector('[name=price]').value === '' ? null : row.querySelector('[name=price]').valueAsNumber,
    }));
    if (!fields.kind.value || !fields.supplier.value.trim() || !rows.length) {
      status.textContent = 'Renseignez le type, le fournisseur et au moins une ligne.';
      return;
    }
    try {
      const next = applyDocument(readStock(), {
        kind: fields.kind.value,
        supplier: fields.supplier.value.trim(),
        date: fields.date.value,
        number: fields.number.value.trim(),
        lines: rows,
      }, photoHash);
      commitStock(next);
      form.hidden = true;
      status.textContent = rows.length + ' ligne(s) ajoutée(s) au stock de cet appareil.';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function buildRow(row, index) {
  const fieldset = document.createElement('fieldset');
  fieldset.innerHTML = `
    <legend></legend>
    <p><label>Nom <input name="product" maxlength="250" required></label></p>
    <p><label>Référence <input name="id" maxlength="100" required></label></p>
    <p><label>Quantité <input name="qty" type="number" min="1" max="1000000" step="1" required></label></p>
    <p><label>Prix unitaire HT (€) <input name="price" type="number" min="0" max="100000000" step="any"></label></p>
    <button type="button">Retirer la ligne</button>`;
  fieldset.querySelector('legend').textContent = 'Ligne ' + (index + 1) + (row.uncertain ? ' · À vérifier' : '');
  fieldset.querySelector('[name=product]').value = row.name ?? '';
  fieldset.querySelector('[name=id]').value = row.reference ?? '';
  fieldset.querySelector('[name=qty]').value = row.quantity ?? '';
  fieldset.querySelector('[name=price]').value = row.unitPrice ?? '';
  fieldset.querySelector('button').onclick = () => fieldset.remove();
  return fieldset;
}
