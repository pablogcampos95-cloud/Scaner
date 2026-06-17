import { ASSIGNMENT_STATUS, RESULT_LABELS } from '../utils/constants.js';

const STORAGE_KEY = 'diagnostico_competencias_local_db';
const SESSION_KEY = 'diagnostico_competencias_session';

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const seed = {
  areas: [
    { id: 'area-formacion', nombre: 'Formación', descripcion: 'Formación inicial y entrenamiento operativo.', estado: 'activa', created_at: now.toISOString() },
    { id: 'area-calidad', nombre: 'Calidad', descripcion: 'Monitoreo, calibración y aseguramiento.', estado: 'activa', created_at: now.toISOString() },
    { id: 'area-operaciones', nombre: 'Operaciones', descripcion: 'Gestión operativa y productividad.', estado: 'activa', created_at: now.toISOString() },
  ],
  perfiles_operativos: [
    { id: 'perfil-formador', nombre: 'Formador', descripcion: 'Facilitación y diseño instruccional.', estado: 'activo', created_at: now.toISOString() },
    { id: 'perfil-analista', nombre: 'Analista', descripcion: 'Análisis, reportería e indicadores.', estado: 'activo', created_at: now.toISOString() },
    { id: 'perfil-monitor', nombre: 'Monitor', descripcion: 'Monitoreo, calidad y feedback.', estado: 'activo', created_at: now.toISOString() },
    { id: 'perfil-supervisor', nombre: 'Supervisor', descripcion: 'Gestión de equipos y KPIs.', estado: 'activo', created_at: now.toISOString() },
  ],
  competencias: [
    { id: 'comp-formador-comunicacion', nombre: 'Comunicación', perfil_operativo_id: 'perfil-formador', estado: 'activa', created_at: now.toISOString() },
    { id: 'comp-analista-excel', nombre: 'Excel', perfil_operativo_id: 'perfil-analista', estado: 'activa', created_at: now.toISOString() },
    { id: 'comp-monitor-feedback', nombre: 'Feedback', perfil_operativo_id: 'perfil-monitor', estado: 'activa', created_at: now.toISOString() },
    { id: 'comp-supervisor-kpis', nombre: 'Seguimiento de KPIs', perfil_operativo_id: 'perfil-supervisor', estado: 'activa', created_at: now.toISOString() },
  ],
  profiles: [
    {
      id: 'admin-demo',
      full_name: 'Administradora Demo',
      email: 'admin@demo.com',
      role: 'admin',
      status: 'active',
      created_at: now.toISOString(),
    },
    {
      id: 'supervisor-demo',
      full_name: 'Supervisor Demo',
      email: 'supervisor@demo.com',
      role: 'supervisor',
      status: 'active',
      created_at: now.toISOString(),
    },
  ],
  evaluados: [
    {
      id: 'evaluado-1',
      nombre_completo: 'María Torres',
      dni_codigo: 'DNI-45881220',
      correo: 'maria.torres@example.com',
      telefono: '999111222',
      campana: 'Entel Empresas',
      cargo: 'Analista de operaciones',
      area_id: 'area-operaciones',
      perfil_operativo_id: 'perfil-analista',
      cargo_especifico: 'Analista operativo',
      unidad: 'Entel Empresas',
      sede: 'Lima Centro',
      modalidad: 'Presencial',
      observaciones: 'Postulación a operación corporativa.',
      supervisor_id: 'supervisor-demo',
      created_at: now.toISOString(),
    },
    {
      id: 'evaluado-2',
      nombre_completo: 'Carlos Rivas',
      dni_codigo: 'COD-7741',
      correo: 'carlos.rivas@example.com',
      telefono: '988777666',
      campana: 'Culqi',
      cargo: 'Monitor de calidad',
      area_id: 'area-calidad',
      perfil_operativo_id: 'perfil-monitor',
      cargo_especifico: 'Monitor de calidad',
      unidad: 'Calidad',
      sede: 'Remoto',
      modalidad: 'Remoto',
      observaciones: '',
      supervisor_id: 'supervisor-demo',
      created_at: now.toISOString(),
    },
  ],
  evaluaciones: [
    {
      id: 'evaluacion-base',
      nombre: 'Evaluación operativa y comercial base',
      descripcion: 'Evaluación inicial para perfiles BPO, contact center y back office.',
      estado: 'activa',
      puntaje_aprobacion: 80,
      tipo_evaluacion: 'diagnostico',
      nivel: 'basico',
      es_transversal: true,
      created_at: now.toISOString(),
    },
  ],
  evaluation_targets: [
    { id: 'target-base', evaluacion_id: 'evaluacion-base', area_id: null, perfil_operativo_id: null, is_transversal: true, created_at: now.toISOString() },
  ],
  asignaciones: [
    {
      id: 'asignacion-1',
      evaluado_id: 'evaluado-1',
      evaluacion_id: 'evaluacion-base',
      supervisor_id: 'supervisor-demo',
      token_unico: 'demo-token-completado',
      estado: ASSIGNMENT_STATUS.COMPLETADA,
      fecha_asignacion: yesterday.toISOString(),
      fecha_limite: tomorrow.toISOString(),
      fecha_inicio: yesterday.toISOString(),
      fecha_finalizacion: now.toISOString(),
      created_at: yesterday.toISOString(),
    },
    {
      id: 'asignacion-2',
      evaluado_id: 'evaluado-2',
      evaluacion_id: 'evaluacion-base',
      supervisor_id: 'supervisor-demo',
      token_unico: 'demo-token-pendiente',
      estado: ASSIGNMENT_STATUS.ENVIADA,
      fecha_asignacion: now.toISOString(),
      fecha_limite: tomorrow.toISOString(),
      fecha_inicio: null,
      fecha_finalizacion: null,
      created_at: now.toISOString(),
    },
  ],
  resultados: [
    {
      id: 'resultado-1',
      asignacion_id: 'asignacion-1',
      evaluado_id: 'evaluado-1',
      supervisor_id: 'supervisor-demo',
      puntaje_pc: 80,
      puntaje_excel: 60,
      puntaje_etica: 100,
      puntaje_kpis: 80,
      promedio_general: 80,
      resultado_final: RESULT_LABELS.APTO,
      diagnostico: 'La persona evaluada demuestra dominio sólido en ética comercial y desempeño suficiente en módulos operativos.',
      recomendacion: 'Reforzar Excel aplicado a reportería durante la inducción.',
      created_at: now.toISOString(),
    },
  ],
  correos_enviados: [],
  logs_actividad: [],
};

function readDb() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  return JSON.parse(stored);
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function listLocal(table) {
  return readDb()[table] || [];
}

export function insertLocal(table, record) {
  const db = readDb();
  const row = {
    id: record.id || crypto.randomUUID(),
    created_at: record.created_at || new Date().toISOString(),
    ...record,
  };
  db[table] = [row, ...(db[table] || [])];
  writeDb(db);
  return row;
}

export function updateLocal(table, id, values) {
  const db = readDb();
  db[table] = (db[table] || []).map((row) => (row.id === id ? { ...row, ...values } : row));
  writeDb(db);
  return db[table].find((row) => row.id === id);
}

export function deleteLocal(table, id) {
  const db = readDb();
  db[table] = (db[table] || []).filter((row) => row.id !== id);
  writeDb(db);
  return true;
}

export function deleteLocalWhere(table, predicate) {
  const db = readDb();
  db[table] = (db[table] || []).filter((row) => !predicate(row));
  writeDb(db);
  return true;
}

export function setLocalSession(profile) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export function getLocalSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}
