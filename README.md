# Plataforma de Diagnóstico de Competencias Operativas y Comerciales

Aplicación React + Vite preparada para Supabase Auth, base de datos y trazabilidad de evaluaciones por rol.

## Instalación

```bash
npm install
npm run dev
```

## Variables de entorno

Copia `.env.example` como `.env` y completa:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Si las variables están vacías, la app funciona en modo local con datos de prueba:

- `admin@demo.com`
- `supervisor@demo.com`
- cualquier contraseña no vacía

## Supabase

1. Crea un proyecto en Supabase.
2. En SQL Editor ejecuta `supabase/schema.sql`.
3. Luego ejecuta `supabase/policies.sql`.
4. Crea usuarios en Supabase Auth para administrador y supervisor.
5. Inserta sus perfiles en `profiles` usando el mismo `id` del usuario Auth:

```sql
insert into public.profiles (id, full_name, email, role, status)
values
  ('UUID_DEL_USUARIO_ADMIN', 'Administrador', 'admin@empresa.com', 'admin', 'active'),
  ('UUID_DEL_USUARIO_SUPERVISOR', 'Supervisor', 'supervisor@empresa.com', 'supervisor', 'active');
```

## Flujo funcional

1. El administrador o supervisor inicia sesión.
2. El supervisor registra evaluados.
3. El supervisor asigna una evaluación y genera un token único.
4. El evaluado ingresa por `/evaluacion/:token`, valida sus datos e inicia.
5. La evaluación calcula puntaje por PC, Excel, ética y KPIs.
6. Se guarda el resultado final y se marca la asignación como completada.
7. Administrador y supervisor visualizan dashboards y resultados según su rol.

## Fase 2 pendiente

- Generación de informes PDF.
- Edición dinámica de preguntas desde Supabase.
- Reportes avanzados y exportaciones controladas.
- RPC o Edge Function pública para endurecer el acceso por token sin exponer políticas anon amplias.

## Correos con Resend

El envío real se realiza con la Supabase Edge Function `send-evaluation-invitation`.

Configura estos secretos en Supabase:

```bash
RESEND_API_KEY=tu_api_key_de_resend
APP_URL=https://scaner-production.up.railway.app
FROM_EMAIL=Evaluaciones <onboarding@resend.dev>
```

Para producción, valida un dominio propio en Resend y cambia `FROM_EMAIL` por un remitente de ese dominio.

Despliegue con Supabase CLI:

```bash
supabase functions deploy send-evaluation-invitation --no-verify-jwt
supabase secrets set RESEND_API_KEY=tu_api_key_de_resend
supabase secrets set APP_URL=https://scaner-production.up.railway.app
supabase secrets set FROM_EMAIL="Evaluaciones <onboarding@resend.dev>"
```

## Subir a GitHub

Antes de subir, verifica que `.env` no se agregue al repositorio. El proyecto incluye `.gitignore` para excluir variables, `node_modules`, `dist`, `work` y `outputs`.

```bash
git init
git add .
git commit -m "Initial diagnostic platform"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## Deploy en Railway

Railway puede desplegar una app React desde GitHub. Este proyecto usa:

```bash
npm run build
npm start
```

En Railway agrega estas variables:

```bash
VITE_SUPABASE_URL=https://tiptfbbcnpedyeeblwxq.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

Luego conecta el repositorio de GitHub desde Railway y genera un dominio público en la sección Networking.

## Nota sobre Google Apps Script

Google Apps Script no es el destino recomendado para esta app React/Vite con Supabase y React Router. Puede servir HTML simple con `HtmlService`, pero complica el enrutamiento, build, variables y mantenimiento. Para esta plataforma conviene usar Railway, Vercel, Netlify o Supabase Hosting/Storage estático.
