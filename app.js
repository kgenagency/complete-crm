/* ================= COMPLETE CRM · HARIZMA modul ================= */
const APP_BUILD = '202610090003';
try { fetch(location.pathname + '?chk=' + Date.now(), { cache: 'no-store' }).then(r => r.text()).then(t => { const m = t.match(/HTML_BUILD="(\d+)"/); if (m && m[1] > APP_BUILD && sessionStorage.getItem('crm_upd') !== m[1]) { sessionStorage.setItem('crm_upd', m[1]); location.replace(location.pathname + '?v=' + m[1]); } }).catch(() => {}); } catch (e) {}
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
// izvor porudžbine (atribucija); organic = ručno uneto ili nepoznat izvor
const OSRC = { organic: 'Organic', meta: 'Meta Ads', tiktok: 'TikTok Ads', google: 'Google Ads' };
const srcOf = (o) => (o && OSRC[o.source]) ? o.source : 'organic';
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
const PURPOSE = { post: 'Samo objava', both: 'Objava + reklama', ad: 'Samo reklama' };
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
  postView: LS.get('crm_pview', 'board'), postFmt: 'all', postPurpose: LS.get('crm_ppurpose', 'all'), siteCat: 'all', who: 'all',
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  writer: null, editPostId: null, editIdeaId: null, ideaArea: 'site', editPackId: null,
  tab: LS.get('crm_tab', 'overview'),
  period: LS.get('crm_period', '30'),
  range: { from: LS.get('crm_rfrom', ''), to: LS.get('crm_rto', '') },
  promos: [], milestones: [], daily: [], customers: [], levents: [], codes: [],
  audit: [], nfGroups: [], nfState: null, chgShow: {}, chgAll: {}, trayHidden: false, nfWho: 'others',
  custView: LS.get('crm_cview', 'list'), custSeg: 'all', custSort: 'spend', custTab: 'profile', editCustId: null, editCodeId: null, promoF: 'all', histF: 'all', histMonth: 'all', histLimit: 150, editPromoId: null, editMsId: null,
  orderView: LS.get('crm_oview', 'table'),
  ch: 'all', src: LS.get('crm_osrc', 'all'), status: 'all', q: '',
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
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 2400); }
function pill(s) { return `<span class="pill st-${s}"><span class="pdot"></span>${ST[s] || s}</span>`; }
function chBadge(c) { return `<span class="ch-badge ch-${c}">${CH[c] || c}</span>`; }
function srcBadge(o) { const s = srcOf(o); return `<span class="ch-badge src-${s}" title="Izvor porudžbine">${OSRC[s]}</span>`; }
/* greške baze na srpskom, da se zna šta da se uradi (original ostaje u konzoli) */
function errText(e) {
  const m = String(e?.message || e || '');
  if (/duplicate key|unique constraint|23505/i.test(m)) return 'Isti unos već postoji (npr. ista veličina i boja dva puta). Proveri redove pa sačuvaj ponovo.';
  if (/not-null|null value in column|23502/i.test(m)) { const c = m.match(/column "?([a-z_]+)"?/i); return 'Nedostaje obavezno polje' + (c ? ': ' + c[1] : '') + '.'; }
  if (/row-level security|42501|permission denied/i.test(m)) return 'Nemaš pravo za ovu izmenu u ovom modulu.';
  if (/JWT|expired|invalid claim|401/i.test(m)) return 'Sesija je istekla. Osveži stranicu i prijavi se ponovo.';
  if (/Failed to fetch|NetworkError|Load failed|network|timeout|fetch/i.test(m)) return 'Nema veze sa serverom. Proveri internet pa pokušaj ponovo.';
  if (/foreign key|23503/i.test(m)) return 'Povezani zapis više ne postoji (verovatno je obrisan). Osveži stranicu.';
  return m || 'Nepoznata greška';
}
function fail(e) { console.error(e); toast('Greška: ' + errText(e), 5000); try { sfx('error'); } catch (x) {} }
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
  try { state.notesDel = await q(sb.from('h_notes').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(300)); } catch (e) { state.notesDel = state.notesDel || []; }
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

async function setOrderStatus(o, ns, fromDrag) {
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
    sfx(ns === 'delivered' ? 'delivered' : ns === 'shipped' ? 'shipped' : fromDrag ? null : 'move');
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
  $('lowList').innerHTML = groupAlerts(low).map(g => `<div class="list-row" data-goto="products"><span><b>${esc(g.p.name)}</b> <span class="low-sizes">· ${g.vs.map(v => esc(szLabel(v)) + ' ' + v.stock).join(', ')}</span></span><span class="num ${g.out ? 'neg' : ''}">${g.out ? g.out + ' rasprodato' : g.vs.reduce((a, v) => a + v.stock, 0) + ' kom'}</span></div>`).join('') || '<div class="kb-empty">Sve veličine imaju zalihu.</div>';

  const sold = {};
  os.forEach(o => itemsOf(o.id).forEach(i => { const k = i.product_id || i.name; sold[k] = sold[k] || { name: i.name, qty: 0, rev: 0 }; sold[k].qty += i.qty; sold[k].rev += i.qty * n(i.unit_price); }));
  $('topList').innerHTML = Object.values(sold).sort((a, b) => b.qty - a.qty).slice(0, 6).map(s => `<div class="list-row"><span><b>${esc(s.name)}</b></span><span class="num">${s.qty} kom · ${rsd(s.rev)}</span></div>`).join('') || '<div class="kb-empty">Još nema prodaje u ovom periodu.</div>';

  const ship = state.orders.filter(o => o.status === 'shipped');
  const cod = ship.filter(o => o.payment === 'cod').reduce((a, o) => a + totals(o).revenue, 0);
  $('shipList').innerHTML = (ship.length ? `<div class="list-row" style="cursor:default"><span>Pouzeće na putu</span><b class="num">${rsd(cod)}</b></div>` : '') +
    (ship.map(o => `<div class="list-row" data-order="${o.id}"><span><b>${esc(o.order_no)}</b> · ${esc(o.customer_name)}</span><span class="page-sub">${esc(o.courier || '')} ${esc(o.tracking_no || '')}</span></div>`).join('') || '<div class="kb-empty">Ništa trenutno nije kod kurira.</div>');
}

/* ---------------- render: orders ---------------- */
function filteredOrders(skipSrc) {
  const qq = state.q.toLowerCase();
  return state.orders.filter(o => {
    if (state.ch !== 'all' && o.channel !== state.ch) return false;
    if (!skipSrc && state.src !== 'all' && srcOf(o) !== state.src) return false;
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
  { const base = filteredOrders(true), cnt = { all: base.length }; base.forEach(o => { const k = srcOf(o); cnt[k] = (cnt[k] || 0) + 1; });
    document.querySelectorAll('#srcSeg button').forEach(b => { b.classList.toggle('active', b.dataset.src === state.src); const k = b.dataset.src; b.innerHTML = `${k === 'all' ? 'Svi izvori' : OSRC[k]}${cnt[k] ? ` <span class="seg-n">${cnt[k]}</span>` : ''}`; }); }
  const rev = list.filter(o => !NO_REVENUE.includes(o.status)).reduce((a, o) => a + totals(o).revenue, 0);
  $('orderCount').textContent = `${list.length} porudžbina${list.length ? ' · ' + rsd(rev) : ''}`;
  const isTable = state.orderView === 'table';
  $('orderTableCard').style.display = isTable ? '' : 'none';
  $('kanban').style.display = isTable ? 'none' : 'flex';
  document.querySelectorAll('#orderViewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === state.orderView));
  if (isTable) {
    $('orderTbody').innerHTML = list.map(o => {
      const t = totals(o);
      return `<tr data-order="${o.id}">
        <td><b>${esc(o.order_no || '—')}</b></td>
        <td><div class="lead-name">${esc(o.customer_name)} ${taskChip(o, 'order')}</div><div class="lead-social">${esc(o.instagram || o.phone || '')}${o.city ? ' · ' + esc(o.city) : ''}</div></td>
        <td class="activity-cell" title="${itemsSummary(o)}">${itemsSummary(o)}</td>
        <td><div class="ch-src">${chBadge(o.channel)}${srcBadge(o)}</div></td>
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
          <div class="kb-meta">${chBadge(o.channel)}${srcOf(o) !== 'organic' ? srcBadge(o) : ''}${taskChip(o, 'order')}<span class="kb-fu">${rsd(totals(o).revenue)}</span></div></div>`).join('') || '<div class="kb-empty">Prazno</div>'}</div></div>`;
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
  if (d.kind === 'order') { const o = order(d.id); if (o && o.status !== z.dataset.status) { sfx('move'); setOrderStatus(o, z.dataset.status, true); } return; }
  sfx('move');
  if (d.kind === 'post') movePost(d.id, z);
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
  const qq = state.q.toLowerCase(), ff = fold(($('prodFind')?.value || '').trim());
  const list = state.products.filter(p => (!qq || [p.name, p.category, p.supplier].join(' ').toLowerCase().includes(qq)) && (!ff || fold([p.name, p.category, p.supplier, ...variantsOf(p.id).map(v => `${v.size} ${v.color || ''}`)].join(' ')).includes(ff)))
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
      <td><div class="prod-cell">${p.image_url ? `<img class="prod-thumb" src="${esc(p.image_url)}" alt="">` : '<div class="prod-thumb"></div>'}<div><div class="lead-name">${esc(p.name)} ${taskChip(p, 'product')}</div><div class="lead-social">${esc(p.category || '')}${p.supplier ? ' · ' + esc(p.supplier) : ''}</div></div></div></td>
      <td><div class="sizes">${vs.map(v => `<span class="size-chip ${v.stock <= lowT() ? 'low' : ''}"><span class="sz">${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''}</span><button data-stock="${v.id}" data-d="-1">−</button><span class="qty">${v.stock}</span><button data-stock="${v.id}" data-d="1">+</button></span>`).join('') || '<span class="page-sub">Dodaj veličine</span>'}</div></td>
      <td class="num">${rsd(p.buy_price)}</td>
      <td class="num">${rsd(p.sell_price)}${p.compare_price ? `<div class="page-sub"><s>${rsd(p.compare_price)}</s></div>` : ''}</td>
      <td class="num">${rsd(m)}<div class="page-sub">${n(p.sell_price) ? pct(m / n(p.sell_price)) : '—'} · ${n(p.buy_price) ? (n(p.sell_price) / n(p.buy_price)).toFixed(1) + 'x' : ''}</div></td>
      <td class="num">${soldQty(p.id)}</td>
      <td><span class="pill ${p.status === 'active' ? 'st-delivered' : p.status === 'draft' ? 'st-confirmed' : 'st-cancelled'}">${{ active: 'Aktivan', draft: 'Priprema', archived: 'Arhiviran' }[p.status]}</span></td></tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">${state.products.length ? 'Nijedan model ne odgovara pretrazi.' : 'Još nema robe. Klikni „Novi komad“.'}</td></tr>`;
  $('prodCount').textContent = (qq || ff) ? `${list.length} od ${state.products.length}` : state.products.length;
}
async function bumpStock(vid, d) {
  const v = variant(vid); if (!v) return;
  const ns = Math.max(0, v.stock + d);
  sfx('tick', 1, d > 0);
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
  $('dBadges').innerHTML = pill(o.status) + chBadge(o.channel) + srcBadge(o) + `<span class="ch-badge ch-other">${PAY[o.payment]}</span>`;
  document.querySelectorAll('#dTabs button').forEach(b => b.classList.toggle('active', b.dataset.dt === state.dTab));
  $('composer').style.display = state.dTab === 'activity' ? '' : 'none';
  if (state.dTab === 'info') {
    const row = (k, v) => v ? `<div class="info-row"><div class="k">${k}</div><div class="v">${v}</div></div>` : '';
    $('dBody').innerHTML = `
      <div class="status-select-row"><label>Status</label><div class="select-wrap"><select id="dStatus">${STATUSES.map(s => `<option value="${s.key}" ${s.key === o.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div></div>
      <div class="sec-title">Kupac</div>
      ${(() => { const c = o.customer_id && state.customers.find(x => x.id === o.customer_id); if (!c) return ''; const s = custStats(c); return `<div class="list-row" data-cust="${c.id}" style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin-bottom:8px"><span><b>${esc(c.name)}</b> · ${s.count} porudžbina · ${rsd(s.spend)}</span>${tierBadge(s.tier)}</div>`; })()}
      <div class="info-grid">
        ${row('Telefon', o.phone ? `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a> · <a href="https://wa.me/${esc(intlNum(o.phone))}" target="_blank" rel="noopener">WhatsApp</a> · <a href="viber://chat?number=%2B${esc(intlNum(o.phone))}">Viber</a>` : '')}
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
const OF = { o_name: 'customer_name', o_phone: 'phone', o_ig: 'instagram', o_email: 'email', o_addr: 'address', o_city: 'city', o_zip: 'postal_code', o_channel: 'channel', o_source: 'source', o_pay: 'payment', o_no: 'order_no', o_shipPrice: 'shipping_price', o_shipCost: 'shipping_cost', o_pack: 'packaging_cost', o_disc: 'discount', o_code: 'discount_code', o_courier: 'courier', o_track: 'tracking_no', o_note: 'note' };
function openOrderModal(id) {
  const o = id ? order(id) : null;
  state.editOrderId = id || null;
  $('omTitle').textContent = o ? `Izmena ${o.order_no}` : 'Nova porudžbina';
  const def = { channel: 'instagram', source: 'organic', payment: 'cod', shipping_price: LS.get('crm_ship_price', 0), shipping_cost: LS.get('crm_ship_cost', 0), packaging_cost: packCostPerOrder() || LS.get('crm_pack', 0), discount: 0 };
  Object.entries(OF).forEach(([el, f]) => { $(el).value = (o ? o[f] : def[f]) ?? ''; });
  setOrderSrc(o ? srcOf(o) : 'organic');
  let dl = $('custDl'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'custDl'; document.body.appendChild(dl); $('o_name').setAttribute('list', 'custDl'); }
  dl.innerHTML = state.customers.map(c => `<option value="${esc(c.name)}">${esc(c.phone || c.instagram || '')}</option>`).join('');
  $('itemRows').innerHTML = '';
  (o ? itemsOf(o.id) : [{}]).forEach(addItemRow);
  orderSum();
  taskSet('ot', o, taskSrcOf('order'));
  $('orderModal').classList.add('open');
  $('o_name').focus();
}
function setOrderSrc(v) {
  v = OSRC[v] ? v : 'organic'; $('o_source').value = v;
  document.querySelectorAll('#o_srcSeg button').forEach(b => b.classList.toggle('active', b.dataset.osrc === v));
  const h = $('o_srcHint'); if (h) h.textContent = v === 'organic' ? 'Ručno uneta ili ne znamo tačno odakle je došla.' : `Kupac je došao preko ${OSRC[v]} reklame.`;
}
async function saveOrder(e) {
  e.preventDefault();
  const its = readItems();
  if (!its.length) return toast('Dodaj bar jedan artikal');
  const f = {};
  Object.entries(OF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  ['shipping_price', 'shipping_cost', 'packaging_cost', 'discount'].forEach(k => f[k] = n(f[k]));
  f.source = OSRC[f.source] ? f.source : 'organic';
  if (f.customer_name === null) return;
  Object.assign(f, taskGet('ot'));
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
    toast(`${o.order_no} sačuvana ✓`); if (!old) { sfx('sale'); checkCelebrate(o); } taskAfterSave('ot', `${o.order_no || ''} · ${o.customer_name || ''}`);
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
  const vs = p ? variantsOf(p.id) : [];
  (p ? (vs.length ? vs : [{ size: '' }]) : [{ size: 'S' }, { size: 'M' }, { size: 'L' }]).forEach(addSizeRow);
  $('pmDelete').style.display = p ? '' : 'none';
  priceHint();
  taskSet('pt', p, taskSrcOf('product'));
  $('prodModal').classList.add('open');
}
/* redovi veličina iz forme: red sa bojom ili komadima a bez veličine = UNI (da se ne izgubi tiho) */
function sizeRowsData() {
  return [...document.querySelectorAll('#sizeRows .item-row')].map(r => {
    const g = (f) => r.querySelector(`[data-f=${f}]`);
    let size = g('size').value.trim().toUpperCase();
    const color = g('color').value.trim() || null, stock = parseInt(g('stock').value) || 0;
    if (!size && (color || stock > 0)) { size = 'UNI'; g('size').value = 'UNI'; }
    return { el: r, id: r.dataset.id || null, size, color, stock };
  }).filter(s => s.size);
}
const vkey = (s) => `${String(s.size).toUpperCase()}|${(s.color || '').trim().toLowerCase()}`;
async function saveProduct(e) {
  e.preventDefault();
  const btn = $('prodForm').querySelector('[type=submit]'); if (btn.disabled) return;
  const f = {};
  Object.entries(PF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  if (!f.name) { $('p_name').focus(); return toast('Upiši naziv komada'); }
  f.name = f.name.toUpperCase();
  f.buy_price = n(f.buy_price); f.sell_price = n(f.sell_price); f.compare_price = f.compare_price === null ? null : n(f.compare_price);
  Object.assign(f, taskGet('pt'));
  const sizes = sizeRowsData();
  // ista veličina + boja dva puta → ne šaljemo ništa dok se ne sredi (baza bi odbila drugi red i ostavila pola sačuvano)
  const seen = {};
  for (const s of sizes) { const k = vkey(s); if (seen[k]) { s.el.querySelector('[data-f=size]').focus(); s.el.style.outline = '2px solid #c62828'; setTimeout(() => { s.el.style.outline = ''; }, 3000); return toast(`Veličina ${s.size}${s.color ? ' ' + s.color : ''} je uneta dva puta. Spoji je u jedan red.`, 5000); } seen[k] = 1; }
  if (!sizes.length && !confirm('Komad nema nijednu veličinu ni komad na stanju. Sačuvati ga ipak?')) return;
  btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = 'Čuvam…';
  const wasNew = !state.editProductId;
  try {
    let p;
    if (state.editProductId) {
      p = await q(sb.from('h_products').update(f).eq('id', state.editProductId).select().single());
      Object.assign(product(p.id) || {}, p);
    } else {
      p = await q(sb.from('h_products').insert(f).select().single());
      state.products.unshift(p);
      // od ovog trenutka forma menja OVAJ komad: ako nešto ispod pukne, ponovni klik na „Sačuvaj“ ne pravi duplikat
      state.editProductId = p.id; $('pmTitle').textContent = p.name; $('pmDelete').style.display = '';
    }
    // sveže stanje veličina iz baze (i obrisane, jer baza ne dozvoljava istu veličinu+boju dva puta ni kad je red u arhivi)
    const live = await q(sb.from('h_variants').select('*').eq('product_id', p.id));
    const byKey = {}; live.forEach(v => { if (!v.deleted_at || !byKey[vkey(v)]) byKey[vkey(v)] = v; });
    sizes.forEach(s => { if (!s.id) { const m = byKey[vkey(s)]; if (m) { s.id = m.id; s.el.dataset.id = m.id; } } });
    const keep = new Set(sizes.map(s => s.id).filter(Boolean));
    const removed = live.filter(v => !v.deleted_at && !keep.has(v.id));
    if (removed.length) await q(sb.from('h_variants').update({ deleted_at: new Date().toISOString(), deleted_by: state.user.display }).in('id', removed.map(v => v.id)));
    const fresh = [];
    for (const s of sizes) {
      const row = { product_id: p.id, size: s.size, color: s.color, stock: s.stock };
      if (s.id) await q(sb.from('h_variants').update({ ...row, deleted_at: null, deleted_by: null }).eq('id', s.id));
      else fresh.push({ s, row });
    }
    if (fresh.length) { const ins = await q(sb.from('h_variants').insert(fresh.map(x => x.row)).select()); ins.forEach(v => { const m = fresh.find(x => vkey(x.row) === vkey(v)); if (m) { m.s.id = v.id; m.s.el.dataset.id = v.id; } }); }
    state.variants = await q(sb.from('h_variants').select('*').is('deleted_at', null));
    await log({ product_id: p.id, type: 'system', body: `${p.name} ${wasNew ? 'dodat' : 'izmenjen'}` });
    $('prodModal').classList.remove('open');
    renderAll(); toast(`${p.name} sačuvan ✓`); taskAfterSave('pt', p.name);
  } catch (err) {
    fail(err);
    // šta god da je stiglo u bazu, prikaži ga odmah da se vidi dokle je stiglo
    try { state.variants = await q(sb.from('h_variants').select('*').is('deleted_at', null)); renderAll(); } catch (e2) {}
  }
  btn.disabled = false; btn.textContent = btn.dataset.t || 'Sačuvaj';
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
const intlNum = (ph) => { let d = String(ph || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '381' + d.slice(1); return d; };
/* više zaduženih: niz korisničkih imena u polju assignees; stari tekst u assignee se i dalje čita */
function assigneesOf(x) {
  if (!x) return [];
  if (Array.isArray(x.assignees) && x.assignees.length) return x.assignees;
  if (!x.assignee) return [];
  return String(x.assignee).split(/\s*,\s*/).filter(Boolean).map(n => Object.keys(PEOPLE).find(k => PEOPLE[k].name === n || k === fold(n)) || n);
}
const assigneeNames = (x) => assigneesOf(x).map(personName).join(', ');
const assigneeBadges = (x) => assigneesOf(x).map(k => `<span class="by ${PEOPLE[k] ? k : 'other'}" style="font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700">${esc(personName(k))}</span>`).join('');
function whoPick(id, sel) {
  const ks = Object.keys(PEOPLE), all = ks.every(k => (sel || []).includes(k));
  $(id).innerHTML = ks.map(k => `<button type="button" class="wp ${(sel || []).includes(k) ? 'on' : ''}" data-who="${k}" aria-pressed="${(sel || []).includes(k)}"><span class="n-av ${k}">${esc(PEOPLE[k].name.charAt(0))}</span>${esc(PEOPLE[k].name)}</button>`).join('') +
    `<button type="button" class="wp wp-all ${all ? 'on' : ''}" data-wall="1" aria-pressed="${all}" title="Zaduži ceo tim odjednom"><span class="n-av wp-allav">@</span>Ceo tim</button>`;
}
const whoPicked = (id) => [...$(id).querySelectorAll('.wp.on[data-who]')].map(b => b.dataset.who);
function wpAllSync(box) { const a = box && box.querySelector('.wp-all'); if (!a) return; const ps = [...box.querySelectorAll('.wp[data-who]')], on = ps.length && ps.every(x => x.classList.contains('on')); a.classList.toggle('on', on); a.setAttribute('aria-pressed', on); }
const assignFields = (arr) => ({ assignees: arr, assignee: arr.length ? arr.map(personName).join(', ') : null });
/* ================= TASKOVI =================
   Svaka stavka (beleška, objava, predlog, materijal, povrat, promocija, porudžbina, kupac, komad, poglavlje priče)
   može da ima zadužene (assignees) i rok (task_due). Kad se završi, ostaje kao istorija (task_done_at / task_done_by).
   Baza sama beleži ko je i kad dodelio (task_at / task_by) i zatvara zadatak kad stavka dođe do kraja (npr. objavljeno). */
const tcut = (s, k) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > k ? s.slice(0, k) + '…' : s; };
const TASK_SRC = [
  { k: 'note', tbl: 'h_notes', label: 'Beleške', ic: '✎', sec: x => areaSec(x.area), list: () => state.notes, title: x => tcut(x.body, 140), sub: x => (x.area && x.area !== 'general' ? 'beleška' : ''), final: x => !!x.done, ref: x => `note:${x.id}` },
  { k: 'post', tbl: 'h_posts', label: 'Objave + reklame', ic: '▶', list: () => state.posts, title: x => x.title, sub: x => `${ST[x.status] || x.status} · ${PURPOSE[ppOf(x)]}`, final: x => x.status === 'published', ref: x => `post:${x.id}` },
  { k: 'site', tbl: 'h_site_ideas', label: 'Sajt', ic: '◎', list: () => state.ideas.filter(i => i.area !== 'packaging'), title: x => x.title, sub: x => (IDEA_ST.find(s => s.key === x.status) || {}).label || '', final: x => ['done', 'rejected'].includes(x.status), ref: x => `idea:${x.id}` },
  { k: 'packidea', tbl: 'h_site_ideas', label: 'Pakovanje', ic: '▣', list: () => state.ideas.filter(i => i.area === 'packaging'), title: x => x.title, sub: x => 'predlog · ' + ((IDEA_ST.find(s => s.key === x.status) || {}).label || ''), final: x => ['done', 'rejected'].includes(x.status), ref: x => `idea:${x.id}` },
  { k: 'pack', tbl: 'h_packaging', label: 'Pakovanje', ic: '▣', list: () => state.pack, title: x => x.name, sub: x => `materijal · na stanju ${x.stock}`, final: () => false, ref: x => `pack:${x.id}` },
  { k: 'ret', tbl: 'h_returns', label: 'Povrati', ic: '↩', list: () => state.rets, title: x => `${x.case_no || ''} · ${x.customer_name || ''}`, sub: x => `${RT[x.type] || ''} · ${ST[x.status] || x.status}`, final: x => retClosed(x), ref: x => `ret:${x.id}` },
  { k: 'promo', tbl: 'h_promotions', label: 'Promocije', ic: '％', list: () => state.promos, title: x => x.name, sub: x => `${fmtDate(x.starts_at)} → ${x.ends_at ? fmtDate(x.ends_at) : 'traje'}`, final: () => false, ref: x => `promo:${x.id}` },
  { k: 'order', tbl: 'h_orders', label: 'Porudžbine', ic: '◫', list: () => state.orders, title: x => `${x.order_no || ''} · ${x.customer_name || ''}`, sub: x => ST[x.status] || x.status, final: x => ['delivered', 'cancelled', 'returned'].includes(x.status), ref: x => `order:${x.id}` },
  { k: 'cust', tbl: 'h_customers', label: 'Kupci', ic: '☺', list: () => state.customers, title: x => x.name, sub: x => x.phone || x.instagram || x.city || '', final: () => false, ref: x => `cust:${x.id}` },
  { k: 'product', tbl: 'h_products', label: 'Garderoba', ic: '▤', list: () => state.products, title: x => x.name, sub: x => x.category || '', final: () => false, ref: x => `product:${x.id}` },
  { k: 'story', tbl: 'h_story_sections', label: 'Brand story', ic: '❦', list: () => state.story, title: x => x.title || 'Poglavlje', sub: () => 'poglavlje priče', final: () => false, ref: () => 'tab:story' },
];
const taskSrcOf = (k) => TASK_SRC.find(s => s.k === k);
const taskIsDone = (x, src) => !!(x && (x.task_done_at || (src && src.final(x))));
function dueInfo(d) {
  if (!d) return null;
  if (String(d).length > 10) return dueInfoAt(d);
  const t = new Date(dayStr(new Date()) + 'T12:00:00'), dd = new Date(String(d).slice(0, 10) + 'T12:00:00'), diff = Math.round((dd - t) / 864e5);
  return { diff, level: diff < 0 ? 'late' : diff === 0 ? 'today' : '', txt: diff < 0 ? `kasni ${-diff} d` : diff === 0 ? 'danas' : diff === 1 ? 'sutra' : dd.toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric', month: 'short' }) };
}
/* rok sa tačnim vremenom: „za 40 min“, „danas 15:00“, „kasni 2 h“ */
const hhmm = (dt) => dt.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
function durTxt(ms) { const m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; if (h < 24) return r && h < 5 ? `${h} h ${r} min` : `${h} h`; return `${Math.round(h / 24)} d`; }
function dueInfoAt(iso) {
  const dt = new Date(iso), now = new Date(), diff = Math.round((new Date(dayStr(dt) + 'T12:00:00') - new Date(dayStr(now) + 'T12:00:00')) / 864e5), ms = dt - now;
  if (ms < 0) return { diff: Math.min(diff, -0.5), level: 'late', txt: `kasni ${durTxt(-ms)}`, at: dt };
  if (ms <= 60 * 60000) return { diff, level: 'near', txt: `za ${durTxt(ms)} (${hhmm(dt)})`, at: dt };
  return { diff, level: diff === 0 ? 'today' : '', txt: diff === 0 ? `danas ${hhmm(dt)}` : diff === 1 ? `sutra ${hhmm(dt)}` : `${dt.toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric', month: 'short' })} ${hhmm(dt)}`, at: dt };
}
const taskDueOf = (x) => (x && (x.task_due_at || x.task_due)) || null;
const TPRIO = { urgent: { l: 'Hitno', ic: '🚩', r: 0 }, high: { l: 'Visok', ic: '▲', r: 1 }, normal: { l: 'Normalan', ic: '●', r: 2 }, low: { l: 'Nizak', ic: '▽', r: 3 } };
const prioOf = (x) => (x && TPRIO[x.task_prio] ? x.task_prio : 'normal');
const prioChip = (x, big) => { const p = prioOf(x); return p === 'normal' ? '' : `<span class="prio-chip ${p} ${big ? 'big' : ''}" title="Prioritet: ${TPRIO[p].l}">${TPRIO[p].ic} ${TPRIO[p].l.toUpperCase()}</span>`; };
function allTasks() {
  const out = [];
  TASK_SRC.forEach(src => src.list().forEach(x => { const as = assigneesOf(x); if (as.length) out.push({ src, x, as, sec: src.sec ? src.sec(x) : src.label, done: taskIsDone(x, src), due: taskDueOf(x), prio: prioOf(x) }); }));
  return out;
}
/* mala oznaka na kartici stavke */
function taskChip(x, k) {
  const as = assigneesOf(x); if (!as.length) return '';
  const src = taskSrcOf(k), done = taskIsDone(x, src), d = !done && dueInfo(taskDueOf(x)), pr = !done && prioOf(x);
  return `<span class="tchip ${done ? 'done' : (d && d.level === 'late') || pr === 'urgent' ? 'late' : ''}" title="Zadatak: ${esc(as.map(personName).join(', '))}${taskDueOf(x) ? ' · rok ' + (d ? d.txt : fmtDate(x.task_due)) : ''}${pr && pr !== 'normal' ? ' · ' + TPRIO[pr].l : ''}">${done ? '✓' : pr === 'urgent' ? '🚩' : '☑'} ${esc(as.map(a => personName(a).charAt(0)).join(''))}${d ? ' · ' + d.txt : ''}</span>`;
}
/* prioritet i tačno vreme u redu „Zadatak“ (dodaje se u sve forme) */
function taskRowEnhance(px) {
  const row = $(px + '_task'); if (!row || row.dataset.enh) return; row.dataset.enh = '1';
  const lab = row.querySelector('.tr-due'), due = $(px + '_due');
  if (lab && due) {
    const tm = document.createElement('input'); tm.type = 'time'; tm.id = px + '_dtime'; tm.className = 'tr-time'; tm.title = 'Tačno vreme roka (nije obavezno)';
    due.after(tm);
    tm.addEventListener('change', () => { if (tm.value && !due.value) due.value = dayStr(new Date()); });
    const pr = document.createElement('div'); pr.className = 'tr-prio'; pr.id = px + '_prio';
    pr.innerHTML = ['urgent', 'high', 'normal', 'low'].map(k => `<button type="button" data-prio="${k}" class="${k}">${TPRIO[k].ic} ${TPRIO[k].l}</button>`).join('');
    pr.addEventListener('click', (e) => { const b = e.target.closest('[data-prio]'); if (b) taskPrioSet(px, b.dataset.prio); });
    lab.after(pr);
    const hint = document.createElement('div'); hint.className = 'tr-alert'; hint.id = px + '_ahint'; pr.after(hint);
    [due, tm].forEach(el => el.addEventListener('input', () => taskPrioHint(px)));
  }
}
function taskPrioSet(px, p) { const el = $(px + '_prio'); if (!el) return; el.dataset.v = p || 'normal'; el.querySelectorAll('[data-prio]').forEach(b => b.classList.toggle('on', b.dataset.prio === el.dataset.v)); taskPrioHint(px); }
const taskPrioGet = (px) => ($(px + '_prio') && $(px + '_prio').dataset.v) || 'normal';
function taskPrioHint(px) {
  const h = $(px + '_ahint'); if (!h) return; const p = taskPrioGet(px), tm = $(px + '_dtime') && $(px + '_dtime').value;
  h.textContent = p === 'urgent' ? (tm ? '🚨 Hitno: svi dobijaju obaveštenje odmah, pa sat i 15 min pre roka, u roku i na 30 min dok se ne završi.' : '🚨 Hitno: svi dobijaju obaveštenje odmah. Dodaj i tačno vreme roka za podsetnike.') : tm ? '⏰ Podsetnik stiže celom timu sat vremena pre roka.' : '';
  h.className = 'tr-alert ' + (p === 'urgent' ? 'urgent' : tm ? 'on' : '');
}
function taskTimeFields(px) {
  const d = $(px + '_due').value || null, tm = $(px + '_dtime') ? $(px + '_dtime').value : '';
  const at = d && tm ? new Date(`${d}T${tm}:00`) : null, p = taskPrioGet(px);
  return { task_due: d, task_due_at: at ? at.toISOString() : null, task_prio: p === 'normal' ? null : p };
}
/* red „Zadatak“ u formama: zaduženi, rok i stanje (gotovo / vrati) */
const TASK_CTX = {};
function taskSet(px, x, src, def) {
  TASK_CTX[px] = { x: x || null, src };
  whoPick(px + '_assignees', x ? assigneesOf(x) : (def || []));
  taskRowEnhance(px);
  const dAt = x && x.task_due_at ? new Date(x.task_due_at) : null;
  $(px + '_due').value = dAt ? dayStr(dAt) : x && x.task_due ? String(x.task_due).slice(0, 10) : '';
  if ($(px + '_dtime')) $(px + '_dtime').value = dAt ? hhmm(dAt) : '';
  taskPrioSet(px, x ? prioOf(x) : 'normal');
  if ($(px + '_tnote')) $(px + '_tnote').value = x && x.task_note || '';
  $(px + '_tstate').dataset.mode = '';
  renderTaskState(px);
}
function renderTaskState(px) {
  const st = $(px + '_tstate'), { x, src } = TASK_CTX[px] || {}, mode = st.dataset.mode || '';
  const done = x && taskIsDone(x, src), fin = x && src && src.final(x);
  if (mode === 'done') st.innerHTML = `<span class="ok">✓ Biće označeno kao gotovo kad sačuvaš.</span><button type="button" data-tmode="" data-px="${px}">Poništi</button>`;
  else if (mode === 'reopen') st.innerHTML = `<span>Zadatak će biti ponovo otvoren kad sačuvaš.</span><button type="button" data-tmode="" data-px="${px}">Poništi</button>`;
  else if (done && assigneesOf(x).length) st.innerHTML = `<span class="ok">✓ Završeno${x.task_done_by ? ' · ' + esc(personName(x.task_done_by)) : ''}${x.task_done_at ? ' · ' + fmtDT(x.task_done_at) : ''}</span>${fin ? '<span>(stavka je završena)</span>' : `<button type="button" data-tmode="reopen" data-px="${px}">Vrati u otvorene</button>`}`;
  else if (x && assigneesOf(x).length) st.innerHTML = `${x.task_by ? `<span>Dodelio/la ${esc(personName(x.task_by))}${x.task_at ? ' · ' + relTime(x.task_at) : ''}</span>` : ''}<button type="button" data-tmode="done" data-px="${px}">✓ Označi kao gotovo</button>`;
  else st.innerHTML = '';
}
function taskGet(px, legacy) {
  const as = whoPicked(px + '_assignees'), mode = $(px + '_tstate').dataset.mode || '';
  const f = { assignees: as, ...taskTimeFields(px) };
  const tn = $(px + '_tnote'); if (tn && tn.offsetParent !== null) f.task_note = tn.value.trim() || null;
  if (legacy) f.assignee = as.length ? as.map(personName).join(', ') : null;
  if (mode === 'done') Object.assign(f, { task_done_at: new Date().toISOString(), task_done_by: who() });
  if (mode === 'reopen') Object.assign(f, { task_done_at: null, task_done_by: null });
  if (TASK_CTX[px]) TASK_CTX[px].last = { before: TASK_CTX[px].x ? assigneesOf(TASK_CTX[px].x) : [], after: as, due: f.task_due, mode, note: f.task_note || '' };
  return f;
}
/* ---------- ZVUCI: sve se pravi u pretraživaču (WebAudio), bez ijednog fajla ----------
   jedan zajednički izlaz (kompresor + prostorni odjek), pa kratki „instrumenti“: zvonce, ton, šum */
let AUD = null, BUS = null, NOISE = null;
function audioCtx() { try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); if (AUD.state === 'suspended') AUD.resume().catch(() => {}); return AUD; } catch (e) { return null; } }
if (LS.get('crm_sfx_v2', '') !== '1') { LS.set('crm_sound', '1'); LS.set('crm_sfx_v2', '1'); } // jednom vrati zvuk (neko ga je možda slučajno ugasio)
const soundOn = () => LS.get('crm_sound', '1') !== '0';
function sfxBus(a) {
  if (BUS && BUS.a === a) return BUS;
  const master = a.createGain(); master.gain.value = 2.2;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
  const lim = a.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
  master.connect(comp); comp.connect(lim); lim.connect(a.destination);
  // odjek kao u velikoj, praznoj sobi (napravljen šumom koji se gasi)
  const len = Math.floor(a.sampleRate * 2.2), ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * Math.min(1, i / 240); }
  const verb = a.createConvolver(); verb.buffer = ir;
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
  const wet = a.createGain(); wet.gain.value = 0.34; verb.connect(tone); tone.connect(wet); wet.connect(master);
  return (BUS = { a, master, verb });
}
function vOut(B, g, o) {
  const ac = B.a; let n = g;
  if ((o.pan || o.pan2) && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.setValueAtTime(o.pan || 0, o.t); if (o.pan2 !== undefined) p.pan.linearRampToValueAtTime(o.pan2, o.t + (o.a || 0) + (o.d || 0)); g.connect(p); n = p; }
  n.connect(B.master);
  if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; n.connect(s); s.connect(B.verb); }
}
function vOsc(B, o) {
  const ac = B.a, t = o.t, att = o.a ?? 0.005, d = o.d ?? 0.5, osc = ac.createOscillator(), g = ac.createGain();
  g.gain.value = 0; osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + att + d * 0.7); if (o.detune) osc.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.peak ?? 0.1, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + d);
  let n = osc; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); n = fl; }
  n.connect(g); vOut(B, g, o); osc.start(t); osc.stop(t + att + d + 0.05);
}
// zvonce: čist ton + dva metalna prizvuka koji se brže gase
function vBell(B, f, t, peak = 0.1, d = 1.1, pan = 0, verb = 0.35) {
  vOsc(B, { f, t, peak, d, pan, verb, a: 0.004 });
  vOsc(B, { f: f * 2.76, t, peak: peak * 0.2, d: d * 0.32, pan, verb, a: 0.003 });
  vOsc(B, { f: f * 5.4, t, peak: peak * 0.07, d: d * 0.12, pan, verb, a: 0.002 });
}
function noiseBuf(ac) {
  if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE;
  const len = ac.sampleRate * 2 | 0; NOISE = ac.createBuffer(1, len, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return NOISE;
}
function vNoise(B, o) {
  const ac = B.a, t = o.t, att = o.a ?? 0.01, d = o.d ?? 0.3, s = ac.createBufferSource(); s.buffer = noiseBuf(ac); s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q ?? 1; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + att + d);
  const g = ac.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.peak ?? 0.06, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + d);
  s.connect(fl); fl.connect(g); vOut(B, g, o); s.start(t, Math.random()); s.stop(t + att + d + 0.05);
}
const C4 = 261.63, E4 = 329.63, G4 = 392.0, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, B6 = 1975.53, C7 = 2093.0, E7 = 2637.02;
/* p = važnost: tiši zvuk ne prekida jači koji je upravo krenuo */
const SFX = {
  // ulazak u CRM: vazduh dok se crta romb, dubok udar kad se pojavi H, svetlucanje dok se HARIZMA razvlači, tih akord uz pozdrav
  intro: { p: 9, play(B, t) {
    vNoise(B, { t, a: 0.55, d: 0.75, peak: 0.045, f: 260, f2: 3400, q: 0.8, verb: 0.55, pan: -0.25, pan2: 0.25 });
    [[65.41, 0.085], [98.0, 0.05]].forEach(([f, pk]) => vOsc(B, { f, t: t + 0.05, a: 0.75, d: 2.3, peak: pk, type: 'triangle', lp: 380, verb: 0.3 }));
    vOsc(B, { f: 130.81, f2: 128, t: t + 0.68, a: 0.006, d: 1.7, peak: 0.15, verb: 0.55 });
    vBell(B, C4, t + 0.7, 0.11, 1.9, 0, 0.6); vBell(B, G4, t + 0.73, 0.07, 1.7, 0.1, 0.6);
    [C5, E5, G5, B5, D6, G6].forEach((f, i) => vBell(B, f, t + 0.92 + i * 0.075, 0.055 - i * 0.004, 1.5, -0.65 + i * 0.26, 0.75));
    [C4, E4, G4, B4, D5].forEach((f, i) => vOsc(B, { f, t: t + 1.22, a: 0.4, d: 1.7, peak: 0.032, pan: -0.3 + i * 0.15, verb: 0.65, detune: i % 2 ? 5 : -5 }));
  } },
  // nova porudžbina: fioka kase, „ka-čing“ i par novčića
  sale: { v: 1.4, p: 6, vibe: [10, 30, 10, 30, 18], play(B, t) {
    vOsc(B, { f: 160, f2: 70, t, a: 0.003, d: 0.15, peak: 0.2 });
    vNoise(B, { t, a: 0.002, d: 0.05, peak: 0.1, type: 'highpass', f: 5200, verb: 0.1 });
    vBell(B, C7, t + 0.05, 0.1, 0.9, -0.2, 0.3); vBell(B, E7, t + 0.13, 0.095, 1.15, 0.2, 0.35);
    [3136, 3951, 4699, 3520].forEach((f, i) => vBell(B, f, t + 0.24 + i * 0.05 + Math.random() * 0.02, 0.022, 0.5, -0.5 + i * 0.33, 0.4));
  } },
  // rekord ili jubilarna porudžbina: kratka fanfara pa šampanjac
  record: { v: 1.7, p: 10, vibe: [20, 50, 20, 50, 60], play(B, t) {
    const brass = (f, tt, d, pk) => { vOsc(B, { f, t: tt, a: 0.03, d, peak: pk, type: 'sawtooth', lp: 2100, verb: 0.35, pan: -0.2 }); vOsc(B, { f: f * 1.004, t: tt, a: 0.03, d, peak: pk * 0.7, type: 'sawtooth', lp: 1700, verb: 0.35, pan: 0.2 }); };
    brass(G4, t, 0.15, 0.045); brass(C5, t + 0.14, 0.15, 0.045); brass(E5, t + 0.28, 0.15, 0.045); brass(G5, t + 0.42, 1.0, 0.055);
    [C4, E4, G4].forEach(f => vOsc(B, { f, t: t + 0.42, a: 0.05, d: 1.1, peak: 0.03, type: 'triangle', verb: 0.45 }));
    for (let i = 0; i < 12; i++) vBell(B, 1800 + Math.random() * 3000, t + 0.5 + i * 0.06 + Math.random() * 0.03, 0.022, 0.6, Math.random() * 1.6 - 0.8, 0.5);
    vNoise(B, { t: t + 0.42, a: 0.01, d: 0.7, peak: 0.028, type: 'highpass', f: 6500, verb: 0.3 });
  } },
  // zadaci
  new: { p: 4, vibe: 14, play(B, t) { vBell(B, E6, t, 0.16, 1.1, -0.15, 0.3); vBell(B, B6, t + 0.075, 0.14, 1.2, 0.15, 0.3); } },
  done: { p: 4, vibe: [12, 40, 12], play(B, t) { [C6, E6, G6].forEach((f, i) => vBell(B, f, t + i * 0.09, 0.14, 1.1, -0.2 + i * 0.2, 0.3)); } },
  soft: { p: 2, play(B, t) { vBell(B, G6, t, 0.08, 1.0, 0, 0.35); } },
  // porudžbina menja fazu
  move: { p: 2, play(B, t) { vOsc(B, { f: 540, f2: 300, t, a: 0.003, d: 0.09, peak: 0.14 }); vOsc(B, { f: 1080, t: t + 0.004, a: 0.002, d: 0.05, peak: 0.025 }); } },
  shipped: { v: 1.6, p: 4, play(B, t) { vNoise(B, { t, a: 0.06, d: 0.32, peak: 0.06, f: 600, f2: 4200, q: 1.3, verb: 0.3, pan: -0.6, pan2: 0.6 }); vBell(B, E6, t + 0.2, 0.05, 0.8, 0.4, 0.4); } },
  delivered: { p: 5, vibe: 12, play(B, t) { [G5, C6, E6, G6, C7].forEach((f, i) => vBell(B, f, t + i * 0.055, 0.065, 1.0, -0.4 + i * 0.2, 0.45)); vOsc(B, { f: C4, t, a: 0.02, d: 0.9, peak: 0.05, verb: 0.4 }); } },
  // beleške i sitnice
  paper: { v: 1.6, p: 1, play(B, t) { vNoise(B, { t, a: 0.03, d: 0.11, peak: 0.055, f: 1800, f2: 5200, q: 1.5, verb: 0.1 }); vNoise(B, { t: t + 0.07, a: 0.004, d: 0.05, peak: 0.025, type: 'highpass', f: 3200 }); } },
  pin: { p: 2, play(B, t) { vOsc(B, { f: 1800, f2: 900, t, a: 0.001, d: 0.03, peak: 0.06, type: 'triangle' }); vOsc(B, { f: 220, f2: 150, t, a: 0.002, d: 0.08, peak: 0.12 }); } },
  check: { p: 2, play(B, t) { vBell(B, 880, t, 0.06, 0.5, 0, 0.3); vBell(B, E6, t + 0.07, 0.06, 0.7, 0, 0.3); } },
  tick: { p: 0, free: true, play(B, t, up) { vOsc(B, { f: up ? 1600 : 1100, t, a: 0.001, d: 0.025, peak: 0.05, type: 'triangle' }); } },
  trash: { v: 1.4, p: 3, play(B, t) { vNoise(B, { t, a: 0.01, d: 0.22, peak: 0.065, type: 'lowpass', f: 3200, f2: 240, q: 0.8, verb: 0.15 }); vOsc(B, { f: 330, f2: 140, t, a: 0.005, d: 0.2, peak: 0.07, type: 'triangle' }); } },
  restore: { p: 3, play(B, t) { vNoise(B, { t, a: 0.08, d: 0.2, peak: 0.05, type: 'lowpass', f: 300, f2: 3600, verb: 0.2 }); vBell(B, B5, t + 0.18, 0.055, 0.7, 0, 0.35); vBell(B, E6, t + 0.25, 0.05, 0.8, 0, 0.35); } },
  alarm: { p: 9, vibe: 0, play(B, t, urgent) {
    if (urgent) { for (let r = 0; r < 2; r++) [0, 0.16, 0.32].forEach((o, i) => { const s0 = t + r * 0.62 + o; vBell(B, 1760, s0, 0.075, 0.22, -0.2, 0.15); vBell(B, 2349.32, s0 + 0.07, 0.07, 0.22, 0.2, 0.15); }); }
    else [0, 0.18, 0.36].forEach((o, i) => vBell(B, [1174.66, 1567.98, 2349.32][i], t + o, 0.07, 0.9, -0.3 + i * 0.3, 0.4));
  } },
  notif: { p: 2, play(B, t) { vBell(B, D6, t, 0.05, 0.6, 0, 0.35); vBell(B, G6, t + 0.09, 0.045, 0.7, 0, 0.35); } },
  error: { p: 3, vibe: [30, 40, 30], play(B, t) { [[233.08, 0], [196, 0.13]].forEach(([f, d]) => vOsc(B, { f, t: t + d, a: 0.006, d: 0.15, peak: 0.08, type: 'square', lp: 650, verb: 0.05 })); } },
  bye: { p: 8, play(B, t) { [G6, E6, C6, G5].forEach((f, i) => vBell(B, f, t + i * 0.09, 0.055, 1.2, 0.3 - i * 0.2, 0.55)); vOsc(B, { f: 130.81, t: t + 0.2, a: 0.2, d: 1.1, peak: 0.05, type: 'triangle', lp: 500, verb: 0.4 }); } },
};
let sfxLast = { t: 0, p: -1 }, SFX_INTRO = null;
function introFade() { const x = SFX_INTRO; if (!x) return; try { [x.out, x.vs].forEach(g => g.gain.setTargetAtTime(0, x.a.currentTime, 0.06)); } catch (e) {} SFX_INTRO = null; }
function sfx(name, vol = 1, arg) {
  const s = SFX[name]; if (!s || !soundOn()) return false;
  const now = performance.now();
  if (!s.free && now - sfxLast.t < 350 && s.p <= sfxLast.p) return false;
  const a = audioCtx(); if (!a) return false;
  if (!s.free) sfxLast = { t: now, p: s.p };
  const go = () => {
    if (a.state !== 'running') return;
    const B = sfxBus(a), out = a.createGain(), vs = a.createGain(), g = vol * (s.v || 1); out.gain.value = g; vs.gain.value = g; out.connect(B.master); vs.connect(B.verb);
    try { s.play({ a, master: out, verb: vs }, a.currentTime + 0.03, arg); } catch (e) {}
    if (name === 'intro') SFX_INTRO = { a, out, vs };
  };
  // bez dodira korisnika pretraživač ne pušta zvuk; ako se ne odglavi odmah, preskačemo (da ne zakasni)
  if (a.state === 'running') go(); else a.resume().then(() => { if (performance.now() - now < 600) go(); }).catch(() => {});
  if (s.vibe && vol >= 0.8) { try { if (navigator.vibrate) navigator.vibrate(s.vibe); } catch (e) {} }
  return true;
}
const ting = (kind) => sfx(kind === 'soft' ? 'soft' : kind === 'done' ? 'done' : 'new');
function setSound(on) { LS.set('crm_sound', on ? '1' : '0'); renderSoundBtns(); if (on) { audioCtx(); setTimeout(() => sfx('done'), 30); } }
function renderSoundBtns() { const on = soundOn(); document.querySelectorAll('[data-soundbtn]').forEach(b => { b.textContent = b.dataset.soundbtn === 'short' ? (on ? '🔔 Zvuk' : '🔕 Zvuk') : on ? '🔔 Zvuci uključeni' : '🔕 Zvuci isključeni'; b.classList.toggle('on', on); }); }
/* proslava: prva / jubilarna porudžbina ili rekordan dan */
function celebrate(title, sub) {
  let el = $('cele');
  if (!el) { el = document.createElement('div'); el.id = 'cele'; el.className = 'cele'; el.setAttribute('role', 'status'); document.body.appendChild(el); el.addEventListener('click', () => el.classList.remove('in')); }
  const mob = innerWidth < 700, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, cols = ['#C9A96E', '#E8E4D9', '#7E8C74', '#d9a3a0', '#f3d98b'];
  const bits = reduce ? '' : Array.from({ length: mob ? 34 : 60 }, () => { const x = Math.random() * 100, dx = (Math.random() - 0.5) * 30, r = (Math.random() - 0.5) * 900, del = Math.random() * 0.35, dur = 1.6 + Math.random() * 1.2, w = 5 + Math.random() * 6;
    return `<i style="left:${x}%;--dx:${dx}vw;--r:${r}deg;--del:${del}s;--dur:${dur}s;width:${w}px;height:${w * (Math.random() < 0.5 ? 0.45 : 1)}px;background:${cols[Math.random() * cols.length | 0]};border-radius:${Math.random() < 0.3 ? '50%' : '2px'}"></i>`; }).join('');
  el.innerHTML = `<div class="cele-bits">${bits}</div><div class="cele-card"><div class="cele-ic">✦</div><div class="cele-t">${esc(title)}</div>${sub ? `<div class="cele-s">${esc(sub)}</div>` : ''}</div>`;
  void el.offsetWidth; el.classList.add('in'); sfx('record');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('in'), 3600);
}
const MILESTONES = [1, 10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];
function checkCelebrate(o) {
  const live = state.orders.filter(x => !NO_REVENUE.includes(x.status)), nOrd = state.orders.length;
  if (MILESTONES.includes(nOrd)) return setTimeout(() => celebrate(nOrd === 1 ? 'Prva porudžbina u CRM\u2011u!' : `${nOrd}. porudžbina!`, nOrd === 1 ? 'Neka ih bude još mnogo.' : 'Bravo, tim HARIZMA.'), 450);
  const byDay = {}; live.forEach(x => { const d = dayStr(new Date(x.created_at)); byDay[d] = (byDay[d] || 0) + totals(x).revenue; });
  const today = dayStr(new Date()), prev = Object.entries(byDay).filter(([d]) => d !== today);
  if (prev.length >= 3 && byDay[today] > Math.max(...prev.map(([, v]) => v)) && !LS.get('crm_rec_' + today + '_' + Math.round(byDay[today]), '')) {
    LS.set('crm_rec_' + today + '_' + Math.round(byDay[today]), '1');
    setTimeout(() => celebrate('Rekordan dan!', `Danas ${rsd(byDay[today])}, više nego ikad.`), 450);
  }
}
/* ---------- iskačuća kartica kad napraviš ili završiš zadatak ---------- */
let tpopT = null;
function tpopHide() { const el = $('tpop'); if (el) el.classList.remove('in'); document.body.classList.remove('tpop-on'); }
function taskPop(kind, info) {
  let el = $('tpop');
  if (!el) { el = document.createElement('div'); el.id = 'tpop'; el.className = 'tpop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  const me = PEOPLE[who()], f = me?.f, done = kind === 'done';
  const head = done ? (f ? 'Bravo, završila si zadatak' : 'Bravo, završio si zadatak') : kind === 'assign' ? (f ? 'Upravo si dodelila zadatak' : 'Upravo si dodelio zadatak') : (f ? 'Upravo si napravila zadatak' : 'Upravo si napravio zadatak');
  const d = !done && dueInfo(info.due);
  const parts = Array.from({ length: 10 }, (_, i) => { const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5, r = 34 + Math.random() * 22; return `<i style="--dx:${Math.cos(ang) * r}px;--dy:${Math.sin(ang) * r}px;--d:${Math.random() * 90}ms"></i>`; }).join('');
  el.className = 'tpop ' + (done ? 'done' : '');
  el.innerHTML = `<div class="tp-ic"><span class="tp-burst">${parts}</span><svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><circle cx="18" cy="18" r="16" class="tp-c"/><path d="M11 18.5l4.6 4.6L25.5 13" class="tp-k"/></svg></div>
    <div class="tp-body"><div class="tp-h">${head}</div><div class="tp-t">${esc(tcut(info.title, 90))}</div>
      <div class="tp-m">${info.sec ? `<span class="tk-sec">${esc(info.sec)}</span>` : ''}${(info.as || []).map((k, i) => `<span class="tp-av n-av ${PEOPLE[k] ? k : 'system'}" style="--i:${i}" title="${esc(personName(k))}">${esc(personName(k).charAt(0))}</span>`).join('')}${(info.as || []).length ? `<span class="tp-who">${esc(info.as.map(personName).join(', '))}</span>` : ''}${d ? `<span class="tk-due ${d.level}">⏱ ${d.txt}</span>` : ''}</div></div>
    <div class="tp-side"><button type="button" class="tp-btn" data-tpsound title="${soundOn() ? 'Isključi zvuk' : 'Uključi zvuk'}">${soundOn() ? '🔔' : '🔕'}</button><button type="button" class="tp-btn" data-tpclose title="Zatvori">✕</button></div>
    <div class="tp-bar"></div>`;
  $('toast').classList.remove('show');
  void el.offsetWidth; el.classList.add('in'); document.body.classList.add('tpop-on');
  ting(done ? 'done' : 'new');
  clearTimeout(tpopT); tpopT = setTimeout(tpopHide, 5200);
}
/* posle čuvanja: da li je ovim čuvanjem nastao, dodeljen ili završen zadatak */
function taskAfterSave(px, title, sec) {
  const c = TASK_CTX[px], L = c && c.last; if (!L) return; c.last = null;
  if (L.mode === 'done') return taskPop('done', { title, sec });
  const added = L.after.filter(k => !L.before.includes(k));
  if (!added.length || L.mode === 'reopen') return;
  taskPop(L.before.length ? 'assign' : 'new', { title: L.note || title, sec: sec || c.src?.label || '', as: L.after, due: L.due });
}

/* opšti prozor za zadatak (beleške, kupci, priča, izmena iz Taskova) */
let tmCtx = null;
function openTaskModal(k, id) {
  const src = taskSrcOf(k), x = src && src.list().find(y => y.id === id); if (!x) return toast('Stavka više ne postoji');
  tmCtx = { src, x };
  $('tmItem').innerHTML = `<small>${src.ic} ${esc(src.label)}</small>${esc(src.title(x))}`;
  taskSet('tm', x, src); $('tm_tnote').style.display = k === 'note' ? 'none' : '';
  $('tmOpen').style.display = k === 'note' ? 'none' : '';
  $('taskModal').classList.add('open');
}
async function saveTaskModal() {
  if (!tmCtx) return;
  const { src, x } = tmCtx, f = taskGet('tm', ['post', 'ret'].includes(src.k));
  if (src.k === 'note' && 'task_done_at' in f) Object.assign(f, f.task_done_at ? { done: true, done_by: who() } : { done: false });
  try {
    const r = await q(sb.from(src.tbl).update(f).eq('id', x.id).select().single());
    Object.assign(x, r); $('taskModal').classList.remove('open'); renderAll(); toast('Zadatak sačuvan ✓'); if (CHAT.open && isTaskCh(CHAT.ch)) { renderChat(); setTimeout(() => taskAuditLoad(CHAT.ch), 900); } taskAfterSave('tm', src.title(x), src.sec ? src.sec(x) : src.label);
  } catch (e) { fail(e); }
}
/* klik na kružić u Taskovima: gotovo / vrati */
async function taskToggle(key) {
  const [k, id] = key.split(':'), src = taskSrcOf(k), x = src && src.list().find(y => y.id === id); if (!x) return;
  const done = taskIsDone(x, src);
  if (done && src.final(x)) return toast('Stavka je završena (npr. objavljeno ili rešeno), zato zadatak ostaje u istoriji.');
  const patch = done ? { task_done_at: null, task_done_by: null } : { task_done_at: new Date().toISOString(), task_done_by: who() };
  if (k === 'note') Object.assign(patch, done ? { done: false } : { done: true, done_by: who() });
  try {
    await q(sb.from(src.tbl).update(patch).eq('id', id)); Object.assign(x, patch);
    renderAll(); if (done) toast('Vraćeno u otvorene'); else taskPop('done', { title: src.title(x), sec: src.sec ? src.sec(x) : src.label });
  } catch (e) { fail(e); }
}
/* stranica Taskovi */
const tkState = { who: 'me', st: 'open', sec: 'all' };
function tkRow(t, i) {
  const { src, x } = t, d = !t.done && dueInfo(t.due), byF = PEOPLE[x.task_by]?.f, doneF = PEOPLE[x.task_done_by]?.f;
  const info = t.done
    ? `<span>✓ ${x.task_done_by ? `${doneF ? 'završila' : 'završio'} ${esc(personName(x.task_done_by))}` : 'završeno'}${x.task_done_at ? ' · ' + fmtDT(x.task_done_at) : ''}</span>`
    : x.task_by ? `<span>${byF ? 'dodelila' : 'dodelio'} ${esc(personName(x.task_by))}${x.task_at ? ' · ' + relTime(x.task_at) : ''}</span>` : '';
  return `<div class="tk-row ${t.done ? 'done' : ''} ${d ? d.level : ''}" data-tkopen="${src.k}:${x.id}" style="animation-delay:${Math.min(i, 20) * 18}ms">
    <button class="tk-check" data-tkdone="${src.k}:${x.id}" title="${t.done ? 'Vrati u otvorene' : 'Gotovo'}">✓</button>
    <div class="tk-main"><div class="tk-t">${t.done ? '' : prioChip(x)}${esc(x.task_note && src.k !== 'note' ? x.task_note : src.title(x))}</div>${src.k !== 'note' ? `<button type="button" class="tk-ref" data-tkitem="${src.k}:${x.id}" title="Otvori stavku">${src.ic} ${esc(src.title(x))} ↗</button>` : ''}
      <div class="tk-s"><span class="tk-sec">${src.ic} ${esc(t.sec)}</span>${src.sub(x) ? `<span>${esc(src.sub(x))}</span>` : ''}${info}</div></div>
    <div class="tk-side">${taskCmChip(src, x)}${d ? `<span class="tk-due ${d.level}">⏱ ${d.txt}</span>` : ''}<span class="tk-avs">${t.as.map(a => `<span class="n-av ${PEOPLE[a] ? a : 'system'}" title="${esc(personName(a) + (a !== who() ? ' · ' + seenText(a) : ''))}">${esc(personName(a).charAt(0))}</span>`).join('')}</span><button class="tk-edit" data-tkedit="${src.k}:${x.id}" title="Zaduženi i rok">👤</button></div>
  </div>`;
}
const TAB_SEC = { notes: 'Ostalo', orders: 'Porudžbine', customers: 'Kupci', products: 'Garderoba', returns: 'Povrati', promos: 'Promocije', posts: 'Objave + reklame', packaging: 'Pakovanje', site: 'Sajt', story: 'Brand story', ads: 'Reklame' };
function renderSecTasks(all) {
  Object.entries(TAB_SEC).forEach(([tab, sec]) => {
    const t = $('v-' + tab)?.querySelector(':scope > .page-head .page-title'); if (!t) return;
    const open = all.filter(x => !x.done && x.sec === sec), late = open.filter(x => dueInfo(x.due)?.level === 'late').length;
    let el = t.querySelector('.sec-tk');
    if (!open.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('button'); el.type = 'button'; el.className = 'sec-tk'; t.appendChild(el); }
    el.dataset.sectk = sec; el.classList.toggle('late', !!late);
    el.textContent = `☑ ${open.length} ${bpl(open.length, 'zadatak', 'zadatka', 'zadataka')}${late ? ' · ' + late + ' kasni' : ''}`;
    el.title = 'Otvori Taskove za ovu sekciju';
  });
}
function renderTasks() {
  const me = who(), all = allTasks();
  renderSecTasks(all);
  const mine = all.filter(t => !t.done && t.as.includes(me)), late = mine.filter(t => dueInfo(t.due)?.level === 'late').length;
  const b = $('taskBadge');
  if (b) { b.style.display = mine.length ? '' : 'none'; b.textContent = mine.length; b.classList.toggle('soft', !late); b.title = `${mine.length} tvojih otvorenih${late ? `, ${late} kasni` : ''}`; }
  if (!$('tkList') || state.tab !== 'tasks') return;
  const others = Object.keys(PEOPLE).filter(k => k !== me);
  $('tkWho').innerHTML = [['me', 'Moji'], ['all', 'Svi'], ...others.map(k => [k, PEOPLE[k].name])].map(([k, l]) => `<button data-tw="${k}" class="${tkState.who === k ? 'active' : ''}">${l}</button>`).join('');
  document.querySelectorAll('#tkState button').forEach(x => x.classList.toggle('active', x.dataset.ts === tkState.st));
  const labels = [...NOTE_AREAS.slice(1).map(a => a[1]), 'Ostalo'];
  if ($('tkSec').options.length !== labels.length + 1) $('tkSec').innerHTML = `<option value="all">Sve sekcije</option>` + labels.map(l => `<option>${esc(l)}</option>`).join('');
  $('tkSec').value = tkState.sec;
  const wk = tkState.who === 'me' ? me : tkState.who, qn = fold($('tkQ').value.trim());
  const base = all.filter(t => (wk === 'all' || t.as.includes(wk)) && (tkState.sec === 'all' || t.sec === tkState.sec)
    && (!qn || fold(`${t.src.title(t.x)} ${t.src.sub(t.x)} ${t.sec} ${t.as.map(personName).join(' ')}`).includes(qn)));
  const open = base.filter(t => !t.done), done = base.filter(t => t.done);
  const wk7 = Date.now() - 7 * 864e5;
  $('kpiTasks').innerHTML = stat(wk === me ? 'Tvoji otvoreni' : wk === 'all' ? 'Otvoreni (svi)' : `Otvoreni: ${personName(wk)}`, open.length) +
    stat('Kasni', `<span class="${open.some(t => dueInfo(t.due)?.level === 'late') ? 'neg' : ''}">${open.filter(t => dueInfo(t.due)?.level === 'late').length}</span>`) +
    stat('Za danas', open.filter(t => dueInfo(t.due)?.level === 'today').length) +
    stat('Završeno za 7 dana', done.filter(t => t.x.task_done_at && new Date(t.x.task_done_at) > wk7).length);
  let html = '', i = 0;
  if (tkState.st === 'open') {
    const grp = (t) => { const d = dueInfo(t.due); if (!d) return t.prio === 'urgent' ? 1 : 4; if (d.level === 'late' || d.diff < 0) return 0; if (d.diff === 0) return 1; if (d.diff <= 7) return 2; return 3; };
    const names = [['Kasni', 'late'], ['Danas', 'today'], ['Narednih 7 dana', ''], ['Kasnije', ''], ['Bez roka', '']];
    const sorted = open.slice().sort((a, b) => grp(a) - grp(b) || TPRIO[a.prio].r - TPRIO[b.prio].r || String(a.due || '').localeCompare(String(b.due || '')) || String(b.x.task_at || '').localeCompare(String(a.x.task_at || '')));
    names.forEach(([n, cls], g) => { const items = sorted.filter(t => grp(t) === g); if (items.length) html += `<div class="tk-group ${cls}">${n} <span>${items.length}</span></div><div class="tk-list">${items.map(t => tkRow(t, i++)).join('')}</div>`; });
    $('tkCount').textContent = `${open.length} ${bpl(open.length, 'otvoren', 'otvorena', 'otvorenih')}`;
    if (!open.length) html = `<div class="tk-empty">${base.length || all.length ? 'Nema otvorenih zadataka za ovaj izbor. 👌' : 'Još niko nije zadužen ni za šta. Zadatak dodaješ u bilo kojoj stavci (polje „Zadatak“) ili dugmetom „Nov zadatak“.'}</div>`;
  } else {
    const sorted = done.slice().sort((a, b) => String(b.x.task_done_at || '').localeCompare(String(a.x.task_done_at || '')));
    let last = null;
    sorted.forEach(t => { const dd = t.x.task_done_at ? dayStr(new Date(t.x.task_done_at)) : 'bez datuma';
      if (dd !== last) { if (last !== null) html += '</div>'; html += `<div class="tk-group">${dd === 'bez datuma' ? 'Završeno (stavka je došla do kraja)' : new Date(dd + 'T12:00:00').toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="tk-list">`; last = dd; }
      html += tkRow(t, i++); });
    if (last !== null) html += '</div>';
    $('tkCount').textContent = `${done.length} ${bpl(done.length, 'završen', 'završena', 'završenih')}`;
    if (!done.length) html = '<div class="tk-empty">Istorija je prazna za ovaj izbor.</div>';
  }
  $('tkList').innerHTML = html;
}

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
/* upozorenja po modelu: jedna kartica po modelu umesto po veličini */
const szLabel = (v) => [String(v.size).toUpperCase() === 'UNI' ? '' : v.size, v.color].filter(Boolean).join(' ') || v.size;
function groupAlerts(al) {
  const m = new Map();
  al.forEach(({ p, v }) => { if (!m.has(p.id)) m.set(p.id, { p, vs: [] }); m.get(p.id).vs.push(v); });
  return [...m.values()].map(g => ({ ...g, out: g.vs.filter(v => v.stock <= 0).length, min: Math.min(...g.vs.map(v => v.stock)) }))
    .sort((a, b) => b.out - a.out || a.min - b.min || a.p.name.localeCompare(b.p.name));
}
function packAlerts() { return state.pack.filter(x => x.stock <= x.min_stock); }
function renderGarderoba() {
  const al = stockAlerts(), groups = groupAlerts(al), outN = al.filter(x => x.v.stock <= 0).length;
  const open = LS.get('crm_alerts_open', '0') === '1';
  $('alertCount').textContent = al.length;
  $('alertSum').textContent = al.length ? `${bpl(al.length, 'veličina', 'veličine', 'veličina')} u ${groups.length} ${bpl(groups.length, 'modelu', 'modela', 'modela')}${outN ? ` · ${outN} rasprodato` : ''}` : '';
  const tg = $('alertToggle'); tg.style.display = groups.length ? '' : 'none'; tg.textContent = open ? 'Sakrij' : `Prikaži${outN ? ' sve' : ''}`;
  if (document.activeElement !== $('lowInput')) $('lowInput').value = lowT();
  const show = open ? groups : groups.filter(g => g.out); // zatvoreno: vide se samo modeli sa rasprodatom veličinom
  $('alerts').style.display = show.length || !al.length ? '' : 'none';
  $('alerts').innerHTML = show.map(g => `<div class="alert ${g.out ? 'out' : ''}" data-product="${g.p.id}">
    <div class="a-ic">${g.out ? '!' : g.min}</div>
    <div style="min-width:0"><div class="a-t">${esc(g.p.name)}</div>
    <div class="a-s">${g.out ? `${g.out} ${bpl(g.out, 'veličina rasprodata', 'veličine rasprodate', 'veličina rasprodato')}` : `${g.vs.length} ${bpl(g.vs.length, 'veličina', 'veličine', 'veličina')} pri kraju`}${g.p.supplier ? ' · ' + esc(g.p.supplier) : ''}</div>
    <div class="a-chips">${g.vs.map(v => `<span class="a-chip ${v.stock <= 0 ? 'out' : ''}">${esc(szLabel(v))}<b>${v.stock}</b></span>`).join('')}</div></div></div>`).join('')
    || (al.length ? '' : '<div class="panel" style="grid-column:1/-1"><span class="page-sub">Nema upozorenja. Sve veličine imaju dovoljno robe.</span></div>');
  // bedž na kartici sekcije: samo rasprodate veličine (ono što traži akciju), ne svaka veličina pri kraju
  const b = $('alertBadge'); b.style.display = outN ? '' : 'none'; b.textContent = outN;
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
    (state.postPurpose === 'all' || (p.purpose || 'post') === state.postPurpose) &&
    (!qq || [p.title, p.concept, p.hook, p.caption, assigneeNames(p), p.inspo].join(' ').toLowerCase().includes(qq)));
}
function postDate(p, short) {
  if (!p.publish_at) return '<span class="p-date">bez datuma</span>';
  const d = new Date(p.publish_at), late = d < new Date() && p.status !== 'published';
  return `<span class="p-date ${late ? 'late' : ''}">📅 ${d.toLocaleDateString('sr-Latn-RS', { weekday: short ? undefined : 'short', day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })}${late ? ' · kasni' : ''}</span>`;
}
/* namena ideje i linkovi za inspiraciju */
const ppOf = (p) => p.purpose || 'post';
const ppBadge = (p) => ppOf(p) === 'post' ? '' : `<span class="pp-badge ${ppOf(p)}" title="${PURPOSE[ppOf(p)]}">${ppOf(p) === 'ad' ? '◆ Reklama' : '◆ Objava + reklama'}</span>`;
const okUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) && /\.[a-z]{2,}$/i.test(x.hostname); } catch (e) { return false; } };
const inspoLinks = (p) => String(p.inspo || '').split(/\s+/).map(x => x.trim()).filter(x => /^https?:\/\//i.test(x) && okUrl(x));
function inspoHost(u) { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /instagram/.test(h) ? 'Instagram' : /tiktok/.test(h) ? 'TikTok' : /youtu/.test(h) ? 'YouTube' : /pinterest|pin\.it/.test(h) ? 'Pinterest' : /facebook|fb\.watch/.test(h) ? 'Facebook' : h; } catch (e) { return 'link'; } }
const inspoA = (p) => { const seen = {}; return inspoLinks(p).map(u => { const h = inspoHost(u); seen[h] = (seen[h] || 0) + 1; return `<a class="inspo" href="${esc(u)}" target="_blank" rel="noopener" title="Inspiracija: ${esc(u)}">✦ ${esc(h)}${seen[h] > 1 ? ' ' + seen[h] : ''}</a>`; }).join(''); };
function postCard(p) {
  const pr = p.product_id ? product(p.product_id) : null;
  const ins = inspoA(p);
  return `<div class="post-card" data-kind="post" data-id="${p.id}" data-post="${p.id}">
    <div class="kb-card-head"><div class="kb-name">${esc(p.title)}</div><span class="fmt ${p.format}">${FMT[p.format] || p.format}</span></div>
    ${ppBadge(p) ? `<div style="margin-top:5px">${ppBadge(p)}</div>` : ''}
    ${p.hook ? `<div class="kb-social">„${esc(p.hook)}“</div>` : ''}
    <div class="kb-meta">${postDate(p)}${assigneeBadges(p)}${p.task_due && !taskIsDone(p, taskSrcOf('post')) ? `<span class="tchip ${dueInfo(p.task_due).level === 'late' ? 'late' : ''}">⏱ ${dueInfo(p.task_due).txt}</span>` : ''}${pr ? `<span class="cat">${esc(pr.name)}</span>` : ''}</div>
    ${(p.drive_link || p.post_url || ins) ? `<div class="p-links">${ins}${p.drive_link ? `<a class="drive" href="${esc(p.drive_link)}" target="_blank" rel="noopener">▲ Drive snimak</a>` : ''}${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" rel="noopener">↗ Objava</a>` : ''}</div>` : ''}
  </div>`;
}
function renderPosts() {
  const list = filteredPosts();
  $('postCount').textContent = `${list.length} ${bpl(list.length, 'ideja', 'ideje', 'ideja')}`;
  document.querySelectorAll('#postViewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === state.postView));
  document.querySelectorAll('#postPurposeSeg button').forEach(b => b.classList.toggle('active', b.dataset.pp === state.postPurpose));
  $('postBoard').style.display = state.postView === 'board' ? 'flex' : 'none';
  $('postCal').style.display = state.postView === 'calendar' ? '' : 'none';
  $('postList').style.display = state.postView === 'list' ? '' : 'none';
  // sledećih 7 dana
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  $('weekStrip').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(t0); d.setDate(d.getDate() + i);
    const ds = dayStr(d), ps = state.posts.filter(p => p.publish_at && dayStr(new Date(p.publish_at)) === ds);
    return `<div class="ws-day ${i === 0 ? 'today' : ''}" data-drop="post" data-date="${ds}"><div class="ws-d">${i === 0 ? 'Danas' : d.toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric' })}</div>
      ${ps.map(p => `<div class="cal-chip pp-${ppOf(p)} ${p.status === 'published' ? 'published' : ''}" data-kind="post" data-id="${p.id}" data-post="${p.id}" style="margin-top:6px" title="${esc(p.title)} · ${PURPOSE[ppOf(p)]}">${ppOf(p) !== 'post' ? '◆ ' : ''}${esc(p.title)}</div>`).join('') || '<div class="ws-empty">Ništa zakazano</div>'}</div>`;
  }).join('');
  if (state.postView === 'board') $('postBoard').innerHTML = boardCols(list, POST_ST, 'post', postCard);
  if (state.postView === 'calendar') renderCalendar(list);
  if (state.postView === 'list') {
    const sorted = list.slice().sort((a, b) => (a.publish_at || '9') < (b.publish_at || '9') ? -1 : 1);
    $('postTbody').innerHTML = sorted.map(p => `<tr data-post="${p.id}"><td>${postDate(p)}</td><td><div class="lead-name">${esc(p.title)} ${ppBadge(p)}</div><div class="lead-social">${esc(p.concept || '')}</div>${inspoLinks(p).length ? `<div class="p-links" style="margin-top:4px">${inspoA(p)}</div>` : ''}</td><td><span class="fmt ${p.format}">${FMT[p.format]}</span></td><td>${pill(p.status)}</td><td><span class="as-list">${assigneeBadges(p) || '—'}</span></td><td>${p.drive_link ? `<a href="${esc(p.drive_link)}" target="_blank" rel="noopener">Drive ↗</a>` : '<span class="page-sub">nema</span>'}</td></tr>`).join('')
      || `<tr><td colspan="6" class="empty">${state.posts.length ? 'Nijedna ideja ne odgovara filteru.' : 'Još nema ideja. Klikni „Nova ideja“.'}</td></tr>`;
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
      ${ps.map(p => `<div class="cal-chip pp-${ppOf(p)} ${p.status === 'published' ? 'published' : ''}" data-kind="post" data-id="${p.id}" data-post="${p.id}" title="${esc(p.title)} · ${PURPOSE[ppOf(p)]}">${ppOf(p) !== 'post' ? '◆ ' : ''}${FMT[p.format]?.[0] || ''} · ${esc(p.title)}</div>`).join('')}
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
const POF = { po_title: 'title', po_purpose: 'purpose', po_inspo: 'inspo', po_concept: 'concept', po_hook: 'hook', po_format: 'format', po_status: 'status', po_product: 'product_id', po_drive: 'drive_link', po_caption: 'caption' };
function setPostPurpose(v) {
  v = PURPOSE[v] ? v : 'post';
  $('po_purpose').value = v;
  document.querySelectorAll('#po_purposeSeg button').forEach(b => b.classList.toggle('active', b.dataset.pp === v));
  $('po_dateLbl').textContent = v === 'ad' ? 'Datum pokretanja reklame' : v === 'both' ? 'Datum objave (i pokretanja reklame)' : 'Datum i vreme objave';
}
function openPostModal(id, dateStr) {
  const p = id ? state.posts.find(x => x.id === id) : null;
  state.editPostId = id || null;
  $('poTitle').textContent = p ? p.title : 'Nova ideja';
  $('po_status').innerHTML = POST_ST.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  $('po_product').innerHTML = '<option value="">—</option>' + state.products.filter(x => x.status !== 'archived').map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  Object.entries(POF).forEach(([el, f]) => { $(el).value = p ? (p[f] ?? '') : ({ format: 'reel', status: 'idea', purpose: state.postPurpose !== 'all' ? state.postPurpose : 'post' }[f] ?? ''); });
  setPostPurpose($('po_purpose').value);
  taskSet('po', p, taskSrcOf('post'));
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
  f.purpose = PURPOSE[f.purpose] ? f.purpose : 'post';
  Object.assign(f, taskGet('po', true));
  // inspiracija: svaki link u svom redu, bez https:// dodajemo ga sami
  f.inspo = f.inspo ? f.inspo.split(/\s+/).map(x => x.trim()).filter(Boolean).map(x => /^https?:\/\//i.test(x) ? x : 'https://' + x.replace(/^\/+/, '')).filter(okUrl).join('\n') || null : null;
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
    $('postModal').classList.remove('open'); renderAll(); toast(`Ideja sačuvana ✓${f.purpose !== 'post' ? ' · ' + PURPOSE[f.purpose] : ''}`); taskAfterSave('po', f.title);
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
    <div class="kb-meta"><span class="cat">${CAT[i.category] || i.category}</span><span class="cat">· ${esc(i.created_by || '')}</span>${taskChip(i, i.area === 'packaging' ? 'packidea' : 'site')}
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
  taskSet('st', i, taskSrcOf(state.ideaArea === 'packaging' ? 'packidea' : 'site'));
  $('siteModal').classList.add('open');
  $('si_title').focus();
}
async function saveIdea(e) {
  e.preventDefault();
  const f = {};
  Object.entries(SIF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  Object.assign(f, taskGet('st'));
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
    $('siteModal').classList.remove('open'); renderAll(); toast('Predlog sačuvan ✓'); taskAfterSave('st', f.title);
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
    <td><div class="lead-name">${esc(x.name)} ${taskChip(x, 'pack')}</div><div class="lead-social">${esc(x.kind)}${x.note ? ' · ' + esc(x.note) : ''}</div></td>
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
  taskSet('kt', x, taskSrcOf('pack'));
  $('packModal').classList.add('open');
}
async function savePack(e) {
  e.preventDefault();
  const f = {};
  Object.entries(PAF).forEach(([el, k]) => { const v = $(el).value.trim(); f[k] = v === '' ? null : v; });
  f.unit_price = f.unit_price === null ? null : n(f.unit_price);
  ['stock', 'min_stock', 'per_order'].forEach(k => f[k] = parseInt(f[k]) || 0);
  Object.assign(f, taskGet('kt'));
  try {
    if (state.editPackId) { const r = await q(sb.from('h_packaging').update(f).eq('id', state.editPackId).select().single()); Object.assign(state.pack.find(p => p.id === r.id), r); }
    else state.pack.push(await q(sb.from('h_packaging').insert(f).select().single()));
    $('packModal').classList.remove('open'); renderAll(); toast('Sačuvano ✓'); taskAfterSave('kt', f.name);
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
    <div class="story-meta">${s.updated_by ? `izmenio/la ${esc(s.updated_by)} · ${fmtDT(s.updated_at)}` : ''} ${taskChip(s, 'story')}<button data-tkedit="story:${s.id}">👤 ${assigneesOf(s).length ? 'Zadatak' : 'Zaduži'}</button><button data-delsec="${s.id}">obriši poglavlje</button></div></div>`).join('')
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
  try { state.notes.push(await q(sb.from('h_notes').insert({ area: 'story', author: state.writer || who(), body }).select().single())); $('noteInput').value = ''; renderNotes(); sfx('paper'); } catch (e) { fail(e); }
}
async function noteAction(id, act) {
  if (act === 'restore') {
    const d = (state.notesDel || []).find(z => z.id === id); if (!d) return;
    try { await q(sb.from('h_notes').update({ deleted_at: null, deleted_by: null }).eq('id', id)); state.notesDel = state.notesDel.filter(z => z.id !== id); Object.assign(d, { deleted_at: null, deleted_by: null }); if (!state.notes.some(z => z.id === id)) state.notes.push(d); sfx('restore'); toast('Beleška vraćena ✓'); renderAll(); } catch (e) { fail(e); }
    return;
  }
  const x = state.notes.find(z => z.id === id); if (!x) return;
  try {
    if (act === 'del') { if (!confirm('Beleška ide u istoriju beleški (može da se vrati). Nastaviti?')) return; await softDelete('h_notes', id); state.notes = state.notes.filter(z => z.id !== id); state.notesDel = [{ ...x, deleted_at: new Date().toISOString(), deleted_by: state.user.display }, ...(state.notesDel || []).filter(z => z.id !== id)]; }
    else { const f = act === 'pin' ? 'pinned' : 'done'; const patch = { [f]: !x[f] }; if (f === 'done') { patch.done_by = !x.done ? who() : null; patch.done_at = !x.done ? new Date().toISOString() : null; } await q(sb.from('h_notes').update(patch).eq('id', id)); Object.assign(x, patch); sfx(f === 'pinned' ? 'pin' : patch.done ? 'check' : 'move'); if (f === 'done' && patch.done) toast('Završeno ✓ beleška je sada u Beleške → Istorija'); }
    renderNotes(); renderHomeNotes(); renderNotesPage(); renderNotesBadge(); if (state.editPromoId && $('promoModal').classList.contains('open')) { renderPromoNotes(state.editPromoId); renderPromos(); }
  } catch (e) { fail(e); }
}

/* ---------- animacije: uvod + brojevi ---------- */
function greet(u) {
  const p = PEOPLE[u.username];
  if (!p) return `Dobrodošli, ${u.display}`;
  return `${p.f ? 'Dobrodošla' : 'Dobrodošao'}, ${p.voc}`;
}
/* pretraživač ne pušta zvuk dok se ekran ne dodirne; kad si već prijavljen (otvoriš ili osvežiš CRM),
   uvod čeka jedan dodir („Dodirni za ulaz“), pa kreće animacija sa zvukom. Sa ugašenim zvukom nema čekanja. */
const audioReady = () => { const a = audioCtx(); return !!a && a.state === 'running'; };
function playSplash(u, gate) {
  return new Promise(res => {
    const sp = $('splash');
    const pp = PEOPLE[u.username];
    $('splashHello').innerHTML = esc(greet(u)) + (pp?.line ? `<span class="hello-sub">${esc(pp.line)}</span>` : '');
    const clone = sp.cloneNode(true); sp.replaceWith(clone); // restart animacija
    clone.querySelectorAll('.sp-gate').forEach(x => x.remove());
    clone.classList.remove('hide', 'gate');
    const run = () => { clone.classList.remove('gate'); sfx('intro'); setTimeout(() => { clone.classList.add('hide'); res(); }, pp?.line ? 3000 : 2300); };
    if (!gate) return run();
    clone.classList.add('gate');
    const g = document.createElement('div'); g.className = 'sp-gate';
    g.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><g class="ring"><path d="M60 6 L114 60 L60 114 L6 60 Z"/><path d="M60 16 L104 60 L60 104 L16 60 Z"/></g><text x="60" y="76" text-anchor="middle">H</text></svg><div class="sp-gate-t">${matchMedia('(hover: none)').matches ? 'Dodirni' : 'Klikni'} za ulaz</div>`;
    clone.appendChild(g);
    const go = () => { window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); audioCtx(); run(); };
    window.addEventListener('pointerdown', go, true); window.addEventListener('keydown', go, true);
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
    <div class="kb-meta">${d ? `<span class="due ${d.level}">⏱ ${dueText(d)}</span>` : r.rating ? `<span class="due">${'★'.repeat(r.rating)}</span>` : ''}${r.photos?.length ? `<span class="cat">📷 ${r.photos.length}</span>` : ''}${assigneeBadges(r)}${r.task_due && !taskIsDone(r, taskSrcOf('ret')) ? `<span class="tchip ${dueInfo(r.task_due).level === 'late' ? 'late' : ''}">⏱ ${dueInfo(r.task_due).txt}</span>` : ''}</div>
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
const RTF = ['type', 'status', 'customer_name', 'phone', 'email', 'instagram', 'order_id', 'product_id', 'item', 'size', 'reason', 'resolution_wanted', 'description', 'exchange_details', 'bank_account', 'delivered_on', 'package_received_at', 'rating', 'refund_amount', 'return_shipping_cost', 'resolution_note', 'improve'];
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
    let v = r ? r[f] : ({ type: 'return', status: 'new' }[f]);
    if (f === 'package_received_at' && v) v = String(v).slice(0, 10);
    if (f === 'product_id' && r && !v && r.item) { const m = state.products.find(p => r.item.toUpperCase().includes(p.name)); if (m) v = m.id; }
    $('rt_' + f).value = v ?? '';
  });
  taskSet('rt', r, taskSrcOf('ret'));
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
  Object.assign(f, taskGet('rt', true));
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
    $('retModal').classList.remove('open'); renderAll(); toast('Prijava sačuvana ✓'); taskAfterSave('rt', `${f.case_no || 'Prijava'} · ${f.customer_name || ''}`);
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
  sfx('trash');
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
    await q(sb.from(t).update({ deleted_at: null, deleted_by: null }).eq('id', id)); sfx('restore');
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
      <div class="promo-top"><div><div class="promo-name">${esc(p.name)} ${taskChip(p, 'promo')}</div><div class="promo-when">${fmtDate(p.starts_at)} → ${p.ends_at ? fmtDate(p.ends_at) : 'traje'} · ${r.days} d · ${PROMO_T[p.type]}${p.channel ? ' · ' + esc(p.channel) : ''}</div></div>
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
  taskSet('mt', p, taskSrcOf('promo'));
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
  Object.assign(f, taskGet('mt'));
  try {
    if (state.editPromoId) { const r = await q(sb.from('h_promotions').update(f).eq('id', state.editPromoId).select().single()); Object.assign(state.promos.find(x => x.id === r.id), r); }
    else { f.created_by = state.user.display; const r = await q(sb.from('h_promotions').insert(f).select().single()); state.promos.push(r); await log({ promo_id: r.id, type: 'system', body: `Promocija „${r.name}“ dodata (${fmtDate(r.starts_at)} → ${r.ends_at ? fmtDate(r.ends_at) : 'traje'})` }); }
    $('promoModal').classList.remove('open'); renderAll(); toast('Promocija sačuvana ✓'); taskAfterSave('mt', f.name);
  } catch (err) { fail(err); }
}
async function deletePromo() {
  if (!confirm('Promocija ide u arhivu (može da se vrati). Nastaviti?')) return;
  try { await softDelete('h_promotions', state.editPromoId); state.promos = state.promos.filter(x => x.id !== state.editPromoId); $('promoModal').classList.remove('open'); renderAll(); } catch (e) { fail(e); }
}
async function addPromoNote() {
  const body = $('prNoteInput').value.trim(); if (!body) return;
  try { state.notes.push(await q(sb.from('h_notes').insert({ area: 'promo:' + state.editPromoId, author: state.writer || who(), body }).select().single())); renderPromoNotes(state.editPromoId); renderPromos(); sfx('paper'); } catch (e) { fail(e); }
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
  { tab: 'tasks', name: 'Taskovi', kw: 'zadaci zadatak task zaduzeni moji obaveze rok uraditi', ic: '☑' },
  { tab: 'notes', name: 'Beleške', kw: 'beleske note zapisi papirici tim', ic: '✎' },
  { tab: 'orders', name: 'Porudžbine', kw: 'narudzbine order kupovine pipeline tabela', ic: '◫' },
  { tab: 'customers', name: 'Kupci', kw: 'klijenti kupac loyalty klub popusti kodovi vip poeni', ic: '☺' },
  { tab: 'products', name: 'Garderoba', kw: 'roba proizvodi zalihe stanje velicine komadi upozorenja', ic: '▤' },
  { tab: 'returns', name: 'Povrati', kw: 'reklamacije zamene zalbe feedback utisci forma', ic: '↩' },
  { tab: 'promos', name: 'Promocije', kw: 'akcije popust kampanje kod lansiranje', ic: '％' },
  { tab: 'posts', name: 'Objave + reklame', kw: 'objave instagram reel content sadrzaj kalendar video drive reklama reklame ad kreativa inspiracija', ic: '▶' },
  { tab: 'packaging', name: 'Pakovanje', kw: 'ambalaza kutije stikeri kartice papir', ic: '▣' },
  { tab: 'site', name: 'Sajt', kw: 'shopify web predlozi link domen', ic: '◎' },
  { tab: 'story', name: 'Brand story', kw: 'prica brend beleske poglavlja', ic: '✎' },
  { tab: 'ads', name: 'Reklame', kw: 'meta ads potrosnja roas facebook', ic: '▲' },
  { tab: 'history', name: 'Istorija', kw: 'vremenska linija dogadjaji arhiva prekretnice obrisano backup', ic: '◷' },
];
const ACTIONS = [
  { name: 'Nova porudžbina', kw: 'dodaj unesi', ic: '+', run: () => openOrderModal() },
  { name: 'Nova beleška', kw: 'zabelezi note zapisi', ic: '✎', run: () => openNoteModal('auto') },
  { name: 'Nov zadatak', kw: 'task zadatak zaduzi dodeli obaveza', ic: '☑', run: () => openNoteModal('auto', true) },
  { name: 'Novi kupac', kw: 'dodaj', ic: '+', run: () => openCustModal() },
  { name: 'Novi komad', kw: 'proizvod roba dodaj', ic: '+', run: () => openProductModal() },
  { name: 'Nova ideja za objavu', kw: 'post reel reklama ad kreativa inspiracija', ic: '+', run: () => openPostModal() },
  { name: 'Nova promocija', kw: 'akcija', ic: '+', run: () => openPromoModal() },
  { name: 'Novi kod za popust', kw: 'kupon', ic: '+', run: () => openCodeModal() },
  { name: 'Nova prijava povrata (ručno)', kw: 'reklamacija', ic: '+', run: () => openRetModal() },
  { name: 'Novi predlog za sajt', kw: 'ideja', ic: '+', run: () => openIdeaModal(null, 'site') },
  { name: 'Novi predlog za pakovanje', kw: 'ambalaza', ic: '+', run: () => openIdeaModal(null, 'packaging') },
  { name: 'Zabeleži događaj u istoriji', kw: 'prekretnica milestone', ic: '+', run: () => openMsModal() },
  { name: 'Kopiraj link forme za povrate', kw: 'link', ic: '⧉', run: async () => { try { await navigator.clipboard.writeText(FORM_URL()); toast('Link kopiran ✓'); } catch (e) { prompt('Kopiraj:', FORM_URL()); } } },
  { name: 'Otvori HARIZMA sajt', kw: 'shop', ic: '↗', run: () => window.open(siteUrl(), '_blank') },
  { name: 'Arhiva obrisanog', kw: 'vrati obrisano', ic: '◷', run: () => { setTab('history'); showArchive(); } },
  { name: 'Odjavi se', kw: 'logout izlaz', ic: '⎋', run: byeOut },
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
    state.posts.forEach(p => push('Objave + reklame', { ic: '▶', title: p.title, sub: `${ST[p.status]} · ${FMT[p.format] || ''}${ppOf(p) !== 'post' ? ' · ' + PURPOSE[ppOf(p)] : ''}${p.publish_at ? ' · ' + fmtDate(p.publish_at) : ''}`, k: 'post', id: p.id }, Math.max(scoreMatch(p.title, qn), scoreMatch(p.hook, qn) / 2)));
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
function closeCmd() { $('cmdWrap').classList.remove('open'); try { $('cmdInput').blur(); } catch (e) {} }
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
      <td><div class="prod-cell"><div class="avatar ${s.tier.key === 'vip' ? 'vip' : ''}" style="width:34px;height:34px;font-size:14px;border-radius:10px">${esc(c.name.charAt(0).toUpperCase())}</div><div><div class="lead-name">${esc(c.name)} ${taskChip(c, 'cust')}</div><div class="lead-social">${esc(c.city || '')}${(c.tags || []).length ? ' · ' + c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('') : ''}</div></div></div></td>
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
    <div class="cust-quick">${c.phone ? `<a class="mini-btn" href="tel:${esc(c.phone)}">📞 Pozovi</a><a class="mini-btn" href="sms:${esc(c.phone)}">✉ SMS</a><a class="mini-btn" href="viber://chat?number=%2B${esc(intlNum(c.phone))}">Viber</a><a class="mini-btn wa" href="https://wa.me/${esc(intlNum(c.phone))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${c.instagram ? `<a class="mini-btn" href="https://instagram.com/${esc(c.instagram.replace('@', ''))}" target="_blank" rel="noopener">IG ↗</a>` : ''}<button class="mini-btn" data-newordercust="${c.id}">+ Porudžbina</button></div>`;
  ($('custHead').querySelector('.cust-quick') || $('custHead')).insertAdjacentHTML('beforeend', `<button type="button" class="mini-btn" data-tkedit="cust:${c.id}">👤 ${assigneesOf(c).length ? esc(assigneesOf(c).map(personName).join(', ')) : 'Zaduži'}</button>`);
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
const NF_FIELD = { task_note: 'zadatak', task_due: 'rok', task_due_at: 'rok (vreme)', task_prio: 'prioritet', assignees: 'zaduženi', purpose: 'namena', inspo: 'inspiracija', status: 'status', courier: 'kurir', tracking_no: 'broj pošiljke', sell_price: 'prodajna', buy_price: 'nabavna', compare_price: '„bila“ cena', stock: 'stanje', publish_at: 'datum objave', drive_link: 'Drive link', assignee: 'zadužen', priority: 'prioritet', title: 'naslov', body: 'tekst', value: 'vrednost', note: 'napomena', refund_amount: 'vraćeno kupcu', return_shipping_cost: 'trošak slanja', resolution_note: 'rešenje', improve: 'šta da popravimo', vip: 'VIP', tags: 'oznake', points_adj: 'poeni', name: 'ime', phone: 'telefon', city: 'grad', address: 'adresa', postal_code: 'poštanski broj', payment: 'plaćanje', shipping_price: 'dostava (kupac)', shipping_cost: 'dostava (kurir)', packaging_cost: 'pakovanje', discount: 'popust', discount_code: 'kod', channel: 'kanal', category: 'kategorija', supplier: 'dobavljač', material: 'materijal', image_url: 'slika', concept: 'skripta', hook: 'hook', caption: 'opis', format: 'format', post_url: 'link objave', views: 'pregledi', likes: 'lajkovi', saves: 'sačuvano', description: 'opis', link: 'link', votes: 'glasovi', code: 'kod', pct: 'popust %', rsd: 'popust RSD', valid_to: 'važi do', valid_from: 'važi od', active: 'aktivan', max_uses: 'maks. upotreba', starts_at: 'početak', ends_at: 'kraj', budget: 'budžet', goal: 'cilj', result_note: 'zaključak', happened_at: 'datum', kind: 'vrsta', min_stock: 'granica', per_order: 'po paketu', unit_price: 'cena', spend: 'potrošeno', purchases: 'kupovine', revenue: 'prihod', reason: 'razlog', package_received_at: 'paket stigao', resolution_wanted: 'kupac želi', restocked: 'vraćeno na stanje', size: 'veličina', color: 'boja', qty: 'količina', email: 'email', instagram: 'instagram', birthday: 'rođendan', source: 'izvor', position: 'redosled', pinned: 'zakačeno', done: 'završeno', delivered_on: 'paket primljen', shipped_at: 'poslato', delivered_at: 'isporučeno', photos: 'fotografije', order_no: 'broj', exchange_details: 'želi umesto toga', item: 'komad', rating: 'ocena', customer_name: 'kupac', type: 'tip', discount_pct: 'popust %', discount_rsd: 'popust RSD', deleted_at: '__del' };
const NF_SKIP = new Set(['assignee', 'done_at', 'done_by', 'task_at', 'task_by', 'task_done_by', 'updated_at', 'updated_by', 'created_at', 'created_by', 'deleted_by', 'phone_norm', 'first_order_at', 'customer_id', 'product_id', 'variant_id', 'order_id', 'code_id', 'consent', 'case_no', 'id', 'bank_account', 'shopify_order_id', 'shopify_product_id', 'shopify_variant_id', 'resolved_at', 'area', 'author']);
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
  h_notes: { cat: r => (r.area || '').startsWith('promo:') ? 'promo' : r.area === 'story' ? 'story' : 'notes', label: 'belešku', name: r => `„${(r.body || '').slice(0, 60)}“`, open: r => (r.area || '').startsWith('promo:') ? `promo:${r.area.split(':')[1]}` : 'tab:story', ins: r => (r.area || '').startsWith('promo:') ? 'nova beleška uz promociju' : 'nova beleška', prio: 5 },
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
const NF_CAT = { notes: 'Beleške', order: 'Porudžbine', customer: 'Kupci', stock: 'Garderoba', ret: 'Povrati', promo: 'Promocije', post: 'Objave + reklame', pack: 'Pakovanje', site: 'Sajt', story: 'Brand story', ads: 'Reklame', code: 'Kodovi i poeni', history: 'Istorija', settings: 'Podešavanja', comment: 'Komentari' };
function nfVerb(actor, what) {
  const f = PEOPLE[actor]?.f, sys = !PEOPLE[actor];
  return { add: sys ? 'dodato' : f ? 'dodala' : 'dodao', edit: sys ? 'izmenjeno' : f ? 'izmenila' : 'izmenio', del: sys ? 'obrisano' : f ? 'obrisala' : 'obrisao', restore: sys ? 'vraćeno' : f ? 'vratila' : 'vratio' }[what];
}
function nfVal(field, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'da' : 'ne';
  if (Array.isArray(v)) return v.map(x => PEOPLE[x]?.name || x).join(', ') || '—';
  if (field === 'status' || field === 'kind' || field === 'type') return ST[v] || RT[v] || PROMO_T[v] || MS_K[v] || FMT[v] || v;
  if (field === 'purpose') return PURPOSE[v] || v;
  if (field === 'task_due') return fmtDate(v);
  if (field === 'task_due_at') return v ? fmtDT(v) : '—';
  if (field === 'task_prio') return TPRIO[v || 'normal'].l;
  if (field === 'resolution_wanted') return RES_W[v] || v;
  if (field === 'payment') return PAY[v] || v;
  if (field === 'channel') return CH[v] || v;
  if (field === 'source' && OSRC[v]) return OSRC[v];
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
  if (PEOPLE[a.actor] && Array.isArray(row.assignees) && row.assignees.length) {
    const meK = who(), fa = PEOPLE[a.actor].f, ch = a.changed || {};
    if (a.actor !== meK && row.assignees.includes(meK) && (a.op === 'INSERT' || (ch.assignees && !(ch.assignees.od || []).includes(meK))))
      return { cat, text: `${fa ? 'dodelila' : 'dodelio'} ti je zadatak: ${row.task_note && a.tbl !== 'h_notes' ? `„${esc(tcut(row.task_note, 90))}“ · ` : ''}${ref || esc(T.label)}${row.task_due ? ` <span class="page-sub">(rok ${fmtDate(row.task_due)})</span>` : ''}`, open: 'tab:tasks', prio: 30, kind: 'add' };
    if (a.op === 'UPDATE' && ch.task_done_at) {
      if (ch.task_done_at.na && !ch.task_done_at.od) return { cat, text: `${fa ? 'završila' : 'završio'} zadatak: ${ref}`, open: 'tab:tasks', prio: T.prio + 3, kind: 'edit' };
      if (!ch.task_done_at.na && ch.task_done_at.od) return { cat, text: `${fa ? 'ponovo otvorila' : 'ponovo otvorio'} zadatak: ${ref}`, open: 'tab:tasks', prio: T.prio + 2, kind: 'edit' };
    }
  }
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
  nfSaveT = setTimeout(async () => { const s = nfState(); try { await q(sb.from('h_notif_state').upsert({ username: who(), cleared_before: s.cleared_before, dismissed: s.dismissed.slice(-1500), snooze_until: s.snooze_until, seen_tabs: seenTabs(), updated_at: new Date().toISOString() })); } catch (e) { console.warn('notif state', e); } }, 400);
}
async function loadNotifs(older) {
  try {
    if (!older) {
      const st = await q(sb.from('h_notif_state').select('*').eq('username', who()).maybeSingle());
      state.nfState = st || { username: who(), cleared_before: null, dismissed: [], snooze_until: null, seen_tabs: {} };
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
  if (action === 'push') { $('bellMenu').classList.remove('open'); return openPushModal(); }
  if (action === 'sound') { setSound(!soundOn()); toast(soundOn() ? 'Zvuci uključeni 🔔' : 'Zvuci isključeni'); return; }
  if (action === 'soundtest') {
    if (!soundOn()) setSound(true); const a = audioCtx(); sfxLast = { t: 0, p: -1 }; setTimeout(() => sfx('intro'), 40);
    setTimeout(() => toast(!a ? 'Ovaj pretraživač ne podržava zvuk.' : a.state !== 'running' ? 'Pretraživač još blokira zvuk. Klikni bilo gde na stranicu pa probaj ponovo.' : 'Svira uvod. Ako ništa ne čuješ, pojačaj zvuk na uređaju i proveri da kartica pretraživača nije utišana.', 5000), 500);
    return;
  }
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
    if (key === 'notes') { state.notesDel = (state.notesDel || []).filter(x => x.id !== row.id); if (row.deleted_at) state.notesDel.unshift(row); }
    if (row.deleted_at) { if (i >= 0) arr.splice(i, 1); }
    else if (i >= 0) Object.assign(arr[i], row);
    else if (['products', 'orders', 'rets', 'ideas', 'ads'].includes(key)) arr.unshift(row); // ove liste su najnovije prvo
    else arr.push(row);
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
    if (!nfSnoozed()) { const dd = describeAudit(row); if (dd && dd.prio === 30) ting('soft'); else if (row.op === 'INSERT' && row.tbl === 'h_orders') sfx('sale', 0.6); else if (row.op === 'INSERT' && row.tbl === 'h_returns') sfx('notif', 0.8); }
    applyAuditRow(row);
    try { mentionCheck(row); } catch (e) {}
    chgLive(row);
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
    // tuđa promena je stigla dok je bio otvoren prozor (zatvoren tasterom Esc ili čuvanjem) → povuci sveže podatke sad
    if (nfPending && !document.querySelector('.modal-wrap.open:not(#notifModal):not(#noteModal)')) { nfPending = false; await loadData(); renderAll(); if (state.openOrderId) renderDrawer(); }
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
  if (!$('homeNotes')) return;                 // beleške imaju svoju sekciju, početna ostaje pregledna
  const list = state.notes.slice().sort((a, b) => (b.pinned - a.pinned) || (a.done - b.done) || b.created_at.localeCompare(a.created_at));
  const where = (x) => x.area === 'story' ? 'Brand story' : (x.area || '').startsWith('promo:') ? ('Promocija: ' + (state.promos.find(p => p.id === x.area.split(':')[1])?.name || '')) : '';
  const show = list.filter(x => !x.done).slice(0, 6);
  $('homeNotes').innerHTML = show.map((x, i) => `<div class="hn ${x.pinned ? 'pinned' : ''} ${x.done ? 'done' : ''}" style="animation-delay:${i * 40}ms">
      <div class="txt">${esc(x.body).replace(/\n/g, '<br>')}</div>
      <div class="meta"><span class="by ${PEOPLE[x.author] ? x.author : 'other'}">${esc(personName(x.author))}</span>${relTime(x.created_at)}${where(x) ? ' · ' + esc(where(x)) : ''}${x.pinned ? ' · 📌' : ''}</div>
      <span class="n-act"><button data-note="${x.id}" data-act="pin" title="Zakači">📌</button><button data-note="${x.id}" data-act="done" title="Završeno">✓</button><button data-note="${x.id}" data-act="del" title="Obriši">✕</button></span></div>`).join('')
    + `<div class="hn add" id="hnAdd">✎ Nova beleška</div><div class="hn all" data-goto="notes">Sve beleške (${list.length}) →</div>`;
}
/* ---------- „Nov zadatak“ prema sekciji ----------
   kad se izabere sekcija, pita „za šta je zadatak“: nova stavka (otvara celu formu te sekcije sa već dodeljenim zadatkom),
   postojeća stavka (porudžbina, kupac, objava…) ili samo zadatak kao beleška u sekciji */
const QL = {
  posts: { srcs: ['post'], nw: 'Nova ideja', pk: 'Postojeća', what: 'objavu ili reklamu', px: 'po', ph: 'Traži objavu ili reklamu…',
    hint: 'Otvoriće se cela forma za objavu: <b>ideja, gde se koristi (objava / reklama), inspiracija, skripta sa hook-om, format i status</b>. Prvi red gore postaje naziv ideje, ostalo ide u skriptu.',
    open: (t, rest) => { openPostModal(); if (t) $('po_title').value = t; if (rest) $('po_concept').value = rest; } },
  ads: { srcs: ['post'], filter: x => ppOf(x) !== 'post', nw: 'Nova reklama', pk: 'Postojeća', what: 'reklamu', px: 'po', ph: 'Traži reklamu…',
    hint: 'Otvoriće se forma za reklamu (namena „Samo reklama“): <b>ideja, inspiracija, skripta sa hook-om, format, datum</b>. Prvi red gore postaje naziv.',
    open: (t, rest) => { openPostModal(); setPostPurpose('ad'); if (t) $('po_title').value = t; if (rest) $('po_concept').value = rest; } },
  site: { srcs: ['site'], nw: 'Nov predlog', pk: 'Postojeći', what: 'predlog za sajt', px: 'st', ph: 'Traži predlog…',
    hint: 'Otvoriće se forma predloga za sajt: <b>naslov, opis, kategorija, prioritet, link i slika</b>. Prvi red gore postaje naslov, ostalo opis.',
    open: (t, rest) => { openIdeaModal(null, 'site'); if (t) $('si_title').value = t; if (rest) $('si_desc').value = rest; } },
  packaging: { srcs: ['pack', 'packidea'], nw: 'Nov predlog', pk: 'Materijal / predlog', what: 'materijal ili predlog', px: 'st', ph: 'Traži materijal (kutija, papir, stiker…) ili predlog…',
    hint: 'Otvoriće se forma predloga za pakovanje: <b>naslov, opis, kategorija, prioritet, link i slika</b>. Za zadatak oko postojećeg materijala izaberi „Materijal / predlog“.',
    open: (t, rest) => { openIdeaModal(null, 'packaging'); if (t) $('si_title').value = t; if (rest) $('si_desc').value = rest; } },
  promos: { srcs: ['promo'], nw: 'Nova promocija', pk: 'Postojeća', what: 'promociju', px: 'mt', ph: 'Traži promociju…',
    hint: 'Otvoriće se forma promocije: <b>naziv, tip, od-do, kod, popust, kanal, budžet i cilj</b>. Prvi red gore postaje naziv, ostalo opis.',
    open: (t, rest) => { openPromoModal(); if (t) $('pr_name').value = t; if (rest) $('pr_description').value = rest; } },
  orders: { srcs: ['order'], first: 'pick', nw: 'Nova porudžbina', pk: 'Postojeća porudžbina', what: 'porudžbinu', px: 'ot', noteOnly: true, ph: 'Traži po broju, kupcu, telefonu…',
    hint: 'Otvoriće se forma za novu porudžbinu, a tekst gore ide kao opis zadatka.', open: () => openOrderModal() },
  customers: { srcs: ['cust'], first: 'pick', pk: 'Kupac', what: 'kupca', ph: 'Traži kupca po imenu, telefonu, Instagramu…' },
  products: { srcs: ['product'], first: 'pick', nw: 'Nov komad', pk: 'Postojeći model', what: 'model', px: 'pt', noteOnly: true, ph: 'Traži model…',
    hint: 'Otvoriće se forma za nov komad (naziv, cene, veličine i boje), a tekst gore ide kao opis zadatka.', open: () => openProductModal() },
  returns: { srcs: ['ret'], first: 'pick', nw: 'Nova prijava', pk: 'Postojeća prijava', what: 'prijavu', px: 'rt', noteOnly: true, ph: 'Traži po broju prijave ili kupcu…',
    hint: 'Otvoriće se forma za novu prijavu (povrat, zamena, reklamacija), a tekst gore ide kao opis zadatka.', open: () => openRetModal() },
  story: { srcs: ['story'], first: 'pick', pk: 'Poglavlje', what: 'poglavlje priče', ph: 'Traži poglavlje…' },
};
const qlState = { area: null, mode: 'note', sel: null, q: '' };
const qlCfg = () => ($('noteModal').dataset.task === '1' ? QL[$('qn_area').value] : null);
function qlItems(cfg) {
  const qn = fold(qlState.q.trim()); let items = [];
  cfg.srcs.forEach(k => { const src = taskSrcOf(k); src.list().filter(x => !cfg.filter || cfg.filter(x)).forEach(x => items.push({ src, x })); });
  if (qn) items = items.filter(({ src, x }) => fold([src.title(x), src.sub(x), x.phone, x.instagram, x.email, x.city, x.code, x.task_note].filter(Boolean).join(' ')).includes(qn));
  items.sort((a, b) => (a.src.final(a.x) - b.src.final(b.x)) || String(b.x.created_at || '').localeCompare(String(a.x.created_at || '')));
  return items;
}
function qlListHtml(cfg) {
  const items = qlItems(cfg), sel = qlState.sel;
  return items.slice(0, 50).map(({ src, x }) => { const key = src.k + ':' + x.id, fin = src.final(x);
    return `<button type="button" class="ql-it ${sel === key ? 'on' : ''} ${fin ? 'fin' : ''}" data-qlsel="${key}"><span class="ql-ic">${src.ic}</span><span class="ql-t"><b>${esc(src.title(x))}</b><small>${esc(src.sub(x) || '')}${fin ? ' · završeno' : ''}${assigneesOf(x).length && !taskIsDone(x, src) ? ' · već ima zadatak: ' + esc(assigneesOf(x).map(personName).join(', ')) : ''}</small></span><span class="ql-ok">✓</span></button>`; }).join('') || `<div class="ql-empty">${qlState.q ? 'Ništa ne odgovara pretrazi.' : 'Još nema stavki u ovoj sekciji.'}</div>`;
}
function renderQl() {
  const box = $('qnLink'), cfg = qlCfg(), area = $('qn_area').value;
  if (!cfg) { box.style.display = 'none'; box.innerHTML = ''; qlState.mode = 'note'; qlSync(); return; }
  if (qlState.area !== area) { qlState.area = area; qlState.sel = null; qlState.q = ''; qlState.mode = cfg.first || (cfg.nw ? 'new' : 'pick'); }
  const modes = [cfg.nw && ['new', '＋ ' + cfg.nw], ['pick', cfg.pk], ['note', 'Samo zadatak']].filter(Boolean);
  let body = '';
  if (qlState.mode === 'new') body = `<div class="ql-hint">${cfg.hint}</div>`;
  else if (qlState.mode === 'note') body = `<div class="ql-hint">Zadatak ostaje kao beleška u sekciji <b>${esc(areaSec(area))}</b>, vidi se u Beleškama i Taskovima.</div>`;
  else body = `<input class="ql-q" id="qlQ" placeholder="${esc(cfg.ph)}" value="${esc(qlState.q)}" autocomplete="off" enterkeyhint="search"><div class="ql-list" id="qlList">${qlListHtml(cfg)}</div>`;
  box.innerHTML = `<div class="ql-head">Za šta je zadatak? <small>${esc(areaSec(area))}</small></div><div class="seg ql-modes">${modes.map(([k, l]) => `<button type="button" data-qm="${k}" class="${qlState.mode === k ? 'active' : ''}">${esc(l)}</button>`).join('')}</div>${body}`;
  box.style.display = '';
  qlSync();
}
function qlSync() {
  const cfg = qlCfg(), m = cfg ? qlState.mode : 'note', btn = $('qnSave');
  btn.firstChild.textContent = m === 'new' ? 'Dalje → ' : 'Sačuvaj ';
  $('qnPinWrap').style.display = m === 'note' ? 'flex' : 'none';
  $('qnWriter').style.display = m === 'note' ? '' : 'none';
  if ($('noteModal').dataset.task === '1') $('qn_body').placeholder = m === 'new' && cfg && !cfg.noteOnly ? 'Naziv (prvi red), ispod opis ako treba…' : m === 'pick' ? `Šta treba da se uradi za ${cfg.what}…` : 'Šta treba da se uradi…';
}
async function qlOpenNew(cfg, body) {
  const as = whoPicked('qt_assignees'), due = $('qt_due').value || '';
  const lines = body.split('\n'), first = lines[0].trim().slice(0, 140), rest = lines.slice(1).join('\n').trim();
  $('noteModal').classList.remove('open');
  await cfg.open(cfg.noteOnly ? '' : first, cfg.noteOnly ? '' : rest);
  const tm = $('qt_dtime') ? $('qt_dtime').value : '', pr = taskPrioGet('qt');
  whoPick(cfg.px + '_assignees', as); $(cfg.px + '_due').value = due; taskRowEnhance(cfg.px); if ($(cfg.px + '_dtime')) $(cfg.px + '_dtime').value = tm; taskPrioSet(cfg.px, pr);
  if (cfg.noteOnly && body && $(cfg.px + '_tnote')) $(cfg.px + '_tnote').value = body;
  toast(as.length ? 'Popuni ostalo i sačuvaj. Zadatak je već dodeljen.' : 'Popuni ostalo i sačuvaj.', 3500);
}
async function qlSavePick(body) {
  if (!qlState.sel) return toast('Izaberi stavku iz liste');
  const [k, id] = qlState.sel.split(':'), src = taskSrcOf(k), x = src && src.list().find(y => y.id === id); if (!x) return toast('Stavka više ne postoji');
  const as = whoPicked('qt_assignees'); if (!as.length) return toast('Izaberi ko treba da uradi zadatak');
  const before = taskIsDone(x, src) ? [] : assigneesOf(x);
  const patch = { assignees: as, ...taskTimeFields('qt'), task_note: body || null, task_done_at: null, task_done_by: null };
  if (['h_posts', 'h_returns'].includes(src.tbl)) patch.assignee = as.map(personName).join(', ');
  $('qnSave').disabled = true;
  try {
    const r = await q(sb.from(src.tbl).update(patch).eq('id', id).select().single()); Object.assign(x, r || patch);
    $('noteModal').classList.remove('open'); renderAll();
    taskPop(before.length ? 'assign' : 'new', { title: body || src.title(x), sec: src.sec ? src.sec(x) : src.label, as, due: patch.task_due });
  } catch (e) { fail(e); }
  $('qnSave').disabled = false;
}
function openNoteModal(area, asTask) {
  $('qn_body').value = ''; $('qn_pin').checked = false;
  if (!area || area === 'auto') area = state.tab === 'tasks' && tkState.sec !== 'all' ? ((NOTE_AREAS.find(x => x[1] === tkState.sec) || [])[0] || 'general') : (TAB_AREA[state.tab] || 'general');
  $('qn_area').value = area;
  $('noteModal').querySelector('h3').textContent = asTask ? 'Nov zadatak' : 'Zabeleži';
  $('noteModal').dataset.task = asTask ? '1' : ''; qlState.area = null;
  $('qn_body').placeholder = asTask ? 'Šta treba da se uradi…' : 'Šta treba da se zapamti…';
  taskSet('qt', null, taskSrcOf('note')); $('qt_task').style.display = area === 'milestone' ? 'none' : '';
  const w = state.writer || who();
  document.querySelectorAll('#qnWriter button').forEach(b => b.classList.toggle('active', b.dataset.qw === w));
  renderQl();
  $('noteModal').classList.add('open'); setTimeout(() => $('qn_body').focus(), 40);
}
async function saveQuickNote() {
  const body = $('qn_body').value.trim(), cfg = qlCfg();
  if (cfg && qlState.mode === 'new') return qlOpenNew(cfg, body);
  if (cfg && qlState.mode === 'pick') return qlSavePick(body);
  if (!body) return toast('Napiši nešto prvo');
  const area = $('qn_area').value, author = state.writer || who();
  try {
    if (area === 'milestone') {
      const r = await q(sb.from('h_milestones').insert({ title: body.split('\n')[0].slice(0, 140), body: body.includes('\n') ? body.slice(body.indexOf('\n') + 1) : null, kind: 'event', author: personName(author) }).select().single());
      state.milestones.push(r);
    } else {
      const tf = taskGet('qt');
      const r = await q(sb.from('h_notes').insert({ area, author, body, pinned: $('qn_pin').checked, ...tf }).select().single());
      state.notes.push(r);
    }
    $('noteModal').classList.remove('open'); renderAll(); toast(whoPicked('qt_assignees').length && area !== 'milestone' ? 'Zadatak dodat ✓ vidi se u Taskovima' : 'Zabeleženo ✓'); if (area !== 'milestone') taskAfterSave('qt', body, areaSec(area)); sfx('paper');
  } catch (e) { fail(e); }
}

/* ---------- MOBILNI MENI (tri crtice) ---------- */
function openNav() { renderNav(); document.body.classList.add('nav-open'); $('navQ').value = ''; }
function closeNav() { document.body.classList.remove('nav-open'); $('navQ').blur(); }
function navBadge(tab) {
  const cn = tab === state.tab || !state.nfState ? 0 : chgUnread(tab);
  const chg = cn ? `<span class="chg-badge" title="nove promene">${cn > 99 ? '99+' : cn}</span>` : '';
  const id = { products: 'alertBadge', returns: 'retBadge', promos: 'promoBadge', packaging: 'packBadge', notes: 'notesBadge', tasks: 'taskBadge' }[tab];
  const el = id && $(id); const al = el && el.style.display !== 'none' && el.textContent ? `<span class="tab-badge ${el.classList.contains('live') ? 'live' : ''}">${esc(el.textContent)}</span>` : '';
  return chg || al ? `<span class="nd-badges">${chg}${al}</span>` : '';
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
const NOTE_AREAS = [['general', 'Ostalo'], ['orders', 'Porudžbine'], ['customers', 'Kupci'], ['products', 'Garderoba'], ['returns', 'Povrati'], ['promos', 'Promocije'], ['posts', 'Objave + reklame'], ['packaging', 'Pakovanje'], ['site', 'Sajt'], ['story', 'Brand story'], ['ads', 'Reklame']];
const areaSec = (a) => (a || '').startsWith('promo:') ? 'Promocije' : (NOTE_AREAS.find(x => x[0] === (a || 'general')) || [])[1] || 'Ostalo';
const TAB_AREA = { orders: 'orders', customers: 'customers', products: 'products', returns: 'returns', promos: 'promos', posts: 'posts', packaging: 'packaging', site: 'site', story: 'story', ads: 'ads' };
function fillAreaSelects() {
  const opts = NOTE_AREAS.map(([v, l]) => `<option value="${v}">${v === 'general' ? 'Ostalo (bez sekcije)' : l}</option>`).join('');
  $('qn_area').innerHTML = `<optgroup label="Beleška ili zadatak za sekciju">${opts}</optgroup><optgroup label="Istorija"><option value="milestone">Događaj sa datumom u Istoriji (nije zadatak)</option></optgroup>`;
  $('np_area').innerHTML = opts;
  $('npArea').innerHTML = `<option value="all">Sve sekcije</option>` + NOTE_AREAS.map(([v, l]) => `<option value="${v === 'promos' ? 'promo' : v}">${l}</option>`).join('');
}
const notePlace = (x) => (x.area || '').startsWith('promo:') ? ('Promocija: ' + (state.promos.find(p => p.id === x.area.split(':')[1])?.name || '')) : x.area && x.area !== 'general' ? areaSec(x.area) : 'Ostalo';
const seenKey = () => 'crm_notes_seen_' + who();
function notesUnread() { const seen = LS.get(seenKey(), ''); return state.notes.filter(x => x.author !== who() && !x.done && (!seen || x.created_at > seen)).length; }
function renderNotesBadge() { const b = $('notesBadge'); if (b) b.style.display = 'none'; return; const n = notesUnread(); b.style.display = n && state.tab !== 'notes' ? '' : 'none'; b.textContent = n; }
const personKey = (n) => { if (!n) return ''; if (PEOPLE[n]) return n; return Object.keys(PEOPLE).find(k => PEOPLE[k].name === n || k === fold(n)) || n; };
const histAt = (x) => x.deleted_at || x.done_at || x.updated_at || x.created_at;
function npHistTag(x) {
  const g = (k, m, f) => PEOPLE[k] && PEOPLE[k].f ? f : m;
  if (x.deleted_at) { const k = personKey(x.deleted_by); return `<div class="np-hist del">🗑 ${k ? `${g(k, 'obrisao', 'obrisala')} ${esc(personName(k))}` : 'obrisano'} · <span title="${fmtDT(x.deleted_at)}">${relTime(x.deleted_at)}</span></div>`; }
  if (x.done) { const k = x.done_by || ''; const at = x.done_at || x.updated_at; return `<div class="np-hist ok">✓ ${k ? `${g(k, 'završio', 'završila')} ${esc(personName(k))}` : 'završeno'}${at ? ` · <span title="${fmtDT(at)}">${relTime(at)}</span>` : ''}</div>`; }
  return '';
}
function npCard(x, i) {
  const editing = npState.editId === x.id;
  const p = PEOPLE[x.author];
  if (x.deleted_at) return `<div class="np-note deleted" style="animation-delay:${Math.min(i, 20) * 25}ms" data-npid="${x.id}">${npHistTag(x)}
    <div class="txt">${esc(x.body)}</div>
    <div class="np-meta"><span class="n-av ${p ? x.author : 'system'}">${esc((p ? p.name : x.author).charAt(0))}</span><b>${esc(personName(x.author))}</b>
      <span title="${fmtDT(x.created_at)}">napisano ${relTime(x.created_at)}</span><span class="place">${esc(notePlace(x))}</span></div>
    <div class="np-acts"><button data-note="${x.id}" data-act="restore" class="on">↩ Vrati u beleške</button></div></div>`;
  return `<div class="np-note ${x.pinned ? 'pinned' : ''} ${x.done ? 'done' : ''}" style="animation-delay:${Math.min(i, 20) * 25}ms" data-npid="${x.id}">${npState.status !== 'open' ? npHistTag(x) : ''}
    ${editing ? `<textarea id="npEdit">${esc(x.body)}</textarea>` : `<div class="txt">${esc(x.body)}</div>`}
    <div class="np-meta"><span class="n-av ${p ? x.author : 'system'}">${esc((p ? p.name : x.author).charAt(0))}</span><b>${esc(personName(x.author))}</b>
      <span title="${fmtDT(x.created_at)}">${relTime(x.created_at)}</span><span class="place">${esc(notePlace(x))}</span>
      ${x.updated_at ? `<span>· izmenio/la ${esc(personName(x.updated_by || ''))} ${relTime(x.updated_at)}</span>` : ''}
      ${x.done ? `<span>· završeno${x.done_by ? ' (' + esc(personName(x.done_by)) + ')' : ''}</span>` : ''}${taskChip(x, 'note')}</div>
    <div class="np-acts">${editing ? `<button data-npsave="${x.id}" class="on">Sačuvaj</button><button data-npcancel="1">Otkaži</button>` :
      `<button data-tkedit="note:${x.id}" class="${assigneesOf(x).length ? 'on' : ''}">👤 ${assigneesOf(x).length ? esc(assigneesOf(x).map(personName).join(', ')) : 'Zaduži'}</button><button data-note="${x.id}" data-act="pin" class="${x.pinned ? 'on' : ''}">📌 ${x.pinned ? 'Otkači' : 'Zakači'}</button><button data-note="${x.id}" data-act="done" class="${x.done ? 'on' : ''}">✓ ${x.done ? 'Vrati' : 'Završeno'}</button><button data-npedit="${x.id}">✎ Izmeni</button><button data-note="${x.id}" data-act="del">✕</button>`}</div>
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
  const hist = npState.status === 'history';
  const src = hist ? [...all.filter(x => x.done), ...(state.notesDel || [])] : all;
  let list = src.filter(x => (npState.who === 'all' || x.author === npState.who)
    && (npState.status === 'all' || hist || !x.done)
    && (npState.area === 'all' || (npState.area === 'promo' ? ((x.area || '').startsWith('promo:') || x.area === 'promos') : (x.area || 'general') === npState.area))
    && (!qn || fold(x.body + ' ' + personName(x.author) + ' ' + notePlace(x)).includes(qn)));
  const tKey = hist ? histAt : (x) => x.created_at;
  list.sort((a, b) => npState.sort === 'old' ? tKey(a).localeCompare(tKey(b)) : tKey(b).localeCompare(tKey(a)));
  const nHist = all.filter(x => x.done).length + (state.notesDel || []).length;
  const hb = document.querySelector('#npStatus [data-s="history"]'); if (hb) hb.innerHTML = `Istorija${nHist ? ` <span class="seg-n">${nHist}</span>` : ''}`;
  $('npCount').textContent = hist ? `${list.length} u istoriji` : `${list.length} beleški`;
  const pinned = hist ? [] : list.filter(x => x.pinned && !x.done), rest = hist ? list : list.filter(x => !(x.pinned && !x.done));
  let html = '', i = 0;
  if (pinned.length) html += `<div class="np-day">Zakačeno <span>${pinned.length}</span></div><div class="np-grid">${pinned.map(x => npCard(x, i++)).join('')}</div>`;
  const groups = []; let cur = null;
  rest.forEach(x => { const d = dayStr(new Date(tKey(x))); if (!cur || cur.d !== d) { cur = { d, items: [] }; groups.push(cur); } cur.items.push(x); });
  groups.forEach(g => { const dt = new Date(g.d + 'T12:00:00'), today = dayStr(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
    const lbl = g.d === today ? 'Danas' : g.d === dayStr(y) ? 'Juče' : dt.toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    html += `<div class="np-day">${lbl} <span>${g.items.length}</span></div><div class="np-grid">${g.items.map(x => npCard(x, i++)).join('')}</div>`; });
  const prevEdit = document.activeElement && document.activeElement.id === 'npEdit' ? document.activeElement.value : null;
  if (prevEdit !== null) return; // ne prekidaj izmenu dok neko kuca
  $('npList').innerHTML = (hist && list.length ? `<div class="np-hist-info">Ovde se talože završene i obrisane beleške, poređane po danu kad su skinute. Svaka može da se vrati.</div>` : '') + (html || `<div class="panel"><div class="page-sub">${hist ? 'Istorija je prazna. Kad neko označi belešku sa ✓ Završeno ili je obriše, pojaviće se ovde.' : all.length ? 'Nema beleški za ovaj filter.' : 'Još nema beleški. Upiši prvu gore.'}</div></div>`);
  if (npState.editId) { const t = $('npEdit'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
}
async function npSaveNew() {
  const body = $('np_body').value.trim(); if (!body) return toast('Napiši nešto prvo');
  try {
    const tf = taskGet('nt');
    const r = await q(sb.from('h_notes').insert({ area: $('np_area').value, author: state.writer || who(), body, pinned: $('np_pin').checked, ...tf }).select().single());
    state.notes.push(r); $('np_body').value = ''; $('np_pin').checked = false; taskAfterSave('nt', body, areaSec($('np_area').value)); sfx('paper'); taskSet('nt', null, taskSrcOf('note')); renderAll(); toast(tf.assignees.length ? 'Beleška sačuvana ✓ i dodata u Taskove' : 'Beleška sačuvana ✓');
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

/* ---------- PROMENE PO SEKCIJI: brojač + panel „Šta je novo“ ---------- */
const CHG_TABS = ['notes', 'orders', 'customers', 'products', 'returns', 'promos', 'posts', 'packaging', 'site', 'story', 'ads', 'history'];
const CHG_TAB_CAT = { notes: 'story', orders: 'order', customers: 'customer', products: 'stock', returns: 'ret', promos: 'promo', posts: 'post', packaging: 'pack', site: 'site', story: 'story', ads: 'ads', history: 'history' };
function auditTabs(a) {
  const r = a.new_row || a.old_row || {};
  switch (a.tbl) {
    case 'h_orders': case 'h_order_items': return ['orders'];
    case 'h_customers': case 'h_loyalty_events': case 'h_discount_codes': return ['customers'];
    case 'h_products': case 'h_variants': return ['products'];
    case 'h_returns': return ['returns'];
    case 'h_promotions': return ['promos'];
    case 'h_posts': return ['posts'];
    case 'h_packaging': return ['packaging'];
    case 'h_site_ideas': return [r.area === 'packaging' ? 'packaging' : 'site'];
    case 'h_story_sections': return ['story'];
    case 'h_notes': return (r.area || '') === 'story' ? ['notes', 'story'] : (r.area || '').startsWith('promo:') ? ['notes', 'promos'] : ['notes'];
    case 'h_ad_spend': return ['ads'];
    case 'h_milestones': return ['history'];
    case 'h_settings': return [r.key === 'loyalty' ? 'customers' : 'site'];
    case 'h_activities': return [r.order_id ? 'orders' : r.post_id ? 'posts' : r.return_id ? 'returns' : r.customer_id ? 'customers' : r.site_id ? 'site' : r.promo_id ? 'promos' : r.packaging_id ? 'packaging' : r.product_id ? 'products' : null].filter(Boolean);
  }
  return [];
}
const chgCounts = (a) => a.actor !== who() && (PEOPLE[a.actor] || (['h_orders', 'h_returns'].includes(a.tbl) && a.op === 'INSERT'));
function seenTabs() { const s = nfState(); if (!s.seen_tabs || typeof s.seen_tabs !== 'object') s.seen_tabs = {}; return s.seen_tabs; }
function chgInit() {
  const st = seenTabs();
  if (!st._init) { const max = state.audit.length ? Math.max(...state.audit.map(a => a.id)) : 0; CHG_TABS.forEach(t => { st[t] = max; }); st._init = 1; nfPersist(); }
}
function chgRows(tab, sinceId) {
  const rows = state.audit.filter(a => a.id > sinceId && chgCounts(a) && auditTabs(a).includes(tab)).map(a => ({ a, d: describeAudit(a) })).filter(x => x.d).sort((x, y) => y.a.id - x.a.id);
  // spoji više novih veličina istog komada u jedan red
  const out = [], vmap = {};
  rows.forEach(x => {
    if (x.a.tbl === 'h_variants' && x.a.op === 'INSERT') {
      const r = x.a.new_row, k = x.a.actor + '|' + r.product_id;
      if (vmap[k]) { vmap[k].sizes.push(r.size); return; }
      const m = { a: x.a, d: { ...x.d }, sizes: [r.size], pid: r.product_id }; vmap[k] = m; out.push(m); return;
    }
    out.push(x);
  });
  out.forEach(x => { if (x.sizes) { const f = PEOPLE[x.a.actor]?.f; x.d.text = `${f ? 'dodala' : 'dodao'} ${x.sizes.length > 1 ? 'veličine' : 'veličinu'} za <span class="ref">${esc(prodName(x.pid))}</span>: ${esc(x.sizes.reverse().join(', '))}`; } });
  return out;
}
function chgUnread(tab) { return chgRows(tab, seenTabs()[tab] || 0).length; }
function markTabSeen(tab) {
  const st = seenTabs(), max = state.audit.length ? Math.max(...state.audit.map(a => a.id)) : 0;
  if ((st[tab] || 0) < max) { st[tab] = max; nfPersist(); }
}
function renderChgBadges() {
  if (!state.nfState) return;
  const tot = CHG_TABS.filter(t => t !== state.tab).reduce((a, t) => a + chgUnread(t), 0);
  const nb = $('navBtn'); if (nb) { nb.dataset.n = tot > 99 ? '99+' : tot; nb.classList.toggle('has-chg', tot > 0); }
  CHG_TABS.forEach(t => {
    const btn = document.querySelector(`#tabs [data-tab="${t}"]`); if (!btn) return;
    let el = btn.querySelector('.chg-badge');
    const n = t === state.tab ? 0 : chgUnread(t);
    if (!el) { el = document.createElement('span'); el.className = 'chg-badge'; btn.appendChild(el); }
    el.textContent = n > 99 ? '99+' : n; el.style.display = n ? '' : 'none'; el.title = n ? `${n} novih promena od drugih` : '';
  });
}
function chgPanelHtml(tab) {
  const rows = state.chgShow[tab]; if (!rows || !rows.length) return '';
  const add = rows.filter(x => x.d.kind === 'add').length, del = rows.filter(x => x.d.kind === 'del').length, res = rows.filter(x => x.d.kind === 'restore').length, ed = rows.length - add - del - res;
  const people = [...new Set(rows.map(x => x.a.actor))].map(k => PEOPLE[k] ? PEOPLE[k].name : 'Forma/sistem');
  const lim = state.chgAll[tab] ? rows.length : 6;
  return `<div class="chg-panel" data-chgtab="${tab}">
    <button class="n-x" data-chgclose="${tab}" title="Skloni">✕</button>
    <div class="chg-top"><div class="chg-title">Šta je novo ovde</div><div class="chg-sub">od tvog poslednjeg ulaska · ${esc(people.join(', '))}</div></div>
    <div class="chg-chips">${add ? `<span class="c-add">+ ${add} dodato</span>` : ''}${ed ? `<span class="c-edit">✎ ${ed} izmenjeno</span>` : ''}${del ? `<span class="c-del">− ${del} obrisano</span>` : ''}${res ? `<span class="c-edit">↩ ${res} vraćeno</span>` : ''}</div>
    <div class="chg-list">${rows.slice(0, lim).map((x, i) => { const p = PEOPLE[x.a.actor];
      return `<div class="chg-row k-${x.d.kind}" ${x.d.open ? `data-nopen="${esc(x.d.open)}"` : ''} style="animation-delay:${i * 35}ms"><span class="n-av ${p ? x.a.actor : 'system'}">${esc((p ? p.name : 'F').charAt(0))}</span><span class="chg-k">${{ add: '+', edit: '✎', del: '−', restore: '↩' }[x.d.kind]}</span><div class="chg-txt"><b>${esc(p ? p.name : 'Forma')}</b> ${x.d.text}</div><span class="chg-when">${relTime(x.a.at)}</span></div>`; }).join('')}</div>
    ${rows.length > 6 ? `<button class="chg-more" data-chgall="${tab}">${state.chgAll[tab] ? 'Prikaži manje' : `Prikaži sve (${rows.length})`}</button>` : ''}
  </div>`;
}
function renderChgPanel(tab) {
  const view = $('v-' + tab); if (!view) return;
  let box = view.querySelector(':scope > .chg-box');
  if (!box) { box = document.createElement('div'); box.className = 'chg-box'; const head = view.querySelector(':scope > .page-head'); head ? head.after(box) : view.prepend(box); }
  box.innerHTML = chgPanelHtml(tab);
}
function chgEnter(tab) {
  if (!state.nfState || !CHG_TABS.includes(tab)) return;
  const rows = chgRows(tab, seenTabs()[tab] || 0);
  if (rows.length) { state.chgShow[tab] = rows; state.chgAll[tab] = false; }
  markTabSeen(tab);
  CHG_TABS.forEach(t => { if (t !== tab) { const v = $('v-' + t); const b = v && v.querySelector(':scope > .chg-box'); if (b) b.innerHTML = ''; if (t !== tab) delete state.chgShow[t]; } });
  renderChgPanel(tab); renderChgBadges();
}
function chgLive(row) {
  if (!chgCounts(row)) return;
  const tabs = auditTabs(row);
  if (tabs.includes(state.tab)) {
    const d = describeAudit(row); if (d) { state.chgShow[state.tab] = [{ a: row, d }].concat(state.chgShow[state.tab] || []); markTabSeen(state.tab); renderChgPanel(state.tab); }
  }
  renderChgBadges();
  if (document.body.classList.contains('nav-open')) renderNav();
}

/* ---------------- shell ---------------- */
function renderAll() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + state.tab));
  document.querySelectorAll('#periodSeg button').forEach(b => b.classList.toggle('active', b.dataset.p === String(state.period)));
  $('rangeWrap').style.display = state.period === 'custom' ? '' : 'none';
  renderOverview(); renderOrders(); renderProducts(); renderAds();
  renderGarderoba(); renderPosts(); renderSite(); renderPackaging(); renderStory(); renderNotes(); renderReturns(); renderPromos(); renderCustomers(); renderHomeNotes(); renderNotesPage(); renderChgBadges(); if (document.body.classList.contains('nav-open')) renderNav();
  if (state.tab === 'history') renderHistory();
  renderTasks();
}
function setTab(t) {
  if (t === 'notes') LS.set(seenKey(), new Date().toISOString());
  closeNav(); scrollLockSync();
  state.tab = t; LS.set('crm_tab', t); renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
  chgEnter(t);
  countUp($('v-' + t));
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('loginErr').style.display = 'none'; if (soundOn()) audioCtx();
    const un = $('loginUser').value.trim().toLowerCase();
    const pre = PEOPLE[un] ? playSplash({ username: un, display: PEOPLE[un].name }) : null; // odmah, dok traje klik: animacija + zvuk
    try { await enterApp(await signIn($('loginUser').value, $('loginPass').value), false, pre); }
    catch (err) { console.error('login', err); if (pre) { introFade(); const sp = $('splash'); if (sp) sp.classList.add('hide'); } $('loginErr').style.display = 'block'; }
  });
  $('logoutBtn').addEventListener('click', byeOut);
  $('projSel').addEventListener('change', (e) => {
    const h = e.target.value === 'harizma';
    $('harizma').style.display = h ? '' : 'none'; $('soonView').style.display = h ? 'none' : '';
  });
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
  $('periodSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.period = b.dataset.p; LS.set('crm_period', b.dataset.p); if (b.dataset.p === 'custom' && !state.range.from) { const d = new Date(); d.setDate(1); state.range.from = dayStr(d); state.range.to = dayStr(new Date()); } $('rangeFrom').value = state.range.from; $('rangeTo').value = state.range.to; renderAll(); });
  ['rangeFrom', 'rangeTo'].forEach(id => $(id).addEventListener('change', () => { state.range = { from: $('rangeFrom').value, to: $('rangeTo').value }; LS.set('crm_rfrom', state.range.from); LS.set('crm_rto', state.range.to); renderAll(); }));
  $('cmdBtn').addEventListener('click', openCmd); $('cmdBtnM').addEventListener('click', openCmd);
  $('cmdBg').addEventListener('click', closeCmd);
  $('cmdX').addEventListener('click', closeCmd);
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
    else if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey) { openNoteModal('auto'); }
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
  $('navLogout').addEventListener('click', byeOut);
  $('navPush').addEventListener('click', () => { closeNav(); openPushModal(); });
  $('pmMain').addEventListener('click', () => { const st = pushState(); if (st === 'on') return pushDisable(); if (st === 'denied') { renderPushModal(); return toast('I dalje je blokirano. Uradi korake iz uputstva, pa probaj ponovo.', 4500); } pushEnable(); });
  $('pmTest').addEventListener('click', () => pushTest(false));
  document.addEventListener('click', (e) => { if (e.target.closest('[data-appinst]')) return appInstall(); if (e.target.closest('[data-sndplay]')) return playHarizmaSound(); if (e.target.closest('[data-instno]')) { LS.set('crm_inst_nag', 'later'); renderPushBar(); toast('Instalacija je uvek u: zvonce gore → Obaveštenja na ovom uređaju', 4500); } });
  $('pmPrefs').addEventListener('change', pushSavePrefs);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-pb]'); if (!b) return; if (b.dataset.pb === 'on') pushEnable(); else { LS.set('crm_push_nag', 'later'); renderPushBar(); toast('Možeš da ih uključiš kad hoćeš: zvonce gore → Obaveštenja na ovom uređaju', 4500); } });
  $('navSound').addEventListener('click', () => { setSound(!soundOn()); toast(soundOn() ? 'Zvuci uključeni 🔔' : 'Zvuci isključeni'); });
  renderSoundBtns();
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
  if ($('quickNoteBtn')) $('quickNoteBtn').addEventListener('click', () => openNoteModal('auto'));
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
  $('srcSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-src]'); if (!b) return; state.src = b.dataset.src; LS.set('crm_osrc', state.src); renderOrders(); });
  $('o_srcSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-osrc]'); if (b) setOrderSrc(b.dataset.osrc); });
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
    const cc = e.target.closest('[data-chgclose]'); if (cc) { e.stopPropagation(); const t = cc.dataset.chgclose; const pnl = cc.closest('.chg-panel'); pnl.classList.add('out'); setTimeout(() => { delete state.chgShow[t]; renderChgPanel(t); }, 280); return; }
    const ca = e.target.closest('[data-chgall]'); if (ca) { const t = ca.dataset.chgall; state.chgAll[t] = !state.chgAll[t]; return renderChgPanel(t); }
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
  $('prodFind').addEventListener('input', renderProducts);
  $('alertToggle').addEventListener('click', () => { LS.set('crm_alerts_open', LS.get('crm_alerts_open', '0') === '1' ? '0' : '1'); renderGarderoba(); });
  $('newPostBtn').addEventListener('click', () => openPostModal());
  $('postForm').addEventListener('submit', savePost);
  $('poDelete').addEventListener('click', deletePost);
  $('postViewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.postView = b.dataset.view; LS.set('crm_pview', b.dataset.view); renderPosts(); });
  $('postFmtFilter').addEventListener('change', (e) => { state.postFmt = e.target.value; renderPosts(); });
  $('postPurposeSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-pp]'); if (!b) return; state.postPurpose = b.dataset.pp; LS.set('crm_ppurpose', state.postPurpose); renderPosts(); });
  // TASKOVI: kružić gotovo, izmena zaduženja, otvaranje stavke, stanje u formi
  document.addEventListener('click', (e) => {
    const dn = e.target.closest('[data-tkdone]'); if (dn) { e.preventDefault(); e.stopPropagation(); return taskToggle(dn.dataset.tkdone); }
    const ed = e.target.closest('[data-tkedit]'); if (ed) { e.preventDefault(); e.stopPropagation(); const [k, id] = ed.dataset.tkedit.split(':'); return openTaskModal(k, id); }
    const md = e.target.closest('[data-tmode]'); if (md) { e.preventDefault(); const st = $(md.dataset.px + '_tstate'); st.dataset.mode = md.dataset.tmode; return renderTaskState(md.dataset.px); }
    const ti = e.target.closest('[data-tkitem]'); if (ti) { e.preventDefault(); e.stopPropagation(); const [k, id] = ti.dataset.tkitem.split(':'); return openTaskItem(k, id); }
    const op = e.target.closest('[data-tkopen]'); if (op) { const [k, id] = op.dataset.tkopen.split(':'); return openTaskView(k, id); }
  }, true);
  $('tkWho').addEventListener('click', (e) => { const b = e.target.closest('[data-tw]'); if (!b) return; tkState.who = b.dataset.tw; renderTasks(); });
  $('tkState').addEventListener('click', (e) => { const b = e.target.closest('[data-ts]'); if (!b) return; tkState.st = b.dataset.ts; renderTasks(); });
  $('tkSec').addEventListener('change', (e) => { tkState.sec = e.target.value; renderTasks(); });
  $('tkQ').addEventListener('input', () => renderTasks());
  const unlockAudio = () => { if (soundOn()) audioCtx(); window.removeEventListener('pointerdown', unlockAudio, true); window.removeEventListener('keydown', unlockAudio, true); };
  window.addEventListener('pointerdown', unlockAudio, true); window.addEventListener('keydown', unlockAudio, true);
  document.addEventListener('click', (e) => {
    const pop = e.target.closest('#tpop'); if (!pop) return;
    if (e.target.closest('[data-tpsound]')) { setSound(!soundOn()); const b = e.target.closest('[data-tpsound]'); b.textContent = soundOn() ? '🔔' : '🔕'; b.title = soundOn() ? 'Isključi zvuk' : 'Uključi zvuk'; return; }
    tpopHide(); clearTimeout(tpopT);
    if (!e.target.closest('[data-tpclose]') && state.tab !== 'tasks') setTab('tasks');
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-sectk]'); if (!b) return; tkState.sec = b.dataset.sectk; tkState.who = 'all'; tkState.st = 'open'; setTab('tasks'); });
  $('newTaskBtn').addEventListener('click', () => openNoteModal('auto', true));
  $('tmSave').addEventListener('click', saveTaskModal);
  $('tmOpen').addEventListener('click', () => { if (!tmCtx) return; const { src, x } = tmCtx; $('taskModal').classList.remove('open'); const ref = src.ref(x); if (ref.startsWith('tab:')) setTab(ref.slice(4)); else if (src.k === 'cust') openCustModal(x.id); else openRef(ref); });
  $('qn_area').addEventListener('change', (e) => { $('qt_task').style.display = e.target.value === 'milestone' ? 'none' : ''; renderQl(); });
  $('qnLink').addEventListener('click', (e) => {
    const m = e.target.closest('[data-qm]'); if (m) { qlState.mode = m.dataset.qm; renderQl(); if (qlState.mode === 'pick') setTimeout(() => $('qlQ') && $('qlQ').focus(), 30); return; }
    const it = e.target.closest('[data-qlsel]'); if (it) { qlState.sel = qlState.sel === it.dataset.qlsel ? null : it.dataset.qlsel; $('qnLink').querySelectorAll('.ql-it').forEach(b => b.classList.toggle('on', b.dataset.qlsel === qlState.sel)); }
  });
  $('qnLink').addEventListener('input', (e) => { if (e.target.id !== 'qlQ') return; qlState.q = e.target.value; const cfg = qlCfg(); if (cfg && $('qlList')) $('qlList').innerHTML = qlListHtml(cfg); });
  $('qnLink').addEventListener('keydown', (e) => { if (e.target.id === 'qlQ' && e.key === 'Enter') { e.preventDefault(); const f = $('qlList') && $('qlList').querySelector('[data-qlsel]'); if (f) f.click(); } });
  taskSet('nt', null, taskSrcOf('note'));
  fillAreaSelects();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.who-pick .wp'); if (!b) return; const box = b.closest('.who-pick');
    if (b.dataset.wall) { const ps = [...box.querySelectorAll('.wp[data-who]')], all = ps.every(x => x.classList.contains('on')); ps.forEach(x => { x.classList.toggle('on', !all); x.setAttribute('aria-pressed', !all); }); }
    else { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); }
    wpAllSync(box);
  });
  mntInit(); scrollLockInit();
  $('po_purposeSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-pp]'); if (b) setPostPurpose(b.dataset.pp); });
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

/* ---------- ASISTENT (chat u aplikaciji) ---------- */
const BOT = { open: false, msgs: [], typing: false };
const botKey = () => 'crm_bot_' + (state.user?.username || 'x');
function botLoad() { try { BOT.msgs = JSON.parse(LS.get(botKey(), '[]')).slice(-40); } catch (e) { BOT.msgs = []; } }
function botSave() { LS.set(botKey(), JSON.stringify(BOT.msgs.slice(-40))); }
const BOT_TAB_FOR = { order: 'orders', cust: 'customers', product: 'products', post: 'posts', ret: 'returns', promo: 'promos', code: 'customers', ms: 'history', idea: 'site', pack: 'packaging' };
const BOT_TIPS = {
  overview: 'Brojke za izabrani period (gore biraš danas, 7 ili 30 dana ili svoje datume). Klik na karticu <b>Prihod, Profit, Reklame…</b> otvara grafikon sa istorijom, a klik na stubić pokazuje taj dan. Beleške tima su odmah ispod.',
  notes: 'Ovde su beleške celog tima, svi vide sve. Pišeš gore i biraš ko piše i gde beleška ide. Klik na tekst je menja, 📌 je kači na vrh, ✓ je označava kao urađenu. Iznad liste su filteri po osobi, mestu i statusu.',
  orders: 'Porudžbine vidiš kao <b>Tabelu</b> ili <b>Pipeline</b> (kartice prevlačiš kroz faze). Klik na porudžbinu otvara detalje, aktivnost i komentare. Taster <kbd>N</kbd> otvara novu porudžbinu.',
  customers: 'Tri pogleda: <b>Kupci</b> (potrošnja i broj kupovina), <b>Loyalty klub</b> (nivoi i poeni) i <b>Popusti</b> (kodovi i koliko su korišćeni). Kupac se sam pravi i povezuje kad uneseš porudžbinu (po telefonu, Instagramu, mejlu ili imenu).',
  products: 'Na vrhu su upozorenja za zalihe, ispod tabela sa veličinama. Dugmići <b>−</b> i <b>+</b> odmah menjaju stanje. Granicu za upozorenje („upozori kad ostane ≤ X“) menjaš desno gore.',
  returns: 'Ovde stižu prijave sa forme za kupce. Svaka kartica ima rok: 8 dana za odgovor na reklamaciju, 14 dana za povrat novca ili zamenu. Pogled <b>Šta da popravimo</b> skuplja razloge i utiske.',
  promos: 'Svaka akcija ima trajanje od-do, kod i budžet. CRM sam računa porudžbine i prihod u tom periodu i koliko je to iznad proseka. Svako može da doda beleške uz promociju.',
  posts: 'Ideje za objave i reklame sa skriptom (hook posebno), inspiracijom, datumom i Drive linkom za video. Gore filtriraš Objava + reklama, Samo reklama, Samo objava. Pogledi: <b>Tabla</b> (faze), <b>Kalendar</b> i <b>Lista</b>. Karticu prevučeš u sledeću fazu.',
  packaging: 'Stanje ambalaže (dugme <b>+50</b> kad stigne nova tura, upozorenje kad padne ispod minimuma) i predlozi za dizajn i promenu pakovanja.',
  site: 'Link sajta stoji gore. Ispod su predlozi za sajt po kategorijama (dizajn, tekst, funkcija…), sa statusom i komentarima.',
  story: 'Priča brenda po poglavljima, a desno je papir sa beleškama gde biraš čije beleške gledaš (Staša, Konstantin, Marjan).',
  ads: 'Ovde unosiš dnevnu potrošnju sa Meta naloga (datum, iznos, kupovine). Dok ne povežemo Meta nalog, unos je ručni. Brojke odmah ulaze u profit i neto na Pregledu.',
  history: 'Vremenska linija svega što se desilo, sa filterima po vrsti i mesecu. <b>Arhiva obrisanog</b> vraća bilo šta što je obrisano.',
};
const BOT_FAQ = [
  { g: [['status', 'faz', 'pomer', 'prevuc', 'poslat', 'isporuc', 'spakov', 'potvrd']], a: 'Otvori porudžbinu i promeni status (Nova → Potvrđena → Spakovana → Poslata → Isporučena). U pogledu <b>Pipeline</b> samo prevučeš karticu u sledeću kolonu.', b: [['Porudžbine', 'tab:orders'], ['Pipeline pogled', 'oview:pipeline']] },
  { g: [['porudzbin', 'narudzbin', 'order'], ['dodam', 'dodaj', 'unes', 'napravi', 'nov', 'kreir', 'ubac', 'upis']], a: 'Klikni <b>+ Nova porudžbina</b> (ili taster <kbd>N</kbd>). Upišeš kupca, dodaš komade i veličine, a cena, profit i zalihe se računaju sami. Kupac se sam pravi ili povezuje sa postojećim.', b: [['Nova porudžbina', 'act:Nova porudžbina'], ['Porudžbine', 'tab:orders']] },
  { g: [['otkaz', 'storn', 'ponist']], a: 'Otvori porudžbinu i stavi status <b>Otkazana</b>. Roba se sama vraća na stanje, a porudžbina se više ne računa u prihod.', b: [['Porudžbine', 'tab:orders']] },
  { g: [['velicin', 'zalih', 'stanj', 'komad', 'proizvod', 'garderob', 'artik'], ['dodam', 'dodaj', 'menjam', 'menja', 'promen', 'unes', 'azurir', 'smanj', 'povec', 'nov', 'upis', 'skin', 'kako da', 'kako se']], a: 'Garderoba → <b>Novi komad</b> ili klik na postojeći → <b>+ Veličina</b> i količina. Stanje menjaš i direktno u tabeli dugmićima − i +. Porudžbine same skidaju robu sa stanja.', b: [['Novi komad', 'act:Novi komad'], ['Garderoba', 'tab:products']] },
  { g: [['upozoren', 'granic']], a: 'U Garderobi desno gore piše „Upozori kad ostane ≤ X kom“. Promeni broj i upozorenja se odmah preračunaju. Za pakovanje svaka stavka ima svoj minimum.', b: [['Garderoba', 'tab:products']] },
  { g: [['obris', 'vratim', 'vratis', 'arhiv', 'izgub', 'nestal', 'slucajno']], a: 'Ništa se ne briše zauvek. Idi na <b>Istorija → Arhiva obrisanog</b> i klikni <b>Vrati</b> pored stavke.', b: [['Otvori arhivu', 'archive']] },
  { g: [['notifikac', 'obavesten', 'zvonc', 'utisa']], a: 'Kartice dole desno su promene koje su napravili drugi. <b>X</b> ih sklanja. Na zvoncu gore imaš <b>Istoriju svih promena</b> (sa filterima), „Skloni sve“ i utišavanje na 1 h, 3 h ili do sutra.', b: [['Istorija promena', 'bell:history']] },
  { g: [['crven', 'zut', 'broj', 'bedz', 'badge', 'oznak', 'brojev']], a: '<span class="bt-red">Crveni broj</span> znači koliko je promena neko drugi napravio u toj sekciji od tvog poslednjeg ulaska. Kad uđeš, vidiš karticu „Šta je novo ovde“ i broj nestaje. <span class="bt-amber">Žuti broj</span> je upozorenje: zalihe, pakovanje, povrati koji čekaju, aktivne promocije.', b: [] },
  { g: [['beles', 'note', 'zabelez']], a: 'Beleške su zajedničke i svi vide sve. Brzo pišeš tasterom <kbd>B</kbd>, na stranici Beleške ili ovde: napiši <i>zabeleži …</i> i sačuvaću odmah. Na stranici Beleške klik na tekst menja belešku.', b: [['Beleške', 'tab:notes'], ['Nova beleška', 'act:Nova beleška']] },
  { g: [['reklam', 'potros', 'spend', 'meta', 'ads', 'roas']], a: 'Reklame → <b>Unesi potrošnju</b>: datum, iznos u RSD, po želji kampanja, kupovine i prihod iz Meta. Potrošnja odmah ulazi u neto na Pregledu i u grafikon.', b: [['Reklame', 'tab:ads'], ['Grafikon potrošnje', 'metric:ads:30']] },
  { g: [['loyalty', 'klub', 'poen', 'nivo', 'vip']], a: 'Kupci → <b>Loyalty klub</b>. Tu podešavaš nivoe (Nova, Stalna, HARIZMA klub, VIP), koliko poena donosi 100 RSD i nagradu. Poeni se računaju sami iz porudžbina.', b: [['Loyalty klub', 'cview:club']] },
  { g: [['kod', 'kupon', 'popust']], a: 'Kupci → <b>Popusti</b> → <b>+ Kod za popust</b>. Kod može da bude u % ili RSD, a CRM broji koliko puta je iskorišćen i koliki je prihod doneo.', b: [['Novi kod', 'act:Novi kod za popust'], ['Popusti', 'cview:codes']] },
  { g: [['povrat', 'reklamac', 'zamen', 'forma', 'zalb'], ['form', 'funkcion', 'radi', 'rok', 'prijav', 'link', 'salj', 'posalj', 'kako da', 'kako se', 'obrad']], a: 'Kupci popunjavaju formu za povrat (link možeš da kopiraš ispod). Prijava stiže u <b>Povrati</b> sa rokom: 8 dana za odgovor na reklamaciju, 14 dana za povrat novca ili zamenu. Karticu pomeraš kroz statuse.', b: [['Kopiraj link forme', 'copyform'], ['Povrati', 'tab:returns']] },
  { g: [['grafik', 'chart', 'datum', 'period', 'statistik', 'istoriju prihod']], a: 'Na Pregledu klikni karticu <b>Prihod, Profit, Reklame</b> ili neku drugu. Otvara se grafikon: biraš period (7, 30, 90 dana, mesec ili svoje datume), prikaz po danu, nedelji ili mesecu, i klikom na stubić vidiš tačno taj dan.', b: [['Grafikon prihoda', 'metric:revenue:30']] },
  { g: [['pretrag', 'nadj', 'trazi', 'search', 'precic', 'tastat']], a: 'Pretraga: <kbd>Ctrl</kbd>+<kbd>K</kbd> ili <kbd>/</kbd> (na telefonu lupa gore desno). Nalazi kupce, porudžbine, komade i sekcije. Prečice: brojevi <kbd>1</kbd>–<kbd>9</kbd> menjaju sekciju, <kbd>N</kbd> nova porudžbina, <kbd>B</kbd> nova beleška, <kbd>?</kbd> otvara mene.', b: [['Otvori pretragu', 'cmd']] },
  { g: [['task', 'zadat', 'zaduz', 'dodel', 'rok']], a: 'Zadatak može da ima <b>bilo koja stavka</b>: u formi (porudžbina, komad, objava, predlog, materijal, povrat, promocija) je red <b>Zadatak</b> gde biraš ko je zadužen (može više) i rok. Za belešku, kupca i poglavlje priče klikni 👤. Sve se skuplja u sekciji <b>Taskovi</b>: Moji, Svi ili po osobi, otvoreni po roku, a <b>Istorija</b> čuva završene sa filterom po sekciji. Kružić ✓ označava gotovo.', b: [['Taskovi', 'tab:tasks'], ['Nov zadatak', 'act:Nov zadatak']] },
  { g: [['objav', 'reel', 'video', 'drive', 'kalendar', 'snima'], ['dodam', 'dodaj', 'nov', 'unes', 'napravi', 'upis', 'drive', 'link', 'pomer', 'faz', 'promen', 'datum', 'kako da', 'kako se', 'funkcion']], a: 'Objave + reklame → <b>+ Nova ideja</b>: naslov, gde se koristi (samo objava, objava + reklama ili samo reklama), link za inspiraciju, skripta (gore poseban red za hook), datum i Google Drive link za video. Gore biraš filter Sve / Objava + reklama / Samo reklama / Samo objava. Karticu pomeraš kroz faze (Ideja → Scenario → Snimanje → Montaža → Zakazano → Objavljeno), a u Kalendaru vidiš ceo mesec; ideje za reklamu imaju znak ◆.', b: [['Nova ideja', 'act:Nova ideja za objavu'], ['Objave + reklame', 'tab:posts']] },
  { g: [['promocij', 'akcij', 'kampanj'], ['dodam', 'dodaj', 'nov', 'napravi', 'unes', 'kako da', 'kako se', 'racun', 'funkcion', 'pokren']], a: 'Promocije → <b>+ Nova promocija</b>: ime, od-do, kod i budžet. CRM sam pokazuje koliko je porudžbina i prihoda donela, a svako može da doda beleške.', b: [['Nova promocija', 'act:Nova promocija'], ['Promocije', 'tab:promos']] },
  { g: [['sajt', 'shopify', 'domen']], a: 'Link sajta stoji na vrhu sekcije <b>Sajt</b>. Ispod dodaješ predloge šta da se promeni ili doda na sajtu.', b: [['Sajt', 'tab:site'], ['Otvori HARIZMA sajt', 'site']] },
  { g: [['pakovanj', 'ambalaz', 'kutij', 'stiker']], a: 'Pakovanje: menjaš stanje (−, +, +50) i dodaješ predloge za novo pakovanje. Kad nešto padne ispod minimuma, dobiješ žuto upozorenje.', b: [['Pakovanje', 'tab:packaging'], ['Novi predlog', 'act:Novi predlog za pakovanje']] },
  { g: [['story', 'pric', 'brend']], a: 'Brand story: levo pišeš poglavlja priče, desno je papir sa beleškama gde biraš čije beleške gledaš.', b: [['Brand story', 'tab:story']] },
  { g: [['telefon', 'mobiln', 'crtic']], a: 'Na telefonu su sve sekcije u meniju sa <b>tri crtice</b> gore levo (crveni brojevi pokazuju promene), a pretraga je lupa gore desno. Ja sam uvek dole desno.', b: [] },
  { g: [['ne radi', 'ne mogu', 'ne ucitav', 'zablok', 'zapel', 'zaglav', 'gresk', 'bug', 'ne otvar', 'ne cuva', 'ne sacuv', 'ne pokaz', 'ne vidim']], a: 'Prvo probaj osvežavanje: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (na telefonu zatvori i ponovo otvori stranicu). Ako i dalje ne radi, pošalji timu kratak opis dugmetom ispod, pa će neko da pogleda.', b: [['Pošalji timu', 'teamlast']] },
  { g: [['backup', 'rezerv', 'sigurn', 'bezbed']], a: 'Podaci se čuvaju zauvek: obrisano ide u arhivu, svaka promena se beleži, a svake noći u 03:30 pravi se rezervna kopija cele baze na GitHub-u.', b: [['Istorija', 'tab:history']] },
  { g: [['istorij', 'prekretnic', 'dogadja', 'vremensk']], a: 'Istorija je vremenska linija svega. Važan događaj (lansiranje, nova kolekcija…) dodaješ dugmetom <b>Zabeleži događaj</b>.', b: [['Zabeleži događaj', 'act:Zabeleži događaj u istoriji'], ['Istorija', 'tab:history']] },
  { g: [['obavestenj', 'notifikac', 'push', 'na telefon', 'stize poruka', 'stizu poruke']], a: 'CRM može da šalje <b>obaveštenja na telefon i računar</b>, i kad je zatvoren: kad ti neko dodeli zadatak, kad neko završi zadatak koji si dodelio/la, nova porudžbina, nova prijava povrata i jutarnji podsetnik u 8h. Uključuješ ih na svakom uređaju posebno: <b>zvonce gore → Obaveštenja na ovom uređaju → Uključi</b> (na telefonu i u meniju sa tri crtice, dugme 📲). Tu biraš šta da ti stiže i šalješ probu. Na iPhone-u prvo dodaj CRM na početni ekran iz Safari-ja. Na Androidu instaliraj CRM kao aplikaciju (u istom prozoru dugme <b>Instaliraj HARIZMA aplikaciju</b>), pa obaveštenja stižu kao od aplikacije HARIZMA, i tu možeš da preuzmeš <b>HARIZMA zvuk</b> i postaviš ga kao zvuk obaveštenja. Na iPhone-u Apple ne dozvoljava poseban zvuk.', b: [] },
  { g: [['oznac', 'tagu', 'tagov', 'pomen', 'mention']], a: 'Označavanje (@): u bilo kom polju gde pišeš (ideja za video, hook, skripta, zadatak, beleška, porudžbina, komentar…) kucaj @ i iskoče Staša, Marjan, Konstantin i „svi“; dodirni ime ili pritisni Enter. Kad se sačuva, označena osoba dobija obaveštenje na telefon sa tim tekstom, a klik otvara baš tu stavku; ako je u CRM-u, iskoči kartica. @Ime je svuda istaknuto zlatnom bojom (tvoje jače). Obaveštenje stiže samo za novu oznaku, ne svaki put kad se tekst izmeni. Pri zaduživanju postoji i dugme „Ceo tim“. Izbor u obaveštenjima: „Kad te neko označi (@)“.' },
  { g: [['izmen', 'promen', 'preimen', 'menja'], ['zadat', 'task', 'naziv', 'opis', 'ime']], a: 'Izmena zadatka: otvori zadatak (Taskovi → klik na zadatak) i klikni na naslov ili na bilo koje polje u Detaljima: Stavka (naziv ideje, komada, kupca…), Zadatak (šta treba da se uradi), a kod objava i Hook i Skripta, kod predloga Opis. Otvori se polje, izmeni, pa Sačuvaj (kod naziva i Enter). Svako može da menja sve, a u Aktivnosti ostaje zapisano ko je šta promenio.', b: [['Otvori Taskove', 'act:Taskovi']] },
  { g: [['prioritet', 'hitno', 'hitan', 'hitna', 'rok', 'vreme roka', 'alarm', 'podsetnik za rok']], a: 'Prioritet i tačno vreme roka: u svakom formularu zadatka pored datuma je polje za vreme (npr. 14:30) i izbor prioriteta Hitno 🚩, Visok, Normalan ili Nizak. Kad zadatak ima vreme, ceo tim dobija podsetnik sat pre roka. Hitni zadaci su jači: svi dobijaju obaveštenje odmah kad se označe kao hitni, pa 15 min pre roka, u roku i na svakih 30 min dok kasne (samo od 8 do 23h), dok se ne završe. Ta obaveštenja izgledaju drugačije: crvena (hitno) ili zlatna (rok) ikonica, duža vibracija, ostaju na ekranu i imaju dugmad Gotovo i Otvori. U CRM-u iskoči velika kartica sa posebnim zvukom. Uključuje se u zvonce → Obaveštenja → „Rokovi i hitni zadaci“ (uključeno je odmah). Zadaci bez vremena i dalje stižu u jutarnjem podsetniku u 8h.', b: [['Otvori Taskove', 'act:Taskovi']] },
  { g: [['aktivan', 'aktivna', 'na mrezi', 'online', 'poslednji put', 'kad je bio', 'kad je bila', 'ko je tu']], a: 'Ko je kad bio aktivan: na računaru gore pored dugmeta Chat su avatari tima (zelena tačka = CRM je otvoren ispred te osobe, zlatna = aktivna u poslednjih 15 min, siva = ranije). Klik pokazuje „aktivna pre 12 min · telefon“ i dugmad Piši i Pozovi. Na telefonu je isto u meniju sa tri crtice (Tim). Vidi se i u chatu pored imena, u zadatku kod zaduženih i kad pređeš mišem preko avatara u Taskovima.', b: [['Otvori chat', 'act:Tim chat']] },
  { g: [['huddle', 'poziv', 'pozov', 'zovem', 'zvati', 'video', 'kamer', 'ekran']], a: '<b>Huddle</b> je brz poziv u CRM-u (kao na Slack-u): u chatu gore dugme <b>📞 Huddle</b> (u Tim chatu) ili <b>Pozovi</b> (u privatnom razgovoru). Ostali dobiju zvono u CRM-u i obaveštenje na telefon, pa klik na <b>Pridruži se</b>. U traci poziva su mikrofon, kamera, deljenje ekrana (na računaru), veliki prikaz i crveno dugme za izlaz. Glas ide direktno između uređaja, šifrovano.', b: [['Otvori chat', 'act:Tim chat']] },
  { g: [['glasovn', 'glasom', 'snimi', 'snimak', 'voice', 'mikrofon']], a: 'Glasovna poruka: u chatu ili komentaru na zadatku, kad je polje prazno, desno je dugme <b>🎤</b>. Klik počinje snimanje, <b>➤</b> šalje, 🗑 odustaje (najviše 5 minuta). Ako uz snimak ukucaš i tekst sa @ime, ta osoba dobije obaveštenje. Snimak se pušta dugmetom ▶, a 1× menja brzinu na 1,5× i 2×.', b: [['Otvori chat', 'act:Tim chat']] },
  { g: [['koment', 'dopisiv'], ['task', 'zadat']], a: '<b>Komentari na zadatku</b> (kao u ClickUp-u): u Taskovima klikni na zadatak i otvara se prozor sa detaljima levo (status, zaduženi, rok, ko je dodelio) i <b>Aktivnošću</b> desno: komentari i promene na zadatku. Piši, odgovaraj, reaguj, šalji slike i glasovne. Zaduženi i ko je dodelio zadatak dobijaju obaveštenje za svaki komentar, a <b>@ime</b> obaveštava bilo koga. Strelica pored naziva stavke otvara samu stavku.', b: [['Taskovi', 'tab:tasks']] },
  { g: [['chat', 'cet', 'caskanj', 'dopisiv', 'privatn', 'gif', 'tagu', 'taguj', 'oznac', 'pominj', 'reakc', 'lajk', 'odgovor na poruk', 'reply', 'izmeni poruk', 'obrisi poruk', 'edit']], a: '<b>Tim chat</b> je zlatno dugme <b>💬 Chat</b> dole desno (i gore u traci, i prvo u meniju sa tri crtice, taster <kbd>C</kbd>). Ima grupu <b>Tim HARIZMA</b> i privatne poruke sa svakim posebno (vidite ih samo vas dvoje). Obaveštenje na telefon stiže <b>samo kad nekog označiš</b>: napiši <b>@</b> i izaberi ime, ili <b>@svi</b> za ceo tim. Dugme <b>GIF</b> šalje GIF ili sliku (iz galerije, nalepljen link ili pretraga). Na poruku <b>odgovaraš i reaguješ</b> (❤️ 👍 😂…) dugim držanjem poruke na telefonu, a na računaru dugmetom ☺ pored poruke; brz odgovor je prevlačenje poruke udesno, a dva dodira daju ❤️. <b>Svoje poruke</b> možeš da izmeniš ili obrišeš (isti meni, na računaru i strelica gore u praznom polju menja poslednju). Kod drugih piše „izmenjeno“ ili „Poruka je obrisana“, a original ostaje sačuvan u bazi i dnevnoj kopiji. Pretraga gore levo traži kroz celu istoriju.', b: [['Otvori chat', 'act:Tim chat']] },
  { g: [['nov zadatak', 'novi zadatak', 'novi task', 'nov task', 'zadatak za', 'task za', 'dodeli', 'zaduzi']], a: 'Klikni <b>Nov zadatak</b> (u Taskovima ili taster B), upiši šta treba i izaberi <b>Sekciju</b>. Ispod se pojavi <b>Za šta je zadatak?</b>: <b>＋ nova stavka</b> (npr. cela forma za ideju u Objave + reklame, predlog za Sajt, promocija), <b>postojeća</b> stavka iz liste (porudžbina, kupac, model, prijava…) ili <b>Samo zadatak</b> kao beleška. Izaberi ko radi i rok, pa Sačuvaj.', b: [['Nov zadatak', 'act:Nov zadatak'], ['Taskovi', 'tab:tasks']] },
  { g: [['zvuk', 'zvuc', 'ting', 'muzik', 'utisa', 'tisin', 'sound']], a: 'CRM ima zvuke: uvod kad uđeš, „ka-čing“ za novu porudžbinu (tiši kad je unese neko drugi), zvonce za zadatke, šuškanje papira za belešku, zvuk za poslato i isporučeno, brisanje i vraćanje, a za prvu, 10., 25., 50., 100. porudžbinu i za rekordan dan i mala proslava sa konfetama. Sve se gasi i pali u zvoncetu gore (Zvuci) ili u meniju sa tri crtice (Zvuk); tu je i <b>▶ Probaj</b>.', b: [] },
  { g: [['izvor', 'organic', 'organsk', 'meta ads', 'tiktok', 'tik tok', 'google ads', 'atribuc', 'odakle je dosl']], a: 'Svaka porudžbina ima <b>Izvor</b>: <b>Organic</b> (ručno uneta ili ne znamo odakle je došla), <b>Meta Ads</b>, <b>TikTok Ads</b> ili <b>Google Ads</b>. Biraš ga u formi porudžbine (podrazumevano Organic). U Porudžbinama je filter <b>Svi izvori</b> sa brojem porudžbina, a pored broja stoji ukupan iznos za taj izvor.', b: [['Porudžbine', 'tab:orders'], ['Nova porudžbina', 'act:Nova porudžbina']] },
  { g: [['istorij', 'zavrsen', 'obrisan', 'otkac', 'skin', 'gde ide', 'gde su', 'gde odu'], ['beles', 'beleshk', 'belez', 'papiric']], a: 'Kad <b>otkačiš</b> belešku, ona ostaje među ostalima pod svojim datumom. Kad je označiš <b>✓ Završeno</b> ili obrišeš <b>✕</b>, ide u <b>Beleške → Istorija</b>, grupisano po danu, sa oznakom ko je završio ili obrisao. Svaka može da se vrati.', b: [['Beleške', 'tab:notes']] },
  { g: [['kupac', 'kupc', 'klijent'], ['dodam', 'dodaj', 'nov', 'napravi', 'unes', 'pravi', 'povez', 'spaja', 'kako da', 'kako se']], a: 'Kupac se sam pravi kad uneseš porudžbinu i povezuje se sa postojećim po telefonu, Instagramu, mejlu ili imenu. Ručno ga dodaješ preko <b>Novi kupac</b>.', b: [['Kupci', 'tab:customers'], ['Novi kupac', 'act:Novi kupac']] },
  { g: [['lozink', 'sifr', 'prijav', 'login', 'odjav']], a: 'Korisnička imena su konstantin, stasa i marjan. Odjava je dugme gore desno (na telefonu u meniju sa tri crtice). Za promenu lozinke javi Konstantinu.', b: [] },
];
const BOT_CHIPS = { overview: ['Šta je hitno?', 'Prihod ovog meseca', 'Šta fali na stanju?'], orders: ['Šta čeka obradu?', 'Nova porudžbina', 'Prihod ove nedelje'], products: ['Šta fali na stanju?', 'Najprodavanije', 'Novi komad'], returns: ['Koji povrati kasne?', 'Link forme za povrat'], customers: ['Najbolji kupci', 'Novi kod za popust'], posts: ['Objave ove nedelje', 'Nova ideja za objavu'], promos: ['Aktivne promocije', 'Nova promocija'], packaging: ['Šta fali od pakovanja?'], notes: ['Nova beleška'], ads: ['Potrošnja ovog meseca'], history: ['Vrati obrisano'] };
const bfold = (s) => ' ' + fold(s).replace(/[^a-z0-9#\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const bhas = (t, arr) => arr.some(w => t.includes(' ' + w));
const bstem = (w) => w.length > 6 ? w.slice(0, -2) : w.length > 4 ? w.slice(0, -1) : w;
const BOT_STOP = new Set('idi otvori otvoris vodi odvedi prebaci me mi na u do gde su je sekcija sekciju sekcije stranica stranicu prikazi pokazi hocu zelim daj molim te da vidim vidi pogledaj ajde hajde odi mozes li bi pa i a the'.split(' '));

const bpl = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
function botBtn(label, go) { return `<button class="bt-btn" data-bgo="${esc(go)}">${esc(label)}</button>`; }
function botTasks(t) {
  const me = who(), forK = Object.keys(PEOPLE).find(k => { if (k === me) return false; const st = fold(PEOPLE[k].name); return bhas(t, [st.slice(0, Math.max(4, st.length - 1))]); }) || me;
  const list = allTasks().filter(x => !x.done && x.as.includes(forK)).sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')));
  const nm = forK === me ? 'Tvoji' : `${personName(forK)}:`;
  if (!list.length) return botSay(`${forK === me ? 'Nemaš otvorenih zadataka.' : personName(forK) + ' nema otvorenih zadataka.'} 👌`, [['Taskovi', 'tab:tasks'], ['Nov zadatak', 'act:Nov zadatak']]);
  const late = list.filter(x => dueInfo(x.due)?.level === 'late').length;
  botSay(`<div class="bt-cap" style="margin-bottom:6px">${nm} ${list.length} ${bpl(list.length, 'otvoren zadatak', 'otvorena zadatka', 'otvorenih zadataka')}${late ? `, <span class="bt-red">${late} kasni</span>` : ''}</div><div class="bt-list">${list.slice(0, 8).map(x => { const d = dueInfo(x.due); return botItem(esc(tcut(x.x.task_note && x.src.k !== 'note' ? x.x.task_note : x.src.title(x.x), 60)), `${esc(x.sec)}${d ? ` · <span class="${d.level === 'late' ? 'bt-red' : d.level === 'today' ? 'bt-amber' : ''}">${d.txt}</span>` : ''}`, x.src.k === 'note' || x.src.k === 'story' ? 'tab:tasks' : 'ref:' + x.src.ref(x.x), x.src.ic); }).join('')}</div>`, [['Taskovi', 'tab:tasks'], ['Nov zadatak', 'act:Nov zadatak']]);
}
function botItem(title, sub, go, ic) { return `<button class="bt-item" data-bgo="${esc(go)}"><span class="bi-ic">${ic || '›'}</span><span class="bi-t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`; }
function botPush(from, html, btns) { BOT.msgs.push({ from, html, btns: btns || [], at: Date.now() }); botSave(); renderBot(); }
function botSay(html, btns) { botPush('bot', html, btns); }

function renderBot() {
  const box = $('botMsgs'); if (!box) return;
  box.innerHTML = BOT.msgs.map((m, i) => `<div class="bt-msg ${m.from}${m.ai ? ' ai' : ''}" ${i === BOT.msgs.length - 1 ? 'data-last="1"' : ''}>
      ${m.from === 'bot' ? '<span class="bt-av">H</span>' : ''}
      <div class="bt-bub${m.streaming ? ' streaming' : ''}">${m.html || (m.streaming ? '<div class="bt-typing"><i></i><i></i><i></i></div>' : '')}${m.btns?.length ? `<div class="bt-btns">${m.btns.map(b => botBtn(b[0], b[1])).join('')}</div>` : ''}</div></div>`).join('')
    + (BOT.typing ? '<div class="bt-msg bot"><span class="bt-av">H</span><div class="bt-bub bt-typing"><i></i><i></i><i></i></div></div>' : '');
  box.scrollTop = box.scrollHeight;
  const chips = (BOT_CHIPS[state.tab] || []).concat(['Kako radi ova sekcija?', 'Zapelo mi je']);
  $('botChips').innerHTML = [...new Set(chips)].slice(0, 5).map(c => `<button data-bsay="${esc(c)}">${esc(c)}</button>`).join('');
}
function openBot() {
  if (!state.user) return;
  closeNav(); closeCmd(); if (CHAT.open) closeChat();
  if (!BOT.msgs.length) botGreet();
  BOT.open = true; document.body.classList.add('bot-open'); renderBot(); renderBotHead();
  if (!AI.on && Date.now() - AI.checkedAt > 120000) aiPing();
  if (window.matchMedia('(min-width: 981px)').matches) setTimeout(() => $('botInput').focus(), 60);
}
function closeBot() { BOT.open = false; document.body.classList.remove('bot-open'); $('botInput').blur(); }
function botGreet() {
  const u = PEOPLE[who()], h = new Date().getHours();
  const hi = h < 11 ? 'Dobro jutro' : h < 18 ? 'Zdravo' : 'Dobro veče';
  if (AI.on) return botSay(`${hi}, ${esc(u ? u.voc : state.user.display)}! Znam sve iz CRM-a: porudžbine, kupce, zalihe, povrate, objave, promocije, beleške i brojke. Pitaj me bilo šta, pričaj slobodno, mogu i da te odvedem gde treba ili da zabeležim nešto za tim.`, [['Šta je hitno?', 'say:Šta je hitno?'], ['Kako stojimo ovog meseca?', 'ai:Kako stojimo ovog meseca?']]);
  botSay(`${hi}, ${esc(u ? u.voc : state.user.display)}! Ja sam asistent za CRM. Napiši gde hoćeš da odeš ili šta ti treba, npr. <i>„porudžbine“</i>, <i>„šta fali na stanju“</i>, <i>„prihod ove nedelje“</i>, <i>„zabeleži pozvati dobavljača“</i> ili <i>„kako da vratim obrisano“</i>.`,
    [['Šta je hitno?', 'say:Šta je hitno?'], ['Šta umeš?', 'say:Šta umeš?']]);
}
async function botAsk(raw, opts = {}) {
  raw = String(raw || '').trim(); if (!raw) return;
  BOT.msgs.push({ from: 'me', html: esc(raw), btns: [], at: Date.now(), txt: raw }); botSave();
  if (AI.on && !opts.local && !botLocalFirst(raw)) {
    renderBot();
    try { return await aiAsk(); }
    catch (e) {
      console.error('ai', e);
      const d = e.data || {};
      if (d.error === 'no_key') { AI.on = false; renderBotHead(); }
      const why = d.error === 'limit' ? `Dnevni limit AI pitanja (${d.limit}) je potrošen, do sutra odgovaram u osnovnom režimu.` : d.error === 'no_key' ? 'AI trenutno nije uključen, odgovaram u osnovnom režimu.' : 'AI trenutno ne odgovara, evo osnovnog odgovora.';
      BOT.msgs.push({ from: 'bot', html: `<div class="bt-note" style="margin:0">${why}</div>`, btns: [], at: Date.now(), txt: ' ' });
    }
  }
  BOT.typing = true; renderBot();
  await new Promise(r => setTimeout(r, 280 + Math.min(500, raw.length * 8)));
  BOT.typing = false;
  try { await botAnswer(raw); } catch (e) { console.error(e); botSay('Ups, nešto je puklo kod mene. Probaj ponovo ili pošalji pitanje timu.', [['Pošalji timu', 'team:' + raw]]); }
}

/* ---- odgovori iz podataka ---- */
function botPeriod(t) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const D = (d) => { const x = new Date(today); x.setDate(x.getDate() + d); return x; };
  const end = new Date(today.getTime() + 864e5 - 1), wd = (today.getDay() + 6) % 7;
  let m;
  if (bhas(t, ['juce', 'jucer'])) return { from: D(-1), to: new Date(today.getTime() - 1), label: 'juče', preset: '7' };
  if (bhas(t, ['danas'])) return { from: today, to: end, label: 'danas', preset: '7' };
  if (/prosl\w* (nedelj|sedmic)/.test(t)) return { from: D(-wd - 7), to: new Date(D(-wd).getTime() - 1), label: 'prošle nedelje', preset: '30' };
  if (/ (ove|ova|ovu|ovoj|ova) (nedelj|sedmic)|nedeljn/.test(t)) return { from: D(-wd), to: end, label: 'ove nedelje', preset: '7' };
  if (/prosl\w* mesec/.test(t)) return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(new Date(today.getFullYear(), today.getMonth(), 1).getTime() - 1), label: 'prošlog meseca', preset: 'lastmonth' };
  if (/ (ovog|ovaj|ovom|ovo) mesec|mesecn/.test(t)) return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: end, label: 'ovog meseca', preset: 'month' };
  if ((m = t.match(/ (\d{1,3}) ?(dan|d )/))) { const N = Math.max(1, +m[1]); return { from: D(-(N - 1)), to: end, label: `u poslednjih ${N} dana`, preset: N <= 7 ? '7' : N <= 30 ? '30' : '90' }; }
  if (bhas(t, ['godin'])) return { from: new Date(today.getFullYear(), 0, 1), to: end, label: 'ove godine', preset: '0' };
  if (bhas(t, ['ukupno', 'sve vreme', 'od pocetka', 'ikad', 'otkad'])) return { from: new Date(2000, 0, 1), to: end, label: 'od početka', preset: '0', all: true };
  return { from: D(-29), to: end, label: 'u poslednjih 30 dana', preset: '30' };
}
function botStats(from, to) {
  const inR = (iso) => { const d = new Date(iso); return d >= from && d <= to; };
  const os = state.orders.filter(o => !NO_REVENUE.includes(o.status) && inR(o.created_at));
  const T = os.map(totals);
  const rev = T.reduce((a, x) => a + x.revenue, 0), profit = T.reduce((a, x) => a + x.profit, 0), pieces = T.reduce((a, x) => a + x.pieces, 0);
  const ads = state.ads.filter(a => inR(a.day + 'T12:00:00')).reduce((a, x) => a + n(x.spend), 0);
  return { n: os.length, rev, profit, pieces, ads, net: profit - ads, basket: os.length ? rev / os.length : 0, rets: state.rets.filter(r => r.type !== 'feedback' && inR(r.created_at)).length };
}
function botDelta(cur, prev) { if (!prev) return ''; const d = cur / prev - 1; if (!isFinite(d)) return ''; const p = Math.round(d * 100); return ` <span class="bt-d ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span>`; }
function botMetric(t) {
  const P = botPeriod(t), S = botStats(P.from, P.to);
  const len = P.to - P.from + 1, prev = P.all ? null : botStats(new Date(P.from.getTime() - len), new Date(P.from.getTime() - 1));
  const M = bhas(t, ['neto']) ? 'net' : bhas(t, ['profit', 'zarad', 'dobit', 'marz']) ? 'profit' : bhas(t, ['reklam', 'potros', 'spend', 'budzet', 'roas']) ? 'ads' : bhas(t, ['korp', 'prosec']) ? 'basket' : bhas(t, ['komad', 'komada']) && bhas(t, ['prodat', 'prodal', 'prodaj']) ? 'sold' : bhas(t, ['porudzbin', 'narudzbin', 'koliko smo prodal', 'prodaj']) ? 'orders' : bhas(t, ['prihod', 'promet', 'uprihod', 'zaradil', 'para', 'novac', 'keš', 'kes']) ? 'revenue' : 'all';
  const row = (lbl, v, pv, isMoney) => `<div class="bt-kv"><span>${lbl}</span><b>${isMoney ? rsd(v) : v}${prev ? botDelta(v, pv) : ''}</b></div>`;
  const map = { revenue: ['Prihod', S.rev, prev?.rev, 1], profit: ['Bruto profit', S.profit, prev?.profit, 1], ads: ['Reklame', S.ads, prev?.ads, 1], net: ['Neto posle reklama', S.net, prev?.net, 1], basket: ['Prosečna korpa', S.basket, prev?.basket, 1], orders: ['Porudžbine', S.n, prev?.n, 0], sold: ['Prodato komada', S.pieces, prev?.pieces, 0] };
  const head = M !== 'all' ? `<div class="bt-big">${map[M][3] ? rsd(map[M][1]) : map[M][1]}${prev ? botDelta(map[M][1], map[M][2]) : ''}</div><div class="bt-cap">${map[M][0]} ${P.label}</div>` : `<div class="bt-cap" style="margin-bottom:6px">Brojke ${P.label}</div>`;
  const rest = ['revenue', 'orders', 'profit', 'ads', 'net'].filter(k => k !== M).map(k => row(...map[k])).join('');
  const roas = S.ads ? `<div class="bt-kv"><span>ROAS</span><b>${(S.rev / S.ads).toFixed(2).replace('.', ',')}</b></div>` : '';
  const key = M === 'all' ? 'revenue' : M === 'sold' ? 'sold' : M;
  botSay(`${head}<div class="bt-kvs">${rest}${roas}</div>${prev && /bt-d/.test(head + rest) ? '<div class="bt-note">▲▼ u odnosu na isti broj dana pre toga</div>' : ''}${!S.n && !S.ads ? '<div class="bt-note">Za ovaj period još nema unetih porudžbina.</div>' : ''}`,
    [['Otvori grafikon', `metric:${key}:${P.preset}`], ['Pregled', 'tab:overview']]);
}
function botUrgent() {
  const lines = [];
  const todo = state.orders.filter(o => TODO.includes(o.status));
  if (todo.length) { const c = (s) => todo.filter(o => o.status === s).length; lines.push(botItem(`${todo.length} ${bpl(todo.length, 'porudžbina čeka', 'porudžbine čekaju', 'porudžbina čeka')} obradu`, [c('new') && `nove: ${c('new')}`, c('confirmed') && `potvrđene: ${c('confirmed')}`, c('packed') && `spakovane, za slanje: ${c('packed')}`].filter(Boolean).join(' · '), 'oview:pipeline', '◫')); }
  const open = state.rets.filter(r => !retClosed(r) && r.type !== 'feedback');
  const late = open.filter(r => retDue(r)?.level === 'late'), soon = open.filter(r => retDue(r)?.level === 'soon'), fresh = state.rets.filter(r => r.status === 'new');
  if (late.length || soon.length || fresh.length) lines.push(botItem(`Povrati: ${[late.length && `${late.length} kasni`, soon.length && `${soon.length} ističe uskoro`, fresh.length && `${fresh.length} ${bpl(fresh.length, 'nova prijava', 'nove prijave', 'novih prijava')}`].filter(Boolean).join(', ')}`, 'Zakonski rok: 8 dana odgovor, 14 dana povrat novca', late.length ? 'say:Koji povrati kasne?' : 'tab:returns', '↩'));
  const al = stockAlerts();
  if (al.length) { const out = al.filter(x => x.v.stock <= 0).length; lines.push(botItem(`${al.length} ${bpl(al.length, 'veličina', 'veličine', 'veličina')} pri kraju zaliha`, out ? `${out} rasprodato` : 'vreme za dopunu', 'say:Šta fali na stanju?', '▤')); }
  const pa = packAlerts();
  if (pa.length) lines.push(botItem(`Pakovanje: ${pa.length} ispod minimuma`, pa.slice(0, 3).map(x => esc(x.name)).join(', '), 'say:Šta fali od pakovanja?', '▣'));
  const tom = new Date(); tom.setHours(23, 59, 59, 999); tom.setDate(tom.getDate() + 1);
  const pl = state.posts.filter(p => p.publish_at && p.status !== 'published');
  const lateP = pl.filter(p => new Date(p.publish_at) < new Date(new Date().setHours(0, 0, 0, 0))), nextP = pl.filter(p => { const d = new Date(p.publish_at); return d >= new Date(new Date().setHours(0, 0, 0, 0)) && d <= tom; });
  if (lateP.length || nextP.length) lines.push(botItem(`Objave: ${[nextP.length && `${nextP.length} danas/sutra`, lateP.length && `${lateP.length} kasni`].filter(Boolean).join(', ')}`, nextP.slice(0, 2).map(p => esc(p.title)).join(', '), 'say:Objave ove nedelje', '▶'));
  const pins = state.notes.filter(x => x.pinned && !x.done);
  if (pins.length) lines.push(botItem(`${pins.length} ${bpl(pins.length, 'zakačena beleška', 'zakačene beleške', 'zakačenih beleški')}`, esc(pins[0].body.slice(0, 60)), 'tab:notes', '📌'));
  const chg = state.nfState ? CHG_TABS.reduce((a, t) => a + chgUnread(t), 0) : 0;
  if (chg) lines.push(botItem(`${chg} ${bpl(chg, 'tuđa promena koju', 'tuđe promene koje', 'tuđih promena koje')} nisi ${PEOPLE[who()]?.f ? 'videla' : 'video'}`, 'crveni brojevi u meniju', 'say:Šta je novo?', '●'));
  if (!lines.length) return botSay('Sve je čisto. Nema porudžbina za obradu, povrata sa rokom ni upozorenja za zalihe. ✨', [['Prihod ovog meseca', 'say:Prihod ovog meseca']]);
  botSay(`<div class="bt-cap" style="margin-bottom:6px">Ovo traži pažnju:</div><div class="bt-list">${lines.join('')}</div>`);
}
function botStock() {
  const al = stockAlerts();
  if (!al.length) return botSay(`Sve veličine imaju više od ${lowT()} kom. Nema upozorenja.`, [['Garderoba', 'tab:products']]);
  botSay(`<div class="bt-cap" style="margin-bottom:6px">${al.length} ${bpl(al.length, 'veličina', 'veličine', 'veličina')} pri kraju (granica ≤ ${lowT()} kom):</div><div class="bt-list">${al.slice(0, 8).map(({ p, v }) => botItem(`${esc(p.name)} · ${esc(v.size)}${v.color ? ' ' + esc(v.color) : ''}`, v.stock <= 0 ? '<span class="bt-red">rasprodato</span>' : `ostalo ${v.stock} kom${p.supplier ? ' · ' + esc(p.supplier) : ''}`, 'ref:product:' + p.id, v.stock <= 0 ? '!' : v.stock)).join('')}</div>${al.length > 8 ? `<div class="bt-note">i još ${al.length - 8}…</div>` : ''}`, [['Sva upozorenja', 'tab:products']]);
}
function botPack() {
  const pa = packAlerts();
  if (!pa.length) return botSay('Pakovanja ima dovoljno, ništa nije ispod minimuma.', [['Pakovanje', 'tab:packaging']]);
  botSay(`<div class="bt-list">${pa.map(x => botItem(esc(x.name), x.stock <= 0 ? '<span class="bt-red">nema na stanju</span>' : `ostalo ${x.stock} (min ${x.min_stock})${x.supplier ? ' · ' + esc(x.supplier) : ''}`, 'ref:pack:' + x.id, '▣')).join('')}</div>`, [['Pakovanje', 'tab:packaging']]);
}
function botReturns(t) {
  const open = state.rets.filter(r => !retClosed(r) && r.type !== 'feedback').sort((a, b) => (retDue(a)?.days ?? 99) - (retDue(b)?.days ?? 99));
  if (!open.length) return botSay('Nema otvorenih povrata ni reklamacija. 👌', [['Povrati', 'tab:returns'], ['Kopiraj link forme', 'copyform']]);
  const late = open.filter(r => retDue(r)?.level === 'late').length;
  botSay(`${t && bhas(t, ['kasn']) && !late ? '<div style="margin-bottom:8px">Nijedan povrat ne kasni ✓</div>' : ''}<div class="bt-cap" style="margin-bottom:6px">${open.length} ${bpl(open.length, 'otvoren slučaj', 'otvorena slučaja', 'otvorenih slučajeva')}${late ? `, <span class="bt-red">${late} kasni</span>` : ''}:</div><div class="bt-list">${open.slice(0, 7).map(r => { const d = retDue(r); return botItem(`${esc(r.case_no)} · ${esc(r.customer_name)}`, `${RT[r.type]} · ${ST[r.status] || r.status}${d ? ` · <span class="${d.level === 'late' ? 'bt-red' : d.level === 'soon' ? 'bt-amber' : ''}">${dueText(d)}</span>` : ''}`, 'ref:ret:' + r.id, '↩'); }).join('')}</div>`, [['Povrati', 'tab:returns']]);
}
function botPosts(t) {
  const P = bhas(t, ['danas']) ? botPeriod(t) : (() => { const f = new Date(); f.setHours(0, 0, 0, 0); const e = new Date(f); e.setDate(e.getDate() + 7); e.setMilliseconds(-1); return { from: f, to: e, label: 'u narednih 7 dana' }; })();
  const list = state.posts.filter(p => p.publish_at && new Date(p.publish_at) >= P.from && new Date(p.publish_at) <= P.to).sort((a, b) => a.publish_at.localeCompare(b.publish_at));
  const late = state.posts.filter(p => p.publish_at && p.status !== 'published' && new Date(p.publish_at) < new Date(new Date().setHours(0, 0, 0, 0)));
  const noDate = state.posts.filter(p => !p.publish_at && p.status !== 'published').length;
  const items = late.map(p => botItem(esc(p.title), `<span class="bt-red">kasni · ${fmtDate(p.publish_at)}</span> · ${ST[p.status]}`, 'ref:post:' + p.id, '!')).concat(list.map(p => botItem(esc(p.title), `${fmtDT(p.publish_at)} · ${ST[p.status]}${p.format ? ' · ' + (FMT[p.format] || '') : ''}`, 'ref:post:' + p.id, '▶')));
  if (!items.length) return botSay(`Nema zakazanih objava ${P.label}.${noDate ? ` Imaš ${noDate} ideja bez datuma.` : ''}`, [['Nova ideja za objavu', 'act:Nova ideja za objavu'], ['Kalendar', 'pview:calendar']]);
  botSay(`${bhas(t, ['kasn']) && !late.length ? '<div style="margin-bottom:8px">Nijedna objava ne kasni ✓</div>' : ''}<div class="bt-cap" style="margin-bottom:6px">Objave ${P.label}:</div><div class="bt-list">${items.slice(0, 8).join('')}</div>${noDate ? `<div class="bt-note">${noDate} ${bpl(noDate, 'ideja još nema', 'ideje još nemaju', 'ideja još nema')} datum.</div>` : ''}`, [['Kalendar', 'pview:calendar']]);
}
function botPromos() {
  const act = state.promos.filter(p => promoStatus(p) === 'active'), plan = state.promos.filter(p => promoStatus(p) === 'planned');
  if (!act.length && !plan.length) return botSay('Trenutno nema aktivnih ni zakazanih promocija.', [['Nova promocija', 'act:Nova promocija'], ['Istorija promocija', 'tab:promos']]);
  botSay(`<div class="bt-list">${act.map(p => botItem(esc(p.name), `aktivna do ${p.ends_at ? fmtDate(p.ends_at) : 'daljnjeg'}${p.code ? ' · kod ' + esc(p.code) : ''}`, 'ref:promo:' + p.id, '％')).concat(plan.map(p => botItem(esc(p.name), `počinje ${fmtDate(p.starts_at)}${p.code ? ' · kod ' + esc(p.code) : ''}`, 'ref:promo:' + p.id, '◷'))).join('')}</div>`, [['Promocije', 'tab:promos']]);
}
function botTopCustomers() {
  const list = state.customers.map(c => ({ c, s: custStats(c) })).filter(x => x.s.count > 0).sort((a, b) => b.s.spend - a.s.spend).slice(0, 6);
  if (!list.length) return botSay('Još nema kupaca sa porudžbinama.', [['Kupci', 'tab:customers']]);
  botSay(`<div class="bt-cap" style="margin-bottom:6px">Najbolji kupci po potrošnji:</div><div class="bt-list">${list.map((x, i) => botItem(esc(x.c.name), `${rsd(x.s.spend)} · ${x.s.count} ${bpl(x.s.count, 'kupovina', 'kupovine', 'kupovina')}${x.s.tier ? ' · ' + esc(x.s.tier.name) : ''}`, 'ref:cust:' + x.c.id, i + 1)).join('')}</div>`, [['Loyalty klub', 'cview:club']]);
}
function botBest(t) {
  const P = botPeriod(t), agg = {};
  state.items.forEach(i => { const o = order(i.order_id); if (!o || NO_REVENUE.includes(o.status)) return; const d = new Date(o.created_at); if (d < P.from || d > P.to) return; const pid = i.product_id || variant(i.variant_id)?.product_id; if (!pid) return; (agg[pid] = agg[pid] || { q: 0, r: 0 }); agg[pid].q += i.qty; agg[pid].r += i.qty * n(i.unit_price); });
  const list = Object.entries(agg).sort((a, b) => b[1].q - a[1].q).slice(0, 6);
  if (!list.length) return botSay(`Nema prodaje ${P.label}.`, [['Garderoba', 'tab:products']]);
  botSay(`<div class="bt-cap" style="margin-bottom:6px">Najprodavanije ${P.label}:</div><div class="bt-list">${list.map(([pid, v], i) => botItem(esc(product(pid)?.name || 'komad'), `${v.q} kom · ${rsd(v.r)}`, 'ref:product:' + pid, i + 1)).join('')}</div>`);
}
function botChanges() {
  const rows = state.audit.filter(a => chgCounts(a)).sort((a, b) => b.id - a.id).map(a => ({ a, d: describeAudit(a) })).filter(x => x.d).slice(0, 8);
  if (!rows.length) return botSay('Niko drugi još nije ništa menjao u poslednje vreme.', [['Istorija promena', 'bell:history']]);
  botSay(`<div class="bt-cap" style="margin-bottom:6px">Poslednje tuđe promene:</div><div class="bt-list">${rows.map(x => { const p = PEOPLE[x.a.actor]; return botItem(`${esc(p ? p.name : 'Forma')}`, `${x.d.text} · ${relTime(x.a.at)}`, x.d.open ? 'open:' + x.d.open : 'bell:history', `<span class="n-av ${p ? x.a.actor : 'system'}">${esc((p ? p.name : 'F').charAt(0))}</span>`); }).join('')}</div>`, [['Sve promene', 'bell:history']]);
}
function botSections(t) {
  const words = t.trim().split(' ').filter(w => w.length >= 3 && !BOT_STOP.has(w));
  let best = null;
  SECTIONS.forEach(s => {
    const nm = fold(s.name).split(/\s+/), kw = fold(s.kw).split(/\s+/);
    let sc = 0;
    words.forEach(w => { const st = bstem(w); const hit = (x) => x === w || (st.length >= 4 && (x.startsWith(st) || (x.length >= 4 && st.startsWith(x)))); if (nm.some(hit)) sc += 3; else if (kw.some(hit)) sc += 1; });
    if (sc && (!best || sc > best.sc)) best = { s, sc };
  });
  return best;
}
function botFaq(t) {
  let best = null;
  BOT_FAQ.forEach((f, i) => { if (f.g.every(gr => bhas(t, gr))) { const sc = f.g.length * 10 - i * 0.01; if (!best || sc > best.sc) best = { f, sc }; } });
  return best?.f;
}
function botSearch(raw) {
  const qs = fold(raw).replace(/\b(nadji|pronadji|trazi|potrazi|gde je|gde su|pokazi|otvori|kupca|kupac|kupcu|porudzbinu|porudzbina|porudzbine|komad|proizvod|mi|molim)\b/g, ' ').replace(/[?!.,:#]/g, ' ').replace(/\s+/g, ' ').trim();
  if (qs.length < 2) return [];
  let res = cmdItems(qs).filter(x => !['Sekcije', 'Akcije', 'Filter', 'Nedavno'].includes(x.grp) && x.score >= 20);
  if (!res.length) qs.split(' ').filter(w => w.length >= 3).forEach(w => { res = res.concat(cmdItems(w).filter(x => !['Sekcije', 'Akcije', 'Filter', 'Nedavno'].includes(x.grp) && x.score >= 40)); });
  const seen = new Set(); return res.filter(x => { const k = x.k + x.id; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
}
const BOT_NEW = [
  [['porudzbin', 'narudzbin', 'order'], 'Nova porudžbina'], [['kupc', 'kupac', 'klijent'], 'Novi kupac'], [['kod', 'kupon', 'popust'], 'Novi kod za popust'],
  [['komad', 'proizvod', 'artik', 'garderob', 'haljin', 'majic', 'suknj', 'pantalon'], 'Novi komad'], [['objav', 'reel', 'post', 'video', 'tiktok'], 'Nova ideja za objavu'],
  [['promocij', 'akcij', 'kampanj'], 'Nova promocija'], [['povrat', 'reklamac', 'zamen'], 'Nova prijava povrata (ručno)'], [['predlog za sajt', 'sajt'], 'Novi predlog za sajt'],
  [['pakovanj', 'ambalaz', 'kutij'], 'Novi predlog za pakovanje'], [['dogadja', 'istorij', 'prekretnic', 'milestone'], 'Zabeleži događaj u istoriji'], [['beles', 'note'], 'Nova beleška'],
];
async function botAnswer(raw) {
  const t = bfold(raw);
  const isHow = /^ (kako|gde|sta znac\w*|zasto|objasni|uputstv|help|pomoc za|mogu li|moze li|jel moze|jel mogu|je l) /.test(t) || / (kako da|kako se|kako mogu|ne mogu|ne znam|ne radi|zapel|zaglav|gde se|gde da) /.test(t) || /\?\s*$/.test(raw) && / (kako|gde|zasto) /.test(t);
  let m;
  // pozdrav / zahvalnost
  if (/^ (cao|zdravo|hej|pozdrav|dobro jutro|dobar dan|dobro vece|hello|hi|e) $/.test(t)) return botGreet();
  if (/^ (hvala|hvala ti|super|top|odlicno|ok|okej|u redu|vazi|bravo)( puno| ti)? $/.test(t)) return botSay('Nema na čemu! Tu sam kad zatreba. 🙂');
  // brza beleška
  if ((m = raw.match(/^\s*(zabele[zž]i|zapi[sš]i|podseti( nas| me)?|bele[sš]ka\s*:|note\s*:)\s*[:\-–]?\s*([\s\S]{2,})$/i))) return botNote(m[3].trim());
  if (/^ (zabelezi|zapisi|beleska|nova beleska) $/.test(t)) return botRun('act:Nova beleška', 'Otvorio sam brzu belešku.');
  // pitanje timu
  if ((m = raw.match(/^\s*(pitaj tim|poruka timu|javi timu|pitanje za tim|pitaj ostale)\s*[:\-–]?\s*([\s\S]{2,})$/i))) return botTeam(m[2].trim());
  if (/^ (zapelo mi je|zapeo sam|zapela sam|zaglavio sam|zaglavila sam|treba mi pomoc|pomozi|ne znam sta da radim) $/.test(t)) return botSay('Nema frke. Napiši mi šta pokušavaš da uradiš (npr. <i>„kako da vratim obrisano“</i> ili <i>„ne radi dugme sačuvaj“</i>) i vodiću te. Ako je nešto pokvareno, napiši <i>„pitaj tim: …“</i> i poslaću poruku svima kao belešku.', [['Kako radi ova sekcija?', 'say:Kako radi ova sekcija?'], ['Ne radi mi nešto', 'say:Ne radi mi nešto']]);
  // šta umeš
  if (/^ (pomoc|help|sta umes|sta znas|sta mozes|sta sve umes|sta sve mozes|komande|\?) $/.test(t)) return botSay(`<div class="bt-cap" style="margin-bottom:6px">Evo šta umem:</div><ul class="bt-ul"><li><b>Vodim te</b> bilo gde: <i>„povrati“, „loyalty klub“, „arhiva“</i></li><li><b>Otvaram forme</b>: <i>„nova porudžbina“, „dodaj kupca“, „nova promocija“</i></li><li><b>Pišem beleške odmah</b>: <i>„zabeleži naručiti kutije“</i></li><li><b>Brojke</b>: <i>„prihod ove nedelje“, „profit prošlog meseca“, „koliko porudžbina danas“</i></li><li><b>Stanje</b>: <i>„šta je hitno“, „šta fali na stanju“, „koji povrati kasne“, „objave ove nedelje“, „najbolji kupci“, „najprodavanije“, „šta je novo“</i></li><li><b>Tražim</b>: ime kupca, broj porudžbine, naziv komada</li><li><b>Pomoć</b>: <i>„kako da…“</i>, a ako zapne, <i>„pitaj tim: …“</i></li></ul>`);
  // pomoć za sekciju
  if (bhas(t, ['kako radi ova', 'ova sekcija', 'ovoj sekciji', 'ovde radi', 'sta je ovo', 'sta ovde'])) { const s = SECTIONS.find(x => x.tab === state.tab); return botSay(`<div class="bt-cap">${esc(s?.name || '')}</div>${BOT_TIPS[state.tab] || ''}`, (BOT_CHIPS[state.tab] || []).slice(0, 2).map(c => [c, 'say:' + c])); }
  // linkovi
  if (bhas(t, ['link'])) { if (bhas(t, ['povrat', 'form', 'reklamac'])) return botRun('copyform', `Link forme za povrate je kopiran:<br><span class="bt-code">${esc(FORM_URL())}</span>`, [['Otvori formu', 'openform']]); if (bhas(t, ['sajt', 'shop'])) return botSay(`Link sajta: <a href="${esc(siteUrl())}" target="_blank" rel="noopener">${esc(siteUrl().replace(/^https?:\/\//, ''))}</a>`, [['Sajt sekcija', 'tab:site']]); }
  // uputstva
  if (isHow) { const f = botFaq(t); if (f) return botSay(f.a, f.b.map(b => b[1] === 'teamlast' ? [b[0], 'team:' + raw] : b)); }
  // podaci
  const metricWords = ['prihod', 'promet', 'profit', 'zarad', 'dobit', 'neto', 'roas', 'korp', 'koliko smo', 'kako idemo', 'kako stojimo', 'brojk', 'statistik', 'prodali', 'prodaja', 'potrosil', 'potrosnj', 'spend', 'budzet'];
  const newVerb = /^ (nov|nova|novi|novu|dodaj|dodati|unesi|napravi|kreiraj|ubaci|upisi) /.test(t) || / (hocu da dodam|da dodam|da unesem|da napravim) /.test(t);
  if (!newVerb && (bhas(t, metricWords) || (bhas(t, ['koliko']) && bhas(t, ['porudzbin', 'narudzbin', 'komada', 'prodat', 'reklam'])))) return botMetric(t);
  if (bhas(t, ['sta je novo', 'ima novo', 'nesto novo', 'novosti', 'ko je menja', 'ko je sta', 'sta se desilo'])) return botChanges();
  if (bhas(t, ['task', 'zadat', 'zaduz', 'dodeljen', 'sta mi je ostalo', 'sta moram', 'moje obaveze', 'sta je ostalo da'])) return botTasks(t);
  if (bhas(t, ['hitno', 'sta treba da', 'sta imam', 'sta ima', 'obavez', 'todo', 'to do', 'plan za danas', 'pregled dana', 'rezime', 'sazetak', 'sta ceka', 'ceka obradu', 'za obradu', 'sta je danas'])) return botUrgent();
  if (!newVerb && bhas(t, ['pakovanj', 'ambalaz', 'kutij', 'stiker']) && bhas(t, ['fali', 'nestaj', 'nema', 'malo', 'ostalo', 'zalih', 'stanj', 'minimum', 'naruc'])) return botPack();
  if (!newVerb && bhas(t, ['fali', 'nestaj', 'pri kraju', 'rasprod', 'dopun', 'zalih', 'stanje', 'na stanju', 'nema na', 'malo robe'])) return botStock();
  if (!newVerb && bhas(t, ['povrat', 'reklamac', 'zamen', 'zalb']) && bhas(t, ['kasn', 'otvor', 'koliko', 'ima', 'status', 'rok', 'koji', 'koje', 'sta je sa', 'cek'])) return botReturns(t);
  if (!newVerb && bhas(t, ['objav', 'reel', 'post', 'sadrzaj', 'snimanj', 'tiktok']) && bhas(t, ['danas', 'sutra', 'nedelj', 'zakazan', 'kasn', 'sledec', 'koje', 'sta ', 'kad', 'uskoro', 'narednih'])) return botPosts(t);
  if (!newVerb && bhas(t, ['promocij', 'akcij']) && bhas(t, ['aktivn', 'traje', 'koje', 'sta ', 'ima', 'trenutn', 'sad'])) return botPromos();
  if (bhas(t, ['najbolj', 'top ', 'najvis', 'najvern', 'najcesc']) && bhas(t, ['kupc', 'kupac', 'kupil', 'klijent', 'musterij'])) return botTopCustomers();
  if (bhas(t, ['najprodavan', 'najvise prod', 'sta se prodaje', 'sta se najvise', 'bestseler', 'hit ', 'top komad', 'top proizvod'])) return botBest(t);
  if (bhas(t, ['sta je novo', 'promen', 'ko je menja', 'ko je sta', 'izmen', 'novosti', 'sta se desava', 'sta se desilo'])) return botChanges();
  // arhiva, pretraga, odjava
  if (bhas(t, ['arhiv', 'vrati obrisan', 'obrisan'])) return botRun('archive', 'Otvorio sam arhivu obrisanog. Klikni <b>Vrati</b> pored stavke.');
  if (/^ (pretraga|trazi|search|ctrl k) $/.test(t)) return botRun('cmd', 'Otvorio sam pretragu.');
  if (/^ (odjavi me|odjava|logout|izloguj me) $/.test(t)) return botSay('Sigurno hoćeš da se odjaviš?', [['Da, odjavi me', 'logout']]);
  if (bhas(t, ['otvori sajt', 'shopify'])) return botRun('site', 'Otvorio sam HARIZMA sajt u novom tabu.');
  // nova stavka
  if (newVerb) { const hit = BOT_NEW.find(([ws]) => bhas(t, ws)); if (hit) return botRun('act:' + hit[1], `Otvorio sam: <b>${esc(hit[1])}</b>.`); }
  // posebni pogledi
  if (bhas(t, ['loyalty', 'klub', 'poeni', 'nivoi'])) return botRun('cview:club', 'Evo Loyalty kluba.');
  if (bhas(t, ['popusti', 'kodovi', 'kupon'])) return botRun('cview:codes', 'Evo kodova za popust.');
  if (bhas(t, ['kalendar'])) return botRun('pview:calendar', 'Evo kalendara objava.');
  if (bhas(t, ['pipeline'])) return botRun('oview:pipeline', 'Evo pipeline pogleda porudžbina.');
  if (bhas(t, ['sta da popravimo', 'utisci', 'feedback'])) return botRun('rview:insights', 'Evo šta kupci kažu i šta da popravimo.');
  // broj porudžbine / slučaja
  if ((m = raw.match(/#?\s*([A-Za-z]{0,3}-?\d{3,})/))) { const r = botSearch(m[1]); if (r.length === 1) return botRun(`ref:${r[0].k}:${r[0].id}`, `Otvaram <b>${esc(r[0].title)}</b>.`); if (r.length) return botSay(`<div class="bt-list">${r.map(x => botItem(esc(x.title), esc(x.sub || ''), `ref:${x.k}:${x.id}`, x.ic)).join('')}</div>`); }
  // sekcije
  const sec = botSections(t);
  const res = botSearch(raw);
  if (sec && (sec.sc >= 3 || !res.length)) {
    const tip = BOT_TIPS[sec.s.tab];
    botRun('tab:' + sec.s.tab, null);
    return botSay(`Otvorio sam sekciju <b>${esc(sec.s.name)}</b>.${tip ? `<div class="bt-note">${tip}</div>` : ''}`, (BOT_CHIPS[sec.s.tab] || []).slice(0, 2).map(c => [c, 'say:' + c]));
  }
  if (res.length) return botSay(`<div class="bt-cap" style="margin-bottom:6px">Našao sam:</div><div class="bt-list">${res.map(x => botItem(esc(x.title), esc(x.sub || ''), `ref:${x.k}:${x.id}`, x.ic)).join('')}</div>`);
  const f = botFaq(t); if (f) return botSay(f.a, f.b.map(b => b[1] === 'teamlast' ? [b[0], 'team:' + raw] : b));
  botSay('Nisam siguran šta tražiš. Probaj ime sekcije, ime kupca, broj porudžbine ili pitanje tipa <i>„kako da…“</i>. Ako je nešto zapelo, pošalji pitanje timu.', [['Šta umeš?', 'say:Šta umeš?'], ['Pošalji pitanje timu', 'team:' + raw]]);
}

/* ---- akcije ---- */
async function botNote(body) {
  try {
    const r = await q(sb.from('h_notes').insert({ area: 'general', author: who(), body, pinned: false }).select().single());
    state.notes.push(r); renderAll();
    botSay(`Zabeleženo za ceo tim ✓<div class="bt-quote">${esc(body)}</div>`, [['Poništi', 'undonote:' + r.id], ['Zakači 📌', 'pinnote:' + r.id], ['Beleške', 'tab:notes']]);
  } catch (e) { botSay('Nisam uspeo da sačuvam belešku: ' + esc(e.message || e)); }
}
async function botTeam(text) {
  try {
    const r = await q(sb.from('h_notes').insert({ area: 'general', author: who(), body: '❓ Zapelo: ' + text, pinned: true }).select().single());
    state.notes.push(r); renderAll();
    botSay('Poslato timu ✓ Pitanje je zakačeno u Beleškama i svi dobijaju obaveštenje.', [['Beleške', 'tab:notes'], ['Poništi', 'undonote:' + r.id]]);
  } catch (e) { botSay('Nisam uspeo da pošaljem: ' + esc(e.message || e)); }
}
const botMobile = () => window.matchMedia('(max-width: 980px)').matches;
function botView(segId, view, tab) { if (state.tab !== tab) setTab(tab); const b = document.querySelector(`#${segId} [data-view="${view}"]`); if (b) b.click(); }
async function botRun(go, reply, btns) {
  const [k, ...rest] = go.split(':'); const arg = rest.join(':');
  if (k === 'say') { if (!BOT.open) openBot(); return botAsk(arg, { local: true }); }
  if (k === 'ai') { if (!BOT.open) openBot(); return botAsk(arg); }
  const modal = ['act', 'ref', 'open', 'metric', 'bell', 'cmd', 'logout'].includes(k);
  const nav = ['tab', 'cview', 'oview', 'pview', 'rview', 'archive'].includes(k);
  if (modal || (nav && botMobile())) closeBot();
  if (k === 'tab') setTab(arg);
  else if (k === 'act') { const a = ACTIONS.find(x => x.name === arg); if (a) await a.run(); }
  else if (k === 'ref' || k === 'open') {
    if (arg.startsWith('tab:')) setTab(arg.slice(4));
    else { const [rk, id] = arg.split(':'); if (BOT_TAB_FOR[rk] && state.tab !== BOT_TAB_FOR[rk]) setTab(BOT_TAB_FOR[rk]); if (rk === 'cust') openCustModal(id); else if (rk === 'code') openCodeModal(id); else openRef(arg); }
  }
  else if (k === 'metric') { const [mk, pr] = arg.split(':'); openMetric(mk, pr); }
  else if (k === 'cview') botView('custViewSeg', arg, 'customers');
  else if (k === 'oview') botView('orderViewSeg', arg, 'orders');
  else if (k === 'pview') botView('postViewSeg', arg, 'posts');
  else if (k === 'rview') botView('retViewSeg', arg, 'returns');
  else if (k === 'archive') { setTab('history'); showArchive(); }
  else if (k === 'bell') nfMenu(arg);
  else if (k === 'cmd') openCmd();
  else if (k === 'site') window.open(siteUrl(), '_blank');
  else if (k === 'openform') window.open(FORM_URL(), '_blank');
  else if (k === 'copyform') { try { await navigator.clipboard.writeText(FORM_URL()); toast('Link kopiran ✓'); } catch (e) { prompt('Kopiraj:', FORM_URL()); } }
  else if (k === 'logout') { await sb.auth.signOut(); location.reload(); }
  else if (k === 'team') return botTeam(arg);
  else if (k === 'undonote') { try { await softDelete('h_notes', arg); state.notes = state.notes.filter(x => x.id !== arg); renderAll(); botSay('Beleška je povučena.'); } catch (e) { fail(e); } return; }
  else if (k === 'pinnote') { try { await q(sb.from('h_notes').update({ pinned: true }).eq('id', arg)); const x = state.notes.find(y => y.id === arg); if (x) x.pinned = true; renderAll(); botSay('Zakačeno na vrh 📌'); } catch (e) { fail(e); } return; }
  if (reply) botSay(reply, btns);
}
function botBind() {
  $('botFab').addEventListener('click', () => BOT.open ? closeBot() : openBot());
  $('botClose').addEventListener('click', closeBot);
  $('botOv').addEventListener('click', closeBot);
  $('botClear').addEventListener('click', () => { BOT.msgs = []; botGreet(); });
  $('botForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('botInput').value; $('botInput').value = ''; botAsk(v); });
  $('botPanel').addEventListener('click', (e) => {
    const g = e.target.closest('[data-bgo]'); if (g) { e.stopPropagation(); return botRun(g.dataset.bgo); }
    const s = e.target.closest('[data-bsay]'); if (s) { e.stopPropagation(); return botAsk(s.dataset.bsay, { local: true }); }
  });
  $('botInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeBot(); } });
  document.addEventListener('keydown', (e) => {
    if (!state.user || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === '?') { e.preventDefault(); BOT.open ? closeBot() : openBot(); }
    else if (e.key === 'Escape' && BOT.open) closeBot();
  });
  ACTIONS.push({ name: 'Asistent (pomoć i prečice)', kw: 'chat bot pomoc help asistent', ic: '✦', run: () => openBot() });
}
function botStart() { botLoad(); document.body.classList.add('bot-ready'); aiPing(); }

/* ---------- ASISTENT: AI režim (Claude preko Supabase funkcije crm-ai) ---------- */
const AI = { on: false, model: '', checkedAt: 0, spend: null };
const AI_URL = () => SUPABASE_URL + '/functions/v1/crm-ai';
async function aiHeaders() { const { data } = await sb.auth.getSession(); const t = data.session?.access_token; if (!t) throw new Error('auth'); return { Authorization: 'Bearer ' + t, apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' }; }
async function aiPing() {
  AI.checkedAt = Date.now();
  try { const r = await fetch(AI_URL(), { method: 'POST', headers: await aiHeaders(), body: '{"ping":1}' }); const d = await r.json(); AI.on = !!d.configured; AI.model = d.model || ''; }
  catch (e) { AI.on = false; }
  try {
    const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const rows = await q(sb.from('h_ai_log').select('username,cost_usd').gte('at', from));
    AI.spend = { n: rows.length, usd: rows.reduce((a, x) => a + n(x.cost_usd), 0), mine: rows.filter(x => x.username === who()).length };
  } catch (e) { AI.spend = null; }
  renderBotHead();
}
function renderBotHead() {
  const el = $('botSub'); if (!el) return;
  el.textContent = AI.on ? 'AI · zna ceo CRM i posao' : 'prečice i pomoć za CRM';
  $('botPanel').classList.toggle('ai-on', AI.on);
  $('botInput').placeholder = AI.on ? 'Pitaj bilo šta ili reci gde ideš…' : 'Gde ideš ili šta ti treba…';
}
const plain = (html) => { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(div|li|p)>/g, '\n'); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };

/* snimak svih podataka za AI (kompaktan tekst) */
function aiSnapshot() {
  const L = [];
  const cell = (x) => (x == null || x === '' ? '-' : String(x).replace(/\s+/g, ' ').replace(/\|/g, '/').trim());
  const row = (...a) => L.push(a.map(cell).join('|'));
  const d = (iso) => (iso ? dayStr(new Date(iso)) : '-');
  const dt = (iso) => (iso ? `${dayStr(new Date(iso))} ${new Date(iso).toTimeString().slice(0, 5)}` : '-');
  const cut = (s, k) => { s = String(s || ''); return s.length > k ? s.slice(0, k) + '…' : s; };
  const R = (v) => Math.round(n(v));
  L.push('## BROJKE (RSD, bez otkazanih i vraćenih porudžbina)');
  [['Danas', ' danas '], ['Juče', ' juce '], ['Ova nedelja', ' ove nedelje '], ['Prošla nedelja', ' prosle nedelje '], ['Ovaj mesec', ' ovog meseca '], ['Prošli mesec', ' proslog meseca '], ['Poslednjih 30 dana', ' 30 dana '], ['Poslednjih 90 dana', ' 90 dana '], ['Ukupno', ' ukupno ']].forEach(([lbl, k]) => {
    const P = botPeriod(k), S = botStats(P.from, P.to);
    L.push(`${lbl}${P.all ? '' : ` (od ${dayStr(P.from)})`}: prihod ${R(S.rev)}, bruto profit ${R(S.profit)}, porudžbine ${S.n}, komada ${S.pieces}, prosečna korpa ${R(S.basket)}, reklame ${R(S.ads)}, neto ${R(S.net)}, ROAS ${S.ads ? (S.rev / S.ads).toFixed(2) : '-'}, prijave povrata ${S.rets}`);
  });
  const act = state.products.filter(p => p.status === 'active');
  const pcs = act.reduce((a, p) => a + variantsOf(p.id).reduce((b, v) => b + n(v.stock), 0), 0);
  const val = act.reduce((a, p) => a + variantsOf(p.id).reduce((b, v) => b + n(v.stock) * n(p.buy_price), 0), 0);
  L.push(`Zalihe: ${pcs} kom aktivnih komada, vrednost po nabavnoj ${R(val)}. Za obradu: ${state.orders.filter(o => TODO.includes(o.status)).length} porudžbina.`);

  const soldMap = {}, sold30 = {}; const d30 = Date.now() - 30 * 864e5;
  state.items.forEach(i => { const o = order(i.order_id); if (!o || NO_REVENUE.includes(o.status)) return; const pid = i.product_id || variant(i.variant_id)?.product_id; if (!pid) return; soldMap[pid] = (soldMap[pid] || 0) + i.qty; if (new Date(o.created_at) >= d30) sold30[pid] = (sold30[pid] || 0) + i.qty; });

  const os = state.orders.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  { const d30s = Date.now() - 30 * 864e5, agg = {}; state.orders.filter(o => !NO_REVENUE.includes(o.status)).forEach(o => { const k = srcOf(o), a = agg[k] = agg[k] || { n: 0, r: 0, n30: 0, r30: 0 }, rv = totals(o).revenue; a.n++; a.r += rv; if (new Date(o.created_at) >= d30s) { a.n30++; a.r30 += rv; } });
    L.push(`\n## PORUDŽBINE PO IZVORU (bez otkazanih/vraćenih; Organic = ručno uneto ili nepoznat izvor)\n` + Object.keys(OSRC).map(k => { const a = agg[k] || { n: 0, r: 0, n30: 0, r30: 0 }; return `${OSRC[k]}: ukupno ${a.n} porudžbina / ${R(a.r)}; poslednjih 30 dana ${a.n30} / ${R(a.r30)}`; }).join('\n')); }
  L.push(`\n## PORUDŽBINE (najnovijih ${Math.min(60, os.length)} od ${os.length})\nid|broj|datum|kupac|grad|kanal|izvor|status|plaćanje|iznos|profit|popust|kod|kurir|broj pošiljke|stavke|napomena`);
  os.slice(0, 60).forEach(o => { const T = totals(o); row(o.id, o.order_no, dt(o.created_at), o.customer_name, o.city, CH[o.channel] || o.channel, OSRC[srcOf(o)], ST[o.status], PAY[o.payment] || o.payment, R(T.revenue), R(T.profit), R(o.discount) || '', o.discount_code, o.courier, o.tracking_no, itemsOf(o.id).map(i => `${i.name || prodName(i.product_id)} ${i.size || ''} x${i.qty}`).join(', '), cut(o.note, 80)); });

  L.push(`\n## GARDEROBA (${state.products.length} komada; upozorenje kad veličina ima ≤ ${lowT()} kom)\nid|naziv|kategorija|status|nabavna|prodajna|stara cena|marža %|dobavljač|materijal|veličine=stanje|prodato ukupno|prodato 30 dana|napomena`);
  state.products.forEach(p => row(p.id, p.name, p.category, { active: 'Aktivan', draft: 'Priprema', archived: 'Arhiviran' }[p.status] || p.status, R(p.buy_price), R(p.sell_price), R(p.compare_price) || '', n(p.sell_price) ? Math.round((1 - n(p.buy_price) / n(p.sell_price)) * 100) : '', p.supplier, p.material, variantsOf(p.id).map(v => `${v.size}${v.color ? ' ' + v.color : ''}=${v.stock}`).join(' '), soldMap[p.id] || 0, sold30[p.id] || 0, cut(p.note, 80)));
  const al = stockAlerts();
  L.push(`Upozorenja zaliha: ${al.length ? al.map(({ p, v }) => `${p.name} ${v.size}=${v.stock}`).join(', ') : 'nema'}`);

  const cs = state.customers.map(c => ({ c, s: custStats(c) })).sort((a, b) => b.s.spend - a.s.spend);
  L.push(`\n## KUPCI (prvih ${Math.min(60, cs.length)} po potrošnji od ${cs.length})\nid|ime|telefon|instagram|grad|kupovina|potrošnja|nivo|poeni|prva kupovina|poslednja kupovina|dana od poslednje|vip|napomena`);
  cs.slice(0, 60).forEach(({ c, s }) => row(c.id, c.name, c.phone, c.instagram, c.city, s.count, R(s.spend), s.tier?.name, s.points, d(s.first), d(s.last), s.idle ?? '', c.vip ? 'da' : '', cut(c.note, 60)));
  L.push(`Loyalty pravila: ${JSON.stringify(loy())}`);
  L.push(`\n## KODOVI ZA POPUST\nid|kod|%|RSD|aktivan|važi od|važi do|max upotreba|upotrebljen|prihod|napomena`);
  state.codes.forEach(c => { const u = codeUses(c); row(c.id, c.code, c.pct, c.rsd, c.active === false ? 'ne' : 'da', d(c.valid_from), d(c.valid_to), c.max_uses, u.n, R(u.rev), cut(c.note, 60)); });

  const rs = state.rets.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const openR = rs.filter(r => !retClosed(r)), closedR = rs.filter(r => retClosed(r)).slice(0, 20);
  L.push(`\n## POVRATI, ZAMENE, REKLAMACIJE, UTISCI (otvoreni ${openR.length} + poslednjih ${closedR.length} zatvorenih)\nid|broj|datum|tip|status|kupac|porudžbina|artikal|veličina|razlog|kupac želi|rok|ocena|vraćeno RSD|zadužen|opis|šta da popravimo`);
  openR.concat(closedR).forEach(r => { const du = retDue(r); row(r.id, r.case_no, d(r.created_at), RT[r.type], ST[r.status] || r.status, r.customer_name, r.order_no, r.item, r.size, r.reason, r.resolution_wanted, du ? dueText(du) : '', r.rating, R(r.refund_amount) || '', assigneeNames(r), cut(r.description, 160), cut(r.improve, 80)); });

  L.push(`\n## PROMOCIJE\nid|naziv|tip|od|do|status|kod|popust|kanal|budžet|cilj|porudžbine u periodu|prihod|sa kodom|rast vs prosek|reklame|neto|opis|rezultat|beleške`);
  state.promos.slice().sort((a, b) => b.starts_at.localeCompare(a.starts_at)).forEach(p => { const x = promoResults(p); row(p.id, p.name, p.type, d(p.starts_at), p.ends_at ? d(p.ends_at) : 'traje', ST[promoStatus(p)], p.code, p.discount_pct ? p.discount_pct + '%' : p.discount_rsd ? R(p.discount_rsd) + ' RSD' : '', p.channel, R(p.budget) || '', cut(p.goal, 60), x.orders, R(x.revenue), x.withCode, x.lift == null ? '' : Math.round(x.lift * 100) + '%', R(x.spend), R(x.net), cut(p.description, 100), cut(p.result_note, 80), promoNotes(p.id).map(z => `${personName(z.author)}: ${cut(z.body, 60)}`).join(' / ')); });

  L.push(`\n## TASKOVI (otvoreni zadaci, iz svih sekcija)\nsekcija|stavka|zaduženi|rok|dodelio`);
  allTasks().filter(t => !t.done).forEach(t => row(t.sec, cut((t.x.task_note && t.src.k !== 'note' ? t.x.task_note + ' · za: ' : '') + t.src.title(t.x), 160), t.as.map(personName).join(', '), t.due || '', t.x.task_by ? personName(t.x.task_by) : ''));
  L.push(`\n## OBJAVE + REKLAME\nid|naslov|namena|faza|format|datum|zadužen|hook|skripta|caption|drive link|inspiracija`);
  state.posts.forEach(p => row(p.id, p.title, PURPOSE[ppOf(p)], ST[p.status], FMT[p.format] || p.format, dt(p.publish_at), assigneeNames(p), cut(p.hook, 90), cut(p.concept, 260), cut(p.caption, 80), p.drive_link ? 'ima' : 'nema', inspoLinks(p).join(' ')));

  L.push(`\n## PREDLOZI ZA SAJT I PAKOVANJE\nid|oblast|naslov|kategorija|prioritet|status|autor|glasovi|opis`);
  state.ideas.forEach(i => row(i.id, i.area === 'packaging' ? 'pakovanje' : 'sajt', i.title, CAT[i.category] || i.category, PRIO[i.priority] || i.priority, ST[i.status], i.created_by, (i.votes || []).length || '', cut(i.description, 140)));

  L.push(`\n## PAKOVANJE (materijal)\nid|naziv|vrsta|stanje|minimum|po paketu|cena|dobavljač|napomena`);
  state.pack.forEach(x => row(x.id, x.name, x.kind, x.stock, x.min_stock, x.per_order, R(x.unit_price) || '', x.supplier, cut(x.note, 60)));
  L.push(`\n## SAJT\nLink: ${siteUrl()}`);

  L.push('\n## BRAND STORY (poglavlja)');
  state.story.forEach(s => L.push(`### ${cell(s.title)}\n${cut(s.body, 1500) || '(prazno)'}`));

  const area = (a) => a === 'general' ? 'opšta' : a === 'story' ? 'brand story' : String(a || '').startsWith('promo:') ? 'uz promociju ' + (state.promos.find(p => p.id === a.slice(6))?.name || '') : a;
  const notes = state.notes.filter(x => !String(x.area || '').startsWith('promo:'));
  const nl = notes.filter(x => x.pinned && !x.done).concat(notes.filter(x => !(x.pinned && !x.done)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 45));
  L.push(`\n## BELEŠKE TIMA (zakačene + najnovije; ukupno ${notes.length})\nid|datum|autor|gde|zakačena|urađena|tekst`);
  nl.forEach(x => row(x.id, dt(x.created_at), personName(x.author), area(x.area), x.pinned ? 'da' : '', x.done ? `da (${personName(x.done_by || '')})` : '', cut(x.body, 300)));

  const ads = state.ads.filter(a => new Date(a.day) >= new Date(Date.now() - 45 * 864e5)).sort((a, b) => b.day.localeCompare(a.day));
  L.push(`\n## REKLAME (Meta, poslednjih 45 dana)\ndatum|kampanja|potrošnja|kupovine po Meta|prihod po Meta`);
  ads.forEach(a => row(a.day, a.campaign, R(a.spend), a.purchases, R(a.revenue)));

  L.push(`\n## ISTORIJA (događaji i prekretnice)\nid|datum|naslov|opis|autor`);
  state.milestones.slice().sort((a, b) => b.happened_at.localeCompare(a.happened_at)).slice(0, 30).forEach(m => row(m.id, d(m.happened_at), m.title, cut(m.body, 120), m.author));

  const ch = state.audit.filter(a => chgCounts(a)).sort((a, b) => b.id - a.id).map(a => ({ a, dd: describeAudit(a) })).filter(x => x.dd).slice(0, 30);
  L.push(`\n## POSLEDNJE PROMENE DRUGIH ČLANOVA (za korisnika koji piše)\nkad|ko|šta`);
  ch.forEach(x => row(dt(x.a.at), PEOPLE[x.a.actor]?.name || 'Forma', plain(x.dd.text)));
  if (state.nfState) L.push(`Nepročitane tuđe promene po sekcijama: ${CHG_TABS.map(t => [t, chgUnread(t)]).filter(x => x[1]).map(x => `${x[0]}=${x[1]}`).join(', ') || 'nema'}`);
  if (AI.spend) L.push(`\n## AI ASISTENT\nOvog meseca: ${AI.spend.n} pitanja, trošak oko ${AI.spend.usd.toFixed(2)} USD. Model: ${AI.model}.`);
  return L.join('\n');
}

/* prikaz AI teksta (bezbedan mini markdown + crm linkovi) */
const AI_LIST = { order: 'orders', cust: 'customers', product: 'products', post: 'posts', ret: 'rets', promo: 'promos', code: 'codes', ms: 'milestones', idea: 'ideas', pack: 'pack', note: 'notes' };
const aiExists = (k, id) => AI_LIST[k] && (state[AI_LIST[k]] || []).some(x => x.id === id);
function aiInline(s) {
  return s
    .replace(/\[([^\]]+)\]\(crm:([a-z]+):([^)\s]+)\)/g, (m, txt, k, id) => {
      if (k === 'tab') return SECTIONS.some(x => x.tab === id) ? `<a class="bt-link" data-bgo="tab:${id}">${txt}</a>` : txt;
      if (k === 'note') return aiExists(k, id) ? `<a class="bt-link" data-bgo="tab:notes">${txt}</a>` : txt;
      return aiExists(k, id) ? `<a class="bt-link" data-bgo="ref:${k}:${id}">${txt}</a>` : txt;
    })
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function aiFormat(text) {
  const lines = esc(text).split('\n'); let out = '', list = null;
  const close = () => { if (list) { out += `</${list}>`; list = null; } };
  lines.forEach(l => {
    let m;
    if ((m = l.match(/^\s*[-•*]\s+(.*)$/))) { if (list !== 'ul') { close(); out += '<ul class="bt-ul">'; list = 'ul'; } out += `<li>${aiInline(m[1])}</li>`; return; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out += '<ol class="bt-ul">'; list = 'ol'; } out += `<li>${aiInline(m[1])}</li>`; return; }
    close();
    if ((m = l.match(/^\s*#{1,4}\s+(.*)$/))) { out += `<div class="bt-h">${aiInline(m[1])}</div>`; return; }
    out += l.trim() ? `<div class="bt-p">${aiInline(l)}</div>` : '<div class="bt-sp"></div>';
  });
  close();
  return out.replace(/(<div class="bt-sp"><\/div>)+$/, '');
}

/* alati koje AI poziva */
const AI_FORMS = { porudzbina: 'Nova porudžbina', kupac: 'Novi kupac', komad: 'Novi komad', objava: 'Nova ideja za objavu', promocija: 'Nova promocija', kod: 'Novi kod za popust', povrat: 'Nova prijava povrata (ručno)', predlog_sajt: 'Novi predlog za sajt', predlog_pakovanje: 'Novi predlog za pakovanje', dogadjaj: 'Zabeleži događaj u istoriji', beleska: 'Nova beleška' };
function aiItemName(k, id) {
  const x = (state[AI_LIST[k]] || []).find(y => y.id === id); if (!x) return '';
  return { order: `${x.order_no || 'porudžbina'} · ${x.customer_name}`, cust: x.name, product: x.name, post: x.title, ret: `${x.case_no} · ${x.customer_name}`, promo: x.name, code: x.code, ms: x.title, idea: x.title, pack: x.name }[k] || '';
}
function aiToolGo(name, inp) {
  inp = inp || {};
  if (name === 'idi_na_sekciju') {
    const s = SECTIONS.find(x => x.tab === inp.sekcija); if (!s) return null;
    const v = inp.pogled, sec = inp.sekcija;
    const go = v === 'pipeline' ? 'oview:pipeline' : v === 'tabela' ? 'oview:table' : v === 'kupci' ? 'cview:list' : v === 'loyalty' ? 'cview:club' : v === 'popusti' ? 'cview:codes'
      : v === 'kalendar' ? 'pview:calendar' : v === 'sta_da_popravimo' ? 'rview:insights' : v === 'arhiva' ? 'archive'
      : v === 'tabla' ? (sec === 'returns' ? 'rview:board' : sec === 'posts' ? 'pview:board' : 'tab:' + sec)
      : v === 'lista' ? (sec === 'returns' ? 'rview:list' : sec === 'posts' ? 'pview:list' : 'tab:' + sec) : 'tab:' + sec;
    return { go, label: inp.natpis || s.name, now: !!inp.odmah };
  }
  if (name === 'otvori_stavku') { if (!aiExists(inp.vrsta, inp.id)) return null; return { go: `ref:${inp.vrsta}:${inp.id}`, label: inp.natpis || aiItemName(inp.vrsta, inp.id) || 'Otvori', now: !!inp.odmah }; }
  if (name === 'otvori_formu') { const a = AI_FORMS[inp.forma]; return a ? { go: 'act:' + a, label: inp.natpis || a, now: !!inp.odmah } : null; }
  if (name === 'otvori_grafikon') { const M = METRICS[inp.metrika]; return M ? { go: `metric:${inp.metrika}:${inp.period || '30'}`, label: inp.natpis || `Grafikon: ${M.name}`, now: !!inp.odmah } : null; }
  return null;
}
async function aiRunTools(msg, tools) {
  let ran = false; const done = [];
  for (const tl of tools.slice(0, 4)) {
    let inp = {}; try { inp = tl.json ? JSON.parse(tl.json) : {}; } catch (e) { continue; }
    if (tl.name === 'sacuvaj_belesku') {
      const body = String(inp.tekst || '').trim(); if (!body) continue;
      try {
        const r = await q(sb.from('h_notes').insert({ area: 'general', author: who(), body, pinned: !!inp.zakaci }).select().single());
        state.notes.push(r); renderAll();
        msg.html += `<div class="bt-quote">${esc(body)}</div>`; msg.btns.push(['Poništi belešku', 'undonote:' + r.id], ['Beleške', 'tab:notes']);
        done.push(`sačuvana beleška: ${body}`);
      } catch (e) { msg.html += `<div class="bt-note">Beleška nije sačuvana: ${esc(e.message || e)}</div>`; }
      continue;
    }
    const g = aiToolGo(tl.name, inp); if (!g) continue;
    if (!msg.btns.some(b => b[1] === g.go)) msg.btns.push([g.label, g.go]);
    if (g.now && !ran) { ran = true; done.push(`otvoreno: ${g.label}`); setTimeout(() => botRun(g.go), 350); }
    else done.push(`ponuđeno dugme: ${g.label}`);
  }
  if (done.length) msg.txt = (msg.txt || '') + `\n[akcije: ${done.join('; ')}]`;
}

/* razgovor sa AI (streaming) */
function aiPaint(msg) {
  const el = document.querySelector('#botMsgs .bt-msg[data-last] .bt-bub');
  if (el && BOT.msgs[BOT.msgs.length - 1] === msg) { el.innerHTML = msg.html || '<div class="bt-typing"><i></i><i></i><i></i></div>'; el.classList.toggle('streaming', !!msg.streaming); const box = $('botMsgs'); if (box.scrollHeight - box.scrollTop - box.clientHeight < 160) box.scrollTop = box.scrollHeight; }
  else renderBot();
}
async function aiAsk() {
  const history = BOT.msgs.slice(-14).map(m => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.txt || plain(m.html) }));
  const msg = { from: 'bot', html: '', btns: [], at: Date.now(), ai: 1, streaming: 1, txt: '' };
  BOT.msgs.push(msg); renderBot();
  let r;
  try {
    r = await fetch(AI_URL(), { method: 'POST', headers: await aiHeaders(), body: JSON.stringify({ messages: history, snapshot: aiSnapshot(), now: new Date().toLocaleString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), who: personName(who()), tab: SECTIONS.find(s => s.tab === state.tab)?.name || state.tab }) });
  } catch (e) { BOT.msgs.pop(); throw e; }
  if (!(r.headers.get('content-type') || '').includes('event-stream')) {
    BOT.msgs.pop(); let d = {}; try { d = await r.json(); } catch (e) {}
    const err = new Error(d.error || 'http ' + r.status); err.data = d; throw err;
  }
  let text = '', raf = 0; const tools = {};
  const paint = () => { raf = 0; msg.html = aiFormat(text); aiPaint(msg); };
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += value; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
      if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') tools[ev.index] = { name: ev.content_block.name, json: '' };
      else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; if (!raf) raf = requestAnimationFrame(paint); }
      else if (ev.type === 'content_block_delta' && ev.delta?.type === 'input_json_delta' && tools[ev.index]) tools[ev.index].json += ev.delta.partial_json || '';
      else if (ev.type === 'error') text += `\n\n(Greška AI: ${ev.error?.message || 'nepoznato'})`;
    }
  }
  if (raf) cancelAnimationFrame(raf);
  msg.streaming = 0; msg.txt = text.trim();
  msg.html = text.trim() ? aiFormat(text.trim()) : '';
  await aiRunTools(msg, Object.keys(tools).sort((a, b) => a - b).map(k => tools[k]));
  if (!msg.html) msg.html = msg.btns.length ? 'Evo:' : 'Nemam odgovor na ovo, probaj drugačije da pitaš.';
  if (AI.spend) { AI.spend.n++; AI.spend.mine++; }
  botSave(); renderBot();
}
function botLocalFirst(raw) {
  const t = bfold(raw);
  if (/^\s*(zabele[zž]i|zapi[sš]i|bele[sš]ka\s*:|note\s*:)/i.test(raw)) return true;
  if (/^\s*(pitaj tim|poruka timu|javi timu|pitanje za tim|pitaj ostale)/i.test(raw)) return true;
  if (/^ (odjavi me|odjava|logout|pretraga|arhiva|hvala|ok|okej|vazi|super) $/.test(t)) return true;
  if (/^\s*#?\s*[A-Za-z]{0,3}-?\d{3,}\s*$/.test(raw)) return true;
  const words = t.trim().split(' ').filter(w => w && !BOT_STOP.has(w));
  if (/\?/.test(raw) || words.length > 2) return false;
  const sec = botSections(t); if (sec && sec.sc >= 3) return true;
  if (/^ (nov|nova|novi|novu|dodaj|unesi|napravi) /.test(t) && BOT_NEW.some(([ws]) => bhas(t, ws))) return true;
  return false;
}

/* ---------- OBAVEŠTENJA NA TELEFON I RAČUNAR (Web Push) ----------
   uređaj se prijavi jednom (dozvola u pretraživaču), pa baza preko funkcije crm-push šalje:
   dodeljen zadatak, završen zadatak koji si dodelio/la, nova porudžbina, nova prijava i jutarnji podsetnik u 8h */
const VAPID_PUBLIC = 'BO9fqbcK6L9yA4bKN-m3gp2RxmbZ6Gt7UOsIjGDzOZDScOuWOtwSWT_nM8GeM__UZr6vE2bBSH2ou37jkf5_MTg';
const PUSH_URL = () => SUPABASE_URL + '/functions/v1/crm-push';
const PUSH_PREFS = [['tasks', 'Zadaci za mene', 'kad ti neko dodeli zadatak'], ['done', 'Završeni zadaci', 'kad neko završi zadatak koji si ti dodelio/la'], ['orders', 'Nove porudžbine', 'kad neko drugi unese porudžbinu'], ['returns', 'Povrati i reklamacije', 'nova prijava sa forme ili ručno'], ['daily', 'Jutarnji podsetnik u 8h', 'šta ti ističe danas i šta kasni'], ['chat', 'Tim chat', 'samo kad te neko označi (@tvoje ime ili @svi)'], ['comments', 'Komentari na zadacima', 'kad neko napiše komentar na zadatku koji pratiš'], ['calls', 'Huddle pozivi', 'kad te neko zove ili pokrene huddle sa timom'], ['deadline', 'Rokovi i hitni zadaci', 'sat pre roka; hitni odmah, 15 min pre, u roku i dok kasne'], ['mentions', 'Kad te neko označi (@)', 'u zadatku, ideji, skripti, belešci ili bilo kom polju u CRM-u']];
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const PUSH = { reg: null, sub: null, row: null };
function deviceName() {
  const u = navigator.userAgent, os = /Android/.test(u) ? 'Android' : isIOS() ? 'iPhone' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'uređaj';
  const br = /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Edg\//.test(u) ? 'Edge' : /Firefox/.test(u) ? 'Firefox' : /Chrome|CriOS/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : '';
  return os + (br ? ' · ' + br : '') + (isStandalone() ? ' (aplikacija)' : '');
}
function b64uToU8(s) { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function pushInit() {
  if (!('serviceWorker' in navigator)) return renderPushBar();
  try {
    PUSH.reg = await navigator.serviceWorker.register('sw.js');
    if (!PUSH.msgBound) { PUSH.msgBound = true; navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.crmGo) crmGo(e.data.crmGo); if (e.data && e.data.crmAlarm) taskAlarmShow(e.data.crmAlarm); }); }
    try { if (!PUSH.permBound && navigator.permissions) { PUSH.permBound = true; const ps = await navigator.permissions.query({ name: 'notifications' }); ps.onchange = () => { renderPushModal(); renderPushBar(); if (Notification.permission === 'granted' && !PUSH.row) pushEnable(); }; } } catch (e) {}
    if (pushSupported() && Notification.permission === 'granted') {
      PUSH.sub = await PUSH.reg.pushManager.getSubscription();
      if (!PUSH.sub && LS.get('crm_push_off', '') !== '1') PUSH.sub = await PUSH.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(VAPID_PUBLIC) }).catch(() => null); // dozvola već data → uključi sam
      if (PUSH.sub) await pushRegister(); // uvek veži uređaj za onoga ko je sada prijavljen
    }
  } catch (e) { console.warn('push init', e); }
  renderPushBar();
}
async function pushRegister(prefs) {
  const j = PUSH.sub.toJSON();
  const { data, error } = await sb.rpc('h_push_register', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_device: deviceName(), p_prefs: prefs || null });
  if (error) throw error; PUSH.row = data; return data;
}
async function pushEnable() {
  if (!pushSupported()) return toast(isIOS() && !isStandalone() ? 'Na iPhone-u prvo dodaj CRM na početni ekran (dugme Podeli → Dodaj na početni ekran), pa ga otvori sa ikonice.' : 'Ovaj pretraživač ne podržava obaveštenja.', 4500);
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { renderPushModal(); renderPushBar(); return toast('Obaveštenja nisu dozvoljena. Dozvoli ih u podešavanjima pretraživača za ovaj sajt.', 5000); }
    PUSH.reg = PUSH.reg || await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
    PUSH.sub = await PUSH.reg.pushManager.getSubscription() || await PUSH.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(VAPID_PUBLIC) });
    await pushRegister(); LS.set('crm_push_nag', 'done'); LS.set('crm_push_off', '');
    renderPushModal(); renderPushBar(); sfx('done'); toast('Obaveštenja uključena na ovom uređaju ✓');
    pushTest(true);
  } catch (e) { fail(e); }
}
async function pushDisable() {
  try {
    if (PUSH.sub) { const ep = PUSH.sub.endpoint; await PUSH.sub.unsubscribe().catch(() => {}); await sb.from('h_push_subs').delete().eq('endpoint', ep); }
    PUSH.sub = null; PUSH.row = null; LS.set('crm_push_off', '1'); renderPushModal(); renderPushBar(); toast('Obaveštenja isključena na ovom uređaju');
  } catch (e) { fail(e); }
}
async function pushTest(quiet) {
  try { const r = await fetch(PUSH_URL(), { method: 'POST', headers: await aiHeaders(), body: '{"test":true}' }); const d = await r.json(); if (!quiet) toast(d.sent ? 'Poslato ✓ obaveštenje stiže za par sekundi' : 'Nema uključenih uređaja za tvoj nalog', 4000); }
  catch (e) { if (!quiet) fail(e); }
}
async function pushSavePrefs() {
  if (!PUSH.sub) return; const prefs = {}; document.querySelectorAll('#pmPrefs [data-pp]').forEach(c => prefs[c.dataset.pp] = c.checked);
  try { await pushRegister(prefs); toast('Sačuvano ✓'); } catch (e) { fail(e); }
}
function pushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'ios' : 'nosupport';
  if (Notification.permission === 'denied') return 'denied';
  return PUSH.sub && PUSH.row ? 'on' : 'off';
}
function renderPushModal() {
  if (!$('pushModal')) return;
  const st = pushState(), on = st === 'on', prefs = (PUSH.row && PUSH.row.prefs) || {};
  $('pmStatus').innerHTML = {
    on: '<span class="pm-dot on"></span><b>Uključeno na ovom uređaju</b><small>' + esc(deviceName()) + '. Stiže i kad je CRM zatvoren.</small>',
    off: '<span class="pm-dot"></span><b>Isključeno na ovom uređaju</b><small>Uključi da ti zadaci i porudžbine stižu kao poruke, i kad je CRM zatvoren.</small>',
    denied: '<span class="pm-dot no"></span><b>Blokirano u pretraživaču</b><small>Pretraživač je zapamtio „Ne dozvoli“ za ovaj sajt. Odblokiraj ovako, pa klikni „Proveri ponovo“:</small><div class="pm-help">' + pushHelpHtml() + '</div>',
    ios: '<span class="pm-dot"></span><b>Na iPhone-u treba jedan korak više</b><small>' + (/CriOS/.test(navigator.userAgent) ? 'U Chrome-u: dugme Podeli (kvadrat sa strelicom, gore desno pored adrese) → „Dodaj na početni ekran“.' : 'U Safari-ju: dugme Podeli (kvadrat sa strelicom) → „Dodaj na početni ekran“.') + ' Zatim otvori CRM <b>sa nove ikonice H</b> i ovde uključi obaveštenja. Treba iOS 16.4 ili noviji.</small>',
    nosupport: '<span class="pm-dot no"></span><b>Ovaj pretraživač ne podržava obaveštenja</b><small>Probaj u Chrome-u.</small>',
  }[st];
  $('pmPrefs').innerHTML = PUSH_PREFS.map(([k, t, s]) => '<label class="pm-row ' + (on ? '' : 'dis') + '"><input type="checkbox" data-pp="' + k + '" ' + (prefs[k] !== false ? 'checked' : '') + ' ' + (on ? '' : 'disabled') + '><span><b>' + t + '</b><small>' + s + '</small></span></label>').join('');
  if ($('pmApp')) $('pmApp').innerHTML = pushAppHtml();
  if ($('pmSound')) $('pmSound').innerHTML = pushSoundHtml();
  $('pmMain').textContent = on ? 'Isključi na ovom uređaju' : st === 'denied' ? 'Proveri ponovo' : 'Uključi obaveštenja';
  $('pmMain').className = on ? 'btn-ghost' : 'btn-gold';
  $('pmMain').style.display = ['on', 'off', 'denied'].includes(st) ? '' : 'none';
  $('pmTest').style.display = on ? '' : 'none';
}
/* ---- instalacija kao aplikacija (Android/računar): obaveštenja onda stižu kao od aplikacije HARIZMA, ne od pretraživača ---- */
let INSTALL_EVT = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); INSTALL_EVT = e; try { renderPushModal(); renderPushBar(); } catch (x) {} });
addEventListener('appinstalled', () => { INSTALL_EVT = null; LS.set('crm_inst_nag', 'done'); toast('HARIZMA je instalirana. Od sada otvaraj CRM sa nove ikonice H.', 6000); try { renderPushModal(); renderPushBar(); } catch (x) {} });
async function appInstall() {
  if (!INSTALL_EVT) { openPushModal(); return toast('Uputstvo za instalaciju je u prozoru Obaveštenja', 3500); }
  const ev = INSTALL_EVT; INSTALL_EVT = null;
  try { ev.prompt(); const r = await ev.userChoice; if (r && r.outcome !== 'accepted') INSTALL_EVT = ev; } catch (e) { console.warn(e); }
  renderPushModal(); renderPushBar();
}
const isAndroid = () => /Android/.test(navigator.userAgent);
function pushAppHtml() {
  const u = navigator.userAgent, sams = /SamsungBrowser/.test(u), inst = isStandalone();
  if (isIOS()) return inst ? '<div class="pm-ok">✓ Otvoreno kao aplikacija HARIZMA, obaveštenja stižu kao od aplikacije.</div>' : '<div class="pm-note">Dodaj CRM na početni ekran (Podeli → Dodaj na početni ekran) i otvaraj ga sa ikonice H. Tada je to aplikacija HARIZMA.</div>';
  if (isAndroid()) {
    if (inst) return '<div class="pm-ok">✓ Instalirano kao aplikacija HARIZMA. Obaveštenja stižu pod imenom HARIZMA sa H ikonicom.</div>';
    return '<div class="pm-note"><b>Sada obaveštenja stižu preko pretraživača</b> (u obaveštenju se vidi ikonica pretraživača). Instaliraj CRM kao aplikaciju i stizaće kao <b>HARIZMA</b>, kao na iPhone-u.</div>'
      + (INSTALL_EVT ? '<button type="button" class="btn-gold pm-inst" data-appinst>📲 Instaliraj HARIZMA aplikaciju</button>' : '<ol class="pm-steps">' + (sams
        ? '<li>Dole <b>☰ meni</b> → <b>Dodaj stranicu na</b> → <b>Početni ekran</b> (ili ikonica za instalaciju u traci sa adresom) → <b>Instaliraj</b>.</li>'
        : '<li>Gore desno <b>⋮</b> → <b>Instaliraj aplikaciju</b> (ili Dodaj na početni ekran → Instaliraj).</li>') + '</ol>')
      + '<div class="pm-note sm">Staru ikonicu H (prečicu) obriši sa početnog ekrana i CRM otvaraj sa nove. Kad je otvoriš prvi put, proveri ovde da su obaveštenja uključena.</div>';
  }
  if (inst) return '<div class="pm-ok">✓ Otvoreno kao aplikacija HARIZMA.</div>';
  return INSTALL_EVT ? '<div class="pm-note">CRM može da se instalira i na računaru, kao zasebna aplikacija u svom prozoru.</div><button type="button" class="btn-ghost pm-inst" data-appinst>Instaliraj na računaru</button>' : '<div class="pm-note sm">Na računaru CRM može da se instalira kao aplikacija: ikonica za instalaciju desno u traci sa adresom (Chrome ili Edge).</div>';
}
function pushSoundHtml() {
  const play = '<button type="button" class="btn-ghost" data-sndplay>▶ Poslušaj HARIZMA zvuk</button>';
  if (isAndroid()) return '<div class="pm-snd">' + play + '<a class="btn-gold" href="harizma-obavestenje.mp3" download="harizma-obavestenje.mp3">⬇ Preuzmi zvuk</a></div><ol class="pm-steps">'
    + '<li>Klikni <b>Preuzmi zvuk</b>.</li>'
    + '<li><b>Moji fajlovi</b> → <b>Preuzimanja</b> → dugo drži <b>harizma-obavestenje</b> → <b>Premesti</b> → <b>Interna memorija</b> → folder <b>Notifications</b> → <b>Premesti ovde</b>.</li>'
    + '<li>Podešavanja telefona → <b>Aplikacije</b> → <b>HARIZMA</b> → <b>Obaveštenja</b> → kategorije obaveštenja → otvori kategoriju → <b>Zvuk</b> → izaberi <b>harizma-obavestenje</b>.</li>'
    + '</ol><div class="pm-note sm">Ako CRM još nije instaliran kao aplikacija, isto se podešava kod pretraživača: Aplikacije → ' + (/SamsungBrowser/.test(navigator.userAgent) ? 'Samsung Internet' : 'Chrome') + ' → Obaveštenja → kategorija sa adresom ' + esc(location.host) + ' → Zvuk.</div>';
  if (isIOS()) return '<div class="pm-snd">' + play + '</div><div class="pm-note sm">Na iPhone-u Apple ne dozvoljava poseban zvuk za obaveštenja web aplikacija, pa se čuje zvuk iz Podešavanja → Zvuci i dodir. Kad je CRM otvoren, čuje se HARIZMA zvuk.</div>';
  return '<div class="pm-snd">' + play + '</div><div class="pm-note sm">Na računaru zvuk obaveštenja bira sistem. Kad je CRM otvoren, čuje se HARIZMA zvuk.</div>';
}
let SND_EL = null;
function playHarizmaSound() { try { if (!SND_EL) SND_EL = new Audio('harizma-obavestenje.mp3'); SND_EL.currentTime = 0; SND_EL.volume = 0.9; SND_EL.play(); } catch (e) {} }
/* uputstvo za odblokiranje, prema pretraživaču i uređaju */
function pushHelpHtml() {
  const u = navigator.userAgent, site = '<b>' + location.host + '</b>';
  if (/SamsungBrowser/.test(u)) return '<ol><li>Dole ☰ meni → <b>Podešavanja</b> → <b>Sajtovi i preuzimanja</b> → <b>Obaveštenja</b>.</li><li>Nađi ' + site + ' i stavi <b>Dozvoli</b>.</li><li>Ako i dalje ne stiže: Podešavanja telefona → Aplikacije → Samsung Internet → Obaveštenja → uključi.</li></ol>';
  if (/Android/.test(u)) return '<ol><li>Chrome ⋮ → <b>Podešavanja</b> → <b>Podešavanja sajta</b> → <b>Obaveštenja</b>.</li><li>Nađi ' + site + ' i stavi <b>Dozvoli</b>.</li><li>Ako i dalje ne stiže: Podešavanja telefona → Aplikacije → Chrome → Obaveštenja → uključi.</li></ol>';
  if (isIOS()) return '<ol><li>Podešavanja iPhone-a → <b>Obaveštenja</b> → <b>HARIZMA</b> → uključi <b>Dozvoli obaveštenja</b>.</li></ol>';
  if (/Edg\//.test(u)) return '<ol><li>Klikni ikonicu <b>levo od adrese</b> (katanac).</li><li>Kod <b>Obaveštenja</b> izaberi <b>Dozvoli</b>.</li></ol>';
  if (/Chrome/.test(u)) return '<ol><li>Klikni ikonicu <b>levo od adrese</b> (dva klizača ili katanac).</li><li>Uključi <b>Obaveštenja</b>. Ako ga nema: <b>Podešavanja sajta</b> → <b>Obaveštenja</b> → <b>Dozvoli</b>.</li>' + (/Mac/.test(u) ? '<li>Na Mac-u još: Apple meni → <b>Sistemska podešavanja</b> → <b>Obaveštenja</b> → <b>Google Chrome</b> → uključi <b>Dozvoli obaveštenja</b> (stil „Baneri“ ili „Upozorenja“) i <b>Pusti zvuk</b>.</li>' : '') + '</ol>';
  if (/Safari/.test(u)) return '<ol><li>Safari meni → <b>Podešavanja</b> → <b>Veb-sajtovi</b> → <b>Obaveštenja</b>.</li><li>Kod ' + site + ' izaberi <b>Dozvoli</b>.</li></ol>';
  return 'Otvori podešavanja pretraživača za ovaj sajt i dozvoli obaveštenja.';
}
function openPushModal() { renderPushModal(); $('pushModal').classList.add('open'); }
function renderPushBar() {
  let bar = $('pushBar'); const st = pushState(), nag = LS.get('crm_push_nag', '');
  const show = !!state.user && !nag && (st === 'ios' || (st === 'off' && Notification.permission === 'default'));
  const inst = !show && !!state.user && isAndroid() && !isStandalone() && !!INSTALL_EVT && !LS.get('crm_inst_nag', '');
  if (inst) {
    if (!bar) { bar = document.createElement('div'); bar.id = 'pushBar'; bar.className = 'push-bar'; const t = $('tabs'); t.parentNode.insertBefore(bar, t.nextSibling); }
    bar.innerHTML = '<span class="pb-ic">📲</span><span class="pb-t"><b>Instaliraj HARIZMA kao aplikaciju</b><small>Obaveštenja će stizati kao od aplikacije HARIZMA, sa H ikonicom, kao na iPhone-u.</small></span><button class="btn-gold" data-appinst>Instaliraj</button><button class="pb-x" data-instno title="Ne sada">✕</button>';
    return;
  }
  if (!show) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'pushBar'; bar.className = 'push-bar'; const t = $('tabs'); t.parentNode.insertBefore(bar, t.nextSibling); }
  bar.innerHTML = '<span class="pb-ic">🔔</span><span class="pb-t"><b>Uključi obaveštenja na ' + (/Android|iPhone|iPad/.test(navigator.userAgent) ? 'telefonu' : 'računaru') + '</b><small>' + (st === 'ios' ? 'Na iPhone-u: dugme Podeli (kvadrat sa strelicom) → Dodaj na početni ekran, pa otvori CRM sa nove ikonice H.' : 'Zadaci, porudžbine i povrati stižu kao poruke, i kad je CRM zatvoren.') + '</small></span>' + (st === 'ios' ? '' : '<button class="btn-gold" data-pb="on">Uključi</button>') + '<button class="pb-x" data-pb="no" title="Ne sada">✕</button>';
}
/* ================= TIM CHAT =================
   grupa „Tim HARIZMA“ + privatne poruke. Poruke se ne menjaju i ne brišu (baza to ne dozvoljava),
   pa se istorija čuva zauvek (plus dnevna kopija). Obaveštenje na telefon stiže samo kad te neko označi (@ime ili @svi). */
const CHAT = { open: false, ch: 'tim', msgs: {}, reads: {}, seen: {}, loaded: false, online: new Set(), typing: {}, list: true, q: '', older: {}, rt: null, typeAt: 0, gif: { open: false, q: '', items: [], configured: null, off: 0 }, focusId: null, readT: {}, lim: {}, res: {}, srv: [], qT: 0, poll: 0, rx: {}, reply: {}, act: null, need: new Set(), tap: null, edit: null, updSince: '', prevCh: 'tim', audit: {} };
const dmKey = (a, b) => 'dm:' + [a, b].sort().join(':');
const isTaskCh = (ch) => String(ch || '').startsWith('task:');
const chatBase = () => ['tim', ...Object.keys(PEOPLE).filter(k => k !== who()).map(k => dmKey(who(), k))];
const chatTaskChs = () => Object.keys(CHAT.msgs).filter(c => isTaskCh(c) && (CHAT.msgs[c] || []).some(m => !m._tmp));
const chatChannels = () => [...chatBase(), ...chatTaskChs()];
const chatKnown = (ch) => isTaskCh(ch) || chatBase().includes(ch);
const chatOther = (ch) => (ch === 'tim' || isTaskCh(ch) ? null : ch.slice(3).split(':').find(k => k !== who()));
/* komentari na zadatku: kanal task:<tabela>:<id> */
const taskChOf = (src, x) => `task:${src.tbl}:${x.id}`;
function taskOfCh(ch) { const [, tbl, id] = String(ch).split(':'); for (const src of TASK_SRC) { if (src.tbl !== tbl) continue; const x = src.list().find(y => y.id === id); if (x) return { src, x }; } return null; }
const taskLabel = (t) => (t.x.task_note && t.src.k !== 'note' ? t.x.task_note : t.src.title(t.x));
const chatTitle = (ch) => (ch === 'tim' ? 'Tim HARIZMA' : isTaskCh(ch) ? (() => { const t = taskOfCh(ch); return t ? tcut(taskLabel(t), 70) : 'Zadatak'; })() : personName(chatOther(ch)));
const chatMembers = (ch) => (ch === 'tim' || isTaskCh(ch) ? Object.keys(PEOPLE) : ch.slice(3).split(':'));
/* zadatak „pratiš“ ako si zadužen/a, ako si ga dodelio/la, komentarisao/la ili si označen/a u njemu */
function chatWatch(ch) {
  if (!isTaskCh(ch)) return true;
  const t = taskOfCh(ch), me = who();
  if (t && (assigneesOf(t.x).includes(me) || t.x.task_by === me)) return true;
  return (CHAT.msgs[ch] || []).some(m => m.author === me || (m.mentions || []).includes(me) || (m.mentions || []).includes('svi'));
}
const MENTION_RE = /@(konstantin|stasa|staša|marjan|svi|all)(?![\p{L}\p{N}_])/giu;
const normMention = (m) => { m = m.toLowerCase().replace(/š/g, 's'); return m === 'all' ? 'svi' : m; };
const chatMentionsMe = (m) => m.author !== who() && (m.mentions || []).some(x => x === who() || x === 'svi');
const isChatMobile = () => innerWidth < 760;
function chatUnread(ch) { const r = CHAT.reads[ch] || ''; return (CHAT.msgs[ch] || []).filter(m => !m._tmp && !m.deleted_at && m.author !== who() && m.created_at > r).length; }
const chatUnreadTotal = () => chatChannels().filter(chatWatch).reduce((a, c) => a + chatUnread(c), 0);
function chatAddMsgs(rows) { rows.forEach(m => { const a = CHAT.msgs[m.channel] = CHAT.msgs[m.channel] || []; if (!a.some(x => x.id === m.id)) a.push(m); }); Object.values(CHAT.msgs).forEach(a => a.sort((x, y) => x.created_at.localeCompare(y.created_at))); }
async function chatLoad() {
  try {
    const chs = chatBase();
    const res = await Promise.all([...chs.map(c => q(sb.from('h_chat_messages').select('*').eq('channel', c).order('created_at', { ascending: false }).limit(300))), q(sb.from('h_chat_reads').select('*')), q(sb.from('h_chat_messages').select('*').like('channel', 'task:%').order('created_at', { ascending: false }).limit(2000))]);
    const tasks = res.pop(), reads = res.pop();
    chatAddMsgs(tasks); if (tasks.length < 2000) [...new Set(tasks.map(m => m.channel))].forEach(c => { CHAT.older[c] = 'done'; });
    res.forEach((rows, i) => { if (rows.length < 300) CHAT.older[chs[i]] = 'done'; chatAddMsgs(rows); });
    await chatRxLoad();
    reads.forEach(r => { if (r.username === who()) { if ((CHAT.reads[r.channel] || '') < r.last_read_at) CHAT.reads[r.channel] = r.last_read_at; } else (CHAT.seen[r.channel] = CHAT.seen[r.channel] || {})[r.username] = r.last_read_at; });
    CHAT.loaded = true; chatBadges(); if (CHAT.open) renderChat(true); if (state.tab === 'tasks') renderTasks();
  } catch (e) { console.warn('chat', e); }
}
async function chatPoll() {
  if (!state.user || document.hidden) return;
  const all = Object.values(CHAT.msgs).flat().filter(m => !m._tmp), last = all.reduce((a, m) => (m.created_at > a ? m.created_at : a), '');
  try { const rows = await q(sb.from('h_chat_messages').select('*').gt('created_at', last || '1970-01-01').order('created_at').limit(200)); rows.forEach(chatIncoming); } catch (e) {}
  try { const since = CHAT.updSince || new Date(Date.now() - 5 * 60e3).toISOString(); CHAT.updSince = new Date(Date.now() - 90e3).toISOString(); const up = await q(sb.from('h_chat_messages').select('*').or(`edited_at.gt.${since},deleted_at.gt.${since}`).limit(200)); up.forEach(chatUpdated); } catch (e) {}
  if (CHAT.open) { const before = JSON.stringify(CHAT.rx); await chatRxLoad(); if (JSON.stringify(CHAT.rx) !== before) renderChatMsgs(chatNearBottom()); }
}
async function chatOlder(ch) {
  const a = CHAT.msgs[ch] || [], lim = CHAT.lim[ch] || 300, box = $('cpMsgs'), h0 = box.scrollHeight, t0 = box.scrollTop;
  if (a.length > lim) CHAT.lim[ch] = lim + 300;
  else {
    const first = a.find(m => !m._tmp); if (!first) return;
    try {
      const rows = await q(sb.from('h_chat_messages').select('*').eq('channel', ch).lt('created_at', first.created_at).order('created_at', { ascending: false }).limit(300));
      if (rows.length < 300) CHAT.older[ch] = 'done';
      chatAddMsgs(rows); CHAT.lim[ch] = lim + rows.length;
    } catch (e) { return fail(e); }
  }
  renderChatMsgs(); box.scrollTop = box.scrollHeight - h0 + t0;
}
/* skok na staru poruku iz pretrage: učita sve od nje do najstarije učitane (bez rupa u istoriji) */
async function chatJump(ch, id) {
  const a = CHAT.msgs[ch] || [];
  if (!a.some(m => m.id === id)) {
    const t = CHAT.res[id], first = a.find(m => !m._tmp);
    if (t && first) {
      try {
        const rows = await q(sb.from('h_chat_messages').select('*').eq('channel', ch).gte('created_at', t.created_at).lt('created_at', first.created_at).order('created_at').limit(3000));
        const before = await q(sb.from('h_chat_messages').select('*').eq('channel', ch).lt('created_at', t.created_at).order('created_at', { ascending: false }).limit(15));
        if (before.length < 15) CHAT.older[ch] = 'done';
        chatAddMsgs(rows.concat(before));
      } catch (e) { fail(e); }
    } else if (t) chatAddMsgs([t]);
  }
  CHAT.lim[ch] = Math.max(CHAT.lim[ch] || 300, (CHAT.msgs[ch] || []).length);
  CHAT.focusId = id; CHAT.q = ''; if ($('cpQ')) $('cpQ').value = '';
  openChat(ch);
}
/* pretraga kroz celu istoriju (i ono što nije učitano) */
function chatSearch(v) {
  CHAT.q = v; renderChatSide(); clearTimeout(CHAT.qT);
  const s = v.trim(); if (s.length < 2) { CHAT.srv = []; return; }
  CHAT.qT = setTimeout(async () => {
    try { const rows = await q(sb.from('h_chat_messages').select('*').ilike('body', '%' + s.replace(/[%_\\]/g, '') + '%').order('created_at', { ascending: false }).limit(80)); if (CHAT.q.trim() !== s) return; CHAT.srv = rows; renderChatSide(); } catch (e) {}
  }, 280);
}
function chatLive() {
  try {
    CHAT.rt = sb.channel('crm-chat', { config: { presence: { key: who() } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'h_chat_messages' }, p => chatIncoming(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'h_chat_messages' }, p => chatUpdated(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'h_chat_reads' }, p => chatReadEvt(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'h_chat_reactions' }, p => chatRxEvt(p))
      .on('presence', { event: 'sync' }, () => { try { seenFromPresence(CHAT.rt.presenceState()); } catch (e) {} if (CHAT.open) { renderChatSide(); renderChatTop(); } renderTeamPres(); })
      .on('broadcast', { event: 'typing' }, ({ payload }) => chatTypingEvt(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'h_last_seen' }, p => { const r = p.new; if (r && r.username) { SEEN[r.username] = { at: r.last_seen_at, device: r.device }; renderTeamPres(); } })
      .subscribe(async (s) => { if (s === 'SUBSCRIBED') { try { await CHAT.rt.track({ at: Date.now(), away: document.hidden }); } catch (e) {} } });
  } catch (e) { console.warn('chat uživo', e); }
}
function chatInit() { document.body.classList.add('chat-ready'); chatLoad(); chatLive(); seenInit(); CHAT.poll = setInterval(chatPoll, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) { chatPoll(); if (CHAT.open && !(isChatMobile() && CHAT.list)) chatMarkRead(CHAT.ch); } }); }
function chatIncoming(m) {
  if (!m || !m.channel || !chatKnown(m.channel)) return;
  const a = CHAT.msgs[m.channel] = CHAT.msgs[m.channel] || [];
  if (m.author === who()) { const ti = a.findIndex(x => x._tmp && (x.body || null) === (m.body || null) && (x.image_url || null) === (m.image_url || null) && (x.audio_url || null) === (m.audio_url || null)); if (ti >= 0) a.splice(ti, 1); }
  if (a.some(x => x.id === m.id)) { if (CHAT.open) renderChatMsgs(); return; }
  a.push(m); a.sort((x, y) => x.created_at.localeCompare(y.created_at));
  if (CHAT.typing[m.channel]) delete CHAT.typing[m.channel][m.author];
  const viewing = CHAT.open && CHAT.ch === m.channel && !document.hidden && !(isChatMobile() && CHAT.list);
  if (m.kind === 'huddle' && m.author !== who() && !m.deleted_at && Date.now() - new Date(m.created_at) < 90000) hudRing(m.channel, m.author);
  if (viewing) chatMarkRead(m.channel);
  else if (m.kind === 'huddle') {}
  else if (chatMentionsMe(m) || (isTaskCh(m.channel) && m.author !== who() && chatWatch(m.channel))) { sfx('notif'); chatPop(m); }
  chatBadges(); if (isTaskCh(m.channel) && state.tab === 'tasks') renderTasks();
  if (CHAT.open) { renderChatSide(); if (CHAT.ch === m.channel) renderChatMsgs(m.author === who() || chatNearBottom()); }
}
function chatReadEvt(r) {
  if (!r || !chatKnown(r.channel)) return;
  if (r.username === who()) { if ((CHAT.reads[r.channel] || '') < r.last_read_at) { CHAT.reads[r.channel] = r.last_read_at; chatBadges(); if (CHAT.open) renderChatSide(); } }
  else { (CHAT.seen[r.channel] = CHAT.seen[r.channel] || {})[r.username] = r.last_read_at; if (CHAT.open && CHAT.ch === r.channel) renderChatMsgs(chatNearBottom()); }
}
function chatMarkRead(ch) {
  const last = (CHAT.msgs[ch] || []).filter(m => !m._tmp).slice(-1)[0]; if (!last || (CHAT.reads[ch] || '') >= last.created_at) return;
  CHAT.reads[ch] = last.created_at; chatBadges();
  clearTimeout(CHAT.readT[ch]); CHAT.readT[ch] = setTimeout(() => { sb.from('h_chat_reads').upsert({ username: who(), channel: ch, last_read_at: last.created_at }, { onConflict: 'username,channel' }).then(() => {}); }, 500);
}
function chatBadges() {
  const n = chatUnreadTotal(), t = n > 99 ? '99+' : String(n);
  ['chatTopBadge', 'chatFabBadge', 'navChatBadge'].forEach(id => { const b = $(id); if (b) { b.textContent = t; b.style.display = n ? '' : 'none'; } });
  const ment = chatChannels().some(c => { const r = CHAT.reads[c] || ''; return (CHAT.msgs[c] || []).some(m => m.created_at > r && chatMentionsMe(m)); });
  document.body.classList.toggle('chat-ment', ment);
  const base = 'COMPLETE CRM'; document.title = n ? `(${t}) ${base}` : base;
  try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (e) {}
}
/* ---- otvaranje ---- */
function openChat(ch) {
  if (!state.user) return;
  if (ch && chatKnown(ch)) { if (isTaskCh(ch) && !isTaskCh(CHAT.ch)) CHAT.prevCh = CHAT.ch; CHAT.ch = ch; CHAT.list = false; }
  else { if (isTaskCh(CHAT.ch)) CHAT.ch = CHAT.prevCh || 'tim'; if (isChatMobile()) CHAT.list = true; }
  if (isTaskCh(CHAT.ch)) taskAuditLoad(CHAT.ch);
  CHAT.open = true; document.body.classList.add('chat-open'); $('chatPanel').classList.add('open');
  try { closeNav(); closeCmd(); if (BOT.open) closeBot(); } catch (e) {}
  chatVV();
  renderChat(true);
  if (!(isChatMobile() && CHAT.list)) { chatMarkRead(CHAT.ch); if (!isChatMobile()) setTimeout(() => $('cpInput').focus(), 60); }
  if (!CHAT.loaded) chatLoad();
}
function closeChat() { if (VOICE.rec) voiceStop(false); chatActClose(); CHAT.open = false; document.body.classList.remove('chat-open', 'chat-task'); $('chatPanel').classList.remove('open'); chatGifClose(); $('cpMention').style.display = 'none'; try { $('cpInput').blur(); } catch (e) {} chatVV(); }
/* telefon: kad se otvori tastatura, chat staje tačno u vidljivi deo ekrana */
function chatVV() {
  const p = $('chatPanel'), v = window.visualViewport; if (!p) return;
  if (!v || !CHAT.open || !isChatMobile()) { p.style.height = ''; p.style.top = ''; return; }
  p.style.height = v.height + 'px'; p.style.top = v.offsetTop + 'px';
}
function chatSelect(ch) { if (CHAT.edit) chatEditCancel(); if (isTaskCh(ch) && !isTaskCh(CHAT.ch)) CHAT.prevCh = CHAT.ch; if (isTaskCh(ch)) taskAuditLoad(ch); CHAT.ch = ch; CHAT.list = false; CHAT.q = ''; if ($('cpQ')) $('cpQ').value = ''; renderChat(true); chatMarkRead(ch); if (!isChatMobile()) setTimeout(() => $('cpInput').focus(), 40); }
/* ---- prikaz ---- */
const chatTime = (iso) => new Date(iso).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' });
function chatDayLbl(d) { const t = dayStr(new Date()), y = new Date(); y.setDate(y.getDate() - 1); return d === t ? 'Danas' : d === dayStr(y) ? 'Juče' : new Date(d + 'T12:00:00').toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' }); }
function chatFmt(t) {
  let h = esc(t || '');
  h = h.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  h = h.replace(MENTION_RE, (s, nm) => { const k = normMention(nm); return `<span class="cm-at ${k === who() || k === 'svi' ? 'me' : ''}">@${esc(k === 'svi' ? 'svi' : personName(k))}</span>`; });
  return h.replace(/\n/g, '<br>');
}
const chatAv = (k, cls = '') => `<span class="n-av ${PEOPLE[k] ? k : 'system'} ${cls}">${esc(personName(k).charAt(0))}${CHAT.online.has(k) && k !== who() ? '<i class="on-dot"></i>' : ''}</span>`;
function chatPreview(ch) {
  const m = (CHAT.msgs[ch] || []).slice(-1)[0]; if (!m) return { t: ch === 'tim' ? 'Grupa za ceo tim' : 'Privatna poruka', at: '' };
  const who_ = m.author === who() ? 'Ti: ' : ch === 'tim' || isTaskCh(ch) ? personName(m.author) + ': ' : '';
  if (m.deleted_at) return { t: who_ + 'poruka je obrisana', at: dayStr(new Date(m.created_at)) === dayStr(new Date()) ? chatTime(m.created_at) : new Date(m.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) };
  if (m.kind === 'huddle') return { t: who_ + '📞 huddle poziv', at: dayStr(new Date(m.created_at)) === dayStr(new Date()) ? chatTime(m.created_at) : new Date(m.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) };
  if (m.audio_url && !m.body) return { t: who_ + '🎤 glasovna poruka', at: dayStr(new Date(m.created_at)) === dayStr(new Date()) ? chatTime(m.created_at) : new Date(m.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) };
  return { t: who_ + (m.body ? m.body.replace(/\s+/g, ' ') : (/\.gif(\?|$)/i.test(m.image_url || '') ? 'GIF' : '📷 Slika')), at: dayStr(new Date(m.created_at)) === dayStr(new Date()) ? chatTime(m.created_at) : new Date(m.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) };
}
function renderChat(toBottom) { const tm = isTaskCh(CHAT.ch); $('chatPanel').classList.toggle('task-mode', tm); document.body.classList.toggle('chat-task', tm); if (tm) CHAT.list = false; chatActClose(); renderChatSide(); renderChatTop(); renderChatMsgs(toBottom); renderChatTyping(); renderChatReply(); $('chatPanel').classList.toggle('show-list', isChatMobile() && CHAT.list); $('cpInput').placeholder = tm ? 'Napiši komentar…' : CHAT.ch === 'tim' ? (isChatMobile() ? 'Poruka timu…' : 'Poruka timu… (@ime da nekog označiš)') : `Piši ${({ konstantin: 'Konstantinu', stasa: 'Staši', marjan: 'Marjanu' })[chatOther(CHAT.ch)] || chatTitle(CHAT.ch)}…`; }
function renderChatSide() {
  if (isTaskCh(CHAT.ch)) { const b = $('cpTask'); if (b) { const ta = b.querySelector('[data-tdinput]'); if (!TD.force && ta && ta === document.activeElement) { TD.pending = true; return; } b.innerHTML = isChatMobile() ? '' : taskDetailsHtml(CHAT.ch); } return; }
  const qn = fold(CHAT.q.trim());
  if (qn) {
    const seen = new Set(), res = [];
    chatChannels().flatMap(c => (CHAT.msgs[c] || []).filter(m => !m._tmp && m.body && fold(m.body + ' ' + personName(m.author)).includes(qn))).concat(CHAT.srv.filter(m => chatKnown(m.channel))).forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); res.push(m); CHAT.res[m.id] = m; } });
    res.sort((a, b) => b.created_at.localeCompare(a.created_at)); res.splice(80);
    $('cpList').innerHTML = res.map(m => `<button class="cl-it res" data-chatgo="${m.channel}|${m.id}">${chatAv(m.author)}<span class="cl-t"><b>${esc(personName(m.author))} <small>· ${esc(chatTitle(m.channel))}</small></b><small>${esc(tcut(m.body, 90))}</small></span><span class="cl-r"><small>${new Date(m.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: new Date(m.created_at).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}</small></span></button>`).join('') || '<div class="cl-empty">Ništa nije nađeno.</div>';
    return;
  }
  const lastAt = (c) => ((CHAT.msgs[c] || []).slice(-1)[0] || {}).created_at || '';
  const order = ['tim', ...chatBase().slice(1).sort((a, b) => lastAt(b).localeCompare(lastAt(a)))];
  $('cpList').innerHTML = order.map(c => { const p = chatPreview(c), u = chatUnread(c), o = chatOther(c), ment = (CHAT.msgs[c] || []).some(m => m.created_at > (CHAT.reads[c] || '') && chatMentionsMe(m));
    return `<button class="cl-it ${c === CHAT.ch && !(isChatMobile() && CHAT.list) ? 'on' : ''} ${u ? 'unread' : ''}" data-chat="${c}">${c === 'tim' ? '<span class="n-av cl-grp">H</span>' : chatAv(o)}<span class="cl-t"><b>${esc(chatTitle(c))}${hudOthers(c).length || HUD.room === c ? ' <i class="cl-hud">📞</i>' : ''}${o && seenShort(o) ? ` <em class="cl-seen ${seenCls(o)}">${seenShort(o)}</em>` : ''}</b><small>${esc(tcut(p.t, 60))}</small></span><span class="cl-r"><small>${p.at}</small>${u ? `<span class="cl-n ${ment ? 'ment' : ''}">${ment ? '@' : u}</span>` : ''}</span></button>`; }).join('') + chatTaskListHtml();
}
/* lista „Zadaci“ u chatu: razgovori na zadacima (prvo oni koje pratiš) */
function chatTaskListHtml() {
  const lastAt = (c) => ((CHAT.msgs[c] || []).slice(-1)[0] || {}).created_at || '';
  const chs = chatTaskChs().sort((a, b) => (chatWatch(b) - chatWatch(a)) || lastAt(b).localeCompare(lastAt(a))).slice(0, 40);
  if (!chs.length) return '<div class="cl-sec">Zadaci</div><div class="cl-empty sm">Komentari na zadacima će se pojaviti ovde. Otvori zadatak u Taskovima i piši.</div>';
  return '<div class="cl-sec">Komentari na zadacima</div>' + chs.map(c => {
    const t = taskOfCh(c), p = chatPreview(c), u = chatWatch(c) ? chatUnread(c) : 0, ment = (CHAT.msgs[c] || []).some(m => m.created_at > (CHAT.reads[c] || '') && chatMentionsMe(m));
    return `<button class="cl-it task ${u ? 'unread' : ''}" data-chat="${c}"><span class="n-av cl-tk">${t ? t.src.ic : '☑'}</span><span class="cl-t"><b>${esc(chatTitle(c))}</b><small>${esc(tcut(p.t, 60))}</small></span><span class="cl-r"><small>${p.at}</small>${u ? `<span class="cl-n ${ment ? 'ment' : ''}">${ment ? '@' : u}</span>` : ''}</span></button>`;
  }).join('');
}
function renderChatTop() {
  const c = CHAT.ch, o = chatOther(c);
  if (isTaskCh(c)) { const n = (CHAT.msgs[c] || []).filter(m => !m._tmp && !m.deleted_at).length; $('cpTop').innerHTML = `<button class="cp-tback" data-tdback title="Nazad u chat">‹ Chat</button><span class="cp-tt"><b>Aktivnost</b><small>${n ? `${n} ${bpl(n, 'komentar', 'komentara', 'komentara')}` : 'komentari i promene na zadatku'}</small></span><button class="cp-x" data-chatclose title="Zatvori">✕</button>`; return; }
  const sub = c === 'tim' ? Object.keys(PEOPLE).filter(k => k !== who()).map(k => `${personName(k)} ${seenShort(k) || ''}`.trim()).join(' · ') : seenText(o);
  const live = hudOthers(c), inRoom = HUD.room === c;
  const hb = inRoom ? `<button class="cp-hud in" data-hudstage title="Prikaži huddle">${HUD_IC.phone}<span>U huddle-u</span></button>` : live.length ? `<button class="cp-hud live" data-hudjoin="${c}" title="Pridruži se">${HUD_IC.phone}<span>Pridruži se · ${esc(live.map(personName).join(', '))}</span></button>` : `<button class="cp-hud" data-hudjoin="${c}" title="${c === 'tim' ? 'Pokreni huddle sa timom' : 'Pozovi'}">${HUD_IC.phone}<span>${c === 'tim' ? 'Huddle' : 'Pozovi'}</span></button>`;
  $('cpTop').innerHTML = `<button class="cp-back" data-chatback title="Nazad">‹</button>${c === 'tim' ? '<span class="n-av cl-grp">H</span>' : chatAv(o)}<span class="cp-tt"><b>${esc(chatTitle(c))}</b><small>${esc(sub)}</small></span>${HUD.tx ? hb : ''}<button class="cp-x" data-chatclose title="Zatvori">✕</button>`;
}
const chatNearBottom = () => { const b = $('cpMsgs'); return !b || b.scrollHeight - b.scrollTop - b.clientHeight < 140; };
function renderChatMsgs(toBottom) {
  const box = $('cpMsgs'); if (!box) return;
  const all = CHAT.msgs[CHAT.ch] || [], lim = CHAT.lim[CHAT.ch] || 300, list = all.slice(-lim), me = who();
  if (isTaskCh(CHAT.ch)) return renderTaskThread(box, all, toBottom);
  let html = all.length && (all.length > lim || CHAT.older[CHAT.ch] !== 'done') ? '<button class="cm-older" data-chatolder>↑ Učitaj starije poruke</button>' : all.length ? '<div class="cm-start">Početak razgovora</div>' : '';
  if (!all.length) html += `<div class="cm-empty"><b>${CHAT.ch === 'tim' ? 'Ovo je početak timskog chata 👋' : 'Ovo je početak vašeg privatnog razgovora'}</b><span>${CHAT.ch === 'tim' ? 'Piši timu ovde. Obaveštenje na telefon dobija samo onaj koga označiš, npr. <b>@Staša</b>, ili svi sa <b>@svi</b>.' : `Ovo vidite samo ti i ${esc(chatTitle(CHAT.ch))}. Obaveštenje na telefon stiže kad napišeš <b>@${esc(chatTitle(CHAT.ch))}</b>.`}</span><small>Na poruku odgovaraš i reaguješ dugim držanjem (na računaru ☺ pored poruke). Svoje poruke možeš da izmeniš ili obrišeš.</small></div>`;
  let prev = null, lastDay = '';
  const lastMine = [...list].reverse().find(m => m.author === me && !m._tmp);
  list.forEach(m => {
    const d = dayStr(new Date(m.created_at));
    if (d !== lastDay) { html += `<div class="cm-day"><span>${chatDayLbl(d)}</span></div>`; lastDay = d; prev = null; }
    const mine = m.author === me, grp = prev && prev.author === m.author && (new Date(m.created_at) - new Date(prev.created_at)) < 5 * 60e3;
    const img = m.image_url ? `<img class="cm-img" src="${esc(m.image_url)}" alt="" loading="lazy" data-zoom>` : '';
    if (m.kind === 'huddle' && !m.deleted_at) {
      const lastH = [...list].reverse().find(x => x.kind === 'huddle'), live = lastH && lastH.id === m.id ? hudOthers(CHAT.ch) : [], inRoom = HUD.room === CHAT.ch && lastH && lastH.id === m.id;
      html += `<div class="cm-sys" data-hmid="${m.id}"><span class="cs-ic">${HUD_IC.phone}</span><span><b>${mine ? 'Ti' : esc(personName(m.author))}</b> ${mine ? (PEOPLE[me]?.f ? 'si pokrenula' : 'si pokrenuo') : (PEOPLE[m.author]?.f ? 'je pokrenula' : 'je pokrenuo')} huddle · ${chatTime(m.created_at)}</span>${inRoom ? '<small class="cs-on">u toku, ti si unutra</small>' : live.length ? `<button type="button" data-hudjoin="${CHAT.ch}">Pridruži se · ${esc(live.map(personName).join(', '))}</button>` : '<small>završen</small>'}</div>`;
      prev = null; return;
    }
    if (m.deleted_at) {
      html += `<div class="cm del ${mine ? 'mine' : ''} ${grp ? 'grp' : ''}" data-mid="${m.id}">${mine ? '' : grp ? '<span class="cm-sp"></span>' : chatAv(m.author, 'cm-av')}<div class="cm-w"><div class="cm-b"><span class="cm-del">🚫 ${mine ? (PEOPLE[me]?.f ? 'Obrisala si ovu poruku' : 'Obrisao si ovu poruku') : 'Poruka je obrisana'}</span><span class="cm-time">${chatTime(m.created_at)}</span></div></div></div>`;
      prev = m; return;
    }
    const rx = chatRxHtml(m), q_ = m.reply_to ? chatQuoteHtml(m.reply_to) : '';
    html += `<div class="cm ${mine ? 'mine' : ''} ${grp && !q_ ? 'grp' : ''} ${chatMentionsMe(m) ? 'ment' : ''} ${m._tmp ? 'tmp' : ''} ${m._err ? 'err' : ''} ${CHAT.focusId === m.id ? 'focus' : ''} ${rx ? 'has-rx' : ''} ${CHAT.edit && CHAT.edit.id === m.id ? 'editing' : ''}" data-mid="${m.id}">
      ${mine ? '' : grp && !q_ ? '<span class="cm-sp"></span>' : chatAv(m.author, 'cm-av')}
      <div class="cm-w"><div class="cm-b">${!mine && (!grp || q_) && CHAT.ch === 'tim' ? `<b class="cm-n ${m.author}">${esc(personName(m.author))}</b>` : ''}${q_}${img}${voiceHtml(m)}${m.body ? `<div class="cm-t">${chatFmt(m.body)}</div>` : ''}<span class="cm-time">${m._err ? 'nije poslato' : m._tmp ? 'šalje se…' : (m.edited_at ? 'izmenjeno · ' : '') + chatTime(m.created_at)}</span></div>${rx}</div>
      ${m._tmp ? '' : `<div class="cm-tools"><button type="button" data-actopen="${m.id}" title="${mine ? 'Reaguj, izmeni, obriši' : 'Reaguj'}">☺</button><button type="button" data-reply="${m.id}" title="Odgovori">↩</button></div>`}</div>`;
    if (lastMine && m.id === lastMine.id) {
      const seen = Object.entries(CHAT.seen[CHAT.ch] || {}).filter(([k, at]) => k !== me && at >= m.created_at).map(([k]) => k);
      if (seen.length) html += `<div class="cm-seen">${CHAT.ch === 'tim' ? 'Videli: ' + seen.map(personName).join(', ') : 'Viđeno'} ✓✓</div>`;
    }
    prev = m;
  });
  box.innerHTML = html;
  chatNeedFetch();
  if (CHAT.focusId) { const el = box.querySelector(`[data-mid="${CHAT.focusId}"]`); if (el) { el.scrollIntoView({ block: 'center' }); box.querySelectorAll('img').forEach(i => i.addEventListener('load', () => el.scrollIntoView({ block: 'center' }), { once: true })); setTimeout(() => { CHAT.focusId = null; el.classList.remove('focus'); }, 2500); return; } }
  if (toBottom) { box.scrollTop = box.scrollHeight; box.querySelectorAll('img').forEach(i => i.addEventListener('load', () => { if (chatNearBottom() || toBottom) box.scrollTop = box.scrollHeight; }, { once: true })); }
}
function renderChatTyping() {
  const el = $('cpTyping'); if (!el) return; const t = CHAT.typing[CHAT.ch] || {}, now = Date.now();
  const ks = Object.keys(t).filter(k => now - t[k] < 3800);
  el.innerHTML = ks.length ? `<span class="ty-dots"><i></i><i></i><i></i></span>${esc(ks.map(personName).join(', '))} ${ks.length > 1 ? 'kucaju' : 'kuca'}…` : '';
}
function chatTypingEvt(p) { if (!p || p.who === who() || !chatKnown(p.ch)) return; (CHAT.typing[p.ch] = CHAT.typing[p.ch] || {})[p.who] = Date.now(); if (CHAT.open && CHAT.ch === p.ch) { renderChatTyping(); setTimeout(renderChatTyping, 4000); } }
function chatTypingSend() { const now = Date.now(); if (!CHAT.rt || now - CHAT.typeAt < 2500) return; CHAT.typeAt = now; try { CHAT.rt.send({ type: 'broadcast', event: 'typing', payload: { ch: CHAT.ch, who: who() } }); } catch (e) {} }
/* ---- slanje ---- */
async function chatSend(extra) {
  if (!extra && CHAT.edit && CHAT.edit.ch === CHAT.ch) return chatEditSave();
  const inp = $('cpInput'), body = ((extra && 'body' in extra) ? extra.body : inp.value || '').trim(), image_url = (extra && extra.image_url) || null, audio_url = (extra && extra.audio_url) || null, audio_sec = (extra && extra.audio_sec) || null, kind = (extra && extra.kind) || null, ch = (extra && extra.ch) || CHAT.ch;
  if (!body && !image_url && !audio_url) return;
  if (body.length > 4000) return toast('Poruka je preduga (najviše 4.000 znakova)');
  const rt = kind ? null : CHAT.reply[ch], reply_to = rt && !rt._tmp ? rt.id : null; if (rt) { delete CHAT.reply[ch]; renderChatReply(); }
  const tmp = { id: 'tmp' + Date.now() + Math.random(), _tmp: true, channel: ch, author: who(), body: body || null, image_url, audio_url, audio_sec, kind, reply_to, mentions: [], created_at: new Date().toISOString() };
  (CHAT.msgs[ch] = CHAT.msgs[ch] || []).push(tmp);
  if (!extra || !('body' in extra)) { inp.value = ''; chatGrow(); chatMentionBox(); chatFormState(); }
  renderChatMsgs(true); sfx('move');
  try { const r = await q(sb.from('h_chat_messages').insert({ channel: ch, author: who(), body: body || null, image_url, audio_url, audio_sec, kind, reply_to }).select().single()); chatIncoming(r); chatMarkRead(ch); return r; }
  catch (e) { tmp._err = true; renderChatMsgs(); fail(e); }
}
async function chatUpload(file) {
  if (!file || !/^image\//.test(file.type)) return toast('Može slika ili GIF');
  if (file.size > 12 * 1024 * 1024) return toast('Fajl je veći od 12 MB');
  const ch = CHAT.ch, tmp = { id: 'tmp' + Date.now(), _tmp: true, channel: ch, author: who(), body: null, image_url: URL.createObjectURL(file), mentions: [], created_at: new Date().toISOString() };
  (CHAT.msgs[ch] = CHAT.msgs[ch] || []).push(tmp); renderChatMsgs(true);
  try { const url = await uploadImage(file, 'chat'); CHAT.msgs[ch] = CHAT.msgs[ch].filter(x => x !== tmp); await chatSend({ body: '', image_url: url }); }
  catch (e) { tmp._err = true; renderChatMsgs(); fail(e); }
}
function chatGrow() { const t = $('cpInput'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
/* @ označavanje: predlozi dok kucaš */
function chatMentionBox() {
  const t = $('cpInput'), box = $('cpMention'), pos = t.selectionStart, before = t.value.slice(0, pos), m = before.match(/(^|\s)@([\p{L}]*)$/u);
  if (!m) { box.innerHTML = ''; box.style.display = 'none'; return; }
  const qn = fold(m[2]), opts = [...chatMembers(CHAT.ch).filter(k => k !== who()).map(k => [k, personName(k)]), ...(CHAT.ch === 'tim' ? [['svi', 'svi (ceo tim)']] : [])].filter(([k, n]) => !qn || fold(n).startsWith(qn) || k.startsWith(qn));
  if (!opts.length) { box.style.display = 'none'; return; }
  box.innerHTML = opts.map(([k, n], i) => `<button type="button" class="${i ? '' : 'on'}" data-ment="${k}">${k === 'svi' ? '<span class="n-av cl-grp">@</span>' : chatAv(k)}<b>${esc(n)}</b>${k !== 'svi' && seenShort(k) ? `<small class="mb-seen">${seenShort(k)}</small>` : ''}</button>`).join('');
  box.style.display = '';
}
function chatMentionPick(k) {
  const t = $('cpInput'), pos = t.selectionStart, before = t.value.slice(0, pos).replace(/@[\p{L}]*$/u, ''), name = k === 'svi' ? 'svi' : personName(k);
  t.value = before + '@' + name + ' ' + t.value.slice(pos); const np = before.length + name.length + 2; t.setSelectionRange(np, np); t.focus(); chatMentionBox(); chatGrow();
}
/* ---- GIF ---- */
function giphyFromLink(u) {
  u = String(u || '').trim(); if (!/^https?:\/\//.test(u)) return null;
  const g = u.match(/giphy\.com\/(?:gifs|stickers)\/(?:[^\/?#]*-)?([A-Za-z0-9]+)(?:[\/?#]|$)/); if (g) return `https://media.giphy.com/media/${g[1]}/giphy.gif`;
  if (/\.(gif|webp|png|jpe?g)(\?|$)/i.test(u) || /media\d*\.giphy\.com|media\.tenor\.com/.test(u)) return u;
  return null;
}
async function chatGifOpen() {
  const g = CHAT.gif; g.open = !g.open; const box = $('cpGifBox'); box.classList.toggle('open', g.open); if (!g.open) return;
  renderGifBox(); if (g.configured !== false && !g.items.length) await chatGifSearch('');
}
function chatGifClose() { CHAT.gif.open = false; const b = $('cpGifBox'); if (b) b.classList.remove('open'); }
async function chatGifSearch(qs, more) {
  const g = CHAT.gif; g.q = qs; if (!more) { g.items = []; g.off = 0; }
  try {
    const { data } = await sb.auth.getSession(); const tok = data.session?.access_token;
    const r = await fetch(SUPABASE_URL + '/functions/v1/crm-gif', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ q: qs, offset: g.off }) });
    const d = await r.json(); g.configured = !!d.configured; g.items = g.items.concat(d.items || []); g.off = g.items.length;
  } catch (e) { g.configured = false; }
  renderGifBox();
}
function renderGifBox() {
  const g = CHAT.gif, box = $('cpGifBox'); if (!box) return;
  const tools = `<div class="gb-tools"><button type="button" class="gb-up" data-gifup>📁 GIF ili slika sa uređaja</button><form class="gb-link" data-giflink><input placeholder="…ili nalepi link GIF-a (Giphy)" id="gbLink"><button>Pošalji</button></form></div>`;
  if (g.configured === false) { box.innerHTML = `<div class="gb-head"><b>GIF</b><button type="button" data-gifclose>✕</button></div>${tools}<div class="gb-note">Izaberi GIF iz galerije telefona ili računara, ili nalepi link sa Giphy-ja. GIF-ovi se šalju animirani.</div>`; return; }
  box.innerHTML = `<div class="gb-head"><input id="gbQ" placeholder="Traži GIF… (npr. bravo, haha, wow)" value="${esc(g.q)}" autocomplete="off"><button type="button" data-gifclose>✕</button></div><div class="gb-grid">${g.items.map(it => `<button type="button" data-gifpick="${esc(it.url)}" title="${esc(it.title || '')}"><img src="${esc(it.preview)}" loading="lazy" alt=""></button>`).join('') || '<div class="gb-note">Tražim…</div>'}</div>${g.items.length ? '<button type="button" class="gb-more" data-gifmore>Još GIF-ova</button>' : ''}${tools}<div class="gb-by">Powered by GIPHY</div>`;
}
/* iskačuća kartica kad te neko označi, a chat nije otvoren na tom razgovoru */
function cpopEl() {
  let el = $('cpop'); if (!el) { el = document.createElement('div'); el.id = 'cpop'; el.className = 'cpop'; document.body.appendChild(el); el.addEventListener('click', (e) => { if (e.target.closest('[data-cpx]')) { el.classList.remove('in'); return; } el.classList.remove('in'); if (el.dataset.go) crmGo(el.dataset.go); else openChat(el.dataset.ch); }); }
  return el;
}
function chatPop(m) {
  const el = cpopEl(); el.dataset.go = '';
  el.dataset.ch = m.channel;
  el.innerHTML = `${chatAv(m.author)}<div class="cpop-b"><b>${esc(personName(m.author))} ${isTaskCh(m.channel) ? `· ${esc(tcut(chatTitle(m.channel), 50))}` : m.channel === 'tim' ? (PEOPLE[m.author]?.f ? 'te je označila' : 'te je označio') : 'ti piše'}</b><span>${m.body ? chatFmt(tcut(m.body, 120)) : 'GIF / slika'}</span></div><button class="cpop-x" data-cpx>✕</button>`;
  void el.offsetWidth; el.classList.add('in'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('in'), 7000);
}
/* ================= @OZNAKE u svim poljima (ideja, skripta, zadatak, beleška, porudžbina…) =================
   Kucaš @ u bilo kom polju za tekst i biraš osobu. Kad se sačuva, označeni dobija obaveštenje (crm-push iz h_audit),
   a ako je CRM otvoren ispred njega, iskoči kartica. @Ime je svuda u CRM-u istaknuto. */
const MNT_RE = /(^|[^\p{L}\p{N}_.@])@(konstantin|stasa|staša|marjan|svi|sve|all)(?![\p{L}\p{N}_])/giu;
const MNT_RE1 = new RegExp(MNT_RE.source, 'iu');
const mntKey = (nm) => { const k = normMention(nm); return k === 'sve' ? 'svi' : k; };
function mentionsIn(s) { const out = new Set(); if (typeof s !== 'string' || s.indexOf('@') < 0) return out; for (const m of s.matchAll(MNT_RE)) out.add(mntKey(m[2])); return out; }
function rowMentions(r) { const out = new Set(); Object.values(r || {}).forEach(v => { if (typeof v === 'string') mentionsIn(v).forEach(k => out.add(k)); }); return out; }
function auditNewMentions(a) {
  if (!a || !a.new_row || a.new_row.deleted_at || !String(a.tbl || '').startsWith('h_')) return [];
  const nw = rowMentions(a.new_row); if (!nw.size) return [];
  const old = a.op === 'INSERT' ? {} : a.old_row || { ...a.new_row, ...Object.fromEntries(Object.entries(a.changed || {}).map(([k, v]) => [k, v && v.od])) };
  const od = rowMentions(old); return [...nw].filter(k => !od.has(k));
}
function mentionSnip(r, me) {
  for (const v of Object.values(r || {})) {
    if (typeof v !== 'string' || v.indexOf('@') < 0) continue;
    for (const m of v.matchAll(MNT_RE)) { const k = mntKey(m[2]); if (k !== me && k !== 'svi') continue; const i = m.index + m[1].length, a = Math.max(0, i - 80), b = Math.min(v.length, i + 80); return (a ? '…' : '') + v.slice(a, b).replace(/\s+/g, ' ').trim() + (b < v.length ? '…' : ''); }
  }
  return '';
}
const MNT_SEC = { h_notes: 'Beleške', h_posts: 'Objave + reklame', h_site_ideas: 'Sajt', h_packaging: 'Pakovanje', h_returns: 'Povrati', h_promotions: 'Promocije', h_orders: 'Porudžbine', h_customers: 'Kupci', h_products: 'Garderoba', h_story_sections: 'Brand story', h_activities: 'Komentar', h_milestones: 'Istorija', h_discount_codes: 'Kodovi', h_ad_spend: 'Reklame' };
function mentionCheck(a) {
  if (!state.user || !a || a.actor === who()) return;
  const ks = auditNewMentions(a); if (!ks.includes(who()) && !ks.includes('svi')) return;
  const r = a.new_row, T = NF_TBL[a.tbl], f = PEOPLE[a.actor]?.f; let label = '';
  try { label = T && T.name ? T.name(r) : ''; } catch (e) {}
  if (a.tbl === 'h_site_ideas' && r.area === 'packaging') label = label || r.title;
  const el = cpopEl(); el.dataset.ch = ''; el.dataset.go = `item:${a.tbl}:${r.id}`;
  el.innerHTML = `${chatAv(a.actor)}<div class="cpop-b"><b>${esc(personName(a.actor))} te ${f ? 'je označila' : 'je označio'}${MNT_SEC[a.tbl] ? ' · ' + esc(MNT_SEC[a.tbl]) : ''}</b><span>${label && a.tbl !== 'h_notes' ? `<i class="cpop-it">${esc(tcut(label, 60))}</i> ` : ''}${chatFmt(mentionSnip(r, who()))}</span></div><button class="cpop-x" data-cpx>✕</button>`;
  void el.offsetWidth; el.classList.add('in'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('in'), 9000);
  if (!nfSnoozed()) sfx('notif');
}
/* otvori stavku iz obaveštenja: item:<tabela>:<id> */
function itemOpen(tbl, id) {
  if (CHAT.open) closeChat();
  scrollLockSync();
  const lists = { h_notes: 'notes', h_orders: 'orders', h_products: 'products', h_variants: 'variants', h_posts: 'posts', h_returns: 'rets', h_promotions: 'promos', h_milestones: 'milestones', h_customers: 'customers', h_site_ideas: 'ideas', h_packaging: 'pack', h_discount_codes: 'codes', h_activities: 'acts', h_order_items: 'items', h_ad_spend: 'ads', h_loyalty_events: 'levents', h_story_sections: 'story' };
  const row = (state[lists[tbl]] || []).find(x => x.id === id) || (tbl === 'h_notes' ? (state.notesDel || []).find(x => x.id === id) : null);
  if (!row) { toast('Stavka nije pronađena (možda je obrisana)'); return; }
  if (tbl === 'h_notes' && row.area !== 'story' && !(row.area || '').startsWith('promo:')) {
    npState.who = 'all'; npState.area = 'all'; npState.status = row.deleted_at || row.done ? 'all' : 'open'; if ($('npQ')) $('npQ').value = '';
    document.querySelectorAll('#npStatus button').forEach(b => b.classList.toggle('active', b.dataset.s === npState.status));
    setTab('notes');
    setTimeout(() => { const el = document.querySelector(`[data-npid="${id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('np-flash'); setTimeout(() => el.classList.remove('np-flash'), 2600); } }, 250);
    return;
  }
  const T = NF_TBL[tbl]; let r = ''; try { r = T && T.open ? T.open(row) : ''; } catch (e) {}
  if (tbl === 'h_story_sections') r = 'tab:story';
  if (r) crmGo(r);
}
/* istakni @Ime svuda u CRM-u (osim u poljima za kucanje i u chatu, koji ima svoje) */
const MNT_SKIP = 'textarea,input,script,style,option,select,svg,[contenteditable],.at-m,.cm-at,.cm-t,#mntPop';
function mntHlNode(tn) {
  const p = tn.parentElement, s = tn.nodeValue; if (!p || !s || p.closest(MNT_SKIP) || !MNT_RE1.test(s)) return;
  const me = state.user ? who() : '', frag = document.createDocumentFragment(); let last = 0;
  for (const m of s.matchAll(MNT_RE)) {
    const st = m.index + m[1].length, en = m.index + m[0].length, k = mntKey(m[2]);
    if (st > last) frag.appendChild(document.createTextNode(s.slice(last, st)));
    const sp = document.createElement('span'); sp.className = 'at-m' + (k === me || k === 'svi' ? ' me' : ''); sp.textContent = s.slice(st, en); frag.appendChild(sp); last = en;
  }
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  tn.replaceWith(frag);
}
function mntScan(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.nodeValue.indexOf('@') >= 0) mntHlNode(root); return; }
  if (root.nodeType !== 1 || (root.closest && root.closest(MNT_SKIP))) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.indexOf('@') >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  const arr = []; while (w.nextNode()) arr.push(w.currentNode); arr.forEach(mntHlNode);
}
/* predlozi dok kucaš @ */
const MNT = { el: null, opts: [], i: 0, q: null, blurT: 0 };
function mntField(el) {
  if (!el || el.readOnly || el.disabled || !el.closest || el.id === 'cpInput' || el.id === 'botInput' || el.closest('[data-nomention]') || el.closest('#loginPage')) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT' || !['text', ''].includes((el.getAttribute('type') || '').toLowerCase())) return false;
  return /tnote|title|hook|goal|note|reason|detail|why|komentar|opis|zadat/i.test(`${el.id} ${el.name || ''} ${el.dataset.f || ''} ${el.placeholder || ''}`);
}
function mntCheck(el) {
  if (!state.user || !mntField(el)) return mntHide();
  const pos = el.selectionStart; if (pos == null || el.selectionEnd !== pos) return mntHide();
  const m = el.value.slice(0, pos).match(/(^|[\s(„“"'])@([\p{L}]{0,15})$/u); if (!m) return mntHide();
  const qn = fold(m[2]);
  const opts = [...Object.keys(PEOPLE).filter(k => k !== who()).map(k => [k, personName(k)]), ['svi', 'svi (ceo tim)']].filter(([k, n]) => !qn || fold(n).startsWith(qn) || k.startsWith(qn));
  if (!opts.length) return mntHide();
  if (MNT.el !== el || MNT.q !== qn) MNT.i = 0;
  MNT.el = el; MNT.opts = opts; MNT.q = qn; MNT.i = Math.min(MNT.i, opts.length - 1);
  mntRender(); mntPlace();
}
function mntPopEl() {
  let p = $('mntPop'); if (p) return p;
  p = document.createElement('div'); p.id = 'mntPop'; p.className = 'mnt-pop'; p.setAttribute('role', 'listbox'); document.body.appendChild(p);
  p.addEventListener('mousedown', (e) => e.preventDefault()); // da polje ne izgubi fokus
  p.addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (b) mntPick(b.dataset.mk); });
  return p;
}
function mntRender() {
  const p = mntPopEl();
  p.innerHTML = `<span class="mnt-h">Označi</span>` + MNT.opts.map(([k, n], i) => `<button type="button" role="option" class="${i === MNT.i ? 'on' : ''}" data-mk="${k}">${k === 'svi' ? '<span class="n-av mnt-all">@</span>' : `<span class="n-av ${k}">${esc(personName(k).charAt(0))}</span>`}<b>${esc(n)}</b></button>`).join('');
  p.classList.add('in');
}
function mntHide() { MNT.el = null; MNT.q = null; const p = $('mntPop'); if (p) p.classList.remove('in'); }
/* gde je kursor u polju (kopija polja van ekrana) */
function caretXY(el) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect(), d = document.createElement('div'), ta = el.tagName === 'TEXTAREA';
  ['boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize'].forEach(k => { d.style[k] = cs[k]; });
  Object.assign(d.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', whiteSpace: ta ? 'pre-wrap' : 'pre', overflowWrap: 'break-word', overflow: 'hidden', height: 'auto' });
  d.textContent = el.value.slice(0, el.selectionStart);
  const sp = document.createElement('span'); sp.textContent = el.value.slice(el.selectionStart) || '.'; d.appendChild(sp); document.body.appendChild(d);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
  const x = r.left + sp.offsetLeft - el.scrollLeft, y = r.top + sp.offsetTop - el.scrollTop;
  d.remove();
  return { x: Math.min(Math.max(x, r.left), r.right), y: Math.min(Math.max(y, r.top), r.bottom - lh), lh };
}
function mntPlace() {
  const p = $('mntPop'), el = MNT.el; if (!p || !el || !p.classList.contains('in')) return;
  const c = caretXY(el), vv = window.visualViewport, top0 = vv ? vv.offsetTop : 0, h0 = vv ? vv.height : innerHeight, w0 = vv ? vv.width : innerWidth, left0 = vv ? vv.offsetLeft : 0;
  const pw = Math.min(p.offsetWidth || 320, w0 - 16), ph = p.offsetHeight || 46;
  let top = c.y - ph - 8; if (top < top0 + 6) top = c.y + c.lh + 6;
  top = Math.min(Math.max(top, top0 + 6), top0 + h0 - ph - 6);
  const left = Math.min(Math.max(c.x - 24, left0 + 8), left0 + w0 - pw - 8);
  p.style.top = top + 'px'; p.style.left = left + 'px';
}
function mntPick(k) {
  const el = MNT.el; if (!el) return;
  const pos = el.selectionStart, v = el.value, before = v.slice(0, pos).replace(/@[\p{L}]*$/u, ''), name = k === 'svi' ? 'svi' : personName(k);
  el.value = before + '@' + name + ' ' + v.slice(pos);
  const np = before.length + name.length + 2; el.focus(); try { el.setSelectionRange(np, np); } catch (e) {}
  mntHide(); el.dispatchEvent(new Event('input', { bubbles: true }));
}
function mntInit() {
  document.addEventListener('input', (e) => { if (mntField(e.target)) mntCheck(e.target); else if (MNT.el) mntHide(); }, true);
  document.addEventListener('click', (e) => { if (MNT.el && e.target === MNT.el) mntCheck(MNT.el); });
  document.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) && mntField(e.target)) mntCheck(e.target); });
  window.addEventListener('keydown', (e) => {
    if (!MNT.el || e.target !== MNT.el || !$('mntPop') || !$('mntPop').classList.contains('in')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); MNT.i = (MNT.i + (e.key === 'ArrowDown' ? 1 : -1) + MNT.opts.length) % MNT.opts.length; mntRender(); return; }
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); return mntPick(MNT.opts[MNT.i][0]); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); mntHide(); }
  }, true);
  document.addEventListener('focusout', () => { clearTimeout(MNT.blurT); MNT.blurT = setTimeout(() => { if (MNT.el && document.activeElement !== MNT.el) mntHide(); }, 220); });
  const re = () => { if (MNT.el) mntPlace(); };
  window.addEventListener('scroll', re, true); window.addEventListener('resize', re);
  if (window.visualViewport) { visualViewport.addEventListener('resize', re); visualViewport.addEventListener('scroll', re); }
  const Q = new Set(); let T = 0;
  new MutationObserver((ms) => {
    ms.forEach(m => m.addedNodes.forEach(n => Q.add(n)));
    if (!T) T = requestAnimationFrame(() => { T = 0; const a = [...Q]; Q.clear(); a.forEach(n => { if (n.isConnected) mntScan(n); }); });
  }).observe(document.body, { childList: true, subtree: true });
  mntScan(document.body);
}
/* dok je otvoren chat, zadatak, prozor ili meni, stranica iza se ne pomera (i na iPhone-u) */
const SL = { on: false, y: 0 };
function scrollLockNeed() {
  const b = document.body.classList, mob = innerWidth < 760;
  return !!document.querySelector('.modal-wrap.open, .drawer.open, #lightbox.open, #cmdWrap.open') || b.contains('nav-open') || (b.contains('chat-open') && (mob || b.contains('chat-task'))) || (b.contains('bot-open') && mob);
}
function scrollLockSync() {
  const need = scrollLockNeed(); if (need === SL.on) return;
  SL.on = need; const b = document.body, h = document.documentElement;
  if (need) { SL.y = window.scrollY || h.scrollTop || 0; const sw = innerWidth - h.clientWidth; b.style.top = `-${SL.y}px`; if (sw > 0) b.style.paddingRight = sw + 'px'; h.classList.add('scroll-lock'); }
  else { h.classList.remove('scroll-lock'); b.style.top = ''; b.style.paddingRight = ''; window.scrollTo(0, SL.y); }
}
function scrollLockInit() {
  const mo = new MutationObserver(scrollLockSync), opt = { attributes: true, attributeFilter: ['class'] };
  [document.body, ...document.querySelectorAll('.modal-wrap, .drawer, #lightbox, #cmdWrap')].forEach(el => mo.observe(el, opt));
  window.addEventListener('resize', () => scrollLockSync());
}
/* zadatak: izmena naziva, zadatka i sadržaja direktno u prozoru zadatka (svako može) */
const TD = { edit: null, force: false, pending: false };
const TD_TF = { note: 'body', post: 'title', site: 'title', packidea: 'title', pack: 'name', promo: 'name', cust: 'name', product: 'name', story: 'title' };
const TD_EXTRA = { post: [['hook', 'Hook'], ['concept', 'Skripta']], site: [['description', 'Opis']], packidea: [['description', 'Opis']] };
const TD_REQ = new Set(['title', 'name', 'body']), TD_ONE = new Set(['title', 'name', 'hook']);
const tdEditing = (ch, f) => !!(TD.edit && TD.edit.ch === ch && TD.edit.f === f);
function tdFieldHtml(ch, label, f, val, ph) {
  if (tdEditing(ch, f)) {
    const v = TD.edit.v != null ? TD.edit.v : (val || '');
    return `<div class="td-f ed"><span class="td-fl">${esc(label)}</span><div class="td-ed"><textarea data-tdinput="${f}" rows="${TD_ONE.has(f) ? 1 : 3}" placeholder="${esc(ph || '')}">${esc(v)}</textarea>
      <div class="td-ed-b"><small>${TD_ONE.has(f) ? 'Enter čuva · ' : ''}@ime označava osobu</small><button type="button" class="td-mini" data-tdcancel>Otkaži</button><button type="button" class="td-mini td-ok" data-tdsave>Sačuvaj</button></div></div></div>`;
  }
  return `<div class="td-f" data-tdf="${f}" role="button" tabindex="0" title="Klikni da izmeniš"><span class="td-fl">${esc(label)}</span><span class="td-fv ${val ? '' : 'ph'}">${val ? esc(val) : esc(ph)}</span><span class="td-pen" aria-hidden="true">✎</span></div>`;
}
function tdGrow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 340) + 'px'; }
function tdRender() {
  TD.force = true;
  try { if (isChatMobile()) renderChatMsgs(false); else renderChatSide(); } finally { TD.force = false; }
}
function tdStart(f) {
  const tk = taskOfCh(CHAT.ch); if (!tk) return;
  if (tdEditing(CHAT.ch, f)) return;
  TD.edit = { ch: CHAT.ch, f, v: null }; tdRender();
  const ta = document.querySelector('#chatPanel [data-tdinput]'); if (!ta) return;
  tdGrow(ta); ta.focus(); const n = ta.value.length; try { ta.setSelectionRange(n, n); } catch (e) {}
  setTimeout(() => ta.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
}
function tdCancel() { TD.edit = null; TD.pending = false; tdRender(); }
async function tdSave() {
  const e = TD.edit; if (!e) return; const tk = taskOfCh(e.ch); if (!tk) return tdCancel();
  const ta = document.querySelector('#chatPanel [data-tdinput]'), v = String(ta ? ta.value : e.v || '').trim();
  if (TD_REQ.has(e.f) && !v) { toast('Naziv ne može da bude prazan'); if (ta) ta.focus(); return; }
  const { src, x } = tk, val = v || null;
  if ((x[e.f] || null) === val) return tdCancel();
  try {
    await q(sb.from(src.tbl).update({ [e.f]: val }).eq('id', x.id));
    x[e.f] = val; TD.edit = null; TD.pending = false; renderAll(); if (CHAT.open) renderChat(); toast('Sačuvano ✓');
    setTimeout(() => taskAuditLoad(e.ch), 900);
  } catch (er) { fail(er); }
}
/* ================= ZADATAK: detalji + komentari (kao ClickUp) ================= */
const fmtTaskTime = (iso) => { const d = new Date(iso), t = d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }); return dayStr(d) === dayStr(new Date()) ? 'danas ' + t : d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' }) + ' ' + t; };
const stLbl = (v) => ST[v] || (IDEA_ST.find(s => s.key === v) || {}).label || v || '—';
function taskEvtText(a) {
  const f = PEOPLE[a.actor]?.f, v = (m, z) => (f ? z : m), ch = a.changed || {}, out = [];
  if (a.op === 'INSERT') return v('napravio', 'napravila') + ' stavku';
  if (ch.assignees) {
    const od = ch.assignees.od || [], na = ch.assignees.na || [], add = na.filter(x => !od.includes(x)), rem = od.filter(x => !na.includes(x));
    if (add.length) out.push(`${v('dodelio', 'dodelila')} zadatak: ${add.map(personName).join(', ')}`);
    if (rem.length) out.push(`${v('skinuo', 'skinula')} sa zadatka: ${rem.map(personName).join(', ')}`);
  }
  if (ch.task_due_at && ch.task_due_at.na) out.push(`rok: ${fmtDT(ch.task_due_at.na)}`); else if (ch.task_due) out.push(ch.task_due.na ? `rok: ${fmtDate(ch.task_due.na)}` : v('skinuo', 'skinula') + ' rok');
  if (ch.task_prio) out.push(`prioritet: ${TPRIO[ch.task_prio.na || 'normal'].l}`);
  if (ch.task_done_at) out.push(ch.task_done_at.na ? `${v('završio', 'završila')} zadatak ✓` : `${v('ponovo otvorio', 'ponovo otvorila')} zadatak`);
  else if (ch.done) out.push(ch.done.na ? `${v('završio', 'završila')} belešku ✓` : `${v('vratio', 'vratila')} belešku`);
  if (ch.status) out.push(`status: ${stLbl(ch.status.od)} → ${stLbl(ch.status.na)}`);
  if (ch.task_note) out.push(ch.task_note.na ? `${v('promenio', 'promenila')} zadatak: „${tcut(ch.task_note.na, 70)}“` : `${v('obrisao', 'obrisala')} opis zadatka`);
  const nm = ch.title || ch.name; if (nm && nm.na) out.push(`${v('preimenovao', 'preimenovala')} u „${tcut(nm.na, 70)}“`);
  if (ch.body && a.op !== 'INSERT') out.push(`${v('izmenio', 'izmenila')} tekst: „${tcut(ch.body.na, 70)}“`);
  if (ch.hook) out.push(`${v('promenio', 'promenila')} hook`);
  if (ch.concept) out.push(`${v('izmenio', 'izmenila')} skriptu`);
  if (ch.description) out.push(`${v('izmenio', 'izmenila')} opis`);
  if (ch.deleted_at) out.push(ch.deleted_at.na ? `${v('obrisao', 'obrisala')} stavku` : `${v('vratio', 'vratila')} stavku iz arhive`);
  return out.join(' · ');
}
async function taskAuditLoad(ch) {
  const [, tbl, id] = String(ch).split(':');
  try { const rows = await q(sb.from('h_audit').select('id,at,actor,op,changed').eq('tbl', tbl).eq('row_id', id).order('at').limit(300)); CHAT.audit[ch] = rows; if (CHAT.open && CHAT.ch === ch) renderChatMsgs(chatNearBottom()); } catch (e) {}
}
function taskDetailsHtml(ch) {
  const t = taskOfCh(ch);
  if (!t) return '<div class="td"><div class="td-miss">Ova stavka više ne postoji ili je u arhivi. Komentari ostaju sačuvani.</div></div>';
  const { src, x } = t, as = assigneesOf(x), done = taskIsDone(x, src), d = !done && dueInfo(taskDueOf(x)), sec = src.sec ? src.sec(x) : src.label, pr = prioOf(x);
  const df = PEOPLE[x.task_done_by]?.f, bf = PEOPLE[x.task_by]?.f, hasNote = x.task_note && src.k !== 'note', tf = TD_TF[src.k];
  const hf = src.k === 'note' ? 'body' : hasNote ? 'task_note' : (tf || 'task_note'); // klik na naslov menja baš ono što piše u naslovu
  const det = src.k === 'note' ? tdFieldHtml(ch, 'Beleška', 'body', x.body, 'Tekst beleške') : [
    tf ? tdFieldHtml(ch, 'Stavka', tf, x[tf], 'Naziv') : `<div class="td-f ro"><span class="td-fl">Stavka</span><span class="td-fv">${esc(src.title(x))}</span></div>`,
    tdFieldHtml(ch, 'Zadatak', 'task_note', x.task_note, 'Dodaj šta treba da se uradi'),
    ...(TD_EXTRA[src.k] || []).map(([f, l]) => tdFieldHtml(ch, l, f, x[f], 'Dodaj…')),
  ].join('');
  return `<div class="td">
    <div class="td-crumb"><span>${src.ic} ${esc(sec)}</span>${src.k !== 'note' ? `<span>›</span><button type="button" data-tdopen>${esc(tcut(src.title(x), 60))} ↗</button>` : ''}</div>
    ${!done && pr !== 'normal' ? `<div class="td-pr">${prioChip(x, true)}</div>` : ''}<h2 class="td-title" data-tdf="${hf}" title="Klikni da izmeniš">${esc(src.k === 'note' ? tcut(x.body, 90) : taskLabel(t))}<span class="td-pen" aria-hidden="true">✎</span></h2>
    <div class="td-grid">
      <span class="td-l">◉ Status</span><span><button type="button" class="td-st ${done ? 'done' : ''}" data-tdtoggle title="${done ? 'Vrati u otvorene' : 'Označi kao gotovo'}">${done ? '✓ GOTOVO' : 'OTVOREN'}</button>${done ? '' : ' <button type="button" class="td-mini td-done" data-tdtoggle>✓ Završi zadatak</button>'}${done && x.task_done_by ? ` <small class="td-sm">${df ? 'završila' : 'završio'} ${esc(personName(x.task_done_by))}${x.task_done_at ? ' · ' + fmtDT(x.task_done_at) : ''}</small>` : ''}</span>
      <span class="td-l">👤 Zaduženi</span><span class="td-as">${as.length ? as.map(a => `<span class="td-p" title="${esc(seenText(a))}">${chatAv(a)}${esc(personName(a))}${a !== who() && seenShort(a) ? `<small class="td-seen ${seenCls(a)}">${seenShort(a)}</small>` : ''}</span>`).join('') : '<small class="td-sm">niko</small>'}<button type="button" class="td-mini" data-tdedit>Promeni</button></span>
      <span class="td-l">📅 Rok</span><span>${taskDueOf(x) ? `<b class="td-due ${d ? d.level : ''}">${x.task_due_at ? fmtDT(x.task_due_at) : fmtDate(x.task_due)}</b>${d ? ` <small class="td-sm">· ${d.txt}</small>` : ''}` : '<small class="td-sm">bez roka</small>'} <button type="button" class="td-mini" data-tdedit>Promeni</button></span>
      <span class="td-l">🚩 Prioritet</span><span class="td-prio">${['urgent', 'high', 'normal', 'low'].map(k => `<button type="button" class="prio-b ${k} ${pr === k ? 'on' : ''}" data-tdprio="${k}">${TPRIO[k].ic} ${TPRIO[k].l}</button>`).join('')}</span>
      <span class="td-l">↗ Dodelio/la</span><span>${x.task_by ? `${esc(personName(x.task_by))} <small class="td-sm">· ${bf ? 'dodelila' : 'dodelio'} ${x.task_at ? relTime(x.task_at) : ''}</small>` : '<small class="td-sm">—</small>'}</span>
      <span class="td-l">▦ Sekcija</span><span>${esc(sec)}</span>
    </div>
    <div class="td-desc"><small>Detalji <i>· klikni na polje da ga izmeniš, svako može</i></small>${det}${src.k !== 'note' && src.sub(x) ? `<span class="td-sub">${esc(src.sub(x))}</span>` : ''}</div>
    <div class="td-actions">${src.k !== 'note' ? `<button type="button" class="btn-ghost" data-tdopen>Otvori ${esc(src.label.toLowerCase())} ↗</button>` : ''}<button type="button" class="btn-ghost" data-tdedit>Zaduženi i rok</button></div>
  </div>`;
}
function renderTaskThread(box, all, toBottom) {
  const ch = CHAT.ch, me = who(), lim = CHAT.lim[ch] || 300, list = all.slice(-lim);
  if (!TD.force) { const ta = box.querySelector('[data-tdinput]'); if (ta && ta === document.activeElement) { TD.pending = true; return; } } // ne briši polje dok kucaš
  const evts = (CHAT.audit[ch] || []).map(a => ({ ev: true, at: a.at, a, txt: taskEvtText(a) })).filter(e => e.txt);
  const items = [...list.map(m => ({ at: m.created_at, m })), ...evts].sort((x, y) => String(x.at).localeCompare(String(y.at)));
  let html = isChatMobile() ? `<div class="td-m">${taskDetailsHtml(ch)}</div><div class="ta-h">Aktivnost</div>` : '';
  if (all.length > lim || (all.length && CHAT.older[ch] !== 'done')) html += '<button class="cm-older" data-chatolder>↑ Starija aktivnost</button>';
  if (!list.length) html += '<div class="ta-empty"><b>Još nema komentara</b>Piši ovde sve o ovom zadatku. <b class="in">@ime</b> šalje obaveštenje toj osobi, a zaduženi i ko je dodelio zadatak dobijaju obaveštenje za svaki komentar.</div>';
  items.forEach(it => {
    if (it.ev) { html += `<div class="tev">${chatAv(it.a.actor, 'tev-av')}<span><b>${esc(personName(it.a.actor))}</b> ${esc(it.txt)}</span><time>${fmtTaskTime(it.at)}</time></div>`; return; }
    const m = it.m, mine = m.author === me;
    const head = `<div class="tc-h">${chatAv(m.author, 'cm-av')}<b>${esc(personName(m.author))}</b><time>${m._err ? 'nije poslato' : m._tmp ? 'šalje se…' : fmtTaskTime(m.created_at)}${m.edited_at ? ' · izmenjeno' : ''}</time></div>`;
    if (m.deleted_at) { html += `<div class="cm tc del ${mine ? 'mine' : ''}" data-mid="${m.id}"><div class="cm-w"><div class="cm-b">${head}<span class="cm-del">🚫 ${mine ? (PEOPLE[me]?.f ? 'Obrisala si ovaj komentar' : 'Obrisao si ovaj komentar') : 'Komentar je obrisan'}</span></div></div></div>`; return; }
    const rx = chatRxHtml(m), q_ = m.reply_to ? chatQuoteHtml(m.reply_to) : '', img = m.image_url ? `<img class="cm-img" src="${esc(m.image_url)}" alt="" loading="lazy" data-zoom>` : '';
    html += `<div class="cm tc ${mine ? 'mine' : ''} ${chatMentionsMe(m) ? 'ment' : ''} ${m._tmp ? 'tmp' : ''} ${m._err ? 'err' : ''} ${CHAT.focusId === m.id ? 'focus' : ''} ${CHAT.edit && CHAT.edit.id === m.id ? 'editing' : ''}" data-mid="${m.id}"><div class="cm-w"><div class="cm-b">${head}${q_}${img}${voiceHtml(m)}${m.body ? `<div class="cm-t">${chatFmt(m.body)}</div>` : ''}<div class="tc-f">${rx}<span class="tc-sp"></span>${m._tmp ? '' : `<button type="button" class="tc-b" data-actopen="${m.id}" title="Reaguj${mine ? ', izmeni, obriši' : ''}">☺</button><button type="button" class="tc-b" data-reply="${m.id}">↩ Odgovori</button>`}</div></div></div></div>`;
  });
  box.innerHTML = html; chatNeedFetch();
  if (CHAT.focusId) { const el = box.querySelector(`[data-mid="${CHAT.focusId}"]`); if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => { CHAT.focusId = null; el.classList.remove('focus'); }, 2500); return; } }
  if (toBottom) { box.scrollTop = box.scrollHeight; box.querySelectorAll('img').forEach(i => i.addEventListener('load', () => { if (chatNearBottom() || toBottom) box.scrollTop = box.scrollHeight; }, { once: true })); }
}
function openTaskView(k, id) { const src = taskSrcOf(k), x = src && src.list().find(y => y.id === id); if (!x) return; openChat(taskChOf(src, x)); }
function openTaskItem(k, id) {
  const src = taskSrcOf(k), x = src && src.list().find(y => y.id === id); if (!x) return;
  if (k === 'note') return openTaskModal(k, id);
  const ref = src.ref(x); if (ref.startsWith('tab:')) return setTab(ref.slice(4)); if (k === 'cust') return openCustModal(id); return openRef(ref);
}
function taskCmChip(src, x) {
  const ch = taskChOf(src, x), a = (CHAT.msgs[ch] || []).filter(m => !m._tmp && !m.deleted_at); if (!a.length) return '';
  const u = chatWatch(ch) ? chatUnread(ch) : 0;
  return `<span class="tk-cm ${u ? 'new' : ''}" title="${a.length} komentara${u ? ', ' + u + ' novih' : ''}">💬 ${a.length}</span>`;
}
/* ---- glasovne poruke: snimanje (MediaRecorder), slanje, puštanje ---- */
const VOICE = { rec: null, chunks: [], stream: null, t0: 0, timer: 0, ana: null, ctx: null, mime: '', lv: [] };
const fmtSec = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function voiceMime() { for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} } return ''; }
async function voiceStart() {
  if (VOICE.rec) return;
  if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) return toast('Ovaj pretraživač ne može da snima glas', 4000);
  if (HUD.room) return toast('Dok si u huddle-u, glasovne poruke su isključene', 3500);
  try { VOICE.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { return toast('Mikrofon nije dozvoljen. Dozvoli mikrofon za ovaj sajt (ikonica levo od adrese ili podešavanja pretraživača).', 5500); }
  VOICE.mime = voiceMime(); VOICE.chunks = []; VOICE.lv = [];
  try { VOICE.rec = new MediaRecorder(VOICE.stream, VOICE.mime ? { mimeType: VOICE.mime, audioBitsPerSecond: 48000 } : undefined); }
  catch (e) { VOICE.rec = new MediaRecorder(VOICE.stream); }
  VOICE.rec.ondataavailable = (e) => { if (e.data && e.data.size) VOICE.chunks.push(e.data); };
  VOICE.rec.start(250); VOICE.t0 = Date.now();
  try { VOICE.ctx = new (window.AudioContext || window.webkitAudioContext)(); const src = VOICE.ctx.createMediaStreamSource(VOICE.stream); VOICE.ana = VOICE.ctx.createAnalyser(); VOICE.ana.fftSize = 512; src.connect(VOICE.ana); } catch (e) { VOICE.ana = null; }
  try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
  renderVoiceBar(); VOICE.timer = setInterval(voiceTick, 120);
}
function voiceTick() {
  const s = (Date.now() - VOICE.t0) / 1000;
  if (VOICE.ana) { const a = new Uint8Array(VOICE.ana.fftSize); VOICE.ana.getByteTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v - 128)); VOICE.lv.push(Math.min(1, m / 70)); if (VOICE.lv.length > 48) VOICE.lv.shift(); }
  const t = document.querySelector('.cp-rec .rec-t'); if (t) t.textContent = fmtSec(s);
  const lv = document.querySelector('.cp-rec .rec-lv'); if (lv) lv.innerHTML = VOICE.lv.map(v => `<i style="height:${Math.max(3, Math.round(v * 26))}px"></i>`).join('');
  if (s >= 300) { toast('Najduže 5 minuta, šaljem'); voiceStop(true); }
}
async function voiceStop(send) {
  const rec = VOICE.rec; if (!rec) return; clearInterval(VOICE.timer);
  const dur = (Date.now() - VOICE.t0) / 1000;
  const stopped = new Promise(r => { rec.onstop = r; setTimeout(r, 1500); }); try { rec.stop(); } catch (e) {}
  await stopped;
  try { VOICE.stream.getTracks().forEach(t => t.stop()); } catch (e) {} try { VOICE.ctx && VOICE.ctx.close(); } catch (e) {}
  const type = String(rec.mimeType || VOICE.mime || 'audio/webm').split(';')[0], blob = new Blob(VOICE.chunks, { type });
  VOICE.rec = null; VOICE.stream = null; VOICE.ana = null; renderVoiceBar();
  if (!send) return;
  if (dur < 0.8 || blob.size < 1200) return toast('Prekratko. Snimaj bar jednu sekundu.');
  await chatSendVoice(blob, dur);
}
function renderVoiceBar() {
  const f = $('cpForm'); if (!f) return; let el = f.querySelector('.cp-rec');
  if (!VOICE.rec) { if (el) el.remove(); f.classList.remove('recording'); return; }
  if (!el) { el = document.createElement('div'); el.className = 'cp-rec'; f.appendChild(el); }
  f.classList.add('recording');
  el.innerHTML = '<button type="button" class="rec-x" data-vcancel title="Odustani">🗑</button><span class="rec-dot"></span><span class="rec-t">0:00</span><span class="rec-lv"></span><button type="button" class="cp-send rec-send" data-vsend title="Pošalji glasovnu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>';
}
async function chatSendVoice(blob, dur) {
  const ch = CHAT.ch, inp = $('cpInput'), body = (inp.value || '').trim(), ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  const tmp = { id: 'tmp' + Date.now(), _tmp: true, channel: ch, author: who(), body: body || null, image_url: null, audio_url: URL.createObjectURL(blob), audio_sec: dur, mentions: [], created_at: new Date().toISOString() };
  (CHAT.msgs[ch] = CHAT.msgs[ch] || []).push(tmp); inp.value = ''; chatGrow(); chatFormState(); renderChatMsgs(true);
  try {
    const file = new File([blob], `glas_${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
    const url = await uploadImage(file, 'chat');
    CHAT.msgs[ch] = CHAT.msgs[ch].filter(x => x !== tmp);
    await chatSend({ body, audio_url: url, audio_sec: Math.round(dur * 10) / 10, ch });
  } catch (e) { tmp._err = true; renderChatMsgs(); fail(e); }
}
const voiceHtml = (m) => m.audio_url ? `<div class="vm ${VPLAY.id === m.id ? 'on' : ''}" data-voice="${m.id}"><button type="button" class="vm-p" data-vplay="${m.id}" title="Pusti">${VPLAY.id === m.id && !VPLAY.el.paused ? '❚❚' : '▶'}</button><span class="vm-w"><span class="vm-bar"><i style="width:${VPLAY.id === m.id && VPLAY.el.duration ? (VPLAY.el.currentTime / VPLAY.el.duration * 100) : 0}%"></i></span><span class="vm-t">${fmtSec(m.audio_sec)}</span></span><button type="button" class="vm-s" data-vspeed title="Brzina">${VPLAY.rate}×</button></div>` : '';
const VPLAY = { el: new Audio(), id: null, rate: 1 };
VPLAY.el.preload = 'auto';
function vplayUi() {
  const box = document.querySelector(`.vm[data-voice="${VPLAY.id}"]`); if (!box) return; const a = VPLAY.el, m = chatFind(VPLAY.id);
  box.classList.toggle('on', !a.paused); box.querySelector('.vm-p').textContent = a.paused ? '▶' : '❚❚';
  const pct = a.duration && isFinite(a.duration) ? a.currentTime / a.duration * 100 : (m && m.audio_sec ? a.currentTime / m.audio_sec * 100 : 0);
  box.querySelector('.vm-bar i').style.width = Math.min(100, pct) + '%';
  box.querySelector('.vm-t').textContent = !a.paused || a.currentTime > 0 ? fmtSec(a.currentTime) : fmtSec(m && m.audio_sec);
}
['timeupdate', 'play', 'pause'].forEach(ev => VPLAY.el.addEventListener(ev, vplayUi));
VPLAY.el.addEventListener('ended', () => { const id = VPLAY.id; VPLAY.el.currentTime = 0; vplayUi(); VPLAY.id = null; const b = document.querySelector(`.vm[data-voice="${id}"]`); if (b) { b.classList.remove('on'); b.querySelector('.vm-bar i').style.width = '0%'; } });
function voicePlay(id) {
  const m = chatFind(id); if (!m || !m.audio_url) return; const a = VPLAY.el;
  if (VPLAY.id === id) { a.paused ? a.play().catch(() => {}) : a.pause(); return; }
  const prev = VPLAY.id; a.pause(); VPLAY.id = id; a.src = m.audio_url; a.playbackRate = VPLAY.rate; a.currentTime = 0;
  if (prev) { const b = document.querySelector(`.vm[data-voice="${prev}"]`); if (b) { b.classList.remove('on'); b.querySelector('.vm-p').textContent = '▶'; b.querySelector('.vm-bar i').style.width = '0%'; const pm = chatFind(prev); b.querySelector('.vm-t').textContent = fmtSec(pm && pm.audio_sec); } }
  a.play().catch(() => toast('Ne mogu da pustim ovaj snimak na ovom uređaju'));
}
function voiceSpeed() { VPLAY.rate = VPLAY.rate === 1 ? 1.5 : VPLAY.rate === 1.5 ? 2 : 1; VPLAY.el.playbackRate = VPLAY.rate; document.querySelectorAll('.vm-s').forEach(b => { b.textContent = VPLAY.rate + '×'; }); }
function chatFormState() { const f = $('cpForm'); if (f) f.classList.toggle('has-text', !!($('cpInput').value || '').trim() || !!CHAT.edit); }
/* ================= HUDDLE: brzi pozivi (kao Slack huddle) =================
   Glas (i po želji kamera ili deljenje ekrana) direktno između članova tima, WebRTC, šifrovano od uređaja do uređaja.
   Signalizacija ide preko Supabase Realtime na tajnom kanalu koji vidi samo tim (h_rt_room). Soba = razgovor u chatu (Tim ili privatni). */
const HUD = { secret: null, ch: null, ready: false, room: null, at: 0, local: null, camT: null, scrT: null, muted: false, peers: {}, rooms: {}, sig: '', ring: null, ringTimer: 0, stage: false, actx: null, levels: {}, lvTimer: 0, tx: null, needTap: false };
const HUD_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];
const hudRoomTitle = (r) => (r === 'tim' ? 'Tim HARIZMA' : personName(chatOther(r)));
const hudCanRoom = (r) => r === 'tim' || chatBase().includes(r);
const hudOthers = (r) => Object.keys(HUD.rooms[r] || {}).filter(u => u !== who());
const hudCanScreen = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !/Android|iPhone|iPad/.test(navigator.userAgent);
async function hudInit() {
  ['hudBar', 'hudStage', 'hudRing', 'hudMedia'].forEach(id => { if (!$(id)) { const d = document.createElement('div'); d.id = id; d.className = id === 'hudBar' ? 'hud-bar' : id === 'hudStage' ? 'hud-stage' : id === 'hudRing' ? 'hud-ring' : 'hud-media'; document.body.appendChild(d); } });
  if (!window.RTCPeerConnection || !navigator.mediaDevices) return;
  try { const { data } = await sb.rpc('h_rt_room'); if (!data) return; HUD.secret = data; } catch (e) { return; }
  HUD.tx = {
    send: (payload) => { try { HUD.ch && HUD.ch.send({ type: 'broadcast', event: 'sig', payload }); } catch (e) {} },
    track: (st) => { try { if (!HUD.ch || !HUD.ready) return; st ? HUD.ch.track(st) : HUD.ch.untrack(); } catch (e) {} },
  };
  HUD.ch = sb.channel('hud-' + HUD.secret, { config: { presence: { key: who() }, broadcast: { self: false } } })
    .on('presence', { event: 'sync' }, () => { try { hudOnPresence(HUD.ch.presenceState()); } catch (e) {} })
    .on('broadcast', { event: 'sig' }, ({ payload }) => hudSig(payload))
    .subscribe((s) => { if (s === 'SUBSCRIBED') { HUD.ready = true; hudTrack(); } });
  addEventListener('pagehide', () => { if (HUD.room) hudLeave(true); });
}
const hudSend = (to, t, d) => HUD.tx && HUD.tx.send({ from: who(), to, room: HUD.room, t, d });
function hudTrack() { if (HUD.tx) HUD.tx.track(HUD.room ? { room: HUD.room, mic: !HUD.muted, cam: !!HUD.camT, scr: !!HUD.scrT, at: HUD.at } : null); }
function hudOnPresence(st) {
  const rooms = {};
  Object.entries(st || {}).forEach(([u, arr]) => { const p = (arr || []).find(x => x && x.room); if (p && PEOPLE[u] && hudCanRoom(p.room)) (rooms[p.room] = rooms[p.room] || {})[u] = p; });
  HUD.rooms = rooms;
  if (HUD.room) {
    const here = rooms[HUD.room] || {};
    Object.keys(here).forEach(u => { if (u !== who() && !HUD.peers[u] && who() < u) hudPeer(u); });
    Object.keys(HUD.peers).forEach(u => { if (!here[u] && HUD.peers[u].seen) hudDrop(u, true); else if (here[u]) HUD.peers[u].seen = true; });
  }
  if (HUD.ring && Date.now() - HUD.ring.at > 8000 && !hudOthers(HUD.ring.room).length) hudRingStop();
  const sig = JSON.stringify(Object.fromEntries(Object.entries(rooms).map(([r, o]) => [r, Object.keys(o).sort()])));
  renderHud();
  if (sig !== HUD.sig) { HUD.sig = sig; if (CHAT.open && !isTaskCh(CHAT.ch)) { renderChatTop(); renderChatMsgs(chatNearBottom()); } if (CHAT.open) renderChatSide(); }
}
async function hudJoin(room) {
  if (!HUD.tx) return toast('Pozivi trenutno nisu dostupni. Osveži CRM i probaj ponovo.', 4500);
  if (!hudCanRoom(room)) return;
  if (HUD.room === room) { HUD.stage = true; return renderHud(); }
  if (HUD.room) await hudLeave(true);
  if (VOICE.rec) voiceStop(false);
  hudRingStop();
  try { HUD.local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
  catch (e) { return toast('Za huddle treba mikrofon. Dozvoli mikrofon za ovaj sajt (ikonica levo od adrese) i probaj ponovo.', 6000); }
  const starting = !hudOthers(room).length;
  HUD.room = room; HUD.at = Date.now(); HUD.muted = false; HUD.stage = false;
  hudLevels(); hudTrack(); renderHud();
  try { sfx('delivered', 0.6); } catch (e) {}
  if (starting) chatSend({ body: '📞 Huddle', kind: 'huddle', ch: room }).catch(() => {});
  if (CHAT.open) renderChat();
}
async function hudLeave(silent) {
  if (!HUD.room) return;
  Object.keys(HUD.peers).forEach(u => { hudSend(u, 'bye'); hudDrop(u, true); });
  [HUD.local, HUD.camT && { getTracks: () => [HUD.camT] }, HUD.scrT && { getTracks: () => [HUD.scrT] }].forEach(s => { try { s && s.getTracks().forEach(t => t.stop()); } catch (e) {} });
  HUD.local = null; HUD.camT = null; HUD.scrT = null; HUD.room = null; HUD.stage = false; HUD.levels = {};
  clearInterval(HUD.lvTimer); hudTrack(); renderHud();
  if (!silent) { try { sfx('bye', 0.6); } catch (e) {} }
  if (CHAT.open) renderChat();
}
function hudPeer(u) {
  if (HUD.peers[u]) return HUD.peers[u];
  const pc = new RTCPeerConnection({ iceServers: HUD_ICE });
  const p = HUD.peers[u] = { u, pc, polite: who() > u, making: false, ignore: false, iceQ: [], stream: new MediaStream(), audioEl: null, vSender: null, state: 'new', seen: false };
  if (HUD.local) HUD.local.getAudioTracks().forEach(t => pc.addTrack(t, HUD.local));
  else pc.addTransceiver('audio', { direction: 'recvonly' });
  const vt = HUD.scrT || HUD.camT; if (vt) p.vSender = pc.addTrack(vt, HUD.local || new MediaStream());
  pc.onnegotiationneeded = async () => { try { p.making = true; await pc.setLocalDescription(); hudSend(u, 'sdp', pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription); } catch (e) { console.warn('huddle', e); } finally { p.making = false; } };
  pc.onicecandidate = ({ candidate }) => { if (candidate) hudSend(u, 'ice', candidate.toJSON ? candidate.toJSON() : candidate); };
  pc.ontrack = ({ track }) => {
    if (!p.stream.getTracks().includes(track)) p.stream.addTrack(track);
    track.onunmute = () => renderHud(); track.onmute = () => renderHud(); track.onended = () => { try { p.stream.removeTrack(track); } catch (e) {} renderHud(); };
    if (track.kind === 'audio') hudAudio(p);
    renderHud();
  };
  pc.onconnectionstatechange = () => {
    const was = p.state; p.state = pc.connectionState;
    if (p.state === 'connected' && was !== 'connected') { try { sfx('notif', 0.5); } catch (e) {} }
    if (p.state === 'failed') { try { pc.restartIce(); } catch (e) {} }
    renderHud();
  };
  return p;
}
function hudAudio(p) {
  if (!p.audioEl) { p.audioEl = document.createElement('audio'); p.audioEl.autoplay = true; p.audioEl.setAttribute('playsinline', ''); $('hudMedia').appendChild(p.audioEl); }
  p.audioEl.srcObject = p.stream;
  p.audioEl.play().then(() => { HUD.needTap = false; }).catch(() => { HUD.needTap = true; renderHud(); });
}
async function hudSig(m) {
  if (!m || m.to !== who() || !HUD.room || m.room !== HUD.room || !PEOPLE[m.from]) return;
  if (m.t === 'bye') return hudDrop(m.from);
  const p = hudPeer(m.from), pc = p.pc;
  try {
    if (m.t === 'sdp') {
      const d = m.d, offer = d.type === 'offer', collision = offer && (p.making || pc.signalingState !== 'stable');
      p.ignore = !p.polite && collision; if (p.ignore) return;
      await pc.setRemoteDescription(d);
      while (p.iceQ.length) { try { await pc.addIceCandidate(p.iceQ.shift()); } catch (e) {} }
      if (offer) { await pc.setLocalDescription(); hudSend(m.from, 'sdp', pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription); }
    } else if (m.t === 'ice') {
      if (!pc.remoteDescription) p.iceQ.push(m.d);
      else { try { await pc.addIceCandidate(m.d); } catch (e) { if (!p.ignore) console.warn('ice', e); } }
    }
  } catch (e) { console.warn('huddle signal', e); }
}
function hudDrop(u, silent) {
  const p = HUD.peers[u]; if (!p) return;
  try { p.pc.close(); } catch (e) {} if (p.audioEl) { p.audioEl.srcObject = null; p.audioEl.remove(); }
  delete HUD.peers[u]; delete HUD.levels[u];
  if (!silent) { try { sfx('bye', 0.4); } catch (e) {} }
  renderHud();
}
function hudMute() { HUD.muted = !HUD.muted; if (HUD.local) HUD.local.getAudioTracks().forEach(t => { t.enabled = !HUD.muted; }); hudTrack(); renderHud(); }
function hudSetVideo(track) { Object.values(HUD.peers).forEach(p => { if (p.vSender) p.vSender.replaceTrack(track).catch(() => {}); else if (track) p.vSender = p.pc.addTrack(track, HUD.local || new MediaStream()); }); }
async function hudCam() {
  if (HUD.camT) { HUD.camT.stop(); HUD.camT = null; hudSetVideo(HUD.scrT || null); }
  else {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } }); HUD.camT = s.getVideoTracks()[0]; }
    catch (e) { return toast('Kamera nije dozvoljena za ovaj sajt', 4000); }
    if (!HUD.scrT) hudSetVideo(HUD.camT); HUD.stage = true;
  }
  hudTrack(); renderHud();
}
async function hudScreen() {
  if (HUD.scrT) { HUD.scrT.stop(); HUD.scrT = null; hudSetVideo(HUD.camT || null); hudTrack(); return renderHud(); }
  if (!hudCanScreen()) return toast('Deljenje ekrana radi na računaru');
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false }); HUD.scrT = s.getVideoTracks()[0];
    HUD.scrT.onended = () => { HUD.scrT = null; hudSetVideo(HUD.camT || null); hudTrack(); renderHud(); };
    hudSetVideo(HUD.scrT); HUD.stage = true;
  } catch (e) { return; }
  hudTrack(); renderHud();
}
/* ko priča: zelena ivica oko avatara */
function hudLevels() {
  try { HUD.actx = HUD.actx || new (window.AudioContext || window.webkitAudioContext)(); if (HUD.actx.state === 'suspended') HUD.actx.resume(); } catch (e) { HUD.actx = null; }
  clearInterval(HUD.lvTimer);
  HUD.lvTimer = setInterval(() => {
    const t = document.querySelector('#hudBar .hud-time'); if (t) t.textContent = fmtSec((Date.now() - HUD.at) / 1000);
    if (!HUD.actx || !HUD.room) return;
    const srcs = [[who(), HUD.local], ...Object.values(HUD.peers).map(p => [p.u, p.stream])];
    srcs.forEach(([u, st]) => {
      const tr = st && st.getAudioTracks()[0]; if (!tr) return;
      let a = HUD.levels[u];
      if (!a || a.tid !== tr.id) { try { const src = HUD.actx.createMediaStreamSource(new MediaStream([tr])), an = HUD.actx.createAnalyser(); an.fftSize = 512; src.connect(an); a = HUD.levels[u] = { tid: tr.id, an }; } catch (e) { return; } }
      const buf = new Uint8Array(a.an.fftSize); a.an.getByteTimeDomainData(buf); let mx = 0; for (const v of buf) mx = Math.max(mx, Math.abs(v - 128));
      const on = mx > 12 && !(u === who() && HUD.muted);
      document.querySelectorAll(`[data-hudu="${u}"]`).forEach(el => el.classList.toggle('speak', on));
    });
  }, 160);
}
/* zvono kad te neko zove ili pokrene huddle */
function hudRing(room, from, quiet) {
  if (HUD.room === room || (HUD.ring && HUD.ring.room === room)) return;
  if (HUD.room) { HUD.ring = { room, from, at: Date.now(), quiet: true }; return renderHudRing(); }
  HUD.ring = { room, from, at: Date.now(), quiet: !!quiet };
  renderHudRing();
  if (quiet) return;
  const ding = () => { try { sfx('notif', 1.3); } catch (e) {} try { navigator.vibrate && navigator.vibrate([180, 90, 180]); } catch (e) {} };
  ding(); clearInterval(HUD.ringTimer);
  HUD.ringTimer = setInterval(() => { if (!HUD.ring || Date.now() - HUD.ring.at > 35000) return hudRingStop(); ding(); }, 2600);
}
function hudRingStop() { clearInterval(HUD.ringTimer); HUD.ring = null; renderHudRing(); }
function renderHudRing() {
  const el = $('hudRing'); if (!el) return; const r = HUD.ring;
  if (!r) { el.classList.remove('in'); return; }
  const dm = r.room !== 'tim', f = PEOPLE[r.from]?.f;
  el.innerHTML = `<div class="hr-av">${chatAv(r.from || 'system')}<i></i></div><div class="hr-t"><b>${r.from ? esc(personName(r.from)) : 'Huddle'} ${dm ? 'te zove' : (f ? 'je pokrenula huddle' : 'je pokrenuo huddle')}</b><small>${dm ? 'privatni huddle' : 'Tim HARIZMA'}${HUD.room ? ' · već si u drugom huddle-u' : ''}</small></div><button type="button" class="hr-no" data-hudno title="Odbij">✕</button><button type="button" class="hr-yes" data-hudjoin="${r.room}">📞 Pridruži se</button>`;
  void el.offsetWidth; el.classList.add('in');
}
const HUD_IC = {
  mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>',
  micOff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1M5 10a7 7 0 0 0 11.9 5M19 10a7 7 0 0 1-.3 2M12 17v5M3 3l18 18"/></svg>',
  cam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/></svg>',
  scr: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M9 10l3-3 3 3M12 7v6"/></svg>',
  big: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  small: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  end: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-3.3 0-6.3 1-8.6 2.7-.6.4-.7 1.3-.3 1.9l1.5 2c.4.5 1.1.7 1.7.4l2.6-1.2c.5-.2.8-.8.7-1.3l-.3-1.7c1.7-.5 3.7-.5 5.4 0l-.3 1.7c-.1.5.2 1.1.7 1.3l2.6 1.2c.6.3 1.3.1 1.7-.4l1.5-2c.4-.6.3-1.5-.3-1.9C18.3 10 15.3 9 12 9z"/></svg>',
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
};
function hudCtlHtml(big) {
  return `<button type="button" class="hc ${HUD.muted ? 'off' : ''}" data-hudmute title="${HUD.muted ? 'Uključi mikrofon' : 'Utišaj mikrofon'}">${HUD.muted ? HUD_IC.micOff : HUD_IC.mic}</button>
    <button type="button" class="hc ${HUD.camT ? 'on' : ''}" data-hudcam title="Kamera">${HUD_IC.cam}</button>
    ${hudCanScreen() ? `<button type="button" class="hc ${HUD.scrT ? 'on' : ''}" data-hudscr title="Podeli ekran">${HUD_IC.scr}</button>` : ''}
    <button type="button" class="hc" data-hudstage title="${big ? 'Smanji' : 'Prikaži veliko'}">${big ? HUD_IC.small : HUD_IC.big}</button>
    <button type="button" class="hc end" data-hudleave title="Izađi iz huddle-a">${HUD_IC.end}</button>`;
}
function hudPeople() { const me = who(); return [me, ...Object.keys(HUD.rooms[HUD.room] || {}).filter(u => u !== me), ...Object.keys(HUD.peers).filter(u => !(HUD.rooms[HUD.room] || {})[u])].filter((u, i, a) => a.indexOf(u) === i); }
function hudPState(u) { if (u === who()) return { mic: !HUD.muted, cam: !!HUD.camT, scr: !!HUD.scrT }; return (HUD.rooms[HUD.room] || {})[u] || {}; }
function renderHud() {
  const bar = $('hudBar'), stage = $('hudStage'); if (!bar) return;
  document.body.classList.toggle('in-huddle', !!HUD.room); document.body.classList.toggle('hud-big', !!HUD.room && HUD.stage);
  if (!HUD.room) { bar.classList.remove('in'); stage.classList.remove('open'); stage.innerHTML = ''; bar.innerHTML = ''; return; }
  const ppl = hudPeople(), conn = Object.values(HUD.peers).some(p => p.state === 'connected'), waiting = ppl.length < 2;
  bar.innerHTML = `<div class="hud-info"><span class="hud-live ${conn ? 'ok' : ''}"></span><span class="hud-tt"><b>${esc(hudRoomTitle(HUD.room))}</b><small>${waiting ? 'čeka se da se neko pridruži…' : conn ? 'huddle · <span class="hud-time">' + fmtSec((Date.now() - HUD.at) / 1000) + '</span>' : 'povezivanje…'}</small></span></div>
    <div class="hud-ppl">${ppl.map(u => { const s = hudPState(u); return `<span class="hud-p" data-hudu="${u}" title="${esc(personName(u))}">${chatAv(u)}${s.mic === false ? '<i class="hud-mut">' + HUD_IC.micOff + '</i>' : ''}</span>`; }).join('')}</div>
    ${HUD.needTap ? '<button type="button" class="hud-tap" data-hudtap>🔊 Dodirni da čuješ</button>' : ''}
    <div class="hud-ctl">${hudCtlHtml(false)}</div>`;
  bar.classList.add('in');
  if (!HUD.stage) { stage.classList.remove('open'); stage.innerHTML = ''; return; }
  stage.innerHTML = `<div class="hs-top"><b>${esc(hudRoomTitle(HUD.room))}</b><small>${ppl.length} ${bpl(ppl.length, 'osoba', 'osobe', 'osoba')}</small></div><div class="hs-grid n${Math.min(ppl.length, 4)}">${ppl.map(u => { const s = hudPState(u), vid = (s.cam || s.scr) && hudVideoTrack(u); return `<div class="hs-tile ${vid ? 'vid' : ''} ${s.scr ? 'scr' : ''}" data-hudu="${u}">${vid ? `<video autoplay playsinline ${u === who() ? 'muted' : ''} data-hudv="${u}"></video>` : `<div class="hs-av">${chatAv(u)}</div>`}<span class="hs-name">${esc(u === who() ? 'Ti' : personName(u))}${s.mic === false ? ' · utišan' : ''}</span></div>`; }).join('')}</div><div class="hs-ctl">${hudCtlHtml(true)}</div>`;
  stage.classList.add('open');
  stage.querySelectorAll('video[data-hudv]').forEach(v => { const u = v.dataset.hudv, tr = hudVideoTrack(u); if (tr) { v.srcObject = new MediaStream([tr]); v.play().catch(() => {}); } });
}
function hudVideoTrack(u) { if (u === who()) return HUD.scrT || HUD.camT || null; const p = HUD.peers[u]; return p ? p.stream.getVideoTracks().find(t => t.readyState === 'live') || null : null; }
/* ---- ko je kad bio aktivan: zelena tačka = CRM otvoren ispred njega; inače „aktivan/na pre X“ ---- */
const SEEN = {};
let seenPingAt = 0;
const seenDev = () => (/Android|iPhone|iPad/.test(navigator.userAgent) ? 'telefon' : 'računar') + (isStandalone() ? ' · aplikacija' : '');
async function seenPing(force) {
  if (!state.user || (!force && Date.now() - seenPingAt < 55000)) return; seenPingAt = Date.now();
  SEEN[who()] = { at: new Date().toISOString(), device: seenDev() };
  try { await sb.rpc('h_seen_ping', { p_device: seenDev() }); } catch (e) {}
}
async function seenLoad() { try { const rows = await q(sb.from('h_last_seen').select('*')); rows.forEach(r => { const cur = SEEN[r.username]; if (!cur || cur.at < r.last_seen_at) SEEN[r.username] = { at: r.last_seen_at, device: r.device }; }); renderTeamPres(); } catch (e) {} }
function seenFromPresence(st) {
  const on = new Set();
  Object.entries(st || {}).forEach(([u, arr]) => { const last = (arr || []).slice(-1)[0] || {}; const away = (arr || []).every(x => x && x.away); if (!away) { on.add(u); SEEN[u] = { at: new Date().toISOString(), device: (SEEN[u] || {}).device }; } });
  CHAT.online = on;
}
function seenInit() {
  seenLoad(); seenPing(true);
  setInterval(() => { if (!document.hidden) seenPing(); }, 60000);
  setInterval(() => { seenLoad(); renderTeamPres(); if (CHAT.open) { renderChatTop(); renderChatSide(); } }, 90000);
  document.addEventListener('visibilitychange', () => { seenPing(true); try { CHAT.rt && CHAT.rt.track({ at: Date.now(), away: document.hidden }); } catch (e) {} });
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => seenPing(), { passive: true }));
}
/* kratko: „na mreži“, „pre 5 min“, „pre 3 h“, „juče“, „6. okt“ */
function seenShort(u) {
  if (u === who() || CHAT.online.has(u)) return 'na mreži';
  const s = SEEN[u]; if (!s) return '';
  const m = Math.round((Date.now() - new Date(s.at)) / 60000);
  if (m < 2) return 'upravo'; if (m < 60) return `pre ${m} min`; const h = Math.round(m / 60); if (h < 24) return `pre ${h} h`;
  const d = new Date(s.at), y = new Date(); y.setDate(y.getDate() - 1);
  return dayStr(d) === dayStr(y) ? 'juče' : d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' });
}
/* duže: „aktivna pre 12 min · telefon“ */
function seenText(u) {
  if (u === who()) return 'ti';
  const f = PEOPLE[u]?.f, s = SEEN[u];
  if (CHAT.online.has(u)) return 'na mreži, CRM je otvoren' + (s && s.device ? ' · ' + s.device.split(' · ')[0] : '');
  if (!s) return f ? 'još nije bila u CRM-u' : 'još nije bio u CRM-u';
  const m = Math.round((Date.now() - new Date(s.at)) / 60000), d = new Date(s.at);
  const when = m < 2 ? 'upravo' : m < 60 ? `pre ${m} min` : m < 24 * 60 ? `pre ${Math.round(m / 60)} h` : relTime(s.at);
  return `${f ? 'aktivna' : 'aktivan'} ${when}${s.device ? ' · ' + s.device.split(' · ')[0] : ''}`;
}
const seenCls = (u) => (CHAT.online.has(u) || u === who() ? 'on' : SEEN[u] && Date.now() - new Date(SEEN[u].at) < 15 * 60000 ? 'recent' : '');
/* tim: avatari gore (računar) i spisak u meniju (telefon) */
function teamRowsHtml() {
  return Object.keys(PEOPLE).filter(k => k !== who()).map(k => `<div class="tmp-row"><span class="tmp-av ${seenCls(k)}">${chatAv(k)}</span><span class="tmp-t"><b>${esc(personName(k))}</b><small>${esc(seenText(k))}</small></span><button type="button" class="tmp-b" data-tpchat="${k}" title="Piši">💬</button><button type="button" class="tmp-b" data-tppoz="${k}" title="Pozovi">📞</button></div>`).join('');
}
function renderTeamPres() {
  const w = $('teamPres'); if (w && state.user) {
    const others = Object.keys(PEOPLE).filter(k => k !== who());
    w.querySelector('.tmp-avs').innerHTML = others.map(k => `<span class="tmp-av ${seenCls(k)}" title="${esc(personName(k) + ' · ' + seenText(k))}">${chatAv(k)}</span>`).join('');
    const pop = w.querySelector('.tmp-pop'); if (pop.classList.contains('open')) pop.innerHTML = '<div class="tmp-h">Tim</div>' + teamRowsHtml();
  }
  const nd = $('navTeam'); if (nd && state.user) nd.innerHTML = '<div class="nd-tl">Tim</div>' + teamRowsHtml();
}
async function taskSetPrio(tk, p) {
  const { src, x } = tk, v = p === 'normal' ? null : p; if ((x.task_prio || null) === v) return;
  try { await q(sb.from(src.tbl).update({ task_prio: v }).eq('id', x.id)); x.task_prio = v; renderAll(); if (CHAT.open) { renderChat(); setTimeout(() => taskAuditLoad(CHAT.ch), 900); } toast(p === 'urgent' ? '🚩 Hitno: tim je obavešten' : `Prioritet: ${TPRIO[p].l}`); }
  catch (e) { fail(e); }
}
/* ---- alarm za rok i hitne zadatke: posebna kartica i zvuk u CRM-u (push dolazi preko sw.js, a ovde i lokalna provera) ---- */
const ALARM = { q: [], cur: null };
function alarmSeen() { try { return JSON.parse(LS.get('crm_alarms', '{}')) || {}; } catch (e) { return {}; } }
function alarmMark(key) { const s = alarmSeen(), cut = Date.now() - 5 * 864e5; Object.keys(s).forEach(k => { if (s[k] < cut) delete s[k]; }); s[key] = Date.now(); LS.set('crm_alarms', JSON.stringify(s)); }
function taskAlarmShow(d) {
  if (!d || !state.user) return;
  if (d.akey) { if (alarmSeen()[d.akey] && !d.force) return; alarmMark(d.akey); }
  ALARM.q.push(d); if (!ALARM.cur) taskAlarmNext();
}
function taskAlarmNext() {
  const d = ALARM.cur = ALARM.q.shift(); let el = $('taskAlarm');
  if (!d) { if (el) el.classList.remove('in'); return; }
  if (!el) { el = document.createElement('div'); el.id = 'taskAlarm'; document.body.appendChild(el); }
  const urgent = d.kind === 'urgent';
  el.className = 'talarm ' + (urgent ? 'urgent' : 'deadline');
  el.innerHTML = `<div class="ta-ic">${urgent ? '🚨' : '⏰'}</div><div class="ta-b"><b>${esc(String(d.title || '').replace(/^(⏰|🚨)\s*/u, ''))}</b><span>${esc(d.body || '')}</span></div><div class="ta-act">${d.task ? '<button type="button" class="ta-done" data-tadone>✓ Gotovo</button><button type="button" class="ta-open" data-taopen>Otvori</button>' : ''}<button type="button" class="ta-x" data-tax title="Zatvori">✕</button></div>`;
  void el.offsetWidth; el.classList.add('in');
  try { sfx('alarm', urgent ? 1.2 : 1, urgent); } catch (e) {}
  try { navigator.vibrate && navigator.vibrate(urgent ? [400, 150, 400, 150, 400] : [200, 100, 200]); } catch (e) {}
}
function taskAlarmAct(kind) {
  const d = ALARM.cur; if (!d) return;
  if (kind === 'open' && d.task) crmGo('chat:task:' + d.task);
  if (kind === 'done' && d.task) crmGo('taskdone:' + d.task);
  taskAlarmNext();
}
/* lokalna provera na 30 s (radi i kad na ovom uređaju nisu uključena obaveštenja) */
function taskAlarmCheck() {
  if (!state.user || document.hidden) return;
  const now = Date.now(), hr = new Date().getHours(), seen = alarmSeen();
  allTasks().forEach(t => {
    if (t.done || !t.x.task_due_at) return;
    const due = new Date(t.x.task_due_at).getTime(), urgent = t.prio === 'urgent'; let k = null;
    if (now < due) { if (urgent && now >= due - 15 * 60e3) k = 'm15'; else if (now >= due - 60 * 60e3) k = 'h1'; }
    else if (urgent && now < due + 3 * 864e5) { const late = Math.floor((now - due) / 1800e3); if (late === 0) k = 'due'; else if (hr >= 8 && hr < 23) k = 'late' + late; }
    if (!k) return;
    const dIso = new Date(due).toISOString(), key = `${t.src.tbl}:${t.x.id}:${k}:${dIso}`; if (seen[key]) return;
    if (k === 'm15') alarmMark(`${t.src.tbl}:${t.x.id}:h1:${dIso}`);
    const ms = due - now, tm = hhmm(new Date(due)), what = t.x.task_note && t.src.k !== 'note' ? t.x.task_note : t.src.title(t.x);
    const title = k === 'h1' ? `⏰ Rok za ${durTxt(ms)} (${tm})${urgent ? ' · HITNO' : ''}` : k === 'm15' ? `🚨 HITNO · još ${durTxt(ms)} do roka (${tm})` : k === 'due' ? `🚨 HITNO · rok je istekao (${tm})` : `🚨 HITNO · kasni ${durTxt(-ms)}, nije završeno`;
    taskAlarmShow({ title, body: `${tcut(what, 120)} · ${t.as.map(personName).join(', ')} · ${t.sec}`, kind: urgent || k !== 'h1' ? 'urgent' : 'deadline', task: `${t.src.tbl}:${t.x.id}`, akey: key });
  });
}
/* ---- odgovor na poruku (reply) ---- */
const CHAT_DAT = { konstantin: 'Konstantinu', stasa: 'Staši', marjan: 'Marjanu' };
function chatFind(id) { for (const a of Object.values(CHAT.msgs)) { const m = a.find(x => x.id === id); if (m) return m; } return CHAT.res[id] || null; }
const chatSnip = (m, k = 90) => m.audio_url && !m.body ? '🎤 Glasovna poruka' : m.kind === 'huddle' ? '📞 Huddle' : m.body ? tcut(m.body, k) : (/\.gif(\?|$)/i.test(m.image_url || '') || /giphy/.test(m.image_url || '') ? 'GIF' : '📷 Slika');
function chatQuoteHtml(id) {
  const o = chatFind(id);
  if (!o) { CHAT.need.add(id); return `<button type="button" class="cm-q" data-qgo="${id}"><span>učitava se…</span></button>`; }
  if (o.deleted_at) return `<button type="button" class="cm-q ${o.author}" data-qgo="${id}"><span class="q-t"><b>${o.author === who() ? 'Ti' : esc(personName(o.author))}</b><span>🚫 poruka je obrisana</span></span></button>`;
  const th = o.image_url ? `<img src="${esc(o.image_url)}" alt="" loading="lazy">` : '';
  return `<button type="button" class="cm-q ${o.author}" data-qgo="${id}"><span class="q-t"><b>${o.author === who() ? 'Ti' : esc(personName(o.author))}</b><span>${esc(chatSnip(o))}</span></span>${th}</button>`;
}
/* citirana poruka koja nije učitana (starija od učitanog dela): dovuci je jednom */
let chatNeedT = 0;
function chatNeedFetch() {
  const ids = [...CHAT.need].filter(id => !chatFind(id) && !/^tmp/.test(id)); CHAT.need.clear(); if (!ids.length) return;
  clearTimeout(chatNeedT); chatNeedT = setTimeout(async () => {
    try { const rows = await q(sb.from('h_chat_messages').select('*').in('id', ids.slice(0, 80))); rows.forEach(r => { CHAT.res[r.id] = r; }); if (rows.length && CHAT.open) renderChatMsgs(); } catch (e) {}
  }, 60);
}
function chatReplyTo(id) {
  const m = chatFind(id); if (!m || m._tmp || m.deleted_at) return;
  if (CHAT.edit) chatEditCancel();
  chatActClose(); CHAT.reply[m.channel] = m; renderChatReply();
  const t = $('cpInput'); t.focus(); try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
}
function renderChatReply() {
  const el = $('cpReply'); if (!el) return;
  if (CHAT.edit && CHAT.edit.ch === CHAT.ch) { el.innerHTML = `<span class="cr-ic">✎</span><div class="cr-t"><b>Menjaš poruku</b><span>Enter čuva izmenu, Esc otkazuje</span></div><button type="button" data-editx title="Otkaži izmenu">✕</button>`; el.classList.add('on', 'edit'); return; }
  el.classList.remove('edit');
  const m = CHAT.reply[CHAT.ch];
  if (!m) { el.innerHTML = ''; el.classList.remove('on'); return; }
  const to = m.author === who() ? 'Odgovaraš na svoju poruku' : `Odgovaraš ${CHAT_DAT[m.author] || personName(m.author)}`;
  el.innerHTML = `<span class="cr-ic">↩</span><div class="cr-t"><b>${to}</b><span>${esc(chatSnip(m, 120))}</span></div>${m.image_url ? `<img src="${esc(m.image_url)}" alt="">` : ''}<button type="button" data-replyx title="Otkaži odgovor">✕</button>`;
  el.classList.add('on');
}
/* ---- izmena i brisanje svojih poruka (original ostaje u h_chat_history) ---- */
function chatUpdated(r) {
  if (!r || !r.id) return; let hit = false;
  Object.values(CHAT.msgs).forEach(a => { const m = a.find(x => x.id === r.id); if (m) { Object.assign(m, r); hit = true; } });
  if (CHAT.res[r.id]) Object.assign(CHAT.res[r.id], r);
  if (r.deleted_at) { Object.keys(CHAT.reply).forEach(ch => { if (CHAT.reply[ch] && CHAT.reply[ch].id === r.id) delete CHAT.reply[ch]; }); if (CHAT.edit && CHAT.edit.id === r.id) chatEditCancel(); if (CHAT.act && CHAT.act.id === r.id) chatActClose(); }
  if (!hit && !CHAT.res[r.id]) return;
  chatBadges(); if (CHAT.open) { renderChatSide(); renderChatMsgs(chatNearBottom()); renderChatReply(); }
}
function chatEditStart(id) {
  const m = chatFind(id); if (!m || m._tmp || m.deleted_at || m.author !== who()) return;
  chatActClose(); delete CHAT.reply[m.channel];
  const inp = $('cpInput'); CHAT.edit = { id, ch: m.channel, draft: CHAT.edit ? CHAT.edit.draft : inp.value };
  inp.value = m.body || ''; chatGrow(); renderChatReply(); chatFormState(); inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
  document.querySelectorAll('.cm.editing').forEach(x => x.classList.remove('editing')); const row = $('cpMsgs').querySelector(`[data-mid="${id}"]`); if (row) row.classList.add('editing');
}
function chatEditCancel() {
  const e = CHAT.edit; CHAT.edit = null; const inp = $('cpInput'); if (e) { inp.value = e.draft || ''; chatGrow(); } chatFormState();
  document.querySelectorAll('.cm.editing').forEach(x => x.classList.remove('editing')); renderChatReply();
}
async function chatEditSave() {
  const e = CHAT.edit, m = e && chatFind(e.id); if (!m) return chatEditCancel();
  const body = $('cpInput').value.trim();
  if (body === (m.body || '')) return chatEditCancel();
  if (!body && !m.image_url) return toast('Poruka ne može biti prazna. Za brisanje: dugo drži poruku → Obriši', 3500);
  if (body.length > 4000) return toast('Poruka je preduga (najviše 4.000 znakova)');
  const old = { body: m.body, edited_at: m.edited_at, mentions: m.mentions };
  m.body = body || null; m.edited_at = new Date().toISOString(); chatEditCancel(); renderChatMsgs(chatNearBottom()); renderChatSide();
  try { const r = await q(sb.from('h_chat_messages').update({ body: body || null }).eq('id', m.id).select().single()); chatUpdated(r); toast('Poruka je izmenjena'); }
  catch (err) { Object.assign(m, old); renderChatMsgs(chatNearBottom()); fail(err); }
}
async function chatDelete(id) {
  const m = chatFind(id); if (!m || m.author !== who() || m.deleted_at) return;
  const old = { body: m.body, image_url: m.image_url, deleted_at: m.deleted_at, mentions: m.mentions };
  chatActClose(); if (CHAT.edit && CHAT.edit.id === id) chatEditCancel();
  Object.keys(CHAT.reply).forEach(ch => { if (CHAT.reply[ch] && CHAT.reply[ch].id === id) delete CHAT.reply[ch]; }); renderChatReply();
  Object.assign(m, { body: null, image_url: null, deleted_at: new Date().toISOString(), mentions: [] }); renderChatMsgs(chatNearBottom()); renderChatSide();
  try { sfx('trash'); } catch (e) {}
  try { const r = await q(sb.from('h_chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id).select().single()); chatUpdated(r); }
  catch (err) { Object.assign(m, old); renderChatMsgs(chatNearBottom()); fail(err); }
}
/* ---- reakcije ---- */
const CHAT_EMO = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🙏', '👏'];
const CHAT_EMO_MORE = ['🎉', '✅', '💯', '😍', '🥰', '😘', '🤔', '😅', '🤣', '😎', '💪', '👀', '🥳', '🤝', '👌', '😡', '😭', '💸', '📦', '🛍️', '✨', '💖', '🙌', '❌'];
async function chatRxLoad() {
  try { const rows = await q(sb.from('h_chat_reactions').select('*').order('created_at', { ascending: false }).limit(5000)); const rx = {}; rows.forEach(r => { (rx[r.message_id] = rx[r.message_id] || []).push(r); }); CHAT.rx = rx; } catch (e) {}
}
function chatRxEvt(p) {
  const n = p.new && p.new.message_id ? p.new : null, o = p.old && p.old.message_id ? p.old : null;
  if (p.eventType === 'DELETE' && o) CHAT.rx[o.message_id] = (CHAT.rx[o.message_id] || []).filter(r => r.username !== o.username);
  else if (n) { const a = (CHAT.rx[n.message_id] || []).filter(r => r.username !== n.username); a.push(n); CHAT.rx[n.message_id] = a; }
  else return;
  const mid = (n || o).message_id;
  if (CHAT.open && (CHAT.msgs[CHAT.ch] || []).some(m => m.id === mid)) renderChatMsgs(chatNearBottom());
  if (CHAT.act && CHAT.act.id === mid) chatActRender();
}
function chatRxHtml(m) {
  const a = CHAT.rx[m.id] || []; if (!a.length || m.deleted_at) return '';
  const g = {}; a.forEach(r => { (g[r.emoji] = g[r.emoji] || []).push(r.username); });
  return `<div class="cm-rx">${Object.entries(g).sort((x, y) => y[1].length - x[1].length).map(([e, us]) => `<button type="button" class="rx ${us.includes(who()) ? 'me' : ''}" data-rx="${m.id}|${e}" title="${esc(us.map(u => u === who() ? 'Ti' : personName(u)).join(', '))}">${e}${us.length > 1 ? `<i>${us.length}</i>` : ''}</button>`).join('')}</div>`;
}
async function chatReact(id, emoji) {
  const m = chatFind(id); if (!m || m._tmp || m.deleted_at) return;
  const a = CHAT.rx[id] || [], mine = a.find(r => r.username === who()), off = mine && mine.emoji === emoji, prev = a.slice();
  CHAT.rx[id] = a.filter(r => r.username !== who()).concat(off ? [] : [{ message_id: id, username: who(), emoji, created_at: new Date().toISOString() }]);
  chatActClose(); renderChatMsgs(chatNearBottom());
  if (!off) { try { sfx('tick', 0.8, true); navigator.vibrate && navigator.vibrate(10); } catch (e) {} }
  try {
    if (off) await q(sb.from('h_chat_reactions').delete().eq('message_id', id).eq('username', who()));
    else await q(sb.from('h_chat_reactions').upsert({ message_id: id, username: who(), emoji }, { onConflict: 'message_id,username' }));
  } catch (e) { CHAT.rx[id] = prev; renderChatMsgs(chatNearBottom()); fail(e); }
}
/* meni za poruku: reakcije, odgovori, kopiraj, ko je reagovao */
function chatActOpen(id, more) { const m = chatFind(id); if (!m || m._tmp || m.deleted_at) return; CHAT.act = { id, more: !!more, del: false }; chatActRender(); }
function chatActClose() { CHAT.act = null; const el = $('cpAct'); if (el) { el.classList.remove('open'); el.innerHTML = ''; } const ov = $('cpActOv'); if (ov) ov.classList.remove('open'); document.querySelectorAll('.cm.acting').forEach(x => x.classList.remove('acting')); }
function chatActRender() {
  const el = $('cpAct'), a = CHAT.act; if (!el || !a) return; const m = chatFind(a.id); if (!m) return chatActClose();
  const rx = CHAT.rx[a.id] || [], mine = (rx.find(r => r.username === who()) || {}).emoji;
  const emo = a.more ? CHAT_EMO.concat(CHAT_EMO_MORE) : CHAT_EMO;
  el.innerHTML = `<div class="ca-emo ${a.more ? 'more' : ''}">${emo.map(e => `<button type="button" class="${e === mine ? 'on' : ''}" data-rx="${a.id}|${e}">${e}</button>`).join('')}${a.more ? '' : '<button type="button" class="ca-plus" data-actmore title="Još">＋</button>'}</div>
    <div class="ca-btns"><button type="button" data-reply="${a.id}">↩ Odgovori</button>${m.body ? `<button type="button" data-copy="${a.id}">⧉ Kopiraj</button>` : ''}</div>
    ${m.author === who() ? `<div class="ca-btns ca-own"><button type="button" data-edit="${a.id}">✎ Izmeni</button>${a.del ? `<button type="button" class="ca-delok" data-delok="${a.id}">Sigurno? Obriši za sve</button>` : `<button type="button" class="ca-del" data-del="${a.id}">🗑 Obriši</button>`}</div>` : ''}
    ${rx.length ? `<div class="ca-who">${rx.map(r => `<span>${r.emoji} ${r.username === who() ? 'Ti' : esc(personName(r.username))}</span>`).join('')}</div>` : ''}`;
  el.classList.add('open'); $('cpActOv').classList.add('open');
  document.querySelectorAll('.cm.acting').forEach(x => x.classList.remove('acting'));
  const row = $('cpMsgs').querySelector(`[data-mid="${a.id}"]`); if (row) row.classList.add('acting');
  if (isChatMobile() || !row) { el.style.left = ''; el.style.top = ''; el.classList.add('sheet'); return; }
  el.classList.remove('sheet');
  const main = document.querySelector('.cp-main').getBoundingClientRect(), b = row.querySelector('.cm-b').getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  let top = b.top - main.top - h - 8; if (top < 60) top = b.bottom - main.top + 8; top = Math.min(top, main.height - h - 70);
  let left = row.classList.contains('mine') ? b.right - main.left - w : b.left - main.left; left = Math.max(8, Math.min(left, main.width - w - 8));
  el.style.top = top + 'px'; el.style.left = left + 'px';
}
/* telefon: prevuci poruku udesno = odgovori, dugo drži = meni, dva dodira = ❤️ */
function chatTouchBind(box) {
  let t = null;
  box.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.cm[data-mid]'); if (!row || row.classList.contains('tmp') || e.touches.length > 1) { t = null; return; }
    const p = e.touches[0]; t = { row, id: row.dataset.mid, x: p.clientX, y: p.clientY, dx: 0, mode: null, long: setTimeout(() => { if (t && !t.mode) { t.mode = 'long'; try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} chatActOpen(t.id); } }, 430) };
  }, { passive: true });
  box.addEventListener('touchmove', (e) => {
    if (!t) return; const p = e.touches[0], dx = p.clientX - t.x, dy = p.clientY - t.y;
    if (!t.mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) { clearTimeout(t.long); t.mode = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.4 ? 'swipe' : 'scroll'; }
    if (t.mode === 'swipe') {
      t.dx = Math.max(0, Math.min(dx * 0.85, 96)); t.row.style.transform = `translateX(${t.dx}px)`; t.row.style.setProperty('--sw', Math.min(1, t.dx / 52).toFixed(2));
      const ok = t.dx > 52; if (ok && !t.ok) { try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} } t.ok = ok; t.row.classList.toggle('swipe-ok', ok);
    }
  }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (!t) return; clearTimeout(t.long); const c = t; t = null;
    if (c.mode === 'swipe') { c.row.style.transition = 'transform .25s cubic-bezier(.2,1.4,.4,1)'; c.row.style.transform = ''; c.row.style.removeProperty('--sw'); setTimeout(() => { c.row.style.transition = ''; c.row.classList.remove('swipe-ok'); }, 260); if (c.dx > 52) chatReplyTo(c.id); return; }
    if (c.mode) { if (c.mode === 'long') e.preventDefault(); return; }
    if (e.target.closest('a,img,button')) return;
    const now = Date.now(), last = CHAT.tap;
    if (last && last.id === c.id && now - last.at < 320) { CHAT.tap = null; e.preventDefault(); chatReact(c.id, '❤️'); }
    else CHAT.tap = { id: c.id, at: now };
  });
  box.addEventListener('touchcancel', () => { if (t) { clearTimeout(t.long); t.row.style.transform = ''; t = null; } });
}
/* ---- događaji ---- */
function chatBind() {
  $('chatTop').addEventListener('click', () => (CHAT.open ? closeChat() : openChat()));
  $('chatOv').addEventListener('click', () => closeChat());
  document.addEventListener('click', (e) => { const t = e.target; if (!t.closest || !t.closest('#taskAlarm')) return; if (t.closest('[data-tadone]')) return taskAlarmAct('done'); if (t.closest('[data-taopen]')) return taskAlarmAct('open'); if (t.closest('[data-tax]')) return taskAlarmAct('x'); });
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const pop = document.querySelector('#teamPres .tmp-pop');
    if (t.closest('#teamPres .tmp-avs')) { const open = !pop.classList.contains('open'); pop.classList.toggle('open', open); if (open) pop.innerHTML = '<div class="tmp-h">Tim</div>' + teamRowsHtml(); return; }
    const tc = t.closest('[data-tpchat]'); if (tc) { if (pop) pop.classList.remove('open'); closeNav(); return openChat(dmKey(who(), tc.dataset.tpchat)); }
    const tz = t.closest('[data-tppoz]'); if (tz) { if (pop) pop.classList.remove('open'); closeNav(); const r = dmKey(who(), tz.dataset.tppoz); openChat(r); return hudJoin(r); }
    if (pop && pop.classList.contains('open') && !t.closest('#teamPres')) pop.classList.remove('open');
  });
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const hj = t.closest('[data-hudjoin]'); if (hj) { e.stopPropagation(); return hudJoin(hj.dataset.hudjoin); }
    if (t.closest('[data-hudno]')) return hudRingStop();
    if (t.closest('[data-hudmute]')) return hudMute();
    if (t.closest('[data-hudcam]')) return hudCam();
    if (t.closest('[data-hudscr]')) return hudScreen();
    if (t.closest('[data-hudstage]')) { HUD.stage = !HUD.stage; return renderHud(); }
    if (t.closest('[data-hudleave]')) return hudLeave();
    if (t.closest('[data-hudtap]')) { Object.values(HUD.peers).forEach(p => p.audioEl && p.audioEl.play().catch(() => {})); HUD.needTap = false; return renderHud(); }
    if (t.closest('#hudBar .hud-info')) { HUD.stage = true; return renderHud(); }
  }, true);
  $('chatFab').addEventListener('click', () => (CHAT.open ? closeChat() : openChat()));
  $('navChat').addEventListener('click', () => openChat());
  $('chatPanel').addEventListener('input', (e) => { const ta = e.target.closest && e.target.closest('[data-tdinput]'); if (!ta || !TD.edit) return; TD.edit.v = ta.value; tdGrow(ta); });
  $('chatPanel').addEventListener('keydown', (e) => {
    const ta = e.target.closest && e.target.closest('[data-tdinput]');
    if (ta) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return tdCancel(); }
      if (e.key === 'Enter' && !e.shiftKey && (TD_ONE.has(ta.dataset.tdinput) || e.metaKey || e.ctrlKey)) { e.preventDefault(); return tdSave(); }
      return;
    }
    const fe = e.target.closest && e.target.closest('.td-f[data-tdf], .td-title[data-tdf]'); if (fe && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tdStart(fe.dataset.tdf); }
  });
  $('chatPanel').addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-chatclose]')) return closeChat();
    if (t.closest('[data-chatback]')) { CHAT.list = true; chatGifClose(); return renderChat(); }
    if (t.closest('[data-tdback]')) { if (CHAT.edit) chatEditCancel(); CHAT.ch = CHAT.prevCh && !isTaskCh(CHAT.prevCh) ? CHAT.prevCh : 'tim'; CHAT.list = isChatMobile(); renderChat(true); if (!CHAT.list) chatMarkRead(CHAT.ch); return; }
    if (t.closest('[data-tdtoggle]')) { const tk = taskOfCh(CHAT.ch); if (tk) taskToggle(`${tk.src.k}:${tk.x.id}`).then(() => { if (CHAT.open) { renderChat(); setTimeout(() => taskAuditLoad(CHAT.ch), 900); } }); return; }
    if (t.closest('[data-tdsave]')) return tdSave();
    if (t.closest('[data-tdcancel]')) return tdCancel();
    const tf_ = t.closest('[data-tdf]'); if (tf_ && !t.closest('a')) return tdStart(tf_.dataset.tdf);
    if (t.closest('[data-tdedit]')) { const tk = taskOfCh(CHAT.ch); if (tk) openTaskModal(tk.src.k, tk.x.id); return; }
    const tp = t.closest('[data-tdprio]'); if (tp) { const tk = taskOfCh(CHAT.ch); if (tk) taskSetPrio(tk, tp.dataset.tdprio); return; }
    if (t.closest('[data-tdopen]')) { const tk = taskOfCh(CHAT.ch); if (tk) { closeChat(); openTaskItem(tk.src.k, tk.x.id); } return; }
    const c = t.closest('[data-chat]'); if (c) return chatSelect(c.dataset.chat);
    const g = t.closest('[data-chatgo]'); if (g) { const [ch, id] = g.dataset.chatgo.split('|'); return chatJump(ch, id); }
    if (t.closest('[data-chatolder]')) return chatOlder(CHAT.ch);
    const mt = t.closest('[data-ment]'); if (mt) return chatMentionPick(mt.dataset.ment);
    if (t.closest('#cpMic')) return voiceStart();
    if (t.closest('[data-vcancel]')) return voiceStop(false);
    if (t.closest('[data-vsend]')) return voiceStop(true);
    const vp = t.closest('[data-vplay]'); if (vp) return voicePlay(vp.dataset.vplay);
    if (t.closest('[data-vspeed]')) return voiceSpeed();
    const rxb = t.closest('[data-rx]'); if (rxb) { const [id, e_] = rxb.dataset.rx.split('|'); return chatReact(id, e_); }
    const rp = t.closest('[data-reply]'); if (rp) return chatReplyTo(rp.dataset.reply);
    if (t.closest('[data-replyx]')) { delete CHAT.reply[CHAT.ch]; renderChatReply(); return $('cpInput').focus(); }
    if (t.closest('[data-editx]')) { chatEditCancel(); return $('cpInput').focus(); }
    const ed = t.closest('[data-edit]'); if (ed) return chatEditStart(ed.dataset.edit);
    const dl = t.closest('[data-del]'); if (dl) { CHAT.act.del = true; return chatActRender(); }
    const dk = t.closest('[data-delok]'); if (dk) return chatDelete(dk.dataset.delok);
    const ao = t.closest('[data-actopen]'); if (ao) { e.stopPropagation(); return CHAT.act && CHAT.act.id === ao.dataset.actopen ? chatActClose() : chatActOpen(ao.dataset.actopen); }
    if (t.closest('[data-actmore]')) { CHAT.act.more = true; return chatActRender(); }
    const cp = t.closest('[data-copy]'); if (cp) { const m = chatFind(cp.dataset.copy); chatActClose(); try { navigator.clipboard.writeText(m.body || ''); toast('Kopirano'); } catch (x) { toast('Ne mogu da kopiram'); } return; }
    const qg = t.closest('[data-qgo]'); if (qg) { const o = chatFind(qg.dataset.qgo); if (o) { CHAT.res[o.id] = o; return chatJump(o.channel, o.id); } return; }
    if (t.closest('#cpActOv')) return chatActClose();
    if (CHAT.act && !t.closest('#cpAct')) chatActClose();
    if (t.closest('[data-gifclose]')) return chatGifClose();
    if (t.closest('[data-gifup]')) return $('cpFile').click();
    if (t.closest('[data-gifmore]')) return chatGifSearch(CHAT.gif.q, true);
    const gp = t.closest('[data-gifpick]'); if (gp) { chatGifClose(); return chatSend({ body: '', image_url: gp.dataset.gifpick }); }
    if (t.closest('#cpGifBtn')) return chatGifOpen();
    if (t.closest('#cpAttach')) return $('cpFile').click();
    if (CHAT.gif.open && !t.closest('#cpGifBox')) chatGifClose();
  });
  $('chatPanel').addEventListener('submit', (e) => {
    const f = e.target.closest('[data-giflink]'); if (!f) return; e.preventDefault();
    const u = giphyFromLink($('gbLink').value); if (!u) return toast('Nalepi link GIF-a (giphy.com ili link koji se završava na .gif)', 3500);
    chatGifClose(); chatSend({ body: '', image_url: u });
  });
  $('chatPanel').addEventListener('input', (e) => { if (e.target.id === 'gbQ') { clearTimeout(CHAT.gif.t); const v = e.target.value; CHAT.gif.t = setTimeout(() => chatGifSearch(v), 350); } });
  $('cpForm').addEventListener('submit', (e) => { e.preventDefault(); chatSend(); $('cpInput').focus(); });
  /* telefon: tastatura ostaje otvorena posle slanja (dugme ne uzima fokus polju za kucanje) */
  const sendBtn = $('cpForm').querySelector('.cp-send');
  sendBtn.addEventListener('mousedown', (e) => e.preventDefault());
  sendBtn.addEventListener('touchend', (e) => {
    const tch = e.changedTouches && e.changedTouches[0], r = sendBtn.getBoundingClientRect();
    e.preventDefault();
    if (tch && (tch.clientX < r.left - 10 || tch.clientX > r.right + 10 || tch.clientY < r.top - 10 || tch.clientY > r.bottom + 10)) return;
    chatSend(); $('cpInput').focus();
  }, { passive: false });
  ['cpMention', 'cpReply'].forEach(id => $(id).addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); }));
  $('cpMsgs').addEventListener('dblclick', (e) => { const row = e.target.closest('.cm[data-mid]'); if (!row || row.classList.contains('tmp') || e.target.closest('a,img,button,.cm-rx')) return; try { getSelection().removeAllRanges(); } catch (x) {} chatReact(row.dataset.mid, '❤️'); });
  $('cpMsgs').addEventListener('contextmenu', (e) => { const row = e.target.closest('.cm[data-mid]'); if (!row || row.classList.contains('tmp') || !matchMedia('(hover: none)').matches) return; e.preventDefault(); });
  $('cpMsgs').addEventListener('scroll', () => { if (CHAT.act && !isChatMobile()) chatActClose(); }, { passive: true });
  chatTouchBind($('cpMsgs'));
  const inp = $('cpInput');
  inp.addEventListener('input', () => { chatGrow(); chatMentionBox(); chatFormState(); if (inp.value.trim()) chatTypingSend(); });
  inp.addEventListener('click', chatMentionBox);
  inp.addEventListener('keydown', (e) => {
    const box = $('cpMention'), open = box.style.display !== 'none' && box.children.length;
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault(); const bs = [...box.children], i = bs.findIndex(b => b.classList.contains('on')), n = (i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length;
      bs.forEach((b, k) => b.classList.toggle('on', k === n)); return;
    }
    if (open && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); const on = box.querySelector('.on') || box.children[0]; return chatMentionPick(on.dataset.ment); }
    if (e.key === 'Escape') { e.stopPropagation(); if (open) { box.style.display = 'none'; return; } if (CHAT.act) return chatActClose(); if (CHAT.gif.open) return chatGifClose(); if (CHAT.edit) return chatEditCancel(); if (CHAT.reply[CHAT.ch]) { delete CHAT.reply[CHAT.ch]; return renderChatReply(); } return closeChat(); }
    if (e.key === 'ArrowUp' && !inp.value && !CHAT.edit && !isChatMobile()) { const last = [...(CHAT.msgs[CHAT.ch] || [])].reverse().find(m => m.author === who() && !m._tmp && !m.deleted_at && m.body); if (last) { e.preventDefault(); chatEditStart(last.id); } return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isChatMobile()) { e.preventDefault(); chatSend(); }
  });
  inp.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); chatUpload(f); } });
  $('cpFile').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; chatGifClose(); if (f) chatUpload(f); });
  const main = document.querySelector('.cp-main');
  main.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); main.classList.add('drop'); } });
  main.addEventListener('dragleave', (e) => { if (!main.contains(e.relatedTarget)) main.classList.remove('drop'); });
  main.addEventListener('drop', (e) => { main.classList.remove('drop'); const f = [...(e.dataTransfer?.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); chatUpload(f); } });
  $('cpQ').addEventListener('input', (e) => chatSearch(e.target.value));
  $('cpQ').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (e.target.value) { e.target.value = ''; chatSearch(''); } else closeChat(); } });
  document.addEventListener('keydown', (e) => {
    if (!state.user || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' && CHAT.open && !document.querySelector('.lightbox.open')) { if (CHAT.act) chatActClose(); else if (CHAT.edit) chatEditCancel(); else if (CHAT.reply[CHAT.ch]) { delete CHAT.reply[CHAT.ch]; renderChatReply(); } else closeChat(); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
    if ((e.key === 'c' || e.key === 'C') && !document.querySelector('.modal-wrap.open')) { e.preventDefault(); CHAT.open ? closeChat() : openChat(); }
  });
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (CHAT.open) { chatVV(); renderChat(); } }, 120); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', chatVV); visualViewport.addEventListener('scroll', chatVV); }
  setInterval(() => { if (CHAT.open) renderChatTyping(); }, 1500);
  ACTIONS.push({ name: 'Tim chat', kw: 'chat cet poruke poruka tim grupa privatno dm dopisivanje gif', ic: '💬', run: () => openChat() });
}

/* klik na obaveštenje: otvori pravo mesto u CRM-u */
function crmGo(r) {
  if (!r || !state.user) return;
  ['notifModal', 'pushModal'].forEach(id => { const m = $(id); if (m) m.classList.remove('open'); });
  if (r.startsWith('tab:')) return setTab(r.slice(4));
  if (r.startsWith('taskdone:')) { const tk = taskOfCh('task:' + r.slice(9)); if (tk) { openChat(taskChOf(tk.src, tk.x)); if (!taskIsDone(tk.x, tk.src)) taskToggle(`${tk.src.k}:${tk.x.id}`).then(() => { if (CHAT.open) renderChat(); }); } return; }
  if (r.startsWith('chat:')) return openChat(r.slice(5));
  if (r.startsWith('huddle:')) { const room = r.slice(7); openChat(room); if (HUD.room !== room) { HUD.ring = null; hudRing(room, null, true); } return; }
  if (r.startsWith('item:')) { const [, tbl, id] = r.split(':'); return itemOpen(tbl, id); }
  if (r.startsWith('ref:')) r = r.slice(4);
  const tabFor = { order: 'orders', cust: 'customers', product: 'products', post: 'posts', ret: 'returns', promo: 'promos', code: 'customers', ms: 'history', idea: 'site', pack: 'packaging' };
  const k = r.split(':')[0]; if (tabFor[k] && state.tab !== tabFor[k]) setTab(tabFor[k]);
  try { openRef(r); } catch (e) {}
}
async function byeOut() {
  try { if (PUSH.sub) await sb.from('h_push_subs').delete().eq('endpoint', PUSH.sub.endpoint); } catch (e) {} // posle odjave ovaj uređaj više ne prima tuđa obaveštenja
  const played = sfx('bye'); await Promise.all([sb.auth.signOut(), new Promise(r => setTimeout(r, played ? 800 : 0))]); location.reload(); }
async function enterApp(user, restored, pre) {
  state.user = user;
  $('userName').textContent = user.display;
  $('navUser').textContent = user.display; $('navAvatar').textContent = user.display.charAt(0).toUpperCase();
  $('avatar').textContent = user.display.charAt(0).toUpperCase();
  const splash = pre || playSplash(user, restored && soundOn() && !audioReady());
  await loadData();
  renderAll();
  snapshotToday();
  await loadNotifs();
  await splash;
  $('loginPage').style.display = 'none';
  $('app').style.display = 'block';
  chgInit(); renderTray(); chgEnter(state.tab); renderChgBadges(); startLive();
  pushInit();
  chatInit();
  hudInit();
  setTimeout(taskAlarmCheck, 4000); setInterval(taskAlarmCheck, 30000); document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(taskAlarmCheck, 1500); });
  { const m = location.hash.match(/^#go=(.+)$/); if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => crmGo(decodeURIComponent(m[1])), 300); } }
  botStart();
  setInterval(renderTray, 60000);
  countUp($('v-' + state.tab));
  setInterval(async () => {
    if (document.hidden || document.querySelector('.modal-wrap.open')) return;
    try { await loadData(); renderAll(); if (state.openOrderId && state.dTab === 'activity') renderDrawer(); } catch (e) {}
  }, 60000);
}

(async function init() {
  bindEvents(); botBind(); chatBind();
  const { data } = await sb.auth.getSession();
  if (data.session) { try { await enterApp(userFrom(data.session.user), true); } catch (e) { console.error(e); } }
})();
