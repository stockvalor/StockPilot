export function buildReorderEmail(order, products) {
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const items = order.lines.map((line) => {
    const product = productById.get(String(line.id));
    const reference = line.sku || product?.sku || (!order.serverOrderId ? String(line.id ?? '') : '');
    return '• ' + line.name + ' — Réf. ' + (reference || 'à renseigner') + ' — Quantité : ' + line.qty;
  });
  const greeting = order.supplier ? 'Bonjour ' + order.supplier + ',' : 'Bonjour,';
  return {
    subject: 'Commande de réassort ' + order.id,
    body: [
      greeting,
      '',
      'Pouvez-vous nous confirmer la disponibilité et le délai de livraison pour les articles suivants ?',
      '',
      ...items,
      '',
      'Merci,',
      'Cordialement',
    ].join('\n'),
  };
}

export function buildMailto(recipient, subject, body) {
  const encode = (value) => encodeURIComponent(value.toWellFormed());
  const address = encode(recipient).replace('%40', '@');
  return 'mailto:' + address + '?subject=' + encode(subject.replace(/[\r\n]+/g, ' ').trim())
    + '&body=' + encode(body.replace(/\r?\n/g, '\r\n'));
}

export function openReorderEmail({getOrders, getProducts, getAccount, closeRoute}) {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'spReorderEmailTitle');
  Object.assign(dialog.style, {
    width: 'min(92vw, 42rem)', maxHeight: '90dvh', overflow: 'auto',
    padding: '1.25rem', borderRadius: '1rem', color: '#eef5ff', background: '#101b2d',
  });
  dialog.innerHTML = `
    <div class="actions">
      <h2 id="spReorderEmailTitle">E-mail de réassort</h2>
      <button class="btn" type="button" data-close>Fermer</button>
    </div>
    <label for="spReorderOrder">Commande validée</label>
    <select id="spReorderOrder" style="display:block;width:100%;margin:8px 0"></select>
    <p data-empty></p>
    <form hidden>
      <p><label>Destinataire <input name="recipient" type="email" style="display:block;width:100%;box-sizing:border-box"></label></p>
      <p><label>Objet <input name="subject" required style="display:block;width:100%;box-sizing:border-box"></label></p>
      <p><label>Message <textarea name="body" rows="11" required style="display:block;width:100%;box-sizing:border-box"></textarea></label></p>
      <div class="actions">
        <button class="btn main" type="submit">Ouvrir dans ma messagerie</button>
        <button class="btn" type="button" data-copy>Copier le brouillon</button>
      </div>
      <p role="status" aria-live="polite"></p>
    </form>`;

  const select = dialog.querySelector('select');
  const empty = dialog.querySelector('[data-empty]');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role=status]');
  const fields = form.elements;
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
    fields.subject.value = draft.subject;
    fields.body.value = draft.body;
  }

  function refresh() {
    if (account !== getAccount()) {
      account = getAccount();
      selected = '';
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
    if (orders.has(selected)) select.value = selected;
    else fill();
  }

  select.addEventListener('change', fill);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (account !== getAccount() || !orders.has(selected)) return;
    const link = buildMailto(fields.recipient.value.trim(), fields.subject.value, fields.body.value);
    if (link.length > 1800) {
      status.textContent = 'Le brouillon est long. Copiez-le puis collez-le dans votre messagerie.';
      return;
    }
    status.textContent = 'Si votre messagerie ne s’ouvre pas, utilisez « Copier le brouillon ».';
    window.location.href = link;
  });
  dialog.querySelector('[data-copy]').addEventListener('click', async () => {
    if (account !== getAccount() || !orders.has(selected)) return;
    const recipient = fields.recipient.value.trim();
    const text = (recipient ? 'À : ' + recipient + '\n' : '') + 'Objet : ' + fields.subject.value + '\n\n' + fields.body.value;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Brouillon copié.';
    } catch {
      fields.body.select();
      status.textContent = 'Copiez le texte sélectionné, puis collez-le dans votre messagerie.';
    }
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
  dialog.showModal();
  return dialog;
}
