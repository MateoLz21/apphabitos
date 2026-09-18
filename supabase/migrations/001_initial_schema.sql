-- Ejecutar en el SQL Editor de Supabase o mediante Supabase CLI.
create extension if not exists "pgcrypto";
create type public.tracking_type as enum ('boolean', 'quantitative');
create type public.reminder_channel as enum ('whatsapp');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone_number text, timezone text not null default 'America/Lima',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, slug text not null, description text, tracking_type public.tracking_type not null default 'boolean',
  unit text, target_value numeric(12, 2) check (target_value is null or target_value >= 0), color text not null default '#2563eb', icon text,
  is_active boolean not null default true, sort_order smallint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, slug)
);
create table public.habit_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade, entry_date date not null, completed boolean not null default false,
  numeric_value numeric(12, 2) check (numeric_value is null or numeric_value >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, habit_id, entry_date)
);
create table public.reminder_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  enabled boolean not null default false, channel public.reminder_channel not null default 'whatsapp', reminder_time time not null default '20:00',
  timezone text not null default 'America/Lima', phone_number text, consent_given boolean not null default false, last_reminder_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index habit_entries_user_date_idx on public.habit_entries(user_id, entry_date);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.habits (user_id, name, slug, description, tracking_type, unit, target_value, color, icon, sort_order) values
    (new.id, 'Ordenar la cama', 'ordenar-cama', 'Empieza el día con orden', 'boolean', null, null, '#7c3aed', 'bed-double', 1),
    (new.id, 'Hacer ejercicio', 'hacer-ejercicio', 'Muévete cada día', 'quantitative', 'minutos', 30, '#ea580c', 'dumbbell', 2),
    (new.id, 'Comer saludable', 'comer-saludable', 'Elige alimentos que te nutran', 'boolean', null, null, '#16a34a', 'salad', 3),
    (new.id, 'Ahorrar dinero', 'ahorrar-dinero', 'Construye tu tranquilidad financiera', 'quantitative', 'soles', 5, '#2563eb', 'circle-dollar-sign', 4);
  insert into public.reminder_preferences (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.reminder_preferences enable row level security;
create policy "Users manage own profile" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users manage own habits" on public.habits for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own entries" on public.habit_entries for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own reminder preferences" on public.reminder_preferences for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
