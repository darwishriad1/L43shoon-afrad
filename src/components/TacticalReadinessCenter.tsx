import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Radio, 
  Users, 
  Activity, 
  Flame, 
  Download, 
  Printer, 
  Share2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Building2, 
  PhoneCall, 
  BadgeCheck, 
  Award, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Volume2,
  VolumeX,
  FileText,
  UserCheck,
  Send
} from 'lucide-react';
import { Soldier, Unit, AttendanceRecord, OperationalAlertLevel, PrintSettings } from '../types';
import { triggerToast } from './ToastContainer';

interface TacticalReadinessCenterProps {
  soldiers: Soldier[];
  units: Unit[];
  attendance: AttendanceRecord[];
  printSettings?: PrintSettings;
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  onNavigateTab?: (tab: string) => void;
  onSelectSoldier?: (soldier: Soldier) => void;
  onNavigateToSoldier?: (soldierId: string) => void;
  onOpenMilitaryCard?: (soldier: Soldier) => void;
}

const TACTICAL_SECTORS = [
  { id: 'sec_north', name: 'القطاع الشمالي (خط التماس 1)', commander: 'العقيد / سالم اليافعي', soldiersNeeded: 45, frequency: '148.250 MHz', status: 'active', priority: 'high' },
  { id: 'sec_coast', name: 'قطاع الساحل والمحور الغربي', commander: 'المقدم / فضل العولقي', soldiersNeeded: 35, frequency: '152.100 MHz', status: 'active', priority: 'high' },
  { id: 'sec_hq', name: 'مقر القيادة ومركز العمليات المشتركة', commander: 'العميد / قائد اللواء', soldiersNeeded: 25, frequency: '144.000 MHz', status: 'secure', priority: 'critical' },
  { id: 'sec_logistics', name: 'قاعدة الإمداد والتموين ومخازن العتاد', commander: 'الرائد / طارق الصبيحي', soldiersNeeded: 20, frequency: '146.500 MHz', status: 'secure', priority: 'medium' },
  { id: 'sec_medical', name: 'المستشفى الميداني ووحدة الإخلاء', commander: 'الرائد طبيب / أحمد المشوشي', soldiersNeeded: 15, frequency: '150.350 MHz', status: 'ready', priority: 'medium' }
];

