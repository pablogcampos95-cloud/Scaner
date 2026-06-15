import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, LogOut, UserPlus } from 'lucide-react';
import { signOut } from '../services/authService.js';

export default function Navbar({ profile }) {
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';
  const homePath = isAdmin ? '/admin' : '/supervisor';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <Link className="brand" to={homePath}>
        <ClipboardList size={26} />
        <span>Diagnóstico Operativo</span>
      </Link>

      <nav className="nav-links" aria-label="Navegación principal">
        <NavLink to={homePath}>Dashboard</NavLink>
        <NavLink to="/evaluados">Evaluados</NavLink>
        <NavLink to="/resultados">Resultados</NavLink>
        {!isAdmin ? (
          <>
            <NavLink to="/registrar-evaluado">
              <UserPlus size={16} />
              Registrar
            </NavLink>
            <NavLink to="/asignar-evaluacion">Asignar</NavLink>
          </>
        ) : null}
      </nav>

      <div className="session-chip">
        <span>{profile?.full_name || profile?.email}</span>
        <button className="icon-button" type="button" onClick={handleSignOut} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
