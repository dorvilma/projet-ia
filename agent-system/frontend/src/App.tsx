import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import AgentsPage from './pages/AgentsPage';
import AgentDetailPage from './pages/AgentDetailPage';
import RulesConfigPage from './pages/RulesConfigPage';
import MonitoringPage from './pages/MonitoringPage';
import AuditTrailPage from './pages/AuditTrailPage';
import SettingsPage from './pages/SettingsPage';
import CostAnalysisPage from './pages/CostAnalysisPage';
import LoginPage from './pages/LoginPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tasks/:id" element={<TaskDetailPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/agents/:id" element={<AgentDetailPage />} />
                <Route path="/rules" element={<RulesConfigPage />} />
                <Route path="/monitoring" element={<MonitoringPage />} />
                <Route path="/audit" element={<AuditTrailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/cost" element={<CostAnalysisPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
