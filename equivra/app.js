/* ================= COMPLETE CRM · EQUIVRA ================= */
'use strict';
const AUTH_DOMAIN = 'complete-crm.local';
const sb = window.supabase.createClient(window.CRM_SUPABASE_URL, window.CRM_SUPABASE_ANON_KEY);
const site = window.supabase.createClient(window.SITE_SUPABASE_URL, window.SITE_SUPABASE_KEY, {
  auth: { storageKey: 'equivra-site-public', persistSession: false, autoRefreshToken: false },
});
const SITE_URL = window.SITE_URL || '';

/* ---------- rečnici ---------- */
const KIND = { kupac: 'Kupac', prodavac: 'Prodavac', kupac_prodavac: 'Kupac i prodavac', odgajivac: 'Odgajivač', veterinar: 'Veterinar', prevoznik: 'Prevoznik', potkivac: 'Potkivač', trener: 'Trener', ostalo: 'Ostalo' };
const SRC = { sajt_registracija: 'Sajt: registracija', sajt_prijava_konja: 'Sajt: prijava konja', sajt_kontakt: 'Sajt: kontakt forma', newsletter: 'Newsletter', rucno: 'Ručno', instagram: 'Instagram', facebook: 'Facebook', sajam_trka: 'Sajam / trka', preporuka: 'Preporuka', telefon: 'Telefon', uvoz: 'Uvoz CSV' };
const RATING = { vruc: 'Vruć', topao: 'Topao', hladan: 'Hladan' };
const DISC = { galop: 'Galop', kas: 'Kas', preponsko: 'Preponsko', dresura: 'Dresura', rekreacija: 'Rekreacija', priplod: 'Priplod' };
const SEX = { pastuv: 'Pastuv', kobila: 'Kobila', kastrat: 'Kastrat' };
const HSTAT = { upit: 'Upit', priprema: 'U pripremi', na_aukciji: 'Na aukciji', prodat: 'Prodat', nije_prodat: 'Nije prodat', povucen: 'Povučen' };
const ACT = { beleska: 'Beleška', poziv: 'Poziv', poruka: 'Poruka', sastanak: 'Sastanak', poseta: 'Poseta konju', ponuda: 'Ponuda poslata', email: 'E-mail', viber: 'Viber', whatsapp: 'WhatsApp', sajt: 'Sa sajta', faza: 'Promena faze', sistem: 'Sistem' };
const EVK = { aukcija: 'Aukcija', pregled_konja: 'Pregled konja', veterinar: 'Veterinar', fotografisanje: 'Fotografisanje', sastanak: 'Sastanak', preuzimanje: 'Preuzimanje konja', ostalo: 'Ostalo' };
const CHAN = { email: 'E-mail', viber: 'Viber', whatsapp: 'WhatsApp' };
const PIPES = {
  prodavci: { t: 'Prodavci i konji', stages: [['novi_upit', 'Novi upit'], ['kontaktiran', 'Kontaktiran'], ['dokumentacija', 'Dokumentacija i vet'], ['prezentacija', 'Fotografisanje'], ['ugovor', 'Ugovor potpisan'], ['na_aukciji', 'Na aukciji'], ['prodat', 'Prodat'], ['nije_prodat', 'Nije prodat']] },
  kupci: { t: 'Kupci', stages: [['novi_lead', 'Novi lead'], ['kontaktiran', 'Kontaktiran'], ['zainteresovan', 'Zainteresovan'], ['registrovan', 'Registrovan'], ['licitirao', 'Licitirao'], ['kupio', 'Kupio'], ['zavrseno', 'Plaćeno i preuzeto'], ['odustao', 'Odustao']] },
  naplata: { t: 'Naplata provizija', stages: [['prodato', 'Prodato'], ['faktura_kupac', 'Faktura kupcu 5%'], ['faktura_prodavac', 'Faktura prodavcu 5%'], ['placeno', 'Plaćeno oba'], ['preuzet', 'Konj preuzet']] },
};
const COMM = 0.05; // 5% kupac + 5% prodavac

/* ---------- pomoćne ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const eur = (v) => (v === null || v === undefined || v === '' ? '—' : new Intl.NumberFormat('sr-Latn-RS', { maximumFractionDigits: 0 }).format(Number(v)) + ' €');
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, k) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + k); return x.toISOString().slice(0, 10); };
const fmtD = (d) => (d ? new Date(String(d).length <= 10 ? d + 'T12:00:00' : d).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtDT = (d) => (d ? new Date(d).toLocaleString('sr-Latn-RS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); if (m < 60) return `pre ${Math.max(1, m)} min`; const h = Math.round(m / 60); if (h < 24) return `pre ${h} h`; const dd = Math.round(h / 24); return `pre ${dd} d`; };
const daysIn = (d) => Math.max(0, Math.floor((Date.now() - new Date(d)) / 864e5));
const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj');
const normPhone = (p) => { let d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '381' + d.slice(1); return d; };
const waLink = (phone, text) => `https://wa.me/${normPhone(phone)}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const vbLink = (phone) => `viber://chat?number=%2B${normPhone(phone)}`;
const mailLink = (email, subj, body) => `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(subj || '')}&body=${encodeURIComponent(body || '')}`;
const telLink = (phone) => `tel:+${normPhone(phone)}`;
const LS = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }
async function q(p) { const { data, error } = await p; if (error) { console.error(error); try { sfx('error'); } catch (e) {} toast('Greška: ' + (error.message || error)); throw error; } return data; }
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('Tekst je kopiran'); } catch (e) { prompt('Kopirajte tekst:', t); } }

/* ---------- stanje ---------- */
const S = {
  user: null, view: LS.get('eq_view', 'danas'),
  contacts: [], deals: [], horses: [], acts: [], tasks: [], events: [], segments: [], templates: [], campaigns: [], messages: [], settings: [],
  siteHorses: [], siteAuctions: [], siteSession: null,
  pipe: LS.get('eq_pipe', 'kupci'), mkTab: 'kampanje', cf: { kind: '', rating: '', disc: '', ch: '', src: '' }, hTab: 'crm',
};
const who = () => S.user?.username || 'tim';
const C = (id) => S.contacts.find((c) => c.id === id);
const H = (id) => S.horses.find((h) => h.id === id);
const setting = (k, d = '') => S.settings.find((s) => s.key === k)?.value ?? d;

/* ---------- auth ---------- */
function userFrom(u) { const un = (u.email || '').split('@')[0]; return { username: un, display: u.user_metadata?.display_name || un.charAt(0).toUpperCase() + un.slice(1) }; }
async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) { S.user = userFrom(data.session.user); await start(); }
  else showLogin();
}
function showLogin() { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#lerr').textContent = '';
  const u = $('#lu').value.trim().toLowerCase(); const p = $('#lp').value;
  const { data, error } = await sb.auth.signInWithPassword({ email: u.includes('@') ? u : `${u}@${AUTH_DOMAIN}`, password: p });
  if (error) { $('#lerr').textContent = 'Pogrešno korisničko ime ili lozinka.'; return; }
  S.user = userFrom(data.user); $('#lp').value = ''; await start();
});
$('#bell').addEventListener('click', (e) => { e.stopPropagation(); bellMenu(); });
$('#userChip').addEventListener('click', async () => { if (confirm('Odjaviti se iz CRM-a?')) { sfx('bye'); await sb.auth.signOut(); sessionStorage.removeItem('eq_gate'); setTimeout(() => location.reload(), 700); } });

async function start() {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#uName').textContent = personName(who()); $('#uInit').textContent = personName(who()).charAt(0).toUpperCase(); $('#uInit').className = 'av ' + avCls(who());
  const sp = splash(personName(who()));
  $('#main').innerHTML = skeleton();
  await loadAll();
  loadSite(); loadNotifs(); pushRefresh();
  realtime();
  await sp;
  go(S.view);
  const hg = decodeURIComponent((location.hash.match(/go=([^&]+)/) || [])[1] || ''); if (hg) { history.replaceState(null, '', location.pathname); openGo(hg); }
}

