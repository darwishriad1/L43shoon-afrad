import { apiClient } from './api';
import { Soldier } from '../types';
import { syncToSecondaryDB } from './supabaseSecondary';

export const soldiersService = {
  async createSoldier(soldier: Partial<Soldier>): Promise<Soldier> {
    const result = await apiClient.post<Soldier>('/api/soldiers', soldier);
    syncToSecondaryDB('soldiers', 'upsert', result);
    return result;
  },

  async updateSoldier(id: string, soldier: Partial<Soldier>): Promise<Soldier> {
    const result = await apiClient.put<Soldier>(`/api/soldiers/${id}`, soldier);
    syncToSecondaryDB('soldiers', 'upsert', result, id);
    return result;
  },

  async deleteSoldier(id: string): Promise<{ success: boolean }> {
    const result = await apiClient.delete<{ success: boolean }>(`/api/soldiers/${id}`);
    syncToSecondaryDB('soldiers', 'delete', null, id);
    return result;
  }
};
