import { columnIndexToName, isCellInBounds, normalizeCellRef, parseCellRef } from './spreadsheetUtils.js';

const DANGEROUS_PATTERN = /\b(window|document|fetch|alert|function|eval|import|require|localStorage|sessionStorage|globalThis|constructor|prototype)\b/i;
const SUPPORTED_FUNCTIONS = new Set(['SUMA', 'SUM', 'PROMEDIO', 'AVERAGE', 'CONTAR', 'COUNT', 'CONTARA', 'COUNTA']);

export { normalizeCellRef, parseCellRef };

export function normalizeFormula(formula = '') {
  const raw = String(formula || '').trim();
  if (!raw) return '';
  const prefixed = raw.startsWith('=') ? raw : `=${raw}`;
  return prefixed
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/;/g, ',')
    .replace(/\bSUM\b/g, 'SUMA')
    .replace(/\bAVERAGE\b/g, 'PROMEDIO')
    .replace(/\bCOUNT\b/g, 'CONTAR')
    .replace(/\bCOUNTA\b/g, 'CONTARA');
}

export function compareFormula(expectedFormula, actualFormula) {
  return normalizeFormula(expectedFormula) === normalizeFormula(actualFormula);
}

export function evaluateFormula(formula, cells = {}, options = {}) {
  const raw = String(formula || '').trim();
  if (!raw) return errorResult('#ERROR', 'Empty formula');
  if (!raw.startsWith('=')) return valueResult(parsePrimitive(raw));
  if (raw === '=') return errorResult('#ERROR', 'Empty formula');
  if (DANGEROUS_PATTERN.test(raw)) return errorResult('#ERROR', 'Unsafe formula');

  try {
    const normalized = normalizeFormula(raw);
    const expression = normalized.slice(1).replace(/\)(?=(\d|[A-Z]+\d))/g, ')*');
    const value = evaluateExpression(expression, cells, options);
    if (isErrorValue(value)) return errorResult(value, value);
    return valueResult(value);
  } catch (error) {
    return errorResult(error?.message || '#ERROR', error?.message || 'Invalid formula');
  }
}

export function evaluateExpression(expression, cells = {}, options = {}) {
  const parser = new FormulaParser(expression, cells, options);
  const value = parser.parseExpression();
  parser.skipWhitespace();
  if (!parser.isEnd()) throw new Error('#ERROR');
  return value;
}

export function calculateFunction(functionName, args, cells, options = {}) {
  const fn = normalizeFormula(functionName).replace(/^=/, '');
  if (!SUPPORTED_FUNCTIONS.has(fn)) throw new Error('#FUNC');

  const values = args.flatMap((arg) => Array.isArray(arg) ? arg : [arg]);
  const numbers = values.map((value) => toNumber(value)).filter((value) => Number.isFinite(value));

  if (fn === 'SUMA' || fn === 'SUM') return numbers.reduce((sum, value) => sum + value, 0);
  if (fn === 'PROMEDIO' || fn === 'AVERAGE') return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
  if (fn === 'CONTAR' || fn === 'COUNT') return numbers.length;
  if (fn === 'CONTARA' || fn === 'COUNTA') return values.filter((value) => value !== '' && value !== null && value !== undefined).length;
  throw new Error('#FUNC');
}

export function getCellValue(cellRef, cells = {}, options = {}) {
  const normalized = normalizeCellRef(cellRef);
  if (!normalized || !isCellInBounds(normalized, options.rows || 999, options.columns || 999)) throw new Error('#REF');
  if (options.visited?.has(normalized)) throw new Error('#CIRCULAR');

  const cell = cells[normalized];
  const raw = cell?.rawInput ?? cell?.formula ?? cell?.value ?? cell ?? '';
  if (String(raw).trim().startsWith('=')) {
    const nextVisited = new Set(options.visited || []);
    nextVisited.add(normalized);
    const result = evaluateFormula(raw, cells, { ...options, visited: nextVisited });
    if (!result.success) throw new Error(result.displayValue);
    return result.value;
  }
  return parsePrimitive(raw);
}

