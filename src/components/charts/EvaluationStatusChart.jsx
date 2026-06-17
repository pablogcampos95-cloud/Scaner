import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = ['#1877FF', '#16BFE8', '#F59E0B', '#DC2626'];

export default function EvaluationStatusChart({ title = 'Estado de evaluaciones', data }) {
  const hasData = data.some((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartCard title={title} subtitle="Avance operativo de las evaluaciones asignadas.">
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={66} outerRadius={92} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#101828" fontSize="24" fontWeight="700">
              {total}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="#667085" fontSize="12">
              total
            </text>
            <Tooltip
              formatter={(value) => [value, 'Evaluaciones']}
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, color: '#101828', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }}
              labelStyle={{ color: '#667085' }}
            />
            <Legend iconType="circle" wrapperStyle={{ color: '#667085', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aun no hay evaluaciones suficientes para graficar.</p>
      )}
    </ChartCard>
  );
}
