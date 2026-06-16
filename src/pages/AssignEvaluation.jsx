import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { createAsignacion } from '../services/asignacionesService.js';
import { sendEvaluationInvitation } from '../services/emailService.js';
import { getEvaluacionesActivasParaEvaluado } from '../services/evaluacionesService.js';
import { listEvaluados } from '../services/evaluadosService.js';
import { validateAssignment } from '../utils/validations.js';

export default function AssignEvaluation() {
  const { profile } = useOutletContext();
  const [catalogs, setCatalogs] = useState({ evaluados: [], evaluaciones: [], loading: true });
  const [values, setValues] = useState({ evaluado_id: '', evaluacion_id: '', fecha_limite: '', enviar: true });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    listEvaluados(profile)
      .then((evaluados) => setCatalogs({ evaluados, evaluaciones: [], loading: false }))
      .catch((error) => setStatus((prev) => ({ ...prev, error: error.message })));
  }, [profile]);

  useEffect(() => {
    if (!values.evaluado_id) {
      setCatalogs((prev) => ({ ...prev, evaluaciones: [] }));
      return;
    }
    getEvaluacionesActivasParaEvaluado(values.evaluado_id)
      .then((evaluaciones) => setCatalogs((prev) => ({ ...prev, evaluaciones })))
      .catch((error) => setStatus((prev) => ({ ...prev, error: error.message })));
  }, [values.evaluado_id]);

  const selectedEvaluado = useMemo(() => catalogs.evaluados.find((item) => item.id === values.evaluado_id), [catalogs.evaluados, values.evaluado_id]);

  const handleChange = (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues({ ...values, [event.target.name]: value, ...(event.target.name === 'evaluado_id' ? { evaluacion_id: '' } : {}) });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateAssignment(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus({ saving: true, message: '', error: '' });
    try {
      const asignacion = await createAsignacion(values, profile.id);
      const evaluado = catalogs.evaluados.find((item) => item.id === values.evaluado_id);
      let message = `Asignación creada. Enlace: ${window.location.origin}/evaluacion/${asignacion.token_unico}`;

      if (values.enviar) {
        const response = await sendEvaluationInvitation({ asignacion, evaluado });
        message = `Asignación creada e invitación enviada. Enlace: ${response.publicUrl}`;
      }

      setValues({ evaluado_id: '', evaluacion_id: '', fecha_limite: '', enviar: true });
      setStatus({ saving: false, message, error: '' });
    } catch (error) {
      setStatus({ saving: false, message: '', error: error.message });
    }
  };

  return (
    <section className="page-stack narrow-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Flujo guiado</span>
          <h1>Asignar evaluación</h1>
          <p>Selecciona una prueba compatible y genera el acceso.</p>
        </div>
        <Link className="secondary-button" to="/registrar-evaluado">Registrar nuevo</Link>
      </div>

      <form className="form-card guided-form" onSubmit={handleSubmit}>
        <div className="guided-step">
          <span>01</span>
          <label>
            Seleccionar evaluado
            <select name="evaluado_id" value={values.evaluado_id} onChange={handleChange} disabled={catalogs.loading}>
              <option value="">Seleccionar evaluado</option>
              {catalogs.evaluados.map((evaluado) => (
                <option key={evaluado.id} value={evaluado.id}>
                  {evaluado.nombre_completo} · {evaluado.dni_codigo}
                </option>
              ))}
            </select>
            {errors.evaluado_id ? <small className="field-error">{errors.evaluado_id}</small> : null}
          </label>
        </div>

        {selectedEvaluado ? (
          <div className="builder-preview">
            <h3>Perfil del evaluado</h3>
            <span className="badge status--asignada">{selectedEvaluado.areas?.nombre || 'Sin área'}</span>
            <span className="badge status--en_proceso">{selectedEvaluado.perfiles_operativos?.nombre || 'Sin perfil'}</span>
            <p>{selectedEvaluado.cargo_especifico || selectedEvaluado.cargo || 'Cargo no definido'} · {selectedEvaluado.unidad || selectedEvaluado.campana || 'Unidad no definida'}</p>
          </div>
        ) : null}

        <div className="guided-step">
          <span>02</span>
          <label>
            Seleccionar evaluación compatible
            <select name="evaluacion_id" value={values.evaluacion_id} onChange={handleChange} disabled={!values.evaluado_id || catalogs.loading || catalogs.evaluaciones.length === 0}>
              <option value="">Seleccionar evaluación</option>
              {catalogs.evaluaciones.map((evaluacion) => (
                <option key={evaluacion.id} value={evaluacion.id}>
                  {evaluacion.nombre}
                </option>
              ))}
            </select>
            {values.evaluado_id && catalogs.evaluaciones.length === 0 ? <small className="field-error">No existen evaluaciones activas para este perfil.</small> : null}
            {errors.evaluacion_id ? <small className="field-error">{errors.evaluacion_id}</small> : null}
          </label>
        </div>

        <div className="guided-step">
          <span>03</span>
          <label>
            Definir fecha límite
            <input name="fecha_limite" type="datetime-local" value={values.fecha_limite} onChange={handleChange} />
            {errors.fecha_limite ? <small className="field-error">{errors.fecha_limite}</small> : null}
          </label>
        </div>

        <div className="guided-step">
          <span>04</span>
          <label className="check-row">
            <input name="enviar" type="checkbox" checked={values.enviar} onChange={handleChange} />
            Enviar invitación por correo y generar token único
          </label>
        </div>

        {status.message ? <p className="alert success">{status.message}</p> : null}
        {status.error ? <p className="alert error">{status.error}</p> : null}

        <button className="primary-button" type="submit" disabled={status.saving || (values.evaluado_id && catalogs.evaluaciones.length === 0)}>
          {status.saving ? 'Creando...' : 'Asignar evaluación'}
        </button>
      </form>
    </section>
  );
}