export function getRangeValues(rangeRef, cells = {}, options = {}) {
  const [startRaw, endRaw] = String(rangeRef || '').split(':');
  const start = parseCellRef(startRaw);
  const end = parseCellRef(endRaw || startRaw);
  if (!start || !end) throw new Error('#ERROR');
  if (!isCellInBounds(start.id, options.rows || 999, options.columns || 999) || !isCellInBounds(end.id, options.rows || 999, options.columns || 999)) throw new Error('#REF');

  const values = [];
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minColumn = Math.min(start.column, end.column);
  const maxColumn = Math.max(start.column, end.column);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      values.push(getCellValue(`${columnIndexToName(column)}${row}`, cells, options));
    }
  }
  return values;
}

export function getImplicitVerticalRangeValues(startRef, cells = {}, options = {}, includeText = false) {
  const start = parseCellRef(startRef);
  if (!start || !isCellInBounds(start.id, options.rows || 999, options.columns || 999)) throw new Error('#REF');
  const values = [];
  for (let row = start.row; row <= (options.rows || start.row); row += 1) {
    const cellId = `${columnIndexToName(start.column)}${row}`;
    const rawCell = cells[cellId];
    const rawValue = rawCell?.rawInput ?? rawCell?.formula ?? rawCell?.value ?? rawCell ?? '';
    if (row !== start.row && String(rawValue).trim().startsWith('=')) break;
    const value = getCellValue(cellId, cells, options);
    const isEmpty = value === '' || value === null || value === undefined;
    const isNumeric = Number.isFinite(Number(value));
    if (isEmpty) break;
    if (!includeText && !isNumeric) break;
    values.push(value);
  }
  return values.length ? values : [getCellValue(start.id, cells, options)];
}

export function recalculateGrid(cells = {}, config = {}) {
  const next = { ...cells };
  Object.keys(next).forEach((cellId) => {
    const cell = next[cellId];
    const rawInput = cell?.rawInput ?? cell?.formula ?? cell?.value ?? '';
    if (String(rawInput).trim().startsWith('=')) {
      const result = evaluateFormula(rawInput, next, { rows: config.rows, columns: config.columns, visited: new Set([cellId]) });
      next[cellId] = {
        ...cell,
        formula: rawInput,
        calculatedValue: result.value,
        displayValue: result.displayValue,
        isFormula: true,
        isValid: result.success,
        error: result.success ? null : result.displayValue,
      };
    } else {
      next[cellId] = {
        ...cell,
        formula: '',
        calculatedValue: parsePrimitive(rawInput),
        displayValue: rawInput,
        isFormula: false,
        isValid: true,
        error: null,
      };
    }
  });
  return next;
}

function valueResult(value) {
  return {
    success: true,
    value,
    displayValue: formatValue(value),
    error: null,
  };
}

function errorResult(displayValue, error) {
  const safeDisplay = String(displayValue || '#ERROR').startsWith('#') ? String(displayValue) : '#ERROR';
  return {
    success: false,
    value: null,
    displayValue: safeDisplay,
    error: error || safeDisplay,
  };
}

function isErrorValue(value) {
  return typeof value === 'string' && value.startsWith('#');
}

function parsePrimitive(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';
  if (/^-?\d+(\.\d+)?%$/.test(text)) return Number(text.slice(0, -1)) / 100;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return value;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  return String(value);
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (String(value ?? '').trim() === '') return 0;
  return Number(value);
}

class FormulaParser {
  constructor(expression, cells, options) {
    this.expression = expression;
    this.cells = cells;
    this.options = options;
    this.index = 0;
  }

  parseExpression() {
    let value = this.parseTerm();
    while (this.match('+') || this.match('-')) {
      const operator = this.previous();
      const right = this.parseTerm();
      value = this.applyOperator(value, right, operator);
    }
    return value;
  }

  parseTerm() {
    let value = this.parseFactor();
    while (this.match('*') || this.match('/')) {
      const operator = this.previous();
      const right = this.parseFactor();
      value = this.applyOperator(value, right, operator);
    }
    return value;
  }

