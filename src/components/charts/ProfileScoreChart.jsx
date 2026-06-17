import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function ProfileScoreChart({ title = 'Puntaje promedio por perfil', data }) {
  const hasData = data.some((item) => item.hasData && item.value > 0);

  return (
    <ChartCard title={title} subtitle="Brechas y desempeno promedio por agrupacion.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 16, right: 10, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="#EEF2F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#667085', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#667085', fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Puntaje promedio']} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="value" fill="#00C8FF" radius={[8, 8, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">{data[0]?.emptyLabel || 'Aun no hay datos suficientes para graficar.'}</p>
      )}
    </ChartCard>
  );
}
