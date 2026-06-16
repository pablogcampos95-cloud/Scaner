import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { getEvaluacionesByAreaAndPerfil } from '../services/evaluacionesService.js';
import { listEvaluados } from '../services/evaluadosService.js';
import { formatDate } from '../utils/formatters.js';

export default function Evaluados() {
  const { profile } = useOutletContext();
  const [state, setState] = useState({ rows: [], availability: {}, loading: true, error: '' });
  const [filters, setFilters] = useState({ area: '', perfil: '', unidad: '' });

  useEffect(() => {
    listEvaluados(profile)
      .then(async (rows) => {
        const availabilityEntries = await Promise.all(rows.map(async (row) => [row.id, await getEvaluacionesByAreaAndPerfil(row.area_id, row.perfil_operativo_id)]));
        setState({ rows, availability: Object.fromEntries(availabilityEntries), loading: false, error: '' });
      })
      .catch((error) => setState({ rows: [], availability: {}, loading: false, error: error.message }));
  }, [profile]);

  const filteredRows = useMemo(() => state.rows.filter((row) => (
    (!filters.area || row.area_id === filters.area) &&
    (!filters.perfil || row.perfil_operativo_id === filters.perfil) &&
    (!filters.unidad || (row.unidad || row.campana || '').toLowerCase().includes(filters.unidad.toLowerCase()))
  )), [state.rows, filters]);

  const areas = [...new Map(state.rows.map((row) => [row.area_id, row.areas]).filter(([id]) => id)).values()];
  const perfiles = [...new Map(state.rows.map((row) => [row.perfil_operativo_id, row.perfiles_operativos]).filter(([id]) => id)).values()];

  const columns = [
    { key: 'nombre_completo', header: 'Nombre completo' },
    { key: 'dni_codigo', header: 'DNI/codigo' },
    { key: 'correo', header: 'Correo' },
    { key: 'area', header: 'Area', render: (row) => row.areas?.nombre || '-' },
    { key: 'perfil', header: 'Perfil operativo', render: (row) => row.perfiles_operativos?.nombre || '-' },
    { key: 'cargo_especifico', header: 'Cargo especifico', render: (row) => row.cargo_especifico || row.cargo || '-' },
    { key: 'unidad', header: 'Campana/unidad', render: (row) => row.unidad || row.campana || '-' },
    { key: 'evaluaciones_disponibles', header: 'Evaluaciones disponibles', render: (row) => state.availability[row.id]?.length || 0 },
    { key: 'created_at', header: 'Registro', render: (row) => formatDate(row.created_at) },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestion</span>
          <h1>Evaluados</h1>
        </div>
        {profile.role === 'supervisor' ? <Link className="primary-button compact" to="/registrar-evaluado">Registrar evaluado</Link> : null}
      </div>
      <div className="filters-bar">
        <select value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })}>
          <option value="">Todas las areas</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
        </select>
        <select value={filters.perfil} onChange={(event) => setFilters({ ...filters, perfil: event.target.value })}>
          <option value="">Todos los perfiles</option>
          {perfiles.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}
        </select>
        <input placeholder="Campana o unidad" value={filters.unidad} onChange={(event) => setFilters({ ...filters, unidad: event.target.value })} />
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      <DataTable columns={columns} rows={filteredRows} loading={state.loading} />
    </section>
  );
}
