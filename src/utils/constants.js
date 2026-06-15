export const ASSIGNMENT_STATUS = {
  ASIGNADA: 'asignada',
  ENVIADA: 'enviada',
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  VENCIDA: 'vencida',
};

export const STATUS_LABELS = {
  asignada: 'Asignada',
  enviada: 'Enviada',
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  vencida: 'Vencida',
};

export const MODULES = [
  { key: 'pc', label: 'Habilidades básicas de PC', scoreField: 'puntaje_pc' },
  { key: 'excel', label: 'Conocimiento en Excel', scoreField: 'puntaje_excel' },
  { key: 'etica', label: 'Ética comercial', scoreField: 'puntaje_etica' },
  { key: 'kpis', label: 'KPIs comerciales y operativos', scoreField: 'puntaje_kpis' },
];

export const RESULT_LABELS = {
  APTO: 'Apto',
  APTO_REFUERZO: 'Apto con refuerzo',
  NO_APTO: 'No apto temporal',
};
