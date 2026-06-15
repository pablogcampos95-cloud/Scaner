import { Outlet, useOutletContext } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function Layout() {
  const context = useOutletContext();

  return (
    <div className="app-shell">
      <Navbar profile={context?.profile} />
      <main className="page-container">
        <Outlet context={context} />
      </main>
    </div>
  );
}
