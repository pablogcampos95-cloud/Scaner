import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { getAreasActivas, getPerfilesOperativosActivos } from '../services/catalogosService.js';
import { getEvaluacionesByAreaAndPerfil } from '../services/evaluacionesService.js';
import { createEvaluadosBulk, deleteEvaluado, listEvaluados } from '../services/evaluadosService.js';
import { formatDate } from '../utils/formatters.js';

const TEMPLATE_HEADERS = [
  'nombre_completo',
  'dni_codigo',
  'correo',
  'telefono',
  'area',
  'perfil_operativo',
  'cargo_especifico',
  'campana_unidad',
  'sede',
  'modalidad',
  'observaciones',
];

const TEMPLATE_ROWS = [
  ['María Torres', 'DNI-45881220', 'maria.torres@empresa.com', '999111222', 'Operaciones', 'Analista', 'Analista operativo', 'Entel Empresas', 'Lima Centro', 'Presencial', 'Postulante para operación corporativa'],
  ['Carlos Rivas', 'COD-7741', 'carlos.rivas@empresa.com', '988777666', 'Calidad', 'Monitor', 'Monitor de calidad', 'Calidad Operativa', 'Remoto', 'Remoto', 'Experiencia en monitoreo'],
];

export default function Evaluados() {
  const { profile } = useOutletContext();
  const fileInputRef = useRef(null);
  const [state, setState] = useState({ rows: [], availability: {}, loading: true, error: '', success: '' });
  const [catalogs, setCatalogs] = useState({ areas: [], perfiles: [] });
  const [filters, setFilters] = useState({ area: '', perfil: '', unidad: '' });
  const isSupervisor = profile.role === 'supervisor';
  const isAdmin = profile.role === 'admin';

  const load = () => {
    setState((prev) => ({ ...prev, loading: true }));
    Promise.all([listEvaluados(profile), getAreasActivas(), getPerfilesOperativosActivos()])
      .then(async ([rows, areas, perfiles]) => {
        const availabilityEntries = await Promise.all(rows.map(async (row) => [row.id, await getEvaluacionesByAreaAndPerfil(row.area_id, row.perfil_operativo_id)]));
        setCatalogs({ areas, perfiles });
        setState({ rows, availability: Object.fromEntries(availabilityEntries), loading: false, error: '', success: '' });
      })
      .catch((error) => setState({ rows: [], availability: {}, loading: false, error: error.message, success: '' }));
  };

  useEffect(load, [profile]);

  const filteredRows = useMemo(() => state.rows.filter((row) => (
    (!filters.area || row.area_id === filters.area) &&
    (!filters.perfil || row.perfil_operativo_id === filters.perfil) &&
    (!filters.unidad || (row.unidad || row.campana || '').toLowerCase().includes(filters.unidad.toLowerCase()))
  )), [state.rows, filters]);

  const areas = catalogs.areas.length ? catalogs.areas : [...new Map(state.rows.map((row) => [row.area_id, row.areas]).filter(([id]) => id)).values()];
  const perfiles = catalogs.perfiles.length ? catalogs.perfiles : [...new Map(state.rows.map((row) => [row.perfil_operativo_id, row.perfiles_operativos]).filter(([id]) => id)).values()];

  const handleDownloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formato-importacion-evaluados.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const payload = normalizeImportRows(rows, catalogs.areas, catalogs.perfiles);
      if (!payload.length) throw new Error('El archivo no contiene evaluados válidos para importar.');
      await createEvaluadosBulk(payload, profile.id);
      setState((prev) => ({ ...prev, success: `${payload.length} evaluados importados correctamente.`, error: '' }));
      load();
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, success: '' }));
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(`¿Eliminar al evaluado "${row.nombre_completo}"?`);
    if (!confirmed) return;
    try {
      await deleteEvaluado(row.id);
      setState((prev) => ({ ...prev, success: 'Evaluado eliminado correctamente.', error: '' }));
      load();
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, success: '' }));
    }
  };

  const columns = [
    { key: 'nombre_completo', header: 'Nombre completo' },
    { key: 'dni_codigo', header: 'DNI/código' },
    { key: 'correo', header: 'Correo' },
    { key: 'area', header: 'Área', render: (row) => row.areas?.nombre || '-' },
    { key: 'perfil', header: 'Perfil operativo', render: (row) => row.perfiles_operativos?.nombre || '-' },
    { key: 'cargo_especifico', header: 'Cargo específico', render: (row) => row.cargo_especifico || row.cargo || '-' },
    { key: 'unidad', header: 'Campaña/unidad', render: (row) => row.unidad || row.campana || '-' },
    { key: 'evaluaciones_disponibles', header: 'Evaluaciones disponibles', render: (row) => state.availability[row.id]?.length || 0 },
    { key: 'created_at', header: 'Registro', render: (row) => formatDate(row.created_at) },
    ...(isAdmin ? [{
      key: 'acciones',
      header: 'Acciones',
      render: (row) => <div className="table-actions"><button className="danger-action" type="button" onClick={() => handleDelete(row)}>Eliminar</button></div>,
    }] : []),
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestión</span>
          <h1>Evaluados</h1>
        </div>
        <div className="toolbar-actions">
          {isSupervisor ? <Link className="primary-button compact" to="/registrar-evaluado">Registrar evaluado</Link> : null}
          {isSupervisor ? <button className="secondary-button compact" type="button" onClick={handleDownloadTemplate}>Descargar formato de importación</button> : null}
          {isSupervisor ? <button className="secondary-button compact" type="button" onClick={() => fileInputRef.current?.click()}>Importar</button> : null}
          <input ref={fileInputRef} hidden type="file" accept=".csv,text/csv" onChange={handleImportFile} />
        </div>
      </div>
      <div className="filters-bar">
        <select value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })}>
          <option value="">Todas las áreas</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
        </select>
        <select value={filters.perfil} onChange={(event) => setFilters({ ...filters, perfil: event.target.value })}>
          <option value="">Todos los perfiles</option>
          {perfiles.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}
        </select>
        <input placeholder="Campaña o unidad" value={filters.unidad} onChange={(event) => setFilters({ ...filters, unidad: event.target.value })} />
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.success ? <p className="alert success">{state.success}</p> : null}
      <DataTable columns={columns} rows={filteredRows} loading={state.loading} />
    </section>
  );
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  const [headers, ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function normalizeImportRows(rows, areas, perfiles) {
  const areaMap = new Map(areas.map((area) => [area.nombre.toLowerCase(), area.id]));
  const perfilMap = new Map(perfiles.map((perfil) => [perfil.nombre.toLowerCase(), perfil.id]));

  return rows.map((row, index) => {
    const areaId = areaMap.get(String(row.area || '').toLowerCase());
    const perfilId = perfilMap.get(String(row.perfil_operativo || '').toLowerCase());
    if (!row.nombre_completo || !row.dni_codigo || !row.correo || !row.campana_unidad) {
      throw new Error(`Fila ${index + 2}: nombre, DNI/código, correo y campaña/unidad son obligatorios.`);
    }
    if (!areaId) throw new Error(`Fila ${index + 2}: el área "${row.area}" no existe o no está activa.`);
    if (!perfilId) throw new Error(`Fila ${index + 2}: el perfil "${row.perfil_operativo}" no existe o no está activo.`);
    return {
      nombre_completo: row.nombre_completo,
      dni_codigo: row.dni_codigo,
      correo: row.correo,
      telefono: row.telefono || '',
      area_id: areaId,
      perfil_operativo_id: perfilId,
      cargo_especifico: row.cargo_especifico || '',
      unidad: row.campana_unidad,
      campana: row.campana_unidad,
      sede: row.sede || '',
      modalidad: row.modalidad || '',
      observaciones: row.observaciones || '',
    };
  });
}
