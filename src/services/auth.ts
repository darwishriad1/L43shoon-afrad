import { apiClient } from './api';
import { User, AuthUser } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(username: string, password: string, otp?: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/auth/login', {
      username,
      password,
      otp,
    });
  },

  async getMe(token?: string): Promise<User> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return apiClient.get<User>('/api/users/me', { headers });
  },

  async verify2FA(code: string): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>('/api/auth/verify-2fa', { code });
  }
};
