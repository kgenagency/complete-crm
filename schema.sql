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
-- v7: kupci, loyalty, popusti
create table if not exists public.h_customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text, phone_norm text, email text, instagram text,
  city text, address text, postal_code text,
  tags text[] not null default '{}',
  vip boolean not null default false,
  points_adj int not null default 0,
  birthday date,
  source text,
  note text,
  first_order_at timestamptz,
  deleted_at timestamptz, deleted_by text
);
create index if not exists h_customers_phone_idx on public.h_customers(phone_norm);
alter table public.h_orders add column if not exists customer_id uuid references public.h_customers(id) on delete set null;
alter table public.h_returns add column if not exists customer_id uuid references public.h_customers(id) on delete set null;
alter table public.h_activities add column if not exists customer_id uuid references public.h_customers(id) on delete cascade;

create table if not exists public.h_loyalty_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.h_customers(id) on delete cascade,
  points int not null,
  reason text,
  author text,
  order_id uuid references public.h_orders(id) on delete set null,
  code_id uuid
);
create table if not exists public.h_discount_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null,
  kind text not null default 'general' check (kind in ('general','personal','loyalty','influencer')),
  customer_id uuid references public.h_customers(id) on delete set null,
  pct numeric(5,2), rsd numeric(10,2), min_order numeric(10,2),
  valid_from timestamptz not null default now(), valid_to timestamptz,
  max_uses int,
  note text, created_by text,
  active boolean not null default true,
  deleted_at timestamptz, deleted_by text
);
create unique index if not exists h_discount_codes_code_idx on public.h_discount_codes(upper(code)) where deleted_at is null;

