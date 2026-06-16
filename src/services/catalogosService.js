import { insertLocal, listLocal, updateLocal } from './localStore.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function getAreasActivas(includeInactive = false) {
  if (isSupabaseConfigured) {
    let query = supabase.from('areas').select('*').order('nombre', { ascending: true });
    if (!includeInactive) query = query.eq('estado', 'activa');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  return listLocal('areas').filter((row) => includeInactive || row.estado === 'activa');
}

export async function getPerfilesOperativosActivos(includeInactive = false) {
  if (isSupabaseConfigured) {
    let query = supabase.from('perfiles_operativos').select('*').order('nombre', { ascending: true });
    if (!includeInactive) query = query.eq('estado', 'activo');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  return listLocal('perfiles_operativos').filter((row) => includeInactive || row.estado === 'activo');
}

export async function getCompetenciasActivas(filters = {}) {
  if (isSupabaseConfigured) {
    let query = supabase.from('competencias').select('*, areas(*), perfiles_operativos(*)').eq('estado', 'activa').order('nombre', { ascending: true });
    if (filters.area_id) query = query.or(`area_id.eq.${filters.area_id},area_id.is.null`);
    if (filters.perfil_operativo_id) query = query.or(`perfil_operativo_id.eq.${filters.perfil_operativo_id},perfil_operativo_id.is.null`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  return listLocal('competencias').filter((row) => row.estado === 'activa');
}

export async function createArea(data) {
  const payload = { nombre: data.nombre.trim(), descripcion: data.descripcion || '', estado: data.estado || 'activa' };
  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('areas').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }
  return insertLocal('areas', payload);
}

export async function updateArea(id, data) {
  const payload = { ...data, updated_at: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('areas').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }
  return updateLocal('areas', id, payload);
}

export async function deactivateArea(id) {
  const area = isSupabaseConfigured
    ? await getRowById('areas', id)
    : listLocal('areas').find((row) => row.id === id);
  return updateArea(id, { estado: area?.estado === 'activa' ? 'inactiva' : 'activa' });
}

export async function createPerfilOperativo(data) {
  const payload = { nombre: data.nombre.trim(), descripcion: data.descripcion || '', estado: data.estado || 'activo' };
  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('perfiles_operativos').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  }
  return insertLocal('perfiles_operativos', payload);
}

export async function updatePerfilOperativo(id, data) {
  const payload = { ...data, updated_at: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('perfiles_operativos').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }
  return updateLocal('perfiles_operativos', id, payload);
}

export async function deactivatePerfilOperativo(id) {
  const perfil = isSupabaseConfigured
    ? await getRowById('perfiles_operativos', id)
    : listLocal('perfiles_operativos').find((row) => row.id === id);
  return updatePerfilOperativo(id, { estado: perfil?.estado === 'activo' ? 'inactivo' : 'activo' });
}

async function getRowById(table, id) {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}
