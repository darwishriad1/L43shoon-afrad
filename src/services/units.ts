import { apiClient } from './api';
import { Unit } from '../types';

export const unitsService = {
  async createUnit(unit: Partial<Unit>): Promise<Unit> {
    return apiClient.post<Unit>('/api/units', unit);
  },

  async updateUnit(id: string, unit: Partial<Unit>): Promise<Unit> {
    return apiClient.put<Unit>(`/api/units/${id}`, unit);
  },

  async deleteUnit(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/units/${id}`);
  }
};
