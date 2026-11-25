// COMPLETE CRM · veza EQUIVRA sajt (Lovable) -> CRM (samo e_ tabele; Harizma i Potkovice se ne diraju)
// Kao crm-shopify: jednom se poveže (admin nalog sajta), posle cron na 5 min sam povlači:
// registracije, prijave konja, poruke/prigovore, newsletter, ponude. Lozinka se NE čuva, samo refresh token sesije.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const HOOK = Deno.env.get('PUSH_HOOK_SECRET') || '';
const SITE = 'https://c--9c85cdd5-37fc-4e9f-9f72-5acceb7c4e67-prod.lovable.cloud';
const SITE_KEY = 'sb_publishable_r5dMciBhLGqN042uWpJkTQ_wK2wzxvI';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function priv(k: string) { const { data } = await db.from('e_private').select('v').eq('k', k).maybeSingle(); return data?.v || ''; }
async function privSet(k: string, v: string) { await db.from('e_private').upsert({ k, v, updated_at: new Date().toISOString() }, { onConflict: 'k' }); }
async function setting(k: string, v: string) { await db.from('e_settings').upsert({ key: k, value: v, updated_at: new Date().toISOString() }, { onConflict: 'key' }); }

async function authSite(body: Record<string, string>, grant: 'password' | 'refresh_token') {
  const r = await fetch(`${SITE}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: SITE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || j.error || `prijava na sajt nije uspela (${r.status})`);
  await privSet('site_refresh', j.refresh_token);
  return j.access_token as string;
}
async function siteToken() {
  const rt = await priv('site_refresh');
  if (!rt) throw new Error('sajt nije povezan');
  try { return await authSite({ refresh_token: rt }, 'refresh_token'); }
  catch (e) { await setting('site_status', 'veza istekla, povežite ponovo'); throw e; }
}
async function siteGet(tok: string, path: string) {
  const out: any[] = []; let off = 0;
  for (;;) {
    const r = await fetch(`${SITE}/rest/v1/${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${off}`, { headers: { apikey: SITE_KEY, Authorization: `Bearer ${tok}` } });
    if (!r.ok) throw new Error(`${path.split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const page = await r.json(); out.push(...page);
    if (page.length < 1000) break; off += 1000;
  }
  return out;
}

async function sync(full = false) {
  const tok = await siteToken();
  const since = full ? '1970-01-01T00:00:00Z' : new Date((Date.parse(await priv('site_sync_at')) || 0) - 60 * 60e3).toISOString();
  const gt = `created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`;
  const [profiles, subs, msgs, news, bids] = await Promise.all([
    siteGet(tok, `profiles?select=id,ime,telefon,email,grad,drzava,status,created_at&${gt}`),
    siteGet(tok, `horse_submissions?select=id,ime_vlasnika,telefon,email,ime_konja,zeljena_cena,created_at&${gt}`),
    siteGet(tok, `contact_messages?select=id,ime,email,telefon,tema,poruka,created_at&${gt}`),
    siteGet(tok, `newsletter_signups?select=id,email,created_at&${gt}`),
    siteGet(tok, `bids?select=id,horse_id,user_id,iznos,status,created_at&status=eq.vazeca&${gt}`),
  ]);
  // za ponude trebaju imena ponuđača i konja
  const uids = [...new Set(bids.map((b) => b.user_id))], hids = [...new Set(bids.map((b) => b.horse_id))];
  const people = uids.length ? await siteGet(tok, `profiles?select=id,ime,telefon,email&id=in.(${uids.join(',')})`) : [];
  const horses = hids.length ? await siteGet(tok, `horses?select=id,name,lot_number&id=in.(${hids.join(',')})`) : [];
  const P = Object.fromEntries(people.map((p) => [p.id, p])), Hs = Object.fromEntries(horses.map((h) => [h.id, h]));
  let n = 0, err = 0;
  const ing = async (ev: string, key: string, payload: Record<string, unknown>) => {
    const { error } = await db.rpc('e_ingest_core', { p_event: ev, p_payload: payload, p_ext_key: key });
    if (error) { err++; console.error(ev, key, error.message); } else n++;
  };
  for (const p of profiles) { if ((p.email || '').toLowerCase() === 'equivra@gmail.com') continue; await ing('registracija', 'reg:' + p.id, { name: p.ime, phone: p.telefon, email: p.email, city: p.grad, country: p.drzava, site_user_id: p.id, at: p.created_at }); }
  for (const s of subs) await ing('prijava_konja', 'sub:' + s.id, { name: s.ime_vlasnika, phone: s.telefon, email: s.email, horse: s.ime_konja, price: s.zeljena_cena, at: s.created_at });
  for (const m of msgs) await ing('kontakt', 'msg:' + m.id, { name: m.ime, phone: m.telefon, email: m.email, message: `[${m.tema}] ${m.poruka}`, at: m.created_at });
  for (const x of news) await ing('newsletter', 'nl:' + x.id, { email: x.email, email_optin: true, at: x.created_at });
  for (const b of bids) { const p = P[b.user_id]; if (!p) continue; const h = Hs[b.horse_id]; await ing('ponuda', 'bid:' + b.id, { name: p.ime, phone: p.telefon, email: p.email, horse: h ? `Lot ${h.lot_number} ${h.name}` : '', amount: b.iznos, at: b.created_at }); }
  const now = new Date().toISOString();
  await privSet('site_sync_at', now);
  await setting('site_last_sync', now);
  await setting('site_status', err ? `povezano, ${err} grešaka u poslednjoj sinhronizaciji` : 'povezano');
  return { checked: profiles.length + subs.length + msgs.length + news.length + bids.length, processed: n, errors: err };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body: any = {}; try { body = await req.json(); } catch (_) { body = {}; }
  // 1) cron iz baze
  if (HOOK && req.headers.get('x-crm-hook') === HOOK) {
    if (!(await priv('site_refresh'))) return json({ ok: true, skip: 'nije povezano' });
    try { return json({ ok: true, res: await sync(false) }); } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
  }
  // 2) CRM (prijavljen član tima)
  const { data: u } = await db.auth.getUser((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
  if (!u?.user) return json({ ok: false, error: 'niste prijavljeni' }, 401);
  const who = (u.user.email || '').split('@')[0];
  try {
    if (body.connect) {
      const email = String(body.email || '').trim(), password = String(body.password || '');
      if (!email || !password) return json({ ok: false, error: 'Upišite e-mail i lozinku sa sajta.' }, 400);
      await authSite({ email, password }, 'password'); // lozinka se ne čuva, samo refresh token
      await setting('site_account', email);
      await setting('site_connected_by', who);
      await setting('site_status', 'povezano');
      return json({ ok: true, res: await sync(true) });
    }
    if (body.disconnect) { await db.from('e_private').delete().in('k', ['site_refresh', 'site_sync_at']); await setting('site_status', 'nije povezano'); return json({ ok: true }); }
    if (body.sync) return json({ ok: true, res: await sync(!!body.full) });
    return json({ ok: true, connected: !!(await priv('site_refresh')) });
  } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 400); }
});
