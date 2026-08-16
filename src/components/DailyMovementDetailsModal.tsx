import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  Printer,
  Share2,
  Download,
  Search,
  Filter,
  Calendar,
  UserCheck,
  Plane,
  AlertTriangle,
  Users,
  CheckCircle2,
  Briefcase,
  Clock,
  ArrowLeftRight,
  Shield,
  ShieldAlert,
  Copy,
  Sparkles,
  Check,
  Eye,
  RefreshCw,
  Zap,
  MessageCircle,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { Soldier, Unit, AttendanceRecord, PrintSettings, AttendanceStatusCode } from '../types';

export interface DailyMovementSoldier extends Soldier {
  unitName: string;
  movementType: 'on_duty' | 'resumed' | 'granted' | 'overdue';
  movementLabel: string;
  statusCode: string;
  recordDate: string;
  detailsNote?: string;
}

interface DailyMovementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  onDateChange?: (date: string) => void;
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  printSettings?: PrintSettings;
  currentUser?: { id: string; name: string; role: string; unitId: string | null };
  onResumeDuty?: (soldier: Soldier, e?: React.MouseEvent) => void;
  onOpenGrantLeave?: (soldier: Soldier, e?: React.MouseEvent) => void;
  onViewSoldierProfile?: (soldierId: string) => void;
  onAddLog?: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

