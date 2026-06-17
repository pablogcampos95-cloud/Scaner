import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function ProfileScoreChart({ title = 'Puntaje promedio por perfil', data }) {
  const hasData = data.some((item) => item.hasData && item.value > 0);

  return (
    <ChartCard title={title} subtitle="Brechas y desempeño promedio por agrupación.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 16, right: 10, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="#EEF2F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#667085', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Puntaje promedio']}
              cursor={{ fill: '#F9FAFB' }}
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, color: '#101828', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }}
              labelStyle={{ color: '#667085' }}
            />
            <Bar dataKey="value" fill="#16BFE8" radius={[8, 8, 0, 0]} barSize={32}>
              <LabelList dataKey="value" position="top" formatter={(value) => `${value}%`} fill="#101828" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Datos en construccion.</p>
      )}
    </ChartCard>
  );
}
