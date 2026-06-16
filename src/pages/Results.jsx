import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Logo from '../components/Logo.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import { getResultadoById, listResultados } from '../services/resultadosService.js';
import { MODULES } from '../utils/constants.js';
import { formatDateTime, formatPercent } from '../utils/formatters.js';
import { getLevelByScore } from '../utils/scoreCalculator.js';

export default function Results() {
  const { profile } = useOutletContext();
  const { id } = useParams();
  const [state, setState] = useState({ rows: [], selected: null, loading: true, error: '' });

  useEffect(() => {
    const loader = id ? getResultadoById(id, profile).then((selected) => ({ rows: [], selected })) : listResultados(profile).then((rows) => ({ rows, selected: null }));

    loader
      .then((payload) => setState({ ...payload, loading: false, error: '' }))
      .catch((error) => setState({ rows: [], selected: null, loading: false, error: error.message }));
  }, [id, profile]);

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
    return (
      <section className="page-stack detail-page">
        <div className="result-hero">
          <Logo size="sm" showText={false} />
          <div>
            <span className="eyebrow">Informe individual</span>
            <h1>{result.evaluados?.nombre_completo || 'Evaluado'}</h1>
            <p>Resultado final del diagnóstico de competencias operativas y comerciales.</p>
          </div>
          <ResultBadge result={result.resultado_final} />
        </div>

        <div className="result-summary">
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
          <Link className="secondary-button compact" to={profile.role === 'admin' ? '/admin' : '/supervisor'}>
            Volver al dashboard
          </Link>
        </section>
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
