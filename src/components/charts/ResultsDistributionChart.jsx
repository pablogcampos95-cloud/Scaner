import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function ResultsDistributionChart({ title = 'Resultado de evaluados', data }) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <ChartCard title={title} subtitle="Distribucion de resultados finales.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 24, bottom: 8 }}>
            <CartesianGrid stroke="#EEF2F6" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: '#667085', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={128} tick={{ fill: '#667085', fontSize: 12 }} />
            <Tooltip formatter={(value) => [value, 'Evaluados']} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="value" fill="#1877FF" radius={[0, 8, 8, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aun no hay resultados registrados para graficar.</p>
      )}
    </ChartCard>
  );
}
