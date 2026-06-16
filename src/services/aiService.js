import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function generateResultSuggestion(resultadoId, force = false) {
  if (!isSupabaseConfigured) {
    return {
      suggestion: 'Sugerencia IA demo: priorizar una retroalimentación breve y un plan de refuerzo focalizado en los módulos con menor puntaje.',
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
