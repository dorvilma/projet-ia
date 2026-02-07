import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.get('/api/monitoring/metrics').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={metrics?.tasks?.total ?? 0} />
        <StatCard title="In Progress" value={metrics?.tasks?.inProgress ?? 0} color="text-blue-500" />
        <StatCard title="Completed" value={metrics?.tasks?.completed ?? 0} color="text-green-500" />
        <StatCard title="Failed" value={metrics?.tasks?.failed ?? 0} color="text-red-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Active Agents" value={metrics?.agents?.active ?? 0} />
        <StatCard title="Active Projects" value={metrics?.projects?.active ?? 0} />
        <StatCard title="Success Rate" value={`${metrics?.performance?.successRate ?? 0}%`} />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string | number; color?: string }) {
  return (
    <div className="p-4 bg-card rounded-lg border shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color || ''}`}>{value}</p>
    </div>
  );
}
