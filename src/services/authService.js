import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { clearLocalSession, getLocalSession, listLocal, setLocalSession } from './localStore.js';

export async function signIn(email, password) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return getCurrentProfile();
  }

  const profile = listLocal('profiles').find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!profile || !password) throw new Error('Credenciales inválidas para el modo local.');
  setLocalSession(profile);
  return profile;
}

export async function signOut() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
    return;
  }

  clearLocalSession();
}

export async function getCurrentProfile() {
  if (isSupabaseConfigured) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) return null;

    const user = sessionData.session.user;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!error && data) return data;

    const metadata = { ...user.user_metadata, ...user.app_metadata };
    return {
      id: user.id,
      full_name: metadata.full_name || user.email,
      email: user.email,
      role: metadata.role || 'supervisor',
      status: 'active',
      created_at: user.created_at,
    };
  }

  return getLocalSession();
}
