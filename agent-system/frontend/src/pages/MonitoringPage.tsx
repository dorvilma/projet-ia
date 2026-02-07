import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function MonitoringPage() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/api/monitoring/health').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/api/monitoring/alerts').then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Monitoring</h1>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">Service Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {health?.checks && Object.entries(health.checks).map(([name, check]: [string, any]) => (
            <div key={name} className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${check.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">{check.status}</span>
                {check.latencyMs && <span className="text-xs text-muted-foreground">{check.latencyMs}ms</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">Alerts</h2>
        <div className="space-y-2">
          {alerts?.data?.length === 0 && <p className="text-sm text-muted-foreground">No active alerts</p>}
          {alerts?.data?.map((a: any) => (
            <div key={a.id} className={`p-3 rounded-lg border ${a.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' : a.severity === 'ERROR' ? 'border-orange-500 bg-orange-50' : 'bg-muted'}`}>
              <div className="flex justify-between">
                <span className="font-medium text-sm">{a.name}</span>
                <span className="text-xs">{a.severity} · {a.status}</span>
              </div>
              {a.message && <p className="text-sm mt-1">{a.message}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