export default function TacticalReadinessCenter({
  soldiers = [],
  units = [],
  attendance = [],
  printSettings,
  currentUser,
  onNavigateToSoldier,
  onOpenMilitaryCard
}: TacticalReadinessCenterProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [alertLevel, setAlertLevel] = useState<OperationalAlertLevel>(() => {
    try {
      return (localStorage.getItem('military_alert_level') as OperationalAlertLevel) || 'DEFCON_3';
    } catch {
      return 'DEFCON_3';
    }
  });

  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_advisor' | 'sectors' | 'emergency_recall'>('overview');
  const [selectedSector, setSelectedSector] = useState<string>('sec_north');

  // Save alert level to local storage
  const handleSetAlertLevel = (level: OperationalAlertLevel) => {
    setAlertLevel(level);
    try {
      localStorage.setItem('military_alert_level', level);
    } catch {}

    const titles: Record<OperationalAlertLevel, string> = {
      DEFCON_4: 'الحالة الخضراء (اعتيادي 🟢)',
      DEFCON_3: 'الحالة الصفراء (استعداد قتالي 70% 🟡)',
      DEFCON_2: 'الحالة البرتقالية (تأهب متقدم 85% 🟠)',
      DEFCON_1: 'الحالة الحمراء (استنفار شامل 100% 🔴)'
    };

    triggerToast(`تم تحديث مستوى التأهب العملياتي للواء إلى: ${titles[level]}`, 'info');

    // Play operational notification chime if sound enabled
    if (isSoundEnabled && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = level === 'DEFCON_1' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(level === 'DEFCON_1' ? 880 : 587.33, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {}
    }
  };

  // Day Attendance Metrics
  const metrics = useMemo(() => {
    const dayAttendance = attendance.filter(a => a.date === selectedDate);
    const totalSoldiers = soldiers.length || 1;

    const present = dayAttendance.filter(a => String(a.statusCode) === 'ح' || String(a.statusCode) === 'حاضر').length;
    const absent = dayAttendance.filter(a => String(a.statusCode) === 'غ' || String(a.statusCode) === 'غائب').length;
    const leaves = dayAttendance.filter(a => String(a.statusCode) === 'إ' || String(a.statusCode) === 'إجازة').length;
    const missions = dayAttendance.filter(a => String(a.statusCode) === 'م' || String(a.statusCode) === 'مهمة').length;
    const excused = dayAttendance.filter(a => String(a.statusCode) === 'ع' || String(a.statusCode) === 'بعذر').length;
    const unrecorded = Math.max(0, totalSoldiers - (present + absent + leaves + missions + excused));

    const readinessPercentage = Math.round((present / totalSoldiers) * 100);

    // Officers Metrics
    const officers = soldiers.filter(s => 
      s.rank.includes('ملازم') || 
      s.rank.includes('نقيب') || 
      s.rank.includes('رائد') || 
      s.rank.includes('مقدم') || 
      s.rank.includes('عقيد') || 
      s.rank.includes('عميد') || 
      s.rank.includes('لواء')
    );
    const presentOfficers = officers.filter(o => {
      const att = dayAttendance.find(a => a.soldierId === o.id);
      return att && (String(att.statusCode) === 'ح' || String(att.statusCode) === 'حاضر');
    });
    const officerCoverage = officers.length > 0 ? Math.round((presentOfficers.length / officers.length) * 100) : 100;

    return {
      totalSoldiers,
      present,
      absent,
      leaves,
      missions,
      excused,
      unrecorded,
      readinessPercentage,
      officersCount: officers.length,
      presentOfficersCount: presentOfficers.length,
      officerCoverage
    };
  }, [soldiers, attendance, selectedDate]);

  // Unit breakdown
  const unitReadinessList = useMemo(() => {
    const dayAttendance = attendance.filter(a => a.date === selectedDate);

    return units.map(u => {
      const uSoldiers = soldiers.filter(s => s.unitId === u.id);
      const uPresent = uSoldiers.filter(s => {
        const att = dayAttendance.find(a => a.soldierId === s.id);
        return att && (String(att.statusCode) === 'ح' || String(att.statusCode) === 'حاضر');
      }).length;
      const rate = uSoldiers.length > 0 ? Math.round((uPresent / uSoldiers.length) * 100) : 0;

      return {
        unit: u,
        total: uSoldiers.length,
        present: uPresent,
        rate
      };
    });
  }, [units, soldiers, attendance, selectedDate]);

  // Fetch AI Tactical Analysis
  const handleGenerateAiBriefing = async () => {
    setIsAiLoading(true);
    try {
      const token = localStorage.getItem('military_auth_token') || localStorage.getItem('authToken') || 'local_admin';
      const res = await fetch('/api/ai/readiness-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedDate,
          alertLevel
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis || 'تم التقييم بنجاح.');
        triggerToast('تم توليد التقرير التكتيكي الذكي للجاهزية بنجاح!', 'success');
      } else {
        triggerToast('حدث خطأ أثناء جلب التحليل التكتيكي', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('تعذر الاتصال بخدمة التحليل الذكي', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Emergency Recall List (Soldiers on leave / absent)
  const emergencyRecallSoldiers = useMemo(() => {
    const dayAttendance = attendance.filter(a => a.date === selectedDate);
    return soldiers.filter(s => {
      const att = dayAttendance.find(a => a.soldierId === s.id);
      return !att || att.statusCode === 'غ' || att.statusCode === 'إ' || att.statusCode === 'ع';
    });
  }, [soldiers, attendance, selectedDate]);

  const alertDetails = useMemo(() => {
    switch (alertLevel) {
      case 'DEFCON_1':
        return {
          title: 'الحالة الحمراء • استنفار قتالي شامل (100%)',
          description: 'استدعاء فوري لكافة القوة الغائبة والمجازة، إغلاق البوابات، وتفعيل حماية الأبراج على مدار الساعة.',
          color: 'from-rose-600 to-red-800',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
      case 'DEFCON_2':
        return {
          title: 'الحالة البرتقالية • تأهب متقدم ومراقبة مستمرة (85%)',
          description: 'تكثيف الدوريات الخارجية، جاهزية طواقم اللاسلكي والإسعاف، ووقف الإجازات الجديدة مؤقتاً.',
          color: 'from-amber-600 to-orange-800',
          textColor: 'text-orange-400',
          borderColor: 'border-orange-500',
          badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
        };
      case 'DEFCON_3':
        return {
          title: 'الحالة الصفراء • استعداد قتالي وحذر (70%)',
          description: 'الوضع العملياتي الاعتيادي المتقدم، متابعة نوبات الحراسة، والتأكد من حضور سرايا الإسناد.',
          color: 'from-amber-500 to-amber-700',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
      case 'DEFCON_4':
      default:
        return {
          title: 'الحالة الخضراء • وضع اعتيادي وروتيني',
          description: 'سريان البرنامج التدريبي اليومي والمهام الاعتيادية بدون إنذارات أمنية خاصة.',
          color: 'from-emerald-600 to-teal-800',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
    }
  }, [alertLevel]);

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100" dir="rtl">
      
      {/* TACTICAL ALERT COMMAND BANNER */}
      <div className={`bg-gradient-to-r ${alertDetails.color} text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 ${alertDetails.borderColor} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-black/30 rounded-2xl border border-white/20 animate-pulse">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${alertDetails.badgeBg}`}>
                  نظام السيطرة والإنذار العملياتي المباشر
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {alertDetails.title}
                </h2>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/90 max-w-2xl font-medium leading-relaxed">
              {alertDetails.description}
            </p>
          </div>

          {/* Operational Level Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleSetAlertLevel('DEFCON_4')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                alertLevel === 'DEFCON_4' 
                  ? 'bg-emerald-500 text-white shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              🟢 أخضر (اعتيادي)
            </button>

            <button
              type="button"
              onClick={() => handleSetAlertLevel('DEFCON_3')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                alertLevel === 'DEFCON_3' 
                  ? 'bg-amber-500 text-slate-950 shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              🟡 أصفر (استعداد 70%)
            </button>

            <button
              type="button"
              onClick={() => handleSetAlertLevel('DEFCON_2')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                alertLevel === 'DEFCON_2' 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              🟠 برتقالي (تأهب 85%)
            </button>

            <button
              type="button"
              onClick={() => handleSetAlertLevel('DEFCON_1')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer animate-pulse ${
                alertLevel === 'DEFCON_1' 
                  ? 'bg-rose-600 text-white shadow-lg border border-white/40' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              🔴 أحمر (استنفار 100%)
            </button>

            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title={isSoundEnabled ? 'كتم صفارة التنبيه' : 'تفعيل صفارة التنبيه'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

        </div>

      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>مصفوفة الجاهزية والسيطرة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai_advisor');
              if (!aiAnalysis) handleGenerateAiBriefing();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ai_advisor'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>المستشار التكتيكي بالذكاء الاصطناعي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sectors')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sectors'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>خريطة المحاور والقطاعات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency_recall')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'emergency_recall'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>أمر الاستدعاء السريع ({emergencyRecallSoldiers.length})</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">يوم الموقف:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* TAB 1: READINESS OVERVIEW MATRIX */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Main Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Combat Readiness Score */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">الجاهزية القتالية للقوة</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {metrics.readinessPercentage}%
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.present} / {metrics.totalSoldiers} حاضر
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.readinessPercentage >= 85 ? 'bg-emerald-500' :
                    metrics.readinessPercentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, metrics.readinessPercentage)}%` }}
                ></div>
              </div>
            </div>

            {/* 2. Officer Coverage */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">التغطية القيادية والضباط</span>
                <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {metrics.officerCoverage}%
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {metrics.presentOfficersCount} / {metrics.officersCount} ضابط
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.officerCoverage)}%` }}
                ></div>
              </div>
            </div>

            {/* 3. Force on Mission / Active Outposts */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">في مهام عملياتية ونقاط</span>
                <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Radio className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {metrics.missions}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  فرد في مهمة رسمية
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                تأمين المحاور والارتكازات الميدانية
              </div>
            </div>

            {/* 4. Absent & Off-duty Flags */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">إجمالي الغياب والإجازات</span>
                <span className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {metrics.absent + metrics.leaves}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({metrics.absent} غياب + {metrics.leaves} إجازة)
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                قوة غير متاحة على الخطوط الفورية
              </div>
            </div>

          </div>

          {/* Unit by Unit Combat Readiness List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  جاهزية الكتائب والسرايا والوحدات الميدانية
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {unitReadinessList.length} كتيبة ووحدة مقيدة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unitReadinessList.map(item => (
                <div 
                  key={item.unit.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 hover:border-indigo-400/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {item.unit.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                        القائد: {item.unit.commanderName || 'غير محدد'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      item.rate >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      item.rate >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {item.rate >= 80 ? 'جاهزية عالية' : item.rate >= 60 ? 'جاهزية مقبولة' : 'نقص حرج'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">التواجد الميداني:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {item.present} من {item.total} فرد ({item.rate}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        item.rate >= 80 ? 'bg-emerald-500' :
                        item.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: AI TACTICAL ADVISOR */}
      {activeTab === 'ai_advisor' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  الموجز التكتيكي الذكي والتحليل الاستراتيجي لقائد اللواء
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  تحليل مدعوم بالذكاء الاصطناعي يرصد نقاط القوة، الثغرات، وتوصيات إعادة التوزيع التكتيكي.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiBriefing}
              disabled={isAiLoading}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'جاري التحليل...' : 'تحديث التحليل الذكي'}</span>
            </button>
          </div>

          {/* AI Content Display */}
          {isAiLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                جاري دراسة مصفوفة الجاهزية وتوليد التقرير التكتيكي...
              </p>
            </div>
          ) : aiAnalysis ? (
            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed space-y-3 text-slate-800 dark:text-slate-200 whitespace-pre-line font-medium">
              {aiAnalysis}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              اضغط على "تحديث التحليل الذكي" لبدء تقييم الجاهزية التكتيكية.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECTORS & DEPLOYMENT MAP */}
      {activeTab === 'sectors' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TACTICAL_SECTORS.map(sec => (
              <div 
                key={sec.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-teal-500 transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {sec.name}
                    </h4>
                  </div>

                  <span className="text-[9px] font-black bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 px-2 py-0.5 rounded-full">
                    {sec.priority === 'critical' ? 'قطاع سيادي' : 'قطاع قتالي'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">القائد الميداني:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{sec.commander}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">تردد اللاسلكي:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{sec.frequency}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">القوة التشغيلية المقدرة:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{sec.soldiersNeeded} فرد</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>جاهزية الاتصال مؤكدة</span>
                  </span>
                  <span className="font-mono">ONLINE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EMERGENCY RECALL LIST */}
      {activeTab === 'emergency_recall' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>قائمة الاستدعاء الفوري للقوة الغائبة والمجازة ({emergencyRecallSoldiers.length} فرد)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                الأفراد المستهدفون بالاستدعاء العاجل عند رفع حالة التأهب إلى القصوى (DEFCON 1/2).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `🚨 أمر استدعاء عملياتي فوري - اللواء 43 عمالقة:\nنظراً لرفع مستوى التأهب، يُطلب من كافة الأفراد الغائبين والمجازين الالتحاق بمقار وحداتهم فوراً.\nإجمالي المطلوبين: ${emergencyRecallSoldiers.length} فرد.`;
                navigator.clipboard.writeText(text);
                triggerToast('تم نسخ مسودة أمر الاستدعاء لإرسالها عبر برقية العمليات!', 'success');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>نسخ برقية الاستدعاء</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3 rounded-r-xl">#</th>
                  <th className="p-3">الرقم العسكري</th>
                  <th className="p-3">الاسم والرتبة</th>
                  <th className="p-3">الوحدة</th>
                  <th className="p-3">رقم الهاتف / الطوارئ</th>
                  <th className="p-3 rounded-l-xl text-center">إجراء فوري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {emergencyRecallSoldiers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">{s.militaryNumber}</td>
                    <td className="p-3 font-black text-slate-900 dark:text-white">
                      {s.rank} / {s.fullName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{s.unitId}</td>
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {s.phoneNumber ? (
                        <a href={`tel:${s.phoneNumber}`} className="text-emerald-600 hover:underline flex items-center gap-1">
                          <PhoneCall className="w-3 h-3" />
                          <span>{s.phoneNumber}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">غير مسجل</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenMilitaryCard?.(s)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        بطاقة الفرد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
