export const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Opción única' },
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'short_text', label: 'Texto corto' },
  { value: 'long_text', label: 'Texto largo' },
  { value: 'audio_response', label: 'Respuesta por audio' },
  { value: 'spreadsheet', label: 'Mini hoja de cálculo' },
  { value: 'kpi_numeric', label: 'Cálculo/KPI' },
];

export default function QuestionTypeSelector({ value, onChange }) {
  return (
    <label>
      Tipo de pregunta
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seleccionar tipo</option>
        {QUESTION_TYPES.map((type) => (
          <option key={type.value} value={type.value}>{type.label}</option>
        ))}
      </select>
    </label>
  );
}
