import { apiClient } from './api';
import { Soldier } from '../types';

export const soldiersService = {
  async createSoldier(soldier: Partial<Soldier>): Promise<Soldier> {
    return apiClient.post<Soldier>('/api/soldiers', soldier);
  },

  async updateSoldier(id: string, soldier: Partial<Soldier>): Promise<Soldier> {
    return apiClient.put<Soldier>(`/api/soldiers/${id}`, soldier);
  },

  async deleteSoldier(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/soldiers/${id}`);
  }
};
