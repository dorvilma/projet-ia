import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useLogout } from '../../hooks/useAuth';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useSettingsStore();
  const logout = useLogout();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="text-sm text-muted-foreground">
        Enterprise AI Agent Platform
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '\u2600' : '\u263D'}
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{user.name}</span>
            <button
              onClick={logout}
              className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
