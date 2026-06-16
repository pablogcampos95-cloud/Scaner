export default function QuestionOptionsEditor({ type, options, setOptions }) {
  const multiple = type === 'multiple_choice';

  const update = (index, patch) => {
    setOptions(options.map((option, optionIndex) => {
      if (optionIndex !== index) return multiple ? option : { ...option, is_correct: false };
      return { ...option, ...patch };
    }));
  };

  return (
    <div className="builder-card">
      <h3>Alternativas</h3>
      {options.map((option, index) => (
        <div className="option-editor" key={option.localId}>
          <input value={option.option_text} onChange={(event) => update(index, { option_text: event.target.value })} placeholder={`Alternativa ${index + 1}`} />
          <label className="check-row compact-check">
            <input type={multiple ? 'checkbox' : 'radio'} checked={option.is_correct} onChange={(event) => update(index, { is_correct: event.target.checked })} />
            Correcta
          </label>
        </div>
      ))}
      <button
        className="secondary-button compact"
        type="button"
        onClick={() => setOptions([...options, { localId: crypto.randomUUID(), option_text: '', is_correct: false }])}
      >
        Agregar alternativa
      </button>
    </div>
  );
}
