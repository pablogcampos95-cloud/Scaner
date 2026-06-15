import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { generateToken } from '../utils/tokenGenerator.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { insertLocal, listLocal, updateLocal } from './localStore.js';

function isExpired(row) {
  return row.fecha_limite && new Date(row.fecha_limite) < new Date() && row.estado !== ASSIGNMENT_STATUS.COMPLETADA;
}

function normalizeAssignment(row) {
  return isExpired(row) ? { ...row, estado: ASSIGNMENT_STATUS.VENCIDA } : row;
}

export async function listAsignaciones(profile) {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('asignaciones')
      .select('*, evaluados(*), evaluaciones(*)')
      .order('created_at', { ascending: false });
    if (profile?.role === 'supervisor') query = query.eq('supervisor_id', profile.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(normalizeAssignment);
  }

  const evaluados = listLocal('evaluados');
  const evaluaciones = listLocal('evaluaciones');
  const rows = listLocal('asignaciones')
    .filter((row) => profile?.role !== 'supervisor' || row.supervisor_id === profile.id)
    .map((row) => ({
      ...row,
      evaluados: evaluados.find((item) => item.id === row.evaluado_id),
      evaluaciones: evaluaciones.find((item) => item.id === row.evaluacion_id),
    }));
  return rows.map(normalizeAssignment);
}

export async function createAsignacion(values, supervisorId) {
  const payload = {
    evaluado_id: values.evaluado_id,
    evaluacion_id: values.evaluacion_id,
    supervisor_id: supervisorId,
    token_unico: generateToken(),
    estado: values.estado || ASSIGNMENT_STATUS.ASIGNADA,
    fecha_asignacion: new Date().toISOString(),
    fecha_limite: new Date(values.fecha_limite).toISOString(),
    fecha_inicio: null,
    fecha_finalizacion: null,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('asignaciones').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('asignaciones', payload);
}

export async function getAsignacionByToken(token) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*, evaluados(*), evaluaciones(*)')
      .eq('token_unico', token)
      .single();
    if (error) throw new Error('Token inválido o no disponible.');
    return normalizeAssignment(data);
  }

  const row = listLocal('asignaciones').find((item) => item.token_unico === token);
  if (!row) throw new Error('Token inválido o no disponible.');
  const evaluado = listLocal('evaluados').find((item) => item.id === row.evaluado_id);
  const evaluacion = listLocal('evaluaciones').find((item) => item.id === row.evaluacion_id);
  return normalizeAssignment({ ...row, evaluados: evaluado, evaluaciones: evaluacion });
}

export async function updateAsignacion(id, values) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('asignaciones').update(values).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return updateLocal('asignaciones', id, values);
}
