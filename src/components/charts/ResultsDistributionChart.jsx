import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = {
  Aptos: '#22C55E',
  'Aptos con refuerzo': '#F59E0B',
  'No aptos temporales': '#EF4444',
  'Pendiente de revisión': '#8B5CF6',
};

const SHORT_LABELS = {
  Aptos: 'Aptos',
  'Aptos con refuerzo': 'Refuerzo',
  'No aptos temporales': 'No aptos',
  'Pendiente de revisión': 'Revisión',
};

export default function ResultsDistributionChart({ title = 'Resultado de evaluados', data }) {
  const hasData = data.some((item) => item.value > 0);
  const chartData = data.map((item) => ({
    ...item,
    displayName: SHORT_LABELS[item.name] || item.name,
  }));

  return (
    <ChartCard title={title} subtitle="Distribución de resultados finales.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.10)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: '#A8B3C7', fontSize: 12 }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.16)' }} />
            <YAxis type="category" dataKey="displayName" width={76} tick={{ fill: '#A8B3C7', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [value, 'Evaluados']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
              cursor={{ fill: 'rgba(22, 191, 232, 0.06)' }}
              contentStyle={{ background: '#0B1728', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 12, color: '#F8FAFC' }}
              itemStyle={{ color: '#7DD3FC' }}
              labelStyle={{ color: '#A8B3C7' }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
              {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#2B7FFF'} />)}
              <LabelList dataKey="value" position="right" fill="#DDE7F5" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aún no hay resultados registrados para graficar.</p>
      )}
    </ChartCard>
  );
}
