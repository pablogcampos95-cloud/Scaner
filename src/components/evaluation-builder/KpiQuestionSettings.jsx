export default function KpiQuestionSettings({ correctAnswer, setCorrectAnswer, settings, setSettings }) {
  return (
    <div className="builder-card form-grid">
      <label>
        Respuesta esperada
        <input type="number" step="0.01" value={correctAnswer.expected || ''} onChange={(event) => setCorrectAnswer({ ...correctAnswer, expected: Number(event.target.value) })} />
      </label>
      <label>
        Margen de tolerancia
        <input type="number" step="0.01" value={settings.tolerance || 0} onChange={(event) => setSettings({ ...settings, tolerance: Number(event.target.value) })} />
      </label>
    </div>
  );
}
