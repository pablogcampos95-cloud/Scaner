import { Fragment, useEffect, useMemo, useState } from 'react';
import { recalculateGrid } from '../../utils/spreadsheetFormulaEngine.js';
import { buildInitialGrid, columnIndexToName, getColumns, getRows, normalizeSpreadsheetConfig, parseCellRef } from '../../utils/spreadsheetUtils.js';
import CellInput from './CellInput.jsx';
import FormulaBar from './FormulaBar.jsx';

export default function SpreadsheetGrid({ settings = {}, correctAnswer = {}, value, onChange, readOnly = false }) {
  const config = useMemo(() => normalizeSpreadsheetConfig(settings, correctAnswer), [settings, correctAnswer]);
  const [activeCell, setActiveCell] = useState(config.targetCells[0] || 'A1');
  const [cells, setCells] = useState(() => recalculateGrid(value?.cells || buildInitialGrid(config), config));
  const columns = getColumns(config.columns);
  const rows = getRows(config.rows);

  useEffect(() => {
    const next = recalculateGrid(value?.cells || buildInitialGrid(config), config);
    setCells(next);
  }, [config.rows, config.columns]);

  const emitChange = (nextCells) => {
    const targetResults = Object.fromEntries(config.targetCells.map((cell) => [cell, nextCells[cell]?.calculatedValue ?? '']));
    const targetPayload = Object.fromEntries(config.targetCells.map((cell) => [cell, nextCells[cell]]));
    onChange?.({
      type: 'spreadsheet',
      cells: nextCells,
      targetCells: config.targetCells,
      formula: nextCells[config.targetCells[0]]?.formula || nextCells[config.targetCells[0]]?.rawInput || '',
      targetCell: config.targetCells[0],
      result: targetResults[config.targetCells[0]],
      results: targetResults,
      targetAnswers: targetPayload,
    });
  };

  const updateCell = (cellId, rawInput) => {
    if (readOnly || cells[cellId]?.locked || cells[cellId]?.editable === false) return;
    const nextCells = recalculateGrid({
      ...cells,
      [cellId]: {
        ...cells[cellId],
        rawInput,
        value: rawInput,
        formula: String(rawInput).trim().startsWith('=') ? rawInput : '',
      },
    }, config);
    setCells(nextCells);
    emitChange(nextCells);
  };

  const navigate = (cellId, direction) => {
    const parsed = parseCellRef(cellId);
    if (!parsed) return;
    const movement = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    }[direction] || [0, 0];
    const nextColumn = Math.min(Math.max(parsed.column + movement[0], 1), config.columns);
    const nextRow = Math.min(Math.max(parsed.row + movement[1], 1), config.rows);
    const nextId = `${columnIndexToName(nextColumn)}${nextRow}`;
    setActiveCell(nextId);
    setTimeout(() => document.querySelector(`[data-cell-id="${nextId}"] input`)?.focus(), 0);
  };

  const activeValue = cells[activeCell]?.rawInput || cells[activeCell]?.displayValue || '';

  return (
    <div className="spreadsheet-shell">
      {config.showFormulaBar ? <FormulaBar activeCell={activeCell} value={activeValue} /> : null}
      <div
        className="spreadsheet-grid"
        style={{ gridTemplateColumns: `44px repeat(${config.columns}, minmax(90px, 1fr))` }}
      >
        <span className="spreadsheet-corner" />
        {columns.map((column) => <strong className="spreadsheet-heading" key={column}>{column}</strong>)}
        {rows.map((row) => (
          <Fragment key={`row-${row}`}>
            <strong className="spreadsheet-heading spreadsheet-row-heading">{row}</strong>
            {columns.map((column) => {
              const cellId = `${column}${row}`;
              const renderedCell = readOnly ? { ...cells[cellId], locked: true, editable: false } : cells[cellId];
              return (
              <span data-cell-id={cellId} key={cellId}>
                <CellInput cell={renderedCell} active={activeCell === cellId} onFocus={setActiveCell} onChange={updateCell} onNavigate={navigate} />
              </span>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