do $$ declare t text; begin
  foreach t in array array['h_customers','h_loyalty_events','h_discount_codes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format('create policy "team all" on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('drop trigger if exists h_audit_trg on public.%I', t);
    execute format('create trigger h_audit_trg after insert or update or delete on public.%I for each row execute function public.h_audit_fn()', t);
  end loop;
end $$;

create or replace function public.h_norm_phone(p text) returns text language sql immutable as $$
  select case when p is null then null else
    regexp_replace(regexp_replace(regexp_replace(p, '\D', '', 'g'), '^00381', '0'), '^381', '0') end $$;
create or replace function public.h_norm_ig(p text) returns text language sql immutable as $$
  select nullif(lower(regexp_replace(coalesce(p,''), '^@|\s|https?://(www\.)?instagram\.com/|/$', '', 'g')), '') $$;

-- nađi ili napravi kupca za porudžbinu
create or replace function public.h_find_or_create_customer(p_name text, p_phone text, p_email text, p_ig text, p_city text, p_address text, p_zip text, p_source text, p_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; ph text := nullif(h_norm_phone(p_phone), ''); ig text := h_norm_ig(p_ig); em text := nullif(lower(trim(p_email)), '');
begin
  if ph is not null then select id into cid from h_customers where phone_norm = ph and deleted_at is null limit 1; end if;
  if cid is null and ig is not null then select id into cid from h_customers where h_norm_ig(instagram) = ig and deleted_at is null limit 1; end if;
  if cid is null and em is not null then select id into cid from h_customers where lower(email) = em and deleted_at is null limit 1; end if;
  if cid is null and ph is null and ig is null and em is null then
    select id into cid from h_customers where lower(name) = lower(trim(p_name)) and deleted_at is null limit 1; end if;
  if cid is null then
    insert into h_customers (name, phone, phone_norm, email, instagram, city, address, postal_code, source, first_order_at)
    values (trim(p_name), p_phone, ph, p_email, p_ig, p_city, p_address, p_zip, p_source, p_at) returning id into cid;
  else
    update h_customers set
      phone = coalesce(phone, p_phone), phone_norm = coalesce(phone_norm, ph), email = coalesce(email, p_email), instagram = coalesce(instagram, p_ig),
      city = coalesce(p_city, city), address = coalesce(p_address, address), postal_code = coalesce(p_zip, postal_code),
      first_order_at = least(coalesce(first_order_at, p_at), coalesce(p_at, first_order_at))
    where id = cid;
  end if;
  return cid;
end $$;

create or replace function public.h_order_link_customer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.customer_id is null and new.customer_name is not null then
    new.customer_id := h_find_or_create_customer(new.customer_name, new.phone, new.email, new.instagram, new.city, new.address, new.postal_code, new.channel, new.created_at);
  end if;
  return new;
end $$;
drop trigger if exists h_order_link_trg on public.h_orders;
create trigger h_order_link_trg before insert or update of customer_name, phone, email, instagram on public.h_orders for each row execute function public.h_order_link_customer();

create or replace function public.h_return_link_customer() returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; ph text := nullif(h_norm_phone(new.phone), ''); ig text := h_norm_ig(new.instagram); em text := nullif(lower(trim(new.email)), '');
begin
  if new.customer_id is null then
    if new.order_id is not null then select customer_id into cid from h_orders where id = new.order_id; end if;
    if cid is null and ph is not null then select id into cid from h_customers where phone_norm = ph and deleted_at is null limit 1; end if;
    if cid is null and ig is not null then select id into cid from h_customers where h_norm_ig(instagram) = ig and deleted_at is null limit 1; end if;
    if cid is null and em is not null then select id into cid from h_customers where lower(email) = em and deleted_at is null limit 1; end if;
    new.customer_id := cid;
  end if;
  return new;
end $$;
drop trigger if exists h_return_link_trg on public.h_returns;
create trigger h_return_link_trg before insert or update of phone, email, instagram, order_id on public.h_returns for each row execute function public.h_return_link_customer();

-- poveži postojeće
update public.h_orders set customer_id = null where customer_id is null; -- pokreće trigger
update public.h_returns set customer_id = null where customer_id is null;

-- podrazumevana pravila kluba
insert into public.h_settings (key, value) values ('loyalty', '{"points_per_100":1,"reward_points":100,"reward_discount":10,"reward_days":30,"tiers":[{"key":"nova","name":"Nova","min_spend":0,"min_orders":1,"discount":0},{"key":"stalna","name":"Stalna","min_spend":8000,"min_orders":2,"discount":5},{"key":"klub","name":"HARIZMA klub","min_spend":20000,"min_orders":4,"discount":10},{"key":"vip","name":"VIP","min_spend":50000,"min_orders":8,"discount":15}]}')
on conflict (key) do nothing;
insert into public.h_discount_codes (code, kind, pct, note, created_by) select 'HARIZMA10', 'general', 10, 'Popust sa sajta, jednom po kupcu', 'Konstantin'
where not exists (select 1 from public.h_discount_codes where upper(code) = 'HARIZMA10');
-- v8: obaveštenja
create table if not exists public.h_notif_state (
  username text primary key,
  cleared_before timestamptz,
  dismissed bigint[] not null default '{}',
  snooze_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.h_notif_state enable row level security;
drop policy if exists "team all" on public.h_notif_state;
create policy "team all" on public.h_notif_state for all to authenticated using (true) with check (true);
-- realtime na audit (živa obaveštenja)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='h_audit') then
    alter publication supabase_realtime add table public.h_audit;
  end if;
end $$;
-- v9: izmena beleški
alter table public.h_notes add column if not exists updated_at timestamptz;
alter table public.h_notes add column if not exists updated_by text;
alter table public.h_notes add column if not exists done_by text;
alter table public.h_notif_state add column if not exists seen_tabs jsonb not null default '{}'::jsonb;
-- v11: AI asistent, evidencija potrošnje
create table if not exists public.h_ai_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  username text not null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read int not null default 0,
  cache_write int not null default 0,
  cost_usd numeric(10,5) not null default 0
);
create index if not exists h_ai_log_user_at on public.h_ai_log(username, at);
alter table public.h_ai_log enable row level security;
drop policy if exists "team read" on public.h_ai_log;
create policy "team read" on public.h_ai_log for select to authenticated using (true);
-- v12: moduli i pristup. Pravila pristupa po korisniku (crm_user) su u potkovice-crm/schema.sql (važe i za h_ tabele).
create or replace function public.h_customer_norm() returns trigger language plpgsql as $$
begin new.phone_norm := nullif(h_norm_phone(new.phone), ''); return new; end $$;
drop trigger if exists h_customer_norm_trg on public.h_customers;
create trigger h_customer_norm_trg before insert or update of phone on public.h_customers for each row execute function public.h_customer_norm();

-- v16: objave + reklame (namena ideje i link za inspiraciju)
alter table h_posts add column if not exists purpose text not null default 'post';
alter table h_posts drop constraint if exists h_posts_purpose_check;
alter table h_posts add constraint h_posts_purpose_check check (purpose in ('post','ad','both'));
alter table h_posts add column if not exists inspo text;

-- v17: više zaduženih na zadacima (objave + reklame, povrati)
alter table h_posts add column if not exists assignees text[] not null default '{}';
alter table h_returns add column if not exists assignees text[] not null default '{}';
-- v17: TASKOVI. Svaka stavka može da ima zadužene i rok; završeni zadaci ostaju kao istorija.
do $$ declare t text; begin
  foreach t in array array['h_notes','h_posts','h_site_ideas','h_packaging','h_returns','h_promotions','h_orders','h_customers','h_products','h_story_sections'] loop
    execute format('alter table %I add column if not exists assignees text[] not null default ''{}''', t);
    execute format('alter table %I add column if not exists task_due date', t);
    execute format('alter table %I add column if not exists task_at timestamptz', t);
    execute format('alter table %I add column if not exists task_by text', t);
    execute format('alter table %I add column if not exists task_done_at timestamptz', t);
    execute format('alter table %I add column if not exists task_done_by text', t);
  end loop;
end $$;

create or replace function public.h_task_fn() returns trigger language plpgsql set search_path = public as $f$
declare
  v_actor text := split_part(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', 'system'), '@', 1);
  v_new jsonb := to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_has boolean := coalesce(array_length(new.assignees, 1), 0) > 0;
begin
  -- nova dodela (neko je dodat): zapamti ko i kad je dodelio; ako je zadatak bio završen, ponovo je otvoren
  if v_has and (tg_op = 'INSERT' or not (new.assignees <@ old.assignees)) then
    new.task_at := now(); new.task_by := v_actor;
    if tg_op = 'UPDATE' and old.task_done_at is not null and new.task_done_at is not distinct from old.task_done_at then
      new.task_done_at := null; new.task_done_by := null;
    end if;
  end if;
  -- prirodan kraj stavke (objavljeno, rešeno, gotovo, isporučeno...) završava zadatak
  if v_has and new.task_done_at is null and array_length(tg_argv, 1) > 0
     and (v_new->>'status') = any(tg_argv)
     and (tg_op = 'INSERT' or (v_old->>'status') is distinct from (v_new->>'status')) then
    new.task_done_at := now(); new.task_done_by := v_actor;
  end if;
  -- beleške: „završeno“ na belešci = završen zadatak (i obrnuto)
  if tg_table_name = 'h_notes' and v_has then
    if (v_new->>'done')::boolean and new.task_done_at is null then
      new.task_done_at := now(); new.task_done_by := coalesce(v_new->>'done_by', v_actor);
    elsif tg_op = 'UPDATE' and not coalesce((v_new->>'done')::boolean, false) and coalesce((v_old->>'done')::boolean, false)
          and new.task_done_at is not distinct from old.task_done_at then
      new.task_done_at := null; new.task_done_by := null;
    end if;
  end if;
  return new;
end $f$;

drop trigger if exists h_task_trg on h_notes;           create trigger h_task_trg before insert or update on h_notes for each row execute function h_task_fn();
drop trigger if exists h_task_trg on h_posts;           create trigger h_task_trg before insert or update on h_posts for each row execute function h_task_fn('published');
drop trigger if exists h_task_trg on h_site_ideas;      create trigger h_task_trg before insert or update on h_site_ideas for each row execute function h_task_fn('done', 'rejected');
drop trigger if exists h_task_trg on h_packaging;       create trigger h_task_trg before insert or update on h_packaging for each row execute function h_task_fn();
drop trigger if exists h_task_trg on h_returns;         create trigger h_task_trg before insert or update on h_returns for each row execute function h_task_fn('resolved', 'rejected');
drop trigger if exists h_task_trg on h_promotions;      create trigger h_task_trg before insert or update on h_promotions for each row execute function h_task_fn();
drop trigger if exists h_task_trg on h_orders;          create trigger h_task_trg before insert or update on h_orders for each row execute function h_task_fn('delivered', 'cancelled', 'returned');
drop trigger if exists h_task_trg on h_customers;       create trigger h_task_trg before insert or update on h_customers for each row execute function h_task_fn();
drop trigger if exists h_task_trg on h_products;        create trigger h_task_trg before insert or update on h_products for each row execute function h_task_fn();
drop trigger if exists h_task_trg on h_story_sections;  create trigger h_task_trg before insert or update on h_story_sections for each row execute function h_task_fn();

-- postojeći zaduženi (objave) dobijaju vreme dodele
update h_posts set task_at = created_at, task_by = lower(coalesce(created_by, 'konstantin')) where coalesce(array_length(assignees,1),0) > 0 and task_at is null;
update h_returns set task_at = created_at where coalesce(array_length(assignees,1),0) > 0 and task_at is null;

-- v18: istorija beleški (kad je beleška završena)
alter table h_notes add column if not exists done_at timestamptz;
-- okidač h_note_done_fn: done = true upisuje done_at (i done_by ako fali), done = false ga briše

-- Izvor porudžbine (atribucija): organic = ručno uneto ili nepoznat izvor
alter table public.h_orders add column if not exists source text not null default 'organic';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'h_orders_source_chk') then
    alter table public.h_orders add constraint h_orders_source_chk check (source in ('organic','meta','tiktok','google'));
  end if;
end $$;

-- opis zadatka („šta treba da se uradi“) na svakoj stavci koja može biti zadatak
do $$ declare t text; begin
  foreach t in array array['h_notes','h_posts','h_site_ideas','h_packaging','h_returns','h_promotions','h_orders','h_customers','h_products','h_story_sections'] loop
    execute format('alter table public.%I add column if not exists task_note text', t);
  end loop;
end $$;

-- Obaveštenja na telefon i računar (Web Push): pretplate po uređaju, tajna za okidač, okidač na h_audit, jutarnji cron
-- (VAPID ključevi i PUSH_HOOK_SECRET su u tajnama Edge funkcija; funkcija crm-push, verify_jwt=false, proverava x-crm-hook)
-- vidi: h_push_subs, h_private, h_push_hook(), h_push_register(), cron 'crm-push-daily' (06 i 07 UTC, funkcija šalje samo u 8h po Beogradu)

-- ===== TIM CHAT: grupa „tim“ + privatne poruke (dm:ime1:ime2, imena po abecedi) =====
create or replace function public.h_chat_can(ch text) returns boolean language sql stable as $$
  select crm_user() in ('konstantin', 'stasa', 'marjan')
    and (ch = 'tim' or (ch ~ '^dm:[a-z]+:[a-z]+$' and crm_user() = any(string_to_array(substr(ch, 4), ':'))))
$$;
create table if not exists public.h_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel = 'tim' or channel ~ '^dm:[a-z]+:[a-z]+$'),
  author text not null,
  body text check (body is null or length(body) <= 4000),
  image_url text,
  mentions text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (body is not null or image_url is not null)
);
create index if not exists h_chat_messages_ch_at on public.h_chat_messages (channel, created_at desc);
alter table public.h_chat_messages enable row level security;
drop policy if exists "chat citanje" on public.h_chat_messages;
drop policy if exists "chat slanje" on public.h_chat_messages;
create policy "chat citanje" on public.h_chat_messages for select to authenticated using (h_chat_can(channel));
create policy "chat slanje" on public.h_chat_messages for insert to authenticated with check (h_chat_can(channel) and author = crm_user());
-- nema politike za izmenu ni brisanje: istorija se ne menja i ne briše

