export default function TextQuestion({ question, value = '', onChange }) {
  const isLong = question.question_type === 'long_text';

  return isLong ? (
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="6" placeholder="Escribe tu respuesta..." />
  ) : (
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Respuesta breve" />
  );
}
