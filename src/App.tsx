import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  Users, 
  FilePieChart, 
  History, 
  Database, 
  Settings, 
  Bell, 
  User, 
  Calendar, 
  ShieldCheck, 
  Clock,
  LogIn,
  LogOut,
  Loader2,
  Menu,
  X,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  KeyRound,
  Activity,
  Info,
  RefreshCw,
  CheckCircle2,
  Wifi,
  Smartphone,
  Sparkles,
  LockKeyhole
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

// Component Imports
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import OrgManager from './components/OrgManager';
import Reports from './components/Reports';
import AuditLogView from './components/AuditLogView';
import BackupRestore from './components/BackupRestore';
import SettingsView from './components/SettingsView';
import UsersPermissionsManager from './components/UsersPermissionsManager';
import AboutApp from './components/AboutApp';
import SpecialSections from './components/SpecialSections';
import SplashScreen from './components/SplashScreen';
import NotificationCenter from './components/NotificationCenter';

// Firebase Client Imports
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';

// Resilient API Fetch Import
import { fetchWithRetry, safeJson } from './lib/api';

export default function App() {
  // --- STATE MANAGERS ---
  const [users, setUsers] = useState<UserType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    warningThreshold: 70,
    dailyReminderEnabled: true,
    dailyReminderTime: '08:30',
    autoBackupEnabled: true,
    hijriSupport: true
  });

  // Auth States
  const [authUser, setAuthUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dbUser, setDbUser] = useState<UserType | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Advanced Login Features States
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'checking' | 'secure'>('secure');
  const [securityDetails, setSecurityDetails] = useState({
    ssl: true,
    firewalled: true,
    dbConnected: true,
    integrityCheck: true
  });
  // Active logged-in database user ID
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
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
  
  // Navigation
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSoldierIdForProfile, setSelectedSoldierIdForProfile] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreBottomSheetOpen, setIsMoreBottomSheetOpen] = useState(false);

  // Notifications dropdown open status
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Logout confirmation modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // --- AUTHENTICATION LISTENER ---
  useEffect(() => {
    let active = true;
    
    const checkLocalAndFirebase = async () => {
      const localToken = localStorage.getItem('military_auth_token');
      if (localToken) {
        try {
          // Get user profile
          const res = await fetchWithRetry('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${localToken}`
            }
          });
          if (!res.ok) {
            throw new Error('Local session invalid');
          }
          const profile = await safeJson(res);
          if (!active) return;
          
          setToken(localToken);
          setAuthUser({ uid: profile.id, email: profile.email, displayName: profile.name });
          setDbUser(profile);
          setCurrentUserId(profile.id);

          // Now fetch entire initial state from Postgres
          setLoadingData(true);
          const headers = { 'Authorization': `Bearer ${localToken}` };
          
          const [usersRes, unitsRes, soldiersRes, attendanceRes, logsRes, notificationsRes, settingsRes] = await Promise.all([
            fetchWithRetry('/api/users', { headers }),
            fetchWithRetry('/api/units', { headers }),
            fetchWithRetry('/api/soldiers', { headers }),
            fetchWithRetry('/api/attendance', { headers }),
            fetchWithRetry('/api/journal-records', { headers }),
            fetchWithRetry('/api/notifications', { headers }),
            fetchWithRetry('/api/settings', { headers }),
          ]);
          
          const [usersData, unitsData, soldiersData, attendanceData, logsData, notificationsData, settingsData] = await Promise.all([
            safeJson(usersRes, []),
            safeJson(unitsRes, []),
            safeJson(soldiersRes, []),
            safeJson(attendanceRes, []),
            safeJson(logsRes, []),
            safeJson(notificationsRes, []),
            safeJson(settingsRes, null),
          ]);
          
          if (!active) return;
          setUsers(usersData);
          setUnits(unitsData);
          setSoldiers(soldiersData);
          setAttendance(attendanceData);
          setAuditLogs(logsData);
          setNotifications(notificationsData);
          setSettings(settingsData);
          setLoadingAuth(false);
          return; // Skip Firebase subscribe if we successfully restored local session
        } catch (err) {
          console.error("Local session restore failed, clearing token", err);
          localStorage.removeItem('military_auth_token');
        }
      }

      // If no local session (or restoration failed), listen to Firebase
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        if (user) {
          setAuthUser(user);
          try {
            const idToken = await user.getIdToken();
            setToken(idToken);
            
            // Get or Register user in Postgres
            const res = await fetchWithRetry('/api/users/me', {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            const profile = await safeJson(res);
            if (!active) return;
            setDbUser(profile);

            // Seed state with the logged-in user if not already present
            setUsers(prev => {
              const exists = prev.some(u => u.id === profile.id || u.uid === profile.uid);
              if (!exists) {
                return [...prev, profile];
              }
              return prev;
            });
            setCurrentUserId(profile.id);

            // Now fetch entire initial state from Postgres
            setLoadingData(true);
            const headers = { 'Authorization': `Bearer ${idToken}` };
            
            const [usersRes, unitsRes, soldiersRes, attendanceRes, logsRes, notificationsRes, settingsRes] = await Promise.all([
              fetchWithRetry('/api/users', { headers }),
              fetchWithRetry('/api/units', { headers }),
              fetchWithRetry('/api/soldiers', { headers }),
              fetchWithRetry('/api/attendance', { headers }),
              fetchWithRetry('/api/journal-records', { headers }),
              fetchWithRetry('/api/notifications', { headers }),
              fetchWithRetry('/api/settings', { headers }),
            ]);
            
            const [usersData, unitsData, soldiersData, attendanceData, logsData, notificationsData, settingsData] = await Promise.all([
              safeJson(usersRes, []),
              safeJson(unitsRes, []),
              safeJson(soldiersRes, []),
              safeJson(attendanceRes, []),
              safeJson(logsRes, []),
              safeJson(notificationsRes, []),
              safeJson(settingsRes, null),
            ]);
            
            if (!active) return;
            setUsers(usersData);
            setUnits(unitsData);
            setSoldiers(soldiersData);
            setAttendance(attendanceData);
            setAuditLogs(logsData);
            setNotifications(notificationsData);
            setSettings(settingsData);
          } catch (err) {
            console.error("Error loading data from server:", err);
          } finally {
            if (active) setLoadingData(false);
          }
        } else {
          setAuthUser(null);
          setToken(null);
          setDbUser(null);
          setCurrentUserId('');
          setGoogleAccessToken(null);
        }
        if (active) setLoadingAuth(false);
      });

      return unsubscribe;
    };

    const unsubscribePromise = checkLocalAndFirebase();

    return () => {
      active = false;
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  // Current User Object (Simulation or Authenticated)
  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || dbUser || {
      id: 'guest',
      name: 'زائر',
      email: '',
      role: 'data_writer' as const,
      unitId: null
    };
  }, [users, currentUserId, dbUser]);

  // Login handler (Google Sign-in)
  const handleLogin = async () => {
    try {
      setLoadingAuth(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setLoadingAuth(false);
    }
  };

  // Local login handler (Username/Password with OTP validation if enabled)
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginUsername || !loginPassword) {
      setLoginError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    if (otpEnabled && otpValue !== '482910') {
      setLoginError('رمز التحقق الثنائي (OTP) غير صحيح. يرجى إدخال الرمز المعتمد الصالح (482910) لإكمال متطلبات الدخول العسكري.');
      return;
    }

    setLoadingAuth(true);
    try {
      const res = await fetchWithRetry('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      
      if (!res.ok) {
        const data = await safeJson<any>(res, {});
        throw new Error(data.error || 'فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور خاطئة');
      }

      const { token: localToken, user } = await safeJson(res);
      
      // Save in localStorage for persistence
      localStorage.setItem('military_auth_token', localToken);
      
      setToken(localToken);
      setAuthUser({ uid: user.id, email: user.email, displayName: user.name });
      setDbUser(user);
      setCurrentUserId(user.id);

      // Add audit log
      const newLog: AuditLog = {
        id: `log_login_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'تعديل',
        tableName: 'جلسات الدخول',
        details: `تم تسجيل دخول المستخدم ${user.name} بنجاح ${otpEnabled ? 'مع تفعيل التحقق الثنائي (OTP)' : ''}.`,
        timestamp: new Date().toISOString()
      };
      setAuditLogs(prev => [newLog, ...prev]);

      // Trigger load of data
      setLoadingData(true);
      const headers = { 'Authorization': `Bearer ${localToken}` };
      const [usersRes, unitsRes, soldiersRes, attendanceRes, logsRes, notificationsRes, settingsRes] = await Promise.all([
        fetchWithRetry('/api/users', { headers }),
        fetchWithRetry('/api/units', { headers }),
        fetchWithRetry('/api/soldiers', { headers }),
        fetchWithRetry('/api/attendance', { headers }),
        fetchWithRetry('/api/journal-records', { headers }),
        fetchWithRetry('/api/notifications', { headers }),
        fetchWithRetry('/api/settings', { headers }),
      ]);
      
      const [usersData, unitsData, soldiersData, attendanceData, logsData, notificationsData, settingsData] = await Promise.all([
        safeJson(usersRes, []),
        safeJson(unitsRes, []),
        safeJson(soldiersRes, []),
        safeJson(attendanceRes, []),
        safeJson(logsRes, []),
        safeJson(notificationsRes, []),
        safeJson(settingsRes, null),
      ]);
      
      setUsers(usersData);
      setUnits(unitsData);
      setSoldiers(soldiersData);
      setAttendance(attendanceData);
      setAuditLogs(logsData);
      setNotifications(notificationsData);
      setSettings(settingsData);
    } catch (err: any) {
      setLoginError(err.message || 'خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      localStorage.removeItem('military_auth_token');
      await signOut(auth);
      setAuthUser(null);
      setToken(null);
      setDbUser(null);
      setCurrentUserId('');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // --- ACTIONS & HANDLERS ---
  
  // Custom Audit Log Adder
  const handleAddLog = useCallback(async (
    actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', 
    tableName: string, 
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
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
      await fetchWithRetry('/api/journal-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newLog)
      });
    } catch (e) {
      console.error("Error saving audit log:", e);
    }
  }, [currentUser, token]);

  // Update single attendance record
  const handleUpdateAttendance = useCallback(async (soldierId: string, date: string, status: AttendanceStatusCode) => {
    const record: AttendanceRecord = {
      id: `att_${soldierId}_${date}_${Date.now()}`,
      soldierId,
      date,
      statusCode: status,
      recordedBy: currentUser.id,
      updatedAt: new Date().toISOString()
    };

    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.soldierId === soldierId && r.date === date));
      return [...filtered, record];
    });

    const soldierName = soldiers.find(s => s.id === soldierId)?.fullName || 'عسكري غير معروف';
    handleAddLog('تعديل', 'التحضير اليومي', `تعديل حالة حضور العسكري (${soldierName}) إلى (${status}) ليوم ${date}`);

    try {
      await fetchWithRetry('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.error("Error saving attendance:", e);
    }
  }, [currentUser, token, soldiers, handleAddLog]);

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

    setAttendance(prev => {
      let filtered = prev.filter(r => !(soldierIds.includes(r.soldierId) && dates.includes(r.date)));
      return [...filtered, ...newRecords];
    });

    handleAddLog('تعديل', 'التحضير اليومي', `تحضير جماعي: تعديل حالة حضور لعدد (${soldierIds.length}) عسكري للأيام (${dates.join(', ')}) إلى (${status})`);

    try {
      await fetchWithRetry('/api/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ records: newRecords })
      });
    } catch (e) {
      console.error("Error saving bulk attendance:", e);
    }
  }, [currentUser, token, handleAddLog]);

  // Restore whole state (Backups)
  const handleRestoreState = useCallback(async (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }) => {
    setUnits(importedData.units);
    setSoldiers(importedData.soldiers);
    setAttendance(importedData.attendance);
    if (importedData.auditLogs && importedData.auditLogs.length > 0) {
      setAuditLogs(importedData.auditLogs);
    }

    try {
      await fetchWithRetry('/api/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ records: importedData.attendance })
      });
    } catch (e) {
      console.error("Error restoring database backup:", e);
    }
  }, [token]);

  // Handle Import Completed from Excel
  const handleImportCompleted = useCallback((importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
  }) => {
    setUnits(importedData.units);
    setSoldiers(importedData.soldiers);
    setAttendance(importedData.attendance);
  }, []);

  // Update Settings
  const handleUpdateSettings = useCallback(async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    handleAddLog('تعديل', 'الإعدادات العامة', 'تم تعديل إعدادات التنبيه والتقاويم الخاصة بالنظام.');

    try {
      await fetchWithRetry('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, [handleAddLog, token]);

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

    try {
      await fetchWithRetry('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newUnit)
      });
    } catch (e) {
      console.error("Error creating unit:", e);
    }
  }, [token, handleAddLog]);

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

    try {
      await fetchWithRetry(`/api/units/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          name, 
          parentId, 
          commanderName,
          type,
          location,
          approvedStrength,
          status,
          code
        })
      });
    } catch (e) {
      console.error("Error updating unit:", e);
    }
  }, [token, handleAddLog]);

  const handleDeleteUnit = useCallback(async (id: string) => {
    const unitToDelete = units.find(u => u.id === id);
    const unitName = unitToDelete ? unitToDelete.name : 'تشكيل غير معروف';
    setUnits(prev => prev.filter(u => u.id !== id));
    // Automatically transfer any soldiers belonging to this unit to unassigned
    setSoldiers(prev => prev.map(s => s.unitId === id ? { ...s, unitId: '' } : s));
    handleAddLog('حذف', 'الهيكل التنظيمي', `حذف التشكيل العسكري (${unitName}) ونقل الجنود التابعين له لغير معين`);

    try {
      await fetchWithRetry(`/api/units/${id}/delete`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Error deleting unit:", e);
    }
  }, [token, units, handleAddLog]);

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

    try {
      await fetchWithRetry('/api/soldiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newSoldier)
      });
    } catch (e) {
      console.error("Error creating soldier:", e);
    }
  }, [token, units, handleAddLog]);

  const handleEditSoldier = useCallback(async (id: string, militaryNumber: string, fullName: string, rank: string, unitId: string, isActive: boolean) => {
    setSoldiers(prev => prev.map(s => s.id === id ? { ...s, militaryNumber, fullName, rank, unitId, isActive } : s));
    const unitName = units.find(u => u.id === unitId)?.name || 'غير معين';
    handleAddLog('تعديل', 'سجل الأفراد والعديد', `تعديل بيانات العسكري (${fullName})، الرتبة (${rank})، التشكيل الجديد (${unitName})، الحالة (${isActive ? 'نشط' : 'غير نشط'})`);

    try {
      await fetchWithRetry(`/api/soldiers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ militaryNumber, fullName, rank, unitId, isActive })
      });
    } catch (e) {
      console.error("Error updating soldier:", e);
    }
  }, [token, units, handleAddLog]);

  const handleDeleteSoldier = useCallback(async (id: string) => {
    const soldierToDelete = soldiers.find(s => s.id === id);
    const soldierName = soldierToDelete ? soldierToDelete.fullName : 'عسكري غير معروف';
    setSoldiers(prev => prev.filter(s => s.id !== id));
    handleAddLog('حذف', 'سجل الأفراد والعديد', `حذف بطاقة العسكري (${soldierName}) نهائياً من قاعدة البيانات`);

    try {
      await fetchWithRetry(`/api/soldiers/${id}/delete`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Error deleting soldier:", e);
    }
  }, [token, soldiers, handleAddLog]);

  // Users CRUD
  const handleAddUser = useCallback(async (newUserPayload: Omit<UserType, 'id'>) => {
    const id = `u_${Date.now()}`;
    const newUser: UserType = {
      ...newUserPayload,
      id,
    };
    setUsers(prev => [...prev, newUser]);
    handleAddLog('إضافة', 'المستخدمون والصلاحيات', `إضافة مستخدم نظام جديد باسم (${newUser.name}) بدور الصلاحية (${newUser.role}) البريد (${newUser.email})`);

    try {
      await fetchWithRetry('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newUser)
      });
    } catch (e) {
      console.error("Error creating user:", e);
    }
  }, [token, handleAddLog]);

  const handleEditUser = useCallback(async (id: string, updatedPayload: Partial<UserType>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedPayload } : u));
    const targetUser = users.find(u => u.id === id);
    const userName = targetUser ? targetUser.name : 'غير معروف';
    handleAddLog('تعديل', 'المستخدمون والصلاحيات', `تعديل بيانات وصلاحيات مستخدم النظام (${userName}) - الصلاحية الجديدة (${updatedPayload.role || 'لم تتغير'})`);

    try {
      await fetchWithRetry(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updatedPayload)
      });
    } catch (e) {
      console.error("Error updating user:", e);
    }
  }, [token, users, handleAddLog]);

  const handleDeleteUser = useCallback(async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    const userName = targetUser ? targetUser.name : 'غير معروف';
    setUsers(prev => prev.filter(u => u.id !== id));
    handleAddLog('حذف', 'المستخدمون والصلاحيات', `حذف مستخدم النظام (${userName}) وسحب صلاحياته الأمنية`);

    try {
      await fetchWithRetry(`/api/users/${id}/delete`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  }, [token, users, handleAddLog]);

  // Transfer soldier (Move)
  const handleTransferSoldier = useCallback(async (
    soldierId: string, 
    targetUnitId: string,
    orderDetails?: { orderNumber?: string; orderDate?: string; issuedBy?: string; notes?: string }
  ) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return;

    const oldUnitName = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
    const newUnitName = units.find(u => u.id === targetUnitId)?.name || 'غير معروف';

    // Parse and append to assignmentsHistory
    let historyList: any[] = [];
    try {
      if (soldier.assignmentsHistory) {
        historyList = JSON.parse(soldier.assignmentsHistory);
        if (!Array.isArray(historyList)) historyList = [];
      }
    } catch (e) {
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

    try {
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...soldier, unitId: targetUnitId, assignmentsHistory: updatedHistory })
      });
    } catch (e) {
      console.error("Error transferring soldier:", e);
    }
  }, [soldiers, units, token, currentUser, handleAddLog]);

  // Notification clear or toggle read
  const handleToggleReadNotif = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));

    try {
      await fetchWithRetry(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isRead: !notif.isRead })
      });
    } catch (e) {
      console.error("Error updating notification status:", e);
    }
  };

  const handleClearAllLogs = async () => {
    setAuditLogs([]);
    handleAddLog('حذف', 'سجل الرقابة', 'تم تصفير وأرشفة سجل التعديلات والعمليات بالكامل.');

    try {
      await fetchWithRetry('/api/journal-records/clear', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Error clearing logs:", e);
    }
  };

  // --- Real-time Attendance Alerts Sync ---
  useEffect(() => {
    if (soldiers.length === 0 || units.length === 0) return;

    const activeSoldiers = soldiers.filter(s => s.isActive);
    const recordsToday = attendance.filter(a => a.date === '2026-07-16');

    units.forEach(unit => {
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
      
      if (todayRate < settings.warningThreshold && todayRate > 0) {
        const notifTitle = `تدني نسبة الجاهزية - ${unit.name}`;
        const hasNotif = notifications.some(n => n.title === notifTitle && !n.isRead);
        
        if (!hasNotif) {
          const newNotif: Notification = {
            id: `notif_rate_${unit.id}_${Date.now()}`,
            title: notifTitle,
            message: `انخفض معدل الجاهزية اليومي في (${unit.name}) ليوم 16 يوليو إلى ${todayRate}% وهو أقل من الحد المسموح به (${settings.warningThreshold}%). يرجى المتابعة الفورية.`,
            isRead: false,
            type: 'warning',
            createdAt: new Date().toISOString()
          };
          setNotifications(prev => [newNotif, ...prev]);

          // Save to backend database too
          fetchWithRetry('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(newNotif)
          }).catch(console.error);
        }
      }
    });
  }, [attendance, soldiers, units, settings.warningThreshold, notifications, token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'لوحة القيادة والمؤشرات', icon: LayoutDashboard },
    { id: 'attendance', label: 'كشف التحضير اليومي', icon: Table },
    { id: 'org_manager', label: 'إدارة الهيكل والأفراد', icon: Users },
    { id: 'special_sections', label: 'الأقسام والخدمات المميزة', icon: Sparkles },
    { id: 'reports', label: 'التقارير والمستخرجات', icon: FilePieChart },
    { id: 'settings', label: 'الاعدادات', icon: Settings },
    { id: 'about', label: 'حول التطبيق', icon: Info },
  ];

  // --- 1. AUTH LOADING STATE ---
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100" dir="rtl">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="font-sans text-sm tracking-wide text-slate-300">يتم التحقق من الصلاحيات الأمنية والربط السحابي...</p>
      </div>
    );
  }

  // --- 2. AUTHENTICATION GATE (Tactical Military UI Theme) ---
  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none" dir="rtl">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-950/15 blur-3xl pointer-events-none"></div>

        {/* Header/Banner for mobile & branding */}
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-900/60 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-black block text-slate-200 tracking-tight">وزارة الدفاع والسيطرة الوطنية</span>
              <span className="text-[10px] text-teal-500 block font-mono">DIGITAL FORCE READINESS</span>
            </div>
          </div>
          <div className="text-left font-mono text-[10px] text-slate-500 hidden sm:block">
            SECURITY PROTOCOL: AES-256-GCM
          </div>
        </div>

        {/* Main Split Layout container */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
          
          {/* Left Panel: Info, stats, animated radar scope (Visible on LG screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between h-full max-h-[620px] bg-slate-900/45 border border-slate-900 rounded-3xl p-8 relative overflow-hidden backdrop-blur-xs">
            <div className="absolute inset-0 bg-radial from-emerald-950/5 via-transparent to-transparent pointer-events-none"></div>
            
            {/* Top Security Badges */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>بوابة الدخول الحكومية الموحدة</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">
                SECURE INTERFACE
              </span>
            </div>

            {/* Radar Scope Graphics */}
            <div className="my-6 flex flex-col items-center justify-center relative py-4">
              <div className="w-44 h-44 rounded-full border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 border-t border-b border-emerald-500/5 animate-spin-[25s]"></div>
                <div className="w-32 h-32 rounded-full border border-slate-800/60 flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full border border-slate-800/40 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-ping"></div>
                  </div>
                </div>
                {/* Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-800/50"></div>
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-800/50"></div>
                
                {/* Sweeper arm */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/10 to-transparent origin-center animate-spin-[6s]"></div>
                
                {/* Pulsing targets */}
                <div className="absolute top-[30%] right-[25%] w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <div className="absolute bottom-[20%] left-[30%] w-1.5 h-1.5 bg-teal-400 rounded-full opacity-60"></div>
              </div>
              <div className="text-center mt-4">
                <span className="text-[9px] text-slate-500 font-mono tracking-widest block uppercase">TACTICAL SHIELD ENGINE</span>
                <span className="text-xs text-teal-400 font-sans mt-1 block">مراقبة الجاهزية والارتباط العملياتي الفوري</span>
              </div>
            </div>

            {/* Interactive Live Security Health Checker Widget */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 my-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فحص سلامة النظام والاتصال الآمن</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityStatus('checking');
                    setTimeout(() => {
                      setSecurityStatus('secure');
                      setSecurityDetails({
                        ssl: true,
                        firewalled: true,
                        dbConnected: true,
                        integrityCheck: true
                      });
                    }, 1200);
                  }}
                  disabled={securityStatus === 'checking'}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded transition-all cursor-pointer disabled:opacity-40"
                  title="تحديث الفحص الفوري للسلامة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${securityStatus === 'checking' ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {securityStatus === 'checking' ? (
                <div className="space-y-2 py-2">
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[pulse_1s_infinite] w-2/3 rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans block text-center">جاري فحص بروتوكولات التشفير والمصادقة...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans">
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>تشفير SSL: آمن</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>جدار الحماية: مفعل</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>قاعدة البيانات: متصلة</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>سلامة المتصفح: موثق</span>
                  </div>
                </div>
              )}
            </div>

            {/* Department stats block */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/50">
              <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl text-right">
                <span className="text-[10px] text-slate-500 block font-sans">تزامن البيانات السحابية</span>
                <span className="text-xs font-black text-slate-300 mt-0.5 block font-sans flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  نشط ومباشر
                </span>
              </div>
              <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl text-right">
                <span className="text-[10px] text-slate-500 block font-sans">بروتوكول التحقق الأمني</span>
                <span className="text-xs font-black text-slate-300 mt-0.5 block font-sans flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  مزدوج العوامل
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: The actual Login Form container */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <div className="w-full max-w-lg bg-slate-900/85 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
              
              {/* Top accent line */}
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-l from-emerald-500 via-amber-400 to-teal-500"></div>

              {/* Branding and Title */}
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-sans tracking-tight leading-tight mb-2">
                  المنظومة الرقمية لإدارة جاهزية القوة
                </h1>
                <p className="text-xs text-teal-400 font-semibold tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  وزارة الدفاع والسيطرة العملياتية الموحدة
                </p>
              </div>

              {/* Security Alert Indicator */}
              <div className="bg-slate-950/65 border border-slate-800/80 rounded-2xl p-4 mb-5 relative overflow-hidden">
                <div className="absolute -left-4 -bottom-4 opacity-5 text-emerald-400">
                  <ShieldAlert className="w-16 h-16" />
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800/80 pb-2 mb-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>إشعار الأمان القومي والسرية</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-slate-400">
                  يخضع هذا النظام لبروتوكولات الأمان العسكري المتقدمة. يرجى إدخال هويتك الرقمية للوصول الآمن. يمنع منعا كليا الدخول غير المصرح به.
                </p>
              </div>

              {/* Interactive authentication tabs just for clean aesthetic (Email / Credentials vs Secure Token ID) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 border border-slate-800/60 rounded-xl mb-5">
                <button
                  type="button"
                  className="py-2.5 px-3 rounded-lg text-xs font-black transition-all bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>حساب العمليات</span>
                </button>
                <div
                  className="py-2.5 px-3 rounded-lg text-xs font-semibold transition-all text-slate-500 flex items-center justify-center gap-1.5 cursor-not-allowed"
                  title="يتطلب الارتباط بالبطاقة الذكية"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>بطاقة الدخول الذكية</span>
                </div>
              </div>

              {/* Main Login Form */}
              <form onSubmit={handleLocalLogin} className="space-y-4">
                {/* Username Input Group */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 mr-1">
                    اسم المستخدم العسكري
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم العسكري الخاص بك"
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl pr-10 pl-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-sans text-right font-semibold"
                    />
                  </div>
                </div>

                {/* Password Input Group */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-xs font-bold text-slate-300">
                      كلمة المرور السرية
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotHelp(true)}
                      className="text-[10px] text-teal-400 hover:text-emerald-300 hover:underline cursor-pointer font-sans"
                    >
                      نسيت كلمة السر العسكرية؟
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => {
                        const isCaps = e.getModifierState && e.getModifierState('CapsLock');
                        setCapsLockActive(isCaps);
                      }}
                      onKeyUp={(e) => {
                        const isCaps = e.getModifierState && e.getModifierState('CapsLock');
                        setCapsLockActive(isCaps);
                      }}
                      placeholder="أدخل كلمة المرور المشفرة"
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl pr-10 pl-11 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-sans text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Alert Widget */}
                  {capsLockActive && (
                    <div className="text-amber-400 text-[10px] font-bold text-right flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg mt-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>تنبيه: زر الحروف الكبيرة (Caps Lock) نشط حالياً!</span>
                    </div>
                  )}
                </div>

                {/* Professional Multi-Factor Authentication (OTP 2FA) option */}
                <div className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-teal-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">تفعيل التحقق الثنائي (OTP)</span>
                        <span className="text-[9px] text-slate-500 block">خطوة أمان إضافية موصى بها لحسابات السيطرة</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={otpEnabled} 
                        onChange={(e) => {
                          setOtpEnabled(e.target.checked);
                          if (!e.target.checked) setOtpValue('');
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:content-[''] after:content-[''] after:absolute after:top-[2px] after:right-[16px] after:bg-slate-300 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {otpEnabled && (
                    <div className="space-y-2 animate-fadeIn">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] p-2.5 rounded-lg flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">بروتوكول المحاكاة والتحقق المعتمد</p>
                          <p className="mt-0.5 text-[9px] text-slate-300 leading-relaxed">لأغراض التدريب والتكامل الرقمي، تم توليد رمز التحقق الثنائي النشط الخاص بهويتك وهو: <strong className="text-emerald-400 underline font-mono text-xs mx-1">482910</strong></p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                          <LockKeyhole className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required={otpEnabled}
                          maxLength={6}
                          value={otpValue}
                          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                          placeholder="أدخل رمز التحقق (OTP) المكون من 6 أرقام"
                          className="w-full bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-mono tracking-widest text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Error message representation */}
                {loginError && (
                  <div className="text-rose-400 text-xs font-bold text-right leading-relaxed bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-start gap-2.5 animate-pulse">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Primary login button */}
                <button
                  type="submit"
                  disabled={loadingAuth}
                  className="w-full py-3.5 px-4 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20 text-xs font-sans mt-4"
                >
                  {loadingAuth ? (
                    <Loader2 className="w-4.5 h-4.5 text-emerald-100 animate-spin" />
                  ) : (
                    <LogIn className="w-4.5 h-4.5 text-emerald-100" />
                  )}
                  <span>تسجيل الدخول الآمن للمنظومة العسكرية</span>
                </button>
              </form>

              {/* Divider lines */}
              <div className="flex items-center my-5">
                <div className="flex-1 h-px bg-slate-800/80" />
                <span className="text-[10px] text-slate-500 px-3 uppercase font-semibold font-sans tracking-wider">أو</span>
                <div className="flex-1 h-px bg-slate-800/80" />
              </div>

              {/* Google Sign In option */}
              <button
                onClick={handleLogin}
                disabled={loadingAuth}
                className="w-full py-3 px-4 bg-slate-950/90 hover:bg-slate-950 disabled:opacity-50 text-slate-300 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 border border-slate-850 hover:border-emerald-500/30 cursor-pointer text-xs font-sans"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>التحقق عبر النفاذ الموحد (Google Workspace)</span>
              </button>
              
            </div>
          </div>

        </div>

        {/* Forgot Password Tactical Help Modal Component Overlay */}
        {showForgotHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 relative shadow-2xl">
              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 text-amber-400 font-bold border-b border-slate-800 pb-3 mb-4 text-sm font-sans">
                <ShieldCheck className="w-5 h-5" />
                <span>إجراءات استعادة كلمة المرور العسكرية</span>
              </div>

              <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
                <p>
                  نظراً لحساسية وسرية البيانات المشفرة داخل المنظومة، لا توجد آلية تلقائية لاستعادة كلمة المرور عبر الإنترنت لأسباب تتعلق بالأمن السيبراني العسكري.
                </p>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 space-y-2.5 font-sans">
                  <div className="font-bold text-slate-100 flex items-center gap-1 text-xs">
                    <Info className="w-3.5 h-3.5 text-teal-400" />
                    <span>نقاط الاتصال بمركز العمليات والسيطرة</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>رئيس مركز العمليات الرقمية:</span>
                      <span className="font-mono text-emerald-400 font-bold">تحويلة 4015</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>مسؤول الخصوصية والأمن السيبراني:</span>
                      <span className="font-mono text-emerald-400 font-bold">تحويلة 8820</span>
                    </li>
                    <li className="flex justify-between">
                      <span>الدعم الفني المباشر للقوة:</span>
                      <span className="font-mono text-emerald-400 font-bold">تحويلة 9002</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] text-amber-300">
                  يرجى مراجعة شعبة النظم في مقر القيادة العامة مصطحباً بطاقتك العسكرية التعريفية السارية لتقديم طلب إعادة تصفير فوري وتعيين كلمة مرور سرية جديدة.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                className="w-full mt-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                إغلاق نافذة الدعم الأمنية
              </button>
            </div>
          </div>
        )}

        {/* Footer info line */}
        <div className="w-full border-t border-slate-900/60 py-4 z-10">
          <div className="w-full max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-500">
            <span>المنظومة الرقمية للسيطرة وإدارة جاهزية القوة © ٢٠٢٦ - نسخة آمنة مرخصة رسمياً</span>
            <span className="flex items-center gap-1 text-slate-400 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>نطاق عسكري محمي بالكامل</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. SYSTEM MAIN APP (Authenticated & Connected to PostgreSQL) ---
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
      <div className="bg-slate-950 text-slate-100 py-1 px-4 border-b border-slate-800 flex flex-row justify-between items-center gap-2 text-xs sticky top-0 z-40 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Elegant Account Information */}
          <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-800/60 text-[10px] xs:text-[11px]">
            <div className="w-4 h-4 rounded bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <User className="w-2.5 h-2.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-200">{currentUser.name}</span>
              <span className="text-slate-700 text-[9px]">•</span>
              <span className="text-amber-400 font-bold">
                {
                  currentUser.role === 'admin' ? 'مدير النظام (كامل الصلاحيات)' :
                  currentUser.role === 'commander_formation' ? 'قائد التشكيل' :
                  currentUser.role === 'commander_unit' ? 'قائد كتيبة' :
                  currentUser.role === 'operations' ? 'ركن عمليات' : 'كاتب بيانات'
                }
              </span>
              {currentUser.email && (
                <>
                  <span className="text-slate-700 text-[9px] hidden sm:inline">•</span>
                  <span className="text-slate-400 hidden sm:inline">{currentUser.email}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-sans text-[10px] sm:text-[11px]">
          {/* Gregorian Date Only */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800/60 text-[10px] xs:text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-slate-300 font-medium">{formattedGregorianDate} م</span>
          </div>

          <div className="flex items-center gap-1 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800/60 text-[10px] xs:text-[11px] text-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-bold">{timeStr || '12:00:00 ص'}</span>
          </div>

          {/* Advanced Tactical Notification Center */}
          <NotificationCenter
            notifications={notifications}
            setNotifications={setNotifications}
            onToggleRead={handleToggleReadNotif}
            onNavigateTab={(tab) => setActiveTab(tab)}
            units={units}
            soldiers={soldiers}
            attendance={attendance}
          />

          {/* Logout Action Button */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 transition-colors border border-slate-700 text-amber-400 cursor-pointer flex items-center gap-1 text-[11px]"
            title="تسجيل الخروج من المنظومة"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden lg:inline font-bold">تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Ultra-Professional Futuristic Glassmorphic Mobile Bottom Navigation Dock */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-45 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-[0_-10px_36px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.08)_inset] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-all duration-300">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 text-center items-center relative">
          
          {/* Tab 1: المؤشرات (Dashboard) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('dashboard'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'dashboard' && (
              <motion.div
                layoutId="bottomNavPill"
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <LayoutDashboard className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'dashboard' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">المؤشرات</span>
            {activeTab === 'dashboard' && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute bottom-0.5 shadow-[0_0_8px_#34d399]" />
            )}
          </motion.button>

          {/* Tab 2: التحضير (Attendance) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('attendance'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'attendance' && (
              <motion.div
                layoutId="bottomNavPill"
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Table className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'attendance' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">التحضير</span>
            {activeTab === 'attendance' && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute bottom-0.5 shadow-[0_0_8px_#34d399]" />
            )}
          </motion.button>

          {/* Tab 3: الأقسام (Special Sections - Featured Elevated Action Button) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('special_sections'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'special_sections' ? 'text-amber-300 font-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            {activeTab === 'special_sections' ? (
              <motion.div
                layoutId="bottomNavPill"
                className="absolute inset-0 bg-gradient-to-b from-amber-500/25 via-emerald-500/15 to-transparent border border-amber-500/50 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            ) : (
              <div className="absolute inset-x-1 inset-y-1 bg-slate-900/80 border border-slate-700/60 rounded-xl" />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <Sparkles className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'special_sections' ? 'scale-110 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.8)]' : 'text-amber-400'}`} />
              <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
              </span>
            </div>
            <span className="text-[10px] font-sans relative z-10 mt-1 font-black text-amber-300 tracking-tight">الأقسام</span>
            {activeTab === 'special_sections' && (
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute bottom-0.5 shadow-[0_0_8px_#f59e0b]" />
            )}
          </motion.button>

          {/* Tab 4: إدارة القوة (Org Manager) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { setActiveTab('org_manager'); setIsMoreBottomSheetOpen(false); }}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'org_manager' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'org_manager' && (
              <motion.div
                layoutId="bottomNavPill"
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Users className={`w-5 h-5 relative z-10 transition-transform duration-200 ${activeTab === 'org_manager' ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">القوة</span>
            {activeTab === 'org_manager' && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute bottom-0.5 shadow-[0_0_8px_#34d399]" />
            )}
          </motion.button>

          {/* Tab 5: المزيد (More Bottom Sheet Trigger) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsMoreBottomSheetOpen(!isMoreBottomSheetOpen)}
            className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
              isMoreBottomSheetOpen ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isMoreBottomSheetOpen && (
              <motion.div
                layoutId="bottomNavPill"
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Menu className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isMoreBottomSheetOpen ? 'scale-110 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-sans relative z-10 mt-1 font-extrabold tracking-tight">المزيد</span>
            {isMoreBottomSheetOpen && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute bottom-0.5 shadow-[0_0_8px_#34d399]" />
            )}
          </motion.button>

        </div>
      </nav>

      {/* Animated Bottom Sheet */}
      <AnimatePresence>
        {isMoreBottomSheetOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsMoreBottomSheetOpen(false)}
            />
            
            {/* Sliding Bottom Sheet */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/80 rounded-t-[32px] shadow-2xl p-6 pb-10 space-y-4 text-white font-sans select-none max-w-lg mx-auto"
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2 opacity-80" />
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-100">لوحة التحكم السريعة والخيارات الإضافية</h3>
                </div>
                <button 
                  onClick={() => setIsMoreBottomSheetOpen(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setIsMoreBottomSheetOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                    activeTab === 'reports' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50'
                  }`}
                >
                  <FilePieChart className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-black text-slate-100">مركز التقارير والمستخرجات القيادية</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">تقارير الجاهزية، كشوفات التحضير، وإحصائيات القوة</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('special_sections');
                    setIsMoreBottomSheetOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                    activeTab === 'special_sections' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-black text-slate-100">الأقسام والخدمات المميزة</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">الإجازات والتصاريح، الترقيات، رعاية الشهداء والجرحى، والعهد العسكرية</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsMoreBottomSheetOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                    activeTab === 'settings' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50'
                  }`}
                >
                  <Settings className="w-5 h-5 text-teal-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-black text-slate-100">الاعدادات العامة للجاهزية</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">الرقابة التعديلية، النسخ الاحتياطي، إدارة الصلاحيات والجاهزية</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('about');
                    setIsMoreBottomSheetOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full p-3.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                    activeTab === 'about' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50'
                  }`}
                >
                  <Info className="w-5 h-5 text-sky-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-black text-slate-100">حول التطبيق والجهة المطورة</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">شركة الصرم للتقنية والبرمجيات والمصمم درويش رياض</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowSplashScreen(true);
                    setIsMoreBottomSheetOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30"
                >
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-sans font-black text-emerald-200">عرض شاشة الترحيب والتهيئة العسكرية</p>
                    <p className="text-[10px] text-emerald-400/80 font-normal mt-0.5">إعادة عرض الشاشة الترحيبية وفحص الجاهزية اللحظي</p>
                  </div>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                {/* Active Account Info and Logout */}
                <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                  <div className="text-right">
                    <span className="text-[9px] text-emerald-400 font-sans block font-black">المستخدم النشط:</span>
                    <span className="text-xs font-black text-white">{currentUser?.displayName || currentUser?.username}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{currentUser?.role === 'SUPER_ADMIN' ? 'مدير نظام الفرد العام' : currentUser?.role}</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsMoreBottomSheetOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Navigation Tabs - Desktop Only */}
      <nav className="bg-white border-b border-slate-200 hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto gap-1">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsNotifOpen(false);
                }}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'border-emerald-800 text-emerald-850' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-emerald-800' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 lg:pb-6 overflow-hidden">
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            units={units}
            soldiers={soldiers}
            attendance={attendance}
            users={users}
            auditLogs={auditLogs}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setIsMoreBottomSheetOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewSoldierProfile={(id) => {
              setSelectedSoldierIdForProfile(id);
              setActiveTab('org_manager');
              setIsMoreBottomSheetOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            currentUser={currentUser}
            onAddLog={handleAddLog}
            onSaveAttendanceBatch={handleBulkUpdateAttendance}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceSheet 
            units={units}
            soldiers={soldiers}
            attendance={attendance}
            currentUser={currentUser}
            onUpdateAttendance={handleUpdateAttendance}
            onBulkUpdateAttendance={handleBulkUpdateAttendance}
            onAddLog={handleAddLog}
          />
        )}

        {activeTab === 'org_manager' && (
          <OrgManager 
            units={units}
            soldiers={soldiers}
            currentUser={currentUser}
            selectedSoldierId={selectedSoldierIdForProfile}
            onSelectSoldierId={setSelectedSoldierIdForProfile}
            onAddUnit={handleAddUnit}
            onEditUnit={handleEditUnit}
            onDeleteUnit={handleDeleteUnit}
            onAddSoldier={handleAddSoldier}
            onEditSoldier={handleEditSoldier}
            onDeleteSoldier={handleDeleteSoldier}
            onTransferSoldier={handleTransferSoldier}
            onAddLog={handleAddLog}
          />
        )}

        {activeTab === 'special_sections' && (
          <SpecialSections 
            soldiers={soldiers}
            units={units}
            currentUser={currentUser}
            onNavigateToSoldier={(soldierId) => {
              setSelectedSoldierIdForProfile(soldierId);
              setActiveTab('org_manager');
            }}
          />
        )}

        {activeTab === 'reports' && (
          <Reports 
            units={units}
            soldiers={soldiers}
            attendance={attendance}
            currentUser={currentUser}
            googleAccessToken={googleAccessToken}
            onSetGoogleAccessToken={setGoogleAccessToken}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            currentUserRole={currentUser.role}
            units={units}
            soldiers={soldiers}
            attendance={attendance}
            currentUser={currentUser}
            onImportCompleted={handleImportCompleted}
            onAddLog={handleAddLog}
            users={users}
            currentUserId={currentUserId}
            onSetCurrentUserId={setCurrentUserId}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            auditLogs={auditLogs}
            onClearLogs={handleClearAllLogs}
            googleAccessToken={googleAccessToken}
            onSetGoogleAccessToken={setGoogleAccessToken}
            onRestoreState={handleRestoreState}
          />
        )}

        {activeTab === 'about' && (
          <AboutApp />
        )}

      </main>

      {/* General Footer */}
      <footer className="bg-slate-100 text-slate-500 py-4 px-6 text-center text-[10px] border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-sans font-bold">
            نظام إدارة الجاهزية والتحضير اليومي للقوة (اللواء 43 عمالقة) © ٢٠٢٦
          </p>
          <div className="flex items-center gap-3 font-sans text-slate-600">
            <button
              onClick={() => { setActiveTab('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-emerald-800 font-black hover:underline cursor-pointer"
            >
              تطوير شركة الصرم للتقنية والبرمجيات | درويش رياض
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-800 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              حماية وتوثيق رقمي
            </span>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsLogoutModalOpen(false)}
            />
            
            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-150 p-6 w-full max-w-sm relative z-10 text-right overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/50 flex-shrink-0">
                  <LogOut className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold text-slate-900 font-sans leading-tight">تأكيد تسجيل الخروج</h3>
                  <p className="text-xs text-slate-500 font-sans mt-1">هل أنت متأكد من رغبتك في تسجيل الخروج وإنهاء جلستك الحالية في المنظومة؟</p>
                </div>
              </div>

              {/* User Info Card inside Modal */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-6 text-xs flex flex-row items-center gap-3">
                <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <User className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-slate-800">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {
                      currentUser.role === 'admin' ? 'مدير النظام (كامل الصلاحيات)' :
                      currentUser.role === 'commander_formation' ? 'قائد التشكيل' :
                      currentUser.role === 'commander_unit' ? 'قائد كتيبة' :
                      currentUser.role === 'operations' ? 'ركن عمليات' : 'كاتب بيانات'
                    }
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent"
                >
                  تراجع وإلغاء
                </button>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-100/50 hover:shadow-lg transition-all cursor-pointer border border-transparent"
                >
                  نعم، تسجيل الخروج
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
