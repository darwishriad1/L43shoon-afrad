import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Bell, 
  Smartphone, 
  Calendar, 
  ShieldAlert, 
  Check, 
  ShieldCheck, 
  Database,
  Shield,
  Lock,
  Clock,
  Mail,
  MessageSquare,
  Key,
  RefreshCw,
  Upload,
  Download,
  Cloud,
  CloudLightning,
  Server,
  Wifi,
  ChevronLeft,
  UserPlus,
  Users,
  Printer,
  Building,
  Image,
  Trash2,
  Eye,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemSettings, Unit, Soldier, AttendanceRecord, AuditLog, PrintSettings } from '../types';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import BackupRestore from './BackupRestore';
import UsersPermissionsManager from './UsersPermissionsManager';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  currentUserRole: string;
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser: any;
  onImportCompleted: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
  }) => void;
  onAddLog: (actionType: any, tableName: string, details: string) => void;
  
  // Users & Permissions Manager props
  users?: any[];
  currentUserId?: string;
  onSetCurrentUserId?: (id: string) => void;
  onAddUser?: (user: any) => Promise<void>;
  onEditUser?: (id: string, updated: any) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;

  // Audit Log View props
  auditLogs: AuditLog[];
  onClearLogs: () => void;

  // Backup & Restore props
  googleAccessToken: string | null;
  onSetGoogleAccessToken: (token: string | null) => void;
  onRestoreState: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }) => void;
  initialSubTab?: 'menu' | 'settings' | 'notifications' | 'users' | 'backup' | 'print';
  onSubTabChange?: (tab: 'menu' | 'settings' | 'notifications' | 'users' | 'backup' | 'print') => void;
}

