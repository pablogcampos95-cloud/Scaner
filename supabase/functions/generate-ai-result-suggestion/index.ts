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
  if (!authorization || !supabaseUrl || !anonKey) throw new Error('Sesion no valida.');

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  const data = await response.json();
  if (!response.ok || !data?.id) throw new Error('Sesion no valida.');
  return data;
}

function getOutputText(response: any) {
  if (response?.output_text) return String(response.output_text).trim();
  const content = response?.output?.flatMap((item: any) => item.content || []) || [];
  return content.map((item: any) => item.text || '').join(' ').trim();
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
  if (result.estado_resultado === 'pendiente_revision') {
    return `- Fortaleza: ${strongest.label} destaca con ${strongest.value}%.\n- Debilidad: hay revision manual pendiente.\n- Consejo: cerrar revision antes de decidir para ${role}.`;
  }
  return `- Fortaleza: ${strongest.label} alcanza ${strongest.value}%.\n- Debilidad: ${weakest.label} queda en ${weakest.value}%, promedio ${average}%.\n- Consejo: ${decision} para ${role}.`;
}

function compactKeywords(result: any) {
  const role = getRoleLabel(result);
  const { average, strongest, weakest, decision } = getScoreSummary(result);

  return {
    rol_postulado: role,
    resultado: result.resultado_final,
    promedio: average,
    puntaje_mas_alto: `${strongest.label} ${strongest.value}%`,
    puntaje_mas_bajo: `${weakest.label} ${weakest.value}%`,
    pc: Number(result.puntaje_pc || 0),
    excel: Number(result.puntaje_excel || 0),
    etica: Number(result.puntaje_etica || 0),
    kpis: Number(result.puntaje_kpis || 0),
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

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
    let suggestion = fallbackSuggestion(result);
    let provider = 'fallback';

    if (apiKey) {
      try {
        const prompt = compactKeywords(result);

        const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: 'system',
                content: 'Actua como evaluador BPO. Responde estrictamente en 3 viñetas: 1 fortaleza, 1 debilidad, 1 consejo. Maximo 30 palabras en total. Sin saludos ni texto adicional.',
              },
              {
                role: 'user',
                content: `Resultados: ${JSON.stringify(prompt)}. Usa solo puntajes, resultado y rol postulado. Contextualiza la decision con la puntuacion obtenida.`,
              },
            ],
            max_output_tokens: 90,
          }),
        });

        const openaiData = await openaiResponse.json();
        if (!openaiResponse.ok) throw new Error(openaiData?.error?.message || 'OpenAI no pudo generar la sugerencia.');
        suggestion = getOutputText(openaiData) || suggestion;
        provider = 'openai';
      } catch (openaiError) {
        console.error('OpenAI suggestion failed', openaiError);
        provider = 'fallback_openai_error';
      }
    }

    const updated = await supabaseRequest(`/rest/v1/resultados?id=eq.${encodeURIComponent(resultado_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ai_suggestion: suggestion,
        ai_suggestion_generated_at: new Date().toISOString(),
      }),
    });

    return jsonResponse({ suggestion: updated?.[0]?.ai_suggestion || suggestion, cached: false, provider });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500);
  }
});
