import { useState, useCallback } from 'react';
import { appDataService } from '../services/appData';
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

export function useAppData() {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>({
    warningThreshold: 70,
    dailyReminderEnabled: true,
    dailyReminderTime: '08:30',
    autoBackupEnabled: true,
    hijriSupport: true,
    highContrastMode: false,
  });
  const [soldierRequests, setSoldierRequests] = useState<SoldierActionRequest[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await appDataService.fetchAllData();
      setUsers(data.users);
      setUnits(data.units);
      setSoldiers(data.soldiers);
      setAttendance(data.attendance);
      setAuditLogs(data.auditLogs);
      setNotifications(data.notifications);
      if (data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings } as SystemSettings));
      }
      setSoldierRequests(data.soldierRequests);
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const data = await appDataService.fetchUsers();
      setUsers(data);
    } catch (e) {
      console.error('Error refreshing users:', e);
    }
  }, []);

  const refreshUnits = useCallback(async () => {
    try {
      const data = await appDataService.fetchUnits();
      setUnits(data);
    } catch (e) {
      console.error('Error refreshing units:', e);
    }
  }, []);

  const refreshSoldiers = useCallback(async () => {
    try {
      const data = await appDataService.fetchSoldiers();
      setSoldiers(data);
    } catch (e) {
      console.error('Error refreshing soldiers:', e);
    }
  }, []);

  const refreshAttendance = useCallback(async () => {
    try {
      const data = await appDataService.fetchAttendance();
      setAttendance(data);
    } catch (e) {
      console.error('Error refreshing attendance:', e);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await appDataService.fetchNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Error refreshing notifications:', e);
    }
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const data = await appDataService.fetchJournalRecords();
      setAuditLogs(data);
    } catch (e) {
      console.error('Error refreshing audit logs:', e);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await appDataService.fetchSettings();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data } as SystemSettings));
      }
    } catch (e) {
      console.error('Error refreshing settings:', e);
    }
  }, []);

  const refreshSoldierRequests = useCallback(async () => {
    try {
      const data = await appDataService.fetchSoldierRequests();
      setSoldierRequests(data);
    } catch (e) {
      console.error('Error refreshing soldier requests:', e);
    }
  }, []);

  return {
    users,
    setUsers,
    units,
    setUnits,
    soldiers,
    setSoldiers,
    attendance,
    setAttendance,
    auditLogs,
    setAuditLogs,
    notifications,
    setNotifications,
    settings,
    setSettings,
    soldierRequests,
    setSoldierRequests,
    loadingData,
    loadAllData,
    refreshUsers,
    refreshUnits,
    refreshSoldiers,
    refreshAttendance,
    refreshNotifications,
    refreshAuditLogs,
    refreshSettings,
    refreshSoldierRequests,
  };
}
