import { Outlet, useOutletContext } from 'react-router-dom';
import FloatingAssistant from './FloatingAssistant.jsx';
import Navbar from './Navbar.jsx';

export default function Layout() {
  const context = useOutletContext();

  return (
    <div className="app-shell">
      <Navbar profile={context?.profile} />
      <main className="page-container">
        <Outlet context={context} />
      </main>
      <FloatingAssistant />
    </div>
  );
}
