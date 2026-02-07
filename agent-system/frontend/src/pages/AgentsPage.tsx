import { useAgents } from '../hooks/useAgents';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  IDLE: 'bg-green-100 text-green-700',
  BUSY: 'bg-blue-100 text-blue-700',
  ERROR: 'bg-red-100 text-red-700',
  OFFLINE: 'bg-gray-100 text-gray-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
};

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) return <div className="p-6">Loading agents...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Agents</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents?.data?.map((a: any) => (
          <Link key={a.id} to={`/agents/${a.id}`} className="block p-4 bg-card rounded-lg border shadow-sm hover:border-primary transition-colors">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{a.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>{a.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{a.role}</p>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>Load: {a.currentLoad}/{a.maxLoad}</span>
              <span>{a._count?.assignments ?? 0} assignments</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
