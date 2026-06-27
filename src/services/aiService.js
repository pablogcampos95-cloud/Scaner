import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function generateResultSuggestion(resultadoId, force = false) {
  if (!isSupabaseConfigured) {
    return {
      suggestion: '- Fortaleza: KPIs supera el umbral.\n- Debilidad: Excel queda bajo el estándar.\n- Consejo: avanzar solo con refuerzo focalizado.',
      provider: 'demo',
    };
  }

  const { data, error } = await supabase.functions.invoke('generate-ai-result-suggestion', {
    body: { resultado_id: resultadoId, force },
  });

  if (error) {
    let contextMessage = error.context?.error || error.context?.message;
    if (!contextMessage && typeof error.context?.json === 'function') {
      try {
        const contextBody = await error.context.json();
        contextMessage = contextBody?.error || contextBody?.message;
      } catch {
        contextMessage = '';
      }
    }
    throw new Error(contextMessage || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function reviewEvaluationWithAi(resultadoId) {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      review_status: 'revisado_ia',
      resultado_final: 'Apto con refuerzo',
      promedio_general: 65,
      reviewedQuestions: 0,
      provider: 'demo',
    };
  }

  const { data, error } = await supabase.functions.invoke('review-evaluation-with-ai', {
    body: { evaluationResultId: resultadoId },
  });

  if (error) {
    let contextMessage = error.context?.error || error.context?.message;
    if (!contextMessage && typeof error.context?.json === 'function') {
      try {
        const contextBody = await error.context.json();
        contextMessage = contextBody?.error || contextBody?.message;
      } catch {
        contextMessage = '';
      }
    }
    throw new Error(contextMessage || error.message);
  }
  if (data?.success === false || data?.error) throw new Error(data.error || 'No se pudo completar la revisiÃ³n con IA.');
  return data;
}
