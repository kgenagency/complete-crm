-- COMPLETE CRM · HARIZMA modul (tabele h_*, svaki budući projekat dobija svoj prefiks)
create table if not exists public.h_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,                -- VERONA
  category text,                     -- haljina
  buy_price numeric(10,2) not null default 0,
  sell_price numeric(10,2) not null default 0,
  compare_price numeric(10,2),       -- "bila" cena
  supplier text,
  material text,
  image_url text,
  shopify_product_id text unique,
  status text not null default 'active' check (status in ('draft','active','archived')),
  note text
);

create table if not exists public.h_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.h_products(id) on delete cascade,
  size text not null,                -- S / M / L / UNI
  color text,
  stock int not null default 0,
  shopify_variant_id text unique,
  unique (product_id, size, color)
);

create table if not exists public.h_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_no text,                     -- #1001 ili IG-001
  channel text not null default 'instagram' check (channel in ('shopify','instagram','other')),
  customer_name text not null,
  phone text,
  email text,
  instagram text,
  address text,
  city text,
  postal_code text,
  status text not null default 'new'
    check (status in ('new','confirmed','packed','shipped','delivered','returned','cancelled')),
  payment text not null default 'cod' check (payment in ('cod','card','bank')),
  shipping_price numeric(10,2) not null default 0,   -- naplaćeno kupcu
  shipping_cost numeric(10,2) not null default 0,    -- plaćeno kuriru
  packaging_cost numeric(10,2) not null default 0,   -- kutija, papir, stiker, šnalica
  discount numeric(10,2) not null default 0,
  discount_code text,
  courier text,
  tracking_no text,
  courier_status text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  shopify_order_id text unique,
  note text
);

create table if not exists public.h_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.h_orders(id) on delete cascade,
  product_id uuid references public.h_products(id) on delete set null,
  variant_id uuid references public.h_variants(id) on delete set null,
  name text not null,                -- snapshot imena
  size text,
  qty int not null default 1,
  unit_price numeric(10,2) not null default 0,  -- prodajna u trenutku porudžbine
  unit_cost numeric(10,2) not null default 0    -- nabavna u trenutku porudžbine
);

create table if not exists public.h_ad_spend (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  campaign text not null default 'all',
  spend numeric(10,2) not null default 0,
  purchases int,
  revenue numeric(10,2),
  unique (day, campaign)
);

create table if not exists public.h_activities (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.h_orders(id) on delete cascade,
  product_id uuid references public.h_products(id) on delete cascade,
  type text not null check (type in ('comment','status','stock','screenshot','system')),
  author text not null,
  body text,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index if not exists h_orders_created_idx on public.h_orders(created_at desc);
create index if not exists h_items_order_idx on public.h_order_items(order_id);
create index if not exists h_variants_product_idx on public.h_variants(product_id);
create index if not exists h_act_order_idx on public.h_activities(order_id, created_at);

-- zbirni pregled porudžbine: prihod, trošak robe, profit
create or replace view public.h_order_totals with (security_invoker = true) as
select o.id, o.created_at, o.status, o.channel,
  coalesce(sum(i.qty*i.unit_price),0) as items_total,
  coalesce(sum(i.qty*i.unit_cost),0)  as items_cost,
  coalesce(sum(i.qty*i.unit_price),0) + o.shipping_price - o.discount as revenue,
  coalesce(sum(i.qty*i.unit_price),0) - o.discount
    - coalesce(sum(i.qty*i.unit_cost),0) - o.packaging_cost
    - (o.shipping_cost - o.shipping_price) as gross_profit
from public.h_orders o left join public.h_order_items i on i.order_id = o.id
group by o.id;

-- RLS: samo ulogovan tim
do $$ declare t text; begin
  foreach t in array array['h_products','h_variants','h_orders','h_order_items','h_ad_spend','h_activities'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format('create policy "team all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('screenshots','screenshots', true)
on conflict (id) do nothing;
drop policy if exists "crm screenshots upload" on storage.objects;
create policy "crm screenshots upload" on storage.objects for insert to authenticated with check (bucket_id = 'screenshots');
drop policy if exists "crm screenshots read" on storage.objects;
create policy "crm screenshots read" on storage.objects for select using (bucket_id = 'screenshots');
-- v2: Objave, Sajt, Brand story, beleške
create table if not exists public.h_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  concept text,
  hook text,
  caption text,
  format text not null default 'reel',          -- reel / carousel / story / post / tiktok
  status text not null default 'idea' check (status in ('idea','scripting','filming','editing','scheduled','published')),
  publish_at timestamptz,
  drive_link text,
  post_url text,
  product_id uuid references public.h_products(id) on delete set null,
  assignee text,
  created_by text,
  views int, likes int, saves int
);
create table if not exists public.h_site_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  category text not null default 'dizajn',       -- dizajn / tekst / funkcija / proizvod / ostalo
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'proposed' check (status in ('proposed','approved','in_progress','done','rejected')),
  link text,
  image_url text,
  created_by text,
  votes text[] not null default '{}'
);
create table if not exists public.h_story_sections (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text
);
create table if not exists public.h_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  area text not null default 'story',
  author text not null,
  body text not null,
  pinned boolean not null default false,
  done boolean not null default false
);
alter table public.h_activities add column if not exists post_id uuid references public.h_posts(id) on delete cascade;
alter table public.h_activities add column if not exists site_id uuid references public.h_site_ideas(id) on delete cascade;
alter table public.h_activities drop constraint if exists h_activities_type_check;
alter table public.h_activities add constraint h_activities_type_check check (type in ('comment','status','stock','screenshot','system','alert'));

