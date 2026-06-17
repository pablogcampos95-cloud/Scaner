import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  FileBarChart,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Search,
  Settings,
  Table2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { signOut } from '../services/authService.js';
import { listNotifications } from '../services/notificationsService.js';
import { formatDateTime } from '../utils/formatters.js';
import { ROLE_LABELS } from '../utils/roles.js';
import Logo from './Logo.jsx';

export default function Navbar({ profile }) {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({ rows: [], loading: true, error: '' });
  const isAdmin = profile?.role === 'admin';
  const homePath = isAdmin ? '/admin' : '/supervisor';

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    listNotifications(profile)
      .then((rows) => {
        if (active) setNotifications({ rows, loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setNotifications({ rows: [], loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [profile]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = useMemo(() => notifications.rows.length, [notifications.rows]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/buscar?q=${encodeURIComponent(query)}`);
  };

  const navGroups = [
    {
      label: 'Principal',
      items: [{ to: homePath, label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Gestión',
      items: [
        { to: '/evaluados', label: 'Evaluados', icon: Users },
        ...(isAdmin ? [{ to: '/admin/evaluaciones', label: 'Evaluaciones', icon: ListChecks }] : []),
        ...(!isAdmin ? [{ to: '/asignar-evaluacion', label: 'Asignar evaluación', icon: UserPlus }] : []),
        { to: '/resultados', label: 'Resultados', icon: BarChart3 },
        { to: '/reportes', label: 'Reportes', icon: FileBarChart },
      ],
    },
    {
      label: 'Administración',
      items: [
        ...(isAdmin ? [{ to: '/admin/catalogos', label: 'Áreas y perfiles', icon: Library }] : []),
        ...(isAdmin ? [{ to: '/admin/matriz-evaluaciones', label: 'Matriz de perfiles', icon: Table2 }] : []),
        ...(isAdmin ? [{ to: '/admin/usuarios', label: 'Usuarios', icon: UserCog }] : []),
        { to: '#configuracion', label: 'Configuración', icon: Settings, disabled: true },
      ],
    },
  ];

  return (
    <>
      <aside className="sidebar">
        <Link className="sidebar-brand" to={homePath}>
          <Logo size="sm" showText={true} />
        </Link>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <span className="sidebar-group-title">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return item.disabled ? (
                  <span className="sidebar-link sidebar-link--disabled" key={item.label}>
                    <Icon size={18} />
                    {item.label}
                  </span>
                ) : (
                  <NavLink className="sidebar-link" to={item.to} key={item.label}>
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Assessment BPO</span>
          <strong>ScanerIA</strong>
        </div>
      </aside>

      <header className="topbar">
        <form className="topbar-search" onSubmit={handleSearch}>
          <Search size={18} />
          <input
            aria-label="Buscar evaluado o campaña"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar evaluado o campaña"
          />
        </form>

        <Logo size="sm" showText={false} className="topbar-logo" />

        <div className="notification-center" ref={notificationRef}>
          <button className="icon-button topbar-icon notification-button" type="button" aria-label="Notificaciones" onClick={() => setNotificationsOpen((value) => !value)}>
            <Bell size={18} />
            {unreadCount ? <span>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
          </button>

          {notificationsOpen ? (
            <div className="notification-panel">
              <div className="notification-panel__header">
                <strong>Notificaciones</strong>
                <small>{isAdmin ? 'Vista general' : 'Mis evaluados'}</small>
              </div>
              {notifications.loading ? <p className="notification-empty">Cargando notificaciones...</p> : null}
              {notifications.error ? <p className="notification-empty">{notifications.error}</p> : null}
              {!notifications.loading && !notifications.error && notifications.rows.length === 0 ? (
                <p className="notification-empty">No hay novedades por ahora.</p>
              ) : null}
              <div className="notification-list">
                {notifications.rows.map((item) => (
                  <Link className={`notification-item notification-item--${item.type}`} to={item.href} key={item.id} onClick={() => setNotificationsOpen(false)}>
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      <small>{formatDateTime(item.date)}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="session-chip">
          <span>
            <strong>{profile?.full_name || profile?.email}</strong>
            <small>{ROLE_LABELS[profile?.role] || profile?.role}</small>
          </span>
        </div>

        <button className="icon-button" type="button" onClick={handleSignOut} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>
    </>
  );
}
