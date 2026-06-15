import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { insertLocal } from './localStore.js';
import { updateAsignacion } from './asignacionesService.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function sendEvaluationInvitation({ asignacion, evaluado }) {
  const publicUrl = `${window.location.origin}/evaluacion/${asignacion.token_unico}`;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('send-evaluation-invitation', {
      body: { asignacion_id: asignacion.id },
    });

    if (error) {
      const contextMessage = error.context?.error || error.context?.details?.message || error.context?.message;
      throw new Error(contextMessage || error.message);
    }
    if (data?.error) throw new Error(data.error);

    return {
      sent: true,
      simulated: false,
      publicUrl: data.publicUrl || publicUrl,
      message: data.message || 'Invitación enviada correctamente.',
    };
  }

  const payload = {
    asignacion_id: asignacion.id,
    destinatario: evaluado.correo,
    tipo_correo: 'invitacion_evaluacion',
    estado_envio: 'simulado',
    fecha_envio: new Date().toISOString(),
    error: null,
  };

  insertLocal('correos_enviados', payload);

  await updateAsignacion(asignacion.id, { estado: ASSIGNMENT_STATUS.ENVIADA });

  return {
    sent: true,
    simulated: true,
    publicUrl,
    message: 'Invitación simulada. Integrar aquí Resend, SendGrid o Supabase Edge Function.',
  };
}
