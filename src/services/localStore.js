import { ASSIGNMENT_STATUS, RESULT_LABELS } from '../utils/constants.js';

const STORAGE_KEY = 'diagnostico_competencias_local_db';
const SESSION_KEY = 'diagnostico_competencias_session';

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const seed = {
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
      campana: 'Ventas Outbound',
      cargo: 'Asesora comercial',
      sede: 'Lima Centro',
      modalidad: 'Presencial',
      observaciones: 'Ingreso para campaña piloto.',
      supervisor_id: 'supervisor-demo',
      created_at: now.toISOString(),
    },
    {
      id: 'evaluado-2',
      nombre_completo: 'Carlos Rivas',
      dni_codigo: 'COD-7741',
      correo: 'carlos.rivas@example.com',
      telefono: '988777666',
      campana: 'Back Office',
      cargo: 'Analista operativo',
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
      nombre: 'Diagnóstico Operativo y Comercial Base',
      descripcion: 'Evaluación inicial para roles BPO, ventas, contact center y back office.',
      estado: 'activa',
      puntaje_aprobacion: 80,
      created_at: now.toISOString(),
    },
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
      diagnostico: 'El evaluado demuestra dominio sólido en ética comercial y desempeño suficiente en los módulos operativos.',
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
