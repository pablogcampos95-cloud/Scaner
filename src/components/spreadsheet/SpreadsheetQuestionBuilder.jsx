import { useMemo, useState } from 'react';
import { evaluateFormula } from '../../utils/spreadsheetFormulaEngine.js';
import { buildInitialGrid, getColumns, getRows, normalizeCellRef, normalizeSpreadsheetConfig } from '../../utils/spreadsheetUtils.js';
import SpreadsheetGrid from './SpreadsheetGrid.jsx';

const gradingModes = [
  { value: 'result', label: 'Resultado final' },
  { value: 'formula_exact', label: 'Fórmula exacta' },
  { value: 'formula_equivalent', label: 'Fórmula equivalente básica' },
  { value: 'manual', label: 'Corrección manual' },
];

export default function SpreadsheetQuestionBuilder({ settings, setSettings, correctAnswer, setCorrectAnswer, puntaje = 1 }) {
  const config = useMemo(() => normalizeSpreadsheetConfig(settings, correctAnswer), [settings, correctAnswer]);
  const [testResult, setTestResult] = useState('');
  const targetCell = config.targetCells[0] || 'B7';
  const expected = config.expectedAnswers[targetCell] || {};
  const rows = getRows(config.rows);
  const columns = getColumns(config.columns);

  const update = (patch) => setSettings({ ...settings, ...patch });

  const syncExpected = (nextExpected) => {
    const nextExpectedAnswers = {
      ...(settings.expectedAnswers || {}),
      [targetCell]: {
        ...expected,
        ...nextExpected,
      },
    };
    const expectedCells = Object.fromEntries(Object.entries(nextExpectedAnswers).map(([cell, item]) => [cell, item.expectedValue]));
    update({
      expectedAnswers: nextExpectedAnswers,
      expectedCells,
      expectedValue: nextExpectedAnswers[targetCell]?.expectedValue ?? '',
      expectedFormula: nextExpectedAnswers[targetCell]?.expectedFormula ?? '',
      tolerance: nextExpectedAnswers[targetCell]?.tolerance ?? 0,
      gradingMode: nextExpectedAnswers[targetCell]?.gradingMode ?? 'result',
    });
    setCorrectAnswer?.({ expectedCells, expectedFormula: nextExpectedAnswers[targetCell]?.expectedFormula || '', tolerance: nextExpectedAnswers[targetCell]?.tolerance ?? 0 });
  };

  const updateTarget = (rawCell) => {
    const normalized = normalizeCellRef(rawCell);
    if (!normalized) return;
    const previousExpected = settings.expectedAnswers || {};
    const nextExpectedAnswers = {
      ...previousExpected,
      [normalized]: previousExpected[targetCell] || {
        expectedFormula: '',
        expectedValue: '',
        tolerance: 0,
        gradingMode: 'result',
      },
    };
    delete nextExpectedAnswers[targetCell];
    update({
      targetCell: normalized,
      targetCells: [normalized],
      editableCells: [normalized],
      expectedAnswers: nextExpectedAnswers,
    });
  };

  const handlePreviewChange = (sheet) => {
    update({ initialCells: sheet.cells });
  };

  const toggleLocked = (cellId) => {
    const locked = new Set(settings.lockedCells || []);
    const editable = new Set(settings.editableCells || []);
    if (locked.has(cellId)) {
      locked.delete(cellId);
      editable.add(cellId);
    } else {
      locked.add(cellId);
      editable.delete(cellId);
    }
    update({ lockedCells: [...locked], editableCells: [...editable] });
  };

  const testFormula = () => {
    const grid = buildInitialGrid(config);
    const result = evaluateFormula(expected.expectedFormula || '', grid, config);
    setTestResult(result.success ? `Resultado calculado: ${result.displayValue}` : `Error: ${result.displayValue}`);
  };

  return (
    <div className="builder-card spreadsheet-builder">
      <h3>Mini hoja de cálculo</h3>
      <p className="demo-note">Configura una grilla tipo Excel para evaluar fórmulas, operaciones y razonamiento numérico.</p>

      <div className="form-grid">
        <label>
          Filas
          <input type="number" min="2" max="30" value={config.rows} onChange={(event) => update({ rows: Number(event.target.value) })} />
        </label>
        <label>
          Columnas
          <input type="number" min="2" max="12" value={config.columns} onChange={(event) => update({ columns: Number(event.target.value) })} />
        </label>
        <label>
          Celda objetivo
          <input value={targetCell} onChange={(event) => updateTarget(event.target.value)} />
        </label>
        <label>
          Modo de corrección
          <select value={expected.gradingMode || config.gradingMode} onChange={(event) => syncExpected({ gradingMode: event.target.value })}>
            {gradingModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
        </label>
        <label>
          Fórmula esperada
          <input value={expected.expectedFormula || settings.expectedFormula || ''} onChange={(event) => syncExpected({ expectedFormula: event.target.value })} placeholder="=SUMA(B2:B6)" />
        </label>
        <label>
          Resultado esperado
          <input value={expected.expectedValue ?? settings.expectedValue ?? ''} onChange={(event) => syncExpected({ expectedValue: event.target.value })} placeholder="700" />
        </label>
        <label>
          Tolerancia
          <input type="number" step="0.01" value={expected.tolerance ?? settings.tolerance ?? 0} onChange={(event) => syncExpected({ tolerance: Number(event.target.value) })} />
        </label>
        <label>
          Mensaje de ayuda
          <input value={settings.helpText || ''} onChange={(event) => update({ helpText: event.target.value })} placeholder="Usa una fórmula en la celda objetivo." />
        </label>
      </div>

      <div className="spreadsheet-builder-actions">
        <button className="secondary-button compact" type="button" onClick={testFormula}>Probar fórmula esperada</button>
        {testResult ? <span>{testResult}</span> : null}
      </div>

      <SpreadsheetGrid settings={{ ...settings, targetCells: [targetCell], editableCells: settings.editableCells || [targetCell] }} correctAnswer={correctAnswer} value={{ cells: settings.initialCells || buildInitialGrid(config) }} onChange={handlePreviewChange} />

      <div className="spreadsheet-lock-panel">
        <strong>Bloquear o desbloquear celdas</strong>
        <div>
          {rows.flatMap((row) => columns.map((column) => `${column}${row}`)).map((cellId) => (
            <button
              className={(settings.lockedCells || []).includes(cellId) ? 'cell-toggle cell-toggle--locked' : 'cell-toggle'}
              key={cellId}
              type="button"
              onClick={() => toggleLocked(cellId)}
            >
              {cellId}
            </button>
          ))}
        </div>
      </div>

      <label>
        Explicación interna para revisión
        <textarea rows="3" value={settings.internalExplanation || ''} onChange={(event) => update({ internalExplanation: event.target.value })} />
      </label>
      <small>El puntaje total de esta pregunta será {puntaje}. No se muestra la respuesta correcta al participante.</small>
    </div>
  );
}
