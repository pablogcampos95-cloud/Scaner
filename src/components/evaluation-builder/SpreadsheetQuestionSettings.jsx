import SpreadsheetQuestionBuilder from '../spreadsheet/SpreadsheetQuestionBuilder.jsx';

export default function SpreadsheetQuestionSettings({ settings, setSettings, correctAnswer, setCorrectAnswer, puntaje }) {
  return (
    <SpreadsheetQuestionBuilder
      settings={settings}
      setSettings={setSettings}
      correctAnswer={correctAnswer}
      setCorrectAnswer={setCorrectAnswer}
      puntaje={puntaje}
    />
  );
}
