const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  resultado_id?: string;
  force?: boolean;
};

type ScoreItem = {
  key: string;
  label: string;
  value: number;
};

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');

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
  if (!response.ok) throw new Error(data?.message || data?.msg || text || 'Error consultando Supabase.');
  return data;
}

async function getRequester(authorization: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) throw new HttpError('Sesion no valida.', 401);

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new HttpError('Sesion no valida.', 401);
  return data;
}

function getGroqOutputText(response: any) {
  return String(response?.choices?.[0]?.message?.content || '').trim();
}

function getSafeErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || 'Groq no respondio.');
  return rawMessage
    .replace(/sk-[A-Za-z0-9_-]+/g, '[api-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [token]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[api-key]')
    .slice(0, 220);
}

function getRoleLabel(result: any) {
  return [
    result.evaluados?.perfiles_operativos?.nombre,
    result.evaluados?.areas?.nombre,
    result.evaluados?.cargo_especifico || result.evaluados?.cargo,
  ].filter(Boolean).join(' / ') || 'rol no definido';
}

function getScoreSummary(result: any) {
  const scores: ScoreItem[] = [
    { key: 'pc', label: 'PC', value: Number(result.puntaje_pc || 0) },
    { key: 'excel', label: 'Excel', value: Number(result.puntaje_excel || 0) },
    { key: 'etica', label: 'Etica', value: Number(result.puntaje_etica || 0) },
    { key: 'kpis', label: 'KPIs', value: Number(result.puntaje_kpis || 0) },
  ];
  const strongest = [...scores].sort((a, b) => b.value - a.value)[0];
  const weakest = [...scores].sort((a, b) => a.value - b.value)[0];
  const average = Number(result.promedio_general || 0);
  const decision = result.estado_resultado === 'pendiente_revision'
    ? 'revisar manuales antes de decidir'
    : average >= 80
      ? 'avanzar'
      : average >= 60
        ? 'avanzar con refuerzo'
        : 'no avanzar aun';

  return { average, strongest, weakest, decision };
}

function fallbackSuggestion(result: any) {
  const role = getRoleLabel(result);
  const { average, strongest, weakest, decision } = getScoreSummary(result);
  const scores = getModuleInsights(result);
  const actionFocus = scores.below80.length ? scores.below80.join(', ') : 'mantener estandar y seguimiento operativo';
  if (result.estado_resultado === 'pendiente_revision') {
    return `El resultado aun requiere revision manual antes de emitir una conclusion definitiva para el rol ${role}. Esto significa que existen respuestas abiertas, de audio o evaluaciones por rubrica que deben ser verificadas para confirmar si el desempeno observado es suficiente frente a las exigencias del perfil.\n\nComo siguiente paso, se recomienda revisar la evidencia pendiente con criterios consistentes, contrastar las respuestas con las competencias criticas del rol y validar si las brechas detectadas afectan la continuidad del proceso. Una vez completada la revision, el equipo responsable podra decidir si corresponde avanzar, avanzar con condiciones o solicitar una nueva evaluacion.`;
  }
  return `El resultado sugiere ${decision} para el rol ${role}, con un promedio general de ${average}%. El mejor desempeno se observa en ${strongest.label}, con ${strongest.value}%, mientras que el principal punto de atencion esta en ${weakest.label}, donde obtuvo ${weakest.value}%. Este resultado debe interpretarse considerando el nivel de exigencia del puesto y el impacto operativo de las competencias evaluadas.\n\nLas brechas prioritarias se concentran en ${actionFocus}. Se recomienda validar estas oportunidades mediante entrevista tecnica, ejercicio practico o acompanamiento inicial, especialmente si el rol requiere autonomia desde el primer dia. Como plan de accion, conviene reforzar los modulos con menor puntaje, definir seguimiento durante las primeras semanas y considerar una reevaluacion focalizada antes de asignar responsabilidades criticas.`;
}

function getModuleInsights(result: any) {
  const scores: ScoreItem[] = [
    { key: 'pc', label: 'PC', value: Number(result.puntaje_pc || 0) },
    { key: 'excel', label: 'Excel', value: Number(result.puntaje_excel || 0) },
    { key: 'etica', label: 'Etica comercial', value: Number(result.puntaje_etica || 0) },
    { key: 'kpis', label: 'KPIs', value: Number(result.puntaje_kpis || 0) },
  ];

  return {
    below60: scores.filter((score) => score.value < 60).map((score) => `${score.label} ${score.value}%`),
    below80: scores.filter((score) => score.value < 80).map((score) => `${score.label} ${score.value}%`),
    above80: scores.filter((score) => score.value >= 80).map((score) => `${score.label} ${score.value}%`),
  };
}

