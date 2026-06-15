import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { listEvaluados } from '../services/evaluadosService.js';
import { formatDate } from '../utils/formatters.js';

export default function Evaluados() {
  const { profile } = useOutletContext();
  const [state, setState] = useState({ rows: [], loading: true, error: '' });

  useEffect(() => {
    listEvaluados(profile)
      .then((rows) => setState({ rows, loading: false, error: '' }))
      .catch((error) => setState({ rows: [], loading: false, error: error.message }));
  }, [profile]);

  const columns = [
    { key: 'nombre_completo', header: 'Nombre completo' },
    { key: 'dni_codigo', header: 'DNI/código' },
    { key: 'correo', header: 'Correo' },
    { key: 'telefono', header: 'Teléfono' },
    { key: 'campana', header: 'Campaña' },
    { key: 'cargo', header: 'Cargo' },
    { key: 'sede', header: 'Sede' },
    { key: 'modalidad', header: 'Modalidad' },
    { key: 'created_at', header: 'Registro', render: (row) => formatDate(row.created_at) },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestión</span>
          <h1>Evaluados</h1>
        </div>
        {profile.role === 'supervisor' ? (
          <Link className="primary-button compact" to="/registrar-evaluado">
            Registrar evaluado
          </Link>
        ) : null}
      </div>
      {state.error ? <p className="alert error">{state.error}</p> : null}
      <DataTable columns={columns} rows={state.rows} loading={state.loading} />
    </section>
  );
}