// Beautiful Custom ToggleSwitch Component
function ToggleSwitch({ 
  checked, 
  onChange, 
  label, 
  description, 
  icon: Icon,
  disabled = false 
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void; 
  label: string; 
  description?: string; 
  icon?: React.ComponentType<any>;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-200 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 flex items-center justify-center text-slate-500 shadow-xs">
            <Icon className="w-4.5 h-4.5 stroke-[1.5]" />
          </div>
        )}
        <div className="text-right">
          <span className="text-xs sm:text-sm font-black text-slate-800 block">{label}</span>
          {description && <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block leading-relaxed font-semibold">{description}</span>}
        </div>
      </div>
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6.5 rounded-full transition-colors duration-200 relative focus:outline-hidden cursor-pointer shrink-0 ${
          checked ? 'bg-emerald-600' : 'bg-slate-200'
        }`}
        style={{ minHeight: '26px', minWidth: '44px' }}
      >
        <span
          className={`absolute top-0.75 w-5 h-5 rounded-full bg-white transition-all duration-250 shadow-sm ${
            checked ? 'right-0.75' : 'right-5.25'
          }`}
        />
      </button>
    </div>
  );
}

// Tactile Threshold adjuster with increment/decrement buttons
function ThresholdAdjuster({
  value,
  onChange,
  disabled = false
}: {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}) {
  const increment = () => {
    if (value < 98) onChange(value + 1);
  };
  const decrement = () => {
    if (value > 40) onChange(value - 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= 40}
        onClick={decrement}
        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        -
      </button>
      <input
        type="number"
        min="40"
        max="98"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (val >= 40 && val <= 98) onChange(val);
        }}
        className="w-16 min-h-[44px] font-black font-mono text-center bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-800/10 text-slate-800"
      />
      <button
        type="button"
        disabled={disabled || value >= 98}
        onClick={increment}
        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        +
      </button>
    </div>
  );
}

export default function SettingsView({ 
  settings, 
  onUpdateSettings, 
  currentUserRole,
  units,
  soldiers,
  attendance,
  currentUser,
  onImportCompleted,
  onAddLog,
  users = [],
  currentUserId = '',
  onSetCurrentUserId,
  onAddUser,
  onEditUser,
  onDeleteUser,
  auditLogs,
  onClearLogs,
  googleAccessToken,
  onSetGoogleAccessToken,
  onRestoreState,
  initialSubTab,
  onSubTabChange
}: SettingsViewProps) {
  const [warningThreshold, setWarningThreshold] = useState(settings.warningThreshold);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(settings.dailyReminderEnabled);
  const [dailyReminderTime, setDailyReminderTime] = useState(settings.dailyReminderTime);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(settings.autoBackupEnabled);
  const [hijriSupport, setHijriSupport] = useState(settings.hijriSupport);
  
  // Clean settings subtabs
  const [subTabState, setSubTabState] = useState<'menu' | 'settings' | 'notifications' | 'users' | 'backup' | 'print'>(initialSubTab || 'menu');
  
  useEffect(() => {
    if (initialSubTab) {
      setSubTabState(initialSubTab);
    }
  }, [initialSubTab]);

  const setSubTab = (tab: 'menu' | 'settings' | 'notifications' | 'users' | 'backup' | 'print') => {
    setSubTabState(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  const subTab = subTabState;
  
  // Print Settings State
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.printSettings?.logoUrl || null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(settings.printSettings?.signatureUrl || null);
  const [sealUrl, setSealUrl] = useState<string | null>(settings.printSettings?.sealUrl || null);
  const [countryName, setCountryName] = useState<string>(settings.printSettings?.countryName || 'المملكة العربية السعودية');
  const [ministryName, setMinistryName] = useState<string>(settings.printSettings?.ministryName || 'وزارة الدفاع - القيادة العامة');
  const [commandName, setCommandName] = useState<string>(settings.printSettings?.commandName || 'قيادة القوات البرية / المنطقة الشمالية الغربية');
  const [unitName, setUnitName] = useState<string>(settings.printSettings?.unitName || 'كتيبة المشاة الآلية الثانية');
  const [headerText, setHeaderText] = useState<string>(settings.printSettings?.headerText || 'إشعار وتحضير قوة الجاهزية القتالية العاجلة');
  const [footerText, setFooterText] = useState<string>(settings.printSettings?.footerText || 'هذا المستند سري ومحدود، ويخضع للتعليمات والأوامر العسكرية الصادرة.');
  const [showLogo, setShowLogo] = useState<boolean>(settings.printSettings?.showLogo ?? true);
  const [showSignature, setShowSignature] = useState<boolean>(settings.printSettings?.showSignature ?? true);
  const [showSeal, setShowSeal] = useState<boolean>(settings.printSettings?.showSeal ?? true);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5' | 'Letter'>(settings.printSettings?.paperSize || 'A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(settings.printSettings?.orientation || 'portrait');

  const [isPrintSaved, setIsPrintSaved] = useState(false);
  const [showFullPrintPreviewModal, setShowFullPrintPreviewModal] = useState(false);

  useEffect(() => {
    if (settings.printSettings) {
      if (settings.printSettings.logoUrl !== undefined) setLogoUrl(settings.printSettings.logoUrl);
      if (settings.printSettings.signatureUrl !== undefined) setSignatureUrl(settings.printSettings.signatureUrl);
      if (settings.printSettings.sealUrl !== undefined) setSealUrl(settings.printSettings.sealUrl);
      if (settings.printSettings.countryName) setCountryName(settings.printSettings.countryName);
      if (settings.printSettings.ministryName) setMinistryName(settings.printSettings.ministryName);
      if (settings.printSettings.commandName) setCommandName(settings.printSettings.commandName);
      if (settings.printSettings.unitName) setUnitName(settings.printSettings.unitName);
      if (settings.printSettings.headerText) setHeaderText(settings.printSettings.headerText);
      if (settings.printSettings.footerText) setFooterText(settings.printSettings.footerText);
      if (settings.printSettings.showLogo !== undefined) setShowLogo(settings.printSettings.showLogo);
      if (settings.printSettings.showSignature !== undefined) setShowSignature(settings.printSettings.showSignature);
      if (settings.printSettings.showSeal !== undefined) setShowSeal(settings.printSettings.showSeal);
      if (settings.printSettings.paperSize) setPaperSize(settings.printSettings.paperSize);
      if (settings.printSettings.orientation) setOrientation(settings.printSettings.orientation);
    }
  }, [settings.printSettings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً! يرجى اختيار صورة أقل من 5 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً! يرجى اختيار صورة أقل من 5 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً! يرجى اختيار صورة أقل من 5 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSealUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePrintSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      alert('عذراً! هذه الإعدادات مخصصة لمدير النظام والقيادة العليا فقط.');
      return;
    }

    const newPrintSettings: PrintSettings = {
      logoUrl,
      signatureUrl,
      sealUrl,
      countryName,
      ministryName,
      commandName,
      unitName,
      headerText,
      footerText,
      showLogo,
      showSignature,
      showSeal,
      paperSize,
      orientation
    };

    onUpdateSettings({
      ...settings,
      warningThreshold,
      dailyReminderEnabled,
      dailyReminderTime,
      autoBackupEnabled,
      hijriSupport,
      printSettings: newPrintSettings
    });

    setIsPrintSaved(true);
    onAddLog('تعديل', 'إعدادات الطباعة', 'تحديث وتوثيق الهوية الرسمية لجميع المطبوعات والتقارير والأوامر الإدارية (الشعار، الترويسة، الختم، التوقيع).');

    setTimeout(() => {
      setIsPrintSaved(false);
      alert('تم حفظ إعدادات الطباعة وتطبيق الهوية الرسمية على جميع التقارير والمطبوعات بنجاح!');
    }, 400);
  };
  
  // Local config parameters (Actual Settings)
  const [sessionTimeout, setSessionTimeout] = useState('15'); 
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelTelegram, setChannelTelegram] = useState(false);
  const [channelSMS, setChannelSMS] = useState(false);
  const [brigadeName, setBrigadeName] = useState('لواء المشاة الميداني الموحد');
  const [brigadeCommander, setBrigadeCommander] = useState('العميد الركن ناصر السبيعي');
  const [officialEmail, setOfficialEmail] = useState('command@mod.gov.sa');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      alert('عذراً! هذه الإعدادات الإستراتيجية مخصصة لمدير النظام والقيادة العليا فقط.');
      return;
    }

    onUpdateSettings({
      warningThreshold,
      dailyReminderEnabled,
      dailyReminderTime,
      autoBackupEnabled,
      hijriSupport
    });

    setIsSaved(true);
    onAddLog('تعديل', 'إعدادات النظام', `تحديث إعدادات المنظومة: حد الجاهزية (${warningThreshold}%)، التذكير اليومي (${dailyReminderEnabled ? 'نشط' : 'ملغى'})، التقويم الهجري (${hijriSupport ? 'نشط' : 'ملغى'}).`);
    
    setTimeout(() => {
      setIsSaved(false);
      alert('تم حفظ إعدادات النظام وتحديث الحدود الدنيا للجاهزية والتنبيهات فورياً!');
    }, 400);
  };

  // Launcher items config with icons and real-time status details
  const launcherItems = [
    {
      id: 'settings',
      label: 'الضبط العام والجاهزية',
      desc: 'تعديل معايير حضور اللواء وقوام القوات والتقويم المعتمد',
      icon: Sliders,
      bgColor: 'bg-emerald-50/45 hover:bg-emerald-50/70',
      borderColor: 'border-emerald-100 hover:border-emerald-200/80',
      iconColor: 'text-emerald-700 bg-emerald-100/70',
      badgeColor: 'bg-emerald-100/80 text-emerald-950',
      status: `حد الجاهزية: ${warningThreshold}%`,
      badgeText: hijriSupport ? 'هجري + ميلادي' : 'ميلادي فقط'
    },
    {
      id: 'notifications',
      label: 'قنوات الإشعار والتنبيه',
      desc: 'بث رسائل التحضير اليومي والإنذار المبكر للأركان والكتّاب',
      icon: Bell,
      bgColor: 'bg-sky-50/45 hover:bg-sky-50/70',
      borderColor: 'border-sky-100 hover:border-sky-200/80',
      iconColor: 'text-sky-700 bg-sky-100/70',
      badgeColor: 'bg-sky-100/80 text-sky-950',
      status: dailyReminderEnabled ? `تذكير صباحي: ${dailyReminderTime}` : 'التذكير معطل',
      badgeText: `${[channelEmail && 'بريد', channelTelegram && 'تلغرام', channelSMS && 'SMS'].filter(Boolean).length} قنوات نشطة`
    },
    {
      id: 'users',
      label: 'صلاحيات الحسابات والوصول',
      desc: 'إدارة حسابات الكتاب وأركان السيطرة وضبط مصفوفة الصلاحيات الأمنية',
      icon: ShieldCheck,
      bgColor: 'bg-amber-50/45 hover:bg-amber-50/70',
      borderColor: 'border-amber-100 hover:border-amber-200/80',
      iconColor: 'text-amber-700 bg-amber-100/70',
      badgeColor: 'bg-amber-100/80 text-amber-950',
      status: `الحسابات: ${users.length} مستخدم`,
      badgeText: `المشرفون: ${users.filter(u => u.role === 'admin').length}`
    },
    {
      id: 'backup',
      label: 'النسخ السحابي والبيانات',
      desc: 'النسخ الاحتياطي السحابي المشفر ومزامنة الكشوفات مع الخوادم الآمنة',
      icon: Database,
      bgColor: 'bg-indigo-50/45 hover:bg-indigo-50/70',
      borderColor: 'border-indigo-100 hover:border-indigo-200/80',
      iconColor: 'text-indigo-700 bg-indigo-100/70',
      badgeColor: 'bg-indigo-100/80 text-indigo-950',
      status: autoBackupEnabled ? 'نسخ تلقائي مستمر' : 'نسخ يدوي آمن',
      badgeText: 'حماية مشفرة'
    }
  ] as const;

  // Sidebar navigation options for dual pane on desktop
  const sidebarTabs = [
    { id: 'settings', label: 'الضبط العام والجاهزية', desc: 'معايير حضور اللواء والتقويم', icon: Sliders },
    { id: 'notifications', label: 'قنوات الإشعار والتنبيه', desc: 'التحضير اليومي والإنذار المبكر', icon: Bell },
    { id: 'users', label: 'صلاحيات الحسابات والوصول', desc: 'إدارة المستخدمين والأدوار والولوج', icon: ShieldCheck },
    { id: 'backup', label: 'النسخ السحابي والبيانات', desc: 'حفظ الكشوفات والمزامنة المشفرة', icon: Database },
    { id: 'print', label: 'إعدادات الطباعة', desc: 'الهوية الرسمية والشعار والختم والتوقيع', icon: Printer }
  ] as const;

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Main responsive layouts */}
      {subTab === 'menu' ? (
        /* Launcher Grid - EXACT SAME DESIGN AS THE DASHBOARD LAUNCHER GRID */
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/85 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-10 opacity-40"></div>
          
          {/* Section Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-slate-800 tracking-wider">لوحة الضبط والتحكم بالمنظومة القيادية</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              منظومة مؤمنة نشطة
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 relative z-10">
            {/* TILE 1: General & Readiness */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(16,185,129,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSubTab('settings')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="الضبط العام والجاهزية"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-emerald-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-emerald-50/85 text-emerald-650 border-emerald-100/50 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Sliders className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">الضبط والجاهزية</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-emerald-50/60 text-emerald-700 border-emerald-100/30 group-hover:bg-emerald-100/80 group-hover:text-emerald-900 transition-all duration-300 truncate max-w-full">
                {hijriSupport ? 'هجري + ميلادي' : 'ميلادي فقط'}
              </span>
            </motion.button>

            {/* TILE 2: Notifications */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(14,165,233,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSubTab('notifications')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="قنوات الإشعار والتنبيه"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-sky-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-sky-50/85 text-sky-650 border-sky-100/50 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Bell className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">قنوات الإشعار</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-sky-50/60 text-sky-700 border-sky-100/30 group-hover:bg-sky-100/80 group-hover:text-sky-900 transition-all duration-300 truncate max-w-full">
                {[channelEmail && 'بريد', channelTelegram && 'تلغرام', channelSMS && 'SMS'].filter(Boolean).length || 'معطلة'} نشط
              </span>
            </motion.button>

            {/* TILE 3: Users */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(245,158,11,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSubTab('users')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="صلاحيات الحسابات والوصول"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-amber-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-amber-50/85 text-amber-650 border-amber-100/50 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <ShieldCheck className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">الحسابات والصلاحيات</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-amber-50/60 text-amber-700 border-amber-100/30 group-hover:bg-amber-100/80 group-hover:text-amber-900 transition-all duration-300 truncate max-w-full">
                {users.length} مستخدم
              </span>
            </motion.button>

            {/* TILE 4: Backup */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(99,102,241,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSubTab('backup')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="النسخ الاحتياطي والبيانات"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-indigo-500 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-indigo-50/85 text-indigo-650 border-indigo-100/50 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Database className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">النسخ والبيانات</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-indigo-50/60 text-indigo-700 border-indigo-100/30 group-hover:bg-indigo-100/80 group-hover:text-indigo-900 transition-all duration-300 truncate max-w-full">
                {autoBackupEnabled ? 'تلقائي مستمر' : 'يدوي آمن'}
              </span>
            </motion.button>

            {/* TILE 5: Print Settings */}
            <motion.button 
              whileHover={{ y: -4, scale: 1.015, boxShadow: '0 12px 24px -10px rgba(147,51,234,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSubTab('print')}
              className="flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[126px] w-full overflow-hidden"
              title="إعدادات الطباعة الهيكلية والرسمية"
            >
              <div className="absolute top-0 inset-x-0 h-[3.5px] bg-purple-600 rounded-t-2xl transition-all duration-300 group-hover:h-[5px]" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border bg-purple-50/85 text-purple-700 border-purple-100/50 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-xs group-hover:scale-105">
                <Printer className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">إعدادات الطباعة</span>
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border bg-purple-50/60 text-purple-700 border-purple-100/30 group-hover:bg-purple-100/80 group-hover:text-purple-900 transition-all duration-300 truncate max-w-full">
                ترويسة + ختم وتوقيع
              </span>
            </motion.button>
          </div>
        </div>
      ) : (
        /* Detailed Configuration Sections (Subtabs) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sidebar Switcher (Desktop only) */}
          <div className="hidden lg:block bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-xs space-y-1.5 lg:col-span-1 select-none">
            <div className="flex justify-between items-center px-3 pb-2.5 border-b border-slate-100 mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">لوحة الإعدادات</p>
              <button 
                type="button" 
                onClick={() => setSubTab('menu')}
                className="text-[10px] font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
              >
                <span>الشبكة الرئيسية</span>
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </button>
            </div>
            
            <div className="space-y-1">
              {sidebarTabs.map((item) => {
                const Icon = item.icon;
                const isActive = subTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSubTab(item.id)}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-right transition-all cursor-pointer border ${
                      isActive 
                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900 font-extrabold shadow-2xs' 
                        : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isActive ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate text-right">
                      <p className="text-xs font-black">{item.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content panel */}
          <div className="lg:col-span-3">
            {/* Back Button for mobile view */}
            <button
              type="button"
              onClick={() => setSubTab('menu')}
              className="lg:hidden w-full flex items-center justify-between gap-2 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-4 py-3.5 rounded-2xl font-bold text-xs mb-4 transition-all duration-150 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-800" />
                <span>العودة لشبكة الإعدادات الرئيسية</span>
              </span>
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={subTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs min-h-[450px]"
              >
              
              {/* TAB 1: GENERAL & READINESS */}
              {subTab === 'settings' && (
                <form onSubmit={handleSave} className="space-y-6">
                  
                  {/* Header info */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">الضبط العام ومعايير الاستنفار</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed font-semibold">تخصيص مستويات حضور اللواء والتقويم الفعلي والأمن الميداني المعتمد.</p>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Readiness Threshold Block */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">الحد الأدنى المقبول للجاهزية العسكرية (%)</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      يصدر النظام تلقائياً تنبيهاً أمنياً عاجلاً للقيادة بمجرد هبوط الحضور الفعلي في أي كتيبة أو سرية دون هذا الحد المحدد.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4.5 bg-slate-50/60 rounded-2xl border border-slate-100">
                      <ThresholdAdjuster value={warningThreshold} onChange={setWarningThreshold} />
                      
                      <div className="flex-1 sm:border-r border-slate-200 sm:pr-4 py-1 flex items-center gap-3">
                        {/* Live Readiness Visual Gauge */}
                        <div className={`w-3.5 h-3.5 rounded-full animate-pulse shrink-0 ${
                          warningThreshold >= 75 ? 'bg-emerald-500' :
                          warningThreshold >= 55 ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        
                        <div className="text-xs leading-normal font-semibold">
                          <span className="font-extrabold text-slate-700 block mb-0.5">
                            المستوى المحدد: {warningThreshold >= 75 ? 'آمن وممتاز' : warningThreshold >= 55 ? 'متوسط ومقلق' : 'حرج وتحت الإنذار'}
                          </span>
                          القيمة الموصى بها لملاكات وزارة الدفاع هي <span className="font-bold text-emerald-800">٧٠% فأكثر</span>.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Settings Toggles and Selects */}
                  <div className="space-y-4">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-850" />
                      الخيارات الإقليمية والأمان الميداني
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Hijri/Gregorian support toggle */}
                      <ToggleSwitch 
                        checked={hijriSupport}
                        onChange={setHijriSupport}
                        label="تفعيل التقويم الهجري والميلادي معاً"
                        description="دعم الحساب الفوري والتحويل التلقائي للتواريخ داخل التقارير"
                        icon={Calendar}
                      />

                      {/* Inactive Session timeout selection */}
                      <div className="flex flex-col justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 flex items-center justify-center text-slate-500 shadow-xs">
                              <Clock className="w-4.5 h-4.5 stroke-[1.5]" />
                            </div>
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-black text-slate-800 block">مهلة خمول الجلسات الفنية</span>
                              <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block leading-normal font-semibold">تسجيل الخروج التلقائي لحماية البيانات</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3.5">
                          <select
                            value={sessionTimeout}
                            onChange={(e) => setSessionTimeout(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-800/10 min-h-[40px] text-slate-700"
                          >
                            <option value="5">بعد ٥ دقائق خمول</option>
                            <option value="15">بعد ١٥ دقيقة خمول</option>
                            <option value="30">بعد ٣٠ دقيقة خمول</option>
                            <option value="0">إيقاف التفعيل التلقائي</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Brigade Details Panel (Visual Info Only, Not showing complex statistics) */}
                  <div className="h-px bg-slate-100 my-4" />
                  <div className="space-y-4">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-teal-850" />
                      بيانات التشكيل العسكري الافتراضية
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5">اسم التشكيل القيادي</label>
                        <input 
                          type="text" 
                          value={brigadeName}
                          onChange={(e) => setBrigadeName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-800/10 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5">قائد التشكيل المسؤول</label>
                        <input 
                          type="text" 
                          value={brigadeCommander}
                          onChange={(e) => setBrigadeCommander(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-800/10 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {currentUserRole !== 'admin' ? (
                      <div className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-4 py-2.5 rounded-xl font-bold">
                        ⚠️ وضع القراءة فقط: دورك لا يمنحك صلاحية حفظ التغييرات الإستراتيجية.
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSaved}
                        className="min-h-[48px] px-6 py-2.5 flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-100/50 transition-all active:scale-97 cursor-pointer"
                      >
                        {isSaved ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>حفظ واعتماد محددات اللواء</span>
                      </button>
                    )}
                  </div>
                  
                </form>
              )}

              {/* TAB 2: NOTIFICATIONS & CHANNELS */}
              {subTab === 'notifications' && (
                <div className="space-y-6">
                  
                  {/* Header info */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">التنبيهات وتوجيه الإنذار</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed font-semibold">قنوات البث التكتيكي وإرسال التذكيرات الصباحية لكتّاب البيانات في الوحدات.</p>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Daily Reminder Toggles */}
                  <div className="space-y-4">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-teal-850" />
                      تذكيرات كشف الحضور والتحضير اليومي
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Daily reminder activation */}
                      <ToggleSwitch 
                        checked={dailyReminderEnabled}
                        onChange={setDailyReminderEnabled}
                        label="تفعيل التنبيهات الدورية للكتّاب"
                        description="إصدار تنبيهات تلقائية لتذكير مدخلي الكشوفات بإكمال حضور القوة"
                        icon={Bell}
                      />

                      {/* Reminder Time set */}
                      <div className={`flex flex-col justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-2xl transition-all duration-200 ${!dailyReminderEnabled ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 flex items-center justify-center text-slate-500 shadow-xs">
                            <Clock className="w-4.5 h-4.5 stroke-[1.5]" />
                          </div>
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-black text-slate-800 block">وقت الإرسال الصباحي المعتمد</span>
                            <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block leading-normal font-semibold">موعد توجيه التذكير للكتّاب</span>
                          </div>
                        </div>
                        <div className="mt-3.5">
                          <input 
                            type="time" 
                            value={dailyReminderTime}
                            disabled={!dailyReminderEnabled}
                            onChange={(e) => setDailyReminderTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 min-h-[40px] focus:outline-hidden"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Emergency Alerts Channels */}
                  <div className="space-y-4">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-teal-850" />
                      قنوات ومحاور بث الإنذار التلقائي للقيادة
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      يتم ترحيل وبث تقارير الجاهزية والإنذارات العاجلة لقادة الألوية ومساعديهم عبر القنوات الأمنية التالية:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <ToggleSwitch 
                        checked={channelEmail}
                        onChange={setChannelEmail}
                        label="البريد الإلكتروني المعتمد"
                        description="توجيه نسخة كشف حضور آلية للبريد"
                        icon={Mail}
                      />

                      <ToggleSwitch 
                        checked={channelTelegram}
                        onChange={setChannelTelegram}
                        label="بوت تلغرام العملياتي"
                        description="بث تنبيهات فورية للمجموعات المشتركة"
                        icon={MessageSquare}
                      />

                      <ToggleSwitch 
                        checked={channelSMS}
                        onChange={setChannelSMS}
                        label="رسائل الجوال الفورية (SMS)"
                        description="إرسال إشعار فوري للجوال في حالات الطوارئ"
                        icon={Smartphone}
                      />

                    </div>

                    <div className="mt-2">
                      <label className="block text-xs font-black text-slate-500 mb-1.5">البريد الإلكتروني الرسمي لاستقبال تقارير اللواء</label>
                      <input 
                        type="email" 
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-800/10 text-slate-800 text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: USERS & PERMISSIONS */}
              {subTab === 'users' && (
                <div>
                  {/* Render Users Manager directly without duplicate header */}
                  <div className="bg-transparent rounded-2xl border-0">
                    <UsersPermissionsManager 
                      users={users}
                      units={units}
                      currentUser={currentUser}
                      onAddUser={onAddUser || (async () => {})}
                      onEditUser={onEditUser || (async () => {})}
                      onDeleteUser={onDeleteUser || (async () => {})}
                      onAddLog={onAddLog}
                    />
                  </div>

                </div>
              )}

              {/* TAB 4: BACKUP & DATA PROTECTION */}
              {subTab === 'backup' && (
                <div className="space-y-6">
                  
                  {/* Header info */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">النسخ الاحتياطي وحفظ سجلات القوة</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed font-semibold">النسخ الاحتياطي السحابي المشفر والمزامنة مع مراكز البيانات الوطنية لمنع فقدان البيانات.</p>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  {/* Render the unified Backup and Restore panel (which has full S3/Azure, Google sheets auth, restore) */}
                  <div className="bg-transparent rounded-2xl border-0">
                    <BackupRestore 
                      units={units}
                      soldiers={soldiers}
                      attendance={attendance}
                      auditLogs={auditLogs}
                      googleAccessToken={googleAccessToken}
                      onSetGoogleAccessToken={onSetGoogleAccessToken}
                      onRestoreState={onRestoreState}
                      onAddLog={onAddLog}
                    />
                  </div>

                </div>
              )}

              {/* TAB 5: PRINT SETTINGS */}
              {subTab === 'print' && (
                <form onSubmit={handleSavePrintSettings} className="space-y-6">
                  
                  {/* Header info & Preview Button */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-purple-600" />
                        <span>إعدادات الطباعة والهوية الرسمية</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-semibold">
                        إدارة الهوية الرسمية للمطبوعات داخل التطبيق (الترويسة، الشعار، التوقيع والختم) لتطبيقها آلياً على جميع الأوامر والتقارير.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFullPrintPreviewModal(true)}
                      className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>معاينة الطباعة الكاملة</span>
                    </button>
                  </div>

                  {/* Section 1: Header & Official Text */}
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-600" />
                      <span>الترويسة والنصوص الرسمية للجهة</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                      <div>
                        <label className="block mb-1.5 text-slate-600">اسم الدولة / الكيان الرئيسي</label>
                        <input
                          type="text"
                          value={countryName}
                          onChange={(e) => setCountryName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="المملكة العربية السعودية"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 text-slate-600">الوزارة / القيادة العليا</label>
                        <input
                          type="text"
                          value={ministryName}
                          onChange={(e) => setMinistryName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="وزارة الدفاع"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 text-slate-600">قيادة المنطقة / اللواء</label>
                        <input
                          type="text"
                          value={commandName}
                          onChange={(e) => setCommandName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="قيادة القوات البرية / المنطقة الشمالية الغربية"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 text-slate-600">اسم الكتيبة / الوحدة الميدانية</label>
                        <input
                          type="text"
                          value={unitName}
                          onChange={(e) => setUnitName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="كتيبة المشاة الآلية الثانية"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block mb-1.5 text-slate-600">عنوان المستند المعتمد افتراضياً</label>
                        <input
                          type="text"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="إشعار وتحضير قوة الجاهزية القتالية العاجلة"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block mb-1.5 text-slate-600">نص التذييل السفي (Footer)</label>
                        <input
                          type="text"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                          placeholder="هذا المستند سري ومحدود، ويخضع للتعليمات والأوامر العسكرية الصادرة."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Logo, Signature & Seal Assets Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Logo Upload Box */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Image className="w-4 h-4 text-purple-600" />
                            <span>شعار الجهة الرسمية</span>
                          </span>
                          <ToggleSwitch checked={showLogo} onChange={setShowLogo} label="" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">يظهر في أعلى منتصف الترويسة بجميع التقارير.</p>
                      </div>

                      {logoUrl ? (
                        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-center h-28">
                          <img src={logoUrl} alt="شعار الجهة" className="max-h-24 object-contain" />
                          <button
                            type="button"
                            onClick={() => setLogoUrl(null)}
                            className="absolute top-2 left-2 bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                            title="حذف الشعار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-purple-50/30 transition-all h-28">
                          <Upload className="w-5 h-5 text-purple-500" />
                          <span className="text-[11px] font-bold text-slate-600">رفع صورة الشعار</span>
                          <span className="text-[9px] text-slate-400">PNG / JPG / SVG</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Seal Upload Box */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>الختم الرسمي للقيادة</span>
                          </span>
                          <ToggleSwitch checked={showSeal} onChange={setShowSeal} label="" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">يظهر أسفل المستند إلى جانب اعتماد القائد.</p>
                      </div>

                      {sealUrl ? (
                        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-center h-28">
                          <img src={sealUrl} alt="الختم الرسمي" className="max-h-24 object-contain mix-blend-multiply opacity-90" />
                          <button
                            type="button"
                            onClick={() => setSealUrl(null)}
                            className="absolute top-2 left-2 bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                            title="حذف الختم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all h-28">
                          <Upload className="w-5 h-5 text-emerald-500" />
                          <span className="text-[11px] font-bold text-slate-600">رفع صورة الختم</span>
                          <span className="text-[9px] text-slate-400">خلفية شفافة مفضلة</span>
                          <input type="file" accept="image/*" onChange={handleSealUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Signature Upload Box */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-sky-600" />
                            <span>توقيع القائد المعتمد</span>
                          </span>
                          <ToggleSwitch checked={showSignature} onChange={setShowSignature} label="" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">توقيع خانة المصادقة المباشرة بالتقرير.</p>
                      </div>

                      {signatureUrl ? (
                        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-center h-28">
                          <img src={signatureUrl} alt="توقيع القائد" className="max-h-24 object-contain mix-blend-multiply" />
                          <button
                            type="button"
                            onClick={() => setSignatureUrl(null)}
                            className="absolute top-2 left-2 bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                            title="حذف التوقيع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-sky-50/30 transition-all h-28">
                          <Upload className="w-5 h-5 text-sky-500" />
                          <span className="text-[11px] font-bold text-slate-600">رفع صورة التوقيع</span>
                          <span className="text-[9px] text-slate-400">PNG / JPG</span>
                          <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                  </div>

                  {/* Section 3: Paper Dimensions & Page Layout */}
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                    <div>
                      <label className="block mb-1.5 text-slate-600">قياس الورق الافتراضي للطباعة</label>
                      <select
                        value={paperSize}
                        onChange={(e: any) => setPaperSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                      >
                        <option value="A4">A4 القياسي (210 × 297 مم)</option>
                        <option value="A5">A5 الميداني الصغير (148 × 210 مم)</option>
                        <option value="Letter">Letter الحجم الرسائل (216 × 279 مم)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-slate-600">اتجاه الطباعة الافتراضي</label>
                      <select
                        value={orientation}
                        onChange={(e: any) => setOrientation(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                      >
                        <option value="portrait">عمودي (Portrait)</option>
                        <option value="landscape">أفقي (Landscape)</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 4: Live Mini Header Preview */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <span>معاينة حية لترويسة التقرير الموحدة</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">تطبيق تلقائي عند طباعة أي كشف أو أمر</span>
                    </div>

                    <div className="bg-amber-50/20 border border-amber-200/60 p-4 sm:p-6 rounded-xl font-serif text-slate-900 space-y-4">
                      {/* Top Header Grid */}
                      <div className="grid grid-cols-3 items-center text-center text-xs sm:text-sm font-black border-b border-amber-900/10 pb-4">
                        <div className="text-right space-y-1">
                          <p className="text-slate-900">{countryName}</p>
                          <p className="text-slate-700 text-[11px]">{ministryName}</p>
                          <p className="text-slate-600 text-[10px]">{commandName}</p>
                          <p className="text-purple-900 text-[10px] font-black">{unitName}</p>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          {showLogo && logoUrl ? (
                            <img src={logoUrl} alt="الشعار" className="h-16 max-w-[120px] object-contain" />
                          ) : (
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-800/30 flex items-center justify-center text-[10px] text-amber-900/50 font-sans">
                              شعار الجهة
                            </div>
                          )}
                        </div>

                        <div className="text-left space-y-1 font-sans text-[11px]">
                          <p className="text-slate-700">التاريخ: <span className="font-mono">{new Date().toISOString().split('T')[0]}</span></p>
                          <p className="text-slate-700">الرقم: <span className="font-mono">442 / م / 102</span></p>
                          <p className="text-slate-700">المرفقات: <span className="font-semibold">يوجد</span></p>
                        </div>
                      </div>

                      {/* Main Document Title Sample */}
                      <div className="text-center py-2">
                        <h2 className="text-base sm:text-lg font-black underline decoration-double decoration-slate-400 underline-offset-4">
                          {headerText}
                        </h2>
                      </div>

                      {/* Bottom Footer Sample */}
                      <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                        <span>{footerText}</span>
                        <div className="flex items-center gap-4">
                          {showSeal && sealUrl && (
                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">الختم مفعّل</span>
                          )}
                          {showSignature && signatureUrl && (
                            <span className="text-[10px] text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">التوقيع مفعّل</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Settings Action Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={currentUserRole !== 'admin'}
                      className={`px-6 py-3 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                        isPrintSaved 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                      }`}
                    >
                      {isPrintSaved ? (
                        <>
                          <Check className="w-4 h-4 animate-bounce" />
                          <span>تم الحفظ والتطبيق!</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          <span>حفظ وتطبيق إعدادات الطباعة</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
      )}

      {/* FULL PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {showFullPrintPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 sm:p-8 space-y-6"
            >
              {/* Modal Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">معاينة المستند الرسمي قبل الطباعة</h3>
                    <p className="text-xs text-slate-500 font-medium">شكل المستند المطبوع بالكامل كما يظهر للقيادة والكتائب</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadElementAsPdf('settings-print-preview', 'نموذج_معاينة_الهوية_الرسمية')}
                    className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFullPrintPreviewModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Page Visual Box */}
              <div className="bg-amber-50/30 border border-slate-300 p-8 sm:p-12 rounded-2xl shadow-inner font-serif text-slate-900 space-y-8" id="settings-print-preview">
                
                {/* Header */}
                <div className="grid grid-cols-3 items-center text-center font-black border-b-2 border-slate-900 pb-6">
                  <div className="text-right space-y-1 text-xs sm:text-sm">
                    <p>{countryName}</p>
                    <p className="text-slate-800">{ministryName}</p>
                    <p className="text-slate-700">{commandName}</p>
                    <p className="text-purple-900">{unitName}</p>
                  </div>

                  <div className="flex items-center justify-center">
                    {showLogo && logoUrl ? (
                      <img src={logoUrl} alt="الشعار الرسمى" className="h-20 max-w-[140px] object-contain" />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-xs text-slate-400 font-sans">
                        شعار المطبوعات
                      </div>
                    )}
                  </div>

                  <div className="text-left space-y-1 font-sans text-xs">
                    <p>التاريخ: <span className="font-mono">{new Date().toISOString().split('T')[0]}</span></p>
                    <p>رقم الأمر: <span className="font-mono">1098 / ق</span></p>
                    <p>الدرجة: <span className="font-bold text-rose-700">سري ومحدود</span></p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center py-2">
                  <h1 className="text-xl sm:text-2xl font-black underline decoration-2 underline-offset-8">
                    {headerText}
                  </h1>
                </div>

                {/* Body Content Placeholder */}
                <div className="space-y-4 font-sans text-xs sm:text-sm leading-relaxed text-slate-800 border-y border-slate-200 py-6">
                  <p className="font-bold">إلى: جميع أركان ووحدات اللواء والكتائب الميدانية</p>
                  <p>
                    بناءً على الصلاحيات الممنوحة والأوامر الإدارية المنظمة لجاهزية القوات، يُعتمد هذا النموذج الرسمي كمرجع موحد لجميع المطبوعات والكشوفات والتقارير اليومية الصادرة من المنظومة القيادية.
                  </p>
                  <p className="bg-amber-100/50 p-3 rounded-lg border-r-4 border-amber-600 font-semibold text-slate-900">
                    ملاحظة: تُحفظ هذه الإعدادات تلقائياً وتُطبق فوراً على جميع كشوفات التحضير اليومي، ومنح الإجازات، والبيانات الإحصائية.
                  </p>
                </div>

                {/* Signatures & Seal Section */}
                <div className="grid grid-cols-2 gap-8 pt-6 font-sans">
                  
                  {/* Seal Box */}
                  <div className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white/50 space-y-2">
                    <span className="text-xs font-bold text-slate-500">الختم الرسمي للمنظومة</span>
                    {showSeal && sealUrl ? (
                      <img src={sealUrl} alt="الختم الرسمي" className="h-20 object-contain mix-blend-multiply opacity-90" />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                        الختم الرسمي
                      </div>
                    )}
                  </div>

                  {/* Signature Box */}
                  <div className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white/50 space-y-2 text-center">
                    <span className="text-xs font-extrabold text-slate-900">قائد اللواء / المعتمد</span>
                    <span className="text-[11px] text-slate-600 font-semibold">{brigadeCommander}</span>
                    {showSignature && signatureUrl ? (
                      <img src={signatureUrl} alt="التوقيع" className="h-16 object-contain mix-blend-multiply" />
                    ) : (
                      <div className="h-12 border-b border-dashed border-slate-400 w-36 flex items-end justify-center text-[10px] text-slate-400">
                        التوقيع والاعتماد
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer Note */}
                <div className="text-center pt-4 border-t border-slate-300 text-xs text-slate-500 font-sans">
                  {footerText}
                </div>

              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFullPrintPreviewModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
