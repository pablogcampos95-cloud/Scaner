# ScanerIA

Aplicación React + Vite preparada para Supabase Auth, base de datos y trazabilidad de evaluaciones por rol. ScanerIA permite gestionar evaluados, asignaciones, resultados, brechas y assessment de perfiles BPO.

## Instalación

```bash
npm install
npm run dev
```

## Variables de Entorno

Copia `.env.example` como `.env` y completa:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Si las variables están vacías, la app funciona en modo local con datos de prueba:

- `admin@demo.com`
- `supervisor@demo.com`
- cualquier contraseña no vacía

## Assets Oficiales

El logo oficial debe estar en:

```text
public/assets/logo.png
```

La imagen oficial de fondo del login debe estar en:

```text
public/assets/bg-scaneria-ai.jpg
```

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

## Flujo Funcional

1. El administrador o supervisor inicia sesión.
2. El supervisor registra evaluados.
3. El supervisor asigna una evaluación y genera un token único.
4. El evaluado ingresa por `/evaluacion/:token` e inicia la evaluación.
5. La plataforma calcula puntajes, guarda resultados y registra trazabilidad.
6. Administrador y supervisor visualizan dashboards y resultados según su rol.

## Correos Con Resend

El envío real se realiza con la Supabase Edge Function `send-evaluation-invitation`.

Configura estos secretos en Supabase:

```bash
RESEND_API_KEY=tu_api_key_de_resend
APP_URL=https://scaner-production.up.railway.app
FROM_EMAIL="Evaluaciones ScanerIA <evaluacionesscaner@ialearningsolutions.net>"
```

Despliegue con Supabase CLI:

```bash
supabase functions deploy send-evaluation-invitation --no-verify-jwt
supabase secrets set RESEND_API_KEY=tu_api_key_de_resend
supabase secrets set APP_URL=https://scaner-production.up.railway.app
supabase secrets set FROM_EMAIL="Evaluaciones ScanerIA <evaluacionesscaner@ialearningsolutions.net>"
```

## Deploy En Railway

Railway puede desplegar la app React desde GitHub. Este proyecto usa:

```bash
npm run build
npm start
```

En Railway agrega estas variables:

```bash
VITE_SUPABASE_URL=https://tiptfbbcnpedyeeblwxq.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

## Pendientes Técnicos

- Generación de informes PDF.
- Banco dinámico de preguntas más avanzado.
- Reportes avanzados y exportaciones controladas.
- RPC o Edge Function pública para endurecer el acceso por token.
