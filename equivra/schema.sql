-- COMPLETE CRM · EQUIVRA modul (tabele e_*)
-- Aukcijska kuća konja EQUIVRA DOO DOLOVO. Pokreće se jednom u SQL editoru projekta COMPLETE CRM.
-- Bezbedno za ponovno pokretanje (if not exists / create or replace). Ne briše postojeće tabele.

create extension if not exists pgcrypto;

-- ---------- KONTAKTI ----------
create table if not exists public.e_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  company text,
  kind text not null default 'kupac'
    check (kind in ('kupac','prodavac','kupac_prodavac','odgajivac','veterinar','prevoznik','potkivac','trener','ostalo')),
  phone text,
  phone_norm text,
  email text,
  city text,
  country text default 'Srbija',
  lang text not null default 'sr' check (lang in ('sr','en')),
  source text not null default 'rucno'
    check (source in ('sajt_registracija','sajt_prijava_konja','sajt_kontakt','newsletter','rucno','instagram','facebook','sajam_trka','preporuka','telefon','uvoz')),
  site_user_id text,                    -- id naloga na equivra sajtu, ako postoji
  owner text,                           -- username iz tima
  rating text not null default 'topao' check (rating in ('hladan','topao','vruc')),
  tags text[] not null default '{}',
  note text,
  next_follow_up date,
  -- interesovanja (za uparivanje sa konjima)
  disciplines text[] not null default '{}',   -- galop, kas, preponsko, dresura, rekreacija, priplod
  breeds text,
  sex_pref text check (sex_pref in ('pastuv','kobila','kastrat') or sex_pref is null),
  age_from int, age_to int,
  budget_from numeric(12,2), budget_to numeric(12,2),
  -- saglasnosti po kanalu (Zakon o zaštiti podataka o ličnosti)
  email_optin boolean not null default false, email_optin_at timestamptz, email_optin_src text, email_unsub_at timestamptz,
  viber_optin boolean not null default false, viber_optin_at timestamptz, viber_optin_src text, viber_unsub_at timestamptz,
  whatsapp_optin boolean not null default false, whatsapp_optin_at timestamptz, whatsapp_optin_src text, whatsapp_unsub_at timestamptz,
  deleted_at timestamptz
);
create index if not exists e_contacts_phone_idx on public.e_contacts (phone_norm);
create index if not exists e_contacts_email_idx on public.e_contacts (lower(email));

create or replace function public.e_norm_phone(p text) returns text language sql immutable as $$
  select case
    when p is null or regexp_replace(p, '\D', '', 'g') = '' then null
    when regexp_replace(p, '\D', '', 'g') like '00%' then '+' || substr(regexp_replace(p, '\D', '', 'g'), 3)
    when regexp_replace(p, '\D', '', 'g') like '381%' then '+' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') like '0%' then '+381' || substr(regexp_replace(p, '\D', '', 'g'), 2)
    else '+' || regexp_replace(p, '\D', '', 'g') end
$$;

create or replace function public.e_contacts_touch() returns trigger language plpgsql as $$
begin
  new.phone_norm := public.e_norm_phone(new.phone);
  new.updated_at := now();
  if new.email_optin and not coalesce(old.email_optin, false) then new.email_optin_at := coalesce(new.email_optin_at, now()); new.email_unsub_at := null; end if;
  if new.viber_optin and not coalesce(old.viber_optin, false) then new.viber_optin_at := coalesce(new.viber_optin_at, now()); new.viber_unsub_at := null; end if;
  if new.whatsapp_optin and not coalesce(old.whatsapp_optin, false) then new.whatsapp_optin_at := coalesce(new.whatsapp_optin_at, now()); new.whatsapp_unsub_at := null; end if;
  if not new.email_optin and coalesce(old.email_optin, false) then new.email_unsub_at := now(); end if;
  if not new.viber_optin and coalesce(old.viber_optin, false) then new.viber_unsub_at := now(); end if;
  if not new.whatsapp_optin and coalesce(old.whatsapp_optin, false) then new.whatsapp_unsub_at := now(); end if;
  return new;
end $$;
drop trigger if exists e_contacts_touch_trg on public.e_contacts;
create trigger e_contacts_touch_trg before insert or update on public.e_contacts for each row execute function public.e_contacts_touch();

