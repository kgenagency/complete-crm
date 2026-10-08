// COMPLETE CRM · obaveštenja na telefon i računar (Web Push)
// Poziva je baza (okidač na h_audit i jutarnji cron) sa tajnim zaglavljem x-crm-hook,
// a CRM (prijavljen korisnik) za probno obaveštenje.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:kgenagency@gmail.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
const HOOK = Deno.env.get('PUSH_HOOK_SECRET') || '';

const PEOPLE: Record<string, { name: string; f: boolean }> = { konstantin: { name: 'Konstantin', f: false }, stasa: { name: 'Staša', f: true }, marjan: { name: 'Marjan', f: false } };
const USERS = Object.keys(PEOPLE);
const SEC: Record<string, string> = { h_notes: 'Beleške', h_posts: 'Objave + reklame', h_site_ideas: 'Sajt', h_packaging: 'Pakovanje', h_returns: 'Povrati', h_promotions: 'Promocije', h_orders: 'Porudžbine', h_customers: 'Kupci', h_products: 'Garderoba', h_story_sections: 'Brand story' };
const cut = (s: unknown, n: number) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const NAME: Record<string, (r: any) => string> = {
  h_notes: r => cut(r.body, 120), h_posts: r => r.title, h_site_ideas: r => r.title, h_packaging: r => r.name, h_returns: r => `${r.case_no || ''} · ${r.customer_name || ''}`,
  h_promotions: r => r.name, h_orders: r => `${r.order_no || ''} · ${r.customer_name || ''}`, h_customers: r => r.name, h_products: r => r.name, h_story_sections: r => r.title || 'Poglavlje priče',
};
const REF: Record<string, string> = { h_orders: 'order', h_returns: 'ret', h_posts: 'post', h_promotions: 'promo', h_products: 'product', h_customers: 'cust', h_packaging: 'pack', h_site_ideas: 'idea' };
const pname = (k: string) => PEOPLE[k]?.name || k;
const vb = (k: string, m: string, f: string) => (PEOPLE[k]?.f ? f : m);
const rsd = (n: number) => new Intl.NumberFormat('sr-Latn-RS').format(Math.round(n)) + ' RSD';
const fmtDay = (d: string) => new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Belgrade' });
const pl = (n: number, a: string, b: string, c: string) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

type Msg = { title: string; body: string; tag?: string; go?: string; kind?: string };
async function pushTo(users: string[], kind: string, msg: Msg) {
  users = [...new Set(users)].filter(u => PEOPLE[u]); if (!users.length) return { sent: 0, subs: 0 };
  const { data: subs } = await db.from('h_push_subs').select('*').in('username', users);
  let sent = 0; const errs: string[] = [];
  await Promise.all((subs || []).filter((s: any) => kind === 'test' || s.prefs?.[kind] !== false).map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...msg, ts: Date.now() }), { TTL: 60 * 60 * 24, urgency: 'high' });
      sent++; await db.from('h_push_subs').update({ last_ok_at: new Date().toISOString(), fails: 0 }).eq('id', s.id);
    } catch (e: any) {
      const code = e?.statusCode; errs.push(String(code || e?.message || e));
      if (code === 404 || code === 410) await db.from('h_push_subs').delete().eq('id', s.id);
      else await db.from('h_push_subs').update({ fails: (s.fails || 0) + 1 }).eq('id', s.id);
    }
  }));
  return { sent, subs: (subs || []).length, errs };
}

