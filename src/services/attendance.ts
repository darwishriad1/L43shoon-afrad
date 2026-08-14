import { apiClient } from './api';
import { AttendanceRecord, AttendanceStatusCode } from '../types';
import { syncToSecondaryDB } from './supabaseSecondary';
import { offlineSyncService } from './offlineSyncService';

export const attendanceService = {
  async saveAttendanceRecord(
    soldierId: string,
    date: string,
    statusCode: AttendanceStatusCode,
    meta?: { soldierName?: string; soldierNames?: string[]; recordedBy?: string; summary?: string }
  ): Promise<AttendanceRecord> {
    const fallbackRecord: AttendanceRecord = {
      id: `att_${soldierId}_${date}_${Date.now()}`,
      soldierId,
      date,
      statusCode,
      recordedBy: meta?.recordedBy || 'admin',
      updatedAt: new Date().toISOString()
    };

    const soldierDisplayName = meta?.soldierName || (meta?.soldierNames && meta.soldierNames[0]) || '';
    const soldierNamesList = meta?.soldierNames || (meta?.soldierName ? [meta.soldierName] : []);
    const operationSummary = meta?.summary || `تسجيل حضور ${soldierDisplayName ? `للفرد ${soldierDisplayName}` : ''} ليوم (${date}) بحالة (${statusCode})`;

    // If device is offline, directly queue to IndexedDB
    if (!offlineSyncService.isOnline()) {
      await offlineSyncService.addToQueue(
        [{ soldierId, date, statusCode, id: fallbackRecord.id, recordedBy: fallbackRecord.recordedBy }],
        operationSummary,
        soldierNamesList
      );
      return fallbackRecord;
    }

    try {
      const result = await apiClient.post<AttendanceRecord>('/api/attendance', { soldierId, date, statusCode, recordedBy: meta?.recordedBy });
      syncToSecondaryDB('attendance', 'upsert', result);
      offlineSyncService.cacheAttendanceRecords([result]).catch(() => {});
      return result;
    } catch (err: any) {
      console.warn('Network error while saving attendance, saving to offline IndexedDB queue:', err);
      await offlineSyncService.addToQueue(
        [{ soldierId, date, statusCode, id: fallbackRecord.id, recordedBy: fallbackRecord.recordedBy }],
        operationSummary,
        soldierNamesList
      );
      return fallbackRecord;
    }
  },

  async bulkSaveAttendance(
    records: { soldierId: string; date: string; statusCode: AttendanceStatusCode; id?: string; recordedBy?: string }[],
    meta?: { summary?: string; soldierNames?: string[] }
  ) {
    if (!records || records.length === 0) {
      return { success: true, count: 0 };
    }

    // If device is offline, directly queue to IndexedDB
    if (!offlineSyncService.isOnline()) {
      await offlineSyncService.addToQueue(
        records,
        meta?.summary || `تحضير جماعي لعدد (${records.length}) فرد`,
        meta?.soldierNames || []
      );
      return { success: true, count: records.length, offline: true };
    }

    try {
      const result = await apiClient.post<{ success: boolean; count: number }>('/api/attendance/bulk', { records });
      records.forEach(rec => syncToSecondaryDB('attendance', 'upsert', rec));
      offlineSyncService.cacheAttendanceRecords(records).catch(() => {});
      return result;
    } catch (err: any) {
      console.warn('Network error while bulk saving attendance, saving to offline IndexedDB queue:', err);
      await offlineSyncService.addToQueue(
        records,
        meta?.summary || `تحضير جماعي لعدد (${records.length}) فرد`,
        meta?.soldierNames || []
      );
      return { success: true, count: records.length, offline: true };
    }
  }
};
