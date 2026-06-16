import { insertLocal, listLocal, updateLocal } from './localStore.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function listUsers() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  return listLocal('profiles');
}

export async function createUser(payload) {
  const normalized = normalizeUserPayload(payload);

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', user: normalized },
    });

    if (error) throw new Error(readFunctionError(error));
    if (data?.error) throw new Error(data.error);
    return data.user;
  }

  return insertLocal('profiles', {
    ...normalized,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
}

export async function updateUser(id, payload) {
  const normalized = normalizeUserPayload(payload, true);

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update', user_id: id, user: normalized },
    });

    if (error) throw new Error(readFunctionError(error));
    if (data?.error) throw new Error(data.error);
    return data.user;
  }

  return updateLocal('profiles', id, normalized);
}

function normalizeUserPayload(payload, isUpdate = false) {
  const data = {
    full_name: String(payload.full_name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    role: payload.role,
    status: payload.status || 'active',
  };

  if (!isUpdate || payload.password) {
    data.password = String(payload.password || '');
  }

  return data;
}

function readFunctionError(error) {
  return error.context?.error || error.context?.message || error.message || 'No se pudo procesar la solicitud.';
}
