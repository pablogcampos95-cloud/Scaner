import SpreadsheetGrid from './SpreadsheetGrid.jsx';

export default function SpreadsheetQuestionRunner({ question, value, onChange }) {
  const settings = question.settings || {};

  return (
    <div className="spreadsheet-question">
      {settings.helpText ? <p className="spreadsheet-help">{settings.helpText}</p> : null}
      <SpreadsheetGrid
        settings={settings}
        correctAnswer={question.correct_answer || {}}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
