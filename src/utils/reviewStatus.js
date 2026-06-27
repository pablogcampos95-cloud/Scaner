export const REVIEW_STATUS = {
  PENDING: 'pendiente_revision',
  PARTIAL: 'revision_parcial',
  MANUAL: 'revisado_manual',
  AI: 'revisado_ia',
  FINAL: 'finalizado',
  COMPLETE: 'completo',
};

export const REVIEW_LABELS = {
  [REVIEW_STATUS.PENDING]: 'Pendiente de revisión',
  [REVIEW_STATUS.PARTIAL]: 'Revisión parcial',
  [REVIEW_STATUS.MANUAL]: 'Revisado manualmente',
  [REVIEW_STATUS.AI]: 'Revisado con IA',
  [REVIEW_STATUS.FINAL]: 'Resultado final',
  [REVIEW_STATUS.COMPLETE]: 'Resultado final',
};

export const MANUAL_REVIEW_TYPES = new Set([
  'short_text',
  'long_text',
  'audio_response',
  'spreadsheet',
]);

export function requiresManualReview(response) {
  return Boolean(response?.requires_review) || MANUAL_REVIEW_TYPES.has(response?.answer_type || response?.questions?.question_type);
}

export function canEditManualReview(response) {
  return Boolean(response?.requires_review) && MANUAL_REVIEW_TYPES.has(response?.answer_type || response?.questions?.question_type);
}

export function getReviewLabel(result) {
  if (!result) return 'Sin resultado';
  if (Number(result.pending_reviews || 0) > 0) return REVIEW_LABELS[REVIEW_STATUS.PENDING];
  return REVIEW_LABELS[result.estado_resultado] || result.resultado_final || REVIEW_LABELS[REVIEW_STATUS.COMPLETE];
}

export function isResultPendingReview(result) {
  return Number(result?.pending_reviews || 0) > 0 || result?.estado_resultado === REVIEW_STATUS.PENDING;
}

export function getFinalResultLabel(score) {
  const value = Number(score || 0);
  if (value < 40) return 'No apto';
  if (value < 60) return 'No apto temporal';
  if (value < 80) return 'Apto con refuerzo';
  return 'Apto';
}

export function getReviewSummary(result, responses = []) {
  const pending = responses.filter((response) => response.requires_review);
  const automatic = responses.filter((response) => !requiresManualReview(response));
  const reviewed = responses.filter((response) => requiresManualReview(response) && !response.requires_review);

  return {
    status: getReviewLabel(result),
    automaticCount: automatic.length,
    reviewedCount: reviewed.length,
    pendingCount: pending.length || Number(result?.pending_reviews || 0),
    pendingSpreadsheet: pending.filter((response) => response.answer_type === 'spreadsheet').length,
    pendingAudio: pending.filter((response) => response.answer_type === 'audio_response').length,
    pendingText: pending.filter((response) => ['short_text', 'long_text'].includes(response.answer_type)).length,
    isPending: isResultPendingReview(result),
  };
}
