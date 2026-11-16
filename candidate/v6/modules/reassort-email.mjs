export function buildReorderEmail(order, products) {
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const items = order.lines.map((line) => {
    const product = productById.get(String(line.id));
    const reference = line.sku || product?.sku || (!order.serverOrderId ? String(line.id ?? '') : '');
    return '• ' + line.name + ' — Réf. ' + (reference || 'à renseigner') + ' — Quantité : ' + line.qty;
  });
  const greeting = order.supplier ? 'Bonjour ' + order.supplier + ',' : 'Bonjour,';
  return {
    subject: 'Demande de disponibilité et de délai – réassort ' + order.id,
    body: [
      greeting,
      '',
      'Pouvez-vous nous confirmer la disponibilité et le délai de livraison pour les articles suivants ?',
      '',
      ...items,
      '',
      'Merci pour votre retour.',
      '',
      'Cordialement,',
      '[Votre nom]',
      '[Votre entreprise]',
    ].join('\n'),
  };
}

export function buildMailto(recipient, subject, body) {
  const encode = (value) => encodeURIComponent(value.toWellFormed());
  const address = encode(recipient).replace('%40', '@');
  return 'mailto:' + address + '?subject=' + encode(subject.replace(/[\r\n]+/g, ' ').trim())
    + '&body=' + encode(body.replace(/\r?\n/g, '\r\n'));
}

