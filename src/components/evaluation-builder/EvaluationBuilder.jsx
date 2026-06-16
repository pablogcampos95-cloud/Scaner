import { useState } from 'react';
import { createEvaluacion, updateEvaluacion } from '../../services/evaluacionesService.js';

export default function EvaluationBuilder({ profile, initialValue, onSaved }) {
  const [values, setValues] = useState({
    nombre: initialValue?.nombre || '',
    descripcion: initialValue?.descripcion || '',
    objetivo: initialValue?.objetivo || '',
    estado: initialValue?.estado || 'activa',
    puntaje_aprobacion: initialValue?.puntaje_aprobacion || 60,
    tiempo_limite_minutos: initialValue?.tiempo_limite_minutos || '',
  });
  const [status, setStatus] = useState({ error: '', saving: false });

  const save = async (event) => {
    event.preventDefault();
    if (!values.nombre.trim()) {
      setStatus({ error: 'El nombre es obligatorio.', saving: false });
      return;
    }

    setStatus({ error: '', saving: true });
    try {
      const saved = initialValue?.id ? await updateEvaluacion(initialValue.id, values) : await createEvaluacion(values, profile);
      setStatus({ error: '', saving: false });
      onSaved?.(saved);
    } catch (error) {
      setStatus({ error: error.message, saving: false });
    }
  };

  return (
    <form className="form-card modern-form" onSubmit={save}>
      <div className="form-grid">
        <label>
          Nombre
          <input value={values.nombre} onChange={(event) => setValues({ ...values, nombre: event.target.value })} />
        </label>
        <label>
          Estado
          <select value={values.estado} onChange={(event) => setValues({ ...values, estado: event.target.value })}>
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
          </select>
        </label>
        <label>
          Puntaje aprobación
          <input type="number" value={values.puntaje_aprobacion} onChange={(event) => setValues({ ...values, puntaje_aprobacion: Number(event.target.value) })} />
        </label>
        <label>
          Tiempo límite (minutos)
          <input type="number" value={values.tiempo_limite_minutos} onChange={(event) => setValues({ ...values, tiempo_limite_minutos: event.target.value })} />
        </label>
      </div>
      <label>
        Descripción
        <textarea rows="3" value={values.descripcion} onChange={(event) => setValues({ ...values, descripcion: event.target.value })} />
      </label>
      <label>
        Objetivo
        <textarea rows="3" value={values.objetivo} onChange={(event) => setValues({ ...values, objetivo: event.target.value })} />
      </label>
      {status.error ? <p className="alert error">{status.error}</p> : null}
      <button className="primary-button" type="submit" disabled={status.saving}>{status.saving ? 'Guardando...' : 'Guardar evaluación'}</button>
    </form>
  );
}
