import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { createUser, listUsers, updateUser } from '../services/usersService.js';
import { ROLE_LABELS, ROLES } from '../utils/roles.js';
import { formatDate } from '../utils/formatters.js';

const emptyForm = {
  id: '',
  full_name: '',
  email: '',
  role: ROLES.SUPERVISOR,
  status: 'active',
  password: '',
};

export default function AdminUsers() {
  const [state, setState] = useState({ rows: [], loading: true, error: '', success: '' });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setState((prev) => ({ ...prev, loading: true }));
    listUsers()
      .then((rows) => setState({ rows, loading: false, error: '', success: '' }))
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error: error.message })));
  };

  useEffect(load, []);

  const metrics = useMemo(() => ({
    total: state.rows.length,
    admins: state.rows.filter((row) => row.role === ROLES.ADMIN).length,
    supervisors: state.rows.filter((row) => row.role === ROLES.SUPERVISOR).length,
    active: state.rows.filter((row) => row.status !== 'inactive').length,
  }), [state.rows]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const validate = () => {
    if (!form.full_name.trim()) return 'El nombre es obligatorio.';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return 'Ingresa un correo válido.';
    if (![ROLES.ADMIN, ROLES.SUPERVISOR].includes(form.role)) return 'Selecciona un rol válido.';
    if (!editing && form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (editing && form.password && form.password.length < 6) return 'La nueva contraseña debe tener al menos 6 caracteres.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setState((prev) => ({ ...prev, error: validation, success: '' }));
      return;
    }

    setSaving(true);
    setState((prev) => ({ ...prev, error: '', success: '' }));

    try {
      if (editing) {
        await updateUser(form.id, form);
      } else {
        await createUser(form);
      }
      resetForm();
      const rows = await listUsers();
      setState({ rows, loading: false, error: '', success: editing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.' });
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, success: '' }));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditing(true);
    setForm({
      id: row.id,
      full_name: row.full_name || '',
      email: row.email || '',
      role: row.role || ROLES.SUPERVISOR,
      status: row.status || 'active',
      password: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = [
    { key: 'full_name', header: 'Usuario' },
    { key: 'email', header: 'Correo' },
    { key: 'role', header: 'Rol', render: (row) => ROLE_LABELS[row.role] || row.role },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <span className={`badge status--${row.status === 'inactive' ? 'vencida' : 'completada'}`}>{row.status === 'inactive' ? 'Inactivo' : 'Activo'}</span>,
    },
    { key: 'created_at', header: 'Creación', render: (row) => formatDate(row.created_at) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="table-actions">
          <button type="button" onClick={() => handleEdit(row)}>Editar</button>
        </div>
      ),
    },
  ];

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Administrador</span>
          <h1>Gestión de usuarios</h1>
          <p>Crea y administra usuarios internos con acceso a la plataforma según su rol operativo.</p>
        </div>
        <button className="secondary-button" type="button" onClick={resetForm}>Nuevo usuario</button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card"><span>Total usuarios</span><strong>{metrics.total}</strong></div>
        <div className="metric-card"><span>Administradores</span><strong>{metrics.admins}</strong></div>
        <div className="metric-card"><span>Supervisores</span><strong>{metrics.supervisors}</strong></div>
        <div className="metric-card metric-card--success"><span>Activos</span><strong>{metrics.active}</strong></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-title">
          <div>
            <h2>{editing ? 'Editar usuario' : 'Crear usuario'}</h2>
            <p>{editing ? 'Actualiza datos, rol, estado o define una nueva contraseña.' : 'El usuario podrá iniciar sesión con el correo y contraseña asignados.'}</p>
          </div>
        </div>

        {state.error ? <p className="alert error">{state.error}</p> : null}
        {state.success ? <p className="alert success">{state.success}</p> : null}

        <div className="form-grid">
          <label>
            Nombre completo
            <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Nombre del usuario" />
          </label>
          <label>
            Correo
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="usuario@empresa.com" />
          </label>
          <label>
            Rol
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value={ROLES.ADMIN}>Administrador</option>
              <option value={ROLES.SUPERVISOR}>Supervisor</option>
            </select>
          </label>
          <label>
            Estado
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label className="full-field">
            {editing ? 'Nueva contraseña opcional' : 'Contraseña temporal'}
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'} />
          </label>
        </div>

        <div className="form-actions">
          {editing ? <button className="secondary-button" type="button" onClick={resetForm}>Cancelar edición</button> : null}
          <button className="primary-button compact" type="submit" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      </form>

      <DataTable columns={columns} rows={state.rows} loading={state.loading} emptyMessage="Aún no hay usuarios registrados." />
    </section>
  );
}
