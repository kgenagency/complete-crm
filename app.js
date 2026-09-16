/* ================= COMPLETE CRM · HARIZMA modul ================= */
const SUPABASE_URL = window.CRM_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.CRM_SUPABASE_ANON_KEY || '';
const AUTH_DOMAIN = 'complete-crm.local';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUSES = [
  { key: 'new', label: 'Nova' },
  { key: 'confirmed', label: 'Potvrđena' },
  { key: 'packed', label: 'Spakovana' },
  { key: 'shipped', label: 'Poslata' },
  { key: 'delivered', label: 'Isporučena' },
  { key: 'returned', label: 'Vraćena' },
  { key: 'cancelled', label: 'Otkazana' },
];
const ST = Object.fromEntries(STATUSES.map(s => [s.key, s.label]));
const NO_STOCK = ['cancelled', 'returned'];           // ove porudžbine ne drže robu
const NO_REVENUE = ['cancelled', 'returned'];
const TODO = ['new', 'confirmed', 'packed'];
const CH = { shopify: 'Shopify', instagram: 'Instagram', other: 'Drugo' };
const PAY = { cod: 'Pouzeće', card: 'Kartica', bank: 'Uplata' };
const LOW_STOCK = 1;

const LS = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

let state = {
  user: null,
  products: [], variants: [], orders: [], items: [], ads: [], acts: [],
  tab: LS.get('crm_tab', 'overview'),
  period: +LS.get('crm_period', '30'),
  orderView: LS.get('crm_oview', 'table'),
  ch: 'all', status: 'all', q: '',
  openOrderId: null, dTab: 'info',
  editOrderId: null, editProductId: null,
  attach: null,
};

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v) => Number(v) || 0;
const rsd = (v) => Math.round(n(v)).toLocaleString('sr-Latn-RS') + ' RSD';
const pct = (v) => (isFinite(v) ? Math.round(v * 100) + '%' : '—');
function fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }); }
function fmtDT(iso) { const d = new Date(iso); return d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }); }
function dayStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function linkify(t) { return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); }
function pill(s) { return `<span class="pill st-${s}"><span class="pdot"></span>${ST[s] || s}</span>`; }
function chBadge(c) { return `<span class="ch-badge ch-${c}">${CH[c] || c}</span>`; }
function fail(e) { console.error(e); toast('Greška: ' + (e.message || e)); }
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }

const itemsOf = (oid) => state.items.filter(i => i.order_id === oid);
const variantsOf = (pid) => state.variants.filter(v => v.product_id === pid).sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
const product = (id) => state.products.find(p => p.id === id);
const variant = (id) => state.variants.find(v => v.id === id);
const order = (id) => state.orders.find(o => o.id === id);
function sizeRank(s) { const o = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'UNI']; const i = o.indexOf(String(s).toUpperCase()); return i < 0 ? 50 + (parseFloat(s) || 0) : i; }

function totals(o) {
  const its = itemsOf(o.id);
  const itemsTotal = its.reduce((a, i) => a + i.qty * n(i.unit_price), 0);
  const itemsCost = its.reduce((a, i) => a + i.qty * n(i.unit_cost), 0);
  const revenue = itemsTotal + n(o.shipping_price) - n(o.discount);
  const profit = itemsTotal - n(o.discount) - itemsCost - n(o.packaging_cost) - (n(o.shipping_cost) - n(o.shipping_price));
  return { itemsTotal, itemsCost, revenue, profit, pieces: its.reduce((a, i) => a + i.qty, 0) };
}
function inPeriod(iso, days) {
  if (!days) return true;
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  return new Date(iso) >= start;
}

/* ---------------- auth ---------------- */
async function signIn(username, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: `${username.toLowerCase().trim()}@${AUTH_DOMAIN}`, password });
  if (error) throw error;
  return userFrom(data.user);
}
function userFrom(u) { const un = u.email.split('@')[0]; return { username: un, display: u.user_metadata?.display_name || un }; }

/* ---------------- data ---------------- */
async function loadData() {
  const [products, variants, orders, items, ads, acts] = await Promise.all([
    q(sb.from('h_products').select('*').order('created_at', { ascending: false })),
    q(sb.from('h_variants').select('*')),
    q(sb.from('h_orders').select('*').order('created_at', { ascending: false })),
    q(sb.from('h_order_items').select('*')),
    q(sb.from('h_ad_spend').select('*').order('day', { ascending: false })),
    q(sb.from('h_activities').select('*').order('created_at', { ascending: true })),
  ]);
  Object.assign(state, { products, variants, orders, items, ads, acts });
}

async function log(fields) {
  const row = await q(sb.from('h_activities').insert({ author: state.user.display, ...fields }).select().single());
  state.acts.push(row);
  return row;
}

async function adjustStock(orderItems, sign) {
  for (const it of orderItems) {
    const v = variant(it.variant_id);
    if (!v) continue;
    const ns = v.stock + sign * it.qty;
    await q(sb.from('h_variants').update({ stock: ns }).eq('id', v.id));
    v.stock = ns;
  }
}

async function setOrderStatus(o, ns) {
  if (o.status === ns) return;
  const old = o.status;
  const patch = { status: ns };
  if (ns === 'shipped' && !o.shipped_at) patch.shipped_at = new Date().toISOString();
  if (ns === 'delivered' && !o.delivered_at) patch.delivered_at = new Date().toISOString();
  try {
    await q(sb.from('h_orders').update(patch).eq('id', o.id));
    Object.assign(o, patch);
    const wasHold = !NO_STOCK.includes(old), isHold = !NO_STOCK.includes(ns);
    if (wasHold !== isHold) await adjustStock(itemsOf(o.id), isHold ? -1 : +1);
    let body = `Status: ${ST[old]} → ${ST[ns]}`;
    if (wasHold !== isHold) body += isHold ? ' (roba skinuta sa stanja)' : ' (roba vraćena na stanje)';
    await log({ order_id: o.id, type: 'status', body });
    renderAll();
    toast(`${o.order_no || 'Porudžbina'} → ${ST[ns]}`);
  } catch (e) { fail(e); }
}

