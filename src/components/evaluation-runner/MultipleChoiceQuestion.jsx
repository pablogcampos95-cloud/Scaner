export default function MultipleChoiceQuestion({ question, value = [], onChange }) {
  const toggle = (optionId) => {
    const next = value.includes(optionId) ? value.filter((id) => id !== optionId) : [...value, optionId];
    onChange(next);
  };

  return (
    <div className="runner-question">
      {(question.options || []).map((option) => (
        <label className="option-row" key={option.id}>
          <input type="checkbox" checked={value.includes(option.id)} onChange={() => toggle(option.id)} />
          {option.option_text}
        </label>
      ))}
    </div>
  );
}