export default function DailyMovementDetailsModal({
  isOpen,
  onClose,
  targetDate,
  onDateChange,
  units,
  soldiers,
  attendance,
  printSettings,
  currentUser,
  onResumeDuty,
  onOpenGrantLeave,
  onViewSoldierProfile,
  onAddLog
}: DailyMovementDetailsModalProps) {
  // Active Tab: 'overview' | 'all' | 'on_duty' | 'resumed' | 'granted' | 'overdue' | 'print_preview'
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'on_duty' | 'resumed' | 'granted' | 'overdue' | 'print_preview'>('overview');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [selectedSoldierForQuickAction, setSelectedSoldierForQuickAction] = useState<Soldier | null>(null);

  // Normalize Attendance Status Code helper
  const normalizeStatus = useCallback((code?: string | null): string => {
    if (!code) return 'pending';
    const c = code.trim();
    if (c === 'ح' || c === 'حاضر') return 'ح';
    if (c === 'غ' || c === 'غياب') return 'غ';
    if (c === 'إ' || c === 'إجازة' || c === 'اجازة') return 'إ';
    if (c === 'م' || c === 'مهمة' || c === 'مهمه') return 'م';
    if (c === 'ع' || c === 'مرضي' || c === 'بعذر') return 'ع';
    if (c === 'ن' || c === 'نصف يوم' || c === 'مناوبة') return 'ن';
    return c;
  }, []);

  // Previous date calculation (yesterday)
  const prevDateStr = useMemo(() => {
    const cur = new Date(targetDate);
    if (isNaN(cur.getTime())) return '';
    cur.setDate(cur.getDate() - 1);
    return cur.toISOString().split('T')[0];
  }, [targetDate]);

  // Comprehensive Daily Movement Processing
  const movementData = useMemo(() => {
    const activeSoldiersList = soldiers.filter(s => s.isActive);
    const unitMap = new Map(units.map(u => [u.id, u.name]));

    const targetMap = new Map<string, string>();
    const prevMap = new Map<string, string>();

    attendance.forEach(rec => {
      if (rec.date === targetDate) {
        targetMap.set(rec.soldierId, normalizeStatus(rec.statusCode));
      } else if (rec.date === prevDateStr) {
        prevMap.set(rec.soldierId, normalizeStatus(rec.statusCode));
      }
    });

    // 1. On-Duty (حاضر بالميدان: ح أو م أو ن)
    const onDuty: DailyMovementSoldier[] = [];
    // 2. Resumed Today (مباشر ومواصل للعمل اليوم)
    const resumed: DailyMovementSoldier[] = [];
    // 3. Granted Leave Today (ممنوح إجازة اليوم)
    const granted: DailyMovementSoldier[] = [];
    // 4. Overdue Absence (غياب وتأخير بعد إجازة)
    const overdue: DailyMovementSoldier[] = [];
    // 5. All distinct active movements today
    const allMovements: DailyMovementSoldier[] = [];

    activeSoldiersList.forEach(soldier => {
      const cur = targetMap.get(soldier.id) || (soldier.militaryStatus?.includes('إجازة') ? 'إ' : 'ح');
      const prev = prevMap.get(soldier.id);
      const unitName = unitMap.get(soldier.unitId) || 'قيادة اللواء';

      // Check On-Duty
      if (cur === 'ح' || cur === 'م' || cur === 'ن') {
        const item: DailyMovementSoldier = {
          ...soldier,
          unitName,
          movementType: 'on_duty',
          movementLabel: cur === 'ح' ? 'حاضر بالميدان' : (cur === 'م' ? 'مهمة رسمية' : 'مناوبة / نصف يوم'),
          statusCode: cur,
          recordDate: targetDate,
          detailsNote: cur === 'ح' ? 'مرابط على رأس العمل' : (cur === 'م' ? 'مكلف بمهمة خارجية' : 'خدمة مناوبة')
        };
        onDuty.push(item);
      }

      // Check Resumed
      let isResumed = false;
      if (cur === 'ح') {
        if (prev === 'غ' || prev === 'إ' || prev === 'ع' || prev === 'م') {
          isResumed = true;
        } else if (soldier.militaryStatus?.includes('مواصلة') || soldier.militaryStatus?.includes('استئناف')) {
          isResumed = true;
        } else {
          // Check prior history
          const past = attendance
            .filter(a => a.soldierId === soldier.id && a.date < targetDate)
            .sort((a, b) => b.date.localeCompare(a.date));
          if (past.length > 0) {
            const lastSt = normalizeStatus(past[0].statusCode);
            if (lastSt === 'غ' || lastSt === 'إ' || lastSt === 'ع' || lastSt === 'م') {
              isResumed = true;
            }
          }
        }
      }

      if (isResumed) {
        const item: DailyMovementSoldier = {
          ...soldier,
          unitName,
          movementType: 'resumed',
          movementLabel: 'مواصل للعمل اليوم',
          statusCode: 'ح',
          recordDate: targetDate,
          detailsNote: `مباشرة رسمية بعد (${prev === 'إ' ? 'إجازة' : (prev === 'غ' ? 'غياب' : 'انقطاع')})`
        };
        resumed.push(item);
        allMovements.push(item);
      }

      // Check Granted Leave
      if (cur === 'إ' || cur === 'ع') {
        if (prev !== 'إ' && prev !== 'ع') {
          const item: DailyMovementSoldier = {
            ...soldier,
            unitName,
            movementType: 'granted',
            movementLabel: cur === 'ع' ? 'إجازة مرضية / بعذر' : 'إجازة ممنوحة اليوم',
            statusCode: cur,
            recordDate: targetDate,
            detailsNote: 'مغادرة الميدان والتمتع بالإجازة'
          };
          granted.push(item);
          allMovements.push(item);
        }
      }

      // Check Overdue / Absence
      if (cur === 'غ' || ((prev === 'إ' || prev === 'ع') && cur !== 'ح' && cur !== 'إ' && cur !== 'ع')) {
        const item: DailyMovementSoldier = {
          ...soldier,
          unitName,
          movementType: 'overdue',
          movementLabel: 'تأخر عن المواصلة / غياب',
          statusCode: 'غ',
          recordDate: targetDate,
          detailsNote: prev === 'إ' || prev === 'ع' ? 'تجاوز فترة الإجازة المحددة' : 'غياب غير مسدد'
        };
        overdue.push(item);
        allMovements.push(item);
      }
    });

    // Statistical KPI calculations
    const totalActive = activeSoldiersList.length;
    const onDutyCount = onDuty.length;
    const resumedCount = resumed.length;
    const grantedCount = granted.length;
    const overdueCount = overdue.length;
    const totalMovementEvents = resumedCount + grantedCount + overdueCount;

    const readinessRate = totalActive > 0 ? Math.round((onDutyCount / totalActive) * 100) : 0;
    const turnoverRate = totalActive > 0 ? ((totalMovementEvents / totalActive) * 100).toFixed(1) : '0';

    return {
      totalActive,
      onDuty,
      resumed,
      granted,
      overdue,
      allMovements,
      onDutyCount,
      resumedCount,
      grantedCount,
      overdueCount,
      totalMovementEvents,
      readinessRate,
      turnoverRate
    };
  }, [soldiers, units, attendance, targetDate, prevDateStr, normalizeStatus]);

  // Filtered List based on Active Tab, Search, and Unit
  const currentList = useMemo(() => {
    let base: DailyMovementSoldier[] = [];
    if (activeTab === 'all' || activeTab === 'overview' || activeTab === 'print_preview') {
      base = movementData.allMovements;
    } else if (activeTab === 'on_duty') {
      base = movementData.onDuty;
    } else if (activeTab === 'resumed') {
      base = movementData.resumed;
    } else if (activeTab === 'granted') {
      base = movementData.granted;
    } else if (activeTab === 'overdue') {
      base = movementData.overdue;
    }

    if (selectedUnitFilter !== 'all') {
      base = base.filter(s => s.unitId === selectedUnitFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.militaryNumber.toLowerCase().includes(q) ||
        (s.rank && s.rank.toLowerCase().includes(q)) ||
        (s.unitName && s.unitName.toLowerCase().includes(q)) ||
        (s.movementLabel && s.movementLabel.toLowerCase().includes(q))
      );
    }

    return base;
  }, [activeTab, movementData, selectedUnitFilter, searchQuery]);

  // Export to Formatted Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet 1: كشف حركة اليوم الميدانية الشامل
      const aoa: any[][] = [];

      aoa.push([printSettings?.ministryName || 'وزارة الدفاع - القيادة العامة للقوات المسلحة']);
      aoa.push([printSettings?.commandName || 'قيادة العمليات والسيطرة المشتركة - اللواء 43 عمالقة']);
      aoa.push([`الموقف اليومي لحركة الأفراد والجاهزية الميدانية ليوم: ${targetDate}`]);
      aoa.push([`تاريخ الاستخراج: ${new Date().toLocaleString('ar-YE')} | المستخدم: ${currentUser?.name || 'العمليات'}`]);
      aoa.push([]);

      // KPI Summary Table
      aoa.push(['--- ملخص الموقف الإحصائي والجاهزية ---']);
      aoa.push(['إجمالي القوة الفعالة', 'القوة المداومة بالميدان', 'المواصلون للعمل', 'الإجازات الممنوحة', 'المتأخرون / الغياب', 'نسبة الجاهزية']);
      aoa.push([
        movementData.totalActive,
        movementData.onDutyCount,
        movementData.resumedCount,
        movementData.grantedCount,
        movementData.overdueCount,
        `${movementData.readinessRate}%`
      ]);
      aoa.push([]);

      // Detail Table Header
      aoa.push([
        'م',
        'الرقم العسكري',
        'الرتبة',
        'الاسم الرباعي',
        'الكتيبة / السرية',
        'نوع الحركة اليومية',
        'الحالة بالميدان',
        'رقم الهاتف',
        'ملاحظات وتفاصيل الإجراء'
      ]);

      const sourceList = activeTab === 'all' || activeTab === 'overview' ? movementData.allMovements : currentList;

      sourceList.forEach((s, idx) => {
        aoa.push([
          idx + 1,
          s.militaryNumber,
          s.rank || '',
          s.fullName,
          s.unitName,
          s.movementLabel,
          s.statusCode === 'ح' ? 'حاضر' : (s.statusCode === 'م' ? 'مهمة' : (s.statusCode === 'إ' ? 'إجازة' : 'غياب')),
          s.phoneNumber || 'غير مسجل',
          s.detailsNote || ''
        ]);
      });

      aoa.push([]);
      aoa.push(['اعتماد ضابط خفر اللواء', '', 'ركن العمليات والسيطرة', '', 'قائد اللواء']);
      aoa.push(['......................', '', '......................', '', '......................']);

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Auto width columns for clean Excel layout
      ws['!cols'] = [
        { wch: 6 },  // م
        { wch: 16 }, // الرقم العسكري
        { wch: 14 }, // الرتبة
        { wch: 32 }, // الاسم
        { wch: 22 }, // الوحدة
        { wch: 22 }, // نوع الحركة
        { wch: 14 }, // الحالة
        { wch: 16 }, // الهاتف
        { wch: 35 }  // الملاحظات
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'حركة_اليوم_الميدانية');

      // 2. Sheet 2: كشف المداومين الكامل
      const onDutyAoa: any[][] = [
        [`كشف القوة المداومة والمرابطة بالميدان (${movementData.onDutyCount} فرد) - تاريخ: ${targetDate}`],
        [],
        ['م', 'الرقم العسكري', 'الرتبة', 'الاسم', 'الوحدة', 'طبيعة الحضور', 'الهاتف']
      ];

      movementData.onDuty.forEach((s, idx) => {
        onDutyAoa.push([
          idx + 1,
          s.militaryNumber,
          s.rank || '',
          s.fullName,
          s.unitName,
          s.movementLabel,
          s.phoneNumber || ''
        ]);
      });
      const wsDuty = XLSX.utils.aoa_to_sheet(onDutyAoa);
      XLSX.utils.book_append_sheet(wb, wsDuty, 'القوة_المداومة');

      const fileName = `تقرير_حركة_اليوم_الميدانية_${targetDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      if (onAddLog) {
        onAddLog('استيراد', 'حركة اليوم الميدانية', `تصدير تقرير حركة اليوم الميدانية المنسق بصيغة Excel لتاريخ ${targetDate}`);
      }
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('حدث خطأ أثناء تصدير ملف الإكسل. يرجى المحاولة مرة أخرى.');
    }
  };

  // Generate WhatsApp Operational Dispatch Text
  const whatsAppBriefingText = useMemo(() => {
    return `*📋 موقف حركة اليوم الميدانية والجاهزية*
*🏢 ${printSettings?.commandName || 'اللواء 43 عمالقة'}*
*📅 التاريخ:* ${targetDate}
----------------------------------------
*📊 الخلاصة الإحصائية للجاهزية:*
• إجمالي القوة الفعالة: ${movementData.totalActive} فرد
• القوة المداومة بالميدان: ${movementData.onDutyCount} فرد (${movementData.readinessRate}%)
• المباشرون للعمل اليوم: ${movementData.resumedCount} فرد 🟢
• الإجازات الممنوحة اليوم: ${movementData.grantedCount} فرد ✈️
• المتأخرون / الغياب: ${movementData.overdueCount} فرد ⚠️
----------------------------------------
${movementData.resumedCount > 0 ? `*🟢 المواصلون للعمل اليوم (${movementData.resumedCount}):*\n` + movementData.resumed.slice(0, 10).map((s, i) => `${i + 1}. ${s.rank} / ${s.fullName} (${s.unitName})`).join('\n') + (movementData.resumedCount > 10 ? `\n... و ${movementData.resumedCount - 10} آخرين` : '') + '\n----------------------------------------\n' : ''}
${movementData.grantedCount > 0 ? `*✈️ الإجازات الممنوحة اليوم (${movementData.grantedCount}):*\n` + movementData.granted.slice(0, 10).map((s, i) => `${i + 1}. ${s.rank} / ${s.fullName} (${s.unitName})`).join('\n') + (movementData.grantedCount > 10 ? `\n... و ${movementData.grantedCount - 10} آخرين` : '') + '\n----------------------------------------\n' : ''}
${movementData.overdueCount > 0 ? `*⚠️ المتأخرون عن المواصلة (${movementData.overdueCount}):*\n` + movementData.overdue.slice(0, 10).map((s, i) => `${i + 1}. ${s.rank} / ${s.fullName} (${s.unitName})`).join('\n') + (movementData.overdueCount > 10 ? `\n... و ${movementData.overdueCount - 10} آخرين` : '') + '\n----------------------------------------\n' : ''}
*تحريراً بواسطة:* ${currentUser?.name || 'عمليات اللواء'}`;
  }, [movementData, targetDate, printSettings, currentUser]);

  // Copy WhatsApp Dispatch to clipboard
  const handleCopyWhatsAppBriefing = () => {
    navigator.clipboard.writeText(whatsAppBriefingText);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Open Direct WhatsApp with briefing text
  const handleShareWhatsAppDirect = () => {
    const encoded = encodeURIComponent(whatsAppBriefingText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Trigger browser print for PDF
  const handlePrintPDF = () => {
    window.print();
    if (onAddLog) {
      onAddLog('تعديل', 'حركة اليوم الميدانية', `طباعة واستخراج تقرير حركة اليوم الميدانية PDF لتاريخ ${targetDate}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 w-full max-w-6xl rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Header Bar */}
        <div className="bg-slate-950 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  مركز تفاصيل وحلول حركة اليوم الميدانية
                </h3>
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700/80 px-2 py-0.5 rounded-full font-mono font-bold">
                  {targetDate}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إحصائيات دقيقة، كشوفات تفصيلية، حلول عملياتية، وتصدير إكسل وبي دي اف منسق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Date Switcher */}
            {onDateChange && (
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 gap-1.5 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-transparent text-white text-xs outline-none cursor-pointer font-mono font-bold"
                />
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950/70 px-3 sm:px-6 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0 print:hidden scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>نظرة شاملة وحلول</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('on_duty')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'on_duty'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-slate-900 text-teal-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>المداومين ({movementData.onDutyCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resumed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'resumed'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>المواصلين اليوم ({movementData.resumedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('granted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'granted'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-blue-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-blue-400" />
              <span>الإجازات الممنوحة ({movementData.grantedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>المتأخرون / الغياب ({movementData.overdueCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span>كافة تحركات اليوم ({movementData.totalMovementEvents})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('print_preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'print_preview'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-purple-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span>معاينة وطباعة PDF</span>
            </button>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              title="تصدير إكسل منسق"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصدير إكسل (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsAppDirect}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              title="مشاركة عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">برقية واتساب</span>
            </button>
          </div>
        </div>

        {/* Modal Body Area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Top KPI Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">القوة الفعالة</span>
              <span className="text-xl font-black text-white font-mono">{movementData.totalActive}</span>
              <span className="text-[9px] text-slate-500">إجمالي المنسوبين</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-teal-500/30 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-teal-400 font-bold">
                <span>المداومين</span>
                <span className="text-[8px] bg-teal-950 px-1 rounded text-teal-300">ميدان</span>
              </div>
              <span className="text-xl font-black text-teal-300 font-mono">{movementData.onDutyCount}</span>
              <span className="text-[9px] text-teal-400/80 font-bold">جاهزية {movementData.readinessRate}%</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                <span>المواصلين</span>
                <span className="text-[8px] bg-emerald-950 px-1 rounded text-emerald-300">مباشرة</span>
              </div>
              <span className="text-xl font-black text-emerald-300 font-mono">{movementData.resumedCount}</span>
              <span className="text-[9px] text-emerald-400/80">استئناف عمل</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-blue-500/30 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-blue-400 font-bold">
                <span>الإجازات</span>
                <span className="text-[8px] bg-blue-950 px-1 rounded text-blue-300">اليوم</span>
              </div>
              <span className="text-xl font-black text-blue-300 font-mono">{movementData.grantedCount}</span>
              <span className="text-[9px] text-blue-400/80">مغادرة للميدان</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-rose-500/30 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-rose-400 font-bold">
                <span>المتأخرين</span>
                <span className="text-[8px] bg-rose-950 px-1 rounded text-rose-300">تنبيه</span>
              </div>
              <span className="text-xl font-black text-rose-300 font-mono">{movementData.overdueCount}</span>
              <span className="text-[9px] text-rose-400/80">تجاوز إجازة / غياب</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold">
                <span>حركة الاستبدال</span>
                <span className="text-[8px] bg-amber-950 px-1 rounded text-amber-300">حركية</span>
              </div>
              <span className="text-xl font-black text-amber-300 font-mono">{movementData.turnoverRate}%</span>
              <span className="text-[9px] text-amber-400/80">مؤشر التبديل اليومي</span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & TACTICAL SOLUTIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Tactical Recommendations & Smart Solutions Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-2xl border border-teal-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-teal-300">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>الرؤية العملياتية والحلول الذكية لحركة اليوم:</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    تحليل مؤتمت وفق قواعد الانضباط
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>استقرار القوة الميدانية:</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      نسبة الجاهزية تبلغ <strong className="text-white font-mono font-black">{movementData.readinessRate}%</strong> بتواجد <strong className="text-teal-300 font-mono">{movementData.onDutyCount}</strong> فرد على رأس العمل، مما يضمن التغطية العملياتية الكاملة للقطاعات.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-blue-400 font-black">
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>توازن حركة الإجازات والمواصلة:</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      باشر العمل اليوم <strong className="text-emerald-300 font-mono font-black">{movementData.resumedCount}</strong> فرد مقابل <strong className="text-blue-300 font-mono font-black">{movementData.grantedCount}</strong> إجازة ممنوحة، محققاً صافي حركة استبدال متوازن.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-400 font-black">
                      <AlertTriangle className="w-4 h-4" />
                      <span>إجراءات معالجة المتأخرين ({movementData.overdueCount}):</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {movementData.overdueCount > 0 ? (
                        <span>يوجد {movementData.overdueCount} فرد متأخر عن مباشرة العمل. يُوصى بالتواصل المباشر وتسديد المواصلة أو توجيه إشعار للسرية المعنية.</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">لا يوجد أي فرد متأخر عن الإجازة اليوم، الانضباط في أعلى مستوياته.</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick Briefing WhatsApp Card */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-bold">
                      برقية العمليات اليومية الجاهزة للمشاركة:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppBriefing}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBriefing ? 'تم النسخ بنجاح' : 'نسخ البرقية'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsAppDirect}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>إرسال عبر واتساب 📲</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast Movement List in Overview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>أبرز مستجدات حركة اليوم ({movementData.allMovements.length}):</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                  >
                    عرض الجدول الكامل ←
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {movementData.allMovements.slice(0, 6).map((soldier) => (
                    <div
                      key={soldier.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-emerald-400">
                            {soldier.rank ? soldier.rank.substring(0, 2) : 'فرد'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">{soldier.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{soldier.militaryNumber} • {soldier.unitName}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold ${
                          soldier.movementType === 'resumed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : (soldier.movementType === 'granted'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800')
                        }`}>
                          {soldier.movementLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                        <span className="text-slate-400">{soldier.detailsNote}</span>
                        {soldier.movementType === 'overdue' && onResumeDuty && (
                          <button
                            type="button"
                            onClick={(e) => onResumeDuty(soldier, e)}
                            className="text-emerald-400 font-black hover:underline cursor-pointer"
                          >
                            تسديد مواصلة 🟢
                          </button>
                        )}
                        {onViewSoldierProfile && (
                          <button
                            type="button"
                            onClick={() => onViewSoldierProfile(soldier.id)}
                            className="text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            الملف
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4, 5, 6: DETAILED LISTS WITH SEARCH & FILTERS */}
          {activeTab !== 'overview' && activeTab !== 'print_preview' && (
            <div className="space-y-3">
              {/* Search and Unit Filter Bar */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="البحث بالاسم، الرقم العسكري، الرتبة، أو الوحدة..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2 pr-9 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-2 text-[10px] text-slate-400 hover:text-white"
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-teal-400" />
                    <select
                      value={selectedUnitFilter}
                      onChange={(e) => setSelectedUnitFilter(e.target.value)}
                      className="bg-transparent text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900">جميع الوحدات العسكرية</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs bg-slate-900 border border-slate-800 text-teal-400 px-3 py-1.5 rounded-xl font-bold font-mono">
                    العدد: {currentList.length} فرد
                  </span>
                </div>
              </div>

              {/* Items Render */}
              {currentList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Info className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs">لا يوجد أفراد مسجلين في هذا القسم بالتاريخ والفلاتر المحددة.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentList.map((soldier, idx) => (
                    <div
                      key={soldier.id}
                      className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-300 font-black text-xs shrink-0 overflow-hidden shadow-inner">
                          {soldier.photoUrl ? (
                            <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            soldier.rank ? soldier.rank.substring(0, 2) : 'فرد'
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-white">{soldier.fullName}</span>
                            <span className="text-[10px] bg-slate-800 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded font-bold">
                              {soldier.rank}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              soldier.movementType === 'resumed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : (soldier.movementType === 'granted'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : (soldier.movementType === 'overdue'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-teal-950 text-teal-300 border border-teal-800'))
                            }`}>
                              {soldier.movementLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                            <span>الرقم: {soldier.militaryNumber}</span>
                            <span>•</span>
                            <span className="text-slate-300 font-sans">{soldier.unitName}</span>
                            {soldier.detailsNote && (
                              <>
                                <span>•</span>
                                <span className="text-teal-400/90 font-sans">{soldier.detailsNote}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Controls */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        {soldier.movementType === 'overdue' && onResumeDuty && (
                          <button
                            type="button"
                            onClick={(e) => onResumeDuty(soldier, e)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>تسديد مباشرة 🟢</span>
                          </button>
                        )}

                        {onOpenGrantLeave && (
                          <button
                            type="button"
                            onClick={(e) => onOpenGrantLeave(soldier, e)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plane className="w-3.5 h-3.5 text-blue-400" />
                            <span>منح إجازة</span>
                          </button>
                        )}

                        {onViewSoldierProfile && (
                          <button
                            type="button"
                            onClick={() => onViewSoldierProfile(soldier.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-400" />
                            <span>الملف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PRINT & PDF OFFICIAL REPORT PREVIEW */}
          {activeTab === 'print_preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 print:hidden">
                <div className="text-xs text-slate-300 font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-400" />
                  <span>معاينة التقرير العسكري المطبوع (A4) - جاهز للطباعة والحفظ كـ PDF:</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية / حفظ PDF 📄</span>
                </button>
              </div>

              {/* Printable Document Paper View */}
              <div className="bg-white text-black p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-xl space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:w-full">
                {/* Official Military Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start text-right">
                  <div className="space-y-1 text-xs font-bold">
                    <p>{printSettings?.countryName || 'الجمهورية اليمنية'}</p>
                    <p>{printSettings?.ministryName || 'وزارة الدفاع - رئاسة هيئة الأركان العامة'}</p>
                    <p>{printSettings?.commandName || 'قيادة العمليات والسيطرة - اللواء 43 عمالقة'}</p>
                    <p className="text-[10px] text-slate-600">شعبة القوى البشرية وشؤون الأفراد</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center mx-auto font-black text-xs">
                      شعار اللواء
                    </div>
                    <p className="text-[10px] font-mono font-bold">{targetDate}</p>
                  </div>

                  <div className="text-left space-y-1 text-xs font-mono font-bold">
                    <p>الرقم: م.ع/{targetDate.replace(/-/g, '')}</p>
                    <p>التاريخ: {targetDate}</p>
                    <p>المرفقات: كشف حركة ميدانية</p>
                    <p className="text-rose-700 font-sans font-black">سري للغاية ومحدود</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black text-slate-900">
                    الموقف اليومي لحركة الأفراد والجاهزية القتالية للميدان
                  </h2>
                  <p className="text-xs text-slate-600 font-bold">
                    تقرير شامل لجميع تحركات القوة (المداومة، المباشرة، الإجازات، وتأخير المواصلة) ليوم {targetDate}
                  </p>
                </div>

                {/* KPI Summary Grid in Print */}
                <table className="w-full border-collapse border border-slate-900 text-center text-xs">
                  <thead>
                    <tr className="bg-slate-200 font-black">
                      <th className="border border-slate-900 p-2">إجمالي القوة الفعالة</th>
                      <th className="border border-slate-900 p-2">القوة المداومة بالميدان</th>
                      <th className="border border-slate-900 p-2">المباشرون للعمل اليوم</th>
                      <th className="border border-slate-900 p-2">الإجازات الممنوحة</th>
                      <th className="border border-slate-900 p-2">المتأخرون / الغياب</th>
                      <th className="border border-slate-900 p-2">نسبة الجاهزية</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold font-mono text-sm">
                    <tr>
                      <td className="border border-slate-900 p-2">{movementData.totalActive}</td>
                      <td className="border border-slate-900 p-2">{movementData.onDutyCount}</td>
                      <td className="border border-slate-900 p-2 text-emerald-800">{movementData.resumedCount}</td>
                      <td className="border border-slate-900 p-2 text-blue-800">{movementData.grantedCount}</td>
                      <td className="border border-slate-900 p-2 text-rose-800">{movementData.overdueCount}</td>
                      <td className="border border-slate-900 p-2 font-black">{movementData.readinessRate}%</td>
                    </tr>
                  </tbody>
                </table>

                {/* Movement Details Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900">
                    كشف بيانات الأفراد وحركة اليوم التفصيلية:
                  </h4>
                  <table className="w-full border-collapse border border-slate-900 text-right text-[11px]">
                    <thead>
                      <tr className="bg-slate-200 font-black text-center">
                        <th className="border border-slate-900 p-1.5 w-10">م</th>
                        <th className="border border-slate-900 p-1.5 w-24">الرقم العسكري</th>
                        <th className="border border-slate-900 p-1.5 w-20">الرتبة</th>
                        <th className="border border-slate-900 p-1.5">الاسم الرباعي</th>
                        <th className="border border-slate-900 p-1.5 w-32">الوحدة / الكتيبة</th>
                        <th className="border border-slate-900 p-1.5 w-32">نوع الحركة الميدانية</th>
                        <th className="border border-slate-900 p-1.5">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementData.allMovements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-900 p-4 text-center text-slate-500 font-bold">
                            لا توجد حركات مسجلة لهذا اليوم.
                          </td>
                        </tr>
                      ) : (
                        movementData.allMovements.map((s, idx) => (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="border border-slate-900 p-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">{s.militaryNumber}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-bold">{s.rank}</td>
                            <td className="border border-slate-900 p-1.5 font-bold">{s.fullName}</td>
                            <td className="border border-slate-900 p-1.5">{s.unitName}</td>
                            <td className="border border-slate-900 p-1.5 text-center font-black">
                              {s.movementLabel}
                            </td>
                            <td className="border border-slate-900 p-1.5 text-[10px] text-slate-700">{s.detailsNote}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Official Approvals and Signatures Footer */}
                <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs font-bold">
                  <div className="space-y-6">
                    <p>ضابط خفر اللواء</p>
                    <p className="font-mono text-slate-400">............................</p>
                  </div>
                  <div className="space-y-6">
                    <p>ركن العمليات والسيطرة</p>
                    <p className="font-mono text-slate-400">............................</p>
                  </div>
                  <div className="space-y-6">
                    <p>قائد اللواء</p>
                    <p className="font-mono text-slate-400">............................</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Toolbar */}
        <div className="bg-slate-950 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
            <span>💡 نصيحة: يمكنك النقر المطول على حركة اليوم الميدانية في أي وقت لفتح هذه النافذة الشاملة.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير إكسل منسق</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