async function loadAll() {
  const [contacts, deals, horses, acts, tasks, events, segments, templates, campaigns, settings] = await Promise.all([
    q(sb.from('e_contacts').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(5000)),
    q(sb.from('e_deals').select('*').is('deleted_at', null).order('updated_at', { ascending: false }).limit(5000)),
    q(sb.from('e_horses').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
    q(sb.from('e_activities').select('*').order('created_at', { ascending: false }).limit(1500)),
    q(sb.from('e_tasks').select('*').order('due', { ascending: true, nullsFirst: false })),
    q(sb.from('e_events').select('*').order('starts_at')),
    q(sb.from('e_segments').select('*').order('created_at')),
    q(sb.from('e_templates').select('*').order('position')),
    q(sb.from('e_campaigns').select('*').order('created_at', { ascending: false })),
    q(sb.from('e_settings').select('*')),
  ]);
  Object.assign(S, { contacts, deals, horses, acts, tasks, events, segments, templates, campaigns, settings });
}
async function loadSite() {
  try {
    const [h, a] = await Promise.all([
      site.from('horses').select('id,lot_number,name,rasa,pol,datum_rodjenja,namena,otac,majka,lokacija,pocetna_cena_eur,minimalni_korak_eur,trenutna_ponuda,broj_ponuda,rezerva_dostignuta,prodaja_status,zavrsna_cena,auction_id,kraj,fotografije,is_sample,objavljen').order('lot_number'),
      site.from('auctions').select('id,slug,naziv,tip,lokacija,pocetak,kraj,status,objavljena').order('pocetak'),
    ]);
    S.siteHorses = h.data || []; S.siteAuctions = a.data || [];
    if (['danas', 'konji', 'kalendar'].includes(S.view)) render();
  } catch (e) { console.warn('sajt', e); }
}
function realtime() {
  sb.channel('eq-crm').on('postgres_changes', { event: '*', schema: 'public', table: 'e_activities' }, async () => { S.acts = await q(sb.from('e_activities').select('*').order('created_at', { ascending: false }).limit(1500)); if (!document.querySelector('.drawer.open')) render(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'e_deals' }, async () => { S.deals = await q(sb.from('e_deals').select('*').is('deleted_at', null)); if (S.view === 'pipeline' || S.view === 'danas') render(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'e_contacts' }, async () => { S.contacts = await q(sb.from('e_contacts').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(5000)); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'e_tasks' }, async () => { S.tasks = await q(sb.from('e_tasks').select('*').order('due', { ascending: true, nullsFirst: false })); taskBadge(); if ((S.view === 'zadaci' || S.view === 'danas') && !$('#modal').classList.contains('open')) render(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'e_notifs' }, (p) => { const nf = p.new; if (!forMe(nf)) return; S.notifs.unshift(nf); bellBadge(); ncard(nf); })
    .subscribe();
}
function skeleton() { return `<div class="sk-head"><i></i><i></i></div><div class="stats">${'<div class="stat sk"></div>'.repeat(4)}</div><div class="grid2"><div class="panel sk tall"></div><div class="panel sk tall"></div></div>`; }

/* ---------- navigacija ---------- */
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v); });
function go(v) {
  if (!VIEWS[v]) v = 'danas';
  S.view = v; LS.set('eq_view', v);
  $$('#nav button').forEach((b) => (b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  closeDrawer(); render(); window.scrollTo(0, 0);
}
function render() { const f = VIEWS[S.view] || VIEWS.danas; $('#main').innerHTML = `<div class="view-in">${f()}</div>`; (BIND[S.view] || (() => {}))(); taskBadge(); }

function head(title, sub, btn = '') { return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="row">${btn}</div></div>`; }
function stat(lbl, val, sub) { return `<div class="stat"><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div></div>`; }
function chDots(c) { return `<span class="ch"><span class="${c.email_optin ? 'on' : ''}" title="E-mail">@</span><span class="${c.viber_optin ? 'on' : ''}" title="Viber">V</span><span class="${c.whatsapp_optin ? 'on' : ''}" title="WhatsApp">W</span></span>`; }
function quick(c, text = '') {
  if (!c) return '';
  return `<div class="acts">${c.phone ? `<a class="ic" href="${telLink(c.phone)}" title="Pozovi">☎</a><a class="ic wa" href="${waLink(c.phone, text)}" target="_blank" rel="noopener" title="WhatsApp">W</a><a class="ic vb" href="${vbLink(c.phone)}" title="Viber">V</a>` : ''}${c.email ? `<a class="ic" href="${mailLink(c.email, 'EQUIVRA', text)}" title="E-mail">@</a>` : ''}</div>`;
}

/* ---------- metrike ---------- */
function expectedCommission() {
  let sum = 0;
  S.siteHorses.forEach((h) => { const price = h.prodaja_status === 'prodato' ? n(h.zavrsna_cena) : (h.rezerva_dostignuta ? n(h.trenutna_ponuda) : 0); if (!h.is_sample) sum += price * COMM * 2; });
  S.deals.filter((d) => d.pipeline === 'naplata' && d.stage !== 'placeno' && d.stage !== 'preuzet').forEach((d) => { sum += n(d.amount) * COMM * 2; });
  return sum;
}
function followUps() {
  const t = today();
  const items = [];
  S.contacts.filter((c) => c.next_follow_up && c.next_follow_up <= t).forEach((c) => items.push({ type: 'c', c, due: c.next_follow_up }));
  S.tasks.filter((x) => !x.done && x.due && x.due <= t).forEach((x) => items.push({ type: 't', x, due: x.due }));
  return items.sort((a, b) => a.due.localeCompare(b.due));
}

/* ================= VIEWS ================= */
const VIEWS = {}, BIND = {};

/* ---------- DANAS ---------- */
VIEWS.danas = () => {
  const t = today(); const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const newC = S.contacts.filter((c) => c.created_at >= week).length;
  const fu = followUps();
  const prep = S.deals.filter((d) => d.pipeline === 'prodavci' && !['prodat', 'nije_prodat', 'na_aukciji'].includes(d.stage)).length;
  const next = S.siteAuctions.filter((a) => a.pocetak && new Date(a.kraj || a.pocetak) > new Date() && a.status !== 'otkazana')[0];
  const hello = new Date().getHours() < 12 ? 'Dobro jutro' : new Date().getHours() < 18 ? 'Dobar dan' : 'Dobro veče';
  const open = S.tasks.filter((x) => !x.done).sort((a, b) => (a.assignee === who() ? 0 : 1) - (b.assignee === who() ? 0 : 1) || String(a.due || '9').localeCompare(String(b.due || '9'))).slice(0, 10);
  const feed = S.acts.slice(0, 14);
  return head(`${hello}, ${esc(personName(who()))}`, next ? `Sledeća aukcija: <b>${esc(next.naziv)}</b>, ${fmtDT(next.pocetak)}${next.lokacija ? ' · ' + esc(next.lokacija) : ''}` : 'Pregled dana: ko čeka poziv, šta je stiglo sa sajta i šta je na redu.', `<button class="btn ghost" data-act="sync">↻ Proveri sajt</button><button class="btn" data-act="newContact">+ Kontakt</button>`) +
  `<section class="stats">${stat('Novi kontakti', newC, 'u poslednjih 7 dana')}${stat('Za danas', fu.length, 'follow-upi i zadaci')}${stat('Konji u pripremi', prep, 'u pipeline-u prodavaca')}${stat('Očekivana provizija', eur(expectedCommission()), '5% kupac + 5% prodavac')}</section>
  <div class="grid2">
    <div class="panel"><div class="panel-h"><h2>Za danas</h2><span class="pill ${fu.length ? 'p-ochre' : 'p-green'}">${fu.length}</span></div><div class="panel-b">
      ${fu.length ? fu.map((it) => it.type === 'c' ? `<div class="li"><span class="dot ${it.due < t ? 'late' : ''}"></span><div class="grow" data-open-c="${it.c.id}" style="cursor:pointer"><div class="t">${esc(it.c.name)}</div><div class="s">${KIND[it.c.kind]} · follow-up ${it.due < t ? 'kasni od ' + fmtD(it.due) : 'danas'}${it.c.note ? ' · ' + esc(it.c.note.slice(0, 60)) : ''}</div></div>${quick(it.c)}</div>` :
        `<div class="li"><input type="checkbox" class="check" data-task-done="${it.x.id}"><div class="grow"><div class="t">${esc(it.x.title)}</div><div class="s">${it.x.assignee ? esc(it.x.assignee) + ' · ' : ''}${it.due < t ? 'kasni od ' + fmtD(it.due) : 'danas'}${it.x.contact_id && C(it.x.contact_id) ? ' · ' + esc(C(it.x.contact_id).name) : ''}</div></div></div>`).join('') : `<div class="empty">Sve je završeno za danas.</div>`}
    </div></div>
    <div class="panel"><div class="panel-h"><h2>Zadaci</h2><button class="btn sm ghost" data-act="newTask">+ Zadatak</button></div><div class="panel-b">
      ${open.length ? open.map(taskRow).join('') : `<div class="empty">Nema otvorenih zadataka.</div>`}
    </div></div>
  </div>
  <div class="panel" style="margin-top:16px"><div class="panel-h"><h2>Šta se dešavalo</h2></div><div class="panel-b"><ul class="tl" style="margin-top:10px">
    ${feed.length ? feed.map((a) => `<li class="k-${a.kind}"><b>${a.contact_id && C(a.contact_id) ? esc(C(a.contact_id).name) + ': ' : ''}</b>${esc(a.body)}<time>${ACT[a.kind] || a.kind} · ${a.author ? esc(a.author) + ' · ' : ''}${ago(a.created_at)}</time></li>`).join('') : '<div class="empty">Još nema aktivnosti. Kad se sajt poveže (Podešavanja), sve sa sajta stiže ovde samo.</div>'}
  </ul></div></div>`;
};
BIND.danas = () => bindCommon();

/* ---------- KONTAKTI ---------- */
function contactMatches(c, f, qq) {
  if (f.kind && c.kind !== f.kind && !(f.kind === 'kupac' && c.kind === 'kupac_prodavac') && !(f.kind === 'prodavac' && c.kind === 'kupac_prodavac')) return false;
  if (f.rating && c.rating !== f.rating) return false;
  if (f.disc && !(c.disciplines || []).includes(f.disc)) return false;
  if (f.ch && !c[f.ch + '_optin']) return false;
  if (f.src && c.source !== f.src) return false;
  if (qq && !fold([c.name, c.company, c.phone, c.email, c.city, (c.tags || []).join(' ')].join(' ')).includes(qq)) return false;
  return true;
}
VIEWS.kontakti = () => {
  const f = S.cf; const qq = fold(S.cq || '');
  const list = S.contacts.filter((c) => contactMatches(c, f, qq));
  const opt = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${t}</option>`).join('');
  return head('Kontakti', 'Kupci, prodavci, odgajivači i partneri. Ko šta traži, koji budžet i kako sme da mu se piše.', `<button class="btn ghost" data-act="exportCsv">Izvoz CSV</button><button class="btn ghost" data-act="importCsv">Uvoz CSV</button><button class="btn" data-act="newContact">+ Kontakt</button>`) +
  `<div class="toolbar">
    <input class="filter" id="cq" placeholder="Traži ime, telefon, grad" value="${esc(S.cq || '')}">
    <select class="filter" data-cf="kind"><option value="">Svi tipovi</option>${opt(KIND, f.kind)}</select>
    <select class="filter" data-cf="rating"><option value="">Sve ocene</option>${opt(RATING, f.rating)}</select>
    <select class="filter" data-cf="disc"><option value="">Sve discipline</option>${opt(DISC, f.disc)}</select>
    <select class="filter" data-cf="ch"><option value="">Svi kanali</option><option value="email" ${f.ch === 'email' ? 'selected' : ''}>Sme e-mail</option><option value="viber" ${f.ch === 'viber' ? 'selected' : ''}>Sme Viber</option><option value="whatsapp" ${f.ch === 'whatsapp' ? 'selected' : ''}>Sme WhatsApp</option></select>
    <select class="filter" data-cf="src"><option value="">Svi izvori</option>${opt(SRC, f.src)}</select>
    <span class="count">${list.length} kontakata</span>
  </div>
  <div class="panel"><table class="resp"><thead><tr><th>Kontakt</th><th>Tip</th><th>Interesovanje</th><th>Budžet</th><th>Kanali</th><th>Follow-up</th></tr></thead><tbody>
  ${list.slice(0, 500).map((c) => `<tr data-c="${c.rating}" data-open-c="${c.id}">
    <td class="name"><div class="pname">${esc(c.name)}</div><div class="psub">${esc([c.phone, c.city].filter(Boolean).join(' · ') || c.email || '')}</div></td>
    <td><span class="pill ${c.kind.includes('prodavac') ? 'p-gold' : 'p-green'}">${KIND[c.kind]}</span> <span class="pill ${c.rating === 'vruc' ? 'p-ochre' : ''}">${RATING[c.rating]}</span></td>
    <td class="hide-m">${(c.disciplines || []).map((d) => DISC[d]).join(', ') || '<span class="psub">—</span>'}</td>
    <td class="num hide-m">${c.budget_from || c.budget_to ? `${c.budget_from ? eur(c.budget_from) : ''}–${c.budget_to ? eur(c.budget_to) : ''}` : '—'}</td>
    <td>${chDots(c)}</td>
    <td class="hide-m">${c.next_follow_up ? `<span class="pill ${c.next_follow_up <= today() ? 'p-ochre' : ''}">${fmtD(c.next_follow_up)}</span>` : '—'}</td>
  </tr>`).join('') || `<tr><td colspan="6" class="empty">Nema kontakata za ovaj filter.</td></tr>`}
  </tbody></table></div>${list.length > 500 ? '<p class="hint">Prikazano prvih 500, suzite pretragu.</p>' : ''}`;
};
BIND.kontakti = () => {
  bindCommon();
  $$('[data-cf]').forEach((s) => s.addEventListener('change', () => { S.cf[s.dataset.cf] = s.value; render(); }));
  const cq = $('#cq'); cq.addEventListener('input', () => { S.cq = cq.value; clearTimeout(cq._t); cq._t = setTimeout(() => { render(); const el = $('#cq'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 250); });
};

function openContact(id) {
  const c = C(id); if (!c) return;
  const acts = S.acts.filter((a) => a.contact_id === id);
  const deals = S.deals.filter((d) => d.contact_id === id);
  const horses = S.horses.filter((h) => h.seller_id === id);
  drawer(esc(c.name), `${KIND[c.kind]} · ${SRC[c.source] || c.source}${c.company ? ' · ' + esc(c.company) : ''}`, `
    <div class="row" style="margin-bottom:6px">${quick(c)}<button class="btn sm ghost" data-act="editContact" data-id="${c.id}">Izmeni</button></div>
    <div class="kv"><span>Telefon</span><b>${esc(c.phone || '—')}</b></div>
    <div class="kv"><span>E-mail</span><b>${esc(c.email || '—')}</b></div>
    <div class="kv"><span>Grad / država</span><b>${esc([c.city, c.country].filter(Boolean).join(', ') || '—')}</b></div>
    <div class="kv"><span>Ocena</span><b>${RATING[c.rating]}</b></div>
    <div class="kv"><span>Vlasnik kontakta</span><b>${esc(c.owner || '—')}</b></div>
    <div class="kv"><span>Discipline</span><b>${(c.disciplines || []).map((d) => DISC[d]).join(', ') || '—'}</b></div>
    <div class="kv"><span>Budžet</span><b>${c.budget_from || c.budget_to ? `${eur(c.budget_from)} – ${eur(c.budget_to)}` : '—'}</b></div>
    <div class="kv"><span>Pol / starost</span><b>${[c.sex_pref ? SEX[c.sex_pref] : '', c.age_from || c.age_to ? `${c.age_from || '?'}–${c.age_to || '?'} god.` : ''].filter(Boolean).join(' · ') || '—'}</b></div>
    ${c.tags?.length ? `<div class="kv"><span>Oznake</span><b>${c.tags.map(esc).join(', ')}</b></div>` : ''}
    ${c.note ? `<div class="sec">Napomena</div><div class="msg-body">${esc(c.note)}</div>` : ''}
    <div class="sec">Saglasnosti za marketing</div>
    ${['email', 'viber', 'whatsapp'].map((ch) => `<label class="consent"><input type="checkbox" data-consent="${ch}" ${c[ch + '_optin'] ? 'checked' : ''}><div><b>${CHAN[ch]}</b><small>${c[ch + '_optin'] ? `Saglasan od ${fmtD(c[ch + '_optin_at'])}${c[ch + '_optin_src'] ? ' · ' + esc(SRC[c[ch + '_optin_src']] || c[ch + '_optin_src']) : ''}` : c[ch + '_unsub_at'] ? `Odjavljen ${fmtD(c[ch + '_unsub_at'])}` : 'Nema saglasnost, poruke se ne šalju'}</small></div></label>`).join('')}
    <div class="sec">Follow-up</div>
    <div class="row"><input type="date" id="fuDate" class="filter" value="${c.next_follow_up || ''}"><button class="btn sm ghost" data-fu="1">Sutra</button><button class="btn sm ghost" data-fu="3">Za 3 dana</button><button class="btn sm ghost" data-fu="7">Za nedelju</button><button class="btn sm ghost" data-fu="0">Ukloni</button></div>
    ${deals.length ? `<div class="sec">U pipeline-u</div>${deals.map((d) => `<div class="kv"><span>${PIPES[d.pipeline].t}</span><b>${stageLabel(d)}${d.amount ? ' · ' + eur(d.amount) : ''}</b></div>`).join('')}` : ''}
    ${horses.length ? `<div class="sec">Njegovi konji</div>${horses.map((h) => `<div class="kv"><span>${esc(h.name)}</span><b>${HSTAT[h.status]}</b></div>`).join('')}` : ''}
    <div class="sec">Dodaj aktivnost</div>
    <div class="frow"><select class="filter" id="actKind">${Object.entries(ACT).filter(([k]) => !['sajt', 'faza', 'sistem'].includes(k)).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:8px"><textarea id="actBody" placeholder="Šta je dogovoreno, šta traži, kada se javljamo..."></textarea></div>
    <div class="row"><button class="btn sm" data-act="addAct" data-id="${c.id}">Sačuvaj</button>${!deals.find((d) => d.pipeline === 'kupci') ? `<button class="btn sm ghost" data-act="toPipe" data-pipe="kupci" data-id="${c.id}">+ U kupce</button>` : ''}${!deals.find((d) => d.pipeline === 'prodavci') ? `<button class="btn sm ghost" data-act="toPipe" data-pipe="prodavci" data-id="${c.id}">+ U prodavce</button>` : ''}</div>
    <div class="sec">Istorija</div>
    <ul class="tl">${acts.map((a) => `<li class="k-${a.kind}">${esc(a.body)}<time>${ACT[a.kind] || a.kind} · ${a.author ? esc(a.author) + ' · ' : ''}${fmtDT(a.created_at)}</time></li>`).join('') || '<div class="empty">Još nema aktivnosti.</div>'}</ul>
    <div style="margin-top:20px"><button class="btn sm danger" data-act="delContact" data-id="${c.id}">Obriši kontakt</button></div>`);
  $$('[data-consent]').forEach((cb) => cb.addEventListener('change', async () => { await q(sb.from('e_contacts').update({ [cb.dataset.consent + '_optin']: cb.checked, [cb.dataset.consent + '_optin_src']: cb.checked ? 'rucno' : c[cb.dataset.consent + '_optin_src'] }).eq('id', c.id)); await refreshContact(c.id); await logAct(c.id, 'sistem', `${CHAN[cb.dataset.consent]}: ${cb.checked ? 'dodata saglasnost' : 'odjavljen'}`); openContact(c.id); }));
  $$('[data-fu]').forEach((b) => b.addEventListener('click', () => setFU(c.id, b.dataset.fu === '0' ? null : addDays(today(), +b.dataset.fu))));
  $('#fuDate').addEventListener('change', (e) => setFU(c.id, e.target.value || null));
}
async function setFU(id, d) { await q(sb.from('e_contacts').update({ next_follow_up: d }).eq('id', id)); await refreshContact(id); toast(d ? 'Follow-up: ' + fmtD(d) : 'Follow-up uklonjen'); openContact(id); }
async function refreshContact(id) { const [c] = await q(sb.from('e_contacts').select('*').eq('id', id)); const i = S.contacts.findIndex((x) => x.id === id); if (c) { if (i >= 0) S.contacts[i] = c; else S.contacts.unshift(c); } }
async function logAct(contact_id, kind, body, extra = {}) { const [a] = await q(sb.from('e_activities').insert({ contact_id, kind, body, author: who(), ...extra }).select()); S.acts.unshift(a); return a; }

function contactForm(c = {}) {
  const ck = (arr, k) => ((arr || []).includes(k) ? 'checked' : '');
  modal(c.id ? 'Izmeni kontakt' : 'Novi kontakt', `
    <div class="frow"><div class="field"><label>Ime i prezime *</label><input id="f_name" value="${esc(c.name || '')}"></div><div class="field"><label>Firma / ergela</label><input id="f_company" value="${esc(c.company || '')}"></div></div>
    <div class="frow"><div class="field"><label>Telefon</label><input id="f_phone" inputmode="tel" value="${esc(c.phone || '')}" placeholder="064 123 4567"></div><div class="field"><label>E-mail</label><input id="f_email" type="email" value="${esc(c.email || '')}"></div></div>
    <div class="frow"><div class="field"><label>Grad</label><input id="f_city" value="${esc(c.city || '')}"></div><div class="field"><label>Država</label><input id="f_country" value="${esc(c.country || 'Srbija')}"></div></div>
    <div class="frow"><div class="field"><label>Tip</label><select id="f_kind">${Object.entries(KIND).map(([k, t]) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Ocena</label><select id="f_rating">${Object.entries(RATING).map(([k, t]) => `<option value="${k}" ${(c.rating || 'topao') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Izvor</label><select id="f_source">${Object.entries(SRC).map(([k, t]) => `<option value="${k}" ${(c.source || 'rucno') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <div class="field"><label>Interesuju ga discipline</label><div class="chips">${Object.entries(DISC).map(([k, t]) => `<label><input type="checkbox" name="f_disc" value="${k}" ${ck(c.disciplines, k)}>${t}</label>`).join('')}</div></div>
    <div class="frow"><div class="field"><label>Budžet od (€)</label><input id="f_bf" type="number" inputmode="numeric" value="${c.budget_from ?? ''}"></div><div class="field"><label>Budžet do (€)</label><input id="f_bt" type="number" inputmode="numeric" value="${c.budget_to ?? ''}"></div></div>
    <div class="frow"><div class="field"><label>Pol</label><select id="f_sex"><option value="">Svejedno</option>${Object.entries(SEX).map(([k, t]) => `<option value="${k}" ${c.sex_pref === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label>Starost od</label><input id="f_af" type="number" value="${c.age_from ?? ''}"></div><div class="field"><label>Starost do</label><input id="f_at" type="number" value="${c.age_to ?? ''}"></div></div>
    <div class="frow"><div class="field"><label>Rase</label><input id="f_breeds" value="${esc(c.breeds || '')}" placeholder="npr. engleski punokrvnjak, kasač"></div><div class="field"><label>Vlasnik kontakta</label><input id="f_owner" value="${esc(c.owner || who())}"></div></div>
    <div class="field"><label>Oznake (zarezom)</label><input id="f_tags" value="${esc((c.tags || []).join(', '))}"></div>
    <div class="field"><label>Napomena</label><textarea id="f_note">${esc(c.note || '')}</textarea></div>
    ${c.id ? '' : `<div class="sec">Saglasnosti (samo ako je kontakt izričito pristao)</div>${['email', 'viber', 'whatsapp'].map((ch) => `<label class="consent"><input type="checkbox" id="f_${ch}"><div><b>${CHAN[ch]}</b><small>Pristao da prima obaveštenja o aukcijama</small></div></label>`).join('')}`}
    <div class="row" style="margin-top:14px"><button class="btn" id="f_save">Sačuvaj</button><button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#f_save').addEventListener('click', async () => {
    const v = (id) => $('#' + id).value.trim();
    if (!v('f_name')) { toast('Ime je obavezno'); return; }
    const row = { name: v('f_name'), company: v('f_company') || null, phone: v('f_phone') || null, email: v('f_email') || null, city: v('f_city') || null, country: v('f_country') || null, kind: v('f_kind'), rating: v('f_rating'), source: v('f_source'), disciplines: $$('input[name=f_disc]:checked').map((x) => x.value), budget_from: v('f_bf') || null, budget_to: v('f_bt') || null, sex_pref: v('f_sex') || null, age_from: v('f_af') || null, age_to: v('f_at') || null, breeds: v('f_breeds') || null, owner: v('f_owner') || null, tags: v('f_tags') ? v('f_tags').split(',').map((s) => s.trim()).filter(Boolean) : [], note: v('f_note') || null };
    if (!c.id) ['email', 'viber', 'whatsapp'].forEach((ch) => { if ($('#f_' + ch).checked) { row[ch + '_optin'] = true; row[ch + '_optin_src'] = row.source; } });
    if (row.phone || row.email) {
      const dup = S.contacts.find((x) => x.id !== c.id && ((row.phone && normPhone(x.phone) === normPhone(row.phone)) || (row.email && (x.email || '').toLowerCase() === row.email.toLowerCase())));
      if (dup && !confirm(`Već postoji kontakt „${dup.name}" sa istim telefonom ili e-mailom. Ipak sačuvati?`)) return;
    }
    let saved;
    if (c.id) { [saved] = await q(sb.from('e_contacts').update(row).eq('id', c.id).select()); const i = S.contacts.findIndex((x) => x.id === c.id); S.contacts[i] = saved; }
    else { [saved] = await q(sb.from('e_contacts').insert(row).select()); S.contacts.unshift(saved); await logAct(saved.id, 'sistem', 'Kontakt dodat'); }
    closeModal(); toast('Sačuvano'); render(); openContact(saved.id);
  });
}

/* ---------- PIPELINE ---------- */
function stageLabel(d) { return (PIPES[d.pipeline].stages.find((s) => s[0] === d.stage) || [, d.stage])[1]; }
VIEWS.pipeline = () => {
  const p = PIPES[S.pipe]; const ds = S.deals.filter((d) => d.pipeline === S.pipe);
  const total = ds.filter((d) => !['odustao', 'nije_prodat'].includes(d.stage)).reduce((a, d) => a + n(d.amount), 0);
  return head(p.t, S.pipe === 'naplata' ? `Za naplatu: ${eur(ds.filter((d) => !['placeno', 'preuzet'].includes(d.stage)).reduce((a, d) => a + n(d.amount) * COMM * 2, 0))} provizije (5% + 5%).` : `${ds.length} kartica · ukupna vrednost ${eur(total)}`, `<button class="btn" data-act="newDeal">+ Kartica</button>`) +
  `<div class="toolbar"><div class="seg">${Object.entries(PIPES).map(([k, v]) => `<button data-pipe="${k}" aria-pressed="${S.pipe === k}">${v.t}</button>`).join('')}</div></div>
  <div class="board" id="board">${p.stages.map(([k, t]) => { const items = ds.filter((d) => d.stage === k); return `<div class="col" data-stage="${k}"><h3>${t}<em>${items.length}</em></h3>${items.map((d) => dealCard(d)).join('')}</div>`; }).join('')}</div>
  <p class="hint">Prevuci karticu u drugu kolonu (na telefonu izaberi fazu u kartici). Promena faze se upisuje u istoriju kontakta.</p>`;
};
function dealCard(d) {
  const c = C(d.contact_id); const h = d.horse_id ? H(d.horse_id) : null;
  const late = d.next_step_at && d.next_step_at < today();
  const comm = S.pipe === 'naplata' && d.amount ? `<div class="what">Provizija: ${eur(n(d.amount) * COMM)} + ${eur(n(d.amount) * COMM)}</div>` : '';
  return `<div class="card ${late ? 'late' : ''}" draggable="true" data-deal="${d.id}">
    <div class="who">${esc(c?.name || d.title || 'Bez kontakta')}</div>
    <div class="what">${esc([h?.name, d.title !== c?.name ? d.title : ''].filter(Boolean).join(' · '))}</div>
    ${d.amount ? `<div class="amt">${eur(d.amount)}</div>` : ''}${comm}
    ${d.next_step ? `<div class="what">→ ${esc(d.next_step)}${d.next_step_at ? ' · ' + fmtD(d.next_step_at) : ''}</div>` : ''}
    <div class="meta"><span>${daysIn(d.stage_since)} d u fazi${d.owner ? ' · ' + esc(d.owner) : ''}</span>
    <select data-move="${d.id}" aria-label="Faza">${PIPES[d.pipeline].stages.map(([k, t]) => `<option value="${k}" ${k === d.stage ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  </div>`;
}
BIND.pipeline = () => {
  bindCommon();
  $$('[data-pipe]').forEach((b) => b.addEventListener('click', () => { S.pipe = b.dataset.pipe; LS.set('eq_pipe', S.pipe); render(); }));
  let dragId = null;
  $$('.card[data-deal]').forEach((el) => {
    el.addEventListener('dragstart', (e) => { dragId = el.dataset.deal; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('click', (e) => { if (e.target.closest('select')) return; openDeal(el.dataset.deal); });
  });
  $$('.col').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('over'); if (dragId) moveDeal(dragId, col.dataset.stage); });
  });
  $$('[data-move]').forEach((s) => s.addEventListener('change', () => moveDeal(s.dataset.move, s.value)));
};
async function moveDeal(id, stage) {
  const d = S.deals.find((x) => x.id === id); if (!d || d.stage === stage) return;
  const from = stageLabel(d);
  let lost = null;
  if (stage === 'odustao') { lost = prompt('Zašto je odustao?') || null; }
  const [nd] = await q(sb.from('e_deals').update({ stage, lost_reason: lost ?? d.lost_reason }).eq('id', id).select());
  Object.assign(d, nd);
  if (['kupio', 'prodat', 'placeno'].includes(stage)) { const c = C(d.contact_id); celebrate(stage === 'prodat' ? 'Konj je prodat!' : stage === 'placeno' ? 'Provizija naplaćena!' : 'Kupac je kupio konja!', [d.title, c?.name, d.amount ? eur(d.amount) : ''].filter(Boolean).join(' · ')); } else sfx(stage === 'odustao' || stage === 'nije_prodat' ? 'soft' : 'move');
  if (d.contact_id) await logAct(d.contact_id, 'faza', `${PIPES[d.pipeline].t}: ${from} → ${stageLabel(d)}${lost ? ' (' + lost + ')' : ''}`, { deal_id: d.id });
  if (d.pipeline === 'kupci' && stage === 'kupio' && !S.deals.find((x) => x.pipeline === 'naplata' && x.contact_id === d.contact_id && x.horse_id === d.horse_id)) {
    const [nn] = await q(sb.from('e_deals').insert({ pipeline: 'naplata', stage: 'prodato', contact_id: d.contact_id, horse_id: d.horse_id, title: d.title, amount: d.amount, owner: d.owner }).select());
    S.deals.unshift(nn); toast('Dodato u naplatu provizija');
  }
  render();
}
function openDeal(id) {
  const d = S.deals.find((x) => x.id === id); const c = C(d.contact_id);
  drawer(esc(c?.name || d.title || 'Kartica'), `${PIPES[d.pipeline].t} · ${stageLabel(d)}`, `
    ${c ? `<div class="row" style="margin-bottom:8px">${quick(c)}<button class="btn sm ghost" data-open-c="${c.id}">Otvori kontakt</button></div>` : ''}
    <div class="frow"><div class="field"><label>Naslov</label><input id="d_title" value="${esc(d.title || '')}"></div><div class="field"><label>Iznos (€)</label><input id="d_amount" type="number" value="${d.amount ?? ''}"></div></div>
    <div class="frow"><div class="field"><label>Konj</label><select id="d_horse"><option value="">—</option>${S.horses.map((h) => `<option value="${h.id}" ${d.horse_id === h.id ? 'selected' : ''}>${esc(h.name)}${h.lot_no ? ' · lot ' + esc(h.lot_no) : ''}</option>`).join('')}</select></div><div class="field"><label>Zadužen</label><input id="d_owner" value="${esc(d.owner || '')}"></div></div>
    <div class="frow"><div class="field"><label>Sledeći korak</label><input id="d_next" value="${esc(d.next_step || '')}"></div><div class="field"><label>Do</label><input id="d_nextat" type="date" value="${d.next_step_at || ''}"></div></div>
    ${d.lost_reason ? `<div class="kv"><span>Razlog</span><b>${esc(d.lost_reason)}</b></div>` : ''}
    ${d.pipeline === 'naplata' && d.amount ? `<div class="kv"><span>Provizija kupac 5%</span><b>${eur(n(d.amount) * COMM)}</b></div><div class="kv"><span>Provizija prodavac 5%</span><b>${eur(n(d.amount) * COMM)}</b></div>` : ''}
    <div class="kv"><span>U fazi</span><b>${daysIn(d.stage_since)} dana</b></div>
    <div class="row" style="margin-top:14px"><button class="btn" id="d_save">Sačuvaj</button><button class="btn danger" id="d_del">Obriši karticu</button></div>`);
  $('#d_save').addEventListener('click', async () => { const [nd] = await q(sb.from('e_deals').update({ title: $('#d_title').value || null, amount: $('#d_amount').value || null, horse_id: $('#d_horse').value || null, owner: $('#d_owner').value || null, next_step: $('#d_next').value || null, next_step_at: $('#d_nextat').value || null }).eq('id', d.id).select()); Object.assign(d, nd); closeDrawer(); toast('Sačuvano'); render(); });
  $('#d_del').addEventListener('click', async () => { if (!confirm('Obrisati karticu?')) return; await q(sb.from('e_deals').update({ deleted_at: new Date().toISOString() }).eq('id', d.id)); S.deals = S.deals.filter((x) => x.id !== d.id); closeDrawer(); render(); });
}
function dealForm(pipe = S.pipe, contactId = null) {
  modal('Nova kartica', `
    <div class="field"><label>Pipeline</label><select id="n_pipe">${Object.entries(PIPES).map(([k, v]) => `<option value="${k}" ${k === pipe ? 'selected' : ''}>${v.t}</option>`).join('')}</select></div>
    <div class="field"><label>Kontakt</label><input id="n_cq" placeholder="Počni da kucaš ime ili telefon" list="n_cl" value="${contactId ? esc(C(contactId)?.name || '') : ''}"><datalist id="n_cl">${S.contacts.slice(0, 800).map((c) => `<option value="${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}">`).join('')}</datalist></div>
    <div class="frow"><div class="field"><label>Naslov</label><input id="n_title" placeholder="npr. traži kasača do 8.000 €"></div><div class="field"><label>Iznos (€)</label><input id="n_amount" type="number"></div></div>
    <div class="field"><label>Konj</label><select id="n_horse"><option value="">—</option>${S.horses.map((h) => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select></div>
    <div class="row"><button class="btn" id="n_save">Dodaj</button><button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#n_save').addEventListener('click', async () => {
    const p = $('#n_pipe').value; const name = $('#n_cq').value.split(' · ')[0].trim();
    const c = contactId ? C(contactId) : S.contacts.find((x) => x.name === name);
    if (!c) { toast('Izaberite postojeći kontakt (ili ga prvo dodajte)'); return; }
    const [d] = await q(sb.from('e_deals').insert({ pipeline: p, stage: PIPES[p].stages[0][0], contact_id: c.id, title: $('#n_title').value || null, amount: $('#n_amount').value || null, horse_id: $('#n_horse').value || null, owner: who() }).select());
    S.deals.unshift(d); await logAct(c.id, 'faza', `Dodat u ${PIPES[p].t}: ${PIPES[p].stages[0][1]}`, { deal_id: d.id });
    closeModal(); S.pipe = p; LS.set('eq_pipe', p); go('pipeline');
  });
}

/* ---------- KONJI ---------- */
function horseScore(c, h) {
  // h: {discipline, start_price, sex, birth_year}
  let s = 0, max = 0;
  max += 40; if (h.discipline && (c.disciplines || []).includes(h.discipline)) s += 40; else if (!(c.disciplines || []).length) s += 10;
  max += 35; const price = n(h.start_price);
  if (price && (c.budget_from || c.budget_to)) { const lo = n(c.budget_from), hi = n(c.budget_to) || Infinity; if (price >= lo && price <= hi) s += 35; else if (price <= hi * 1.2 && price >= lo * 0.8) s += 15; } else s += 8;
  max += 15; if (c.sex_pref && h.sex) { if (c.sex_pref === h.sex) s += 15; } else s += 7;
  max += 10; if (h.birth_year && (c.age_from || c.age_to)) { const age = new Date().getFullYear() - h.birth_year; if (age >= (c.age_from || 0) && age <= (c.age_to || 99)) s += 10; } else s += 5;
  return Math.round((s / max) * 100);
}
const siteDisc = (namena) => { const f = fold(namena); if (f.includes('galop')) return 'galop'; if (f.includes('kas')) return 'kas'; if (f.includes('prepon')) return 'preponsko'; if (f.includes('dresur')) return 'dresura'; if (f.includes('uzgoj') || f.includes('priplod')) return 'priplod'; if (f.includes('rekre') || f.includes('hobi')) return 'rekreacija'; return null; };
const siteSex = (pol) => { const f = fold(pol); return f.startsWith('pastuv') ? 'pastuv' : f.startsWith('kobil') ? 'kobila' : f.startsWith('kastrat') ? 'kastrat' : null; };
function siteAsHorse(h) { return { id: 'site:' + h.id, site: true, name: h.name, lot_no: String(h.lot_number).padStart(2, '0'), discipline: siteDisc(h.namena), breed: h.rasa, sex: siteSex(h.pol), birth_year: h.datum_rodjenja ? +h.datum_rodjenja.slice(0, 4) : null, sire: h.otac, dam: h.majka, start_price: h.pocetna_cena_eur, current_bid: h.trenutna_ponuda, bids: h.broj_ponuda, reserve_met: h.rezerva_dostignuta, status: h.prodaja_status === 'prodato' ? 'prodat' : h.prodaja_status === 'nije_prodato' ? 'nije_prodat' : h.prodaja_status === 'povucen' ? 'povucen' : 'na_aukciji', sold_price: h.zavrsna_cena, auction: S.siteAuctions.find((a) => a.id === h.auction_id)?.naziv, photo_url: h.fotografije?.[0], sample: h.is_sample, raw: h }; }
VIEWS.konji = () => {
  const local = S.horses; const siteH = S.siteHorses.map(siteAsHorse);
  const list = S.hTab === 'sajt' ? siteH : local;
  return head('Konji', 'Lotovi sa sajta uživo i interna evidencija konja u pripremi. Za svakog konja: ko bi ga kupio.', `<button class="btn" data-act="newHorse">+ Konj u pripremi</button>`) +
  `<div class="toolbar"><div class="seg"><button data-htab="crm" aria-pressed="${S.hTab === 'crm'}">U pripremi (${local.length})</button><button data-htab="sajt" aria-pressed="${S.hTab === 'sajt'}">Na sajtu (${siteH.length})</button></div>${S.hTab === 'sajt' && !siteH.length ? '<span class="count">Sajt se učitava ili nema objavljenih lotova</span>' : ''}</div>
  <div class="panel"><table class="resp"><thead><tr><th>Konj</th><th>Disciplina</th><th>Početna</th><th>Ponuda</th><th>Status</th><th>Kupci</th></tr></thead><tbody>
  ${list.map((h) => { const matches = S.contacts.filter((c) => c.kind !== 'prodavac' && horseScore(c, h) >= 70).length; return `<tr data-c="${h.status}" data-open-h="${h.id}">
    <td class="name"><div class="pname">${h.lot_no ? `<span style="color:var(--gold-ink);font-size:13px;font-family:var(--ui);font-weight:700">LOT ${esc(h.lot_no)}</span> ` : ''}${esc(h.name)}${h.sample ? ' <span class="pill">Primer</span>' : ''}</div><div class="psub">${esc([h.breed, h.sex ? SEX[h.sex] : '', h.birth_year].filter(Boolean).join(' · '))}${h.auction || h.auction_name ? ' · ' + esc(h.auction || h.auction_name) : ''}</div></td>
    <td>${h.discipline ? `<span class="pill p-green">${DISC[h.discipline]}</span>` : '—'}</td>
    <td class="num">${eur(h.start_price)}</td>
    <td class="num hide-m">${h.current_bid ? eur(h.current_bid) + (h.bids ? ` <span class="psub">(${h.bids})</span>` : '') : '—'}${h.site && h.current_bid ? (h.reserve_met ? ' <span class="pill p-gold">rezerva ✓</span>' : ' <span class="pill">rezerva ✗</span>') : ''}</td>
    <td><span class="pill ${h.status === 'prodat' ? 'p-gold' : h.status === 'na_aukciji' ? 'p-ochre' : ''}">${HSTAT[h.status]}</span></td>
    <td class="hide-m">${matches ? `<span class="pill p-green">${matches} odgovara</span>` : '—'}</td>
  </tr>`; }).join('') || `<tr><td colspan="6" class="empty">${S.hTab === 'sajt' ? 'Nema lotova na sajtu.' : 'Nema konja u pripremi. Dodajte konja ili ga povucite iz prijava prodavaca.'}</td></tr>`}
  </tbody></table></div>`;
};
BIND.konji = () => { bindCommon(); $$('[data-htab]').forEach((b) => b.addEventListener('click', () => { S.hTab = b.dataset.htab; render(); })); };
function openHorse(id) {
  const h = id.startsWith('site:') ? siteAsHorse(S.siteHorses.find((x) => 'site:' + x.id === id)) : H(id); if (!h) return;
  const seller = h.seller_id ? C(h.seller_id) : null;
  const ranked = S.contacts.filter((c) => c.kind !== 'prodavac' && !['veterinar', 'prevoznik', 'potkivac'].includes(c.kind)).map((c) => ({ c, s: horseScore(c, h) })).filter((x) => x.s >= 50).sort((a, b) => b.s - a.s).slice(0, 25);
  const link = h.site ? `${SITE_URL}/aukcije` : SITE_URL;
  const offer = (c) => `Zdravo ${c.name.split(' ')[0]}, imamo konja koji bi vas mogao zanimati: ${h.name}${h.lot_no ? ' (lot ' + h.lot_no + ')' : ''}${h.breed ? ', ' + h.breed : ''}${h.discipline ? ', ' + DISC[h.discipline].toLowerCase() : ''}${h.start_price ? '. Početna cena ' + eur(h.start_price) : ''}. Detalji: ${link}\nEQUIVRA · 069 332 8544`;
  drawer(esc(h.name), esc([h.lot_no ? 'Lot ' + h.lot_no : '', h.auction || h.auction_name, HSTAT[h.status]].filter(Boolean).join(' · ')), `
    ${h.photo_url ? `<img src="${esc(h.photo_url)}" alt="" style="width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:12px;margin-bottom:10px">` : ''}
    <div class="kv"><span>Rasa</span><b>${esc(h.breed || '—')}</b></div>
    <div class="kv"><span>Disciplina</span><b>${h.discipline ? DISC[h.discipline] : '—'}</b></div>
    <div class="kv"><span>Pol / godište</span><b>${[h.sex ? SEX[h.sex] : '', h.birth_year].filter(Boolean).join(' · ') || '—'}</b></div>
    <div class="kv"><span>Poreklo</span><b>${esc([h.sire, h.dam].filter(Boolean).join(' × ') || '—')}</b></div>
    <div class="kv"><span>Početna cena</span><b>${eur(h.start_price)}</b></div>
    ${h.current_bid ? `<div class="kv"><span>Trenutna ponuda</span><b>${eur(h.current_bid)}${h.bids ? ' · ' + h.bids + ' ponuda' : ''}</b></div>` : ''}
    ${h.sold_price ? `<div class="kv"><span>Prodat za</span><b>${eur(h.sold_price)}</b></div><div class="kv"><span>Provizija 5% + 5%</span><b>${eur(n(h.sold_price) * COMM * 2)}</b></div>` : ''}
    ${!h.site && h.reserve_price ? `<div class="kv"><span>Rezervna cena (interno)</span><b>${eur(h.reserve_price)}</b></div>` : ''}
    ${seller ? `<div class="kv"><span>Prodavac</span><b><a href="#" data-open-c="${seller.id}">${esc(seller.name)}</a></b></div>` : ''}
    ${h.note ? `<div class="msg-body">${esc(h.note)}</div>` : ''}
    ${!h.site ? `<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="editHorse" data-id="${h.id}">Izmeni</button></div>` : `<div class="row" style="margin-top:10px"><a class="btn sm ghost" href="${link}" target="_blank" rel="noopener">Otvori na sajtu</a></div>`}
    <div class="sec">Pronađi kupce · ${ranked.length} odgovara</div>
    ${ranked.map(({ c, s }) => `<div class="li"><span class="pill ${s >= 80 ? 'p-gold' : 'p-green'}" style="min-width:46px;text-align:center">${s}%</span><div class="grow" data-open-c="${c.id}" style="cursor:pointer"><div class="t">${esc(c.name)}</div><div class="s">${(c.disciplines || []).map((d) => DISC[d]).join(', ') || 'bez discipline'}${c.budget_to ? ' · do ' + eur(c.budget_to) : ''} ${chDots(c)}</div></div>${quick(c, offer(c))}<button class="ic" title="Kopiraj ponudu" data-copy="${esc(offer(c))}">⧉</button></div>`).join('') || '<div class="empty">Nema kontakata čija interesovanja odgovaraju. Dopunite discipline i budžet kod kupaca.</div>'}`);
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy)));
}
function horseForm(h = {}) {
  const sellers = S.contacts.filter((c) => c.kind.includes('prodavac') || c.kind === 'odgajivac');
  modal(h.id ? 'Izmeni konja' : 'Konj u pripremi', `
    <div class="frow"><div class="field"><label>Ime *</label><input id="h_name" value="${esc(h.name || '')}"></div><div class="field"><label>Lot</label><input id="h_lot" value="${esc(h.lot_no || '')}"></div></div>
    <div class="frow"><div class="field"><label>Disciplina</label><select id="h_disc"><option value="">—</option>${Object.entries(DISC).map(([k, t]) => `<option value="${k}" ${h.discipline === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label>Rasa</label><input id="h_breed" value="${esc(h.breed || '')}"></div></div>
    <div class="frow"><div class="field"><label>Pol</label><select id="h_sex"><option value="">—</option>${Object.entries(SEX).map(([k, t]) => `<option value="${k}" ${h.sex === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label>Godište</label><input id="h_year" type="number" value="${h.birth_year ?? ''}"></div><div class="field"><label>Boja</label><input id="h_color" value="${esc(h.color || '')}"></div></div>
    <div class="frow"><div class="field"><label>Otac</label><input id="h_sire" value="${esc(h.sire || '')}"></div><div class="field"><label>Majka</label><input id="h_dam" value="${esc(h.dam || '')}"></div></div>
    <div class="frow"><div class="field"><label>Prodavac</label><select id="h_seller"><option value="">—</option>${sellers.map((c) => `<option value="${c.id}" ${h.seller_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>Aukcija</label><input id="h_auction" value="${esc(h.auction_name || '')}"></div></div>
    <div class="frow"><div class="field"><label>Početna (€)</label><input id="h_start" type="number" value="${h.start_price ?? ''}"></div><div class="field"><label>Rezervna (€, interno)</label><input id="h_res" type="number" value="${h.reserve_price ?? ''}"></div><div class="field"><label>Prodat za (€)</label><input id="h_sold" type="number" value="${h.sold_price ?? ''}"></div></div>
    <div class="frow"><div class="field"><label>Status</label><select id="h_status">${Object.entries(HSTAT).map(([k, t]) => `<option value="${k}" ${(h.status || 'priprema') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label>Link fotografije</label><input id="h_photo" value="${esc(h.photo_url || '')}"></div></div>
    <div class="field"><label>Napomena</label><textarea id="h_note">${esc(h.note || '')}</textarea></div>
    <div class="row"><button class="btn" id="h_save">Sačuvaj</button>${h.id ? '<button class="btn danger" id="h_del">Obriši</button>' : ''}<button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#h_save').addEventListener('click', async () => {
    const v = (id) => $('#' + id).value.trim() || null;
    if (!v('h_name')) { toast('Ime je obavezno'); return; }
    const row = { name: v('h_name'), lot_no: v('h_lot'), discipline: v('h_disc'), breed: v('h_breed'), sex: v('h_sex'), birth_year: v('h_year'), color: v('h_color'), sire: v('h_sire'), dam: v('h_dam'), seller_id: v('h_seller'), auction_name: v('h_auction'), start_price: v('h_start'), reserve_price: v('h_res'), sold_price: v('h_sold'), status: v('h_status'), photo_url: v('h_photo'), note: v('h_note') };
    let saved;
    if (h.id) { [saved] = await q(sb.from('e_horses').update(row).eq('id', h.id).select()); Object.assign(H(h.id), saved); }
    else { [saved] = await q(sb.from('e_horses').insert(row).select()); S.horses.unshift(saved); if (row.seller_id) await logAct(row.seller_id, 'sistem', `Konj dodat: ${row.name}`, { horse_id: saved.id }); }
    if (row.status === 'prodat' && row.sold_price && !S.deals.find((d) => d.pipeline === 'naplata' && d.horse_id === saved.id)) {
      const [nn] = await q(sb.from('e_deals').insert({ pipeline: 'naplata', stage: 'prodato', contact_id: row.seller_id, horse_id: saved.id, title: row.name, amount: row.sold_price, owner: who() }).select()); S.deals.unshift(nn); toast('Dodato u naplatu provizija');
    }
    closeModal(); S.hTab = 'crm'; render();
  });
  if (h.id) $('#h_del').addEventListener('click', async () => { if (!confirm('Obrisati konja iz evidencije?')) return; await q(sb.from('e_horses').update({ deleted_at: new Date().toISOString() }).eq('id', h.id)); S.horses = S.horses.filter((x) => x.id !== h.id); closeModal(); render(); });
}

/* ---------- MARKETING ---------- */
function segMatch(c, f) {
  if (f.kind?.length && !f.kind.some((k) => c.kind === k || (c.kind === 'kupac_prodavac' && (k === 'kupac' || k === 'prodavac')))) return false;
  if (f.disciplines?.length && !f.disciplines.some((d) => (c.disciplines || []).includes(d))) return false;
  if (f.rating?.length && !f.rating.includes(c.rating)) return false;
  if (f.source?.length && !f.source.includes(c.source)) return false;
  if (f.city && !fold(c.city).includes(fold(f.city))) return false;
  if (f.budget_min && n(c.budget_to) && n(c.budget_to) < n(f.budget_min)) return false;
  if (f.budget_max && n(c.budget_from) > n(f.budget_max)) return false;
  if (f.tags?.length && !f.tags.some((t) => (c.tags || []).includes(t))) return false;
  return true;
}
const segContacts = (seg) => S.contacts.filter((c) => segMatch(c, seg?.filters || {}));
const canSend = (c, ch) => c[ch + '_optin'] && (ch === 'email' ? !!c.email : !!c.phone);
function fill(tpl, c, vars) { return String(tpl || '').replace(/\{ime\}/g, (c.name || '').split(' ')[0]).replace(/\{aukcija\}/g, vars.aukcija || 'sledeća EQUIVRA aukcija').replace(/\{datum\}/g, vars.datum || '').replace(/\{lot\}/g, vars.lot || '').replace(/\{konj\}/g, vars.konj || '').replace(/\{link\}/g, vars.link || SITE_URL); }
VIEWS.marketing = () => {
  const tab = S.mkTab;
  const tabs = `<div class="toolbar"><div class="seg">${[['kampanje', 'Kampanje'], ['segmenti', 'Segmenti'], ['sabloni', 'Šabloni']].map(([k, t]) => `<button data-mk="${k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div></div>`;
  const optin = { email: S.contacts.filter((c) => canSend(c, 'email')).length, viber: S.contacts.filter((c) => canSend(c, 'viber')).length, whatsapp: S.contacts.filter((c) => canSend(c, 'whatsapp')).length };
  let body = '';
  if (tab === 'kampanje') body = `<div class="panel"><table class="resp"><thead><tr><th>Kampanja</th><th>Kanal</th><th>Segment</th><th>Poslato</th><th>Status</th></tr></thead><tbody>${S.campaigns.map((k) => { const seg = S.segments.find((s) => s.id === k.segment_id); return `<tr data-open-k="${k.id}"><td class="name"><div class="pname">${esc(k.name)}</div><div class="psub">${fmtD(k.created_at)}${k.author ? ' · ' + esc(k.author) : ''}</div></td><td><span class="pill p-blue">${CHAN[k.channel]}</span></td><td>${esc(seg?.name || 'Svi sa saglasnošću')}</td><td class="num" data-kstat="${k.id}">…</td><td><span class="pill ${k.status === 'poslata' ? 'p-green' : k.status === 'u_toku' ? 'p-ochre' : ''}">${{ nacrt: 'Nacrt', u_toku: 'Slanje u toku', poslata: 'Poslata' }[k.status]}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Još nema kampanja.</td></tr>'}</tbody></table></div>`;
  if (tab === 'segmenti') body = `<div class="panel"><table class="resp"><thead><tr><th>Segment</th><th>Kontakata</th><th>E-mail</th><th>Viber</th><th>WhatsApp</th></tr></thead><tbody>${S.segments.map((s) => { const cs = segContacts(s); return `<tr data-open-s="${s.id}"><td class="name"><div class="pname">${esc(s.name)}</div><div class="psub">${segDesc(s.filters)}</div></td><td class="num">${cs.length}</td><td class="num">${cs.filter((c) => canSend(c, 'email')).length}</td><td class="num">${cs.filter((c) => canSend(c, 'viber')).length}</td><td class="num">${cs.filter((c) => canSend(c, 'whatsapp')).length}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Napravite prvi segment, npr. „Kupci galop do 20.000 €".</td></tr>'}</tbody></table></div>`;
  if (tab === 'sabloni') body = `<div class="panel"><table class="resp"><thead><tr><th>Šablon</th><th>Kanal</th><th>Početak teksta</th></tr></thead><tbody>${S.templates.map((t) => `<tr data-open-t="${t.id}"><td class="name"><div class="pname">${esc(t.name)}</div>${t.subject ? `<div class="psub">${esc(t.subject)}</div>` : ''}</td><td><span class="pill p-blue">${CHAN[t.channel]}</span></td><td class="psub">${esc(t.body.slice(0, 90))}…</td></tr>`).join('')}</tbody></table></div>`;
  return head('Marketing', 'E-mail, Viber i WhatsApp poruke kontaktima koji su dali saglasnost. Promenljive: {ime} {aukcija} {datum} {lot} {konj} {link}.', tab === 'kampanje' ? `<button class="btn" data-act="newCampaign">+ Kampanja</button>` : tab === 'segmenti' ? `<button class="btn" data-act="newSegment">+ Segment</button>` : `<button class="btn" data-act="newTemplate">+ Šablon</button>`) +
    `<section class="stats">${stat('Sme e-mail', optin.email, 'kontakata sa saglasnošću')}${stat('Sme Viber', optin.viber, 'kontakata sa saglasnošću')}${stat('Sme WhatsApp', optin.whatsapp, 'kontakata sa saglasnošću')}${stat('Kampanje', S.campaigns.length, S.campaigns.filter((k) => k.status !== 'poslata').length + ' u toku ili nacrt')}</section>` + tabs + body;
};
function segDesc(f = {}) { return [f.kind?.map((k) => KIND[k]).join('/'), f.disciplines?.map((d) => DISC[d]).join('/'), f.rating?.map((r) => RATING[r]).join('/'), f.city, f.budget_min || f.budget_max ? `budžet ${f.budget_min || 0}–${f.budget_max || '∞'} €` : '', f.tags?.join(', ')].filter(Boolean).join(' · ') || 'svi kontakti'; }
BIND.marketing = async () => {
  bindCommon();
  $$('[data-mk]').forEach((b) => b.addEventListener('click', () => { S.mkTab = b.dataset.mk; render(); }));
  $$('[data-open-s]').forEach((r) => r.addEventListener('click', () => segmentForm(S.segments.find((s) => s.id === r.dataset.openS))));
  $$('[data-open-t]').forEach((r) => r.addEventListener('click', () => templateForm(S.templates.find((s) => s.id === r.dataset.openT))));
  $$('[data-open-k]').forEach((r) => r.addEventListener('click', () => openCampaign(r.dataset.openK)));
  const ids = $$('[data-kstat]').map((x) => x.dataset.kstat);
  if (ids.length) { const rows = await q(sb.from('e_messages').select('campaign_id,status').in('campaign_id', ids)); ids.forEach((id) => { const m = rows.filter((r) => r.campaign_id === id); const el = $(`[data-kstat="${id}"]`); if (el) el.textContent = `${m.filter((r) => r.status === 'poslato').length} / ${m.length}`; }); }
};
function segmentForm(s = { filters: {} }) {
  const f = s.filters || {}; const ck = (arr, k) => ((arr || []).includes(k) ? 'checked' : '');
  const chipSet = (name, o, arr) => `<div class="chips">${Object.entries(o).map(([k, t]) => `<label><input type="checkbox" name="${name}" value="${k}" ${ck(arr, k)}>${t}</label>`).join('')}</div>`;
  modal(s.id ? 'Segment' : 'Novi segment', `
    <div class="field"><label>Naziv *</label><input id="s_name" value="${esc(s.name || '')}" placeholder="npr. Kupci kas do 10.000 €"></div>
    <div class="field"><label>Tip kontakta</label>${chipSet('s_kind', { kupac: 'Kupac', prodavac: 'Prodavac', odgajivac: 'Odgajivač', trener: 'Trener' }, f.kind)}</div>
    <div class="field"><label>Discipline</label>${chipSet('s_disc', DISC, f.disciplines)}</div>
    <div class="field"><label>Ocena</label>${chipSet('s_rating', RATING, f.rating)}</div>
    <div class="frow"><div class="field"><label>Grad sadrži</label><input id="s_city" value="${esc(f.city || '')}"></div><div class="field"><label>Budžet min (€)</label><input id="s_bmin" type="number" value="${f.budget_min || ''}"></div><div class="field"><label>Budžet max (€)</label><input id="s_bmax" type="number" value="${f.budget_max || ''}"></div></div>
    <div class="field"><label>Oznake (zarezom)</label><input id="s_tags" value="${esc((f.tags || []).join(', '))}"></div>
    <div class="note-box" id="s_count"></div>
    <div class="row"><button class="btn" id="s_save">Sačuvaj</button>${s.id ? '<button class="btn danger" id="s_del">Obriši</button>' : ''}<button class="btn ghost" data-close>Otkaži</button></div>`);
  const read = () => ({ kind: $$('input[name=s_kind]:checked').map((x) => x.value), disciplines: $$('input[name=s_disc]:checked').map((x) => x.value), rating: $$('input[name=s_rating]:checked').map((x) => x.value), city: $('#s_city').value.trim() || undefined, budget_min: $('#s_bmin').value || undefined, budget_max: $('#s_bmax').value || undefined, tags: $('#s_tags').value ? $('#s_tags').value.split(',').map((t) => t.trim()).filter(Boolean) : [] });
  const upd = () => { const cs = S.contacts.filter((c) => segMatch(c, read())); $('#s_count').innerHTML = `<b>${cs.length}</b> kontakata · e-mail ${cs.filter((c) => canSend(c, 'email')).length} · Viber ${cs.filter((c) => canSend(c, 'viber')).length} · WhatsApp ${cs.filter((c) => canSend(c, 'whatsapp')).length}`; };
  $('#mBody').addEventListener('input', upd); $('#mBody').addEventListener('change', upd); upd();
  $('#s_save').addEventListener('click', async () => { if (!$('#s_name').value.trim()) { toast('Naziv je obavezan'); return; } const row = { name: $('#s_name').value.trim(), filters: read(), author: who() }; if (s.id) { const [x] = await q(sb.from('e_segments').update(row).eq('id', s.id).select()); Object.assign(s, x); } else { const [x] = await q(sb.from('e_segments').insert(row).select()); S.segments.push(x); } closeModal(); render(); });
  if (s.id) $('#s_del').addEventListener('click', async () => { if (!confirm('Obrisati segment?')) return; await q(sb.from('e_segments').delete().eq('id', s.id)); S.segments = S.segments.filter((x) => x.id !== s.id); closeModal(); render(); });
}
function templateForm(t = { channel: 'viber' }) {
  modal(t.id ? 'Šablon' : 'Novi šablon', `
    <div class="frow"><div class="field"><label>Naziv *</label><input id="t_name" value="${esc(t.name || '')}"></div><div class="field"><label>Kanal</label><select id="t_ch">${Object.entries(CHAN).map(([k, v]) => `<option value="${k}" ${t.channel === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <div class="field"><label>Naslov (samo e-mail)</label><input id="t_subj" value="${esc(t.subject || '')}"></div>
    <div class="field"><label>Tekst *</label><textarea id="t_body" style="min-height:200px">${esc(t.body || '')}</textarea></div>
    <p class="hint">Promenljive: {ime} {aukcija} {datum} {lot} {konj} {link}. Bez upisnine, provizija 5% kupac i 5% prodavac.</p>
    <div class="row"><button class="btn" id="t_save">Sačuvaj</button>${t.id ? '<button class="btn danger" id="t_del">Obriši</button>' : ''}<button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#t_save').addEventListener('click', async () => { const row = { name: $('#t_name').value.trim(), channel: $('#t_ch').value, subject: $('#t_subj').value.trim() || null, body: $('#t_body').value }; if (!row.name || !row.body.trim()) { toast('Naziv i tekst su obavezni'); return; } if (t.id) { const [x] = await q(sb.from('e_templates').update(row).eq('id', t.id).select()); Object.assign(t, x); } else { const [x] = await q(sb.from('e_templates').insert({ ...row, position: S.templates.length + 1 }).select()); S.templates.push(x); } closeModal(); render(); });
  if (t.id) $('#t_del').addEventListener('click', async () => { if (!confirm('Obrisati šablon?')) return; await q(sb.from('e_templates').delete().eq('id', t.id)); S.templates = S.templates.filter((x) => x.id !== t.id); closeModal(); render(); });
}
function campaignForm() {
  modal('Nova kampanja', `
    <div class="frow"><div class="field"><label>Naziv *</label><input id="k_name" placeholder="npr. Najava prve aukcije · Viber"></div><div class="field"><label>Kanal</label><select id="k_ch">${Object.entries(CHAN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div></div>
    <div class="frow"><div class="field"><label>Segment</label><select id="k_seg"><option value="">Svi kontakti sa saglasnošću</option>${S.segments.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Šablon</label><select id="k_tpl"><option value="">— prazno —</option></select></div></div>
    <div class="frow"><div class="field"><label>{aukcija}</label><input id="k_auk" value="${esc(S.siteAuctions.find((a) => a.status !== 'zavrsena')?.naziv || '')}"></div><div class="field"><label>{datum}</label><input id="k_dat" value="${esc((() => { const a = S.siteAuctions.find((x) => x.status !== 'zavrsena'); return a?.pocetak ? fmtDT(a.pocetak) : ''; })())}"></div></div>
    <div class="frow"><div class="field"><label>{konj}</label><input id="k_konj"></div><div class="field"><label>{lot}</label><input id="k_lot"></div><div class="field"><label>{link}</label><input id="k_link" value="${esc(SITE_URL)}"></div></div>
    <div class="field" id="k_subjw"><label>Naslov e-maila</label><input id="k_subj"></div>
    <div class="field"><label>Tekst *</label><textarea id="k_body" style="min-height:170px"></textarea></div>
    <div class="note-box" id="k_info"></div>
    <div class="sec">Pregled za prvog primaoca</div><div class="msg-body" id="k_prev"></div>
    <div class="row" style="margin-top:12px"><button class="btn" id="k_save">Napravi red za slanje</button><button class="btn ghost" data-close>Otkaži</button></div>`);
  const fillTpl = () => { const ch = $('#k_ch').value; $('#k_tpl').innerHTML = '<option value="">— prazno —</option>' + S.templates.filter((t) => t.channel === ch).map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join(''); $('#k_subjw').classList.toggle('hidden', ch !== 'email'); };
  const vars = () => ({ aukcija: $('#k_auk').value, datum: $('#k_dat').value, konj: $('#k_konj').value, lot: $('#k_lot').value, link: $('#k_link').value });
  const upd = () => { const ch = $('#k_ch').value; const seg = S.segments.find((s) => s.id === $('#k_seg').value); const all = seg ? segContacts(seg) : S.contacts; const ok = all.filter((c) => canSend(c, ch)); $('#k_info').innerHTML = `Primalaca: <b>${ok.length}</b>. Preskače se ${all.length - ok.length} (nemaju saglasnost za ${CHAN[ch]} ili nemaju ${ch === 'email' ? 'e-mail' : 'telefon'}).`; $('#k_prev').textContent = ok[0] ? fill($('#k_body').value, ok[0], vars()) : 'Nema primalaca u ovom izboru.'; };
  $('#k_ch').addEventListener('change', () => { fillTpl(); upd(); });
  $('#k_tpl').addEventListener('change', () => { const t = S.templates.find((x) => x.id === $('#k_tpl').value); if (t) { $('#k_body').value = t.body; $('#k_subj').value = t.subject || ''; if (!$('#k_name').value) $('#k_name').value = `${t.name} · ${CHAN[t.channel]}`; } upd(); });
  $('#mBody').addEventListener('input', upd); fillTpl(); upd();
  $('#k_save').addEventListener('click', async () => {
    const ch = $('#k_ch').value; const name = $('#k_name').value.trim(); const body = $('#k_body').value;
    if (!name || !body.trim()) { toast('Naziv i tekst su obavezni'); return; }
    const seg = S.segments.find((s) => s.id === $('#k_seg').value); const all = seg ? segContacts(seg) : S.contacts; const ok = all.filter((c) => canSend(c, ch));
    if (!ok.length) { toast('Nema primalaca sa saglasnošću'); return; }
    const v = vars();
    const [k] = await q(sb.from('e_campaigns').insert({ name, channel: ch, segment_id: seg?.id || null, template_id: $('#k_tpl').value || null, subject: $('#k_subj').value || null, body, vars: v, status: 'u_toku', excluded_count: all.length - ok.length, author: who() }).select());
    S.campaigns.unshift(k);
    const msgs = ok.map((c) => ({ campaign_id: k.id, contact_id: c.id, channel: ch, to_addr: ch === 'email' ? c.email : c.phone, body: fill(body, c, v), subject: ch === 'email' ? fill($('#k_subj').value, c, v) : null }));
    for (let i = 0; i < msgs.length; i += 500) await q(sb.from('e_messages').insert(msgs.slice(i, i + 500)));
    closeModal(); toast(`Red za slanje: ${msgs.length} poruka`); openCampaign(k.id);
  });
}
async function openCampaign(id) {
  const k = S.campaigns.find((x) => x.id === id); const msgs = await q(sb.from('e_messages').select('*').eq('campaign_id', id).order('created_at'));
  const sent = msgs.filter((m) => m.status === 'poslato').length;
  const link = (m) => { const c = C(m.contact_id) || {}; return m.channel === 'whatsapp' ? waLink(m.to_addr, m.body) : m.channel === 'viber' ? vbLink(m.to_addr) : mailLink(m.to_addr, m.subject, m.body); };
  drawer(esc(k.name), `${CHAN[k.channel]} · poslato ${sent} od ${msgs.length}${k.excluded_count ? ' · preskočeno ' + k.excluded_count + ' bez saglasnosti' : ''}`, `
    <div class="note-box">${k.channel === 'email' ? 'Svaka poruka otvara vaš e-mail sa popunjenim tekstom. Za masovno slanje izvezite CSV i ubacite ga u alat za e-mail kampanje.' : k.channel === 'whatsapp' ? 'Dodir na „Pošalji" otvara WhatsApp sa popunjenim tekstom za tog primaoca. Posle slanja označite poruku. Za masovno slanje treba nalog za WhatsApp Business API.' : 'Dodir na „Kopiraj i otvori" kopira tekst i otvara Viber razgovor, nalepite i pošaljite. Za masovno slanje treba Viber Business nalog kod provajdera (npr. Infobip).'}</div>
    <div class="row" style="margin-bottom:10px"><button class="btn sm ghost" id="k_csv">Izvoz CSV</button>${k.status !== 'poslata' ? '<button class="btn sm ghost" id="k_done">Označi kampanju kao poslatu</button>' : ''}<button class="btn sm danger" id="k_del">Obriši kampanju</button></div>
    ${msgs.map((m) => { const c = C(m.contact_id); return `<div class="li" data-msg="${m.id}"><span class="dot ${m.status === 'poslato' ? '' : 'late'}"></span><div class="grow"><div class="t">${esc(c?.name || m.to_addr)}</div><div class="s">${esc(m.to_addr || '')} · ${m.status === 'poslato' ? 'poslato ' + fmtDT(m.sent_at) + (m.sent_by ? ' · ' + esc(m.sent_by) : '') : m.status === 'preskoceno' ? 'preskočeno' : 'čeka'}</div><details><summary class="s" style="cursor:pointer">Tekst</summary><div class="msg-body">${esc(m.body)}</div></details></div>
      <div class="acts">${m.status !== 'poslato' ? `<a class="btn sm" href="${link(m)}" target="_blank" rel="noopener" data-send="${m.id}">${m.channel === 'viber' ? 'Kopiraj i otvori' : 'Pošalji'}</a><button class="btn sm ghost" data-mark="${m.id}">✓</button>` : '<span class="pill p-green">✓</span>'}</div></div>`; }).join('')}`);
  const mark = async (mid) => { const m = msgs.find((x) => x.id === mid); await q(sb.from('e_messages').update({ status: 'poslato', sent_at: new Date().toISOString(), sent_by: who() }).eq('id', mid)); m.status = 'poslato'; m.sent_at = new Date().toISOString(); m.sent_by = who(); await logAct(m.contact_id, m.channel, `${k.name}: ${m.body.slice(0, 300)}`); if (msgs.every((x) => x.status === 'poslato')) { await q(sb.from('e_campaigns').update({ status: 'poslata' }).eq('id', k.id)); k.status = 'poslata'; } openCampaign(id); };
  $$('[data-send]').forEach((a) => a.addEventListener('click', () => { const m = msgs.find((x) => x.id === a.dataset.send); if (m.channel === 'viber') copy(m.body); setTimeout(() => { if (confirm(`Da li je poruka poslata kontaktu ${C(m.contact_id)?.name || ''}?`)) mark(m.id); }, 1200); }));
  $$('[data-mark]').forEach((b) => b.addEventListener('click', () => mark(b.dataset.mark)));
  $('#k_csv').addEventListener('click', () => downloadCsv(`kampanja-${k.name}.csv`, [['ime', 'kanal', 'adresa', 'naslov', 'tekst', 'status'], ...msgs.map((m) => [C(m.contact_id)?.name || '', m.channel, m.to_addr || '', m.subject || '', m.body, m.status])]));
  if ($('#k_done')) $('#k_done').addEventListener('click', async () => { await q(sb.from('e_campaigns').update({ status: 'poslata' }).eq('id', k.id)); k.status = 'poslata'; closeDrawer(); render(); });
  $('#k_del').addEventListener('click', async () => { if (!confirm('Obrisati kampanju i njen red za slanje?')) return; await q(sb.from('e_campaigns').delete().eq('id', k.id)); S.campaigns = S.campaigns.filter((x) => x.id !== k.id); closeDrawer(); render(); });
}

/* ---------- KALENDAR ---------- */
VIEWS.kalendar = () => {
  const items = [];
  S.events.forEach((e) => items.push({ d: e.starts_at.slice(0, 10), t: e.starts_at, title: e.title, sub: [EVK[e.kind], e.place, e.contact_id && C(e.contact_id)?.name].filter(Boolean).join(' · '), kind: 'ev', id: e.id }));
  S.siteAuctions.filter((a) => a.pocetak).forEach((a) => items.push({ d: a.pocetak.slice(0, 10), t: a.pocetak, title: a.naziv, sub: `Aukcija · početak${a.lokacija ? ' · ' + a.lokacija : ''}`, kind: 'auk' }));
  S.siteAuctions.filter((a) => a.kraj).forEach((a) => items.push({ d: a.kraj.slice(0, 10), t: a.kraj, title: a.naziv, sub: 'Aukcija · kraj licitacije', kind: 'auk' }));
  S.contacts.filter((c) => c.next_follow_up).forEach((c) => items.push({ d: c.next_follow_up, t: c.next_follow_up + 'T09:00', title: 'Follow-up: ' + c.name, sub: KIND[c.kind], kind: 'fu', id: c.id }));
  S.tasks.filter((x) => x.due && !x.done).forEach((x) => items.push({ d: x.due, t: x.due + 'T10:00', title: x.title, sub: 'Zadatak' + (x.assignee ? ' · ' + x.assignee : ''), kind: 'task', id: x.id }));
  const from = addDays(today(), -7), to = addDays(today(), 90);
  const days = [...new Set(items.filter((i) => i.d >= from && i.d <= to).map((i) => i.d))].sort();
  return head('Kalendar', 'Aukcije sa sajta, pregledi konja, veterinar, fotografisanja, follow-upi i zadaci. Prethodnih 7 i narednih 90 dana.', `<button class="btn" data-act="newEvent">+ Događaj</button>`) +
    `<div class="panel"><div class="panel-b" style="padding-top:14px">${days.map((d) => `<div class="cal-day"><h4 class="${d === today() ? 'today' : ''}">${d === today() ? 'Danas · ' : ''}${new Date(d + 'T12:00:00').toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>${items.filter((i) => i.d === d).sort((a, b) => a.t.localeCompare(b.t)).map((i) => `<div class="li" ${i.kind === 'fu' ? `data-open-c="${i.id}"` : i.kind === 'ev' ? `data-open-ev="${i.id}"` : ''} style="cursor:pointer"><span class="dot" style="background:${{ auk: 'var(--gold)', fu: 'var(--ochre)', task: 'var(--blue)', ev: 'var(--sage)' }[i.kind]}"></span><div class="grow"><div class="t">${esc(i.title)}</div><div class="s">${i.t.length > 10 && i.kind !== 'fu' && i.kind !== 'task' ? new Date(i.t).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }) + ' · ' : ''}${esc(i.sub || '')}</div></div></div>`).join('')}</div>`).join('') || '<div class="empty">Nema događaja u ovom periodu.</div>'}</div></div>`;
};
BIND.kalendar = () => { bindCommon(); $$('[data-open-ev]').forEach((r) => r.addEventListener('click', () => eventForm(S.events.find((e) => e.id === r.dataset.openEv)))); };
function eventForm(e = {}) {
  modal(e.id ? 'Događaj' : 'Novi događaj', `
    <div class="field"><label>Naziv *</label><input id="e_title" value="${esc(e.title || '')}"></div>
    <div class="frow"><div class="field"><label>Vrsta</label><select id="e_kind">${Object.entries(EVK).map(([k, t]) => `<option value="${k}" ${e.kind === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field"><label>Početak *</label><input id="e_start" type="datetime-local" value="${e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : today() + 'T10:00'}"></div></div>
    <div class="frow"><div class="field"><label>Mesto</label><input id="e_place" value="${esc(e.place || '')}"></div><div class="field"><label>Kontakt</label><select id="e_contact"><option value="">—</option>${S.contacts.slice(0, 800).map((c) => `<option value="${c.id}" ${e.contact_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div></div>
    <div class="field"><label>Napomena</label><textarea id="e_note">${esc(e.note || '')}</textarea></div>
    <div class="row"><button class="btn" id="e_save">Sačuvaj</button>${e.id ? '<button class="btn danger" id="e_del">Obriši</button>' : ''}<button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#e_save').addEventListener('click', async () => { const row = { title: $('#e_title').value.trim(), kind: $('#e_kind').value, starts_at: new Date($('#e_start').value).toISOString(), place: $('#e_place').value || null, contact_id: $('#e_contact').value || null, note: $('#e_note').value || null, author: who() }; if (!row.title) { toast('Naziv je obavezan'); return; } if (e.id) { const [x] = await q(sb.from('e_events').update(row).eq('id', e.id).select()); Object.assign(e, x); } else { const [x] = await q(sb.from('e_events').insert(row).select()); S.events.push(x); if (row.contact_id) await logAct(row.contact_id, 'sastanak', `${EVK[row.kind]}: ${row.title}, ${fmtDT(row.starts_at)}`); } closeModal(); render(); });
  if (e.id) $('#e_del').addEventListener('click', async () => { if (!confirm('Obrisati događaj?')) return; await q(sb.from('e_events').delete().eq('id', e.id)); S.events = S.events.filter((x) => x.id !== e.id); closeModal(); render(); });
}
/* ---------- ISTORIJA ---------- */
const TBL = { e_contacts: 'Kontakt', e_horses: 'Konj', e_deals: 'Pipeline', e_tasks: 'Zadatak', e_events: 'Događaj', e_segments: 'Segment', e_templates: 'Šablon', e_campaigns: 'Kampanja' };
VIEWS.istorija = () => head('Istorija', 'Ko je šta promenio i kada. Obrisani kontakti mogu da se vrate.', '') + `<div class="panel"><div class="panel-b" id="audit"><div class="empty">Učitavam…</div></div></div>`;
BIND.istorija = async () => {
  const rows = await q(sb.from('e_audit').select('*').order('at', { ascending: false }).limit(300));
  const label = (r) => { const x = r.after || r.before || {}; return x.name || x.title || x.stage || ''; };
  const diff = (r) => { if (r.op !== 'UPDATE') return ''; const ch = Object.keys(r.after || {}).filter((k) => !['updated_at', 'phone_norm', 'stage_since'].includes(k) && JSON.stringify(r.before?.[k]) !== JSON.stringify(r.after?.[k])); return ch.slice(0, 4).map((k) => `${k}: ${esc(JSON.stringify(r.before?.[k] ?? '—'))} → ${esc(JSON.stringify(r.after?.[k] ?? '—'))}`).join('<br>'); };
  $('#audit').innerHTML = rows.map((r) => `<div class="li"><span class="dot" style="background:${r.op === 'DELETE' || (r.op === 'UPDATE' && r.after?.deleted_at && !r.before?.deleted_at) ? 'var(--clay)' : r.op === 'INSERT' ? 'var(--gold)' : 'var(--sage)'}"></span><div class="grow"><div class="t">${TBL[r.tbl] || r.tbl}: ${esc(label(r))}</div><div class="s">${{ INSERT: 'dodato', UPDATE: r.after?.deleted_at && !r.before?.deleted_at ? 'obrisano' : 'izmenjeno', DELETE: 'obrisano' }[r.op]} · ${esc(r.actor || '')} · ${fmtDT(r.at)}</div>${diff(r) ? `<div class="s" style="font-family:ui-monospace,monospace;font-size:11.5px;margin-top:3px">${diff(r)}</div>` : ''}</div>${r.tbl === 'e_contacts' && r.after?.deleted_at && !r.before?.deleted_at ? `<button class="btn sm ghost" data-restore="${esc(r.row_id)}">Vrati</button>` : ''}</div>`).join('') || '<div class="empty">Još nema izmena.</div>';
  $$('[data-restore]').forEach((b) => b.addEventListener('click', async () => { await q(sb.from('e_contacts').update({ deleted_at: null }).eq('id', b.dataset.restore)); await loadAll(); toast('Kontakt vraćen'); render(); }));
};

/* ---------- PODEŠAVANJA ---------- */
VIEWS.podesavanja = () => {
  const st = setting('site_status', 'nije povezano'); const on = st.startsWith('povezano');
  return head('Podešavanja', 'Veza sa EQUIVRA sajtom radi sama, kao Shopify kod Harizme.', '') + `
  <div class="grid2"><div class="panel"><div class="panel-h"><h2>Veza sa sajtom</h2><span class="pill ${on ? 'p-green' : 'p-ochre'}">${esc(on ? 'Povezano' : st.charAt(0).toUpperCase() + st.slice(1))}</span></div><div class="panel-b" style="padding-top:12px">
    ${on ? `<p style="margin-top:0;font-size:14px;color:var(--ink-2)">Server na svakih 5 minuta sam povlači nove registracije, prijave konja, poruke, newsletter prijave i ponude sa sajta. Ne morate ništa da radite.</p>
      <div class="kv"><span>Nalog sajta</span><b>${esc(setting('site_account', '—'))}</b></div>
      <div class="kv"><span>Poslednja provera</span><b>${setting('site_last_sync') ? fmtDT(setting('site_last_sync')) : '—'}</b></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="sync">↻ Proveri odmah</button><button class="btn ghost" id="siteFull">Povuci sve ponovo</button><button class="btn danger" id="siteOut">Prekini vezu</button></div>` :
    `<p style="margin-top:0;font-size:14px;color:var(--ink-2)">Povezuje se jednom, admin nalogom sa sajta (equivra@gmail.com). Lozinka se ne čuva nigde, server pamti samo vezu i od tada sam povlači podatke na svakih 5 minuta.</p>
      <div class="field"><label>E-mail admin naloga na sajtu</label><input id="se" type="email" value="${esc(setting('site_account', 'equivra@gmail.com'))}" autocomplete="username"></div>
      <div class="field"><label>Lozinka sa sajta</label><input id="sp" type="password" autocomplete="current-password"></div>
      <button class="btn" id="siteIn">Poveži sajt</button><div class="err" id="serr"></div>`}
  </div></div>
  <div class="panel"><div class="panel-h"><h2>Poruke i kanali</h2></div><div class="panel-b" style="padding-top:12px;font-size:14px;color:var(--ink-2)">
    <p style="margin-top:0">Kampanje rade preko reda za slanje: jedan dodir po primaocu otvara WhatsApp, Viber ili e-mail sa gotovim tekstom. Poruke idu samo kontaktima koji su dali saglasnost.</p>
    <p>Za potpuno automatsko masovno slanje potreban je WhatsApp Business API (Meta) i Viber Business nalog kod provajdera (npr. Infobip).</p>
  </div></div>
  <div class="panel"><div class="panel-h"><h2>Obaveštenja i zvuk</h2><span class="pill ${pushState() === 'on' ? 'p-green' : 'p-ochre'}">${pushState() === 'on' ? 'Uključeno' : 'Isključeno'}</span></div><div class="panel-b" style="padding-top:12px;font-size:14px;color:var(--ink-2)">
    <p style="margin-top:0">Na telefon i računar stiže: novi zadatak za tebe, hitan zadatak, rok koji ističe, završen zadatak i sve novo sa sajta (registracija, prijava konja, poruka, ponuda). Uključuje se posebno na svakom uređaju.</p>
    <div class="row">${pushState() === 'on' ? `<button class="btn ghost" id="pushTest">Pošalji probno</button><button class="btn ghost" id="pushOff">Isključi na ovom uređaju</button>` : `<button class="btn" id="pushOn">📱 Uključi obaveštenja</button>`}<button class="btn ghost" data-soundbtn id="sndBtn">${soundOn() ? '🔔 Zvuci uključeni' : '🔕 Zvuci isključeni'}</button></div>
  </div></div></div>`;
};
async function fn(body) {
  const { data, error } = await sb.functions.invoke('crm-equivra', { body });
  if (error) { let msg = error.message; try { const j = await error.context.json(); msg = j.error || msg; } catch (e) {} throw new Error(msg); }
  if (data && data.ok === false) throw new Error(data.error || 'greška');
  return data;
}
async function reloadSettings() { S.settings = await q(sb.from('e_settings').select('*')); }
BIND.podesavanja = () => {
  bindCommon();
  if ($('#siteIn')) $('#siteIn').addEventListener('click', async () => {
    const btn = $('#siteIn'); btn.disabled = true; btn.textContent = 'Povezujem…'; $('#serr').textContent = '';
    try { const r = await fn({ connect: true, email: $('#se').value.trim(), password: $('#sp').value }); $('#sp').value = ''; toast(`Sajt povezan, prebačeno ${r.res?.processed ?? 0} zapisa`); await reloadSettings(); await loadAll(); render(); }
    catch (e) { $('#serr').textContent = 'Povezivanje nije uspelo: ' + e.message; btn.disabled = false; btn.textContent = 'Poveži sajt'; }
  });
  if ($('#pushOn')) $('#pushOn').addEventListener('click', pushEnable);
  if ($('#pushOff')) $('#pushOff').addEventListener('click', pushDisable);
  if ($('#pushTest')) $('#pushTest').addEventListener('click', async () => { try { const r = await fn({ testPush: true }); toast(r.res?.sent ? 'Poslato, proveri telefon' : 'Nema uređaja za slanje'); } catch (e) { toast(e.message); } });
  $('#sndBtn').addEventListener('click', () => setSound(!soundOn()));
  if ($('#siteFull')) $('#siteFull').addEventListener('click', () => syncSite(true));
  if ($('#siteOut')) $('#siteOut').addEventListener('click', async () => { if (!confirm('Prekinuti automatsku vezu sa sajtom?')) return; await fn({ disconnect: true }); await reloadSettings(); render(); });
};

/* ---------- SINHRONIZACIJA SA SAJTA ---------- */
async function syncSite(full = false) {
  if (!setting('site_status', '').startsWith('povezano')) { toast('Prvo povežite sajt (jednom)'); go('podesavanja'); return; }
  toast('Proveravam sajt…');
  try { const r = await fn({ sync: true, full }); await reloadSettings(); await loadAll(); await loadSite(); toast(r.res?.errors ? `Gotovo, ${r.res.errors} grešaka` : 'Sve je ažurno sa sajta'); render(); }
  catch (e) { toast('Sinhronizacija: ' + e.message); await reloadSettings(); render(); }
}

/* ---------- CSV ---------- */
function downloadCsv(name, rows) { const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); }
function exportContacts() { downloadCsv('equivra-kontakti.csv', [['ime', 'firma', 'tip', 'telefon', 'email', 'grad', 'drzava', 'izvor', 'ocena', 'discipline', 'budzet_od', 'budzet_do', 'email_saglasnost', 'viber_saglasnost', 'whatsapp_saglasnost', 'oznake', 'napomena'], ...S.contacts.map((c) => [c.name, c.company, KIND[c.kind], c.phone, c.email, c.city, c.country, SRC[c.source], RATING[c.rating], (c.disciplines || []).join(','), c.budget_from, c.budget_to, c.email_optin ? 'da' : 'ne', c.viber_optin ? 'da' : 'ne', c.whatsapp_optin ? 'da' : 'ne', (c.tags || []).join(','), c.note])]); }
function importContacts() {
  modal('Uvoz kontakata (CSV)', `<p style="margin-top:0;font-size:14px;color:var(--ink-2)">Kolone (prvi red je zaglavlje, razdvojeno ; ili ,): <b>ime</b>, telefon, email, grad, tip, discipline, napomena. Duplikati (isti telefon ili e-mail) se preskaču.</p>
    <div class="field"><label>Fajl</label><input type="file" id="i_file" accept=".csv,text/csv"></div>
    <div class="field"><label>Saglasnost uvezenih kontakata</label><select id="i_cons"><option value="">Bez saglasnosti (ne dobijaju marketing)</option><option value="email">Pristali na e-mail</option><option value="viber">Pristali na Viber</option><option value="whatsapp">Pristali na WhatsApp</option><option value="all">Pristali na sva tri kanala</option></select></div>
    <div class="field"><label>Odakle su kontakti</label><select id="i_src">${Object.entries(SRC).map(([k, t]) => `<option value="${k}" ${k === 'uvoz' ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="note-box" id="i_info">Izaberite fajl.</div>
    <div class="row"><button class="btn" id="i_go" disabled>Uvezi</button><button class="btn ghost" data-close>Otkaži</button></div>`);
  let rows = [];
  $('#i_file').addEventListener('change', async (e) => {
    const txt = await e.target.files[0].text(); const lines = txt.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()); const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const parse = (l) => { const out = []; let cur = '', inq = false; for (const ch of l) { if (ch === '"') inq = !inq; else if (ch === sep && !inq) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
    const hdr = parse(lines[0]).map(fold); const idx = (k) => hdr.findIndex((h) => h.startsWith(k));
    const iN = idx('ime'), iP = idx('tel'), iE = idx('email') >= 0 ? idx('email') : idx('e-mail'), iC = idx('grad'), iK = idx('tip'), iD = idx('discip'), iNo = idx('napom');
    rows = lines.slice(1).map(parse).map((r) => ({ name: r[iN], phone: iP >= 0 ? r[iP] : '', email: iE >= 0 ? r[iE] : '', city: iC >= 0 ? r[iC] : '', kind: iK >= 0 ? Object.keys(KIND).find((k) => fold(KIND[k]) === fold(r[iK])) || 'kupac' : 'kupac', disciplines: iD >= 0 ? (r[iD] || '').split(/[,/]/).map((x) => Object.keys(DISC).find((k) => fold(DISC[k]) === fold(x.trim()))).filter(Boolean) : [], note: iNo >= 0 ? r[iNo] : '' })).filter((r) => r.name);
    const fresh = rows.filter((r) => !S.contacts.some((c) => (r.phone && normPhone(c.phone) === normPhone(r.phone)) || (r.email && (c.email || '').toLowerCase() === r.email.toLowerCase())));
    $('#i_info').innerHTML = `Pronađeno <b>${rows.length}</b> redova, novih <b>${fresh.length}</b> (ostalo su duplikati).`; rows = fresh; $('#i_go').disabled = !fresh.length;
  });
  $('#i_go').addEventListener('click', async () => {
    const cons = $('#i_cons').value; const src = $('#i_src').value;
    const data = rows.map((r) => ({ ...r, phone: r.phone || null, email: r.email || null, city: r.city || null, note: r.note || null, source: src, owner: who(), ...(['email', 'viber', 'whatsapp'].reduce((o, ch) => { if (cons === ch || cons === 'all') { o[ch + '_optin'] = true; o[ch + '_optin_src'] = src; } return o; }, {})) }));
    for (let i = 0; i < data.length; i += 300) await q(sb.from('e_contacts').insert(data.slice(i, i + 300)));
    closeModal(); await loadAll(); toast(`Uvezeno ${data.length} kontakata`); render();
  });
}

/* ---------- pretraga ---------- */
$('#q').addEventListener('input', () => {
  const qq = fold($('#q').value.trim()); const box = $('#sres');
  if (qq.length < 2) { box.classList.add('hidden'); return; }
  const cs = S.contacts.filter((c) => fold([c.name, c.company, c.phone, c.email, c.city].join(' ')).includes(qq) || (normPhone(qq) && normPhone(c.phone).includes(normPhone(qq).replace(/^381/, '')))).slice(0, 8);
  const hs = [...S.horses, ...S.siteHorses.map(siteAsHorse)].filter((h) => fold([h.name, h.breed, h.sire, h.dam].join(' ')).includes(qq)).slice(0, 5);
  box.innerHTML = cs.map((c) => `<div data-open-c="${c.id}">${esc(c.name)}<small>${KIND[c.kind]} · ${esc(c.phone || c.email || '')}</small></div>`).join('') + hs.map((h) => `<div data-open-h="${h.id}">🐎 ${esc(h.name)}<small>${h.site ? 'Lot ' + h.lot_no + ' · sajt' : 'u pripremi'}</small></div>`).join('') || '<div>Nema rezultata</div>';
  box.classList.remove('hidden');
});
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) $('#sres').classList.add('hidden'); });

/* ---------- drawer / modal ---------- */
function drawer(title, sub, html) { $('#drTitle').innerHTML = title; $('#drSub').innerHTML = sub || ''; $('#drBody').innerHTML = html; $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('open'); bindCommon($('#drBody')); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); if (!$('#modal').classList.contains('open')) $('#scrim').classList.remove('open'); }
function modal(title, html) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').classList.add('open'); $('#scrim').classList.add('open'); bindClose($('#mBody')); setTimeout(() => $('#mBody input, #mBody textarea')?.focus(), 50); }
function closeModal() { $('#modal').classList.remove('open'); if (!$('#drawer').classList.contains('open')) $('#scrim').classList.remove('open'); }
function bindClose(root) { $$('[data-close]', root).forEach((b) => b.addEventListener('click', closeModal)); }
$$('#drawer [data-close]').forEach((b) => b.addEventListener('click', closeDrawer));
$$('#modal .m-h [data-close]').forEach((b) => b.addEventListener('click', closeModal));
$('#scrim').addEventListener('click', () => { closeModal(); closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });

/* ---------- zajedničke akcije ---------- */
function bindCommon(root = document) {
  $$('[data-open-c]', root).forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('a,button,select,input')) return; e.preventDefault(); $('#sres').classList.add('hidden'); openContact(el.dataset.openC); }));
  $$('[data-open-h]', root).forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('a,button,select,input')) return; $('#sres').classList.add('hidden'); openHorse(el.dataset.openH); }));
  $$('[data-task-done]', root).forEach((cb) => cb.addEventListener('change', () => toggleTask(cb.dataset.taskDone, cb)));
  $$('[data-tk-done]', root).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); toggleTask(b.dataset.tkDone, b); }));
  $$('[data-tk]', root).forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('a,button,input,select')) return; openTask(el.dataset.tk); }));
  $$('[data-act]', root).forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault(); const a = b.dataset.act; const id = b.dataset.id;
    if (a === 'newContact') contactForm();
    if (a === 'editContact') contactForm(C(id));
    if (a === 'delContact') { if (!confirm('Obrisati kontakt? Može se vratiti iz Istorije.')) return; await q(sb.from('e_contacts').update({ deleted_at: new Date().toISOString() }).eq('id', id)); S.contacts = S.contacts.filter((c) => c.id !== id); closeDrawer(); render(); }
    if (a === 'addAct') { const body = $('#actBody').value.trim(); if (!body) return; await logAct(id, $('#actKind').value, body); toast('Sačuvano'); openContact(id); }
    if (a === 'toPipe') dealForm(b.dataset.pipe, id);
    if (a === 'newDeal') dealForm();
    if (a === 'newHorse') horseForm();
    if (a === 'editHorse') horseForm(H(id));
    if (a === 'newTask') taskForm();
    if (a === 'newEvent') eventForm();
    if (a === 'newSegment') segmentForm();
    if (a === 'newTemplate') templateForm();
    if (a === 'newCampaign') campaignForm();
    if (a === 'exportCsv') exportContacts();
    if (a === 'importCsv') importContacts();
    if (a === 'sync') syncSite();
  }));
}


