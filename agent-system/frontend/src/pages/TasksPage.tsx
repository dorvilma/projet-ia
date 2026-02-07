import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-yellow-100 text-yellow-700',
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: tasks, isLoading } = useTasks({ status: statusFilter || undefined });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md bg-background">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>
      {isLoading ? <p>Loading tasks...</p> : (
        <div className="space-y-2">
          {tasks?.data?.map((t: any) => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="block p-4 bg-card rounded-lg border hover:border-primary transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.description || 'No description'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>{t.status}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Priority: {t.priority}</span>
                <span>Type: {t.type}</span>
                {t.agentAssignment?.agent && <span>Agent: {t.agentAssignment.agent.name}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
