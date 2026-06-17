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
