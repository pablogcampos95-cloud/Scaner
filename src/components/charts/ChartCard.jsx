export default function ChartCard({ title, subtitle, children }) {
  return (
    <article className="chart-card">
      <div className="chart-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-card__body">{children}</div>
    </article>
  );
}
