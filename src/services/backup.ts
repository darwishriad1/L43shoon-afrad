import { apiClient } from './api';
import { Unit, Soldier, AttendanceRecord, AuditLog } from '../types';

export interface BackupData {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  auditLogs?: AuditLog[];
}

export const backupService = {
  async restoreBackup(data: BackupData): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/api/backup/restore', data);
  }
};
