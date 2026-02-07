import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/api/tasks/${id}`).then(r => r.data),
  });

  const retryMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] }),
  });

  if (isLoading) return <div className="p-6">Loading task...</div>;
  if (!task) return <div className="p-6">Task not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-muted-foreground mt-1">{task.description}</p>
        </div>
        <div className="flex gap-2">
          {task.status === 'FAILED' && (
            <button onClick={() => retryMutation.mutate()} className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">Retry</button>
          )}
          {['PENDING', 'IN_PROGRESS', 'QUEUED'].includes(task.status) && (
            <button onClick={() => cancelMutation.mutate()} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm">Cancel</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Status" value={task.status} />
        <InfoCard label="Priority" value={task.priority} />
        <InfoCard label="Type" value={task.type} />
        <InfoCard label="Retries" value={task.retryCount} />
      </div>

      {task.agentAssignment?.agent && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-2">Assigned Agent</h2>
          <p>{task.agentAssignment.agent.name} ({task.agentAssignment.agent.role})</p>
        </div>
      )}

      {task.toolInvocations?.length > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-2">Tool Invocations</h2>
          <div className="space-y-2">
            {task.toolInvocations.map((inv: any) => (
              <div key={inv.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                <span>{inv.toolName}</span>
                <span className={inv.status === 'SUCCESS' ? 'text-green-600' : inv.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}>{inv.status}</span>
                {inv.durationMs && <span className="text-muted-foreground">{inv.durationMs}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {task.subtasks?.length > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-2">Subtasks</h2>
          <div className="space-y-1">
            {task.subtasks.map((sub: any) => (
              <div key={sub.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                <span>{sub.title}</span>
                <span>{sub.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {task.output && (
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-2">Output</h2>
          <pre className="text-sm bg-muted p-3 rounded overflow-auto max-h-64">{JSON.stringify(task.output, null, 2)}</pre>
        </div>
      )}

      {task.errorMessage && (
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <h2 className="font-semibold mb-2 text-destructive">Error</h2>
          <p className="text-sm">{task.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-card rounded-lg border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  );
}
