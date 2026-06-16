import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAreasActivas, getPerfilesOperativosActivos } from '../../services/catalogosService.js';

export default function EvaluationTargetSelector({ value = [], onChange, transversal = false, onTransversalChange }) {
  const [catalogs, setCatalogs] = useState({ areas: [], perfiles: [], loading: true, error: '' });
  const [draft, setDraft] = useState({ area_id: '', perfil_operativo_id: '' });

  useEffect(() => {
    Promise.all([getAreasActivas(), getPerfilesOperativosActivos()])
      .then(([areas, perfiles]) => setCatalogs({ areas, perfiles, loading: false, error: '' }))
      .catch((error) => setCatalogs((prev) => ({ ...prev, loading: false, error: error.message })));
  }, []);

  const labels = useMemo(() => ({
    areas: Object.fromEntries(catalogs.areas.map((area) => [area.id, area.nombre])),
    perfiles: Object.fromEntries(catalogs.perfiles.map((perfil) => [perfil.id, perfil.nombre])),
  }), [catalogs]);

  const addTarget = () => {
    const target = {
      area_id: draft.area_id || null,
      perfil_operativo_id: draft.perfil_operativo_id || null,
      is_transversal: false,
    };
    const key = makeKey(target);
    if (value.some((item) => makeKey(item) === key)) return;
    onChange([...value, target]);
    setDraft({ area_id: '', perfil_operativo_id: '' });
  };

  const removeTarget = (index) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="builder-card target-selector">
      <div>
        <h3>Aplicabilidad de la evaluación</h3>
        <p>Define para qué área, perfil operativo o combinación estará disponible esta evaluación.</p>
      </div>

      {catalogs.error ? <p className="alert error">{catalogs.error}</p> : null}

      <label className="check-row">
        <input type="checkbox" checked={transversal} onChange={(event) => onTransversalChange(event.target.checked)} />
        Evaluación transversal para todas las áreas y perfiles
      </label>

      {!transversal ? (
        <>
          <div className="form-grid">
            <label>
              Área
              <select value={draft.area_id} onChange={(event) => setDraft({ ...draft, area_id: event.target.value })} disabled={catalogs.loading}>
                <option value="">Todas las áreas</option>
                {catalogs.areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
              </select>
            </label>
            <label>
              Perfil operativo
              <select value={draft.perfil_operativo_id} onChange={(event) => setDraft({ ...draft, perfil_operativo_id: event.target.value })} disabled={catalogs.loading}>
                <option value="">Todos los perfiles</option>
                {catalogs.perfiles.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nombre}</option>)}
              </select>
            </label>
          </div>
          <button className="secondary-button compact" type="button" onClick={addTarget}>
            <Plus size={16} />
            Agregar combinación
          </button>
        </>
      ) : null}

      <div className="target-list">
        {transversal ? (
          <span className="badge status--completada">Todas las áreas + todos los perfiles</span>
        ) : value.length ? (
          value.map((target, index) => (
            <div className="target-row" key={makeKey(target)}>
              <span>{target.area_id ? labels.areas[target.area_id] : 'Todas las áreas'} + {target.perfil_operativo_id ? labels.perfiles[target.perfil_operativo_id] : 'Todos los perfiles'}</span>
              <button type="button" onClick={() => removeTarget(index)} aria-label="Eliminar combinación">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="demo-note">Agrega al menos una combinación o marca la evaluación como transversal.</p>
        )}
      </div>
    </section>
  );
}

function makeKey(target) {
  return `${target.area_id || 'all'}:${target.perfil_operativo_id || 'all'}:${Boolean(target.is_transversal)}`;
}
