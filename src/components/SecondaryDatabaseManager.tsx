import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  Cloud,
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Server, 
  Layers, 
  HardDrive, 
  Activity, 
  ArrowLeftRight, 
  History, 
  Clock, 
  FileText, 
  Users, 
  Building2, 
  Calendar, 
  ShieldAlert, 
  Trash2, 
  Download, 
  Lock, 
  Sparkles,
  Check,
  Zap,
  Radio,
  Eye,
  EyeOff,
  Key,
  HelpCircle,
  Search,
  Copy,
  Code2,
  ExternalLink,
  Table,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithRetry, safeJson } from '../lib/api';
import { triggerToast } from './ToastContainer';

interface SecondaryDatabaseManagerProps {
  onRefreshAppState?: () => void;
  currentUser?: any;
  initialTab?: 'overview' | 'supabase' | 'explorer' | 'snapshots';
  hideHero?: boolean;
  hideSubTabs?: boolean;
}

const getTableIcon = (key: string) => {
  switch (key) {
    case 'soldiers':
      return Users;
    case 'units':
      return Building2;
    case 'attendance':
      return Calendar;
    case 'auditLogs':
      return FileText;
    case 'securityLogs':
      return ShieldAlert;
    case 'settings':
      return Database;
    default:
      return Table;
  }
};

