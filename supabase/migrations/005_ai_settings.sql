-- Configuración general de la IA: una sola clave de Gemini para toda la aplicación, que solo un
-- administrador puede cambiar. La clave nunca llega al navegador: la lee la Edge Function
-- `suggest-habits` con la clave `service_role`.
-- Ejecutar en el SQL Editor de Supabase o mediante Supabase CLI. Es idempotente.

-- Administradores. Tabla aparte, y no una columna en `profiles`, porque la política de `profiles`
-- deja a cada usuario modificar su propia fila: una columna `is_admin` ahí sería autoasignable.
-- Aquí no hay política de escritura, así que solo se añade un administrador desde el SQL Editor.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists "Users see own admin flag" on public.app_admins;
create policy "Users see own admin flag" on public.app_admins for select using ((select auth.uid()) = user_id);

-- Fila única (`id` siempre true). RLS activado y sin políticas: ni `anon` ni `authenticated`
-- pueden leerla o escribirla por la API. Solo las funciones de abajo y la Edge Function.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  gemini_api_key text,
  gemini_model text not null default 'gemini-3.8-flash',
  daily_suggestion_limit integer not null default 10 check (daily_suggestion_limit between 1 and 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

-- Devuelve el estado de la configuración sin exponer la clave: solo una pista enmascarada.
create or replace function public.get_ai_settings()
returns table (has_key boolean, key_hint text, model text, daily_limit integer, changed_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo un administrador puede ver esta configuración.' using errcode = '42501';
  end if;
  return query
    select
      coalesce(s.gemini_api_key, '') <> '',
      case
        when coalesce(s.gemini_api_key, '') = '' then null
        else left(s.gemini_api_key, 4) || '••••••••••••' || right(s.gemini_api_key, 4)
      end,
      s.gemini_model,
      s.daily_suggestion_limit,
      s.updated_at
    from public.app_settings s
    where s.id;
end;
$$;

-- Los parámetros nulos o vacíos conservan el valor actual, así se puede cambiar el modelo sin
-- volver a escribir la clave.
create or replace function public.update_ai_settings(
  new_api_key text default null,
  new_model text default null,
  new_daily_limit integer default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Solo un administrador puede cambiar esta configuración.' using errcode = '42501';
  end if;
  update public.app_settings s set
    gemini_api_key = coalesce(nullif(trim(new_api_key), ''), s.gemini_api_key),
    gemini_model = coalesce(nullif(trim(new_model), ''), s.gemini_model),
    daily_suggestion_limit = coalesce(new_daily_limit, s.daily_suggestion_limit),
    updated_at = now(),
    updated_by = (select auth.uid())
  where s.id;
end;
$$;

revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.get_ai_settings() from public, anon;
revoke all on function public.update_ai_settings(text, text, integer) from public, anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.get_ai_settings() to authenticated;
grant execute on function public.update_ai_settings(text, text, integer) to authenticated;

-- Para nombrar al primer administrador, ejecuta aparte (con tu correo):
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'tu@correo.com'
--   on conflict do nothing;
