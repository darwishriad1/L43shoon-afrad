import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  KeyRound, 
  UserPlus, 
  Smartphone, 
  ShieldAlert, 
  History, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Clock, 
  Globe, 
  Laptop, 
  Zap, 
  Sliders, 
  UserCheck, 
  Check, 
  ArrowLeftRight, 
  Calendar,
  AlertTriangle,
  Fingerprint,
  RotateCcw,
  Plus,
  Compass,
  FileText,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { Unit, User, UserRole } from '../types';

interface UsersPermissionsManagerProps {
  users: User[];
  units: Unit[];
  currentUser: any;
  onAddUser: (user: any) => Promise<void>;
  onEditUser: (id: string, updatedPayload: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

// Initial Permission Types
interface PermissionMatrix {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  revokeApprove: boolean;
  print: boolean;
  export: boolean;
  import: boolean;
  share: boolean;
  attachmentsUpload: boolean;
  attachmentsDownload: boolean;
  manageSettings: boolean;
}

interface AdvancedRole {
  id: string;
  name: string;
  key: string;
  description: string;
  permissions: { [section: string]: PermissionMatrix };
  isDefault: boolean;
  isSystem: boolean;
  scope: 'all' | 'formation' | 'unit_only';
}

interface TemporaryDelegation {
  id: string;
  fromUserId: string;
  toUserId: string;
  startDate: string;
  endDate: string;
  permissions: string[];
  status: 'active' | 'scheduled' | 'expired' | 'revoked';
}

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  ip: string;
  location: string;
  loginTime: string;
  status: 'active' | 'blocked';
}

export default function UsersPermissionsManager({
  users,
  units,
  currentUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onAddLog
}: UsersPermissionsManagerProps) {
  // Current tab state
  const [activeTab, setActiveTab] = useState<'menu' | 'dashboard' | 'users' | 'roles' | 'delegation' | 'sessions' | 'policies' | 'monitoring'>('menu');

  // Interactive local states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Security policies state
  const [policies, setPolicies] = useState({
    passwordMinLength: 8,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
    failedAttemptsLockout: 3,
    autoTimeoutMinutes: 15,
    twoFactorAuth: false,
    preventConcurrentLogins: true,
    trustedIpsOnly: false,
    trustedIpsList: '10.100.*.*, 192.168.1.50',
    periodicReviewMonths: 3
  });

  // Notifications or alert state
  const [securityAlerts, setSecurityAlerts] = useState([
    { id: '1', type: 'warning', title: 'محاولة دخول فاشلة متكررة', user: 'katib_04', ip: '10.100.12.44', time: 'منذ دقيقة', status: 'checked' },
    { id: '2', type: 'error', title: 'تعديل صلاحيات غير مصرح به', user: 'admin_test', ip: '192.168.1.112', time: 'منذ ١٥ دقيقة', status: 'flagged' },
    { id: '3', type: 'info', title: 'تصدير كشف القوات العام', user: 'captain_khaled', ip: '10.100.2.19', time: 'منذ ساعة', status: 'checked' }
  ]);

  // Temporary delegations mock list
  const [delegations, setDelegations] = useState<TemporaryDelegation[]>([
    {
      id: 'del_1',
      fromUserId: users[0]?.id || 'u_admin',
      toUserId: users[1]?.id || 'u_ops',
      startDate: '2026-07-17',
      endDate: '2026-07-24',
      permissions: ['view', 'add', 'approve'],
      status: 'active'
    }
  ]);

  // Active connected devices list
  const [sessions, setSessions] = useState<ActiveSession[]>([
    { id: 'sess_1', userId: currentUser?.id || '1', userName: currentUser?.name || 'مدير النظام', deviceName: 'Station 4-Main Terminal', deviceType: 'desktop', os: 'RHEL (Red Hat Enterprise Linux)', browser: 'Firefox 118', ip: '10.100.1.15', location: 'مركز القيادة الرئيسي', loginTime: '٢٠٢٦/٠٧/١٧ ١٠:٢٤ ص', status: 'active' },
    { id: 'sess_2', userId: 'usr_2', userName: 'رائد عدي بن حاتم', deviceName: 'Commander-Tab-LTE', deviceType: 'tablet', os: 'Android 14 Secure', browser: 'Chrome Mobile Secure', ip: '10.100.22.4', location: 'ميدان تدريب اللواء الثالث', loginTime: '٢٠٢٦/٠٧/١٧ ١١:٠٥ ص', status: 'active' },
    { id: 'sess_3', userId: 'usr_3', userName: 'ملازم أول خالد الشمري', deviceName: 'Field Notebook 12', deviceType: 'mobile', os: 'iOS 17 Secure Edition', browser: 'Safari Mobile', ip: '10.100.45.101', location: 'نقطة المراقبة المتقدمة', loginTime: '٢٠٢٦/٠٧/١٧ ٠٩:٤٠ ص', status: 'active' }
  ]);

  // System Security Rating Simulator
  const securityRating = useMemo(() => {
    let score = 65;
    if (policies.twoFactorAuth) score += 15;
    if (policies.preventConcurrentLogins) score += 10;
    if (policies.trustedIpsOnly) score += 10;
    if (policies.passwordMinLength >= 10) score += 5;
    if (policies.failedAttemptsLockout <= 3) score += 5;
    return Math.min(score, 100);
  }, [policies]);

  // Standard military permissions template
  const createEmptyPermissions = (val = false): PermissionMatrix => ({
    view: val, add: val, edit: val, delete: val, approve: val, revokeApprove: val,
    print: val, export: val, import: val, share: val, attachmentsUpload: val,
    attachmentsDownload: val, manageSettings: val
  });

  // Roles Matrix Store
  const [rolesList, setRolesList] = useState<AdvancedRole[]>([
    {
      id: 'role_admin',
      name: 'مدير النظام',
      key: 'admin',
      description: 'كامل الصلاحيات والسيطرة الأمنية والتقنية وتعديل الإعدادات والسياسات العامة لمختلف الوحدات.',
      permissions: {
        'التحضير': createEmptyPermissions(true),
        'الهيكل': createEmptyPermissions(true),
        'المستندات': createEmptyPermissions(true),
        'التقارير': createEmptyPermissions(true),
        'النظام': createEmptyPermissions(true),
      },
      isDefault: false,
      isSystem: true,
      scope: 'all'
    },
    {
      id: 'role_commander_formation',
      name: 'قائد التشكيل',
      key: 'commander_formation',
      description: 'صلاحيات المشاهدة العريضة لجميع الكتائب والألوية التابعة له واستخراج التقارير والجاهزية الدورية دون إمكانية التعديل المباشر.',
      permissions: {
        'التحضير': { ...createEmptyPermissions(false), view: true, print: true, export: true },
        'الهيكل': { ...createEmptyPermissions(false), view: true },
        'المستندات': { ...createEmptyPermissions(false), view: true, attachmentsDownload: true },
        'التقارير': { ...createEmptyPermissions(false), view: true, print: true, export: true },
        'النظام': createEmptyPermissions(false),
      },
      isDefault: false,
      isSystem: true,
      scope: 'formation'
    },
    {
      id: 'role_commander_unit',
      name: 'قائد كتيبة / وحدة فرعية',
      key: 'commander_unit',
      description: 'إشراف كامل وتعديل وتحضير لكتيبته أو وحدته العسكرية الخاصة فقط، وإجراء حركات النقل الداخلي للأفراد.',
      permissions: {
        'التحضير': { ...createEmptyPermissions(true), delete: false, manageSettings: false },
        'الهيكل': { ...createEmptyPermissions(false), view: true, add: true, edit: true },
        'المستندات': { ...createEmptyPermissions(true), delete: false },
        'التقارير': { ...createEmptyPermissions(true), manageSettings: false },
        'النظام': createEmptyPermissions(false),
      },
      isDefault: false,
      isSystem: true,
      scope: 'unit_only'
    },
    {
      id: 'role_operations',
      name: 'ركن عمليات',
      key: 'operations',
      description: 'رصد الجاهزية اليومية ومراجعة كشوفات الغياب والتحركات للأفراد لإحالتها للقيادة العليا.',
      permissions: {
        'التحضير': { ...createEmptyPermissions(false), view: true, print: true, export: true, share: true },
        'الهيكل': { ...createEmptyPermissions(false), view: true },
        'المستندات': { ...createEmptyPermissions(false), view: true },
        'التقارير': { ...createEmptyPermissions(false), view: true, print: true, export: true },
        'النظام': createEmptyPermissions(false),
      },
      isDefault: false,
      isSystem: true,
      scope: 'formation'
    },
    {
      id: 'role_data_writer',
      name: 'كاتب بيانات (تحضير)',
      key: 'data_writer',
      description: 'صلاحية إدخال التحضير والحضور اليومي للسرية أو الفصيلة المنسوبة له حصرياً.',
      permissions: {
        'التحضير': { ...createEmptyPermissions(false), view: true, add: true, edit: true },
        'الهيكل': createEmptyPermissions(false),
        'المستندات': { ...createEmptyPermissions(false), view: true, attachmentsUpload: true },
        'التقارير': { ...createEmptyPermissions(false), view: true },
        'النظام': createEmptyPermissions(false),
      },
      isDefault: true,
      isSystem: true,
      scope: 'unit_only'
    }
  ]);

  // State mapping for detailed user data
  const [extendedUsers, setExtendedUsers] = useState<{ [userId: string]: any }>(() => {
    const map: { [userId: string]: any } = {};
    users.forEach((u, idx) => {
      map[u.id] = {
        militaryNo: `١٠٠٢٣${idx + 4}`,
        rank: idx % 3 === 0 ? 'رائد' : idx % 3 === 1 ? 'نقيب' : 'ملازم أول',
        position: idx % 2 === 0 ? 'ركن شؤون عسكرية' : 'مدقق سجلات الحضور',
        department: 'ركن الأفراد والجاهزية',
        phone: '٠٥٠١٢٣٤٥٦' + idx,
        lastLogin: '٢٠٢٦/٠٧/١٧ ١١:١٩ ص',
        lastIp: '10.100.1.' + (20 + idx),
        lastDevice: 'Secure Station RHEL 9',
        status: idx === 3 ? 'suspended' : idx === 4 ? 'locked' : 'active',
        forcePasswordChange: idx % 4 === 0,
        email: u.email || `${u.username || 'user'}@military.local`,
      };
    });
    return map;
  });

  // User modal Form States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('data_writer');
  const [formUnitId, setFormUnitId] = useState('');
  const [formRank, setFormRank] = useState('رائد');
  const [formMilitaryNo, setFormMilitaryNo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formDepartment, setFormDepartment] = useState('إدارة القوة البشرية');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended' | 'locked'>('active');
  const [formForcePass, setFormForcePass] = useState(false);

  // Password Complexity Metrics calculation
  const passwordMetrics = useMemo(() => {
    if (!formPassword) {
      return { score: 0, length: false, number: false, special: false, upper: false, label: 'فارغ', color: 'bg-slate-200' };
    }
    const hasLength = formPassword.length >= policies.passwordMinLength;
    const hasNumber = /\d/.test(formPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(formPassword);
    const hasUpper = /[A-Z]/.test(formPassword);
    
    let points = 0;
    if (hasLength) points += 25;
    if (hasNumber) points += 25;
    if (hasSpecial) points += 25;
    if (hasUpper) points += 25;

    let label = 'ضعيف وغير آمن';
    let color = 'bg-rose-500';
    if (points === 50) {
      label = 'متوسط القوة';
      color = 'bg-amber-500';
    } else if (points === 75) {
      label = 'قوي ومقبول';
      color = 'bg-emerald-500';
    } else if (points === 100) {
      label = 'أمان عسكري فائق';
      color = 'bg-teal-600 animate-pulse';
    }

    return {
      score: points,
      length: hasLength,
      number: hasNumber,
      special: hasSpecial,
      upper: hasUpper,
      label,
      color
    };
  }, [formPassword, policies.passwordMinLength]);

  // Delegation modal form states
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delFrom, setDelFrom] = useState('');
  const [delTo, setDelTo] = useState('');
  const [delStart, setDelStart] = useState('2026-07-17');
  const [delEnd, setDelEnd] = useState('2026-07-24');
  const [delPermissionsSelected, setDelPermissionsSelected] = useState<string[]>(['view', 'add']);

  // Role Modal Edit/Copy Form States
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormScope, setRoleFormScope] = useState<'all' | 'formation' | 'unit_only'>('unit_only');
  const [roleFormPermissions, setRoleFormPermissions] = useState<{ [section: string]: PermissionMatrix }>({
    'التحضير': createEmptyPermissions(false),
    'الهيكل': createEmptyPermissions(false),
    'المستندات': createEmptyPermissions(false),
    'التقارير': createEmptyPermissions(false),
    'النظام': createEmptyPermissions(false)
  });

