drop policy if exists "authenticated_public_insert_evaluation_responses" on public.evaluation_responses;
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

drop policy if exists "authenticated_public_insert_result_once" on public.resultados;
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

drop policy if exists "authenticated_public_update_assignment_progress_by_token" on public.asignaciones;
create policy "authenticated_public_update_assignment_progress_by_token"
on public.asignaciones for update
to authenticated
using (estado in ('asignada', 'enviada', 'pendiente', 'en_proceso'))
with check (estado in ('en_proceso', 'completada'));

drop policy if exists "authenticated_public_upload_audio_responses" on storage.objects;
create policy "authenticated_public_upload_audio_responses"
on storage.objects for insert
to authenticated
with check (bucket_id = 'audio-responses');

select pg_notify('pgrst', 'reload schema');
