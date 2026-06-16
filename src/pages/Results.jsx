import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Logo from '../components/Logo.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import { generateResultSuggestion } from '../services/aiService.js';
import { getResponsesByAsignacion } from '../services/respuestasService.js';
import { getResultadoById, listResultados } from '../services/resultadosService.js';
import { getAudioSignedUrl } from '../services/storageService.js';
import { MODULES } from '../utils/constants.js';
import { formatDateTime, formatPercent } from '../utils/formatters.js';
import { getLevelByScore } from '../utils/scoreCalculator.js';

export default function Results() {
  const { profile } = useOutletContext();
  const { id } = useParams();
  const [state, setState] = useState({ rows: [], selected: null, responses: [], loading: true, error: '', aiLoading: false, aiError: '' });

  useEffect(() => {
    const loader = id
      ? getResultadoById(id, profile).then(async (selected) => {
          const rawResponses = selected ? await getResponsesByAsignacion(selected.asignacion_id) : [];
          const responses = await Promise.all(rawResponses.map(async (response) => ({
            ...response,
            playableAudioUrl: response.audio_path ? await getAudioSignedUrl(response.audio_path) : response.audio_url,
          })));
          return { rows: [], selected, responses };
        })
      : listResultados(profile).then((rows) => ({ rows, selected: null, responses: [] }));

    loader
      .then((payload) => setState({ ...payload, loading: false, error: '', aiLoading: false, aiError: '' }))
      .catch((error) => setState({ rows: [], selected: null, responses: [], loading: false, error: error.message, aiLoading: false, aiError: '' }));
  }, [id, profile]);

  const handleGenerateSuggestion = async (force = false) => {
    if (!state.selected?.id) return;
    setState((prev) => ({ ...prev, aiLoading: true, aiError: '' }));
    try {
      const response = await generateResultSuggestion(state.selected.id, force);
      setState((prev) => ({
        ...prev,
        aiLoading: false,
        selected: {
          ...prev.selected,
          ai_suggestion: response.suggestion,
          ai_suggestion_generated_at: new Date().toISOString(),
        },
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, aiLoading: false, aiError: error.message }));
    }
  };

  if (id && !state.loading) {
    if (!state.selected) {
      return (
        <section className="page-stack">
          <p className="alert error">No se encontró el resultado solicitado.</p>
          <Link to="/resultados">Volver a resultados</Link>
        </section>
      );
    }

    const result = state.selected;
    const postulacion = {
      area: result.evaluados?.areas?.nombre || 'No definida',
      perfil: result.evaluados?.perfiles_operativos?.nombre || 'No definido',
      cargo: result.evaluados?.cargo_especifico || result.evaluados?.cargo || 'No definido',
      unidad: result.evaluados?.unidad || result.evaluados?.campana || 'No definida',
    };
    return (
      <section className="page-stack detail-page">
        <div className="result-hero">
          <Logo size="lg" showText={false} className="result-hero-logo" />
          <div>
            <span className="eyebrow">Informe individual</span>
            <h1>{result.evaluados?.nombre_completo || 'Evaluado'}</h1>
            <p>Resultado final del diagnóstico de competencias operativas y comerciales.</p>
          </div>
          <ResultBadge result={result.resultado_final} />
        </div>

        <div className="result-summary">
          <div>
            <span>Postula a</span>
            <strong>{postulacion.cargo}</strong>
            <small>{postulacion.perfil} · {postulacion.area} · {postulacion.unidad}</small>
          </div>
          <div>
            <span>Promedio general</span>
            <strong>{formatPercent(result.promedio_general)}</strong>
          </div>
          <div>
            <span>Finalización</span>
            <strong>{formatDateTime(result.created_at)}</strong>
          </div>
        </div>

        <div className="module-grid">
          {MODULES.map((module) => (
            <article className="module-score" key={module.key}>
              <span>{module.label}</span>
              <strong>{formatPercent(result[module.scoreField])}</strong>
              <small>{getLevelByScore(Number(result[module.scoreField] || 0))}</small>
            </article>
          ))}
        </div>

        <section className="plain-section">
          <h2>Diagnóstico automático</h2>
          <p>{result.diagnostico}</p>
          <h2>Recomendación de capacitación</h2>
          <p>{result.recomendacion}</p>
          <div className="ai-suggestion-box">
            <span className="eyebrow">Sugerencia IA</span>
            {result.ai_suggestion ? <p>{result.ai_suggestion}</p> : <p className="demo-note">Genera una sugerencia breve con IA para complementar el resultado.</p>}
            {state.aiError ? <p className="alert error">{state.aiError}</p> : null}
            <button className="secondary-button compact" type="button" onClick={() => handleGenerateSuggestion(Boolean(result.ai_suggestion))} disabled={state.aiLoading}>
              {state.aiLoading ? 'Generando...' : result.ai_suggestion ? 'Regenerar sugerencia IA' : 'Generar sugerencia IA'}
            </button>
          </div>
          {state.responses.some((response) => response.requires_review) ? (
            <Link className="primary-button compact" to={`/resultados/${result.asignacion_id}/revision`}>
              Revisar respuestas pendientes
            </Link>
          ) : null}
          <Link className="secondary-button compact" to={profile.role === 'admin' ? '/admin' : '/supervisor'}>
            Volver al dashboard
          </Link>
        </section>

        {state.responses.length ? (
          <section className="plain-section">
            <h2>Respuestas por pregunta</h2>
            <div className="responses-list">
              {state.responses.map((response) => (
                <article className="response-card" key={response.id}>
                  <div>
                    <strong>{response.questions?.titulo || 'Pregunta'}</strong>
                    <ResultBadge result={response.requires_review ? 'Pendiente de revisión' : response.is_correct ? 'Apto' : 'No apto temporal'} />
                  </div>
                  {response.answer_text ? <p>{response.answer_text}</p> : null}
                  {response.playableAudioUrl ? <audio controls src={response.playableAudioUrl} /> : null}
                  {response.answer_json ? <pre>{JSON.stringify(response.answer_json, null, 2)}</pre> : null}
                  <small>Puntaje: {response.score_obtained} / {response.max_score}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.campana || '-' },
    { key: 'pc', header: 'PC', render: (row) => formatPercent(row.puntaje_pc) },
    { key: 'excel', header: 'Excel', render: (row) => formatPercent(row.puntaje_excel) },
    { key: 'etica', header: 'Ética', render: (row) => formatPercent(row.puntaje_etica) },
    { key: 'kpis', header: 'KPIs', render: (row) => formatPercent(row.puntaje_kpis) },
    { key: 'promedio_general', header: 'Promedio', render: (row) => formatPercent(row.promedio_general) },
    { key: 'resultado_final', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado_final} /> },
    { key: 'created_at', header: 'Finalización', render: (row) => formatDateTime(row.created_at) },
    { key: 'acciones', header: 'Acciones', render: (row) => <Link to={`/resultados/${row.id}`}>Ver informe</Link> },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <Logo size="sm" showText={false} />
          <span className="eyebrow">Resultados</span>
          <h1>Informes de evaluación</h1>
        </div>
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      <DataTable columns={columns} rows={state.rows} loading={state.loading} />
    </section>
  );
}
