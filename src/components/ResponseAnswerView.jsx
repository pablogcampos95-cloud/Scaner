import SpreadsheetResultView from './spreadsheet/SpreadsheetResultView.jsx';

export default function ResponseAnswerView({ response }) {
  if (response.answer_type === 'spreadsheet' && response.answer_json) {
    return <SpreadsheetResultView response={response} />;
  }

  if (response.playableAudioUrl) {
    return (
      <div className="review-answer-block">
        <span>Respuesta de audio</span>
        <audio controls src={response.playableAudioUrl} />
      </div>
    );
  }

  if (response.answer_text) {
    return (
      <div className="review-answer-block">
        <span>Respuesta enviada</span>
        <p>{formatChoiceText(response, response.answer_text)}</p>
      </div>
    );
  }

  if (response.answer_json !== null && response.answer_json !== undefined) {
    return <StructuredAnswer response={response} />;
  }

  return <p className="demo-note">No se registró contenido para esta respuesta.</p>;
}

function StructuredAnswer({ response }) {
  const { answer_json: value, answer_type: type } = response;

  if (type === 'multiple_choice') {
    const values = Array.isArray(value) ? value : [];
    return (
      <div className="review-answer-block">
        <span>Opciones seleccionadas</span>
        {values.length ? (
          <ul className="answer-choice-list">
            {values.map((item) => <li key={String(item)}>{formatChoiceText(response, item)}</li>)}
          </ul>
        ) : (
          <p>-</p>
        )}
      </div>
    );
  }

  if (type === 'single_choice') {
    return (
      <div className="review-answer-block">
        <span>Opción seleccionada</span>
        <p>{formatChoiceText(response, value)}</p>
      </div>
    );
  }

  if (type === 'kpi_numeric') {
    const answer = typeof value === 'object' ? value.value ?? value.answer ?? value.result : value;
    return (
      <div className="review-answer-block">
        <span>Respuesta numérica</span>
        <p>{String(answer ?? '-')}</p>
      </div>
    );
  }

  return (
    <div className="review-answer-block">
      <span>Respuesta registrada</span>
      <p>{summarizeValue(value)}</p>
    </div>
  );
}

function formatChoiceText(response, value) {
  const rawValue = String(value ?? '');
  const options = response.questions?.options || response.questions?.question_options || [];
  const option = options.find((item) => item.id === rawValue || item.option_text === rawValue);
  return option?.option_text || rawValue || '-';
}

function summarizeValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return value.map(String).join(', ');
  return Object.entries(value)
    .filter(([, entryValue]) => ['string', 'number', 'boolean'].includes(typeof entryValue))
    .map(([key, entryValue]) => `${key}: ${entryValue}`)
    .join(' · ') || 'Respuesta guardada.';
}
