export default function SingleChoiceQuestion({ question, value, onChange }) {
  return (
    <div className="runner-question">
      {(question.options || []).map((option) => (
        <label className="option-row" key={option.id}>
          <input type="radio" name={question.id} checked={value === option.id} onChange={() => onChange(option.id)} />
          {option.option_text}
        </label>
      ))}
    </div>
  );
}
