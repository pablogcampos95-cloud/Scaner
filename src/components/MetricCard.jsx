export default function MetricCard({ title, value, helper, tone = 'neutral' }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
