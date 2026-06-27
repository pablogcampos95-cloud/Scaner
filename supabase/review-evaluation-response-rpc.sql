create or replace function public.review_evaluation_response(
  p_response_id uuid,
  p_score numeric,
  p_comment text default '',
  p_rubric_result jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response public.evaluation_responses%rowtype;
  v_assignment public.asignaciones%rowtype;
  v_reviewer uuid := auth.uid();
  v_role text := public.current_profile_role();
  v_score numeric := greatest(coalesce(p_score, 0), 0);
  v_max_score numeric;
  v_is_correct boolean;
  v_total_score numeric;
  v_total_max numeric;
  v_pending integer;
  v_percentage numeric;
  v_result_label text;
  v_review public.manual_reviews%rowtype;
begin
  if v_reviewer is null then
    raise exception 'Sesion no valida';
  end if;

  select *
  into v_response
  from public.evaluation_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'Respuesta no encontrada';
  end if;

  select *
  into v_assignment
  from public.asignaciones
  where id = v_response.asignacion_id;

  if not found then
    raise exception 'Asignacion no encontrada';
  end if;

  if v_role <> 'admin' and v_assignment.supervisor_id <> v_reviewer then
    raise exception 'No tienes permisos para revisar esta respuesta';
  end if;

  v_max_score := coalesce(v_response.max_score, 0);
  if v_max_score > 0 then
    v_score := least(v_score, v_max_score);
  end if;

  v_is_correct := case
    when v_max_score <= 0 then null
    when v_score >= v_max_score then true
    when v_score = 0 then false
    else null
  end;

  insert into public.manual_reviews (
    response_id,
    reviewer_id,
    score,
    comment,
    rubric_result
  )
  values (
    p_response_id,
    v_reviewer,
    v_score,
    coalesce(p_comment, ''),
    coalesce(p_rubric_result, '{}'::jsonb)
  )
  returning * into v_review;

  update public.evaluation_responses
  set score_obtained = v_score,
      manual_score = v_score,
      final_score = v_score,
      requires_review = false,
      is_correct = v_is_correct,
      reviewed_by = v_reviewer,
      review_comment = coalesce(p_comment, ''),
      review_observation = coalesce(p_comment, ''),
      improvement_opportunity = coalesce(p_rubric_result->>'improvement', ''),
      review_status = coalesce(p_rubric_result->>'status', 'cumple'),
      reviewed_at = now(),
      updated_at = now()
  where id = p_response_id;

  select
    coalesce(sum(score_obtained), 0),
    coalesce(sum(max_score), 0),
    count(*) filter (where requires_review)
  into v_total_score, v_total_max, v_pending
  from public.evaluation_responses
  where asignacion_id = v_response.asignacion_id;

  v_percentage := case
    when v_total_max > 0 then round((v_total_score / v_total_max) * 100)
    else 0
  end;

  v_result_label := case
    when v_pending > 0 then 'Pendiente de revisión'
    when v_percentage < 40 then 'No apto'
    when v_percentage < 60 then 'No apto temporal'
    when v_percentage < 80 then 'Apto con refuerzo'
    else 'Apto'
  end;

  update public.resultados
  set promedio_general = v_percentage,
      resultado_final = v_result_label,
      estado_resultado = case when v_pending > 0 then 'pendiente_revision' else 'revisado_manual' end,
      review_status = case when v_pending > 0 then 'pendiente_revision' else 'revisado_manual' end,
      review_type = 'manual',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      score_obtained = v_total_score,
      max_score = v_total_max,
      pending_reviews = v_pending,
      pending_review_count = v_pending,
      has_pending_review = v_pending > 0,
      manual_score = v_total_score,
      final_score = v_percentage
  where asignacion_id = v_response.asignacion_id;

  return jsonb_build_object(
    'success', true,
    'review', to_jsonb(v_review),
    'summary', jsonb_build_object(
      'score_obtained', v_total_score,
      'max_score', v_total_max,
      'promedio_general', v_percentage,
      'pending_reviews', v_pending,
      'resultado_final', v_result_label
    )
  );
end;
$$;

grant execute on function public.review_evaluation_response(uuid, numeric, text, jsonb) to authenticated;