/* ================= ZADACI (ko šta treba da radi) ================= */
const TEAM = { katarinabrzovan: { name: 'Kaca', f: true }, kaca: { name: 'Kaca', f: true }, konstantin: { name: 'Konstantin', f: false }, djole: { name: 'Đole', f: false } };
const PRIO = { hitno: 'Hitno', visok: 'Visok', normal: 'Normalan' };
const personName = (k) => (TEAM[k]?.name || (k ? String(k).charAt(0).toUpperCase() + String(k).slice(1) : 'Niko'));
const isF = (k) => !!TEAM[k]?.f;
const avCls = (k) => (k === 'konstantin' ? 'av-k' : k === 'djole' ? 'av-d' : TEAM[k] ? 'av-c' : 'av-o');
const teamKeys = () => { const ks = Object.keys(TEAM).filter((k) => k !== 'kaca'); if (S.user && !ks.includes(who())) ks.unshift(who()); return ks; };
const taskWhen = (x) => (x.due_at ? new Date(x.due_at) : x.due ? new Date(x.due + 'T23:59:00') : null);
function dueTxt(x) {
  if (!x.due) return 'bez roka';
  const d = x.due, t = today(), tm = x.due_at ? ' u ' + new Date(x.due_at).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' }) : '';
  if (d < t) return `kasni ${daysIn(d + 'T12:00:00') || 1} d`;
  if (d === t) return 'danas' + tm;
  if (d === addDays(t, 1)) return 'sutra' + tm;
  return new Date(d + 'T12:00:00').toLocaleDateString('sr-Latn-RS', { weekday: 'short', day: 'numeric', month: 'short' }) + tm;
}
function dueLvl(x) { if (!x.due || x.done) return ''; const t = today(); const late = x.due < t || (x.due_at && new Date(x.due_at) < new Date()); return late ? 'late' : x.due === t ? 'today' : ''; }
const myOpen = () => S.tasks.filter((x) => !x.done && (x.assignee === who() || !x.assignee));
function taskBadge() { const b = document.querySelector('#nav button[data-v="zadaci"] .badge'); const k = myOpen().filter((x) => dueLvl(x)).length; if (b) { b.textContent = k; b.classList.toggle('hidden', !k); } }

