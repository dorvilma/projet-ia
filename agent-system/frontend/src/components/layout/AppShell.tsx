import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSettingsStore } from '../../store/settingsStore';

export function AppShell({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className={`flex flex-1 flex-col overflow-hidden transition-all ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