-- pre upisa: autor je uvek prijavljeni korisnik, oznake (@ime) se računaju iz teksta
create or replace function public.h_chat_before() returns trigger language plpgsql as $$
begin
  if crm_user() is not null then new.author := crm_user(); end if;
  new.created_at := now();
  select coalesce(array_agg(distinct x), '{}') into new.mentions from (
    select case translate(lower(m[1]), 'š', 's') when 'all' then 'svi' else translate(lower(m[1]), 'š', 's') end x
    from regexp_matches(coalesce(new.body, ''), '@(konstantin|stasa|staša|marjan|svi|all)\M', 'gi') as m) t;
  return new;
end $$;
drop trigger if exists h_chat_before_trg on public.h_chat_messages;
create trigger h_chat_before_trg before insert on public.h_chat_messages for each row execute function public.h_chat_before();

-- zaštita: poruke se ne mogu menjati ni brisati (ni greškom)
create or replace function public.h_chat_lock() returns trigger language plpgsql as $$
begin raise exception 'Poruke u chatu se ne menjaju i ne brišu (istorija se čuva zauvek)'; end $$;
drop trigger if exists h_chat_lock_trg on public.h_chat_messages;
create trigger h_chat_lock_trg before update or delete on public.h_chat_messages for each row execute function public.h_chat_lock();

