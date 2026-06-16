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

alter table public.evaluados add column if not exists area_id uuid references public.areas(id);
alter table public.evaluados add column if not exists perfil_operativo_id uuid references public.perfiles_operativos(id);
alter table public.evaluados add column if not exists cargo_especifico text;
alter table public.evaluados add column if not exists unidad text;

alter table public.evaluaciones add column if not exists tipo_evaluacion text;
alter table public.evaluaciones add column if not exists nivel text;
alter table public.evaluaciones add column if not exists es_transversal boolean default false;
alter table public.evaluaciones add column if not exists created_by uuid references public.profiles(id);
alter table public.evaluaciones add column if not exists updated_at timestamp with time zone default now();

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

insert into public.areas (nombre, descripcion, estado)
values
  ('Formación', 'Área responsable de inducción, capacitación y curva de aprendizaje.', 'activa'),
  ('Calidad', 'Área responsable de monitoreo, calibración y gestión de calidad.', 'activa'),
  ('Operaciones', 'Área responsable de productividad, gestión y cumplimiento operativo.', 'activa')
on conflict (nombre) do update set estado = excluded.estado;

insert into public.perfiles_operativos (nombre, descripcion, estado)
values
  ('Formador', 'Perfil orientado a facilitación, diseño instruccional y seguimiento formativo.', 'activo'),
  ('Analista', 'Perfil orientado a análisis de datos, reportería e interpretación de indicadores.', 'activo'),
  ('Monitor', 'Perfil orientado a escucha, evaluación objetiva, feedback y calibración.', 'activo'),
  ('Supervisor', 'Perfil orientado a liderazgo, gestión de equipos y seguimiento de KPIs.', 'activo')
on conflict (nombre) do update set estado = excluded.estado;

insert into public.competencias (nombre, descripcion, perfil_operativo_id, estado)
select competencia.nombre, competencia.descripcion, p.id, 'activa'
from public.perfiles_operativos p
join (
  values
    ('Formador', 'Comunicación', 'Claridad y efectividad al transmitir conceptos.'),
    ('Formador', 'Facilitación', 'Capacidad de conducir sesiones de aprendizaje.'),
    ('Formador', 'Diseño instruccional', 'Diseño básico de contenidos y actividades.'),
    ('Formador', 'Manejo de grupo', 'Gestión de participación y dinámica grupal.'),
    ('Formador', 'Uso de LMS', 'Uso de plataformas y herramientas digitales de aprendizaje.'),
    ('Analista', 'Excel', 'Uso de hojas de cálculo para análisis y reportería.'),
    ('Analista', 'Análisis de datos', 'Interpretación de datos y tendencias.'),
    ('Analista', 'Lectura de KPIs', 'Comprensión de indicadores operativos y comerciales.'),
    ('Analista', 'Reportería', 'Construcción y comunicación de reportes.'),
    ('Monitor', 'Escucha activa', 'Capacidad de identificar comportamientos relevantes en interacciones.'),
    ('Monitor', 'Evaluación objetiva', 'Aplicación neutral y consistente de criterios.'),
    ('Monitor', 'Feedback', 'Comunicación de hallazgos y oportunidades de mejora.'),
    ('Monitor', 'Calibración', 'Alineación de criterios de calidad.'),
    ('Supervisor', 'Liderazgo', 'Gestión y orientación de equipos.'),
    ('Supervisor', 'Seguimiento de KPIs', 'Uso de indicadores para gestionar desempeño.'),
    ('Supervisor', 'Planes de acción', 'Definición y seguimiento de acciones correctivas.'),
    ('Supervisor', 'Toma de decisiones', 'Uso de información para decidir oportunamente.')
) as competencia(perfil, nombre, descripcion) on competencia.perfil = p.nombre
where not exists (
  select 1 from public.competencias c
  where c.nombre = competencia.nombre
  and c.perfil_operativo_id = p.id
);

alter table public.areas enable row level security;
alter table public.perfiles_operativos enable row level security;
alter table public.evaluation_targets enable row level security;
alter table public.competencias enable row level security;

drop policy if exists "admin_manage_areas" on public.areas;
create policy "admin_manage_areas" on public.areas for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_active_areas" on public.areas;
create policy "authenticated_read_active_areas" on public.areas for select to authenticated
using (estado = 'activa' or public.current_profile_role() = 'admin');

drop policy if exists "admin_manage_perfiles_operativos" on public.perfiles_operativos;
create policy "admin_manage_perfiles_operativos" on public.perfiles_operativos for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_active_perfiles_operativos" on public.perfiles_operativos;
create policy "authenticated_read_active_perfiles_operativos" on public.perfiles_operativos for select to authenticated
using (estado = 'activo' or public.current_profile_role() = 'admin');

drop policy if exists "admin_manage_evaluation_targets" on public.evaluation_targets;
create policy "admin_manage_evaluation_targets" on public.evaluation_targets for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_evaluation_targets" on public.evaluation_targets;
create policy "authenticated_read_evaluation_targets" on public.evaluation_targets for select to authenticated
using (true);

drop policy if exists "anon_read_evaluation_targets" on public.evaluation_targets;
create policy "anon_read_evaluation_targets" on public.evaluation_targets for select to anon
using (true);

drop policy if exists "admin_manage_competencias" on public.competencias;
create policy "admin_manage_competencias" on public.competencias for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated_read_active_competencias" on public.competencias;
create policy "authenticated_read_active_competencias" on public.competencias for select to authenticated
using (estado = 'activa' or public.current_profile_role() = 'admin');

select pg_notify('pgrst', 'reload schema');
