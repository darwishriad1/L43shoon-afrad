import { apiClient } from './api';
import { AttendanceRecord, AttendanceStatusCode } from '../types';

export const attendanceService = {
  async saveAttendanceRecord(
    soldierId: string,
    date: string,
    statusCode: AttendanceStatusCode
  ): Promise<AttendanceRecord> {
    return apiClient.post<AttendanceRecord>('/api/attendance', { soldierId, date, statusCode });
  },

  async bulkSaveAttendance(records: { soldierId: string; date: string; statusCode: AttendanceStatusCode }[]) {
    return apiClient.post<{ success: boolean; count: number }>('/api/attendance/bulk', { records });
  }
};
