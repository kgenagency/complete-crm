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
const BG = 'Europe/Belgrade';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: BG }).format(d);
const hm = (iso: string) => new Intl.DateTimeFormat('sr-Latn-RS', { hour: '2-digit', minute: '2-digit', timeZone: BG }).format(new Date(iso));
const dayLbl = (iso: string) => { const d = ymd(new Date(iso)); return d === ymd(new Date()) ? 'danas' : d === ymd(new Date(Date.now() + 864e5)) ? 'sutra' : fmtDay(d); };
const dur = (ms: number) => { const m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return h < 24 ? (r && h < 5 ? `${h} h ${r} min` : `${h} h`) : `${Math.round(h / 24)} d`; };
const pl = (n: number, a: string, b: string, c: string) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

type Msg = { title: string; body: string; tag?: string; go?: string; kind?: string; ttl?: number; [k: string]: any };
async function pushTo(users: string[], kind: string, msg: Msg) {
  users = [...new Set(users)].filter(u => PEOPLE[u]); if (!users.length) return { sent: 0, subs: 0 };
  const { data: subs } = await db.from('h_push_subs').select('*').in('username', users);
  let sent = 0; const errs: string[] = [];
  await Promise.all((subs || []).filter((s: any) => kind === 'test' || s.prefs?.[kind] !== false).map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...msg, ttl: undefined, ts: Date.now() }), { TTL: msg.ttl || 60 * 60 * 24, urgency: 'high' });
      sent++; await db.from('h_push_subs').update({ last_ok_at: new Date().toISOString(), fails: 0 }).eq('id', s.id);
    } catch (e: any) {
      const code = e?.statusCode; errs.push(String(code || e?.message || e));
      if (code === 404 || code === 410) await db.from('h_push_subs').delete().eq('id', s.id);
      else await db.from('h_push_subs').update({ fails: (s.fails || 0) + 1 }).eq('id', s.id);
    }
  }));
  return { sent, subs: (subs || []).length, errs };
}

// @oznaka u bilo kom polju (ideja, skripta, zadatak, beleška, porudžbina…)
const MENT_RE = /(^|[^\p{L}\p{N}_.@])@(konstantin|stasa|staša|marjan|svi|sve|all)(?![\p{L}\p{N}_])/giu;
const mkey = (s: string) => { const k = s.toLowerCase().replace(/š/g, 's'); return k === 'sve' || k === 'all' ? 'svi' : k; };
function mentionsOf(r: any) { const out = new Set<string>(); for (const v of Object.values(r || {})) if (typeof v === 'string' && v.includes('@')) for (const m of v.matchAll(MENT_RE)) out.add(mkey(m[2])); return out; }
function mentSnip(r: any, keys: string[]) {
  for (const v of Object.values(r || {})) {
    if (typeof v !== 'string' || !v.includes('@')) continue;
    for (const m of v.matchAll(MENT_RE)) { if (!keys.includes(mkey(m[2]))) continue; const i = (m.index || 0) + m[1].length, a = Math.max(0, i - 90), b = Math.min(v.length, i + 90); return (a ? '…' : '') + v.slice(a, b).replace(/\s+/g, ' ').trim() + (b < v.length ? '…' : ''); }
  }
  return '';
}
const MSEC: Record<string, string> = { ...SEC, h_activities: 'Komentar', h_milestones: 'Istorija', h_discount_codes: 'Kodovi', h_ad_spend: 'Reklame' };
const LBL: Record<string, (r: any) => string> = { ...NAME, h_milestones: r => r.title, h_discount_codes: r => r.code, h_ad_spend: r => `potrošnja ${r.day || ''}`, h_activities: () => '' };