-- ---------- KONJI (lokalna evidencija; konji sa sajta se čitaju uživo) ----------
create table if not exists public.e_horses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  lot_no text,
  auction_name text,
  discipline text check (discipline in ('galop','kas','preponsko','dresura','rekreacija','priplod') or discipline is null),
  breed text,
  sex text check (sex in ('pastuv','kobila','kastrat') or sex is null),
  birth_year int,
  color text,
  sire text, dam text,
  seller_id uuid references public.e_contacts(id) on delete set null,
  start_price numeric(12,2),
  reserve_price numeric(12,2),
  current_bid numeric(12,2),
  sold_price numeric(12,2),
  status text not null default 'priprema'
    check (status in ('upit','priprema','na_aukciji','prodat','nije_prodat','povucen')),
  site_horse_id text,                   -- veza sa lotom na sajtu
  photo_url text,
  note text,
  deleted_at timestamptz
);

-- ---------- PIPELINE KARTICE ----------
create table if not exists public.e_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pipeline text not null check (pipeline in ('prodavci','kupci','naplata')),
  stage text not null,
  contact_id uuid references public.e_contacts(id) on delete cascade,
  horse_id uuid references public.e_horses(id) on delete set null,
  title text,
  amount numeric(12,2),                 -- očekivana / prodajna cena
  owner text,
  lost_reason text,
  stage_since timestamptz not null default now(),
  next_step text,
  next_step_at date,
  deleted_at timestamptz
);
create or replace function public.e_deals_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then new.stage_since := now(); end if;
  return new;
end $$;
drop trigger if exists e_deals_touch_trg on public.e_deals;
create trigger e_deals_touch_trg before insert or update on public.e_deals for each row execute function public.e_deals_touch();

-- ---------- AKTIVNOSTI (vremenska linija) ----------
create table if not exists public.e_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_id uuid references public.e_contacts(id) on delete cascade,
  horse_id uuid references public.e_horses(id) on delete set null,
  deal_id uuid references public.e_deals(id) on delete set null,
  kind text not null default 'beleska'
    check (kind in ('beleska','poziv','poruka','sastanak','poseta','ponuda','email','viber','whatsapp','sajt','faza','sistem')),
  body text not null,
  author text
);
create index if not exists e_activities_contact_idx on public.e_activities (contact_id, created_at desc);

-- ---------- BELEŠKE / ZADACI ----------
create table if not exists public.e_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  assignee text,
  due date,
  contact_id uuid references public.e_contacts(id) on delete set null,
  horse_id uuid references public.e_horses(id) on delete set null,
  done boolean not null default false,
  done_at timestamptz,
  author text
);

-- ---------- KALENDAR ----------
create table if not exists public.e_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  kind text not null default 'ostalo'
    check (kind in ('aukcija','pregled_konja','veterinar','fotografisanje','sastanak','preuzimanje','ostalo')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  place text,
  contact_id uuid references public.e_contacts(id) on delete set null,
  horse_id uuid references public.e_horses(id) on delete set null,
  note text,
  author text
);

-- ---------- MARKETING ----------
create table if not exists public.e_segments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  filters jsonb not null default '{}'::jsonb,   -- {kind:[], disciplines:[], rating:[], city, budget_min, budget_max, tags:[], source:[]}
  author text
);

create table if not exists public.e_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  channel text not null check (channel in ('email','viber','whatsapp')),
  subject text,
  body text not null,
  position int not null default 0
);

create table if not exists public.e_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  channel text not null check (channel in ('email','viber','whatsapp')),
  segment_id uuid references public.e_segments(id) on delete set null,
  template_id uuid references public.e_templates(id) on delete set null,
  subject text,
  body text not null,
  vars jsonb not null default '{}'::jsonb,       -- {aukcija, datum, lot, konj, link}
  status text not null default 'nacrt' check (status in ('nacrt','u_toku','poslata')),
  scheduled_at timestamptz,
  excluded_count int not null default 0,
  author text
);

create table if not exists public.e_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid references public.e_campaigns(id) on delete cascade,
  contact_id uuid references public.e_contacts(id) on delete cascade,
  channel text not null check (channel in ('email','viber','whatsapp')),
  to_addr text,
  body text not null,
  subject text,
  status text not null default 'ceka' check (status in ('ceka','poslato','preskoceno','neuspelo')),
  sent_at timestamptz,
  sent_by text
);
create index if not exists e_messages_campaign_idx on public.e_messages (campaign_id, status);

