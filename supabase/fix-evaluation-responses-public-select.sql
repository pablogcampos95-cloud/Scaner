drop policy if exists "public_select_evaluation_responses_for_returning" on public.evaluation_responses;
drop policy if exists "authenticated_select_evaluation_responses_for_returning" on public.evaluation_responses;

create policy "public_select_evaluation_responses_for_returning"
on public.evaluation_responses
for select
to anon
using (
  exists (
    select 1
    from public.asignaciones a
    where a.id = evaluation_responses.asignacion_id
      and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso', 'completada')
  )
);

create policy "authenticated_select_evaluation_responses_for_returning"
on public.evaluation_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.asignaciones a
    where a.id = evaluation_responses.asignacion_id
      and (
        a.supervisor_id = auth.uid()
        or public.current_profile_role() = 'admin'
        or a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso', 'completada')
      )
  )
);
