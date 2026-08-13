import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Users, 
  Building2, 
  Copy, 
  FileText, 
  Download, 
  Sliders,
  AlertCircle,
  Plus,
  RotateCcw,
  Check,
  ChevronLeft
} from 'lucide-react';
import { Soldier, Unit } from '../types';
import { triggerToast } from './ToastContainer';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';

interface SoldierAccountsSectionProps {
  soldiers: Soldier[];
  units: Unit[];
  currentUser: any;
  onRefreshData?: () => void;
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

export default function SoldierAccountsSection({
  soldiers,
  units,
  currentUser,
  onRefreshData,
  onAddLog
}: SoldierAccountsSectionProps) {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [selectedBattalion, setSelectedBattalion] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'created_active' | 'inactive' | 'not_created'>('all');

  // Selected Soldiers Selection for Bulk Actions
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<string[]>([]);
  
  // Visibility toggles for passwords
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});

  // Modals States
  const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
  const [bulkScope, setBulkScope] = useState<'all_uncreated' | 'unit' | 'battalion' | 'company' | 'filtered'>('all_uncreated');
  const [bulkUnitId, setBulkUnitId] = useState<string>('all');
  const [bulkBattalion, setBulkBattalion] = useState<string>('all');
  const [bulkCompany, setBulkCompany] = useState<string>('all');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ createdCount: number; skippedCount: number; totalProcessed: number; createdList: any[] } | null>(null);

  // Print Statement Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'cards'>('table');
  const [printFilterUnit, setPrintFilterUnit] = useState<string>('all');

  // Edit Single Account Modal
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editHasAccount, setEditHasAccount] = useState(true);
  const [isSavingSingle, setIsSavingSingle] = useState(false);

  // Active Tab within Section
  const [activeSubTab, setActiveSubTab] = useState<'accounts_list' | 'reports'>('accounts_list');

  // Unique Battalions & Companies for filter dropdowns
  const availableBattalions = useMemo(() => {
    const set = new Set<string>();
    soldiers.forEach(s => {
      if (s.battalion) set.add(s.battalion);
    });
    return Array.from(set);
  }, [soldiers]);

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    soldiers.forEach(s => {
      if (s.company) set.add(s.company);
    });
    return Array.from(set);
  }, [soldiers]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalSoldiers = soldiers.length;
    let activeAccounts = 0;
    let inactiveAccounts = 0;
    let uncreatedAccounts = 0;

    soldiers.forEach(s => {
      if (s.hasAccount) {
        activeAccounts++;
      } else if (s.accountUsername) {
        inactiveAccounts++;
      } else {
        uncreatedAccounts++;
      }
    });

    return {
      totalSoldiers,
      activeAccounts,
      inactiveAccounts,
      uncreatedAccounts,
      activationRate: totalSoldiers > 0 ? Math.round((activeAccounts / totalSoldiers) * 100) : 0
    };
  }, [soldiers]);

  // Filtered Soldiers List
  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      // Search
      const matchesSearch = !searchTerm || 
        (s.fullName && s.fullName.includes(searchTerm)) || 
        (s.militaryNumber && s.militaryNumber.includes(searchTerm)) ||
        (s.accountUsername && s.accountUsername.includes(searchTerm));

      // Unit
      const matchesUnit = selectedUnitId === 'all' || s.unitId === selectedUnitId;

      // Battalion
      const matchesBattalion = selectedBattalion === 'all' || s.battalion === selectedBattalion;

      // Company
      const matchesCompany = selectedCompany === 'all' || s.company === selectedCompany;

      // Status
      let matchesStatus = true;
      if (selectedStatus === 'created_active') {
        matchesStatus = s.hasAccount === true;
      } else if (selectedStatus === 'inactive') {
        matchesStatus = s.hasAccount === false && Boolean(s.accountUsername);
      } else if (selectedStatus === 'not_created') {
        matchesStatus = !s.hasAccount && !s.accountUsername;
      }

      return matchesSearch && matchesUnit && matchesBattalion && matchesCompany && matchesStatus;
    });
  }, [soldiers, searchTerm, selectedUnitId, selectedBattalion, selectedCompany, selectedStatus]);

  // Target count for bulk create preview
  const bulkTargetCount = useMemo(() => {
    return soldiers.filter(s => {
      if (s.hasAccount) return false;
      if (bulkScope === 'unit' && bulkUnitId !== 'all' && s.unitId !== bulkUnitId) return false;
      if (bulkScope === 'battalion' && bulkBattalion !== 'all' && s.battalion !== bulkBattalion) return false;
      if (bulkScope === 'company' && bulkCompany !== 'all' && s.company !== bulkCompany) return false;
      if (bulkScope === 'filtered') {
        return filteredSoldiers.some(fs => fs.id === s.id);
      }
      return true;
    }).length;
  }, [soldiers, bulkScope, bulkUnitId, bulkBattalion, bulkCompany, filteredSoldiers]);

  // Toggle Password Visibility
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswordIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Row Selection
  const toggleSelectSoldier = (id: string) => {
    setSelectedSoldierIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSoldierIds.length === filteredSoldiers.length) {
      setSelectedSoldierIds([]);
    } else {
      setSelectedSoldierIds(filteredSoldiers.map(s => s.id));
    }
  };

  // Passwords are never derived from military numbers; the server generates a temporary value securely.
  const getReversedMilitaryNumber = (_militaryNumber: string) => '';

  // Single Account Save
  const handleSaveSingleAccount = async () => {
    if (!editingSoldier) return;
    try {
      setIsSavingSingle(true);
      const res = await fetch(`/api/soldiers/${editingSoldier.id}/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasAccount: editHasAccount,
          username: editUsername.trim() || editingSoldier.militaryNumber,
          password: editPassword.trim() || getReversedMilitaryNumber(editingSoldier.militaryNumber)
        })
      });

      if (!res.ok) throw new Error('فشل حفظ إعدادات الحساب');

      onAddLog('تعديل', 'إنشاء الحسابات', `تم تحديث بيانات حساب الفرد (${editingSoldier.fullName}) بنجاح.`);
      triggerToast('تم حفظ إعدادات وتفعيل حساب الفرد بنجاح 🟢', 'success');
      setEditingSoldier(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      triggerToast('خطأ أثناء الحفظ: ' + err.message, 'error');
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Execute Bulk Account Creation
  const handleExecuteBulkCreate = async () => {
    try {
      setIsProcessingBulk(true);
      setBulkResult(null);

      let targetIds: string[] = [];
      if (bulkScope === 'filtered') {
        targetIds = filteredSoldiers.filter(s => !s.hasAccount).map(s => s.id);
      }

      const payload = {
        soldierIds: targetIds.length > 0 ? targetIds : undefined,
        unitId: bulkScope === 'unit' ? bulkUnitId : undefined,
        battalion: bulkScope === 'battalion' ? bulkBattalion : undefined,
        company: bulkScope === 'company' ? bulkCompany : undefined
      };

      const res = await fetch('/api/soldiers/accounts/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('فشل تنفيذ إنشاء الحسابات الجماعية');

      const data = await res.json();
      setBulkResult(data);

      onAddLog('إضافة', 'إنشاء الحسابات', `تم إنشاء (${data.createdCount}) حساب فرد جديد جماعياً وتخطي (${data.skippedCount}) حساب موجود مسبقاً.`);
      triggerToast(`تم إنشاء ${data.createdCount} حساب جديد وتخطي ${data.skippedCount} حساب موجود 🟢`, 'success');

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      triggerToast('خطأ في العملية الجماعية: ' + err.message, 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Execute Batch Status Action for Selected Rows
  const handleBatchStatusAction = async (action: 'activate' | 'deactivate' | 'reset_password') => {
    if (selectedSoldierIds.length === 0) {
      triggerToast('يرجى تحديد أفراد من الجدول أولاً', 'warning');
      return;
    }

    const actionText = action === 'activate' ? 'تفعيل' : action === 'deactivate' ? 'إيقاف' : 'إعادة تعيين كلمة المرور إلى الرقم العسكري معكوساً لـ';
    if (!confirm(`هل أنت متأكد من تنفيذ إجراء [${actionText}] لعدد (${selectedSoldierIds.length}) من الأفراد المحددين؟`)) return;

    try {
      const res = await fetch('/api/soldiers/accounts/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldierIds: selectedSoldierIds, action })
      });

      if (!res.ok) throw new Error('فشل تنفيذ الإجراء الجماعي');

      onAddLog('تعديل', 'تفعيل الحسابات', `تم تنفيذ [${actionText}] لعدد (${selectedSoldierIds.length}) من حسابات الأفراد.`);
      triggerToast(`تم تنفيذ الإجراء لعدد ${selectedSoldierIds.length} فرد بنجاح 🟢`, 'success');
      setSelectedSoldierIds([]);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      triggerToast('خطأ أثناء تنفيذ الإجراء الجماعي: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans text-right select-none dir-rtl" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 rounded-3xl border border-emerald-800/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300">
                <UserCheck className="w-6 h-6" />
              </span>
              <span className="text-xs font-black text-emerald-400 tracking-wider">نظام شؤون الأفراد والخدمات الإلكترونية</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              قسم إنشاء وتفعيل الحسابات العسكرية
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              إدارة وتفعيل حسابات الأفراد الإلكترونية، إنشاء الحسابات الجماعية تلقائياً بالرقم العسكري وكلمة المرور الابتدائية المعكوسة، وطباعة كشوفات وبيانات الدخول الرسمية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setBulkResult(null);
                setIsBulkCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-emerald-400/40 hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حسابات جماعية ⚡</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-2xl transition-all border border-slate-700/80 flex items-center gap-2 cursor-pointer hover:text-white"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة كشف الحسابات 🖨️</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('accounts_list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'accounts_list'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>قائمة الحسابات والتفعيل</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>تقارير الحسابات العسكرية</span>
          </button>
        </div>
      </div>

      {/* KPI Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold">إجمالي الأفراد بالمنظومة</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalSoldiers}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">فرد مسجل</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-xs font-bold">الحسابات المفعلة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-800 font-mono">{stats.activeAccounts}</span>
            <span className="text-[10px] text-emerald-600/80 block mt-0.5 font-bold">متاح لهم تسجيل الدخول</span>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-amber-700">
            <span className="text-xs font-bold">الحسابات غير المفعلة</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-800 font-mono">{stats.inactiveAccounts}</span>
            <span className="text-[10px] text-amber-600/80 block mt-0.5 font-bold">تتطلب التفعيل من القيادة</span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-700">
            <span className="text-xs font-bold">أفراد بدون حسابات</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-800 font-mono">{stats.uncreatedAccounts}</span>
            <span className="text-[10px] text-rose-600/80 block mt-0.5 font-bold">يحتاجون إنشاء حساب</span>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-xs font-bold">نسبة تفعيل الحسابات</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.activationRate}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.activationRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table & Filters View */}
      {activeSubTab === 'accounts_list' && (
        <div className="space-y-4">
          
          {/* Advanced Search & Filtering Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم، الرقم العسكري، اسم المستخدم..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-700 rounded-xl pr-10 pl-4 py-2 text-xs font-sans text-right focus:outline-none"
                />
              </div>

              {/* Unit Filter */}
              <div>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="all">كل الوحدات العسكرية</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Battalion Filter */}
              <div>
                <select
                  value={selectedBattalion}
                  onChange={(e) => setSelectedBattalion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="all">كل الكتائب</option>
                  {availableBattalions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Account Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="all">كل حالات الحسابات</option>
                  <option value="created_active">مفعل 🟢</option>
                  <option value="inactive">غير مفعل / موقوف 🟡</option>
                  <option value="not_created">غير منشأ ⚪</option>
                </select>
              </div>
            </div>

            {/* Bulk Action Controls Bar (When Selection Exists) */}
            {selectedSoldierIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-950 text-white rounded-xl border border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>تم تحديد ({selectedSoldierIds.length}) فرد للعمليات الجماعية:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBatchStatusAction('activate')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تفعيل الحسابات</span>
                  </button>

                  <button
                    onClick={() => handleBatchStatusAction('deactivate')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>إيقاف الحسابات</span>
                  </button>

                  <button
                    onClick={() => handleBatchStatusAction('reset_password')}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة تعيين كلمة المرور (معكوس الرقم العسكري)</span>
                  </button>

                  <button
                    onClick={() => setSelectedSoldierIds([])}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-[11px]"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-black border-b border-slate-800">
                    <th className="p-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedSoldierIds.length > 0 && selectedSoldierIds.length === filteredSoldiers.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">الرقم العسكري</th>
                    <th className="p-3.5">الاسم والصفة العسكرية</th>
                    <th className="p-3.5">الوحدة / التشكيل</th>
                    <th className="p-3.5">اسم المستخدم (المعترف به)</th>
                    <th className="p-3.5">كلمة المرور الابتدائية</th>
                    <th className="p-3.5 text-center">حالة الحساب</th>
                    <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSoldiers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد بيانات مطابقة للبحث أو الفلترة الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredSoldiers.map(s => {
                      const unit = units.find(u => u.id === s.unitId);
                      const isSelected = selectedSoldierIds.includes(s.id);
                      const initialPassword = s.accountPassword || getReversedMilitaryNumber(s.militaryNumber);
                      const showPass = visiblePasswordIds[s.id] || false;

                      return (
                        <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectSoldier(s.id)}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-black text-slate-900 text-sm">{s.militaryNumber}</td>
                          <td className="p-3 font-bold text-slate-800">
                            <div>{s.rank} {s.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{s.battalion || 'كتيبة عامة'} - {s.company || 'سرية عامة'}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-600">{unit?.name || 'غير محدد'}</td>
                          <td className="p-3 font-mono font-extrabold text-emerald-800 bg-emerald-50/50 px-2 py-1 rounded-lg w-max border border-emerald-200/60">
                            {s.accountUsername || s.militaryNumber}
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-700 font-black border border-slate-200 tracking-wider">
                                {showPass ? initialPassword : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(s.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                                title={showPass ? 'إخفاء' : 'إظهار'}
                              >
                                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {s.hasAccount ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>مفعل 🟢</span>
                              </span>
                            ) : s.accountUsername ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>موقوف 🟡</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>غير منشأ ⚪</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingSoldier(s);
                                  setEditUsername(s.accountUsername || s.militaryNumber);
                                  setEditPassword(s.accountPassword || getReversedMilitaryNumber(s.militaryNumber));
                                  setEditHasAccount(s.hasAccount || false);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all cursor-pointer font-bold text-[11px] flex items-center gap-1"
                                title="تعديل الضبط الحسابي"
                              >
                                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                                <span>إدارة الحساب</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reports Section View */}
      {activeSubTab === 'reports' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800">تقارير وكشوفات الحسابات العسكرية للأفراد</h3>
              <p className="text-xs text-slate-500 mt-0.5">استخراج طباعة وتقارير تفصيلية شاملة لجميع الحسابات المفعلة والموقوفة وغير المنشأة.</p>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف مجمع</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تقرير الحسابات المفعلة</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                كشف بجميع الأفراد الذين تم تفعيل حساباتهم بنجاح ويمكنهم الوصول للخدمات والطلبات الإلكترونية.
              </p>
              <div className="pt-2 flex justify-between items-center border-t border-slate-200/60">
                <span className="text-xs font-bold text-slate-700">{stats.activeAccounts} فرد مفعل</span>
                <button 
                  onClick={() => {
                    setSelectedStatus('created_active');
                    setActiveSubTab('accounts_list');
                  }}
                  className="text-xs font-black text-emerald-700 hover:underline cursor-pointer"
                >
                  معاينة الكشف ←
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>تقرير الأفراد بدون حسابات</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                قائمة حصرية بالأفراد الذين لم يتم إنشاء حسابات عسكرية لهم بعد، لغرض إنشاء الحسابات الجماعية لهم.
              </p>
              <div className="pt-2 flex justify-between items-center border-t border-slate-200/60">
                <span className="text-xs font-bold text-slate-700">{stats.uncreatedAccounts} فرد</span>
                <button 
                  onClick={() => {
                    setSelectedStatus('not_created');
                    setActiveSubTab('accounts_list');
                  }}
                  className="text-xs font-black text-rose-700 hover:underline cursor-pointer"
                >
                  معاينة الكشف ←
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                <Printer className="w-5 h-5 text-sky-600" />
                <span>كشف كلمات المرور الابتدائية</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                طباعة بطاقات وكشوفات تسليم الحسابات العسكرية الرسمية المشتملة على اسم المستخدم وكلمة المرور معكوسة.
              </p>
              <div className="pt-2 flex justify-between items-center border-t border-slate-200/60">
                <span className="text-xs font-bold text-slate-700">جاهز للطباعة</span>
                <button 
                  onClick={() => setIsPrintModalOpen(true)}
                  className="text-xs font-black text-sky-700 hover:underline cursor-pointer"
                >
                  فتح طباعة البطاقات ←
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: BULK ACCOUNTS CREATION --- */}
      <AnimatePresence>
        {isBulkCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 text-right overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">إنشاء الحسابات الجماعية للأفراد ⚡</h3>
                    <p className="text-[11px] text-slate-500">إنشاء وتفعيل الحسابات تلقائياً اعتماداً على الرقم العسكري ومعكوسه.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBulkCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {!bulkResult ? (
                <div className="space-y-4">
                  
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1.5 leading-relaxed">
                    <p className="font-black text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      آلية وتلقائية النظام:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pr-2 font-bold text-[11px]">
                      <li>اعتماد <b>الرقم العسكري</b> كاسم المستخدم.</li>
                      <li>إنشاء كلمة مرور مؤقتة عشوائية من الخادم، مع ضرورة تغييرها عند أول استخدام.</li>
                      <li>تجاهل الحسابات المنشأة مسبقاً لمنع التكرار والأخطاء.</li>
                      <li>ربط الحساب تلقائياً بسجل ملف الفرد في النظام.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-800 block">حدد نطاق الإنشاء الجماعي:</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setBulkScope('all_uncreated')}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs font-bold ${
                          bulkScope === 'all_uncreated'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        جميع الأفراد الذين ليس لديهم حسابات
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkScope('unit')}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs font-bold ${
                          bulkScope === 'unit'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        حسب الوحدة / اللواء
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkScope('battalion')}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs font-bold ${
                          bulkScope === 'battalion'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        حسب الكتيبة
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkScope('filtered')}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs font-bold ${
                          bulkScope === 'filtered'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        حسب نتائج البحث والفلترة الحالية ({filteredSoldiers.filter(s => !s.hasAccount).length} فرد)
                      </button>
                    </div>

                    {bulkScope === 'unit' && (
                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">اختر الوحدة / اللواء:</label>
                        <select
                          value={bulkUnitId}
                          onChange={(e) => setBulkUnitId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                        >
                          <option value="all">اختر وحدة...</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {bulkScope === 'battalion' && (
                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">اختر الكتيبة:</label>
                        <select
                          value={bulkBattalion}
                          onChange={(e) => setBulkBattalion(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                        >
                          <option value="all">اختر كتيبة...</option>
                          {availableBattalions.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">عدد الأفراد المتوقع إنشاء حسابات لهم:</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">{bulkTargetCount} فرد</span>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsBulkCreateModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingBulk || bulkTargetCount === 0}
                      onClick={handleExecuteBulkCreate}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      {isProcessingBulk ? 'جاري التنفيذ والربط...' : `بدء الإنشاء الجماعي لـ (${bulkTargetCount}) فرد ⚡`}
                    </button>
                  </div>

                </div>
              ) : (
                /* Bulk Result Summary Screen */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-100/80 border border-emerald-300 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                    <h4 className="text-base font-black text-emerald-950">اكتملت عملية إنشاء الحسابات الجماعية بنجاح 🟢</h4>
                    <p className="text-xs text-emerald-800 font-bold">
                      تم إنشاء ({bulkResult.createdCount}) حساب جديد، وتخطي ({bulkResult.skippedCount}) حساب موجود مسبقاً.
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block border-b pb-1">عينة الحسابات الجديدة التي تم إنشاؤها:</span>
                    {bulkResult.createdList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{item.fullName}</span>
                          <span className="text-slate-400 block text-[10px]">الرقم: {item.militaryNumber}</span>
                        </div>
                        <div className="text-left font-bold text-emerald-800">
                          <div>المستخدم: {item.username}</div>
                          <div className="text-[10px] text-slate-500">كلمة المرور: {item.initialPassword}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setIsBulkCreateModalOpen(false)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
                    >
                      إغلاق ومعاينة الجدول
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: EDIT SINGLE ACCOUNT --- */}
      <AnimatePresence>
        {editingSoldier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">إدارة حساب الفرد</h3>
                    <p className="text-[10px] text-slate-500">{editingSoldier.rank} {editingSoldier.fullName}</p>
                  </div>
                </div>

                <button onClick={() => setEditingSoldier(null)} className="p-1 text-slate-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الرقم العسكري (اسم المستخدم الافتراضي):</label>
                  <input
                    type="text"
                    disabled
                    value={editingSoldier.militaryNumber}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المستخدم الدخول:</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-700 rounded-xl p-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كلمة المرور:</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-700 rounded-xl p-2.5 font-mono font-bold text-emerald-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">كلمة المرور الابتدائية الافتراضية هي معكوس الرقم العسكري.</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-800">حالة تفعيل الحساب:</span>
                  <button
                    type="button"
                    onClick={() => setEditHasAccount(!editHasAccount)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      editHasAccount ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {editHasAccount ? 'مفعل 🟢' : 'غير مفعل 🔴'}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSoldier(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={isSavingSingle}
                  onClick={handleSaveSingleAccount}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md"
                >
                  {isSavingSingle ? 'جاري الحفظ...' : 'حفظ التعديلات 🟢'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: PRINT CREDENTIALS STATEMENT --- */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 text-right max-h-[90vh] overflow-y-auto"
            >
              {/* Printable Header & Options */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 print:hidden">
                <div>
                  <h3 className="text-lg font-black text-slate-900">معاينة طباعة كشف وبطاقات الحسابات العسكرية</h3>
                  <p className="text-xs text-slate-500">طباعة كشف معتمد بأسماء المستخدمين وكلمات المرور المبدئية أو بطاقات تسليم فردية.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintMode(printMode === 'table' ? 'cards' : 'table')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    {printMode === 'table' ? 'التحويل لنظام البطاقات الفردية 🎴' : 'التحويل لنظام الجدول المجمع 📋'}
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الآن</span>
                  </button>

                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Content Frame */}
              <div id="printable-accounts-document" className="p-6 bg-white space-y-6 text-slate-900 font-sans print:p-0">
                
                {/* Official Military Header */}
                <PrintHeader documentTitle="كشف أسماء المستخدمين وكلمات المرور المبدئية لحسابات الأفراد" />

                {/* Printable Mode 1: Table Statement */}
                {printMode === 'table' ? (
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-black">
                          <th className="p-2.5 border border-slate-700 text-center w-12">#</th>
                          <th className="p-2.5 border border-slate-700">الرقم العسكري</th>
                          <th className="p-2.5 border border-slate-700">الرتبة والاسم الثلاثي</th>
                          <th className="p-2.5 border border-slate-700">التشكيل / الكتيبة</th>
                          <th className="p-2.5 border border-slate-700">اسم المستخدم</th>
                          <th className="p-2.5 border border-slate-700 font-mono">كلمة المرور المبدئية</th>
                          <th className="p-2.5 border border-slate-700 text-center">التوقيع بالاستلام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredSoldiers.map((s, idx) => (
                          <tr key={s.id} className="even:bg-slate-50/60">
                            <td className="p-2.5 border border-slate-200 text-center font-mono font-bold">{idx + 1}</td>
                            <td className="p-2.5 border border-slate-200 font-mono font-black">{s.militaryNumber}</td>
                            <td className="p-2.5 border border-slate-200 font-bold">{s.rank} / {s.fullName}</td>
                            <td className="p-2.5 border border-slate-200 font-semibold">{s.battalion || 'الكتيبة'} - {s.company || 'السرية'}</td>
                            <td className="p-2.5 border border-slate-200 font-mono font-extrabold">{s.accountUsername || s.militaryNumber}</td>
                            <td className="p-2.5 border border-slate-200 font-mono font-black text-emerald-900">{s.accountPassword || getReversedMilitaryNumber(s.militaryNumber)}</td>
                            <td className="p-2.5 border border-slate-200 text-center font-mono text-[10px] text-slate-400">........................</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Printable Mode 2: Individual Cards / Slips Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredSoldiers.map((s) => (
                      <div key={s.id} className="p-4 border-2 border-slate-800 rounded-2xl bg-slate-50/50 space-y-2 text-xs relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                          <span className="font-black text-slate-900">بطاقة استلام حساب فرد إلكتروني</span>
                          <span className="font-mono text-[10px] text-slate-500">{s.militaryNumber}</span>
                        </div>

                        <div className="space-y-1 font-bold">
                          <div>الاسم: {s.rank} / {s.fullName}</div>
                          <div className="text-[11px] text-slate-600">التشكيل: {s.battalion || 'الكتيبة'} - {s.company || 'السرية'}</div>
                        </div>

                        <div className="p-2.5 bg-white border border-slate-300 rounded-xl space-y-1 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">اسم المستخدم:</span>
                            <span className="font-black text-slate-900">{s.accountUsername || s.militaryNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">كلمة المرور المبدئية:</span>
                            <span className="font-black text-emerald-800">{s.accountPassword || getReversedMilitaryNumber(s.militaryNumber)}</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-500 leading-tight">
                          * كلمة المرور المبدئية هي الرقم العسكري معكوساً. يرجى الدخول للنظام وتغيير كلمة المرور فور الاستلام.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Official Military Footer */}
                <PrintFooter />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