do $$ declare t text; begin
  foreach t in array array['h_posts','h_site_ideas','h_story_sections','h_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format('create policy "team all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

insert into public.h_story_sections (position, title, body)
select * from (values
 (1,'Ko smo','HARIZMA je ženski brend iz Beograda. Priča ide na par: ona bira robu, on radi marketing. Suptilno, bez imena i inicijala.'),
 (2,'Šta znači HARIZMA','"HARIZMA je ono nešto." Ono što se ne vidi na etiketi, a svi primete.'),
 (3,'Za koga','Opiši idealnu kupicu: godine, gde izlazi, šta joj je važno, šta ne voli.'),
 (4,'Ton i reči','Kako pričamo: kratko, samouvereno, toplo. Reči koje koristimo i reči koje izbegavamo (bez "independent woman" klišea).'),
 (5,'Momenti za sadržaj','Priče iz nabavke, pakovanje, prve porudžbine, iza kulisa.')
) v(position,title,body)
where not exists (select 1 from public.h_story_sections);
-- v3: Pakovanje
alter table public.h_site_ideas add column if not exists area text not null default 'site';
create table if not exists public.h_packaging (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  kind text not null default 'kutija',            -- kutija / papir / stiker / kartica / etiketa / poklon / ostalo
  supplier text,
  link text,
  unit_price numeric(10,2),
  stock int not null default 0,
  min_stock int not null default 10,
  per_order int not null default 0,               -- koliko ide u svaki paket (0 = ne ide automatski)
  image_url text,
  note text
);
alter table public.h_packaging enable row level security;
drop policy if exists "team all" on public.h_packaging;
create policy "team all" on public.h_packaging for all to authenticated using (true) with check (true);
alter table public.h_activities add column if not exists packaging_id uuid references public.h_packaging(id) on delete cascade;
insert into public.h_packaging (name, kind, supplier, link, unit_price, per_order, min_stock, note)
select * from (values
 ('Post kutija 31,5×23,5×8,5','kutija','Delić Transport Ambalaža (kartonske-kutije.rs)','https://kartonske-kutije.rs',85::numeric,1,10,'Antifašističke borbe 22 lokal 7, Novi Beograd. Tražimo natur (braon) varijantu.'),
 ('Tissue papir','papir','Deto','https://deto.rs',null,1,20,null),
 ('Stiker NA KUTIJU (bone krug, zeleni romb)','stiker','Deto','https://deto.rs',null,1,30,'Tiraž 250'),
 ('Stiker NA PAPIR (zeleni krug, bone romb)','stiker','Deto','https://deto.rs',null,1,30,'Tiraž 250'),
 ('Kartica "HARIZMA je ono nešto."','kartica','Deto','https://deto.rs',null,1,20,'Bež papir, zelena štampa. Format A6 ili A7 još nije izabran.'),
 ('Saten etiketa bež/zelena','etiketa','etikete.biz','https://etikete.biz',null,0,30,'Ušiva se u komad'),
 ('Akrilna šnalica (poklon)','poklon',null,null,null,1,10,'Uvoz čeka registraciju firme')
) v(name,kind,supplier,link,unit_price,per_order,min_stock,note)
where not exists (select 1 from public.h_packaging);
-- v4: Povrati, reklamacije, feedback
create sequence if not exists public.h_returns_seq start 1;
create table if not exists public.h_returns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_no text not null unique default ('P-' || lpad(nextval('public.h_returns_seq')::text, 4, '0')),
  type text not null check (type in ('return','exchange','complaint','feedback')),
  source text not null default 'form',
  status text not null default 'new' check (status in ('new','in_review','waiting_package','received','resolved','rejected')),
  order_no text,
  order_id uuid references public.h_orders(id) on delete set null,
  customer_name text not null,
  phone text, email text, instagram text,
  item text,
  size text,
  product_id uuid references public.h_products(id) on delete set null,
  reason text,
  description text,
  photos text[] not null default '{}',
  resolution_wanted text,
  exchange_details text,
  bank_account text,
  rating int check (rating between 1 and 5),
  delivered_on date,
  package_received_at timestamptz,
  refund_amount numeric(10,2),
  return_shipping_cost numeric(10,2),
  restocked boolean not null default false,
  resolution_note text,
  improve text,
  resolved_at timestamptz,
  assignee text,
  consent boolean not null default false
);
alter table public.h_returns enable row level security;
drop policy if exists "team all" on public.h_returns;
create policy "team all" on public.h_returns for all to authenticated using (true) with check (true);
alter table public.h_activities add column if not exists return_id uuid references public.h_returns(id) on delete cascade;