-- dokle je ko pročitao (za brojač nepročitanih i „Viđeno“)
create table if not exists public.h_chat_reads (
  username text not null, channel text not null, last_read_at timestamptz not null default now(),
  primary key (username, channel)
);
alter table public.h_chat_reads enable row level security;
drop policy if exists "chat procitano citanje" on public.h_chat_reads;
drop policy if exists "chat procitano upis" on public.h_chat_reads;
drop policy if exists "chat procitano izmena" on public.h_chat_reads;
create policy "chat procitano citanje" on public.h_chat_reads for select to authenticated using (h_chat_can(channel));
create policy "chat procitano upis" on public.h_chat_reads for insert to authenticated with check (username = crm_user() and h_chat_can(channel));
create policy "chat procitano izmena" on public.h_chat_reads for update to authenticated using (username = crm_user()) with check (username = crm_user() and h_chat_can(channel));

-- uživo
do $$ begin
  begin alter publication supabase_realtime add table public.h_chat_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.h_chat_reads; exception when duplicate_object then null; end;
end $$;

-- obaveštenje na telefon samo kad je neko označen (@ime ili @svi)
create or replace function public.h_chat_push() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare sec text;
begin
  if coalesce(array_length(new.mentions, 1), 0) = 0 then return new; end if;
  select v into sec from public.h_private where k = 'push_hook';
  perform net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-push',
    body := jsonb_build_object('chat', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', sec), timeout_milliseconds := 15000);
  return new;
exception when others then return new;
end $$;
drop trigger if exists h_chat_push_trg on public.h_chat_messages;
create trigger h_chat_push_trg after insert on public.h_chat_messages for each row execute function public.h_chat_push();

-- izbor obaveštenja: dodaj „chat“ (podrazumevano uključeno)
alter table public.h_push_subs alter column prefs set default '{"tasks":true,"done":true,"orders":true,"returns":true,"daily":true,"chat":true}'::jsonb;

-- Dnevna kopija baze (funkcija crm-backup, verify_jwt=false, proverava x-crm-hook): sve h_* i p_* tabele kao JSON
-- u privatni repo kgenagency/complete-crm-backups (latest/<tabela>.json + _summary.json). Tajne: GITHUB_BACKUP_TOKEN, BACKUP_REPO.
create or replace function public.h_backup_tables() returns setof text language sql stable security definer set search_path = public as $$
  select table_name::text from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE' and (table_name like 'h\_%' or table_name like 'p\_%')
    and table_name not in ('h_private', 'h_push_subs') order by 1
$$;
create or replace function public.h_backup_dump(t text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if t not in (select public.h_backup_tables()) then raise exception 'nepoznata tabela'; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into r;
  return r;
end $$;
revoke all on function public.h_backup_tables() from public, anon, authenticated;
revoke all on function public.h_backup_dump(text) from public, anon, authenticated;
grant execute on function public.h_backup_tables() to service_role;
grant execute on function public.h_backup_dump(text) to service_role;
select cron.schedule('crm-backup-daily', '30 1 * * *', $c$
  select net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-backup', body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', (select v from public.h_private where k = 'push_hook')), timeout_milliseconds := 120000)
$c$);
-- GIF pretraga: funkcija crm-gif (verify_jwt=true) traži preko Giphy-ja kad postoji tajna GIPHY_API_KEY; bez nje vraća configured:false

