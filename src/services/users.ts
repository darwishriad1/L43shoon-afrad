import { apiClient } from './api';
import { User } from '../types';

export const usersService = {
  async createUser(user: Partial<User>): Promise<User> {
    return apiClient.post<User>('/api/users', user);
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return apiClient.put<User>(`/api/users/${id}`, user);
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/users/${id}`);
  }
};
