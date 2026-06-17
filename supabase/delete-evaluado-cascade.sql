create or replace function public.delete_evaluado_cascade(p_evaluado_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Solo un administrador puede eliminar evaluados.';
  end if;

  delete from public.manual_reviews mr
  using public.evaluation_responses er
  where mr.response_id = er.id
    and (
      er.evaluado_id = p_evaluado_id
      or er.asignacion_id in (
        select a.id from public.asignaciones a where a.evaluado_id = p_evaluado_id
      )
    );

  delete from public.evaluation_responses er
  where er.evaluado_id = p_evaluado_id
    or er.asignacion_id in (
      select a.id from public.asignaciones a where a.evaluado_id = p_evaluado_id
    );

  delete from public.resultados r
  where r.evaluado_id = p_evaluado_id
    or r.asignacion_id in (
      select a.id from public.asignaciones a where a.evaluado_id = p_evaluado_id
    );

  delete from public.correos_enviados ce
  where ce.asignacion_id in (
    select a.id from public.asignaciones a where a.evaluado_id = p_evaluado_id
  );

  delete from public.asignaciones a
  where a.evaluado_id = p_evaluado_id;

  delete from public.evaluados e
  where e.id = p_evaluado_id;
end;
$$;

grant execute on function public.delete_evaluado_cascade(uuid) to authenticated;
