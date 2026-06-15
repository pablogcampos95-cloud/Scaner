import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

export default function RoleRoute({ allowedRoles }) {
  const context = useOutletContext();
  const role = context?.profile?.role;

  if (!allowedRoles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin' : '/supervisor'} replace />;
  }

  return <Outlet context={context} />;
}
