import { api } from './api';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends LoginRequest {
  name: string;
}

interface AuthResponse {
  user: { id: string; email: string; name: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', data);
    localStorage.setItem('token', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    return res.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('token', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    return res.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};
