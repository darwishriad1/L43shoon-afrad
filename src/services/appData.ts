import { apiClient } from './api';
import {
  User,
  Unit,
  Soldier,
  AttendanceRecord,
  AuditLog,
  Notification,
  SystemSettings,
  SoldierActionRequest
} from '../types';

export const appDataService = {
  async fetchUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/api/users');
  },

  async fetchUnits(): Promise<Unit[]> {
    return apiClient.get<Unit[]>('/api/units');
  },

  async fetchSoldiers(): Promise<Soldier[]> {
    return apiClient.get<Soldier[]>('/api/soldiers');
  },

  async fetchAttendance(): Promise<AttendanceRecord[]> {
    return apiClient.get<AttendanceRecord[]>('/api/attendance');
  },

  async fetchJournalRecords(): Promise<AuditLog[]> {
    return apiClient.get<AuditLog[]>('/api/journal-records');
  },

  async fetchNotifications(): Promise<Notification[]> {
    return apiClient.get<Notification[]>('/api/notifications');
  },

  async fetchSettings(): Promise<SystemSettings | null> {
    return apiClient.get<SystemSettings>('/api/settings');
  },

  async fetchSoldierRequests(): Promise<SoldierActionRequest[]> {
    return apiClient.get<SoldierActionRequest[]>('/api/soldier-requests');
  },

  async fetchAllData() {
    const [
      users,
      units,
      soldiers,
      attendance,
      journalRecords,
      notifications,
      settings,
      soldierRequests,
    ] = await Promise.all([
      this.fetchUsers().catch(() => []),
      this.fetchUnits().catch(() => []),
      this.fetchSoldiers().catch(() => []),
      this.fetchAttendance().catch(() => []),
      this.fetchJournalRecords().catch(() => []),
      this.fetchNotifications().catch(() => []),
      this.fetchSettings().catch(() => null),
      this.fetchSoldierRequests().catch(() => []),
    ]);

    return {
      users: Array.isArray(users) ? users : [],
      units: Array.isArray(units) ? units : [],
      soldiers: Array.isArray(soldiers) ? soldiers : [],
      attendance: Array.isArray(attendance) ? attendance : [],
      auditLogs: Array.isArray(journalRecords) ? journalRecords : [],
      notifications: Array.isArray(notifications) ? notifications : [],
      settings,
      soldierRequests: Array.isArray(soldierRequests) ? soldierRequests : [],
    };
  }
};
