export default function RubricEditor({ value, onChange }) {
  return (
    <div className="builder-card">
      <h3>Rúbrica / criterios</h3>
      <textarea
        rows="4"
        value={value?.criteria || ''}
        onChange={(event) => onChange({ ...(value || {}), criteria: event.target.value })}
        placeholder="Describe criterios de evaluación, niveles esperados o puntos a revisar manualmente."
      />
    </div>
  );
}
