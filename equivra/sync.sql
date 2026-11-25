-- EQUIVRA · automatska veza sa sajtom (kao crm-shopify za Harizmu). Pokreće se jednom.
create table if not exists public.e_private (
  k text primary key,
  v text,
  updated_at timestamptz not null default now()
);
alter table public.e_private enable row level security;   -- bez politika: čita je samo server (service role)

grant execute on function public.e_ingest_core(text, jsonb, text) to service_role;

-- svakih 5 min: povuci nove registracije, prijave konja, poruke, newsletter i ponude sa sajta
select cron.unschedule('crm-equivra-sync') where exists (select 1 from cron.job where jobname = 'crm-equivra-sync');
select cron.schedule('crm-equivra-sync', '*/5 * * * *', $cron$
  select net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-equivra', body := '{"cron":true}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', (select v from public.h_private where k = 'push_hook')), timeout_milliseconds := 55000)
  where exists (select 1 from public.e_private where k = 'site_refresh')
$cron$);
select 'ok';
