import { apiClient } from './api';
import { Unit } from '../types';
import { syncToSecondaryDB } from './supabaseSecondary';

export const unitsService = {
  async createUnit(unit: Partial<Unit>): Promise<Unit> {
    const result = await apiClient.post<Unit>('/api/units', unit);
    syncToSecondaryDB('units', 'upsert', result);
    return result;
  },

  async updateUnit(id: string, unit: Partial<Unit>): Promise<Unit> {
    const result = await apiClient.put<Unit>(`/api/units/${id}`, unit);
    syncToSecondaryDB('units', 'upsert', result, id);
    return result;
  },

  async deleteUnit(id: string): Promise<{ success: boolean }> {
    const result = await apiClient.delete<{ success: boolean }>(`/api/units/${id}`);
    syncToSecondaryDB('units', 'delete', null, id);
    return result;
  }
};
