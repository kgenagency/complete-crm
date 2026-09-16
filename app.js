/* ================= COMPLETE CRM · HARIZMA modul ================= */
const APP_BUILD = '202609161323';
if (window.HTML_BUILD !== APP_BUILD) {
  // stranica i kod nisu iste verzije (keš) → učitaj ponovo sveže
  try { if (sessionStorage.getItem('crm_reload') !== APP_BUILD) { sessionStorage.setItem('crm_reload', APP_BUILD); location.replace(location.pathname + '?v=' + Date.now()); } } catch (e) {}
}
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
const POST_ST = [
  { key: 'idea', label: 'Ideja' }, { key: 'scripting', label: 'Scenario' }, { key: 'filming', label: 'Snimanje' },
  { key: 'editing', label: 'Montaža' }, { key: 'scheduled', label: 'Zakazano' }, { key: 'published', label: 'Objavljeno' },
];
const IDEA_ST = [
  { key: 'proposed', label: 'Predlog' }, { key: 'approved', label: 'Odobreno' }, { key: 'in_progress', label: 'U radu' },
  { key: 'done', label: 'Gotovo' }, { key: 'rejected', label: 'Odbijeno' },
];
const FMT = { reel: 'Reel', carousel: 'Carousel', story: 'Story', post: 'Post', tiktok: 'TikTok' };
const PRIO = { high: 'Visok', medium: 'Srednji', low: 'Nizak' };
const CAT = { dizajn: 'Dizajn', tekst: 'Tekst', funkcija: 'Funkcija', proizvod: 'Proizvod', materijal: 'Materijal', ostalo: 'Ostalo' };
const PEOPLE = { konstantin: { name: 'Konstantin', voc: 'Konstantine', f: false }, stasa: { name: 'Staša', voc: 'Staša', f: true, line: 'Vreme je da zablistamo i danas ✨' }, marjan: { name: 'Marjan', voc: 'Marjane', f: false } };
const SHOP_URL = 'https://wegmk4-wf.myshopify.com';
Object.assign(ST, Object.fromEntries(POST_ST.map(s => [s.key, s.label])), Object.fromEntries(IDEA_ST.map(s => [s.key, s.label])));
const lowT = () => +LS.get('crm_low', '2');

const LS = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

let state = {
  user: null,
  products: [], variants: [], orders: [], items: [], ads: [], acts: [],
  posts: [], ideas: [], story: [], notes: [], pack: [], rets: [],
  retView: LS.get('crm_rview', 'board'), retType: 'all', editRetId: null,
  postView: LS.get('crm_pview', 'board'), postFmt: 'all', siteCat: 'all', who: 'all',
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  writer: null, editPostId: null, editIdeaId: null, ideaArea: 'site', editPackId: null,
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
  const [products, variants, orders, items, ads, acts, posts, ideas, story, notes, pack, rets] = await Promise.all([
    q(sb.from('h_products').select('*').order('created_at', { ascending: false })),
    q(sb.from('h_variants').select('*')),
    q(sb.from('h_orders').select('*').order('created_at', { ascending: false })),
    q(sb.from('h_order_items').select('*')),
    q(sb.from('h_ad_spend').select('*').order('day', { ascending: false })),
    q(sb.from('h_activities').select('*').order('created_at', { ascending: true })),
    q(sb.from('h_posts').select('*').order('publish_at', { ascending: true, nullsFirst: false })),
    q(sb.from('h_site_ideas').select('*').order('created_at', { ascending: false })),
    q(sb.from('h_story_sections').select('*').order('position')),
    q(sb.from('h_notes').select('*').order('created_at', { ascending: true })),
    q(sb.from('h_packaging').select('*').order('created_at')),
    q(sb.from('h_returns').select('*').order('created_at', { ascending: false })),
  ]);
  Object.assign(state, { products, variants, orders, items, ads, acts, posts, ideas, story, notes, pack, rets });
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
    await stockAlert(v, v.stock, ns);
    v.stock = ns;
  }
}
async function stockAlert(v, from, to) {
  const t = lowT(), p = product(v.product_id);
  if (!p) return;
  if (to <= 0 && from > 0) await log({ product_id: p.id, type: 'alert', body: `${p.name} ${v.size} je rasprodat` });
  else if (to <= t && from > t) await log({ product_id: p.id, type: 'alert', body: `${p.name} ${v.size}: ostalo još ${to} kom` });
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
  state.products.filter(p => p.status === 'active').forEach(p => variantsOf(p.id).forEach(v => { if (v.stock <= lowT()) low.push({ p, v }); }));
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
      return `<div class="kb-col" data-status="${s.key}" data-drop="order">
        <div class="kb-col-head"><span class="kb-col-title">${s.label}</span><span class="kb-col-count">${col.length}</span></div>
        <div class="kb-cards">${col.map(o => `<div class="kb-card is-organic" data-id="${o.id}" data-order="${o.id}">
          <div class="kb-card-head"><div class="kb-name">${esc(o.customer_name)}</div><b class="page-sub">${esc(o.order_no || '')}</b></div>
          <div class="kb-social">${itemsSummary(o)}</div>
          <div class="kb-meta">${chBadge(o.channel)}<span class="kb-fu">${rsd(totals(o).revenue)}</span></div></div>`).join('') || '<div class="kb-empty">Prazno</div>'}</div></div>`;
    }).join('');
  }
}

