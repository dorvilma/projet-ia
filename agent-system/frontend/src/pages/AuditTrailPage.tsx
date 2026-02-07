import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function AuditTrailPage() {
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['audit', actionFilter],
    queryFn: () => api.get('/api/audit', { params: { action: actionFilter || undefined, limit: 50 } }).then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <input type="text" placeholder="Filter by action..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-md bg-background w-64" />
      </div>
      {isLoading ? <p>Loading audit logs...</p> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Entity</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((log: any) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{log.action}</td>
                  <td className="p-3">{log.entityType}{log.entityId ? `:${log.entityId.slice(0, 8)}` : ''}</td>
                  <td className="p-3">{log.user?.name || log.agent?.name || 'System'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
