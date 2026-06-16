import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { generateToken } from '../utils/tokenGenerator.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { insertLocal, listLocal, updateLocal } from './localStore.js';
import { evaluationAppliesTo, getEvaluacionById } from './evaluacionesService.js';

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
      .select('*, evaluados(*, areas(*), perfiles_operativos(*)), evaluaciones(*)')
      .order('created_at', { ascending: false });
    if (profile?.role === 'supervisor') query = query.eq('supervisor_id', profile.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(normalizeAssignment);
  }

  const evaluados = listLocal('evaluados');
  const evaluaciones = listLocal('evaluaciones');
  const areas = listLocal('areas');
  const perfiles = listLocal('perfiles_operativos');
  const rows = listLocal('asignaciones')
    .filter((row) => profile?.role !== 'supervisor' || row.supervisor_id === profile.id)
    .map((row) => ({
      ...row,
      evaluados: decorateEvaluado(evaluados.find((item) => item.id === row.evaluado_id), areas, perfiles),
      evaluaciones: evaluaciones.find((item) => item.id === row.evaluacion_id),
    }));
  return rows.map(normalizeAssignment);
}

export async function createAsignacion(values, supervisorId) {
  const evaluado = await getEvaluadoForAssignment(values.evaluado_id);
  const evaluacion = await getEvaluacionById(values.evaluacion_id);
  if (!evaluationAppliesTo(evaluacion, evaluado?.area_id, evaluado?.perfil_operativo_id)) {
    throw new Error('Esta evaluación no corresponde al área o perfil operativo del evaluado.');
  }

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

async function getEvaluadoForAssignment(evaluadoId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluados').select('*').eq('id', evaluadoId).single();
    if (error) throw new Error(error.message);
    return data;
  }

  return listLocal('evaluados').find((row) => row.id === evaluadoId);
}

export async function getAsignacionByToken(token) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*, evaluados(*, areas(*), perfiles_operativos(*)), evaluaciones(*)')
      .eq('token_unico', token)
      .single();
    if (error) throw new Error('Token inválido o no disponible.');
    return normalizeAssignment(data);
  }

  const row = listLocal('asignaciones').find((item) => item.token_unico === token);
  if (!row) throw new Error('Token inválido o no disponible.');
  const areas = listLocal('areas');
  const perfiles = listLocal('perfiles_operativos');
  const evaluado = decorateEvaluado(listLocal('evaluados').find((item) => item.id === row.evaluado_id), areas, perfiles);
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

function decorateEvaluado(evaluado, areas, perfiles) {
  if (!evaluado) return evaluado;
  return {
    ...evaluado,
    areas: areas.find((area) => area.id === evaluado.area_id),
    perfiles_operativos: perfiles.find((perfil) => perfil.id === evaluado.perfil_operativo_id),
  };
}
