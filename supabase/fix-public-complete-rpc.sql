create or replace function public.complete_assignment_public(
  p_asignacion_id uuid,
  p_puntaje_pc numeric,
  p_puntaje_excel numeric,
  p_puntaje_etica numeric,
  p_puntaje_kpis numeric,
  p_promedio_general numeric,
  p_resultado_final text,
  p_diagnostico text,
  p_recomendacion text
)
returns public.resultados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asignacion public.asignaciones%rowtype;
  v_resultado public.resultados%rowtype;
begin
  select *
  into v_asignacion
  from public.asignaciones
  where id = p_asignacion_id
  for update;

  if not found then
    raise exception 'Asignación no encontrada';
  end if;

  if v_asignacion.estado = 'completada' then
    raise exception 'Esta evaluación ya fue completada';
  end if;

  if v_asignacion.fecha_limite is not null and v_asignacion.fecha_limite < now() then
    update public.asignaciones
    set estado = 'vencida'
    where id = p_asignacion_id;

    raise exception 'El enlace de evaluación está vencido';
  end if;

  insert into public.resultados (
    asignacion_id,
    evaluado_id,
    supervisor_id,
    puntaje_pc,
    puntaje_excel,
    puntaje_etica,
    puntaje_kpis,
    promedio_general,
    resultado_final,
    diagnostico,
    recomendacion
  )
  values (
    v_asignacion.id,
    v_asignacion.evaluado_id,
    v_asignacion.supervisor_id,
    p_puntaje_pc,
    p_puntaje_excel,
    p_puntaje_etica,
    p_puntaje_kpis,
    p_promedio_general,
    p_resultado_final,
    p_diagnostico,
    p_recomendacion
  )
  returning * into v_resultado;

  update public.asignaciones
  set estado = 'completada',
      fecha_finalizacion = now()
  where id = p_asignacion_id;

  return v_resultado;
end;
$$;

grant execute on function public.complete_assignment_public(
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
) to anon;
