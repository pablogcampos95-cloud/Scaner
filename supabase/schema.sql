create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null check (role in ('admin', 'supervisor')),
  status text not null default 'active',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.evaluados (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  dni_codigo text not null,
  correo text not null,
  telefono text,
  campana text not null,
  cargo text not null,
  sede text,
  modalidad text,
  observaciones text,
  supervisor_id uuid not null references public.profiles(id),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  estado text not null default 'activa',
  puntaje_aprobacion numeric not null default 80,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  evaluado_id uuid not null references public.evaluados(id) on delete cascade,
  evaluacion_id uuid not null references public.evaluaciones(id),
  supervisor_id uuid not null references public.profiles(id),
  token_unico text not null unique,
  estado text not null default 'asignada' check (estado in ('asignada', 'enviada', 'pendiente', 'en_proceso', 'completada', 'vencida')),
  fecha_asignacion timestamp with time zone not null default now(),
  fecha_limite timestamp with time zone,
  fecha_inicio timestamp with time zone,
  fecha_finalizacion timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.resultados (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null unique references public.asignaciones(id) on delete cascade,
  evaluado_id uuid not null references public.evaluados(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id),
  puntaje_pc numeric not null,
  puntaje_excel numeric not null,
  puntaje_etica numeric not null,
  puntaje_kpis numeric not null,
  promedio_general numeric not null,
  resultado_final text not null,
  diagnostico text,
  recomendacion text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.correos_enviados (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid references public.asignaciones(id) on delete set null,
  destinatario text not null,
  tipo_correo text not null,
  estado_envio text not null,
  fecha_envio timestamp with time zone not null default now(),
  error text
);

create table if not exists public.logs_actividad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete set null,
  accion text not null,
  detalle text,
  created_at timestamp with time zone not null default now()
);

insert into public.evaluaciones (nombre, descripcion, estado, puntaje_aprobacion)
values (
  'Diagnóstico Operativo y Comercial Base',
  'Evaluación inicial para roles BPO, ventas, contact center y back office.',
  'activa',
  80
)
on conflict do nothing;
