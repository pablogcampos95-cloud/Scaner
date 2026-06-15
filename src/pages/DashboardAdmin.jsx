import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import MetricCard from '../components/MetricCard.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listAsignaciones } from '../services/asignacionesService.js';
import { listResultados } from '../services/resultadosService.js';
import { RESULT_LABELS } from '../utils/constants.js';
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
      (!filters.supervisor || row.supervisor_id?.toLowerCase().includes(filters.supervisor.toLowerCase())) &&
      (!filters.fecha || createdDate === filters.fecha)
    );
  });

  const completed = rows.filter((row) => row.estado === 'completada').length;
  const average = data.resultados.length
    ? Math.round(data.resultados.reduce((sum, item) => sum + Number(item.promedio_general || 0), 0) / data.resultados.length)
    : 0;

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.campana || '-' },
    { key: 'supervisor', header: 'Supervisor', render: (row) => row.supervisor_id },
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
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrador</span>
          <h1>Dashboard general</h1>
        </div>
      </div>

      {data.error ? <p className="alert error">{data.error}</p> : null}

      <div className="metrics-grid">
        <MetricCard title="Total evaluados" value={new Set(rows.map((row) => row.evaluado_id)).size} />
        <MetricCard title="Completadas" value={completed} tone="success" />
        <MetricCard title="Pendientes" value={rows.filter((row) => ['asignada', 'enviada', 'pendiente'].includes(row.estado)).length} tone="warning" />
        <MetricCard title="Vencidas" value={rows.filter((row) => row.estado === 'vencida').length} tone="danger" />
        <MetricCard title="Promedio general" value={formatPercent(average)} />
        <MetricCard title="Aptos" value={data.resultados.filter((row) => row.resultado_final === RESULT_LABELS.APTO).length} tone="success" />
        <MetricCard title="Aptos con refuerzo" value={data.resultados.filter((row) => row.resultado_final === RESULT_LABELS.APTO_REFUERZO).length} tone="warning" />
        <MetricCard title="No aptos temporales" value={data.resultados.filter((row) => row.resultado_final === RESULT_LABELS.NO_APTO).length} tone="danger" />
      </div>

      <div className="filters-bar">
        <input type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
        <input placeholder="Campaña" value={filters.campana} onChange={(event) => setFilters({ ...filters, campana: event.target.value })} />
        <input placeholder="Supervisor ID" value={filters.supervisor} onChange={(event) => setFilters({ ...filters, supervisor: event.target.value })} />
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
