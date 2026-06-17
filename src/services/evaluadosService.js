import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { deleteLocal, insertLocal, listLocal, updateLocal } from './localStore.js';

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
    const { error } = await supabase.from('evaluados').delete().eq('id', id);
    if (error) {
      if (error.message?.toLowerCase().includes('foreign key')) {
        throw new Error('No se puede eliminar este evaluado porque ya tiene asignaciones o resultados asociados.');
      }
      throw new Error(error.message);
    }
    return true;
  }

  deleteLocal('evaluados', id);
  return true;
}