-- javna forma: kupac ne vidi ništa, samo šalje prijavu preko funkcije
create or replace function public.submit_return(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_type text := p->>'type'; v_case text; v_order uuid; v_desc text := trim(coalesce(p->>'description',''));
begin
  if coalesce(p->>'website','') <> '' then raise exception 'spam'; end if;
  if v_type not in ('return','exchange','complaint','feedback') then raise exception 'Nepoznat tip prijave'; end if;
  if length(trim(coalesce(p->>'customer_name',''))) < 2 then raise exception 'Upiši ime i prezime'; end if;
  if coalesce(p->>'phone','') = '' and coalesce(p->>'email','') = '' then raise exception 'Upiši telefon ili email'; end if;
  if v_type <> 'feedback' and length(v_desc) < 30 then raise exception 'Opis mora imati bar 30 karaktera'; end if;
  if v_type = 'complaint' and jsonb_array_length(coalesce(p->'photos','[]'::jsonb)) = 0 then raise exception 'Za reklamaciju je potrebna bar jedna fotografija'; end if;
  if (p->>'consent')::boolean is not true then raise exception 'Potrebna je saglasnost'; end if;
  if length(v_desc) > 4000 then raise exception 'Opis je predugačak'; end if;
  select id into v_order from h_orders where order_no is not null and upper(order_no) = upper(trim(p->>'order_no')) limit 1;
  insert into h_returns (type, source, order_no, order_id, customer_name, phone, email, instagram, item, size, reason, description,
    photos, resolution_wanted, exchange_details, bank_account, rating, delivered_on, consent, improve)
  values (v_type, 'form', nullif(trim(p->>'order_no'),''), v_order, left(trim(p->>'customer_name'),120), left(p->>'phone',40), left(p->>'email',120),
    left(p->>'instagram',80), left(p->>'item',200), left(p->>'size',20), left(p->>'reason',60), v_desc,
    coalesce(array(select left(jsonb_array_elements_text(p->'photos'),300) limit 6), '{}'), left(p->>'resolution_wanted',40),
    left(p->>'exchange_details',300), left(p->>'bank_account',40), nullif(p->>'rating','')::int,
    nullif(p->>'delivered_on','')::date, true, left(p->>'improve',1000))
  returning case_no into v_case;
  insert into h_activities (return_id, type, author, body) select id, 'system', 'Forma', 'Prijava stigla preko forme' from h_returns where case_no = v_case;
  return v_case;
end $$;
revoke all on function public.submit_return(jsonb) from public;
grant execute on function public.submit_return(jsonb) to anon, authenticated;

-- slike: kupac samo otprema u uploads/, vidi ih samo tim
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('returns','returns', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "returns anon upload" on storage.objects;
create policy "returns anon upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'returns' and (storage.foldername(name))[1] = 'uploads');
drop policy if exists "returns team read" on storage.objects;
create policy "returns team read" on storage.objects for select to authenticated using (bucket_id = 'returns');
-- v5: podešavanja (link sajta i sl.)
create table if not exists public.h_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.h_settings enable row level security;
drop policy if exists "team all" on public.h_settings;
create policy "team all" on public.h_settings for all to authenticated using (true) with check (true);
insert into public.h_settings (key, value) values ('site_url', 'https://wegmk4-wf.myshopify.com'), ('site_pass', '')
on conflict (key) do nothing;
-- v6: trajna istorija, promocije, prekretnice, dnevni presek, meko brisanje

-- 1) meko brisanje: ništa se fizički ne briše
do $$ declare t text; begin
  foreach t in array array['h_products','h_variants','h_orders','h_order_items','h_posts','h_site_ideas','h_returns','h_packaging','h_notes','h_story_sections','h_ad_spend'] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by text', t);
  end loop;
end $$;

-- 2) audit: svaka promena svakog reda, zauvek
create table if not exists public.h_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text,
  tbl text not null,
  row_id text,
  op text not null,
  old_row jsonb,
  new_row jsonb,
  changed jsonb
);
create index if not exists h_audit_at_idx on public.h_audit(at desc);
create index if not exists h_audit_row_idx on public.h_audit(tbl, row_id);
alter table public.h_audit enable row level security;
drop policy if exists "team read" on public.h_audit;
create policy "team read" on public.h_audit for select to authenticated using (true);

