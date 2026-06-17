import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { deleteLocal, deleteLocalWhere, insertLocal, listLocal, updateLocal } from './localStore.js';

export async function listEvaluados(profile) {
  if (isSupabaseConfigured) {
    let query = supabase.from('evaluados').select('*, areas(*), perfiles_operativos(*)').order('created_at', { ascending: false });
    if (profile?.role === 'supervisor') query = query.eq('supervisor_id', profile.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  const areas = listLocal('areas');
  const perfiles = listLocal('perfiles_operativos');
  const rows = listLocal('evaluados').map((row) => ({
    ...row,
    areas: areas.find((area) => area.id === row.area_id),
    perfiles_operativos: perfiles.find((perfil) => perfil.id === row.perfil_operativo_id),
  }));
  return profile?.role === 'supervisor' ? rows.filter((row) => row.supervisor_id === profile.id) : rows;
}

export async function createEvaluado(values, supervisorId) {
  const payload = {
    ...values,
    campana: values.unidad || values.campana,
    cargo: values.cargo_especifico || values.cargo,
    supervisor_id: supervisorId,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluados').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  return insertLocal('evaluados', payload);
}

export async function createEvaluadosBulk(rows, supervisorId) {
  const payload = rows.map((values) => ({
    ...values,
    campana: values.unidad || values.campana,
    cargo: values.cargo_especifico || values.cargo,
    supervisor_id: supervisorId,
  }));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluados').insert(payload).select();
    if (error) throw new Error(error.message);
    return data || [];
  }

  return payload.map((row) => insertLocal('evaluados', row));
}

export async function updateEvaluado(id, values) {
  const payload = {
    ...values,
    campana: values.unidad || values.campana,
    cargo: values.cargo_especifico || values.cargo,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('evaluados').update(payload).eq('id', id).select('*, areas(*), perfiles_operativos(*)').single();
    if (error) throw new Error(error.message);
    return data;
  }

  return updateLocal('evaluados', id, payload);
}

export async function deleteEvaluado(id) {
  if (isSupabaseConfigured) {
    const deletedByRpc = await tryDeleteSupabaseEvaluadoCascadeRpc(id);
    if (!deletedByRpc) await deleteSupabaseEvaluadoCascade(id);
    return true;
  }

  const assignmentIds = listLocal('asignaciones').filter((row) => row.evaluado_id === id).map((row) => row.id);
  const responseIds = listLocal('evaluation_responses').filter((row) => assignmentIds.includes(row.asignacion_id) || row.evaluado_id === id).map((row) => row.id);
  deleteLocalWhere('manual_reviews', (row) => responseIds.includes(row.response_id));
  deleteLocalWhere('evaluation_responses', (row) => assignmentIds.includes(row.asignacion_id) || row.evaluado_id === id);
  deleteLocalWhere('resultados', (row) => row.evaluado_id === id || assignmentIds.includes(row.asignacion_id));
  deleteLocalWhere('correos_enviados', (row) => assignmentIds.includes(row.asignacion_id));
  deleteLocalWhere('asignaciones', (row) => row.evaluado_id === id);
  deleteLocal('evaluados', id);
  return true;
}

async function tryDeleteSupabaseEvaluadoCascadeRpc(id) {
  const { error } = await supabase.rpc('delete_evaluado_cascade', { p_evaluado_id: id });
  if (!error) return true;

  const message = String(error.message || '').toLowerCase();
  const isMissingFunction = message.includes('function') || message.includes('schema cache') || message.includes('not found');
  if (isMissingFunction) return false;

  throw new Error(error.message);
}

async function deleteSupabaseEvaluadoCascade(id) {
  const { data: assignments, error: assignmentError } = await supabase
    .from('asignaciones')
    .select('id')
    .eq('evaluado_id', id);
  if (assignmentError) throw new Error(assignmentError.message);

  const assignmentIds = (assignments || []).map((row) => row.id);
  const responseIds = [];

  if (assignmentIds.length) {
    const { data: responses, error: responsesError } = await supabase
      .from('evaluation_responses')
      .select('id')
      .in('asignacion_id', assignmentIds);
    if (responsesError) throw new Error(responsesError.message);

    responseIds.push(...(responses || []).map((row) => row.id));
  }

  const { data: directResponses, error: directResponsesError } = await supabase
    .from('evaluation_responses')
    .select('id')
    .eq('evaluado_id', id);
  if (directResponsesError) throw new Error(directResponsesError.message);
  responseIds.push(...(directResponses || []).map((row) => row.id));

  const uniqueResponseIds = [...new Set(responseIds)];
  if (uniqueResponseIds.length) await deleteIn('manual_reviews', 'response_id', uniqueResponseIds);
  if (assignmentIds.length) await deleteIn('evaluation_responses', 'asignacion_id', assignmentIds);
  await deleteEq('evaluation_responses', 'evaluado_id', id);
  if (assignmentIds.length) await deleteIn('resultados', 'asignacion_id', assignmentIds);
  await deleteEq('resultados', 'evaluado_id', id);
  if (assignmentIds.length) await deleteIn('correos_enviados', 'asignacion_id', assignmentIds);
  if (assignmentIds.length) await deleteIn('asignaciones', 'id', assignmentIds);
  await deleteEq('asignaciones', 'evaluado_id', id);

  const { error } = await supabase.from('evaluados').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function deleteIn(table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) throw new Error(error.message);
}

async function deleteEq(table, column, value) {
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error) throw new Error(error.message);
}
