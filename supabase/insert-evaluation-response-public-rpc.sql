create or replace function public.insert_evaluation_response_public(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.evaluation_responses;
begin
  if not exists (
    select 1
    from public.asignaciones a
    join public.questions q on q.id = (p_payload->>'question_id')::uuid
    where a.id = (p_payload->>'asignacion_id')::uuid
      and q.evaluacion_id = a.evaluacion_id
      and a.evaluado_id = (p_payload->>'evaluado_id')::uuid
      and a.estado in ('asignada', 'enviada', 'pendiente', 'en_proceso')
  ) then
    raise exception 'Respuesta no autorizada para esta asignacion.';
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
    (p_payload->>'asignacion_id')::uuid,
    (p_payload->>'question_id')::uuid,
    (p_payload->>'evaluado_id')::uuid,
    p_payload->>'answer_type',
    p_payload->>'answer_text',
    case when p_payload ? 'answer_json' then p_payload->'answer_json' else null end,
    p_payload->>'audio_path',
    p_payload->>'audio_url',
    case
      when p_payload ? 'is_correct' and p_payload->>'is_correct' is not null then (p_payload->>'is_correct')::boolean
      else null
    end,
    coalesce((p_payload->>'score_obtained')::numeric, 0),
    coalesce((p_payload->>'max_score')::numeric, 0),
    coalesce((p_payload->>'requires_review')::boolean, false)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.insert_evaluation_response_public(jsonb) to anon;
grant execute on function public.insert_evaluation_response_public(jsonb) to authenticated;
