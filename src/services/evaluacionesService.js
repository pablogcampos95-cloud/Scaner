import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { insertLocal, listLocal, updateLocal } from './localStore.js';

export async function listEvaluaciones() {
  return getEvaluacionesActivas();
}

export async function getEvaluaciones() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('evaluaciones');
}

export async function getEvaluacionesActivas() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*').eq('estado', 'activa').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('evaluaciones').filter((row) => row.estado === 'activa');
}

export async function getEvaluacionById(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*').eq('id', id).single();
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
    const { data: evaluation, error } = await supabase.from('evaluaciones').select('*').eq('id', evaluacionId).single();
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

  return { ...evaluation, sections, questions };
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
  };

  if (partial) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  return payload;
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
