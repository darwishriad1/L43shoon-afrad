import { apiClient } from './api';
import { SystemSettings } from '../types';

export const settingsService = {
  async fetchSettings(): Promise<SystemSettings> {
    return apiClient.get<SystemSettings>('/api/settings');
  },

  async updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    return apiClient.put<SystemSettings>('/api/settings', settings);
  }
};
