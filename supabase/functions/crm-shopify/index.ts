// COMPLETE CRM · veza Shopify <-> CRM (samo HARIZMA prodavnica i h_ tabele; CRM za potkovice se ne dira)
// Shopify -> CRM: webhook (porudžbine, otkazivanje, slanje, kupci, novi proizvodi, cene i status) na ?k=<tajna>
// CRM -> Shopify: red h_shopify_queue (stanje veličine, cena, status) kad postoji ključ HARIZMA CRM aplikacije (client credentials)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const KEY = Deno.env.get('SHOPIFY_HOOK_KEY') || '';
const HOOK = Deno.env.get('PUSH_HOOK_SECRET') || '';
const SHOP = Deno.env.get('SHOPIFY_SHOP') || 'wegmk4-wf.myshopify.com';
const API = '2026-04';
const TEAM = ['konstantin', 'stasa', 'marjan'];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const num = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const cut = (s: unknown, n: number) => { const t = String(s ?? '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

async function logEv(topic: string, ok: boolean, msg: string, ref = '', dir = 'in', webhook_id: string | null = null) {
  try { await db.from('h_shopify_log').insert({ topic, ok, msg: cut(msg, 900), ref: ref || null, dir, webhook_id }); } catch (_) { /* dnevnik nije presudan */ }
}
async function priv(k: string) { const { data } = await db.from('h_private').select('v').eq('k', k).maybeSingle(); return data?.v || ''; }
async function privSet(k: string, v: string) { await db.from('h_private').upsert({ k, v }, { onConflict: 'k' }); }

/* ---------------- Shopify -> CRM ---------------- */
function detectSource(o: any): string {
  const s = `${o.landing_site || ''} ${o.referring_site || ''} ${o.source_name || ''}`.toLowerCase();
  if (/fbclid|utm_source=(facebook|fb|ig|instagram|meta)|facebook\.com|instagram\.com/.test(s)) return 'meta';
  if (/ttclid|utm_source=tiktok|tiktok\.com/.test(s)) return 'tiktok';
  if (/gclid|gbraid|wbraid|utm_source=google/.test(s)) return 'google';
  return 'organic';
}
function payOf(o: any): string {
  const g = `${(o.payment_gateway_names || []).join(' ')} ${o.gateway || ''}`.toLowerCase();
  if (/cash|cod|pouze|delivery/.test(g)) return 'cod';
  if (/bank|uplat|transfer|wire/.test(g)) return 'bank';
  if (g.trim()) return 'card';
  return 'cod';
}
async function normOrder(o: any) {
  const sa = o.shipping_address || o.billing_address || {}, c = o.customer || {};
  const name = (sa.name || [sa.first_name, sa.last_name].filter(Boolean).join(' ') || [c.first_name, c.last_name].filter(Boolean).join(' ') || '').trim();
  const lines = Array.isArray(o.line_items) ? o.line_items : [];
  const vids = lines.map((l: any) => l.variant_id && String(l.variant_id)).filter(Boolean);
  const { data: vs } = vids.length ? await db.from('h_variants').select('id, product_id, size, color, shopify_variant_id').in('shopify_variant_id', vids) : { data: [] as any[] };
  const pids = [...new Set((vs || []).map((v: any) => v.product_id))];
  const { data: ps } = pids.length ? await db.from('h_products').select('id, name, buy_price').in('id', pids) : { data: [] as any[] };
  const items = lines.filter((l: any) => !l.gift_card).map((l: any) => {
    const v = (vs || []).find((x: any) => x.shopify_variant_id === String(l.variant_id)), p = v && (ps || []).find((x: any) => x.id === v.product_id);
    const q = Math.max(1, parseInt(l.quantity) || 1); // popust ide na nivou porudžbine (total_discounts), kao u CRM-u
    return {
      variant_id: v?.id || null, product_id: v?.product_id || null,
      name: p ? p.name : cut(l.title || l.name || 'Artikal', 120),
      size: v ? [v.size, v.color].filter(Boolean).join(' ') : cut(l.variant_title || '', 60),
      qty: q, unit_price: num(l.price), unit_cost: p ? num(p.buy_price) || null : null,
    };
  });
  const f = (o.fulfillments || []).find((x: any) => x.tracking_number) || {};
  return {
    shopify_order_id: String(o.id), order_no: o.name || (o.order_number ? '#' + o.order_number : null), created_at: o.created_at,
    customer_name: name || o.email || '', phone: sa.phone || o.phone || c.phone || '', email: o.email || c.email || '',
    address: [sa.address1, sa.address2].filter(Boolean).join(', '), city: sa.city || '', postal_code: sa.zip || '',
    payment: payOf(o), shipping_price: num(o.total_shipping_price_set?.shop_money?.amount ?? (o.shipping_lines || []).reduce((a: number, s: any) => a + num(s.price), 0)),
    discount: num(o.total_discounts), discount_code: (o.discount_codes || [])[0]?.code || '', note: o.note || '',
    source: detectSource(o), cancelled: !!o.cancelled_at, tracking_no: f.tracking_number || '', courier: f.tracking_company || '', items,
  };
}
async function onOrder(o: any, topic: string) {
  if (!o?.id) return { skip: 'bez id' };
  const n = await normOrder(o);
  if (topic === 'orders/cancelled') n.cancelled = true;
  const { data, error } = await db.rpc('h_shopify_order_in', { o: n });
  if (error) throw new Error(error.message);
  if (o.customer?.id && n.email) {
    try { await db.from('h_customers').update({ shopify_customer_id: String(o.customer.id) }).is('shopify_customer_id', null).eq('email', n.email); } catch (_) { /* nije presudno */ }
  }
  return { ...data, order: n.order_no, unmapped: n.items.filter((i: any) => !i.variant_id).length };
}
const STATUS_IN: Record<string, string> = { ACTIVE: 'active', active: 'active', DRAFT: 'draft', draft: 'draft', ARCHIVED: 'archived', archived: 'archived', UNLISTED: 'active', unlisted: 'active' };
function optVals(p: any, v: any) {
  const names = (p.options || []).map((o: any) => String(o.name || '').toLowerCase());
  const vals = [v.option1, v.option2, v.option3];
  let size = '', color = '';
  names.forEach((nm: string, i: number) => { if (/boj|color|colour/.test(nm)) color = vals[i] || ''; else if (/veli|size/.test(nm)) size = vals[i] || ''; });
  if (!size && !color) size = v.title && v.title !== 'Default Title' ? v.title : 'UNI';
  size = String(size || 'UNI').replace(/univerzalna.*$/i, 'UNI').trim().toUpperCase();
  return { size, color: color || null };
}
async function onProduct(p: any, topic: string) {
  if (!p?.id) return { skip: 'bez id' };
  const sid = String(p.id);
  const { data: ex } = await db.from('h_products').select('id, name, sell_price, compare_price, status').eq('shopify_product_id', sid).is('deleted_at', null).maybeSingle();
  const vs = Array.isArray(p.variants) ? p.variants : [];
  const price = vs.length ? Math.max(...vs.map((v: any) => num(v.price))) : 0;
  const cmp = vs.length ? Math.max(...vs.map((v: any) => num(v.compare_at_price))) : 0;
  if (topic === 'products/delete') {
    if (!ex) return { skip: 'nije u CRM-u' };
    await db.rpc('h_shopify_product_in', { pid: ex.id, f: { status: 'archived' } });
    return { archived: ex.name };
  }
  if (!ex) {
    if (topic !== 'products/create') return { skip: 'proizvod nije povezan sa CRM-om (menja se samo kad se napravi novi)' };
    const { data, error } = await db.rpc('h_shopify_product_new', { p: {
      shopify_product_id: sid, name: cut(String(p.title || 'Novi komad').toUpperCase(), 80), category: p.product_type || null,
      sell_price: price || null, compare_price: cmp || null, status: STATUS_IN[p.status] || 'draft', image_url: p.image?.src || (p.images || [])[0]?.src || null,
      variants: vs.map((v: any) => ({ shopify_variant_id: String(v.id), ...optVals(p, v), stock: Math.max(0, parseInt(v.inventory_quantity) || 0) })),
    } });
    if (error) throw new Error(error.message);
    return { created: data };
  }
  const f: Record<string, unknown> = {};
  if (price && num(ex.sell_price) !== price) f.sell_price = price;
  if (num(ex.compare_price) !== cmp) f.compare_price = cmp || null;
  const st = STATUS_IN[p.status]; if (st && st !== ex.status) f.status = st;
  // nove veličine koje su dodate na Shopify-ju
  const { data: have } = await db.from('h_variants').select('id, shopify_variant_id, size, color').eq('product_id', ex.id).is('deleted_at', null);
  const add = vs.filter((v: any) => !(have || []).some((h: any) => h.shopify_variant_id === String(v.id)))
    .map((v: any) => ({ shopify_variant_id: String(v.id), ...optVals(p, v), stock: Math.max(0, parseInt(v.inventory_quantity) || 0) }));
  if (!Object.keys(f).length && !add.length) return { same: ex.name };
  const { error } = await db.rpc('h_shopify_product_in', { pid: ex.id, f, add });
  if (error) throw new Error(error.message);
  return { updated: ex.name, f, added: add.length };
}
async function onCustomer(c: any) {
  if (!c?.id) return { skip: 'bez id' };
  const a = c.default_address || {};
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || a.name || c.email || '';
  if (!name) return { skip: 'bez imena' };
  const { data, error } = await db.rpc('h_shopify_customer_in', { c: { shopify_customer_id: String(c.id), name, phone: c.phone || a.phone || '', email: c.email || '', city: a.city || '', address: [a.address1, a.address2].filter(Boolean).join(', '), postal_code: a.zip || '' } });
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- CRM -> Shopify (kad postoji ključ aplikacije) ---------------- */
async function token(): Promise<string> {
  const cid = await priv('shopify_cid'), csec = await priv('shopify_csec');
  if (!cid || !csec) return '';
  const t = await priv('shopify_token'), exp = Number(await priv('shopify_token_exp')) || 0;
  if (t && exp > Date.now() + 5 * 60e3) return t;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: csec }) });
  const txt = await r.text();
  if (!r.ok) {
    const t = (txt.match(/<title>([^<]+)<\/title>/) || [])[1] || txt;
    const why = /application_cannot_be_found|invalid_client/.test(t) ? 'Shopify ne prepoznaje ovaj Client ID ili Client secret' : /shop_not_permitted/.test(t) ? 'aplikacija nije napravljena iz ove prodavnice (Dev Dashboard iste organizacije)' : /not.*install|app_not_installed/i.test(t) ? 'aplikacija još nije instalirana na prodavnicu (Install app)' : cut(t, 160);
    throw new Error(`Shopify nije prihvatio ključ: ${why}`);
  }
  const d = JSON.parse(txt);
  await privSet('shopify_token', d.access_token); await privSet('shopify_token_exp', String(Date.now() + (Number(d.expires_in) || 86399) * 1000)); await privSet('shopify_scope', d.scope || '');
  return d.access_token;
}
async function gql(query: string, variables: Record<string, unknown> = {}) {
  const t = await token(); if (!t) throw new Error('nema ključa aplikacije');
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t }, body: JSON.stringify({ query, variables }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.errors) throw new Error(`Shopify ${r.status}: ${cut(JSON.stringify(d.errors || d), 300)}`);
  return d.data;
}
async function locationId() {
  const c = await priv('shopify_location'); if (c) return c;
  const d = await gql('query { locations(first: 5) { nodes { id isActive } } }');
  const l = (d.locations.nodes || []).find((x: any) => x.isActive) || d.locations.nodes[0];
  if (!l) throw new Error('Shopify nema lokaciju za stanje');
  await privSet('shopify_location', l.id); return l.id;
}
async function pushStock(vid: string) {
  const { data: v } = await db.from('h_variants').select('id, stock, shopify_variant_id, deleted_at').eq('id', vid).maybeSingle();
  if (!v || !v.shopify_variant_id) return 'nije povezano';
  const d = await gql('query($id: ID!) { productVariant(id: $id) { inventoryQuantity inventoryItem { id tracked } } }', { id: `gid://shopify/ProductVariant/${v.shopify_variant_id}` });
  const pv = d.productVariant; if (!pv) return 'nema na Shopify-ju';
  const want = v.deleted_at ? 0 : Math.max(0, v.stock || 0);
  if (pv.inventoryQuantity === want) return 'isto';
  if (!pv.inventoryItem.tracked) await gql('mutation($id: ID!) { inventoryItemUpdate(id: $id, input: { tracked: true }) { userErrors { message } } }', { id: pv.inventoryItem.id });
  const r = await gql(`mutation($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) @idempotent(key: "${crypto.randomUUID()}") { userErrors { field message } } }`,
    { input: { name: 'available', reason: 'correction', referenceDocumentUri: `logistics://harizma-crm/variant/${v.id}`, quantities: [{ inventoryItemId: pv.inventoryItem.id, locationId: await locationId(), quantity: want, changeFromQuantity: pv.inventoryQuantity }] } });
  const ue = r.inventorySetQuantities.userErrors; if (ue?.length) throw new Error(ue.map((e: any) => e.message).join('; '));
  return `${pv.inventoryQuantity} → ${want}`;
}
const STATUS_OUT: Record<string, string> = { active: 'ACTIVE', draft: 'DRAFT', archived: 'ARCHIVED' };
async function pushProduct(pid: string) {
  const { data: p } = await db.from('h_products').select('id, name, sell_price, compare_price, status, deleted_at, shopify_product_id').eq('id', pid).maybeSingle();
  if (!p || !p.shopify_product_id) return 'nije povezano';
  const gid = `gid://shopify/Product/${p.shopify_product_id}`;
  const d = await gql('query($id: ID!) { product(id: $id) { status variants(first: 100) { nodes { id price compareAtPrice } } } }', { id: gid });
  if (!d.product) return 'nema na Shopify-ju';
  const out: string[] = [];
  const st = p.deleted_at ? 'ARCHIVED' : STATUS_OUT[p.status] || 'DRAFT';
  if (d.product.status !== st) {
    const r = await gql('mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { message } } }', { p: { id: gid, status: st } });
    const ue = r.productUpdate.userErrors; if (ue?.length) throw new Error(ue.map((e: any) => e.message).join('; '));
    out.push(`status ${d.product.status} → ${st}`);
  }
  const price = Number(p.sell_price) || 0, cmp = Number(p.compare_price) || 0;
  const ch = (d.product.variants.nodes || []).filter((v: any) => price && (Number(v.price) !== price || (Number(v.compareAtPrice) || 0) !== cmp))
    .map((v: any) => ({ id: v.id, price: price.toFixed(2), compareAtPrice: cmp ? cmp.toFixed(2) : null }));
  if (ch.length) {
    const r = await gql('mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $pid, variants: $v) { userErrors { message } } }', { pid: gid, v: ch });
    const ue = r.productVariantsBulkUpdate.userErrors; if (ue?.length) throw new Error(ue.map((e: any) => e.message).join('; '));
    out.push(`cena ${price}${cmp ? ' (bila ' + cmp + ')' : ''} na ${ch.length} varijanti`);
  }
  return out.join(', ') || 'isto';
}
async function runQueue(max = 40) {
  if (!(await priv('shopify_cid'))) return { skip: 'nema ključa' };
  const { data: q } = await db.from('h_shopify_queue').select('*').is('done_at', null).lt('tries', 6).order('id').limit(max);
  let ok = 0, bad = 0;
  for (const j of q || []) {
    try {
      const r = j.kind === 'stock' ? await pushStock(j.ref) : await pushProduct(j.ref);
      await db.from('h_shopify_queue').update({ done_at: new Date().toISOString(), tries: j.tries + 1, last_error: null }).eq('id', j.id);
      if (r !== 'isto') await logEv(j.kind === 'stock' ? 'stanje' : 'model', true, r, j.ref, 'out');
      ok++;
    } catch (e) {
      bad++; const m = String((e as Error)?.message || e);
      await db.from('h_shopify_queue').update({ tries: j.tries + 1, last_error: cut(m, 400) }).eq('id', j.id);
      await logEv(j.kind, false, m, j.ref, 'out');
    }
  }
  return { ok, bad, left: Math.max(0, (q || []).length - ok - bad) };
}
const HOOK_TOPICS = ['ORDERS_CREATE', 'ORDERS_UPDATED', 'ORDERS_CANCELLED', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE', 'CUSTOMERS_UPDATE'];
async function ensureHooks() {
  const uri = `${SB_URL}/functions/v1/crm-shopify?k=${KEY}`;
  const d = await gql('query { webhookSubscriptions(first: 50) { nodes { id topic uri } } }');
  const have = (d.webhookSubscriptions.nodes || []).filter((w: any) => w.uri === uri).map((w: any) => w.topic);
  const made: string[] = [];
  for (const t of HOOK_TOPICS.filter(t => !have.includes(t))) {
    const r = await gql('mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { webhookSubscription { id topic } userErrors { field message } } }', { topic: t, sub: { uri, format: 'JSON' } });
    const ue = r.webhookSubscriptionCreate.userErrors; if (ue?.length) throw new Error(`webhook ${t}: ${ue.map((e: any) => e.message).join('; ')}`);
    made.push(t);
  }
  await privSet('shopify_hooks', [...have, ...made].join(','));
  return { have: have.length, made };
}
// porudžbine koje su možda promakle (npr. dok veza nije radila): poslednjih 7 dana ili od poslednje provere
function gqlOrderToRest(o: any) {
  const sa = o.shippingAddress || {}, fv = o.customerJourneySummary?.firstVisit || {};
  const tr = (o.fulfillments || []).flatMap((f: any) => f.trackingInfo || [])[0] || {};
  return {
    id: o.legacyResourceId, name: o.name, created_at: o.createdAt, email: o.email, phone: o.phone, note: o.note, cancelled_at: o.cancelledAt,
    payment_gateway_names: o.paymentGatewayNames || [], total_discounts: o.totalDiscountsSet?.shopMoney?.amount, discount_codes: (o.discountCodes || []).map((c: string) => ({ code: c })),
    total_shipping_price_set: { shop_money: { amount: o.totalShippingPriceSet?.shopMoney?.amount } }, landing_site: fv.landingPage || '', referring_site: fv.referrerUrl || '',
    shipping_address: { name: sa.name, first_name: sa.firstName, last_name: sa.lastName, address1: sa.address1, address2: sa.address2, city: sa.city, zip: sa.zip, phone: sa.phone },
    customer: o.customer ? { id: o.customer.legacyResourceId, first_name: o.customer.firstName, last_name: o.customer.lastName, email: o.customer.email, phone: o.customer.phone } : null,
    line_items: (o.lineItems?.nodes || []).map((l: any) => ({ variant_id: l.variant?.legacyResourceId || null, title: l.title, variant_title: l.variantTitle, quantity: l.quantity, price: l.originalUnitPriceSet?.shopMoney?.amount })),
    fulfillments: tr.number ? [{ tracking_number: tr.number, tracking_company: tr.company }] : [],
  };
}
async function pullOrders() {
  const since = (await priv('shopify_orders_pulled_at')) || new Date(Date.now() - 7 * 864e5).toISOString();
  const started = new Date().toISOString();
  let after: string | null = null, n = 0, made = 0;
  do {
    const d: any = await gql(`query($q: String!, $after: String) { orders(first: 50, after: $after, query: $q, sortKey: UPDATED_AT) { pageInfo { hasNextPage endCursor } nodes { legacyResourceId name createdAt email phone note cancelledAt paymentGatewayNames totalDiscountsSet { shopMoney { amount } } totalShippingPriceSet { shopMoney { amount } } discountCodes customerJourneySummary { firstVisit { landingPage referrerUrl } } shippingAddress { name firstName lastName address1 address2 city zip phone } customer { legacyResourceId firstName lastName email phone } lineItems(first: 50) { nodes { title variantTitle quantity variant { legacyResourceId } originalUnitPriceSet { shopMoney { amount } } } } fulfillments(first: 10) { trackingInfo(first: 1) { number company } } } } }`, { q: `updated_at:>='${since}'`, after });
    for (const o of d.orders.nodes || []) { n++; const r: any = await onOrder(gqlOrderToRest(o), o.cancelledAt ? 'orders/cancelled' : 'orders/updated'); if (r?.created) { made++; await logEv('orders/pull', true, JSON.stringify(r), String(o.legacyResourceId)); } }
    after = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
  } while (after);
  await privSet('shopify_orders_pulled_at', started);
  return { seen: n, created: made };
}
async function reconcile() {
  if (!(await priv('shopify_cid'))) return { skip: 'nema ključa' };
  // CRM je glavni za stanje: svaka povezana veličina čije se stanje razlikuje ide u red
  const { data: vs } = await db.from('h_variants').select('id, stock, shopify_variant_id, product_id').not('shopify_variant_id', 'is', null).is('deleted_at', null);
  const ids = (vs || []).map((v: any) => `gid://shopify/ProductVariant/${v.shopify_variant_id}`);
  let diff = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const d = await gql('query($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { legacyResourceId inventoryQuantity } } }', { ids: ids.slice(i, i + 100) });
    for (const n of d.nodes || []) {
      if (!n) continue; const v = (vs || []).find((x: any) => x.shopify_variant_id === String(n.legacyResourceId));
      if (v && Math.max(0, v.stock || 0) !== n.inventoryQuantity) { diff++; await db.from('h_shopify_queue').upsert({ kind: 'stock', ref: v.id }, { onConflict: 'kind,ref', ignoreDuplicates: true }); }
    }
  }
  await privSet('shopify_reconciled_at', new Date().toISOString());
  const q = await runQueue(80);
  let orders: unknown = null, hooks: unknown = null;
  try { orders = await pullOrders(); } catch (e) { orders = { error: String((e as Error).message) }; await logEv('orders/pull', false, String((e as Error).message), '', 'in'); }
  try { hooks = await ensureHooks(); } catch (e) { hooks = { error: String((e as Error).message) }; await logEv('webhooks', false, String((e as Error).message), '', 'out'); }
  return { diff, queue: q, orders, hooks };
}
async function status() {
  const [{ data: last }, { data: lastOut }, { count: pending }, { data: errs }] = await Promise.all([
    db.from('h_shopify_log').select('at, topic, ok, msg').eq('dir', 'in').order('id', { ascending: false }).limit(5),
    db.from('h_shopify_log').select('at, topic, ok, msg').eq('dir', 'out').order('id', { ascending: false }).limit(5),
    db.from('h_shopify_queue').select('id', { count: 'exact', head: true }).is('done_at', null),
    db.from('h_shopify_queue').select('last_error').is('done_at', null).not('last_error', 'is', null).limit(1),
  ]);
  const cid = await priv('shopify_cid');
  let outOk = false, outErr = '';
  if (cid) { try { await token(); outOk = true; } catch (e) { outErr = String((e as Error).message); } }
  return { shop: SHOP, inbound: { hooks: (await priv('shopify_hooks')) || '', last: last || [] }, outbound: { configured: !!cid, ok: outOk, error: outErr || errs?.[0]?.last_error || '', pending: pending || 0, last: lastOut || [], reconciled_at: await priv('shopify_reconciled_at') } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url), raw = await req.text();
  let body: any = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (_) { body = {}; }
  // 1) webhook sa Shopify-ja
  const topic = req.headers.get('x-shopify-topic');
  if (topic) {
    if (!KEY || url.searchParams.get('k') !== KEY) return json({ ok: false }, 401);
    const sig = req.headers.get('x-shopify-hmac-sha256'), csec = await priv('shopify_csec');
    if (csec) {
      const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(csec), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)))));
      if (!sig || sig !== mac) { await logEv(topic, false, 'potpis webhook-a nije ispravan, odbijeno', '', 'in'); return json({ ok: false }, 401); }
    }
    const wid = req.headers.get('x-shopify-webhook-id') || req.headers.get('x-shopify-event-id') || null;
    if (wid) { const { data: seen } = await db.from('h_shopify_log').select('id').eq('webhook_id', wid).maybeSingle(); if (seen) return json({ ok: true, dup: true }); }
    try {
      let r: unknown = { skip: 'nepoznata tema' };
      if (topic.startsWith('orders/')) r = await onOrder(body, topic);
      else if (topic.startsWith('products/')) r = await onProduct(body, topic);
      else if (topic.startsWith('customers/')) r = await onCustomer(body);
      await logEv(topic, true, JSON.stringify(r), String(body?.id || ''), 'in', wid);
      return json({ ok: true, r });
    } catch (e) {
      await logEv(topic, false, String((e as Error)?.message || e), String(body?.id || ''), 'in', null);
      return json({ ok: false, error: String((e as Error)?.message || e) }, 500); // Shopify ponovo šalje
    }
  }
  // 2) baza (okidač i cron)
  if (HOOK && req.headers.get('x-crm-hook') === HOOK) {
    try {
      if (body.queue) return json({ ok: true, res: await runQueue() });
      if (body.cron) {
        const last = Date.parse(await priv('shopify_reconciled_at')) || 0;
        return json({ ok: true, res: Date.now() - last > 55 * 60e3 ? await reconcile() : await runQueue() });
      }
      if (body.dry && body.order) return json({ ok: true, res: await normOrder(body.order) });
      if (body.status) return json({ ok: true, res: await status() });
    } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
    return json({ ok: false, error: 'nepoznato' }, 400);
  }
  // 3) CRM (prijavljen član tima)
  const { data: u } = await db.auth.getUser((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
  const user = u?.user?.email ? u.user.email.split('@')[0] : '';
  if (!TEAM.includes(user)) return json({ ok: false, error: 'niste prijavljeni' }, 401);
  try {
    if (body.connect) { // ključ HARIZMA CRM aplikacije iz Shopify Dev Dashboard-a (samo Konstantin)
      if (user !== 'konstantin') return json({ ok: false, error: 'Samo Konstantin može da poveže ključ.' }, 403);
      const cid = String(body.client_id || '').trim(), csec = String(body.client_secret || '').trim();
      if (!/^[A-Za-z0-9_-]{10,}$/.test(cid) || csec.length < 10) return json({ ok: false, error: 'Client ID ili Client secret nisu dobri.' }, 400);
      const old = [await priv('shopify_cid'), await priv('shopify_csec')];
      await privSet('shopify_cid', cid); await privSet('shopify_csec', csec); await privSet('shopify_token', ''); await privSet('shopify_token_exp', '0');
      try { await token(); await locationId(); } catch (e) {
        if (old[0]) { await privSet('shopify_cid', old[0]); await privSet('shopify_csec', old[1]); } else { await db.from('h_private').delete().in('k', ['shopify_cid', 'shopify_csec', 'shopify_token', 'shopify_token_exp']); }
        return json({ ok: false, error: String((e as Error).message) }, 400);
      }
      await logEv('povezivanje', true, `ključ aplikacije povezao ${user}`, '', 'out');
      return json({ ok: true, res: await reconcile() });
    }
    if (body.sync) return json({ ok: true, res: await reconcile(), status: await status() });
    return json({ ok: true, res: await status() });
  } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
});
