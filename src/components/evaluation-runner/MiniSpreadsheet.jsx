import { Fragment, useMemo, useState } from 'react';

const columns = ['A', 'B', 'C', 'D', 'E'];
const rows = Array.from({ length: 8 }, (_, index) => index + 1);

export default function MiniSpreadsheet({ question, value, onChange }) {
  const settings = question.settings || {};
  const initialCells = settings.initialCells || {};
  const [cells, setCells] = useState(value?.cells || initialCells);
  const targetCell = (settings.targetCell || 'A1').toUpperCase();
  const expectedCells = settings.expectedCells || question.correct_answer?.expectedCells || null;
  const targetCells = Object.keys(expectedCells || { [targetCell]: settings.expectedValue || '' }).map((cell) => cell.toUpperCase());

  const calculatedResults = useMemo(() => getTargetResults(cells, targetCells), [cells, targetCells]);

  const updateCell = (cell, nextValue) => {
    const next = { ...cells, [cell]: nextValue };
    const results = getTargetResults(next, targetCells);
    setCells(next);
    onChange({
      cells: next,
      formula: next[targetCell] || '',
      targetCell,
      result: results[targetCell],
      results,
    });
  };

  return (
    <div className="mini-sheet">
      <div className="sheet-grid">
        <span className="sheet-corner" />
        {columns.map((column) => <strong key={column}>{column}</strong>)}
        {rows.map((row) => (
          <Fragment key={`sheet-row-${row}`}>
            <strong>{row}</strong>
            {columns.map((column) => {
              const cell = `${column}${row}`;
              return (
                <input
                  className={targetCells.includes(cell) ? 'target-cell' : ''}
                  key={cell}
                  value={cells[cell] || ''}
                  onChange={(event) => updateCell(cell, event.target.value)}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="sheet-result">
        {targetCells.map((cell) => (
          <span key={cell}>
            Celda objetivo <strong>{cell}</strong> - Resultado calculado <strong>{formatResult(calculatedResults[cell])}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function getTargetResults(cells, targetCells) {
  return targetCells.reduce((results, cell) => ({
    ...results,
    [cell]: calculateCell(cells[cell], cells),
  }), {});
}

function formatResult(value) {
  if (value === '' || value === null || value === undefined) return '-';
  if (typeof value === 'number' && !Number.isInteger(value)) return Number(value.toFixed(4));
  return value;
}

export function calculateCell(rawValue, cells, visited = new Set()) {
  if (!rawValue) return '';
  const value = String(rawValue).trim();
  if (!value.startsWith('=')) return value;
  const expression = value.slice(1).toUpperCase().replace(/\s+/g, '');

  const normalizeCell = (cell) => String(cell || '').toUpperCase();
  const getCellValue = (cell) => {
    const normalized = normalizeCell(cell);
    if (visited.has(normalized)) return 'ERROR';
    const nextVisited = new Set(visited);
    nextVisited.add(normalized);
    return calculateCell(cells[normalized] || '0', cells, nextVisited);
  };
  const getNumber = (token) => {
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    return Number(getCellValue(token) || 0);
  };
  const getText = (cell) => String(cells[normalizeCell(cell)] || '');

  const functionMatch = expression.match(/^(SUMA|SUMAR|RESTA|RESTAR|MULTIPLICA|MULTIPLICAR|DIVIDE|DIVIDIR|PROMEDIO|CONTAR|CONTARA)\(([^)]+)\)$/);
  if (functionMatch) {
    const [, fn, rawArgs] = functionMatch;
    const args = rawArgs.split(/[;,]/).filter(Boolean);
    const numbers = args.map(getNumber);
    if (fn === 'CONTARA') return args.filter((cell) => getText(cell) !== '').length;
    if (fn === 'CONTAR') return args.filter((cell) => Number.isFinite(Number(getText(cell))) && getText(cell) !== '').length;
    if (fn === 'PROMEDIO') return numbers.length ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
    if (fn === 'SUMA' || fn === 'SUMAR') return numbers.reduce((sum, num) => sum + num, 0);
    if (fn === 'RESTA' || fn === 'RESTAR') return numbers.slice(1).reduce((result, num) => result - num, numbers[0] || 0);
    if (fn === 'MULTIPLICA' || fn === 'MULTIPLICAR') return numbers.reduce((result, num) => result * num, numbers.length ? 1 : 0);
    if (fn === 'DIVIDE' || fn === 'DIVIDIR') {
      return numbers.slice(1).reduce((result, num) => (num === 0 ? 'ERROR' : result / num), numbers[0] || 0);
    }
  }

  const opMatch = expression.match(/^([A-Z]+\d+|-?\d+(?:\.\d+)?)([+\-*/])([A-Z]+\d+|-?\d+(?:\.\d+)?)$/);
  if (opMatch) {
    const [, leftToken, operator, rightToken] = opMatch;
    const left = getNumber(leftToken);
    const right = getNumber(rightToken);
    if (operator === '+') return left + right;
    if (operator === '-') return left - right;
    if (operator === '*') return left * right;
    if (operator === '/') return right === 0 ? 'ERROR' : left / right;
  }

  return 'REQUIERE_REVISION';
}
