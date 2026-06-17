import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { deleteLocal, deleteLocalWhere, insertLocal, listLocal, updateLocal } from './localStore.js';

export async function listEvaluaciones() {
  return getEvaluacionesActivas();
}

export async function getEvaluaciones() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*, evaluation_targets(*, areas(*), perfiles_operativos(*))').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  return withLocalTargets(listLocal('evaluaciones'));
}

export async function getEvaluacionesActivas() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*, evaluation_targets(*, areas(*), perfiles_operativos(*))').eq('estado', 'activa').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  return withLocalTargets(listLocal('evaluaciones').filter((row) => row.estado === 'activa'));
}

export async function getEvaluacionById(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*, evaluation_targets(*, areas(*), perfiles_operativos(*))').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('evaluaciones').find((row) => row.id === id);
}

export async function createEvaluacion(data, profile) {
  const payload = {
    nombre: data.nombre,
    descripcion: data.descripcion || '',
    objetivo: data.objetivo || '',
    estado: data.estado || 'activa',
    puntaje_aprobacion: Number(data.puntaje_aprobacion || 60),
    tiempo_limite_minutos: data.tiempo_limite_minutos ? Number(data.tiempo_limite_minutos) : null,
    tipo_evaluacion: data.tipo_evaluacion || 'diagnostico',
    nivel: data.nivel || 'basico',
    es_transversal: Boolean(data.es_transversal),
    created_by: profile?.id,
  };

  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('evaluaciones').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  return insertLocal('evaluaciones', payload);
}

export async function updateEvaluacion(id, data) {
  const payload = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('evaluaciones').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  return updateLocal('evaluaciones', id, payload);
}

export async function deactivateEvaluacion(id) {
  const evaluacion = await getEvaluacionById(id);
  return updateEvaluacion(id, { estado: evaluacion?.estado === 'activa' ? 'inactiva' : 'activa' });
}

export async function deleteEvaluacion(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('evaluaciones').delete().eq('id', id);
    if (error) {
      if (error.message?.toLowerCase().includes('foreign key')) {
        throw new Error('No se puede eliminar esta evaluación porque ya tiene asignaciones o resultados asociados. Desactívala para que no pueda volver a asignarse.');
      }
      throw new Error(error.message);
    }
    return true;
  }

  deleteLocalWhere('evaluation_targets', (row) => row.evaluacion_id === id);
  deleteLocalWhere('evaluation_sections', (row) => row.evaluacion_id === id);
  deleteLocalWhere('questions', (row) => row.evaluacion_id === id);
  deleteLocal('evaluaciones', id);
  return true;
}

