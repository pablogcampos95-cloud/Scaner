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

export function calculateQuestionScore(question, answer) {
  const maxScore = Number(question?.puntaje || 0);
  const type = question?.question_type;
  const correctAnswer = question?.correct_answer;
  const settings = question?.settings || {};

  if (!question) return { scoreObtained: 0, maxScore: 0, isCorrect: null, requiresReview: true };

  if (type === 'single_choice') {
    const expected = correctAnswer?.option_id || correctAnswer?.value;
    const isCorrect = answer === expected;
    return { scoreObtained: isCorrect ? maxScore : 0, maxScore, isCorrect, requiresReview: false };
  }

  if (type === 'multiple_choice') {
    const expected = [...(correctAnswer?.option_ids || correctAnswer?.values || [])].sort();
    const received = [...(Array.isArray(answer) ? answer : [])].sort();
    const isCorrect = JSON.stringify(expected) === JSON.stringify(received);
    return { scoreObtained: isCorrect ? maxScore : 0, maxScore, isCorrect, requiresReview: false };
  }

  if (type === 'short_text') {
    const text = String(answer || '').trim().toLowerCase();
    const keywords = correctAnswer?.keywords || settings.keywords || [];
    if (!keywords.length) return { scoreObtained: 0, maxScore, isCorrect: null, requiresReview: true };
    const isCorrect = keywords.every((keyword) => text.includes(String(keyword).toLowerCase()));
    return { scoreObtained: isCorrect ? maxScore : 0, maxScore, isCorrect, requiresReview: false };
  }

  if (type === 'long_text' || type === 'audio_response') {
    return { scoreObtained: 0, maxScore, isCorrect: null, requiresReview: true };
  }

  if (type === 'spreadsheet') {
    const expected = String(settings.expectedValue ?? correctAnswer?.expectedValue ?? '').trim();
    const result = String(answer?.result ?? answer?.calculatedResult ?? '').trim();
    if (!expected) return { scoreObtained: 0, maxScore, isCorrect: null, requiresReview: true };
    const isCorrect = expected === result;
    return { scoreObtained: isCorrect ? maxScore : 0, maxScore, isCorrect, requiresReview: !isCorrect && Boolean(settings.reviewOnMismatch) };
  }

  if (type === 'kpi_numeric') {
    const expected = Number(correctAnswer?.expected ?? settings.expected);
    const tolerance = Number(settings.tolerance ?? correctAnswer?.tolerance ?? 0);
    const received = Number(answer?.value ?? answer);
    const isCorrect = Number.isFinite(received) && Math.abs(received - expected) <= tolerance;
    return { scoreObtained: isCorrect ? maxScore : 0, maxScore, isCorrect, requiresReview: false };
  }

  return { scoreObtained: 0, maxScore, isCorrect: null, requiresReview: true };
}

export function summarizeDynamicResult(questions, responses) {
  const scoreObtained = responses.reduce((sum, response) => sum + Number(response.score_obtained || 0), 0);
  const maxScore = responses.reduce((sum, response) => sum + Number(response.max_score || 0), 0)
    || questions.reduce((sum, question) => sum + Number(question.puntaje || 0), 0);
  const pendingReviews = responses.filter((response) => response.requires_review).length;
  const percentage = maxScore ? Math.round((scoreObtained / maxScore) * 100) : 0;
  const finalResult = getFinalResult(percentage);

  return {
    score_obtained: scoreObtained,
    max_score: maxScore,
    porcentaje_general: percentage,
    pending_reviews: pendingReviews,
    estado_resultado: pendingReviews > 0 ? 'pendiente_revision' : 'completo',
    resultado_final: finalResult,
    diagnostico: pendingReviews > 0
      ? 'El diagnóstico contiene respuestas que requieren revisión manual antes de emitir un resultado final.'
      : `El evaluado alcanzó ${percentage}% en la evaluación dinámica.`,
    recomendacion: pendingReviews > 0
      ? 'Completar la revisión manual de respuestas abiertas, audio o rúbricas para consolidar el resultado.'
      : 'Revisar el detalle por pregunta para definir acciones de refuerzo o habilitación.',
  };
}