async function onAudit(a: any) {
  const r = a.new_row || {}, actor = a.actor || '', tbl = a.tbl, out: unknown[] = [], notified = new Set<string>();
  // 1) zadatak dodeljen ili završen
  if (SEC[tbl] && Array.isArray(r.assignees)) {
    const before: string[] = a.op === 'INSERT' ? [] : (a.changed?.assignees ? (a.changed.assignees.od || []) : r.assignees);
    const added = r.assignees.filter((k: string) => !(before || []).includes(k) && k !== actor);
    const what = r.task_note && tbl !== 'h_notes' ? cut(r.task_note, 140) : cut(NAME[tbl]?.(r), 140);
    const ref = r.task_note && tbl !== 'h_notes' ? cut(NAME[tbl]?.(r), 60) : '';
    const pch = a.changed?.task_prio;
    const urgentNow = r.task_prio === 'urgent' && !r.task_done_at && r.assignees.length > 0 && PEOPLE[actor] && (a.op === 'INSERT' || (pch && pch.na === 'urgent') || added.length > 0);
    if (urgentNow) {
      const as = r.assignees.filter((u: string) => PEOPLE[u]).map(pname).join(', ');
      const due = r.task_due_at ? `· rok ${dayLbl(r.task_due_at)} u ${hm(r.task_due_at)}` : r.task_due ? `· rok ${fmtDay(r.task_due)}` : '';
      USERS.forEach(u => notified.add(u));
      out.push(await pushTo(USERS.filter(u => u !== actor), 'deadline', { title: `🚨 HITNO · ${pname(actor)} ${vb(actor, 'označio', 'označila')} zadatak kao hitan`, body: [what, ref && `(${ref})`, due, `· zaduženi: ${as}`].filter(Boolean).join(' '), tag: `dl-${tbl}-${r.id}`, go: `chat:task:${tbl}:${r.id}`, kind: 'urgent', task: `${tbl}:${r.id}`, akey: `${tbl}:${r.id}:new:${a.id || Date.now()}` }));
    }
    if (added.length && !r.task_done_at && PEOPLE[actor] && !urgentNow) added.forEach((u: string) => notified.add(u));
    if (added.length && !r.task_done_at && PEOPLE[actor] && !urgentNow)
      out.push(await pushTo(added, 'tasks', { title: `${pname(actor)} ti je ${vb(actor, 'dodelio', 'dodelila')} zadatak`, body: [what, ref && `(${ref})`, r.task_due && `· rok ${fmtDay(r.task_due)}`, `· ${SEC[tbl]}`].filter(Boolean).join(' '), tag: `task-${tbl}-${r.id}`, go: 'tab:tasks' }));
    const ch = a.changed?.task_done_at;
    if (a.op === 'UPDATE' && ch && !ch.od && ch.na && r.task_by && r.task_by !== actor && PEOPLE[actor])
      out.push(await pushTo([r.task_by], 'done', { title: `${pname(actor)} je ${vb(actor, 'završio', 'završila')} zadatak ✓`, body: [what, ref && `(${ref})`, `· ${SEC[tbl]}`].filter(Boolean).join(' '), tag: `done-${tbl}-${r.id}`, go: 'tab:tasks' }));
  }
  // 1b) neko je označen (@ime ili @svi) u nekom polju: samo novo dodate oznake, ne i one koje su već bile
  if (String(tbl || '').startsWith('h_') && PEOPLE[actor] && !r.deleted_at) {
    const nw = mentionsOf(r);
    if (nw.size) {
      const old = a.op === 'INSERT' ? {} : (a.old_row || { ...r, ...Object.fromEntries(Object.entries(a.changed || {}).map(([k, v]: [string, any]) => [k, v?.od])) });
      const od = mentionsOf(old), addM = [...nw].filter(k => !od.has(k));
      const to = (addM.includes('svi') ? USERS : addM.filter(k => PEOPLE[k])).filter(u => u !== actor && !notified.has(u));
      if (to.length) {
        let lbl = ''; try { lbl = cut(LBL[tbl]?.(r) || '', 70); } catch (_) { /* bez naziva */ }
        const snip = mentSnip(r, [...to, 'svi']);
        out.push(await pushTo(to, 'mentions', {
          title: `@ ${pname(actor)} te ${vb(actor, 'označio', 'označila')} · ${MSEC[tbl] || 'CRM'}`,
          body: [tbl !== 'h_notes' && lbl ? `${lbl}:` : '', snip ? `„${snip}“` : ''].filter(Boolean).join(' ') || 'Otvori da vidiš',
          tag: `ment-${tbl}-${r.id}`, go: `item:${tbl}:${r.id}`, kind: 'mention',
        }));
      }
    }
  }
  // 2) nova porudžbina
  if (tbl === 'h_orders' && a.op === 'INSERT') {
    await new Promise(res => setTimeout(res, 2500)); // stavke se upisuju odmah posle porudžbine
    const { data: its } = await db.from('h_order_items').select('qty, unit_price').eq('order_id', r.id).is('deleted_at', null);
    const sum = (its || []).reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.unit_price || 0), 0) - Number(r.discount || 0) + Number(r.shipping_price || 0);
    const src = { meta: 'Meta Ads', tiktok: 'TikTok Ads', google: 'Google Ads' }[r.source as string];
    const who = PEOPLE[actor] ? ` · uneo/la ${pname(actor)}` : actor === 'shopify' ? ' · sa sajta' : '';
    out.push(await pushTo(USERS.filter(u => u !== actor), 'orders', { title: `🛍 Nova porudžbina ${r.order_no || ''}`.trim(), body: [r.customer_name, r.city, (its || []).length ? rsd(sum) : '', src].filter(Boolean).join(' · ') + who, tag: `order-${r.id}`, go: `ref:order:${r.id}` }));
  }
  // 3) nova prijava (povrat, zamena, reklamacija) sa forme ili ručno
  if (tbl === 'h_returns' && a.op === 'INSERT') {
    const RT: Record<string, string> = { return: 'Povrat', exchange: 'Zamena', complaint: 'Reklamacija', feedback: 'Utisak' };
    out.push(await pushTo(USERS.filter(u => u !== actor), 'returns', { title: `↩ ${r.source === 'form' ? 'Nova prijava sa forme' : 'Nova prijava'}: ${RT[r.type] || 'Povrat'}`, body: [r.case_no, r.customer_name, r.item, cut(r.reason, 60)].filter(Boolean).join(' · '), tag: `ret-${r.id}`, go: `ref:ret:${r.id}` }));
  }
  return out;
}

