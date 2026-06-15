export default function ResultBadge({ result }) {
  const normalized = (result || 'sin_resultado').toLowerCase().replaceAll(' ', '_');
  const label = result || 'Sin resultado';

  return <span className={`badge result result--${normalized}`}>{label}</span>;
}
