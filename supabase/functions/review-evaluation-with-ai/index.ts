const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ROLES = new Set(['admin', 'supervisor', 'calidad', 'evaluador']);
const OBJECTIVE_TYPES = new Set(['single_choice', 'multiple_choice', 'kpi_numeric']);
const MODULE_FIELDS: Record<string, string> = {
  pc: 'puntaje_pc',
  excel: 'puntaje_excel',
  etica: 'puntaje_etica',
  kpis: 'puntaje_kpis',
};

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type Payload = {
  evaluationResultId?: string;
  resultado_id?: string;
};

type AiQuestionReview = {
  questionId: string;
  score: number;
  maxScore?: number;
  percentage?: number;
  status?: string;
  observation?: string;
  improvementOpportunity?: string;
  aiConfidence?: number;
};

type AiReview = {
  questions?: AiQuestionReview[];
  summary?: string;
  strengths?: string[];
  improvementAreas?: string[];
  finalRecommendation?: string;
  riskLevel?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new HttpError('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.', 500);
  return { supabaseUrl, serviceKey };
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  const { supabaseUrl, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new HttpError(data?.message || data?.msg || text || 'Error consultando Supabase.', response.status);
  return data;
}

async function getRequester(authorization: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) throw new HttpError('Sesión no válida.', 401);

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new HttpError('Sesión no válida.', 401);
  return data;
}

function cleanError(error: unknown) {
  return String(error instanceof Error ? error.message : error || 'Error inesperado.')
    .replace(/gsk_[A-Za-z0-9_-]+/g, '[api-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [token]')
    .slice(0, 260);
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function finalResultLabel(percentage: number) {
  if (percentage < 40) return 'No apto';
  if (percentage < 60) return 'No apto temporal';
  if (percentage < 80) return 'Apto con refuerzo';
  return 'Apto';
}

function inferModule(response: any) {
  const question = response.questions || {};
  const text = [
    question.titulo,
    question.descripcion,
    question.instrucciones,
    question.question_type,
    response.answer_type,
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('excel') || text.includes('hoja') || text.includes('spreadsheet') || text.includes('formula')) return 'excel';
  if (text.includes('kpi') || text.includes('indicador') || text.includes('convers') || text.includes('productiv')) return 'kpis';
  if (text.includes('etica') || text.includes('ética') || text.includes('datos') || text.includes('confidencial')) return 'etica';
  return 'pc';
}

function compactAnswer(response: any) {
  if (response.answer_text) return response.answer_text;
  if (response.answer_type === 'spreadsheet') {
    const details = response.answer_json?.grading?.details || [];
    const cells = response.answer_json?.targetPayload || response.answer_json?.targetCells || response.answer_json?.cells;
    return { spreadsheetDetails: details, cells };
  }
  if (response.answer_type === 'audio_response') {
    return {
      audioAvailable: Boolean(response.audio_path || response.audio_url),
      audioPath: response.audio_path || response.audio_url || null,
      note: 'No hay transcripción automática disponible; calificar con baja confianza si no existe texto.',
    };
  }
  return response.answer_json ?? null;
}

function deterministicQuestionReview(response: any): AiQuestionReview {
  const maxScore = toNumber(response.max_score);
  const currentScore = toNumber(response.score_obtained);
  const type = response.answer_type || response.questions?.question_type;

  if (OBJECTIVE_TYPES.has(type)) {
    const score = Math.max(0, Math.min(maxScore, currentScore));
    return {
      questionId: response.question_id,
      score,
      maxScore,
      percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
      status: score >= maxScore ? 'cumple' : score > 0 ? 'parcial' : 'no_cumple',
      observation: 'Pregunta corregida de forma objetiva según la configuración existente.',
      improvementOpportunity: score >= maxScore ? 'Mantener el criterio demostrado.' : 'Reforzar el concepto asociado a esta pregunta.',
      aiConfidence: 0.96,
    };
  }

  if (type === 'spreadsheet') {
    const grading = response.answer_json?.grading;
    const score = grading?.isCorrect ? maxScore : 0;
    return {
      questionId: response.question_id,
      score,
      maxScore,
      percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
      status: grading?.isCorrect ? 'cumple' : 'no_cumple',
      observation: grading?.isCorrect
        ? 'La mini hoja de cálculo coincide con el resultado esperado.'
        : 'La respuesta de hoja de cálculo no evidencia coincidencia con el resultado esperado.',
      improvementOpportunity: grading?.isCorrect ? 'Mantener práctica en fórmulas aplicadas.' : 'Reforzar operaciones básicas, referencias de celdas y validación de resultados.',
      aiConfidence: 0.82,
    };
  }

  if (type === 'audio_response') {
    return {
      questionId: response.question_id,
      score: 0,
      maxScore,
      percentage: 0,
      status: 'no_cumple',
      observation: 'Existe respuesta de audio, pero no hay transcripción disponible para una evaluación semántica completa.',
      improvementOpportunity: 'Agregar transcripción o rúbrica verificable para revisar contenido, argumentación y comunicación verbal.',
      aiConfidence: 0.32,
    };
  }

  const hasText = String(response.answer_text || '').trim().length > 20;
  const score = hasText ? Math.round(maxScore * 0.6 * 10) / 10 : 0;
  return {
    questionId: response.question_id,
    score,
    maxScore,
    percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
    status: hasText ? 'parcial' : 'no_cumple',
    observation: hasText ? 'La respuesta contiene desarrollo básico, pero requiere mayor precisión frente al criterio esperado.' : 'No se identifica una respuesta suficiente para sustentar la competencia.',
    improvementOpportunity: 'Profundizar la respuesta con ejemplos, criterio operativo y mayor claridad conceptual.',
    aiConfidence: 0.58,
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('La IA no devolvió contenido.');
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('La IA no devolvió JSON válido.');
    return JSON.parse(match[0]);
  }
}

async function callGroqReview(context: any) {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  const model = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  if (!apiKey) throw new HttpError('GROQ_API_KEY no está configurada en Supabase secrets.', 500);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: 'Actua como evaluador senior de assessment BPO. Devuelve exclusivamente JSON valido, sin markdown. Evalua cada pregunta con criterio profesional, respetando maxScore. Para preguntas objetivas, conserva la correccion objetiva. Para audio sin transcripcion, usa baja confianza y explica la limitacion. No inventes datos no disponibles.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instruction: 'Recalifica esta evaluacion completa y devuelve {questions:[{questionId,score,maxScore,percentage,status,observation,improvementOpportunity,aiConfidence}],summary,strengths,improvementAreas,finalRecommendation,riskLevel}.',
            context,
          }),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Groq no pudo revisar la evaluación.');
  return extractJson(String(data?.choices?.[0]?.message?.content || '')) as AiReview;
}

