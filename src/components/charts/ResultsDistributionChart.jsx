import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = {
  Aptos: '#16A34A',
  'Aptos con refuerzo': '#F59E0B',
  'No aptos temporales': '#DC2626',
  'Pendiente de revision': '#2563EB',
  'Pendiente de revisión': '#2563EB',
};

const SHORT_LABELS = {
  Aptos: 'Aptos',
  'Aptos con refuerzo': 'Refuerzo',
  'No aptos temporales': 'No aptos',
  'Pendiente de revision': 'Revisión',
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
            <CartesianGrid stroke="#EEF2F6" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: '#667085', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
            <YAxis type="category" dataKey="displayName" width={82} tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [value, 'Evaluados']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
              cursor={{ fill: '#F9FAFB' }}
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, color: '#101828', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }}
              itemStyle={{ color: '#1877FF' }}
              labelStyle={{ color: '#667085' }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
              {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#1877FF'} />)}
              <LabelList dataKey="value" position="right" fill="#101828" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aún no hay resultados registrados para graficar.</p>
      )}
    </ChartCard>
  );
}