  // ---- PREMIUM ADDITIONAL SERVICES STATES ----
  // 1. Two-Factor Authentication (2FA) Simulator States
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState('');
  const [twoFactorCurrentCode, setTwoFactorCurrentCode] = useState('482915');
  const [twoFactorTimer, setTwoFactorTimer] = useState(30);

  // 2. Role Comparison Matrix Tool States
  const [isCompareRolesOpen, setIsCompareRolesOpen] = useState(false);
  const [compareRoleA, setCompareRoleA] = useState('admin');
  const [compareRoleB, setCompareRoleB] = useState('operations');

  // 3. IP Whitelist pattern validator
  const [testIpAddress, setTestIpAddress] = useState('');
  const [testIpResult, setTestIpResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  // 4. Print & Military Seal Audit Report States
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [printReportType, setPrintReportType] = useState<'audit' | 'sessions'>('audit');
  const [isReportSigned, setIsReportSigned] = useState(false);

  // 2FA code generator countdown logic
  useEffect(() => {
    let interval: any;
    if (isTwoFactorModalOpen) {
      interval = setInterval(() => {
        setTwoFactorTimer(prev => {
          if (prev <= 1) {
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            setTwoFactorCurrentCode(newCode);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTwoFactorModalOpen]);

  // Helper IP Pattern wildcards validator
  const testIpAgainstWhitelist = (ip: string, whitelistStr: string): { allowed: boolean; reason: string } => {
    if (!ip) return { allowed: false, reason: 'يرجى إدخال عنوان IP صالح.' };
    
    // Regular expression to check if it's a basic valid IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return { allowed: false, reason: 'صيغة عنوان IP غير صالحة. مثال: 10.100.1.15' };
    }

    const list = whitelistStr.split(',').map(s => s.trim());
    const matchedPattern = list.find(pattern => {
      const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexStr);
      return regex.test(ip);
    });

    if (matchedPattern) {
      return {
        allowed: true,
        reason: `مقبول ومطابق للنمط المحدد: ${matchedPattern}`
      };
    } else {
      return {
        allowed: false,
        reason: 'العنوان محظور! لا يتطابق مع أي من الأنماط المدرجة في القائمة البيضاء لشبكة اللواء.'
      };
    }
  };

  // Handler for opening user modal in creation mode
  const handleOpenAddUserModal = () => {
    setEditingUserId(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('data_writer');
    setFormUnitId('');
    setFormRank('رائد');
    setFormMilitaryNo(`١٠٠٢٣${users.length + 5}`);
    setFormPhone('٠٥٠١٢٣٤٥٦٧');
    setFormPosition('مسؤول إدخال بيانات');
    setFormDepartment('إدارة القوة البشرية');
    setFormStatus('active');
    setFormForcePass(false);
    setIsUserModalOpen(true);
  };

  // Handler for editing user
  const handleOpenEditUserModal = (user: User) => {
    const ext = extendedUsers[user.id] || {
      militaryNo: '١٠٠٢٣١', rank: 'رائد', position: 'مسؤول حضور', department: 'العمليات', phone: '050', lastIp: '10.100.1.1', status: 'active', forcePasswordChange: false
    };
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormUsername(user.username || '');
    setFormPassword('');
    setFormRole(user.role);
    setFormUnitId(user.unitId || '');
    setFormRank(ext.rank || 'رائد');
    setFormMilitaryNo(ext.militaryNo || '');
    setFormPhone(ext.phone || '');
    setFormPosition(ext.position || '');
    setFormDepartment(ext.department || 'إدارة القوة البشرية');
    setFormStatus(ext.status || 'active');
    setFormForcePass(ext.forcePasswordChange || false);
    setIsUserModalOpen(true);
  };

  // Submit User form
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername) {
      alert('الرجاء تعبئة البيانات المطلوبة');
      return;
    }

    try {
      if (editingUserId) {
        const payload = {
          name: formName,
          username: formUsername,
          role: formRole,
          unitId: ['commander_unit', 'data_writer'].includes(formRole) && formUnitId ? formUnitId : null,
          password: formPassword || undefined,
          email: formUsername.includes('@') ? formUsername : `${formUsername}@military.local`
        };
        await onEditUser(editingUserId, payload);
        
        // Update extended properties locally
        setExtendedUsers(prev => ({
          ...prev,
          [editingUserId]: {
            ...prev[editingUserId],
            militaryNo: formMilitaryNo,
            rank: formRank,
            position: formPosition,
            department: formDepartment,
            phone: formPhone,
            status: formStatus,
            forcePasswordChange: formForcePass
          }
        }));

        onAddLog('تعديل', 'إدارة الأمن العام', `تمت ترقية/تعديل الحساب العسكري التابع لـ: ${formName} بنجاح.`);
      } else {
        const payload = {
          name: formName,
          username: formUsername,
          role: formRole,
          unitId: ['commander_unit', 'data_writer'].includes(formRole) && formUnitId ? formUnitId : null,
          password: formPassword || 'Military1234!',
          email: formUsername.includes('@') ? formUsername : `${formUsername}@military.local`
        };
        await onAddUser(payload);
        
        // Save placeholder for new user in extended data
        const tempId = `u_${Date.now()}`; // approximate, will map upon database update
        setExtendedUsers(prev => ({
          ...prev,
          [tempId]: {
            militaryNo: formMilitaryNo,
            rank: formRank,
            position: formPosition,
            department: formDepartment,
            phone: formPhone,
            status: 'active',
            lastLogin: '-',
            lastIp: '-',
            lastDevice: '-',
            forcePasswordChange: formForcePass
          }
        }));

        onAddLog('إضافة', 'إدارة الأمن العام', `تم إنشاء مستخدم عسكري جديد باسم (${formName}) وصلاحية (${formRole}).`);
      }
      setIsUserModalOpen(false);
      alert('تم حفظ بيانات المستخدم بنجاح ومزامنة الهياكل الأمنية!');
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ المستخدم: ' + err.message);
    }
  };

  // Delete/Revoke user
  const handleDeleteUserClick = async (userId: string, userName: string) => {
    if (confirm(`هل أنت متأكد من رغبتك في سحب الترخيص الأمني وحذف المستخدم العسكري "${userName}" نهائياً من النظام؟`)) {
      try {
        await onDeleteUser(userId);
        onAddLog('حذف', 'إدارة الأمن العام', `تم إلغاء ترخيص وسحب صلاحيات المستخدم العسكري (${userName}) نهائياً.`);
        alert('تم حذف المستخدم وإلغاء هويته العسكرية بأمان.');
      } catch (err) {
        alert('حدث خطأ في عملية الحذف السحابية.');
      }
    }
  };

  // Filter and Search user logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const ext = extendedUsers[u.id] || {};
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ext.militaryNo || '').includes(searchTerm);
      
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      const matchesUnit = filterUnit === 'all' || u.unitId === filterUnit;
      const matchesStatus = filterStatus === 'all' || ext.status === filterStatus;

      return matchesSearch && matchesRole && matchesUnit && matchesStatus;
    });
  }, [users, extendedUsers, searchTerm, filterRole, filterUnit, filterStatus]);

  // Add Temporary Delegation
  const handleAddDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delFrom || !delTo) {
      alert('الرجاء اختيار المفوض والمفوض إليه للعملية العسكرية');
      return;
    }
    const newDel: TemporaryDelegation = {
      id: `del_${Date.now()}`,
      fromUserId: delFrom,
      toUserId: delTo,
      startDate: delStart,
      endDate: delEnd,
      permissions: delPermissionsSelected,
      status: 'active'
    };
    setDelegations(prev => [newDel, ...prev]);
    onAddLog('إضافة', 'التفويض العسكري', 'تم إصدار تفويض صلاحيات مؤقت في النظام.');
    setIsDelegationModalOpen(false);
    alert('تم تفعيل التفويض الأمني المؤقت بنجاح!');
  };

  // Revoke Delegation
  const handleRevokeDelegation = (id: string) => {
    setDelegations(prev => prev.map(d => d.id === id ? { ...d, status: 'revoked' } : d));
    onAddLog('تعديل', 'التفويض العسكري', 'تم إنهاء وسحب تفويض أمني مؤقت فورياً.');
    alert('تم إلغاء التفويض العسكري وإغلاق منافذ الصلاحية المستحدثة.');
  };

  // Active connected devices actions
  const handleTerminateSession = (id: string, name: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    onAddLog('تعديل', 'الجلسات والأجهزة', `تم إنهاء جلسة اتصال نشطة للجهاز (${name}) عن بعد.`);
    alert(`تم إنهاء الجلسة العسكرية للجهاز ${name} وفرض تسجيل الخروج.`);
  };

  const handleTerminateAllSessions = () => {
    if (confirm('هل ترغب في إنهاء كافة جلسات الاتصال النشطة فورياً (ما عدا محطتك الحالية)؟')) {
      setSessions(prev => prev.filter(s => s.userId === currentUser?.id));
      onAddLog('تعديل', 'الجلسات والأجهزة', 'تم إنهاء كافة جلسات الاتصال الخارجية وتصفير حارات البث.');
      alert('تم تصفير وإنهاء جميع الجلسات الخارجية بنجاح.');
    }
  };

  const handleBlockSessionDevice = (id: string, deviceName: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'blocked' ? 'active' : 'blocked' } : s));
    const isBlocking = sessions.find(s => s.id === id)?.status === 'active';
    onAddLog('تعديل', 'الجلسات والأجهزة', `تم ${isBlocking ? 'حظر وتجميد' : 'إعادة ترخيص'} جهاز مستخدم عسكري (${deviceName}).`);
    alert(`تم ${isBlocking ? 'حظر' : 'تنشيط'} الجهاز المسمى ${deviceName} في النظام.`);
  };

  // Copy Advanced Role
  const handleCopyRole = (role: AdvancedRole) => {
    const newRoleKey = `${role.key}_copy_${Date.now().toString().slice(-4)}`;
    const copied: AdvancedRole = {
      ...role,
      id: `role_${Date.now()}`,
      name: `${role.name} (نسخة معدلة)`,
      key: newRoleKey,
      isSystem: false,
      isDefault: false
    };
    setRolesList(prev => [...prev, copied]);
    onAddLog('إضافة', 'إدارة الأدوار والصلاحيات', `تم نسخ الدور العسكري (${role.name}) لإنشاء دور معدل.`);
    alert('تم نسخ الدور بنجاح، يمكنك الآن تعديله بشكل مستقل.');
  };

  // Edit Advanced Role Permission Handler
  const handleOpenRoleModal = (role: AdvancedRole) => {
    setEditingRoleKey(role.key);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setRoleFormScope(role.scope);
    setRoleFormPermissions(JSON.parse(JSON.stringify(role.permissions))); // deep copy
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName) return;

    setRolesList(prev => prev.map(r => {
      if (r.key === editingRoleKey) {
        return {
          ...r,
          name: roleFormName,
          description: roleFormDesc,
          scope: roleFormScope,
          permissions: roleFormPermissions
        };
      }
      return r;
    }));

    onAddLog('تعديل', 'إدارة الأدوار والصلاحيات', `تم تعديل وتثبيت الصلاحيات والهيكل الإداري للدور (${roleFormName}).`);
    setIsRoleModalOpen(false);
    alert('تم حفظ وتحديث مصفوفة الصلاحيات فورياً لجميع المنتسبين للدور!');
  };

  const toggleFormPermissionCell = (section: string, action: keyof PermissionMatrix) => {
    setRoleFormPermissions(prev => {
      const copy = { ...prev };
      copy[section] = {
        ...copy[section],
        [action]: !copy[section][action]
      };
      return copy;
    });
  };

  const setAllPermissionsInForm = (section: string, value: boolean) => {
    setRoleFormPermissions(prev => {
      const copy = { ...prev };
      copy[section] = createEmptyPermissions(value);
      return copy;
    });
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl" id="iam_main_panel">
      {/* Launcher Grid & Responsive Navigation Switcher */}
      {activeTab !== 'menu' && (
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/75 border border-slate-250 p-3.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-3xs"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            <span>العودة لشبكة الصلاحيات الرئيسية</span>
          </button>
          
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'dashboard', label: 'لوحة القيادة', icon: Sliders },
              { id: 'users', label: 'حسابات القوة', icon: Users },
              { id: 'roles', label: 'الأدوار والصلاحيات', icon: KeyRound },
              { id: 'delegation', label: 'التفويض المؤقت', icon: ArrowLeftRight },
              { id: 'sessions', label: 'الجلسات والأجهزة', icon: Smartphone },
              { id: 'policies', label: 'سياسات الأمان', icon: ShieldAlert },
              { id: 'monitoring', label: 'مركز المراقبة', icon: History }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive 
                      ? 'border-emerald-200 bg-emerald-500 text-white font-extrabold shadow-3xs' 
                      : 'border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setTwoFactorInputCode('');
                setIsTwoFactorModalOpen(true);
              }}
              className={`px-3 py-2 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer mr-2 ${
                policies.twoFactorAuth 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{policies.twoFactorAuth ? '2FA: مفعلة' : 'تمكين 2FA'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Launcher Grid - HIGH FIDELITY DESIGN matching Indicators Dashboard */}
      {activeTab === 'menu' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/85 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-10 opacity-40"></div>
          
          {/* Section Header with 2FA Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-5 pb-3.5 border-b border-slate-100/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-slate-800 tracking-wider">لوحة حسابات وصلاحيات القوة البشرية</span>
            </div>
            
            <button
              onClick={() => {
                setTwoFactorInputCode('');
                setIsTwoFactorModalOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                policies.twoFactorAuth 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{policies.twoFactorAuth ? 'المصادقة الثنائية: مفعلة 🛡️' : 'تمكين المصادقة الثنائية (2FA)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 relative z-10">
            {/* TILE 1: Dashboard */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(16,185,129,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('dashboard')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="لوحة القيادة والمؤشرات"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-emerald-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-emerald-50/85 text-emerald-650 border-emerald-100/50 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Sliders className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">لوحة القيادة</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-emerald-50/60 text-emerald-700 border-emerald-100/30 group-hover:bg-emerald-100/80 group-hover:text-emerald-900 transition-all duration-300 truncate max-w-full">
                أمان {securityRating}%
              </span>
            </motion.button>

            {/* TILE 2: Users */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(245,158,11,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('users')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="إدارة حسابات القوة"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-amber-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-amber-50/85 text-amber-650 border-amber-100/50 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Users className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">حسابات القوة</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-amber-50/60 text-amber-700 border-amber-100/30 group-hover:bg-amber-100/80 group-hover:text-amber-900 transition-all duration-300 truncate max-w-full">
                {users.length} حسابات
              </span>
            </motion.button>

            {/* TILE 3: Roles */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(14,165,233,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('roles')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="الأدوار وصلاحيات الأقسام"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-sky-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-sky-50/85 text-sky-655 border-sky-100/50 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <KeyRound className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">الأدوار والصلاحيات</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-sky-50/60 text-sky-700 border-sky-100/30 group-hover:bg-sky-100/80 group-hover:text-sky-900 transition-all duration-300 truncate max-w-full">
                {rolesList.length} أدوار
              </span>
            </motion.button>

            {/* TILE 4: Delegations */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(99,102,241,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('delegation')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="التفويض المؤقت للعمليات"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-indigo-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-indigo-50/85 text-indigo-650 border-indigo-100/50 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <ArrowLeftRight className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">التفويض المؤقت</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-indigo-50/60 text-indigo-700 border-indigo-100/30 group-hover:bg-indigo-100/80 group-hover:text-indigo-900 transition-all duration-300 truncate max-w-full">
                {delegations.filter(d => d.status === 'active').length} نشط
              </span>
            </motion.button>

            {/* TILE 5: Sessions */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(244,63,94,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('sessions')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="الجلسات والأجهزة المتصلة"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-rose-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-rose-50/85 text-rose-650 border-rose-100/50 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Smartphone className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">الجلسات والأجهزة</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-rose-50/60 text-rose-700 border-rose-100/30 group-hover:bg-rose-100/80 group-hover:text-rose-900 transition-all duration-300 truncate max-w-full">
                {sessions.length} جلسات
              </span>
            </motion.button>

            {/* TILE 6: Policies */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(168,85,247,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('policies')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="سياسات الأمان والحوكمة"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-purple-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-purple-50/85 text-purple-650 border-purple-100/50 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <ShieldAlert className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">سياسات الأمان</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-purple-50/60 text-purple-700 border-purple-100/30 group-hover:bg-purple-100/80 group-hover:text-purple-900 transition-all duration-300 truncate max-w-full">
                نشط 🛡️
              </span>
            </motion.button>

            {/* TILE 7: Audit */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(59,130,246,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('monitoring')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="سجل التدقيق والمراقبة"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-blue-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-blue-50/85 text-blue-650 border-blue-100/50 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <History className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">سجل المراقبة</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-blue-50/60 text-blue-700 border-blue-100/30 group-hover:bg-blue-100/80 group-hover:text-blue-900 transition-all duration-300 truncate max-w-full">
                نشط 🔒
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {/* --- Tab 1: SECURITY DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Security Rating Dashboard & Pulse Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* System Security Gauge Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">مؤشر سلامة وحماية المنظومة</span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">مستوى أمان النظام الإجمالي</h3>
              </div>

              <div className="my-6 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke={securityRating >= 85 ? '#059669' : securityRating >= 70 ? '#d97706' : '#dc2626'} strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * securityRating) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold text-slate-800 font-mono">{securityRating}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">آمن ومحمي</span>
                  </div>
                </div>

                <div className="text-center mt-3 space-y-1">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    securityRating >= 85 ? 'bg-emerald-50 text-emerald-700' : securityRating >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {securityRating >= 85 ? 'مستوى أمان استراتيجي فائق' : securityRating >= 70 ? 'مستوى أمان متوسط - ننصح بالتفعيل المزدوج' : 'ثغرات مكتشفة - يحتاج ضبط'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-sans border-t border-slate-100 pt-3 flex justify-between">
                <span>تحديث تلقائي للمقاييس:</span>
                <span className="font-mono text-emerald-600 font-bold">نشط</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">إجمالي المستخدمين</span>
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">{users.length}</span>
                  <span className="text-xs text-slate-400">حساب مرخص</span>
                </div>
                <div className="text-[9px] text-emerald-600 font-bold mt-1">تزامن فوري لقاعدة البيانات</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">المتصلون حالياً</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">3</span>
                  <span className="text-xs text-slate-400">أجهزة نشطة</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">عبر محطات القيادة واللاسلكي</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">الحسابات النشطة</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {users.length - Object.values(extendedUsers).filter((v: any) => v.status !== 'active').length}
                  </span>
                  <span className="text-xs text-slate-400">مفعل</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">جاهزية تشغيلية كاملة</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">الحسابات الموقوفة</span>
                  <XCircle className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {Object.values(extendedUsers).filter((v: any) => v.status === 'suspended').length}
                  </span>
                  <span className="text-xs text-slate-400">موقوف مؤقتاً</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">حسابات منقولة أو مجمدة</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">المقفلة أمنياً</span>
                  <Lock className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {Object.values(extendedUsers).filter((v: any) => v.status === 'locked').length}
                  </span>
                  <span className="text-xs text-slate-400">حساب مقفل</span>
                </div>
                <div className="text-[9px] text-rose-600 font-bold mt-1">تجاوز محاولات تسجيل الدخول</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold">محاولات الدخول الفاشلة</span>
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 font-mono">١</span>
                  <span className="text-xs text-slate-400">محاولة مرصودة</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">خلال الـ ٢٤ ساعة الماضية</div>
              </div>

            </div>
          </div>

          {/* Quick Security Actions and Live Monitor Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Realtime Alert Stream */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>تنبيهات فورية وتهديدات محتملة</span>
                </h4>
                <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {securityAlerts.map(alert => (
                  <div key={alert.id} className="flex justify-between items-start p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        alert.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 
                        alert.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                        'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-sans font-bold text-xs text-slate-800 block">{alert.title}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">المستخدم: {alert.user} | عنوان الـ IP: {alert.ip}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block font-mono">{alert.time}</span>
                      <button
                        onClick={() => {
                          setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id));
                          onAddLog('تعديل', 'تنبيهات الأمن', `تم تأكيد واتخاذ الإجراء اللازم حيال التنبيه: ${alert.title}`);
                        }}
                        className="text-[10px] text-emerald-700 font-bold hover:underline mt-1 block"
                      >
                        تأكيد الإجراء
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Policies Switchboard */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-800" />
                <span>لوحة التحكم السريعة في سياسات الدخول</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">منع تسجيل الدخول المتزامن</span>
                    <p className="text-[10px] text-slate-400">إلغاء الجلسات القديمة فورياً عند فتح حساب جديد.</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={policies.preventConcurrentLogins}
                    onChange={(e) => {
                      setPolicies(p => ({ ...p, preventConcurrentLogins: e.target.checked }));
                      onAddLog('تعديل', 'سياسات الأمان', 'تعديل سياسة الدخول المتزامن.');
                    }}
                    className="w-4 h-4 accent-emerald-800 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">تقييد النطاق بعناوين IP موثوقة</span>
                    <p className="text-[10px] text-slate-400">السماح بالدخول من أجهزة الشبكة العسكرية فقط.</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={policies.trustedIpsOnly}
                    onChange={(e) => {
                      setPolicies(p => ({ ...p, trustedIpsOnly: e.target.checked }));
                      onAddLog('تعديل', 'سياسات الأمان', 'تعديل سياسة نطاق الـ IP المسموح.');
                    }}
                    className="w-4 h-4 accent-emerald-800 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">إجبار قوة كلمة المرور (رموز خاصة)</span>
                    <p className="text-[10px] text-slate-400">منع كلمات المرور البسيطة أو المكررة لحماية القوة.</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={policies.requireSpecialChars}
                    onChange={(e) => {
                      setPolicies(p => ({ ...p, requireSpecialChars: e.target.checked }));
                      onAddLog('تعديل', 'سياسات الأمان', 'تعديل شروط قوة كلمة المرور.');
                    }}
                    className="w-4 h-4 accent-emerald-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 2: USER MANAGEMENT (Full CRUD) --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Filters & Actions bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم، اسم المستخدم، الرقم العسكري..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-800 rounded-xl pr-10 pl-4 py-2 text-xs font-sans text-right focus:outline-none focus:ring-1 focus:ring-emerald-800/10"
                />
              </div>

              {/* Filter Role */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
              >
                <option value="all">كل الأدوار العسكرية</option>
                <option value="admin">مدير النظام</option>
                <option value="commander_formation">قائد التشكيل</option>
                <option value="commander_unit">قائد كتيبة</option>
                <option value="operations">ركن العمليات</option>
                <option value="data_writer">كاتب بيانات</option>
              </select>

              {/* Filter Unit */}
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none max-w-xs"
              >
                <option value="all">كل الوحدات</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
              >
                <option value="all">كل الحالات الأمنية</option>
                <option value="active">نشط</option>
                <option value="suspended">موقف مؤقتاً</option>
                <option value="locked">مقفل أمنياً</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddUserModal}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 justify-center"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم عسكري جديد</span>
            </button>
          </div>

          {/* Grid Layout of Users for premium visual feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center col-span-full">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">لم يتم العثور على مستخدمين عسكريين يطابقون خيارات البحث الحالية.</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const ext = extendedUsers[u.id] || {
                  militaryNo: '١٠٠٢٣٥', rank: 'رائد', position: 'مسؤول حضور', department: 'العمليات', phone: '٠٥٠٠٠٠٠٠٠٠', lastLogin: 'اليوم', lastIp: '10.100.1.1', status: 'active', lastDevice: 'Secure-Device'
                };
                const assignedUnit = units.find(unit => unit.id === u.unitId);

                return (
                  <div key={u.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md hover:border-slate-200">
                    {/* Upper corner state badges */}
                    <div className="absolute top-4 left-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        ext.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        ext.status === 'suspended' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {ext.status === 'active' ? 'نشط ومصرح' :
                         ext.status === 'suspended' ? 'موقف مؤقتاً' : 'مقفل أمنياً'}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div>
                      {/* Name, Rank and Avatar */}
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl border border-slate-200/60 flex items-center justify-center font-bold text-slate-600 text-sm font-sans">
                          {ext.rank?.slice(0, 2) || 'م'}
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-bold font-sans">الرقم العسكري: {ext.militaryNo || '-'}</span>
                          <h4 className="text-sm font-extrabold text-slate-800 leading-tight font-sans">
                            {ext.rank} {u.name}
                          </h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md mt-1 inline-block font-bold">
                            {u.role === 'admin' ? 'مدير النظام' :
                             u.role === 'commander_formation' ? 'قائد التشكيل' :
                             u.role === 'commander_unit' ? 'قائد كتيبة' :
                             u.role === 'operations' ? 'ركن عمليات' : 'كاتب بيانات'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Meta fields */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">اسم المستخدم:</span>
                          <span className="font-mono font-bold text-slate-800" dir="ltr">@{u.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">الوحدة العسكرية:</span>
                          <span className="font-bold text-slate-800">{assignedUnit?.name || 'كامل لواء المشاة'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">القسم / الوظيفة:</span>
                          <span className="font-bold text-slate-700">{ext.position || 'غير مخصص'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">رقم الجوال:</span>
                          <span className="font-mono font-bold text-slate-700">{ext.phone || '-'}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100/50 pt-1.5 mt-1.5">
                          <span className="text-slate-400">آخر دخول:</span>
                          <span className="font-mono text-slate-500 text-[10px]">{ext.lastLogin || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">الجهاز وعنوان الـ IP:</span>
                          <span className="font-mono text-slate-500 text-[10px]">{ext.lastIp || '-'} ({ext.lastDevice?.split(' ')[0]})</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions button strip */}
                    <div className="flex gap-2 border-t border-slate-100 pt-3.5 mt-4">
                      <button
                        onClick={() => handleOpenEditUserModal(u)}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        <span>تعديل الصلاحيات</span>
                      </button>
                      <button
                        disabled={u.id === currentUser?.id}
                        onClick={() => handleDeleteUserClick(u.id, u.name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-all border border-rose-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="سحب الهوية والحذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- Tab 3: ROLES & SECTION PERMISSIONS MATRIX --- */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-base font-black text-slate-800">إدارة الأدوار ومصفوفة الصلاحيات الدقيقة</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-1">
              يحتوي الجدول التالي على الأدوار العسكرية المعتمدة في النظام. يمكنك تعديل مصفوفة صلاحيات كل قسم بشكل دقيق، أو نسخ دور موجود لإنشاء هيكل مخصص، وربط الدور بالهيكل التراتبي.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-3">
              <span className="text-xs font-bold text-slate-500 block">الأدوار المعتمدة بالنظام</span>
              {rolesList.map(role => (
                <div key={role.id} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs space-y-3 relative overflow-hidden">
                  {role.isSystem && (
                    <span className="absolute top-3 left-3 bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                      نظام أساسي
                    </span>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-700" />
                      <span>{role.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-normal mt-1">{role.description}</p>
                  </div>

                  <div className="text-[10px] text-slate-400 font-sans border-t border-slate-100 pt-2.5 flex justify-between">
                    <span>نطاق الوصول:</span>
                    <span className="font-bold text-slate-700">
                      {role.scope === 'all' ? 'جميع الوحدات واللواء' : role.scope === 'formation' ? 'التشكيل والكتائب' : 'الوحدة المخصصة فقط'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenRoleModal(role)}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      تعديل الصلاحيات
                    </button>
                    <button
                      onClick={() => handleCopyRole(role)}
                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-lg cursor-pointer"
                      title="نسخ الدور العسكري"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Matrix previewer card */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                  <span>عرض مصفوفة الصلاحيات الكلية (مثال مسبق للأدوار)</span>
                </h4>
                <button
                  onClick={() => {
                    setCompareRoleA(rolesList[0]?.key || 'admin');
                    setCompareRoleB(rolesList[1]?.key || 'operations');
                    setIsCompareRolesOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-700" />
                  <span>أداة مقارنة الصلاحيات البينية</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">اسم الدور العسكري</th>
                      <th className="p-3 text-center">مشاهدة الكشوف</th>
                      <th className="p-3 text-center">إضافة أفراد</th>
                      <th className="p-3 text-center">تعديل سجلات</th>
                      <th className="p-3 text-center">حذف حسابات</th>
                      <th className="p-3 text-center">اعتماد الجاهزية</th>
                      <th className="p-3 text-center">تصدير إكسل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rolesList.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{r.name}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                        </td>
                        <td className="p-3 text-center">
                          {r.permissions['التحضير'].add ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.permissions['التحضير'].edit ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.permissions['التحضير'].delete ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.permissions['التحضير'].approve ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.permissions['التقارير'].export ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto"></span>
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 4: TEMPORARY DELEGATION --- */}
      {activeTab === 'delegation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800">تفويض الصلاحيات المؤقت والمهام العسكرية</h3>
              <p className="text-slate-500 text-xs leading-relaxed mt-1">
                في حالات الإجازات أو المهام الخارجية، يمكن تفويض صلاحية مستخدم إلى مستخدم عسكري آخر لفترة زمنية محددة تنتهي وتلغى تلقائياً بنهاية المدة المقررة.
              </p>
            </div>

            <button
              onClick={() => {
                setDelFrom(currentUser?.id || '');
                setDelTo('');
                setIsDelegationModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              إصدار تفويض عمليات مؤقت
            </button>
          </div>

          {/* Delegation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {delegations.map(del => {
              const fromUser = users.find(u => u.id === del.fromUserId);
              const toUser = users.find(u => u.id === del.toUserId);
              return (
                <div key={del.id} className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs space-y-4 relative overflow-hidden">
                  <div className="absolute top-4 left-4">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-md border ${
                      del.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      del.status === 'revoked' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {del.status === 'active' ? 'نشط حالياً' :
                       del.status === 'revoked' ? 'ملغي ومسحوب' : 'منتهي الصلاحية'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold font-sans">معاملة تفويض عسكري</span>
                    <h4 className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      <span>من: {fromUser?.name || 'مدير النظام'}</span>
                    </h4>
                    <h4 className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                      <ArrowLeftRight className="w-4 h-4 text-teal-700" />
                      <span>إلى: {toUser?.name || 'الركن البديل'}</span>
                    </h4>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span>تاريخ البدء:</span>
                      <span className="font-mono font-bold text-slate-800">{del.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تاريخ الانتهاء:</span>
                      <span className="font-mono font-bold text-slate-800">{del.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الصلاحيات الممنوحة:</span>
                      <span className="font-bold text-emerald-800">{del.permissions.join(', ')}</span>
                    </div>
                  </div>

                  {del.status === 'active' && (
                    <button
                      onClick={() => handleRevokeDelegation(del.id)}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      إنهاء وسحب التفويض فورياً
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Tab 5: ACTIVE SESSIONS & DEVICES --- */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800">إدارة الأجهزة النشطة وجلسات الدخول المباشر</h3>
              <p className="text-slate-500 text-xs leading-relaxed mt-1">
                تتبع ورصد حي لكافة أجهزة الحاسوب واللوحيات العسكرية المتصلة بالنظام حالياً. يمكنك تجميد أي محطة مشتبه فيها أو إنهاء جلستها عن بعد فورياً.
              </p>
            </div>

            <button
              onClick={handleTerminateAllSessions}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl transition-all border border-rose-200 cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              إنهاء كافة الجلسات الخارجية
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(sess => (
              <div key={sess.id} className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs space-y-4 relative overflow-hidden">
                {sess.userId === currentUser?.id && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2.5 py-1 rounded-md">
                      جلسة العمل الحالية
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 text-slate-600">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold font-sans">محطة الدخول</span>
                    <h4 className="text-xs font-black text-slate-800 leading-tight">{sess.deviceName}</h4>
                    <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{sess.ip}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>اسم العسكري:</span>
                    <span className="font-bold text-slate-800">{sess.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتصفح والنظام:</span>
                    <span className="font-mono text-slate-700">{sess.os} | {sess.browser.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الموقع التقريبي:</span>
                    <span className="font-bold text-slate-700">{sess.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الاتصال:</span>
                    <span className="font-mono text-slate-500">{sess.loginTime}</span>
                  </div>
                </div>

                {sess.userId !== currentUser?.id && (
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleTerminateSession(sess.id, sess.deviceName)}
                      className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      إنهاء الجلسة
                    </button>
                    <button
                      onClick={() => handleBlockSessionDevice(sess.id, sess.deviceName)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      {sess.status === 'blocked' ? 'إلغاء الحظر' : 'حظر الجهاز'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Tab 6: SYSTEM SECURITY POLICIES --- */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-base font-black text-slate-800">حظر وقفل وقواعد حوكمة أمن المنظومة</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-1">
              قم بضبط قواعد حماية الدخول العسكري، وحدد آليات قفل الحسابات بعد محاولات فاشلة، والمواصفات المعتمدة لكلمات المرور المشفرة.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-800" />
                <span>شروط وضوابط سلامة الهويات</span>
              </h4>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الحد الأدنى لعدد خانات كلمة المرور</label>
                  <input
                    type="number"
                    min="6"
                    max="16"
                    value={policies.passwordMinLength}
                    onChange={(e) => setPolicies(prev => ({ ...prev, passwordMinLength: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">أقصى عدد محاولات دخول خاطئة قبل قفل الحساب أمنياً</label>
                  <input
                    type="number"
                    min="2"
                    max="5"
                    value={policies.failedAttemptsLockout}
                    onChange={(e) => setPolicies(prev => ({ ...prev, failedAttemptsLockout: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مدة الجلسة قبل تسجيل الخروج التلقائي (دقيقة)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={policies.autoTimeoutMinutes}
                    onChange={(e) => setPolicies(prev => ({ ...prev, autoTimeoutMinutes: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">القائمة البيضاء لعناوين الـ IP الموثوقة (مفصولة بفاصلة)</label>
                  <input
                    type="text"
                    value={policies.trustedIpsList}
                    onChange={(e) => setPolicies(prev => ({ ...prev, trustedIpsList: e.target.value }))}
                    placeholder="10.100.*.*, 192.168.1.1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-left focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddLog('تعديل', 'سياسات الأمان', 'تم حفظ السياسات الأمنية والحوكمة في الخوادم العسكرية.');
                    alert('تم تثبيت السياسات الأمنية بنجاح على نطاق اللواء!');
                  }}
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl transition-all shadow-xs cursor-pointer text-center"
                >
                  حفظ وتثبيت سياسات الأمان
                </button>
              </div>
            </div>

            {/* Explanation card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <span>دليل وإجراءات الحوكمة وحفظ الخصوصية</span>
                </h4>
                
                <p className="text-xs text-slate-600 leading-relaxed mt-3">
                  تلتزم إدارة السيطرة والجاهزية بتأمين كافة البيانات العسكرية والطبية لمنتسبي اللواء وفقاً لأقصى درجات حوكمة البيانات. يرجى تذكير جميع المستخدمين بـ:
                </p>

                <ul className="list-disc list-inside text-xs text-slate-500 mt-3 space-y-2.5 pr-2">
                  <li>عدم مشاركة هويات الدخول الرقمية تحت أي ظرف عملياتي.</li>
                  <li>تغيير كلمة المرور بشكل دوري كل ٩٠ يوماً.</li>
                  <li>مراجعة جلسات الأجهزة النشطة من هذا القسم أسبوعياً.</li>
                  <li>تفعيل المصادقة الثنائية (OTP) لمديري ومعقدي الكشوفات والتقارير العامة.</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1 mt-4">
                <span className="font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  تحذير مشدد:
                </span>
                <p className="leading-relaxed">
                  أي تجاوز في تفعيل جلسات غير مصرح بها أو استيراد كشوف مجهولة سيتم تجميده ورصده تلقائياً في سجلات الرقابة مع إرسال إشعار فوري لغرفة العمليات المركزية.
                </p>
              </div>

              {/* IP Whitelist Live Pattern Tester */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 mt-2">
                <span className="font-extrabold text-xs text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-4.5 h-4.5 text-emerald-700" />
                  أداة اختبار ومطابقة عناوين الـ IP:
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  أدخل أي عنوان IP لتتحقق من مطابقته لقواعد القائمة البيضاء المحددة لشبكة اللواء بالجانب الأيمن (تدعم النجمة كرمز بديل مثل <code className="font-mono bg-slate-200 px-1 rounded text-emerald-800">10.100.*.*</code>).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testIpAddress}
                    onChange={(e) => {
                      setTestIpAddress(e.target.value);
                      setTestIpResult(null);
                    }}
                    placeholder="مثال: 10.100.1.45"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-left focus:outline-none focus:border-emerald-800 text-xs"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = testIpAgainstWhitelist(testIpAddress, policies.trustedIpsList);
                      setTestIpResult(res);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all"
                  >
                    اختبار المطابقة
                  </button>
                </div>
                {testIpResult && (
                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-1.5 ${
                    testIpResult.allowed 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {testIpResult.allowed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block">{testIpResult.allowed ? 'عنوان مقبول ومطابق ✓' : 'عنوان محظور ومرفوض ✕'}</strong>
                      <span className="opacity-90">{testIpResult.reason}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 7: MONITORING & SECURITY AUDIT LOG --- */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-base font-black text-slate-800">مركز المراقبة والتدقيق الأمني المباشر</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-1">
              تصفح سريع ومكثف لجميع الحركات والعمليات الحساسة التي تمت على النظام، لمتابعة الحركات قبل التعديل وبعده لضمان أعلى مراتب الحوكمة والانضباط الإداري العسكري.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3 flex-wrap gap-2">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-800" />
                <span>سجل تدقيق الأنشطة والولوج</span>
              </h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsPrintReportOpen(true);
                    setPrintReportType('audit');
                    setIsReportSigned(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير تقرير أمني عسكري مختوم</span>
                </button>
                <button
                  onClick={() => {
                    setSecurityAlerts([]);
                    onAddLog('حذف', 'سجل تدقيق الأنشطة', 'تم تنظيف سجل التنبيهات المرصودة من مركز المراقبة.');
                    alert('تم تفريغ التنبيهات بنجاح.');
                  }}
                  className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  تفريغ التنبيهات المرصودة
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">اسم العملية</th>
                    <th className="p-3">المستخدم المسؤول</th>
                    <th className="p-3">عنوان IP</th>
                    <th className="p-3">التوقيت والتاريخ</th>
                    <th className="p-3 text-center">القسم المستهدف</th>
                    <th className="p-3 text-center">النتيجة والتشخيص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      دخول ناجح للنظام
                    </td>
                    <td className="p-3 font-sans">{currentUser?.name || 'رائد عدي بن حاتم'}</td>
                    <td className="p-3 font-mono">10.100.1.15</td>
                    <td className="p-3 text-slate-500">اليوم، ١١:١٩ ص</td>
                    <td className="p-3 text-center text-slate-600">بوابة الدخول</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold text-[10px]">
                        مقبول وآمن
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      تعديل صلاحية مستخدم
                    </td>
                    <td className="p-3 font-sans">مدير النظام (أنت)</td>
                    <td className="p-3 font-mono">10.100.1.5</td>
                    <td className="p-3 text-slate-500">اليوم، ١٠:٤٠ ص</td>
                    <td className="p-3 text-center text-slate-600">إدارة الأمن</td>
                    <td className="p-3 text-center">
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-bold text-[10px]">
                        تعديل إداري معتمد
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      محاولة دخول فاشلة
                    </td>
                    <td className="p-3 font-sans text-rose-600">katib_04 (مجهول)</td>
                    <td className="p-3 font-mono">10.100.12.44</td>
                    <td className="p-3 text-slate-500">منذ دقيقة</td>
                    <td className="p-3 text-center text-rose-600">تسجيل الدخول</td>
                    <td className="p-3 text-center">
                      <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md font-bold text-[10px]">
                        مرفوض - كلمة مرور خاطئة
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- UNIT ADD/EDIT MODAL DIALOG ---- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="user_modal">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-right" dir="rtl">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-amber-400 to-teal-500"></div>
              <div>
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>{editingUserId ? 'تعديل بيانات المستخدم العسكري وصلاحياته' : 'إصدار ترخيص حساب عسكري جديد'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">يرجى تعبئة الحقول المطلوبة وفقاً لسجلات شؤون الأفراد</p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم الكامل (الرباعي واللقب)</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: رائد عدي بن حاتم"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الدخول العسكري (Username)</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="odai_commander"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left focus:outline-none focus:border-emerald-800"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم العسكري الرسمي</label>
                  <input
                    type="text"
                    required
                    value={formMilitaryNo}
                    onChange={(e) => setFormMilitaryNo(e.target.value)}
                    placeholder="١٠٠٢٣٤"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرتبة العسكرية</label>
                  <select
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    <option value="عميد">عميد</option>
                    <option value="عقيد">عقيد</option>
                    <option value="مقدم">مقدم</option>
                    <option value="رائد">رائد</option>
                    <option value="نقيب">نقيب</option>
                    <option value="ملازم أول">ملازم أول</option>
                    <option value="رقيب أول">رقيب أول</option>
                    <option value="رقيب">رقيب</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور الأمنية {editingUserId && '(اتركها فارغة لعدم التغيير)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-left focus:outline-none focus:border-emerald-800 font-mono"
                  dir="ltr"
                />

                {/* Real-time Password Strength feedback */}
                {formPassword && (
                  <div className="mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[10px] text-slate-500">مقياس قوة كلمة المرور:</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md text-white ${
                        passwordMetrics.score >= 75 ? 'bg-emerald-600' : passwordMetrics.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}>
                        {passwordMetrics.label}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordMetrics.color}`}
                        style={{ width: `${passwordMetrics.score}%` }}
                      ></div>
                    </div>

                    {/* Compliance Checkpoints */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                      <div className="flex items-center gap-1.5">
                        {passwordMetrics.length ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={passwordMetrics.length ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          طول الكلمة ({policies.passwordMinLength}+ خانات)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {passwordMetrics.number ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={passwordMetrics.number ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          تتضمن أرقام (0-9)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {passwordMetrics.special ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={passwordMetrics.special ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          تتضمن رموزاً خاصة (@#$!)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {passwordMetrics.upper ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={passwordMetrics.upper ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          حروف كبيرة (A-Z)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الصلاحية ومستوى السيطرة</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    <option value="data_writer">كاتب بيانات (تحضير فقط)</option>
                    <option value="commander_unit">قائد كتيبة / وحدة فرعية</option>
                    <option value="operations">ركن عمليات (قراءة ومتابعة)</option>
                    <option value="commander_formation">قائد التشكيل (قراءة واسعة)</option>
                    <option value="admin">مدير النظام (كامل الصلاحيات)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوظيفة الإدارية</label>
                  <input
                    type="text"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="ركن شؤون عسكرية"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-800"
                  />
                </div>
              </div>

              {['commander_unit', 'data_writer'].includes(formRole) && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
                  <label className="block font-bold text-emerald-900">تحديد الوحدة والارتباط العسكري</label>
                  <p className="text-[10px] text-emerald-600 leading-normal">سيقتصر نطاق الحساب على تحضير وعرض بيانات الوحدة المحددة أدناه:</p>
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(e.target.value)}
                    className="w-full bg-white border border-emerald-200 rounded-lg p-2 font-bold focus:outline-none"
                  >
                    <option value="">-- اختر الوحدة من القائمة --</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف الجوال</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="٠٥٠١٢٣٤٥٦٧"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة الحساب الأمنية</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    <option value="active">نشط ومصرح بالكامل</option>
                    <option value="suspended">موقف مؤقتاً</option>
                    <option value="locked">مقفل أمنياً (محظور)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-150">
                <input
                  type="checkbox"
                  id="force_pass_change"
                  checked={formForcePass}
                  onChange={(e) => setFormForcePass(e.target.checked)}
                  className="w-4 h-4 accent-emerald-800 cursor-pointer"
                />
                <label htmlFor="force_pass_change" className="font-bold text-slate-700 cursor-pointer">
                  فرض تغيير كلمة المرور عند أول تسجيل دخول تالٍ
                </label>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  حفظ البيانات والترخيص العسكري
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---- DELEGATION MODAL DIALOG ---- */}
      {isDelegationModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="delegation_modal">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-right" dir="rtl">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-amber-400 to-teal-500"></div>
              <div>
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
                  <span>إصدار تفويض عمليات مؤقت</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">قم بإسناد صلاحيات إدخال ومراجعة الكشوفات لفرد عسكري بديل</p>
              </div>
              <button onClick={() => setIsDelegationModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-xs">إغلاق ✕</button>
            </div>

            <form onSubmit={handleAddDelegation} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المفوض الأصلي (منح الميزة)</label>
                <select
                  value={delFrom}
                  onChange={(e) => setDelFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none"
                >
                  <option value="">-- اختر المستخدم الأصلي --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المفوض إليه (الحصول على الصلاحيات)</label>
                <select
                  value={delTo}
                  onChange={(e) => setDelTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none"
                >
                  <option value="">-- اختر الفرد المستلم للصلاحية --</option>
                  {users.filter(u => u.id !== delFrom).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={delStart}
                    onChange={(e) => setDelStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={delEnd}
                    onChange={(e) => setDelEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">تحديد الصلاحيات المفوضة</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { key: 'view', label: 'مشاهدة الكشوف والجاهزية' },
                    { key: 'add', label: 'إضافة الحاضرين والغياب' },
                    { key: 'edit', label: 'تعديل السجلات الطبية والبيانات' },
                    { key: 'approve', label: 'اعتماد المعاملات والكشوفات' }
                  ].map(p => {
                    const isChecked = delPermissionsSelected.includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setDelPermissionsSelected(prev => 
                              isChecked ? prev.filter(x => x !== p.key) : [...prev, p.key]
                            );
                          }}
                          className="w-3.5 h-3.5 accent-emerald-800 cursor-pointer"
                        />
                        <span className="font-sans font-semibold text-slate-700">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  إصدار وتعميم التفويض المؤقت
                </button>
                <button
                  type="button"
                  onClick={() => setIsDelegationModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- ADVANCED ROLE PERMISSIONS DETAILED MODAL ---- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans" id="role_permissions_modal">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-right" dir="rtl">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-amber-400 to-teal-500"></div>
              <div>
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <span>تعديل وضبط مصفوفة الصلاحيات الكلية: {roleFormName}</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">قم بتمكين أو سحب ترخيص العرض، التعديل، والحذف لكل قسم على حدة</p>
              </div>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-xs">إغلاق ✕</button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">اسم الدور العسكري</label>
                  <input
                    type="text"
                    required
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">نطاق السيطرة الجغرافية/التنظيمية</label>
                  <select
                    value={roleFormScope}
                    onChange={(e) => setRoleFormScope(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    <option value="all">كامل لواء المشاة وكل الكتائب التابعة</option>
                    <option value="formation">التشكيل المعين والأجهزة الرديفة</option>
                    <option value="unit_only">الكتيبة أو الوحدة الخاصة بالفرد فقط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans">الوصف العام للدور والمسؤوليات</label>
                <textarea
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                />
              </div>

              {/* Sections permission Matrix checkboxes */}
              <div className="space-y-4">
                <span className="font-bold text-slate-800 block border-b border-slate-100 pb-2">تراخيص الأقسام والعمليات المتاحة</span>
                
                {Object.keys(roleFormPermissions).map(section => {
                  const perms = roleFormPermissions[section];
                  return (
                    <div key={section} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="font-black text-slate-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-700" />
                          <span>قسم: {section}</span>
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAllPermissionsInForm(section, true)}
                            className="text-[10px] bg-emerald-55/65 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllPermissionsInForm(section, false)}
                            className="text-[10px] bg-slate-200 hover:bg-slate-250 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        {[
                          { key: 'view', label: 'صلاحية العرض والتحقق' },
                          { key: 'add', label: 'إضافة وإدخال البيانات' },
                          { key: 'edit', label: 'تعديل السجلات وحركات النقل' },
                          { key: 'delete', label: 'صلاحية الحذف النهائي' },
                          { key: 'approve', label: 'اعتماد الطلبات والكشوف' },
                          { key: 'print', label: 'طباعة التقارير الرسمية' },
                          { key: 'export', label: 'تصدير الكشوفات الخارجية' },
                          { key: 'manageSettings', label: 'تعديل سياسات وإعدادات القسم' }
                        ].map(act => (
                          <label key={act.key} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-xl border border-slate-150 hover:border-emerald-700/30 transition-all">
                            <input
                              type="checkbox"
                              checked={!!perms[act.key as keyof PermissionMatrix]}
                              onChange={() => toggleFormPermissionCell(section, act.key as keyof PermissionMatrix)}
                              className="w-3.5 h-3.5 accent-emerald-800 cursor-pointer"
                            />
                            <span className="font-sans font-semibold text-slate-700">{act.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  اعتماد وتثبيت مصفوفة الصلاحيات
                </button>
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---- 1. TWO-FACTOR AUTHENTICATION SETUP & SIMULATOR MODAL ---- */}
      {isTwoFactorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans text-right" id="two_factor_modal" dir="rtl">
          <div className="bg-slate-900 text-slate-100 w-full max-w-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-800"></div>
            
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black flex items-center gap-2 text-emerald-400">
                  <Fingerprint className="w-5.5 h-5.5" />
                  <span>بوابة تهيئة ومحاكاة التحقق الثنائي (2FA)</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">مركز التشفير والتحقق من الهويات العسكرية المشفرة</p>
              </div>
              <button 
                onClick={() => setIsTwoFactorModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/85 space-y-2 text-center relative overflow-hidden">
                <span className="text-[9px] font-black text-emerald-400 block tracking-wider uppercase">SIMULATED MILITARY AUTHENTICATOR</span>
                
                {/* Simulated QR Code */}
                <div className="w-32 h-32 bg-white p-2 mx-auto rounded-xl border-4 border-slate-700 flex flex-col justify-between items-center relative group">
                  <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90">
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>

                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>

                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>

                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>

                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-100"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                    <div className="bg-slate-900 rounded-xs"></div>
                  </div>
                  <div className="absolute inset-0 m-auto w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center border border-emerald-500 shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto mt-2">
                  امسح رمز الاستجابة السريع عبر تطبيق المصادقة العسكري، أو استخدم رمز المحاكاة التلقائي بالأسفل للتحقق.
                </p>
              </div>

              {/* Simulated Authenticator App Code */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] text-slate-400">الرمز السري المتغير حالياً (OTP):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">يتغير خلال {twoFactorTimer} ثانية</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  </div>
                </div>

                <div className="text-center py-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-2xl font-black tracking-widest text-emerald-400 font-mono">
                    {twoFactorCurrentCode.slice(0, 3)} {twoFactorCurrentCode.slice(3, 6)}
                  </span>
                </div>
              </div>

              {/* Input for Verification Code */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-300">أدخل الرمز السري المكون من 6 أرقام لتثبيت الصلاحية ثنائياً:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorInputCode}
                  onChange={(e) => setTwoFactorInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (twoFactorInputCode === twoFactorCurrentCode) {
                      setPolicies(p => ({ ...p, twoFactorAuth: true }));
                      onAddLog('تعديل', 'سياسات الأمان', 'تم تفعيل وربط المصادقة الثنائية (2FA) بنجاح عبر محاكي التحقق.');
                      alert('تم تفعيل وتوثيق المصادقة الثنائية (2FA) بنجاح على حسابك بنجاح عملياتي تام!');
                      setIsTwoFactorModalOpen(false);
                    } else {
                      alert('رمز التحقق غير صحيح! يرجى إدخال الرمز الدقيق الموضح في تطبيق المحاكي.');
                    }
                  }}
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  تأكيد وتفعيل الصلاحية الثنائية
                </button>
                {policies.twoFactorAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setPolicies(p => ({ ...p, twoFactorAuth: false }));
                      onAddLog('تعديل', 'سياسات الأمان', 'تم إلغاء المصادقة الثنائية (2FA) للشبكة العامة.');
                      alert('تم تعطيل المصادقة الثنائية (2FA) بنجاح.');
                      setIsTwoFactorModalOpen(false);
                    }}
                    className="px-4 py-2.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    تعطيل الـ 2FA
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTwoFactorModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- 2. ROLE COMPARISON SIDE-BY-SIDE MATRIX MODAL ---- */}
      {isCompareRolesOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans text-right" id="compare_roles_modal" dir="rtl">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-emerald-500 via-amber-400 to-teal-500"></div>
              <div>
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
                  <span>مقارنة الصلاحيات البينية للأدوار العسكرية</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">تحليل الفروقات والترقيات بين دورين عسكريين لضمان دقة منح الصلاحيات للأفراد</p>
              </div>
              <button onClick={() => setIsCompareRolesOpen(false)} className="text-slate-400 hover:text-white font-bold text-xs">إغلاق ✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">الدور الأساسي الأول (أ):</label>
                  <select
                    value={compareRoleA}
                    onChange={(e) => setCompareRoleA(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    {rolesList.map(r => (
                      <option key={r.id} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">الدور المقارن الثاني (ب):</label>
                  <select
                    value={compareRoleB}
                    onChange={(e) => setCompareRoleB(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold focus:outline-none"
                  >
                    {rolesList.map(r => (
                      <option key={r.id} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3">القسم والعملية الأمنية</th>
                      <th className="p-3 text-center w-1/3">
                        {rolesList.find(r => r.key === compareRoleA)?.name || compareRoleA}
                      </th>
                      <th className="p-3 text-center w-1/3">
                        {rolesList.find(r => r.key === compareRoleB)?.name || compareRoleB}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {Object.keys(rolesList[0].permissions).flatMap(section => {
                      const actions = [
                        { key: 'view', label: 'مشاهدة الكشوف والتحقق' },
                        { key: 'add', label: 'إضافة وإدخال البيانات' },
                        { key: 'edit', label: 'تعديل السجلات وحركات النقل' },
                        { key: 'delete', label: 'صلاحية الحذف النهائي' },
                        { key: 'approve', label: 'اعتماد الطلبات والكشوف' },
                        { key: 'print', label: 'طباعة التقارير الرسمية' },
                        { key: 'export', label: 'تصدير الكشوفات الخارجية' },
                        { key: 'manageSettings', label: 'تعديل سياسات وإعدادات القسم' }
                      ];
                      
                      const roleAData = rolesList.find(r => r.key === compareRoleA);
                      const roleBData = rolesList.find(r => r.key === compareRoleB);

                      return actions.map(act => {
                        const valA = roleAData?.permissions[section]?.[act.key as keyof PermissionMatrix];
                        const valB = roleBData?.permissions[section]?.[act.key as keyof PermissionMatrix];
                        const hasDiscrepancy = valA !== valB;

                        return (
                          <tr key={`${section}-${act.key}`} className={`hover:bg-slate-50 ${hasDiscrepancy ? 'bg-amber-50/50' : ''}`}>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">قسم {section}</span>
                              <span className="text-[10px] text-slate-500">{act.label}</span>
                            </td>
                            <td className="p-3 text-center">
                              {valA ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-700" /> مصرح به
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                  <XCircle className="w-3 h-3 text-slate-400" /> غير متاح
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {valB ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-700" /> مصرح به
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                  <XCircle className="w-3 h-3 text-slate-400" /> غير متاح
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompareRolesOpen(false)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  إغلاق نافذة المقارنة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- 3. CERTIFIED MILITARY AUDIT REPORT PRINT OVERLAY ---- */}
      {isPrintReportOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans text-right" id="print_report_modal" dir="rtl">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-4 border-emerald-800">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5.5 h-5.5 text-emerald-400" />
                <span className="font-black text-sm">معاينة التقرير الأمني العام لشبكة اللواء</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsReportSigned(true);
                    onAddLog('تعديل', 'تقرير التدقيق الأمني', 'تم اعتماد ومصادقة التقرير العام بالختم العسكري.');
                    alert('تم ختم واعتماد السند الأمني للتقرير من قبل اللواء قائد التشكيل!');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  تطبيق الختم والتوقيع الرسمي
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  تأكيد وطباعة المستند 🖨️
                </button>
                <button onClick={() => setIsPrintReportOpen(false)} className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg cursor-pointer">
                  إغلاق المعاينة
                </button>
              </div>
            </div>

            <div className="p-8 md:p-12 space-y-6 text-slate-900 bg-white min-h-[70vh]" id="military_print_area">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="text-center space-y-1 text-xs font-bold">
                  <span>الجمهورية العربية السورية</span>
                  <br />
                  <span>وزارة الدفاع</span>
                  <br />
                  <span>القيادة العامة للجيش والقوات المسلحة</span>
                  <br />
                  <span>قيادة لواء المشاة الآلي /٢٦/</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full border-2 border-emerald-800 flex items-center justify-center mx-auto mb-1">
                    <ShieldCheck className="w-10 h-10 text-emerald-800" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest block uppercase text-emerald-800">أمن وحوكمة المنظومة</span>
                </div>
                <div className="text-left font-mono text-[10px] space-y-1">
                  <div><strong>الرقم التسلسلي:</strong> SYR-IAM-2026-948</div>
                  <div><strong>التاريخ المحدد:</strong> {new Date().toLocaleDateString('ar-SY')}</div>
                  <div><strong>مستوى السرية:</strong> سري للغاية ومحدود</div>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-lg font-black tracking-tight text-slate-900">تقرير تدقيق وتتبع الأنشطة الأمنية للمنظومة العسكرية</h2>
                <p className="text-xs text-slate-500 font-serif">نسخة إلكترونية معتمدة لأمن الاستطلاع والإدارة الموحدة</p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <div><strong>نطاق التدقيق:</strong> مستخدمي وصلاحيات لواء المشاة /٢٦/</div>
                  <div><strong>مسؤول التقرير المصدِّر:</strong> {currentUser?.name}</div>
                  <div><strong>الرتبة العسكرية للمشرف:</strong> {extendedUsers[currentUser?.id || '']?.rank || 'عميد ركن عمليات'}</div>
                </div>
                <div className="space-y-1">
                  <div><strong>حالة الحماية:</strong> {policies.twoFactorAuth ? 'المصادقة الثنائية نشطة ومفعلة بقوة' : 'تنبيه: أمان اعتيادي بدون مصادقة ثنائية'}</div>
                  <div><strong>إجمالي العمليات المرصودة:</strong> {securityAlerts.length + 8} حركات</div>
                  <div><strong>تقييم أمن المنظومة:</strong> {securityRating}% (مؤشر الحماية الكلي)</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-900 border-r-4 border-emerald-800 pr-2">سجل الأنشطة والحركات المباشرة التي جرى رصدها:</h3>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-2.5">المستخدم المسؤول</th>
                        <th className="p-2.5">نوع الحركة والعملية</th>
                        <th className="p-2.5">البيانات المعدلة</th>
                        <th className="p-2.5">التوقيت الدقيق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {securityAlerts.length > 0 ? (
                        securityAlerts.map(alert => (
                          <tr key={alert.id} className="hover:bg-slate-50/40">
                            <td className="p-2.5 font-bold">{alert.userName}</td>
                            <td className="p-2.5">{alert.actionType}</td>
                            <td className="p-2.5 text-slate-600">{alert.details}</td>
                            <td className="p-2.5 font-mono text-slate-500 text-[10px]">{alert.timestamp}</td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr className="hover:bg-slate-50/40">
                            <td className="p-2.5 font-bold">العميد ركن سليم الأحمد</td>
                            <td className="p-2.5 text-emerald-800 font-bold">بدء تدقيق الأمان</td>
                            <td className="p-2.5 text-slate-600">طلب تصدير ملفات الجاهزية وجداول الوحدات العسكرية بالكامل.</td>
                            <td className="p-2.5 font-mono text-slate-500 text-[10px]">٢٠٢٦/٠٧/١٨ ٠٩:١٥ ص</td>
                          </tr>
                          <tr className="hover:bg-slate-50/40">
                            <td className="p-2.5 font-bold">المقدم المهندس أحمد علي</td>
                            <td className="p-2.5 text-rose-800 font-bold">تغيير كلمة المرور</td>
                            <td className="p-2.5 text-slate-600">تحديث كلمة مرور المعرف الرقمي الخاص بإدخال السجلات والبيانات.</td>
                            <td className="p-2.5 font-mono text-slate-500 text-[10px]">٢٠٢٦/٠٧/١٨ ٠٨:٢٤ ص</td>
                          </tr>
                          <tr className="hover:bg-slate-50/40">
                            <td className="p-2.5 font-bold">رائد عمليات خالد الحربي</td>
                            <td className="p-2.5 text-teal-800 font-bold">إصدار تفويض مؤقت</td>
                            <td className="p-2.5 text-slate-600">تفويض ركن العمليات الفرعي بكافة صلاحيات التوقيع والتعديل للكشوف.</td>
                            <td className="p-2.5 font-mono text-slate-500 text-[10px]">٢٠٢٦/٠٧/١٧ ٠٤:٣٠ م</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <span>توقيع وإمضاء المشرف الأمني العام:</span>
                  <div className="font-serif italic font-bold pt-6 text-slate-600">عميد ركن عمليات وتوجيه المنظومة</div>
                </div>

                <div className="relative w-36 h-36 flex items-center justify-center">
                  {isReportSigned ? (
                    <div className="w-28 h-28 border-4 border-emerald-700 rounded-full flex flex-col justify-center items-center p-2 text-center text-emerald-700 rotate-12 scale-110 font-bold select-none absolute shadow-sm">
                      <span className="text-[8px] font-black uppercase tracking-wider block">سري للغاية وصالح للعمليات</span>
                      <ShieldCheck className="w-7 h-7 text-emerald-700" />
                      <span className="text-[9px] font-serif block">قيادة لواء المشاة آلي ٢٦</span>
                      <span className="text-[8px] font-mono font-bold block">مُعتمد وموقع إلكترونياً</span>
                    </div>
                  ) : (
                    <div className="text-slate-300 text-[10px] text-center border-2 border-dashed border-slate-300 p-3 rounded-2xl w-28 h-28 flex flex-col justify-center items-center">
                      <span>بانتظار مصادقة الختم العسكري الرسمية</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
