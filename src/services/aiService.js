import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function generateResultSuggestion(resultadoId, force = false) {
  if (!isSupabaseConfigured) {
    return {
      suggestion: '- Fortaleza: base evaluable.\n- Debilidad: brechas por validar.\n- Consejo: revisar puntajes críticos.',
      provider: 'demo',
    };
  }

  const { data, error } = await supabase.functions.invoke('generate-ai-result-suggestion', {
    body: { resultado_id: resultadoId, force },
  });

  if (error) {
    const contextMessage = error.context?.error || error.context?.message;
    throw new Error(contextMessage || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
