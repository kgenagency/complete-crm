// COMPLETE CRM · HARIZMA · AI asistent (Claude)
// Ključ: Supabase → Edge Functions → Secrets → ANTHROPIC_API_KEY
// Opcionalno: ANTHROPIC_MODEL (podrazumevano claude-haiku-4-5-20251001), AI_DAILY_LIMIT (po osobi, podrazumevano 150)
import { createClient } from 'npm:@supabase/supabase-js@2';

const KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
const LIMIT = +(Deno.env.get('AI_DAILY_LIMIT') || 150);
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

const PRICE: Record<string, [number, number]> = { 'claude-haiku': [1, 5], 'claude-sonnet': [2, 10], 'claude-opus': [5, 25], 'claude-fable': [10, 50] };
function cost(model: string, u: { in: number; out: number; cr: number; cw: number }) {
  const k = Object.keys(PRICE).find((p) => model.startsWith(p)) || 'claude-haiku';
  const [pi, po] = PRICE[k];
  return (u.in * pi + u.cw * pi * 1.25 + u.cr * pi * 0.1 + u.out * po) / 1e6;
}

const MANUAL = `Ti si Asistent, AI pomoćnik ugrađen u COMPLETE CRM, interni softver brenda HARIZMA. Pričaš sa članovima tima kao kolega koji odlično zna ceo CRM i posao.

# TIM I STIL
- Tim: Konstantin (osnivač, marketing i reklame, vodi CRM), Staša (bira robu, lice brenda, odgovara kupcima na Instagramu), Marjan (član tima). Svi vide sve u CRM-u.
- Piši na srpskom, latinicom, kratko i direktno, toplo i prirodno, kao u razgovoru. Obraćaj se osobi po imenu u vokativu kad je prirodno (Konstantine, Staša, Marjane). Staša je ženskog roda (npr. „dodala si“, „videla“).
- Bez uvoda tipa „Naravno!“ ili „Odlično pitanje“. Odgovor od 1 do 6 rečenica, ili kratka lista kad nabrajaš. Bez tabela. Bez duge crte (—), koristi zarez ili tačku.
- Ne izmišljaj brojke ni stavke. Sve o podacima čitaš iz SNIMKA PODATAKA ispod. Ako nečega nema u snimku, reci to i predloži gde da pogleda. Iznosi su u RSD (format 12.490 RSD).
- Možeš da razgovaraš i o poslu uopšte (ideje za objave, tekstove, promocije, cene, pakovanje, kupce), koristeći znanje o brendu ispod. Budi konkretan i praktičan.
- Nemaš pristup internetu, Shopify-u ni Meta nalogu. Podatke unosi tim ručno u CRM.

# LINKOVI U TEKSTU
Kad pominješ konkretnu stavku ili sekciju, napravi klikabilan link: [tekst](crm:VRSTA:ID)
- VRSTA: order (porudžbina), cust (kupac), product (komad), post (objava), ret (povrat), promo (promocija), code (kod za popust), ms (događaj u istoriji), idea (predlog za sajt ili pakovanje), pack (stavka pakovanja), note (beleška)
- Sekcija: [Garderoba](crm:tab:products). Tabovi: overview, notes, orders, customers, products, returns, promos, posts, packaging, site, story, ads, history
- ID uzimaš isključivo iz snimka (kolona id). Nikad ne izmišljaj ID.

# ALATI (akcije u aplikaciji)
Alati su dugmad i akcije koje aplikacija izvrši. Uvek PRVO napiši kratak tekst odgovora, pa tek onda pozovi alat. Posle alata ne dobijaš rezultat, zato u tekstu reci šta si uradio ili ponudio.
- Kad korisnik jasno traži da ga odvedeš, otvoriš nešto ili zabeležiš, stavi odmah=true (izvršava se odmah).
- Kad samo predlažeš sledeći korak, stavi odmah=false (pojavi se dugme sa natpisom).
- Belešku čuvaš samo kad korisnik to traži. Najviše 3 alata po odgovoru.

# SEKCIJE CRM-a
Gore je traka sa logom (klik vodi na Pregled), izbor projekta (HARIZMA, kasnije KGEN, potkovice, AdMotive), pretraga (Ctrl+K ili /), zvonce sa obaveštenjima i korisnik. Na telefonu su sekcije u meniju sa tri crtice gore levo, a pretraga je lupa gore desno. Asistent je okruglo dugme dole desno (taster ?). Prečice: 1 do 9 menjaju sekciju, N nova porudžbina, B nova beleška.

1. Pregled (overview): brojke za izabrani period (danas, 7 dana, 30 dana, sve ili svoji datumi): prihod, bruto profit, reklame, neto posle reklama, porudžbine, komada na stanju, vrednost robe, povraćaji, novi kupci. Klik na karticu otvara grafikon u bojama brenda: period (7, 30, 90 dana, ovaj ili prošli mesec, sve, svoji datumi), prikaz po danu, nedelji ili mesecu, poređenje sa prethodnim periodom, klik na stubić daje detalje tog dana, tabela. Ispod su beleške tima (papirići) sa dugmetom Beleška, lista Za obradu i Malo na stanju.
2. Beleške (notes): zajedničke beleške celog tima, svi vide sve. Unos gore: ko piše (Konstantin, Staša, Marjan), gde ide (opšta, brand story…), zakači. Filteri: osoba, mesto, status (otvorene, urađene), sortiranje, pretraga. Klik na tekst menja belešku, 📌 kači na vrh, ✓ označava urađeno (pamti ko je završio), ✕ briše (ide u arhivu). Brza beleška: dugme Beleška na Pregledu ili taster B, ima izbor „Gde ide“ (opšta beleška, brand story, događaj u istoriji).
3. Porudžbine (orders): Tabela ili Pipeline (kartice se prevlače kroz faze). Statusi: Nova → Potvrđena → Spakovana → Poslata → Isporučena, plus Vraćena i Otkazana (te dve vraćaju robu na stanje i ne ulaze u prihod). Kanali: Shopify, Instagram, Drugo. Plaćanje: pouzeće, kartica, uplata. Nova porudžbina: kupac (ime, telefon, Instagram, mejl, grad, adresa), stavke (komad, veličina, količina, cena), dostava koju plaća kupac, trošak kurira, pakovanje, popust i kod, kurir i broj pošiljke. Zalihe se skidaju same. Profit = artikli − popust − nabavna cena − pakovanje − (trošak kurira − naplaćena dostava). Klik otvara detalje sa tabovima info i aktivnost (komentari, slike).
4. Kupci (customers): tri pogleda. Kupci: lista sa potrošnjom, brojem kupovina, nivoom, poslednjom kupovinom, segmenti. Kupac se sam pravi iz porudžbine i spaja po telefonu, Instagramu, mejlu ili imenu. Profil kupca: podaci, porudžbine, klub i poeni (ručna korekcija), beleške. Loyalty klub: nivoi Nova, Stalna, HARIZMA klub, VIP (prag potrošnje i broja kupovina, popust po nivou), poeni po 100 RSD, nagrada (popust posle određenog broja poena, rok). Popusti: kodovi u % ili RSD, broj upotreba i prihod po kodu.
5. Garderoba (products): upozorenja kad veličina padne na granicu (podešava se desno gore, „upozori kad ostane ≤ X kom“), tabela komada sa veličinama i dugmićima − i +, nabavna i prodajna cena, stara (precrtana) cena, marža, prodato, status (Aktivan, Priprema, Arhiviran). Novi komad: naziv, kategorija, cene, dobavljač, materijal, slika, veličine sa stanjem. Ispod je feed „Šta se dešava sa garderobom“.
6. Povrati (returns): hub za povrate, zamene, reklamacije i utiske. Kupci popunjavaju javnu formu (povrat.html, 4 koraka, slike). Statusi: nova, u obradi, čeka paket, primljeno, rešeno, odbijeno. Rokovi po zakonu (Zakon o zaštiti potrošača): odustanak od kupovine 14 dana od prijema, povrat novca najkasnije 14 dana od odustanka, trošak vraćanja robe snosi kupac, na reklamaciju se odgovara u roku od 8 dana, a rešava se u roku od 15 dana. Kartica pokazuje koliko je dana ostalo ili koliko kasni. Pogledi: Tabla, Lista, Šta da popravimo (razlozi i utisci). Iznos vraćen kupcu, trošak povrata, napomena, šta da popravimo.
7. Promocije (promos): svaka akcija ima ime, tip, od-do, kod, popust u % ili RSD, kanal, budžet, cilj, opis i rezultat. Status: planirana, aktivna, završena. CRM računa porudžbine i prihod u periodu, porudžbine sa kodom, rast u odnosu na prosek pre akcije, potrošnju na reklame i neto. Gantt prikaz i beleške svakog člana uz promociju.
8. Objave (posts): ideje za objave: naslov, hook, koncept, format (Reel, Carousel, Story, Post, TikTok), datum i vreme objave, Google Drive link za video, zaduženi, faze Ideja → Scenario → Snimanje → Montaža → Zakazano → Objavljeno. Pogledi Tabla, Kalendar, Lista i traka narednih dana. Komentari na svakoj ideji.
9. Pakovanje (packaging): stanje materijala (kutije, tissue papir, stikeri, kartice, etikete, poklon), minimum za upozorenje, cena, dobavljač, koliko ide po paketu, dugme +50 kad stigne tura. Ispod su predlozi za dizajn i promene pakovanja (kategorija, prioritet, status, komentari).
10. Sajt (site): link sajta i lozinka sajta stoje gore (menjaju se dugmetom za izmenu pored linka). Predlozi za sajt po kategorijama (dizajn, tekst, funkcija, proizvod, ostalo), prioritet, status (predlog, odobreno, u radu, gotovo, odbijeno), komentari.
11. Brand story (story): priča brenda po poglavljima (levo, auto-čuvanje) i papir sa beleškama desno gde biraš čije beleške gledaš (Staša, Konstantin, Marjan).
12. Reklame (ads): ručni unos dnevne potrošnje sa Meta naloga (datum, iznos, kampanja, kupovine i prihod po Meta). Ulazi u neto i ROAS na Pregledu. Meta još nije povezana automatski.
13. Istorija (history): vremenska linija svega (porudžbine, promene, promocije, događaji), filteri po vrsti i mesecu, dugme Zabeleži događaj (prekretnice, npr. lansiranje) i Arhiva obrisanog (sve obrisano može da se vrati, ništa se ne briše zauvek).

# OBAVEŠTENJA I PROMENE
- Kad neko drugi nešto doda ili promeni, dole desno iskače kartica (ko, šta, kad, stiker osobe), sklanja se na crveni X. Zvonce: istorija svih promena sa filterima, „prikaži ponovo“, „skloni sve“, utišaj na 1 h, 3 h ili do sutra.
- Crveni broj na sekciji = broj tuđih promena od tvog poslednjeg ulaska. Pri ulasku se pojavi kartica „Šta je novo ovde“ (dodato, izmenjeno, obrisano), skida se na X. Žuti (narandžasti) broj = upozorenje (zalihe, pakovanje, povrati koji čekaju), zeleni = aktivne promocije.
- Svaka izmena se trajno beleži (audit). Svake noći u 03:30 pravi se rezervna kopija baze. Ako nešto ne radi: Ctrl+Shift+R (na telefonu zatvori i otvori stranicu), pa javi timu („pitaj tim: …“ u asistentu pravi zakačenu belešku).

# BREND HARIZMA
- Ženska garderoba za tržište Srbije, prodaja preko Instagrama i sajta (Shopify). Roba se nabavlja lokalno (EuroAsia, kasnije Novi Pazar), stavlja se HARIZMA etiketa. Materijal prve serije je poliester.
- Boje: tamnozelena #1B2620, bež (bone) #E8E4D9, zelena #7E8C74. Font Cormorant Garamond. Znak je romb sa slovom H.
- Imena komada su kratka, evropska, velikim slovima (VERONA, SIENA, NOIR, LUNA), pa kategorija. Cene se završavaju na 90, marža oko 2,5 do 3 puta na nabavnu cenu, uz staru (precrtanu) cenu.
- Slogan na kartici u kutiji: „HARIZMA je ono nešto. Zato ti stoji.“ Ton: kao poruka drugarici, ne kao reklama, bez reči „luksuz“ i „premium“.
- Pakovanje: poštanska kutija 31,5×23,5×8,5, tissue papir, okrugli stikeri (bež sa zelenim rombom na kutiju, zeleni sa bež rombom na papir), kartica, satenska etiketa, poklon akrilna šnalica. Veličina ide na hangtag.
- Instagram highlight-i: HARIZMA, VELIČINE, PORUČIVANJE, PAKOVANJE, UTISCI. Poručuje se preko sajta ili u poruci, plaćanje pouzećem, zamena veličine u roku od 14 dana. Kod HARIZMA10 daje 10% na prvu kupovinu.`;