// tim chat: obaveštenje samo onome ko je označen (@ime ili @svi); huddle poziv svima u razgovoru;
// komentar na zadatku: označenima + onima koji prate zadatak (zaduženi, ko je dodelio, ko je već komentarisao)
const snip = (m: any) => m.body ? (m.audio_url ? '🎤 ' : '') + cut(m.body, 180) : m.audio_url ? `🎤 Glasovna poruka${m.audio_sec ? ' · ' + Math.max(1, Math.round(m.audio_sec)) + ' s' : ''}` : (m.image_url && /\.gif(\?|$)|giphy/i.test(m.image_url) ? 'GIF' : '📷 Slika');
async function onChat(m: any) {
  if (!PEOPLE[m.author] || m.deleted_at) return { sent: 0 };
  const ment: string[] = Array.isArray(m.mentions) ? m.mentions : [];
  const ch = String(m.channel || '');
  if (ch.startsWith('task:')) {
    const [, tbl, id] = ch.split(':');
    if (!NAME[tbl]) return { sent: 0 };
    const { data: row } = await db.from(tbl).select('*').eq('id', id).maybeSingle();
    const { data: prev } = await db.from('h_chat_messages').select('author').eq('channel', ch).neq('id', m.id).limit(500);
    const label = row ? cut(row.task_note && tbl !== 'h_notes' ? row.task_note : NAME[tbl](row), 70) : 'zadatak';
    const watch = new Set<string>([...(Array.isArray(row?.assignees) ? row.assignees : []), row?.task_by, ...(prev || []).map((r: any) => r.author)].filter((u) => u && PEOPLE[u]));
    const mentioned = (ment.includes('svi') ? USERS : ment.filter((u) => PEOPLE[u])).filter((u) => u !== m.author);
    const watchers = [...watch].filter((u) => u !== m.author && !mentioned.includes(u));
    const msg = (t: string) => ({ title: t, body: snip(m), tag: `chat-${ch}`, go: `chat:${ch}`, kind: 'chat' });
    const out: any[] = [];
    if (mentioned.length) out.push(await pushTo(mentioned, 'chat', msg(`💬 ${pname(m.author)} te ${vb(m.author, 'pominje', 'pominje')} · ${label}`)));
    if (watchers.length) out.push(await pushTo(watchers, 'comments', msg(`💬 ${pname(m.author)} · ${label}`)));
    return { out };
  }
  const members: string[] = ch === 'tim' ? USERS : ch.split(':').slice(1);
  if (!members.includes(m.author)) return { sent: 0 };
  const dm = ch !== 'tim';
  if (m.kind === 'huddle') {
    const to = members.filter((u) => u !== m.author);
    return await pushTo(to, 'calls', {
      title: dm ? `📞 ${pname(m.author)} te zove` : `📞 ${pname(m.author)} je ${vb(m.author, 'pokrenuo', 'pokrenula')} huddle`,
      body: dm ? 'Huddle poziv u CRM-u · dodirni da se javiš' : 'Tim HARIZMA · dodirni da se pridružiš',
      tag: `huddle-${ch}`, go: `huddle:${ch}`, kind: 'call', ttl: 90,
    });
  }
  const to = (ment.includes('svi') ? members : ment.filter((u) => members.includes(u))).filter((u) => u !== m.author);
  if (!to.length) return { sent: 0 };
  return await pushTo(to, 'chat', {
    title: dm ? `💬 ${pname(m.author)} ti piše` : `💬 ${pname(m.author)} te ${vb(m.author, 'pominje', 'pominje')} u Tim chatu`,
    body: snip(m), tag: `chat-${ch}`, go: `chat:${ch}`, kind: 'chat',
  });
}

