'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface App { status: string }

const STATUS_COLORS: Record<string, string> = {
  submitted:           '#6366f1',
  under_review:        '#8b5cf6',
  shortlisted:         '#3b82f6',
  interview_scheduled: '#06b6d4',
  offered:             '#f59e0b',
  accepted:            '#10b981',
  rejected:            '#ef4444',
  withdrawn:           '#94a3b8',
  declined:            '#f87171',
};

export function CompanyApplicationChart({ applications }: { applications: App[] }) {
  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No applications yet
      </div>
    );
  }

  const counts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: count,
    color: STATUS_COLORS[status] ?? '#94a3b8',
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
