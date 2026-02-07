import { create } from 'zustand';
import type { User } from '../types/api.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },
}));
