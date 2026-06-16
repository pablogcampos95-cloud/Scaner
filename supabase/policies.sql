alter table public.profiles enable row level security;
alter table public.evaluados enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.asignaciones enable row level security;
alter table public.resultados enable row level security;
alter table public.correos_enviados enable row level security;
alter table public.logs_actividad enable row level security;
alter table public.evaluation_sections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.evaluation_responses enable row level security;
alter table public.manual_reviews enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_profile_role() = 'admin');

create policy "admin_select_all_evaluados"
on public.evaluados for select
to authenticated
using (public.current_profile_role() = 'admin');

create policy "supervisor_select_own_evaluados"
on public.evaluados for select
to authenticated
using (supervisor_id = auth.uid());

create policy "supervisor_insert_own_evaluados"
on public.evaluados for insert
to authenticated
with check (supervisor_id = auth.uid());

create policy "authenticated_select_active_evaluaciones"
on public.evaluaciones for select
to authenticated
using (true);

create policy "admin_insert_evaluaciones"
on public.evaluaciones for insert
to authenticated
with check (public.current_profile_role() = 'admin');

create policy "admin_update_evaluaciones"
on public.evaluaciones for update
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy "public_select_active_evaluaciones"
on public.evaluaciones for select
to anon
using (estado = 'activa');

create policy "admin_manage_sections"
on public.evaluation_sections for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy "authenticated_read_sections"
on public.evaluation_sections for select
to authenticated
using (true);

create policy "public_read_sections"
on public.evaluation_sections for select
to anon
using (true);

create policy "admin_manage_questions"
on public.questions for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy "authenticated_read_questions"
on public.questions for select
to authenticated
using (true);

create policy "public_read_questions"
on public.questions for select
to anon
using (estado = 'activa');

create policy "admin_manage_question_options"
on public.question_options for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy "authenticated_read_question_options"
on public.question_options for select
to authenticated
using (true);

create policy "public_read_question_options"
on public.question_options for select
to anon
using (true);

create policy "admin_select_all_asignaciones"
on public.asignaciones for select
to authenticated
using (public.current_profile_role() = 'admin');

create policy "supervisor_select_own_asignaciones"
on public.asignaciones for select
to authenticated
using (supervisor_id = auth.uid());

create policy "supervisor_insert_own_asignaciones"
on public.asignaciones for insert
to authenticated
with check (supervisor_id = auth.uid());

create policy "supervisor_update_own_asignaciones"
on public.asignaciones for update
to authenticated
using (supervisor_id = auth.uid())
with check (supervisor_id = auth.uid());

create policy "public_read_assignment_by_token"
on public.asignaciones for select
to anon
using (estado in ('asignada', 'enviada', 'pendiente', 'en_proceso'));

create policy "public_read_evaluado_with_active_assignment"
on public.evaluados for select
to anon
using (
  exists (
    select 1 from public.asignaciones a
    where a.evaluado_id = evaluados.id
    and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso')
  )
);

create policy "public_update_assignment_progress_by_token"
on public.asignaciones for update
to anon
using (true)
with check (true);

create policy "authenticated_public_update_assignment_progress_by_token"
on public.asignaciones for update
to authenticated
using (estado in ('asignada', 'enviada', 'pendiente', 'en_proceso'))
with check (estado in ('en_proceso', 'completada'));

create policy "admin_select_all_resultados"
on public.resultados for select
to authenticated
using (public.current_profile_role() = 'admin');

create policy "supervisor_select_own_resultados"
on public.resultados for select
to authenticated
using (supervisor_id = auth.uid());

create policy "public_check_result_by_assignment"
on public.resultados for select
to anon
using (
  exists (
    select 1 from public.asignaciones a
    where a.id = resultados.asignacion_id
    and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso', 'completada')
  )
);

create policy "public_insert_result_once"
on public.resultados for insert
to anon
with check (true);

create policy "authenticated_public_insert_result_once"
on public.resultados for insert
to authenticated
with check (
  exists (
    select 1
    from public.asignaciones a
    where a.id = resultados.asignacion_id
    and a.evaluado_id = resultados.evaluado_id
    and a.supervisor_id = resultados.supervisor_id
    and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso')
  )
);

create policy "public_insert_evaluation_responses"
on public.evaluation_responses for insert
to anon
with check (true);

create policy "authenticated_public_insert_evaluation_responses"
on public.evaluation_responses for insert
to authenticated
with check (
  exists (
    select 1
    from public.asignaciones a
    join public.questions q on q.id = evaluation_responses.question_id
    where a.id = evaluation_responses.asignacion_id
    and q.evaluacion_id = a.evaluacion_id
    and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso')
  )
);

create policy "admin_select_all_responses"
on public.evaluation_responses for select
to authenticated
using (public.current_profile_role() = 'admin');

create policy "supervisor_select_own_responses"
on public.evaluation_responses for select
to authenticated
using (
  exists (
    select 1 from public.asignaciones a
    where a.id = evaluation_responses.asignacion_id
    and a.supervisor_id = auth.uid()
  )
);

create policy "reviewer_update_responses"
on public.evaluation_responses for update
to authenticated
using (
  public.current_profile_role() = 'admin'
  or exists (
    select 1 from public.asignaciones a
    where a.id = evaluation_responses.asignacion_id
    and a.supervisor_id = auth.uid()
  )
)
with check (true);

create policy "reviewer_insert_manual_reviews"
on public.manual_reviews for insert
to authenticated
with check (
  public.current_profile_role() = 'admin'
  or exists (
    select 1
    from public.evaluation_responses er
    join public.asignaciones a on a.id = er.asignacion_id
    where er.id = manual_reviews.response_id
    and a.supervisor_id = auth.uid()
  )
);

create policy "reviewer_select_manual_reviews"
on public.manual_reviews for select
to authenticated
using (public.current_profile_role() = 'admin' or reviewer_id = auth.uid());

create policy "public_upload_audio_responses"
on storage.objects for insert
to anon
with check (bucket_id = 'audio-responses');

create policy "authenticated_public_upload_audio_responses"
on storage.objects for insert
to authenticated
with check (bucket_id = 'audio-responses');

create policy "authenticated_read_audio_responses"
on storage.objects for select
to authenticated
using (bucket_id = 'audio-responses');

create policy "no_result_updates_for_authenticated"
on public.resultados for update
to authenticated
using (false)
with check (false);

create policy "admin_select_correos"
on public.correos_enviados for select
to authenticated
using (public.current_profile_role() = 'admin');

create policy "supervisor_select_own_correos"
on public.correos_enviados for select
to authenticated
using (
  exists (
    select 1 from public.asignaciones a
    where a.id = correos_enviados.asignacion_id
    and a.supervisor_id = auth.uid()
  )
);

create policy "supervisor_insert_correos"
on public.correos_enviados for insert
to authenticated
with check (
  exists (
    select 1 from public.asignaciones a
    where a.id = correos_enviados.asignacion_id
    and a.supervisor_id = auth.uid()
  )
);

create policy "authenticated_insert_logs"
on public.logs_actividad for insert
to authenticated
with check (usuario_id = auth.uid());

create policy "admin_select_logs"
on public.logs_actividad for select
to authenticated
using (public.current_profile_role() = 'admin');