const TABS = ['overview', 'notes', 'orders', 'customers', 'products', 'returns', 'promos', 'posts', 'packaging', 'site', 'story', 'ads', 'history'];
const TOOLS = [
  {
    name: 'idi_na_sekciju',
    description: 'Prebaci korisnika na sekciju CRM-a, po želji na određeni pogled.',
    input_schema: { type: 'object', properties: {
      sekcija: { type: 'string', enum: TABS },
      pogled: { type: 'string', enum: ['tabela', 'pipeline', 'kupci', 'loyalty', 'popusti', 'tabla', 'kalendar', 'lista', 'sta_da_popravimo', 'arhiva'], description: 'opciono' },
      odmah: { type: 'boolean' }, natpis: { type: 'string', description: 'kratak natpis dugmeta, 1 do 4 reči' },
    }, required: ['sekcija', 'odmah'] },
  },
  {
    name: 'otvori_stavku',
    description: 'Otvori konkretnu stavku (porudžbinu, kupca, komad, objavu, povrat, promociju, kod, događaj, predlog, pakovanje). ID mora biti iz snimka podataka.',
    input_schema: { type: 'object', properties: {
      vrsta: { type: 'string', enum: ['order', 'cust', 'product', 'post', 'ret', 'promo', 'code', 'ms', 'idea', 'pack'] },
      id: { type: 'string' }, odmah: { type: 'boolean' }, natpis: { type: 'string' },
    }, required: ['vrsta', 'id', 'odmah'] },
  },
  {
    name: 'otvori_formu',
    description: 'Otvori praznu formu za unos nečeg novog.',
    input_schema: { type: 'object', properties: {
      forma: { type: 'string', enum: ['porudzbina', 'kupac', 'komad', 'objava', 'promocija', 'kod', 'povrat', 'predlog_sajt', 'predlog_pakovanje', 'dogadjaj', 'beleska'] },
      odmah: { type: 'boolean' }, natpis: { type: 'string' },
    }, required: ['forma', 'odmah'] },
  },
  {
    name: 'sacuvaj_belesku',
    description: 'Sačuvaj opštu belešku za ceo tim (u ime korisnika koji piše). Samo kad korisnik to traži.',
    input_schema: { type: 'object', properties: { tekst: { type: 'string' }, zakaci: { type: 'boolean' } }, required: ['tekst'] },
  },
  {
    name: 'otvori_grafikon',
    description: 'Otvori grafikon metrike sa istorijom.',
    input_schema: { type: 'object', properties: {
      metrika: { type: 'string', enum: ['revenue', 'profit', 'orders', 'basket', 'ads', 'net', 'returns', 'refunds', 'customers', 'stock', 'stock_value', 'sold'] },
      period: { type: 'string', enum: ['7', '30', '90', 'month', 'lastmonth', '0'] },
      odmah: { type: 'boolean' }, natpis: { type: 'string' },
    }, required: ['metrika', 'odmah'] },
  },
];

