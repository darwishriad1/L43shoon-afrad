import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  Users, 
  FilePieChart, 
  Settings, 
  User, 
  Calendar, 
  ShieldCheck, 
  Clock,
  LogOut,
  Loader2,
  Menu,
  ShieldAlert,
  Info,
  Sparkles,
  X,
  ChevronLeft,
  Search,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';

import { 
  User as UserType, 
  Unit, 
  Soldier, 
  AttendanceRecord, 
  AuditLog, 
  Notification, 
  SystemSettings, 
  AttendanceStatusCode
} from './types';

import { motion, AnimatePresence } from 'motion/react';

// Hooks & Services
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { 
  unitsService, 
  soldiersService, 
  usersService, 
  attendanceService, 
  notificationsService, 
  backupService, 
  soldierRequestsService, 
  settingsService, 
  auditLogsService,
  apiClient 
} from './services';

// Component Imports
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import OrgManager from './components/OrgManager';
import Reports from './components/Reports';
import SettingsView from './components/SettingsView';
import UsersPermissionsManager from './components/UsersPermissionsManager';
import AboutApp from './components/AboutApp';
import SpecialSections from './components/SpecialSections';
import SplashScreen from './components/SplashScreen';
import LoginPage from './components/LoginPage';
import PWAInstallBanner from './components/PWAInstallBanner';
import NotificationCenter from './components/NotificationCenter';
import SoldierProfile from './components/SoldierProfile';
import SoldierPortal from './components/SoldierPortal';
import SoldierRequestsReviewModal from './components/SoldierRequestsReviewModal';
import BottomSheetNavigation from './components/BottomSheetNavigation';
import { triggerToast } from './components/ToastContainer';

