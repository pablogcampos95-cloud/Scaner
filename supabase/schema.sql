create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null check (role in ('admin', 'supervisor')),
  status text not null default 'active',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  estado text default 'activa',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.perfiles_operativos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  estado text default 'activo',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
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

alter table public.evaluados add column if not exists area_id uuid references public.areas(id);
alter table public.evaluados add column if not exists perfil_operativo_id uuid references public.perfiles_operativos(id);
alter table public.evaluados add column if not exists cargo_especifico text;
alter table public.evaluados add column if not exists unidad text;

create table if not exists public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  objetivo text,
  estado text not null default 'activa',
  puntaje_aprobacion numeric not null default 60,
  tiempo_limite_minutos integer,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default now()
);

alter table public.evaluaciones add column if not exists objetivo text;
alter table public.evaluaciones add column if not exists tiempo_limite_minutos integer;
alter table public.evaluaciones add column if not exists created_by uuid references public.profiles(id);
alter table public.evaluaciones add column if not exists updated_at timestamp with time zone default now();
alter table public.evaluaciones add column if not exists tipo_evaluacion text;
alter table public.evaluaciones add column if not exists nivel text;
alter table public.evaluaciones add column if not exists es_transversal boolean default false;

create table if not exists public.evaluation_targets (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid references public.evaluaciones(id) on delete cascade,
  area_id uuid references public.areas(id) on delete cascade,
  perfil_operativo_id uuid references public.perfiles_operativos(id) on delete cascade,
  is_transversal boolean default false,
  created_at timestamp with time zone default now()
);

create unique index if not exists evaluation_targets_unique_target
on public.evaluation_targets (
  evaluacion_id,
  coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(perfil_operativo_id, '00000000-0000-0000-0000-000000000000'::uuid),
  is_transversal
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

alter table public.resultados add column if not exists estado_resultado text default 'completo';
alter table public.resultados add column if not exists score_obtained numeric default 0;
alter table public.resultados add column if not exists max_score numeric default 0;
alter table public.resultados add column if not exists pending_reviews integer default 0;

create table if not exists public.evaluation_sections (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid references public.evaluaciones(id) on delete cascade,
  nombre text not null,
  descripcion text,
  orden integer default 1,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid references public.evaluaciones(id) on delete cascade,
  section_id uuid references public.evaluation_sections(id) on delete set null,
  question_type text not null check (question_type in ('single_choice', 'multiple_choice', 'short_text', 'long_text', 'audio_response', 'spreadsheet', 'kpi_numeric')),
  titulo text not null,
  descripcion text,
  instrucciones text,
  puntaje numeric default 1,
  orden integer default 1,
  required boolean default true,
  scoring_mode text default 'auto' check (scoring_mode in ('auto', 'manual', 'rubric', 'mixed')),
  correct_answer jsonb,
  settings jsonb,
  rubric jsonb,
  estado text default 'activa',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.competencias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  perfil_operativo_id uuid references public.perfiles_operativos(id),
  area_id uuid references public.areas(id),
  estado text default 'activa',
  created_at timestamp with time zone default now()
);

alter table public.questions add column if not exists competencia_id uuid references public.competencias(id);
alter table public.questions add column if not exists area_id uuid references public.areas(id);
alter table public.questions add column if not exists perfil_operativo_id uuid references public.perfiles_operativos(id);
alter table public.questions add column if not exists nivel text;

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean default false,
  orden integer default 1,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid references public.asignaciones(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  evaluado_id uuid references public.evaluados(id),
  answer_type text,
  answer_text text,
  answer_json jsonb,
  audio_path text,
  audio_url text,
  is_correct boolean,
  score_obtained numeric default 0,
  max_score numeric default 0,
  requires_review boolean default false,
  reviewed_by uuid references public.profiles(id),
  review_comment text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.manual_reviews (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references public.evaluation_responses(id) on delete cascade,
  reviewer_id uuid references public.profiles(id),
  score numeric,
  comment text,
  rubric_result jsonb,
  created_at timestamp with time zone not null default now()
);

insert into storage.buckets (id, name, public)
values ('audio-responses', 'audio-responses', false)
on conflict (id) do nothing;

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