async function uploadImage(file, folder) {
  const path = `${folder}/${Date.now()}_${(file.name || 'screenshot.png').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await q(sb.storage.from('screenshots').upload(path, file));
  return sb.storage.from('screenshots').getPublicUrl(path).data.publicUrl;
}

function nextOrderNo(channel) {
  const pre = channel === 'shopify' ? '#' : channel === 'instagram' ? 'IG-' : 'OR-';
  let max = 0;
  state.orders.forEach(o => { if ((o.order_no || '').startsWith(pre)) max = Math.max(max, parseInt(o.order_no.slice(pre.length)) || 0); });
  return pre + String(max + 1).padStart(pre === '#' ? 4 : 3, '0');
}

/* ---------------- render: overview ---------------- */
function stat(label, value, note) {
  return `<div class="stat"><div class="stat-label"><span class="stat-dot"></span>${label}</div><div class="stat-value">${value}</div>${note ? `<div class="stat-note">${note}</div>` : ''}</div>`;
}
function renderOverview() {
  const P = state.period;
  const os = state.orders.filter(o => inPeriod(o.created_at, P) && !NO_REVENUE.includes(o.status));
  let rev = 0, prof = 0, pcs = 0;
  os.forEach(o => { const t = totals(o); rev += t.revenue; prof += t.profit; pcs += t.pieces; });
  const spend = state.ads.filter(a => inPeriod(a.day + 'T12:00:00', P)).reduce((a, x) => a + n(x.spend), 0);
  const returned = state.orders.filter(o => inPeriod(o.created_at, P) && o.status === 'returned').length;
  const all = state.orders.filter(o => inPeriod(o.created_at, P)).length;
  $('kpi1').innerHTML =
    stat('Prihod', rsd(rev), `<b>${os.length}</b> porudžbina · <b>${pcs}</b> kom`) +
    stat('Bruto profit', rsd(prof), `marža <b>${rev ? pct(prof / rev) : '—'}</b>`) +
    stat('Reklame', rsd(spend), `ROAS <b>${spend ? (rev / spend).toFixed(2) + 'x' : '—'}</b>`) +
    stat('Neto (posle reklama)', `<span class="${prof - spend >= 0 ? 'pos' : 'neg'}">${rsd(prof - spend)}</span>`, `prosečna korpa <b>${os.length ? rsd(rev / os.length) : '—'}</b>`);
  let stockPcs = 0, stockCost = 0, stockSell = 0;
  state.products.filter(p => p.status !== 'archived').forEach(p => variantsOf(p.id).forEach(v => { stockPcs += v.stock; stockCost += v.stock * n(p.buy_price); stockSell += v.stock * n(p.sell_price); }));
  const todo = state.orders.filter(o => TODO.includes(o.status));
  $('kpi2').innerHTML =
    stat('Za obradu', todo.length, `nove, potvrđene, spakovane`) +
    stat('Komada na stanju', stockPcs, `<b>${state.products.filter(p => p.status === 'active').length}</b> aktivnih modela`) +
    stat('Vrednost robe (nabavna)', rsd(stockCost), `po prodajnoj <b>${rsd(stockSell)}</b>`) +
    stat('Povraćaji', returned, `od <b>${all}</b> porudžbina (${all ? pct(returned / all) : '—'})`);

  $('todoCount').textContent = todo.length;
  $('todoList').innerHTML = todo.slice().reverse().map(o => `<div class="list-row" data-order="${o.id}"><span><b>${esc(o.order_no)}</b> · ${esc(o.customer_name)}</span>${pill(o.status)}</div>`).join('') || '<div class="kb-empty">Sve je obrađeno.</div>';

  const low = [];
  state.products.filter(p => p.status === 'active').forEach(p => variantsOf(p.id).forEach(v => { if (v.stock <= LOW_STOCK) low.push({ p, v }); }));
  $('lowCount').textContent = low.length;
  $('lowList').innerHTML = low.map(({ p, v }) => `<div class="list-row" data-goto="products"><span><b>${esc(p.name)}</b> · ${esc(v.size)}${v.color ? ' · ' + esc(v.color) : ''}</span><span class="num ${v.stock <= 0 ? 'neg' : ''}">${v.stock} kom</span></div>`).join('') || '<div class="kb-empty">Sve veličine imaju zalihu.</div>';

  const sold = {};
  os.forEach(o => itemsOf(o.id).forEach(i => { const k = i.product_id || i.name; sold[k] = sold[k] || { name: i.name, qty: 0, rev: 0 }; sold[k].qty += i.qty; sold[k].rev += i.qty * n(i.unit_price); }));
  $('topList').innerHTML = Object.values(sold).sort((a, b) => b.qty - a.qty).slice(0, 6).map(s => `<div class="list-row"><span><b>${esc(s.name)}</b></span><span class="num">${s.qty} kom · ${rsd(s.rev)}</span></div>`).join('') || '<div class="kb-empty">Još nema prodaje u ovom periodu.</div>';

  const ship = state.orders.filter(o => o.status === 'shipped');
  const cod = ship.filter(o => o.payment === 'cod').reduce((a, o) => a + totals(o).revenue, 0);
  $('shipList').innerHTML = (ship.length ? `<div class="list-row" style="cursor:default"><span>Pouzeće na putu</span><b class="num">${rsd(cod)}</b></div>` : '') +
    (ship.map(o => `<div class="list-row" data-order="${o.id}"><span><b>${esc(o.order_no)}</b> · ${esc(o.customer_name)}</span><span class="page-sub">${esc(o.courier || '')} ${esc(o.tracking_no || '')}</span></div>`).join('') || '<div class="kb-empty">Ništa trenutno nije kod kurira.</div>');
}

/* ---------------- render: orders ---------------- */
function filteredOrders() {
  const qq = state.q.toLowerCase();
  return state.orders.filter(o => {
    if (state.ch !== 'all' && o.channel !== state.ch) return false;
    if (state.status !== 'all' && o.status !== state.status) return false;
    if (qq) {
      const hay = [o.order_no, o.customer_name, o.phone, o.instagram, o.email, o.city, o.tracking_no, ...itemsOf(o.id).map(i => i.name)].join(' ').toLowerCase();
      if (!hay.includes(qq)) return false;
    }
    return true;
  });
}
function itemsSummary(o) { return itemsOf(o.id).map(i => `${esc(i.name)} ${esc(i.size || '')}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', ') || '—'; }
function renderOrders() {
  const list = filteredOrders();
  $('orderCount').textContent = `${list.length} porudžbina`;
  const isTable = state.orderView === 'table';
  $('orderTableCard').style.display = isTable ? '' : 'none';
  $('kanban').style.display = isTable ? 'none' : 'flex';
  document.querySelectorAll('#orderViewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === state.orderView));
  if (isTable) {
    $('orderTbody').innerHTML = list.map(o => {
      const t = totals(o);
      return `<tr data-order="${o.id}">
        <td><b>${esc(o.order_no || '—')}</b></td>
        <td><div class="lead-name">${esc(o.customer_name)}</div><div class="lead-social">${esc(o.instagram || o.phone || '')}${o.city ? ' · ' + esc(o.city) : ''}</div></td>
        <td class="activity-cell" title="${itemsSummary(o)}">${itemsSummary(o)}</td>
        <td>${chBadge(o.channel)}</td>
        <td>${pill(o.status)}</td>
        <td class="num">${rsd(t.revenue)}</td>
        <td class="num ${t.profit >= 0 ? 'pos' : 'neg'}">${rsd(t.profit)}</td>
        <td class="date-cell">${fmtDate(o.created_at)}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="empty">Nema porudžbina. Klikni „Nova porudžbina“.</td></tr>`;
  } else {
    $('kanban').innerHTML = STATUSES.map(s => {
      const col = list.filter(o => o.status === s.key);
      return `<div class="kb-col" data-status="${s.key}">
        <div class="kb-col-head"><span class="kb-col-title">${s.label}</span><span class="kb-col-count">${col.length}</span></div>
        <div class="kb-cards">${col.map(o => `<div class="kb-card is-organic" data-id="${o.id}" data-order="${o.id}">
          <div class="kb-card-head"><div class="kb-name">${esc(o.customer_name)}</div><b class="page-sub">${esc(o.order_no || '')}</b></div>
          <div class="kb-social">${itemsSummary(o)}</div>
          <div class="kb-meta">${chBadge(o.channel)}<span class="kb-fu">${rsd(totals(o).revenue)}</span></div></div>`).join('') || '<div class="kb-empty">Prazno</div>'}</div></div>`;
    }).join('');
  }
}

/* kanban drag (preuzeto iz KGEN CRM) */
let drag = null, justDragged = false;
function kbPointerDown(e) {
  if (e.button && e.button !== 0) return;
  const card = e.target.closest('.kb-card'); if (!card) return;
  const isTouch = e.pointerType === 'touch';
  drag = { id: card.dataset.id, card, sx: e.clientX, sy: e.clientY, moved: false, ready: !isTouch, ghost: null };
  if (isTouch) drag.hold = setTimeout(() => { if (drag) { drag.ready = true; if (navigator.vibrate) navigator.vibrate(12); } }, 240);
  window.addEventListener('pointermove', kbPointerMove, { passive: false });
  window.addEventListener('pointerup', kbPointerUp);
  window.addEventListener('pointercancel', kbPointerUp);
}
function kbPointerMove(e) {
  if (!drag) return;
  const dist = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
  if (!drag.ready) { if (dist > 8) kbCleanup(); return; }
  if (!drag.moved) {
    if (dist < 5) return;
    drag.moved = true;
    const r = drag.card.getBoundingClientRect();
    drag.ox = drag.sx - r.left; drag.oy = drag.sy - r.top;
    const g = drag.card.cloneNode(true); g.classList.add('kb-drag-ghost'); g.style.width = r.width + 'px';
    document.body.appendChild(g); drag.ghost = g;
    drag.card.classList.add('dragging'); document.body.classList.add('kb-dragging');
  }
  drag.ghost.style.left = (e.clientX - drag.ox) + 'px';
  drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const col = under && under.closest('.kb-col');
  document.querySelectorAll('.kb-col').forEach(c => c.classList.toggle('drop-target', c === col));
  drag.overCol = col;
  const kb = $('kanban'), kr = kb.getBoundingClientRect();
  if (e.clientX > kr.right - 60) kb.scrollLeft += 14; else if (e.clientX < kr.left + 60) kb.scrollLeft -= 14;
  e.preventDefault();
}
function kbPointerUp() {
  if (!drag) return;
  const d = drag; kbCleanup();
  if (!d.moved) return;
  justDragged = true; setTimeout(() => { justDragged = false; }, 80);
  if (d.overCol && d.overCol.dataset.status) { const o = order(d.id); if (o) setOrderStatus(o, d.overCol.dataset.status); }
}
function kbCleanup() {
  window.removeEventListener('pointermove', kbPointerMove);
  window.removeEventListener('pointerup', kbPointerUp);
  window.removeEventListener('pointercancel', kbPointerUp);
  if (drag) { if (drag.hold) clearTimeout(drag.hold); if (drag.ghost) drag.ghost.remove(); if (drag.card) drag.card.classList.remove('dragging'); }
  document.body.classList.remove('kb-dragging');
  document.querySelectorAll('.kb-col').forEach(c => c.classList.remove('drop-target'));
  drag = null;
}

/* ---------------- render: products ---------------- */
function soldQty(pid) {
  return state.items.filter(i => i.product_id === pid && !NO_REVENUE.includes(order(i.order_id)?.status)).reduce((a, i) => a + i.qty, 0);
}
function renderProducts() {
  const qq = state.q.toLowerCase();
  const list = state.products.filter(p => !qq || [p.name, p.category, p.supplier].join(' ').toLowerCase().includes(qq))
    .sort((a, b) => (a.status === 'archived') - (b.status === 'archived'));
  let pcs = 0, cost = 0, models = 0, marg = 0;
  state.products.filter(p => p.status !== 'archived').forEach(p => {
    models++; marg += n(p.sell_price) ? (n(p.sell_price) - n(p.buy_price)) / n(p.sell_price) : 0;
    variantsOf(p.id).forEach(v => { pcs += v.stock; cost += v.stock * n(p.buy_price); });
  });
  $('kpiStock').innerHTML = stat('Modela', models) + stat('Komada', pcs) + stat('Uloženo u robu', rsd(cost)) + stat('Prosečna marža', models ? pct(marg / models) : '—');
  $('prodTbody').innerHTML = list.map(p => {
    const m = n(p.sell_price) - n(p.buy_price);
    const vs = variantsOf(p.id);
    return `<tr data-product="${p.id}">
      <td><div class="prod-cell">${p.image_url ? `<img class="prod-thumb" src="${esc(p.image_url)}" alt="">` : '<div class="prod-thumb"></div>'}<div><div class="lead-name">${esc(p.name)}</div><div class="lead-social">${esc(p.category || '')}${p.supplier ? ' · ' + esc(p.supplier) : ''}</div></div></div></td>
      <td><div class="sizes">${vs.map(v => `<span class="size-chip ${v.stock <= LOW_STOCK ? 'low' : ''}"><span class="sz">${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''}</span><button data-stock="${v.id}" data-d="-1">−</button><span class="qty">${v.stock}</span><button data-stock="${v.id}" data-d="1">+</button></span>`).join('') || '<span class="page-sub">Dodaj veličine</span>'}</div></td>
      <td class="num">${rsd(p.buy_price)}</td>
      <td class="num">${rsd(p.sell_price)}${p.compare_price ? `<div class="page-sub"><s>${rsd(p.compare_price)}</s></div>` : ''}</td>
      <td class="num">${rsd(m)}<div class="page-sub">${n(p.sell_price) ? pct(m / n(p.sell_price)) : '—'} · ${n(p.buy_price) ? (n(p.sell_price) / n(p.buy_price)).toFixed(1) + 'x' : ''}</div></td>
      <td class="num">${soldQty(p.id)}</td>
      <td><span class="pill ${p.status === 'active' ? 'st-delivered' : p.status === 'draft' ? 'st-confirmed' : 'st-cancelled'}">${{ active: 'Aktivan', draft: 'Priprema', archived: 'Arhiviran' }[p.status]}</span></td></tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">Još nema robe. Klikni „Novi komad“.</td></tr>`;
}
async function bumpStock(vid, d) {
  const v = variant(vid); if (!v) return;
  const ns = Math.max(0, v.stock + d);
  try {
    await q(sb.from('h_variants').update({ stock: ns }).eq('id', vid));
    await log({ product_id: v.product_id, type: 'stock', body: `${product(v.product_id)?.name} ${v.size}: ${v.stock} → ${ns}` });
    v.stock = ns; renderAll();
  } catch (e) { fail(e); }
}

/* ---------------- render: ads ---------------- */
function renderAds() {
  const byDay = {};
  state.orders.filter(o => !NO_REVENUE.includes(o.status)).forEach(o => { const d = dayStr(new Date(o.created_at)); byDay[d] = byDay[d] || { c: 0, r: 0 }; byDay[d].c++; byDay[d].r += totals(o).revenue; });
  const P = state.period;
  const ads = state.ads.filter(a => inPeriod(a.day + 'T12:00:00', P));
  const spend = ads.reduce((a, x) => a + n(x.spend), 0);
  const days = new Set(ads.map(a => a.day));
  let rev = 0, cnt = 0; days.forEach(d => { if (byDay[d]) { rev += byDay[d].r; cnt += byDay[d].c; } });
  const metaRev = ads.reduce((a, x) => a + n(x.revenue), 0);
  $('kpiAds').innerHTML = stat('Potrošeno', rsd(spend), `period: ${P ? P + ' dana' : 'sve'}`) +
    stat('ROAS (CRM)', spend ? (rev / spend).toFixed(2) + 'x' : '—', `prihod tih dana <b>${rsd(rev)}</b>`) +
    stat('Cena po porudžbini', cnt ? rsd(spend / cnt) : '—', `<b>${cnt}</b> porudžbina tih dana`) +
    stat('ROAS (Meta)', spend && metaRev ? (metaRev / spend).toFixed(2) + 'x' : '—', 'kako Meta prijavljuje');
  $('adTbody').innerHTML = state.ads.map(a => `<tr style="cursor:default"><td>${fmtDate(a.day + 'T12:00:00')}</td><td>${esc(a.campaign)}</td><td class="num">${rsd(a.spend)}</td><td class="num">${a.purchases ?? '—'}</td><td class="num">${a.revenue != null ? rsd(a.revenue) : '—'}</td><td class="num">${byDay[a.day] ? `${byDay[a.day].c} · ${rsd(byDay[a.day].r)}` : '—'}</td><td><button class="x-btn" data-delad="${a.id}" title="Obriši">×</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">Još nema unosa.</td></tr>`;
}

/* ---------------- drawer ---------------- */
function openDrawer(id) { state.openOrderId = id; state.dTab = 'info'; renderDrawer(); $('drawer').classList.add('open'); $('overlay').classList.add('open'); }
function closeDrawer() { state.openOrderId = null; $('drawer').classList.remove('open'); $('overlay').classList.remove('open'); clearAttach(); }
function renderDrawer() {
  const o = order(state.openOrderId); if (!o) return closeDrawer();
  const t = totals(o);
  $('dTitle').textContent = o.customer_name;
  $('dSub').textContent = `${o.order_no || ''} · ${fmtDT(o.created_at)}`;
  $('dBadges').innerHTML = pill(o.status) + chBadge(o.channel) + `<span class="ch-badge ch-other">${PAY[o.payment]}</span>`;
  document.querySelectorAll('#dTabs button').forEach(b => b.classList.toggle('active', b.dataset.dt === state.dTab));
  $('composer').style.display = state.dTab === 'activity' ? '' : 'none';
  if (state.dTab === 'info') {
    const row = (k, v) => v ? `<div class="info-row"><div class="k">${k}</div><div class="v">${v}</div></div>` : '';
    $('dBody').innerHTML = `
      <div class="status-select-row"><label>Status</label><div class="select-wrap"><select id="dStatus">${STATUSES.map(s => `<option value="${s.key}" ${s.key === o.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div></div>
      <div class="sec-title">Kupac</div>
      <div class="info-grid">
        ${row('Telefon', o.phone ? `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>` : '')}
        ${row('Instagram', o.instagram ? `<a href="https://instagram.com/${esc(o.instagram.replace('@', ''))}" target="_blank">${esc(o.instagram)}</a>` : '')}
        ${row('Email', esc(o.email))}
        ${row('Adresa', esc([o.address, [o.postal_code, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')))}
        ${row('Napomena', linkify(o.note))}
      </div>
      <div class="sec-title">Artikli</div>
      ${itemsOf(o.id).map(i => `<div class="list-row" style="cursor:default"><span><b>${esc(i.name)}</b> · ${esc(i.size || '')} × ${i.qty}</span><span class="num">${rsd(i.qty * i.unit_price)}</span></div>`).join('') || '<div class="page-sub">Nema artikala</div>'}
      <div class="sum-box">
        <div><span>Artikli</span><span>${rsd(t.itemsTotal)}</span></div>
        ${n(o.discount) ? `<div><span>Popust ${esc(o.discount_code || '')}</span><span>−${rsd(o.discount)}</span></div>` : ''}
        <div><span>Dostava (kupac)</span><span>${rsd(o.shipping_price)}</span></div>
        <div class="tot"><span>Kupac plaća</span><span>${rsd(t.revenue)}</span></div>
        <div><span>Nabavna roba</span><span>−${rsd(t.itemsCost)}</span></div>
        <div><span>Kurir</span><span>−${rsd(o.shipping_cost)}</span></div>
        <div><span>Pakovanje</span><span>−${rsd(o.packaging_cost)}</span></div>
        <div class="tot"><span>Profit</span><span class="${t.profit >= 0 ? 'pos' : 'neg'}">${rsd(t.profit)}</span></div>
      </div>
      <div class="sec-title">Dostava</div>
      <div class="frow">
        <div class="field"><label>Kurir</label><input id="dCourier" class="inline-input" style="width:100%" list="couriers" value="${esc(o.courier || '')}"></div>
        <div class="field"><label>Broj pošiljke</label><input id="dTrack" class="inline-input" style="width:100%" value="${esc(o.tracking_no || '')}"></div>
      </div>
      ${row('Poslato', o.shipped_at ? fmtDT(o.shipped_at) : '')}${row('Isporučeno', o.delivered_at ? fmtDT(o.delivered_at) : '')}
      <div class="modal-actions" style="justify-content:space-between">
        <button class="fu-remove" id="dDelete">Obriši porudžbinu</button>
        <button class="btn-ghost" id="dEdit">Izmeni</button>
      </div>`;
  } else {
    const acts = state.acts.filter(a => a.order_id === o.id);
    $('dBody').innerHTML = `<div class="timeline">${acts.map(a => `<div class="t-item">
      <div class="t-icon ${a.type === 'screenshot' ? 'screenshot' : a.type === 'comment' ? 'comment' : 'status'}">${a.type === 'comment' ? '✎' : a.type === 'screenshot' ? '▣' : '•'}</div>
      <div class="t-content"><div class="t-meta"><b>${esc(a.author)}</b> · ${fmtDT(a.created_at)}</div>
      ${a.type === 'status' || a.type === 'system' ? `<div class="t-status-line">${esc(a.body)}</div>` : (a.body ? `<div class="t-body">${linkify(a.body)}</div>` : '')}
      ${a.attachment_url ? `<img class="t-img" src="${esc(a.attachment_url)}" data-zoom>` : ''}</div></div>`).join('') || '<div class="kb-empty">Još nema aktivnosti.</div>'}</div>`;
    $('dBody').scrollTop = 1e6;
  }
}
async function saveShipping() {
  const o = order(state.openOrderId); if (!o) return;
  const patch = { courier: $('dCourier').value.trim() || null, tracking_no: $('dTrack').value.trim() || null };
  if (patch.courier === (o.courier || null) && patch.tracking_no === (o.tracking_no || null)) return;
  try { await q(sb.from('h_orders').update(patch).eq('id', o.id)); Object.assign(o, patch); toast('Sačuvano ✓'); renderAll(); } catch (e) { fail(e); }
}
async function deleteOrder(o) {
  if (!confirm(`Obrisati porudžbinu ${o.order_no}? Roba se vraća na stanje.`)) return;
  try {
    if (!NO_STOCK.includes(o.status)) await adjustStock(itemsOf(o.id), +1);
    await q(sb.from('h_orders').delete().eq('id', o.id));
    state.orders = state.orders.filter(x => x.id !== o.id);
    state.items = state.items.filter(i => i.order_id !== o.id);
    closeDrawer(); renderAll(); toast('Obrisano');
  } catch (e) { fail(e); }
}
function setAttach(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => { state.attach = file; $('attachImg').src = r.result; $('attachPrev').style.display = 'flex'; };
  r.readAsDataURL(file);
}
function clearAttach() { state.attach = null; $('attachPrev').style.display = 'none'; $('cFile').value = ''; }
async function postComposer() {
  const text = $('cText').value.trim();
  if (!text && !state.attach) return;
  $('cSend').disabled = true;
  try {
    let url = null;
    if (state.attach) url = await uploadImage(state.attach, state.openOrderId);
    await log({ order_id: state.openOrderId, type: url ? 'screenshot' : 'comment', body: text || null, attachment_url: url });
    $('cText').value = ''; clearAttach(); renderDrawer();
  } catch (e) { fail(e); }
  $('cSend').disabled = false;
}

/* ---------------- order modal ---------------- */
function productOptions(sel) {
  return `<option value="">— izaberi —</option>` + state.products.filter(p => p.status !== 'archived' || p.id === sel)
    .map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}${p.category ? ' · ' + esc(p.category) : ''}</option>`).join('');
}
function sizeOptions(pid, sel) {
  return variantsOf(pid).map(v => `<option value="${v.id}" ${v.id === sel ? 'selected' : ''}>${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''} (${v.stock})</option>`).join('') || '<option value="">bez veličine</option>';
}
function addItemRow(it = {}) {
  const d = document.createElement('div');
  d.className = 'item-row';
  d.innerHTML = `<select data-f="product">${productOptions(it.product_id)}</select>
    <select data-f="variant">${it.product_id ? sizeOptions(it.product_id, it.variant_id) : ''}</select>
    <input data-f="qty" type="number" min="1" value="${it.qty || 1}">
    <input data-f="price" type="number" step="0.01" placeholder="cena" value="${it.unit_price ?? ''}">
    <button type="button" class="x-btn">×</button>`;
  d.querySelector('[data-f=product]').addEventListener('change', (e) => {
    const p = product(e.target.value);
    d.querySelector('[data-f=variant]').innerHTML = p ? sizeOptions(p.id) : '';
    d.querySelector('[data-f=price]').value = p ? p.sell_price : '';
    orderSum();
  });
  d.querySelector('.x-btn').addEventListener('click', () => { d.remove(); orderSum(); });
  $('itemRows').appendChild(d);
}
function readItems() {
  return [...document.querySelectorAll('#itemRows .item-row')].map(r => {
    const p = product(r.querySelector('[data-f=product]').value);
    if (!p) return null;
    const v = variant(r.querySelector('[data-f=variant]').value);
    return { product_id: p.id, variant_id: v?.id || null, name: p.name, size: v?.size || null, qty: Math.max(1, parseInt(r.querySelector('[data-f=qty]').value) || 1), unit_price: n(r.querySelector('[data-f=price]').value), unit_cost: n(p.buy_price) };
  }).filter(Boolean);
}
function orderSum() {
  const its = readItems();
  const fake = { id: '__', shipping_price: $('o_shipPrice').value, shipping_cost: $('o_shipCost').value, packaging_cost: $('o_pack').value, discount: $('o_disc').value };
  const saved = state.items; state.items = its.map(i => ({ ...i, order_id: '__' }));
  const t = totals(fake); state.items = saved;
  $('orderSum').innerHTML = `<div><span>Kupac plaća</span><b>${rsd(t.revenue)}</b></div><div><span>Profit</span><b class="${t.profit >= 0 ? 'pos' : 'neg'}">${rsd(t.profit)}</b></div>`;
}
const OF = { o_name: 'customer_name', o_phone: 'phone', o_ig: 'instagram', o_email: 'email', o_addr: 'address', o_city: 'city', o_zip: 'postal_code', o_channel: 'channel', o_pay: 'payment', o_no: 'order_no', o_shipPrice: 'shipping_price', o_shipCost: 'shipping_cost', o_pack: 'packaging_cost', o_disc: 'discount', o_code: 'discount_code', o_courier: 'courier', o_track: 'tracking_no', o_note: 'note' };
function openOrderModal(id) {
  const o = id ? order(id) : null;
  state.editOrderId = id || null;
  $('omTitle').textContent = o ? `Izmena ${o.order_no}` : 'Nova porudžbina';
  const def = { channel: 'instagram', payment: 'cod', shipping_price: LS.get('crm_ship_price', 0), shipping_cost: LS.get('crm_ship_cost', 0), packaging_cost: LS.get('crm_pack', 0), discount: 0 };
  Object.entries(OF).forEach(([el, f]) => { $(el).value = (o ? o[f] : def[f]) ?? ''; });
  $('itemRows').innerHTML = '';
  (o ? itemsOf(o.id) : [{}]).forEach(addItemRow);
  orderSum();
  $('orderModal').classList.add('open');
  $('o_name').focus();
}
async function saveOrder(e) {
  e.preventDefault();
  const its = readItems();
  if (!its.length) return toast('Dodaj bar jedan artikal');
  const f = {};
  Object.entries(OF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  ['shipping_price', 'shipping_cost', 'packaging_cost', 'discount'].forEach(k => f[k] = n(f[k]));
  if (f.customer_name === null) return;
  $('omSave').disabled = true;
  try {
    const old = state.editOrderId ? order(state.editOrderId) : null;
    let o;
    if (old) {
      const hold = !NO_STOCK.includes(old.status);
      if (hold) await adjustStock(itemsOf(old.id), +1);
      o = await q(sb.from('h_orders').update(f).eq('id', old.id).select().single());
      await q(sb.from('h_order_items').delete().eq('order_id', old.id));
      state.items = state.items.filter(i => i.order_id !== old.id);
      Object.assign(old, o); o = old;
      const rows = await q(sb.from('h_order_items').insert(its.map(i => ({ ...i, order_id: o.id }))).select());
      state.items.push(...rows);
      if (hold) await adjustStock(rows, -1);
      await log({ order_id: o.id, type: 'system', body: 'Porudžbina izmenjena' });
    } else {
      if (!f.order_no) f.order_no = nextOrderNo(f.channel);
      o = await q(sb.from('h_orders').insert(f).select().single());
      state.orders.unshift(o);
      const rows = await q(sb.from('h_order_items').insert(its.map(i => ({ ...i, order_id: o.id }))).select());
      state.items.push(...rows);
      await adjustStock(rows, -1);
      await log({ order_id: o.id, type: 'system', body: `Porudžbina kreirana (${CH[o.channel]})` });
      LS.set('crm_ship_price', f.shipping_price); LS.set('crm_ship_cost', f.shipping_cost); LS.set('crm_pack', f.packaging_cost);
    }
    $('orderModal').classList.remove('open');
    renderAll();
    if (state.openOrderId) renderDrawer();
    toast(`${o.order_no} sačuvana ✓`);
  } catch (err) { fail(err); }
  $('omSave').disabled = false;
}

/* ---------------- product modal ---------------- */
function addSizeRow(v = {}) {
  const d = document.createElement('div');
  d.className = 'item-row';
  d.style.gridTemplateColumns = '1fr 1fr 1fr 30px';
  d.dataset.id = v.id || '';
  d.innerHTML = `<input data-f="size" placeholder="S / M / L / UNI" value="${esc(v.size || '')}" style="text-transform:uppercase">
    <input data-f="color" placeholder="boja (opciono)" value="${esc(v.color || '')}">
    <input data-f="stock" type="number" min="0" placeholder="kom" value="${v.stock ?? 0}">
    <button type="button" class="x-btn">×</button>`;
  d.querySelector('.x-btn').addEventListener('click', () => d.remove());
  $('sizeRows').appendChild(d);
}
function priceHint() {
  const b = n($('p_buy').value), s = n($('p_sell').value);
  const h = $('p_hint'); h.className = 'hint';
  if (!b || !s) { h.textContent = 'Pravilo: prodajna 2,5x do 3x nabavne, završava se na 90.'; return; }
  const x = s / b, notes = [`Marža ${rsd(s - b)} (${pct((s - b) / s)}), ${x.toFixed(2)}x`];
  if (x < 2.5 || x > 3) { notes.push(`van 2,5x do 3x (${rsd(b * 2.5)} do ${rsd(b * 3)})`); h.classList.add('warn'); }
  if (Math.round(s) % 100 !== 90) { notes.push('cena ne završava na 90'); h.classList.add('warn'); }
  h.textContent = notes.join(' · ');
}
const PF = { p_name: 'name', p_cat: 'category', p_buy: 'buy_price', p_sell: 'sell_price', p_cmp: 'compare_price', p_sup: 'supplier', p_mat: 'material', p_img: 'image_url', p_status: 'status', p_note: 'note' };
function openProductModal(id) {
  const p = id ? product(id) : null;
  state.editProductId = id || null;
  $('pmTitle').textContent = p ? p.name : 'Novi komad';
  Object.entries(PF).forEach(([el, f]) => { $(el).value = p ? (p[f] ?? '') : (f === 'status' ? 'active' : ''); });
  $('sizeRows').innerHTML = '';
  (p ? variantsOf(p.id) : [{ size: 'S' }, { size: 'M' }, { size: 'L' }]).forEach(addSizeRow);
  $('pmDelete').style.display = p ? '' : 'none';
  priceHint();
  $('prodModal').classList.add('open');
}
async function saveProduct(e) {
  e.preventDefault();
  const f = {};
  Object.entries(PF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  f.name = f.name.toUpperCase();
  f.buy_price = n(f.buy_price); f.sell_price = n(f.sell_price); f.compare_price = f.compare_price === null ? null : n(f.compare_price);
  const sizes = [...document.querySelectorAll('#sizeRows .item-row')].map(r => ({ id: r.dataset.id || null, size: r.querySelector('[data-f=size]').value.trim().toUpperCase(), color: r.querySelector('[data-f=color]').value.trim() || null, stock: parseInt(r.querySelector('[data-f=stock]').value) || 0 })).filter(s => s.size);
  try {
    let p;
    if (state.editProductId) {
      p = await q(sb.from('h_products').update(f).eq('id', state.editProductId).select().single());
      Object.assign(product(p.id), p);
    } else {
      p = await q(sb.from('h_products').insert(f).select().single());
      state.products.unshift(p);
    }
    const keep = sizes.filter(s => s.id).map(s => s.id);
    const removed = variantsOf(p.id).filter(v => !keep.includes(v.id));
    if (removed.length) await q(sb.from('h_variants').delete().in('id', removed.map(v => v.id)));
    for (const s of sizes) {
      const row = { product_id: p.id, size: s.size, color: s.color, stock: s.stock };
      if (s.id) await q(sb.from('h_variants').update(row).eq('id', s.id));
      else await q(sb.from('h_variants').insert(row));
    }
    state.variants = await q(sb.from('h_variants').select('*'));
    await log({ product_id: p.id, type: 'system', body: `${p.name} ${state.editProductId ? 'izmenjen' : 'dodat'}` });
    $('prodModal').classList.remove('open');
    renderAll(); toast(`${p.name} sačuvan ✓`);
  } catch (err) { fail(err); }
}
async function deleteProduct() {
  const p = product(state.editProductId); if (!p) return;
  const used = state.items.some(i => i.product_id === p.id);
  if (used) {
    if (!confirm(`${p.name} postoji u porudžbinama. Arhivirati ga umesto brisanja?`)) return;
    await q(sb.from('h_products').update({ status: 'archived' }).eq('id', p.id)); p.status = 'archived';
  } else {
    if (!confirm(`Obrisati ${p.name}?`)) return;
    await q(sb.from('h_products').delete().eq('id', p.id));
    state.products = state.products.filter(x => x.id !== p.id);
    state.variants = state.variants.filter(v => v.product_id !== p.id);
  }
  $('prodModal').classList.remove('open'); renderAll();
}

/* ---------------- shell ---------------- */
function renderAll() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + state.tab));
  document.querySelectorAll('#periodSeg button').forEach(b => b.classList.toggle('active', +b.dataset.p === state.period));
  renderOverview(); renderOrders(); renderProducts(); renderAds();
}
function setTab(t) { state.tab = t; LS.set('crm_tab', t); renderAll(); window.scrollTo(0, 0); }

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('loginErr').style.display = 'none';
    try { await enterApp(await signIn($('loginUser').value, $('loginPass').value)); }
    catch (err) { $('loginErr').style.display = 'block'; }
  });
  $('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  $('projSel').addEventListener('change', (e) => {
    const h = e.target.value === 'harizma';
    $('harizma').style.display = h ? '' : 'none'; $('soonView').style.display = h ? 'none' : '';
  });
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
  $('periodSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.period = +b.dataset.p; LS.set('crm_period', b.dataset.p); renderAll(); });
  $('search').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    if (state.q && state.tab === 'overview') state.tab = 'orders';
    renderAll();
  });
  $('orderViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.orderView = b.dataset.view; LS.set('crm_oview', b.dataset.view); renderOrders(); });
  $('chSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.ch = b.dataset.ch; document.querySelectorAll('#chSeg button').forEach(x => x.classList.toggle('active', x === b)); renderOrders(); });
  $('orderStatusFilter').innerHTML = `<option value="all">Svi statusi</option>` + STATUSES.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  $('orderStatusFilter').addEventListener('change', (e) => { state.status = e.target.value; renderOrders(); });
  $('kanban').addEventListener('pointerdown', kbPointerDown);

  // otvaranje porudžbine / proizvoda (delegirano)
  document.addEventListener('click', (e) => {
    if (justDragged) return;
    const sb_ = e.target.closest('[data-stock]');
    if (sb_) { e.stopPropagation(); return bumpStock(sb_.dataset.stock, +sb_.dataset.d); }
    const del = e.target.closest('[data-delad]');
    if (del) { if (confirm('Obrisati unos?')) q(sb.from('h_ad_spend').delete().eq('id', del.dataset.delad)).then(() => { state.ads = state.ads.filter(a => a.id !== del.dataset.delad); renderAll(); }).catch(fail); return; }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) { $('lightboxImg').src = zoom.src; $('lightbox').classList.add('open'); return; }
    const go = e.target.closest('[data-goto]'); if (go) return setTab(go.dataset.goto);
    const oe = e.target.closest('[data-order]'); if (oe && !e.target.closest('.drawer')) return openDrawer(oe.dataset.order);
    const pe = e.target.closest('[data-product]'); if (pe) return openProductModal(pe.dataset.product);
    if (e.target.matches('[data-close]')) e.target.closest('.modal-wrap').classList.remove('open');
  });

  $('overlay').addEventListener('click', closeDrawer);
  $('dClose').addEventListener('click', closeDrawer);
  $('dTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.dTab = b.dataset.dt; renderDrawer(); });
  $('dBody').addEventListener('change', (e) => {
    const o = order(state.openOrderId);
    if (e.target.id === 'dStatus') setOrderStatus(o, e.target.value).then(renderDrawer);
    if (e.target.id === 'dCourier' || e.target.id === 'dTrack') saveShipping();
  });
  $('dBody').addEventListener('click', (e) => {
    if (e.target.id === 'dEdit') openOrderModal(state.openOrderId);
    if (e.target.id === 'dDelete') deleteOrder(order(state.openOrderId));
  });
  $('cSend').addEventListener('click', postComposer);
  $('cText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) postComposer(); });
  $('cText').addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/')); if (f) { e.preventDefault(); setAttach(f); } });
  $('cFile').addEventListener('change', (e) => setAttach(e.target.files[0]));
  $('attachX').addEventListener('click', clearAttach);
  $('lightbox').addEventListener('click', () => $('lightbox').classList.remove('open'));

  $('newOrderBtn').addEventListener('click', () => openOrderModal());
  $('addItemBtn').addEventListener('click', () => addItemRow());
  $('orderForm').addEventListener('submit', saveOrder);
  $('orderForm').addEventListener('input', orderSum);
  $('o_channel').addEventListener('change', () => { if (!state.editOrderId) $('o_no').placeholder = nextOrderNo($('o_channel').value); });

  $('newProductBtn').addEventListener('click', () => openProductModal());
  $('addSizeBtn').addEventListener('click', () => addSizeRow());
  $('prodForm').addEventListener('submit', saveProduct);
  ['p_buy', 'p_sell'].forEach(id => $(id).addEventListener('input', priceHint));
  $('pmDelete').addEventListener('click', () => deleteProduct().catch(fail));

  $('adDay').value = dayStr(new Date());
  $('adForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = { day: $('adDay').value, campaign: $('adCamp').value.trim() || 'all', spend: n($('adSpend').value), purchases: $('adPurch').value === '' ? null : +$('adPurch').value, revenue: $('adRev').value === '' ? null : n($('adRev').value) };
    try {
      const r = await q(sb.from('h_ad_spend').upsert(row, { onConflict: 'day,campaign' }).select().single());
      state.ads = state.ads.filter(a => a.id !== r.id); state.ads.push(r); state.ads.sort((a, b) => b.day.localeCompare(a.day));
      ['adSpend', 'adPurch', 'adRev'].forEach(id => $(id).value = '');
      renderAll(); toast('Sačuvano ✓');
    } catch (err) { fail(err); }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); document.querySelectorAll('.modal-wrap').forEach(m => m.classList.remove('open')); $('lightbox').classList.remove('open'); } });
}

async function enterApp(user) {
  state.user = user;
  $('userName').textContent = user.display;
  $('avatar').textContent = user.display.charAt(0).toUpperCase();
  await loadData();
  renderAll();
  $('loginPage').style.display = 'none';
  $('app').style.display = 'block';
  setInterval(async () => {
    if (document.hidden || document.querySelector('.modal-wrap.open')) return;
    try { await loadData(); renderAll(); if (state.openOrderId && state.dTab === 'activity') renderDrawer(); } catch (e) {}
  }, 60000);
}

(async function init() {
  bindEvents();
  const { data } = await sb.auth.getSession();
  if (data.session) { try { await enterApp(userFrom(data.session.user)); } catch (e) { console.error(e); } }
})();
