'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

interface DataPoint { month: string; placements: number }

export function PlacementRateChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Bar dataKey="placements" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
