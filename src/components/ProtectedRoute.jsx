import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Loading from './Loading.jsx';
import { getCurrentProfile } from '../services/authService.js';

export default function ProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, profile: null });

  useEffect(() => {
    let active = true;

    getCurrentProfile()
      .then((profile) => {
        if (active) setState({ loading: false, profile });
      })
      .catch(() => {
        if (active) setState({ loading: false, profile: null });
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.loading) return <Loading message="Validando sesión..." />;
  if (!state.profile) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet context={{ profile: state.profile }} />;
}