function compactKeywords(result: any) {
  const role = getRoleLabel(result);
  const { average, strongest, weakest, decision } = getScoreSummary(result);
  const moduleInsights = getModuleInsights(result);

  return {
    rol_postulado: role,
    resultado: result.resultado_final,
    resultado_presentacion: result.resultado_final === 'Apto con refuerzo' ? 'Apto con observacion' : result.resultado_final,
    promedio: average,
    puntaje_mas_alto: `${strongest.label} ${strongest.value}%`,
    puntaje_mas_bajo: `${weakest.label} ${weakest.value}%`,
    pc: Number(result.puntaje_pc || 0),
    excel: Number(result.puntaje_excel || 0),
    etica: Number(result.puntaje_etica || 0),
    kpis: Number(result.puntaje_kpis || 0),
    modulos_bajo_60: moduleInsights.below60,
    modulos_bajo_80: moduleInsights.below80,
    modulos_fuertes: moduleInsights.above80,
    decision_sugerida: decision,
    estado: result.estado_resultado || 'finalizado',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Metodo no permitido.' }, 405);

  try {
    const requester = await getRequester(request.headers.get('Authorization'));
    const { resultado_id, force = false }: Payload = await request.json();
    if (!resultado_id) return jsonResponse({ error: 'resultado_id es obligatorio.' }, 400);

    const profileRows = await supabaseRequest(`/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(requester.id)}&limit=1`);
    const requesterProfile = profileRows?.[0];
    const resultRows = await supabaseRequest(
      `/rest/v1/resultados?select=*,evaluados(*,areas(*),perfiles_operativos(*)),asignaciones(*)&id=eq.${encodeURIComponent(resultado_id)}&limit=1`,
    );
    const result = resultRows?.[0];
    if (!result) return jsonResponse({ error: 'Resultado no encontrado.' }, 404);

    const isAdmin = requesterProfile?.role === 'admin';
    const isSupervisorOwner = requesterProfile?.role === 'supervisor' && result.supervisor_id === requester.id;
    if (!isAdmin && !isSupervisorOwner) return jsonResponse({ error: 'No autorizado para generar sugerencias.' }, 403);

    if (result.ai_suggestion && !force) {
      return jsonResponse({ suggestion: result.ai_suggestion, cached: true, provider: 'stored' });
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    const model = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    let suggestion = fallbackSuggestion(result);
    let provider = 'fallback';
    let providerWarning = '';

    if (!apiKey) {
      provider = 'fallback_missing_groq_key';
      providerWarning = 'GROQ_API_KEY no configurada en Supabase secrets.';
    } else {
      try {
        const prompt = compactKeywords(result);
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'Actua como evaluador senior de assessment BPO. Redacta en espanol un analisis profesional, claro y accionable en 2 o 3 parrafos corridos. No uses listas, vinetas, numeracion, tablas, markdown ni encabezados. No saludes. No inventes datos. Menciona literalmente el rol_postulado, el promedio, las brechas principales, sugerencias de decision y un plan de accion. Extension objetivo: entre 170 y 230 palabras.',
              },
              {
                role: 'user',
                content: `Resultados: ${JSON.stringify(prompt)}. Si el resultado es "Apto con refuerzo", presentalo como "Apto con observacion". Si hay modulos bajo 60, tratalos como brechas criticas. Si hay modulos entre 60 y 79, tratalos como oportunidades de refuerzo. El texto debe sonar como una recomendacion de evaluador para decidir continuidad: explica que significa el resultado, que riesgos o brechas se observan, que validar antes de avanzar y que acciones concretas tomar.`,
              },
            ],
            max_tokens: 420,
            temperature: 0.25,
          }),
        });

        const groqData = await groqResponse.json();
        if (!groqResponse.ok) throw new Error(groqData?.error?.message || 'Groq no pudo generar la sugerencia.');
        suggestion = getGroqOutputText(groqData) || suggestion;
        provider = 'groq';
      } catch (groqError) {
        console.error('Groq suggestion failed', groqError);
        provider = 'fallback_groq_error';
        providerWarning = getSafeErrorMessage(groqError);
      }
    }

    const updated = await supabaseRequest(`/rest/v1/resultados?id=eq.${encodeURIComponent(resultado_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ai_suggestion: suggestion,
        ai_suggestion_generated_at: new Date().toISOString(),
      }),
    });

    return jsonResponse({
      suggestion: updated?.[0]?.ai_suggestion || suggestion,
      cached: false,
      provider,
      warning: providerWarning,
      model: provider === 'groq' ? model : undefined,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: error instanceof Error ? error.message : 'Error inesperado.' }, status);
  }
});
