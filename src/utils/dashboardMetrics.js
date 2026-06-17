import { ASSIGNMENT_STATUS, RESULT_LABELS } from './constants.js';

const STATUS_LABELS = {
  [ASSIGNMENT_STATUS.COMPLETADA]: 'Completadas',
  [ASSIGNMENT_STATUS.PENDIENTE]: 'Pendientes',
  [ASSIGNMENT_STATUS.ASIGNADA]: 'Pendientes',
  [ASSIGNMENT_STATUS.ENVIADA]: 'Pendientes',
  [ASSIGNMENT_STATUS.EN_PROCESO]: 'En proceso',
  [ASSIGNMENT_STATUS.VENCIDA]: 'Vencidas',
};

const PROFILE_ORDER = ['Formador', 'Analista', 'Monitor', 'Supervisor'];

export function getEvaluationStatusData(assignments = []) {
  const counts = {
    Completadas: 0,
    Pendientes: 0,
    'En proceso': 0,
    Vencidas: 0,
  };

  assignments.forEach((assignment) => {
    const label = STATUS_LABELS[assignment.estado] || 'Pendientes';
    counts[label] += 1;
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function getResultsDistributionData(results = []) {
  const counts = {
    Aptos: 0,
    'Aptos con refuerzo': 0,
    'No aptos temporales': 0,
    'Pendiente de revisión': 0,
  };

  results.forEach((result) => {
    if (result.resultado_final === RESULT_LABELS.APTO) counts.Aptos += 1;
    else if (result.resultado_final === RESULT_LABELS.APTO_REFUERZO) counts['Aptos con refuerzo'] += 1;
    else if (result.resultado_final === RESULT_LABELS.NO_APTO) counts['No aptos temporales'] += 1;
    else if (String(result.resultado_final || '').toLowerCase().includes('revision')) counts['Pendiente de revisión'] += 1;
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function getProfileScoreData(results = [], fallbackLabel = 'perfil') {
  const grouped = new Map(PROFILE_ORDER.map((profile) => [profile, { total: 0, count: 0 }]));

  results.forEach((result) => {
    const profileName =
      result.evaluados?.perfiles_operativos?.nombre ||
      result.evaluado?.perfiles_operativos?.nombre ||
      result.perfil_operativo_nombre ||
      null;
    if (!profileName) return;
    const current = grouped.get(profileName) || { total: 0, count: 0 };
    grouped.set(profileName, {
      total: current.total + Number(result.promedio_general || 0),
      count: current.count + 1,
    });
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    value: data.count ? Math.round(data.total / data.count) : 0,
    hasData: data.count > 0,
    emptyLabel: `Aún no hay datos suficientes por ${fallbackLabel}.`,
  }));
}

export function getAreaScoreData(results = []) {
  const grouped = new Map();

  results.forEach((result) => {
    const areaName = result.evaluados?.areas?.nombre || result.area_nombre || null;
    if (!areaName) return;
    const current = grouped.get(areaName) || { total: 0, count: 0 };
    grouped.set(areaName, {
      total: current.total + Number(result.promedio_general || 0),
      count: current.count + 1,
    });
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    value: data.count ? Math.round(data.total / data.count) : 0,
    hasData: data.count > 0,
  }));
}

export function getDashboardIndicators({ assignments = [], results = [], rows = [] }) {
  const pendingStates = [ASSIGNMENT_STATUS.ASIGNADA, ASSIGNMENT_STATUS.ENVIADA, ASSIGNMENT_STATUS.PENDIENTE];
  const uniqueEvaluados = new Set(rows.map((row) => row.evaluado_id).filter(Boolean)).size;
  const average = results.length
    ? Math.round(results.reduce((sum, item) => sum + Number(item.promedio_general || 0), 0) / results.length)
    : 0;

  return {
    uniqueEvaluados,
    assigned: assignments.length,
    completed: assignments.filter((row) => row.estado === ASSIGNMENT_STATUS.COMPLETADA).length,
    pending: assignments.filter((row) => pendingStates.includes(row.estado)).length,
    inProgress: assignments.filter((row) => row.estado === ASSIGNMENT_STATUS.EN_PROCESO).length,
    expired: assignments.filter((row) => row.estado === ASSIGNMENT_STATUS.VENCIDA).length,
    average,
    aptos: results.filter((row) => row.resultado_final === RESULT_LABELS.APTO).length,
    aptosRefuerzo: results.filter((row) => row.resultado_final === RESULT_LABELS.APTO_REFUERZO).length,
    noAptos: results.filter((row) => row.resultado_final === RESULT_LABELS.NO_APTO).length,
    areas: new Set(rows.map((row) => row.evaluados?.area_id).filter(Boolean)).size,
    perfiles: new Set(rows.map((row) => row.evaluados?.perfil_operativo_id).filter(Boolean)).size,
  };
}
