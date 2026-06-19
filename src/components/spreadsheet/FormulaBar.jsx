export default function FormulaBar({ activeCell, value }) {
  return (
    <div className="formula-bar">
      <strong>{activeCell || '-'}</strong>
      <span>{value || ''}</span>
    </div>
  );
}
