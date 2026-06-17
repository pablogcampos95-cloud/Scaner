import { ASSIGNMENT_STATUS, RESULT_LABELS } from '../utils/constants.js';
import { listAsignaciones } from './asignacionesService.js';
import { listResultados } from './resultadosService.js';

export async function listNotifications(profile) {
  const [assignments, results] = await Promise.all([listAsignaciones(profile), listResultados(profile)]);
  const today = new Date();
  const soonLimit = new Date();
  soonLimit.setDate(today.getDate() + 2);

  const notifications = [];

  assignments.forEach((assignment) => {
    const evaluado = assignment.evaluados?.nombre_completo || 'Evaluado';
    const evaluation = assignment.evaluaciones?.nombre || 'Evaluacion';
    const dueDate = assignment.fecha_limite ? new Date(assignment.fecha_limite) : null;

    if (assignment.estado === ASSIGNMENT_STATUS.EN_PROCESO) {
      notifications.push({
        id: `progress-${assignment.id}`,
        type: 'info',
        title: 'Evaluacion en proceso',
        message: `${evaluado} inicio ${evaluation}.`,
        date: assignment.fecha_inicio || assignment.updated_at || assignment.created_at,
        href: '/resultados',
      });
    }

    if (assignment.estado === ASSIGNMENT_STATUS.VENCIDA || (dueDate && dueDate < today && assignment.estado !== ASSIGNMENT_STATUS.COMPLETADA)) {
      notifications.push({
        id: `expired-${assignment.id}`,
        type: 'danger',
        title: 'Evaluacion vencida',
        message: `${evaluado} tiene una evaluacion fuera de plazo.`,
        date: assignment.fecha_limite || assignment.created_at,
        href: '/resultados',
      });
    } else if (dueDate && dueDate <= soonLimit && assignment.estado !== ASSIGNMENT_STATUS.COMPLETADA) {
      notifications.push({
        id: `due-${assignment.id}`,
        type: 'warning',
        title: 'Fecha limite cercana',
        message: `${evaluado} tiene una evaluacion por vencer.`,
        date: assignment.fecha_limite,
        href: '/resultados',
      });
    }
  });

  results.forEach((result) => {
    const evaluado = result.evaluados?.nombre_completo || 'Evaluado';
    const isReview = String(result.resultado_final || '').toLowerCase().includes('revision');
    const isNoApto = result.resultado_final === RESULT_LABELS.NO_APTO;

    notifications.push({
      id: `result-${result.id}`,
      type: isReview ? 'info' : isNoApto ? 'danger' : 'success',
      title: isReview ? 'Resultado pendiente de revision' : 'Resultado registrado',
      message: `${evaluado}: ${result.resultado_final || 'Sin resultado'}.`,
      date: result.created_at,
      href: `/resultados/${result.id}`,
    });
  });

  return notifications
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 20);
}
