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
    return 'Avanzar con revision: hay respuestas manuales pendientes antes de decidir.\nRevisar evidencia y confirmar ajuste al perfil postulado.';
  }
  if (average >= 80) {
    return 'Recomendacion IA: avanzar con el postulante.\nEl resultado es consistente para iniciar en el rol con seguimiento ligero.';
  }
  if (average >= 60) {
    return 'Recomendacion IA: avanzar con refuerzo.\nValidar brechas del rol postulado antes de asignar tareas criticas.';
  }
  return 'Recomendacion IA: no avanzar por ahora.\nSe sugiere nivelacion previa y nueva evaluacion para el rol postulado.';
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
      const prompt = {
        posicion_postulada: {
          area: result.evaluados?.areas?.nombre || 'No definida',
          perfil_operativo: result.evaluados?.perfiles_operativos?.nombre || 'No definido',
          cargo: result.evaluados?.cargo_especifico || result.evaluados?.cargo || 'No definido',
          unidad: result.evaluados?.unidad || result.evaluados?.campana || 'No definida',
        },
        resultado_final: result.resultado_final,
        promedio_general: result.promedio_general,
        puntajes: {
          pc: result.puntaje_pc,
          excel: result.puntaje_excel,
          etica: result.puntaje_etica,
          kpis: result.puntaje_kpis,
        },
        estado_resultado: result.estado_resultado,
      };

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
              content: 'Eres un asistente de seleccion para una plataforma de diagnostico BPO. Usa unicamente la posicion postulada y el dashboard de resultados entregado. Responde maximo 2 lineas. Debe indicar claramente si recomiendas avanzar, avanzar con refuerzo o no avanzar. No inventes datos.',
            },
            {
              role: 'user',
              content: `Da una recomendacion breve para este postulante:\n${JSON.stringify(prompt)}`,
            },
          ],
          max_output_tokens: 90,
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
