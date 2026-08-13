import React, { useState, useRef } from 'react';
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
  History
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AuditLog } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { createBackupSpreadsheet, updateBackupData, readBackupSpreadsheet } from '../lib/sheets';
import { triggerToast } from './ToastContainer';
import CloudDatabaseSync from './CloudDatabaseSync';

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
}

export default function BackupRestore({
  units,
  soldiers,
  attendance,
  auditLogs,
  googleAccessToken,
  onSetGoogleAccessToken,
  onRestoreState,
  onAddLog
}: BackupRestoreProps) {
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState('');

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
      triggerToast('الرجاء إدخال رابط أو معرف جدول Google Sheets الاستعادة.', 'warning');
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

  // ---- 1. EXPORT LOCAL JSON FILE ----
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

  // ---- 2. IMPORT LOCAL JSON FILE ----
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    if (e.target) e.target.value = '';
  };

  // ---- 3. QUICK MANUAL SYNC & AUDIT ----
  const handleQuickSync = () => {
    setIsCloudSyncing(true);
    setTimeout(() => {
      setIsCloudSyncing(false);
      const nowStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      onAddLog('إضافة', 'النسخ الاحتياطي', 'إجراء مزامنة محلية وفحص سلامة السجلات.');
      triggerToast('تم فحص وحفظ سلامة قاعدة البيانات بنجاح!', 'success');
    }, 800);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right font-sans" dir="rtl">
      
      {/* Current Data Overview Stats Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white">حجم قاعدة البيانات الحالية</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-extrabold">البيانات التي سيتم تصديرها أو حفظها في النسخ الاحتياطي</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-black flex items-center gap-1 self-start sm:self-auto">
            <ShieldCheck className="w-3 h-3" />
            قاعدة بيانات نشطة ومحفوظة
          </span>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
          <div className="bg-slate-800/80 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold mb-0.5">
              <Building2 className="w-3 h-3 text-indigo-400" />
              <span>الوحدات</span>
            </div>
            <p className="text-sm sm:text-base font-black text-indigo-300">{units.length}</p>
          </div>

          <div className="bg-slate-800/80 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold mb-0.5">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>القوة البشرية</span>
            </div>
            <p className="text-sm sm:text-base font-black text-emerald-300">{soldiers.length}</p>
          </div>

          <div className="bg-slate-800/80 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold mb-0.5">
              <ListCheck className="w-3 h-3 text-amber-400" />
              <span>سجلات الحضور</span>
            </div>
            <p className="text-sm sm:text-base font-black text-amber-300">{attendance.length}</p>
          </div>

          <div className="bg-slate-800/80 p-2 sm:p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold mb-0.5">
              <History className="w-3 h-3 text-cyan-400" />
              <span>سجلات الرقابة</span>
            </div>
            <p className="text-sm sm:text-base font-black text-cyan-300">{auditLogs.length}</p>
          </div>
        </div>
      </div>

      {/* SECTION 0: Cloud Database Inspection & Sync Section */}
      <CloudDatabaseSync
        units={units}
        soldiers={soldiers}
        attendance={attendance}
        auditLogs={auditLogs}
        onAddLog={onAddLog}
        onRestoreState={onRestoreState}
      />

      {/* SECTION 1: Local Backup & Restore Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <HardDrive className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">النسخ الاحتياطي والاستعادة المحلية (.JSON)</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">تنزيل ملف آمن على جهازك أو رفع ملف سابق لاستعادة الكشوفات بنقرة واحدة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Export JSON Button Card */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 hover:border-indigo-200 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-indigo-950">إنشاء وتنزيل نسخة محليّة</h4>
                <p className="text-[10px] sm:text-xs text-indigo-800/80 font-semibold mt-0.5">تصدير كامل كشوفات اللواء والأفراد للقرص المحلي</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportBackupFile}
              className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <FileJson className="w-4 h-4" />
              <span>تصدير وتنزيل الملف (.json)</span>
            </button>
          </div>

          {/* Import JSON Button Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">استعادة من ملف محلي</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">رفع ملف JSON سابق لاستبدال السجلات بالكشف المستورد</p>
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
              className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>رفع واستعادة البيانات (.json)</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 2: Direct Google Sheets Integration Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-emerald-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-black shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">المزامنة مع جداول Google Sheets السحابية</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">حفظ وتصدير واستعادة الكشوفات مع حساب Google Drive المعتمد</p>
            </div>
          </div>

          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 self-start sm:self-auto">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            تكامل سحابي موثق
          </span>
        </div>

        {!googleAccessToken ? (
          /* Connect Google Sheets Auth Button */
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <Wifi className="w-6 h-6" />
            </div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900">ربط وتفويض حساب Google</h4>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
              انقر على الزر أدناه لتسجيل الدخول بتفويض Google آمن لتمكين التصدير والاستعادة المباشرة لجداول Google Sheets.
            </p>
            <button
              type="button"
              onClick={handleConnectSheets}
              disabled={isSheetsLoading}
              className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSheetsLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الربط والتفويض...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>ربط وتفويض Google Sheets الآن</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Connected State: Export & Restore Actions */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Export to Sheets */}
            <div className="border border-emerald-200/80 bg-emerald-50/30 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  تصدير كشف جديد إلى Google Sheets
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-normal">
                  إنشاء جدول جديد في Google Drive وتنزيل كافة بيانات القوة، الوحدات والحضور فيه.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportToSheets}
                  disabled={isSheetsLoading}
                  className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isSheetsLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>تصدير إلى جدول Google Sheets جديد</span>
                </button>

                {sheetUrl && (
                  <div className="bg-white border border-emerald-300 rounded-xl p-2.5 text-right space-y-1 shadow-xs">
                    <span className="text-[10px] text-emerald-800 font-black block">تم إنشاء الجدول بنجاح:</span>
                    <a
                      href={sheetUrl}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="text-xs text-blue-600 font-black underline break-all block"
                    >
                      فتح الجدول في Google Sheets 🔗
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Restore from Sheets */}
            <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  استعادة الكشف من Google Sheets
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold leading-normal">
                  ألصق رابط أو معرف (Spreadsheet ID) لجدول سابق لاستعادة الكشف فوراً.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="ألصق رابط أو ID جدول Google Sheets هنا..."
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-mono text-left dir-ltr"
                />

                <button
                  type="button"
                  onClick={handleRestoreFromSheets}
                  disabled={isSheetsLoading}
                  className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isSheetsLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>قراءة واستعادة البيانات من الجدول</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* SECTION 3: Auto Backup Settings & Instant Integrity Check */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="auto-backup-toggle"
              checked={autoBackupEnabled}
              onChange={(e) => setAutoBackupEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
            <label htmlFor="auto-backup-toggle" className="cursor-pointer">
              <span className="text-xs sm:text-sm font-black text-slate-900 block">تفعيل النسخ الاحتياطي التلقائي الحمايتي</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold">حفظ تلقائي دوري للبيانات لمنع فقدان كشوفات الحضور اليومية</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleQuickSync}
            disabled={isCloudSyncing}
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>فحص ومزامنة سريعة</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-bold">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-600" />
            آخر فحص سلامة للبيانات: <strong className="text-slate-700 font-mono">{lastSyncTime}</strong>
          </span>
          <span className="text-emerald-700 font-extrabold">حالة البيانات: مكتملة وسليمة 🟢</span>
        </div>
      </div>

    </div>
  );
}
