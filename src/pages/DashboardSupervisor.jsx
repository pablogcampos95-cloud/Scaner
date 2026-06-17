import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import EvaluationStatusChart from '../components/charts/EvaluationStatusChart.jsx';
import ProfileScoreChart from '../components/charts/ProfileScoreChart.jsx';
import ResultsDistributionChart from '../components/charts/ResultsDistributionChart.jsx';
import DataTable from '../components/DataTable.jsx';
import Logo from '../components/Logo.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listAsignaciones } from '../services/asignacionesService.js';
import { sendEvaluationInvitation } from '../services/emailService.js';
import { listResultados } from '../services/resultadosService.js';
import {
  getAreaScoreData,
  getDashboardIndicators,
  getEvaluationStatusData,
  getProfileScoreData,
  getResultsDistributionData,
} from '../utils/dashboardMetrics.js';
import { formatDate, formatPercent } from '../utils/formatters.js';

export default function DashboardSupervisor() {
  const { profile } = useOutletContext();
  const [state, setState] = useState({ asignaciones: [], resultados: [], loading: true, error: '', notice: '' });

  const loadData = () => {
    Promise.all([listAsignaciones(profile), listResultados(profile)])
      .then(([asignaciones, resultados]) => setState({ asignaciones, resultados, loading: false, error: '', notice: '' }))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(loadData, [profile]);

  const rows = useMemo(() => state.asignaciones.map((assignment) => ({
    ...assignment,
    resultado: state.resultados.find((item) => item.asignacion_id === assignment.id),
  })), [state.asignaciones, state.resultados]);

  const indicators = useMemo(
    () => getDashboardIndicators({ assignments: rows, results: state.resultados, rows }),
    [rows, state.resultados],
  );
  const statusData = useMemo(() => getEvaluationStatusData(rows), [rows]);
  const resultData = useMemo(() => getResultsDistributionData(state.resultados), [state.resultados]);
  const scoreData = useMemo(() => {
    const areaData = getAreaScoreData(state.resultados);
    return areaData.length ? areaData : getProfileScoreData(state.resultados, 'perfil');
  }, [state.resultados]);

  const handleResend = async (row) => {
    try {
      const response = await sendEvaluationInvitation({ asignacion: row, evaluado: row.evaluados });
      setState((prev) => ({ ...prev, notice: `Invitación enviada: ${response.publicUrl}` }));
      loadData();
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  };

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'dni', header: 'DNI/código', render: (row) => row.evaluados?.dni_codigo || '-' },
    { key: 'correo', header: 'Correo', render: (row) => row.evaluados?.correo || '-' },
    { key: 'area', header: 'Área', render: (row) => row.evaluados?.areas?.nombre || '-' },
    { key: 'perfil', header: 'Perfil', render: (row) => row.evaluados?.perfiles_operativos?.nombre || '-' },
    { key: 'campana', header: 'Campaña/unidad', render: (row) => row.evaluados?.unidad || row.evaluados?.campana || '-' },
    { key: 'cargo', header: 'Cargo', render: (row) => row.evaluados?.cargo_especifico || row.evaluados?.cargo || '-' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'resultado', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado?.resultado_final} /> },
    { key: 'limite', header: 'Fecha límite', render: (row) => formatDate(row.fecha_limite) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="table-actions">
          {row.resultado ? <Link to={`/resultados/${row.resultado.id}`}>Ver resultado</Link> : null}
          <button type="button" onClick={() => handleResend(row)}>Reenviar</button>
        </div>
      ),
    },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <Logo size="sm" showText={false} />
          <span className="eyebrow">Supervisor</span>
          <h1>Seguimiento de evaluados</h1>
          <p>Registra postulantes, asigna pruebas y monitorea resultados.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button compact" to="/registrar-evaluado">Registrar evaluado</Link>
          <Link className="secondary-button" to="/asignar-evaluacion">Asignar evaluación</Link>
          <Link className="secondary-button" to="/resultados">Ver resultados</Link>
        </div>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.notice ? <p className="alert success">{state.notice}</p> : null}

      <div className="section-heading">
        <div>
          <span className="eyebrow">Resumen ejecutivo</span>
          <h2>Indicadores visuales principales</h2>
          <p>Estado general de evaluaciones y resultados.</p>
        </div>
      </div>

      <div className="charts-grid">
        <EvaluationStatusChart title="Estado de mis evaluaciones" data={statusData} />
        <ResultsDistributionChart title="Resultados de mis evaluados" data={resultData} />
        <ProfileScoreChart title="Puntaje promedio por área o perfil" data={scoreData} />
      </div>

      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Indicadores clave</span>
          <h2>Resumen operativo</h2>
        </div>
      </div>

      <div className="secondary-indicators">
        <div><span>Mis evaluados</span><strong>{indicators.uniqueEvaluados}</strong></div>
        <div><span>Asignadas</span><strong>{indicators.assigned}</strong></div>
        <div><span>Pendientes</span><strong>{indicators.pending}</strong></div>
        <div><span>En proceso</span><strong>{indicators.inProgress}</strong></div>
        <div><span>Completadas</span><strong>{indicators.completed}</strong></div>
        <div><span>Vencidas</span><strong>{indicators.expired}</strong></div>
        <div><span>Puntaje promedio</span><strong>{formatPercent(indicators.average)}</strong></div>
      </div>

      <DataTable columns={columns} rows={rows} loading={state.loading} />
    </section>
  );
}
