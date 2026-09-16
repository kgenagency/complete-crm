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
