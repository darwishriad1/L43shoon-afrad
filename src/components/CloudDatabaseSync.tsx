import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  History, 
  ShieldCheck, 
  Cloud, 
  Layers, 
  Users, 
  Building2, 
  ListCheck, 
  FileText, 
  Bell, 
  Activity,
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  Sliders,
  Trash2,
  Lock,
  ArrowDownUp,
  RotateCcw
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AuditLog } from '../types';
import { triggerToast } from './ToastContainer';

interface CloudDatabaseSyncProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  auditLogs: AuditLog[];
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
  onRestoreState: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }) => void;
}

export default function CloudDatabaseSync({
  units,
  soldiers,
  attendance,
  auditLogs,
  onAddLog,
  onRestoreState
}: CloudDatabaseSyncProps) {
  // Inspection & Status States
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectProgressStep, setInspectProgressStep] = useState<number>(0);
  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Modals & Panels
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string>('soldiers');
  const [browseData, setBrowseData] = useState<any[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseSearch, setBrowseSearch] = useState('');
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);

  // Sync Preview & Execution States
  const [showSyncPreviewModal, setShowSyncPreviewModal] = useState(false);
  const [selectedSyncStrategy, setSelectedSyncStrategy] = useState<'download' | 'upload' | 'smart_sync'>('smart_sync');
  const [previewDetails, setPreviewDetails] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // History & Conflicts
  const [syncHistoryLogs, setSyncHistoryLogs] = useState<any[]>([]);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [softDeletedList, setSoftDeletedList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'comparison' | 'conflicts' | 'history'>('dashboard');

  // Search in Comparison Table
  const [tableSearch, setTableSearch] = useState('');

  // Helper to reliably retrieve valid authorization token
  const getAuthToken = () => {
    return (
      localStorage.getItem('military_auth_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      'local_admin'
    );
  };

  const getHeaders = (extraHeaders: Record<string, string> = {}) => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      ...extraHeaders
    };
  };

  // Fetch Connection Status on Mount
  useEffect(() => {
    fetchCloudStatus();
    fetchSyncHistory();
  }, []);

  const fetchCloudStatus = async () => {
    try {
      const res = await fetch('/api/cloud-db/status', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCloudStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch cloud db status:', err);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const res = await fetch('/api/cloud-db/sync-history', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSyncHistoryLogs(data.logs || []);
        setSnapshotsList(data.snapshots || []);
      }
    } catch (err) {
      console.error('Failed to fetch sync history:', err);
    }
  };

  // ---- 1. INSPECT CLOUD DATABASE ----
  const handleInspectCloudDb = async () => {
    setIsInspecting(true);
    setInspectProgressStep(1); // "جاري الاتصال بقاعدة البيانات السحابية..."

    try {
      await new Promise(r => setTimeout(r, 400));
      setInspectProgressStep(2); // "جاري قراءة وجلب البيانات الإحصائية..."

      const inspectRes = await fetch('/api/cloud-db/inspect', {
        headers: getHeaders()
      });

      await new Promise(r => setTimeout(r, 400));
      setInspectProgressStep(3); // "جاري مقارنة البيانات المحلية مع السحابة..."

      const compareRes = await fetch('/api/cloud-db/compare', {
        headers: getHeaders()
      });

      await new Promise(r => setTimeout(r, 400));
      setInspectProgressStep(4); // "جاري اكتشاف وتحليل الاختلافات والتعارضات..."

      if (inspectRes.ok && compareRes.ok) {
        const inspectData = await inspectRes.json();
        const compareData = await compareRes.json();

        setComparisonData(compareData.comparison || []);
        await fetchCloudStatus();
        
        // Fetch conflicts and soft deleted list
        const conflictsRes = await fetch('/api/cloud-db/conflicts', {
          headers: getHeaders()
        });
        if (conflictsRes.ok) {
          const confData = await conflictsRes.json();
          setSoftDeletedList(confData.softDeletedRecords || []);
        }

        triggerToast('تم فحص مقارنة قاعدة البيانات السحابية بنجاح بنسبة 100%!', 'success');
      } else {
        const errJson = await inspectRes.json().catch(() => ({}));
        triggerToast(`فشل الاتصال بقاعدة البيانات السحابية أثناء الفحص: ${errJson.error || 'خطأ في الاستجابة'}`, 'error');
      }
    } catch (err: any) {
      console.error('Inspect error:', err);
      triggerToast(`خطأ في الفحص: ${err.message || 'يرجى إعادة المحاولة.'}`, 'error');
    } finally {
      setIsInspecting(false);
      setInspectProgressStep(0);
    }
  };

  // ---- 2. BROWSE CLOUD RESOURCE DATA ----
  const handleOpenBrowseModal = (resKey: string = 'soldiers') => {
    setSelectedResource(resKey);
    setShowBrowseModal(true);
    setBrowsePage(1);
    fetchBrowseData(resKey, 1, browseSearch);
  };

  const fetchBrowseData = async (resource: string, page: number, search: string) => {
    setIsBrowseLoading(true);
    try {
      const url = `/api/cloud-db/data/${resource}?page=${page}&limit=10&search=${encodeURIComponent(search)}`;
      const res = await fetch(url, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBrowseData(data.data || []);
        setBrowseTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Browse fetch error:', err);
    } finally {
      setIsBrowseLoading(false);
    }
  };

  // ---- 3. SYNC PREVIEW (DRY RUN) ----
  const handleOpenSyncPreview = async (strategy: 'download' | 'upload' | 'smart_sync') => {
    setSelectedSyncStrategy(strategy);
    setIsSyncing(true);

    try {
      const res = await fetch('/api/cloud-db/sync/preview', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          strategy,
          localCounts: {
            units: units.length,
            soldiers: soldiers.length,
            attendance: attendance.length,
            auditLogs: auditLogs.length
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewDetails(data);
        setShowSyncPreviewModal(true);
      } else {
        triggerToast('فشل إعداد معاينة التغييرات للمزامنة.', 'error');
      }
    } catch (err: any) {
      triggerToast(`خطأ في المعاينة: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ---- 4. EXECUTE SYNC ----
  const handleExecuteSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cloud-db/sync', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          strategy: selectedSyncStrategy,
          localData: {
            units,
            soldiers,
            attendance,
            auditLogs
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message || 'تمت عملية المزامنة السحابية بنجاح!', 'success');
        setShowSyncPreviewModal(false);
        fetchCloudStatus();
        fetchSyncHistory();
        onAddLog('استعادة', 'المزامنة السحابية', `مزامنة آمنة (${selectedSyncStrategy}) لقاعدة البيانات.`);
      } else {
        const errJson = await res.json();
        triggerToast(`فشلت المزامنة: ${errJson.error || 'حدث خطأ غير متوقع'}`, 'error');
      }
    } catch (err: any) {
      triggerToast(`خطأ أثناء التنفيذ: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ---- 5. RESTORE SNAPSHOT ----
  const handleRestoreSnapshot = async (snapshotId: string) => {
    const confirm = window.confirm(`هل أنت متأكد من استعادة قاعدة البيانات من اللقطة الاحتياطية (${snapshotId})؟`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/cloud-db/restore-snapshot/${snapshotId}`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (res.ok) {
        triggerToast('تمت استعادة السجلات من اللقطة الاحتياطية بنجاح!', 'success');
        fetchCloudStatus();
        fetchSyncHistory();
      } else {
        triggerToast('فشلت استعادة اللقطة الاحتياطية.', 'error');
      }
    } catch (err: any) {
      triggerToast(`خطأ أثناء الاستعادة: ${err.message}`, 'error');
    }
  };

  const filteredComparisonData = comparisonData.filter(item => 
    !tableSearch || item.displayName.includes(tableSearch) || item.resourceName.includes(tableSearch)
  );

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">

      {/* SECTION HEADER */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30 shadow-inner">
              <Cloud className="w-6 h-6 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>قاعدة البيانات السحابية المركزية (PostgreSQL / Supabase Ready)</span>
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  متصلة ونشطة
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 font-semibold mt-1 leading-relaxed">
                لوحة فحص السحابة المركزية، تحليل مقارنة البيانات، المزامنة الذكية، والتحكم الآمن في السجلات والمكررات.
              </p>
            </div>
          </div>

          {/* MAIN INSPECTION BUTTON */}
          <button
            type="button"
            onClick={handleInspectCloudDb}
            disabled={isInspecting}
            className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md shadow-emerald-900/30 disabled:opacity-50 shrink-0 border border-emerald-400/30"
          >
            {isInspecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span>جاري الفحص السحابي...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-emerald-200" />
                <span>🔍 فحص قاعدة البيانات السحابية</span>
              </>
            )}
          </button>
        </div>

        {/* INSPECTION PROGRESS STAGES INDICATOR */}
        {isInspecting && (
          <div className="bg-slate-800/90 border border-indigo-500/30 rounded-2xl p-4 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-black text-indigo-200">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>
                  {inspectProgressStep === 1 && '1/4: جاري الاتصال بقاعدة البيانات السحابية والمصادقة...'}
                  {inspectProgressStep === 2 && '2/4: جاري قراءة البيانات والإحصائيات الحالية...'}
                  {inspectProgressStep === 3 && '3/4: جاري مقارنة البيانات المحلية مع السحابة...'}
                  {inspectProgressStep === 4 && '4/4: جاري تحليل وتجميع الاختلافات والتعارضات...'}
                </span>
              </span>
              <span className="font-mono text-emerald-400">{inspectProgressStep * 25}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${inspectProgressStep * 25}%` }}
              />
            </div>
          </div>
        )}

        {/* CONNECTION & INSPECTION METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-extrabold pt-1">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/70 flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">حالة الاتصال:</span>
            {cloudStatus?.status === 'connected' ? (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                🟢 متصل
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                🔴 غير متصل
              </span>
            )}
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/70 flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">آخر فحص:</span>
            <span className="text-slate-200 font-mono text-[11px]">
              {cloudStatus?.lastInspectionTimestamp 
                ? new Date(cloudStatus.lastInspectionTimestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                : 'لم يفحص بعد'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/70 flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">إجمالي السجلات:</span>
            <span className="text-indigo-300 font-mono text-sm">{cloudStatus?.counts?.total || 0}</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/70 flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">التعارضات النشطة:</span>
            <span className="text-amber-400 font-mono text-sm">{softDeletedList.length}</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS WITHIN CLOUD SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>لوحة الإحصائيات الفورية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'comparison'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>جدول مقارنة البيانات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conflicts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'conflicts'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>السجلات المحذوفة والتعارضات ({softDeletedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل المزامنة واللقطات ({syncHistoryLogs.length})</span>
          </button>
        </div>

        {/* BROWSE CLOUD DATA ACTION BUTTON */}
        <button
          type="button"
          onClick={() => handleOpenBrowseModal('soldiers')}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-xs border border-slate-700 shrink-0"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>☁️ استعراض بيانات السحابة</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD STATS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                المستخدمين والصلاحيات
              </span>
              <p className="text-base font-black text-slate-800">{cloudStatus?.counts?.users || 0} حساب</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                الأفراد والجنود
              </span>
              <p className="text-base font-black text-indigo-900">{cloudStatus?.counts?.soldiers || 0} فرد</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                الوحدات والكتائب
              </span>
              <p className="text-base font-black text-teal-900">{cloudStatus?.counts?.units || 0} وحدة</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <ListCheck className="w-3.5 h-3.5 text-amber-600" />
                سجلات الحضور
              </span>
              <p className="text-base font-black text-amber-900">{cloudStatus?.counts?.attendance || 0} سجل</p>
            </div>
          </div>

          {/* SYNC STRATEGY SELECTION CARDS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>خيارات طرق المزامنة السحابية الآمنة</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                اختر نوع المزامنة المطلوب. يتم تلقائياً إنشاء نقطة استعادة احتياطية (Snapshot) قبل إجراء أي تعديل.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              {/* SMART SYNC CARD */}
              <div className="bg-indigo-50/40 border border-indigo-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white inline-block">
                    الموصى به
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    🔄 المزامنة الذكية (Smart Sync)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                    تطابق السجلات باستخدام المعرف الفريد (ID) والتواريخ، وتنزيل السحابي الجديد، ورفع المحلي الجديد بدون حذف تلقائي.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSyncPreview('smart_sync')}
                  className="w-full min-h-[40px] bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معايرة وبدء المزامنة الذكية</span>
                </button>
              </div>

              {/* UPLOAD LOCAL TO CLOUD */}
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-all">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white inline-block">
                    رفع البيانات
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    📤 رفع بيانات التطبيق إلى السحابة
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                    رفع الكشوفات والبيانات المحلية للتطبيق وحفظها في قاعدة البيانات السحابية المركزية.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSyncPreview('upload')}
                  className="w-full min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>معاينة ورفع البيانات للسحابة</span>
                </button>
              </div>

              {/* DOWNLOAD CLOUD TO LOCAL */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-amber-300 transition-all">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-600 text-white inline-block">
                    تنزيل واستعادة
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-amber-600" />
                    ☁️ تنزيل بيانات السحابة للتطبيق
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                    جلب وتحديث كافة سجلات السحابة وتحديث البيانات المحلية للتطبيق فورياً.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSyncPreview('download')}
                  className="w-full min-h-[40px] bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>معاينة وتنزيل بيانات السحابة</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPARISON TABLE */}
      {activeTab === 'comparison' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">جدول مقارنة البيانات المحلية مع السحابية</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">تفاصيل عدد السجلات واكتشاف الفروقات والاختلافات لكل جدول.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
              <input
                type="text"
                placeholder="بحث في الجداول..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full min-h-[36px] pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-semibold"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="p-3">نوع البيانات</th>
                  <th className="p-3">المحلي</th>
                  <th className="p-3">السحابي</th>
                  <th className="p-3">جديد محلي</th>
                  <th className="p-3">جديد سحابي</th>
                  <th className="p-3">مختلف</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {filteredComparisonData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                      اضغط على <strong className="text-emerald-700">🔍 فحص قاعدة البيانات السحابية</strong> لأول مرة لتوليد كشف المقارنة الشامل.
                    </td>
                  </tr>
                ) : (
                  filteredComparisonData.map((row) => (
                    <tr key={row.resourceName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-black text-slate-900 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{row.displayName}</span>
                      </td>
                      <td className="p-3 font-mono">{row.localCount}</td>
                      <td className="p-3 font-mono">{row.cloudCount}</td>
                      <td className="p-3 font-mono text-emerald-600">+{row.localOnlyCount}</td>
                      <td className="p-3 font-mono text-indigo-600">+{row.cloudOnlyCount}</td>
                      <td className="p-3 font-mono text-amber-600">{row.differentCount}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                          row.status === 'متطابق' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenBrowseModal(row.resourceName)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                        >
                          استعراض 👁️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SOFT DELETED RECORDS REVIEW */}
      {activeTab === 'conflicts' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>مراجعة السجلات المحذوفة وغير النشطة (Soft Delete Review)</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">
              وفقاً لقواعد السلامة، لا يتم الحذف النهائي للتسجيلات تلقائياً. يمكنك الاطلاع على الأفراد والسجلات المحذوفة هنا.
            </p>
          </div>

          <div className="space-y-2">
            {softDeletedList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200">
                لا توجد سجلات محذوفة أو تعارضات معلقة حالياً. 🟢
              </div>
            ) : (
              softDeletedList.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <div>
                      <span className="font-black text-slate-900 block">{item.fullName} ({item.rank})</span>
                      <span className="text-[10px] text-slate-500 font-mono">الرقم العسكري: {item.militaryNumber} | {item.reason}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black">
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYNC HISTORY & SNAPSHOTS */}
      {activeTab === 'history' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>سجل عمليات المزامنة واللقطات الاحتياطية (Snapshots)</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">
              تتبع تاريخ عمليات المزامنة السابقة وإمكانية استعادة قاعدة البيانات من أي لقطة تلقائية سابقة بنقرة واحدة.
            </p>
          </div>

          {/* Snapshots Bar */}
          {snapshotsList.length > 0 && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-black text-indigo-900 block">اللقطات التلقائية المحفوظة للنسخ السريع (Snapshots):</span>
              <div className="flex flex-wrap gap-2">
                {snapshotsList.map((snap) => (
                  <button
                    key={snap.id}
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap.id)}
                    className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-600 hover:text-white text-indigo-900 text-[10px] font-black rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>لقطة {new Date(snap.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })} ({snap.counts.soldiers} فرد)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History Log Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3">نوع العملية</th>
                  <th className="p-3">تفاصيل العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {syncHistoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                      لا يوجد سجل عمليات مزامنة سابق بعد.
                    </td>
                  </tr>
                ) : (
                  syncHistoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('ar-YE')}
                      </td>
                      <td className="p-3 font-black text-slate-900">{log.userName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[10px] font-black rounded border border-indigo-100">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] font-semibold">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: BROWSE CLOUD DATA MODAL */}
      {showBrowseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-right font-sans">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">☁️ استعراض وتفتيش بيانات قاعدة البيانات السحابية</h3>
                  <p className="text-[10px] text-slate-300 font-semibold mt-0.5">تصفح وقراءة حقيقية مباشرة من خادم Backend API بدون كشف كلمات المرور.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBrowseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Resource Selector & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {[
                  { key: 'soldiers', label: 'الأفراد والجنود' },
                  { key: 'units', label: 'الوحدات والكتائب' },
                  { key: 'attendance', label: 'التحضير اليومي' },
                  { key: 'sickLeaves', label: 'الإجازات والراحة' },
                  { key: 'users', label: 'المستخدمين' },
                  { key: 'notifications', label: 'الإشعارات' },
                  { key: 'auditLogs', label: 'سجلات الرقابة' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSelectedResource(item.key);
                      setBrowsePage(1);
                      fetchBrowseData(item.key, 1, browseSearch);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedResource === item.key
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
                <input
                  type="text"
                  placeholder="بحث في البيانات..."
                  value={browseSearch}
                  onChange={(e) => {
                    setBrowseSearch(e.target.value);
                    setBrowsePage(1);
                    fetchBrowseData(selectedResource, 1, e.target.value);
                  }}
                  className="w-full min-h-[36px] pr-9 pl-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="p-4 overflow-y-auto flex-1 min-h-[300px]">
              {isBrowseLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-xs font-bold gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>جاري جلب وقراءة بيانات السحابة...</span>
                </div>
              ) : browseData.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-bold">
                  لا توجد سجلات طابق البند أو البحث في السحابة.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">المعرف (ID)</th>
                        {selectedResource === 'soldiers' && (
                          <>
                            <th className="p-2.5">الرقم العسكري</th>
                            <th className="p-2.5">الاسم الكامل</th>
                            <th className="p-2.5">الرتبة</th>
                            <th className="p-2.5">الحالة العسكرية</th>
                          </>
                        )}
                        {selectedResource === 'units' && (
                          <>
                            <th className="p-2.5">اسم الوحدة</th>
                            <th className="p-2.5">القائد</th>
                            <th className="p-2.5">النوع</th>
                          </>
                        )}
                        {selectedResource === 'attendance' && (
                          <>
                            <th className="p-2.5">معرف الفرد</th>
                            <th className="p-2.5">التاريخ</th>
                            <th className="p-2.5">رمز الحالة</th>
                          </>
                        )}
                        {selectedResource === 'users' && (
                          <>
                            <th className="p-2.5">اسم المستخدم</th>
                            <th className="p-2.5">البريد الإلكتروني</th>
                            <th className="p-2.5">الدور</th>
                          </>
                        )}
                        <th className="p-2.5">المصدر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                      {browseData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-[10px] text-slate-500">{row.id}</td>
                          {selectedResource === 'soldiers' && (
                            <>
                              <td className="p-2.5 font-mono text-indigo-900">{row.militaryNumber}</td>
                              <td className="p-2.5 font-black text-slate-900">{row.fullName}</td>
                              <td className="p-2.5">{row.rank}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-black">
                                  {row.militaryStatus || 'على رأس العمل'}
                                </span>
                              </td>
                            </>
                          )}
                          {selectedResource === 'units' && (
                            <>
                              <td className="p-2.5 font-black text-slate-900">{row.name}</td>
                              <td className="p-2.5">{row.commanderName || 'غير محدد'}</td>
                              <td className="p-2.5">{row.type || 'كتيبة'}</td>
                            </>
                          )}
                          {selectedResource === 'attendance' && (
                            <>
                              <td className="p-2.5 font-mono">{row.soldierId}</td>
                              <td className="p-2.5 font-mono">{row.date}</td>
                              <td className="p-2.5 font-black">{row.statusCode}</td>
                            </>
                          )}
                          {selectedResource === 'users' && (
                            <>
                              <td className="p-2.5 font-black">{row.name}</td>
                              <td className="p-2.5 font-mono text-[10px]">{row.email}</td>
                              <td className="p-2.5">{row.role}</td>
                            </>
                          )}
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[10px] font-black rounded border border-indigo-100">
                              ☁️ السحابة
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>الصفحة {browsePage} من {browseTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={browsePage <= 1}
                  onClick={() => {
                    const p = browsePage - 1;
                    setBrowsePage(p);
                    fetchBrowseData(selectedResource, p, browseSearch);
                  }}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={browsePage >= browseTotalPages}
                  onClick={() => {
                    const p = browsePage + 1;
                    setBrowsePage(p);
                    fetchBrowseData(selectedResource, p, browseSearch);
                  }}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW CHANGES BEFORE SYNC MODAL */}
      {showSyncPreviewModal && previewDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 text-right font-sans">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl font-black">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">👁️ معاينة وتأكيد التغييرات قبل المزامنة</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">مراجعة الآثار المتوقعة للعملية قبل تطبيقها رسمياً.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncPreviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Breakdown Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-black text-indigo-950 border-b border-slate-200 pb-2">
                نوع المزامنة المختار: {selectedSyncStrategy === 'smart_sync' ? '🔄 المزامنة الذكية' : selectedSyncStrategy === 'upload' ? '📤 رفع إلى السحابة' : '☁️ تنزيل من السحابة'}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">لقطة احتياطية تلقائية:</span>
                  <span className="text-emerald-700 font-black">سيتم إنشاؤها 🟢</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">التعارضات المكتشفة:</span>
                  <span className="text-amber-600 font-black">{previewDetails.conflictsCount} سجلات</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                ℹ️ {previewDetails.summaryMessage}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleExecuteSync}
                disabled={isSyncing}
                className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تطبيق المزامنة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وتنفيذ المزامنة الآن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSyncPreviewModal(false)}
                disabled={isSyncing}
                className="min-h-[44px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
