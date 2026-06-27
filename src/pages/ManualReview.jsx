import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import ResponseAnswerView from '../components/ResponseAnswerView.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import { getResponsesByAsignacion, saveManualReview } from '../services/respuestasService.js';
import { getAudioSignedUrl } from '../services/storageService.js';
import { canEditManualReview } from '../utils/reviewStatus.js';

export default function ManualReview() {
  const { profile } = useOutletContext();
  const { id } = useParams();
  const [state, setState] = useState({
    responses: [],
    loading: true,
    error: '',
    message: '',
    scores: {},
    statuses: {},
    comments: {},
    improvements: {},
    internalComments: {},
    savingId: '',
  });

  const load = () => {
    getResponsesByAsignacion(id)
      .then(async (responses) => {
        const decorated = await Promise.all(responses.map(async (response) => ({
          ...response,
          playableAudioUrl: response.audio_path ? await getAudioSignedUrl(response.audio_path) : response.audio_url,
        })));
        const scores = Object.fromEntries(decorated.map((response) => [response.id, response.score_obtained ?? 0]));
        const statuses = Object.fromEntries(decorated.map((response) => [response.id, 'cumple']));
        const comments = Object.fromEntries(decorated.map((response) => [response.id, response.review_comment || '']));
        const improvements = Object.fromEntries(decorated.map((response) => [response.id, '']));
        const internalComments = Object.fromEntries(decorated.map((response) => [response.id, '']));
        setState((prev) => ({ ...prev, responses: decorated, scores, statuses, comments, improvements, internalComments, loading: false, error: '' }));
      })
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(load, [id]);

  const save = async (response) => {
    setState((prev) => ({ ...prev, savingId: response.id, error: '', message: '' }));
    try {
      await saveManualReview({
        responseId: response.id,
        reviewerId: profile.id,
        score: state.scores[response.id] ?? 0,
        comment: state.comments[response.id] || '',
        rubricResult: {
          source: 'manual_review',
          status: state.statuses[response.id] || 'cumple',
          observation: state.comments[response.id] || '',
          improvement: state.improvements[response.id] || '',
          internal_comment: state.internalComments[response.id] || '',
        },
      });
      setState((prev) => ({ ...prev, savingId: '', message: 'Revisión guardada y resultado recalculado.' }));
      load();
    } catch (error) {
      setState((prev) => ({ ...prev, savingId: '', error: error.message }));
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Validación de respuestas</span>
          <h1>Revisar evaluación</h1>
          <p>Valida solo las respuestas abiertas, de audio o Excel que requieren criterio del revisor.</p>
        </div>
        <Link className="secondary-button compact" to={`/resultados/${id}`}>
          Volver al informe
        </Link>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.message ? <p className="alert success">{state.message}</p> : null}

      <div className="responses-list review-list">
        {state.responses.map((response, index) => {
          const editable = canEditManualReview(response);
          return (
            <article className="response-card review-card" key={response.id}>
              <div className="review-card-header">
                <div>
                  <span className="eyebrow">Pregunta {index + 1}</span>
                  <h2>{response.questions?.titulo || 'Pregunta'}</h2>
                </div>
                <ResultBadge result={response.requires_review ? 'Pendiente de revisión' : response.is_correct ? 'Apto' : 'No apto temporal'} />
              </div>

              <ResponseAnswerView response={response} />

              {!editable ? (
                <div className="review-readonly-note">
                  <strong>Corrección automática</strong>
                  <span>Esta pregunta ya fue corregida de forma objetiva y queda en modo lectura.</span>
                </div>
              ) : (
                <div className="review-form review-form--extended">
                  <label>
                    Puntaje asignado
                    <input
                      type="number"
                      min="0"
                      max={Number(response.max_score || 0)}
                      step="0.1"
                      value={state.scores[response.id] ?? ''}
                      onChange={(event) => setState((prev) => ({
                        ...prev,
                        scores: { ...prev.scores, [response.id]: event.target.value },
                      }))}
                    />
                    <small>Máximo: {response.max_score ?? 0}</small>
                  </label>
                  <label>
                    Estado
                    <select
                      value={state.statuses[response.id] || 'cumple'}
                      onChange={(event) => setState((prev) => ({
                        ...prev,
                        statuses: { ...prev.statuses, [response.id]: event.target.value },
                      }))}
                    >
                      <option value="cumple">Cumple</option>
                      <option value="parcial">Parcial</option>
                      <option value="no_cumple">No cumple</option>
                      <option value="no_aplica">No aplica</option>
                    </select>
                  </label>
                  <label>
                    Observación del revisor
                    <textarea
                      rows="3"
                      value={state.comments[response.id] || ''}
                      onChange={(event) => setState((prev) => ({
                        ...prev,
                        comments: { ...prev.comments, [response.id]: event.target.value },
                      }))}
                      placeholder="Agrega una observación breve para sustentar el ajuste."
                    />
                  </label>
                  <label>
                    Oportunidad de mejora
                    <textarea
                      rows="3"
                      value={state.improvements[response.id] || ''}
                      onChange={(event) => setState((prev) => ({
                        ...prev,
                        improvements: { ...prev.improvements, [response.id]: event.target.value },
                      }))}
                      placeholder="Describe la acción de mejora sugerida."
                    />
                  </label>
                  <label>
                    Comentario interno
                    <textarea
                      rows="3"
                      value={state.internalComments[response.id] || ''}
                      onChange={(event) => setState((prev) => ({
                        ...prev,
                        internalComments: { ...prev.internalComments, [response.id]: event.target.value },
                      }))}
                      placeholder="Nota interna para seguimiento."
                    />
                  </label>
                  <button className="primary-button compact" type="button" onClick={() => save(response)} disabled={state.savingId === response.id}>
                    {state.savingId === response.id ? 'Guardando...' : 'Guardar revisión'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!state.loading && state.responses.length === 0 ? <p className="alert success">No hay respuestas registradas para esta asignación.</p> : null}
    </section>
  );
}
