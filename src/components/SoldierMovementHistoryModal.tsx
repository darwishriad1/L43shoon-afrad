import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Calendar, 
  Building2, 
  FileText, 
  ShieldCheck, 
  User as UserIcon, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Filter, 
  ArrowRight, 
  Milestone, 
  Award, 
  Briefcase, 
  Share2, 
  Copy, 
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Soldier, Unit, PrintSettings } from '../types';
import { soldiersService } from '../services/soldiers';

export interface MovementRecord {
  id: string;
  date: string; // YYYY-MM-DD (Order/Execution date)
  type: 'نقل إداري' | 'ترقية وتكليف' | 'إلحاق / انتداب' | 'تعيين قيادي' | 'إعادة تمركز' | 'مباشرة خدمة' | 'أخرى';
  fromUnitId?: string;
  fromUnitName: string;
  toUnitId?: string;
  toUnitName: string;
  orderNumber: string;
  orderDate: string;
  issuedBy: string; // الجهة المصدرة للأمر
  issuingOfficer?: string; // القائد أو الضابط الآمر
  reason?: string; // سبب ومبرر الحركة
  notes?: string;
  recordedBy?: string;
  status?: 'منفذ ومباشر' | 'ساري المفعول' | 'مكتمل' | 'قيد الإجراء';
}

interface SoldierMovementHistoryModalProps {
  isOpen?: boolean;
  onClose: () => void;
  soldier: Soldier | null;
  units: Unit[];
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  printSettings?: PrintSettings;
  onUpdateSoldier?: (soldierId: string, updatedFields: Partial<Soldier>) => void;
  onAddLog?: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
  isDarkMode?: boolean;
}

const COMMON_ISSUING_ENTITIES = [
  'قيادة اللواء',
  'رئاسة هيئة الأركان العامة',
  'قيادة المنطقة العسكرية',
  'شعبة شؤون الأفراد والضباط',
  'مكتب القائد العام',
  'شعبة العمليات والتدريب',
  'الاستخبارات العسكرية',
  'إدارة شؤون الموظفين والخدمة'
];

const MOVEMENT_TYPES: Array<MovementRecord['type']> = [
  'نقل إداري',
  'ترقية وتكليف',
  'إلحاق / انتداب',
  'تعيين قيادي',
  'إعادة تمركز',
  'مباشرة خدمة',
  'أخرى'
];

