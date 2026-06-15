import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { createEvaluado } from '../services/evaluadosService.js';
import { validateEvaluado } from '../utils/validations.js';

const initialValues = {
  nombre_completo: '',
  dni_codigo: '',
  correo: '',
  telefono: '',
  campana: '',
  cargo: '',
  sede: '',
  modalidad: '',
  observaciones: '',
};

export default function RegisterEvaluado() {
  const { profile } = useOutletContext();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ saving: false, message: '', error: '' });

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
          <span className="eyebrow">Registro</span>
          <h1>Registrar evaluado</h1>
        </div>
        <Link to="/asignar-evaluacion">Asignar evaluación</Link>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          {[
            ['nombre_completo', 'Nombre completo'],
            ['dni_codigo', 'DNI o código'],
            ['correo', 'Correo'],
            ['telefono', 'Teléfono'],
            ['campana', 'Campaña'],
            ['cargo', 'Cargo'],
            ['sede', 'Sede'],
            ['modalidad', 'Modalidad'],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input name={name} value={values[name]} onChange={handleChange} />
              {errors[name] ? <small className="field-error">{errors[name]}</small> : null}
            </label>
          ))}
        </div>
        <label>
          Observaciones
          <textarea name="observaciones" value={values.observaciones} onChange={handleChange} rows="4" />
        </label>

        {status.message ? <p className="alert success">{status.message}</p> : null}
        {status.error ? <p className="alert error">{status.error}</p> : null}

        <button className="primary-button" type="submit" disabled={status.saving}>
          {status.saving ? 'Guardando...' : 'Guardar evaluado'}
        </button>
      </form>
    </section>
  );
}
