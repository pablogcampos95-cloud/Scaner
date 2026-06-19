export const DEFAULT_SPREADSHEET_ROWS = 8;
export const DEFAULT_SPREADSHEET_COLUMNS = 5;

export function columnIndexToName(index) {
  let result = '';
  let current = Number(index);
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result || 'A';
}

export function columnNameToIndex(columnName) {
  return String(columnName || '')
    .toUpperCase()
    .split('')
    .reduce((sum, letter) => (sum * 26) + letter.charCodeAt(0) - 64, 0);
}

export function normalizeCellRef(cellRef) {
  const match = String(cellRef || '').trim().toUpperCase().match(/^([A-Z]+)0*([1-9]\d*)$/);
  if (!match) return '';
  return `${match[1]}${Number(match[2])}`;
}

export function parseCellRef(cellRef) {
  const normalized = normalizeCellRef(cellRef);
  const match = normalized.match(/^([A-Z]+)([1-9]\d*)$/);
  if (!match) return null;
  return {
    id: normalized,
    column: columnNameToIndex(match[1]),
    row: Number(match[2]),
  };
}

export function isCellInBounds(cellRef, rows, columns) {
  const parsed = parseCellRef(cellRef);
  return Boolean(parsed && parsed.row >= 1 && parsed.row <= rows && parsed.column >= 1 && parsed.column <= columns);
}

export function getColumns(count = DEFAULT_SPREADSHEET_COLUMNS) {
  return Array.from({ length: Number(count) || DEFAULT_SPREADSHEET_COLUMNS }, (_, index) => columnIndexToName(index + 1));
}

export function getRows(count = DEFAULT_SPREADSHEET_ROWS) {
  return Array.from({ length: Number(count) || DEFAULT_SPREADSHEET_ROWS }, (_, index) => index + 1);
}

export function normalizeCellConfig(rawCell) {
  if (rawCell && typeof rawCell === 'object' && !Array.isArray(rawCell)) {
    const rawValue = rawCell.rawInput ?? rawCell.formula ?? rawCell.value ?? '';
    return {
      value: rawValue,
      rawInput: rawValue,
      formula: String(rawValue).trim().startsWith('=') ? String(rawValue) : '',
      displayValue: rawCell.displayValue ?? rawCell.calculatedValue ?? rawCell.value ?? '',
      calculatedValue: rawCell.calculatedValue ?? rawCell.value ?? '',
      locked: Boolean(rawCell.locked),
      editable: rawCell.editable,
      type: rawCell.type || inferCellType(rawValue),
      error: rawCell.error || null,
    };
  }

  return {
    value: rawCell ?? '',
    rawInput: rawCell ?? '',
    formula: String(rawCell ?? '').trim().startsWith('=') ? String(rawCell) : '',
    displayValue: rawCell ?? '',
    calculatedValue: rawCell ?? '',
    locked: false,
    editable: undefined,
    type: inferCellType(rawCell),
    error: null,
  };
}

export function inferCellType(value) {
  if (String(value ?? '').trim().startsWith('=')) return 'formula';
  if (value !== '' && Number.isFinite(Number(value))) return 'number';
  return 'text';
}

export function normalizeSpreadsheetConfig(settings = {}, correctAnswer = {}) {
  const rows = Number(settings.rows || settings.rowCount || DEFAULT_SPREADSHEET_ROWS);
  const columns = Number(settings.columns || settings.columnCount || DEFAULT_SPREADSHEET_COLUMNS);
  const initialCells = settings.initialCells || {};
  const expectedCells = settings.expectedCells || correctAnswer.expectedCells || null;
  const targetCells = (settings.targetCells || Object.keys(expectedCells || {})).length
    ? (settings.targetCells || Object.keys(expectedCells || {}))
    : [settings.targetCell || 'A1'];
  const normalizedTargets = targetCells.map(normalizeCellRef).filter(Boolean);
  const expectedAnswers = settings.expectedAnswers || {};

  if (!Object.keys(expectedAnswers).length && normalizedTargets.length) {
    normalizedTargets.forEach((cell) => {
      expectedAnswers[cell] = {
        expectedFormula: settings.expectedFormula || correctAnswer.expectedFormula || '',
        expectedValue: expectedCells?.[cell] ?? settings.expectedValue ?? correctAnswer.expectedValue ?? '',
        tolerance: Number(settings.tolerance ?? correctAnswer.tolerance ?? 0),
        gradingMode: settings.gradingMode || settings.correctionMode || 'result',
      };
    });
  }

  return {
    rows,
    columns,
    initialCells,
    editableCells: (settings.editableCells || normalizedTargets).map(normalizeCellRef).filter(Boolean),
    lockedCells: (settings.lockedCells || []).map(normalizeCellRef).filter(Boolean),
    targetCells: normalizedTargets,
    expectedAnswers,
    showFormulaBar: settings.showFormulaBar !== false,
    showCalculatedResult: settings.showCalculatedResult !== false,
    allowFormulaEquivalent: settings.allowFormulaEquivalent !== false,
    gradingMode: settings.gradingMode || settings.correctionMode || 'result',
    helpText: settings.helpText || settings.help || '',
    internalExplanation: settings.internalExplanation || '',
  };
}

export function buildInitialGrid(config) {
  const cells = {};
  getRows(config.rows).forEach((row) => {
    getColumns(config.columns).forEach((column) => {
      const id = `${column}${row}`;
      const initial = normalizeCellConfig(config.initialCells?.[id] ?? '');
      const locked = config.lockedCells.includes(id) || initial.locked;
      const editable = config.editableCells.includes(id) || (!locked && initial.editable !== false);
      cells[id] = {
        ...initial,
        id,
        locked,
        editable,
        isTarget: config.targetCells.includes(id),
      };
    });
  });
  return cells;
}
