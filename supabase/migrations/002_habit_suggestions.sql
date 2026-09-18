-- Cola de solicitudes para que Make invoque GPT y devuelva sugerencias al usuario.
create type public.suggestion_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.habit_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null check (char_length(goal) between 3 and 300),
  status public.suggestion_status not null default 'pending',
  suggestions jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index habit_suggestions_user_created_idx on public.habit_suggestions(user_id, created_at desc);
alter table public.habit_suggestions enable row level security;
create policy "Users read and create own suggestion requests" on public.habit_suggestions for select using ((select auth.uid()) = user_id);
create policy "Users create own suggestion requests" on public.habit_suggestions for insert with check ((select auth.uid()) = user_id);