async function onAudit(a: any) {
  const r = a.new_row || {}, actor = a.actor || '', tbl = a.tbl, out: unknown[] = [];
  // 1) zadatak dodeljen ili završen
  if (SEC[tbl] && Array.isArray(r.assignees)) {
    const before: string[] = a.op === 'INSERT' ? [] : (a.changed?.assignees ? (a.changed.assignees.od || []) : r.assignees);
    const added = r.assignees.filter((k: string) => !(before || []).includes(k) && k !== actor);
    const what = r.task_note && tbl !== 'h_notes' ? cut(r.task_note, 140) : cut(NAME[tbl]?.(r), 140);
    const ref = r.task_note && tbl !== 'h_notes' ? cut(NAME[tbl]?.(r), 60) : '';
    if (added.length && !r.task_done_at && PEOPLE[actor])
      out.push(await pushTo(added, 'tasks', { title: `${pname(actor)} ti je ${vb(actor, 'dodelio', 'dodelila')} zadatak`, body: [what, ref && `(${ref})`, r.task_due && `· rok ${fmtDay(r.task_due)}`, `· ${SEC[tbl]}`].filter(Boolean).join(' '), tag: `task-${tbl}-${r.id}`, go: 'tab:tasks' }));
    const ch = a.changed?.task_done_at;
    if (a.op === 'UPDATE' && ch && !ch.od && ch.na && r.task_by && r.task_by !== actor && PEOPLE[actor])
      out.push(await pushTo([r.task_by], 'done', { title: `${pname(actor)} je ${vb(actor, 'završio', 'završila')} zadatak ✓`, body: [what, ref && `(${ref})`, `· ${SEC[tbl]}`].filter(Boolean).join(' '), tag: `done-${tbl}-${r.id}`, go: 'tab:tasks' }));
  }
  // 2) nova porudžbina
  if (tbl === 'h_orders' && a.op === 'INSERT') {
    await new Promise(res => setTimeout(res, 2500)); // stavke se upisuju odmah posle porudžbine
    const { data: its } = await db.from('h_order_items').select('qty, unit_price').eq('order_id', r.id).is('deleted_at', null);
    const sum = (its || []).reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.unit_price || 0), 0) - Number(r.discount || 0) + Number(r.shipping_price || 0);
    const src = { meta: 'Meta Ads', tiktok: 'TikTok Ads', google: 'Google Ads' }[r.source as string];
    const who = PEOPLE[actor] ? ` · uneo/la ${pname(actor)}` : '';
    out.push(await pushTo(USERS.filter(u => u !== actor), 'orders', { title: `🛍 Nova porudžbina ${r.order_no || ''}`.trim(), body: [r.customer_name, r.city, (its || []).length ? rsd(sum) : '', src].filter(Boolean).join(' · ') + who, tag: `order-${r.id}`, go: `ref:order:${r.id}` }));
  }
  // 3) nova prijava (povrat, zamena, reklamacija) sa forme ili ručno
  if (tbl === 'h_returns' && a.op === 'INSERT') {
    const RT: Record<string, string> = { return: 'Povrat', exchange: 'Zamena', complaint: 'Reklamacija', feedback: 'Utisak' };
    out.push(await pushTo(USERS.filter(u => u !== actor), 'returns', { title: `↩ ${r.source === 'form' ? 'Nova prijava sa forme' : 'Nova prijava'}: ${RT[r.type] || 'Povrat'}`, body: [r.case_no, r.customer_name, r.item, cut(r.reason, 60)].filter(Boolean).join(' · '), tag: `ret-${r.id}`, go: `ref:ret:${r.id}` }));
  }
  return out;
}

// tim chat: obaveštenje samo onome ko je označen (@ime ili @svi)
async function onChat(m: any) {
  const members: string[] = m.channel === 'tim' ? USERS : String(m.channel || '').split(':').slice(1);
  const ment: string[] = Array.isArray(m.mentions) ? m.mentions : [];
  const to = (ment.includes('svi') ? members : ment.filter((u) => members.includes(u))).filter((u) => u !== m.author);
  if (!to.length || !PEOPLE[m.author]) return { sent: 0 };
  const dm = m.channel !== 'tim';
  return await pushTo(to, 'chat', {
    title: dm ? `💬 ${pname(m.author)} ti piše` : `💬 ${pname(m.author)} te ${vb(m.author, 'pominje', 'pominje')} u Tim chatu`,
    body: m.body ? cut(m.body, 180) : (m.image_url && /\.gif(\?|$)/i.test(m.image_url) ? 'GIF' : '📷 Slika'),
    tag: `chat-${m.channel}`, go: `chat:${m.channel}`, kind: 'chat',
  });
}

