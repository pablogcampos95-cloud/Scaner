import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = ['#2B7FFF', '#F59E0B', '#16BFE8', '#EF4444'];

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
            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#F8FAFC" fontSize="24" fontWeight="700">
              {total}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="#A8B3C7" fontSize="12">
              total
            </text>
            <Tooltip
              formatter={(value) => [value, 'Evaluaciones']}
              contentStyle={{ background: '#0B1728', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 12, color: '#F8FAFC' }}
              labelStyle={{ color: '#A8B3C7' }}
            />
            <Legend iconType="circle" wrapperStyle={{ color: '#A8B3C7', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aún no hay evaluaciones suficientes para graficar.</p>
      )}
    </ChartCard>
  );
}