export async function getEvaluationTargets(evaluacionId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('evaluation_targets')
      .select('*, areas(*), perfiles_operativos(*)')
      .eq('evaluacion_id', evaluacionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const areas = listLocal('areas');
  const perfiles = listLocal('perfiles_operativos');
  return listLocal('evaluation_targets')
    .filter((row) => row.evaluacion_id === evaluacionId)
    .map((row) => ({
      ...row,
      areas: areas.find((area) => area.id === row.area_id),
      perfiles_operativos: perfiles.find((perfil) => perfil.id === row.perfil_operativo_id),
    }));
}

export async function saveEvaluationTargets(evaluacionId, targets = []) {
  const normalized = normalizeTargets(evaluacionId, targets);

  if (isSupabaseConfigured) {
    const { error: deleteError } = await supabase.from('evaluation_targets').delete().eq('evaluacion_id', evaluacionId);
    if (deleteError) throw new Error(deleteError.message);
    if (!normalized.length) return [];
    const { data, error } = await supabase.from('evaluation_targets').insert(normalized).select('*, areas(*), perfiles_operativos(*)');
    if (error) throw new Error(error.message);
    return data || [];
  }

  for (const target of listLocal('evaluation_targets').filter((row) => row.evaluacion_id === evaluacionId)) {
    updateLocal('evaluation_targets', target.id, { deleted: true });
  }
  return normalized.map((target) => insertLocal('evaluation_targets', target));
}

export async function getEvaluacionesByAreaAndPerfil(areaId, perfilOperativoId) {
  const evaluaciones = await getEvaluacionesActivas();
  return evaluaciones.filter((evaluacion) => evaluationAppliesTo(evaluacion, areaId, perfilOperativoId));
}

export async function getEvaluacionesActivasParaEvaluado(evaluadoId) {
  const evaluado = isSupabaseConfigured
    ? await supabase.from('evaluados').select('*, areas(*), perfiles_operativos(*)').eq('id', evaluadoId).single()
    : { data: listLocal('evaluados').find((row) => row.id === evaluadoId), error: null };
  if (evaluado.error) throw new Error(evaluado.error.message);
  return getEvaluacionesByAreaAndPerfil(evaluado.data?.area_id, evaluado.data?.perfil_operativo_id);
}

export async function getEvaluacionesTransversales() {
  const evaluaciones = await getEvaluacionesActivas();
  return evaluaciones.filter((evaluacion) => evaluacion.es_transversal || evaluacion.evaluation_targets?.some((target) => target.is_transversal));
}

export async function getEvaluacionesByTargetFilters(filters = {}) {
  const evaluaciones = await getEvaluacionesActivas();
  return evaluaciones.filter((evaluacion) => evaluationAppliesTo(evaluacion, filters.area_id, filters.perfil_operativo_id));
}

export async function createSection(data) {
  const payload = {
    evaluacion_id: data.evaluacion_id,
    nombre: data.nombre,
    descripcion: data.descripcion || '',
    orden: Number(data.orden || 1),
  };

  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('evaluation_sections').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  return insertLocal('evaluation_sections', payload);
}

export async function updateSection(id, data) {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('evaluation_sections').update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  return updateLocal('evaluation_sections', id, data);
}

export async function deleteSection(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('evaluation_sections').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  updateLocal('evaluation_sections', id, { estado: 'eliminada' });
  return true;
}

export async function createQuestion(data) {
  const payload = normalizeQuestionPayload(data);

  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('questions').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  return insertLocal('questions', payload);
}

export async function updateQuestion(id, data) {
  const payload = { ...normalizeQuestionPayload(data, true), updated_at: new Date().toISOString() };

  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('questions').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  return updateLocal('questions', id, payload);
}

export async function deleteQuestion(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  updateLocal('questions', id, { estado: 'eliminada' });
  return true;
}

export async function createQuestionOption(data) {
  const payload = {
    question_id: data.question_id,
    option_text: data.option_text,
    is_correct: Boolean(data.is_correct),
    orden: Number(data.orden || 1),
  };

  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('question_options').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  return insertLocal('question_options', payload);
}

export async function updateQuestionOption(id, data) {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('question_options').update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  return updateLocal('question_options', id, data);
}

export async function deleteQuestionOption(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('question_options').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  updateLocal('question_options', id, { deleted: true });
  return true;
}

export async function getEvaluationWithQuestions(evaluacionId) {
  if (isSupabaseConfigured) {
    const { data: evaluation, error } = await supabase.from('evaluaciones').select('*, evaluation_targets(*, areas(*), perfiles_operativos(*))').eq('id', evaluacionId).single();
    if (error) throw new Error(error.message);

    const { data: sections, error: sectionsError } = await supabase
      .from('evaluation_sections')
      .select('*')
      .eq('evaluacion_id', evaluacionId)
      .order('orden', { ascending: true });
    if (sectionsError) throw new Error(sectionsError.message);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('evaluacion_id', evaluacionId)
      .neq('estado', 'eliminada')
      .order('orden', { ascending: true });
    if (questionsError) throw new Error(questionsError.message);

    return {
      ...evaluation,
      sections: sections || [],
      targets: evaluation.evaluation_targets || [],
      questions: (questions || []).map((question) => ({
        ...question,
        options: (question.question_options || []).sort((a, b) => a.orden - b.orden),
      })),
    };
  }

  const evaluation = listLocal('evaluaciones').find((row) => row.id === evaluacionId);
  const sections = listLocal('evaluation_sections').filter((row) => row.evaluacion_id === evaluacionId && row.estado !== 'eliminada');
  const questions = listLocal('questions')
    .filter((row) => row.evaluacion_id === evaluacionId && row.estado !== 'eliminada')
    .map((question) => ({
      ...question,
      options: listLocal('question_options').filter((option) => option.question_id === question.id && !option.deleted).sort((a, b) => a.orden - b.orden),
    }))
    .sort((a, b) => a.orden - b.orden);

  return { ...evaluation, sections, questions, targets: getLocalTargets(evaluacionId) };
}

export async function getPublicEvaluationByToken(token) {
  // Technical note: public clients should eventually receive questions through an RPC/Edge Function
  // that never returns correct_answer or option is_correct. This client-side fallback strips them.
  if (isSupabaseConfigured) {
    const { data: assignments, error } = await supabase
      .from('asignaciones')
      .select('*, evaluados(*), evaluaciones(*)')
      .eq('token_unico', token)
      .limit(1);
    if (error) throw new Error(error.message);
    const assignment = assignments?.[0];
    if (!assignment) throw new Error('Token inválido o no disponible.');
    const evaluation = await getEvaluationWithQuestions(assignment.evaluacion_id);
    return {
      assignment,
      evaluation: stripAnswers(evaluation),
      // Temporary frontend scoring payload. Move scoring to RPC/Edge Function before hard production.
      scoringEvaluation: evaluation,
    };
  }

  const assignment = listLocal('asignaciones').find((row) => row.token_unico === token);
  if (!assignment) throw new Error('Token inválido o no disponible.');
  const evaluado = listLocal('evaluados').find((row) => row.id === assignment.evaluado_id);
  const evaluacion = listLocal('evaluaciones').find((row) => row.id === assignment.evaluacion_id);
  const evaluation = await getEvaluationWithQuestions(assignment.evaluacion_id);
  return {
    assignment: { ...assignment, evaluados: evaluado, evaluaciones: evaluacion },
    evaluation: stripAnswers(evaluation),
    scoringEvaluation: evaluation,
  };
}

function normalizeQuestionPayload(data, partial = false) {
  const payload = {
    evaluacion_id: data.evaluacion_id,
    section_id: data.section_id || null,
    question_type: data.question_type,
    titulo: data.titulo,
    descripcion: data.descripcion || '',
    instrucciones: data.instrucciones || '',
    puntaje: Number(data.puntaje || 1),
    orden: Number(data.orden || 1),
    required: data.required !== false,
    scoring_mode: data.scoring_mode || 'auto',
    correct_answer: data.correct_answer || null,
    settings: data.settings || {},
    rubric: data.rubric || null,
    estado: data.estado || 'activa',
    competencia_id: data.competencia_id || null,
    area_id: data.area_id || null,
    perfil_operativo_id: data.perfil_operativo_id || null,
    nivel: data.nivel || null,
  };

  if (partial) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  return payload;
}

function normalizeTargets(evaluacionId, targets) {
  const unique = new Map();
  for (const target of targets) {
    const normalized = {
      evaluacion_id: evaluacionId,
      area_id: target.area_id || null,
      perfil_operativo_id: target.perfil_operativo_id || null,
      is_transversal: Boolean(target.is_transversal),
    };
    const key = `${normalized.area_id || 'all'}:${normalized.perfil_operativo_id || 'all'}:${normalized.is_transversal}`;
    unique.set(key, normalized);
  }
  return [...unique.values()];
}

export function evaluationAppliesTo(evaluation, areaId, perfilOperativoId) {
  const targets = evaluation.targets || evaluation.evaluation_targets || [];
  if (evaluation.es_transversal || targets.some((target) => target.is_transversal)) return true;
  if (!targets.length) return true;
  return targets.some((target) => {
    const areaMatches = !target.area_id || target.area_id === areaId;
    const perfilMatches = !target.perfil_operativo_id || target.perfil_operativo_id === perfilOperativoId;
    return areaMatches && perfilMatches;
  });
}

function getLocalTargets(evaluacionId) {
  const areas = listLocal('areas');
  const perfiles = listLocal('perfiles_operativos');
  return listLocal('evaluation_targets')
    .filter((target) => target.evaluacion_id === evaluacionId && !target.deleted)
    .map((target) => ({
      ...target,
      areas: areas.find((area) => area.id === target.area_id),
      perfiles_operativos: perfiles.find((perfil) => perfil.id === target.perfil_operativo_id),
    }));
}

function withLocalTargets(evaluaciones) {
  return evaluaciones.map((evaluacion) => ({
    ...evaluacion,
    evaluation_targets: getLocalTargets(evaluacion.id),
    targets: getLocalTargets(evaluacion.id),
  }));
}

function stripAnswers(evaluation) {
  return {
    ...evaluation,
    questions: (evaluation.questions || []).map(({ correct_answer, rubric, options, ...question }) => ({
      ...question,
      rubric: undefined,
      correct_answer: undefined,
      options: (options || []).map(({ is_correct, ...option }) => option),
    })),
  };
}