/* drag & drop (preuzeto iz KGEN CRM, uopšteno za sve table i kalendar) */
let drag = null, justDragged = false;
const DRAGGABLE = '.kb-card[data-id], .post-card, .idea-card, .cal-chip, .ret-card';
function kbPointerDown(e) {
  if (e.button && e.button !== 0) return;
  const card = e.target.closest(DRAGGABLE); if (!card) return;
  if (e.target.closest('button, a, input')) return;
  const isTouch = e.pointerType === 'touch';
  drag = { id: card.dataset.id, kind: card.dataset.kind || 'order', card, sx: e.clientX, sy: e.clientY, moved: false, ready: !isTouch, ghost: null };
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
  let zone = under && under.closest('[data-drop]');
  if (zone && zone.dataset.drop !== drag.kind) zone = null;
  document.querySelectorAll('[data-drop]').forEach(c => c.classList.toggle('drop-target', c === zone));
  drag.over = zone;
  const kb = drag.card.closest('.kanban');
  if (kb) { const kr = kb.getBoundingClientRect(); if (e.clientX > kr.right - 60) kb.scrollLeft += 14; else if (e.clientX < kr.left + 60) kb.scrollLeft -= 14; }
  e.preventDefault();
}
function kbPointerUp() {
  if (!drag) return;
  const d = drag; kbCleanup();
  if (!d.moved) return;
  justDragged = true; setTimeout(() => { justDragged = false; }, 80);
  const z = d.over; if (!z) return;
  if (d.kind === 'order') { const o = order(d.id); if (o) setOrderStatus(o, z.dataset.status); }
  else if (d.kind === 'post') movePost(d.id, z);
  else if (d.kind === 'idea') moveIdea(d.id, z.dataset.status);
  else if (d.kind === 'ret') moveRet(d.id, z.dataset.status);
}
function kbCleanup() {
  window.removeEventListener('pointermove', kbPointerMove);
  window.removeEventListener('pointerup', kbPointerUp);
  window.removeEventListener('pointercancel', kbPointerUp);
  if (drag) { if (drag.hold) clearTimeout(drag.hold); if (drag.ghost) drag.ghost.remove(); if (drag.card) drag.card.classList.remove('dragging'); }
  document.body.classList.remove('kb-dragging');
  document.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
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
      <td><div class="sizes">${vs.map(v => `<span class="size-chip ${v.stock <= lowT() ? 'low' : ''}"><span class="sz">${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''}</span><button data-stock="${v.id}" data-d="-1">−</button><span class="qty">${v.stock}</span><button data-stock="${v.id}" data-d="1">+</button></span>`).join('') || '<span class="page-sub">Dodaj veličine</span>'}</div></td>
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
    await stockAlert(v, v.stock, ns);
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
  const def = { channel: 'instagram', payment: 'cod', shipping_price: LS.get('crm_ship_price', 0), shipping_cost: LS.get('crm_ship_cost', 0), packaging_cost: packCostPerOrder() || LS.get('crm_pack', 0), discount: 0 };
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
      await usePackaging(o);
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

/* ================= v2 sekcije ================= */
const who = () => state.user.username;
const personName = (k) => PEOPLE[k]?.name || k;
function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function toLocalInput(iso) { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function boardCols(list, statuses, kind, cardFn, extraAttr = '') {
  return statuses.map(st => {
    const col = list.filter(x => x.status === st.key);
    return `<div class="kb-col" data-status="${st.key}" data-drop="${kind}" ${extraAttr}>
      <div class="kb-col-head"><span class="kb-col-title">${st.label}</span><span class="kb-col-count">${col.length}</span></div>
      <div class="kb-cards">${col.map(cardFn).join('') || '<div class="kb-empty">Prevuci ovde</div>'}</div></div>`;
  }).join('');
}
function commentsBlock(field, id) {
  if (!id) return '';
  const acts = state.acts.filter(a => a[field] === id);
  return `<div class="sec-title">Komentari</div><div class="timeline">${acts.map(a => `<div class="t-item"><div class="t-icon ${a.type === 'comment' ? 'comment' : 'status'}">${a.type === 'comment' ? '✎' : '•'}</div>
    <div class="t-content"><div class="t-meta"><b>${esc(a.author)}</b> · ${fmtDT(a.created_at)}</div>${a.type === 'comment' ? `<div class="t-body">${linkify(a.body)}</div>` : `<div class="t-status-line">${esc(a.body)}</div>`}</div></div>`).join('')}</div>
    <div style="display:flex;gap:8px"><input class="inline-input" style="flex:1;width:auto" data-cfield="${field}" data-cid="${id}" placeholder="Napiši komentar i pritisni Enter"></div>`;
}
async function addComment(input) {
  const body = input.value.trim(); if (!body) return;
  try { await log({ [input.dataset.cfield]: input.dataset.cid, type: 'comment', body }); input.value = '';
    if (input.dataset.cfield === 'post_id') $('poComments').innerHTML = commentsBlock('post_id', state.editPostId);
    else if (input.dataset.cfield === 'return_id') $('rtComments').innerHTML = commentsBlock('return_id', state.editRetId);
    else $('siComments').innerHTML = commentsBlock('site_id', state.editIdeaId);
  } catch (e) { fail(e); }
}

/* ---------- GARDEROBA: upozorenja + feed ---------- */
function stockAlerts() {
  const out = [];
  state.products.filter(p => p.status === 'active').forEach(p => variantsOf(p.id).forEach(v => { if (v.stock <= lowT()) out.push({ p, v }); }));
  return out.sort((a, b) => a.v.stock - b.v.stock);
}
function packAlerts() { return state.pack.filter(x => x.stock <= x.min_stock); }
function renderGarderoba() {
  const al = stockAlerts();
  $('alertCount').textContent = al.length;
  if (document.activeElement !== $('lowInput')) $('lowInput').value = lowT();
  $('alerts').innerHTML = al.map(({ p, v }) => `<div class="alert ${v.stock <= 0 ? 'out' : ''}" data-product="${p.id}">
    <div class="a-ic">${v.stock <= 0 ? '!' : v.stock}</div>
    <div><div class="a-t">${esc(p.name)} · ${esc(v.size)}${v.color ? ' · ' + esc(v.color) : ''}</div>
    <div class="a-s">${v.stock <= 0 ? 'Rasprodato. Dopuni ili sakrij sa sajta.' : `Ostalo još ${v.stock} kom. Vreme za dopunu.`}${p.supplier ? ' Dobavljač: ' + esc(p.supplier) : ''}</div></div></div>`).join('')
    || '<div class="panel" style="grid-column:1/-1"><span class="page-sub">Nema upozorenja. Sve veličine imaju dovoljno robe.</span></div>';
  const b = $('alertBadge'); b.style.display = al.length ? '' : 'none'; b.textContent = al.length;
  const pb = $('packBadge'), pa = packAlerts().length; pb.style.display = pa ? '' : 'none'; pb.textContent = pa;

  const rel = state.acts.filter(a => a.product_id || (a.order_id && (a.type === 'system' || (a.type === 'status' && a.body?.includes('roba'))))).slice(-40).reverse();
  $('feed').innerHTML = rel.map((a, i) => {
    const o = a.order_id ? order(a.order_id) : null;
    const cls = a.type === 'alert' ? 'alert' : a.type === 'stock' ? 'stock' : o ? 'order' : '';
    const txt = o ? `${esc(o.order_no || '')} ${esc(o.customer_name)}: ${esc(a.body)} <span class="page-sub">(${itemsSummary(o)})</span>` : esc(a.body);
    return `<div class="f-row" style="animation-delay:${Math.min(i, 12) * 25}ms" ${o ? `data-order="${o.id}"` : a.product_id ? `data-product="${a.product_id}"` : ''}><span class="f-dot ${cls}"></span><div style="flex:1">${txt}</div><span class="page-sub" style="white-space:nowrap">${esc(a.author)} · ${fmtDT(a.created_at)}</span></div>`;
  }).join('') || '<div class="kb-empty">Još ništa. Ovde se vidi svaka promena zaliha, prodaja i upozorenje.</div>';
}

/* ---------- OBJAVE ---------- */
function filteredPosts() {
  const qq = state.q.toLowerCase();
  return state.posts.filter(p => (state.postFmt === 'all' || p.format === state.postFmt) &&
    (!qq || [p.title, p.concept, p.hook, p.caption, p.assignee].join(' ').toLowerCase().includes(qq)));
}
function postDate(p, short) {
  if (!p.publish_at) return '<span class="p-date">bez datuma</span>';
  const d = new Date(p.publish_at), late = d < new Date() && p.status !== 'published';
  return `<span class="p-date ${late ? 'late' : ''}">📅 ${d.toLocaleDateString('sr-Latn-RS', { weekday: short ? undefined : 'short', day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })}${late ? ' · kasni' : ''}</span>`;
}
function postCard(p) {
  const pr = p.product_id ? product(p.product_id) : null;
  return `<div class="post-card" data-kind="post" data-id="${p.id}" data-post="${p.id}">
    <div class="kb-card-head"><div class="kb-name">${esc(p.title)}</div><span class="fmt ${p.format}">${FMT[p.format] || p.format}</span></div>
    ${p.hook ? `<div class="kb-social">„${esc(p.hook)}“</div>` : ''}
    <div class="kb-meta">${postDate(p)}${p.assignee ? `<span class="by ${Object.keys(PEOPLE).find(k => PEOPLE[k].name === p.assignee) || 'other'}" style="font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700">${esc(p.assignee)}</span>` : ''}${pr ? `<span class="cat">${esc(pr.name)}</span>` : ''}</div>
    ${(p.drive_link || p.post_url) ? `<div class="p-links">${p.drive_link ? `<a class="drive" href="${esc(p.drive_link)}" target="_blank" rel="noopener">▲ Drive snimak</a>` : ''}${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" rel="noopener">↗ Objava</a>` : ''}</div>` : ''}
  </div>`;
}
function renderPosts() {
  const list = filteredPosts();
  $('postCount').textContent = `${list.length} objava`;
  document.querySelectorAll('#postViewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === state.postView));
  $('postBoard').style.display = state.postView === 'board' ? 'flex' : 'none';
  $('postCal').style.display = state.postView === 'calendar' ? '' : 'none';
  $('postList').style.display = state.postView === 'list' ? '' : 'none';
  // sledećih 7 dana
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  $('weekStrip').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(t0); d.setDate(d.getDate() + i);
    const ds = dayStr(d), ps = state.posts.filter(p => p.publish_at && dayStr(new Date(p.publish_at)) === ds);
    return `<div class="ws-day ${i === 0 ? 'today' : ''}" data-drop="post" data-date="${ds}"><div class="ws-d">${i === 0 ? 'Danas' : d.toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric' })}</div>
      ${ps.map(p => `<div class="cal-chip ${p.status === 'published' ? 'published' : ''}" data-kind="post" data-id="${p.id}" data-post="${p.id}" style="margin-top:6px">${esc(p.title)}</div>`).join('') || '<div class="ws-empty">Ništa zakazano</div>'}</div>`;
  }).join('');
  if (state.postView === 'board') $('postBoard').innerHTML = boardCols(list, POST_ST, 'post', postCard);
  if (state.postView === 'calendar') renderCalendar(list);
  if (state.postView === 'list') {
    const sorted = list.slice().sort((a, b) => (a.publish_at || '9') < (b.publish_at || '9') ? -1 : 1);
    $('postTbody').innerHTML = sorted.map(p => `<tr data-post="${p.id}"><td>${postDate(p)}</td><td><div class="lead-name">${esc(p.title)}</div><div class="lead-social">${esc(p.concept || '')}</div></td><td><span class="fmt ${p.format}">${FMT[p.format]}</span></td><td>${pill(p.status)}</td><td>${esc(p.assignee || '—')}</td><td>${p.drive_link ? `<a href="${esc(p.drive_link)}" target="_blank" rel="noopener">Drive ↗</a>` : '<span class="page-sub">nema</span>'}</td></tr>`).join('')
      || `<tr><td colspan="6" class="empty">Još nema ideja. Klikni „Nova ideja“.</td></tr>`;
  }
}
function renderCalendar(list) {
  const m = state.calMonth, first = new Date(m), start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const today = dayStr(new Date());
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = dayStr(d), ps = list.filter(p => p.publish_at && dayStr(new Date(p.publish_at)) === ds);
    cells += `<div class="cal-day ${d.getMonth() !== m.getMonth() ? 'other' : ''} ${ds === today ? 'today' : ''}" data-drop="post" data-date="${ds}">
      <div class="cal-n">${d.getDate()}</div>
      ${ps.map(p => `<div class="cal-chip ${p.status === 'published' ? 'published' : ''}" data-kind="post" data-id="${p.id}" data-post="${p.id}" title="${esc(p.title)}">${FMT[p.format]?.[0] || ''} · ${esc(p.title)}</div>`).join('')}
      <button class="cal-add" data-newpost="${ds}" title="Dodaj za ovaj dan">+</button></div>`;
  }
  const noDate = list.filter(p => !p.publish_at && p.status !== 'published');
  $('postCal').innerHTML = `<div class="cal-head"><button class="icon-btn" data-cal="-1">‹</button><b>${m.toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' })}</b><button class="icon-btn" data-cal="1">›</button></div>
    <div class="cal-grid">${['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'].map(x => `<div class="cal-dow">${x}</div>`).join('')}${cells}</div>
    ${noDate.length ? `<div style="padding:12px 16px;border-top:1px solid var(--line)"><div class="sec-title" style="margin-top:0">Bez datuma, prevuci na dan</div><div style="display:flex;gap:6px;flex-wrap:wrap">${noDate.map(p => `<div class="cal-chip" data-kind="post" data-id="${p.id}" data-post="${p.id}">${esc(p.title)}</div>`).join('')}</div></div>` : ''}`;
}
async function movePost(id, zone) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  const patch = {};
  if (zone.dataset.date) {
    const old = p.publish_at ? new Date(p.publish_at) : null;
    const [y, mo, d] = zone.dataset.date.split('-').map(Number);
    const nd = new Date(y, mo - 1, d, old ? old.getHours() : 18, old ? old.getMinutes() : 0);
    patch.publish_at = nd.toISOString();
    if (p.status === 'idea' || p.status === 'scripting') { /* datum ne menja fazu */ }
  } else if (zone.dataset.status) patch.status = zone.dataset.status;
  try {
    await q(sb.from('h_posts').update(patch).eq('id', id));
    const body = patch.status ? `Status: ${ST[p.status]} → ${ST[patch.status]}` : `Datum objave: ${fmtDT(patch.publish_at)}`;
    Object.assign(p, patch);
    await log({ post_id: id, type: 'status', body });
    renderAll(); toast(`${p.title}: ${patch.status ? ST[patch.status] : fmtDate(patch.publish_at)}`);
  } catch (e) { fail(e); }
}
const POF = { po_title: 'title', po_concept: 'concept', po_hook: 'hook', po_format: 'format', po_status: 'status', po_assignee: 'assignee', po_product: 'product_id', po_drive: 'drive_link', po_caption: 'caption', po_url: 'post_url', po_views: 'views', po_likes: 'likes', po_saves: 'saves' };
function openPostModal(id, dateStr) {
  const p = id ? state.posts.find(x => x.id === id) : null;
  state.editPostId = id || null;
  $('poTitle').textContent = p ? p.title : 'Nova ideja za objavu';
  $('po_status').innerHTML = POST_ST.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  $('po_product').innerHTML = '<option value="">—</option>' + state.products.filter(x => x.status !== 'archived').map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  Object.entries(POF).forEach(([el, f]) => { $(el).value = p ? (p[f] ?? '') : ({ format: 'reel', status: 'idea', assignee: state.user.display }[f] ?? ''); });
  $('po_date').value = p ? toLocalInput(p.publish_at) : (dateStr ? dateStr + 'T18:00' : '');
  $('poDelete').style.display = p ? '' : 'none';
  $('poComments').innerHTML = commentsBlock('post_id', state.editPostId);
  $('postModal').classList.add('open');
  $('po_title').focus();
}
async function savePost(e) {
  e.preventDefault();
  const f = {};
  Object.entries(POF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  ['views', 'likes', 'saves'].forEach(k => f[k] = f[k] === null ? null : +f[k]);
  f.publish_at = $('po_date').value ? new Date($('po_date').value).toISOString() : null;
  if (f.drive_link && !/^https?:\/\//.test(f.drive_link)) return toast('Drive link mora da počinje sa https://');
  try {
    if (state.editPostId) {
      const old = state.posts.find(x => x.id === state.editPostId);
      const r = await q(sb.from('h_posts').update(f).eq('id', old.id).select().single());
      if (old.status !== r.status) await log({ post_id: r.id, type: 'status', body: `Status: ${ST[old.status]} → ${ST[r.status]}` });
      Object.assign(old, r);
    } else {
      f.created_by = state.user.display;
      const r = await q(sb.from('h_posts').insert(f).select().single());
      state.posts.push(r);
      await log({ post_id: r.id, type: 'system', body: 'Ideja dodata' });
    }
    $('postModal').classList.remove('open'); renderAll(); toast('Objava sačuvana ✓');
  } catch (err) { fail(err); }
}
async function deletePost() {
  if (!confirm('Obrisati ovu objavu?')) return;
  try { await q(sb.from('h_posts').delete().eq('id', state.editPostId)); state.posts = state.posts.filter(x => x.id !== state.editPostId); $('postModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}

/* ---------- SAJT i predlozi za pakovanje ---------- */
function ideaCard(i) {
  const voted = (i.votes || []).includes(who());
  return `<div class="idea-card" data-kind="idea" data-id="${i.id}" data-idea="${i.id}">
    <div class="kb-card-head"><div class="kb-name">${esc(i.title)}</div><span class="prio ${i.priority}">${PRIO[i.priority]}</span></div>
    ${i.description ? `<div class="kb-social" style="white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(i.description)}</div>` : ''}
    ${i.image_url ? `<img src="${esc(i.image_url)}" alt="">` : ''}
    <div class="kb-meta"><span class="cat">${CAT[i.category] || i.category}</span><span class="cat">· ${esc(i.created_by || '')}</span>
      <button class="vote ${voted ? 'on' : ''}" data-vote="${i.id}" style="margin-left:auto" title="${(i.votes || []).map(personName).join(', ')}">▲ ${(i.votes || []).length}</button></div>
  </div>`;
}
function ideasFor(area) {
  const qq = state.q.toLowerCase();
  return state.ideas.filter(i => i.area === area && (area !== 'site' || state.siteCat === 'all' || i.category === state.siteCat) &&
    (!qq || [i.title, i.description].join(' ').toLowerCase().includes(qq)))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]) || (b.votes || []).length - (a.votes || []).length);
}
function renderSite() {
  const l = ideasFor('site');
  $('siteCount').textContent = `${l.length} predloga`;
  $('siteLink').href = SHOP_URL;
  $('siteBoard').innerHTML = boardCols(l, IDEA_ST, 'idea', ideaCard);
}
async function moveIdea(id, status) {
  const i = state.ideas.find(x => x.id === id); if (!i || i.status === status) return;
  try {
    await q(sb.from('h_site_ideas').update({ status }).eq('id', id));
    await log({ site_id: id, type: 'status', body: `Status: ${ST[i.status]} → ${ST[status]}` });
    i.status = status; renderAll(); toast(`${i.title} → ${ST[status]}`);
  } catch (e) { fail(e); }
}
async function vote(id) {
  const i = state.ideas.find(x => x.id === id); if (!i) return;
  const v = new Set(i.votes || []); v.has(who()) ? v.delete(who()) : v.add(who());
  try { const votes = [...v]; await q(sb.from('h_site_ideas').update({ votes }).eq('id', id)); i.votes = votes; renderAll(); } catch (e) { fail(e); }
}
const SIF = { si_title: 'title', si_desc: 'description', si_cat: 'category', si_prio: 'priority', si_status: 'status', si_link: 'link' };
function openIdeaModal(id, area) {
  const i = id ? state.ideas.find(x => x.id === id) : null;
  state.editIdeaId = id || null; state.ideaArea = i ? i.area : area;
  $('siTitle').textContent = i ? i.title : (state.ideaArea === 'packaging' ? 'Novi predlog za pakovanje' : 'Novi predlog za sajt');
  $('si_status').innerHTML = IDEA_ST.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  Object.entries(SIF).forEach(([el, f]) => { $(el).value = i ? (i[f] ?? '') : ({ category: state.ideaArea === 'packaging' ? 'dizajn' : (state.siteCat !== 'all' ? state.siteCat : 'dizajn'), priority: 'medium', status: 'proposed' }[f] ?? ''); });
  $('si_file').value = '';
  $('siDelete').style.display = i ? '' : 'none';
  $('siComments').innerHTML = commentsBlock('site_id', state.editIdeaId);
  $('siteModal').classList.add('open');
  $('si_title').focus();
}
async function saveIdea(e) {
  e.preventDefault();
  const f = {};
  Object.entries(SIF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  try {
    const file = $('si_file').files[0];
    if (file) f.image_url = await uploadImage(file, 'ideas');
    if (state.editIdeaId) {
      const old = state.ideas.find(x => x.id === state.editIdeaId);
      const r = await q(sb.from('h_site_ideas').update(f).eq('id', old.id).select().single());
      if (old.status !== r.status) await log({ site_id: r.id, type: 'status', body: `Status: ${ST[old.status]} → ${ST[r.status]}` });
      Object.assign(old, r);
    } else {
      Object.assign(f, { area: state.ideaArea, created_by: state.user.display, votes: [who()] });
      const r = await q(sb.from('h_site_ideas').insert(f).select().single());
      state.ideas.unshift(r);
    }
    $('siteModal').classList.remove('open'); renderAll(); toast('Predlog sačuvan ✓');
  } catch (err) { fail(err); }
}
async function deleteIdea() {
  if (!confirm('Obrisati predlog?')) return;
  try { await q(sb.from('h_site_ideas').delete().eq('id', state.editIdeaId)); state.ideas = state.ideas.filter(x => x.id !== state.editIdeaId); $('siteModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}

/* ---------- PAKOVANJE ---------- */
const packCostPerOrder = () => state.pack.reduce((a, x) => a + x.per_order * n(x.unit_price), 0);
function renderPackaging() {
  const per = state.pack.filter(x => x.per_order > 0);
  const missing = per.filter(x => x.unit_price == null).length;
  const canShip = per.length ? Math.max(0, Math.min(...per.map(x => Math.floor(x.stock / x.per_order)))) : 0;
  const worth = state.pack.reduce((a, x) => a + x.stock * n(x.unit_price), 0);
  $('kpiPack').innerHTML = stat('Trošak pakovanja po paketu', rsd(packCostPerOrder()), missing ? `<b>${missing}</b> stavki bez cene` : 'sve stavke imaju cenu') +
    stat('Paketa možemo da spakujemo', canShip, 'sa trenutnim materijalom') +
    stat('Materijal na stanju', rsd(worth), `${state.pack.length} stavki`) +
    stat('Predlozi', ideasFor('packaging').filter(i => !['done', 'rejected'].includes(i.status)).length, 'otvoreni');
  const al = packAlerts();
  $('packAlerts').innerHTML = al.map(x => `<div class="alert ${x.stock <= 0 ? 'out' : ''}" data-pack="${x.id}"><div class="a-ic">${x.stock <= 0 ? '!' : x.stock}</div>
    <div><div class="a-t">${esc(x.name)}</div><div class="a-s">${x.stock <= 0 ? 'Nema na stanju.' : `Ostalo ${x.stock} kom (granica ${x.min_stock}).`} ${x.supplier ? 'Poruči kod: ' + esc(x.supplier) : ''}</div></div></div>`).join('');
  $('packTbody').innerHTML = state.pack.map(x => `<tr data-pack="${x.id}">
    <td><div class="lead-name">${esc(x.name)}</div><div class="lead-social">${esc(x.kind)}${x.note ? ' · ' + esc(x.note) : ''}</div></td>
    <td>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.supplier || 'link')}</a>` : esc(x.supplier || '—')}</td>
    <td class="num">${x.unit_price != null ? rsd(x.unit_price) : '<span class="hint warn">upiši cenu</span>'}</td>
    <td class="num">${x.per_order || '—'}</td>
    <td><span class="size-chip ${x.stock <= x.min_stock ? 'low' : ''}"><button data-pstock="${x.id}" data-d="-1">−</button><span class="qty">${x.stock}</span><button data-pstock="${x.id}" data-d="1">+</button><button data-pstock="${x.id}" data-d="50" title="Stigla nova tura">+50</button></span></td>
    <td class="num page-sub">min ${x.min_stock}</td></tr>`).join('');
  const l = ideasFor('packaging');
  $('packIdeaCount').textContent = `${l.length} predloga`;
  $('packBoard').innerHTML = boardCols(l, IDEA_ST, 'idea', ideaCard);
}
async function bumpPack(id, d) {
  const x = state.pack.find(p => p.id === id); if (!x) return;
  const ns = Math.max(0, x.stock + d);
  try {
    await q(sb.from('h_packaging').update({ stock: ns }).eq('id', id));
    await log({ packaging_id: id, type: 'stock', body: `${x.name}: ${x.stock} → ${ns}` });
    x.stock = ns; renderAll();
  } catch (e) { fail(e); }
}
async function usePackaging(o) {
  for (const x of state.pack.filter(p => p.per_order > 0)) {
    const ns = Math.max(0, x.stock - x.per_order);
    await q(sb.from('h_packaging').update({ stock: ns }).eq('id', x.id));
    if (ns <= x.min_stock && x.stock > x.min_stock) await log({ packaging_id: x.id, type: 'alert', body: `${x.name}: ostalo još ${ns}` });
    x.stock = ns;
  }
}
const PAF = { pa_name: 'name', pa_kind: 'kind', pa_sup: 'supplier', pa_link: 'link', pa_price: 'unit_price', pa_stock: 'stock', pa_min: 'min_stock', pa_per: 'per_order', pa_note: 'note' };
function openPackModal(id) {
  const x = id ? state.pack.find(p => p.id === id) : null;
  state.editPackId = id || null;
  $('paTitle').textContent = x ? x.name : 'Novi materijal';
  Object.entries(PAF).forEach(([el, f]) => { $(el).value = x ? (x[f] ?? '') : ({ kind: 'kutija', stock: 0, min_stock: 10, per_order: 1 }[f] ?? ''); });
  $('paDelete').style.display = x ? '' : 'none';
  $('packModal').classList.add('open');
}
async function savePack(e) {
  e.preventDefault();
  const f = {};
  Object.entries(PAF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  f.unit_price = f.unit_price === null ? null : n(f.unit_price);
  ['stock', 'min_stock', 'per_order'].forEach(k => f[k] = parseInt(f[k]) || 0);
  try {
    if (state.editPackId) { const r = await q(sb.from('h_packaging').update(f).eq('id', state.editPackId).select().single()); Object.assign(state.pack.find(p => p.id === r.id), r); }
    else state.pack.push(await q(sb.from('h_packaging').insert(f).select().single()));
    $('packModal').classList.remove('open'); renderAll(); toast('Sačuvano ✓');
  } catch (err) { fail(err); }
}
async function deletePack() {
  if (!confirm('Obrisati materijal?')) return;
  try { await q(sb.from('h_packaging').delete().eq('id', state.editPackId)); state.pack = state.pack.filter(p => p.id !== state.editPackId); $('packModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}

/* ---------- BRAND STORY ---------- */
const storyTimers = {};
function renderStory() {
  const doc = $('storyDoc');
  if (doc.contains(document.activeElement) && doc.children.length === state.story.length) return; // ne diraj dok neko kuca
  doc.innerHTML = state.story.map((s, i) => `<div class="story-sec" data-sec="${s.id}" style="animation-delay:${i * 60}ms">
    <input class="st-title" value="${esc(s.title)}" data-f="title">
    <textarea data-f="body" rows="2" placeholder="Piši ovde…">${esc(s.body)}</textarea>
    <div class="story-meta">${s.updated_by ? `izmenio/la ${esc(s.updated_by)} · ${fmtDT(s.updated_at)}` : ''}<button data-delsec="${s.id}">obriši poglavlje</button></div></div>`).join('')
    || '<div class="page-sub">Dodaj prvo poglavlje.</div>';
  doc.querySelectorAll('textarea').forEach(autosize);
}
function storyInput(e) {
  const sec = e.target.closest('[data-sec]'); if (!sec) return;
  if (e.target.tagName === 'TEXTAREA') autosize(e.target);
  const id = sec.dataset.sec, s = state.story.find(x => x.id === id);
  s[e.target.dataset.f] = e.target.value;
  $('saving').textContent = 'Čuvam…'; $('saving').classList.add('on');
  clearTimeout(storyTimers[id]);
  storyTimers[id] = setTimeout(async () => {
    try {
      const patch = { title: s.title, body: s.body, updated_at: new Date().toISOString(), updated_by: state.user.display };
      await q(sb.from('h_story_sections').update(patch).eq('id', id));
      Object.assign(s, patch);
      $('saving').textContent = 'Sačuvano ✓';
      setTimeout(() => $('saving').classList.remove('on'), 1500);
    } catch (err) { fail(err); }
  }, 700);
}
async function addSection() {
  try {
    const r = await q(sb.from('h_story_sections').insert({ title: 'Novo poglavlje', body: '', position: (state.story.at(-1)?.position || 0) + 1, updated_by: state.user.display }).select().single());
    state.story.push(r); document.activeElement?.blur(); renderStory();
    const el = document.querySelector(`[data-sec="${r.id}"] .st-title`); el.focus(); el.select(); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) { fail(e); }
}
async function deleteSection(id) {
  if (!confirm('Obrisati ovo poglavlje?')) return;
  try { await q(sb.from('h_story_sections').delete().eq('id', id)); state.story = state.story.filter(s => s.id !== id); renderStory(); } catch (e) { fail(e); }
}
function renderNotes() {
  document.querySelectorAll('#whoSeg button').forEach(b => b.classList.toggle('active', b.dataset.who === state.who));
  const list = state.notes.filter(x => x.area === 'story' && (state.who === 'all' || x.author === state.who))
    .sort((a, b) => (b.pinned - a.pinned) || (a.done - b.done) || a.created_at.localeCompare(b.created_at));
  $('notes').innerHTML = list.map((x, i) => `<div class="note ${x.done ? 'done' : ''} ${x.pinned ? 'pinned' : ''}" style="animation-delay:${i * 30}ms">
    <span class="by ${PEOPLE[x.author] ? x.author : 'other'}">${esc(personName(x.author))}</span><span class="txt">${esc(x.body).replace(/\n/g, '<br>')}</span>
    <span class="n-act"><button data-note="${x.id}" data-act="pin" title="Zakači">📌</button><button data-note="${x.id}" data-act="done" title="Završeno">✓</button><button data-note="${x.id}" data-act="del" title="Obriši">✕</button></span></div>`).join('')
    || `<div class="note" style="color:#9a957f">${state.who === 'all' ? 'Još nema beleški.' : personName(state.who) + ' još nema beleške.'}</div>`;
  const w = state.writer || who();
  document.querySelectorAll('#writerSeg button').forEach(b => b.classList.toggle('active', b.dataset.writer === w));
  $('noteInput').placeholder = `Beleška: ${personName(w)}… (Enter za čuvanje)`;
}
async function addNote() {
  const body = $('noteInput').value.trim(); if (!body) return;
  try { state.notes.push(await q(sb.from('h_notes').insert({ area: 'story', author: state.writer || who(), body }).select().single())); $('noteInput').value = ''; renderNotes(); } catch (e) { fail(e); }
}
async function noteAction(id, act) {
  const x = state.notes.find(z => z.id === id); if (!x) return;
  try {
    if (act === 'del') { if (!confirm('Obrisati belešku?')) return; await q(sb.from('h_notes').delete().eq('id', id)); state.notes = state.notes.filter(z => z.id !== id); }
    else { const f = act === 'pin' ? 'pinned' : 'done'; await q(sb.from('h_notes').update({ [f]: !x[f] }).eq('id', id)); x[f] = !x[f]; }
    renderNotes();
  } catch (e) { fail(e); }
}

/* ---------- animacije: uvod + brojevi ---------- */
function greet(u) {
  const p = PEOPLE[u.username];
  if (!p) return `Dobrodošli, ${u.display}`;
  return `${p.f ? 'Dobrodošla' : 'Dobrodošao'}, ${p.voc}`;
}
function playSplash(u) {
  return new Promise(res => {
    const sp = $('splash');
    const pp = PEOPLE[u.username];
    $('splashHello').innerHTML = esc(greet(u)) + (pp?.line ? `<span class="hello-sub">${esc(pp.line)}</span>` : '');
    const clone = sp.cloneNode(true); sp.replaceWith(clone); // restart animacija
    clone.classList.remove('hide');
    setTimeout(() => { clone.classList.add('hide'); res(); }, pp?.line ? 3000 : 2300);
  });
}
function countUp(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.stat-value').forEach(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) {
      const m = node.nodeValue.match(/^(-?)([\d.]+)( RSD)?$/);
      if (!m || node.nodeValue.includes('x')) continue;
      const target = parseInt(m[2].replace(/\./g, ''), 10); if (!target) continue;
      const tn = node, t0 = performance.now(), dur = 800;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        tn.nodeValue = m[1] + Math.round(target * e).toLocaleString('sr-Latn-RS') + (m[3] || '');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  });
}

/* ---------- POVRATI ---------- */
const RET_ST = [
  { key: 'new', label: 'Nova' }, { key: 'in_review', label: 'U obradi' }, { key: 'waiting_package', label: 'Čeka paket' },
  { key: 'received', label: 'Paket stigao' }, { key: 'resolved', label: 'Rešeno' }, { key: 'rejected', label: 'Odbijeno' },
];
Object.assign(ST, { in_review: 'U obradi', waiting_package: 'Čeka paket', received: 'Paket stigao', resolved: 'Rešeno' });
const RT = { return: 'Povrat', exchange: 'Zamena', complaint: 'Reklamacija', feedback: 'Utisak' };
const RES_W = { refund: 'Povrat novca', credit: 'Vaučer', exchange_size: 'Druga veličina', exchange_model: 'Drugi model', replace: 'Isti komad, ispravan', discount: 'Popust' };
const FORM_URL = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'povrat.html';
const retClosed = (r) => ['resolved', 'rejected'].includes(r.status);
const addDays = (iso, d) => { const x = new Date(iso); x.setDate(x.getDate() + d); return x; };
function retDue(r) {
  if (r.type === 'feedback' || retClosed(r)) return null;
  let date, label;
  if (r.type === 'complaint') {
    if (r.status === 'new') { date = addDays(r.created_at, 8); label = 'odgovor kupcu'; }
    else { date = addDays(r.created_at, 15); label = 'rešenje reklamacije'; }
  } else if (r.resolution_wanted === 'refund' || r.type === 'return') {
    date = addDays(r.created_at, 14); label = 'povrat novca';
  } else { date = addDays(r.created_at, 14); label = 'zamena'; }
  const days = Math.ceil((date - new Date()) / 864e5);
  return { date, label, days, level: days < 0 ? 'late' : days <= 3 ? 'soon' : '' };
}
function dueText(d) { if (!d) return ''; return d.days < 0 ? `kasni ${-d.days} d · ${d.label}` : d.days === 0 ? `danas · ${d.label}` : `još ${d.days} d · ${d.label}`; }
function filteredRets() {
  const qq = state.q.toLowerCase();
  return state.rets.filter(r => (state.retType === 'all' || r.type === state.retType) &&
    (!qq || [r.case_no, r.customer_name, r.phone, r.email, r.order_no, r.item, r.description].join(' ').toLowerCase().includes(qq)));
}
function retCard(r) {
  const d = retDue(r);
  return `<div class="ret-card ${d?.level || ''}" data-kind="ret" data-id="${r.id}" data-ret="${r.id}">
    <div class="kb-card-head"><div class="kb-name">${esc(r.customer_name)}</div><span class="rt-type ${r.type}">${RT[r.type]}</span></div>
    <div class="kb-social">${esc(r.case_no)}${r.item ? ' · ' + esc(r.item) : ''}${r.size ? ' ' + esc(r.size) : ''}</div>
    ${r.reason ? `<div class="kb-social">${esc(r.reason)}</div>` : ''}
    <div class="kb-meta">${d ? `<span class="due ${d.level}">⏱ ${dueText(d)}</span>` : r.rating ? `<span class="due">${'★'.repeat(r.rating)}</span>` : ''}${r.photos?.length ? `<span class="cat">📷 ${r.photos.length}</span>` : ''}${r.assignee ? `<span class="cat">${esc(r.assignee)}</span>` : ''}</div>
  </div>`;
}
function renderReturns() {
  const all = state.rets, open = all.filter(r => !retClosed(r) && r.type !== 'feedback');
  const late = open.filter(r => retDue(r)?.level === 'late'), soon = open.filter(r => retDue(r)?.level === 'soon');
  const fresh = all.filter(r => r.status === 'new').length;
  const b = $('retBadge'); b.style.display = (late.length + fresh) ? '' : 'none'; b.textContent = late.length + fresh;
  const orders = state.orders.filter(o => o.status !== 'cancelled').length;
  const retCount = all.filter(r => r.type === 'return' || r.type === 'exchange').length;
  const refunded = all.reduce((a, r) => a + n(r.refund_amount), 0), shipCost = all.reduce((a, r) => a + n(r.return_shipping_cost), 0);
  const rated = all.filter(r => r.rating);
  $('kpiRet').innerHTML = stat('Otvorene prijave', open.length, `<b>${fresh}</b> novih · <b class="${late.length ? 'neg' : ''}">${late.length}</b> kasni`) +
    stat('Stopa povrata i zamena', orders ? pct(retCount / orders) : '—', orders ? `${retCount} od ${orders} porudžbina` : 'još nema porudžbina') +
    stat('Vraćeno kupcima', rsd(refunded), `slanje nas koštalo <b>${rsd(shipCost)}</b>`) +
    stat('Prosečna ocena', rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) + ' ★' : '—', `${all.filter(r => r.type === 'feedback').length} utisaka`);
  $('retAlerts').innerHTML = [...late, ...soon].map(r => { const d = retDue(r); return `<div class="alert ${d.level === 'late' ? 'out' : ''}" data-ret="${r.id}">
    <div class="a-ic">${d.level === 'late' ? '!' : d.days}</div><div><div class="a-t">${esc(r.case_no)} · ${esc(r.customer_name)}</div>
    <div class="a-s">${RT[r.type]}: ${dueText(d)} (rok ${d.date.toLocaleDateString('sr-Latn-RS')})</div></div></div>`; }).join('');

  const list = filteredRets();
  $('retCount').textContent = `${list.length} prijava`;
  document.querySelectorAll('#retViewSeg button').forEach(x => x.classList.toggle('active', x.dataset.view === state.retView));
  document.querySelectorAll('#retTypeSeg button').forEach(x => x.classList.toggle('active', x.dataset.t === state.retType));
  $('retBoard').style.display = state.retView === 'board' ? 'flex' : 'none';
  $('retList').style.display = state.retView === 'list' ? '' : 'none';
  $('retInsights').style.display = state.retView === 'insights' ? '' : 'none';
  $('openFormBtn').href = FORM_URL();
  if (state.retView === 'board') $('retBoard').innerHTML = boardCols(list, RET_ST, 'ret', retCard);
  if (state.retView === 'list') $('retTbody').innerHTML = list.map(r => { const d = retDue(r); return `<tr data-ret="${r.id}">
    <td><b>${esc(r.case_no)}</b></td><td><div class="lead-name">${esc(r.customer_name)}</div><div class="lead-social">${esc(r.phone || r.email || '')}</div></td>
    <td><span class="rt-type ${r.type}">${RT[r.type]}</span></td><td>${esc(r.item || '—')} ${esc(r.size || '')}</td><td class="activity-cell">${esc(r.reason || '—')}</td>
    <td>${pill(r.status)}</td><td>${d ? `<span class="due ${d.level}">${dueText(d)}</span>` : '—'}</td><td class="date-cell">${fmtDate(r.created_at)}</td></tr>`; }).join('')
    || `<tr><td colspan="8" class="empty">Nema prijava. Pošalji kupcima link forme.</td></tr>`;
  if (state.retView === 'insights') renderRetInsights();
}
function bars(obj) {
  const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]); const max = rows[0]?.[1] || 1;
  return rows.length ? `<div class="bars">${rows.map(([k, v], i) => `<div class="bar-row"><span>${esc(k)}</span><div class="track"><div class="fill" style="width:${v / max * 100}%;animation-delay:${i * 60}ms"></div></div><b class="num">${v}</b></div>`).join('')}</div>` : '<div class="kb-empty">Još nema podataka.</div>';
}
function renderRetInsights() {
  const rs = state.rets.filter(r => r.type !== 'feedback');
  const reasons = {}, prods = {};
  rs.forEach(r => {
    if (r.reason) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    const k = (r.product_id && product(r.product_id)?.name) || (r.item || '').toUpperCase().split(' ')[0] || 'Nepoznato';
    prods[k] = (prods[k] || 0) + 1;
  });
  const sizes = {}; rs.filter(r => /veličin|mala|velika|premal|preveli/i.test(r.reason || '')).forEach(r => { const k = `${(r.product_id && product(r.product_id)?.name) || r.item || '?'} ${r.size || ''} · ${r.reason}`; sizes[k] = (sizes[k] || 0) + 1; });
  const imp = state.rets.filter(r => r.improve);
  const fb = state.rets.filter(r => r.type === 'feedback');
  $('retInsights').innerHTML = `<div class="two-col">
    <div class="panel"><h4>Najčešći razlozi</h4>${bars(reasons)}</div>
    <div class="panel"><h4>Komadi sa najviše prijava</h4>${bars(prods)}</div>
    <div class="panel"><h4>Problemi sa veličinom</h4>${bars(sizes)}<div class="hint">Ako se isti komad stalno vraća kao premali ili preveliki, ispravi tabelu veličina na sajtu.</div></div>
    <div class="panel"><h4>Šta da popravimo <span class="fu-count">${imp.length}</span></h4>${imp.map(r => `<div class="list-row" data-ret="${r.id}"><span>${esc(r.improve)}</span><button class="mini-btn" data-toidea="${r.id}">→ predlog</button></div>`).join('') || '<div class="kb-empty">Upiši „Šta da popravimo“ u prijavi i skupljaće se ovde.</div>'}</div>
  </div>
  <div class="panel" style="margin-top:16px"><h4>Utisci kupaca</h4>${fb.map(r => `<div class="quote" data-ret="${r.id}">„${esc(r.description)}“<small>${esc(r.customer_name)} · ${r.rating ? '★'.repeat(r.rating) : 'bez ocene'} · ${fmtDate(r.created_at)}</small></div>`).join('') || '<div class="kb-empty">Još nema utisaka.</div>'}</div>`;
}
async function moveRet(id, status) {
  const r = state.rets.find(x => x.id === id); if (!r || r.status === status) return;
  const patch = { status };
  if (status === 'resolved' || status === 'rejected') patch.resolved_at = new Date().toISOString();
  if (status === 'received' && !r.package_received_at) patch.package_received_at = new Date().toISOString();
  try {
    await q(sb.from('h_returns').update(patch).eq('id', id));
    await log({ return_id: id, type: 'status', body: `Status: ${ST[r.status]} → ${ST[status]}` });
    Object.assign(r, patch); renderAll(); toast(`${r.case_no} → ${ST[status]}`);
    if (status === 'received' && !r.restocked && r.type !== 'feedback') setTimeout(() => { openRetModal(id); toast('Paket stigao. Vrati komad na stanje ako je ispravan.'); }, 300);
  } catch (e) { fail(e); }
}
const RTF = ['type', 'status', 'assignee', 'customer_name', 'phone', 'email', 'instagram', 'order_id', 'product_id', 'item', 'size', 'reason', 'resolution_wanted', 'description', 'exchange_details', 'bank_account', 'delivered_on', 'package_received_at', 'rating', 'refund_amount', 'return_shipping_cost', 'resolution_note', 'improve'];
async function openRetModal(id) {
  const r = id ? state.rets.find(x => x.id === id) : null;
  state.editRetId = id || null;
  $('rtTitle').textContent = r ? `${r.case_no} · ${r.customer_name}` : 'Nova prijava (ručni unos)';
  const d = r && retDue(r);
  $('rtHead').innerHTML = r ? `${pill(r.status)}<span class="rt-type ${r.type}">${RT[r.type]}</span><span class="ch-badge ch-other">${r.source === 'form' ? 'Sa forme' : 'Ručno'} · ${fmtDT(r.created_at)}</span>${d ? `<span class="due ${d.level}">⏱ ${dueText(d)} (${d.date.toLocaleDateString('sr-Latn-RS')})</span>` : ''}${r.order_no && !r.order_id ? `<span class="ch-badge ch-instagram">Kupac upisao porudžbinu ${esc(r.order_no)}</span>` : ''}` : '';
  $('rt_status').innerHTML = RET_ST.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  $('rt_order_id').innerHTML = '<option value="">—</option>' + state.orders.map(o => `<option value="${o.id}">${esc(o.order_no || '')} · ${esc(o.customer_name)}</option>`).join('');
  $('rt_product_id').innerHTML = '<option value="">—</option>' + state.products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('retReasons').innerHTML = [...new Set(state.rets.map(x => x.reason).filter(Boolean).concat(['Ne odgovara veličina', 'Oštećen komad', 'Greška u šivenju', 'Pogrešan komad ili veličina', 'Predomislila sam se']))].map(x => `<option>${esc(x)}</option>`).join('');
  RTF.forEach(f => {
    let v = r ? r[f] : ({ type: 'return', status: 'new', assignee: state.user.display }[f]);
    if (f === 'package_received_at' && v) v = String(v).slice(0, 10);
    if (f === 'product_id' && r && !v && r.item) { const m = state.products.find(p => r.item.toUpperCase().includes(p.name)); if (m) v = m.id; }
    $('rt_' + f).value = v ?? '';
  });
  $('rtDelete').style.display = r ? '' : 'none';
  $('rtIdea').style.display = r ? '' : 'none';
  $('rtPhotos').innerHTML = '';
  if (r?.photos?.length) {
    try {
      const { data } = await sb.storage.from('returns').createSignedUrls(r.photos, 3600);
      $('rtPhotos').innerHTML = `<div class="sec-title">Fotografije kupca</div><div class="photos">${(data || []).filter(x => x.signedUrl).map(x => `<img src="${esc(x.signedUrl)}" data-zoom alt="">`).join('')}</div>`;
    } catch (e) { console.error(e); }
  }
  renderRestock(r);
  $('rtComments').innerHTML = commentsBlock('return_id', state.editRetId);
  $('retModal').classList.add('open');
}
function renderRestock(r) {
  if (!r || r.type === 'feedback') return $('rtRestock').innerHTML = '';
  if (r.restocked) return $('rtRestock').innerHTML = `<div class="hint" style="margin:6px 0 10px">✓ Komad je vraćen na stanje.</div>`;
  const o = r.order_id && order(r.order_id);
  const vs = r.product_id ? variantsOf(r.product_id) : [];
  $('rtRestock').innerHTML = `<div class="sec-title">Zalihe</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${vs.length ? `<select id="rtVariant" class="inline-input" style="width:auto">${vs.map(v => `<option value="${v.id}" ${String(v.size).toUpperCase() === String(r.size || '').toUpperCase() ? 'selected' : ''}>${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''} (${v.stock})</option>`).join('')}</select>
      <button type="button" class="mini-btn" id="rtRestockBtn">Vrati 1 komad na stanje</button>` : '<span class="page-sub">Izaberi komad gore da bi mogao da ga vratiš na stanje.</span>'}
    ${o && o.status !== 'returned' ? `<button type="button" class="mini-btn" id="rtOrderReturned">Cela porudžbina ${esc(o.order_no)} vraćena</button>` : ''}
  </div><div class="hint">Koristi jedno od ova dva dugmeta, ne oba, da se komad ne bi dva puta vratio na stanje.</div>`;
}
async function restockOne() {
  const r = state.rets.find(x => x.id === state.editRetId), v = variant($('rtVariant').value); if (!r || !v) return;
  try {
    await q(sb.from('h_variants').update({ stock: v.stock + 1 }).eq('id', v.id));
    await log({ product_id: v.product_id, type: 'stock', body: `${product(v.product_id)?.name} ${v.size}: ${v.stock} → ${v.stock + 1} (povrat ${r.case_no})` });
    v.stock++;
    await q(sb.from('h_returns').update({ restocked: true }).eq('id', r.id)); r.restocked = true;
    await log({ return_id: r.id, type: 'system', body: `Komad ${product(v.product_id)?.name} ${v.size} vraćen na stanje` });
    renderRestock(r); renderAll(); toast('Vraćeno na stanje ✓');
  } catch (e) { fail(e); }
}
async function restockOrder() {
  const r = state.rets.find(x => x.id === state.editRetId), o = r && order(r.order_id); if (!o) return;
  if (!confirm(`Porudžbina ${o.order_no} ide u status „Vraćena“ i svi njeni komadi se vraćaju na stanje. Nastaviti?`)) return;
  await setOrderStatus(o, 'returned');
  try { await q(sb.from('h_returns').update({ restocked: true }).eq('id', r.id)); r.restocked = true; await log({ return_id: r.id, type: 'system', body: `Porudžbina ${o.order_no} označena kao vraćena` }); renderRestock(r); } catch (e) { fail(e); }
}
async function saveRet(e) {
  e.preventDefault();
  const f = {};
  RTF.forEach(k => { const v = $('rt_' + k).value.trim(); f[k] = v === '' ? null : v; });
  ['refund_amount', 'return_shipping_cost'].forEach(k => f[k] = f[k] === null ? null : n(f[k]));
  f.rating = f.rating === null ? null : Math.min(5, Math.max(1, parseInt(f.rating)));
  if (f.package_received_at) f.package_received_at = new Date(f.package_received_at + 'T12:00:00').toISOString();
  if (f.order_id) f.order_no = order(f.order_id)?.order_no || null;
  try {
    if (state.editRetId) {
      const old = state.rets.find(x => x.id === state.editRetId);
      if (old.status !== f.status && ['resolved', 'rejected'].includes(f.status)) f.resolved_at = new Date().toISOString();
      const r = await q(sb.from('h_returns').update(f).eq('id', old.id).select().single());
      if (old.status !== r.status) await log({ return_id: r.id, type: 'status', body: `Status: ${ST[old.status]} → ${ST[r.status]}` });
      Object.assign(old, r);
    } else {
      Object.assign(f, { source: 'manual', consent: true });
      const r = await q(sb.from('h_returns').insert(f).select().single());
      state.rets.unshift(r);
      await log({ return_id: r.id, type: 'system', body: 'Prijava uneta ručno' });
    }
    $('retModal').classList.remove('open'); renderAll(); toast('Prijava sačuvana ✓');
  } catch (err) { fail(err); }
}
async function deleteRet() {
  if (!confirm('Obrisati prijavu?')) return;
  try { await q(sb.from('h_returns').delete().eq('id', state.editRetId)); state.rets = state.rets.filter(x => x.id !== state.editRetId); $('retModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}
async function retToIdea(id) {
  const r = state.rets.find(x => x.id === id); if (!r) return;
  const title = (r.improve || $('rt_improve')?.value || r.reason || 'Predlog iz povrata').slice(0, 120);
  try {
    const i = await q(sb.from('h_site_ideas').insert({ area: 'site', title, category: 'proizvod', priority: 'medium', status: 'proposed', created_by: state.user.display, votes: [who()],
      description: `Iz prijave ${r.case_no} (${RT[r.type]}): ${r.reason || ''}. ${r.description || ''}`.slice(0, 1000) }).select().single());
    state.ideas.unshift(i);
    await log({ return_id: r.id, type: 'system', body: `Napravljen predlog za sajt: ${title}` });
    renderAll(); toast('Predlog dodat u Sajt ✓');
  } catch (e) { fail(e); }
}

/* ---------------- shell ---------------- */
function renderAll() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + state.tab));
  document.querySelectorAll('#periodSeg button').forEach(b => b.classList.toggle('active', +b.dataset.p === state.period));
  renderOverview(); renderOrders(); renderProducts(); renderAds();
  renderGarderoba(); renderPosts(); renderSite(); renderPackaging(); renderStory(); renderNotes(); renderReturns();
}
function setTab(t) {
  state.tab = t; LS.set('crm_tab', t); renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
  countUp($('v-' + t));
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('loginErr').style.display = 'none';
    try { await enterApp(await signIn($('loginUser').value, $('loginPass').value)); }
    catch (err) { console.error('login', err); $('loginErr').style.display = 'block'; }
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
  document.addEventListener('pointerdown', kbPointerDown);

  // otvaranje porudžbine / proizvoda (delegirano)
  document.addEventListener('click', (e) => {
    if (justDragged) return;
    const vt = e.target.closest('[data-vote]'); if (vt) { e.stopPropagation(); return vote(vt.dataset.vote); }
    const ps = e.target.closest('[data-pstock]'); if (ps) { e.stopPropagation(); return bumpPack(ps.dataset.pstock, +ps.dataset.d); }
    const nt = e.target.closest('[data-note]'); if (nt) return noteAction(nt.dataset.note, nt.dataset.act);
    const ds = e.target.closest('[data-delsec]'); if (ds) return deleteSection(ds.dataset.delsec);
    const np = e.target.closest('[data-newpost]'); if (np) return openPostModal(null, np.dataset.newpost);
    const cm = e.target.closest('[data-cal]'); if (cm) { const m = state.calMonth; state.calMonth = new Date(m.getFullYear(), m.getMonth() + +cm.dataset.cal, 1); return renderPosts(); }
    if (e.target.closest('a')) return;
    const pp = e.target.closest('[data-post]'); if (pp) return openPostModal(pp.dataset.post);
    const ti = e.target.closest('[data-toidea]'); if (ti) { e.stopPropagation(); return retToIdea(ti.dataset.toidea); }
    const rr = e.target.closest('[data-ret]'); if (rr && !e.target.closest('#retModal')) return openRetModal(rr.dataset.ret);
    const ii = e.target.closest('[data-idea]'); if (ii) return openIdeaModal(ii.dataset.idea);
    const pk = e.target.closest('[data-pack]'); if (pk) return openPackModal(pk.dataset.pack);
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

  // v2 sekcije
  $('lowInput').addEventListener('change', (e) => { LS.set('crm_low', Math.max(0, parseInt(e.target.value) || 0)); renderAll(); });
  $('newPostBtn').addEventListener('click', () => openPostModal());
  $('postForm').addEventListener('submit', savePost);
  $('poDelete').addEventListener('click', deletePost);
  $('postViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.postView = b.dataset.view; LS.set('crm_pview', b.dataset.view); renderPosts(); });
  $('postFmtFilter').addEventListener('change', (e) => { state.postFmt = e.target.value; renderPosts(); });
  $('newSiteBtn').addEventListener('click', () => openIdeaModal(null, 'site'));
  $('newPackIdeaBtn').addEventListener('click', () => openIdeaModal(null, 'packaging'));
  $('siteForm').addEventListener('submit', saveIdea);
  $('siDelete').addEventListener('click', deleteIdea);
  $('siteCatSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.siteCat = b.dataset.cat; document.querySelectorAll('#siteCatSeg button').forEach(x => x.classList.toggle('active', x === b)); renderSite(); });
  $('newPackBtn').addEventListener('click', () => openPackModal());
  $('packForm').addEventListener('submit', savePack);
  $('paDelete').addEventListener('click', deletePack);
  $('newSecBtn').addEventListener('click', addSection);
  $('storyDoc').addEventListener('input', storyInput);
  $('whoSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.who = b.dataset.who; if (b.dataset.who !== 'all') state.writer = b.dataset.who; renderNotes(); });
  $('writerSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.writer = b.dataset.writer; renderNotes(); $('noteInput').focus(); });
  $('noteSave').addEventListener('click', addNote);
  $('noteInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } });
  $('noteInput').addEventListener('input', (e) => autosize(e.target));
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset?.cfield) { e.preventDefault(); addComment(e.target); } });

  $('newRetBtn').addEventListener('click', () => openRetModal());
  $('retForm').addEventListener('submit', saveRet);
  $('rtDelete').addEventListener('click', deleteRet);
  $('rtIdea').addEventListener('click', () => retToIdea(state.editRetId));
  $('rtRestock').addEventListener('click', (e) => { if (e.target.id === 'rtRestockBtn') restockOne(); if (e.target.id === 'rtOrderReturned') restockOrder(); });
  $('retViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.retView = b.dataset.view; LS.set('crm_rview', b.dataset.view); renderReturns(); });
  $('retTypeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.retType = b.dataset.t; renderReturns(); });
  $('copyFormBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(FORM_URL()); toast('Link forme kopiran ✓'); } catch (e) { prompt('Kopiraj link:', FORM_URL()); } });
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
  const splash = playSplash(user);
  await loadData();
  renderAll();
  await splash;
  $('loginPage').style.display = 'none';
  $('app').style.display = 'block';
  countUp($('v-' + state.tab));
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
