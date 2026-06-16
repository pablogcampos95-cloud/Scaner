import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import EvaluationBuilder from '../components/evaluation-builder/EvaluationBuilder.jsx';
import QuestionBuilder from '../components/evaluation-builder/QuestionBuilder.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { createSection, deactivateEvaluacion, getEvaluaciones, getEvaluationWithQuestions } from '../services/evaluacionesService.js';
import { formatDate } from '../utils/formatters.js';

export default function AdminEvaluations({ mode = 'list' }) {
  const { profile } = useOutletContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ rows: [], evaluation: null, loading: true, error: '', sectionName: '' });

  const load = () => {
    const loader = id ? getEvaluationWithQuestions(id).then((evaluation) => ({ rows: [], evaluation })) : getEvaluaciones().then((rows) => ({ rows, evaluation: null }));
    loader
      .then((payload) => setState((prev) => ({ ...prev, ...payload, loading: false, error: '' })))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(load, [id]);

  const handleToggle = async (evaluationId) => {
    await deactivateEvaluacion(evaluationId);
    load();
  };

  const handleCreateSection = async () => {
    if (!state.sectionName.trim()) return;
    await createSection({ evaluacion_id: id, nombre: state.sectionName, orden: (state.evaluation?.sections?.length || 0) + 1 });
    setState((prev) => ({ ...prev, sectionName: '' }));
    load();
  };

  if (mode === 'new') {
    return (
      <section className="page-stack narrow-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Administrador</span>
            <h1>Nueva evaluación</h1>
            <p>Crea una evaluación dinámica para asignarla a supervisores y evaluados.</p>
          </div>
        </div>
        <EvaluationBuilder profile={profile} onSaved={(evaluation) => navigate(`/admin/evaluaciones/${evaluation.id}/preguntas`)} />
      </section>
    );
  }

  if (mode === 'edit' && state.evaluation) {
    return (
      <section className="page-stack narrow-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Editar</span>
            <h1>{state.evaluation.nombre}</h1>
          </div>
        </div>
        <EvaluationBuilder profile={profile} initialValue={state.evaluation} onSaved={() => navigate('/admin/evaluaciones')} />
      </section>
    );
  }

  if (mode === 'questions' && state.evaluation) {
    return (
      <section className="page-stack">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Constructor</span>
            <h1>{state.evaluation.nombre}</h1>
            <p>Define módulos, tipos de pregunta, puntajes y criterios de revisión.</p>
          </div>
          <Link className="secondary-button" to="/admin/evaluaciones">Volver</Link>
        </div>

        <div className="form-card">
          <h2>Secciones / módulos</h2>
          <div className="form-actions section-actions">
            <input value={state.sectionName} onChange={(event) => setState({ ...state, sectionName: event.target.value })} placeholder="Nombre de sección" />
            <button className="secondary-button" type="button" onClick={handleCreateSection}>Agregar sección</button>
          </div>
          <div className="module-pills">
            {(state.evaluation.sections || []).map((section) => <span key={section.id}>{section.nombre}</span>)}
            {!state.evaluation.sections?.length ? <span>General</span> : null}
          </div>
        </div>

        <QuestionBuilder evaluacionId={id} sections={state.evaluation.sections || []} onCreated={load} />

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Pregunta</th>
                <th>Tipo</th>
                <th>Puntaje</th>
                <th>Corrección</th>
              </tr>
            </thead>
            <tbody>
              {(state.evaluation.questions || []).map((question) => (
                <tr key={question.id}>
                  <td>{question.orden}</td>
                  <td>{question.titulo}</td>
                  <td>{question.question_type}</td>
                  <td>{question.puntaje}</td>
                  <td>{question.scoring_mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  const columns = [
    { key: 'nombre', header: 'Evaluación' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado === 'activa' ? 'completada' : 'vencida'} /> },
    { key: 'puntaje_aprobacion', header: 'Aprobación', render: (row) => `${row.puntaje_aprobacion || 60}%` },
    { key: 'created_at', header: 'Creación', render: (row) => formatDate(row.created_at) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="table-actions">
          <Link to={`/admin/evaluaciones/${row.id}/editar`}>Editar</Link>
          <Link to={`/admin/evaluaciones/${row.id}/preguntas`}>Preguntas</Link>
          <button type="button" onClick={() => handleToggle(row.id)}>{row.estado === 'activa' ? 'Desactivar' : 'Activar'}</button>
        </div>
      ),
    },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Administrador</span>
          <h1>Evaluaciones dinámicas</h1>
          <p>Crea, edita y activa evaluaciones con preguntas automáticas, manuales, audio y mini hojas de cálculo.</p>
        </div>
        <Link className="primary-button compact" to="/admin/evaluaciones/nueva">Crear nueva evaluación</Link>
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      <DataTable columns={columns} rows={state.rows} loading={state.loading} />
    </section>
  );
}
