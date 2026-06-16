import { useState } from 'react';
import { createEvaluacion, saveEvaluationTargets, updateEvaluacion } from '../../services/evaluacionesService.js';
import EvaluationTargetSelector from './EvaluationTargetSelector.jsx';

export default function EvaluationBuilder({ profile, initialValue, onSaved }) {
  const [values, setValues] = useState({
    nombre: initialValue?.nombre || '',
    descripcion: initialValue?.descripcion || '',
    objetivo: initialValue?.objetivo || '',
    estado: initialValue?.estado || 'activa',
    tipo_evaluacion: initialValue?.tipo_evaluacion || 'diagnostico',
    nivel: initialValue?.nivel || 'basico',
    es_transversal: Boolean(initialValue?.es_transversal),
    puntaje_aprobacion: initialValue?.puntaje_aprobacion || 60,
    tiempo_limite_minutos: initialValue?.tiempo_limite_minutos || '',
  });
  const [targets, setTargets] = useState(initialValue?.targets || initialValue?.evaluation_targets || []);
  const [status, setStatus] = useState({ error: '', saving: false });

  const save = async (event) => {
    event.preventDefault();
    if (!values.nombre.trim()) {
      setStatus({ error: 'El nombre es obligatorio.', saving: false });
      return;
    }
    if (!values.es_transversal && targets.length === 0) {
      setStatus({ error: 'Agrega al menos un área/perfil o marca la evaluación como transversal.', saving: false });
      return;
    }

    setStatus({ error: '', saving: true });
    try {
      const saved = initialValue?.id ? await updateEvaluacion(initialValue.id, values) : await createEvaluacion(values, profile);
      await saveEvaluationTargets(saved.id, values.es_transversal ? [{ is_transversal: true }] : targets);
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
          Tipo de evaluación
          <select value={values.tipo_evaluacion} onChange={(event) => setValues({ ...values, tipo_evaluacion: event.target.value })}>
            <option value="seleccion">Selección</option>
            <option value="diagnostico">Diagnóstico</option>
            <option value="nivelacion">Nivelación</option>
            <option value="certificacion">Certificación</option>
            <option value="seguimiento">Seguimiento</option>
          </select>
        </label>
        <label>
          Nivel
          <select value={values.nivel} onChange={(event) => setValues({ ...values, nivel: event.target.value })}>
            <option value="basico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
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
      <EvaluationTargetSelector
        value={targets}
        onChange={setTargets}
        transversal={values.es_transversal}
        onTransversalChange={(checked) => setValues({ ...values, es_transversal: checked })}
      />
      {status.error ? <p className="alert error">{status.error}</p> : null}
      <button className="primary-button" type="submit" disabled={status.saving}>{status.saving ? 'Guardando...' : 'Guardar evaluación'}</button>
    </form>
  );
}
