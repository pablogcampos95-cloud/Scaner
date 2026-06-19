import { calculateQuestionScore, summarizeDynamicResult } from '../utils/scoreCalculator.js';
import { gradeSpreadsheetAnswer } from '../utils/spreadsheetGrader.js';
import { insertLocal, listLocal, updateLocal } from './localStore.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { uploadAudioResponse } from './storageService.js';

export async function saveQuestionResponse(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('insert_evaluation_response_public', { p_payload: payload });
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('evaluation_responses', payload);
}

export async function saveAudioResponse({ asignacionId, questionId, evaluadoId, audioBlob, question }) {
  const audioPath = await uploadAudioResponse({ asignacionId, questionId, audioBlob });

  return saveQuestionResponse({
    asignacion_id: asignacionId,
    question_id: questionId,
    evaluado_id: evaluadoId,
    answer_type: 'audio_response',
    audio_path: audioPath,
    audio_url: audioPath,
    is_correct: null,
    score_obtained: 0,
    max_score: Number(question?.puntaje || 0),
    requires_review: true,
  });
}

export async function saveSpreadsheetResponse({ asignacionId, questionId, evaluadoId, answerJson, question }) {
  const grading = gradeSpreadsheetAnswer(question?.settings || {}, question?.correct_answer || {}, answerJson, Number(question?.puntaje || 0));

  return saveQuestionResponse({
    asignacion_id: asignacionId,
    question_id: questionId,
    evaluado_id: evaluadoId,
    answer_type: 'spreadsheet',
    answer_json: { ...answerJson, grading },
    is_correct: grading.isCorrect,
    score_obtained: grading.scoreObtained,
    max_score: grading.maxScore,
    requires_review: grading.requiresReview,
  });
}

export async function saveDynamicEvaluationResponses({ assignment, evaluation, answers }) {
  const responses = [];

  for (const question of evaluation.questions || []) {
    const answer = answers[question.id];
    const score = calculateQuestionScore(question, answer);
    const base = {
      asignacion_id: assignment.id,
      question_id: question.id,
      evaluado_id: assignment.evaluado_id,
      answer_type: question.question_type,
      is_correct: score.isCorrect,
      score_obtained: score.scoreObtained,
      max_score: score.maxScore,
      requires_review: score.requiresReview,
    };

    if (question.question_type === 'audio_response') {
      responses.push(await saveAudioResponse({
        asignacionId: assignment.id,
        questionId: question.id,
        evaluadoId: assignment.evaluado_id,
        audioBlob: answer?.blob,
        question,
      }));
    } else if (question.question_type === 'spreadsheet') {
      const grading = gradeSpreadsheetAnswer(question.settings || {}, question.correct_answer || {}, answer, Number(question.puntaje || 0));
      responses.push(await saveQuestionResponse({
        ...base,
        answer_json: { ...answer, grading },
        is_correct: grading.isCorrect,
        score_obtained: grading.scoreObtained,
        max_score: grading.maxScore,
        requires_review: grading.requiresReview,
      }));
    } else if (['multiple_choice', 'kpi_numeric'].includes(question.question_type)) {
      responses.push(await saveQuestionResponse({ ...base, answer_json: answer }));
    } else {
      responses.push(await saveQuestionResponse({ ...base, answer_text: typeof answer === 'string' ? answer : String(answer || '') }));
    }
  }

  const summary = summarizeDynamicResult(evaluation.questions || [], responses);
  await saveDynamicResult({ assignment, summary });

  if (!isSupabaseConfigured) {
    updateLocal('asignaciones', assignment.id, { estado: 'completada', fecha_finalizacion: new Date().toISOString() });
  }

  return { responses, summary };
}

export async function saveDynamicResult({ assignment, summary }) {
  const payload = {
    asignacion_id: assignment.id,
    evaluado_id: assignment.evaluado_id,
    supervisor_id: assignment.supervisor_id,
    puntaje_pc: 0,
    puntaje_excel: 0,
    puntaje_etica: 0,
    puntaje_kpis: 0,
    promedio_general: summary.porcentaje_general,
    resultado_final: summary.estado_resultado === 'pendiente_revision' ? 'Pendiente de revisión' : summary.resultado_final,
    diagnostico: summary.diagnostico,
    recomendacion: summary.recomendacion,
    estado_resultado: summary.estado_resultado,
    score_obtained: summary.score_obtained,
    max_score: summary.max_score,
    pending_reviews: summary.pending_reviews,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('complete_dynamic_assignment_public', { p_payload: payload });
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('resultados', payload);
}

export async function markRequiresReview(responseId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluation_responses').update({ requires_review: true }).eq('id', responseId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return updateLocal('evaluation_responses', responseId, { requires_review: true });
}

export async function getResponsesByAsignacion(asignacionId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('evaluation_responses')
      .select('*, questions(*)')
      .eq('asignacion_id', asignacionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  const questions = listLocal('questions');
  return listLocal('evaluation_responses')
    .filter((row) => row.asignacion_id === asignacionId)
    .map((row) => ({ ...row, questions: questions.find((question) => question.id === row.question_id) }));
}

export async function getPendingManualReviews(profile) {
  const responses = isSupabaseConfigured
    ? await supabase.from('evaluation_responses').select('*, questions(*), asignaciones(*), evaluados(*)').eq('requires_review', true)
    : { data: listLocal('evaluation_responses').filter((row) => row.requires_review), error: null };

  if (responses.error) throw new Error(responses.error.message);

  return (responses.data || []).filter((row) => profile?.role === 'admin' || row.asignaciones?.supervisor_id === profile?.id);
}

export async function saveManualReview({ responseId, reviewerId, score, comment, rubricResult }) {
  const reviewPayload = {
    response_id: responseId,
    reviewer_id: reviewerId,
    score: Number(score || 0),
    comment: comment || '',
    rubric_result: rubricResult || {},
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('manual_reviews').insert(reviewPayload).select().single();
    if (error) throw new Error(error.message);

    const { error: updateError } = await supabase
      .from('evaluation_responses')
      .update({ score_obtained: Number(score || 0), requires_review: false, reviewed_by: reviewerId, review_comment: comment || '' })
      .eq('id', responseId);
    if (updateError) throw new Error(updateError.message);
    return data;
  }

  updateLocal('evaluation_responses', responseId, { score_obtained: Number(score || 0), requires_review: false, reviewed_by: reviewerId, review_comment: comment || '' });
  return insertLocal('manual_reviews', reviewPayload);
}
