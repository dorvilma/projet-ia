import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';
import { useSettingsStore } from '../store/settingsStore';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useSettingsStore();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings').then(r => r.data),
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations').then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">Appearance</h2>
        <div className="flex items-center justify-between">
          <span>Theme</span>
          <button onClick={toggleTheme} className="px-3 py-1 bg-muted rounded-md text-sm">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">System Settings</h2>
        <div className="space-y-2">
          {settings?.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm font-mono">{s.key}</span>
              <span className="text-sm text-muted-foreground">{JSON.stringify(s.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-card rounded-lg border">
        <h2 className="font-semibold mb-3">Integrations</h2>
        <div className="space-y-2">
          {integrations?.map((i: any) => (
            <div key={i.id} className="flex justify-between items-center p-3 bg-muted rounded">
              <div>
                <span className="font-medium text-sm">{i.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{i.type}</span>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${i.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{i.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
