const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  resultado_id?: string;
  force?: boolean;
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

function fallbackSuggestion(result: any) {
  const average = Number(result.promedio_general || 0);
  if (result.estado_resultado === 'pendiente_revision') {
    return '- Fortaleza: evidencia disponible.\n- Debilidad: revisión pendiente.\n- Consejo: calificar manuales antes de decidir.';
  }
  if (average >= 80) {
    return '- Fortaleza: dominio sólido.\n- Debilidad: validar adaptación.\n- Consejo: avanzar con seguimiento.';
  }
  if (average >= 60) {
    return '- Fortaleza: base suficiente.\n- Debilidad: brechas puntuales.\n- Consejo: avanzar con refuerzo.';
  }
  return '- Fortaleza: intento completo.\n- Debilidad: bajo desempeño.\n- Consejo: no avanzar aún.';
}

function compactKeywords(result: any) {
  const role = [
    result.evaluados?.perfiles_operativos?.nombre,
    result.evaluados?.areas?.nombre,
    result.evaluados?.cargo_especifico || result.evaluados?.cargo,
  ].filter(Boolean).join(' / ') || 'No definido';

  return {
    rol_postulado: role,
    resultado: result.resultado_final,
    promedio: result.promedio_general,
    pc: result.puntaje_pc,
    excel: result.puntaje_excel,
    etica: result.puntaje_etica,
    kpis: result.puntaje_kpis,
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
              content: 'Actúa como evaluador. Responde estrictamente en 3 viñetas: 1 fortaleza, 1 debilidad, 1 consejo. Máximo 30 palabras en total. Sin saludos ni texto adicional.',
            },
            {
              role: 'user',
              content: `Resultados: ${JSON.stringify(prompt)}. Usa solo puntajes o palabras clave, no texto largo.`,
            },
          ],
          max_output_tokens: 80,
        }),
      });

      const openaiData = await openaiResponse.json();
      if (!openaiResponse.ok) throw new Error(openaiData?.error?.message || 'OpenAI no pudo generar la sugerencia.');
      suggestion = getOutputText(openaiData) || suggestion;
      provider = 'openai';
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
