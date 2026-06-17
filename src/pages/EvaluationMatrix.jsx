import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAreasActivas, getPerfilesOperativosActivos } from '../services/catalogosService.js';
import { evaluationAppliesTo, getEvaluacionesActivas } from '../services/evaluacionesService.js';

export default function EvaluationMatrix() {
  const [state, setState] = useState({ areas: [], perfiles: [], evaluaciones: [], loading: true, error: '' });
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    Promise.all([getAreasActivas(), getPerfilesOperativosActivos(), getEvaluacionesActivas()])
      .then(([areas, perfiles, evaluaciones]) => setState({ areas, perfiles, evaluaciones, loading: false, error: '' }))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  }, []);

  const coverage = useMemo(() => {
    const cells = {};
    for (const perfil of state.perfiles) {
      for (const area of state.areas) {
        const key = `${perfil.id}:${area.id}`;
        cells[key] = state.evaluaciones.filter((evaluacion) => evaluationAppliesTo(evaluacion, area.id, perfil.id));
      }
    }
    return cells;
  }, [state]);

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Administrador</span>
          <h1>Matriz de perfiles y áreas</h1>
          <p>Visualiza la cobertura de evaluaciones activas por combinación operativa.</p>
        </div>
        <Link className="primary-button compact" to="/admin/evaluaciones/nueva">Crear evaluación</Link>
      </div>

      {state.error ? <p className="alert error">{state.error}</p> : null}
      {state.loading ? <p className="demo-note">Cargando matriz...</p> : null}

      <div className="matrix-shell">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Perfil / Área</th>
              {state.areas.map((area) => <th key={area.id}>{area.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.perfiles.map((perfil) => (
              <tr key={perfil.id}>
                <th>{perfil.nombre}</th>
                {state.areas.map((area) => {
                  const rows = coverage[`${perfil.id}:${area.id}`] || [];
                  return (
                    <td key={area.id}>
                      <div className="matrix-cell-summary">
                        <strong>{rows.length} activas</strong>
                        <button className="secondary-button compact" type="button" onClick={() => setSelectedCell({ area, perfil, rows })}>
                          Ver detalles
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{selectedCell.perfil.nombre} / {selectedCell.area.nombre}</h2>
                <p>{selectedCell.rows.length} evaluaciones activas asociadas.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setSelectedCell(null)}>×</button>
            </div>
            <div className="matrix-list">
              {selectedCell.rows.length ? selectedCell.rows.map((evaluacion) => <span key={evaluacion.id}>{evaluacion.nombre}</span>) : <span>No hay evaluaciones activas para esta combinación.</span>}
            </div>
            <div className="form-actions">
              <Link className="secondary-button compact" to="/admin/evaluaciones">Ver evaluaciones</Link>
              <Link className="primary-button compact" to="/admin/evaluaciones/nueva">Crear evaluación</Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
