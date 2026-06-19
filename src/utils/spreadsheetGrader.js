import { compareFormula, evaluateFormula } from './spreadsheetFormulaEngine.js';
import { normalizeSpreadsheetConfig } from './spreadsheetUtils.js';

export function gradeSpreadsheetAnswer(settings = {}, correctAnswer = {}, response = {}, maxScore = 0) {
  const config = normalizeSpreadsheetConfig(settings, correctAnswer);
  const answerCells = response?.cells || {};
  const targetCells = config.targetCells.length ? config.targetCells : [settings.targetCell || 'A1'];
  const details = [];
  let allCorrect = true;
  let requiresReview = false;

  targetCells.forEach((cell) => {
    const expected = config.expectedAnswers[cell] || {};
    const mode = expected.gradingMode || config.gradingMode || 'result';
    const actualCell = answerCells[cell] || {};
    const actualFormula = actualCell.formula || actualCell.rawInput || response?.formula || '';
    const actualValue = actualCell.calculatedValue ?? response?.results?.[cell] ?? response?.result ?? '';
    const expectedValue = expected.expectedValue ?? settings.expectedValue ?? correctAnswer.expectedValue ?? '';
    const expectedFormula = expected.expectedFormula ?? settings.expectedFormula ?? correctAnswer.expectedFormula ?? '';
    const tolerance = Number(expected.tolerance ?? settings.tolerance ?? correctAnswer.tolerance ?? 0);

    let isCorrect = false;
    if (mode === 'manual') {
      requiresReview = true;
      isCorrect = false;
    } else if (mode === 'formula_exact') {
      isCorrect = Boolean(expectedFormula) && compareFormula(expectedFormula, actualFormula);
    } else {
      isCorrect = valuesMatch(expectedValue, actualValue, tolerance);
      if (mode === 'formula_equivalent' && !isCorrect && expectedFormula && actualFormula) {
        const expectedResult = evaluateFormula(expectedFormula, { ...config.initialCells, ...answerCells }, config);
        const actualResult = evaluateFormula(actualFormula, { ...config.initialCells, ...answerCells }, config);
        isCorrect = expectedResult.success && actualResult.success && valuesMatch(expectedResult.value, actualResult.value, tolerance);
      }
    }

    if (!isCorrect && mode !== 'manual') allCorrect = false;
    details.push({
      cell,
      expectedValue,
      actualValue,
      expectedFormula,
      actualFormula,
      isCorrect,
      gradingMode: mode,
    });
  });

  if (requiresReview) {
    return { isCorrect: null, scoreObtained: 0, maxScore, requiresReview: true, details };
  }

  return {
    isCorrect: allCorrect,
    scoreObtained: allCorrect ? maxScore : 0,
    maxScore,
    requiresReview: !allCorrect && Boolean(settings.reviewOnMismatch),
    details,
  };
}

export function valuesMatch(expected, received, tolerance = 0) {
  const expectedNumber = Number(expected);
  const receivedNumber = Number(received);
  if (Number.isFinite(expectedNumber) && Number.isFinite(receivedNumber)) {
    return Math.abs(expectedNumber - receivedNumber) <= tolerance;
  }
  return String(expected ?? '').trim().toLowerCase() === String(received ?? '').trim().toLowerCase();
}
