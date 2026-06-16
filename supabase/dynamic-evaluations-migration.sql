alter table public.evaluaciones add column if not exists objetivo text;
alter table public.evaluaciones add column if not exists tiempo_limite_minutos integer;
alter table public.evaluaciones add column if not exists created_by uuid references public.profiles(id);
alter table public.evaluaciones add column if not exists updated_at timestamp with time zone default now();

alter table public.resultados add column if not exists estado_resultado text default 'completo';
alter table public.resultados add column if not exists score_obtained numeric default 0;
alter table public.resultados add column if not exists max_score numeric default 0;
alter table public.resultados add column if not exists pending_reviews integer default 0;

create table if not exists public.evaluation_sections (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid references public.evaluaciones(id) on delete cascade,
  nombre text not null,
  descripcion text,
  orden integer default 1,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid references public.evaluaciones(id) on delete cascade,
  section_id uuid references public.evaluation_sections(id) on delete set null,
  question_type text not null check (question_type in ('single_choice', 'multiple_choice', 'short_text', 'long_text', 'audio_response', 'spreadsheet', 'kpi_numeric')),
  titulo text not null,
  descripcion text,
  instrucciones text,
  puntaje numeric default 1,
  orden integer default 1,
  required boolean default true,
  scoring_mode text default 'auto' check (scoring_mode in ('auto', 'manual', 'rubric', 'mixed')),
  correct_answer jsonb,
  settings jsonb,
  rubric jsonb,
  estado text default 'activa',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean default false,
  orden integer default 1,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid references public.asignaciones(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  evaluado_id uuid references public.evaluados(id),
  answer_type text,
  answer_text text,
  answer_json jsonb,
  audio_path text,
  audio_url text,
  is_correct boolean,
  score_obtained numeric default 0,
  max_score numeric default 0,
  requires_review boolean default false,
  reviewed_by uuid references public.profiles(id),
  review_comment text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.manual_reviews (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references public.evaluation_responses(id) on delete cascade,
  reviewer_id uuid references public.profiles(id),
  score numeric,
  comment text,
  rubric_result jsonb,
  created_at timestamp with time zone not null default now()
);

insert into storage.buckets (id, name, public)
values ('audio-responses', 'audio-responses', false)
on conflict (id) do nothing;

alter table public.evaluation_sections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.evaluation_responses enable row level security;
alter table public.manual_reviews enable row level security;

drop policy if exists "admin_insert_evaluaciones" on public.evaluaciones;
create policy "admin_insert_evaluaciones" on public.evaluaciones for insert to authenticated with check (public.current_profile_role() = 'admin');

drop policy if exists "admin_update_evaluaciones" on public.evaluaciones;
create policy "admin_update_evaluaciones" on public.evaluaciones for update to authenticated using (public.current_profile_role() = 'admin') with check (public.current_profile_role() = 'admin');

drop policy if exists "admin_manage_sections" on public.evaluation_sections;
create policy "admin_manage_sections" on public.evaluation_sections for all to authenticated using (public.current_profile_role() = 'admin') with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_sections" on public.evaluation_sections;
create policy "authenticated_read_sections" on public.evaluation_sections for select to authenticated using (true);

drop policy if exists "public_read_sections" on public.evaluation_sections;
create policy "public_read_sections" on public.evaluation_sections for select to anon using (true);

drop policy if exists "admin_manage_questions" on public.questions;
create policy "admin_manage_questions" on public.questions for all to authenticated using (public.current_profile_role() = 'admin') with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_questions" on public.questions;
create policy "authenticated_read_questions" on public.questions for select to authenticated using (true);

drop policy if exists "public_read_questions" on public.questions;
create policy "public_read_questions" on public.questions for select to anon using (estado = 'activa');

drop policy if exists "admin_manage_question_options" on public.question_options;
create policy "admin_manage_question_options" on public.question_options for all to authenticated using (public.current_profile_role() = 'admin') with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_question_options" on public.question_options;
create policy "authenticated_read_question_options" on public.question_options for select to authenticated using (true);

drop policy if exists "public_read_question_options" on public.question_options;
create policy "public_read_question_options" on public.question_options for select to anon using (true);

drop policy if exists "public_insert_evaluation_responses" on public.evaluation_responses;
create policy "public_insert_evaluation_responses" on public.evaluation_responses for insert to anon with check (true);

drop policy if exists "admin_select_all_responses" on public.evaluation_responses;
create policy "admin_select_all_responses" on public.evaluation_responses for select to authenticated using (public.current_profile_role() = 'admin');

drop policy if exists "supervisor_select_own_responses" on public.evaluation_responses;
create policy "supervisor_select_own_responses" on public.evaluation_responses for select to authenticated using (
  exists (select 1 from public.asignaciones a where a.id = evaluation_responses.asignacion_id and a.supervisor_id = auth.uid())
);

drop policy if exists "reviewer_update_responses" on public.evaluation_responses;
create policy "reviewer_update_responses" on public.evaluation_responses for update to authenticated using (
  public.current_profile_role() = 'admin'
  or exists (select 1 from public.asignaciones a where a.id = evaluation_responses.asignacion_id and a.supervisor_id = auth.uid())
) with check (true);

drop policy if exists "reviewer_insert_manual_reviews" on public.manual_reviews;
create policy "reviewer_insert_manual_reviews" on public.manual_reviews for insert to authenticated with check (
  public.current_profile_role() = 'admin'
  or exists (
    select 1 from public.evaluation_responses er
    join public.asignaciones a on a.id = er.asignacion_id
    where er.id = manual_reviews.response_id and a.supervisor_id = auth.uid()
  )
);

drop policy if exists "reviewer_select_manual_reviews" on public.manual_reviews;
create policy "reviewer_select_manual_reviews" on public.manual_reviews for select to authenticated using (public.current_profile_role() = 'admin' or reviewer_id = auth.uid());

drop policy if exists "public_upload_audio_responses" on storage.objects;
create policy "public_upload_audio_responses" on storage.objects for insert to anon with check (bucket_id = 'audio-responses');

drop policy if exists "authenticated_read_audio_responses" on storage.objects;
create policy "authenticated_read_audio_responses" on storage.objects for select to authenticated using (bucket_id = 'audio-responses');
