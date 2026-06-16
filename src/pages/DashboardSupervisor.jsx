import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Logo from '../components/Logo.jsx';
import MetricCard from '../components/MetricCard.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listAsignaciones } from '../services/asignacionesService.js';
import { sendEvaluationInvitation } from '../services/emailService.js';
import { listResultados } from '../services/resultadosService.js';
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

  const rows = useMemo(() => {
    return state.asignaciones.map((assignment) => ({
      ...assignment,
      resultado: state.resultados.find((item) => item.asignacion_id === assignment.id),
    }));
  }, [state.asignaciones, state.resultados]);

  const average = state.resultados.length
    ? Math.round(state.resultados.reduce((sum, item) => sum + Number(item.promedio_general || 0), 0) / state.resultados.length)
    : 0;

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
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.campana || '-' },
    { key: 'cargo', header: 'Cargo', render: (row) => row.evaluados?.cargo || '-' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'resultado', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado?.resultado_final} /> },
    { key: 'limite', header: 'Fecha límite', render: (row) => formatDate(row.fecha_limite) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="table-actions">
          {row.resultado ? <Link to={`/resultados/${row.resultado.id}`}>Ver</Link> : null}
          <button type="button" onClick={() => handleResend(row)}>
            Reenviar
          </button>
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
          <h1>Asigna y monitorea diagnósticos de tu equipo</h1>
          <p>Registra evaluados, envía pruebas y revisa resultados por campaña, cargo y estado.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button compact" to="/registrar-evaluado">Registrar evaluado</Link>
          <Link className="secondary-button" to="/asignar-evaluacion">Asignar evaluación</Link>
        </div>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.notice ? <p className="alert success">{state.notice}</p> : null}

      <div className="metrics-grid">
        <MetricCard title="Mis evaluados" value={new Set(rows.map((row) => row.evaluado_id)).size} />
        <MetricCard title="Asignadas" value={rows.length} />
        <MetricCard title="Pendientes" value={rows.filter((row) => ['asignada', 'enviada', 'pendiente'].includes(row.estado)).length} />
        <MetricCard title="En proceso" value={rows.filter((row) => row.estado === 'en_proceso').length} tone="warning" />
        <MetricCard title="Completadas" value={rows.filter((row) => row.estado === 'completada').length} tone="success" />
        <MetricCard title="Vencidas" value={rows.filter((row) => row.estado === 'vencida').length} tone="danger" />
        <MetricCard title="Promedio general" value={formatPercent(average)} />
      </div>

      <DataTable columns={columns} rows={rows} loading={state.loading} />
    </section>
  );
}
