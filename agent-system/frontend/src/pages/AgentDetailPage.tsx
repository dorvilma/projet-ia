import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => api.get(`/api/agents/${id}`).then(r => r.data),
  });

  if (isLoading) return <div className="p-6">Loading agent...</div>;
  if (!agent) return <div className="p-6">Agent not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">{agent.role}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm bg-muted">{agent.status}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-card rounded-lg border">
          <p className="text-xs text-muted-foreground">Current Load</p>
          <p className="text-xl font-bold mt-1">{agent.currentLoad}/{agent.maxLoad}</p>
        </div>
        <div className="p-3 bg-card rounded-lg border">
          <p className="text-xs text-muted-foreground">Last Heartbeat</p>
          <p className="text-sm font-medium mt-1">{agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleTimeString() : 'N/A'}</p>
        </div>
      </div>

      {agent.assignments?.length > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-3">Recent Assignments</h2>
          <div className="space-y-2">
            {agent.assignments.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                <span>{a.task?.title || a.taskId}</span>
                <span className="text-muted-foreground">{new Date(a.assignedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {agent.metrics?.length > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-3">Recent Metrics</h2>
          <div className="space-y-1">
            {agent.metrics.map((m: any) => (
              <div key={m.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                <span>{m.metricType}</span>
                <span>{Number(m.value).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
