-- EQUIVRA CRM · zadaci, obaveštenja u CRM-u i na telefonu (kao Harizma). Pokreće se jednom.

-- 1) zadaci: prioritet, tačno vreme roka, opis, ko je završio
alter table public.e_tasks add column if not exists priority text not null default 'normal';   -- hitno | visok | normal
alter table public.e_tasks add column if not exists due_at timestamptz;                          -- tačno vreme (opciono)
alter table public.e_tasks add column if not exists note text;
alter table public.e_tasks add column if not exists done_by text;
alter table public.e_tasks add column if not exists reminded_at timestamptz;
alter table public.e_tasks add column if not exists updated_at timestamptz not null default now();

-- 2) obaveštenja (zvonce u CRM-u); username '*' = ceo tim
create table if not exists public.e_notifs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null,
  actor text,
  kind text not null,          -- task | done | urgent | lead | deadline
  title text not null,
  body text,
  go text,
  read_by text[] not null default '{}'
);
create index if not exists e_notifs_created on public.e_notifs (created_at desc);

-- 3) uređaji koji primaju obaveštenja na telefon / računar
create table if not exists public.e_push_subs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  last_ok_at timestamptz,
  fails int not null default 0
);

do $$ declare t text; begin
  foreach t in array array['e_notifs','e_push_subs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format('create policy "team all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
grant all on public.e_notifs, public.e_push_subs to authenticated, service_role;

-- ko je napravio izmenu (korisničko ime iz prijave)
create or replace function public.e_actor() returns text language sql stable as $$
  select split_part(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', 'sistem'), '@', 1)
$$;

-- 4) zadatak: dodeljen, hitan, završen
create or replace function public.e_task_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare a text := public.e_actor();
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.assignee is not null and new.assignee <> a then
      insert into e_notifs (username, actor, kind, title, body, go)
      values (new.assignee, a, case when new.priority = 'hitno' then 'urgent' else 'task' end,
              case when new.priority = 'hitno' then '🚨 HITAN zadatak' else 'Novi zadatak za tebe' end, new.title, 'task:' || new.id);
    end if;
    return new;
  end if;
  if new.done and not old.done then
    new.done_at := coalesce(new.done_at, now()); new.done_by := coalesce(new.done_by, a);
    insert into e_notifs (username, actor, kind, title, body, go)
    select u, a, 'done', '✓ Zadatak završen', new.title, 'task:' || new.id
    from unnest(array[new.author, new.assignee]) u where u is not null and u <> a group by u;
  elsif new.assignee is distinct from old.assignee and new.assignee is not null and new.assignee <> a then
    insert into e_notifs (username, actor, kind, title, body, go)
    values (new.assignee, a, case when new.priority = 'hitno' then 'urgent' else 'task' end, 'Dodeljen ti je zadatak', new.title, 'task:' || new.id);
  elsif new.priority = 'hitno' and old.priority <> 'hitno' and not new.done and new.assignee is not null and new.assignee <> a then
    insert into e_notifs (username, actor, kind, title, body, go)
    values (new.assignee, a, 'urgent', '🚨 Zadatak je označen kao HITAN', new.title, 'task:' || new.id);
  end if;
  if new.due is distinct from old.due or new.due_at is distinct from old.due_at then new.reminded_at := null; end if;
  return new;
end $$;
drop trigger if exists e_task_notify on public.e_tasks;
create trigger e_task_notify before insert or update on public.e_tasks for each row execute function public.e_task_notify();
-- (BEFORE insert ne vidi id pre upisa? vidi: id ima podrazumevanu vrednost)

-- 5) nešto novo sa sajta (samo sveže, ne kad se povlači stara istorija)
create or replace function public.e_inbox_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare c record; at timestamptz := coalesce((new.payload->>'at')::timestamptz, now());
begin
  if at < now() - interval '6 hours' then return new; end if;
  select name into c from e_contacts where id = new.contact_id;
  insert into e_notifs (username, actor, kind, title, body, go)
  values ('*', 'sajt', 'lead',
    case new.event when 'registracija' then '🐎 Nova registracija na sajtu' when 'prijava_konja' then '🐎 Nova prijava konja'
      when 'kontakt' then '✉ Nova poruka sa sajta' when 'newsletter' then '✦ Nova prijava na newsletter' when 'ponuda' then '🔨 Nova ponuda na aukciji' else 'Novo sa sajta' end,
    coalesce(c.name, '') || case new.event when 'prijava_konja' then ' · ' || coalesce(new.payload->>'horse', '')
      when 'ponuda' then ' · ' || coalesce(new.payload->>'horse', '') || ' · ' || coalesce(new.payload->>'amount', '') || ' €'
      when 'kontakt' then ' · ' || left(coalesce(new.payload->>'message', ''), 120) else '' end,
    'contact:' || new.contact_id);
  return new;
end $$;
drop trigger if exists e_inbox_notify on public.e_inbox;
create trigger e_inbox_notify after insert on public.e_inbox for each row execute function public.e_inbox_notify();

-- 6) svako novo obaveštenje odmah ide i na telefon (ista tajna kao kod Harizme)
create or replace function public.e_notif_push() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare sec text;
begin
  select v into sec from public.h_private where k = 'push_hook';
  perform net.http_post(url := 'https://treqdonahihterhaxxfw.supabase.co/functions/v1/crm-equivra',
    body := jsonb_build_object('push', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-crm-hook', sec), timeout_milliseconds := 15000);
  return new;
exception when others then return new;
end $$;
drop trigger if exists e_notif_push on public.e_notifs;
create trigger e_notif_push after insert on public.e_notifs for each row execute function public.e_notif_push();

-- 7) podsetnik za rokove: provera svakih 5 minuta (nezavisno od veze sa sajtom)
select cron.unschedule('crm-equivra-tasks') where exists (select 1 from cron.job where jobname = 'crm-equivra-tasks');
select cron.schedule('crm-equivra-tasks', '*/5 * * * *', $cron$
  insert into public.e_notifs (username, actor, kind, title, body, go)
  select coalesce(t.assignee, '*'), 'sistem', 'deadline',
         case when coalesce(t.due_at, (t.due + time '09:00') at time zone 'Europe/Belgrade') < now() - interval '1 minute' then '⏰ Rok je stigao' else '⏰ Rok za 30 minuta' end,
         t.title, 'task:' || t.id
  from public.e_tasks t
  where not t.done and t.reminded_at is null and t.due is not null
    and coalesce(t.due_at, (t.due + time '09:00') at time zone 'Europe/Belgrade') <= now() + interval '30 minutes'
    and coalesce(t.due_at, (t.due + time '09:00') at time zone 'Europe/Belgrade') > now() - interval '2 days';
  update public.e_tasks set reminded_at = now()
  where not done and reminded_at is null and due is not null
    and coalesce(due_at, (due + time '09:00') at time zone 'Europe/Belgrade') <= now() + interval '30 minutes';
$cron$);

-- 8) uživo u CRM-u
do $$ begin
  begin alter publication supabase_realtime add table public.e_notifs; exception when others then null; end;
end $$;
select 'ok';
