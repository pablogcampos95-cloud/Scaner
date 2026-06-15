import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { listLocal } from './localStore.js';

export async function listEvaluaciones() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluaciones').select('*').eq('estado', 'activa').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('evaluaciones').filter((row) => row.estado === 'activa');
}