-- ---------- PODEŠAVANJA ----------
create table if not exists public.e_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- ---------- PRIJEM SA SAJTA (sajt šalje ovde: registracija, prijava konja, kontakt, newsletter, ponuda) ----------
create table if not exists public.e_inbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null,
  payload jsonb not null,
  processed boolean not null default false,
  contact_id uuid references public.e_contacts(id) on delete set null,
  ext_key text
);
alter table public.e_inbox add column if not exists ext_key text;
create unique index if not exists e_inbox_ext_key_idx on public.e_inbox (ext_key) where ext_key is not null;

create or replace function public.e_find_or_create_contact(p_name text, p_phone text, p_email text, p_source text, p_kind text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; ph text := public.e_norm_phone(p_phone); em text := nullif(lower(trim(p_email)), '');
begin
  if ph is not null then select id into cid from e_contacts where phone_norm = ph and deleted_at is null limit 1; end if;
  if cid is null and em is not null then select id into cid from e_contacts where lower(email) = em and deleted_at is null limit 1; end if;
  if cid is null then
    insert into e_contacts (name, phone, email, source, kind)
    values (coalesce(nullif(trim(p_name), ''), coalesce(em, ph, 'Nepoznat')), p_phone, em, coalesce(p_source, 'rucno'), coalesce(p_kind, 'kupac'))
    returning id into cid;
  else
    update e_contacts set
      phone = coalesce(phone, p_phone), email = coalesce(email, em),
      kind = case when kind = 'kupac' and p_kind = 'prodavac' then 'kupac_prodavac'
                  when kind = 'prodavac' and p_kind = 'kupac' then 'kupac_prodavac' else kind end
    where id = cid;
  end if;
  return cid;
end $$;

-- Jezgro prijema: jedan događaj sa sajta → kontakt + aktivnost + kartica. ext_key sprečava duplikate.
create or replace function public.e_ingest_core(p_event text, p_payload jsonb, p_ext_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; v_kind text; v_src text; v_txt text; v_at timestamptz;
begin
  if p_ext_key is not null and exists (select 1 from e_inbox where ext_key = p_ext_key) then
    select contact_id into cid from e_inbox where ext_key = p_ext_key; return cid;
  end if;
  v_at := coalesce((p_payload->>'at')::timestamptz, now());
  v_kind := case when p_event in ('prijava_konja') then 'prodavac' else 'kupac' end;
  v_src := case p_event when 'registracija' then 'sajt_registracija' when 'prijava_konja' then 'sajt_prijava_konja'
                        when 'kontakt' then 'sajt_kontakt' when 'newsletter' then 'newsletter' else 'sajt_registracija' end;
  cid := public.e_find_or_create_contact(p_payload->>'name', p_payload->>'phone', p_payload->>'email', v_src, v_kind);
  if coalesce((p_payload->>'email_optin')::boolean, p_event = 'newsletter') then
    update e_contacts set email_optin = true, email_optin_src = coalesce(email_optin_src, v_src) where id = cid and not email_optin; end if;
  if coalesce((p_payload->>'viber_optin')::boolean, false) then
    update e_contacts set viber_optin = true, viber_optin_src = coalesce(viber_optin_src, v_src) where id = cid and not viber_optin; end if;
  if coalesce((p_payload->>'whatsapp_optin')::boolean, false) then
    update e_contacts set whatsapp_optin = true, whatsapp_optin_src = coalesce(whatsapp_optin_src, v_src) where id = cid and not whatsapp_optin; end if;
  v_txt := case p_event
    when 'registracija' then 'Registrovao se na sajtu'
    when 'prijava_konja' then 'Prijavio konja: ' || coalesce(p_payload->>'horse', '')
    when 'kontakt' then 'Poruka sa sajta: ' || left(coalesce(p_payload->>'message', ''), 400)
    when 'newsletter' then 'Prijavio se na newsletter'
    when 'ponuda' then 'Licitirao: ' || coalesce(p_payload->>'horse', '') || ' · ' || coalesce(p_payload->>'amount', '') || ' €'
    else p_event end;
  if p_event = 'registracija' and nullif(p_payload->>'site_user_id', '') is not null then
    update e_contacts set site_user_id = p_payload->>'site_user_id',
      city = coalesce(city, nullif(p_payload->>'city', '')), country = coalesce(nullif(p_payload->>'country', ''), country),
      company = coalesce(company, nullif(p_payload->>'company', ''))
    where id = cid;
  end if;
  insert into e_activities (contact_id, kind, body, author, created_at) values (cid, 'sajt', v_txt, 'sajt', v_at);
  if p_event = 'prijava_konja' then
    insert into e_deals (pipeline, stage, contact_id, title, amount)
    values ('prodavci', 'novi_upit', cid, coalesce(p_payload->>'horse', 'Novi konj'), nullif(regexp_replace(coalesce(p_payload->>'price', ''), '[^0-9.]', '', 'g'), '')::numeric);
  elsif p_event = 'registracija' and not exists (select 1 from e_deals where contact_id = cid and pipeline = 'kupci' and deleted_at is null) then
    insert into e_deals (pipeline, stage, contact_id, title) values ('kupci', 'registrovan', cid, 'Registracija na sajtu');
  elsif p_event = 'ponuda' then
    update e_deals set stage = 'licitirao', title = coalesce(p_payload->>'horse', title), amount = greatest(coalesce(amount, 0), coalesce((p_payload->>'amount')::numeric, 0))
    where contact_id = cid and pipeline = 'kupci' and deleted_at is null and stage in ('novi_lead','kontaktiran','zainteresovan','registrovan');
    if not found and not exists (select 1 from e_deals where contact_id = cid and pipeline = 'kupci' and deleted_at is null) then
      insert into e_deals (pipeline, stage, contact_id, title, amount) values ('kupci', 'licitirao', cid, p_payload->>'horse', (p_payload->>'amount')::numeric);
    end if;
  end if;
  insert into e_inbox (event, payload, processed, contact_id, ext_key) values (p_event, p_payload, true, cid, p_ext_key);
  return cid;
end $$;
revoke all on function public.e_ingest_core(text, jsonb, text) from public, anon, authenticated;

-- Sajt (kasnije, preko webhooka) poziva: select e_ingest('<tajna iz e_settings.ingest_secret>', 'registracija', '{...}')
create or replace function public.e_ingest(p_secret text, p_event text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select value into v_secret from e_settings where key = 'ingest_secret';
  if v_secret is null or p_secret is distinct from v_secret then raise exception 'unauthorized'; end if;
  return public.e_ingest_core(p_event, p_payload, nullif(p_payload->>'ext_key', ''));
end $$;
revoke all on function public.e_ingest(text, text, jsonb) from public;
grant execute on function public.e_ingest(text, text, jsonb) to anon, authenticated;

-- CRM (prijavljen član tima) povlači podatke sa sajta: dugme „Sinhronizuj sa sajtom"
create or replace function public.e_sync(p_event text, p_ext_key text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  return public.e_ingest_core(p_event, p_payload, p_ext_key);
end $$;
revoke all on function public.e_sync(text, text, jsonb) from public, anon;
grant execute on function public.e_sync(text, text, jsonb) to authenticated;
insert into public.e_settings (key, value) values ('ingest_secret', encode(gen_random_bytes(18), 'hex')) on conflict (key) do nothing;

-- ---------- ISTORIJA (audit) ----------
create table if not exists public.e_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text,
  tbl text not null,
  op text not null,
  row_id text,
  before jsonb,
  after jsonb
);
create or replace function public.e_audit_fn() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  v_actor := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', 'system');
  v_actor := split_part(v_actor, '@', 1);
  insert into e_audit (actor, tbl, op, row_id, before, after)
  values (v_actor, tg_table_name, tg_op,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- ---------- RLS: samo prijavljeni članovi tima ----------
do $$
declare t text;
begin
  foreach t in array array['e_contacts','e_horses','e_deals','e_activities','e_tasks','e_events','e_segments','e_templates','e_campaigns','e_messages','e_settings','e_inbox'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format('create policy "team all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
  foreach t in array array['e_contacts','e_horses','e_deals','e_tasks','e_events','e_segments','e_templates','e_campaigns'] loop
    execute format('drop trigger if exists e_audit_trg on public.%I', t);
    execute format('create trigger e_audit_trg after insert or update or delete on public.%I for each row execute function public.e_audit_fn()', t);
  end loop;
end $$;
alter table public.e_audit enable row level security;
drop policy if exists "team read" on public.e_audit;
create policy "team read" on public.e_audit for select to authenticated using (true);

-- realtime za tim
do $$ begin
  begin alter publication supabase_realtime add table public.e_contacts, public.e_deals, public.e_activities, public.e_tasks, public.e_messages; exception when others then null; end;
end $$;

-- ---------- POČETNI ŠABLONI ----------
insert into public.e_templates (name, channel, subject, body, position)
select * from (values
  ('Nova aukcija najavljena', 'email', 'EQUIVRA: {aukcija}, {datum}',
   'Poštovani {ime},

sa zadovoljstvom najavljujemo {aukcija}, koja se održava {datum}.

Katalog konja i uslove učešća pogledajte ovde: {link}

Registracija je besplatna, bez upisnine. Provizija kupca iznosi 5% od iznosa koji je prodavac prihvatio.

Srdačan pozdrav,
EQUIVRA
Prva aukcijska kuća konja u Srbiji
069 332 8544', 1),
  ('Nova aukcija najavljena', 'viber', null,
   'Zdravo {ime}, EQUIVRA najavljuje {aukcija} ({datum}). Katalog: {link}', 2),
  ('Nova aukcija najavljena', 'whatsapp', null,
   'Zdravo {ime}, EQUIVRA najavljuje {aukcija} ({datum}). Katalog: {link}', 3),
  ('Novi konj u katalogu', 'email', 'Novi konj u katalogu: {konj}',
   'Poštovani {ime},

u katalog za {aukcija} upravo je dodat {konj} (lot {lot}). Mislimo da bi vas mogao zanimati.

Fotografije, poreklo i dokumentaciju pogledajte ovde: {link}

Srdačan pozdrav,
EQUIVRA', 4),
  ('Novi konj u katalogu', 'viber', null,
   '{ime}, u katalogu je novi konj: {konj}, lot {lot}. Pogledajte: {link}', 5),
  ('Novi konj u katalogu', 'whatsapp', null,
   '{ime}, u katalogu je novi konj: {konj}, lot {lot}. Pogledajte: {link}', 6),
  ('Aukcija počinje za 24h', 'viber', null,
   'Podsetnik: {aukcija} počinje sutra, {datum}. Prijavite se i pratite licitaciju: {link}', 7),
  ('Aukcija počinje za 24h', 'whatsapp', null,
   'Podsetnik: {aukcija} počinje sutra, {datum}. Prijavite se i pratite licitaciju: {link}', 8),
  ('Aukcija počinje za 24h', 'email', 'Sutra počinje {aukcija}',
   'Poštovani {ime},

podsećamo vas da {aukcija} počinje sutra, {datum}. Licitaciju pratite i ponude dajete ovde: {link}

Srdačan pozdrav,
EQUIVRA', 9),
  ('Rezultati aukcije', 'email', 'Rezultati: {aukcija}',
   'Poštovani {ime},

hvala što ste pratili {aukcija}. Rezultate pogledajte ovde: {link}

Sledeća aukcija je u pripremi, a prijave konja su otvorene.

Srdačan pozdrav,
EQUIVRA', 10),
  ('Za prodavce: prijavite konja', 'email', 'Prijave konja za sledeću aukciju su otvorene',
   'Poštovani {ime},

otvorene su prijave konja za {aukcija}. Bez upisnine, provizija prodavca je 5% od iznosa koji prihvatite i plaća se samo ako je konj prodat.

Prijavite konja ovde: {link}

Srdačan pozdrav,
EQUIVRA
069 332 8544', 11),
  ('Za prodavce: prijavite konja', 'viber', null,
   '{ime}, prijave konja za {aukcija} su otvorene. Bez upisnine, 5% provizije samo ako se konj proda. Prijava: {link}', 12),
  ('Za prodavce: prijavite konja', 'whatsapp', null,
   '{ime}, prijave konja za {aukcija} su otvorene. Bez upisnine, 5% provizije samo ako se konj proda. Prijava: {link}', 13),
  ('Hvala na kupovini', 'email', 'Čestitamo na kupovini: {konj}',
   'Poštovani {ime},

čestitamo, vaša ponuda za {konj} je prihvaćena. U narednom periodu javljamo se sa instrukcijama za plaćanje i preuzimanje konja.

Za sva pitanja smo dostupni na 069 332 8544.

Srdačan pozdrav,
EQUIVRA', 14)
) as v(name, channel, subject, body, position)
where not exists (select 1 from public.e_templates);