  parseFactor() {
    this.skipWhitespace();
    if (this.match('(')) {
      const value = this.parseExpression();
      if (!this.match(')')) throw new Error('#ERROR');
      return value;
    }
    if (this.match('-')) return -Number(this.parseFactor());
    return this.parseAtom();
  }

  parseAtom() {
    this.skipWhitespace();
    const rest = this.expression.slice(this.index);

    const numberMatch = rest.match(/^\d+(\.\d+)?%?/);
    if (numberMatch) {
      this.index += numberMatch[0].length;
      return parsePrimitive(numberMatch[0]);
    }

    const nameMatch = rest.match(/^[A-Z]+/);
    if (!nameMatch) throw new Error('#ERROR');
    const name = nameMatch[0];
    this.index += name.length;

    const rowMatch = this.expression.slice(this.index).match(/^\d+/);
    if (rowMatch) {
      this.index += rowMatch[0].length;
      const startRef = normalizeCellRef(`${name}${rowMatch[0]}`);
      if (this.match(':')) {
        const endMatch = this.expression.slice(this.index).match(/^[A-Z]+\d+/);
        if (!endMatch) throw new Error('#ERROR');
        this.index += endMatch[0].length;
        return getRangeValues(`${startRef}:${endMatch[0]}`, this.cells, this.options);
      }
      return getCellValue(startRef, this.cells, this.options);
    }

    if (this.check('(')) {
      if (!SUPPORTED_FUNCTIONS.has(name)) throw new Error('#FUNC');
      const rawArgs = this.readFunctionArgs();
      const args = rawArgs.map((arg) => this.parseFunctionArgument(name, arg));
      return calculateFunction(name, args, this.cells, this.options);
    }

    throw new Error('#ERROR');
  }

  parseFunctionArgument(functionName, rawArg) {
    const trimmed = rawArg.trim();
    if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(trimmed)) {
      return getRangeValues(trimmed, this.cells, this.options);
    }
    if (['SUMA', 'SUM', 'PROMEDIO', 'AVERAGE', 'CONTAR', 'COUNT', 'CONTARA', 'COUNTA'].includes(functionName) && /^[A-Z]+\d+$/.test(trimmed)) {
      return getImplicitVerticalRangeValues(trimmed, this.cells, this.options, ['CONTARA', 'COUNTA'].includes(functionName));
    }
    return evaluateExpression(trimmed, this.cells, this.options);
  }

  readFunctionArgs() {
    if (!this.match('(')) throw new Error('#ERROR');
    const args = [];
    let depth = 0;
    let start = this.index;
    while (!this.isEnd()) {
      const char = this.expression[this.index];
      if (char === '(') depth += 1;
      if (char === ')') {
        if (depth === 0) {
          args.push(this.expression.slice(start, this.index));
          this.index += 1;
          return args.filter((arg) => arg.trim() !== '');
        }
        depth -= 1;
      }
      if (char === ',' && depth === 0) {
        args.push(this.expression.slice(start, this.index));
        start = this.index + 1;
      }
      this.index += 1;
    }
    throw new Error('#ERROR');
  }

  applyOperator(left, right, operator) {
    if (Array.isArray(left) || Array.isArray(right)) throw new Error('#ERROR');
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) throw new Error('#ERROR');
    if (operator === '+') return leftNumber + rightNumber;
    if (operator === '-') return leftNumber - rightNumber;
    if (operator === '*') return leftNumber * rightNumber;
    if (operator === '/') {
      if (rightNumber === 0) throw new Error('#DIV/0');
      return leftNumber / rightNumber;
    }
    throw new Error('#ERROR');
  }

  match(token) {
    if (!this.check(token)) return false;
    this.index += token.length;
    return true;
  }

  check(token) {
    return this.expression.slice(this.index, this.index + token.length) === token;
  }

  previous() {
    return this.expression[this.index - 1];
  }

  skipWhitespace() {
    while (this.expression[this.index] === ' ') this.index += 1;
  }

  isEnd() {
    return this.index >= this.expression.length;
  }
}