function mergeReviews(responses: any[], aiReview: AiReview) {
  const byQuestion = new Map((aiReview.questions || []).map((review) => [review.questionId, review]));
  return responses.map((response) => {
    const fallback = deterministicQuestionReview(response);
    const review = byQuestion.get(response.question_id) || fallback;
    const maxScore = toNumber(review.maxScore, toNumber(response.max_score));
    const score = Math.max(0, Math.min(maxScore, toNumber(review.score)));
    return {
      ...fallback,
      ...review,
      questionId: response.question_id,
      maxScore,
      score,
      percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
      aiConfidence: Math.max(0, Math.min(1, toNumber(review.aiConfidence, fallback.aiConfidence))),
    };
  });
}

async function reviewEvaluation(payload: Payload, authorization: string | null) {
  const requester = await getRequester(authorization);
  const resultId = String(payload.evaluationResultId || payload.resultado_id || '').trim();
  if (!resultId) throw new HttpError('evaluationResultId es obligatorio.', 400);

  const profileRows = await supabaseRequest(`/rest/v1/profiles?select=id,role,full_name&id=eq.${encodeURIComponent(requester.id)}&limit=1`);
  const profile = profileRows?.[0];
  if (!profile || !ALLOWED_ROLES.has(profile.role)) throw new HttpError('No autorizado para revisar con IA.', 403);

  const resultRows = await supabaseRequest(
    `/rest/v1/resultados?select=*,evaluados(*,areas(*),perfiles_operativos(*)),asignaciones(*)&id=eq.${encodeURIComponent(resultId)}&limit=1`,
  );
  const result = resultRows?.[0];
  if (!result) throw new HttpError('Resultado no encontrado.', 404);

  const isAdmin = profile.role === 'admin';
  const isSupervisorOwner = profile.role === 'supervisor' && result.supervisor_id === requester.id;
  const isReviewerRole = ['calidad', 'evaluador'].includes(profile.role);
  if (!isAdmin && !isSupervisorOwner && !isReviewerRole) throw new HttpError('No tienes permisos sobre este resultado.', 403);

  const responses = await supabaseRequest(
    `/rest/v1/evaluation_responses?select=*,questions(*)&asignacion_id=eq.${encodeURIComponent(result.asignacion_id)}&order=created_at.asc`,
  );
  if (!responses?.length) throw new HttpError('No existen respuestas para revisar.', 404);

  const context = {
    result: {
      id: result.id,
      resultado_final: result.resultado_final,
      promedio_general: result.promedio_general,
      estado_resultado: result.estado_resultado,
      evaluado: result.evaluados?.nombre_completo,
      campana: result.evaluados?.campana || result.evaluados?.unidad,
      area: result.evaluados?.areas?.nombre,
      perfil: result.evaluados?.perfiles_operativos?.nombre,
      cargo: result.evaluados?.cargo_especifico || result.evaluados?.cargo,
    },
    responses: responses.map((response: any) => ({
      responseId: response.id,
      questionId: response.question_id,
      questionType: response.answer_type || response.questions?.question_type,
      title: response.questions?.titulo,
      description: response.questions?.descripcion,
      instructions: response.questions?.instrucciones,
      rubric: response.questions?.rubric,
      correctAnswer: response.questions?.correct_answer,
      settings: response.questions?.settings,
      maxScore: response.max_score,
      currentScore: response.score_obtained,
      answer: compactAnswer(response),
    })),
  };

  let aiReview: AiReview;
  try {
    aiReview = await callGroqReview(context);
  } catch (error) {
    console.error('AI review failed, using deterministic fallback', error);
    aiReview = {
      questions: responses.map(deterministicQuestionReview),
      summary: `No se pudo completar la revisión semántica con IA. Se aplicó una revisión técnica basada en respuestas objetivas y evidencia disponible. Detalle: ${cleanError(error)}`,
      strengths: ['Se conserva la corrección objetiva disponible.'],
      improvementAreas: ['Configurar GROQ_API_KEY o revisar disponibilidad del proveedor IA para evaluación semántica completa.'],
      finalRecommendation: 'Revisar configuración de IA y validar manualmente respuestas abiertas si es necesario.',
      riskLevel: 'medio',
    };
  }

  const reviews = mergeReviews(responses, aiReview);
  let totalScore = 0;
  let totalMax = 0;
  const moduleTotals: Record<string, { score: number; max: number }> = {
    pc: { score: 0, max: 0 },
    excel: { score: 0, max: 0 },
    etica: { score: 0, max: 0 },
    kpis: { score: 0, max: 0 },
  };

  for (const response of responses) {
    const review = reviews.find((item) => item.questionId === response.question_id) || deterministicQuestionReview(response);
    const moduleKey = inferModule(response);
    totalScore += review.score;
    totalMax += review.maxScore;
    moduleTotals[moduleKey].score += review.score;
    moduleTotals[moduleKey].max += review.maxScore;

    await supabaseRequest(`/rest/v1/evaluation_responses?id=eq.${encodeURIComponent(response.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        score_obtained: review.score,
        ai_score: review.score,
        final_score: review.score,
        ai_percentage: review.percentage,
        final_percentage: review.percentage,
        ai_status: review.status || 'parcial',
        ai_observation: review.observation || '',
        ai_improvement_opportunity: review.improvementOpportunity || '',
        ai_confidence: review.aiConfidence,
        review_observation: review.observation || '',
        improvement_opportunity: review.improvementOpportunity || '',
        review_status: review.status || 'parcial',
        review_type: 'ai',
        reviewed_by: requester.id,
        reviewed_at: new Date().toISOString(),
        requires_review: false,
        is_correct: review.maxScore > 0 ? review.score >= review.maxScore : null,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  const percentage = totalMax ? Math.round((totalScore / totalMax) * 100) : 0;
  const modulePercent = (key: string) => {
    const module = moduleTotals[key];
    return module.max ? Math.round((module.score / module.max) * 100) : 0;
  };
  const finalLabel = finalResultLabel(percentage);
  const summaryText = aiReview.summary || `Evaluación revisada con IA. Promedio final ${percentage}%.`;
  const recommendation = aiReview.finalRecommendation || finalLabel;

  const updatedRows = await supabaseRequest(`/rest/v1/resultados?id=eq.${encodeURIComponent(result.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      puntaje_pc: modulePercent('pc'),
      puntaje_excel: modulePercent('excel'),
      puntaje_etica: modulePercent('etica'),
      puntaje_kpis: modulePercent('kpis'),
      promedio_general: percentage,
      resultado_final: finalLabel,
      diagnostico: summaryText,
      recomendacion: recommendation,
      estado_resultado: 'revisado_ia',
      review_status: 'revisado_ia',
      review_type: 'ai',
      reviewed_by: requester.id,
      reviewed_at: new Date().toISOString(),
      score_obtained: totalScore,
      max_score: totalMax,
      pending_reviews: 0,
      pending_review_count: 0,
      has_pending_review: false,
      ai_score: totalScore,
      final_score: percentage,
      ai_review_summary: summaryText,
      ai_strengths: aiReview.strengths || [],
      ai_improvement_areas: aiReview.improvementAreas || [],
      ai_final_recommendation: recommendation,
      ai_suggestion: summaryText,
      ai_suggestion_generated_at: new Date().toISOString(),
    }),
  });

  return {
    success: true,
    result: updatedRows?.[0] || null,
    reviewedQuestions: reviews.length,
    promedio_general: percentage,
    resultado_final: finalLabel,
    review_status: 'revisado_ia',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ success: false, error: 'Método no permitido.' }, 405);

  try {
    const payload = await request.json() as Payload;
    return jsonResponse(await reviewEvaluation(payload, request.headers.get('Authorization')));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ success: false, error: cleanError(error) }, status);
  }
});