-- ===== v23: chat odgovori, reakcije, izmena i brisanje svojih poruka =====
-- v23: odgovor na poruku (reply). Poruka može da citira drugu poruku iz istog razgovora.
alter table public.h_chat_messages add column if not exists reply_to uuid references public.h_chat_messages(id);
create index if not exists h_chat_messages_reply on public.h_chat_messages (reply_to) where reply_to is not null;
create or replace function public.h_chat_before() returns trigger language plpgsql as $$
begin
  if crm_user() is not null then new.author := crm_user(); end if;
  new.created_at := now();
  if new.reply_to is not null and not exists (select 1 from public.h_chat_messages r where r.id = new.reply_to and r.channel = new.channel) then
    raise exception 'Odgovor mora biti na poruku iz istog razgovora';
  end if;
  select coalesce(array_agg(distinct x), '{}') into new.mentions from (
    select case translate(lower(m[1]), 'š', 's') when 'all' then 'svi' else translate(lower(m[1]), 'š', 's') end x
    from regexp_matches(coalesce(new.body, ''), '@(konstantin|stasa|staša|marjan|svi|all)\M', 'gi') as m) t;
  return new;
end $$;

-- v23: reakcije na poruke (jedna po osobi po poruci, kao na WhatsApp-u; nova zamenjuje staru, ponovni klik je skida)
create table if not exists public.h_chat_reactions (
  message_id uuid not null references public.h_chat_messages(id),
  username text not null,
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, username)
);
alter table public.h_chat_reactions enable row level security;
create or replace function public.h_chat_msg_can(mid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.h_chat_messages m where m.id = mid and public.h_chat_can(m.channel))
$$;
drop policy if exists "reakcije citanje" on public.h_chat_reactions;
drop policy if exists "reakcije upis" on public.h_chat_reactions;
drop policy if exists "reakcije izmena" on public.h_chat_reactions;
drop policy if exists "reakcije brisanje" on public.h_chat_reactions;
create policy "reakcije citanje" on public.h_chat_reactions for select to authenticated using (h_chat_msg_can(message_id));
create policy "reakcije upis" on public.h_chat_reactions for insert to authenticated with check (username = crm_user() and h_chat_msg_can(message_id));
create policy "reakcije izmena" on public.h_chat_reactions for update to authenticated using (username = crm_user()) with check (username = crm_user() and h_chat_msg_can(message_id));
create policy "reakcije brisanje" on public.h_chat_reactions for delete to authenticated using (username = crm_user());
create or replace function public.h_chat_rx_before() returns trigger language plpgsql as $$
begin
  if crm_user() is not null then new.username := crm_user(); end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists h_chat_rx_before_trg on public.h_chat_reactions;
create trigger h_chat_rx_before_trg before insert or update on public.h_chat_reactions for each row execute function public.h_chat_rx_before();
do $$ begin
  begin alter publication supabase_realtime add table public.h_chat_reactions; exception when duplicate_object then null; end;
end $$;

-- v23: izmena i brisanje SVOJIH poruka. Original se ne gubi: svaka izmena i brisanje upisuje staru verziju u h_chat_history
-- (klijenti je ne vide, ide u dnevnu kopiju baze). Pravo brisanje reda i dalje nije moguće.
alter table public.h_chat_messages add column if not exists edited_at timestamptz;
alter table public.h_chat_messages add column if not exists deleted_at timestamptz;
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.h_chat_messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%image_url IS NOT NULL%';
  if c is not null then execute format('alter table public.h_chat_messages drop constraint %I', c); end if;
