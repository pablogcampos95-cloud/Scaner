import { STATUS_LABELS } from '../utils/constants.js';

export default function StatusBadge({ status }) {
  const normalized = status || 'pendiente';

  return <span className={`badge status status--${normalized}`}>{STATUS_LABELS[normalized] || normalized}</span>;
}
