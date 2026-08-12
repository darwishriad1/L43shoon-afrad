import { apiClient } from './api';
import { AuditLog } from '../types';

export const auditLogsService = {
  async addLog(log: AuditLog): Promise<AuditLog> {
    return apiClient.post<AuditLog>('/api/journal-records', log);
  },

  async clearLogs(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/api/journal-records/clear');
  }
};
