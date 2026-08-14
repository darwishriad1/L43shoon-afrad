import { apiClient } from './api';
import { User } from '../types';
import { syncToSecondaryDB } from './supabaseSecondary';

export const usersService = {
  async createUser(user: Partial<User>): Promise<User> {
    const result = await apiClient.post<User>('/api/users', user);
    syncToSecondaryDB('users', 'upsert', result);
    return result;
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const result = await apiClient.put<User>(`/api/users/${id}`, user);
    syncToSecondaryDB('users', 'upsert', result, id);
    return result;
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const result = await apiClient.delete<{ success: boolean }>(`/api/users/${id}`);
    syncToSecondaryDB('users', 'delete', null, id);
    return result;
  }
};