export default function SecondaryDatabaseManager({
  onRefreshAppState,
  currentUser,
  initialTab = 'overview',
  hideHero = false,
  hideSubTabs = false
}: SecondaryDatabaseManagerProps) {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [selectedSnapshotToRestore, setSelectedSnapshotToRestore] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'supabase' | 'explorer' | 'snapshots'>(initialTab);

  // Supabase Dedicated State
  const [supabaseConfig, setSupabaseConfig] = useState<any>(null);
  const [supabaseConnTest, setSupabaseConnTest] = useState<any>(null);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [supabaseProjectName, setSupabaseProjectName] = useState('');
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);
  const [isPushingToSupabase, setIsPushingToSupabase] = useState(false);
  const [supabasePushResults, setSupabasePushResults] = useState<any>(null);

  // Data Explorer State
  const [selectedTable, setSelectedTable] = useState<string>('soldiers');
  const [explorerSearch, setExplorerSearch] = useState<string>('');
  const [explorerViewMode, setExplorerViewMode] = useState<'table' | 'cards' | 'json'>('table');
  const [fullDbData, setFullDbData] = useState<any>(null);
  const [loadingExplorerData, setLoadingExplorerData] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<any | null>(null);

  // Load Supabase Config
  const loadSupabaseInfo = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/secondary-db/supabase/config');
      if (res.ok) {
        const json = await res.json();
        setSupabaseConfig(json.config);
        setSupabaseConnTest(json.connection);
        if (json.config?.url) setSupabaseUrlInput(json.config.url);
        if (json.config?.projectName) setSupabaseProjectName(json.config.projectName);
      }
    } catch (err) {
      console.warn('Failed to load Supabase info:', err);
    }
  }, []);

  // Load status
  const loadStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/status');
      if (res.ok) {
        const json = await res.json();
        setStatusData(json);
      }
    } catch (err: any) {
      console.warn('Failed to load secondary DB status:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/secondary-db/snapshots');
      if (res.ok) {
        const json = await res.json();
        setSnapshots(json.snapshots || []);
      }
    } catch (err) {
      console.warn('Failed to load snapshots:', err);
    }
  }, []);

  // Load Full Database Data for Explorer
  const loadExplorerData = useCallback(async () => {
    setLoadingExplorerData(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/data');
      if (res.ok) {
        const json = await res.json();
        setFullDbData(json.data || {});
      }
    } catch (err) {
      console.warn('Failed to load secondary DB data for explorer:', err);
    } finally {
      setLoadingExplorerData(false);
    }
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'supabase') loadSupabaseInfo();
      if (initialTab === 'explorer') loadExplorerData();
    }
  }, [initialTab, loadSupabaseInfo, loadExplorerData]);

  useEffect(() => {
    loadStatus();
    loadSnapshots();
    loadExplorerData();
    loadSupabaseInfo();

    // Periodic pulse every 25 seconds
    const interval = setInterval(() => {
      loadStatus(true);
    }, 25000);

    return () => clearInterval(interval);
  }, [loadStatus, loadSnapshots, loadExplorerData, loadSupabaseInfo]);

  // Save Supabase Configuration
  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim() || (!supabaseKeyInput.trim() && !supabaseConfig?.hasAnonKey)) {
      triggerToast('يرجى إدخال عنوان Supabase Project URL ومفتاح API', 'error');
      return;
    }

    setIsSavingSupabase(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: supabaseUrlInput.trim(),
          anonKey: supabaseKeyInput.trim() || undefined,
          projectName: supabaseProjectName.trim() || undefined,
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'فشل حفظ إعدادات Supabase');
      }

      setSupabaseConfig(json.config);
      setSupabaseConnTest(json.connection);
      triggerToast('تم حفظ إعدادات Supabase والاتصال بنجاح', 'success');
      loadSupabaseInfo();
    } catch (err: any) {
      triggerToast(err.message || 'حدث خطأ أثناء الاتصال بـ Supabase', 'error');
    } finally {
      setIsSavingSupabase(false);
    }
  };

  // Push All Data to Supabase Cloud
  const handlePushAllToSupabase = async () => {
    setIsPushingToSupabase(true);
    setSupabasePushResults(null);
    try {
      const res = await fetchWithRetry('/api/secondary-db/supabase/push-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'فشل المزامنة مع Supabase');
      }

      setSupabasePushResults(json);
      triggerToast('تم رفع ومزامنة كافة السجلات في مشروع Supabase السحابي بنجاح!', 'success');
      loadStatus(true);
      loadSupabaseInfo();
    } catch (err: any) {
      triggerToast(err.message || 'حدث خطأ أثناء الرفع إلى Supabase', 'error');
    } finally {
      setIsPushingToSupabase(false);
    }
  };

  // Upload everything to secondary DB
  const handleUploadEverything = async () => {
    setIsUploadingAll(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/upload-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'فشل رفع البيانات للقاعدة الاحتياطية');
      }

      const data = await res.json();
      triggerToast(`تم رفع وتحديث كافة البيانات في القاعدة الاحتياطية بنجاح! (${data.totalRecords} سجل)`, 'success');
      
      await loadStatus(true);
      await loadSnapshots();
      await loadExplorerData();
    } catch (error: any) {
      triggerToast(error.message || 'حدث خطأ أثناء الرفع', 'error');
    } finally {
      setIsUploadingAll(false);
    }
  };


  // Restore everything from secondary DB
  const handleRestoreEverything = async () => {
    setIsRestoring(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/restore-from-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: selectedSnapshotToRestore })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'فشل استعادة البيانات');
      }

      const data = await res.json();
      triggerToast(`تمت استعادة كافة البيانات من القاعدة الاحتياطية بنجاح! (${data.restoredCounts?.soldiers || 0} فرد)`, 'success');
      setShowRestoreConfirmModal(false);
      setSelectedSnapshotToRestore(null);

      await loadStatus(true);
      if (onRefreshAppState) {
        onRefreshAppState();
      }
    } catch (error: any) {
      triggerToast(error.message || 'حدث خطأ أثناء الاستعادة', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Create Snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    try {
      const res = await fetchWithRetry('/api/secondary-db/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: snapshotName.trim() || undefined,
          description: snapshotDesc.trim() || undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'فشل حفظ اللقطة');
      }

      triggerToast('تم إنشاء وحفظ لقطة النسخ الاحتياطي في القاعدة الثانوية بنجاح', 'success');
      setShowSnapshotModal(false);
      setSnapshotName('');
      setSnapshotDesc('');
      await loadSnapshots();
      await loadStatus(true);
    } catch (error: any) {
      triggerToast(error.message || 'حدث خطأ أثناء حفظ اللقطة', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Toggle Auto Mirror
  const handleToggleAutoMirror = async (enabled: boolean) => {
    try {
      const res = await fetchWithRetry('/api/secondary-db/toggle-auto-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (res.ok) {
        triggerToast(enabled ? 'تم تفعيل النسخ المتطابق التلقائي للقاعدة الاحتياطية' : 'تم إيقاف النسخ المتطابق التلقائي', 'info');
        loadStatus(true);
      }
    } catch (e) {
      triggerToast('فشل تعديل حالة النسخ المتطابق', 'error');
    }
  };

  // Delete snapshot
  const handleDeleteSnapshot = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه اللقطة الاحتياطية؟')) return;
    try {
      const res = await fetchWithRetry(`/api/secondary-db/snapshots/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast('تم حذف اللقطة الاحتياطية بنجاح', 'info');
        loadSnapshots();
        loadStatus(true);
      }
    } catch (err) {
      triggerToast('فشل حذف اللقطة الاحتياطية', 'error');
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Topology Header: Primary & Secondary Databases */}
      {!hideHero && (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-wide text-slate-100">
                    قاعدة البيانات الاحتياطية المزدوجة (Hot Standby Secondary DB)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    قاعدة نشطة ومحمية
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  محرك قاعدة بيانات احتياطية تزامنية متطابقة تضمن عدم فقدان أي سجل أو أمر عسكري ومزامنة كاملة بنقرة واحدة.
                </p>
              </div>
            </div>

            {/* Quick Refresh & Auto Mirror Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { loadStatus(); loadSnapshots(); }}
                disabled={loading}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                title="تحديث حالة القاعدتين"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
                <span>فحص الاتصال</span>
              </button>

              <a
                href="/api/secondary-db/export"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                title="تنزيل تفريغ كامل مشفر"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">تصدير تفريغ (.json)</span>
              </a>
            </div>
          </div>

          {/* Dual Node Topology Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            {/* Primary Database Node */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-black text-slate-200">قاعدة البيانات الأساسية (Primary)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  المصدر المباشر
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">
                  {statusData?.primaryTotal || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  إجمالي السجلات والأفراد والقيد العملياتي
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 border-t border-slate-800/80 pt-2">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>استجابة المحرك: {statusData?.latencyMs || 2}ms</span>
              </div>
            </div>

            {/* Sync Bridge / Consistency Status */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-slate-200">حالة التطابق والمزامنة</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  statusData?.allInSync
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {statusData?.allInSync ? 'متطابقة 100%' : 'تحديث مطلوب'}
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {statusData?.syncPercentage ?? 100}%
                  </span>
                  {statusData?.lastSyncHash && (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      #{statusData.lastSyncHash}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {statusData?.lastSyncTimestamp 
                    ? `آخر رفع: ${new Date(statusData.lastSyncTimestamp).toLocaleTimeString('ar-YE')}` 
                    : 'جاهز للرفع والمزامنة الأولى'}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>النسخ المتطابق اللحظي:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleAutoMirror(!statusData?.autoMirrorEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    statusData?.autoMirrorEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {statusData?.autoMirrorEnabled ? 'مفعل (نشط)' : 'معطل'}
                </button>
              </div>
            </div>

            {/* Secondary Database Node */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-slate-200">الاحتياطي: Supabase + Redundant Standby</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  supabaseConfig?.isConfigured 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {supabaseConfig?.isConfigured ? 'Supabase متصل' : 'تجهيز الربط'}
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {statusData?.secondaryTotal || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  سجلات مؤمنة وجاهزة للرفع إلى Supabase
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-800/80 pt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>اللقطات: {statusData?.snapshotsCount || snapshots.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('supabase')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                >
                  إعدادات Supabase ➔
                </button>
              </div>
            </div>
          </div>

          {/* PRIMARY CALL TO ACTION: Upload Everything Button */}
          <div className="mt-5 pt-5 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <strong className="text-amber-400">إجراء النسخ الشامل:</strong> سيتم رفع كافة الجداول وسجلات الأفراد والتحضير والوحدات وسجلات التدقيق إلى القاعدة الاحتياطية فوراً مع تشفير SHA-256.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowSnapshotModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-black border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>حفظ لقطة مجمدة</span>
              </button>

              <button
                type="button"
                onClick={handleUploadEverything}
                disabled={isUploadingAll}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className={`w-4 h-4 ${isUploadingAll ? 'animate-bounce' : ''}`} />
                <span>{isUploadingAll ? 'جاري رفع ومزامنة كل شيء...' : 'رفع كل شيء للقاعدة الاحتياطية الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      {!hideSubTabs && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-amber-400 shadow-md'
                : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>مقارنة الجداول والقيد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('supabase');
              loadSupabaseInfo();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>تكامل Supabase السحابي (Supabase Cloud Sync)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              supabaseConfig?.isConfigured 
                ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200' 
                : 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
            }`}>
              {supabaseConfig?.isConfigured ? 'متصل' : 'تجهيز الربط'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('explorer');
              loadExplorerData();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'explorer'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/40'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>استعراض بيانات القاعدة بالكامل (Data Explorer)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-950/20 text-slate-950 dark:text-amber-100 font-bold">
              {statusData?.secondaryTotal || Object.values(statusData?.tableComparison || {}).reduce((acc: number, cur: any) => acc + (cur?.secondaryCount || 0), 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'snapshots'
                ? 'bg-slate-900 text-amber-400 shadow-md'
                : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل اللقطات الاحتياطية ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSnapshotToRestore(null);
              setShowRestoreConfirmModal(true);
            }}
            className="mr-auto px-4 py-2 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>استعادة المنظومة من القاعدة الاحتياطية</span>
          </button>
        </div>
      )}

      {/* Tab 1: Live Comparison Matrix */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  جدول المطابقة الحية بين القاعدة الأساسية والقاعدة الاحتياطية
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  فحص لحظي دقيق لعدد السجلات في كل جدول لضمان اكتمال المزامنة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('explorer');
                  loadExplorerData();
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>الاطلاع على البيانات كاملة</span>
              </button>

              <button
                type="button"
                onClick={handleUploadEverything}
                disabled={isUploadingAll}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUploadingAll ? 'animate-spin' : ''}`} />
                <span>مزامنة شاملة</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">نوع السجل / الجدول العسكري</th>
                  <th className="py-3 px-4 text-center">القاعدة الأساسية (Primary)</th>
                  <th className="py-3 px-4 text-center">القاعدة الاحتياطية (Secondary)</th>
                  <th className="py-3 px-4 text-center">الفارق</th>
                  <th className="py-3 px-4 text-center">حالة التطابق</th>
                  <th className="py-3 px-4 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {(statusData?.tableComparison || []).map((t: any) => {
                  const Icon = getTableIcon(t.key);
                  return (
                    <tr key={t.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-black text-slate-800 dark:text-slate-100">
                              {t.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              table: {t.key}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-black text-slate-700 dark:text-slate-200">
                        {t.primaryCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {t.secondaryCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        {t.difference === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : (
                          <span className="text-amber-500 font-black">+{t.difference}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {t.inSync ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>متطابق</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                            <AlertTriangle className="w-3 h-3" />
                            <span>بحاجة لمزامنة</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTable(t.key);
                              setActiveTab('explorer');
                              loadExplorerData();
                            }}
                            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-700 dark:text-amber-300 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="استعراض سجلات هذا الجدول في القاعدة الاحتياطية"
                          >
                            <Eye className="w-3 h-3" />
                            <span>استعراض</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleUploadEverything}
                            disabled={isUploadingAll}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                          >
                            رفع ومطابقة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Supabase Cloud Database Dedicated Integration */}
      {activeTab === 'supabase' && (
        <div className="space-y-5">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-500/10">
                  <Cloud className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-black text-white">
                      قاعدة البيانات الاحتياطية السحابية عبر Supabase (Cloud PostgreSQL Backup)
                    </h3>
                    {supabaseConfig?.isConfigured ? (
                      <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        متصل وجاهز للمزامنة
                      </span>
                    ) : (
                      <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        بانتظار إدخال بيانات مشروع Supabase
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
                    يمكنك ربط المنظومة العسكرية مباشرة بمشروعك في <strong>Supabase</strong> كقاعدة بيانات احتياطية خارجية سحابية فائقة السرعة والأمان (Cloud Redundant Mirror)، مع إمكانية رفع ومزامنة كافة السجلات بنقرة زر.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {supabaseConnTest?.dashboardUrl && (
                  <a
                    href={supabaseConnTest.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>لوحة تحكم Supabase</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handlePushAllToSupabase}
                  disabled={isPushingToSupabase || !supabaseConfig?.isConfigured}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isPushingToSupabase ? 'animate-bounce' : ''}`} />
                  <span>{isPushingToSupabase ? 'جاري الرفع إلى Supabase...' : 'مزامنة ورفع الكل إلى Supabase الآن'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Form & Connection Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left Col: Credentials Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      إعدادات اتصال مشروع Supabase
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      أدخل بيانات مشروعك من لوحة تحكم Supabase (Project Settings ➔ API)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadSupabaseInfo}
                  className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="إعادة فحص الاتصال"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      رابط المشروع (Supabase Project URL):
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      (Project Settings ➔ API ➔ Project URL)
                    </span>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[10px] text-slate-400">
                    مثال: https://abcdefghijkl.supabase.co
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      مفتاح API (anon public / service_role key):
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      (Project Settings ➔ API ➔ anon public)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder={supabaseConfig?.hasAnonKey ? '•••••••••••••••• (مفتاح محفوظ - اتركه فارغاً للإبقاء عليه أو الصق مفتاحاً جديداً)' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
                      value={supabaseKeyInput}
                      onChange={(e) => setSupabaseKeyInput(e.target.value)}
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showApiKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {supabaseConfig?.hasAnonKey 
                      ? '✓ يوجد مفتاح API محفوظ بالفعل في الخادم. يمكنك لصق مفتاح جديد لتحديثه أو تركه فارغاً.'
                      : 'المفتاح يبدأ بـ eyJhbGciOi... يُحفظ مشفراً في بيئة الخادم ويستخدم لمزامنة البيانات الاحتياطية بصورة آمنة.'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    اسم المشروع أو المرجع (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="اللواء الاحتياطي - Supabase Cluster"
                    value={supabaseProjectName}
                    onChange={(e) => setSupabaseProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Step-by-Step Helper Box */}
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">
                  <div className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>كيفية الحصول على بيانات الربط من Supabase:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed pr-1">
                    <li>سجل الدخول إلى حسابك في <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline font-bold">Supabase Dashboard</a> وافتح مشروعك.</li>
                    <li>انتقل إلى القائمة الجانبية: <strong>Project Settings</strong> ➔ ثم <strong>API</strong>.</li>
                    <li>انسخ <strong>Project URL</strong> وضعه في الحقل الأول أعلاه.</li>
                    <li>انسخ <strong>anon public API Key</strong> (أو service_role) وضعه في الحقل الثاني أعلاه ثم اضغط <strong>حفظ واختبار الاتصال</strong>.</li>
                  </ol>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>اتصال مشفر بتشفير SSL/TLS 1.3</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSupabase}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSavingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSavingSupabase ? 'جاري التحقق والحفظ...' : 'حفظ واختبار الاتصال'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Col: Live Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    حالة الاتصال السحابي بـ Supabase
                  </h4>
                </div>

                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  supabaseConnTest?.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}>
                  <div className="font-black flex items-center gap-1.5">
                    {supabaseConnTest?.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>الاتصال ناجح ومستقر</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>بانتظار التحقق أو التكوين</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {supabaseConnTest?.message || 'أدخل بيانات Supabase للتحقق من الاتصال.'}
                  </p>
                  {supabaseConnTest?.latencyMs !== undefined && (
                    <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
                      زمن الاستجابة: {supabaseConnTest.latencyMs}ms
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <span>حالة المزامنة السحابية:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {supabaseConfig?.isConfigured ? 'مفعلة وجاهزة' : 'غير مهيأة'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <span>نوع المحرك:</span>
                    <span className="font-bold text-slate-900 dark:text-white">PostgreSQL Cloud</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 text-slate-600 dark:text-slate-400">
                    <span>آخر فحص:</span>
                    <span className="font-mono text-[11px] text-slate-900 dark:text-white">
                      {new Date().toLocaleTimeString('ar-YE')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePushAllToSupabase}
                  disabled={isPushingToSupabase || !supabaseConfig?.isConfigured}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>دفع السجلات الآن إلى Supabase</span>
                </button>
              </div>
            </div>

          </div>

          {/* Results Summary if just pushed */}
          {supabasePushResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-white space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-black text-white">
                    نتائج المزامنة مع جداول Supabase السحابية
                  </h4>
                </div>
                <span className="text-xs text-slate-300 font-mono">
                  استغرقت {supabasePushResults.durationMs}ms
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {Object.entries(supabasePushResults.results || {}).map(([tbl, val]: any) => {
                  const isSynced = val.status === 'synced';
                  const isEmpty = val.status === 'empty';
                  const isFailed = val.status === 'failed';

                  return (
                    <div 
                      key={tbl} 
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSynced 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                          : isEmpty 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-400' 
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold">{tbl}</div>
                      <div className="text-sm font-black font-mono text-white mt-1">
                        {val.count > 0 ? `${val.count} سجل` : 'لا توجد سجلات'}
                      </div>
                      <div className="text-[10px] font-bold mt-1">
                        {isSynced && <span className="text-emerald-400">✓ تمت المزامنة بنجاح</span>}
                        {isEmpty && <span className="text-slate-400">فارغ (0 سجل)</span>}
                        {isFailed && (
                          <span className="text-rose-400" title={val.error}>
                            ✕ فشل: {val.error || 'خطأ أثناء الرفع'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SQL Setup Helper Guide */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
              <Code2 className="w-4 h-4 text-emerald-500" />
              <span>ملاحظة إعداد جداول Supabase (SQL Schema Guide):</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              إذا كنت تنشئ مشروعاً جديداً كلياً في Supabase، يمكنك نسخ وتطبيق بنية الجداول مباشرة من خلال الـ SQL Editor في Supabase لمطابقة الجداول (<code>soldiers</code>, <code>units</code>, <code>attendance</code>, <code>sick_leaves</code>, <code>soldier_requests</code>, <code>surveys</code>, <code>users</code>, <code>audit_logs</code>).
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: FULL DATA EXPLORER & VIEWER */}
      {activeTab === 'explorer' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
          {/* Header & Stats Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>مستكشف بيانات القاعدة الاحتياطية الشامل</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold">
                    جاهز ومحدث
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  اطّلع على كافة السجلات والبيانات المحفوظة في قاعدة البيانات الاحتياطية لحظياً مع إمكانية البحث والفلترة والتصدير.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={loadExplorerData}
                disabled={loadingExplorerData}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingExplorerData ? 'animate-spin text-amber-500' : ''}`} />
                <span>تحديث البيانات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const tableRows = (fullDbData && fullDbData[selectedTable]) || [];
                  const jsonString = JSON.stringify(tableRows, null, 2);
                  navigator.clipboard.writeText(jsonString);
                  triggerToast(`تم نسخ بيانات جدول ${selectedTable} إلى الحافظة`, 'success');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="نسخ بيانات الجدول الحالي كـ JSON"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ JSON</span>
              </button>

              <a
                href={`/api/secondary-db/export`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل كامل القاعدة (.json)</span>
              </a>
            </div>
          </div>

          {/* Table Selector Pills */}
          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
              اختر الجدول العسكري للاطلاع على بياناته:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'soldiers', name: 'الأفراد والقوة', icon: Users },
                { key: 'units', name: 'الوحدات والسرايا', icon: Building2 },
                { key: 'attendance', name: 'كشوفات التحضير', icon: Calendar },
                { key: 'sickLeaves', name: 'الإجازات المرضية', icon: Activity },
                { key: 'soldierRequests', name: 'الطلبات العسكرية', icon: ShieldCheck },
                { key: 'surveys', name: 'الاستبيانات والأوامر', icon: FileText },
                { key: 'users', name: 'المستخدمين والصلاحيات', icon: Lock },
                { key: 'auditLogs', name: 'سجلات التدقيق', icon: History },
                { key: 'systemSettings', name: 'إعدادات المنظومة', icon: Zap },
              ].map(tab => {
                const Icon = tab.icon;
                const count = (fullDbData && fullDbData[tab.key]?.length) || 0;
                const isSelected = selectedTable === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTable(tab.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isSelected
                        ? 'bg-white/20 text-white dark:text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & View Mode Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في جميع حقول وسجلات الجدول..."
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
              {explorerSearch && (
                <button
                  type="button"
                  onClick={() => setExplorerSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-bold">طريقة العرض:</span>
              <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExplorerViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    explorerViewMode === 'table'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>جدول</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerViewMode('cards')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    explorerViewMode === 'cards'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerViewMode('json')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    explorerViewMode === 'json'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>JSON خام</span>
                </button>
              </div>
            </div>
          </div>

          {/* Records Display Container */}
          {(() => {
            let currentRows = (fullDbData && fullDbData[selectedTable]) || [];
            
            if (explorerSearch.trim()) {
              const query = explorerSearch.toLowerCase();
              currentRows = currentRows.filter((r: any) => 
                JSON.stringify(r).toLowerCase().includes(query)
              );
            }

            if (loadingExplorerData) {
              return (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    جاري تحميل سجلات الجدول من القاعدة الاحتياطية...
                  </div>
                </div>
              );
            }

            if (currentRows.length === 0) {
              return (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Database className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {explorerSearch ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد سجلات محفوظة في هذا الجدول حالياً'}
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    يمكنك الضغط على زر "رفع كل شيء للقاعدة الاحتياطية" لتحديث ومزامنة كافة السجلات فورياً.
                  </p>
                </div>
              );
            }

            // VIEW MODE 1: TABLE
            if (explorerViewMode === 'table') {
              const firstRow = currentRows[0] || {};
              const keys = Object.keys(firstRow).slice(0, 7); // Show first 7 columns for neat display

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">#</th>
                        {keys.map(k => (
                          <th key={k} className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px]">
                            {k}
                          </th>
                        ))}
                        <th className="py-3 px-3.5 text-left">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {currentRows.map((row: any, idx: number) => (
                        <tr 
                          key={row.id || idx} 
                          className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-colors"
                        >
                          <td className="py-3 px-3.5 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                          {keys.map(k => {
                            const val = row[k];
                            const isDate = typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val));
                            const displayVal = typeof val === 'object' 
                              ? JSON.stringify(val) 
                              : isDate ? new Date(val).toLocaleDateString('ar-YE') : String(val ?? '-');

                            return (
                              <td key={k} className="py-3 px-3.5 max-w-[200px] truncate font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                {displayVal}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3.5 text-left">
                            <button
                              type="button"
                              onClick={() => setInspectingRecord(row)}
                              className="px-2.5 py-1 bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 rounded-lg text-[10px] font-black hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>فحص كامل</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            // VIEW MODE 2: CARDS
            if (explorerViewMode === 'cards') {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentRows.map((row: any, idx: number) => {
                    const title = row.name || row.militaryId || row.username || row.title || row.action || `سجل #${idx + 1}`;
                    const subtitle = row.rank || row.role || row.status || row.unitName || row.id;

                    return (
                      <div
                        key={row.id || idx}
                        className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 transition-colors shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white">
                              {title}
                            </h4>
                            {subtitle && (
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                {subtitle}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          {Object.entries(row).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center gap-2">
                              <span className="text-slate-400 text-[10px]">{k}:</span>
                              <span className="truncate max-w-[150px] font-bold text-slate-800 dark:text-slate-200">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setInspectingRecord(row)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض البيانات الكاملة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // VIEW MODE 3: RAW JSON
            return (
              <div className="relative bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl p-4 border border-slate-800 overflow-x-auto max-h-[500px]">
                <div className="sticky top-0 right-0 flex justify-end pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentRows, null, 2));
                      triggerToast('تم نسخ JSON إلى الحافظة', 'success');
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </button>
                </div>
                <pre>{JSON.stringify(currentRows, null, 2)}</pre>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: Snapshots Archive */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                أرشيف لقطات النسخ الاحتياطي في القاعدة الثانوية
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                يمكنك العودة لأي لقطة تاريخية واستعادة حالتها كاملة في أي وقت بنقرة زر
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>إنشاء لقطة الآن</span>
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <History className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                لا توجد لقطات محفوظة حتى الآن
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                اضغط على زر "رفع كل شيء للقاعدة الاحتياطية" أو "إنشاء لقطة" لحفظ أول لقطة مجمدة لكافة بيانات اللواء.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snapshots.map((snap) => (
                <div 
                  key={snap.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {snap.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {snap.description || 'نسخة احتياطية مجمدة'}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      #{snap.hash}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">الأفراد</div>
                      <div className="font-mono font-black text-slate-800 dark:text-slate-200">
                        {snap.counts?.soldiers || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">الوحدات</div>
                      <div className="font-mono font-black text-slate-800 dark:text-slate-200">
                        {snap.counts?.units || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">التحضير</div>
                      <div className="font-mono font-black text-slate-800 dark:text-slate-200">
                        {snap.counts?.attendance || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">الإجمالي</div>
                      <div className="font-mono font-black text-amber-500">
                        {snap.totalRecords || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(snap.createdAt).toLocaleString('ar-YE')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSnapshotToRestore(snap.id);
                          setShowRestoreConfirmModal(true);
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-black transition-all cursor-pointer"
                      >
                        استعادة هذه اللقطة
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="حذف اللقطة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Instant Snapshot */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  إنشاء لقطة نسخ احتياطي مجمدة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  اسم أو عنوان اللقطة
                </label>
                <input
                  type="text"
                  placeholder={`لقطة تكتيكية - ${new Date().toLocaleDateString('ar-YE')}`}
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ملاحظات أو وصف اللقطة
                </label>
                <textarea
                  rows={2}
                  placeholder="سبب أخذ النسخة (مثلاً: قبل تعديل كشف مرتبات الكتيبة الأولى)..."
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingSnapshot}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSnapshot ? 'جاري الحفظ...' : 'حفظ في القاعدة الاحتياطية'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Confirm Restore from Secondary DB */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl w-full max-w-md p-6 space-y-4 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
              <DownloadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد استعادة المنظومة من القاعدة الاحتياطية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                سيتم استبدال ومطابقة بيانات المنظومة الحالية بكافة السجلات والأفراد والتحضير المحفوظة في قاعدة البيانات الاحتياطية.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-right text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
              <span>هذا الإجراء يضمن استرجاع سلامة السجلات بالكامل عند حدوث أي طارئ.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestoreEverything}
                disabled={isRestoring}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'جاري الاستعادة...' : 'تأكيد الاستعادة الآن'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRestoreConfirmModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Full Record JSON & Field Inspector */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-right"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تفاصيل السجل في قاعدة البيانات الاحتياطية
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    ID: {inspectingRecord.id || inspectingRecord.militaryId || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectingRecord, null, 2));
                    triggerToast('تم نسخ السجل كـ JSON', 'success');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingRecord(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(inspectingRecord).map(([key, val]) => {
                  const isObj = typeof val === 'object' && val !== null;
                  const isDate = typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val));
                  
                  return (
                    <div 
                      key={key} 
                      className={`p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1 ${
                        isObj ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {key}
                      </div>
                      <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-words">
                        {isObj ? (
                          <pre className="p-2 bg-slate-900 text-emerald-400 rounded-lg text-[10px] overflow-x-auto">
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        ) : isDate ? (
                          `${new Date(val as string).toLocaleString('ar-YE')} (${val})`
                        ) : (
                          String(val ?? 'null')
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="text-[11px] font-bold text-slate-500 mb-2">
                  الشفرة المصدرية الكاملة (Raw JSON):
                </div>
                <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(inspectingRecord, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="px-5 py-2 bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 font-black rounded-xl text-xs cursor-pointer hover:opacity-90 transition-opacity"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
