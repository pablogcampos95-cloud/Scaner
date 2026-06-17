import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, FileBarChart, LayoutDashboard, Library, ListChecks, LogOut, Search, Settings, Table2, UserCog, UserPlus, Users } from 'lucide-react';
import { signOut } from '../services/authService.js';
import { ROLE_LABELS } from '../utils/roles.js';
import Logo from './Logo.jsx';

export default function Navbar({ profile }) {
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';
  const homePath = isAdmin ? '/admin' : '/supervisor';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: homePath, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/evaluados', label: 'Evaluados', icon: Users },
    ...(isAdmin ? [{ to: '/admin/evaluaciones', label: 'Evaluaciones', icon: ListChecks }] : []),
    ...(isAdmin ? [{ to: '/admin/catalogos', label: 'Áreas y perfiles', icon: Library }] : []),
    ...(isAdmin ? [{ to: '/admin/matriz-evaluaciones', label: 'Matriz de perfiles', icon: Table2 }] : []),
    ...(isAdmin ? [{ to: '/admin/usuarios', label: 'Usuarios', icon: UserCog }] : []),
    ...(!isAdmin ? [{ to: '/asignar-evaluacion', label: 'Asignar evaluación', icon: UserPlus }] : []),
    { to: '/resultados', label: 'Resultados', icon: BarChart3 },
    { to: '#reportes', label: 'Reportes', icon: FileBarChart, disabled: true },
    { to: '#configuracion', label: 'Configuración', icon: Settings, disabled: true },
  ];

  return (
    <>
      <aside className="sidebar">
        <Link className="sidebar-brand" to={homePath}>
          <Logo size="sm" showText={true} />
        </Link>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navItems.map((item) => {
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
        </nav>

        <div className="sidebar-footer">
          <span>Assessment BPO</span>
          <strong>ScanerIA</strong>
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-search">
          <Search size={18} />
          <span>Buscar evaluado o campaña</span>
        </div>

        <Logo size="sm" showText={false} className="topbar-logo" />

        <button className="icon-button topbar-icon" type="button" aria-label="Notificaciones">
          <Bell size={18} />
        </button>

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
