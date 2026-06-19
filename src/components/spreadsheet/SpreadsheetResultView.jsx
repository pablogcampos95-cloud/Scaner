import SpreadsheetGrid from './SpreadsheetGrid.jsx';

export default function SpreadsheetResultView({ response }) {
  const answer = response.answer_json || {};
  const grading = answer.grading || {};
  const details = grading.details || [];
  const question = response.questions || {};

  return (
    <div className="spreadsheet-result-view">
      {details.length ? (
        <div className="spreadsheet-result-details">
          {details.map((detail) => (
            <div key={detail.cell}>
              <span>Celda objetivo</span>
              <strong>{detail.cell}</strong>
              <span>Fórmula ingresada</span>
              <strong>{detail.actualFormula || '-'}</strong>
              <span>Resultado calculado</span>
              <strong>{String(detail.actualValue ?? '-')}</strong>
              <span>Resultado esperado</span>
              <strong>{String(detail.expectedValue ?? '-')}</strong>
              <span>Estado</span>
              <strong>{detail.isCorrect ? 'Correcto' : grading.requiresReview ? 'Pendiente de revisión' : 'Incorrecto'}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <SpreadsheetGrid
        settings={question.settings || {}}
        correctAnswer={{}}
        value={{ cells: answer.cells || {} }}
        readOnly
      />
    </div>
  );
}
