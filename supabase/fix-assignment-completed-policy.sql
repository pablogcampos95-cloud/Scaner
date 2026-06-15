drop policy if exists "public_update_assignment_progress_by_token" on public.asignaciones;

create policy "public_update_assignment_progress_by_token"
on public.asignaciones for update
to anon
using (estado in ('asignada', 'enviada', 'pendiente', 'en_proceso', 'completada'))
with check (estado in ('en_proceso', 'completada'));
