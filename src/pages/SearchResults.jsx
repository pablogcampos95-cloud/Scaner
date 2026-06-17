import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listAsignaciones } from '../services/asignacionesService.js';
import { listResultados } from '../services/resultadosService.js';
import { formatDate, formatPercent } from '../utils/formatters.js';

export default function SearchResults() {
  const { profile } = useOutletContext();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [state, setState] = useState({ assignments: [], results: [], loading: true, error: '' });

  useEffect(() => {
    Promise.all([listAsignaciones(profile), listResultados(profile)])
      .then(([assignments, results]) => setState({ assignments, results, loading: false, error: '' }))
      .catch((error) => setState({ assignments: [], results: [], loading: false, error: error.message }));
  }, [profile]);

  const rows = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    return state.assignments
      .map((assignment) => ({
        ...assignment,
        resultado: state.results.find((result) => result.asignacion_id === assignment.id),
      }))
      .filter((row) => {
        const evaluado = row.evaluados || {};
        const result = row.resultado || {};
        const searchable = [
          evaluado.nombre_completo,
          evaluado.dni_codigo,
          evaluado.correo,
          evaluado.campana,
          evaluado.unidad,
          evaluado.cargo,
          evaluado.cargo_especifico,
          evaluado.areas?.nombre,
          evaluado.perfiles_operativos?.nombre,
          row.estado,
          row.evaluaciones?.nombre,
          result.resultado_final,
        ].map(normalize).join(' ');
        return searchable.includes(needle);
      });
  }, [query, state]);

  const columns = [
    { key: 'evaluado', header: 'Evaluado', render: (row) => row.evaluados?.nombre_completo || '-' },
    { key: 'perfil', header: 'Perfil', render: (row) => row.evaluados?.perfiles_operativos?.nombre || '-' },
    { key: 'area', header: 'Área', render: (row) => row.evaluados?.areas?.nombre || '-' },
    { key: 'campana', header: 'Campaña', render: (row) => row.evaluados?.unidad || row.evaluados?.campana || '-' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'resultado', header: 'Resultado', render: (row) => <ResultBadge result={row.resultado?.resultado_final} /> },
    { key: 'promedio', header: 'Promedio', render: (row) => (row.resultado ? formatPercent(row.resultado.promedio_general) : '-') },
    { key: 'limite', header: 'Fecha límite', render: (row) => formatDate(row.fecha_limite) },
    {
      key: 'acciones',
      header: 'Acción',
      render: (row) => (
        <div className="table-actions">
          {row.resultado ? <Link to={`/resultados/${row.resultado.id}`}>Ver resultado</Link> : <Link to="/resultados">Ver seguimiento</Link>}
        </div>
      ),
    },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Búsqueda global</span>
          <h1>Resultados para “{query}”</h1>
          <p>Consulta evaluados, campañas, estados y resultados disponibles para tu rol.</p>
        </div>
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      <DataTable columns={columns} rows={rows} loading={state.loading} emptyMessage="No se encontraron coincidencias." />
    </section>
  );
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
