const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ManageUserPayload = {
  action?: 'create' | 'update';
  user_id?: string;
  user?: {
    full_name?: string;
    email?: string;
    role?: string;
    status?: string;
    password?: string;
  };
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
    throw new Error(data?.msg || data?.message || text || 'Error consultando Supabase.');
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
  if (!response.ok || !data?.id) throw new Error('Sesión no válida.');
  return data;
}

async function assertAdmin(authorization: string | null) {
  const requester = await getRequester(authorization);
  const rows = await supabaseRequest(`/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(requester.id)}&limit=1`);
  if (rows?.[0]?.role !== 'admin') {
    throw new Error('Solo un administrador puede gestionar usuarios.');
  }
  return requester;
}

function validateUser(user: ManageUserPayload['user'], action: string) {
  const allowedRoles = ['admin', 'supervisor'];
  const email = String(user?.email || '').trim().toLowerCase();
  const fullName = String(user?.full_name || '').trim();
  const role = String(user?.role || '');
  const status = String(user?.status || 'active');
  const password = String(user?.password || '');

  if (!fullName) throw new Error('El nombre es obligatorio.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Ingresa un correo válido.');
  if (!allowedRoles.includes(role)) throw new Error('Rol no permitido.');
  if (!['active', 'inactive'].includes(status)) throw new Error('Estado no permitido.');
  if (action === 'create' && password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (action === 'update' && password && password.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');

  return { email, full_name: fullName, role, status, password };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  try {
    await assertAdmin(request.headers.get('Authorization'));

    const payload: ManageUserPayload = await request.json();
    const action = payload.action || '';
    const user = validateUser(payload.user, action);

    if (action === 'create') {
      const created = await supabaseRequest('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
          },
          app_metadata: {
            role: user.role,
          },
        }),
      });

      const profile = await supabaseRequest('/rest/v1/profiles?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id: created.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
        }),
      });

      return jsonResponse({ user: profile?.[0] });
    }

    if (action === 'update') {
      if (!payload.user_id) throw new Error('user_id es obligatorio.');

      const authPayload: Record<string, unknown> = {
        email: user.email,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
        },
        app_metadata: {
          role: user.role,
        },
      };
      if (user.password) authPayload.password = user.password;

      await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(payload.user_id)}`, {
        method: 'PUT',
        body: JSON.stringify(authPayload),
      });

      const profile = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(payload.user_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
        }),
      });

      return jsonResponse({ user: profile?.[0] });
    }

    return jsonResponse({ error: 'Acción no soportada.' }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500);
  }
});
