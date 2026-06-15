import { MODULES, RESULT_LABELS } from './constants.js';

export function getLevelByScore(score) {
  if (score < 60) return 'Básico / Requiere refuerzo';
  if (score < 80) return 'Intermedio / Apto con refuerzo';
  return 'Avanzado / Apto';
}

export function getFinalResult(average) {
  if (average < 60) return RESULT_LABELS.NO_APTO;
  if (average < 80) return RESULT_LABELS.APTO_REFUERZO;
  return RESULT_LABELS.APTO;
}

export function buildDiagnostic(scores) {
  const recommendations = [];

  if (scores.pc < 60) recommendations.push('nivelación en herramientas digitales operativas');
  if (scores.excel < 60) recommendations.push('taller de Excel básico aplicado a reportería');
  if (scores.etica < 60) recommendations.push('refuerzo en venta responsable, protección de datos y políticas comerciales');
  if (scores.kpis < 60) recommendations.push('formación en indicadores de productividad, conversión y gestión');

  if (MODULES.every((module) => scores[module.key] >= 80)) {
    return {
      diagnostico: 'El evaluado demuestra dominio sólido para iniciar operación con autonomía supervisada.',
      recomendacion: 'Mantener seguimiento operativo estándar y considerar rutas de desarrollo para funciones de mayor complejidad.',
    };
  }

  if (recommendations.length === 0) {
    return {
      diagnostico: 'El evaluado cumple el estándar mínimo y presenta oportunidades puntuales de consolidación.',
      recomendacion: 'Asignar acompañamiento inicial y reforzar buenas prácticas durante las primeras semanas de operación.',
    };
  }

  return {
    diagnostico: `Se identifican brechas prioritarias en ${recommendations.join(', ')}.`,
    recomendacion: `Programar ${recommendations.join('; ')} antes o durante la etapa de inducción operativa.`,
  };
}

export function calculateScores(questions, answers) {
  const scores = {};
  const detail = {};

  MODULES.forEach((module) => {
    const moduleQuestions = questions.filter((question) => question.module === module.key);
    const correct = moduleQuestions.filter((question) => answers[question.id] === question.correctAnswer).length;
    const percentage = moduleQuestions.length ? (correct / moduleQuestions.length) * 100 : 0;

    scores[module.key] = Math.round(percentage);
    detail[module.key] = {
      correct,
      total: moduleQuestions.length,
      percentage: Math.round(percentage),
      level: getLevelByScore(percentage),
    };
  });

  const average = Math.round(MODULES.reduce((sum, module) => sum + scores[module.key], 0) / MODULES.length);
  const finalResult = getFinalResult(average);
  const diagnostic = buildDiagnostic(scores);

  return {
    puntaje_pc: scores.pc,
    puntaje_excel: scores.excel,
    puntaje_etica: scores.etica,
    puntaje_kpis: scores.kpis,
    promedio_general: average,
    resultado_final: finalResult,
    diagnostico: diagnostic.diagnostico,
    recomendacion: diagnostic.recomendacion,
    detail,
  };
}
