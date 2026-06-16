import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getAreasActivas, getPerfilesOperativosActivos } from '../services/catalogosService.js';
import { getEvaluacionesByAreaAndPerfil } from '../services/evaluacionesService.js';
import { createEvaluado } from '../services/evaluadosService.js';
import { validateEvaluado } from '../utils/validations.js';

const initialValues = {
  nombre_completo: '',
  dni_codigo: '',
  correo: '',
  telefono: '',
  area_id: '',
  perfil_operativo_id: '',
  cargo_especifico: '',
  unidad: '',
  campana: '',
  cargo: '',
  sede: '',
  modalidad: '',
  observaciones: '',
};

export default function RegisterEvaluado() {
  const { profile } = useOutletContext();
  const [values, setValues] = useState(initialValues);
  const [catalogs, setCatalogs] = useState({ areas: [], perfiles: [], evaluaciones: [] });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    Promise.all([getAreasActivas(), getPerfilesOperativosActivos()])
      .then(([areas, perfiles]) => setCatalogs((prev) => ({ ...prev, areas, perfiles })))
      .catch((error) => setStatus((prev) => ({ ...prev, error: error.message })));
  }, []);

  useEffect(() => {
    if (!values.area_id || !values.perfil_operativo_id) {
      setCatalogs((prev) => ({ ...prev, evaluaciones: [] }));
      return;
    }
    getEvaluacionesByAreaAndPerfil(values.area_id, values.perfil_operativo_id)
      .then((evaluaciones) => setCatalogs((prev) => ({ ...prev, evaluaciones })))
      .catch(() => setCatalogs((prev) => ({ ...prev, evaluaciones: [] })));
  }, [values.area_id, values.perfil_operativo_id]);

  const availablePreview = useMemo(() => catalogs.evaluaciones.slice(0, 5), [catalogs.evaluaciones]);

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateEvaluado(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus({ saving: true, message: '', error: '' });
    try {
      await createEvaluado(values, profile.id);
      setValues(initialValues);
      setStatus({ saving: false, message: 'Evaluado registrado correctamente.', error: '' });
    } catch (error) {
      setStatus({ saving: false, message: '', error: error.message });
    }
  };

  return (
    <section className="page-stack narrow-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Registro operativo</span>
          <h1>Registrar evaluado</h1>
          <p>Crea el perfil que será evaluado.</p>
        </div>
      </div>

      <form className="form-card modern-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Nombre completo<input name="nombre_completo" value={values.nombre_completo} onChange={handleChange} />{errors.nombre_completo ? <small className="field-error">{errors.nombre_completo}</small> : null}</label>
          <label>DNI o codigo<input name="dni_codigo" value={values.dni_codigo} onChange={handleChange} />{errors.dni_codigo ? <small className="field-error">{errors.dni_codigo}</small> : null}</label>
          <label>Correo<input name="correo" value={values.correo} onChange={handleChange} />{errors.correo ? <small className="field-error">{errors.correo}</small> : null}</label>
          <label>Telefono<input name="telefono" value={values.telefono} onChange={handleChange} /></label>
          <label>
            Area
            <select name="area_id" value={values.area_id} onChange={handleChange}>
              <option value="">Seleccionar area</option>
              {catalogs.areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
            </select>
            {errors.area_id ? <small className="field-error">{errors.area_id}</small> : null}
          </label>
          <label>
            Perfil operativo
            <select name="perfil_operativo_id" value={values.perfil_operativo_id} onChange={handleChange}>
              <option value="">Seleccionar perfil</option>
              {catalogs.perfiles.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}
            </select>
            {errors.perfil_operativo_id ? <small className="field-error">{errors.perfil_operativo_id}</small> : null}
          </label>
          <label>Cargo especifico<input name="cargo_especifico" value={values.cargo_especifico} onChange={handleChange} /></label>
          <label>Campana o unidad<input name="unidad" value={values.unidad} onChange={handleChange} />{errors.unidad ? <small className="field-error">{errors.unidad}</small> : null}</label>
          <label>Sede<input name="sede" value={values.sede} onChange={handleChange} /></label>
          <label>Modalidad<input name="modalidad" value={values.modalidad} onChange={handleChange} /></label>
        </div>

        <div className="builder-preview">
          <h3>Evaluaciones disponibles para este perfil</h3>
          {values.area_id && values.perfil_operativo_id ? (
            availablePreview.length ? availablePreview.map((evaluacion) => <span className="badge status--asignada" key={evaluacion.id}>{evaluacion.nombre}</span>) : <p className="demo-note">No hay evaluaciones activas para esta combinacion.</p>
          ) : (
            <p className="demo-note">Selecciona area y perfil operativo para ver evaluaciones compatibles.</p>
          )}
        </div>

        <label>
          Observaciones
          <textarea name="observaciones" value={values.observaciones} onChange={handleChange} rows="4" />
        </label>

        {status.message ? <p className="alert success">{status.message}</p> : null}
        {status.error ? <p className="alert error">{status.error}</p> : null}

        <div className="form-actions">
          <Link className="secondary-button" to="/supervisor">Volver</Link>
          <button className="primary-button" type="submit" disabled={status.saving}>
            {status.saving ? 'Guardando...' : 'Guardar evaluado'}
          </button>
        </div>
      </form>
    </section>
  );
}
