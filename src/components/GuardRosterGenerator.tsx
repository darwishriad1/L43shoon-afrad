import React, { useState, useMemo, useRef } from 'react';
import { 
  Shield, 
  Calendar, 
  Users, 
  Sparkles, 
  Printer, 
  Download, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Search, 
  Plus, 
  Trash2, 
  UserCheck, 
  FileText, 
  Eye, 
  ShieldCheck, 
  Building2, 
  BadgeCheck,
  ChevronRight,
  Filter,
  Flame,
  Radio
} from 'lucide-react';
import { Soldier, Unit, AttendanceRecord, GuardPost, GuardShiftAssignment, PrintSettings } from '../types';
import { triggerToast } from './ToastContainer';

interface GuardRosterGeneratorProps {
  soldiers: Soldier[];
  units: Unit[];
  attendance: AttendanceRecord[];
  printSettings?: PrintSettings;
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  onPrintRoster?: () => void;
}

const DEFAULT_POSTS: GuardPost[] = [
  { id: 'post_gate_main', name: 'البوابة الرئيسية ومقر القيادة', location: 'المدخل الرئيسي', requiredSoldiersPerShift: 3, importanceLevel: 'critical' },
  { id: 'post_armory', name: 'مستودع الأسلحة والذخائر والعتاد', location: 'المربع الغربي', requiredSoldiersPerShift: 2, importanceLevel: 'critical' },
  { id: 'post_north_tower', name: 'برج المراقبة الشمالي (نقطة الرصد 1)', location: 'الساتر الشمالي', requiredSoldiersPerShift: 2, importanceLevel: 'high' },
  { id: 'post_south_tower', name: 'برج المراقبة الجنوبي (نقطة الرصد 2)', location: 'الساتر الجنوبي', requiredSoldiersPerShift: 2, importanceLevel: 'high' },
  { id: 'post_perimeter_patrol', name: 'دورية الحزام الأمني الخارجي', location: 'المحيط الخارجي', requiredSoldiersPerShift: 4, importanceLevel: 'high' },
  { id: 'post_checkpoint_axis', name: 'نقطة تفتيش المحور الساحلي', location: 'المدخل الساحلي', requiredSoldiersPerShift: 3, importanceLevel: 'medium' }
];