end $$;
alter table public.h_chat_messages add constraint h_chat_messages_content_chk check (body is not null or image_url is not null or deleted_at is not null);
create table if not exists public.h_chat_history (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.h_chat_messages(id),
  action text not null check (action in ('edit', 'delete')),
  body text, image_url text, mentions text[],
  by_user text, at timestamptz not null default now()
);
alter table public.h_chat_history enable row level security;  -- bez politika: klijenti ne čitaju ni ne pišu
create or replace function public.h_chat_before_upd() returns trigger language plpgsql security definer set search_path = public as $$
declare u text := coalesce(crm_user(), '');
begin
  if u <> '' and u <> old.author then raise exception 'Možeš da menjaš i brišeš samo svoje poruke'; end if;
  if old.deleted_at is not null then raise exception 'Poruka je već obrisana'; end if;
  new.id := old.id; new.channel := old.channel; new.author := old.author; new.created_at := old.created_at; new.reply_to := old.reply_to;
  if new.deleted_at is not null then
    insert into public.h_chat_history (message_id, action, body, image_url, mentions, by_user) values (old.id, 'delete', old.body, old.image_url, old.mentions, nullif(u, ''));
    new.deleted_at := now(); new.edited_at := old.edited_at; new.body := null; new.image_url := null; new.mentions := '{}';
    return new;
  end if;
  new.image_url := old.image_url; new.edited_at := old.edited_at;
  new.body := nullif(btrim(coalesce(new.body, '')), '');
  if new.body is not distinct from old.body then new.mentions := old.mentions; return new; end if;
  if new.body is null and new.image_url is null then raise exception 'Poruka ne može biti prazna (za to je Obriši)'; end if;
  if length(new.body) > 4000 then raise exception 'Poruka je preduga'; end if;
  insert into public.h_chat_history (message_id, action, body, image_url, mentions, by_user) values (old.id, 'edit', old.body, old.image_url, old.mentions, nullif(u, ''));
  new.edited_at := now();
  select coalesce(array_agg(distinct x), '{}') into new.mentions from (
    select case translate(lower(m[1]), 'š', 's') when 'all' then 'svi' else translate(lower(m[1]), 'š', 's') end x
    from regexp_matches(coalesce(new.body, ''), '@(konstantin|stasa|staša|marjan|svi|all)\M', 'gi') as m) t;
  return new;
end $$;
create or replace function public.h_chat_lock() returns trigger language plpgsql as $$
begin raise exception 'Poruke se ne brišu iz baze (koristi Obriši u chatu)'; end $$;
drop trigger if exists h_chat_lock_trg on public.h_chat_messages;
create trigger h_chat_lock_trg before delete on public.h_chat_messages for each row execute function public.h_chat_lock();
drop trigger if exists h_chat_upd_trg on public.h_chat_messages;
create trigger h_chat_upd_trg before update on public.h_chat_messages for each row execute function public.h_chat_before_upd();
drop policy if exists "chat izmena" on public.h_chat_messages;
create policy "chat izmena" on public.h_chat_messages for update to authenticated using (author = crm_user() and h_chat_can(channel)) with check (author = crm_user());
create index if not exists h_chat_messages_upd on public.h_chat_messages (greatest(edited_at, deleted_at)) where edited_at is not null or deleted_at is not null;

-- ===== v25: komentari na zadacima, huddle pozivi, glasovne poruke =====
-- v25: komentari na zadacima (kanal task:<tabela>:<id>) i huddle pozivi (poruka kind='huddle')
alter table public.h_chat_messages drop constraint if exists h_chat_messages_channel_check;
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.h_chat_messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%channel%' loop
    execute format('alter table public.h_chat_messages drop constraint %I', c);
  end loop;
end $$;
alter table public.h_chat_messages add constraint h_chat_messages_channel_chk check (
  channel = 'tim' or channel ~ '^dm:[a-z]+:[a-z]+$'
  or channel ~ '^task:h_(notes|posts|site_ideas|packaging|returns|promotions|orders|customers|products|story_sections):[0-9a-f-]{36}$');
alter table public.h_chat_messages add column if not exists kind text;
alter table public.h_chat_messages drop constraint if exists h_chat_messages_kind_chk;
alter table public.h_chat_messages add constraint h_chat_messages_kind_chk check (kind is null or kind = 'huddle');
create or replace function public.h_chat_can(ch text) returns boolean language sql stable as $$
  select crm_user() in ('konstantin', 'stasa', 'marjan')
    and (ch = 'tim' or ch like 'task:%' or (ch ~ '^dm:[a-z]+:[a-z]+$' and crm_user() = any(string_to_array(substr(ch, 4), ':'))))
