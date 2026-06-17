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
import { listResultados } from '../services/resultadosService.js';
import { RESULT_LABELS } from '../utils/constants.js';
import {
  getDashboardIndicators,
  getEvaluationStatusData,
  getProfileScoreData,
  getResultsDistributionData,
} from '../utils/dashboardMetrics.js';
import { formatDate, formatPercent } from '../utils/formatters.js';

export default function DashboardAdmin() {
  const { profile } = useOutletContext();
  const [data, setData] = useState({ asignaciones: [], resultados: [], loading: true, error: '' });
  const [filters, setFilters] = useState({ campana: '', estado: '', resultado: '', supervisor: '', fecha: '' });

  useEffect(() => {
    Promise.all([listAsignaciones(profile), listResultados(profile)])
      .then(([asignaciones, resultados]) => setData({ asignaciones, resultados, loading: false, error: '' }))
      .catch((error) => setData((prev) => ({ ...prev, loading: false, error: error.message })));
  }, [profile]);

  const rows = useMemo(() => {
    return data.asignaciones.map((assignment) => ({
      ...assignment,
      resultado: data.resultados.find((item) => item.asignacion_id === assignment.id),
    }));
  }, [data]);

  const filteredRows = rows.filter((row) => {
    const evaluado = row.evaluados || {};
    const createdDate = row.created_at?.slice(0, 10);
    return (
      (!filters.campana || evaluado.campana?.toLowerCase().includes(filters.campana.toLowerCase())) &&
      (!filters.estado || row.estado === filters.estado) &&
      (!filters.resultado || row.resultado?.resultado_final === filters.resultado) &&
      (!filters.supervisor || row.profiles?.full_name?.toLowerCase().includes(filters.supervisor.toLowerCase())) &&
      (!filters.fecha || createdDate === filters.fecha)
    );
  });

  const indicators = useMemo(
    () => getDashboardIndicators({ assignments: rows, results: data.resultados, rows }),
    [rows, data.resultados],
  );
  const statusData = useMemo(() => getEvaluationStatusData(rows), [rows]);
  const resultData = useMemo(() => getResultsDistributionData(data.resultados), [data.resultados]);
  const profileData = useMemo(() => getProfileScoreData(data.resultados, 'perfil'), [data.resultados]);

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.campana || row.evaluados?.unidad || '-' },
    { key: 'supervisor', header: 'Supervisor', render: (row) => row.profiles?.full_name || 'Supervisor asignado' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'resultado', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado?.resultado_final} /> },
    { key: 'limite', header: 'Fecha límite', render: (row) => formatDate(row.fecha_limite) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (row.resultado ? <Link to={`/resultados/${row.resultado.id}`}>Ver resultado</Link> : '-'),
    },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <div className="hero-kicker">
            <Logo size="sm" showText={false} />
            <span className="eyebrow">Administrador</span>
          </div>
          <h1>Control de evaluaciones</h1>
          <p>Monitorea resultados, brechas y avance por perfil.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button compact" to="/admin/evaluaciones/nueva">Nueva evaluación</Link>
          <Link className="secondary-button" to="/resultados">Ver resultados</Link>
        </div>
      </div>

      {data.error ? <p className="alert error">{data.error}</p> : null}

      <div className="section-heading">
        <div>
          <span className="eyebrow">Resumen ejecutivo</span>
          <h2>Indicadores visuales principales</h2>
          <p>Estado general de evaluaciones y resultados.</p>
        </div>
      </div>

      <div className="charts-grid">
        <EvaluationStatusChart data={statusData} />
        <ResultsDistributionChart data={resultData} />
        <ProfileScoreChart data={profileData} />
      </div>

      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Indicadores clave</span>
          <h2>Resumen operativo</h2>
        </div>
      </div>

      <div className="secondary-indicators">
        <div><span>Total evaluados</span><strong>{indicators.uniqueEvaluados}</strong></div>
        <div><span>Evaluaciones asignadas</span><strong>{indicators.assigned}</strong></div>
        <div><span>Puntaje promedio</span><strong>{formatPercent(indicators.average)}</strong></div>
        <div><span>Áreas con evaluados</span><strong>{indicators.areas}</strong></div>
        <div><span>Perfiles con evaluados</span><strong>{indicators.perfiles}</strong></div>
        <div><span>Diagnósticos completados</span><strong>{indicators.completed}</strong></div>
        <div><span>Evaluaciones vencidas</span><strong>{indicators.expired}</strong></div>
        <div><span>Aptos</span><strong>{indicators.aptos}</strong></div>
        <div><span>Aptos con refuerzo</span><strong>{indicators.aptosRefuerzo}</strong></div>
        <div><span>No aptos temporales</span><strong>{indicators.noAptos}</strong></div>
      </div>

      <div className="filters-bar">
        <input type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
        <input placeholder="Campaña" value={filters.campana} onChange={(event) => setFilters({ ...filters, campana: event.target.value })} />
        <input placeholder="Supervisor" value={filters.supervisor} onChange={(event) => setFilters({ ...filters, supervisor: event.target.value })} />
        <select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}>
          <option value="">Todos los estados</option>
          <option value="asignada">Asignada</option>
          <option value="enviada">Enviada</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completada">Completada</option>
          <option value="vencida">Vencida</option>
        </select>
        <select value={filters.resultado} onChange={(event) => setFilters({ ...filters, resultado: event.target.value })}>
          <option value="">Todos los resultados</option>
          <option value={RESULT_LABELS.APTO}>Apto</option>
          <option value={RESULT_LABELS.APTO_REFUERZO}>Apto con refuerzo</option>
          <option value={RESULT_LABELS.NO_APTO}>No apto temporal</option>
        </select>
      </div>

      <DataTable columns={columns} rows={filteredRows} loading={data.loading} />
    </section>
  );
}
