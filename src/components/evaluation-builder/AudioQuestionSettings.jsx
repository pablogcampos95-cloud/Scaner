import RubricEditor from './RubricEditor.jsx';

export default function AudioQuestionSettings({ settings, setSettings, rubric, setRubric }) {
  return (
    <div className="builder-card settings-grid">
      <label>
        Tiempo mínimo recomendado (segundos)
        <input type="number" value={settings.minSeconds || ''} onChange={(event) => setSettings({ ...settings, minSeconds: Number(event.target.value) })} />
      </label>
      <label>
        Tiempo máximo permitido (segundos)
        <input type="number" value={settings.maxSeconds || ''} onChange={(event) => setSettings({ ...settings, maxSeconds: Number(event.target.value) })} />
      </label>
      <label className="full-field">
        Instrucción visible
        <textarea rows="3" value={settings.visibleInstruction || ''} onChange={(event) => setSettings({ ...settings, visibleInstruction: event.target.value })} />
      </label>
      <RubricEditor value={rubric} onChange={setRubric} />
    </div>
  );
}
