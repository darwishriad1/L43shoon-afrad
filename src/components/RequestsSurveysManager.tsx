import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Send, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Users, 
  Building, 
  Calendar, 
  Filter, 
  Bell, 
  Sparkles, 
  Eye, 
  Edit3, 
  RefreshCw, 
  FileCheck, 
  Upload, 
  Check, 
  X, 
  ChevronLeft, 
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Phone,
  MessageSquare,
  Repeat
} from 'lucide-react';
import { Soldier, Unit, SoldierActionRequest, Survey, RequestStatus } from '../types';
import { triggerToast } from './ToastContainer';

interface RequestsSurveysManagerProps {
  soldiers: Soldier[];
  units: Unit[];
  currentUser: { id: string; name: string; role: string; unitId?: string | null };
  requests: SoldierActionRequest[];
  onRefreshRequests?: () => void;
  onAddLog?: (log: { actionType?: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة'; tableName?: string; details?: string; userId?: string; userName?: string; userRole?: string }) => void;
}

export default function RequestsSurveysManager({
  soldiers = [],
  units = [],
  currentUser,
  requests = [],
  onRefreshRequests,
  onAddLog
}: RequestsSurveysManagerProps) {
  // --- STATES ---
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'surveys_list' | 'responses_review'>('overview');
  const [surveysList, setSurveysList] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [requestsList, setRequestsList] = useState<SoldierActionRequest[]>(requests);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<SoldierActionRequest | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // New Survey Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'تحديث بيانات' | 'استبيان' | 'إقرار' | 'رفع مستند' | 'طلب معلومات' | 'طلب إجازة/خدمة'>('تحديث بيانات');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newTargetScope, setNewTargetScope] = useState<'all' | 'battalion' | 'company' | 'single' | 'selected'>('all');
  const [newTargetId, setNewTargetId] = useState('');
  const [newSelectedSoldierIds, setNewSelectedSoldierIds] = useState<string[]>([]);
  const [newDeadline, setNewDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newFrequency, setNewFrequency] = useState<'مرة واحدة' | 'شهري' | 'سنوي'>('مرة واحدة');
  const [newAutoReminder, setNewAutoReminder] = useState(true);
  const [newFieldsNeeded, setNewFieldsNeeded] = useState<string[]>([
    'phoneNumber',
    'emergencyContact',
    'photoUrl'
  ]);
  const [isSubmittingNewSurvey, setIsSubmittingNewSurvey] = useState(false);

  // Review Decision State
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'needs_amendment'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch surveys from server
  const fetchSurveys = async () => {
    try {
      setLoadingSurveys(true);
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        setSurveysList(data);
      }
    } catch (e) {
      console.error("Error fetching surveys:", e);
    } finally {
      setLoadingSurveys(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    setRequestsList(requests);
  }, [requests]);

  // Sync with parent requests
  const refreshAllData = async () => {
    await fetchSurveys();
    if (onRefreshRequests) onRefreshRequests();
  };

  // Field Options translated
  const FIELD_OPTIONS = [
    { id: 'phoneNumber', label: 'رقم الهاتف والتواصل (واتساب)' },
    { id: 'emergencyContact', label: 'جهة الاتصال عند الطوارئ' },
    { id: 'address', label: 'العنوان السكني التفصيلي' },
    { id: 'photoUrl', label: 'الصورة الشخصية الرسمية بالزي العسكري' },
    { id: 'bloodType', label: 'فصيلة الدم والملف الطبي' },
    { id: 'qualification', label: 'المؤهل العلمي والشهادات' },
    { id: 'specialization', label: 'التخصص والمهارة العسكرية' },
    { id: 'nationalId', label: 'رقم الهوية الوطنية/تاريخ الميلاد' },
  ];

  // Calculated Stats
  const stats = useMemo(() => {
    const totalTargeted = requestsList.length || 1;
    const approvedCount = requestsList.filter(r => r.status === 'approved').length;
    const submittedCount = requestsList.filter(r => ['submitted', 'under_review'].includes(r.status)).length;
    const needsAmendmentCount = requestsList.filter(r => r.status === 'needs_amendment').length;
    const pendingCount = requestsList.filter(r => ['new', 'viewed', 'in_progress', 'pending'].includes(r.status)).length;
    const rejectedCount = requestsList.filter(r => r.status === 'rejected').length;

    const completionPercentage = Math.round((approvedCount / totalTargeted) * 100) || 0;

    return {
      totalTargeted: requestsList.length,
      approvedCount,
      submittedCount,
      needsAmendmentCount,
      pendingCount,
      rejectedCount,
      completionPercentage
    };
  }, [requestsList]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requestsList.filter(r => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'update_profile' && r.requestType !== 'update_profile') return false;
        if (categoryFilter === 'survey' && r.requestType !== 'survey') return false;
        if (categoryFilter === 'declaration' && r.requestType !== 'declaration') return false;
        if (categoryFilter === 'upload_doc' && r.requestType !== 'upload_doc') return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Unit filter
      if (unitFilter !== 'ALL' && r.unitId !== unitFilter) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = Boolean(r.soldierName && r.soldierName.toLowerCase().includes(term));
        const matchesMil = Boolean(r.militaryNumber && r.militaryNumber.toLowerCase().includes(term));
        const matchesTitle = Boolean(r.title && r.title.toLowerCase().includes(term));
        if (!matchesName && !matchesMil && !matchesTitle) return false;
      }

      return true;
    });
  }, [requestsList, categoryFilter, statusFilter, unitFilter, searchTerm]);

  // Handle Create Survey/Request Submission
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      triggerToast('يرجى إدخال عنوان الطلب والوصف التفصيلي', 'warning');
      return;
    }

    try {
      setIsSubmittingNewSurvey(true);
      const payload = {
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        instructions: newInstructions.trim(),
        targetScope: newTargetScope,
        targetId: newTargetScope === 'single' ? newTargetId : newTargetScope === 'selected' ? newSelectedSoldierIds : newTargetId,
        deadline: newDeadline,
        isRecurring: newIsRecurring,
        frequency: newFrequency,
        autoReminder: newAutoReminder,
        fieldsNeeded: newFieldsNeeded,
        createdBy: currentUser.name
      };

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('فشل إنشاء وإرسال الطلب');

      triggerToast('تم إرسال الطلب وإشعار الأفراد المستهدفين بنجاح 🟢', 'success');
      
      if (onAddLog) {
        onAddLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          actionType: 'إضافة',
          tableName: 'surveys',
          details: `إنشاء طلب/استبيان جديد: (${newTitle})`
        });
      }

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewInstructions('');
      await refreshAllData();
    } catch (err: any) {
      triggerToast('خطأ أثناء الإنشاء: ' + err.message, 'error');
    } finally {
      setIsSubmittingNewSurvey(false);
    }
  };

  // Handle Quick Broadcast Auto-Reminder
  const handleSendBroadcastReminder = async (surveyId?: string) => {
    try {
      setIsSendingReminder(true);
      const res = await fetch('/api/surveys/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          customMessage: 'تذكير هام عاجل من شؤون الأفراد: يرجى المبادرة بتعبئة وإرسال الطلب المطلوبة بأسرع وقت قبل انتهاء المهلة المحددة.'
        })
      });

      if (!res.ok) throw new Error('فشل إرسال التذكيرات');
      const data = await res.json();
      triggerToast(`تم إرسال إشعارات التذكير التلقائي لعدد (${data.count}) من الأفراد المتأخرين ⚡`, 'success');
    } catch (err: any) {
      triggerToast('خطأ أثناء إرسال التذكير: ' + err.message, 'error');
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Handle Submitting Review Decision
  const handleReviewSubmit = async (reqObj: SoldierActionRequest) => {
    try {
      setIsSubmittingReview(true);
      const res = await fetch(`/api/soldier-requests/${reqObj.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          reviewNotes: reviewNotes.trim(),
          rejectionReason: reviewStatus === 'rejected' ? (rejectionReason.trim() || 'عدم استيفاء الشروط المطلوبة') : undefined,
          reviewedBy: currentUser.name
        })
      });

      if (!res.ok) throw new Error('فشل تسجيل قرار المراجعة');

      if (reviewStatus === 'approved') {
        triggerToast(`تم اعتماد طلب العسكري (${reqObj.soldierName}) ونقل البيانات تلقائياً لسجله 🟢`, 'success');
      } else if (reviewStatus === 'needs_amendment') {
        triggerToast(`تمت إعادة الطلب للعسكري (${reqObj.soldierName}) لإجراء التعديل المطلوبة ⚠️`, 'info');
      } else {
        triggerToast(`تم رفض الطلب المقدم من العسكري (${reqObj.soldierName}) 🔴`, 'warning');
      }

      if (onAddLog) {
        onAddLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          actionType: 'تعديل',
          tableName: 'soldier_requests',
          details: `اتخاذ قرار (${reviewStatus}) بخصوص طلب العسكري (${reqObj.soldierName}): ${reqObj.title}`
        });
      }

      setSelectedRequestForReview(null);
      setReviewNotes('');
      setRejectionReason('');
      await refreshAllData();
    } catch (err: any) {
      triggerToast('حدث خطأ أثناء حفظ القرار: ' + err.message, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Status Badge Rendering Helper
  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>معتمد</span>
          </span>
        );
      case 'needs_amendment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>يحتاج تعديل</span>
          </span>
        );
      case 'submitted':
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوض</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Edit3 className="w-3.5 h-3.5" />
            <span>قيد التنفيذ</span>
          </span>
        );
      case 'viewed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <Eye className="w-3.5 h-3.5" />
            <span>تم الاطلاع</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>جديد</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans dir-rtl text-right" dir="rtl">
      
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">قسم الطلبات والاستبيانات والنماذج الإلكترونية</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[11px] font-black rounded-full border border-emerald-500/30">
                  منصة رسمية معتمدة 🛡️
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                منظومة التواصل المباشر وإدارة الطلبات، الاستبيانات، والإقرارات، ومتابعة الردود واقتفاء دورة الاعتماد إلكترونياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleSendBroadcastReminder()}
              disabled={isSendingReminder}
              className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              title="إرسال إشعار تذكير عاجل لكافة الأفراد المعلقين والمبسطين للرد"
            >
              <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>تذكير تلقائي للمتأخرين ⚡</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>إنشاء طلب / استبيان جديد</span>
            </button>
          </div>
        </div>

        {/* PROGRESS & KPI STATS BAR */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Completion Rate Gauge */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                نسبة إنجاز واستكمال الأفراد للطلبات:
              </span>
              <span className="text-lg font-black text-emerald-400">{stats.completionPercentage}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3.5 mt-3 overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="bg-gradient-to-l from-emerald-400 to-teal-500 h-2.5 rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, stats.completionPercentage))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              أكمل {stats.approvedCount} فرد من إجمالي {stats.totalTargeted} طلباً مستهدفاً بالمنظومة
            </p>
          </div>

          {/* Stats 1: Complete / Approved */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>معتمدة ومكتملة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.approvedCount}</div>
            <span className="text-[10px] text-emerald-400 font-bold">موثقة بالسجلات</span>
          </div>

          {/* Stats 2: Under Review */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>قيد المراجعة</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.submittedCount}</div>
            <span className="text-[10px] text-blue-400 font-bold">تنتظر اعتمادك</span>
          </div>

          {/* Stats 3: Needs Amendment */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>تحتاج تعديل</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.needsAmendmentCount}</div>
            <span className="text-[10px] text-amber-400 font-bold">بانتظار تصحيح الفرد</span>
          </div>

          {/* Stats 4: Pending / Delayed */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>لم يتم الرد (معلق)</span>
              <Bell className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.pendingCount}</div>
            <span className="text-[10px] text-rose-400 font-bold">متأخرين عن المهلة</span>
          </div>

        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الفرد، الرقم العسكري، أو عنوان الطلب..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="ALL">جميع التصنيفات</option>
            <option value="update_profile">تحديث بيانات</option>
            <option value="survey">استبيان إلكتروني</option>
            <option value="declaration">إقرار وتعهد</option>
            <option value="upload_doc">رفع مستندات</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="submitted">قيد المراجعة (مرفوع)</option>
            <option value="needs_amendment">يحتاج تعديل</option>
            <option value="approved">معتمد ومكتمل</option>
            <option value="new">جديد / لم يكتمل</option>
            <option value="rejected">مرفوض</option>
          </select>

          {/* Unit Filter */}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="ALL">جميع الوحدات</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={refreshAllData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* REQUESTS & RESPONSES MAIN TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-black text-white text-sm">قائمة الطلبات والاستبيانات الموجهة للكتائب والأفراد</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            عرض {filteredRequests.length} من أصل {requestsList.length} طلب
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
            <p className="font-bold text-sm text-slate-300">لا توجد طلبات أو استبيانات مطابقة لخيارات التصفية</p>
            <p className="text-xs text-slate-500">يمكنك إنشاء طلب جديد بالضغط على زر "إنشاء طلب / استبيان جديد" بأعلى الشاشة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3.5 pr-6">العسكري المعني</th>
                  <th className="p-3.5">الرقم العسكري</th>
                  <th className="p-3.5">الوحدة / السرية</th>
                  <th className="p-3.5">عنوان الطلب والتصنيف</th>
                  <th className="p-3.5">تاريخ التقديم / المهلة</th>
                  <th className="p-3.5 text-center">حالة الطلب الرسمية</th>
                  <th className="p-3.5 text-center pl-6">إجراءات المراجعة والاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRequests.map((req) => {
                  const solUnit = units.find(u => u.id === req.unitId)?.name || 'غير محدد';
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pr-6 font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-black shrink-0">
                          {req.soldierRank ? req.soldierRank[0] : 'ف'}
                        </div>
                        <div>
                          <p className="text-white font-bold">{req.soldierRank || 'عسكري'} / {req.soldierName}</p>
                          <p className="text-[10px] text-slate-400">ID: {req.soldierId}</p>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300 font-bold">{req.militaryNumber || '—'}</td>
                      <td className="p-3.5 text-slate-300">{solUnit}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-white">{req.title}</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {req.requestType === 'update_profile' ? 'تحديث بيانات' : req.requestType === 'survey' ? 'استبيان' : req.requestType === 'declaration' ? 'إقرار' : 'طلب عام'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(req.submittedAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3.5 text-center">
                        {renderStatusBadge(req.status)}
                      </td>
                      <td className="p-3.5 text-center pl-6">
                        <button
                          onClick={() => {
                            setSelectedRequestForReview(req);
                            setReviewStatus(req.status === 'needs_amendment' ? 'needs_amendment' : req.status === 'rejected' ? 'rejected' : 'approved');
                            setReviewNotes(req.reviewNotes || '');
                            setRejectionReason(req.rejectionReason || '');
                          }}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة وتدقيق</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW SURVEY / REQUEST MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right" dir="rtl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">إنشاء طلب / استبيان إلكتروني جديد للأفراد</h3>
                    <p className="text-xs text-slate-400 mt-0.5">تحديد الحقول والشروط وتوجيه إشعار فوري لجميع الأفراد المستهدفين</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateSurvey} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
                
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-200 block">عنوان الطلب / الاستبيان *</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="مثال: استبيان تحديث بيانات التواصل والشهادات والمؤهلات 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-200 block">تصنيف الطلب *</label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="تحديث بيانات">تحديث بيانات</option>
                      <option value="استبيان">استبيان إلكتروني</option>
                      <option value="إقرار">إقرار وتعهد</option>
                      <option value="رفع مستند">رفع مستندات</option>
                      <option value="طلب معلومات">طلب معلومات</option>
                      <option value="طلب إجازة/خدمة">طلب إجازة / خدمة</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">وصف الطلب / الهدف منه *</label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="اكتب توضيحاً موجزاً عن أسباب وفوائد تعبئة هذا النموذج إلكترونياً..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">التعليمات والإرشادات الهامة للفرد</label>
                  <input
                    type="text"
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    placeholder="مثال: يرجى إرفاق صورة واضحة وتأكيد رقم الهاتف الفعال قبل تاريخ المهلة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Target Scope & Selection */}
                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl space-y-3">
                  <label className="font-black text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>تحديد الأفراد المستهدفين *</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: 'جميع الأفراد بالمنظومة' },
                      { id: 'battalion', label: 'كتيبة معينة' },
                      { id: 'company', label: 'سرية معينة' },
                      { id: 'single', label: 'فرد واحد محدد' },
                    ].map((scope) => (
                      <button
                        type="button"
                        key={scope.id}
                        onClick={() => setNewTargetScope(scope.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                          newTargetScope === scope.id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>

                  {/* Unit or Soldier Select if scoped */}
                  {(newTargetScope === 'battalion' || newTargetScope === 'company') && (
                    <div className="pt-2">
                      <select
                        value={newTargetId}
                        onChange={(e) => setNewTargetId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="">اختر الوحدة / السرية المعنية...</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {newTargetScope === 'single' && (
                    <div className="pt-2">
                      <select
                        value={newTargetId}
                        onChange={(e) => setNewTargetId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="">اختر الفرد المطلوب تحديدا...</option>
                        {soldiers.map(s => (
                          <option key={s.id} value={s.id}>{s.rank} / {s.fullName} ({s.militaryNumber})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Deadline & Frequency Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-200 block">الموعد النهائي للرد (Deadline) *</label>
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-200 block">التكرار الدوري</label>
                    <select
                      value={newFrequency}
                      onChange={(e: any) => setNewFrequency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold"
                    >
                      <option value="مرة واحدة">مرة واحدة فقط</option>
                      <option value="شهري">تكرار شهري دوري</option>
                      <option value="سنوي">تكرار سنوي دوري</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="autoReminderCheck"
                      checked={newAutoReminder}
                      onChange={(e) => setNewAutoReminder(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autoReminderCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                      تفعيل التذكير التلقائي للمتأخرين ⚡
                    </label>
                  </div>
                </div>

                {/* Required Fields Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="font-bold text-slate-200 block">الحقول والمستندات المطلوب تعبئتها من قبل الفرد:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FIELD_OPTIONS.map((f) => {
                      const isChecked = newFieldsNeeded.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewFieldsNeeded([...newFieldsNeeded, f.id]);
                              } else {
                                setNewFieldsNeeded(newFieldsNeeded.filter(x => x !== f.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                          />
                          <span className="font-bold">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Submit buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingNewSurvey}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال وإشعار الأفراد فوراً</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEW & APPROVAL DETAILED MODAL */}
      <AnimatePresence>
        {selectedRequestForReview && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right" dir="rtl"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">معاينة وتدقيق رد الطلب المقدم من الفرد</h3>
                    <p className="text-xs text-slate-400 mt-0.5">مراجعة البيانات المدخلة والمرفقات واتخاذ القرار المناسب</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequestForReview(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
                
                {/* Soldier Profile Badge */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-sm">
                      {selectedRequestForReview.soldierRank?.[0] || 'ف'}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">
                        {selectedRequestForReview.soldierRank || 'عسكري'} / {selectedRequestForReview.soldierName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        الرقم العسكري: <span className="font-mono font-bold text-white">{selectedRequestForReview.militaryNumber || '—'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    {renderStatusBadge(selectedRequestForReview.status)}
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(selectedRequestForReview.submittedAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <h5 className="font-black text-emerald-400 text-xs">{selectedRequestForReview.title}</h5>
                  <p className="text-slate-300 leading-relaxed text-xs">{selectedRequestForReview.description}</p>
                </div>

                {/* Submitted Proposed Data / Answers */}
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-200">البيانات والردود التعديلية المقدمة من الفرد:</h5>
                  {selectedRequestForReview.proposedData ? (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs space-y-2 text-slate-200">
                      {typeof selectedRequestForReview.proposedData === 'string' ? (
                        <p className="whitespace-pre-wrap">{selectedRequestForReview.proposedData}</p>
                      ) : (
                        Object.entries(selectedRequestForReview.proposedData).map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-slate-800/80 pb-1.5 last:border-0">
                            <span className="text-slate-400 font-sans">{k}:</span>
                            <span className="font-bold text-emerald-300">{String(v || '—')}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-2xl text-center text-slate-500 italic">
                      لم يقم الفرد بتعبئة أي ردود نصية بعد.
                    </div>
                  )}
                </div>

                {/* Audit & History Log */}
                {selectedRequestForReview.historyLogs && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>سجل مراجعات وتعديلات الطلب التاريخي:</span>
                    </h5>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-[11px]">
                      {(() => {
                        try {
                          const logs = typeof selectedRequestForReview.historyLogs === 'string'
                            ? JSON.parse(selectedRequestForReview.historyLogs)
                            : selectedRequestForReview.historyLogs;
                          if (Array.isArray(logs)) {
                            return logs.map((lg: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 border-b border-slate-800/60 pb-1.5 last:border-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                <div className="flex-1">
                                  <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                                    <span>{lg.actor} ({lg.action})</span>
                                    <span>{new Date(lg.timestamp).toLocaleString('ar-EG')}</span>
                                  </div>
                                  <p className="text-slate-300 text-xs mt-0.5">{lg.notes}</p>
                                </div>
                              </div>
                            ));
                          }
                        } catch (e) {}
                        return <p className="text-slate-500">لا يوجد سجل تاريخي سابق</p>;
                      })()}
                    </div>
                  </div>
                )}

                {/* DECISION ACTION SELECTOR */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <label className="font-black text-slate-200 block">اتخاذ القرار الإداري والرسمي بشأن الطلب:</label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewStatus('approved')}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        reviewStatus === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>قبول واعتِماد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewStatus('needs_amendment')}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        reviewStatus === 'needs_amendment'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>طلب تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewStatus('rejected')}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        reviewStatus === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>رفض الطلب</span>
                    </button>
                  </div>

                  {/* Notes / Instructions Input for Soldier */}
                  {reviewStatus === 'needs_amendment' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold text-amber-300 block">ملاحظات والتوجيهات الواجب على الفرد تعديلها *</label>
                      <textarea
                        rows={3}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="وضح للفرد بالتفصيل ما هي النواقص أو الأخطاء التي ينبغي تصحيحها وإعادة إرسالها..."
                        className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  )}

                  {reviewStatus === 'rejected' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold text-rose-300 block">سبب عدم القبول / الرفض الرسمي *</label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="ادخل سبب الرفض ليظهر للفرد بشكل رسمي..."
                        className="w-full bg-slate-950 border border-rose-500/50 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestForReview(null)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewSubmit(selectedRequestForReview)}
                    disabled={isSubmittingReview}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ القرار وإشعار الفرد</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
