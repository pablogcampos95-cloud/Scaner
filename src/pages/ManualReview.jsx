import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { getResponsesByAsignacion, saveManualReview } from '../services/respuestasService.js';

export default function ManualReview() {
  const { profile } = useOutletContext();
  const { id } = useParams();
  const [state, setState] = useState({ responses: [], loading: true, error: '', scores: {}, comments: {} });

  const load = () => {
    getResponsesByAsignacion(id)
      .then((responses) => setState((prev) => ({ ...prev, responses: responses.filter((response) => response.requires_review), loading: false, error: '' })))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(load, [id]);

  const save = async (responseId) => {
    await saveManualReview({
      responseId,
      reviewerId: profile.id,
      score: state.scores[responseId] || 0,
      comment: state.comments[responseId] || '',
      rubricResult: {},
    });
    load();
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Revisión manual</span>
          <h1>Respuestas pendientes</h1>
          <p>Califica respuestas de texto largo, audio o rúbrica.</p>
        </div>
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.responses.map((response) => (
        <article className="form-card" key={response.id}>
          <h2>{response.questions?.titulo || 'Pregunta'}</h2>
          {response.answer_text ? <p>{response.answer_text}</p> : null}
          {response.audio_url || response.audio_path ? <audio controls src={response.audio_url || response.audio_path} /> : null}
          {response.answer_json ? <pre>{JSON.stringify(response.answer_json, null, 2)}</pre> : null}
          <div className="form-grid">
            <label>
              Puntaje
              <input type="number" value={state.scores[response.id] || ''} onChange={(event) => setState({ ...state, scores: { ...state.scores, [response.id]: event.target.value } })} />
            </label>
            <label>
              Comentario
              <input value={state.comments[response.id] || ''} onChange={(event) => setState({ ...state, comments: { ...state.comments, [response.id]: event.target.value } })} />
            </label>
          </div>
          <button className="primary-button compact" type="button" onClick={() => save(response.id)}>Guardar revisión</button>
        </article>
      ))}
      {!state.loading && state.responses.length === 0 ? <p className="alert success">No hay respuestas pendientes de revisión para esta asignación.</p> : null}
    </section>
  );
}