export default function SoldierMovementHistoryModal({
  isOpen = true,
  onClose,
  soldier,
  units = [],
  currentUser,
  printSettings,
  onUpdateSoldier,
  onAddLog,
  isDarkMode = false
}: SoldierMovementHistoryModalProps) {
  // State for list of movements
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Form State for Adding / Editing Movement
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [formType, setFormType] = useState<MovementRecord['type']>('نقل إداري');
  const [formFromUnitName, setFormFromUnitName] = useState('');
  const [formToUnitId, setFormToUnitId] = useState('');
  const [formToUnitCustomName, setFormToUnitCustomName] = useState('');
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formOrderDate, setFormOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExecutionDate, setFormExecutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [formIssuedBy, setFormIssuedBy] = useState('قيادة اللواء');
  const [formCustomIssuedBy, setFormCustomIssuedBy] = useState('');
  const [formIssuingOfficer, setFormIssuingOfficer] = useState('');
  const [formReason, setFormReason] = useState('سد الشواغر وملاك القوة التنظيمية');
  const [formNotes, setFormNotes] = useState('');
  const [formUpdateCurrentUnit, setFormUpdateCurrentUnit] = useState(true);

  // Current soldier unit name
  const currentUnitName = useMemo(() => {
    if (!soldier) return 'غير محدد';
    return units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
  }, [soldier, units]);

  // Parse assignmentsHistory from soldier prop
  const movementHistoryList: MovementRecord[] = useMemo(() => {
    if (!soldier) return [];

    let list: MovementRecord[] = [];
    try {
      if (soldier.assignmentsHistory) {
        const parsed = JSON.parse(soldier.assignmentsHistory);
        if (Array.isArray(parsed)) {
          list = parsed.map((item: any, idx: number) => ({
            id: item.id || `mov_${idx}_${Date.now()}`,
            date: item.date || item.orderDate || 'غير محدد',
            type: (item.type as any) || 'نقل إداري',
            fromUnitId: item.fromUnitId,
            fromUnitName: item.fromUnitName || 'الوحدة السابقة',
            toUnitId: item.toUnitId,
            toUnitName: item.toUnitName || item.unitName || item.position || 'غير محدد',
            orderNumber: item.orderNumber || 'بدون رقم',
            orderDate: item.orderDate || item.date || 'غير محدد',
            issuedBy: item.issuedBy || item.authority || 'الجهة المختصة',
            issuingOfficer: item.issuingOfficer || item.commander || '',
            reason: item.reason || item.details || '',
            notes: item.notes || '',
            recordedBy: item.recordedBy || 'النظام',
            status: item.status || 'منفذ ومباشر'
          }));
        }
      }
    } catch (e) {
      console.error("Failed to parse soldier movement history:", e);
    }

    // If list is empty and soldier has joinDate, synthesize an initial service induction event
    if (list.length === 0 && soldier.joinDate) {
      list.push({
        id: `initial_join_${soldier.id}`,
        date: soldier.joinDate,
        type: 'مباشرة خدمة',
        fromUnitName: 'شعبة التجنيد والقبول',
        toUnitId: soldier.unitId,
        toUnitName: currentUnitName,
        orderNumber: 'أمر مباشرة/تأسيس',
        orderDate: soldier.joinDate,
        issuedBy: 'شعبة شؤون الأفراد والضباط',
        reason: 'الالتحاق وبدء الخدمة العسكرية الرسمية',
        notes: 'مباشرة العمل بالتشكيل العسكري',
        status: 'منفذ ومباشر',
        recordedBy: 'سجل النظام الأولي'
      });
    }

    return list;
  }, [soldier, currentUnitName]);

  // Filtered and sorted movement items
  const filteredMovements = useMemo(() => {
    return movementHistoryList
      .filter(item => {
        // Type filter
        if (typeFilter !== 'all' && item.type !== typeFilter) {
          return false;
        }
        // Search filter
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchFrom = item.fromUnitName.toLowerCase().includes(q);
          const matchTo = item.toUnitName.toLowerCase().includes(q);
          const matchOrder = item.orderNumber.toLowerCase().includes(q);
          const matchIssuer = item.issuedBy.toLowerCase().includes(q);
          const matchReason = item.reason ? item.reason.toLowerCase().includes(q) : false;
          const matchDate = item.date.toLowerCase().includes(q);
          if (!matchFrom && !matchTo && !matchOrder && !matchIssuer && !matchReason && !matchDate) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date || a.orderDate).getTime() || 0;
        const timeB = new Date(b.date || b.orderDate).getTime() || 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [movementHistoryList, typeFilter, searchQuery, sortOrder]);

  // Reset form when opening
  const handleOpenAddForm = () => {
    setEditingMovementId(null);
    setFormType('نقل إداري');
    setFormFromUnitName(currentUnitName);
    const otherUnits = units.filter(u => u.id !== soldier?.unitId);
    setFormToUnitId(otherUnits[0]?.id || '');
    setFormToUnitCustomName('');
    setFormOrderNumber(`ق/${Math.floor(100 + Math.random() * 900)}//2026`);
    setFormOrderDate(new Date().toISOString().split('T')[0]);
    setFormExecutionDate(new Date().toISOString().split('T')[0]);
    setFormIssuedBy('قيادة اللواء');
    setFormCustomIssuedBy('');
    setFormIssuingOfficer('');
    setFormReason('سد الشواغر وملاك القوة التنظيمية');
    setFormNotes('');
    setFormUpdateCurrentUnit(true);
    setIsAddFormOpen(true);
  };

  const handleEditMovement = (record: MovementRecord) => {
    setEditingMovementId(record.id);
    setFormType(record.type);
    setFormFromUnitName(record.fromUnitName);
    setFormToUnitId(record.toUnitId || '');
    setFormToUnitCustomName(record.toUnitName);
    setFormOrderNumber(record.orderNumber);
    setFormOrderDate(record.orderDate || record.date);
    setFormExecutionDate(record.date || record.orderDate);
    if (COMMON_ISSUING_ENTITIES.includes(record.issuedBy)) {
      setFormIssuedBy(record.issuedBy);
      setFormCustomIssuedBy('');
    } else {
      setFormIssuedBy('أخرى');
      setFormCustomIssuedBy(record.issuedBy);
    }
    setFormIssuingOfficer(record.issuingOfficer || '');
    setFormReason(record.reason || '');
    setFormNotes(record.notes || '');
    setFormUpdateCurrentUnit(false);
    setIsAddFormOpen(true);
  };

  // Submit new / edited movement
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldier) return;

    const finalIssuer = formIssuedBy === 'أخرى' 
      ? (formCustomIssuedBy.trim() || 'الجهة المختصة') 
      : formIssuedBy;

    const targetUnitObj = units.find(u => u.id === formToUnitId);
    const finalToUnitName = targetUnitObj ? targetUnitObj.name : (formToUnitCustomName.trim() || 'الوحدة الجديدة');

    const newRecord: MovementRecord = {
      id: editingMovementId || `tr_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      date: formExecutionDate || formOrderDate,
      type: formType,
      fromUnitId: soldier.unitId,
      fromUnitName: formFromUnitName || currentUnitName,
      toUnitId: formToUnitId || undefined,
      toUnitName: finalToUnitName,
      orderNumber: formOrderNumber.trim() || 'غير محدد',
      orderDate: formOrderDate || formExecutionDate,
      issuedBy: finalIssuer,
      issuingOfficer: formIssuingOfficer.trim() || undefined,
      reason: formReason.trim() || 'مصلحة العمل والتنظيم',
      notes: formNotes.trim() || undefined,
      status: 'منفذ ومباشر',
      recordedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'النظام'
    };

    setIsSaving(true);

    try {
      let updatedList: MovementRecord[];
      if (editingMovementId) {
        updatedList = movementHistoryList.map(item => item.id === editingMovementId ? newRecord : item);
      } else {
        updatedList = [newRecord, ...movementHistoryList];
      }

      const updatedHistoryStr = JSON.stringify(updatedList);
      const updatePayload: Partial<Soldier> = {
        assignmentsHistory: updatedHistoryStr
      };

      // If user chose to update current unit of soldier
      if (formUpdateCurrentUnit && formToUnitId && formToUnitId !== soldier.unitId) {
        updatePayload.unitId = formToUnitId;
      }

      // 1. Update in parent / global state
      if (onUpdateSoldier) {
        onUpdateSoldier(soldier.id, updatePayload);
      }

      // 2. Persist to API & Supabase
      await soldiersService.updateSoldier(soldier.id, updatePayload);

      // 3. Log action
      if (onAddLog) {
        onAddLog(
          editingMovementId ? 'تعديل' : 'إضافة',
          'سجل حركة الأفراد',
          `${editingMovementId ? 'تعديل' : 'إصدار'} أمر (${formType}) للعسكري (${soldier.fullName}) بالرقم (${newRecord.orderNumber}) الصادر عن (${finalIssuer}) إلى (${finalToUnitName}).`
        );
      }

      setIsAddFormOpen(false);
      setEditingMovementId(null);
    } catch (err) {
      console.error("Error saving movement:", err);
      alert("حدث خطأ أثناء حفظ أمر الحركة. يرجى المحاولة ثانية.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete movement
  const handleDeleteMovement = async (recordId: string) => {
    if (!soldier) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل من تاريخ حركة الفرد؟')) return;

    setIsSaving(true);
    try {
      const updatedList = movementHistoryList.filter(item => item.id !== recordId);
      const updatedHistoryStr = JSON.stringify(updatedList);

      if (onUpdateSoldier) {
        onUpdateSoldier(soldier.id, { assignmentsHistory: updatedHistoryStr });
      }

      await soldiersService.updateSoldier(soldier.id, { assignmentsHistory: updatedHistoryStr });

      if (onAddLog) {
        onAddLog('حذف', 'سجل حركة الأفراد', `حذف أمر حركة للعسكري (${soldier.fullName}) من تاريخ الخدمة.`);
      }
    } catch (err) {
      console.error("Error deleting movement:", err);
      alert("فشل حذف السجل. يرجى المحاولة ثانية.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!soldier) return;

    const data = filteredMovements.map((m, idx) => ({
      'م': idx + 1,
      'الرقم العسكري': soldier.militaryNumber,
      'الرتبة والاسم': `${soldier.rank} / ${soldier.fullName}`,
      'نوع الحركة': m.type,
      'تاريخ السريان': m.date,
      'من وحدة / موقع': m.fromUnitName,
      'إلى وحدة / موقع': m.toUnitName,
      'الجهة المصدرة للأمر': m.issuedBy,
      'رقم الأمر الإداري': m.orderNumber,
      'تاريخ صدور الأمر': m.orderDate,
      'الضابط الآمر': m.issuingOfficer || 'مكتب القائد',
      'سبب ومبرر الحركة': m.reason || 'مصلحة العمل',
      'الملاحظات': m.notes || '-',
      'حالة التنفيذ': m.status || 'منفذ ومباشر',
      'الموثق': m.recordedBy || 'النظام'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل_الحركة_والتنقلات');
    XLSX.writeFile(workbook, `سجل_حركة_${soldier.militaryNumber}_${soldier.fullName.replace(/\s+/g, '_')}.xlsx`);

    if (onAddLog) {
      onAddLog('تعديل', 'تصدير بيانات', `تصدير سجل حركة العسكري (${soldier.fullName}) إلى إكسل.`);
    }
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    if (!soldier) return;

    let text = `📄 سجل الحركات والتنقلات العسكرية الرسمية\n`;
    text += `👤 الفرد: ${soldier.rank} / ${soldier.fullName} (رقم عسكري: ${soldier.militaryNumber})\n`;
    text += `🏢 الوحدة الحالية: ${currentUnitName}\n`;
    text += `📊 إجمالي الحركات المسجلة: ${movementHistoryList.length}\n`;
    text += `═══════════════════════════════\n`;

    filteredMovements.forEach((m, i) => {
      text += `${i + 1}. [${m.date}] ${m.type}\n`;
      text += `   • المسار: من (${m.fromUnitName}) ➔ إلى (${m.toUnitName})\n`;
      text += `   • الجهة المصدرة للأمر: ${m.issuedBy}\n`;
      text += `   • رقم الأمر: ${m.orderNumber} (تاريخ: ${m.orderDate})\n`;
      if (m.reason) text += `   • السبب: ${m.reason}\n`;
      text += `---------------------------------\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen || !soldier) return null;

  const isOfficer = soldier.rank.includes('عميد') || 
                    soldier.rank.includes('عقيد') || 
                    soldier.rank.includes('مقدم') || 
                    soldier.rank.includes('رائد') || 
                    soldier.rank.includes('نقيب') || 
                    soldier.rank.includes('ملازم');

  // Stats calculation
  const totalTransfers = movementHistoryList.filter(m => m.type === 'نقل إداري' || m.type === 'تعيين قيادي' || m.type === 'إعادة تمركز').length;
  const latestMovement = movementHistoryList[0];
  const firstMovement = movementHistoryList[movementHistoryList.length - 1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-750 text-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right font-sans"
        >
          {/* HEADER BAR */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    سجل الحركة والمسار التنظيمي
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    التنسيق الزمني والجهات المصدرة
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                  توثيق رسمي لكافة التحويلات، التنقلات، التعيينات، وأوامر الحركة العسكرية
                </p>
              </div>
            </div>

            {/* Top Action Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors border border-slate-750 hover:border-rose-500/30 cursor-pointer shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SOLDIER IDENTITY HERO CARD */}
          <div className="bg-slate-850/80 p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                {soldier.photoUrl ? (
                  <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-7 h-7 text-slate-500" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs rounded font-black border ${
                    isOfficer ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {soldier.rank}
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-white truncate">
                    {soldier.fullName}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>الرقم العسكري: <strong className="font-mono text-amber-300">{soldier.militaryNumber}</strong></span>
                  <span>•</span>
                  <span>الوحدة الحالية: <strong className="text-emerald-300">{currentUnitName}</strong></span>
                  <span>•</span>
                  <span>الحالة: <strong className={soldier.isActive ? 'text-emerald-400' : 'text-slate-400'}>{soldier.isActive ? 'على رأس العمل' : 'احتياط / مستبعد'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0 text-center">
              <div className="bg-slate-900/90 border border-slate-750 px-3 py-1.5 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold">إجمالي الأوامر</span>
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono">{movementHistoryList.length}</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-750 px-3 py-1.5 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold">حركات النقل</span>
                <span className="text-sm sm:text-base font-black text-sky-400 font-mono">{totalTransfers}</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-750 px-3 py-1.5 rounded-xl">
                <span className="block text-[10px] text-slate-400 font-bold">آخر حركة</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{latestMovement?.date || 'لا يوجد'}</span>
              </div>
            </div>
          </div>

          {/* CONTROLS TOOLBAR */}
          <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            {/* Search & Filter */}
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث بالوحدة، رقم الأمر، أو الجهة المصدرة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 text-white placeholder-slate-500 rounded-xl pr-9 pl-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-500/60"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-750 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">كل أنواع الحركات</option>
                {MOVEMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Sort toggle */}
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                title="تغيير الترتيب الزمني"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
              {/* Add Movement Button */}
              {currentUser?.role !== 'operations' && (
                <button
                  onClick={handleOpenAddForm}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-950/40 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>أمر حركة جديد</span>
                </button>
              )}

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تصدير سجل الحركة إلى Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">إكسل</span>
              </button>

              {/* Copy Summary */}
              <button
                onClick={handleCopySummary}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="نسخ ملخص المسار"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="hidden sm:inline">{copiedText ? 'تم النسخ' : 'نسخ'}</span>
              </button>

              {/* Print Preview Button */}
              <button
                onClick={() => setShowPrintPreview(!showPrintPreview)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showPrintPreview 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
                title="معاينة وطباعة الوثيقة الرسمية"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">طباعة رسمية</span>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* ADD / EDIT MOVEMENT FORM COLLAPSIBLE */}
            <AnimatePresence>
              {isAddFormOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl overflow-hidden mb-6"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-black text-amber-300">
                        {editingMovementId ? 'تعديل بيانات أمر الحركة' : 'إصدار وتسجيل أمر حركة / نقل جديد'}
                      </h4>
                    </div>
                    <button
                      onClick={() => setIsAddFormOpen(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMovement} className="mt-4 space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Movement Type */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع الحركة / التكليف *</label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
                          required
                        >
                          {MOVEMENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* From Unit */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">من الوحدة / الموقع السابق *</label>
                        <input
                          type="text"
                          value={formFromUnitName}
                          onChange={(e) => setFormFromUnitName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
                          placeholder="اسم الوحدة المصدر..."
                          required
                        />
                      </div>

                      {/* To Target Unit */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">إلى الوحدة / الموقع الجديد *</label>
                        <select
                          value={formToUnitId}
                          onChange={(e) => {
                            setFormToUnitId(e.target.value);
                            const u = units.find(unit => unit.id === e.target.value);
                            if (u) setFormToUnitCustomName(u.name);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value="">-- اختر من هيكل الوحدات --</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        {!formToUnitId && (
                          <input
                            type="text"
                            value={formToUnitCustomName}
                            onChange={(e) => setFormToUnitCustomName(e.target.value)}
                            placeholder="أو اكتب اسم الموقع/الوحدة يدوياً..."
                            className="w-full mt-1.5 bg-slate-900 border border-slate-750 text-white rounded-lg px-2.5 py-1 text-[11px]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Issuing Authority (الجهة المصدرة للأمر) */}
                      <div>
                        <label className="block text-[11px] font-bold text-amber-300 mb-1">
                          الجهة المصدرة للأمر *
                        </label>
                        <select
                          value={formIssuedBy}
                          onChange={(e) => setFormIssuedBy(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/50 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-bold"
                        >
                          {COMMON_ISSUING_ENTITIES.map(ent => (
                            <option key={ent} value={ent}>{ent}</option>
                          ))}
                          <option value="أخرى">جهة أخرى (تحديد يدوي)...</option>
                        </select>
                        {formIssuedBy === 'أخرى' && (
                          <input
                            type="text"
                            value={formCustomIssuedBy}
                            onChange={(e) => setFormCustomIssuedBy(e.target.value)}
                            placeholder="اكتب اسم الجهة المصدرة للأمر..."
                            className="w-full mt-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-[11px]"
                            required
                          />
                        )}
                      </div>

                      {/* Order Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم الأمر العسكري / الإداري *</label>
                        <input
                          type="text"
                          value={formOrderNumber}
                          onChange={(e) => setFormOrderNumber(e.target.value)}
                          placeholder="مثال: ق/204/2026..."
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono font-bold"
                          required
                        />
                      </div>

                      {/* Order Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">تاريخ صدور الأمر *</label>
                        <input
                          type="date"
                          value={formOrderDate}
                          onChange={(e) => setFormOrderDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold text-center"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Issuing Commander / Officer */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">الضابط / القائد الآمر والمعتمد</label>
                        <input
                          type="text"
                          value={formIssuingOfficer}
                          onChange={(e) => setFormIssuingOfficer(e.target.value)}
                          placeholder="اسم أو صفة الضابط المعتمد للأمر..."
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">أسباب ومبررات الحركة</label>
                        <input
                          type="text"
                          value={formReason}
                          onChange={(e) => setFormReason(e.target.value)}
                          placeholder="سد الشواغر، مصلحة العمل، ترقية..."
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">ملاحظات وتعليمات المباشرة</label>
                      <textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="أي تفاصيل أو بنود إضافية مرفقة بأمر الحركة..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    {/* Checkbox to update soldier current unit */}
                    {formToUnitId && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <input
                          type="checkbox"
                          id="updateUnitCheckbox"
                          checked={formUpdateCurrentUnit}
                          onChange={(e) => setFormUpdateCurrentUnit(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="updateUnitCheckbox" className="text-xs text-amber-300 font-bold cursor-pointer">
                          تحديث الوحدة الحالية للفرد في المنظومة فوراً إلى الوحدة المستهدفة
                        </label>
                      </div>
                    )}

                    {/* Form Buttons */}
                    <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsAddFormOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        {isSaving ? 'جاري الحفظ...' : (editingMovementId ? 'حفظ التعديلات' : 'اعتماد وحفظ أمر الحركة')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OFFICIAL PRINT PREVIEW / DOCUMENT VIEW */}
            {showPrintPreview ? (
              <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-300 text-right print:p-0 print:border-none print:shadow-none animate-in fade-in duration-200">
                {/* Official Military Document Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
                  <div className="text-center font-bold text-xs space-y-1">
                    <p>{printSettings?.countryName || 'الجمهورية اليمنية'}</p>
                    <p>{printSettings?.ministryName || 'وزارة الدفاع - رئاسة هيئة الأركان العامة'}</p>
                    <p>{printSettings?.unitName || currentUnitName}</p>
                    <p className="text-[10px] text-slate-600">شعبة شؤون الأفراد والضباط</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-600 flex items-center justify-center mx-auto mb-1 bg-amber-50 font-black text-amber-800 text-xs">
                      شعار اللواء
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">سري وموثق رسمياً</span>
                  </div>

                  <div className="text-left font-bold text-xs space-y-1 font-mono">
                    <p>الرقم: <span className="text-slate-900">س-ح/{soldier.militaryNumber}/2026</span></p>
                    <p>التاريخ: <span className="text-slate-900">{new Date().toLocaleDateString('ar-EG')}</span></p>
                    <p>المشفوعات: <span className="text-slate-900">سجل حركة خدمة</span></p>
                  </div>
                </div>

                <div className="text-center my-4">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-8">
                    وثيقة بيان المسار العملياتي وسجل التنقلات العسكرية
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">
                    ملف خدمة الفرد: {soldier.rank} / {soldier.fullName} (الرقم العسكري: {soldier.militaryNumber})
                  </p>
                </div>

                {/* Identity Summary Table */}
                <div className="my-4 border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <td className="p-2 font-bold w-1/4">الاسم الرباعي:</td>
                        <td className="p-2 font-semibold w-1/4">{soldier.fullName}</td>
                        <td className="p-2 font-bold w-1/4">الرتبة العسكرية:</td>
                        <td className="p-2 font-semibold w-1/4">{soldier.rank}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold">الرقم العسكري:</td>
                        <td className="p-2 font-mono font-bold">{soldier.militaryNumber}</td>
                        <td className="p-2 font-bold">الوحدة الحالية:</td>
                        <td className="p-2 font-semibold">{currentUnitName}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">تاريخ مباشرة الخدمة:</td>
                        <td className="p-2 font-mono">{soldier.joinDate || 'غير محدد'}</td>
                        <td className="p-2 font-bold">حالة القوة:</td>
                        <td className="p-2 font-semibold">{soldier.isActive ? 'على رأس العمل' : 'احتياط / مستبعد'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Movement History Table */}
                <div className="my-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-[11px]">
                        <th className="p-2 text-center w-8">م</th>
                        <th className="p-2 text-right">نوع الحركة</th>
                        <th className="p-2 text-center">تاريخ الأمر</th>
                        <th className="p-2 text-right">من وحدة</th>
                        <th className="p-2 text-right">إلى وحدة</th>
                        <th className="p-2 text-right">الجهة المصدرة للأمر</th>
                        <th className="p-2 text-center">رقم الأمر</th>
                        <th className="p-2 text-right">المبرر والملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredMovements.map((m, idx) => (
                        <tr key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 text-center font-mono font-bold text-[10px]">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{m.type}</td>
                          <td className="p-2 text-center font-mono">{m.date}</td>
                          <td className="p-2 text-slate-700">{m.fromUnitName}</td>
                          <td className="p-2 font-semibold text-slate-900">{m.toUnitName}</td>
                          <td className="p-2 font-bold text-amber-800">{m.issuedBy}</td>
                          <td className="p-2 text-center font-mono font-bold">{m.orderNumber}</td>
                          <td className="p-2 text-slate-600 text-[11px]">{m.reason || m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures & Seal */}
                <div className="mt-8 pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center font-bold text-xs">
                  <div>
                    <p className="text-slate-600 mb-6">ركن شؤون الأفراد والضباط</p>
                    <p className="text-slate-900 underline">التوقيع والاعتماد</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-6">الختم العسكري الرسمي</p>
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 mx-auto flex items-center justify-center text-[10px] text-slate-400">
                      ختم الشعبة
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-6">قائد التشكيل / اللواء</p>
                    <p className="text-slate-900 underline">المصادقة والتصديق</p>
                  </div>
                </div>

                {/* Print Trigger Button */}
                <div className="mt-6 flex justify-end gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الأمر الآن</span>
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    إغلاق المعاينة
                  </button>
                </div>
              </div>
            ) : (
              /* CHRONOLOGICAL TIMELINE VIEW (التنسيق الزمني التفاعلي) */
              <div className="space-y-4">
                {filteredMovements.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/60 rounded-2xl border border-slate-800 p-6">
                    <Milestone className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
                    <h4 className="text-sm font-black text-slate-300 mb-1">لا توجد حركات مسجلة تطابق معايير البحث</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      يمكنك الضغط على زر "أمر حركة جديد" بالأعلى لتوثيق حركة تنقل أو مباشرة خدمة لهذا الفرد.
                    </p>
                  </div>
                ) : (
                  <div className="relative pr-4 sm:pr-6">
                    {/* Vertical Timeline Axis Line */}
                    <div className="absolute top-3 bottom-3 right-4 sm:right-6 w-0.5 bg-gradient-to-b from-amber-500 via-sky-500 to-slate-700 -translate-x-1/2" />

                    <div className="space-y-4 sm:space-y-5">
                      {filteredMovements.map((movement, idx) => {
                        const isLatest = idx === 0 && sortOrder === 'desc';
                        const isTransfer = movement.type === 'نقل إداري';
                        const isPromotion = movement.type === 'ترقية وتكليف';
                        const isInitial = movement.type === 'مباشرة خدمة';

                        return (
                          <motion.div
                            key={movement.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            className="relative pr-8 sm:pr-10"
                          >
                            {/* Timeline Milestone Icon Node */}
                            <div className={`absolute top-2 right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg border -translate-x-0 ${
                              isLatest
                                ? 'bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-500/20'
                                : isTransfer
                                ? 'bg-sky-950 border-sky-500 text-sky-300'
                                : isPromotion
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}>
                              {isInitial ? (
                                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                              ) : isPromotion ? (
                                <Award className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                              )}
                            </div>

                            {/* Movement Card */}
                            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                              isLatest
                                ? 'bg-slate-850 border-amber-500/50 shadow-xl shadow-amber-950/20 ring-1 ring-amber-500/20'
                                : 'bg-slate-850/80 hover:bg-slate-850 border-slate-800 hover:border-slate-750'
                            }`}>
                              {/* Top Bar of Card */}
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Badge of Movement Type */}
                                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black border ${
                                    isTransfer 
                                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                      : isPromotion
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}>
                                    {movement.type}
                                  </span>

                                  {isLatest && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-slate-950">
                                      الحركة الأحدث
                                    </span>
                                  )}

                                  {/* Order Number */}
                                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-750">
                                    أمر رقم: <strong className="text-white">{movement.orderNumber}</strong>
                                  </span>
                                </div>

                                {/* Date & Relative Badge */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="font-bold text-slate-200">{movement.date}</span>
                                </div>
                              </div>

                              {/* Movement Transfer Path Header */}
                              <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  {/* From Unit */}
                                  <div className="min-w-0">
                                    <span className="block text-[9.5px] text-slate-500 font-bold">من الوحدة / الموقع:</span>
                                    <span className="text-xs sm:text-sm font-black text-slate-300 truncate block">
                                      {movement.fromUnitName}
                                    </span>
                                  </div>

                                  {/* Arrow */}
                                  <div className="p-1 sm:p-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </div>

                                  {/* To Unit */}
                                  <div className="min-w-0">
                                    <span className="block text-[9.5px] text-slate-500 font-bold">إلى الوحدة / الموقع:</span>
                                    <span className="text-xs sm:text-sm font-black text-emerald-300 truncate block">
                                      {movement.toUnitName}
                                    </span>
                                  </div>
                                </div>

                                {/* Status Tag */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{movement.status || 'منفذ ومباشر'}</span>
                                </span>
                              </div>

                              {/* Authority & Order Details (تفاصيل الجهة المصدرة للأمر) */}
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div>
                                  <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">الجهة المصدرة للأمر:</span>
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-extrabold text-amber-300 text-xs">
                                      {movement.issuedBy}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">الضابط / القائد الآمر:</span>
                                  <span className="font-bold text-slate-200">
                                    {movement.issuingOfficer || 'مكتب القائد العام'}
                                  </span>
                                </div>

                                {movement.reason && (
                                  <div className="sm:col-span-2 pt-1.5 border-t border-slate-800/80">
                                    <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">أسباب ومبررات الحركة:</span>
                                    <p className="text-slate-300 font-medium text-xs leading-relaxed">
                                      {movement.reason}
                                    </p>
                                  </div>
                                )}

                                {movement.notes && (
                                  <div className="sm:col-span-2 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                                    <strong className="text-slate-300">ملاحظات: </strong>
                                    {movement.notes}
                                  </div>
                                )}
                              </div>

                              {/* Footer Actions on Item */}
                              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                                <span>الموثق بالمنظومة: <strong className="text-slate-400">{movement.recordedBy || 'النظام'}</strong></span>

                                {currentUser?.role !== 'operations' && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleEditMovement(movement)}
                                      className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="تعديل هذا الأمر"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMovement(movement.id)}
                                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="حذف من السجل"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM FOOTER BAR */}
          <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">
                إجمالي السجلات المعروضة: <strong className="text-amber-400 font-mono">{filteredMovements.length}</strong> حركة
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700 shadow-sm"
            >
              إغلاق النافذة
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
