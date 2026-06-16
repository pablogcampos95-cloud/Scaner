export default function KpiQuestion({ value = '', onChange }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value?.value ?? value}
      onChange={(event) => onChange({ value: event.target.value })}
      placeholder="Ingresa el resultado numérico"
    />
  );
}