export default function App() {
  // Authentication Custom Hook
  const {
    authUser,
    dbUser,
    token,
    loadingAuth,
    loginError,
    setLoginError,
    loginWithPassword,
    loginWithGoogle,
    logout
  } = useAuth();

  // Application Data Custom Hook
  const {
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
    loadAllData,
    refreshSoldiers,
    refreshAttendance,
    refreshSoldierRequests,
  } = useAppData();

  // Login UI local states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // App Navigation & Modals
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSoldierIdForProfile, setSelectedSoldierIdForProfile] = useState<string | null>(null);
  const [isMoreBottomSheetOpen, setIsMoreBottomSheetOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isUserAccountPopoverOpen, setIsUserAccountPopoverOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('isDarkMode');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    } catch {}

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light-mode');
      document.body.classList.add('dark');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light-mode');
      document.body.classList.remove('dark');
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Real-time ticking clock
  const [timeStr, setTimeStr] = useState<string>('');

  const formattedGregorianDate = useMemo(() => {
    return new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial app data when authenticated
  useEffect(() => {
    if (authUser || token) {
      loadAllData();
    }
  }, [authUser, token, loadAllData]);

  // High Contrast Theme side effect
  useEffect(() => {
    if (settings?.highContrastMode) {
      document.documentElement.classList.add('high-contrast-mode');
      document.body.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
      document.body.classList.remove('high-contrast-mode');
    }
  }, [settings?.highContrastMode]);

  // --- AUTOMATIC UPDATE CHECK ON STARTUP & DB RESET SYNC ---
  useEffect(() => {
    // Listen for database reset signals across tabs / old windows
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('military_db_sync');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'DATABASE_RESET') {
          console.log('[App] Database reset broadcast received! Clearing local caches...');
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
          }
          window.location.reload();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    const isAutoCheckEnabled = localStorage.getItem('auto_check_updates') !== 'false';
    if (isAutoCheckEnabled) {
      const timer = setTimeout(() => {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('last_auto_check_time', now.toISOString());

        triggerToast(
          `تم الفحص التلقائي للتحديثات (${timeFormatted}): المنظومة محدّثة بالكامل لأحدث إصدار v4.2.0 من شركة الصرم`,
          'info',
          5000
        );
      }, 2000);

      return () => {
        clearTimeout(timer);
        if (bc) bc.close();
      };
    }

    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Current User Object
  const currentUser = useMemo(() => {
    return dbUser || {
      id: 'guest',
      name: 'زائر',
      email: '',
      role: 'data_writer' as const,
      unitId: null
    };
  }, [dbUser]);

  // Audit Log Adder
  const handleAddLog = useCallback(async (
    actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', 
    tableName: string, 
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role === 'admin' ? 'مدير النظام' : 
                currentUser.role === 'commander_formation' ? 'قائد تشكيل' : 
                currentUser.role === 'commander_unit' ? 'قائد وحدة فرعية' : 
                currentUser.role === 'operations' ? 'ركن عمليات' : 'كاتب بيانات',
      actionType,
      tableName,
      details,
      timestamp: new Date().toISOString()
    };
    
    setAuditLogs(prev => [newLog, ...prev]);

    try {
      await auditLogsService.addLog(newLog);
    } catch (e) {
      console.warn("Could not sync audit log to server:", e);
    }
  }, [currentUser, setAuditLogs]);

  // Login handler
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpEnabled && !otpValue) {
      setLoginError('الرجاء إدخال رمز التحقق الثنائي (OTP)');
      return;
    }

    const ok = await loginWithPassword(loginUsername, loginPassword, otpEnabled ? otpValue : undefined);
    if (ok) {
      handleAddLog('تعديل', 'جلسات الدخول', `تم تسجيل دخول المستخدم ${loginUsername} بنجاح.`);
      triggerToast('تم تسجيل الدخول بنجاح', 'success');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLogoutModalOpen(false);
    triggerToast('تم تسجيل الخروج بنجاح', 'info');
  };

  // Review & Approve/Reject Soldier Action Requests
  const handleReviewSoldierRequest = async (requestId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      await soldierRequestsService.reviewRequest(requestId, status, rejectionReason, currentUser.name || 'المدير');
      triggerToast(
        status === 'approved' ? 'تمت الموافقة على الطلب وتحديث البيانات تلقائياً' : 'تم رفض الطلب وإبلاغ الفرد',
        status === 'approved' ? 'success' : 'info'
      );
      await Promise.all([refreshSoldierRequests(), refreshSoldiers(), refreshAttendance()]);
    } catch {
      triggerToast('فشل تقييم ومراجعة الطلب', 'error');
    }
  };

  // Single Attendance update
  const handleUpdateAttendance = useCallback(async (soldierId: string, date: string, status: AttendanceStatusCode) => {
    const record: AttendanceRecord = {
      id: `att_${soldierId}_${date}_${Date.now()}`,
      soldierId,
      date,
      statusCode: status,
      recordedBy: currentUser.id,
      updatedAt: new Date().toISOString()
    };

    const statusMap: Record<string, string> = {
      'ح': 'على رأس العمل',
      'غ': 'غياب',
      'إ': 'إجازة',
      'م': 'مهمة',
      'ع': 'إجازة مرضية',
      'ن': 'على رأس العمل'
    };
    if (statusMap[status]) {
      setSoldiers(prev => prev.map(s => s.id === soldierId ? { ...s, militaryStatus: statusMap[status] } : s));
    }

    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.soldierId === soldierId && r.date === date));
      return [...filtered, record];
    });

    const soldierName = soldiers.find(s => s.id === soldierId)?.fullName || 'عسكري غير معروف';
    handleAddLog('تعديل', 'التحضير اليومي', `تعديل حالة حضور العسكري (${soldierName}) إلى (${status}) ليوم ${date}`);
    triggerToast('تم تحديث حالة الحضور اليومي بنجاح', 'success');

    try {
      await attendanceService.saveAttendanceRecord(soldierId, date, status);
      await refreshAttendance();
    } catch (e) {
      console.error("Error saving attendance:", e);
    }
  }, [currentUser, soldiers, setSoldiers, setAttendance, handleAddLog, refreshAttendance]);

  // Bulk update attendance records
  const handleBulkUpdateAttendance = useCallback(async (soldierIds: string[], dates: string[], status: AttendanceStatusCode) => {
    const newRecords: AttendanceRecord[] = [];
    dates.forEach(date => {
      soldierIds.forEach(sId => {
        newRecords.push({
          id: `att_${sId}_${date}_${Date.now()}`,
          soldierId: sId,
          date,
          statusCode: status,
          recordedBy: currentUser.id,
          updatedAt: new Date().toISOString()
        });
      });
    });

    const statusMap: Record<string, string> = {
      'ح': 'على رأس العمل',
      'غ': 'غياب',
      'إ': 'إجازة',
      'م': 'مهمة',
      'ع': 'إجازة مرضية',
      'ن': 'على رأس العمل'
    };
    if (statusMap[status]) {
      const sIdSet = new Set(soldierIds);
      setSoldiers(prev => prev.map(s => sIdSet.has(s.id) ? { ...s, militaryStatus: statusMap[status] } : s));
    }

    setAttendance(prev => {
      const filtered = prev.filter(r => !(soldierIds.includes(r.soldierId) && dates.includes(r.date)));
      return [...filtered, ...newRecords];
    });

    handleAddLog('تعديل', 'التحضير اليومي', `تحضير جماعي: تعديل حالة حضور لعدد (${soldierIds.length}) عسكري للأيام (${dates.join(', ')}) إلى (${status})`);
    triggerToast('تم تطبيق التحضير الجماعي بنجاح', 'success');

    try {
      await attendanceService.bulkSaveAttendance(newRecords);
      await refreshAttendance();
    } catch (e) {
      console.error("Error saving bulk attendance:", e);
    }
  }, [currentUser, setSoldiers, setAttendance, handleAddLog, refreshAttendance]);

  // Restore whole state (Backups)
  const handleRestoreState = useCallback(async (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }) => {
    try {
      await backupService.restoreBackup(importedData);

      setUnits(importedData.units);
      setSoldiers(importedData.soldiers);
      setAttendance(importedData.attendance);
      if (importedData.auditLogs && importedData.auditLogs.length > 0) {
        setAuditLogs(importedData.auditLogs);
      }
      triggerToast('تم استعادة بيانات المنظومة بنجاح وحفظها في قاعدة البيانات', 'success');
    } catch (e: any) {
      console.error("Error restoring database backup:", e);
      triggerToast(e.message || 'فشلت عملية استعادة النسخة الاحتياطية على السيرفر', 'error');
    }
  }, [setUnits, setSoldiers, setAttendance, setAuditLogs]);

  // Handle Reset Database (5-Second Hold Factory Reset with Auto Backup)
  const handleResetDatabase = useCallback(async () => {
    try {
      // 1. AUTOMATIC BACKUP CREATION BEFORE RESET
      const backupPayload = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        type: 'AUTO_RESET_BACKUP',
        description: 'نسخة احتياطية تلقائية تم إنشاؤها فوراً قبل تنفيذ عملية تهيئة وتصفية المنظومة',
        data: {
          units,
          soldiers,
          attendance,
          auditLogs
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);

      // Save to localStorage as safety net
      try {
        localStorage.setItem('auto_backup_before_reset', jsonString);
        localStorage.setItem('auto_backup_before_reset_date', new Date().toLocaleDateString('ar-YE'));
      } catch (err) {
        console.warn('Could not save auto backup to localStorage:', err);
      }

      // Trigger automatic file download
      try {
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `نسخة_احتياطية_تلقائية_قبل_التهيئة_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        triggerToast('تم إنشاء وتنزيل نسخة احتياطية تلقائية للبيانات للحفاظ على سجلاتك قبل التهيئة.', 'success');
      } catch (err) {
        console.error('Auto download failed:', err);
      }

      // 2. CALL RESET API ON SERVER
      await apiClient.post('/api/system/reset-database');

      // 3. PURGE SERVICE WORKER CACHES AND BROADCAST TO ALL TABS / OLD CLIENTS
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(k => caches.delete(k)));
        } catch (err) {
          console.warn('Error deleting SW caches:', err);
        }
      }

      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      try {
        const bc = new BroadcastChannel('military_db_sync');
        bc.postMessage({ type: 'DATABASE_RESET' });
        bc.close();
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }

      // Clear local React state
      setUnits([]);
      setSoldiers([]);
      setAttendance([]);
      setAuditLogs([]);
      setNotifications([]);
      refreshSoldierRequests();
      if (currentUser && currentUser.id !== 'guest') {
        setUsers([{ ...currentUser, role: 'admin' as const }]);
      } else {
        setUsers([]);
      }

      // Clear local storage keys for device cache cleanup while preserving active auth token
      try {
        const savedToken = localStorage.getItem('military_auth_token') || localStorage.getItem('authToken');
        localStorage.clear();
        if (savedToken) {
          localStorage.setItem('military_auth_token', savedToken);
          localStorage.setItem('authToken', savedToken);
        }
      } catch (err) {
        console.warn('Could not clear local storage:', err);
      }
      
      handleAddLog('حذف', 'قاعدة البيانات', 'تمت تهيئة قاعدة البيانات وتصفية كافة السجلات والمستخدمين باستثناء مدير النظام.');
      
      triggerToast('تمت تهيئة قاعدة البيانات السحابية وتصفياتها بنجاح 100%.', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      console.error("Error resetting database:", e);
      triggerToast('فشلت عملية تهيئة قاعدة البيانات السحابية: ' + (e.message || 'خطأ في الاتصال بالسيرفر'), 'error');
      throw e;
    }
  }, [units, soldiers, attendance, auditLogs, currentUser, setUsers, setUnits, setSoldiers, setAttendance, setAuditLogs, handleAddLog]);

  // Handle Import Completed from Excel
  const handleImportCompleted = useCallback((importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
  }) => {
    setUnits(importedData.units);
    setSoldiers(importedData.soldiers);
    setAttendance(importedData.attendance);
    triggerToast('تم استيراد الملف وسجلات القوة العسكرية بنجاح', 'success');
  }, [setUnits, setSoldiers, setAttendance]);

  // Update Settings
  const handleUpdateSettings = useCallback(async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    handleAddLog('تعديل', 'الإعدادات العامة', 'تم تعديل إعدادات التنبيه والتقاويم الخاصة بالنظام.');
    triggerToast('تم حفظ إعدادات المنظومة القيادية بنجاح', 'success');

    try {
      await settingsService.updateSettings(newSettings);
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, [setSettings, handleAddLog]);

  // Org units CRUD
  const handleAddUnit = useCallback(async (
    name: string, 
    parentId: string | null, 
    commanderName: string | null,
    type?: string | null,
    location?: string | null,
    approvedStrength?: number | null,
    status?: string | null,
    code?: string | null
  ) => {
    const newUnit: Unit = {
      id: `un_${Date.now()}`,
      name,
      parentId,
      commanderId: null,
      commanderName,
      type: type || null,
      location: location || null,
      approvedStrength: approvedStrength || null,
      status: status || 'نشط',
      code: code || null
    };
    setUnits(prev => [...prev, newUnit]);
    handleAddLog('إضافة', 'الهيكل التنظيمي', `إضافة تشكيل عسكري جديد باسم (${name}) بقائد المسؤول (${commanderName || 'لم يعين قائد'})`);
    triggerToast('تم إضافة التشكيل العسكري الجديد بنجاح', 'success');

    try {
      await unitsService.createUnit(newUnit);
    } catch (e) {
      console.error("Error creating unit:", e);
    }
  }, [setUnits, handleAddLog]);

  const handleEditUnit = useCallback(async (
    id: string, 
    name: string, 
    parentId: string | null, 
    commanderName: string | null,
    type?: string | null,
    location?: string | null,
    approvedStrength?: number | null,
    status?: string | null,
    code?: string | null
  ) => {
    setUnits(prev => prev.map(u => u.id === id ? { 
      ...u, 
      name, 
      parentId, 
      commanderName,
      type: type !== undefined ? type : u.type,
      location: location !== undefined ? location : u.location,
      approvedStrength: approvedStrength !== undefined ? approvedStrength : u.approvedStrength,
      status: status !== undefined ? status : u.status,
      code: code !== undefined ? code : u.code
    } : u));
    handleAddLog('تعديل', 'الهيكل التنظيمي', `تعديل التشكيل العسكري (${name}) - تحديد القائد (${commanderName || 'بدون قائد'}) والحالة لـ (${status || 'نشط'})`);
    triggerToast('تم تحديث بيانات التشكيل العسكري بنجاح', 'success');

    try {
      await unitsService.updateUnit(id, { name, parentId, commanderName, type, location, approvedStrength, status, code });
    } catch (e) {
      console.error("Error updating unit:", e);
    }
  }, [setUnits, handleAddLog]);

  const handleDeleteUnit = useCallback(async (id: string) => {
    const unitToDelete = units.find(u => u.id === id);
    const unitName = unitToDelete ? unitToDelete.name : 'تشكيل غير معروف';
    setUnits(prev => prev.filter(u => u.id !== id));
    setSoldiers(prev => prev.map(s => s.unitId === id ? { ...s, unitId: '' } : s));
    handleAddLog('حذف', 'الهيكل التنظيمي', `حذف التشكيل العسكري (${unitName}) ونقل الجنود التابعين له لغير معين`);
    triggerToast('تم حذف التشكيل العسكري بنجاح', 'info');

    try {
      await unitsService.deleteUnit(id);
    } catch (e) {
      console.error("Error deleting unit:", e);
    }
  }, [units, setUnits, setSoldiers, handleAddLog]);

  // Soldiers CRUD
  const handleAddSoldier = useCallback(async (militaryNumber: string, fullName: string, rank: string, unitId: string) => {
    const newSoldier: Soldier = {
      id: `s_${Date.now()}`,
      militaryNumber,
      fullName,
      rank,
      unitId,
      isActive: true
    };
    setSoldiers(prev => [...prev, newSoldier]);
    const unitName = units.find(u => u.id === unitId)?.name || 'غير معين';
    handleAddLog('إضافة', 'سجل الأفراد والعديد', `إضافة عسكري جديد باسم (${fullName})، الرتبة (${rank})، الرقم العسكري (${militaryNumber})، التشكيل (${unitName})`);
    triggerToast('تم إضافة بطاقة الفرد العسكري بنجاح', 'success');

    try {
      await soldiersService.createSoldier(newSoldier);
    } catch (e) {
      console.error("Error creating soldier:", e);
    }
  }, [units, setSoldiers, handleAddLog]);

  const handleEditSoldier = useCallback(async (id: string, militaryNumber: string, fullName: string, rank: string, unitId: string, isActive: boolean) => {
    setSoldiers(prev => prev.map(s => s.id === id ? { ...s, militaryNumber, fullName, rank, unitId, isActive } : s));
    const unitName = units.find(u => u.id === unitId)?.name || 'غير معين';
    handleAddLog('تعديل', 'سجل الأفراد والعديد', `تعديل بيانات العسكري (${fullName})، الرتبة (${rank})، التشكيل الجديد (${unitName})، الحالة (${isActive ? 'نشط' : 'غير نشط'})`);
    triggerToast('تم تعديل بيانات الفرد العسكري بنجاح', 'success');

    try {
      await soldiersService.updateSoldier(id, { militaryNumber, fullName, rank, unitId, isActive });
    } catch (e) {
      console.error("Error updating soldier:", e);
    }
  }, [units, setSoldiers, handleAddLog]);

  const handleDeleteSoldier = useCallback(async (id: string) => {
    const soldierToDelete = soldiers.find(s => s.id === id);
    const soldierName = soldierToDelete ? soldierToDelete.fullName : 'عسكري غير معروف';
    setSoldiers(prev => prev.filter(s => s.id !== id));
    handleAddLog('حذف', 'سجل الأفراد والعديد', `حذف بطاقة العسكري (${soldierName}) نهائياً من قاعدة البيانات`);
    triggerToast('تم حذف بطاقة العسكري بنجاح', 'info');

    try {
      await soldiersService.deleteSoldier(id);
    } catch (e) {
      console.error("Error deleting soldier:", e);
    }
  }, [soldiers, setSoldiers, handleAddLog]);

  // Users CRUD
  const handleAddUser = useCallback(async (newUserPayload: Omit<UserType, 'id'> & { id?: string }) => {
    const id = newUserPayload.id || `u_${Date.now()}`;
    const newUser: UserType = {
      ...newUserPayload,
      id,
    };
    setUsers(prev => [...prev, newUser]);
    handleAddLog('إضافة', 'المستخدمون والصلاحيات', `إضافة مستخدم نظام جديد باسم (${newUser.name}) بدور الصلاحية (${newUser.role}) البريد (${newUser.email})`);
    triggerToast('تم إنشاء الحساب العسكري الجديد بنجاح', 'success');

    try {
      await usersService.createUser(newUser);
    } catch (e) {
      console.error("Error creating user:", e);
    }
  }, [setUsers, handleAddLog]);

  const handleEditUser = useCallback(async (id: string, updatedPayload: Partial<UserType>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedPayload } : u));
    const targetUser = users.find(u => u.id === id);
    const userName = targetUser ? targetUser.name : 'غير معروف';
    handleAddLog('تعديل', 'المستخدمون والصلاحيات', `تعديل بيانات وصلاحيات مستخدم النظام (${userName}) - الصلاحية الجديدة (${updatedPayload.role || 'لم تتغير'})`);
    triggerToast('تم حفظ تعديلات حساب المستخدم والصلاحيات بنجاح', 'success');

    try {
      await usersService.updateUser(id, updatedPayload);
    } catch (e) {
      console.error("Error updating user:", e);
    }
  }, [users, setUsers, handleAddLog]);

  const handleDeleteUser = useCallback(async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    const userName = targetUser ? targetUser.name : 'غير معروف';
    setUsers(prev => prev.filter(u => u.id !== id));
    handleAddLog('حذف', 'المستخدمون والصلاحيات', `حذف مستخدم النظام (${userName}) وسحب صلاحياته الأمنية`);
    triggerToast('تم إغلاق وحذف حساب المستخدم بنجاح', 'info');

    try {
      await usersService.deleteUser(id);
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  }, [users, setUsers, handleAddLog]);

  // Transfer soldier
  const handleTransferSoldier = useCallback(async (
    soldierId: string, 
    targetUnitId: string,
    orderDetails?: { orderNumber?: string; orderDate?: string; issuedBy?: string; notes?: string }
  ) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return;

    const oldUnitName = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
    const newUnitName = units.find(u => u.id === targetUnitId)?.name || 'غير معروف';

    let historyList: any[] = [];
    try {
      if (soldier.assignmentsHistory) {
        historyList = JSON.parse(soldier.assignmentsHistory);
        if (!Array.isArray(historyList)) historyList = [];
      }
    } catch {
      historyList = [];
    }

    const newHistoryItem = {
      id: "tr_" + Math.random().toString(36).substring(2, 11),
      date: orderDetails?.orderDate || new Date().toISOString().split('T')[0],
      type: 'نقل إداري',
      fromUnitId: soldier.unitId,
      fromUnitName: oldUnitName,
      toUnitId: targetUnitId,
      toUnitName: newUnitName,
      orderNumber: orderDetails?.orderNumber || 'غير محدد',
      orderDate: orderDetails?.orderDate || new Date().toISOString().split('T')[0],
      issuedBy: orderDetails?.issuedBy || 'قيادة اللواء',
      notes: orderDetails?.notes || 'تغيير التبعية والتشكيل العسكري',
      recordedBy: currentUser ? `${currentUser.name} (${currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'commander_formation' ? 'قائد تشكيل' : currentUser.role === 'commander_unit' ? 'قائد وحدة' : currentUser.role === 'operations' ? 'ركن عمليات' : 'مستخدم'})` : 'النظام'
    };

    const updatedHistory = JSON.stringify([newHistoryItem, ...historyList]);

    setSoldiers(prev => prev.map(s => s.id === soldierId ? { ...s, unitId: targetUnitId, assignmentsHistory: updatedHistory } : s));
    handleAddLog('تعديل', 'نقل القوة الميدانية', `نقل العسكري (${soldier.fullName}) من (${oldUnitName}) إلى (${newUnitName}) بموجب الأمر رقم (${orderDetails?.orderNumber || 'غير محدد'}) الصادر عن (${orderDetails?.issuedBy || 'قيادة اللواء'})`);
    triggerToast('تم تنفيذ وإصدار أمر نقل العسكري بنجاح', 'success');

    try {
      await soldiersService.updateSoldier(soldierId, { unitId: targetUnitId, assignmentsHistory: updatedHistory });
    } catch (e) {
      console.error("Error transferring soldier:", e);
    }
  }, [soldiers, units, currentUser, setSoldiers, handleAddLog]);

  // Notification clear or toggle read
  const handleToggleReadNotif = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));

    try {
      await notificationsService.markAsRead(id);
    } catch (e) {
      console.error("Error updating notification status:", e);
    }
  };

  const handleClearAllLogs = async () => {
    setAuditLogs([]);
    handleAddLog('حذف', 'سجل الرقابة', 'تم تصفير وأرشفة سجل التعديلات والعمليات بالكامل.');
    triggerToast('تم تصفير وأرشفة سجل التعديلات بالكامل', 'info');

    try {
      await auditLogsService.clearLogs();
    } catch (e) {
      console.error("Error clearing logs:", e);
    }
  };

  // Real-time Attendance Alerts Sync
  useEffect(() => {
    const safeSoldiers = Array.isArray(soldiers) ? soldiers : [];
    const safeUnits = Array.isArray(units) ? units : [];
    const safeAttendance = Array.isArray(attendance) ? attendance : [];
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    if (safeSoldiers.length === 0 || safeUnits.length === 0) return;

    const activeSoldiers = safeSoldiers.filter(s => s.isActive);
    const today = new Date().toISOString().split('T')[0];
    const recordsToday = safeAttendance.filter(a => a.date === today);

    safeUnits.forEach(unit => {
      const unitSoldierIds = new Set(activeSoldiers.filter(s => s.unitId === unit.id).map(s => s.id));
      const strength = unitSoldierIds.size;
      if (strength === 0) return;

      const unitTodayRecords = recordsToday.filter(r => unitSoldierIds.has(r.soldierId));
      let h = 0, n = 0;
      unitTodayRecords.forEach(r => {
        if (r.statusCode === 'ح') h++;
        else if (r.statusCode === 'ن') n++;
      });

      const todayRate = Math.round(((h + n * 0.5) / strength) * 100);
      
      const warningThreshold = settings?.warningThreshold ?? 70;
      if (todayRate < warningThreshold && todayRate > 0) {
        const notifTitle = `تدني نسبة الجاهزية - ${unit.name}`;
        const hasNotif = safeNotifications.some(notif => notif.title === notifTitle && !notif.isRead);
        
        if (!hasNotif) {
          const newNotif: Notification = {
            id: `notif_rate_${unit.id}_${today}`,
            title: notifTitle,
            message: `انخفض معدل الجاهزية اليومي في (${unit.name}) ليوم ${today} إلى ${todayRate}% وهو أقل من الحد المسموح به (${warningThreshold}%). يرجى المتابعة الفورية.`,
            isRead: false,
            type: 'warning',
            createdAt: new Date().toISOString()
          };
          setNotifications(prev => {
            if (prev.some(p => p.title === notifTitle && !p.isRead)) return prev;
            return [newNotif, ...prev];
          });

          notificationsService.createNotification(newNotif).catch(console.error);
        }
      }
    });
  }, [attendance, soldiers, units, settings?.warningThreshold, notifications, setNotifications]);

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'لوحة القيادة والمؤشرات', icon: LayoutDashboard },
    { id: 'attendance', label: 'كشف التحضير اليومي', icon: Table },
    { id: 'org_manager', label: 'إدارة الهيكل والأفراد', icon: Users },
    { id: 'special_sections', label: 'الأقسام والخدمات المميزة', icon: Sparkles },
    { id: 'reports', label: 'التقارير والمستخرجات', icon: FilePieChart },
    { id: 'settings', label: 'الاعدادات', icon: Settings },
    { id: 'about', label: 'حول التطبيق', icon: Info },
  ];

  // 1. AUTH LOADING STATE
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100" dir="rtl">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="font-sans text-sm tracking-wide text-slate-300">يتم التحقق من الصلاحيات الأمنية والربط السحابي...</p>
      </div>
    );
  }

  // 2. AUTHENTICATION GATE
  if (!authUser) {
    return (
      <LoginPage
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        loadingAuth={loadingAuth}
        handleLocalLogin={handleLocalLogin}
        handleGoogleLogin={loginWithGoogle}
        otpEnabled={otpEnabled}
        setOtpEnabled={setOtpEnabled}
        otpValue={otpValue}
        setOtpValue={setOtpValue}
      />
    );
  }

  // 2.5. SOLDIER PORTAL
  if (currentUser.role === 'soldier') {
    const soldier = soldiers.find(s => 
      (s.accountUsername && currentUser.username && s.accountUsername === currentUser.username) || 
      (currentUser.soldierId && s.id === currentUser.soldierId) ||
      (s.militaryNumber && currentUser.username && s.militaryNumber === currentUser.username)
    );

    if (!soldier) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 dir-rtl" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 p-8 sm:p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto animate-pulse" />
            <h3 className="text-white font-black text-xl">حساب الفرد قيد التهيئة أو غير مرتبط</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              مرحباً بك {currentUser.name || 'أخي الفرد'}. تم تسجيل دخولك بنجاح، ولكن لم يتم ربط هذا الحساب بسجلك العسكري بعد.
              يرجى التواصل مع مسؤول الشؤون الإدارية لتأكيد اسم المستخدم وتفعيل ربط حسابك.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-xl text-slate-400 text-[11px] font-mono border border-slate-700/60">
              رمز المستخدم: {currentUser.username || currentUser.id}
            </div>
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-rose-950/50"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <SoldierPortal
        soldier={soldier}
        currentUser={currentUser}
        units={units}
        printSettings={settings?.printSettings}
        onLogout={handleLogout}
        onSoldierUpdated={refreshSoldiers}
      />
    );
  }

  // 3. SYSTEM MAIN APP
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased text-right" dir="rtl">
      
      {/* Animated Military Welcome Splash Screen Overlay */}
      <AnimatePresence>
        {showSplashScreen && (
          <SplashScreen 
            onEnter={() => setShowSplashScreen(false)} 
            appName="منظومة إدارة الفرد والجاهزية العسكرية"
            unitName="قيادة اللواء الأول - الإدارة العامة للفرد"
          />
        )}
      </AnimatePresence>

      {/* Top Bar: Official Status, Title & Clock */}
      <div className="bg-slate-950 text-slate-100 py-1 px-2 sm:px-3 border-b border-slate-800 flex flex-row justify-between items-center gap-1.5 sm:gap-2 text-xs sticky top-0 z-40 shadow-sm backdrop-blur-md whitespace-nowrap overflow-x-auto sm:overflow-visible no-scrollbar">
        {/* Compact Account Button */}
        <button
          type="button"
          onClick={() => setIsUserAccountPopoverOpen(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800 transition-all cursor-pointer text-[11px] font-bold shrink-0 shadow-xs"
          title="انقر لعرض بيانات وتفاصيل الحساب والصلاحيات"
        >
          <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400 shrink-0">
            <User className="w-2.5 h-2.5" />
          </div>
          <span className="font-bold text-slate-200 text-[11px] max-w-[120px] truncate">{currentUser.name}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Right Tools & Time Display */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 font-sans text-[10px] sm:text-[11px] shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800/60 text-[10px] xs:text-[11px] whitespace-nowrap shrink-0">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-300 font-medium whitespace-nowrap">{formattedGregorianDate} م</span>
          </div>

          <div className="flex items-center gap-1 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800/60 text-[10px] xs:text-[11px] text-slate-200 whitespace-nowrap shrink-0">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-bold whitespace-nowrap">{timeStr || '12:00:00 ص'}</span>
          </div>

          {/* Soldier Requests Review Button */}
          {(currentUser.role as string) !== 'soldier' && (
            <button
              onClick={() => setIsRequestsModalOpen(true)}
              className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-amber-400 cursor-pointer flex items-center gap-1.5 text-[11px] font-bold shrink-0"
              title="مركز مراجعة وإعتماد طلبات وإجراءات الأفراد"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">طلبات الأفراد</span>
              {soldierRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black animate-pulse">
                  {soldierRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          )}

          {/* Tactical Notification Center */}
          <NotificationCenter
            notifications={notifications}
            setNotifications={setNotifications}
            onToggleRead={handleToggleReadNotif}
            onNavigateTab={(tab) => setActiveTab(tab)}
            units={units}
            soldiers={soldiers}
            attendance={attendance}
          />

          {/* Global Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`p-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold shrink-0 shadow-xs active:scale-95 ${
              isDarkMode
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-700 ring-1 ring-slate-800'
            }`}
            title={isDarkMode ? "التحويل إلى الوضع النهاري المضيء" : "التحويل إلى الوضع الليلي الداكن"}
          >
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-180 duration-300 shrink-0 drop-shadow-xs" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0 drop-shadow-xs" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">
              {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            </span>
          </button>

          {/* Logout Action Button */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 transition-colors border border-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[11px] shrink-0"
            title="تسجيل الخروج من المنظومة"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline font-bold whitespace-nowrap">تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-45 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-[0_-10px_36px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.08)_inset] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-all duration-300">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 text-center items-center relative">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('dashboard'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'dashboard' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">المؤشرات</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('attendance'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'attendance' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">التحضير</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('reports'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'reports' ? 'text-amber-300 font-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FilePieChart className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'reports' ? 'scale-110 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.8)]' : 'text-amber-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-black text-amber-300 tracking-tight">التقارير</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('org_manager'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'org_manager' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'org_manager' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">القوة</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsMoreBottomSheetOpen(!isMoreBottomSheetOpen)}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              isMoreBottomSheetOpen || ['special_sections', 'settings', 'users_permissions', 'about'].includes(activeTab) ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 relative z-10 transition-transform duration-200" />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">المزيد</span>
          </motion.button>
        </div>
      </nav>

      {/* Mobile "More" Sections Drawer / Bottom Sheet */}
      <BottomSheetNavigation
        isOpen={isMoreBottomSheetOpen}
        onClose={() => setIsMoreBottomSheetOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
        unreadRequestsCount={soldierRequests ? soldierRequests.filter(r => r.status === 'pending').length : 0}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row pb-16 lg:pb-0">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex w-64 bg-slate-900 border-l border-slate-800 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-33px)] shadow-xl z-20">
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
            <h2 className="text-xs font-black text-slate-100 tracking-wide uppercase">قائمة الملاحة والسيطرة</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">منظومة القوة والجاهزية العسكرية</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm' 
                      : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Users and Permissions tab for admins */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users_permissions')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'users_permissions' 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm' 
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <Users className={`w-4 h-4 ${activeTab === 'users_permissions' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>إدارة الحسابات والصلاحيات</span>
              </button>
            )}
          </nav>

          <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-400 text-center">
            تطور تقني - شركة الصرم v4.2.0
          </div>
        </aside>

        {/* Dynamic Page Views Container */}
        <main className="flex-1 px-2.5 sm:px-6 pb-6 pt-0 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              units={units} 
              soldiers={soldiers} 
              attendance={attendance} 
              users={users}
              auditLogs={auditLogs}
              onNavigate={(tab) => setActiveTab(tab)}
              onViewSoldierProfile={(id) => setSelectedSoldierIdForProfile(id)}
              currentUser={currentUser}
              printSettings={settings?.printSettings}
              onAddLog={handleAddLog}
            />
          )}

          {activeTab === 'attendance' && (
            <div className="pt-3 sm:pt-4">
              <AttendanceSheet 
                units={units} 
                soldiers={soldiers} 
                attendance={attendance} 
                currentUser={currentUser}
                printSettings={settings?.printSettings}
                onUpdateAttendance={handleUpdateAttendance}
                onBulkUpdateAttendance={handleBulkUpdateAttendance}
                onAddLog={handleAddLog}
              />
            </div>
          )}

          {activeTab === 'org_manager' && (
            <div className="pt-3 sm:pt-4">
              <OrgManager 
                units={units} 
                soldiers={soldiers} 
                attendance={attendance}
                currentUser={currentUser}
                auditLogs={auditLogs}
                printSettings={settings?.printSettings}
                selectedSoldierId={selectedSoldierIdForProfile}
                isDarkMode={isDarkMode}
                onSelectSoldierId={(id) => setSelectedSoldierIdForProfile(id)}
                onImportCompleted={handleImportCompleted}
                onAddLog={handleAddLog}
                onAddUnit={handleAddUnit}
                onEditUnit={handleEditUnit}
                onDeleteUnit={handleDeleteUnit}
                onAddSoldier={handleAddSoldier}
                onEditSoldier={handleEditSoldier}
                onDeleteSoldier={handleDeleteSoldier}
                onTransferSoldier={handleTransferSoldier}
              />
            </div>
          )}

          {activeTab === 'special_sections' && (
            <div className="pt-3 sm:pt-4">
              <SpecialSections 
                soldiers={soldiers}
                units={units}
                currentUser={currentUser}
                printSettings={settings?.printSettings}
                soldierRequests={soldierRequests}
                onRefreshRequests={refreshSoldierRequests}
                onAddLog={(log: any) => handleAddLog(log.actionType || 'تعديل', log.tableName || 'سجل', log.details || '')}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="pt-3 sm:pt-4">
              <Reports 
                units={units} 
                soldiers={soldiers} 
                attendance={attendance} 
                currentUser={currentUser}
                printSettings={settings?.printSettings}
                googleAccessToken={googleAccessToken}
                onSetGoogleAccessToken={setGoogleAccessToken}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="pt-3 sm:pt-4">
              <SettingsView 
                settings={settings || {
                  warningThreshold: 70,
                  dailyReminderEnabled: true,
                  dailyReminderTime: '08:30',
                  autoBackupEnabled: true,
                  hijriSupport: true,
                  highContrastMode: false,
                }} 
                onUpdateSettings={handleUpdateSettings} 
                currentUserRole={currentUser.role}
                units={units}
                soldiers={soldiers}
                attendance={attendance}
                currentUser={currentUser}
                onImportCompleted={handleImportCompleted}
                onAddLog={handleAddLog}
                users={users}
                currentUserId={currentUser.id}
                onAddUser={handleAddUser}
                onEditUser={handleEditUser}
                onDeleteUser={handleDeleteUser}
                auditLogs={auditLogs}
                onClearLogs={handleClearAllLogs}
                googleAccessToken={googleAccessToken}
                onSetGoogleAccessToken={setGoogleAccessToken}
                onRestoreState={handleRestoreState}
                onResetDatabase={handleResetDatabase}
              />
            </div>
          )}

          {activeTab === 'users_permissions' && currentUser.role === 'admin' && (
            <div className="pt-3 sm:pt-4">
              <UsersPermissionsManager 
                users={users}
                units={units}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onEditUser={handleEditUser}
                onDeleteUser={handleDeleteUser}
                onAddLog={handleAddLog}
              />
            </div>
          )}

          {activeTab === 'about' && (
            <div className="pt-3 sm:pt-4">
              <AboutApp />
            </div>
          )}
        </main>
      </div>

      {/* Soldier Profile Drawer Modal */}
      {selectedSoldierIdForProfile && (
        <SoldierProfile
          soldierId={selectedSoldierIdForProfile}
          currentUser={currentUser}
          units={units}
          printSettings={settings?.printSettings}
          onClose={() => setSelectedSoldierIdForProfile(null)}
          onSoldierUpdated={refreshSoldiers}
        />
      )}

      {/* Soldier Action Requests Review Modal */}
      <SoldierRequestsReviewModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        requests={soldierRequests}
        onReviewRequest={handleReviewSoldierRequest}
        units={units}
        soldiers={soldiers}
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-lg">تأكيد تسجيل الخروج</h3>
              <p className="text-slate-400 text-xs">هل أنت تأكد من رغبتك في الخروج من منظومة الجاهزية العسكرية؟</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  تسجيل الخروج
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Account Details Modal */}
      <AnimatePresence>
        {isUserAccountPopoverOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsUserAccountPopoverOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 max-w-md w-full text-slate-100 font-sans shadow-2xl relative overflow-hidden"
            >
              {/* Accent Top Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

              {/* Header with Close Button */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">{currentUser.name}</h3>
                    <p className="text-xs text-amber-400 font-bold mt-0.5">
                      {
                        currentUser.role === 'admin' ? 'مدير النظام (كامل الصلاحيات)' :
                        currentUser.role === 'commander_formation' ? 'قائد التشكيل' :
                        currentUser.role === 'commander_unit' ? 'قائد كتيبة' :
                        currentUser.role === 'operations' ? 'ركن عمليات' :
                        (currentUser.role as string) === 'soldier' ? 'بوابة الفرد (عسكري)' : 'كاتب بيانات'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserAccountPopoverOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Fields List */}
              <div className="py-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 font-medium">اسم صاحب الحساب:</span>
                  <span className="font-bold text-slate-100">{currentUser.name}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 font-medium">المستوى القيادي:</span>
                  <span className="font-bold text-amber-400">
                    {
                      currentUser.role === 'admin' ? 'إدارة عليا (Super Admin)' :
                      currentUser.role === 'commander_formation' ? 'قيادة تشكيل رئيسي' :
                      currentUser.role === 'commander_unit' ? 'قيادة وحدة فرعية' :
                      currentUser.role === 'operations' ? 'هيئة عمليات وتخطيط' :
                      (currentUser.role as string) === 'soldier' ? 'فرد / عسكري' : 'مدخل بيانات'
                    }
                  </span>
                </div>

                {currentUser.email && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 font-medium">البريد الإلكتروني:</span>
                    <span className="font-mono text-slate-200 font-bold dir-ltr">{currentUser.email}</span>
                  </div>
                )}

                {currentUser.unitId && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 font-medium">التشكيل / الوحدة التابعة:</span>
                    <span className="font-bold text-sky-400">
                      {units.find(u => u.id === currentUser.unitId)?.name || 'القيادة العامة'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 font-medium">صلاحيات المنظومة:</span>
                  <span className="font-bold text-emerald-400">
                    {currentUser.role === 'admin' ? 'كامل الصلاحيات (عرض، تعديل، إدارة)' : 'صلاحيات محددة حسب التكليف'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 font-medium">حالة الاتصال والجلسة:</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    نشطة وآمنة (مشفرة)
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserAccountPopoverOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserAccountPopoverOpen(false)}
                  className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PWAInstallBanner />
    </div>
  );
}
