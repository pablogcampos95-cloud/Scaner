const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_OPEN_STATES = new Set(['asignada', 'enviada', 'pendiente', 'en_proceso']);

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type ResponsePayload = {
  question_id?: string;
  answer_type?: string;
  answer_text?: string | null;
  answer_json?: unknown;
  audio_path?: string | null;
  audio_url?: string | null;
  audio_base64?: string | null;
  audio_content_type?: string | null;
  audio_duration?: number | null;
  is_correct?: boolean | null;
  score_obtained?: number;
  max_score?: number;
  requires_review?: boolean;
};

type SubmitPayload = {
  token?: string;
  result?: Record<string, unknown>;
  responses?: ResponsePayload[];
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
  if (!supabaseUrl || !serviceKey) {
    throw new HttpError('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en la Edge Function.', 500);
  }
  return { supabaseUrl, serviceKey };
}

function cleanError(error: unknown) {
  return String(error instanceof Error ? error.message : error || 'No se pudo guardar la evaluación.')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [token]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[jwt]')
    .slice(0, 260);
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  const { supabaseUrl, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new HttpError(data?.message || data?.msg || text || 'Error consultando Supabase.', response.status);
  }
  return data;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function uploadAudioResponse(assignmentId: string, questionId: string, base64Audio: string, contentType = 'audio/webm') {
  if (!base64Audio) return null;

  const { supabaseUrl, serviceKey } = getSupabaseConfig();
  const safeContentType = contentType || 'audio/webm';
  const extension = safeContentType.includes('ogg') ? 'ogg' : 'webm';
  const path = `${assignmentId}/${questionId}/${Date.now()}.${extension}`;
  const bytes = base64ToBytes(base64Audio);

  const response = await fetch(`${supabaseUrl}/storage/v1/object/audio-responses/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': safeContentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });

  const text = await response.text();
  if (!response.ok) {
    const data = text ? JSON.parse(text) : null;
    throw new HttpError(data?.message || data?.error || text || 'No se pudo guardar el audio.', response.status);
  }

  return path;
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeResult(result: Record<string, unknown> | undefined, assignment: any) {
  return {
    asignacion_id: assignment.id,
    evaluado_id: assignment.evaluado_id,
    supervisor_id: assignment.supervisor_id,
    puntaje_pc: toNumber(result?.puntaje_pc),
    puntaje_excel: toNumber(result?.puntaje_excel),
    puntaje_etica: toNumber(result?.puntaje_etica),
    puntaje_kpis: toNumber(result?.puntaje_kpis),
    promedio_general: toNumber(result?.promedio_general),
    resultado_final: String(result?.resultado_final || 'Pendiente de revisión'),
    diagnostico: String(result?.diagnostico || ''),
    recomendacion: String(result?.recomendacion || ''),
    estado_resultado: String(result?.estado_resultado || 'completo'),
    score_obtained: toNumber(result?.score_obtained),
    max_score: toNumber(result?.max_score),
    pending_reviews: Math.max(0, Math.round(toNumber(result?.pending_reviews))),
  };
}

async function normalizeResponse(response: ResponsePayload, assignment: any, allowedQuestionIds: Set<string>) {
  if (!response?.question_id || !allowedQuestionIds.has(response.question_id)) {
    throw new HttpError('Una respuesta no corresponde a la evaluación asignada.', 400);
  }

  const answerJson = response.answer_json && typeof response.answer_json === 'object' ? response.answer_json : null;
  const uploadedAudioPath = response.audio_base64
    ? await uploadAudioResponse(assignment.id, response.question_id, response.audio_base64, response.audio_content_type || 'audio/webm')
    : null;

  return {
    asignacion_id: assignment.id,
    question_id: response.question_id,
    evaluado_id: assignment.evaluado_id,
    answer_type: response.answer_type || null,
    answer_text: response.answer_text ?? null,
    answer_json: answerJson,
    audio_path: uploadedAudioPath || response.audio_path || null,
    audio_url: uploadedAudioPath || response.audio_url || null,
    is_correct: typeof response.is_correct === 'boolean' ? response.is_correct : null,
    score_obtained: toNumber(response.score_obtained),
    max_score: toNumber(response.max_score),
    requires_review: Boolean(response.requires_review),
  };
}

async function getAssignmentByToken(token: string) {
  const encodedToken = encodeURIComponent(token);
  const rows = await supabaseRequest(
    `/rest/v1/asignaciones?select=*,evaluados(*),evaluaciones(*)&token_unico=eq.${encodedToken}&limit=1`,
    { headers: { Prefer: 'return=representation' } },
  );
  const assignment = rows?.[0];
  if (!assignment) throw new HttpError('Token inválido o no disponible.', 404);
  return assignment;
}

async function getEvaluationQuestionIds(evaluacionId: string) {
  const rows = await supabaseRequest(
    `/rest/v1/questions?select=id&evaluacion_id=eq.${encodeURIComponent(evaluacionId)}&estado=neq.eliminada`,
    { headers: { Prefer: 'return=representation' } },
  );
  return new Set((rows || []).map((row: any) => String(row.id)));
}

async function submitEvaluation(payload: SubmitPayload) {
  const token = String(payload.token || '').trim();
  if (!token) throw new HttpError('Token de evaluación requerido.', 400);

  const assignment = await getAssignmentByToken(token);
  if (assignment.fecha_limite && new Date(assignment.fecha_limite).getTime() < Date.now()) {
    await supabaseRequest(`/rest/v1/asignaciones?id=eq.${encodeURIComponent(assignment.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ estado: 'vencida' }),
    });
    throw new HttpError('El enlace de evaluación está vencido.', 409);
  }

  if (assignment.estado === 'completada') {
    throw new HttpError('Esta evaluación ya fue completada.', 409);
  }

  if (!VALID_OPEN_STATES.has(assignment.estado)) {
    throw new HttpError('La asignación no está disponible para finalizar.', 409);
  }

  const questionIds = await getEvaluationQuestionIds(assignment.evaluacion_id);
  const responses = Array.isArray(payload.responses) ? payload.responses : [];
  const normalizedResponses = [];
  for (const response of responses) {
    normalizedResponses.push(await normalizeResponse(response, assignment, questionIds));
  }
  const normalizedResult = normalizeResult(payload.result, assignment);

  await supabaseRequest(`/rest/v1/evaluation_responses?asignacion_id=eq.${encodeURIComponent(assignment.id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  if (normalizedResponses.length) {
    await supabaseRequest('/rest/v1/evaluation_responses', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(normalizedResponses),
    });
  }

  const resultRows = await supabaseRequest('/rest/v1/resultados?on_conflict=asignacion_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([normalizedResult]),
  });
  const result = resultRows?.[0];

  await supabaseRequest(`/rest/v1/asignaciones?id=eq.${encodeURIComponent(assignment.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ estado: 'completada', fecha_finalizacion: new Date().toISOString() }),
  });

  return {
    success: true,
    resultId: result?.id || null,
    assignmentId: assignment.id,
    score: normalizedResult.promedio_general,
    status: 'completed',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ success: false, error: 'Método no permitido.' }, 405);

  try {
    const payload = await request.json() as SubmitPayload;
    return jsonResponse(await submitEvaluation(payload));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ success: false, error: cleanError(error) }, status);
  }
});
