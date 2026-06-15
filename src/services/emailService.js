import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { insertLocal } from './localStore.js';
import { updateAsignacion } from './asignacionesService.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function sendEvaluationInvitation({ asignacion, evaluado }) {
  const publicUrl = `${window.location.origin}/evaluacion/${asignacion.token_unico}`;

  const payload = {
    asignacion_id: asignacion.id,
    destinatario: evaluado.correo,
    tipo_correo: 'invitacion_evaluacion',
    estado_envio: 'simulado',
    fecha_envio: new Date().toISOString(),
    error: null,
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('correos_enviados').insert(payload);
    if (error) throw new Error(error.message);
  } else {
    insertLocal('correos_enviados', payload);
  }

  await updateAsignacion(asignacion.id, { estado: ASSIGNMENT_STATUS.ENVIADA });

  return {
    sent: true,
    simulated: true,
    publicUrl,
    message: 'Invitación simulada. Integrar aquí Resend, SendGrid o Supabase Edge Function.',
  };
}
