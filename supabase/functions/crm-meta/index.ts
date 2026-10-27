// COMPLETE CRM · Meta reklame -> CRM (h_ad_spend), samo HARIZMA ad account
// Povlači potrošnju, kupovine i prihod po kampanji i danu, preračunava u RSD po srednjem kursu NBS i upisuje u h_ad_spend.
// Poziva ga cron (x-crm-hook) svakog sata, ili prijavljen član tima iz CRM-a ({ sync: true, days }).
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const TOKEN = Deno.env.get('META_TOKEN') || '';
const RAW = (Deno.env.get('META_AD_ACCOUNT_ID') || '').trim();
const ACC = RAW ? (RAW.startsWith('act_') ? RAW : `act_${RAW}`) : '';
const HOOK = Deno.env.get('PUSH_HOOK_SECRET') || '';
const GRAPH = 'https://graph.facebook.com/v23.0';
const TEAM = ['konstantin', 'stasa', 'marjan'];
const PURCHASE = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const r2 = (v: number) => Math.round(v * 100) / 100;

async function priv(k: string) { const { data } = await db.from('h_private').select('v').eq('k', k).maybeSingle(); return data?.v || ''; }
async function privSet(k: string, v: string) { await db.from('h_private').upsert({ k, v }, { onConflict: 'k' }); }

async function graph(path: string, params: Record<string, string> = {}) {
  const u = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', TOKEN);
  const res = await fetch(u);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) {
    const e = d.error || {};
    const msg = /API access blocked/i.test(e.message || '') ? 'Meta je blokirala pristup aplikaciji (developer nalog treba potvrditi na developers.facebook.com)' : (e.message || res.statusText);
    throw new Error(`Meta: ${msg}${e.code ? ` (kod ${e.code})` : ''}`);
  }
  return d;
}
const pick = (list: any[] | undefined, types: string[]) => { if (!list) return 0; for (const t of types) { const f = list.find((x) => x.action_type === t); if (f) return Number(f.value) || 0; } return 0; };

// srednji kurs NBS za 1 jedinicu valute naloga (USD) u dinarima; rezerva: drugi izvor, pa poslednji poznat kurs
async function rateToRsd(cur: string): Promise<number> {
  if (cur === 'RSD') return 1;
  const c = cur.toLowerCase();
  try {
    const r = await fetch(`https://kurs.resenje.org/api/v1/currencies/${c}/rates/today`);
    if (r.ok) { const d = await r.json(); const v = Number(d.exchange_middle) / (Number(d.parity) || 1); if (v > 0) { await privSet(`meta_rate_${c}`, String(v)); return v; } }
  } catch (_) { /* probaj sledeći izvor */ }
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${cur}`);
    if (r.ok) { const d = await r.json(); const v = Number(d?.rates?.RSD); if (v > 0) { await privSet(`meta_rate_${c}`, String(v)); return v; } }
  } catch (_) { /* poslednji poznat kurs */ }
  const last = Number(await priv(`meta_rate_${c}`));
  if (last > 0) return last;
  throw new Error(`nema kursa za ${cur}`);
}

function ymd(d: Date) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }

async function sync(days = 3) {
  if (!TOKEN || !ACC) throw new Error('nema META_TOKEN ili META_AD_ACCOUNT_ID');
  const acc = await graph(ACC, { fields: 'currency,name' });
  const cur = String(acc.currency || 'USD').toUpperCase();
  const rate = await rateToRsd(cur);
  const until = ymd(new Date()), since = ymd(new Date(Date.now() - Math.max(0, days - 1) * 864e5));
  const rows: any[] = [];
  let after = '';
  do {
    const d = await graph(`${ACC}/insights`, {
      level: 'campaign', time_increment: '1', time_range: JSON.stringify({ since, until }),
      fields: 'campaign_name,campaign_id,spend,actions,action_values', limit: '500', ...(after ? { after } : {}),
    });
    rows.push(...(d.data || []));
    after = d.paging?.next ? d.paging?.cursors?.after || '' : '';
  } while (after);
  const want = rows.filter((x) => Number(x.spend) > 0 || pick(x.actions, PURCHASE) > 0).map((x) => ({
    day: x.date_start, campaign: String(x.campaign_name || x.campaign_id || 'kampanja').slice(0, 120),
    spend: r2(Number(x.spend || 0) * rate), purchases: Math.round(pick(x.actions, PURCHASE)), revenue: r2(pick(x.action_values, PURCHASE) * rate),
  }));
  // upisuje se samo ono što se promenilo (da istorija izmena ne raste svakog sata)
  const { data: have } = await db.from('h_ad_spend').select('id, day, campaign, spend, purchases, revenue, deleted_at').gte('day', since).lte('day', until);
  let wrote = 0;
  for (const w of want) {
    const h = (have || []).find((x: any) => x.day === w.day && x.campaign === w.campaign);
    if (h && !h.deleted_at && Number(h.spend) === w.spend && Number(h.purchases ?? 0) === w.purchases && Number(h.revenue ?? 0) === w.revenue) continue;
    const { error } = await db.from('h_ad_spend').upsert({ ...w, deleted_at: null }, { onConflict: 'day,campaign' });
    if (error) throw new Error(error.message);
    wrote++;
  }
  const total = want.reduce((a, w) => a + w.spend, 0);
  await privSet('meta_synced_at', new Date().toISOString());
  await privSet('meta_last_error', '');
  return { account: acc.name, currency: cur, rate: r2(rate), since, until, campaigns_days: want.length, wrote, spend_rsd: r2(total) };
}

async function status() {
  return { synced_at: await priv('meta_synced_at'), error: await priv('meta_last_error'), rate_usd: await priv('meta_rate_usd') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body: any = {}; try { body = await req.json(); } catch (_) { body = {}; }
  const days = Math.min(90, Math.max(1, parseInt(body.days) || 3));
  const run = async () => {
    try { return json({ ok: true, res: await sync(days) }); }
    catch (e) { const m = String((e as Error)?.message || e); await privSet('meta_last_error', `${new Date().toISOString()} ${m}`); return json({ ok: false, error: m }, 500); }
  };
  if (HOOK && req.headers.get('x-crm-hook') === HOOK) return body.status ? json({ ok: true, res: await status() }) : run();
  const { data: u } = await db.auth.getUser((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
  const user = u?.user?.email ? u.user.email.split('@')[0] : '';
  if (!TEAM.includes(user)) return json({ ok: false, error: 'niste prijavljeni' }, 401);
  if (body.sync) return run();
  return json({ ok: true, res: await status() });
});