export function openReorderEmail({getOrders, getProducts, getAccount, initialOrderId = '', isSent, markSent, closeRoute}) {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'spReorderEmailTitle');
  Object.assign(dialog.style, {
    width: 'min(92vw, 42rem)', maxHeight: '90dvh', overflow: 'auto',
    padding: '1.25rem', borderRadius: '1rem', color: '#eef5ff', background: '#101b2d',
  });
  dialog.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <h2 id="spReorderEmailTitle">E-mail de réassort</h2>
      <button class="btn" type="button" data-close aria-label="Fermer" style="padding:4px 10px;font-size:1.25rem;line-height:1.2">×</button>
    </div>
    <label for="spReorderOrder">Commande validée</label>
    <select id="spReorderOrder" style="display:block;width:100%;margin:8px 0"></select>
    <p data-empty></p>
    <form hidden>
      <p>
        <label for="spReorderRecipient">Destinataire</label>
        <small id="spReorderRecipientHelp" style="display:block">E-mail du fournisseur</small>
        <input id="spReorderRecipient" name="recipient" type="email" aria-describedby="spReorderRecipientHelp spReorderRecipientMissing" style="display:block;width:100%;box-sizing:border-box">
        <small id="spReorderRecipientMissing" hidden>Aucun e-mail fournisseur : saisissez-le ou copiez le brouillon.</small>
      </p>
      <p><label>Objet <input name="subject" required style="display:block;width:100%;box-sizing:border-box"></label></p>
      <p><label>Message <textarea name="body" rows="12" required style="display:block;width:100%;box-sizing:border-box;line-height:1.35;min-height:6em;max-height:max(6em,42dvh);overflow-y:auto;field-sizing:content"></textarea></label></p>
      <div class="actions">
        <button class="btn main" type="submit">Ouvrir dans ma messagerie</button>
        <button class="btn" type="button" data-copy>Copier le brouillon</button>
      </div>
      <p role="status" aria-live="polite"></p>
      <div data-sent-actions hidden>
        <p>Une fois le message envoyé depuis votre messagerie, indiquez-le ici.</p>
        <button class="btn" type="button" data-mark-sent>Marquer comme envoyée</button>
      </div>
    </form>`;

  const select = dialog.querySelector('select');
  const empty = dialog.querySelector('[data-empty]');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role=status]');
  const fields = form.elements;
  const missingRecipient = dialog.querySelector('#spReorderRecipientMissing');
  const sentActions = dialog.querySelector('[data-sent-actions]');
  const preparedOrders = new Set();

  function updateSentAction() {
    sentActions.hidden = !preparedOrders.has(selected) || isSent(selected);
  }
  function updateRecipientHelp() {
    missingRecipient.hidden = Boolean(fields.recipient.value.trim());
  }
  let account = getAccount();
  let selected = '';
  let orders = new Map();

  function fill() {
    selected = select.value;
    const order = orders.get(selected);
    form.reset();
    form.hidden = !order;
    status.textContent = '';
    if (!order) return;
    const draft = buildReorderEmail(order, getProducts());
    fields.recipient.value = order.supplierEmail ?? '';
    updateRecipientHelp();
    updateSentAction();
    fields.subject.value = draft.subject;
    fields.body.value = draft.body;
  }

  function refresh() {
    if (account !== getAccount()) {
      account = getAccount();
      selected = '';
      preparedOrders.clear();
      form.reset();
    }
    orders = new Map(getOrders()
      .filter((order) => order.status === 'validée' && order.lines?.length)
      .map((order) => [String(order.serverOrderId || order.id), order]));
    const placeholder = new Option('Sélectionnez une commande', '');
    select.replaceChildren(placeholder);
    for (const [id, order] of orders) {
      const label = order.supplier ? order.id + ' · ' + order.supplier : order.id;
      select.append(new Option(label, id));
    }
    select.disabled = !orders.size;
    empty.textContent = orders.size ? '' : 'Aucune commande validée à préparer.';
    if (orders.has(selected)) {
      select.value = selected;
      updateSentAction();
    } else fill();
  }

  select.addEventListener('change', fill);
  fields.recipient.addEventListener('input', updateRecipientHelp);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (account !== getAccount() || !orders.has(selected)) return;
    const link = buildMailto(fields.recipient.value.trim(), fields.subject.value, fields.body.value);
    if (link.length > 1800) {
      status.textContent = 'Le brouillon est long. Copiez-le puis collez-le dans votre messagerie.';
      return;
    }
    status.textContent = 'Si votre messagerie ne s’ouvre pas, utilisez « Copier le brouillon ».';
    preparedOrders.add(selected);
    updateSentAction();
    window.location.href = link;
  });
  dialog.querySelector('[data-copy]').addEventListener('click', async () => {
    if (account !== getAccount() || !orders.has(selected)) return;
    const copiedAccount = account;
    const copiedOrder = orders.get(selected);
    const copiedId = selected;
    const recipient = fields.recipient.value.trim();
    const text = (recipient ? 'À : ' + recipient + '\n' : '') + 'Objet : ' + fields.subject.value + '\n\n' + fields.body.value;
    try {
      await navigator.clipboard.writeText(text);
      if (copiedAccount !== getAccount() || orders.get(copiedId) !== copiedOrder) return;
      preparedOrders.add(copiedId);
      updateSentAction();
      if (selected === copiedId) status.textContent = 'Brouillon copié.';
    } catch {
      if (copiedAccount !== getAccount() || selected !== copiedId || orders.get(copiedId) !== copiedOrder) return;
      fields.body.select();
      status.textContent = 'Copiez le texte sélectionné, puis collez-le dans votre messagerie.';
    }
  });
  fields.body.addEventListener('copy', () => {
    if (account !== getAccount() || !orders.has(selected) || fields.body.selectionStart === fields.body.selectionEnd) return;
    preparedOrders.add(selected);
    updateSentAction();
  });
  dialog.querySelector('[data-mark-sent]').addEventListener('click', () => {
    if (account !== getAccount() || !orders.has(selected) || !preparedOrders.has(selected)) return;
    status.textContent = markSent(selected) ? 'Commande marquée comme envoyée.' : 'Le statut n’a pas pu être enregistré.';
    updateSentAction();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    window.removeEventListener('stockpilot:orders-rendered', refresh);
    dialog.remove();
    closeRoute();
  }, {once:true});
  window.addEventListener('stockpilot:orders-rendered', refresh);
  document.body.append(dialog);
  refresh();
  if (orders.has(initialOrderId)) {
    select.value = initialOrderId;
    fill();
  }
  dialog.showModal();
  return dialog;
}
