import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = ['#1877FF', '#00C8FF', '#F59E0B', '#DC2626'];

export default function EvaluationStatusChart({ title = 'Estado de evaluaciones', data }) {
  const hasData = data.some((item) => item.value > 0);

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
            <Tooltip formatter={(value) => [value, 'Evaluaciones']} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="chart-empty">Aun no hay evaluaciones suficientes para graficar.</p>
      )}
    </ChartCard>
  );
}
