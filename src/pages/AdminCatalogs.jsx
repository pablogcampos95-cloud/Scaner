import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { createArea, createPerfilOperativo, deactivateArea, deactivatePerfilOperativo, getAreasActivas, getPerfilesOperativosActivos, updateArea, updatePerfilOperativo } from '../services/catalogosService.js';

const emptyArea = { id: '', nombre: '', descripcion: '', estado: 'activa' };
const emptyPerfil = { id: '', nombre: '', descripcion: '', estado: 'activo' };

export default function AdminCatalogs() {
  const [state, setState] = useState({ areas: [], perfiles: [], loading: true, error: '', success: '' });
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [perfilForm, setPerfilForm] = useState(emptyPerfil);

  const load = () => {
    Promise.all([getAreasActivas(true), getPerfilesOperativosActivos(true)])
      .then(([areas, perfiles]) => setState({ areas, perfiles, loading: false, error: '', success: '' }))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(load, []);

  const saveArea = async (event) => {
    event.preventDefault();
    if (!areaForm.nombre.trim()) return setState((prev) => ({ ...prev, error: 'El nombre del área es obligatorio.', success: '' }));
    try {
      if (areaForm.id) await updateArea(areaForm.id, areaForm);
      else await createArea(areaForm);
      setAreaForm(emptyArea);
      load();
      setState((prev) => ({ ...prev, success: 'Área guardada correctamente.', error: '' }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, success: '' }));
    }
  };

  const savePerfil = async (event) => {
    event.preventDefault();
    if (!perfilForm.nombre.trim()) return setState((prev) => ({ ...prev, error: 'El nombre del perfil es obligatorio.', success: '' }));
    try {
      if (perfilForm.id) await updatePerfilOperativo(perfilForm.id, perfilForm);
      else await createPerfilOperativo(perfilForm);
      setPerfilForm(emptyPerfil);
      load();
      setState((prev) => ({ ...prev, success: 'Perfil operativo guardado correctamente.', error: '' }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, success: '' }));
    }
  };

  const areaColumns = [
    { key: 'nombre', header: 'Área' },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'estado', header: 'Estado', render: (row) => <span className={`badge status--${row.estado === 'activa' ? 'completada' : 'vencida'}`}>{row.estado}</span> },
    { key: 'acciones', header: 'Acciones', render: (row) => <div className="table-actions"><button type="button" onClick={() => setAreaForm(row)}>Editar</button><button type="button" onClick={() => deactivateArea(row.id).then(load)}>{row.estado === 'activa' ? 'Desactivar' : 'Activar'}</button></div> },
  ];

  const perfilColumns = [
    { key: 'nombre', header: 'Perfil operativo' },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'estado', header: 'Estado', render: (row) => <span className={`badge status--${row.estado === 'activo' ? 'completada' : 'vencida'}`}>{row.estado}</span> },
    { key: 'acciones', header: 'Acciones', render: (row) => <div className="table-actions"><button type="button" onClick={() => setPerfilForm(row)}>Editar</button><button type="button" onClick={() => deactivatePerfilOperativo(row.id).then(load)}>{row.estado === 'activo' ? 'Desactivar' : 'Activar'}</button></div> },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Administrador</span>
          <h1>Catálogos operativos</h1>
          <p>Administra áreas y perfiles operativos para segmentar evaluaciones y postulantes.</p>
        </div>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.success ? <p className="alert success">{state.success}</p> : null}

      <div className="form-grid">
        <form className="form-card" onSubmit={saveArea}>
          <h2>{areaForm.id ? 'Editar área' : 'Crear área'}</h2>
          <label>Nombre<input value={areaForm.nombre} onChange={(event) => setAreaForm({ ...areaForm, nombre: event.target.value })} /></label>
          <label>Descripción<textarea rows="3" value={areaForm.descripcion || ''} onChange={(event) => setAreaForm({ ...areaForm, descripcion: event.target.value })} /></label>
          <label>Estado<select value={areaForm.estado} onChange={(event) => setAreaForm({ ...areaForm, estado: event.target.value })}><option value="activa">Activa</option><option value="inactiva">Inactiva</option></select></label>
          <div className="form-actions">
            {areaForm.id ? <button className="secondary-button" type="button" onClick={() => setAreaForm(emptyArea)}>Cancelar</button> : null}
            <button className="primary-button compact" type="submit">Guardar área</button>
          </div>
        </form>

        <form className="form-card" onSubmit={savePerfil}>
          <h2>{perfilForm.id ? 'Editar perfil' : 'Crear perfil operativo'}</h2>
          <label>Nombre<input value={perfilForm.nombre} onChange={(event) => setPerfilForm({ ...perfilForm, nombre: event.target.value })} /></label>
          <label>Descripción<textarea rows="3" value={perfilForm.descripcion || ''} onChange={(event) => setPerfilForm({ ...perfilForm, descripcion: event.target.value })} /></label>
          <label>Estado<select value={perfilForm.estado} onChange={(event) => setPerfilForm({ ...perfilForm, estado: event.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
          <div className="form-actions">
            {perfilForm.id ? <button className="secondary-button" type="button" onClick={() => setPerfilForm(emptyPerfil)}>Cancelar</button> : null}
            <button className="primary-button compact" type="submit">Guardar perfil</button>
          </div>
        </form>
      </div>

      <section className="plain-section">
        <h2>Áreas</h2>
        <DataTable columns={areaColumns} rows={state.areas} loading={state.loading} />
      </section>
      <section className="plain-section">
        <h2>Perfiles operativos</h2>
        <DataTable columns={perfilColumns} rows={state.perfiles} loading={state.loading} />
      </section>
    </section>
  );
}