// podsetnik za rok (zove ga baza svakog minuta preko h_task_alerts_run): celom timu
async function onAlert(al: any) {
  const tbl = String(al?.tbl || ''), id = String(al?.id || ''), kind = String(al?.kind || '');
  if (!NAME[tbl] || !id) return { sent: 0 };
  const { data: r } = await db.from(tbl).select('*').eq('id', id).maybeSingle();
  if (!r || r.deleted_at || r.task_done_at || !r.task_due_at) return { sent: 0, skip: true };
  const what = r.task_note && tbl !== 'h_notes' ? cut(r.task_note, 120) : cut(NAME[tbl](r), 120);
  const as = (r.assignees || []).filter((u: string) => PEOPLE[u]).map(pname).join(', ');
  const due = new Date(r.task_due_at), ms = due.getTime() - Date.now(), urgent = r.task_prio === 'urgent', t = hm(r.task_due_at);
  let title = '';
  if (kind === 'h1') title = `⏰ Rok za ${dur(ms)} (${t})${urgent ? ' · HITNO' : ''}`;
  else if (kind === 'm15') title = `🚨 HITNO · još ${dur(ms)} do roka (${t})`;
  else if (kind === 'due') title = `🚨 HITNO · rok je istekao (${t})`;
  else if (kind.startsWith('late')) title = `🚨 HITNO · kasni ${dur(-ms)}, nije završeno`;
  else return { sent: 0 };
  return await pushTo(USERS, 'deadline', {
    title, body: `${what}${as ? ' · ' + as : ''} · ${SEC[tbl]}`, tag: `dl-${tbl}-${id}`, go: `chat:task:${tbl}:${id}`,
    kind: urgent || kind !== 'h1' ? 'urgent' : 'deadline', task: `${tbl}:${id}`, akey: `${tbl}:${id}:${kind}:${due.toISOString()}`, ttl: 3600,
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
      if (body.alert) return json({ ok: true, res: await onAlert(body.alert) });
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
