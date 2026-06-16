import MiniSpreadsheet from '../evaluation-runner/MiniSpreadsheet.jsx';

export default function SpreadsheetQuestionSettings({ settings, setSettings }) {
  return (
    <div className="builder-card">
      <h3>Configuración de mini hoja</h3>
      <div className="form-grid">
        <label>
          Celda objetivo
          <input value={settings.targetCell || 'A1'} onChange={(event) => setSettings({ ...settings, targetCell: event.target.value.toUpperCase() })} />
        </label>
        <label>
          Respuesta esperada
          <input value={settings.expectedValue || ''} onChange={(event) => setSettings({ ...settings, expectedValue: event.target.value })} />
        </label>
      </div>
      <MiniSpreadsheet
        question={{ settings: { ...settings, targetCell: settings.targetCell || 'A1' } }}
        value={{ cells: settings.initialCells || {} }}
        onChange={(sheet) => setSettings({ ...settings, initialCells: sheet.cells, previewResult: sheet.result })}
      />
      <small>BUSCARV queda preparado como pendiente técnico controlado para una versión posterior.</small>
    </div>
  );
}
