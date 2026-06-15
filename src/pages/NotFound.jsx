import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe o no está disponible para tu perfil.</p>
      <Link className="primary-button compact" to="/login">
        Volver al inicio
      </Link>
    </main>
  );
}
