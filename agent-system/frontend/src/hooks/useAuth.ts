import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { useNotificationStore } from '../store/notificationStore';

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setUser(data.user);
      addNotification({ type: 'success', title: 'Logged in successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Login failed', message: 'Invalid credentials' });
    },
  });
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setUser(data.user);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return () => {
    authService.logout();
    logout();
  };
}