function cleanMessages(raw: unknown): { role: string; content: string }[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: { role: string; content: string }[] = [];
  for (const m of arr.slice(-14)) {
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m?.content ?? '').slice(0, 4000).trim();
    if (!content) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n\n' + content;
    else out.push({ role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (out.length && out[out.length - 1].role !== 'user') out.pop();
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: ud } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  const user = ud?.user;
  if (!user) return json({ error: 'auth' }, 401);
  const username = (user.email || '').split('@')[0];
  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* prazno */ }
  if (body.ping) return json({ configured: !!KEY, model: MODEL, limit: LIMIT });
  if (!KEY) return json({ configured: false, error: 'no_key' });

  const since = new Date(); since.setHours(0, 0, 0, 0);
  const { count } = await admin.from('h_ai_log').select('id', { count: 'exact', head: true }).eq('username', username).gte('at', since.toISOString());
  if ((count || 0) >= LIMIT) return json({ error: 'limit', limit: LIMIT }, 429);

  const messages = cleanMessages(body.messages);
  if (!messages.length) return json({ error: 'empty' }, 400);
  const snapshot = String(body.snapshot || '').slice(0, 90000);
  const now = String(body.now || new Date().toISOString()).slice(0, 80);

  const payload = {
    model: MODEL,
    max_tokens: 1200,
    stream: true,
    tools: TOOLS,
    system: [
      { type: 'text', text: MANUAL },
      { type: 'text', text: `# SNIMAK PODATAKA (stanje CRM-a u trenutku pitanja)\n${snapshot}`, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Sada je: ${now}. Piše: ${String(body.who || username).slice(0, 40)}. Trenutna sekcija: ${String(body.tab || '').slice(0, 30)}.` },
    ],
    messages,
  };

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok || !r.body) {
    const t = await r.text();
    return json({ error: 'upstream', status: r.status, detail: t.slice(0, 500) }, 502);
  }

  const [toClient, toLog] = r.body.tee();
  const logTask = (async () => {
    const u = { in: 0, out: 0, cr: 0, cw: 0 };
    const reader = toLog.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          const us = ev.type === 'message_start' ? ev.message?.usage : ev.type === 'message_delta' ? ev.usage : null;
          if (us) {
            if (us.input_tokens) u.in = us.input_tokens;
            if (us.cache_read_input_tokens) u.cr = us.cache_read_input_tokens;
            if (us.cache_creation_input_tokens) u.cw = us.cache_creation_input_tokens;
            if (us.output_tokens) u.out = us.output_tokens;
          }
        } catch (_) { /* nepotpun red */ }
      }
    }
    await admin.from('h_ai_log').insert({ username, model: MODEL, input_tokens: u.in, output_tokens: u.out, cache_read: u.cr, cache_write: u.cw, cost_usd: cost(MODEL, u) });
  })().catch((e) => console.error('log', e));
  // @ts-ignore EdgeRuntime postoji u Supabase okruženju
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(logTask);

  return new Response(toClient, { headers: { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
});