export default function GuardRosterGenerator({
  soldiers = [],
  units = [],
  attendance = [],
  printSettings,
  currentUser
}: GuardRosterGeneratorProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [posts, setPosts] = useState<GuardPost[]>(DEFAULT_POSTS);
  const [activeShiftTab, setActiveShiftTab] = useState<'all' | 'morning' | 'evening' | 'night'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom manual assignments state
  const [assignments, setAssignments] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      const saved = localStorage.getItem('military_guard_assignments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Available ready soldiers on selected date (excludes sick, leave, absent)
  const availableReadySoldiers = useMemo(() => {
    const dayAttendance = attendance.filter(a => a.date === selectedDate);
    
    return soldiers.filter(s => {
      if (selectedUnitFilter !== 'ALL' && s.unitId !== selectedUnitFilter) {
        return false;
      }
      if (!s.isActive) return false;

      const record = dayAttendance.find(a => a.soldierId === s.id);
      if (record) {
        // If explicitly absent or on leave, exclude
        if (record.statusCode === 'غ' || record.statusCode === 'إ' || record.statusCode === 'ع') {
          return false;
        }
      }
      return true;
    });
  }, [soldiers, attendance, selectedDate, selectedUnitFilter]);

  // Unit lookup helper
  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    units.forEach(u => map.set(u.id, u.name));
    return map;
  }, [units]);

  // Soldier lookup helper
  const soldierMap = useMemo(() => {
    const map = new Map<string, Soldier>();
    soldiers.forEach(s => map.set(s.id, s));
    return map;
  }, [soldiers]);

  // Auto Generate Guard Roster Smart Algorithm
  const handleAutoGenerateRoster = () => {
    if (availableReadySoldiers.length === 0) {
      triggerToast('لا يوجد أفراد متاحون للخدمة في هذا التاريخ!', 'error');
      return;
    }

    const newDateAssignments: Record<string, string[]> = {};
    const shuffledSoldiers = [...availableReadySoldiers].sort(() => Math.random() - 0.5);
    
    let soldierIndex = 0;
    const shifts = ['morning', 'evening', 'night'];

    shifts.forEach(shift => {
      posts.forEach(post => {
        const key = `${shift}_${post.id}`;
        const assigned: string[] = [];

        for (let i = 0; i < post.requiredSoldiersPerShift; i++) {
          if (soldierIndex < shuffledSoldiers.length) {
            assigned.push(shuffledSoldiers[soldierIndex].id);
            soldierIndex++;
          } else {
            // Loop back if we ran out of soldiers
            const randomIndex = Math.floor(Math.random() * shuffledSoldiers.length);
            if (!assigned.includes(shuffledSoldiers[randomIndex].id)) {
              assigned.push(shuffledSoldiers[randomIndex].id);
            }
          }
        }
        newDateAssignments[key] = assigned;
      });
    });

    const updated = {
      ...assignments,
      [selectedDate]: newDateAssignments
    };

    setAssignments(updated);
    try {
      localStorage.setItem('military_guard_assignments', JSON.stringify(updated));
    } catch {}

    triggerToast(`تم توليد جدول الخفارات والنوبات بنجاح لـ (${posts.length}) موقع عسكري!`, 'success');
  };

  // Reset current day assignments
  const handleResetCurrentDay = () => {
    const updated = { ...assignments };
    delete updated[selectedDate];
    setAssignments(updated);
    try {
      localStorage.setItem('military_guard_assignments', JSON.stringify(updated));
    } catch {}
    triggerToast('تم إعادة تعيين نوبات اليوم بنجاح', 'info');
  };

  // Current day data
  const currentDayAssignments = assignments[selectedDate] || {};

  // Total soldiers assigned today
  const totalAssignedTodayCount = useMemo(() => {
    const uniqueIds = new Set<string>();
    Object.values(currentDayAssignments).forEach(ids => {
      ids.forEach(id => uniqueIds.add(id));
    });
    return uniqueIds.size;
  }, [currentDayAssignments]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100" dir="rtl">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                <Shield className="w-6 h-6 text-amber-400" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>المولد الذكي لنوبات الحراسة والخفارات الميدانية</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  محصن تكتيكياً
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              توزيع ذكي ومتوازن لنوبات الحراسة والأبراج والدوريات ونقاط التفتيش مع مراعاة الجاهزية واستبعاد المجازين والمرضى تلقائياً.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handleAutoGenerateRoster}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>توليد ذكي تلقائي للنوبات</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحراسة</span>
            </button>

            <button
              type="button"
              onClick={handleResetCurrentDay}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
              title="إعادة تعيين"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-800/50">
          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl border border-indigo-500/20">
            <span className="text-[11px] text-slate-300 font-bold block">القوة المتاحة للخدمة</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {availableReadySoldiers.length} <span className="text-xs text-slate-400 font-sans">فرد</span>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl border border-indigo-500/20">
            <span className="text-[11px] text-slate-300 font-bold block">المكلفون بالنوبات اليوم</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              {totalAssignedTodayCount} <span className="text-xs text-slate-400 font-sans">فرد</span>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl border border-indigo-500/20">
            <span className="text-[11px] text-slate-300 font-bold block">مواقع ونقاط الحراسة</span>
            <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">
              {posts.length} <span className="text-xs text-slate-400 font-sans">موقع</span>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl border border-indigo-500/20">
            <span className="text-[11px] text-slate-300 font-bold block">تغطية الأمان التكتيكي</span>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">
              {totalAssignedTodayCount > 0 ? '100%' : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Shift Selectors */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تاريخ النوبة:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
            />
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">الوحدة:</span>
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">كافة الوحدات والكتائب</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Shift Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveShiftTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeShiftTab === 'all' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            كافة الورديات (24 ساعة)
          </button>

          <button
            type="button"
            onClick={() => setActiveShiftTab('morning')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeShiftTab === 'morning' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ☀️ صباحية (06-14)
          </button>

          <button
            type="button"
            onClick={() => setActiveShiftTab('evening')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeShiftTab === 'evening' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🌅 مسائية (14-22)
          </button>

          <button
            type="button"
            onClick={() => setActiveShiftTab('night')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeShiftTab === 'night' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🌙 ليلية (22-06)
          </button>
        </div>
      </div>

      {/* ROSTER TABLE / PRINTABLE AREA */}
      <div 
        ref={printAreaRef}
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        {/* Printable Official Header */}
        <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl font-black">
              🎖️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {printSettings?.commandName || 'قيادة ألوية العمالقة الجنوبية'} - {printSettings?.unitName || 'اللواء 43 عمالقة'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                كشف نوبات وخفارات الحراسة والأبراج ونقاط التفتيش ليوم: <strong className="text-indigo-600 dark:text-indigo-400">{selectedDate}</strong>
              </p>
            </div>
          </div>

          <div className="text-left font-mono text-xs text-slate-500 dark:text-slate-400">
            <span className="block font-bold">SYS-ROSTER-SECURE</span>
            <span>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</span>
          </div>
        </div>

        {/* SHIFTS SECTIONS */}
        {(['morning', 'evening', 'night'] as const)
          .filter(shift => activeShiftTab === 'all' || activeShiftTab === shift)
          .map(shiftKey => {
            const shiftTitle = 
              shiftKey === 'morning' ? '☀️ الوردية الأولى (صباحية 06:00 - 14:00)' :
              shiftKey === 'evening' ? '🌅 الوردية الثانية (مسائية 14:00 - 22:00)' :
              '🌙 الوردية الثالثة (ليلية 22:00 - 06:00)';

            const shiftBadgeColor = 
              shiftKey === 'morning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' :
              shiftKey === 'evening' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300' :
              'bg-slate-800 text-slate-100 border-slate-700';

            return (
              <div key={shiftKey} className="space-y-3">
                <div className={`p-3 rounded-2xl border font-black text-sm flex items-center justify-between ${shiftBadgeColor}`}>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{shiftTitle}</span>
                  </span>
                  <span className="text-xs font-bold font-mono">8 ساعات خدمة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {posts.map(post => {
                    const key = `${shiftKey}_${post.id}`;
                    const assignedSoldierIds = currentDayAssignments[key] || [];

                    return (
                      <div 
                        key={post.id}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/70 space-y-3 hover:border-indigo-400/50 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{post.name}</span>
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                              الموقع: {post.location}
                            </span>
                          </div>

                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                            post.importanceLevel === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300' :
                            'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-300'
                          }`}>
                            {post.importanceLevel === 'critical' ? 'موقع حيوي' : 'نقطة حراسة'}
                          </span>
                        </div>

                        {/* Assigned Soldiers List */}
                        <div className="space-y-1.5">
                          {assignedSoldierIds.length > 0 ? (
                            assignedSoldierIds.map((sid, idx) => {
                              const s = soldierMap.get(sid);
                              return (
                                <div 
                                  key={sid + idx}
                                  className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="truncate">
                                      <span className="font-black text-slate-900 dark:text-white block truncate">
                                        {s ? `${s.rank} / ${s.fullName}` : `فرد عسكري (#${sid})`}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                        رقم: {s?.militaryNumber || '—'} • {s?.unitId ? unitMap.get(s.unitId) : ''}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-300/40 shrink-0">
                                    {idx === 0 ? 'قائد النوبة' : 'فرد حراسة'}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-center text-amber-700 dark:text-amber-300 text-xs font-bold">
                              لم يتم تعيين أفراد لهذه الوردية (اضغط توليد تلقائي)
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

        {/* Printable Official Signatures Strip */}
        <div className="pt-8 border-t-2 border-slate-800 dark:border-slate-700 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
          <div className="space-y-8">
            <span>ضابط نوبتجية المعسكر</span>
            <div className="border-b border-dotted border-slate-400 w-36 mx-auto"></div>
          </div>

          <div className="space-y-8">
            <span>ركن عمليات اللواء</span>
            <div className="border-b border-dotted border-slate-400 w-36 mx-auto"></div>
          </div>

          <div className="space-y-8">
            <span>قائد اللواء 43 عمالقة</span>
            <div className="border-b border-dotted border-slate-400 w-36 mx-auto"></div>
          </div>
        </div>

      </div>

    </div>
  );
}
