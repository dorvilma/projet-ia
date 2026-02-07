import { NavLink } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'grid' },
  { path: '/projects', label: 'Projects', icon: 'folder' },
  { path: '/tasks', label: 'Tasks', icon: 'list' },
  { path: '/agents', label: 'Agents', icon: 'cpu' },
  { path: '/rules', label: 'Rules', icon: 'settings' },
  { path: '/monitoring', label: 'Monitoring', icon: 'activity' },
  { path: '/audit', label: 'Audit Trail', icon: 'file-text' },
  { path: '/cost', label: 'Cost Analysis', icon: 'dollar-sign' },
  { path: '/settings', label: 'Settings', icon: 'sliders' },
];

const iconMap: Record<string, string> = {
  grid: '\u25A6',
  folder: '\u{1F4C1}',
  list: '\u2630',
  cpu: '\u2699',
  settings: '\u2699',
  activity: '\u223F',
  'file-text': '\u2263',
  'dollar-sign': '$',
  sliders: '\u2261',
};

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-foreground">Agent System</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {sidebarCollapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <span className="w-5 text-center">{iconMap[item.icon] || '\u25CF'}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