create or replace function public.h_audit_fn() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text; v_old jsonb; v_new jsonb; v_changed jsonb; k text;
begin
  v_actor := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', 'system');
  v_actor := split_part(v_actor, '@', 1);
  if tg_op = 'INSERT' then v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then v_old := to_jsonb(old); v_new := to_jsonb(new);
    v_changed := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      if v_new->k is distinct from v_old->k then v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('od', v_old->k, 'na', v_new->k)); end if;
    end loop;
    if v_changed = '{}'::jsonb then return new; end if;
  else v_old := to_jsonb(old); end if;
  insert into h_audit (actor, tbl, row_id, op, old_row, new_row, changed)
  values (v_actor, tg_table_name, coalesce(v_new->>'id', v_old->>'id', v_new->>'key', v_old->>'key'), tg_op, v_old, v_new, v_changed);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['h_products','h_variants','h_orders','h_order_items','h_posts','h_site_ideas','h_returns','h_packaging','h_notes','h_story_sections','h_ad_spend','h_settings','h_activities'] loop
    execute format('drop trigger if exists h_audit_trg on public.%I', t);
    execute format('create trigger h_audit_trg after insert or update or delete on public.%I for each row execute function public.h_audit_fn()', t);
  end loop;
end $$;

-- 3) promocije
create table if not exists public.h_promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  type text not null default 'code' check (type in ('code','free_shipping','flash','bundle','giveaway','influencer','launch','other')),
  code text,
  discount_pct numeric(5,2),
  discount_rsd numeric(10,2),
  description text,
  channel text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  budget numeric(10,2),
  goal text,
  result_note text,
  created_by text,
  deleted_at timestamptz, deleted_by text
);
alter table public.h_promotions enable row level security;
drop policy if exists "team all" on public.h_promotions;
create policy "team all" on public.h_promotions for all to authenticated using (true) with check (true);
drop trigger if exists h_audit_trg on public.h_promotions;
create trigger h_audit_trg after insert or update or delete on public.h_promotions for each row execute function public.h_audit_fn();
alter table public.h_activities add column if not exists promo_id uuid references public.h_promotions(id) on delete set null;

-- 4) prekretnice (ručni zapisi u istoriji)
create table if not exists public.h_milestones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  happened_at timestamptz not null default now(),
  kind text not null default 'event' check (kind in ('start','end','decision','milestone','event')),
  title text not null,
  body text,
  author text,
  deleted_at timestamptz, deleted_by text
);
alter table public.h_milestones enable row level security;
drop policy if exists "team all" on public.h_milestones;
create policy "team all" on public.h_milestones for all to authenticated using (true) with check (true);
drop trigger if exists h_audit_trg on public.h_milestones;
create trigger h_audit_trg after insert or update or delete on public.h_milestones for each row execute function public.h_audit_fn();

-- 5) dnevni presek stanja (da se zna kako je bilo tog dana)
create table if not exists public.h_daily_stats (
  day date primary key,
  orders int not null default 0,
  revenue numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  stock_pcs int not null default 0,
  stock_value numeric(12,2) not null default 0,
  ad_spend numeric(12,2) not null default 0,
  open_returns int not null default 0,
  active_products int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.h_daily_stats enable row level security;
drop policy if exists "team all" on public.h_daily_stats;
create policy "team all" on public.h_daily_stats for all to authenticated using (true) with check (true);

insert into public.h_milestones (happened_at, kind, title, body, author)
select '2026-09-16T12:00:00+02'::timestamptz, 'start', 'Pokrenut COMPLETE CRM', 'Prva verzija CRM-a za HARIZMU: porudžbine, garderoba, pakovanje, objave, sajt, brand story, povrati.', 'Konstantin'
where not exists (select 1 from public.h_milestones);
