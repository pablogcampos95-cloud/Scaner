export default function Loading({ message = 'Cargando información...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" />
      <p>{message}</p>
    </div>
  );
}
