const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AssignmentPayload = {
  asignacion_id?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || text || 'Error consultando Supabase.');
  }

  return data;
}

async function getRequester(authorization: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!authorization || !supabaseUrl || !anonKey) {
    throw new Error('Sesión no válida.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorization,
    },
  });

  const data = await response.json();

  if (!response.ok || !data?.id) {
    throw new Error('Sesión no válida.');
  }

  return data;
}

function buildEmailHtml({
  nombre,
  evaluacion,
  publicUrl,
  fechaLimite,
}: {
  nombre: string;
  evaluacion: string;
  publicUrl: string;
  fechaLimite: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.5">
      <h2 style="color:#10233f">Evaluación de diagnóstico asignada</h2>
      <p>Hola ${nombre},</p>
      <p>Has sido invitado a completar la evaluación <strong>${evaluacion}</strong>.</p>
      <p>
        <a href="${publicUrl}" style="display:inline-block;background:#1f5f99;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:bold">
          Iniciar evaluación
        </a>
      </p>
      <p>Fecha límite: <strong>${fechaLimite}</strong></p>
      <p>Este enlace es único y solo puede usarse una vez.</p>
      <p style="color:#667085;font-size:13px">Si no esperabas este correo, puedes ignorarlo.</p>
    </div>
  `;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Evaluaciones <onboarding@resend.dev>';

    if (!resendApiKey || !appUrl) {
      throw new Error('Faltan RESEND_API_KEY o APP_URL.');
    }

    const requester = await getRequester(request.headers.get('Authorization'));
    const { asignacion_id }: AssignmentPayload = await request.json();

    if (!asignacion_id) {
      return jsonResponse({ error: 'asignacion_id es obligatorio.' }, 400);
    }

    const rows = await supabaseRequest(
      `/rest/v1/asignaciones?select=*,evaluados(*),evaluaciones(*)&id=eq.${encodeURIComponent(asignacion_id)}&limit=1`,
    );
    const assignment = rows?.[0];

    if (!assignment) {
      return jsonResponse({ error: 'Asignación no encontrada.' }, 404);
    }

    const profileRows = await supabaseRequest(`/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(requester.id)}&limit=1`);
    const requesterProfile = profileRows?.[0];
    const isOwner = assignment.supervisor_id === requester.id;
    const isAdmin = requesterProfile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return jsonResponse({ error: 'No autorizado para enviar esta invitación.' }, 403);
    }

    const evaluado = assignment.evaluados;
    const evaluacion = assignment.evaluaciones;
    const publicUrl = `${appUrl.replace(/\/$/, '')}/evaluacion/${assignment.token_unico}`;
    const fechaLimite = assignment.fecha_limite
      ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assignment.fecha_limite))
      : 'No definida';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [evaluado.correo],
        subject: 'Invitación a evaluación de diagnóstico',
        html: buildEmailHtml({
          nombre: evaluado.nombre_completo,
          evaluacion: evaluacion?.nombre || 'Diagnóstico Operativo y Comercial',
          publicUrl,
          fechaLimite,
        }),
      }),
    });

    const resendData = await resendResponse.json();
    const estadoEnvio = resendResponse.ok ? 'enviado' : 'error';

    await supabaseRequest('/rest/v1/correos_enviados', {
      method: 'POST',
      body: JSON.stringify({
        asignacion_id: assignment.id,
        destinatario: evaluado.correo,
        tipo_correo: 'invitacion_evaluacion',
        estado_envio: estadoEnvio,
        fecha_envio: new Date().toISOString(),
        error: resendResponse.ok ? null : JSON.stringify(resendData),
      }),
    });

    if (!resendResponse.ok) {
      return jsonResponse({ error: 'Resend no pudo enviar el correo.', details: resendData }, 502);
    }

    await supabaseRequest(`/rest/v1/asignaciones?id=eq.${encodeURIComponent(assignment.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'enviada' }),
    });

    return jsonResponse({
      sent: true,
      simulated: false,
      publicUrl,
      providerId: resendData.id,
      message: 'Invitación enviada correctamente.',
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500);
  }
});
