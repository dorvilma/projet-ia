import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';

export default function RulesConfigPage() {
  const queryClient = useQueryClient();
  const { data: prompts } = useQuery({ queryKey: ['prompts'], queryFn: () => api.get('/api/rules/prompts').then(r => r.data) });
  const { data: rules } = useQuery({ queryKey: ['rules'], queryFn: () => api.get('/api/rules/rules').then(r => r.data) });
  const [tab, setTab] = useState<'prompts' | 'rules'>('prompts');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rules & Prompts Configuration</h1>
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('prompts')} className={`px-4 py-2 ${tab === 'prompts' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>Prompts</button>
        <button onClick={() => setTab('rules')} className={`px-4 py-2 ${tab === 'rules' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>Rules</button>
      </div>
      {tab === 'prompts' ? (
        <div className="space-y-3">
          {prompts?.map((p: any) => (
            <div key={p.id} className="p-4 bg-card rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.agentRole} · v{p.version}</p>
                </div>
              </div>
              <pre className="mt-2 text-sm bg-muted p-3 rounded overflow-auto max-h-32">{p.content}</pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rules?.map((r: any) => (
            <div key={r.id} className="p-4 bg-card rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.agentRole} · v{r.version} · Priority: {r.priority}</p>
                </div>
              </div>
              <pre className="mt-2 text-sm bg-muted p-3 rounded overflow-auto max-h-32">{JSON.stringify(r.conditions, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