function taskRow(x) {
  const lv = dueLvl(x), c = x.contact_id && C(x.contact_id);
  return `<div class="tk ${x.done ? 'is-done' : ''} ${x.priority === 'hitno' && !x.done ? 'urgent' : ''}" data-tk="${x.id}">
    <button class="tk-check" data-tk-done="${x.id}" aria-label="${x.done ? 'Vrati u otvorene' : 'Završi'}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg></button>
    <div class="grow"><div class="tk-t">${esc(x.title)}</div>
      <div class="tk-m">${x.priority && x.priority !== 'normal' ? `<span class="tk-pr ${x.priority}">${PRIO[x.priority]}</span>` : ''}<span class="tk-due ${lv}">⏱ ${esc(x.done ? 'završeno ' + fmtD(x.done_at) : dueTxt(x))}</span>${c ? `<span class="tk-c">👤 ${esc(c.name)}</span>` : ''}${x.note ? '<span class="tk-c">📝</span>' : ''}${x.author && x.author !== x.assignee ? `<span class="tk-c">od ${esc(personName(x.author))}</span>` : ''}</div></div>
    <span class="av ${avCls(x.assignee)}" title="${esc(personName(x.assignee))}">${esc(personName(x.assignee).charAt(0))}</span></div>`;
}
VIEWS.zadaci = () => {
  const tab = S.tkTab || 'moji', me = who(), t = today();
  let list = S.tasks.filter((x) => (tab === 'zavrseni' ? x.done : !x.done));
  if (tab === 'moji') list = list.filter((x) => x.assignee === me || !x.assignee);
  if (tab === 'dodelio') list = list.filter((x) => x.author === me && x.assignee && x.assignee !== me);
  if (S.tkWho) list = list.filter((x) => x.assignee === S.tkWho);
  const pr = { hitno: 0, visok: 1, normal: 2 };
  list.sort((a, b) => (tab === 'zavrseni' ? String(b.done_at).localeCompare(String(a.done_at)) : (pr[a.priority] ?? 2) - (pr[b.priority] ?? 2) || String(a.due || '9').localeCompare(String(b.due || '9')) || String(a.due_at || '').localeCompare(String(b.due_at || ''))));
  const groups = tab === 'zavrseni' ? [['Završeno', list.slice(0, 80)]] : [
    ['Kasni', list.filter((x) => x.due && dueLvl(x) === 'late')], ['Danas', list.filter((x) => x.due === t && dueLvl(x) !== 'late')], ['Sutra', list.filter((x) => x.due === addDays(t, 1))],
    ['Ove nedelje', list.filter((x) => x.due > addDays(t, 1) && x.due <= addDays(t, 7))], ['Kasnije', list.filter((x) => x.due > addDays(t, 7))], ['Bez roka', list.filter((x) => !x.due)]];
  const cnt = (k) => S.tasks.filter((x) => !x.done && x.assignee === k).length;
  return head('Zadaci', 'Ko šta treba da radi. Kad nekome dodelite zadatak, odmah mu stiže obaveštenje na telefon.', `<button class="btn" data-act="newTask">+ Novi zadatak</button>`) + `
  <form class="tk-quick" id="tkQuick"><input id="tkqT" placeholder="Brzo dodaj zadatak i pritisni Enter…" autocomplete="off"><select id="tkqA">${teamKeys().map((k) => `<option value="${k}" ${k === me ? 'selected' : ''}>${esc(personName(k))}</option>`).join('')}</select><select id="tkqD"><option value="${t}">Danas</option><option value="${addDays(t, 1)}">Sutra</option><option value="${addDays(t, 7)}">Za nedelju</option><option value="">Bez roka</option></select><button class="btn">Dodaj</button></form>
  <div class="tk-bar"><div class="seg">${[['moji', 'Moji'], ['svi', 'Svi otvoreni'], ['dodelio', 'Dodelio/la sam'], ['zavrseni', 'Završeni']].map(([k, l]) => `<button data-tktab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="tk-people">${teamKeys().map((k) => `<button data-tkwho="${k}" class="${S.tkWho === k ? 'on' : ''}" title="${esc(personName(k))}"><span class="av ${avCls(k)}">${esc(personName(k).charAt(0))}</span>${esc(personName(k))} <b>${cnt(k)}</b></button>`).join('')}</div></div>
  ${list.length ? groups.filter(([, l]) => l.length).map(([g, l]) => `<div class="panel tk-group"><div class="panel-h"><h2>${g}</h2><span class="pill ${g === 'Kasni' ? 'p-clay' : g === 'Danas' ? 'p-ochre' : ''}">${l.length}</span></div><div class="panel-b">${l.map(taskRow).join('')}</div></div>`).join('')
    : `<div class="panel"><div class="empty big"><div class="empty-ic">✓</div>${tab === 'zavrseni' ? 'Još nema završenih zadataka.' : 'Sve je urađeno. Nema otvorenih zadataka.'}</div></div>`}`;
};
BIND.zadaci = () => {
  bindCommon();
  $$('[data-tktab]').forEach((b) => b.addEventListener('click', () => { S.tkTab = b.dataset.tktab; sfx('tick', 1, true); render(); }));
  $$('[data-tkwho]').forEach((b) => b.addEventListener('click', () => { S.tkWho = S.tkWho === b.dataset.tkwho ? '' : b.dataset.tkwho; sfx('tick', 1, true); render(); }));
  $('#tkQuick').addEventListener('submit', async (e) => {
    e.preventDefault(); const title = $('#tkqT').value.trim(); if (!title) return;
    const row = { title, assignee: $('#tkqA').value || null, due: $('#tkqD').value || null, author: who(), priority: 'normal' };
    const [x] = await q(sb.from('e_tasks').insert(row).select()); S.tasks.push(x); render(); taskPop(x.assignee && x.assignee !== who() ? 'assign' : 'new', x); setTimeout(() => $('#tkqT')?.focus(), 30);
  });
};
async function toggleTask(id, el) {
  const x = S.tasks.find((t) => t.id === id); if (!x) return;
  const done = !x.done;
  if (el) { el.closest('.tk, .li')?.classList.add(done ? 'finishing' : 'reopen'); }
  const patch = done ? { done: true, done_at: new Date().toISOString(), done_by: who() } : { done: false, done_at: null, done_by: null };
  const [nx] = await q(sb.from('e_tasks').update(patch).eq('id', id).select()); Object.assign(x, nx);
  if (done) { taskPop('done', x); if (x.contact_id) logAct(x.contact_id, 'beleska', 'Završeno: ' + x.title).catch(() => {}); } else { sfx('restore'); toast('Vraćeno u otvorene'); }
  setTimeout(() => { render(); taskBadge(); }, done ? 480 : 0);
}
function openTask(id) { const x = S.tasks.find((t) => t.id === id); if (x) taskForm(x); }
function taskForm(x = {}, preset = {}) {
  const t = today(), tm = x.due_at ? new Date(x.due_at).toTimeString().slice(0, 5) : '';
  modal(x.id ? 'Zadatak' : 'Novi zadatak', `<div class="field"><label>Šta treba uraditi *</label><input id="x_title" value="${esc(x.title || preset.title || '')}"></div>
    <div class="frow"><div class="field"><label>Ko radi</label><select id="x_as">${teamKeys().map((k) => `<option value="${k}" ${(x.assignee || preset.assignee || who()) === k ? 'selected' : ''}>${esc(personName(k))}</option>`).join('')}</select></div>
      <div class="field"><label>Prioritet</label><select id="x_pr">${Object.entries(PRIO).map(([k, l]) => `<option value="${k}" ${(x.priority || 'normal') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="frow"><div class="field"><label>Rok</label><input id="x_due" type="date" value="${x.id ? x.due || '' : preset.due ?? t}"></div><div class="field"><label>Vreme (opciono)</label><input id="x_tm" type="time" value="${tm}"></div></div>
    <div class="field"><label>Kontakt</label><select id="x_c"><option value="">—</option>${S.contacts.slice(0, 1500).map((c) => `<option value="${c.id}" ${(x.contact_id || preset.contact_id) === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Detalji</label><textarea id="x_note" placeholder="Opis, brojevi, linkovi…">${esc(x.note || '')}</textarea></div>
    ${x.id ? `<div class="note-box" style="font-size:12.5px">Napravio/la ${esc(personName(x.author))} · ${fmtDT(x.created_at)}${x.done ? ` · završio/la ${esc(personName(x.done_by))} ${fmtDT(x.done_at)}` : ''}</div>` : ''}
    <div class="row"><button class="btn" id="x_save">${x.id ? 'Sačuvaj' : 'Dodaj zadatak'}</button>${x.id ? `<button class="btn ghost" id="x_tg">${x.done ? '↺ Vrati u otvorene' : '✓ Završi'}</button><button class="btn danger" id="x_del">Obriši</button>` : ''}<button class="btn ghost" data-close>Otkaži</button></div>`);
  $('#x_save').addEventListener('click', async () => {
    const title = $('#x_title').value.trim(); if (!title) { sfx('error'); $('#x_title').focus(); return; }
    const due = $('#x_due').value || null, tmv = $('#x_tm').value;
    const row = { title, assignee: $('#x_as').value || null, priority: $('#x_pr').value, due, due_at: due && tmv ? new Date(due + 'T' + tmv).toISOString() : null, contact_id: $('#x_c').value || null, note: $('#x_note').value.trim() || null };
    if (x.id) { const before = x.assignee; const [nx] = await q(sb.from('e_tasks').update(row).eq('id', x.id).select()); Object.assign(x, nx); closeModal(); render(); if (before !== nx.assignee && nx.assignee !== who()) taskPop('assign', nx); else { sfx('check'); toast('Sačuvano'); } }
    else { const [nx] = await q(sb.from('e_tasks').insert({ ...row, author: who() }).select()); S.tasks.push(nx); closeModal(); render(); taskPop(nx.assignee && nx.assignee !== who() ? 'assign' : 'new', nx); }
    taskBadge();
  });
  if (x.id) {
    $('#x_tg').addEventListener('click', () => { closeModal(); toggleTask(x.id); });
    $('#x_del').addEventListener('click', async () => { if (!confirm('Obrisati zadatak?')) return; await q(sb.from('e_tasks').delete().eq('id', x.id)); S.tasks = S.tasks.filter((y) => y.id !== x.id); closeModal(); sfx('trash'); render(); taskBadge(); });
  }
}

/* ================= OBAVEŠTENJA (zvonce + telefon) ================= */
const VAPID_PUBLIC = 'BO9fqbcK6L9yA4bKN-m3gp2RxmbZ6Gt7UOsIjGDzOZDScOuWOtwSWT_nM8GeM__UZr6vE2bBSH2ou37jkf5_MTg';
S.notifs = [];
const forMe = (nf) => (nf.username === who() || nf.username === '*') && nf.actor !== who();
const unread = () => S.notifs.filter((nf) => !(nf.read_by || []).includes(who()));
async function loadNotifs() { try { const rows = await q(sb.from('e_notifs').select('*').order('created_at', { ascending: false }).limit(150)); S.notifs = rows.filter(forMe); } catch (e) { S.notifs = []; } bellBadge(); }
function bellBadge() { const b = $('#bellN'); if (!b) return; const k = unread().length; b.textContent = k > 9 ? '9+' : k; b.classList.toggle('hidden', !k); }
function openGo(go) {
  if (!go) return; const [k, id] = String(go).split(':');
  if (k === 'task') { go_('zadaci'); setTimeout(() => openTask(id), 60); }
  else if (k === 'contact' && id) openContact(id);
  else go_(k);
}
const go_ = (v) => go(v);
function bellMenu() {
  const m = $('#bellMenu'); const open = m.classList.toggle('open');
  if (!open) return;
  m.innerHTML = `<div class="bm-h"><b>Obaveštenja</b><button class="btn sm ghost" id="bmRead">Označi sve pročitano</button></div>
    <div class="bm-list">${S.notifs.slice(0, 40).map((nf) => `<button class="bm-i ${(nf.read_by || []).includes(who()) ? '' : 'new'} k-${nf.kind}" data-nf="${nf.id}"><span class="bm-ic">${{ task: '☑', urgent: '🚨', done: '✓', lead: '🐎', deadline: '⏰' }[nf.kind] || '✦'}</span><span class="grow"><b>${esc(nf.title)}</b><small>${esc(nf.body || '')}</small><em>${nf.actor && !['sistem'].includes(nf.actor) ? esc(personName(nf.actor)) + ' · ' : ''}${ago(nf.created_at)}</em></span></button>`).join('') || '<div class="empty">Još nema obaveštenja.</div>'}</div>
    <div class="bm-f"><button class="btn sm ghost" data-soundbtn onclick="setSound(!soundOn())">${soundOn() ? '🔔 Zvuci uključeni' : '🔕 Zvuci isključeni'}</button><button class="btn sm ghost" id="bmPush">${pushState() === 'on' ? '📱 Telefon: uključeno' : '📱 Uključi na telefonu'}</button></div>`;
  sfx('soft');
  $$('[data-nf]', m).forEach((b) => b.addEventListener('click', () => { const nf = S.notifs.find((x) => x.id === b.dataset.nf); m.classList.remove('open'); markRead([nf]); openGo(nf.go); }));
  $('#bmRead').addEventListener('click', () => { markRead(unread()); m.classList.remove('open'); sfx('check'); });
  $('#bmPush').addEventListener('click', () => { m.classList.remove('open'); pushEnable(); });
}
async function markRead(list) {
  list = list.filter((nf) => nf && !(nf.read_by || []).includes(who())); if (!list.length) return;
  list.forEach((nf) => { nf.read_by = [...(nf.read_by || []), who()]; }); bellBadge();
  await Promise.all(list.map((nf) => sb.from('e_notifs').update({ read_by: nf.read_by }).eq('id', nf.id)));
}
document.addEventListener('click', (e) => { const m = $('#bellMenu'); if (m && m.classList.contains('open') && !e.target.closest('#bellMenu, #bell')) m.classList.remove('open'); });

/* web push: obaveštenje stiže i kad je CRM zatvoren */
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function pushState() { if (!pushSupported()) return isIOS() && !isStandalone() ? 'ios' : 'no'; if (Notification.permission === 'denied') return 'denied'; return Notification.permission === 'granted' && LS.get('eq_push', '') === '1' ? 'on' : 'off'; }
function b64uToU8(s) { const p = '='.repeat((4 - (s.length % 4)) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map((c) => c.charCodeAt(0))); }
async function pushSave(sub) { const j = sub.toJSON(); await sb.from('e_push_subs').upsert({ username: who(), endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' }); }
async function pushEnable() {
  const st = pushState();
  if (st === 'ios') return modal('Obaveštenja na iPhone-u', `<p style="margin-top:0">Na iPhone-u obaveštenja rade kad je CRM dodat na početni ekran:</p><ol style="padding-left:18px;line-height:1.8"><li>U Safariju dodirni <b>Podeli</b> (kvadrat sa strelicom)</li><li>Izaberi <b>Dodaj na početni ekran</b></li><li>Otvori EQUIVRA CRM sa početnog ekrana i ponovo klikni ovo dugme</li></ol><div class="row"><button class="btn" data-close>Razumem</button></div>`);
  if (st === 'no') return toast('Ovaj pretraživač ne podržava obaveštenja');
  if (st === 'denied') return toast('Obaveštenja su blokirana u podešavanjima pretraživača za ovaj sajt');
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Obaveštenja nisu dozvoljena');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(VAPID_PUBLIC) }));
    await pushSave(sub); LS.set('eq_push', '1'); sfx('done'); toast('Obaveštenja uključena na ovom uređaju');
    fn({ testPush: true }).catch(() => {});
    if (S.view === 'podesavanja') render();
  } catch (e) { console.warn(e); sfx('error'); toast('Nije uspelo: ' + (e.message || e)); }
}
async function pushRefresh() { try { if (pushState() !== 'on') return; const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await pushSave(sub); } catch (e) {} }
async function pushDisable() { try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await sb.from('e_push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); } } catch (e) {} LS.set('eq_push', '0'); toast('Obaveštenja isključena na ovom uređaju'); render(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.eqGo) openGo(e.data.eqGo); });

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

boot();
