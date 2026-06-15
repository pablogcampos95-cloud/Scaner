import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { insertLocal, listLocal } from './localStore.js';

export async function listResultados(profile) {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('resultados')
      .select('*, evaluados(*), asignaciones(*)')
      .order('created_at', { ascending: false });
    if (profile?.role === 'supervisor') query = query.eq('supervisor_id', profile.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  const evaluados = listLocal('evaluados');
  const asignaciones = listLocal('asignaciones');
  return listLocal('resultados')
    .filter((row) => profile?.role !== 'supervisor' || row.supervisor_id === profile.id)
    .map((row) => ({
      ...row,
      evaluados: evaluados.find((item) => item.id === row.evaluado_id),
      asignaciones: asignaciones.find((item) => item.id === row.asignacion_id),
    }));
}

export async function getResultadoById(id, profile) {
  const rows = await listResultados(profile);
  return rows.find((row) => row.id === id || row.asignacion_id === id);
}

export async function createResultado(payload) {
  const existing = await getResultadoByAssignment(payload.asignacion_id);
  if (existing) throw new Error('Esta evaluación ya tiene un resultado registrado.');

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('resultados').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('resultados', payload);
}

export async function completePublicEvaluation(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('complete_assignment_public', {
      p_asignacion_id: payload.asignacion_id,
      p_puntaje_pc: payload.puntaje_pc,
      p_puntaje_excel: payload.puntaje_excel,
      p_puntaje_etica: payload.puntaje_etica,
      p_puntaje_kpis: payload.puntaje_kpis,
      p_promedio_general: payload.promedio_general,
      p_resultado_final: payload.resultado_final,
      p_diagnostico: payload.diagnostico,
      p_recomendacion: payload.recomendacion,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  return createResultado(payload);
}

export async function getResultadoByAssignment(asignacionId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('resultados').select('*').eq('asignacion_id', asignacionId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('resultados').find((row) => row.asignacion_id === asignacionId);
}
