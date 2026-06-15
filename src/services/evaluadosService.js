import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { insertLocal, listLocal } from './localStore.js';

export async function listEvaluados(profile) {
  if (isSupabaseConfigured) {
    let query = supabase.from('evaluados').select('*').order('created_at', { ascending: false });
    if (profile?.role === 'supervisor') query = query.eq('supervisor_id', profile.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  const rows = listLocal('evaluados');
  return profile?.role === 'supervisor' ? rows.filter((row) => row.supervisor_id === profile.id) : rows;
}

export async function createEvaluado(values, supervisorId) {
  const payload = { ...values, supervisor_id: supervisorId };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluados').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('evaluados', payload);
}