// jutarnji podsetnik: šta ističe danas i šta kasni
const FINAL: Record<string, (r: any) => boolean> = {
  h_posts: r => r.status === 'published', h_site_ideas: r => ['done', 'rejected'].includes(r.status), h_returns: r => ['resolved', 'rejected'].includes(r.status),
  h_orders: r => ['delivered', 'cancelled', 'returned'].includes(r.status), h_notes: r => !!r.done,
};
async function daily(force: boolean) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (!force && hour !== 8) return { skipped: hour };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(now);
  const cnt: Record<string, { open: number; today: number; late: number; first: string }> = {};
  USERS.forEach(u => cnt[u] = { open: 0, today: 0, late: 0, first: '' });
  for (const tbl of Object.keys(SEC)) {
    const { data } = await db.from(tbl).select('*').is('deleted_at', null).is('task_done_at', null).not('assignees', 'is', null);
    (data || []).forEach((r: any) => {
      if (!Array.isArray(r.assignees) || !r.assignees.length || FINAL[tbl]?.(r)) return;
      const due = r.task_due ? String(r.task_due).slice(0, 10) : '';
      r.assignees.forEach((u: string) => { const c = cnt[u]; if (!c) return; c.open++; if (due && due === today) { c.today++; if (!c.first) c.first = r.task_note || NAME[tbl]?.(r) || ''; } else if (due && due < today) c.late++; });
    });
  }
  const res: Record<string, unknown> = {};
  for (const u of USERS) {
    const c = cnt[u]; if (!c.today && !c.late) continue;
    const parts = [c.today && `Danas ti ističe ${c.today} ${pl(c.today, 'zadatak', 'zadatka', 'zadataka')}`, c.late && `${c.late} ${pl(c.late, 'kasni', 'kasne', 'kasni')}`].filter(Boolean).join(', ');
    res[u] = await pushTo([u], 'daily', { title: `Dobro jutro, ${PEOPLE[u].name} ☀️`, body: `${parts}. Otvorenih ukupno: ${c.open}.${c.first ? ` Prvo: ${cut(c.first, 60)}` : ''}`, tag: `daily-${today}`, go: 'tab:tasks' });
  }
  return { today, cnt, res };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body: any = {}; try { body = await req.json(); } catch (_) { /* prazno */ }
  // poziv iz baze
  if (HOOK && req.headers.get('x-crm-hook') === HOOK) {
    try {
      if (body.audit) return json({ ok: true, res: await onAudit(body.audit) });
      if (body.chat) return json({ ok: true, res: await onChat(body.chat) });
      if (Array.isArray(body.test_users)) return json({ ok: true, res: await pushTo(body.test_users, 'test', { title: body.title || 'Obaveštenja rade ✓', body: body.text || 'Ovako će stizati zadaci, porudžbine, povrati i poruke iz HARIZMA CRM-a.', tag: 'test', go: body.go || 'tab:overview' }) });
      if (body.daily) return json({ ok: true, res: await daily(!!body.force) });
      if (body.selftest) { // provera da li šifrovanje i potpis rade u ovom okruženju (šalje na zadatu adresu)
        if (body.selftest.send) { try { const x = await webpush.sendNotification(body.selftest.sub, '{"title":"x"}', { TTL: 60 }); return json({ ok: true, sent: x.statusCode }); } catch (e: any) { return json({ ok: false, code: e?.statusCode, err: String(e?.message || e) }); } }
        const r = await webpush.generateRequestDetails(body.selftest.sub, JSON.stringify({ title: 'x', body: 'y' }), { TTL: 60 });
        return json({ ok: true, endpoint: r.endpoint, headers: r.headers, bodyLen: r.body?.length || 0, body: btoa(String.fromCharCode(...new Uint8Array(r.body))) });
      }
    } catch (e) { return json({ ok: false, error: String((e as Error)?.message || e) }, 500); }
    return json({ ok: false, error: 'nepoznato' }, 400);
  }
  // poziv iz CRM-a: proba za prijavljenog korisnika
  const auth = req.headers.get('Authorization') || '';
  const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  const user = u?.user?.email ? u.user.email.split('@')[0] : '';
  if (!PEOPLE[user]) return json({ ok: false, error: 'niste prijavljeni' }, 401);
  if (body.test) {
    const r = await pushTo([user], 'test', { title: `Obaveštenja rade ✓`, body: `${PEOPLE[user].name}, ovako će ti stizati zadaci, porudžbine i povrati iz HARIZMA CRM-a.`, tag: 'test', go: 'tab:tasks' });
    return json({ ok: true, ...r });
  }
  return json({ ok: true, user });
});
