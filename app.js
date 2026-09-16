/* ================= COMPLETE CRM · HARIZMA modul ================= */
const APP_BUILD = '202609162138';
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
const SHOP_URL_DEFAULT = 'https://wegmk4-wf.myshopify.com';
const setting = (k, d = '') => (state.settings.find(x => x.key === k)?.value ?? d);
const siteUrl = () => setting('site_url', SHOP_URL_DEFAULT) || SHOP_URL_DEFAULT;
Object.assign(ST, Object.fromEntries(POST_ST.map(s => [s.key, s.label])), Object.fromEntries(IDEA_ST.map(s => [s.key, s.label])));
const lowT = () => +LS.get('crm_low', '2');

const LS = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

let state = {
  user: null,
  products: [], variants: [], orders: [], items: [], ads: [], acts: [],
  posts: [], ideas: [], story: [], notes: [], pack: [], rets: [], settings: [],
  retView: LS.get('crm_rview', 'board'), retType: 'all', editRetId: null,
  postView: LS.get('crm_pview', 'board'), postFmt: 'all', siteCat: 'all', who: 'all',
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  writer: null, editPostId: null, editIdeaId: null, ideaArea: 'site', editPackId: null,
  tab: LS.get('crm_tab', 'overview'),
  period: LS.get('crm_period', '30'),
  range: { from: LS.get('crm_rfrom', ''), to: LS.get('crm_rto', '') },
  promos: [], milestones: [], daily: [], customers: [], levents: [], codes: [],
  audit: [], nfGroups: [], nfState: null, trayHidden: false, nfWho: 'others',
  custView: LS.get('crm_cview', 'list'), custSeg: 'all', custSort: 'spend', custTab: 'profile', editCustId: null, editCodeId: null, promoF: 'all', histF: 'all', histMonth: 'all', histLimit: 150, editPromoId: null, editMsId: null,
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
function inPeriod(iso, P) {
  if (P === 'custom') { const f = state.range.from ? new Date(state.range.from + 'T00:00:00') : null, t = state.range.to ? new Date(state.range.to + 'T23:59:59') : null; const d = new Date(iso); return (!f || d >= f) && (!t || d <= t); }
  const days = +P; if (!days) return true;
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
  const [products, variants, orders, items, ads, acts, posts, ideas, story, notes, pack, rets, settings, promos, milestones, daily, customers, levents, codes] = await Promise.all([
    q(sb.from('h_products').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
    q(sb.from('h_variants').select('*').is('deleted_at', null)),
    q(sb.from('h_orders').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
    q(sb.from('h_order_items').select('*').is('deleted_at', null)),
    q(sb.from('h_ad_spend').select('*').is('deleted_at', null).order('day', { ascending: false })),
    q(sb.from('h_activities').select('*').order('created_at', { ascending: true })),
    q(sb.from('h_posts').select('*').is('deleted_at', null).order('publish_at', { ascending: true, nullsFirst: false })),
    q(sb.from('h_site_ideas').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
    q(sb.from('h_story_sections').select('*').is('deleted_at', null).order('position')),
    q(sb.from('h_notes').select('*').is('deleted_at', null).order('created_at', { ascending: true })),
    q(sb.from('h_packaging').select('*').is('deleted_at', null).order('created_at')),
    q(sb.from('h_returns').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
    q(sb.from('h_settings').select('*')),
    q(sb.from('h_promotions').select('*').is('deleted_at', null)),
    q(sb.from('h_milestones').select('*').is('deleted_at', null)),
    q(sb.from('h_daily_stats').select('*').order('day')),
    q(sb.from('h_customers').select('*').is('deleted_at', null)),
    q(sb.from('h_loyalty_events').select('*')),
    q(sb.from('h_discount_codes').select('*').is('deleted_at', null)),
  ]);
  Object.assign(state, { products, variants, orders, items, ads, acts, posts, ideas, story, notes, pack, rets, settings, promos, milestones, daily, customers, levents, codes });
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
    let ns = v.stock + sign * it.qty;
    if (ns < 0) { toast(`${product(v.product_id)?.name || ''} ${v.size}: nema na stanju, prodato bez zalihe`); await log({ product_id: v.product_id, type: 'alert', body: `${product(v.product_id)?.name || ''} ${v.size}: poručeno ${it.qty} a na stanju ${v.stock}. Proveri zalihu.` }); ns = 0; }
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
function stat(label, value, note, metric) {
  const m = metric && METRICS[metric];
  return `<div class="stat ${m ? 'clickable' : ''}" ${m ? `data-metric="${metric}" title="Klikni za grafikon"` : ''}><div class="stat-label"><span class="stat-dot"></span>${label}${m ? deltaChip(metric) : ''}</div><div class="stat-value">${value}</div>${note ? `<div class="stat-note">${note}</div>` : ''}${m ? sparkline(metric) : ''}</div>`;
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
    stat('Prihod', rsd(rev), `<b>${os.length}</b> porudžbina · <b>${pcs}</b> kom`, 'revenue') +
    stat('Bruto profit', rsd(prof), `marža <b>${rev ? pct(prof / rev) : '—'}</b>`, 'profit') +
    stat('Reklame', rsd(spend), `ROAS <b>${spend ? (rev / spend).toFixed(2) + 'x' : '—'}</b>`, 'ads') +
    stat('Neto (posle reklama)', `<span class="${prof - spend >= 0 ? 'pos' : 'neg'}">${rsd(prof - spend)}</span>`, `prosečna korpa <b>${os.length ? rsd(rev / os.length) : '—'}</b>`, 'net');
  let stockPcs = 0, stockCost = 0, stockSell = 0;
  state.products.filter(p => p.status !== 'archived').forEach(p => variantsOf(p.id).forEach(v => { stockPcs += v.stock; stockCost += v.stock * n(p.buy_price); stockSell += v.stock * n(p.sell_price); }));
  const todo = state.orders.filter(o => TODO.includes(o.status));
  $('kpi2').innerHTML =
    stat('Porudžbine', os.length, `<b>${todo.length}</b> za obradu`, 'orders') +
    stat('Komada na stanju', stockPcs, `<b>${state.products.filter(p => p.status === 'active').length}</b> aktivnih modela`, 'stock') +
    stat('Vrednost robe (nabavna)', rsd(stockCost), `po prodajnoj <b>${rsd(stockSell)}</b>`, 'stock_value') +
    stat('Povraćaji', state.rets.filter(r => r.type !== 'feedback' && inPeriod(r.created_at, P)).length, `<b>${returned}</b> vraćenih porudžbina od <b>${all}</b>`, 'returns');

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
  $('kpiStock').innerHTML = stat('Modela', models) + stat('Komada', pcs, '', 'stock') + stat('Uloženo u robu', rsd(cost), '', 'stock_value') + stat('Prodato komada', state.items.filter(i => !NO_REVENUE.includes(order(i.order_id)?.status)).reduce((a, i) => a + i.qty, 0), `prosečna marža <b>${models ? pct(marg / models) : '—'}</b>`, 'sold');
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
  $('kpiAds').innerHTML = stat('Potrošeno', rsd(spend), periodLabel()) +
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
      ${(() => { const c = o.customer_id && state.customers.find(x => x.id === o.customer_id); if (!c) return ''; const s = custStats(c); return `<div class="list-row" data-cust="${c.id}" style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin-bottom:8px"><span><b>${esc(c.name)}</b> · ${s.count} porudžbina · ${rsd(s.spend)}</span>${tierBadge(s.tier)}</div>`; })()}
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
  if (!confirm(`Porudžbina ${o.order_no} ide u arhivu, roba se vraća na stanje. Nastaviti?`)) return;
  try {
    if (!NO_STOCK.includes(o.status)) await adjustStock(itemsOf(o.id), +1);
    await softDelete('h_orders', o.id);
    await log({ order_id: o.id, type: 'system', body: 'Porudžbina obrisana (u arhivi)' });
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
  let dl = $('custDl'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'custDl'; document.body.appendChild(dl); $('o_name').setAttribute('list', 'custDl'); }
  dl.innerHTML = state.customers.map(c => `<option value="${esc(c.name)}">${esc(c.phone || c.instagram || '')}</option>`).join('');
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
      await q(sb.from('h_order_items').update({ deleted_at: new Date().toISOString(), deleted_by: state.user.display }).eq('order_id', old.id).is('deleted_at', null));
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
    try { state.customers = await q(sb.from('h_customers').select('*').is('deleted_at', null)); const fresh = await q(sb.from('h_orders').select('customer_id').eq('id', o.id).single()); o.customer_id = fresh.customer_id; } catch (e2) {}
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
    if (removed.length) await q(sb.from('h_variants').update({ deleted_at: new Date().toISOString(), deleted_by: state.user.display }).in('id', removed.map(v => v.id)));
    for (const s of sizes) {
      const row = { product_id: p.id, size: s.size, color: s.color, stock: s.stock };
      if (s.id) await q(sb.from('h_variants').update(row).eq('id', s.id));
      else await q(sb.from('h_variants').insert(row));
    }
    state.variants = await q(sb.from('h_variants').select('*').is('deleted_at', null));
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
    if (!confirm(`${p.name} ide u arhivu (može da se vrati). Nastaviti?`)) return;
    await softDelete('h_products', p.id);
    await log({ product_id: p.id, type: 'system', body: `${p.name} obrisan (u arhivi)` });
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
  if (!confirm('Objava ide u arhivu (može da se vrati). Nastaviti?')) return;
  try { await softDelete('h_posts', state.editPostId); state.posts = state.posts.filter(x => x.id !== state.editPostId); $('postModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
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
  const u = siteUrl(), pw = setting('site_pass');
  $('siteLink').href = u; $('siteUrlText').href = u;
  $('siteUrlText').textContent = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const st = state.settings.find(x => x.key === 'site_url');
  $('siteMeta').textContent = (pw ? `Lozinka sajta: ${pw} · ` : '') + (u.includes('myshopify.com') ? 'Privremena Shopify adresa, još nema svoj domen' : 'Sopstveni domen') + (st?.updated_by ? ` · izmenio/la ${st.updated_by}` : '');
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
  if (!confirm('Predlog ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_site_ideas', state.editIdeaId); state.ideas = state.ideas.filter(x => x.id !== state.editIdeaId); $('siteModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
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
  if (!confirm('Materijal ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_packaging', state.editPackId); state.pack = state.pack.filter(p => p.id !== state.editPackId); $('packModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
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
  if (!confirm('Poglavlje ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_story_sections', id); state.story = state.story.filter(s => s.id !== id); renderStory(); } catch (e) { fail(e); }
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
    if (act === 'del') { if (!confirm('Beleška ide u arhivu. Nastaviti?')) return; await softDelete('h_notes', id); state.notes = state.notes.filter(z => z.id !== id); }
    else { const f = act === 'pin' ? 'pinned' : 'done'; const patch = { [f]: !x[f] }; if (f === 'done') patch.done_by = !x.done ? who() : null; await q(sb.from('h_notes').update(patch).eq('id', id)); Object.assign(x, patch); }
    renderNotes(); renderHomeNotes(); renderNotesPage(); renderNotesBadge(); if (state.editPromoId && $('promoModal').classList.contains('open')) { renderPromoNotes(state.editPromoId); renderPromos(); }
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
    stat('Vraćeno kupcima', rsd(refunded), `slanje nas koštalo <b>${rsd(shipCost)}</b>`, 'refunds') +
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
  if (!confirm('Prijava ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_returns', state.editRetId); state.rets = state.rets.filter(x => x.id !== state.editRetId); $('retModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
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

/* ---------- MEKO BRISANJE: ništa ne nestaje ---------- */
async function softDelete(table, id) {
  await q(sb.from(table).update({ deleted_at: new Date().toISOString(), deleted_by: state.user.display }).eq('id', id));
}
const ARCH_TABLES = [
  ['h_orders', 'Porudžbina', r => `${r.order_no || ''} ${r.customer_name}`], ['h_products', 'Komad', r => r.name], ['h_posts', 'Objava', r => r.title],
  ['h_site_ideas', 'Predlog', r => r.title], ['h_returns', 'Prijava', r => `${r.case_no} ${r.customer_name}`], ['h_packaging', 'Materijal', r => r.name],
  ['h_promotions', 'Promocija', r => r.name], ['h_customers', 'Kupac', r => r.name], ['h_discount_codes', 'Kod', r => r.code], ['h_milestones', 'Događaj', r => r.title], ['h_notes', 'Beleška', r => r.body], ['h_story_sections', 'Poglavlje', r => r.title], ['h_ad_spend', 'Reklame', r => `${r.day} ${r.campaign}`],
];
async function loadArchive() {
  const res = await Promise.all(ARCH_TABLES.map(([t]) => q(sb.from(t).select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(100))));
  const out = [];
  ARCH_TABLES.forEach(([t, label, name], i) => res[i].forEach(r => out.push({ t, label, name: name(r), r })));
  return out.sort((a, b) => b.r.deleted_at.localeCompare(a.r.deleted_at));
}
async function restoreRow(t, id) {
  try {
    await q(sb.from(t).update({ deleted_at: null, deleted_by: null }).eq('id', id));
    if (t === 'h_orders') {
      const o = await q(sb.from('h_orders').select('*').eq('id', id).single());
      const its = await q(sb.from('h_order_items').select('*').eq('order_id', id).is('deleted_at', null));
      await loadData();
      if (!NO_STOCK.includes(o.status)) await adjustStock(its, -1);
      await log({ order_id: id, type: 'system', body: 'Porudžbina vraćena iz arhive' });
    } else await loadData();
    renderAll(); showArchive(); toast('Vraćeno iz arhive ✓');
  } catch (e) { fail(e); }
}
async function showArchive() {
  const w = $('archiveWrap'); w.style.display = '';
  $('archiveList').innerHTML = '<div class="kb-empty">Učitavam…</div>';
  try {
    const rows = await loadArchive();
    $('archiveList').innerHTML = rows.map(x => `<div class="arch-row"><span><b>${x.label}:</b> ${esc(String(x.name || '').slice(0, 90))} <span class="page-sub">· obrisao/la ${esc(x.r.deleted_by || '?')} · ${fmtDT(x.r.deleted_at)}</span></span><button class="mini-btn" data-restore="${x.t}:${x.r.id}">↩ Vrati</button></div>`).join('')
      || '<div class="kb-empty">Ništa nije obrisano. Sve što je ikad uneto još je tu.</div>';
    w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { fail(e); }
}

/* ---------- DNEVNI PRESEK ---------- */
function computeDayStats(ds) {
  const os = state.orders.filter(o => dayStr(new Date(o.created_at)) === ds && !NO_REVENUE.includes(o.status));
  let revenue = 0, profit = 0; os.forEach(o => { const t = totals(o); revenue += t.revenue; profit += t.profit; });
  let stock_pcs = 0, stock_value = 0;
  state.products.filter(p => p.status !== 'archived').forEach(p => variantsOf(p.id).forEach(v => { stock_pcs += v.stock; stock_value += v.stock * n(p.buy_price); }));
  return { day: ds, orders: os.length, revenue, profit, stock_pcs, stock_value,
    ad_spend: state.ads.filter(a => a.day === ds).reduce((a, x) => a + n(x.spend), 0),
    open_returns: state.rets.filter(r => !retClosed(r) && r.type !== 'feedback').length,
    active_products: state.products.filter(p => p.status === 'active').length, updated_at: new Date().toISOString() };
}
async function snapshotToday() {
  try {
    const today = dayStr(new Date()), y = new Date(); y.setDate(y.getDate() - 1); const yd = dayStr(y);
    const rows = [computeDayStats(today)];
    if (!state.daily.find(d => d.day === yd)) rows.push(computeDayStats(yd));
    await q(sb.from('h_daily_stats').upsert(rows));
    state.daily = state.daily.filter(d => !rows.find(r => r.day === d.day)).concat(rows).sort((a, b) => a.day.localeCompare(b.day));
  } catch (e) { console.warn('snapshot', e); }
}

/* ---------- PROMOCIJE ---------- */
const PROMO_T = { code: 'Kod za popust', launch: 'Lansiranje', flash: 'Flash akcija', free_shipping: 'Besplatna dostava', bundle: 'Paket', giveaway: 'Giveaway', influencer: 'Influenser', other: 'Drugo' };
function promoStatus(p) { const now = new Date(); if (new Date(p.starts_at) > now) return 'planned'; if (p.ends_at && new Date(p.ends_at) < now) return 'ended'; return 'active'; }
Object.assign(ST, { planned: 'Planirana', active: 'Aktivna', ended: 'Završena' });
function promoResults(p) {
  const s = new Date(p.starts_at), e = p.ends_at ? new Date(p.ends_at) : new Date();
  const inP = state.orders.filter(o => !NO_REVENUE.includes(o.status) && new Date(o.created_at) >= s && new Date(o.created_at) <= e);
  let revenue = 0, profit = 0; inP.forEach(o => { const t = totals(o); revenue += t.revenue; profit += t.profit; });
  const code = (p.code || '').trim().toUpperCase();
  const withCode = code ? inP.filter(o => (o.discount_code || '').trim().toUpperCase() === code) : [];
  const codeRev = withCode.reduce((a, o) => a + totals(o).revenue, 0);
  const days = Math.max(1, Math.ceil((Math.min(e, new Date()) - s) / 864e5));
  const b0 = new Date(s); b0.setDate(b0.getDate() - 14);
  const base = state.orders.filter(o => !NO_REVENUE.includes(o.status) && new Date(o.created_at) >= b0 && new Date(o.created_at) < s);
  const baseDaily = base.reduce((a, o) => a + totals(o).revenue, 0) / 14;
  const lift = baseDaily > 0 ? (revenue / days) / baseDaily - 1 : null;
  const spend = state.ads.filter(a => { const d = new Date(a.day + 'T12:00:00'); return d >= s && d <= e; }).reduce((a, x) => a + n(x.spend), 0) + n(p.budget && !state.ads.length ? p.budget : 0);
  return { orders: inP.length, revenue, profit, withCode: withCode.length, codeRev, days, lift, baseDaily, spend, net: profit - spend };
}
function promoNotes(id) { return state.notes.filter(x => x.area === 'promo:' + id).sort((a, b) => a.created_at.localeCompare(b.created_at)); }
function renderPromos() {
  const list = state.promos.filter(p => state.promoF === 'all' || promoStatus(p) === state.promoF)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const active = state.promos.filter(p => promoStatus(p) === 'active');
  const pb = $('promoBadge'); pb.style.display = active.length ? '' : 'none'; pb.textContent = active.length;
  document.querySelectorAll('#promoSeg button').forEach(b => b.classList.toggle('active', b.dataset.f === state.promoF));
  $('promoCount').textContent = `${list.length} promocija`;
  let best = null, totRev = 0;
  state.promos.forEach(p => { const r = promoResults(p); totRev += r.revenue; if (!best || r.revenue > best.r.revenue) best = { p, r }; });
  $('kpiPromo').innerHTML = stat('Aktivne', active.length, active.map(p => esc(p.name)).join(', ') || 'trenutno nijedna') +
    stat('Ukupno promocija', state.promos.length, `${state.promos.filter(p => promoStatus(p) === 'ended').length} završenih`) +
    stat('Prihod tokom promocija', rsd(totRev), 'sve porudžbine u periodima akcija') +
    stat('Najbolja', best ? esc(best.p.name) : '—', best ? `${rsd(best.r.revenue)} · ${best.r.orders} porudžbina` : '');
  // gantt
  if (!state.promos.length) $('promoGantt').innerHTML = '<div class="gantt-empty">Još nema promocija. Kad dodaš prvu, ovde se vidi cela istorija na jednoj liniji.</div>';
  else {
    const now = new Date();
    let min = new Date(Math.min(...state.promos.map(p => +new Date(p.starts_at)), +now)), max = new Date(Math.max(...state.promos.map(p => +(p.ends_at ? new Date(p.ends_at) : now)), +now));
    min = new Date(min.getFullYear(), min.getMonth(), 1); max = new Date(max.getFullYear(), max.getMonth() + 1, 1);
    const span = max - min, pct = (d) => Math.min(100, Math.max(0, (d - min) / span * 100));
    const months = []; for (let d = new Date(min); d < max; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
    $('promoGantt').innerHTML = `<div class="gantt-inner" style="min-width:${Math.max(600, months.length * 110)}px">
      <div class="gantt-months">${months.map(m => `<span style="left:${pct(m)}%">${m.toLocaleDateString('sr-Latn-RS', { month: 'short', year: '2-digit' })}</span>`).join('')}</div>
      ${state.promos.slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((p, i) => { const s = new Date(p.starts_at), e = p.ends_at ? new Date(p.ends_at) : new Date(max); const st = promoStatus(p); const r = promoResults(p);
        return `<div class="gantt-row"><div class="gantt-lbl" title="${esc(p.name)}">${esc(p.name)}</div><div class="gantt-track"><div class="gantt-bar ${st}" data-promo="${p.id}" style="left:${pct(s)}%;width:${Math.max(1.5, pct(e) - pct(s))}%;animation-delay:${i * 60}ms" title="${esc(p.name)}: ${rsd(r.revenue)}">${p.code ? esc(p.code) + ' · ' : ''}${rsd(r.revenue)}</div></div></div>`; }).join('')}
      <div class="gantt-today" style="left:calc(170px + (100% - 170px) * ${pct(now) / 100})"></div></div>`;
  }
  $('promoList').innerHTML = list.map(p => { const st = promoStatus(p), r = promoResults(p), ns = promoNotes(p.id).slice(-2);
    return `<div class="promo ${st}" data-promo="${p.id}">
      <div class="promo-top"><div><div class="promo-name">${esc(p.name)}</div><div class="promo-when">${fmtDate(p.starts_at)} → ${p.ends_at ? fmtDate(p.ends_at) : 'traje'} · ${r.days} d · ${PROMO_T[p.type]}${p.channel ? ' · ' + esc(p.channel) : ''}</div></div>
        <div style="text-align:right">${pill(st)}${p.code ? `<div style="margin-top:6px"><span class="promo-code">${esc(p.code)}</span></div>` : ''}</div></div>
      <div class="promo-nums"><div><b>${r.orders}</b><span>porudžbina${p.code ? ` · ${r.withCode} sa kodom` : ''}</span></div><div><b>${rsd(r.revenue)}</b><span>prihod u periodu</span></div><div><b class="${r.profit >= 0 ? 'pos' : 'neg'}">${rsd(r.profit)}</b><span>bruto profit</span></div></div>
      ${r.lift != null ? `<span class="lift ${r.lift >= 0 ? 'up' : 'down'}">${r.lift >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(r.lift * 100))}% dnevnog prihoda u odnosu na 14 dana pre</span>` : `<span class="lift">bez poređenja, nema porudžbina pre akcije</span>`}
      ${p.result_note ? `<div class="promo-notes"><b>Zaključak:</b> ${esc(p.result_note)}</div>` : ''}
      ${ns.length ? `<div class="promo-notes">${ns.map(x => `<div><span class="by ${PEOPLE[x.author] ? x.author : 'other'}">${esc(personName(x.author))}</span>${esc(x.body)}</div>`).join('')}</div>` : ''}
    </div>`; }).join('') || `<div class="panel" style="grid-column:1/-1"><div class="page-sub">Nema promocija u ovom filteru.</div></div>`;
}
const PRF = ['name', 'type', 'code', 'discount_pct', 'discount_rsd', 'description', 'channel', 'budget', 'goal', 'result_note'];
function openPromoModal(id) {
  const p = id ? state.promos.find(x => x.id === id) : null;
  state.editPromoId = id || null;
  $('prTitle').textContent = p ? p.name : 'Nova promocija';
  PRF.forEach(f => $('pr_' + f).value = p ? (p[f] ?? '') : (f === 'type' ? 'code' : ''));
  $('pr_starts_at').value = p ? toLocalInput(p.starts_at) : toLocalInput(new Date().toISOString()).slice(0, 11) + '00:00';
  $('pr_ends_at').value = p ? toLocalInput(p.ends_at) : '';
  $('prDelete').style.display = p ? '' : 'none';
  if (p) { const r = promoResults(p);
    $('prResults').innerHTML = `<div class="sec-title">Rezultat (računa se iz porudžbina)</div><div class="pr-res"><div><b>${r.orders}</b><span>porudžbina</span></div><div><b>${rsd(r.revenue)}</b><span>prihod</span></div><div><b>${rsd(r.profit)}</b><span>profit</span></div><div><b>${r.lift != null ? (r.lift >= 0 ? '+' : '') + Math.round(r.lift * 100) + '%' : '—'}</b><span>vs 14 dana pre</span></div></div>${p.code ? `<div class="hint">Sa kodom ${esc(p.code)}: ${r.withCode} porudžbina, ${rsd(r.codeRev)}. Kod se prepoznaje iz polja „Kod za popust“ na porudžbini.</div>` : ''}`;
    renderPromoNotes(p.id);
  } else { $('prResults').innerHTML = ''; $('prNotes').innerHTML = ''; }
  $('promoModal').classList.add('open'); $('pr_name').focus();
}
function renderPromoNotes(id) {
  const w = state.writer || who();
  $('prNotes').innerHTML = `<div class="sec-title">Beleške tima</div><div class="notes-inline">${promoNotes(id).map(x => `<div class="note"><span class="by ${PEOPLE[x.author] ? x.author : 'other'}">${esc(personName(x.author))}</span><span class="txt">${esc(x.body)}</span><span class="n-act"><button type="button" data-note="${x.id}" data-act="del">✕</button></span></div>`).join('') || '<div class="page-sub">Još nema beleški.</div>'}
    <div class="writer" style="margin-top:8px"><span>Piše:</span>${Object.keys(PEOPLE).map(k => `<button type="button" data-pwriter="${k}" class="${k === w ? 'active' : ''}">${PEOPLE[k].name}</button>`).join('')}</div>
    <textarea id="prNoteInput" placeholder="Beleška uz ovu promociju… (Enter za čuvanje)"></textarea></div>`;
}
async function savePromo(e) {
  e.preventDefault();
  const f = {}; PRF.forEach(k => { const v = $('pr_' + k).value.trim(); f[k] = v === '' ? null : v; });
  if (f.code) f.code = f.code.toUpperCase();
  ['discount_pct', 'discount_rsd', 'budget'].forEach(k => f[k] = f[k] === null ? null : n(f[k]));
  f.starts_at = new Date($('pr_starts_at').value).toISOString();
  f.ends_at = $('pr_ends_at').value ? new Date($('pr_ends_at').value).toISOString() : null;
  if (f.ends_at && f.ends_at < f.starts_at) return toast('Kraj je pre početka');
  try {
    if (state.editPromoId) { const r = await q(sb.from('h_promotions').update(f).eq('id', state.editPromoId).select().single()); Object.assign(state.promos.find(x => x.id === r.id), r); }
    else { f.created_by = state.user.display; const r = await q(sb.from('h_promotions').insert(f).select().single()); state.promos.push(r); await log({ promo_id: r.id, type: 'system', body: `Promocija „${r.name}“ dodata (${fmtDate(r.starts_at)} → ${r.ends_at ? fmtDate(r.ends_at) : 'traje'})` }); }
    $('promoModal').classList.remove('open'); renderAll(); toast('Promocija sačuvana ✓');
  } catch (err) { fail(err); }
}
async function deletePromo() {
  if (!confirm('Promocija ide u arhivu (može da se vrati). Nastaviti?')) return;
  try { await softDelete('h_promotions', state.editPromoId); state.promos = state.promos.filter(x => x.id !== state.editPromoId); $('promoModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}
async function addPromoNote() {
  const body = $('prNoteInput').value.trim(); if (!body) return;
  try { state.notes.push(await q(sb.from('h_notes').insert({ area: 'promo:' + state.editPromoId, author: state.writer || who(), body }).select().single())); renderPromoNotes(state.editPromoId); renderPromos(); } catch (e) { fail(e); }
}

/* ---------- ISTORIJA ---------- */
const MS_K = { start: 'Početak', end: 'Kraj', decision: 'Odluka', milestone: 'Prekretnica', event: 'Događaj' };
function actCategory(a) {
  if (a.return_id) return 'ret'; if (a.post_id) return 'post'; if (a.promo_id) return 'promo'; if (a.site_id || a.packaging_id) return 'site';
  if (a.type === 'stock' || a.type === 'alert' || (a.product_id && !a.order_id)) return 'stock';
  return 'order';
}
function actText(a) {
  const o = a.order_id && order(a.order_id), p = a.product_id && product(a.product_id), po = a.post_id && state.posts.find(x => x.id === a.post_id),
    r = a.return_id && state.rets.find(x => x.id === a.return_id), pr = a.promo_id && state.promos.find(x => x.id === a.promo_id), i = a.site_id && state.ideas.find(x => x.id === a.site_id), pk = a.packaging_id && state.pack.find(x => x.id === a.packaging_id);
  const ref = o ? `<span class="ref">${esc(o.order_no || '')} ${esc(o.customer_name)}</span>` : po ? `<span class="ref">${esc(po.title)}</span>` : r ? `<span class="ref">${esc(r.case_no)} ${esc(r.customer_name)}</span>` : pr ? `<span class="ref">${esc(pr.name)}</span>` : i ? `<span class="ref">${esc(i.title)}</span>` : pk ? `<span class="ref">${esc(pk.name)}</span>` : p && !/^[A-ZČĆŠĐŽ]/.test(a.body || '') ? `<span class="ref">${esc(p.name)}</span>` : '';
  const body = a.type === 'comment' ? `komentar: „${esc(a.body)}“` : a.type === 'screenshot' ? 'dodat screenshot' : esc(a.body || '');
  const open = o ? `order:${o.id}` : po ? `post:${po.id}` : r ? `ret:${r.id}` : pr ? `promo:${pr.id}` : i ? `idea:${i.id}` : pk ? `pack:${pk.id}` : p ? `product:${p.id}` : '';
  return { html: `<span class="who">${esc(a.author)}</span> · ${ref ? ref + ' · ' : ''}${body}`, open };
}
function historyEvents() {
  const ev = [];
  state.milestones.forEach(m => ev.push({ at: m.happened_at, cat: 'milestone', m }));
  state.acts.forEach(a => ev.push({ at: a.created_at, cat: actCategory(a), a }));
  state.promos.forEach(p => { ev.push({ at: p.starts_at, cat: 'promo', txt: `Počela promocija <span class="ref">${esc(p.name)}</span>${p.code ? ' (' + esc(p.code) + ')' : ''}`, open: `promo:${p.id}`, future: new Date(p.starts_at) > new Date() });
    if (p.ends_at) ev.push({ at: p.ends_at, cat: 'promo', txt: `Završena promocija <span class="ref">${esc(p.name)}</span>`, open: `promo:${p.id}`, future: new Date(p.ends_at) > new Date() }); });
  return ev.filter(e => !e.future).sort((a, b) => b.at.localeCompare(a.at));
}
function renderHistory() {
  const all = historyEvents();
  const months = [...new Set(all.map(e => e.at.slice(0, 7)))];
  const sel = $('histMonth'); const cur = state.histMonth;
  sel.innerHTML = `<option value="all">Svi meseci</option>` + months.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${new Date(m + '-01T12:00:00').toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' })}</option>`).join('');
  document.querySelectorAll('#histSeg button').forEach(b => b.classList.toggle('active', b.dataset.f === state.histF));
  const list = all.filter(e => (state.histF === 'all' || e.cat === state.histF) && (cur === 'all' || e.at.startsWith(cur)));
  $('histCount').textContent = `${list.length} zapisa`;
  const first = all.length ? all[all.length - 1].at : null;
  const allRev = state.orders.filter(o => !NO_REVENUE.includes(o.status)).reduce((a, o) => a + totals(o).revenue, 0);
  $('kpiHist').innerHTML = stat('Dana od početka', first ? Math.max(1, Math.ceil((new Date() - new Date(first)) / 864e5)) : 0, first ? `od ${fmtDate(first)}` : '') +
    stat('Zapisa u istoriji', all.length, `${state.milestones.length} prekretnica`) +
    stat('Porudžbina ikad', state.orders.length, `${state.orders.filter(o => o.status === 'delivered').length} isporučenih`) +
    stat('Prihod ikad', rsd(allRev), 'bez otkazanih i vraćenih');
  renderHistChart();
  const groups = {};
  list.slice(0, state.histLimit).forEach(e => { const d = dayStr(new Date(e.at)); (groups[d] = groups[d] || []).push(e); });
  $('timeline').innerHTML = Object.entries(groups).map(([d, evs], gi) => {
    const dayOrders = state.orders.filter(o => dayStr(new Date(o.created_at)) === d && !NO_REVENUE.includes(o.status));
    const rev = dayOrders.reduce((a, o) => a + totals(o).revenue, 0);
    const ds = state.daily.find(x => x.day === d);
    const dt = new Date(d + 'T12:00:00');
    return `<div class="tl-day" style="animation-delay:${Math.min(gi, 10) * 40}ms"><div class="tl-dayhead"><span class="tl-date">${dt.toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <span class="tl-sum">${dayOrders.length ? `<b>${dayOrders.length}</b> porudžbina · <b>${rsd(rev)}</b>` : 'bez porudžbina'}${ds ? ` · na stanju <b>${ds.stock_pcs}</b> kom` : ''}</span></div>
      ${evs.map(e => {
        const t = new Date(e.at).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
        if (e.m) return `<div class="tl-item milestone" data-open="ms:${e.m.id}"><div class="tl-time">${t}</div><div class="tl-body"><div class="tl-milestone"><div class="k">${MS_K[e.m.kind]}</div><div class="t">${esc(e.m.title)}</div>${e.m.body ? `<p>${esc(e.m.body)}</p>` : ''}<div class="page-sub" style="margin-top:6px">${esc(e.m.author || '')}</div></div></div></div>`;
        const x = e.a ? actText(e.a) : { html: e.txt, open: e.open };
        const ic = { order: '◫', stock: '▤', alert: '!', post: '▶', ret: '↩', promo: '％', site: '✎' }[e.cat] || '•';
        return `<div class="tl-item" ${x.open ? `data-open="${x.open}"` : ''}><div class="tl-time">${t}</div><div class="tl-ic ${e.a && e.a.type === 'alert' ? 'alert' : e.cat}">${ic}</div><div class="tl-body">${x.html}</div></div>`;
      }).join('')}</div>`;
  }).join('') || '<div class="kb-empty" style="padding:30px">Još nema zapisa za ovaj filter.</div>';
  $('timeline').insertAdjacentHTML('beforeend', list.length > state.histLimit ? `<div class="tl-more"><button class="btn-ghost" id="histMore">Prikaži još (${list.length - state.histLimit})</button></div>` : '');
}
function renderHistChart() {
  const days = 60, today = new Date(); today.setHours(0, 0, 0, 0);
  const data = []; let max = 0;
  for (let i = days - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const ds = dayStr(d);
    const os = state.orders.filter(o => dayStr(new Date(o.created_at)) === ds && !NO_REVENUE.includes(o.status));
    const v = os.reduce((a, o) => a + totals(o).revenue, 0); max = Math.max(max, v); data.push({ ds, v, c: os.length, d }); }
  $('histChartSub').textContent = `poslednjih ${days} dana`;
  const W = 1000, H = 130, bw = W / days;
  $('histChart').innerHTML = `<svg viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none">${data.map((x, i) => `<rect class="bar ${x.v ? '' : 'empty'}" x="${i * bw + 1}" y="${x.v ? H - Math.max(3, x.v / (max || 1) * H) : H - 2}" width="${bw - 2}" height="${x.v ? Math.max(3, x.v / (max || 1) * H) : 2}" rx="2" style="animation-delay:${i * 8}ms" data-i="${i}"><title>${x.d.toLocaleDateString('sr-Latn-RS')}: ${rsd(x.v)} · ${x.c} porudžbina</title></rect>`).join('')}
    ${data.map((x, i) => x.d.getDate() === 1 || i === 0 ? `<text class="lbl" x="${i * bw + 2}" y="${H + 14}">${x.d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' })}</text>` : '').join('')}</svg>`;
}
const MSF = ['title', 'kind', 'body'];
function openMsModal(id) {
  const m = id ? state.milestones.find(x => x.id === id) : null;
  state.editMsId = id || null;
  $('msTitle').textContent = m ? 'Događaj' : 'Zabeleži događaj';
  MSF.forEach(f => $('ms_' + f).value = m ? (m[f] ?? '') : (f === 'kind' ? 'event' : ''));
  $('ms_happened_at').value = toLocalInput(m ? m.happened_at : new Date().toISOString());
  $('msDelete').style.display = m ? '' : 'none';
  $('msModal').classList.add('open'); $('ms_title').focus();
}
async function saveMs(e) {
  e.preventDefault();
  const f = {}; MSF.forEach(k => { const v = $('ms_' + k).value.trim(); f[k] = v === '' ? null : v; });
  f.happened_at = new Date($('ms_happened_at').value || Date.now()).toISOString();
  try {
    if (state.editMsId) { const r = await q(sb.from('h_milestones').update(f).eq('id', state.editMsId).select().single()); Object.assign(state.milestones.find(x => x.id === r.id), r); }
    else { f.author = state.user.display; state.milestones.push(await q(sb.from('h_milestones').insert(f).select().single())); }
    $('msModal').classList.remove('open'); renderAll(); toast('Zabeleženo ✓');
  } catch (err) { fail(err); }
}
async function deleteMs() {
  if (!confirm('Događaj ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_milestones', state.editMsId); state.milestones = state.milestones.filter(x => x.id !== state.editMsId); $('msModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}
function openRef(ref) {
  const [k, id] = ref.split(':');
  if (k === 'order') openDrawer(id); else if (k === 'post') openPostModal(id); else if (k === 'ret') openRetModal(id); else if (k === 'promo') openPromoModal(id);
  else if (k === 'idea') openIdeaModal(id); else if (k === 'pack') openPackModal(id); else if (k === 'product') openProductModal(id); else if (k === 'ms') openMsModal(id); else if (k === 'cust') openCustModal(id); else if (k === 'code') openCodeModal(id);
}
function periodLabel() { const P = state.period; return P === 'custom' ? `${state.range.from || '…'} do ${state.range.to || '…'}` : P === '0' || P === 0 ? 'sve vreme' : P === '1' || P === 1 ? 'danas' : `poslednjih ${P} dana`; }

/* ---------- PRETRAGA (command palette) ---------- */
const SECTIONS = [
  { tab: 'overview', name: 'Pregled', kw: 'dashboard pocetna prihod profit statistika brojke', ic: '◈' },
  { tab: 'notes', name: 'Beleške', kw: 'beleske note zapisi papirici tim', ic: '✎' },
  { tab: 'orders', name: 'Porudžbine', kw: 'narudzbine order kupovine pipeline tabela', ic: '◫' },
  { tab: 'customers', name: 'Kupci', kw: 'klijenti kupac loyalty klub popusti kodovi vip poeni', ic: '☺' },
  { tab: 'products', name: 'Garderoba', kw: 'roba proizvodi zalihe stanje velicine komadi upozorenja', ic: '▤' },
  { tab: 'returns', name: 'Povrati', kw: 'reklamacije zamene zalbe feedback utisci forma', ic: '↩' },
  { tab: 'promos', name: 'Promocije', kw: 'akcije popust kampanje kod lansiranje', ic: '％' },
  { tab: 'posts', name: 'Objave', kw: 'instagram reel content sadrzaj kalendar video drive', ic: '▶' },
  { tab: 'packaging', name: 'Pakovanje', kw: 'ambalaza kutije stikeri kartice papir', ic: '▣' },
  { tab: 'site', name: 'Sajt', kw: 'shopify web predlozi link domen', ic: '◎' },
  { tab: 'story', name: 'Brand story', kw: 'prica brend beleske poglavlja', ic: '✎' },
  { tab: 'ads', name: 'Reklame', kw: 'meta ads potrosnja roas facebook', ic: '▲' },
  { tab: 'history', name: 'Istorija', kw: 'vremenska linija dogadjaji arhiva prekretnice obrisano backup', ic: '◷' },
];
const ACTIONS = [
  { name: 'Nova porudžbina', kw: 'dodaj unesi', ic: '+', run: () => openOrderModal() },
  { name: 'Nova beleška', kw: 'zabelezi note zapisi', ic: '✎', run: () => openNoteModal('general') },
  { name: 'Novi kupac', kw: 'dodaj', ic: '+', run: () => openCustModal() },
  { name: 'Novi komad', kw: 'proizvod roba dodaj', ic: '+', run: () => openProductModal() },
  { name: 'Nova ideja za objavu', kw: 'post reel', ic: '+', run: () => openPostModal() },
  { name: 'Nova promocija', kw: 'akcija', ic: '+', run: () => openPromoModal() },
  { name: 'Novi kod za popust', kw: 'kupon', ic: '+', run: () => openCodeModal() },
  { name: 'Nova prijava povrata (ručno)', kw: 'reklamacija', ic: '+', run: () => openRetModal() },
  { name: 'Novi predlog za sajt', kw: 'ideja', ic: '+', run: () => openIdeaModal(null, 'site') },
  { name: 'Novi predlog za pakovanje', kw: 'ambalaza', ic: '+', run: () => openIdeaModal(null, 'packaging') },
  { name: 'Zabeleži događaj u istoriji', kw: 'prekretnica milestone', ic: '+', run: () => openMsModal() },
  { name: 'Kopiraj link forme za povrate', kw: 'link', ic: '⧉', run: async () => { try { await navigator.clipboard.writeText(FORM_URL()); toast('Link kopiran ✓'); } catch (e) { prompt('Kopiraj:', FORM_URL()); } } },
  { name: 'Otvori HARIZMA sajt', kw: 'shop', ic: '↗', run: () => window.open(siteUrl(), '_blank') },
  { name: 'Arhiva obrisanog', kw: 'vrati obrisano', ic: '◷', run: () => { setTab('history'); showArchive(); } },
  { name: 'Odjavi se', kw: 'logout izlaz', ic: '⎋', run: async () => { await sb.auth.signOut(); location.reload(); } },
];
const fold = (s) => String(s || '').toLowerCase().replace(/č|ć/g, 'c').replace(/š/g, 's').replace(/đ/g, 'd').replace(/ž/g, 'z').normalize('NFD').replace(/[̀-ͯ]/g, '');
function scoreMatch(hay, qn) { const h = fold(hay); if (!qn) return 1; if (h === qn) return 100; if (h.startsWith(qn)) return 60; if (h.split(/\s+/).some(w => w.startsWith(qn))) return 40; if (h.includes(qn)) return 20; return 0; }
function hl(text, qn) { if (!qn) return esc(text); const f = fold(text), i = f.indexOf(qn); if (i < 0) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + qn.length)) + '</mark>' + esc(text.slice(i + qn.length)); }
const recent = () => { try { return JSON.parse(LS.get('crm_recent', '[]')); } catch (e) { return []; } };
function remember(item) { const r = recent().filter(x => !(x.k === item.k && x.id === item.id)); r.unshift(item); LS.set('crm_recent', JSON.stringify(r.slice(0, 6))); }
function cmdItems(qraw) {
  const qn = fold(qraw.trim()); const out = [];
  const push = (grp, it, score) => { if (score > 0) out.push({ grp, score, ...it }); };
  SECTIONS.forEach(s => push('Sekcije', { ic: s.ic, title: s.name, sub: 'Sekcija', k: 'tab', id: s.tab }, qn ? Math.max(scoreMatch(s.name, qn), scoreMatch(s.kw, qn) ? 15 : 0) : 1));
  ACTIONS.forEach(a => push('Akcije', { ic: a.ic, title: a.name, sub: 'Akcija', k: 'act', run: a.run }, qn ? Math.max(scoreMatch(a.name, qn), scoreMatch(a.kw, qn) ? 10 : 0) : 1));
  if (!qn) {
    recent().forEach(r => push('Nedavno', { ic: '◷', title: r.label, sub: r.sub || '', k: r.k, id: r.id }, 1));
  } else {
    state.customers.forEach(c => { const s = custStats(c); push('Kupci', { ic: '☺', title: c.name, sub: [c.phone, c.instagram, `${s.count} porudžbina`, rsd(s.spend)].filter(Boolean).join(' · '), k: 'cust', id: c.id }, Math.max(scoreMatch(c.name, qn), scoreMatch(c.phone, qn), scoreMatch(c.instagram, qn), scoreMatch(c.email, qn))); });
    state.orders.forEach(o => push('Porudžbine', { ic: '◫', title: `${o.order_no || ''} · ${o.customer_name}`, sub: `${ST[o.status]} · ${rsd(totals(o).revenue)} · ${fmtDate(o.created_at)} · ${itemsSummary(o).replace(/<[^>]+>/g, '')}`, k: 'order', id: o.id }, Math.max(scoreMatch(o.order_no, qn), scoreMatch(o.customer_name, qn), scoreMatch(o.phone, qn), scoreMatch(o.tracking_no, qn), scoreMatch(o.city, qn) / 2)));
    state.products.forEach(p => { const st = variantsOf(p.id).reduce((a, v) => a + v.stock, 0); push('Garderoba', { ic: '▤', title: p.name, sub: `${p.category || ''} · ${st} kom na stanju · ${rsd(p.sell_price)}`, k: 'product', id: p.id }, Math.max(scoreMatch(p.name, qn), scoreMatch(p.category, qn) / 2)); });
    state.posts.forEach(p => push('Objave', { ic: '▶', title: p.title, sub: `${ST[p.status]} · ${FMT[p.format] || ''}${p.publish_at ? ' · ' + fmtDate(p.publish_at) : ''}`, k: 'post', id: p.id }, Math.max(scoreMatch(p.title, qn), scoreMatch(p.hook, qn) / 2)));
    state.rets.forEach(r => push('Povrati', { ic: '↩', title: `${r.case_no} · ${r.customer_name}`, sub: `${RT[r.type]} · ${ST[r.status]} · ${r.item || ''}`, k: 'ret', id: r.id }, Math.max(scoreMatch(r.case_no, qn), scoreMatch(r.customer_name, qn), scoreMatch(r.phone, qn))));
    state.promos.forEach(p => push('Promocije', { ic: '％', title: p.name, sub: `${fmtDate(p.starts_at)} → ${p.ends_at ? fmtDate(p.ends_at) : 'traje'}${p.code ? ' · ' + p.code : ''}`, k: 'promo', id: p.id }, Math.max(scoreMatch(p.name, qn), scoreMatch(p.code, qn))));
    state.codes.forEach(c => push('Popusti', { ic: '％', title: c.code, sub: `${c.pct ? c.pct + '%' : ''}${c.rsd ? rsd(c.rsd) : ''} · ${codeUses(c).n} upotreba`, k: 'code', id: c.id }, scoreMatch(c.code, qn)));
    state.milestones.forEach(m => push('Istorija', { ic: '◷', title: m.title, sub: fmtDate(m.happened_at), k: 'ms', id: m.id }, scoreMatch(m.title, qn)));
    state.ideas.forEach(i => push('Predlozi', { ic: '✎', title: i.title, sub: i.area === 'site' ? 'Sajt' : 'Pakovanje', k: 'idea', id: i.id }, scoreMatch(i.title, qn)));
    state.pack.forEach(p => push('Pakovanje', { ic: '▣', title: p.name, sub: `${p.stock} kom`, k: 'pack', id: p.id }, scoreMatch(p.name, qn)));
    out.push({ grp: 'Filter', score: 0.5, ic: '⌕', title: `Filtriraj tekuću sekciju po „${qraw.trim()}“`, sub: 'Sužava tabele i table u sekciji u kojoj si', k: 'filter', q: qraw.trim() });
  }
  out.sort((a, b) => b.score - a.score);
  const grouped = {}, order = [];
  out.forEach(it => { if (!grouped[it.grp]) { grouped[it.grp] = []; order.push(it.grp); } if (grouped[it.grp].length < (qn ? 6 : 12)) grouped[it.grp].push(it); });
  return order.flatMap(g => grouped[g]);
}
let cmdSel = 0, cmdCur = [];
function openCmd() { $('cmdWrap').classList.add('open'); $('cmdInput').value = ''; renderCmd(); setTimeout(() => $('cmdInput').focus(), 30); }
function closeCmd() { $('cmdWrap').classList.remove('open'); }
function renderCmd() {
  const qraw = $('cmdInput').value, qn = fold(qraw.trim());
  cmdCur = cmdItems(qraw); cmdSel = Math.min(cmdSel, Math.max(0, cmdCur.length - 1));
  let last = null;
  $('cmdList').innerHTML = cmdCur.map((it, i) => { const g = it.grp !== last ? `<div class="cmd-grp">${it.grp}</div>` : ''; last = it.grp;
    return g + `<div class="cmd-item ${i === cmdSel ? 'sel' : ''}" data-ci="${i}"><div class="ci">${it.ic}</div><div class="ct"><b>${hl(it.title, qn)}</b>${it.sub ? `<small>${hl(it.sub, qn)}</small>` : ''}</div>${it.k === 'tab' ? `<span class="ck">${SECTIONS.findIndex(s => s.tab === it.id) + 1}</span>` : ''}</div>`; }).join('')
    || `<div class="cmd-empty">Ništa za „${esc(qraw)}“. Probaj ime kupca, broj porudžbine ili ime sekcije.</div>`;
  const el = $('cmdList').querySelector('.cmd-item.sel'); if (el) el.scrollIntoView({ block: 'nearest' });
}
function runCmd(it) {
  if (!it) return; closeCmd();
  if (it.k === 'tab') return setTab(it.id);
  if (it.k === 'act') return it.run();
  if (it.k === 'filter') return setQuery(it.q);
  remember({ k: it.k, id: it.id, label: it.title, sub: it.sub });
  const tabFor = { order: 'orders', cust: 'customers', product: 'products', post: 'posts', ret: 'returns', promo: 'promos', code: 'customers', ms: 'history', idea: 'site', pack: 'packaging' };
  if (tabFor[it.k] && state.tab !== tabFor[it.k]) setTab(tabFor[it.k]);
  if (it.k === 'cust') return openCustModal(it.id);
  if (it.k === 'code') return openCodeModal(it.id);
  openRef(`${it.k}:${it.id}`);
}
function setQuery(qv) {
  state.q = qv || '';
  const f = $('cmdFilter'); f.style.display = state.q ? '' : 'none'; f.innerHTML = `⌕ ${esc(state.q)} <b>✕</b>`;
  if (state.q && state.tab === 'overview') state.tab = 'orders';
  renderAll();
}

/* ---------- KUPCI ---------- */
const LOY_DEFAULT = { points_per_100: 1, reward_points: 100, reward_discount: 10, reward_days: 30, tiers: [{ key: 'nova', name: 'Nova', min_spend: 0, min_orders: 1, discount: 0 }, { key: 'stalna', name: 'Stalna', min_spend: 8000, min_orders: 2, discount: 5 }, { key: 'klub', name: 'HARIZMA klub', min_spend: 20000, min_orders: 4, discount: 10 }, { key: 'vip', name: 'VIP', min_spend: 50000, min_orders: 8, discount: 15 }] };
function loy() { try { return { ...LOY_DEFAULT, ...JSON.parse(setting('loyalty', '{}') || '{}') }; } catch (e) { return LOY_DEFAULT; } }
const custOrders = (id) => state.orders.filter(o => o.customer_id === id);
function custStats(c) {
  const os = custOrders(c.id).filter(o => !NO_REVENUE.includes(o.status)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const spend = os.reduce((a, o) => a + totals(o).revenue, 0);
  const L = loy();
  const earned = Math.floor(spend / 100) * n(L.points_per_100);
  const ev = state.levents.filter(e => e.customer_id === c.id).reduce((a, e) => a + e.points, 0);
  const points = earned + ev + n(c.points_adj);
  let tier = L.tiers[0];
  L.tiers.forEach(t => { if ((spend >= n(t.min_spend) && os.length >= 1 && n(t.min_spend) > 0) || os.length >= n(t.min_orders)) tier = t; });
  if (c.vip) tier = L.tiers.find(t => t.key === 'vip') || tier;
  const last = os.length ? os[os.length - 1].created_at : null;
  const idle = last ? Math.floor((new Date() - new Date(last)) / 864e5) : null;
  const next = L.tiers[L.tiers.indexOf(tier) + 1] || null;
  return { count: os.length, spend, points, tier, last, first: os[0]?.created_at || c.first_order_at, idle, next, rets: state.rets.filter(r => r.customer_id === c.id).length, all: custOrders(c.id) };
}
const tierBadge = (t) => `<span class="tier ${t.key}"><span class="dot"></span>${esc(t.name)}</span>`;
function codeUses(code) {
  const cc = (code.code || '').toUpperCase();
  const os = state.orders.filter(o => (o.discount_code || '').toUpperCase() === cc && !NO_REVENUE.includes(o.status));
  return { n: os.length, rev: os.reduce((a, o) => a + totals(o).revenue, 0), disc: os.reduce((a, o) => a + n(o.discount), 0) };
}
function filteredCustomers() {
  const L = loy(), qq = fold(state.q);
  let list = state.customers.map(c => ({ c, s: custStats(c) })).filter(({ c, s }) => {
    const seg = state.custSeg;
    if (seg === 'new' && s.count !== 1) return false;
    if (seg === 'repeat' && s.count < 2) return false;
    if (seg === 'club' && !['klub', 'vip'].includes(s.tier.key)) return false;
    if (seg === 'vip' && s.tier.key !== 'vip') return false;
    if (seg === 'idle' && !(s.idle != null && s.idle >= 60)) return false;
    if (seg === 'reward' && s.points < n(L.reward_points)) return false;
    if (qq && !fold([c.name, c.phone, c.instagram, c.email, c.city, (c.tags || []).join(' ')].join(' ')).includes(qq)) return false;
    return true;
  });
  const so = state.custSort;
  list.sort((a, b) => so === 'name' ? a.c.name.localeCompare(b.c.name) : so === 'orders' ? b.s.count - a.s.count : so === 'recent' ? (b.s.last || '').localeCompare(a.s.last || '') : b.s.spend - a.s.spend);
  return list;
}
function renderCustomers() {
  const all = state.customers.map(c => ({ c, s: custStats(c) })), L = loy();
  const repeat = all.filter(x => x.s.count >= 2).length, club = all.filter(x => ['klub', 'vip'].includes(x.s.tier.key)).length;
  const spend = all.reduce((a, x) => a + x.s.spend, 0);
  const buyers = all.filter(x => x.s.count > 0).length;
  $('kpiCust').innerHTML = stat('Kupaca', state.customers.length, `${buyers} sa bar jednom porudžbinom`, 'customers') +
    stat('Vraćaju se', buyers ? pct(repeat / buyers) : '—', `<b>${repeat}</b> kupilo 2+ puta`) +
    stat('Vrednost kupca', buyers ? rsd(spend / buyers) : '—', 'prosečno potrošeno po kupcu') +
    stat('U klubu', club, `${all.filter(x => x.s.points >= n(L.reward_points)).length} čeka nagradu`);
  document.querySelectorAll('#custViewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === state.custView));
  document.querySelectorAll('#custSeg button').forEach(b => b.classList.toggle('active', b.dataset.s === state.custSeg));
  $('custList').style.display = state.custView === 'list' ? '' : 'none';
  $('clubView').style.display = state.custView === 'club' ? '' : 'none';
  $('codesView').style.display = state.custView === 'codes' ? '' : 'none';
  $('custSeg').style.display = state.custView === 'list' ? '' : 'none'; $('custSort').parentElement.style.display = state.custView === 'list' ? '' : 'none';
  if (state.custView === 'list') {
    const list = filteredCustomers();
    $('custCount').textContent = `${list.length} kupaca`;
    $('custTbody').innerHTML = list.map(({ c, s }) => `<tr data-cust="${c.id}">
      <td><div class="prod-cell"><div class="avatar ${s.tier.key === 'vip' ? 'vip' : ''}" style="width:34px;height:34px;font-size:14px;border-radius:10px">${esc(c.name.charAt(0).toUpperCase())}</div><div><div class="lead-name">${esc(c.name)}</div><div class="lead-social">${esc(c.city || '')}${(c.tags || []).length ? ' · ' + c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('') : ''}</div></div></div></td>
      <td class="contact">${c.phone ? `<div>${esc(c.phone)}</div>` : ''}${c.instagram ? `<div class="page-sub">${esc(c.instagram)}</div>` : ''}${!c.phone && !c.instagram && c.email ? `<div class="page-sub">${esc(c.email)}</div>` : ''}</td>
      <td>${tierBadge(s.tier)}</td><td class="num">${s.count}${s.rets ? `<span class="page-sub"> · ${s.rets} povrat</span>` : ''}</td><td class="num">${rsd(s.spend)}</td>
      <td class="num">${s.points}${s.points >= n(L.reward_points) ? ' <span class="tab-badge live" style="margin:0">nagrada</span>' : ''}</td>
      <td class="date-cell">${s.last ? `${fmtDate(s.last)}${s.idle >= 60 ? `<div class="neg" style="font-size:11px">${s.idle} d bez kupovine</div>` : ''}` : '—'}</td></tr>`).join('')
      || `<tr><td colspan="7" class="empty">Još nema kupaca. Prave se sami iz porudžbina, ili dodaj ručno.</td></tr>`;
  }
  if (state.custView === 'club') renderClub(all);
  if (state.custView === 'codes') renderCodes();
}
function renderClub(all) {
  const L = loy();
  $('custCount').textContent = `${all.length} kupaca`;
  const rewards = all.filter(x => x.s.points >= n(L.reward_points)).sort((a, b) => b.s.points - a.s.points);
  $('clubView').innerHTML = `
    <div class="two-col" style="margin-bottom:16px">
      <div class="panel"><h4>Pravila kluba</h4>
        <div class="tier-row"><span style="width:200px">Poena za svakih 100 RSD</span><input type="number" step="0.5" id="ly_ppc" value="${L.points_per_100}"></div>
        <div class="tier-row"><span style="width:200px">Nagrada na</span><input type="number" id="ly_rp" value="${L.reward_points}"> poena → kod <input type="number" id="ly_rd" value="${L.reward_discount}"> % koji važi <input type="number" id="ly_days" value="${L.reward_days}"> dana</div>
        <div class="sec-title">Nivoi (kupac ulazi u nivo kad pređe potrošnju ILI broj porudžbina)</div>
        ${L.tiers.map((t, i) => `<div class="tier-row" data-ti="${i}">${tierBadge(t)}<span>od</span><input type="number" data-tf="min_spend" value="${t.min_spend}"> RSD <span>ili</span><input type="number" data-tf="min_orders" value="${t.min_orders}" style="width:60px"> porudžbina <span>→ popust</span><input type="number" data-tf="discount" value="${t.discount}" style="width:60px"> %</div>`).join('')}
        <div class="modal-actions" style="justify-content:flex-start"><button class="btn-gold" id="loySave">Sačuvaj pravila</button></div>
        <div class="hint">Nivo i poeni se računaju iz isporučenih porudžbina, stalno, iz istorije. Ako promeniš pravila, važe unazad.</div></div>
      <div class="panel"><h4>Čekaju nagradu <span class="fu-count">${rewards.length}</span></h4>
        ${rewards.map(({ c, s }) => `<div class="list-row"><span data-cust="${c.id}"><b>${esc(c.name)}</b> · ${s.points} poena · ${tierBadge(s.tier)}</span><button class="mini-btn" data-reward="${c.id}">🎁 Dodeli nagradu</button></div>`).join('') || '<div class="kb-empty">Niko još nije skupio dovoljno poena.</div>'}
        <div class="hint">Nagrada pravi lični kod (npr. HARIZMA-ANA-10), skida ${L.reward_points} poena i upisuje se u istoriju kupca. Kod treba napraviti i na Shopify sajtu.</div></div>
    </div>
    <div class="tier-grid">${L.tiers.map(t => { const m = all.filter(x => x.s.tier.key === t.key).sort((a, b) => b.s.spend - a.s.spend);
      return `<div class="tier-card"><h5>${tierBadge(t)}<span class="page-sub">${m.length}</span></h5><div class="page-sub" style="margin-bottom:8px">popust ${t.discount}% · od ${rsd(t.min_spend)} ili ${t.min_orders} porudžbina</div>
        ${m.slice(0, 8).map(({ c, s }) => `<div class="m" data-cust="${c.id}"><span>${esc(c.name)}</span><span class="num">${rsd(s.spend)}</span></div>`).join('') || '<div class="kb-empty">Prazno</div>'}${m.length > 8 ? `<div class="page-sub">+ još ${m.length - 8}</div>` : ''}</div>`; }).join('')}</div>`;
}
async function saveLoyalty() {
  const L = loy();
  L.points_per_100 = n($('ly_ppc').value); L.reward_points = parseInt($('ly_rp').value) || 100; L.reward_discount = n($('ly_rd').value); L.reward_days = parseInt($('ly_days').value) || 30;
  document.querySelectorAll('[data-ti]').forEach(r => { const t = L.tiers[+r.dataset.ti]; r.querySelectorAll('[data-tf]').forEach(i => t[i.dataset.tf] = n(i.value)); });
  try { await q(sb.from('h_settings').upsert({ key: 'loyalty', value: JSON.stringify(L), updated_at: new Date().toISOString(), updated_by: state.user.display })); state.settings = await q(sb.from('h_settings').select('*')); renderAll(); toast('Pravila kluba sačuvana ✓'); } catch (e) { fail(e); }
}
async function giveReward(cid) {
  const c = state.customers.find(x => x.id === cid); if (!c) return;
  const L = loy(), s = custStats(c);
  if (s.points < n(L.reward_points)) return toast('Nema dovoljno poena');
  const base = 'HARIZMA-' + fold(c.name.split(' ')[0]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) + '-' + Math.round(n(L.reward_discount));
  let code = base, k = 2; while (state.codes.some(x => x.code.toUpperCase() === code)) code = base + '-' + (k++);
  if (!confirm(`Napraviti kod ${code} (${L.reward_discount}%, ${L.reward_days} dana) za ${c.name} i skinuti ${L.reward_points} poena?`)) return;
  try {
    const vt = new Date(); vt.setDate(vt.getDate() + n(L.reward_days));
    const cd = await q(sb.from('h_discount_codes').insert({ code, kind: 'loyalty', customer_id: c.id, pct: n(L.reward_discount), valid_to: vt.toISOString(), max_uses: 1, note: 'Nagrada iz kluba', created_by: state.user.display }).select().single());
    state.codes.push(cd);
    const ev = await q(sb.from('h_loyalty_events').insert({ customer_id: c.id, points: -n(L.reward_points), reason: `Nagrada: kod ${code}`, author: state.user.display, code_id: cd.id }).select().single());
    state.levents.push(ev);
    await log({ customer_id: c.id, type: 'system', body: `Dodeljena nagrada: kod ${code} (${L.reward_discount}%)` });
    renderAll(); if (state.editCustId === c.id) renderCustBody(); toast(`Kod ${code} napravljen ✓ Pošalji ga kupcu i dodaj na Shopify.`);
  } catch (e) { fail(e); }
}
function renderCodes() {
  const list = state.codes.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  $('custCount').textContent = `${list.length} kodova`;
  const KIND = { general: 'Opšti', personal: 'Lični', loyalty: 'Nagrada', influencer: 'Influenser' };
  const tot = list.reduce((a, c) => { const u = codeUses(c); a.n += u.n; a.rev += u.rev; a.disc += u.disc; return a; }, { n: 0, rev: 0, disc: 0 });
  $('codesView').innerHTML = `<div class="stats s3" style="margin-bottom:14px">${stat('Upotreba kodova', tot.n, 'porudžbina sa nekim kodom')}${stat('Prihod sa kodovima', rsd(tot.rev), 'ukupno')}${stat('Dati popusti', rsd(tot.disc), 'zbir popusta na porudžbinama')}</div>
    <div class="table-card"><table><thead><tr><th>Kod</th><th>Vrsta</th><th>Popust</th><th>Važi</th><th>Upotreba</th><th>Prihod</th><th>Status</th></tr></thead><tbody>
    ${list.map(c => { const u = codeUses(c), cu = c.customer_id && state.customers.find(x => x.id === c.customer_id); const expired = c.valid_to && new Date(c.valid_to) < new Date(); const used = c.max_uses && u.n >= c.max_uses;
      return `<tr class="code-row" data-code="${c.id}"><td><span class="cc">${esc(c.code)}</span>${c.note ? `<div class="page-sub">${esc(c.note)}</div>` : ''}</td><td>${KIND[c.kind]}${cu ? `<div class="page-sub">${esc(cu.name)}</div>` : ''}</td>
        <td class="num">${c.pct ? c.pct + '%' : ''}${c.rsd ? rsd(c.rsd) : ''}${c.min_order ? `<div class="page-sub">min ${rsd(c.min_order)}</div>` : ''}</td><td class="date-cell">${fmtDate(c.valid_from)} → ${c.valid_to ? fmtDate(c.valid_to) : '∞'}</td>
        <td class="num">${u.n}${c.max_uses ? ` / ${c.max_uses}` : ''}</td><td class="num">${rsd(u.rev)}</td><td>${!c.active ? pill('cancelled').replace('Otkazana', 'Isključen') : expired ? pill('ended') : used ? pill('ended').replace('Završena', 'Iskorišćen') : pill('active')}</td></tr>`; }).join('')
      || `<tr><td colspan="7" class="empty">Nema kodova.</td></tr>`}</tbody></table></div>`;
}
const CDF = ['code', 'kind', 'customer_id', 'pct', 'rsd', 'min_order', 'max_uses', 'note'];
function openCodeModal(id, custId) {
  const c = id ? state.codes.find(x => x.id === id) : null;
  state.editCodeId = id || null;
  $('cdTitle').textContent = c ? c.code : 'Novi kod za popust';
  $('cd_customer_id').innerHTML = '<option value="">—</option>' + state.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  CDF.forEach(f => $('cd_' + f).value = c ? (c[f] ?? '') : (f === 'kind' ? (custId ? 'personal' : 'general') : f === 'customer_id' ? (custId || '') : ''));
  $('cd_valid_from').value = c ? String(c.valid_from).slice(0, 10) : dayStr(new Date());
  $('cd_valid_to').value = c && c.valid_to ? String(c.valid_to).slice(0, 10) : '';
  $('cd_active').checked = c ? c.active : true;
  $('cdDelete').style.display = c ? '' : 'none';
  $('codeModal').classList.add('open'); $('cd_code').focus();
}
async function saveCode(e) {
  e.preventDefault();
  const f = {}; CDF.forEach(k => { const v = $('cd_' + k).value.trim(); f[k] = v === '' ? null : v; });
  f.code = f.code.toUpperCase().replace(/\s+/g, '');
  ['pct', 'rsd', 'min_order'].forEach(k => f[k] = f[k] === null ? null : n(f[k])); f.max_uses = f.max_uses === null ? null : parseInt(f.max_uses);
  f.valid_from = new Date($('cd_valid_from').value + 'T00:00:00').toISOString(); f.valid_to = $('cd_valid_to').value ? new Date($('cd_valid_to').value + 'T23:59:59').toISOString() : null;
  f.active = $('cd_active').checked;
  try {
    if (state.editCodeId) { const r = await q(sb.from('h_discount_codes').update(f).eq('id', state.editCodeId).select().single()); Object.assign(state.codes.find(x => x.id === r.id), r); }
    else { f.created_by = state.user.display; state.codes.push(await q(sb.from('h_discount_codes').insert(f).select().single())); }
    $('codeModal').classList.remove('open'); renderAll(); if (state.editCustId) renderCustBody(); toast('Kod sačuvan ✓');
  } catch (err) { fail(err.message?.includes('duplicate') ? new Error('Taj kod već postoji') : err); }
}
async function deleteCode() {
  if (!confirm('Kod ide u arhivu. Nastaviti?')) return;
  try { await softDelete('h_discount_codes', state.editCodeId); state.codes = state.codes.filter(x => x.id !== state.editCodeId); $('codeModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}
/* kupac: modal */
const CUF = ['name', 'phone', 'email', 'instagram', 'city', 'address', 'postal_code', 'birthday', 'source', 'note'];
function openCustModal(id) {
  state.editCustId = id || null; state.custTab = 'profile';
  renderCustHead(); renderCustBody();
  $('custModal').classList.add('open');
}
function renderCustHead() {
  const c = state.editCustId ? state.customers.find(x => x.id === state.editCustId) : null;
  if (!c) { $('custHead').innerHTML = `<div class="cust-av">+</div><div><div class="cust-name">Novi kupac</div><div class="cust-sub">Ručni unos. Kupci iz porudžbina se prave sami.</div></div>`; $('custTabs').style.display = 'none'; return; }
  const s = custStats(c);
  $('custTabs').style.display = '';
  $('custHead').innerHTML = `<div class="cust-av ${s.tier.key === 'vip' ? 'vip' : ''}">${esc(c.name.charAt(0).toUpperCase())}</div>
    <div><div class="cust-name">${esc(c.name)}</div><div class="cust-sub">${tierBadge(s.tier)}<span>${s.count} porudžbina · ${rsd(s.spend)} · ${s.points} poena</span>${s.first ? `<span>· kupac od ${fmtDate(s.first)}</span>` : ''}${(c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
    <div class="cust-quick">${c.phone ? `<a class="mini-btn" href="tel:${esc(c.phone)}">📞 Pozovi</a><a class="mini-btn" href="sms:${esc(c.phone)}">✉ SMS</a><a class="mini-btn" href="viber://chat?number=${esc(c.phone.replace(/\D/g, '').replace(/^0/, '381'))}">Viber</a>` : ''}${c.instagram ? `<a class="mini-btn" href="https://instagram.com/${esc(c.instagram.replace('@', ''))}" target="_blank" rel="noopener">IG ↗</a>` : ''}<button class="mini-btn" data-newordercust="${c.id}">+ Porudžbina</button></div>`;
  document.querySelectorAll('#custTabs button').forEach(b => b.classList.toggle('active', b.dataset.ct === state.custTab));
}
function renderCustBody() {
  const c = state.editCustId ? state.customers.find(x => x.id === state.editCustId) : null;
  const t = c ? state.custTab : 'profile';
  document.querySelectorAll('#custTabs button').forEach(b => b.classList.toggle('active', b.dataset.ct === t));
  if (t === 'profile') {
    $('custBody').innerHTML = `<form id="custForm">
      <div class="frow"><div class="field"><label>Ime i prezime *</label><input id="cu_name" required></div><div class="field"><label>Telefon</label><input id="cu_phone"></div></div>
      <div class="frow"><div class="field"><label>Instagram</label><input id="cu_instagram" placeholder="@"></div><div class="field"><label>Email</label><input id="cu_email"></div></div>
      <div class="field"><label>Adresa</label><input id="cu_address"></div>
      <div class="frow3"><div class="field"><label>Grad</label><input id="cu_city"></div><div class="field"><label>Poštanski broj</label><input id="cu_postal_code"></div><div class="field"><label>Rođendan</label><input id="cu_birthday" type="date"></div></div>
      <div class="frow"><div class="field"><label>Odakle je došla</label><input id="cu_source" list="sources" placeholder="Instagram, preporuka, reklama…"><datalist id="sources"><option>Instagram</option><option>Shopify</option><option>Preporuka</option><option>Meta reklama</option><option>Influenser</option></datalist></div>
        <div class="field"><label>Oznake (zarezom)</label><input id="cu_tags" placeholder="influenser, drugarica, problematična…"></div></div>
      <div class="field"><label>Beleška o kupcu</label><textarea id="cu_note" placeholder="Šta voli, koje veličine nosi, kako da joj priđemo"></textarea></div>
      <label class="check" style="font-size:13px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="cu_vip"> VIP (ručno, bez obzira na pravila kluba)</label>
      <div class="modal-actions">${c ? '<button type="button" class="fu-remove" id="cuDelete">Obriši (arhiva)</button>' : ''}<button type="button" class="btn-ghost" data-close>Zatvori</button><button class="btn-gold" type="submit">Sačuvaj</button></div></form>`;
    CUF.forEach(f => $('cu_' + f).value = c ? (c[f] ?? '') : '');
    $('cu_tags').value = c ? (c.tags || []).join(', ') : ''; $('cu_vip').checked = !!c?.vip;
    $('custForm').addEventListener('submit', saveCust);
    if (c) $('cuDelete').addEventListener('click', deleteCust);
    if (!c) $('cu_name').focus();
  } else if (t === 'orders') {
    const s = custStats(c);
    const rets = state.rets.filter(r => r.customer_id === c.id);
    $('custBody').innerHTML = `<div class="cust-nums"><div><b>${s.count}</b><span>porudžbina</span></div><div><b>${rsd(s.spend)}</b><span>potrošeno</span></div><div><b>${s.count ? rsd(s.spend / s.count) : '—'}</b><span>prosečna korpa</span></div><div><b>${s.rets}</b><span>povrata i prijava</span></div></div>
      ${s.all.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(o => `<div class="list-row" data-order="${o.id}"><span><b>${esc(o.order_no || '')}</b> · ${fmtDate(o.created_at)} · ${itemsSummary(o)}</span><span>${pill(o.status)} <b class="num">${rsd(totals(o).revenue)}</b></span></div>`).join('') || '<div class="kb-empty">Još nema porudžbina.</div>'}
      ${rets.length ? `<div class="sec-title">Povrati i prijave</div>${rets.map(r => `<div class="list-row" data-ret="${r.id}"><span><b>${esc(r.case_no)}</b> · ${RT[r.type]} · ${esc(r.item || '')} ${esc(r.reason || '')}</span>${pill(r.status)}</div>`).join('')}` : ''}`;
  } else if (t === 'loyalty') {
    const s = custStats(c), L = loy();
    const ev = state.levents.filter(e => e.customer_id === c.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const codes = state.codes.filter(x => x.customer_id === c.id);
    const toReward = Math.max(0, n(L.reward_points) - s.points);
    $('custBody').innerHTML = `<div class="cust-nums"><div><b>${tierBadge(s.tier)}</b><span>nivo · popust ${s.tier.discount}%</span></div><div><b>${s.points}</b><span>poena</span></div><div><b>${s.next ? rsd(Math.max(0, n(s.next.min_spend) - s.spend)) : '—'}</b><span>${s.next ? 'do nivoa ' + esc(s.next.name) : 'najviši nivo'}</span></div><div><b>${toReward === 0 ? '🎁' : toReward}</b><span>${toReward === 0 ? 'nagrada čeka' : 'poena do nagrade'}</span></div></div>
      <div class="pts-bar"><div style="width:${Math.min(100, s.points / n(L.reward_points) * 100)}%"></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px"><button class="btn-gold" data-reward="${c.id}" ${s.points < n(L.reward_points) ? 'disabled style="opacity:.5"' : ''}>🎁 Dodeli nagradu</button><button class="mini-btn" id="cuNewCode">+ Lični kod</button>
        <span style="display:inline-flex;gap:6px;align-items:center;margin-left:auto"><input class="inline-input" id="cuPts" type="number" placeholder="± poeni" style="width:90px"><input class="inline-input" id="cuPtsWhy" placeholder="razlog (rođendan, izvinjenje…)" style="width:200px"><button class="mini-btn" id="cuPtsAdd">Upiši</button></span></div>
      ${codes.length ? `<div class="sec-title">Lični kodovi</div>${codes.map(x => { const u = codeUses(x); return `<div class="list-row" data-code="${x.id}"><span><span class="cc" style="font-family:ui-monospace,Menlo,monospace;font-weight:700">${esc(x.code)}</span> · ${x.pct ? x.pct + '%' : rsd(x.rsd)} · do ${x.valid_to ? fmtDate(x.valid_to) : '∞'}</span><span>${u.n} upotreba ${x.active ? '' : '· isključen'}</span></div>`; }).join('')}` : ''}
      <div class="sec-title">Istorija poena</div>
      ${ev.map(e => `<div class="led"><span>${esc(e.reason || '')} <span class="page-sub">· ${esc(e.author || '')} · ${fmtDT(e.created_at)}</span></span><b class="${e.points >= 0 ? 'plus' : 'minus'}">${e.points >= 0 ? '+' : ''}${e.points}</b></div>`).join('')}
      <div class="led"><span>Iz kupovina (${rsd(s.spend)} × ${L.points_per_100} poen/100 RSD)</span><b class="plus">+${Math.floor(s.spend / 100) * n(L.points_per_100)}</b></div>${c.points_adj ? `<div class="led"><span>Ručna korekcija na profilu</span><b>${c.points_adj > 0 ? '+' : ''}${c.points_adj}</b></div>` : ''}`;
    $('cuNewCode').addEventListener('click', () => openCodeModal(null, c.id));
    $('cuPtsAdd').addEventListener('click', async () => {
      const pts = parseInt($('cuPts').value); if (!pts) return toast('Upiši broj poena');
      try { state.levents.push(await q(sb.from('h_loyalty_events').insert({ customer_id: c.id, points: pts, reason: $('cuPtsWhy').value.trim() || 'Ručno', author: state.user.display }).select().single())); await log({ customer_id: c.id, type: 'system', body: `${pts > 0 ? '+' : ''}${pts} poena: ${$('cuPtsWhy').value.trim() || 'ručno'}` }); renderCustHead(); renderCustBody(); renderAll(); } catch (e) { fail(e); }
    });
  } else {
    $('custBody').innerHTML = commentsBlock('customer_id', c.id).replace('<div class="sec-title">Komentari</div>', '<div class="sec-title">Beleške i istorija</div>');
  }
}
async function saveCust(e) {
  e.preventDefault();
  const f = {}; CUF.forEach(k => { const v = $('cu_' + k).value.trim(); f[k] = v === '' ? null : v; });
  f.tags = $('cu_tags').value.split(',').map(x => x.trim()).filter(Boolean); f.vip = $('cu_vip').checked;
  try {
    if (state.editCustId) { const r = await q(sb.from('h_customers').update(f).eq('id', state.editCustId).select().single()); Object.assign(state.customers.find(x => x.id === r.id), r); }
    else { f.source = f.source || 'ručno'; const r = await q(sb.from('h_customers').insert(f).select().single()); state.customers.push(r); state.editCustId = r.id; await log({ customer_id: r.id, type: 'system', body: 'Kupac dodat ručno' }); }
    renderAll(); renderCustHead(); renderCustBody(); toast('Kupac sačuvan ✓');
  } catch (err) { fail(err); }
}
async function deleteCust() {
  if (!confirm('Kupac ide u arhivu (porudžbine ostaju). Nastaviti?')) return;
  try { await softDelete('h_customers', state.editCustId); state.customers = state.customers.filter(x => x.id !== state.editCustId); $('custModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}

/* ---------- OBAVEŠTENJA: ko je šta kad menjao ---------- */
const NF_FIELD = { status: 'status', courier: 'kurir', tracking_no: 'broj pošiljke', sell_price: 'prodajna', buy_price: 'nabavna', compare_price: '„bila“ cena', stock: 'stanje', publish_at: 'datum objave', drive_link: 'Drive link', assignee: 'zadužen', priority: 'prioritet', title: 'naslov', body: 'tekst', value: 'vrednost', note: 'napomena', refund_amount: 'vraćeno kupcu', return_shipping_cost: 'trošak slanja', resolution_note: 'rešenje', improve: 'šta da popravimo', vip: 'VIP', tags: 'oznake', points_adj: 'poeni', name: 'ime', phone: 'telefon', city: 'grad', address: 'adresa', postal_code: 'poštanski broj', payment: 'plaćanje', shipping_price: 'dostava (kupac)', shipping_cost: 'dostava (kurir)', packaging_cost: 'pakovanje', discount: 'popust', discount_code: 'kod', channel: 'kanal', category: 'kategorija', supplier: 'dobavljač', material: 'materijal', image_url: 'slika', concept: 'koncept', hook: 'hook', caption: 'opis', format: 'format', post_url: 'link objave', views: 'pregledi', likes: 'lajkovi', saves: 'sačuvano', description: 'opis', link: 'link', votes: 'glasovi', code: 'kod', pct: 'popust %', rsd: 'popust RSD', valid_to: 'važi do', valid_from: 'važi od', active: 'aktivan', max_uses: 'maks. upotreba', starts_at: 'početak', ends_at: 'kraj', budget: 'budžet', goal: 'cilj', result_note: 'zaključak', happened_at: 'datum', kind: 'vrsta', min_stock: 'granica', per_order: 'po paketu', unit_price: 'cena', spend: 'potrošeno', purchases: 'kupovine', revenue: 'prihod', reason: 'razlog', package_received_at: 'paket stigao', resolution_wanted: 'kupac želi', restocked: 'vraćeno na stanje', size: 'veličina', color: 'boja', qty: 'količina', email: 'email', instagram: 'instagram', birthday: 'rođendan', source: 'izvor', position: 'redosled', pinned: 'zakačeno', done: 'završeno', delivered_on: 'paket primljen', shipped_at: 'poslato', delivered_at: 'isporučeno', photos: 'fotografije', order_no: 'broj', exchange_details: 'želi umesto toga', item: 'komad', rating: 'ocena', customer_name: 'kupac', type: 'tip', discount_pct: 'popust %', discount_rsd: 'popust RSD', deleted_at: '__del' };
const NF_SKIP = new Set(['updated_at', 'updated_by', 'created_at', 'created_by', 'deleted_by', 'phone_norm', 'first_order_at', 'customer_id', 'product_id', 'variant_id', 'order_id', 'code_id', 'consent', 'case_no', 'id', 'bank_account', 'shopify_order_id', 'shopify_product_id', 'shopify_variant_id', 'resolved_at', 'area', 'author']);
const prodName = (id) => product(id)?.name || 'komad';
const custName = (id) => state.customers.find(c => c.id === id)?.name || 'kupac';
const NF_TBL = {
  h_orders: { cat: 'order', label: 'porudžbinu', name: r => `${r.order_no || ''} · ${r.customer_name}`, open: r => `order:${r.id}`, ins: () => 'nova porudžbina', prio: 10 },
  h_order_items: { skip: true },
  h_products: { cat: 'stock', label: 'komad', name: r => r.name, open: r => `product:${r.id}`, ins: () => 'nov komad', prio: 7 },
  h_variants: { cat: 'stock', label: 'zalihu', name: r => `${prodName(r.product_id)} ${r.size}`, open: r => `product:${r.product_id}`, ins: r => `nova veličina ${prodName(r.product_id)}`, prio: 3, only: r => true },
  h_customers: { cat: 'customer', label: 'kupca', name: r => r.name, open: r => `cust:${r.id}`, ins: () => 'nov kupac', prio: 6 },
  h_returns: { cat: 'ret', label: 'prijavu', name: r => `${r.case_no} · ${r.customer_name}`, open: r => `ret:${r.id}`, ins: r => `${r.source === 'form' ? 'nova prijava sa forme' : 'nova prijava'} (${RT[r.type] || r.type})`, prio: 9 },
  h_promotions: { cat: 'promo', label: 'promociju', name: r => r.name, open: r => `promo:${r.id}`, ins: () => 'nova promocija', prio: 8 },
  h_posts: { cat: 'post', label: 'objavu', name: r => r.title, open: r => `post:${r.id}`, ins: () => 'nova ideja za objavu', prio: 7 },
  h_packaging: { cat: 'pack', label: 'materijal', name: r => r.name, open: r => `pack:${r.id}`, ins: () => 'nov materijal', prio: 4 },
  h_site_ideas: { cat: r => r.area === 'packaging' ? 'pack' : 'site', label: 'predlog', name: r => r.title, open: r => `idea:${r.id}`, ins: r => r.area === 'packaging' ? 'nov predlog za pakovanje' : 'nov predlog za sajt', prio: 6 },
  h_story_sections: { cat: 'story', label: 'poglavlje', name: r => r.title, open: () => 'tab:story', ins: () => 'novo poglavlje priče', prio: 5 },
  h_notes: { cat: r => (r.area || '').startsWith('promo:') ? 'promo' : 'story', label: 'belešku', name: r => `„${(r.body || '').slice(0, 60)}“`, open: r => (r.area || '').startsWith('promo:') ? `promo:${r.area.split(':')[1]}` : 'tab:story', ins: r => (r.area || '').startsWith('promo:') ? 'nova beleška uz promociju' : 'nova beleška', prio: 5 },
  h_ad_spend: { cat: 'ads', label: 'reklame', name: r => `${r.day} · ${rsd(r.spend)}`, open: () => 'tab:ads', ins: () => 'upisana potrošnja na reklame', prio: 4 },
  h_discount_codes: { cat: 'code', label: 'kod', name: r => r.code, open: r => `code:${r.id}`, ins: r => r.kind === 'loyalty' ? 'nagrada iz kluba, kod' : 'nov kod za popust', prio: 6 },
  h_loyalty_events: { cat: 'code', label: 'poene', name: r => `${r.points > 0 ? '+' : ''}${r.points} za ${custName(r.customer_id)}${r.reason ? ' (' + r.reason + ')' : ''}`, open: r => `cust:${r.customer_id}`, ins: () => 'poeni', prio: 6 },
  h_milestones: { cat: 'history', label: 'događaj', name: r => r.title, open: r => `ms:${r.id}`, ins: () => 'zabeležen događaj', prio: 8 },
  h_settings: { cat: 'settings', label: 'podešavanje', name: r => ({ site_url: 'link sajta', site_pass: 'lozinka sajta', loyalty: 'pravila kluba' }[r.key] || r.key), open: r => r.key === 'loyalty' ? 'tab:customers' : 'tab:site', prio: 6 },
  h_activities: { cat: 'comment', only: r => ['comment', 'screenshot'].includes(r.type), label: 'komentar', prio: 8,
    name: r => { const o = r.order_id && order(r.order_id), p = r.post_id && state.posts.find(x => x.id === r.post_id), rt = r.return_id && state.rets.find(x => x.id === r.return_id), c = r.customer_id && state.customers.find(x => x.id === r.customer_id), i = r.site_id && state.ideas.find(x => x.id === r.site_id); return o ? `uz porudžbinu ${o.order_no || ''} ${o.customer_name}` : p ? `uz objavu ${p.title}` : rt ? `uz prijavu ${rt.case_no}` : c ? `uz kupca ${c.name}` : i ? `uz predlog ${i.title}` : ''; },
    open: r => r.order_id ? `order:${r.order_id}` : r.post_id ? `post:${r.post_id}` : r.return_id ? `ret:${r.return_id}` : r.customer_id ? `cust:${r.customer_id}` : r.site_id ? `idea:${r.site_id}` : '',
    ins: r => r.type === 'comment' ? `komentar „${(r.body || '').slice(0, 90)}“` : 'screenshot' },
};
const NF_CAT = { order: 'Porudžbine', customer: 'Kupci', stock: 'Garderoba', ret: 'Povrati', promo: 'Promocije', post: 'Objave', pack: 'Pakovanje', site: 'Sajt', story: 'Brand story', ads: 'Reklame', code: 'Kodovi i poeni', history: 'Istorija', settings: 'Podešavanja', comment: 'Komentari' };
function nfVerb(actor, what) {
  const f = PEOPLE[actor]?.f, sys = !PEOPLE[actor];
  return { add: sys ? 'dodato' : f ? 'dodala' : 'dodao', edit: sys ? 'izmenjeno' : f ? 'izmenila' : 'izmenio', del: sys ? 'obrisano' : f ? 'obrisala' : 'obrisao', restore: sys ? 'vraćeno' : f ? 'vratila' : 'vratio' }[what];
}
function nfVal(field, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'da' : 'ne';
  if (Array.isArray(v)) return v.map(x => PEOPLE[x]?.name || x).join(', ') || '—';
  if (field === 'status' || field === 'kind' || field === 'type') return ST[v] || RT[v] || PROMO_T[v] || MS_K[v] || FMT[v] || v;
  if (field === 'resolution_wanted') return RES_W[v] || v;
  if (field === 'payment') return PAY[v] || v;
  if (field === 'channel') return CH[v] || v;
  if (/_at$|_on$|publish_at/.test(field) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).length > 10 ? fmtDT(v) : fmtDate(v + 'T12:00:00');
  if (/price|cost|discount$|budget|spend|revenue|refund_amount|rsd|min_order|discount_rsd/.test(field) && typeof v === 'number') return rsd(v);
  if (field === 'loyalty' || (typeof v === 'string' && v.startsWith('{'))) return 'nova pravila';
  const s = String(v); return s.length > 70 ? s.slice(0, 70) + '…' : s;
}
function describeAudit(a) {
  const T = NF_TBL[a.tbl]; if (!T || T.skip) return null;
  const row = a.new_row || a.old_row || {};
  if (T.only && !T.only(row)) return null;
  const cat = typeof T.cat === 'function' ? T.cat(row) : T.cat;
  const nm = esc(T.name(row) || ''), ref = nm ? `<span class="ref">${nm}</span>` : '';
  let text, kind = 'edit';
  if (a.op === 'INSERT') { kind = 'add'; text = `${nfVerb(a.actor, 'add')} ${T.ins ? T.ins(row) : T.label}${ref ? ': ' + ref : ''}`; }
  else if (a.op === 'DELETE') { kind = 'del'; text = `trajno ${nfVerb(a.actor, 'del')} ${T.label} ${ref}`; }
  else {
    const ch = a.changed || {};
    if (ch.deleted_at) { if (ch.deleted_at.na) { kind = 'del'; text = `${nfVerb(a.actor, 'del')} ${T.label} ${ref} <span class="page-sub">(u arhivi)</span>`; } else { kind = 'restore'; text = `${nfVerb(a.actor, 'restore')} ${T.label} ${ref} iz arhive`; } }
    else {
      const parts = Object.entries(ch).filter(([k]) => !NF_SKIP.has(k) && NF_FIELD[k] !== '__del').slice(0, 4)
        .map(([k, d]) => a.tbl === 'h_settings' && k === 'value' ? '' : `${NF_FIELD[k] || k}: ${esc(nfVal(k, d.od))} → ${esc(nfVal(k, d.na))}`).filter(Boolean);
      if (a.tbl === 'h_settings') text = `${nfVerb(a.actor, 'edit')} ${ref}${ch.value && row.key !== 'loyalty' ? `: ${esc(nfVal('value', ch.value.na))}` : ''}`;
      else if (!parts.length) return null;
      else text = `${nfVerb(a.actor, 'edit')} ${T.label} ${ref}: ${parts.join(' · ')}`;
    }
  }
  return { cat, text, open: T.open ? T.open(row) : '', prio: T.prio + (kind === 'add' ? 1 : 0), kind };
}
function groupAudit(rows) {
  const asc = rows.slice().sort((a, b) => a.id - b.id), groups = [];
  let g = null;
  asc.forEach(a => {
    const d = describeAudit(a); if (!d) return;
    const t = new Date(a.at);
    if (!g || g.actor !== a.actor || t - g.lastT > 90000) { g = { actor: a.actor, rows: [], ids: [], firstT: t, lastT: t }; groups.push(g); }
    g.rows.push({ a, d }); g.ids.push(a.id); g.lastT = t;
  });
  return groups.map(g => {
    const prim = g.rows.slice().sort((x, y) => y.d.prio - x.d.prio)[0];
    const extras = {};
    g.rows.forEach(({ a, d }) => { if (a === prim.a) return; const k = NF_CAT[d.cat] || d.cat; extras[k] = (extras[k] || 0) + 1; });
    return { key: Math.max(...g.ids), ids: g.ids, actor: g.actor, at: g.lastT.toISOString(), cat: prim.d.cat, cats: [...new Set(g.rows.map(x => x.d.cat))], text: prim.d.text, open: prim.d.open, extras, n: g.rows.length, rows: g.rows };
  }).sort((a, b) => b.key - a.key);
}
const nfState = () => state.nfState || (state.nfState = { username: who(), cleared_before: null, dismissed: [], snooze_until: null });
const nfDismissed = (g) => { const s = nfState(); return (s.cleared_before && g.at <= s.cleared_before) || s.dismissed.includes(g.key); };
const nfSnoozed = () => { const s = nfState(); return s.snooze_until && new Date(s.snooze_until) > new Date(); };
let nfSaveT = null;
function nfPersist() {
  clearTimeout(nfSaveT);
  nfSaveT = setTimeout(async () => { const s = nfState(); try { await q(sb.from('h_notif_state').upsert({ username: who(), cleared_before: s.cleared_before, dismissed: s.dismissed.slice(-1500), snooze_until: s.snooze_until, updated_at: new Date().toISOString() })); } catch (e) { console.warn('notif state', e); } }, 400);
}
async function loadNotifs(older) {
  try {
    if (!older) {
      const st = await q(sb.from('h_notif_state').select('*').eq('username', who()).maybeSingle());
      state.nfState = st || { username: who(), cleared_before: null, dismissed: [], snooze_until: null };
      const since = new Date(); since.setDate(since.getDate() - 30);
      state.audit = await q(sb.from('h_audit').select('*').gte('at', since.toISOString()).order('id', { ascending: false }).limit(800));
    } else {
      const minId = Math.min(...state.audit.map(a => a.id));
      const more = await q(sb.from('h_audit').select('*').lt('id', minId).order('id', { ascending: false }).limit(400));
      state.audit = state.audit.concat(more);
      if (!more.length) toast('Nema starijih zapisa');
    }
    state.nfGroups = groupAudit(state.audit);
  } catch (e) { console.warn('notifs', e); state.audit = state.audit || []; state.nfGroups = []; }
}
const relTime = (iso) => { const m = Math.round((new Date() - new Date(iso)) / 60000); if (m < 1) return 'upravo'; if (m < 60) return `pre ${m} min`; const h = Math.round(m / 60); if (h < 24) return `pre ${h} h`; const d = new Date(iso), today = new Date(); const y = new Date(today); y.setDate(y.getDate() - 1); if (dayStr(d) === dayStr(y)) return 'juče ' + d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }); return fmtDT(iso); };
function nfCard(g, opts = {}) {
  const p = PEOPLE[g.actor], who_ = p ? p.name : (g.actor === 'system' ? 'Forma / sistem' : g.actor);
  const ex = Object.entries(g.extras).sort((a, b) => b[1] - a[1]); const extras = ex.slice(0, 4).map(([k, v]) => `<span>${esc(k)}${v > 1 ? ' ×' + v : ''}</span>`).join('') + (ex.length > 4 ? `<span>+${ex.length - 4}</span>` : '');
  return `<div class="ncard ${opts.cls || ''}" data-nk="${g.key}" ${g.open ? `data-nopen="${esc(g.open)}"` : ''}>
    <div class="n-st"><div class="n-av ${PEOPLE[g.actor] ? g.actor : 'system'}">${esc(who_.charAt(0))}</div><div class="n-when">${relTime(g.at)}</div></div>
    <div class="n-body"><div class="n-who">${esc(who_)}</div><div class="n-txt">${g.text}</div>${extras ? `<div class="n-more">+ ${extras}</div>` : ''}
      ${opts.history && !nfDismissed(g) && g.actor !== who() ? `<div class="n-act"><button data-ndis="${g.key}">Označi kao viđeno</button></div>` : ''}</div>
    ${!opts.history ? `<button class="n-x" data-ndis="${g.key}" title="Skloni">✕</button>` : ''}</div>`;
}
function renderTray() {
  const s = nfState(), me = who();
  const list = (state.nfGroups || []).filter(g => g.actor !== me && !nfDismissed(g) && (PEOPLE[g.actor] || g.rows.some(x => ['h_returns', 'h_orders'].includes(x.a.tbl) && x.a.op === 'INSERT')));
  const bell = $('bellBtn'); bell.classList.toggle('has', list.length > 0);
  $('bellN').style.display = list.length ? '' : 'none'; $('bellN').textContent = list.length > 99 ? '99+' : list.length;
  $('bellZz').style.display = nfSnoozed() ? '' : 'none';
  $('bmHead').textContent = nfSnoozed() ? `Utišano do ${fmtDT(s.snooze_until)}` : list.length ? `${list.length} novih promena od drugih` : 'Nema novih promena';
  const tray = $('ntray');
  if (nfSnoozed() || state.trayHidden) { tray.innerHTML = ''; return; }
  const maxN = window.innerWidth <= 980 ? 1 : 3;
  const show = list.slice(0, maxN);
  const keys = new Set(show.map(g => String(g.key)));
  [...tray.querySelectorAll('.ncard[data-nk]')].forEach(el => { if (!keys.has(el.dataset.nk)) el.remove(); });
  show.slice().reverse().forEach(g => { if (!tray.querySelector(`.ncard[data-nk="${g.key}"]`)) tray.insertAdjacentHTML('afterbegin', nfCard(g, { cls: g.live ? 'live' : '' })); });
  // reorder to match
  show.forEach(g => tray.appendChild(tray.querySelector(`.ncard[data-nk="${g.key}"]`)));
  tray.querySelector('.summary')?.remove();
  if (list.length > maxN) tray.insertAdjacentHTML('beforeend', `<div class="ncard summary" data-nk="sum"><div>Još <b>${list.length - maxN}</b> promena. <button data-bm="history" style="border:none;background:none;color:#E8E4D9;text-decoration:underline;font-weight:700;padding:0">Otvori istoriju</button></div><button class="n-x" data-bm="clear" title="Skloni sve">✕</button></div>`);
}
function nfDismiss(key) {
  const s = nfState(); if (!s.dismissed.includes(key)) s.dismissed.push(key);
  const el = $('ntray').querySelector(`.ncard[data-nk="${key}"]`);
  if (el) { el.classList.add('out'); setTimeout(() => { el.remove(); renderTray(); }, 300); } else renderTray();
  if ($('notifModal').classList.contains('open')) renderNotifHistory();
  nfPersist();
}
function nfMenu(action) {
  const s = nfState();
  if (action === 'history') { $('bellMenu').classList.remove('open'); return openNotifHistory(); }
  if (action === 'clear') { s.cleared_before = new Date().toISOString(); s.dismissed = []; }
  if (action === 'show') { const d = new Date(); d.setDate(d.getDate() - 7); s.cleared_before = d.toISOString(); s.dismissed = []; s.snooze_until = null; state.trayHidden = false; }
  if (action.startsWith('snooze:')) {
    const v = action.split(':')[1];
    if (v === '0') s.snooze_until = null;
    else if (v === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); s.snooze_until = d.toISOString(); }
    else { const d = new Date(); d.setHours(d.getHours() + (+v)); s.snooze_until = d.toISOString(); }
    toast(s.snooze_until ? `Obaveštenja utišana do ${fmtDT(s.snooze_until)}` : 'Obaveštenja uključena');
  }
  $('bellMenu').classList.remove('open'); nfPersist(); renderTray();
}
function openNotifHistory() { state.trayHidden = true; renderTray(); state.nfWho = 'others'; $('nfCat').value = 'all'; $('nfQ').value = ''; renderNotifHistory(); $('notifModal').classList.add('open'); }
function renderNotifHistory() {
  const me = who(), w = state.nfWho || 'others', cat = $('nfCat').value, qn = fold($('nfQ').value.trim());
  document.querySelectorAll('#nfWho button').forEach(b => b.classList.toggle('active', b.dataset.w === w));
  const list = (state.nfGroups || []).filter(g => (w === 'all' || (w === 'others' ? g.actor !== me : g.actor === w)) && (cat === 'all' || g.cats.includes(cat)) && (!qn || fold(g.text.replace(/<[^>]+>/g, '')).includes(qn)));
  $('nfCount').textContent = `${list.length} promena`;
  let last = null;
  $('nfList').innerHTML = list.map(g => { const d = dayStr(new Date(g.at)); const head = d !== last ? `<div class="nf-day">${new Date(g.at).toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' })}</div>` : ''; last = d;
    return head + nfCard(g, { history: true, cls: (g.actor === me ? 'mine ' : '') + (nfDismissed(g) || g.actor === me ? 'read' : '') }); }).join('') || '<div class="kb-empty" style="padding:30px">Nema promena za ovaj filter.</div>';
}
let nfReloadT = null, nfPending = false;
/* odmah primeni tuđu promenu na ekran, pre punog učitavanja */
function applyAuditRow(a) {
  try {
    const row = a.new_row; if (!row) return;
    const lists = { h_notes: 'notes', h_orders: 'orders', h_products: 'products', h_variants: 'variants', h_posts: 'posts', h_returns: 'rets', h_promotions: 'promos', h_milestones: 'milestones', h_customers: 'customers', h_site_ideas: 'ideas', h_packaging: 'pack', h_discount_codes: 'codes', h_activities: 'acts', h_order_items: 'items', h_ad_spend: 'ads', h_loyalty_events: 'levents' };
    const key = lists[a.tbl]; if (!key || !Array.isArray(state[key])) return;
    const arr = state[key]; const i = arr.findIndex(x => x.id === row.id);
    if (row.deleted_at) { if (i >= 0) arr.splice(i, 1); }
    else if (i >= 0) Object.assign(arr[i], row); else arr.push(row);
    renderAll();
  } catch (e) {}
}
function onAuditLive(row) {
  if (!row || state.audit.some(a => a.id === row.id)) return;
  state.audit.unshift(row);
  state.nfGroups = groupAudit(state.audit);
  if (row.actor !== who()) {
    const g = state.nfGroups.find(x => x.ids.includes(row.id)); if (g) { g.live = true; const s = nfState(); s.dismissed = s.dismissed.filter(k => k !== g.key); }
    renderTray();
    applyAuditRow(row);
    clearTimeout(nfReloadT);
    nfReloadT = setTimeout(async () => { if (document.querySelector('.modal-wrap.open:not(#notifModal):not(#noteModal)')) { nfPending = true; return; } try { await loadData(); renderAll(); if (state.openOrderId) renderDrawer(); } catch (e) {} }, 250);
  }
  if ($('notifModal').classList.contains('open')) renderNotifHistory();
}
async function pollAudit() {
  if (document.hidden) return;
  try {
    const maxId = state.audit.length ? Math.max(...state.audit.map(a => a.id)) : 0;
    const rows = await q(sb.from('h_audit').select('*').gt('id', maxId).order('id', { ascending: true }).limit(200));
    rows.forEach(onAuditLive);
  } catch (e) {}
}
function startLive() {
  setInterval(pollAudit, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollAudit(); });
  window.addEventListener('focus', pollAudit);
  try {
    sb.channel('h_audit_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'h_audit' }, (payload) => onAuditLive(payload.new)).subscribe();
  } catch (e) { console.warn('realtime', e); }
}

/* ---------- ANALITIKA: klik na karticu → grafikon ---------- */
const METRICS = {
  revenue: { name: 'Prihod', unit: 'rsd', kind: 'flow', src: 'orders', val: o => totals(o).revenue, sub: 'Sve što su kupci platili (artikli + dostava − popust), bez otkazanih i vraćenih' },
  profit: { name: 'Bruto profit', unit: 'rsd', kind: 'flow', src: 'orders', val: o => totals(o).profit, sub: 'Prihod bez nabavne cene robe, kurira i pakovanja' },
  orders: { name: 'Porudžbine', unit: 'n', kind: 'flow', src: 'orders', val: () => 1, sub: 'Broj porudžbina po danu' },
  basket: { name: 'Prosečna korpa', unit: 'rsd', kind: 'avg', src: 'orders', val: o => totals(o).revenue, sub: 'Prosečna vrednost porudžbine' },
  ads: { name: 'Reklame', unit: 'rsd', kind: 'flow', src: 'ads', val: a => n(a.spend), sub: 'Potrošnja na Meta reklame po danu' },
  net: { name: 'Neto (posle reklama)', unit: 'rsd', kind: 'flow', src: 'net', sub: 'Bruto profit minus potrošnja na reklame' },
  returns: { name: 'Povraćaji', unit: 'n', kind: 'flow', src: 'returns', val: () => 1, sub: 'Prijave povrata, zamena i reklamacija po danu (bez utisaka)' },
  refunds: { name: 'Vraćeno kupcima', unit: 'rsd', kind: 'flow', src: 'returns', val: r => n(r.refund_amount), sub: 'Novac vraćen kupcima po danu prijave' },
  customers: { name: 'Novi kupci', unit: 'n', kind: 'flow', src: 'customers', val: () => 1, sub: 'Kupci koji su prvi put kupili tog dana' },
  stock: { name: 'Komada na stanju', unit: 'n', kind: 'level', src: 'daily', field: 'stock_pcs', sub: 'Stanje zaliha na kraju dana (dnevni presek)' },
  stock_value: { name: 'Vrednost robe', unit: 'rsd', kind: 'level', src: 'daily', field: 'stock_value', sub: 'Vrednost zaliha po nabavnoj ceni (dnevni presek)' },
  sold: { name: 'Prodato komada', unit: 'n', kind: 'flow', src: 'items', val: i => i.qty, sub: 'Komada prodato po danu' },
};
const mt = { key: 'revenue', preset: '30', from: '', to: '', gran: 'day', compare: false, sel: null, table: false };
function mtRange() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let from, to = new Date(today);
  if (mt.preset === 'custom') { from = mt.from ? new Date(mt.from + 'T00:00:00') : new Date(today.getFullYear(), 0, 1); to = mt.to ? new Date(mt.to + 'T00:00:00') : today; }
  else if (mt.preset === 'month') from = new Date(today.getFullYear(), today.getMonth(), 1);
  else if (mt.preset === 'lastmonth') { from = new Date(today.getFullYear(), today.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); }
  else if (mt.preset === '0') { const all = state.orders.map(o => o.created_at).concat(state.ads.map(a => a.day + 'T12:00:00'), state.daily.map(d => d.day + 'T12:00:00')).sort(); from = all.length ? new Date(all[0].slice(0, 10) + 'T00:00:00') : new Date(today); if (from > today) from = new Date(today); }
  else { from = new Date(today); from.setDate(from.getDate() - (+mt.preset - 1)); }
  return { from, to };
}
function mtBucket(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); if (mt.gran === 'month') return dayStr(new Date(x.getFullYear(), x.getMonth(), 1)); if (mt.gran === 'week') { const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); } return dayStr(x); }
function mtBuckets(from, to) { const out = []; const d = new Date(mtBucket(from) + 'T00:00:00'); const end = new Date(to); while (d <= end) { out.push(dayStr(d)); if (mt.gran === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + (mt.gran === 'week' ? 7 : 1)); } return out; }
function mtRows(key) {
  const M = METRICS[key];
  if (M.src === 'orders') return state.orders.filter(o => !NO_REVENUE.includes(o.status)).map(o => ({ at: o.created_at, v: M.val(o), ref: o, kind: 'order' }));
  if (M.src === 'ads') return state.ads.map(a => ({ at: a.day + 'T12:00:00', v: M.val(a), ref: a, kind: 'ad' }));
  if (M.src === 'net') return state.orders.filter(o => !NO_REVENUE.includes(o.status)).map(o => ({ at: o.created_at, v: totals(o).profit, ref: o, kind: 'order' })).concat(state.ads.map(a => ({ at: a.day + 'T12:00:00', v: -n(a.spend), ref: a, kind: 'ad' })));
  if (M.src === 'returns') return state.rets.filter(r => r.type !== 'feedback').map(r => ({ at: r.created_at, v: M.val(r), ref: r, kind: 'ret' }));
  if (M.src === 'customers') return state.customers.filter(c => c.first_order_at || c.created_at).map(c => ({ at: c.first_order_at || c.created_at, v: 1, ref: c, kind: 'cust' }));
  if (M.src === 'items') return state.items.map(i => ({ i, o: order(i.order_id) })).filter(x => x.o && !NO_REVENUE.includes(x.o.status)).map(x => ({ at: x.o.created_at, v: x.i.qty, ref: x.o, kind: 'order' }));
  if (M.src === 'daily') return state.daily.map(d => ({ at: d.day + 'T12:00:00', v: n(d[M.field]), ref: d, kind: 'daily' }));
  return [];
}
function mtSeries(key, from, to) {
  const M = METRICS[key], rows = mtRows(key).filter(r => { const d = new Date(r.at); return d >= from && d <= new Date(to.getTime() + 86399999); });
  const map = {}; rows.forEach(r => { const b = mtBucket(r.at); (map[b] = map[b] || { v: 0, c: 0, items: [], last: null }); map[b].v += r.v; map[b].c++; map[b].items.push(r); });
  const buckets = mtBuckets(from, to);
  return buckets.map(b => { const m = map[b]; let v = m ? m.v : 0;
    if (M.kind === 'avg') v = m && m.c ? m.v / m.c : null;
    if (M.kind === 'level') v = m ? m.items.sort((a, c) => a.at.localeCompare(c.at)).at(-1).v : null;
    return { b, v, c: m ? m.c : 0, items: m ? m.items : [] }; });
}
const fmtVal = (M, v) => v == null ? '—' : M.unit === 'rsd' ? rsd(v) : String(Math.round(v * 10) / 10).replace('.', ',');
const bucketLabel = (b) => { const d = new Date(b + 'T12:00:00'); if (mt.gran === 'month') return d.toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' }); if (mt.gran === 'week') { const e = new Date(d); e.setDate(e.getDate() + 6); return `${d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' })}`; } return d.toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
function niceStep(max) { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max / 4))); const s = (max / 4) / p; return (s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10) * p; }
function openMetric(key, preset) {
  if (!METRICS[key]) return;
  mt.key = key; mt.sel = null; mt.table = false;
  if (preset) { mt.preset = preset; }
  if (state.period === 'custom' && !preset) { mt.preset = 'custom'; mt.from = state.range.from; mt.to = state.range.to; }
  else if (!preset && ['1', '7', '30', '0'].includes(String(state.period))) mt.preset = String(state.period) === '1' ? '7' : String(state.period);
  const days = (mtRange().to - mtRange().from) / 864e5;
  mt.gran = days > 200 ? 'month' : days > 70 ? 'week' : 'day';
  $('metricModal').classList.add('open');
  requestAnimationFrame(renderMetric);
}
function renderMetric() {
  const M = METRICS[mt.key], { from, to } = mtRange();
  $('mtTitle').textContent = M.name; $('mtSub').textContent = M.sub;
  document.querySelectorAll('#mtPreset button').forEach(b => b.classList.toggle('active', b.dataset.r === mt.preset));
  document.querySelectorAll('#mtGran button').forEach(b => b.classList.toggle('active', b.dataset.g === mt.gran));
  $('mtFrom').value = dayStr(from); $('mtTo').value = dayStr(to); $('mtCompare').checked = mt.compare;
  $('mtCompare').parentElement.style.display = M.kind === 'level' ? 'none' : '';
  const S = mtSeries(mt.key, from, to);
  const len = to - from + 864e5; const pFrom = new Date(from.getTime() - len), pTo = new Date(from.getTime() - 864e5);
  const P = mt.compare && M.kind !== 'level' ? mtSeries(mt.key, pFrom, pTo) : null;
  const vals = S.map(x => x.v).filter(v => v != null);
  const total = M.kind === 'flow' ? vals.reduce((a, v) => a + v, 0) : null;
  const avg = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
  const best = S.filter(x => x.v != null).sort((a, b) => b.v - a.v)[0];
  const pv = P ? P.map(x => x.v).filter(v => v != null) : null;
  const ptotal = pv ? pv.reduce((a, v) => a + v, 0) : null;
  let delta = null;
  if (M.kind === 'flow' && ptotal != null && ptotal !== 0) delta = total / ptotal - 1;
  if (M.kind === 'level' && vals.length > 1) delta = vals[0] ? vals[vals.length - 1] / vals[0] - 1 : null;
  const days = Math.round(len / 864e5);
  const gl = { day: 'dan', week: 'nedelju', month: 'mesec' }[mt.gran];
  $('mtSum').innerHTML = (M.kind === 'flow' ? `<div><b>${fmtVal(M, total)}</b><span>ukupno za ${days} dana</span></div>` : M.kind === 'level' ? `<div><b>${fmtVal(M, vals.at(-1))}</b><span>trenutno</span></div>` : `<div><b>${fmtVal(M, avg)}</b><span>prosek u periodu</span></div>`) +
    `<div><b>${fmtVal(M, avg)}</b><span>prosek po ${gl}${M.kind === 'flow' ? '' : ' (kad ima podataka)'}</span></div>` +
    `<div><b>${best ? fmtVal(M, best.v) : '—'}</b><span>${best ? 'najbolje: ' + bucketLabel(best.b) : 'nema podataka'}</span></div>` +
    `<div><b class="${delta == null ? '' : delta >= 0 ? 'pos' : 'neg'}">${delta == null ? '—' : (delta >= 0 ? '+' : '') + Math.round(delta * 100) + '%'}</b><span>${M.kind === 'level' ? 'od početka perioda' : mt.compare ? `vs prethodnih ${days} dana (${fmtVal(M, ptotal)})` : 'uključi poređenje iznad'}</span></div>`;
  // chart
  const box = $('mtChart'); const W = Math.max(320, (box.clientWidth || 900) - 12), H = Math.max(160, (box.clientHeight || 300) - 14), narrow = W < 520, L = narrow ? 40 : 58, R = 12, T = 14, B = 30, iw = W - L - R, ih = H - T - B;
  const allV = vals.concat(pv || []); const maxV = Math.max(1, ...allV.map(v => Math.abs(v))); const minV = Math.min(0, ...allV);
  const step = niceStep(maxV); const yMax = Math.ceil(maxV / step) * step; const yMin = minV < 0 ? -Math.ceil(-minV / step) * step : 0;
  const y = (v) => T + ih - (v - yMin) / (yMax - yMin) * ih; const y0 = y(0);
  const nB = S.length, slot = iw / Math.max(1, nB), bw = Math.min(24, Math.max(2, slot * (P ? 0.36 : 0.62)));
  const xC = (i) => L + slot * i + slot / 2;
  let g = '';
  for (let v = yMin; v <= yMax + 1e-9; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${M.unit === 'rsd' ? (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : v) : v}</text>`;
  const every = Math.ceil(nB / (narrow ? 4 : 8)); let lastLbl = -99;
  S.forEach((s, i) => { if ((i % every === 0 && i <= nB - 1 - every / 2) || (i === nB - 1 && i - lastLbl >= Math.max(2, every * 0.8))) { lastLbl = i; const d = new Date(s.b + 'T12:00:00'); g += `<text class="ax" x="${xC(i)}" y="${H - 8}" text-anchor="middle">${mt.gran === 'month' ? d.toLocaleDateString('sr-Latn-RS', { month: 'short', year: '2-digit' }) : d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' })}</text>`; } });
  let marks = '';
  if (M.kind === 'level' || M.kind === 'avg') {
    const pts = S.map((s, i) => s.v == null ? null : [xC(i), y(s.v)]).filter(Boolean);
    if (pts.length) { marks += `<path class="area" d="M${pts[0][0]},${y0} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts.at(-1)[0]},${y0} Z"/><polyline class="line" points="${pts.map(p => p.join(',')).join(' ')}"/>`; S.forEach((s, i) => { if (s.v != null) marks += `<circle class="dot ${mt.sel === s.b ? 'sel' : ''}" cx="${xC(i)}" cy="${y(s.v)}" r="4"/>`; }); }
  } else {
    if (P) P.forEach((s, i) => { if (i >= nB || s.v == null || !s.v) return; const hgt = Math.abs(y(s.v) - y0); marks += `<rect class="bar prev" x="${xC(i) - bw - 1}" y="${Math.min(y(s.v), y0)}" width="${bw}" height="${Math.max(2, hgt)}" rx="3"/>`; });
    S.forEach((s, i) => { if (!s.v) return; const hgt = Math.abs(y(s.v) - y0); marks += `<rect class="bar ${mt.sel === s.b ? 'sel' : (mt.sel ? 'dim' : '')}" x="${P ? xC(i) + 1 : xC(i) - bw / 2}" y="${Math.min(y(s.v), y0)}" width="${bw}" height="${Math.max(2, hgt)}" rx="3" style="animation:barUp .6s var(--ease) both;animation-delay:${Math.min(i, 40) * 8}ms"/>`; });
  }
  if (M.kind === 'flow' && vals.length > 1 && avg) marks += `<line class="avg" x1="${L}" x2="${W - R}" y1="${y(avg)}" y2="${y(avg)}"/><text class="avgl" x="${L + 6}" y="${y(avg) - 5}">prosek ${fmtVal(M, avg)}</text>`;
  if (yMin < 0) marks += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}" style="stroke:#8a9187"/>`;
  const hits = S.map((s, i) => `<rect class="hit" data-bi="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${ih}"/>`).join('');
  $('mtChart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:100%">${g}<line class="xh" id="mtXh" x1="0" x2="0" y1="${T}" y2="${T + ih}" style="display:none"/>${marks}${hits}</svg><div class="mt-tip" id="mtTip"></div>${!vals.length ? '<div class="mt-empty">Nema podataka u ovom periodu.</div>' : ''}`;
  $('mtLegend').innerHTML = P ? `<span>ovaj period</span><span class="prev">prethodni period</span>` : '';
  mt.S = S; mt.P = P; mt.geo = { W, H, L, T, ih, slot, xC };
  renderMetricDetails();
}
function mtShowTip(i, pin) {
  const s = mt.S[i]; if (!s) return; const M = METRICS[mt.key];
  const tip = $('mtTip'), chart = $('mtChart'), r = chart.getBoundingClientRect(), sx = r.width / mt.geo.W;
  const px = (mt.geo.xC(i)) * sx;
  tip.style.left = Math.max(80, Math.min(r.width - 80, px)) + 'px'; tip.style.top = '12px';
  const p = mt.P && mt.P[i];
  tip.innerHTML = `<small>${esc(bucketLabel(s.b))}</small><b>${fmtVal(M, s.v)}</b>${M.kind !== 'level' && M.kind !== 'avg' ? `<small>${s.c} ${s.c === 1 ? 'zapis' : 'zapisa'}</small>` : ''}${p && p.v != null ? `<small>prethodni: ${fmtVal(M, p.v)}</small>` : ''}${pin ? '' : '<small>klik za detalje</small>'}`;
  tip.classList.add('on');
  const xh = $('mtXh'); xh.style.display = ''; xh.setAttribute('x1', mt.geo.xC(i)); xh.setAttribute('x2', mt.geo.xC(i));
}
function renderMetricDetails() {
  const M = METRICS[mt.key], S = mt.S || [];
  $('mtTableBtn').classList.toggle('active', mt.table);
  if (mt.table) {
    $('mtDetTitle').textContent = 'Tabela po periodu';
    $('mtDetails').innerHTML = `<div class="table-card"><table class="mt-table"><thead><tr><th>Period</th><th class="num">${esc(M.name)}</th>${M.kind === 'flow' ? '<th class="num">Zapisa</th>' : ''}</tr></thead><tbody>${S.slice().reverse().map(s => `<tr><td>${esc(bucketLabel(s.b))}</td><td class="num">${fmtVal(M, s.v)}</td>${M.kind === 'flow' ? `<td class="num">${s.c}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
    return;
  }
  const s = S.find(x => x.b === mt.sel);
  if (!s) { $('mtDetTitle').textContent = 'Klikni na stubić za detalje tog dana'; $('mtDetails').innerHTML = ''; return; }
  $('mtDetTitle').textContent = `${bucketLabel(s.b)}: ${fmtVal(M, s.v)}`;
  const items = s.items.slice().sort((a, b) => b.at.localeCompare(a.at));
  $('mtDetails').innerHTML = items.map(it => {
    if (it.kind === 'order') { const o = it.ref, t = totals(o); return `<div class="list-row" data-order="${o.id}"><span><b>${esc(o.order_no || '')}</b> · ${esc(o.customer_name)} · ${itemsSummary(o)} <span class="page-sub">${fmtDT(o.created_at)}</span></span><span>${pill(o.status)} <b class="num">${mt.key === 'profit' || mt.key === 'net' ? rsd(t.profit) : rsd(t.revenue)}</b></span></div>`; }
    if (it.kind === 'ad') { const a = it.ref; return `<div class="list-row" data-goto="ads"><span>Reklame · ${esc(a.campaign)}${a.purchases != null ? ` · ${a.purchases} kupovina (Meta)` : ''}</span><b class="num neg">−${rsd(a.spend)}</b></div>`; }
    if (it.kind === 'ret') { const r = it.ref; return `<div class="list-row" data-ret="${r.id}"><span><b>${esc(r.case_no)}</b> · ${esc(r.customer_name)} · ${RT[r.type]} · ${esc(r.item || '')} ${esc(r.reason || '')}</span><span>${pill(r.status)}${r.refund_amount ? ` <b class="num">${rsd(r.refund_amount)}</b>` : ''}</span></div>`; }
    if (it.kind === 'cust') { const c = it.ref; return `<div class="list-row" data-cust="${c.id}"><span><b>${esc(c.name)}</b> · ${esc(c.city || '')} · ${esc(c.phone || c.instagram || '')}</span><span class="page-sub">${fmtDT(it.at)}</span></span></div>`; }
    if (it.kind === 'daily') { const d = it.ref; return `<div class="list-row" style="cursor:default"><span>Presek ${esc(d.day)}: ${d.stock_pcs} kom · ${rsd(d.stock_value)} · ${d.orders} porudžbina · ${rsd(d.revenue)}</span><span class="page-sub">upisano ${fmtDT(d.updated_at)}</span></div>`; }
    return '';
  }).join('') || '<div class="kb-empty">Nema zapisa za ovaj period.</div>';
}
function sparkline(key) {
  const M = METRICS[key]; if (!M) return '';
  const save = { gran: mt.gran, preset: mt.preset }; mt.gran = 'day';
  const to = new Date(); to.setHours(0, 0, 0, 0); const from = new Date(to); from.setDate(from.getDate() - 13);
  const S = mtSeries(key, from, to); mt.gran = save.gran;
  const vals = S.map(s => s.v == null ? 0 : s.v); const max = Math.max(1, ...vals.map(Math.abs)), min = Math.min(0, ...vals);
  const w = 96, h = 30, pts = vals.map((v, i) => [i / 13 * w, h - 3 - (v - min) / (max - min || 1) * (h - 6)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="sp-fill" d="M${pts[0][0]},${h} ${pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${w},${h} Z"/><polyline points="${pts.map(p => p.map(x => x.toFixed(1)).join(',')).join(' ')}"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1].toFixed(1)}" r="3"/></svg>`;
}
function deltaChip(key) {
  const M = METRICS[key]; if (!M || M.kind !== 'flow') return '';
  const P = state.period; if (P === 'custom' || String(P) === '0') return '';
  const days = +P || 30; const to = new Date(); to.setHours(0, 0, 0, 0); const from = new Date(to); from.setDate(from.getDate() - (days - 1));
  const pTo = new Date(from.getTime() - 864e5), pFrom = new Date(pTo.getTime() - (days - 1) * 864e5);
  const save = mt.gran; mt.gran = 'day';
  const cur = mtSeries(key, from, to).reduce((a, s) => a + (s.v || 0), 0), prev = mtSeries(key, pFrom, pTo).reduce((a, s) => a + (s.v || 0), 0);
  mt.gran = save;
  if (!prev) return '';
  const d = cur / prev - 1; const up = d >= 0.005, down = d <= -0.005;
  const good = key === 'ads' || key === 'returns' || key === 'refunds' ? !up : up;
  return `<span class="delta ${!up && !down ? 'flat' : good ? 'up' : 'down'}" title="u odnosu na prethodnih ${days} dana">${up ? '▲' : down ? '▼' : '•'} ${Math.abs(Math.round(d * 100))}%</span>`;
}

/* ---------- BRZA BELEŠKA + beleške na Pregledu ---------- */
function renderHomeNotes() {
  const list = state.notes.slice().sort((a, b) => (b.pinned - a.pinned) || (a.done - b.done) || b.created_at.localeCompare(a.created_at));
  const where = (x) => x.area === 'story' ? 'Brand story' : (x.area || '').startsWith('promo:') ? ('Promocija: ' + (state.promos.find(p => p.id === x.area.split(':')[1])?.name || '')) : '';
  const show = list.filter(x => !x.done).slice(0, 6);
  $('homeNotes').innerHTML = show.map((x, i) => `<div class="hn ${x.pinned ? 'pinned' : ''} ${x.done ? 'done' : ''}" style="animation-delay:${i * 40}ms">
      <div class="txt">${esc(x.body).replace(/\n/g, '<br>')}</div>
      <div class="meta"><span class="by ${PEOPLE[x.author] ? x.author : 'other'}">${esc(personName(x.author))}</span>${relTime(x.created_at)}${where(x) ? ' · ' + esc(where(x)) : ''}${x.pinned ? ' · 📌' : ''}</div>
      <span class="n-act"><button data-note="${x.id}" data-act="pin" title="Zakači">📌</button><button data-note="${x.id}" data-act="done" title="Završeno">✓</button><button data-note="${x.id}" data-act="del" title="Obriši">✕</button></span></div>`).join('')
    + `<div class="hn add" id="hnAdd">✎ Nova beleška</div><div class="hn all" data-goto="notes">Sve beleške (${list.length}) →</div>`;
}
function openNoteModal(area) {
  $('qn_body').value = ''; $('qn_pin').checked = false; $('qn_area').value = area || 'general';
  const w = state.writer || who();
  document.querySelectorAll('#qnWriter button').forEach(b => b.classList.toggle('active', b.dataset.qw === w));
  $('noteModal').classList.add('open'); setTimeout(() => $('qn_body').focus(), 40);
}
async function saveQuickNote() {
  const body = $('qn_body').value.trim(); if (!body) return toast('Napiši nešto prvo');
  const area = $('qn_area').value, author = state.writer || who();
  try {
    if (area === 'milestone') {
      const r = await q(sb.from('h_milestones').insert({ title: body.split('\n')[0].slice(0, 140), body: body.includes('\n') ? body.slice(body.indexOf('\n') + 1) : null, kind: 'event', author: personName(author) }).select().single());
      state.milestones.push(r);
    } else {
      const r = await q(sb.from('h_notes').insert({ area, author, body, pinned: $('qn_pin').checked }).select().single());
      state.notes.push(r);
    }
    $('noteModal').classList.remove('open'); renderAll(); toast('Zabeleženo ✓');
  } catch (e) { fail(e); }
}

/* ---------- MOBILNI MENI (tri crtice) ---------- */
function openNav() { renderNav(); document.body.classList.add('nav-open'); $('navQ').value = ''; }
function closeNav() { document.body.classList.remove('nav-open'); $('navQ').blur(); }
function navBadge(tab) {
  const id = { products: 'alertBadge', returns: 'retBadge', promos: 'promoBadge', packaging: 'packBadge', notes: 'notesBadge' }[tab];
  const el = id && $(id); return el && el.style.display !== 'none' && el.textContent ? `<span class="tab-badge ${el.classList.contains('live') ? 'live' : ''}">${esc(el.textContent)}</span>` : '';
}
function renderNav() {
  if (!state.user) return;
  $('navUser').textContent = state.user.display; $('navAvatar').textContent = state.user.display.charAt(0).toUpperCase();
  $('navProj').value = $('projSel').value;
  const qraw = $('navQ').value.trim(), qn = fold(qraw);
  let html = '';
  const secs = SECTIONS.filter(s => !qn || scoreMatch(s.name, qn) || scoreMatch(s.kw, qn));
  if (secs.length) html += (qn ? '<div class="nd-grp">Sekcije</div>' : '') + secs.map((s, i) => `<button class="nd-item ${state.tab === s.tab ? 'active' : ''}" data-navtab="${s.tab}" style="animation-delay:${i * 22}ms"><span class="ic">${s.ic}</span><span>${hl(s.name, qn)}</span>${navBadge(s.tab)}</button>`).join('');
  if (qn) {
    const res = cmdItems(qraw).filter(it => it.k !== 'tab').slice(0, 12);
    state.navRes = res;
    if (res.length) html += '<div class="nd-grp">Rezultati</div>' + res.map((it, i) => `<button class="nd-item" data-navres="${i}"><span class="ic">${it.ic}</span><span style="min-width:0">${hl(it.title, qn)}${it.sub ? `<small>${hl(it.sub, qn)}</small>` : ''}</span></button>`).join('');
    if (!secs.length && !res.length) html = `<div class="nd-grp">Ništa za „${esc(qraw)}“</div>`;
  }
  $('navList').innerHTML = html;
}

/* ---------- STRANICA BELEŠKE ---------- */
const npState = { who: 'all', status: 'open', area: 'all', sort: 'new', editId: null };
const notePlace = (x) => x.area === 'story' ? 'Brand story' : (x.area || '').startsWith('promo:') ? ('Promocija: ' + (state.promos.find(p => p.id === x.area.split(':')[1])?.name || '')) : 'Opšta';
const seenKey = () => 'crm_notes_seen_' + who();
function notesUnread() { const seen = LS.get(seenKey(), ''); return state.notes.filter(x => x.author !== who() && !x.done && (!seen || x.created_at > seen)).length; }
function renderNotesBadge() { const n = notesUnread(), b = $('notesBadge'); if (!b) return; b.style.display = n && state.tab !== 'notes' ? '' : 'none'; b.textContent = n; }
function npCard(x, i) {
  const editing = npState.editId === x.id;
  const p = PEOPLE[x.author];
  return `<div class="np-note ${x.pinned ? 'pinned' : ''} ${x.done ? 'done' : ''}" style="animation-delay:${Math.min(i, 20) * 25}ms" data-npid="${x.id}">
    ${editing ? `<textarea id="npEdit">${esc(x.body)}</textarea>` : `<div class="txt">${esc(x.body)}</div>`}
    <div class="np-meta"><span class="n-av ${p ? x.author : 'system'}">${esc((p ? p.name : x.author).charAt(0))}</span><b>${esc(personName(x.author))}</b>
      <span title="${fmtDT(x.created_at)}">${relTime(x.created_at)}</span><span class="place">${esc(notePlace(x))}</span>
      ${x.updated_at ? `<span>· izmenio/la ${esc(personName(x.updated_by || ''))} ${relTime(x.updated_at)}</span>` : ''}
      ${x.done ? `<span>· završeno${x.done_by ? ' (' + esc(personName(x.done_by)) + ')' : ''}</span>` : ''}</div>
    <div class="np-acts">${editing ? `<button data-npsave="${x.id}" class="on">Sačuvaj</button><button data-npcancel="1">Otkaži</button>` :
      `<button data-note="${x.id}" data-act="pin" class="${x.pinned ? 'on' : ''}">📌 ${x.pinned ? 'Otkači' : 'Zakači'}</button><button data-note="${x.id}" data-act="done" class="${x.done ? 'on' : ''}">✓ ${x.done ? 'Vrati' : 'Završeno'}</button><button data-npedit="${x.id}">✎ Izmeni</button><button data-note="${x.id}" data-act="del">✕</button>`}</div>
  </div>`;
}
function renderNotesPage() {
  if (!$('npList')) return;
  const qn = fold($('npQ').value.trim());
  const all = state.notes;
  // ljudi
  const people = Object.keys(PEOPLE).map(k => ({ k, open: all.filter(x => x.author === k && !x.done).length, tot: all.filter(x => x.author === k).length }));
  $('npPeople').innerHTML = `<div class="np-person ${npState.who === 'all' ? 'active' : ''}" data-npwho="all"><span class="n-av system">∑</span><div><b>Svi</b><span>${all.filter(x => !x.done).length} otvorenih · ${all.length} ukupno</span></div></div>` +
    people.map(p => `<div class="np-person ${npState.who === p.k ? 'active' : ''}" data-npwho="${p.k}"><span class="n-av ${p.k}">${PEOPLE[p.k].name.charAt(0)}</span><div><b>${PEOPLE[p.k].name}</b><span>${p.open} otvorenih · ${p.tot} ukupno</span></div></div>`).join('');
  document.querySelectorAll('#npStatus button').forEach(b => b.classList.toggle('active', b.dataset.s === npState.status));
  const w = state.writer || who();
  document.querySelectorAll('#npWriter button').forEach(b => b.classList.toggle('active', b.dataset.npw === w));
  let list = all.filter(x => (npState.who === 'all' || x.author === npState.who)
    && (npState.status === 'all' || (npState.status === 'done' ? x.done : !x.done))
    && (npState.area === 'all' || (npState.area === 'promo' ? (x.area || '').startsWith('promo:') : x.area === npState.area))
    && (!qn || fold(x.body + ' ' + personName(x.author) + ' ' + notePlace(x)).includes(qn)));
  list.sort((a, b) => npState.sort === 'old' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  $('npCount').textContent = `${list.length} beleški`;
  const pinned = list.filter(x => x.pinned && !x.done), rest = list.filter(x => !(x.pinned && !x.done));
  let html = '', i = 0;
  if (pinned.length) html += `<div class="np-day">Zakačeno <span>${pinned.length}</span></div><div class="np-grid">${pinned.map(x => npCard(x, i++)).join('')}</div>`;
  const groups = []; let cur = null;
  rest.forEach(x => { const d = dayStr(new Date(x.created_at)); if (!cur || cur.d !== d) { cur = { d, items: [] }; groups.push(cur); } cur.items.push(x); });
  groups.forEach(g => { const dt = new Date(g.d + 'T12:00:00'), today = dayStr(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
    const lbl = g.d === today ? 'Danas' : g.d === dayStr(y) ? 'Juče' : dt.toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    html += `<div class="np-day">${lbl} <span>${g.items.length}</span></div><div class="np-grid">${g.items.map(x => npCard(x, i++)).join('')}</div>`; });
  const prevEdit = document.activeElement && document.activeElement.id === 'npEdit' ? document.activeElement.value : null;
  if (prevEdit !== null) return; // ne prekidaj izmenu dok neko kuca
  $('npList').innerHTML = html || `<div class="panel"><div class="page-sub">${all.length ? 'Nema beleški za ovaj filter.' : 'Još nema beleški. Upiši prvu gore.'}</div></div>`;
  if (npState.editId) { const t = $('npEdit'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
}
async function npSaveNew() {
  const body = $('np_body').value.trim(); if (!body) return toast('Napiši nešto prvo');
  try {
    const r = await q(sb.from('h_notes').insert({ area: $('np_area').value, author: state.writer || who(), body, pinned: $('np_pin').checked }).select().single());
    state.notes.push(r); $('np_body').value = ''; $('np_pin').checked = false; renderAll(); toast('Beleška sačuvana ✓');
  } catch (e) { fail(e); }
}
async function npSaveEdit(id) {
  const x = state.notes.find(z => z.id === id), t = $('npEdit'); if (!x || !t) return;
  const body = t.value.trim(); if (!body) return toast('Beleška ne može biti prazna');
  try {
    const patch = { body, updated_at: new Date().toISOString(), updated_by: who() };
    await q(sb.from('h_notes').update(patch).eq('id', id)); Object.assign(x, patch);
    npState.editId = null; t.blur(); renderAll(); toast('Izmenjeno ✓');
  } catch (e) { fail(e); }
}

/* ---------------- shell ---------------- */
function renderAll() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + state.tab));
  document.querySelectorAll('#periodSeg button').forEach(b => b.classList.toggle('active', b.dataset.p === String(state.period)));
  $('rangeWrap').style.display = state.period === 'custom' ? '' : 'none';
  renderOverview(); renderOrders(); renderProducts(); renderAds();
  renderGarderoba(); renderPosts(); renderSite(); renderPackaging(); renderStory(); renderNotes(); renderReturns(); renderPromos(); renderCustomers(); renderHomeNotes(); renderNotesPage(); renderNotesBadge(); if (document.body.classList.contains('nav-open')) renderNav();
  if (state.tab === 'history') renderHistory();
}
function setTab(t) {
  if (t === 'notes') LS.set(seenKey(), new Date().toISOString());
  closeNav();
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
  $('periodSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.period = b.dataset.p; LS.set('crm_period', b.dataset.p); if (b.dataset.p === 'custom' && !state.range.from) { const d = new Date(); d.setDate(1); state.range.from = dayStr(d); state.range.to = dayStr(new Date()); } $('rangeFrom').value = state.range.from; $('rangeTo').value = state.range.to; renderAll(); });
  ['rangeFrom', 'rangeTo'].forEach(id => $(id).addEventListener('change', () => { state.range = { from: $('rangeFrom').value, to: $('rangeTo').value }; LS.set('crm_rfrom', state.range.from); LS.set('crm_rto', state.range.to); renderAll(); }));
  $('cmdBtn').addEventListener('click', openCmd); $('cmdBtnM').addEventListener('click', openCmd);
  $('cmdBg').addEventListener('click', closeCmd);
  $('cmdFilter').addEventListener('click', () => setQuery(''));
  $('cmdInput').addEventListener('input', () => { cmdSel = 0; renderCmd(); });
  $('cmdInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdSel = Math.min(cmdCur.length - 1, cmdSel + 1); renderCmd(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdSel = Math.max(0, cmdSel - 1); renderCmd(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmd(cmdCur[cmdSel]); }
  });
  $('cmdList').addEventListener('click', (e) => { const it = e.target.closest('[data-ci]'); if (it) runCmd(cmdCur[+it.dataset.ci]); });
  $('cmdList').addEventListener('mousemove', (e) => { const it = e.target.closest('[data-ci]'); if (it && +it.dataset.ci !== cmdSel) { cmdSel = +it.dataset.ci; document.querySelectorAll('.cmd-item').forEach(x => x.classList.toggle('sel', +x.dataset.ci === cmdSel)); } });
  document.addEventListener('keydown', (e) => {
    if (!state.user) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('cmdWrap').classList.contains('open') ? closeCmd() : openCmd(); return; }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); openCmd(); }
    else if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) { const sct = SECTIONS[+e.key - 1]; if (sct) setTab(sct.tab); }
    else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) { openOrderModal(); }
    else if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey) { openNoteModal('general'); }
  });
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('cmdKbd').textContent = 'Ctrl K';
  // mobilni meni
  $('navBtn').addEventListener('click', () => document.body.classList.contains('nav-open') ? closeNav() : openNav());
  $('navOv').addEventListener('click', closeNav);
  $('navClose').addEventListener('click', closeNav);
  $('navQ').addEventListener('input', renderNav);
  $('navQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('navList').querySelector('.nd-item'); if (f) f.click(); } });
  $('navList').addEventListener('click', (e) => {
    const t = e.target.closest('[data-navtab]'); if (t) { closeNav(); return setTab(t.dataset.navtab); }
    const r = e.target.closest('[data-navres]'); if (r) { const it = state.navRes[+r.dataset.navres]; closeNav(); return runCmd(it); }
  });
  $('navProj').addEventListener('change', (e) => { $('projSel').value = e.target.value; $('projSel').dispatchEvent(new Event('change')); closeNav(); });
  $('navLogout').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  let ndX = null; $('navDrawer').addEventListener('touchstart', (e) => { ndX = e.touches[0].clientX; }, { passive: true });
  $('navDrawer').addEventListener('touchend', (e) => { if (ndX != null && ndX - e.changedTouches[0].clientX > 60) closeNav(); ndX = null; }, { passive: true });
  // stranica beleške
  $('npSave').addEventListener('click', npSaveNew);
  $('np_body').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); npSaveNew(); } });
  $('npWriter').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.writer = b.dataset.npw; renderNotesPage(); });
  $('npStatus').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; npState.status = b.dataset.s; renderNotesPage(); });
  $('npArea').addEventListener('change', (e) => { npState.area = e.target.value; renderNotesPage(); });
  $('npSort').addEventListener('change', (e) => { npState.sort = e.target.value; renderNotesPage(); });
  $('npQ').addEventListener('input', renderNotesPage);
  $('npPeople').addEventListener('click', (e) => { const b = e.target.closest('[data-npwho]'); if (!b) return; npState.who = b.dataset.npwho; renderNotesPage(); });
  $('npList').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-npedit]'); if (ed) { npState.editId = ed.dataset.npedit; return renderNotesPage(); }
    const sv = e.target.closest('[data-npsave]'); if (sv) return npSaveEdit(sv.dataset.npsave);
    if (e.target.closest('[data-npcancel]')) { npState.editId = null; $('npEdit')?.blur(); return renderNotesPage(); }
  });
  $('npList').addEventListener('keydown', (e) => { if (e.target.id === 'npEdit' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); npSaveEdit(npState.editId); } if (e.target.id === 'npEdit' && e.key === 'Escape') { e.stopPropagation(); npState.editId = null; e.target.blur(); renderNotesPage(); } });
  // brza beleška
  $('quickNoteBtn').addEventListener('click', () => openNoteModal('general'));
  $('qnSave').addEventListener('click', saveQuickNote);
  $('noteModal').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveQuickNote(); } });
  $('qnWriter').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.writer = b.dataset.qw; document.querySelectorAll('#qnWriter button').forEach(x => x.classList.toggle('active', x === b)); });
  // brend: klik na logo -> početna
  $('brandHome').addEventListener('click', (e) => { e.preventDefault(); $('projSel').value = 'harizma'; $('harizma').style.display = ''; $('soonView').style.display = 'none'; setTab('overview'); });
  // analitika
  $('mtPreset').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mt.preset = b.dataset.r; mt.sel = null; const d = (mtRange().to - mtRange().from) / 864e5; mt.gran = d > 200 ? 'month' : d > 70 ? 'week' : 'day'; renderMetric(); });
  ['mtFrom', 'mtTo'].forEach(id => $(id).addEventListener('change', () => { mt.preset = 'custom'; mt.from = $('mtFrom').value; mt.to = $('mtTo').value; mt.sel = null; renderMetric(); }));
  $('mtGran').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mt.gran = b.dataset.g; mt.sel = null; renderMetric(); });
  $('mtCompare').addEventListener('change', (e) => { mt.compare = e.target.checked; renderMetric(); });
  $('mtTableBtn').addEventListener('click', () => { mt.table = !mt.table; renderMetricDetails(); });
  let mtRz; window.addEventListener('resize', () => { if (!$('metricModal').classList.contains('open')) return; clearTimeout(mtRz); mtRz = setTimeout(renderMetric, 150); });
  $('mtChart').addEventListener('pointermove', (e) => { const h = e.target.closest('.hit'); if (h) mtShowTip(+h.dataset.bi, false); });
  $('mtChart').addEventListener('pointerleave', () => { if (mt.sel == null) { $('mtTip')?.classList.remove('on'); const xh = $('mtXh'); if (xh) xh.style.display = 'none'; } else { const i = mt.S.findIndex(s => s.b === mt.sel); if (i >= 0) mtShowTip(i, true); } });
  $('mtChart').addEventListener('click', (e) => { const h = e.target.closest('.hit'); if (!h) return; const s = mt.S[+h.dataset.bi]; mt.sel = mt.sel === s.b ? null : s.b; mt.table = false; renderMetric(); if (mt.sel) mtShowTip(+h.dataset.bi, true); });
  // obaveštenja
  $('bellBtn').addEventListener('click', (e) => { e.stopPropagation(); $('bellMenu').classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.bell-wrap')) $('bellMenu').classList.remove('open'); });
  $('nfWho').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.nfWho = b.dataset.w; renderNotifHistory(); });
  $('nfCat').addEventListener('change', renderNotifHistory);
  $('nfQ').addEventListener('input', renderNotifHistory);
  $('nfMore').addEventListener('click', async () => { await loadNotifs(true); renderNotifHistory(); renderTray(); });
  // kupci
  $('newCustBtn').addEventListener('click', () => openCustModal());
  $('newCodeBtn').addEventListener('click', () => openCodeModal());
  $('codeForm').addEventListener('submit', saveCode);
  $('cdDelete').addEventListener('click', deleteCode);
  $('cd_kind').addEventListener('change', () => { $('cd_custWrap').style.display = ['personal', 'loyalty'].includes($('cd_kind').value) ? '' : 'none'; });
  $('custViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.custView = b.dataset.view; LS.set('crm_cview', b.dataset.view); renderCustomers(); });
  $('custSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.custSeg = b.dataset.s; renderCustomers(); });
  $('custSort').addEventListener('change', (e) => { state.custSort = e.target.value; renderCustomers(); });
  $('custTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.custTab = b.dataset.ct; renderCustBody(); document.querySelectorAll('#custTabs button').forEach(x => x.classList.toggle('active', x === b)); });
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
    const bm = e.target.closest('[data-bm]'); if (bm) { e.stopPropagation(); return nfMenu(bm.dataset.bm); }
    const nd = e.target.closest('[data-ndis]'); if (nd) { e.stopPropagation(); return nfDismiss(+nd.dataset.ndis); }
    const no = e.target.closest('[data-nopen]'); if (no) { e.stopPropagation(); const r = no.dataset.nopen; $('notifModal').classList.remove('open'); if (r.startsWith('tab:')) return setTab(r.slice(4)); const tabFor = { order: 'orders', cust: 'customers', product: 'products', post: 'posts', ret: 'returns', promo: 'promos', code: 'customers', ms: 'history', idea: 'site', pack: 'packaging' }; const k = r.split(':')[0]; if (tabFor[k] && state.tab !== tabFor[k]) setTab(tabFor[k]); return openRef(r); }
    const mtile = e.target.closest('[data-metric]'); if (mtile) return openMetric(mtile.dataset.metric);
    if (e.target.id === 'hnAdd' || e.target.closest('#hnAdd')) return openNoteModal('general');
    if (e.target.id === 'loySave') return saveLoyalty();
    const rw = e.target.closest('[data-reward]'); if (rw) { e.stopPropagation(); return giveReward(rw.dataset.reward); }
    const noc = e.target.closest('[data-newordercust]'); if (noc) { const c = state.customers.find(x => x.id === noc.dataset.newordercust); $('custModal').classList.remove('open'); openOrderModal(); if (c) { $('o_name').value = c.name; $('o_phone').value = c.phone || ''; $('o_ig').value = c.instagram || ''; $('o_email').value = c.email || ''; $('o_addr').value = c.address || ''; $('o_city').value = c.city || ''; $('o_zip').value = c.postal_code || ''; } return; }
    const cdl = e.target.closest('[data-code]'); if (cdl && !e.target.closest('#codeModal')) return openCodeModal(cdl.dataset.code);
    const cst = e.target.closest('[data-cust]'); if (cst && !e.target.closest('#custModal')) { if (e.target.closest('#metricModal')) $('metricModal').classList.remove('open'); return openCustModal(cst.dataset.cust); }
    const rs = e.target.closest('[data-restore]'); if (rs) { const [t, id] = rs.dataset.restore.split(':'); return restoreRow(t, id); }
    const pw = e.target.closest('[data-pwriter]'); if (pw) { state.writer = pw.dataset.pwriter; renderPromoNotes(state.editPromoId); return; }
    if (e.target.id === 'histMore') { state.histLimit += 200; return renderHistory(); }
    const op = e.target.closest('[data-open]'); if (op && !e.target.closest('.modal-wrap')) return openRef(op.dataset.open);
    const pm = e.target.closest('[data-promo]'); if (pm && !e.target.closest('#promoModal')) return openPromoModal(pm.dataset.promo);
    const ti = e.target.closest('[data-toidea]'); if (ti) { e.stopPropagation(); return retToIdea(ti.dataset.toidea); }
    const rr = e.target.closest('[data-ret]'); if (rr && !e.target.closest('#retModal')) { if (e.target.closest('#custModal')) $('custModal').classList.remove('open'); if (e.target.closest('#metricModal')) $('metricModal').classList.remove('open'); return openRetModal(rr.dataset.ret); }
    const ii = e.target.closest('[data-idea]'); if (ii) return openIdeaModal(ii.dataset.idea);
    const pk = e.target.closest('[data-pack]'); if (pk) return openPackModal(pk.dataset.pack);
    const sb_ = e.target.closest('[data-stock]');
    if (sb_) { e.stopPropagation(); return bumpStock(sb_.dataset.stock, +sb_.dataset.d); }
    const del = e.target.closest('[data-delad]');
    if (del) { if (confirm('Unos ide u arhivu. Nastaviti?')) softDelete('h_ad_spend', del.dataset.delad).then(() => { state.ads = state.ads.filter(a => a.id !== del.dataset.delad); renderAll(); }).catch(fail); return; }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) { $('lightboxImg').src = zoom.src; $('lightbox').classList.add('open'); return; }
    const go = e.target.closest('[data-goto]'); if (go) { document.querySelectorAll('.modal-wrap.open').forEach(m => m.classList.remove('open')); return setTab(go.dataset.goto); }
    const oe = e.target.closest('[data-order]'); if (oe && !e.target.closest('.drawer')) { if (e.target.closest('#custModal')) $('custModal').classList.remove('open'); if (e.target.closest('#metricModal')) $('metricModal').classList.remove('open'); return openDrawer(oe.dataset.order); }
    const pe = e.target.closest('[data-product]'); if (pe) return openProductModal(pe.dataset.product);
    if (e.target.matches('[data-close]')) { const mw = e.target.closest('.modal-wrap'); mw.classList.remove('open'); if (mw.id === 'notifModal') { state.trayHidden = false; renderTray(); } if (nfPending) { nfPending = false; loadData().then(() => renderAll()).catch(() => {}); } }
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
  $('o_name').addEventListener('change', () => { if (state.editOrderId) return; const c = state.customers.find(x => x.name.toLowerCase() === $('o_name').value.trim().toLowerCase()); if (!c) return; [['o_phone', 'phone'], ['o_ig', 'instagram'], ['o_email', 'email'], ['o_addr', 'address'], ['o_city', 'city'], ['o_zip', 'postal_code']].forEach(([el, f]) => { if (!$(el).value && c[f]) $(el).value = c[f]; }); toast(`Poznat kupac: ${c.name} (${custStats(c).count} porudžbina)`); });
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

  $('newPromoBtn').addEventListener('click', () => openPromoModal());
  $('promoForm').addEventListener('submit', savePromo);
  $('prDelete').addEventListener('click', deletePromo);
  $('promoSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.promoF = b.dataset.f; renderPromos(); });
  $('prNotes').addEventListener('keydown', (e) => { if (e.target.id === 'prNoteInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addPromoNote(); } });
  $('newMilestoneBtn').addEventListener('click', () => openMsModal());
  $('msForm').addEventListener('submit', saveMs);
  $('msDelete').addEventListener('click', deleteMs);
  $('archiveBtn').addEventListener('click', showArchive);
  $('histSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.histF = b.dataset.f; state.histLimit = 150; renderHistory(); });
  $('histMonth').addEventListener('change', (e) => { state.histMonth = e.target.value; state.histLimit = 150; renderHistory(); });
  $('newRetBtn').addEventListener('click', () => openRetModal());
  $('retForm').addEventListener('submit', saveRet);
  $('rtDelete').addEventListener('click', deleteRet);
  $('rtIdea').addEventListener('click', () => retToIdea(state.editRetId));
  $('rtRestock').addEventListener('click', (e) => { if (e.target.id === 'rtRestockBtn') restockOne(); if (e.target.id === 'rtOrderReturned') restockOrder(); });
  $('retViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.retView = b.dataset.view; LS.set('crm_rview', b.dataset.view); renderReturns(); });
  $('retTypeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.retType = b.dataset.t; renderReturns(); });
  $('siteCopyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(siteUrl()); toast('Link sajta kopiran ✓'); } catch (e) { prompt('Kopiraj link:', siteUrl()); } });
  $('siteEditBtn').addEventListener('click', () => { $('su_url').value = siteUrl(); $('su_pass').value = setting('site_pass'); $('siteUrlModal').classList.add('open'); $('su_url').focus(); });
  $('siteUrlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = [{ key: 'site_url', value: $('su_url').value.trim().replace(/\/$/, ''), updated_at: new Date().toISOString(), updated_by: state.user.display },
                  { key: 'site_pass', value: $('su_pass').value.trim(), updated_at: new Date().toISOString(), updated_by: state.user.display }];
    try { await q(sb.from('h_settings').upsert(rows)); state.settings = await q(sb.from('h_settings').select('*')); $('siteUrlModal').classList.remove('open'); renderAll(); toast('Link sajta sačuvan ✓'); } catch (err) { fail(err); }
  });
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

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeNav(); if ($('notifModal').classList.contains('open')) { state.trayHidden = false; setTimeout(renderTray, 50); } closeCmd(); closeDrawer(); document.querySelectorAll('.modal-wrap').forEach(m => m.classList.remove('open')); $('lightbox').classList.remove('open'); } });
}

async function enterApp(user) {
  state.user = user;
  $('userName').textContent = user.display;
  $('navUser').textContent = user.display; $('navAvatar').textContent = user.display.charAt(0).toUpperCase();
  $('avatar').textContent = user.display.charAt(0).toUpperCase();
  const splash = playSplash(user);
  await loadData();
  renderAll();
  snapshotToday();
  await loadNotifs();
  await splash;
  $('loginPage').style.display = 'none';
  $('app').style.display = 'block';
  renderTray(); startLive();
  setInterval(renderTray, 60000);
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
