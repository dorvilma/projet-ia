import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function CostAnalysisPage() {
  const { data: costs, isLoading } = useQuery({
    queryKey: ['costs'],
    queryFn: () => api.get('/api/cost').then(r => r.data),
  });

  if (isLoading) return <div className="p-6">Loading cost data...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cost Analysis</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-3xl font-bold mt-1">${costs?.totalCost?.toFixed(2) ?? '0.00'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-3">By Category</h2>
          <div className="space-y-2">
            {costs?.byCategory && Object.entries(costs.byCategory).map(([cat, amount]: [string, any]) => (
              <div key={cat} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">{cat}</span>
                <span className="text-sm font-medium">${Number(amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-3">By Project</h2>
          <div className="space-y-2">
            {costs?.byProject && Object.entries(costs.byProject).map(([id, proj]: [string, any]) => (
              <div key={id} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">{proj.name}</span>
                <span className="text-sm font-medium">${proj.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">Monthly Trend</h2>
        <div className="flex gap-4 items-end h-40">
          {costs?.monthlyTrend?.map((m: any) => {
            const maxAmount = Math.max(...(costs.monthlyTrend?.map((t: any) => t.amount) || [1]));
            const height = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
            return (
              <div key={m.month} className="flex flex-col items-center flex-1">
                <span className="text-xs mb-1">${m.amount}</span>
                <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                <span className="text-xs text-muted-foreground mt-1">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