$$;
-- push: oznake, huddle poziv, ili komentar na zadatku (tada funkcija sama bira ko prati zadatak)
create or replace function public.h_chat_push() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare sec text;
begin
  if coalesce(array_length(new.mentions, 1), 0) = 0 and new.kind is null and new.channel not like 'task:%' then return new; end if;
  select v into sec from public.h_private where k = 'push_hook';
  perform net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-push',
    body := jsonb_build_object('chat', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', sec), timeout_milliseconds := 15000);
  return new;
exception when others then return new;
end $$;
-- tajno ime kanala za signalizaciju poziva (vide ga samo članovi tima)
insert into public.h_private (k, v) values ('rt_room', encode(extensions.gen_random_bytes(18), 'hex')) on conflict (k) do nothing;
create or replace function public.h_rt_room() returns text language sql stable security definer set search_path = public as $$
  select v from public.h_private where k = 'rt_room' and crm_user() in ('konstantin', 'stasa', 'marjan')
$$;
revoke all on function public.h_rt_room() from public, anon;
grant execute on function public.h_rt_room() to authenticated;
alter table public.h_push_subs alter column prefs set default '{"tasks":true,"done":true,"orders":true,"returns":true,"daily":true,"chat":true,"comments":true,"calls":true}'::jsonb;

-- v25: glasovne poruke (audio_url + trajanje)
alter table public.h_chat_messages add column if not exists audio_url text;
alter table public.h_chat_messages add column if not exists audio_sec real;
alter table public.h_chat_messages drop constraint if exists h_chat_messages_content_chk;
alter table public.h_chat_messages add constraint h_chat_messages_content_chk check (body is not null or image_url is not null or audio_url is not null or deleted_at is not null);
alter table public.h_chat_history add column if not exists audio_url text;
create or replace function public.h_chat_before_upd() returns trigger language plpgsql security definer set search_path = public as $$
declare u text := coalesce(crm_user(), '');
begin
  if u <> '' and u <> old.author then raise exception 'Možeš da menjaš i brišeš samo svoje poruke'; end if;
  if old.deleted_at is not null then raise exception 'Poruka je već obrisana'; end if;
  new.id := old.id; new.channel := old.channel; new.author := old.author; new.created_at := old.created_at; new.reply_to := old.reply_to; new.kind := old.kind;
  if new.deleted_at is not null then
    insert into public.h_chat_history (message_id, action, body, image_url, audio_url, mentions, by_user) values (old.id, 'delete', old.body, old.image_url, old.audio_url, old.mentions, nullif(u, ''));
    new.deleted_at := now(); new.edited_at := old.edited_at; new.body := null; new.image_url := null; new.audio_url := null; new.mentions := '{}';
    return new;
  end if;
  new.image_url := old.image_url; new.audio_url := old.audio_url; new.audio_sec := old.audio_sec; new.edited_at := old.edited_at;
  new.body := nullif(btrim(coalesce(new.body, '')), '');
  if new.body is not distinct from old.body then new.mentions := old.mentions; return new; end if;
  if new.body is null and new.image_url is null and new.audio_url is null then raise exception 'Poruka ne može biti prazna (za to je Obriši)'; end if;
  if length(new.body) > 4000 then raise exception 'Poruka je preduga'; end if;
  insert into public.h_chat_history (message_id, action, body, image_url, audio_url, mentions, by_user) values (old.id, 'edit', old.body, old.image_url, old.audio_url, old.mentions, nullif(u, ''));
  new.edited_at := now();
  select coalesce(array_agg(distinct x), '{}') into new.mentions from (
    select case translate(lower(m[1]), 'š', 's') when 'all' then 'svi' else translate(lower(m[1]), 'š', 's') end x
    from regexp_matches(coalesce(new.body, ''), '@(konstantin|stasa|staša|marjan|svi|all)\M', 'gi') as m) t;
  return new;
end $$;

-- v26: „poslednji put aktivan/na“ za članove tima
create table if not exists public.h_last_seen (
  username text primary key,
  last_seen_at timestamptz not null default now(),
  device text
);
alter table public.h_last_seen enable row level security;
drop policy if exists "aktivnost citanje" on public.h_last_seen;
create policy "aktivnost citanje" on public.h_last_seen for select to authenticated using (crm_user() in ('konstantin', 'stasa', 'marjan'));
create or replace function public.h_seen_ping(p_device text default null) returns timestamptz language sql volatile security definer set search_path = public as $$
  insert into public.h_last_seen (username, last_seen_at, device)
  select crm_user(), now(), left(p_device, 80) where crm_user() in ('konstantin', 'stasa', 'marjan')
  on conflict (username) do update set last_seen_at = excluded.last_seen_at, device = coalesce(excluded.device, h_last_seen.device)
  returning last_seen_at
$$;
revoke all on function public.h_seen_ping(text) from public, anon;
grant execute on function public.h_seen_ping(text) to authenticated;
-- početne vrednosti: poslednja promena u CRM-u ili poslednja poruka u chatu
insert into public.h_last_seen (username, last_seen_at)
select u, max(t) from (
  select actor u, max(at) t from public.h_audit where actor in ('konstantin', 'stasa', 'marjan') group by actor
  union all select author, max(created_at) from public.h_chat_messages group by author
  union all select username, max(last_read_at) from public.h_chat_reads group by username
) x group by u
on conflict (username) do update set last_seen_at = greatest(h_last_seen.last_seen_at, excluded.last_seen_at);
do $$ begin begin alter publication supabase_realtime add table public.h_last_seen; exception when duplicate_object then null; end; end $$;

-- ===== v27: prioritet zadatka, tačno vreme roka, alarmi za rokove i hitne =====
-- v27: prioritet i tačno vreme roka za zadatke + podsetnici (sat pre; hitni i 15 min pre, u roku i na 30 min dok kasne)
do $$ declare t text; begin
  foreach t in array array['h_notes','h_posts','h_site_ideas','h_packaging','h_returns','h_promotions','h_orders','h_customers','h_products','h_story_sections'] loop
    execute format('alter table public.%I add column if not exists task_prio text', t);
    execute format('alter table public.%I add column if not exists task_due_at timestamptz', t);
    begin execute format('alter table public.%I add constraint %I check (task_prio is null or task_prio in (''urgent'',''high'',''normal'',''low''))', t, t || '_task_prio_chk'); exception when duplicate_object then null; end;
  end loop;
end $$;
-- dnevnik poslatih podsetnika (da nijedan ne stigne dva puta); klijenti ga ne vide
create table if not exists public.h_task_alerts (
  tbl text not null, row_id uuid not null, kind text not null, due_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (tbl, row_id, kind, due_at)
);
alter table public.h_task_alerts enable row level security;
create or replace function public.h_task_alerts_run() returns int language plpgsql security definer set search_path = public, extensions as $$
declare t text; r record; n int := 0; sec text; k text; c int; hr int; late int;
begin
  select v into sec from public.h_private where h_private.k = 'push_hook';
  hr := extract(hour from (now() at time zone 'Europe/Belgrade'))::int;
  foreach t in array array['h_notes','h_posts','h_site_ideas','h_packaging','h_returns','h_promotions','h_orders','h_customers','h_products','h_story_sections'] loop
    for r in execute format('select id, task_due_at, coalesce(task_prio, ''normal'') prio from public.%I
        where deleted_at is null and task_done_at is null and coalesce(array_length(assignees, 1), 0) > 0
          and task_due_at is not null and task_due_at < now() + interval ''61 minutes'' and task_due_at > now() - interval ''3 days''', t) loop
      k := null;
      if now() < r.task_due_at then
        if r.prio = 'urgent' and now() >= r.task_due_at - interval '15 minutes' then k := 'm15';
        elsif now() >= r.task_due_at - interval '60 minutes' then k := 'h1'; end if;
      elsif r.prio = 'urgent' then
        late := floor(extract(epoch from (now() - r.task_due_at)) / 1800)::int;
        if late = 0 then k := 'due';
        elsif hr >= 8 and hr < 23 then k := 'late' || late; end if;
      end if;
      if k is null then continue; end if;
      -- ako je „h1“ preskočen jer je 15 min već tu, ne šalji i „h1“ kasnije
      insert into public.h_task_alerts (tbl, row_id, kind, due_at) values (t, r.id, k, r.task_due_at) on conflict do nothing;
      get diagnostics c = row_count;
      if c = 1 then
        if k = 'm15' then insert into public.h_task_alerts (tbl, row_id, kind, due_at) values (t, r.id, 'h1', r.task_due_at) on conflict do nothing; end if;
        perform net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-push',
          body := jsonb_build_object('alert', jsonb_build_object('tbl', t, 'id', r.id, 'kind', k)),
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', sec), timeout_milliseconds := 15000);
        n := n + 1;
      end if;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.h_task_alerts_run() from public, anon, authenticated;
select cron.unschedule('crm-task-alerts') where exists (select 1 from cron.job where jobname = 'crm-task-alerts');
select cron.schedule('crm-task-alerts', '* * * * *', 'select public.h_task_alerts_run()');
alter table public.h_push_subs alter column prefs set default '{"tasks":true,"done":true,"orders":true,"returns":true,"daily":true,"chat":true,"comments":true,"calls":true,"deadline":true}'::jsonb;
select 'ok';

-- ===== v28: @oznake u svim poljima (obaveštenje označenom), obaveštenje i kad se prioritet promeni na hitno =====
-- v28: obaveštenje i kad se prioritet promeni na hitno, i kad neko označi @ime u bilo kom polju
create or replace function public.h_push_hook()
 returns trigger language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare sec text; rel boolean := false; ch jsonb := coalesce(new.changed, '{}'::jsonb);
begin
  if new.op = 'INSERT' and new.tbl in ('h_orders', 'h_returns') then rel := true; end if;
  if jsonb_typeof(new.new_row -> 'assignees') = 'array' and jsonb_array_length(new.new_row -> 'assignees') > 0
     and (new.op = 'INSERT' or ch ? 'assignees' or ch ? 'task_done_at' or ch ? 'task_prio') then rel := true; end if;
  if new.tbl like 'h\_%' and new.new_row is not null
     and (case when new.op = 'INSERT' or new.changed is null then new.new_row::text else new.changed::text end) ~* '@(konstantin|sta[sšSŠ]a|marjan|svi|sve|all)' then rel := true; end if;
  if not rel then return new; end if;
  select v into sec from public.h_private where k = 'push_hook';
  perform net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-push',
    body := jsonb_build_object('audit', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', sec),
    timeout_milliseconds := 15000);
  return new;
exception when others then return new;
end $function$;
alter table public.h_push_subs alter column prefs set default '{"tasks":true,"done":true,"orders":true,"returns":true,"daily":true,"chat":true,"comments":true,"calls":true,"deadline":true,"mentions":true}'::jsonb;
select 'ok';
