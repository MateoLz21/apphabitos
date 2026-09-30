-- Las columnas `updated_at` existen desde 001, pero nada las modificaba: conservaban para siempre
-- el valor de `created_at`. Este trigger las sincroniza en cada UPDATE.
-- Ejecutar en el SQL Editor de Supabase o mediante Supabase CLI. Es idempotente.

create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists habit_entries_set_updated_at on public.habit_entries;
create trigger habit_entries_set_updated_at before update on public.habit_entries
  for each row execute function public.set_updated_at();

drop trigger if exists reminder_preferences_set_updated_at on public.reminder_preferences;
create trigger reminder_preferences_set_updated_at before update on public.reminder_preferences
  for each row execute function public.set_updated_at();

-- `habit_suggestions` (002) no tiene `updated_at`: su ciclo de vida se sigue con `created_at` y
-- `completed_at`, así que queda fuera a propósito.
