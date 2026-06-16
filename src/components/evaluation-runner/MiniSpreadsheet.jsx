import { useMemo, useState } from 'react';

const columns = ['A', 'B', 'C', 'D', 'E'];
const rows = Array.from({ length: 8 }, (_, index) => index + 1);

export default function MiniSpreadsheet({ question, value, onChange }) {
  const settings = question.settings || {};
  const initialCells = settings.initialCells || {};
  const [cells, setCells] = useState(value?.cells || initialCells);
  const targetCell = settings.targetCell || 'A1';

  const calculated = useMemo(() => calculateCell(cells[targetCell], cells), [cells, targetCell]);

  const updateCell = (cell, nextValue) => {
    const next = { ...cells, [cell]: nextValue };
    setCells(next);
    onChange({
      cells: next,
      formula: next[targetCell] || '',
      targetCell,
      result: calculateCell(next[targetCell], next),
    });
  };

  return (
    <div className="mini-sheet">
      <div className="sheet-grid">
        <span className="sheet-corner" />
        {columns.map((column) => <strong key={column}>{column}</strong>)}
        {rows.map((row) => (
          <>
            <strong key={`row-${row}`}>{row}</strong>
            {columns.map((column) => {
              const cell = `${column}${row}`;
              return (
                <input
                  className={cell === targetCell ? 'target-cell' : ''}
                  key={cell}
                  value={cells[cell] || ''}
                  onChange={(event) => updateCell(cell, event.target.value)}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="sheet-result">
        Celda objetivo <strong>{targetCell}</strong> · Resultado calculado <strong>{calculated || '-'}</strong>
      </div>
    </div>
  );
}

export function calculateCell(rawValue, cells) {
  if (!rawValue) return '';
  const value = String(rawValue).trim();
  if (!value.startsWith('=')) return value;
  const expression = value.slice(1).toUpperCase();

  const getNumber = (cell) => Number(calculateCell(cells[cell] || '0', cells) || 0);
  const getText = (cell) => String(cells[cell] || '');

  const singleMatch = expression.match(/^(SUMA|PROMEDIO|CONTAR|CONTARA)\((\w+\d+)\)$/);
  if (singleMatch) {
    const [, fn, cell] = singleMatch;
    if (fn === 'CONTARA') return getText(cell) ? 1 : 0;
    if (fn === 'CONTAR') return Number.isFinite(Number(getText(cell))) && getText(cell) !== '' ? 1 : 0;
    return getNumber(cell);
  }

  const opMatch = expression.match(/^(\w+\d+)([+\-*/])(\w+\d+)$/);
  if (opMatch) {
    const [, leftCell, operator, rightCell] = opMatch;
    const left = getNumber(leftCell);
    const right = getNumber(rightCell);
    if (operator === '+') return left + right;
    if (operator === '-') return left - right;
    if (operator === '*') return left * right;
    if (operator === '/') return right === 0 ? 'ERROR' : left / right;
  }

  return 'REQUIERE_REVISION';
}
