import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { createAsignacion } from '../services/asignacionesService.js';
import { sendEvaluationInvitation } from '../services/emailService.js';
import { listEvaluaciones } from '../services/evaluacionesService.js';
import { listEvaluados } from '../services/evaluadosService.js';
import { validateAssignment } from '../utils/validations.js';

export default function AssignEvaluation() {
  const { profile } = useOutletContext();
  const [catalogs, setCatalogs] = useState({ evaluados: [], evaluaciones: [], loading: true });
  const [values, setValues] = useState({ evaluado_id: '', evaluacion_id: '', fecha_limite: '', enviar: true });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    Promise.all([listEvaluados(profile), listEvaluaciones()])
      .then(([evaluados, evaluaciones]) => setCatalogs({ evaluados, evaluaciones, loading: false }))
      .catch((error) => setStatus((prev) => ({ ...prev, error: error.message })));
  }, [profile]);

  const handleChange = (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues({ ...values, [event.target.name]: value });
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
        message = `Asignación creada e invitación simulada. Enlace: ${response.publicUrl}`;
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
          <span className="eyebrow">Asignación</span>
          <h1>Asignar evaluación</h1>
        </div>
        <Link to="/registrar-evaluado">Registrar nuevo</Link>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Evaluado
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
        <label>
          Evaluación
          <select name="evaluacion_id" value={values.evaluacion_id} onChange={handleChange} disabled={catalogs.loading}>
            <option value="">Seleccionar evaluación</option>
            {catalogs.evaluaciones.map((evaluacion) => (
              <option key={evaluacion.id} value={evaluacion.id}>
                {evaluacion.nombre}
              </option>
            ))}
          </select>
          {errors.evaluacion_id ? <small className="field-error">{errors.evaluacion_id}</small> : null}
        </label>
        <label>
          Fecha límite
          <input name="fecha_limite" type="datetime-local" value={values.fecha_limite} onChange={handleChange} />
          {errors.fecha_limite ? <small className="field-error">{errors.fecha_limite}</small> : null}
        </label>
        <label className="check-row">
          <input name="enviar" type="checkbox" checked={values.enviar} onChange={handleChange} />
          Preparar invitación simulada
        </label>

        {status.message ? <p className="alert success">{status.message}</p> : null}
        {status.error ? <p className="alert error">{status.error}</p> : null}

        <button className="primary-button" type="submit" disabled={status.saving}>
          {status.saving ? 'Creando...' : 'Crear asignación'}
        </button>
      </form>
    </section>
  );
}
