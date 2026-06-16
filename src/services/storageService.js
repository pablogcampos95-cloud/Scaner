import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const AUDIO_BUCKET = 'audio-responses';

export async function uploadAudioResponse({ asignacionId, questionId, audioBlob }) {
  if (!audioBlob) throw new Error('No hay audio para guardar.');

  const timestamp = Date.now();
  const path = `${asignacionId}/${questionId}/${timestamp}.webm`;

  if (isSupabaseConfigured) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, audioBlob, {
      contentType: audioBlob.type || 'audio/webm',
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return path;
  }

  return URL.createObjectURL(audioBlob);
}

export async function getAudioSignedUrl(path) {
  if (!path) return '';

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  return path;
}

export async function deleteAudio(path) {
  if (!path) return true;

  if (isSupabaseConfigured) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([path]);
    if (error) throw new Error(error.message);
  }

  return true;
}
