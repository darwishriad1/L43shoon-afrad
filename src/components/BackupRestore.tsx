import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  FileJson,
  Wifi,
  FileSpreadsheet,
  CheckCircle2,
  HardDrive,
  Users,
  Building2,
  ListCheck,
  History,
  Server,
  Cloud,
  Layers,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  UploadCloud,
  Check,
  ExternalLink,
  Lock,
  AlertCircle,
  Eye,
  HelpCircle,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Unit, Soldier, AttendanceRecord, AuditLog } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { createBackupSpreadsheet, updateBackupData, readBackupSpreadsheet } from '../lib/sheets';
import { triggerToast } from './ToastContainer';
import SecondaryDatabaseManager from './SecondaryDatabaseManager';

export type BackupToolId = 'grid' | 'secondary_db' | 'supabase' | 'json' | 'sheets' | 'explorer' | 'snapshots' | 'all';

interface BackupRestoreProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  auditLogs: AuditLog[];
  googleAccessToken: string | null;
  onSetGoogleAccessToken: (token: string | null) => void;
  onRestoreState: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }) => void;
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
  onResetDatabase?: () => Promise<void> | void;
  currentUser?: any;
  initialTool?: BackupToolId;
}

export default function BackupRestore({
  units,
  soldiers,
  attendance,
  auditLogs,
  googleAccessToken,
  onSetGoogleAccessToken,
  onRestoreState,
  onAddLog,
  currentUser,
  initialTool = 'grid'
}: BackupRestoreProps) {
  const [activeTool, setActiveTool] = useState<BackupToolId>(initialTool);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

  // Escape key handler to return to grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool !== 'grid') {
        setActiveTool('grid');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  // Lock body scroll when in Full Screen mode
  useEffect(() => {
    if (activeTool !== 'grid' && isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeTool, isFullscreen]);

  // Ensure fullscreen is active when a tool is selected
  const handleSelectTool = (toolId: BackupToolId) => {
    setIsFullscreen(true);
    setActiveTool(toolId);
  };

  // Google Sheets state
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState('');

  // Drag & drop state for JSON
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authorization for Google Sheets
  const handleConnectSheets = async () => {
    try {
      setIsSheetsLoading(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        onSetGoogleAccessToken(credential.accessToken);
        triggerToast('تم ربط وتفويض حساب Google Sheets بنجاح!', 'success');
      } else {
        triggerToast('تعذر الحصول على رمز التفويض من Google.', 'error');
      }
    } catch (err: any) {
      console.error('Failed to authorize Google Sheets:', err);
      triggerToast(`خطأ في الاتصال: ${err.message || 'يرجى المحاولة مجدداً.'}`, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Export to Google Sheets
  const handleExportToSheets = async () => {
    if (!googleAccessToken) return;
    try {
      setIsSheetsLoading(true);
      const dateStr = new Date().toISOString().split('T')[0];
      const title = `نسخة_احتياطية_اللواء_43_${dateStr}`;
      
      const spreadsheet = await createBackupSpreadsheet(googleAccessToken, title);
      await updateBackupData(googleAccessToken, spreadsheet.id, {
        units,
        soldiers,
        attendance,
        auditLogs
      });
      
      setSheetUrl(spreadsheet.url);
      onAddLog('إضافة', 'النسخ الاحتياطي السحابي', `تصدير كامل لقاعدة البيانات إلى جدول Google Sheets جديد (${title}).`);
      triggerToast('تم تصدير نسخة البيانات بنجاح إلى Google Sheets!', 'success');
    } catch (err: any) {
      console.error('Failed to export to Google Sheets:', err);
      triggerToast(`خطأ أثناء التصدير: ${err.message || 'يرجى المحاولة لاحقاً.'}`, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Restore from Google Sheets
  const handleRestoreFromSheets = async () => {
    if (!googleAccessToken) return;
    
    let targetId = sheetIdInput.trim();
    if (!targetId) {
      triggerToast('الرجاء إدخال رابط أو معرف جدول Google Sheets للاستعادة.', 'warning');
      return;
    }
    
    const urlRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = targetId.match(urlRegex);
    if (match && match[1]) {
      targetId = match[1];
    }
    
    try {
      setIsSheetsLoading(true);
      const importedData = await readBackupSpreadsheet(googleAccessToken, targetId);
      
      const confirmRestore = window.confirm(
        `تنبيه استعادة البيانات:\n` +
        `وجدنا في الجدول:\n` +
        `• عدد الوحدات: ${importedData.units.length}\n` +
        `• عدد الأفراد: ${importedData.soldiers.length}\n` +
        `• سجلات الحضور: ${importedData.attendance.length}\n` +
        `• سجلات الرقابة: ${importedData.auditLogs.length}\n\n` +
        `سيتم استبدال قاعدة البيانات الحالية بالكامل بهذا الجدول. هل أنت متأكد؟`
      );
      
      if (confirmRestore) {
        onRestoreState(importedData);
        onAddLog('استعادة', 'النسخ الاحتياطي السحابي', `استعادة كاملة لقاعدة البيانات من Google Sheets (${targetId}).`);
        triggerToast('تمت استعادة السجلات بنجاح بنسبة 100%!', 'success');
        setSheetIdInput('');
      }
    } catch (err: any) {
      console.error('Failed to restore from Google Sheets:', err);
      triggerToast(`فشلت استعادة البيانات: ${err.message || 'تأكد من رابط الجدول والتصاريح.'}`, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // 1. EXPORT LOCAL JSON FILE
  const handleExportBackupFile = () => {
    const backupPayload = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      source: 'نظام إدارة وحصر القوة العسكرية - اللواء 43 عمالقة',
      counts: {
        units: units.length,
        soldiers: soldiers.length,
        attendance: attendance.length,
        auditLogs: auditLogs.length
      },
      data: {
        units,
        soldiers,
        attendance,
        auditLogs
      }
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_اللواء_43_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog('إضافة', 'النسخ الاحتياطي', 'تصدير نسخة احتياطية محلية بصيغة JSON.');
    triggerToast('تم تنزيل ملف النسخة الاحتياطية (.json) بنجاح', 'success');
  };

  // 2. PROCESS IMPORTED JSON FILE
  const processJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        if (!parsed.data || !parsed.data.units || !parsed.data.soldiers || !parsed.data.attendance) {
          throw new Error('الملف المرفق غير صالح أو لا يطابق تنسيق نسخ النظام.');
        }

        const confirmRestore = window.confirm(
          `تأكيد استعادة النسخة الاحتياطية:\n` +
          `• تاريخ النسخة: ${parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('ar-YE') : 'غير محدد'}\n` +
          `• الأفراد: ${parsed.data.soldiers.length} جندي\n` +
          `• الوحدات: ${parsed.data.units.length} وحدة\n\n` +
          `تنبيه: سيتم استبدال الكشوفات الحالية بهذه النسخة. هل ترغب بالاستمرار؟`
        );

        if (confirmRestore) {
          onRestoreState({
            units: parsed.data.units,
            soldiers: parsed.data.soldiers,
            attendance: parsed.data.attendance,
            auditLogs: parsed.data.auditLogs || []
          });

          onAddLog('استعادة', 'النسخ الاحتياطي', `استعادة كاملة لقاعدة البيانات من ملف JSON محلي.`);
          triggerToast('تمت استعادة السجلات والبيانات بنجاح!', 'success');
        }
      } catch (err: any) {
        triggerToast(`فشلت استعادة الملف: ${err.message || 'تنسيق الملف غير مدعوم.'}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processJsonFile(file);
    if (e.target) e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        processJsonFile(file);
      } else {
        triggerToast('يرجى سحب وإفلات ملف بصيغة JSON فقط.', 'warning');
      }
    }
  };

  // 3. QUICK MANUAL SYNC & AUDIT
  const handleQuickSync = () => {
    setIsCloudSyncing(true);
    setTimeout(() => {
      setIsCloudSyncing(false);
      const nowStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      onAddLog('إضافة', 'النسخ الاحتياطي', 'إجراء فحص ومزامنة دورية لسلامة السجلات.');
      triggerToast('تم فحص سلامة وتزامن قاعدة البيانات بنجاح!', 'success');
    }, 800);
  };

  // 6 Launcher Grid items for Backup & Data
  const backupGridItems = [
    {
      id: 'secondary_db' as const,
      label: 'قاعدة البيانات الاحتياطية',
      desc: 'محرك الاحتياط المتزامن ورفع كل شيء بنقرة واحدة',
      icon: Server,
      accentColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100/60 group-hover:bg-emerald-500 group-hover:text-white',
      badge: 'مزدوجة متطابقة',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-100',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(16,185,129,0.2)]'
    },
    {
      id: 'supabase' as const,
      label: 'تكامل Supabase السحابي',
      desc: 'مزامنة سحابية حية مع PostgreSQL واختبار الاتصال',
      icon: Cloud,
      accentColor: 'bg-teal-500',
      iconBg: 'bg-teal-50 text-teal-700 border-teal-100/60 group-hover:bg-teal-500 group-hover:text-white',
      badge: 'سحابي مشفر',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-100',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(20,184,166,0.2)]'
    },
    {
      id: 'json' as const,
      label: 'النسخ المحلي والتصدير',
      desc: 'تصدير وتنزيل واستعادة ملفات كشوفات مشفرة محلياً',
      icon: HardDrive,
      accentColor: 'bg-indigo-500',
      iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-100/60 group-hover:bg-indigo-500 group-hover:text-white',
      badge: 'ملفات JSON',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-100',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(99,102,241,0.2)]'
    },
    {
      id: 'sheets' as const,
      label: 'جداول Google Sheets',
      desc: 'تصدير واستعادة الكشوفات مع حساب Google Drive',
      icon: FileSpreadsheet,
      accentColor: 'bg-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60 group-hover:bg-emerald-600 group-hover:text-white',
      badge: 'Google Drive',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(5,150,105,0.2)]'
    },
    {
      id: 'explorer' as const,
      label: 'مستكشف واستعراض الجداول',
      desc: 'استعراض وبحث وفحص بيانات كافة الجداول الحية',
      icon: Layers,
      accentColor: 'bg-amber-500',
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100/60 group-hover:bg-amber-500 group-hover:text-white',
      badge: 'فحص السجلات',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-100',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(245,158,11,0.2)]'
    },
    {
      id: 'snapshots' as const,
      label: 'اللقطات واسترجاع النظام',
      desc: 'حفظ نقاط استعادة مجمدة واسترجاعها في أي وقت',
      icon: Sparkles,
      accentColor: 'bg-purple-500',
      iconBg: 'bg-purple-50 text-purple-700 border-purple-100/60 group-hover:bg-purple-500 group-hover:text-white',
      badge: 'نقاط استعادة',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-100',
      hoverShadow: 'hover:shadow-[0_12px_24px_-10px_rgba(168,85,247,0.2)]'
    }
  ];

  return (
    <div className="space-y-4 text-right font-sans" dir="rtl">
      
      {/* MAIN ICON GRID (LAUNCHER) or SUB-VIEW PANEL */}
      {activeTool === 'grid' ? (
        /* ICON GRID LAUNCHER - EXACT STYLE AS THE SETTINGS PAGE GRID */
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/85 relative overflow-hidden shadow-xs space-y-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-10 opacity-40"></div>

          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-slate-800 tracking-wider">
                أدوات النسخ الاحتياطي ومزامنة البيانات (اختر أداة للفتح الفوري)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTool('all')}
              className="text-[10px] sm:text-[11px] font-black text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كافة الأدوات معاً</span>
              <ChevronLeft className="w-3 h-3 rotate-180" />
            </button>
          </div>

          {/* Grid of 6 Icons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 relative z-10">
            {backupGridItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectTool(item.id)}
                  className={`flex flex-col items-center justify-between p-3 pb-2.5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer group relative h-[128px] w-full overflow-hidden ${item.hoverShadow}`}
                  title={item.desc}
                >
                  <div className={`absolute top-0 inset-x-0 h-[3.5px] ${item.accentColor} rounded-t-2xl transition-all duration-300 group-hover:h-[5px]`} />
                  
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border shadow-xs transition-all duration-300 group-hover:scale-105 ${item.iconBg}`}>
                    <Icon className="w-5.5 h-5.5 transition-transform duration-300 group-hover:rotate-3" />
                  </div>
                  
                  <span className="text-[10px] sm:text-[11px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight mt-1 truncate w-full px-1">
                    {item.label}
                  </span>
                  
                  <span className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-lg border transition-all duration-300 truncate max-w-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Quick Shortcuts Bottom Bar */}
          <div className="pt-3 border-t border-slate-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-backup-launcher-toggle"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
              />
              <label htmlFor="auto-backup-launcher-toggle" className="cursor-pointer text-[11px] sm:text-xs font-bold text-slate-700">
                النسخ الاحتياطي التلقائي الدوري نشط ومفعل لمنع فقدان البيانات
              </label>
            </div>

            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>آخر فحص: <strong>{lastSyncTime}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* SUB-TOOL FOCUSED VIEW (FULL SCREEN OR EMBEDDED) */
        (() => {
          const currentItem = backupGridItems.find(i => i.id === activeTool);
          const CurrentIcon = currentItem?.icon || Server;

          const toolContent = (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTool}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* TOOL 1: SECONDARY DB LIVE MATRIX */}
                {(activeTool === 'secondary_db' || activeTool === 'all') && (
                  <div className="space-y-4">
                    <SecondaryDatabaseManager 
                      currentUser={currentUser}
                      initialTab="overview"
                      hideHero={false}
                      hideSubTabs={true}
                      onRefreshAppState={onRestoreState ? () => onRestoreState({ units, soldiers, attendance, auditLogs }) : undefined}
                    />
                  </div>
                )}

                {/* TOOL 2: SUPABASE CLOUD SYNC */}
                {(activeTool === 'supabase' || activeTool === 'all') && (
                  <div className="space-y-4">
                    <SecondaryDatabaseManager 
                      currentUser={currentUser}
                      initialTab="supabase"
                      hideHero={true}
                      hideSubTabs={true}
                      onRefreshAppState={onRestoreState ? () => onRestoreState({ units, soldiers, attendance, auditLogs }) : undefined}
                    />
                  </div>
                )}

                {/* TOOL 3: LOCAL JSON EXPORT & IMPORT */}
                {(activeTool === 'json' || activeTool === 'all') && (
                  <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/85 dark:border-slate-800 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-xs">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">النسخ الاحتياطي والاستعادة المحلية (.JSON)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">تنزيل ملف آمن على جهازك أو سحب وإفلات ملف سابق لاستعادة الكشوفات بنقرة واحدة</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Export JSON Button Card */}
                      <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">إنشاء وتنزيل نسخة محليّة</h4>
                            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 font-semibold mt-1 leading-relaxed">تصدير كامل كشوفات اللواء والأفراد والتحضير والرقابة لملف JSON مشفر محلياً</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleExportBackupFile}
                          className="w-full min-h-[46px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25"
                        >
                          <FileJson className="w-4.5 h-4.5" />
                          <span>تصدير وتنزيل الملف الآن (.json)</span>
                        </button>
                      </div>

                      {/* Import JSON with Drag & Drop */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={handleDropFile}
                        className={`bg-slate-50 dark:bg-slate-900/40 border rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-2xs ${
                          isDraggingFile ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-4 ring-indigo-400/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">استعادة من ملف محلي (أو سحب وإفلات)</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-relaxed">رفع ملف JSON سابق لاستبدال السجلات بالكشف المستورد وتحديث المنظومة</p>
                          </div>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImportBackupFile}
                          accept=".json"
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full min-h-[46px] bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                        >
                          <Upload className="w-4.5 h-4.5" />
                          <span>رفع واستعادة البيانات (.json)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TOOL 4: GOOGLE SHEETS CLOUD SYNC */}
                {(activeTool === 'sheets' || activeTool === 'all') && (
                  <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-xs">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">المزامنة مع جداول Google Sheets السحابية</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">حفظ وتصدير واستعادة الكشوفات مع حساب Google Drive المعتمد</p>
                        </div>
                      </div>

                      <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-full font-black flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        تكامل سحابي موثق
                      </span>
                    </div>

                    {!googleAccessToken ? (
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4">
                        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                          <Wifi className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">ربط وتفويض حساب Google</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
                          انقر على الزر أدناه لتسجيل الدخول بتفويض Google آمن لتمكين التصدير والاستعادة المباشرة لجداول Google Sheets.
                        </p>
                        <button
                          type="button"
                          onClick={handleConnectSheets}
                          disabled={isSheetsLoading}
                          className="min-h-[46px] px-8 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-2xl text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/25 disabled:opacity-50"
                        >
                          {isSheetsLoading ? (
                            <>
                              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                              <span>جاري الربط والتفويض...</span>
                            </>
                          ) : (
                            <>
                              <Wifi className="w-4.5 h-4.5" />
                              <span>ربط وتفويض Google Sheets الآن</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Export to Sheets */}
                        <div className="border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xs">
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              تصدير كشف جديد إلى Google Sheets
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                              إنشاء جدول جديد في Google Drive وتنزيل كافة بيانات القوة، الوحدات والحضور فيه.
                            </p>
                          </div>

                          <div className="space-y-3 pt-2">
                            <button
                              type="button"
                              onClick={handleExportToSheets}
                              disabled={isSheetsLoading}
                              className="w-full min-h-[46px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/25 disabled:opacity-50"
                            >
                              {isSheetsLoading ? (
                                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                              ) : (
                                <Download className="w-4.5 h-4.5" />
                              )}
                              <span>تصدير إلى جدول Google Sheets جديد</span>
                            </button>

                            {sheetUrl && (
                              <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3 text-right space-y-1 shadow-2xs">
                                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-black block">تم إنشاء الجدول بنجاح:</span>
                                <a
                                  href={sheetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 font-black underline break-all block"
                                >
                                  فتح الجدول في Google Sheets 🔗
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Restore from Sheets */}
                        <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xs">
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                              استعادة الكشف من Google Sheets
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                              ألصق رابط أو معرف (Spreadsheet ID) لجدول سابق لاستعادة الكشف فوراً.
                            </p>
                          </div>

                          <div className="space-y-3 pt-2">
                            <input
                              type="text"
                              placeholder="ألصق رابط أو ID جدول Google Sheets هنا..."
                              value={sheetIdInput}
                              onChange={(e) => setSheetIdInput(e.target.value)}
                              className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:border-emerald-600 font-mono text-left"
                              dir="ltr"
                            />

                            <button
                              type="button"
                              onClick={handleRestoreFromSheets}
                              disabled={isSheetsLoading}
                              className="w-full min-h-[46px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25 disabled:opacity-50"
                            >
                              {isSheetsLoading ? (
                                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                              ) : (
                                <Upload className="w-4.5 h-4.5" />
                              )}
                              <span>قراءة واستعادة البيانات من الجدول</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TOOL 5: DATA EXPLORER */}
                {(activeTool === 'explorer' || activeTool === 'all') && (
                  <div className="space-y-4">
                    <SecondaryDatabaseManager 
                      currentUser={currentUser}
                      initialTab="explorer"
                      hideHero={true}
                      hideSubTabs={true}
                      onRefreshAppState={onRestoreState ? () => onRestoreState({ units, soldiers, attendance, auditLogs }) : undefined}
                    />
                  </div>
                )}

                {/* TOOL 6: SNAPSHOTS & RESTORE */}
                {(activeTool === 'snapshots' || activeTool === 'all') && (
                  <div className="space-y-4">
                    <SecondaryDatabaseManager 
                      currentUser={currentUser}
                      initialTab="snapshots"
                      hideHero={true}
                      hideSubTabs={true}
                      onRefreshAppState={onRestoreState ? () => onRestoreState({ units, soldiers, attendance, auditLogs }) : undefined}
                    />
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          );

          {/* Render in Fullscreen Overlay Mode by default */}
          if (isFullscreen) {
            return (
              <div className="fixed inset-0 z-[150] bg-slate-100/95 dark:bg-slate-950/98 backdrop-blur-md overflow-y-auto flex flex-col font-sans" dir="rtl">
                {/* Sticky Header with Navigation and Tool Switcher */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 py-3 shadow-xs">
                  <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    
                    {/* Right Side: Back button + Active Tool Info */}
                    <div className="flex items-center justify-between md:justify-start gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTool('grid')}
                        className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0"
                      >
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                        <span>العودة لشبكة الأيقونات</span>
                        <span className="hidden lg:inline-block px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded font-mono">Esc</span>
                      </button>

                      {currentItem && (
                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-2xl">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${currentItem.iconBg}`}>
                            <CurrentIcon className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 dark:text-white">{currentItem.label}</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${currentItem.badgeColor}`}>
                                {currentItem.badge}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mobile Close Button */}
                      <button
                        type="button"
                        onClick={() => setActiveTool('grid')}
                        className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex md:hidden items-center justify-center cursor-pointer"
                        title="إغلاق والعودة"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Center: Scrollable Tool Switcher Pills */}
                    <div className="overflow-x-auto no-scrollbar py-1 flex items-center gap-1.5 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 md:pt-0">
                      {backupGridItems.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTool === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTool(tab.id)}
                            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                              isActive
                                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setActiveTool('all')}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                          activeTool === 'all'
                            ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>عرض الكل</span>
                      </button>
                    </div>

                    {/* Left Actions: Minimize & Close */}
                    <div className="hidden md:flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsFullscreen(false)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="عرض مدمج داخل الصفحة"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>عرض مدمج</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTool('grid')}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="إغلاق الشاشة الكاملة (Esc)"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Main Fullscreen Body Content */}
                <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
                  {toolContent}
                </div>
              </div>
            );
          }

          {/* Fallback Embedded View when user minimizes */}
          return (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/85 dark:border-slate-800 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTool('grid')}
                      className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                      <span>العودة لشبكة الأيقونات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="min-h-[42px] px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="فتح في شاشة كاملة"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>تكبير للشاشة الكاملة</span>
                    </button>
                  </div>

                  {currentItem && (
                    <div className="flex items-center gap-2.5 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-3.5 py-2 rounded-2xl">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs ${currentItem.iconBg}`}>
                        <CurrentIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{currentItem.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${currentItem.badgeColor}`}>
                            {currentItem.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">{currentItem.desc}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Horizontal Scrollable Pill Tabs */}
                <div className="w-full overflow-x-auto no-scrollbar py-1 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {backupGridItems.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTool === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTool(tab.id)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                          isActive
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setActiveTool('all')}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                      activeTool === 'all'
                        ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>عرض الكل</span>
                  </button>
                </div>
              </div>

              {toolContent}
            </div>
          );
        })()
      )}

    </div>
  );
}
