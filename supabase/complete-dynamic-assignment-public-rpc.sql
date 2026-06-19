create or replace function public.complete_dynamic_assignment_public(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_assignment public.asignaciones%rowtype;
  v_result public.resultados%rowtype;
  v_assignment_id uuid := (p_payload->>'asignacion_id')::uuid;
  v_response jsonb;
begin
  select *
  into v_assignment
  from public.asignaciones
  where id = v_assignment_id
  for update;

  if not found then
    raise exception 'Asignacion no encontrada';
  end if;

  if v_assignment.estado = 'completada' then
    select *
    into v_result
    from public.resultados
    where asignacion_id = v_assignment.id;

    if found then
      return to_jsonb(v_result);
    end if;

    raise exception 'Esta evaluacion ya fue completada';
  end if;

  if v_assignment.fecha_limite is not null and v_assignment.fecha_limite < now() then
    update public.asignaciones
    set estado = 'vencida'
    where id = v_assignment.id;

    raise exception 'El enlace de evaluacion esta vencido';
  end if;

  delete from public.evaluation_responses
  where asignacion_id = v_assignment.id;

  for v_response in
    select value
    from jsonb_array_elements(coalesce(p_payload->'responses', '[]'::jsonb))
  loop
    if not exists (
      select 1
      from public.questions q
      where q.id = (v_response->>'question_id')::uuid
        and q.evaluacion_id = v_assignment.evaluacion_id
    ) then
      raise exception 'Respuesta no autorizada para esta asignacion';
    end if;

    insert into public.evaluation_responses (
      asignacion_id,
      question_id,
      evaluado_id,
      answer_type,
      answer_text,
      answer_json,
      audio_path,
      audio_url,
      is_correct,
      score_obtained,
      max_score,
      requires_review
    )
    values (
      v_assignment.id,
      (v_response->>'question_id')::uuid,
      v_assignment.evaluado_id,
      v_response->>'answer_type',
      v_response->>'answer_text',
      case when v_response ? 'answer_json' then v_response->'answer_json' else null end,
      v_response->>'audio_path',
      v_response->>'audio_url',
      case
        when v_response ? 'is_correct' and v_response->>'is_correct' is not null then (v_response->>'is_correct')::boolean
        else null
      end,
      coalesce((v_response->>'score_obtained')::numeric, 0),
      coalesce((v_response->>'max_score')::numeric, 0),
      coalesce((v_response->>'requires_review')::boolean, false)
    );
  end loop;

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
    recomendacion,
    estado_resultado,
    score_obtained,
    max_score,
    pending_reviews
  )
  values (
    v_assignment.id,
    v_assignment.evaluado_id,
    v_assignment.supervisor_id,
    coalesce((p_payload->>'puntaje_pc')::numeric, 0),
    coalesce((p_payload->>'puntaje_excel')::numeric, 0),
    coalesce((p_payload->>'puntaje_etica')::numeric, 0),
    coalesce((p_payload->>'puntaje_kpis')::numeric, 0),
    coalesce((p_payload->>'promedio_general')::numeric, 0),
    coalesce(p_payload->>'resultado_final', 'Pendiente de revision'),
    coalesce(p_payload->>'diagnostico', ''),
    coalesce(p_payload->>'recomendacion', ''),
    coalesce(p_payload->>'estado_resultado', 'completo'),
    coalesce((p_payload->>'score_obtained')::numeric, 0),
    coalesce((p_payload->>'max_score')::numeric, 0),
    coalesce((p_payload->>'pending_reviews')::integer, 0)
  )
  on conflict (asignacion_id)
  do update set
    puntaje_pc = excluded.puntaje_pc,
    puntaje_excel = excluded.puntaje_excel,
    puntaje_etica = excluded.puntaje_etica,
    puntaje_kpis = excluded.puntaje_kpis,
    promedio_general = excluded.promedio_general,
    resultado_final = excluded.resultado_final,
    diagnostico = excluded.diagnostico,
    recomendacion = excluded.recomendacion,
    estado_resultado = excluded.estado_resultado,
    score_obtained = excluded.score_obtained,
    max_score = excluded.max_score,
    pending_reviews = excluded.pending_reviews
  returning * into v_result;

  update public.asignaciones
  set estado = 'completada',
      fecha_finalizacion = now()
  where id = v_assignment.id;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.complete_dynamic_assignment_public(jsonb) to anon;
grant execute on function public.complete_dynamic_assignment_public(jsonb) to authenticated;
