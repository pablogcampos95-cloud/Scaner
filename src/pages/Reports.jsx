import { useEffect, useMemo, useState } from 'react';
import EvaluationStatusChart from '../components/charts/EvaluationStatusChart.jsx';
import ProfileScoreChart from '../components/charts/ProfileScoreChart.jsx';
import ResultsDistributionChart from '../components/charts/ResultsDistributionChart.jsx';
import DataTable from '../components/DataTable.jsx';
import MetricCard from '../components/MetricCard.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listAsignaciones } from '../services/asignacionesService.js';
import { listResultados } from '../services/resultadosService.js';
import {
  getDashboardIndicators,
  getEvaluationStatusData,
  getProfileScoreData,
  getResultsDistributionData,
} from '../utils/dashboardMetrics.js';
import { formatDate, formatPercent } from '../utils/formatters.js';
import { useOutletContext } from 'react-router-dom';

export default function Reports() {
  const { profile } = useOutletContext();
  const [state, setState] = useState({ assignments: [], results: [], loading: true, error: '' });
  const [filters, setFilters] = useState({ from: '', to: '', area: '', perfil: '', resultado: '', estado: '' });

  useEffect(() => {
    Promise.all([listAsignaciones(profile), listResultados(profile)])
      .then(([assignments, results]) => setState({ assignments, results, loading: false, error: '' }))
      .catch((error) => setState({ assignments: [], results: [], loading: false, error: error.message }));
  }, [profile]);

  const rows = useMemo(() => state.assignments.map((assignment) => ({
    ...assignment,
    resultado: state.results.find((result) => result.asignacion_id === assignment.id),
  })), [state]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const created = (row.resultado?.created_at || row.created_at || '').slice(0, 10);
    const area = row.evaluados?.areas?.nombre || '';
    const perfil = row.evaluados?.perfiles_operativos?.nombre || '';
    const resultado = row.resultado?.resultado_final || '';
    return (
      (!filters.from || created >= filters.from) &&
      (!filters.to || created <= filters.to) &&
      (!filters.area || area === filters.area) &&
      (!filters.perfil || perfil === filters.perfil) &&
      (!filters.resultado || resultado === filters.resultado) &&
      (!filters.estado || row.estado === filters.estado)
    );
  }), [rows, filters]);

  const filteredResults = useMemo(() => filteredRows.map((row) => row.resultado).filter(Boolean), [filteredRows]);
  const indicators = useMemo(
    () => getDashboardIndicators({ assignments: filteredRows, results: filteredResults, rows: filteredRows }),
    [filteredRows, filteredResults],
  );

  const areas = [...new Set(rows.map((row) => row.evaluados?.areas?.nombre).filter(Boolean))];
  const perfiles = [...new Set(rows.map((row) => row.evaluados?.perfiles_operativos?.nombre).filter(Boolean))];
  const resultados = [...new Set(state.results.map((row) => row.resultado_final).filter(Boolean))];

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'evaluacion', header: 'Evaluación', render: (row) => row.evaluaciones?.nombre || '-' },
    { key: 'perfil', header: 'Perfil', render: (row) => row.evaluados?.perfiles_operativos?.nombre || '-' },
    { key: 'area', header: 'Área', render: (row) => row.evaluados?.areas?.nombre || '-' },
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.unidad || row.evaluados?.campana || '-' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'resultado', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado?.resultado_final} /> },
    { key: 'promedio', header: 'Promedio', render: (row) => (row.resultado ? formatPercent(row.resultado.promedio_general) : '-') },
    { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.resultado?.created_at || row.created_at) },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero report-hero">
        <div>
          <span className="eyebrow">Reportería</span>
          <h1>Reportes de evaluaciones y resultados</h1>
          <p>Analiza avance, resultados, brechas y desempeño por perfil, área y campaña.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button compact" type="button" onClick={() => exportReportCsv(filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}

      <div className="filters-bar">
        <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <select value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })}>
          <option value="">Todas las áreas</option>
          {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
        <select value={filters.perfil} onChange={(event) => setFilters({ ...filters, perfil: event.target.value })}>
          <option value="">Todos los perfiles</option>
          {perfiles.map((perfil) => <option key={perfil} value={perfil}>{perfil}</option>)}
        </select>
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
          {resultados.map((resultado) => <option key={resultado} value={resultado}>{resultado}</option>)}
        </select>
        <button className="secondary-button compact" type="button" onClick={() => setFilters({ from: '', to: '', area: '', perfil: '', resultado: '', estado: '' })}>
          Limpiar
        </button>
      </div>

      <div className="metrics-grid metrics-grid--primary">
        <MetricCard title="Evaluaciones" value={indicators.assigned} helper="Asignadas en el periodo" />
        <MetricCard title="Completadas" value={indicators.completed} helper="Diagnósticos cerrados" tone="success" />
        <MetricCard title="Pendientes" value={indicators.pending} helper="Por iniciar" tone="warning" />
        <MetricCard title="Vencidas" value={indicators.expired} helper="Fuera de plazo" tone="danger" />
        <MetricCard title="Puntaje promedio" value={formatPercent(indicators.average)} helper="Resultado general" tone="info" />
        <MetricCard title="No aptos" value={indicators.noAptos} helper="Alertas de brecha" tone="danger" />
      </div>

      <div className="charts-grid">
        <EvaluationStatusChart data={getEvaluationStatusData(filteredRows)} />
        <ResultsDistributionChart data={getResultsDistributionData(filteredResults)} />
        <ProfileScoreChart data={getProfileScoreData(filteredResults, 'perfil')} />
      </div>

      <DataTable columns={columns} rows={filteredRows} loading={state.loading} emptyMessage="No hay datos para los filtros seleccionados." />
    </section>
  );
}

function exportReportCsv(rows) {
  const headers = ['evaluado', 'evaluacion', 'area', 'perfil', 'campana', 'estado', 'resultado', 'promedio', 'fecha'];
  const body = rows.map((row) => [
    row.evaluados?.nombre_completo || '',
    row.evaluaciones?.nombre || '',
    row.evaluados?.areas?.nombre || '',
    row.evaluados?.perfiles_operativos?.nombre || '',
    row.evaluados?.unidad || row.evaluados?.campana || '',
    row.estado || '',
    row.resultado?.resultado_final || '',
    row.resultado?.promedio_general ?? '',
    row.resultado?.created_at || row.created_at || '',
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte-scaneria.csv';
  link.click();
  URL.revokeObjectURL(url);
}
