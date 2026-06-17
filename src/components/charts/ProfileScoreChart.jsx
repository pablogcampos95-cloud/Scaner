import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function ProfileScoreChart({ title = 'Puntaje promedio por perfil', data }) {
  const hasData = data.some((item) => item.hasData && item.value > 0);

  return (
    <ChartCard title={title} subtitle="Brechas y desempeño promedio por agrupación.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 16, right: 10, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.10)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#A8B3C7', fontSize: 12 }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.16)' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#A8B3C7', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Puntaje promedio']}
              cursor={{ fill: 'rgba(22, 191, 232, 0.06)' }}
              contentStyle={{ background: '#0B1728', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 12, color: '#F8FAFC' }}
              labelStyle={{ color: '#A8B3C7' }}
            />
            <Bar dataKey="value" fill="#16BFE8" radius={[8, 8, 0, 0]} barSize={32}>
              <LabelList dataKey="value" position="top" formatter={(value) => `${value}%`} fill="#DDE7F5" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Datos en construcción.</p>
      )}
    </ChartCard>
  );
}
