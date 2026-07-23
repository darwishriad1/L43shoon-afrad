import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Shield, 
  Phone, 
  FileText, 
  Sparkles,
  Sliders,
  Clock,
  Building,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap,
  Bookmark,
  Share2
} from 'lucide-react';
import { Soldier, Unit, AttendanceRecord } from '../types';

interface WhatsAppShareModalProps {
  soldier: Soldier | null;
  isOpen: boolean;
  onClose: () => void;
  units?: Unit[];
  attendanceRecords?: AttendanceRecord[];
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  soldier,
  isOpen,
  onClose,
  units = [],
  attendanceRecords = []
}) => {
  if (!soldier) return null;

  // Custom options state
  const [reportType, setReportType] = useState<'full' | 'personal' | 'daily' | 'monthly' | 'custom'>('full');
  
  // Custom toggles
  const [incPersonal, setIncPersonal] = useState(true);
  const [incMilitary, setIncMilitary] = useState(true);
  const [incMedical, setIncMedical] = useState(true);
  const [incDailyAttendance, setIncDailyAttendance] = useState(true);
  const [incMonthlyStats, setIncMonthlyStats] = useState(true);
  const [incPresentDatesList, setIncPresentDatesList] = useState(true);
  const [incAbsentDatesList, setIncAbsentDatesList] = useState(true);
  const [incCustomNote, setIncCustomNote] = useState('');

  const [phoneNumber, setPhoneNumber] = useState(soldier.phoneNumber || '');
  const [isCopied, setIsCopied] = useState(false);

  // Quick message template options
  const quickNotes = [
    'يرجى موافاة قيادة الشؤون الإدارية بتقرير الحضور في أقرب وقت.',
    'تنبيه رسمي بالالتزام بالتعليمات والنوبة الميدانية في الموعد المحدد.',
    'تم اعتماد البيانات المرفقة رسمياً من قبل قيادة الوحدة.'
  ];

  // Unit Name lookup
  const unitName = useMemo(() => {
    if (!soldier) return 'قيادة اللواء';
    const found = units.find(u => u.id === soldier.unitId);
    return found ? found.name : soldier.battalion || 'قيادة اللواء - الإدارة العامة';
  }, [soldier, units]);

  // Today attendance status
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayAttendance = useMemo(() => {
    return attendanceRecords.find(r => r.soldierId === soldier.id && r.date === todayStr);
  }, [attendanceRecords, soldier, todayStr]);

  // Comprehensive Attendance Breakdown & Date Lists
  const soldierAttendanceBreakdown = useMemo(() => {
    const records = attendanceRecords
      .filter(r => r.soldierId === soldier.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const presentDates: string[] = [];
    const absentDates: string[] = [];
    const leaveDates: string[] = [];
    const missionDates: string[] = [];
    const excusedDates: string[] = [];

    records.forEach(r => {
      if (r.statusCode === 'ح') presentDates.push(r.date);
      else if (r.statusCode === 'غ') absentDates.push(r.date);
      else if (r.statusCode === 'إ') leaveDates.push(r.date);
      else if (r.statusCode === 'م') missionDates.push(r.date);
      else if (r.statusCode === 'ع') excusedDates.push(r.date);
    });

    const totalDaysRecorded = records.length;
    const commitmentRate = totalDaysRecorded > 0 ? Math.round((presentDates.length / totalDaysRecorded) * 100) : 100;

    return {
      allRecordsCount: totalDaysRecorded,
      presentDates,
      absentDates,
      leaveDates,
      missionDates,
      excusedDates,
      commitmentRate
    };
  }, [attendanceRecords, soldier]);

  // Generate WhatsApp Message according to selection
  const generatedMessage = useMemo(() => {
    let msg = `*🎖️ تقرير الشؤون العسكرية والجاهزية الميدانية الشامل*\n`;
    msg += `===================================\n`;

    // Mode logic overrides or custom
    const showPersonal = reportType === 'full' || reportType === 'personal' || (reportType === 'custom' && incPersonal);
    const showMilitary = reportType === 'full' || reportType === 'personal' || (reportType === 'custom' && incMilitary);
    const showMedical = reportType === 'full' || reportType === 'personal' || (reportType === 'custom' && incMedical);
    const showDaily = reportType === 'full' || reportType === 'daily' || (reportType === 'custom' && incDailyAttendance);
    const showMonthly = reportType === 'full' || reportType === 'monthly' || (reportType === 'custom' && incMonthlyStats);
    const showPresentList = reportType === 'full' || (reportType === 'custom' && incPresentDatesList);
    const showAbsentList = reportType === 'full' || (reportType === 'custom' && incAbsentDatesList);

    if (showMilitary) {
      msg += `👤 *الاسم الكامل:* ${soldier.fullName}\n`;
      msg += `🎖️ *الرتبة العسكرية:* ${soldier.rank}\n`;
      msg += `🆔 *الرقم العسكري:* ${soldier.militaryNumber}\n`;
      msg += `🏢 *التشكيل / الوحدة:* ${unitName}\n`;
      msg += `🟢 *الحالة الميدانية:* ${soldier.militaryStatus || 'على رأس العمل'}\n`;
    }

    if (showPersonal) {
      msg += `📄 *رقم الهوية الوطنية:* ${soldier.nationalId || 'غير مدون'}\n`;
      msg += `📱 *رقم الهاتف:* ${soldier.phoneNumber || 'غير مسجل'}\n`;
      if (soldier.address) msg += `📍 *محل الإقامة / العنوان:* ${soldier.address}\n`;
      if (soldier.qualification) msg += `🎓 *المؤهل العلمي:* ${soldier.qualification}\n`;
      if (soldier.specialization) msg += `🎯 *التخصص العسكري:* ${soldier.specialization}\n`;
    }

    if (showMedical) {
      if (soldier.bloodType) msg += `🩸 *فصيلة الدم:* ${soldier.bloodType}\n`;
      if (soldier.emergencyContact) msg += `📞 *طوارئ الاتصال:* ${soldier.emergencyContact}\n`;
    }

    if (showDaily) {
      msg += `-----------------------------------\n`;
      msg += `📅 *موقف التحضير والغياب اليومي (${todayStr}):*\n`;
      if (todayAttendance) {
        const statusMap: Record<string, string> = {
          'ح': 'حاضر (ح)',
          'غ': 'غائب بدون عذر (غ)',
          'إ': 'إجازة رسمية (إ)',
          'م': 'في مهمة عسكرية (م)',
          'ع': 'غياب بعذر مقبول (ع)',
          'ن': 'نصف يوم (ن)'
        };
        msg += `← الحالة اليوم: *${statusMap[todayAttendance.statusCode] || todayAttendance.statusCode}*\n`;
      } else {
        msg += `← الحالة اليوم: *لم يتم التحضير بعد*\n`;
      }
    }

    if (showMonthly) {
      msg += `-----------------------------------\n`;
      msg += `📊 *إحصائية السجل التراكمي للحضور والانضباط:*\n`;
      msg += `• إجمالي أيام التحضير المسجلة: ${soldierAttendanceBreakdown.allRecordsCount} يوم\n`;
      msg += `• مجموع أيام الحضور الفعلي: ${soldierAttendanceBreakdown.presentDates.length} يوم\n`;
      msg += `• مجموع أيام الغياب بدون عذر: ${soldierAttendanceBreakdown.absentDates.length} يوم\n`;
      msg += `• مجموع أيام الإجازات: ${soldierAttendanceBreakdown.leaveDates.length} يوم\n`;
      msg += `• مجموع أيام المهام الميدانية: ${soldierAttendanceBreakdown.missionDates.length} يوم\n`;
      msg += `• نسبة الانضباط العامة: *${soldierAttendanceBreakdown.commitmentRate}%*\n`;
    }

    if (showPresentList) {
      msg += `-----------------------------------\n`;
      msg += `✅ *سجل وتواريخ أيام الحضور الفعلي (${soldierAttendanceBreakdown.presentDates.length} يوم):*\n`;
      if (soldierAttendanceBreakdown.presentDates.length > 0) {
        msg += soldierAttendanceBreakdown.presentDates.map(d => `  • ${d}`).join('\n') + `\n`;
      } else {
        msg += `  • لا توجد أيام حضور مسجلة بالمنظومة\n`;
      }
    }

    if (showAbsentList) {
      msg += `-----------------------------------\n`;
      msg += `⚠️ *سجل وتواريخ عدم الحضور (الغياب والإجازات والمهام):*\n`;
      
      if (soldierAttendanceBreakdown.absentDates.length > 0) {
        msg += `🚨 *أيام الغياب بدون عذر (${soldierAttendanceBreakdown.absentDates.length} يوم):*\n`;
        msg += soldierAttendanceBreakdown.absentDates.map(d => `  • ${d}`).join('\n') + `\n`;
      } else {
        msg += `✨ *أيام الغياب بدون عذر:* لا يوجد (0)\n`;
      }

      if (soldierAttendanceBreakdown.leaveDates.length > 0) {
        msg += `🌴 *أيام الإجازات الرسمية (${soldierAttendanceBreakdown.leaveDates.length} يوم):*\n`;
        msg += soldierAttendanceBreakdown.leaveDates.map(d => `  • ${d}`).join('\n') + `\n`;
      }

      if (soldierAttendanceBreakdown.missionDates.length > 0) {
        msg += `🎯 *أيام المهام الميدانية (${soldierAttendanceBreakdown.missionDates.length} يوم):*\n`;
        msg += soldierAttendanceBreakdown.missionDates.map(d => `  • ${d}`).join('\n') + `\n`;
      }
    }

    if (incCustomNote.trim()) {
      msg += `-----------------------------------\n`;
      msg += `📝 *ملاحظات وتوجيهات القيادة:*\n`;
      msg += `${incCustomNote.trim()}\n`;
    }

    msg += `===================================\n`;
    msg += `_تم الاستخراج تلقائياً عبر منظومة إدارة الفرد والجاهزية العسكرية_`;

    return msg;
  }, [
    soldier, unitName, reportType, incPersonal, incMilitary, incMedical, 
    incDailyAttendance, incMonthlyStats, incPresentDatesList, incAbsentDatesList, 
    incCustomNote, todayStr, todayAttendance, soldierAttendanceBreakdown
  ]);

  // Copy handler
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Launch WhatsApp
  const handleSendWhatsApp = () => {
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(generatedMessage);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-lg overflow-y-auto font-sans dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] max-w-3xl w-full overflow-hidden my-auto"
          dir="rtl"
        >
          {/* Top Tactical Header */}
          <div className="relative p-4 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
            {/* Subtle glow background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-700/40 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] shrink-0">
                <MessageSquare className="w-6 h-6 text-emerald-300" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-white tracking-wide">
                    منصة مشاركة التقارير الميدانية (واتساب)
                  </h3>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>تفاعلي الذكي</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  صغ وتخصص تفاصيل الحضور والغياب والبيانات الكاملة بضغطة زر
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="self-end sm:self-center p-2.5 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all cursor-pointer hover:rotate-90 transform duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">
            
            {/* Soldier Profile Preview Header Card */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-black text-sm shrink-0 shadow-sm">
                  {soldier.rank ? soldier.rank.substring(0, 2) : 'فرد'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base text-white">{soldier.fullName}</span>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-lg font-black">{soldier.rank}</span>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg font-mono">{soldier.militaryNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{unitName}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>{soldier.militaryStatus || 'على رأس العمل'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Commitment Meter */}
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl self-start md:self-auto shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-black block">معدل الانضباط التراكمي</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {soldierAttendanceBreakdown.commitmentRate}%
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center text-emerald-300 font-black text-xs">
                  {soldierAttendanceBreakdown.presentDates.length}ح
                </div>
              </div>
            </div>

            {/* Target Phone Input */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>رقم الهاتف المرسل إليه:</span>
                </label>
                {soldier.phoneNumber && (
                  <button
                    onClick={() => setPhoneNumber(soldier.phoneNumber || '')}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>استخدام رقم الفرد ({soldier.phoneNumber})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="أدخل الرقم مثال: 967771234567 أو 0501234567"
                  className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-300 outline-none transition-all shadow-inner"
                  dir="ltr"
                />
                {phoneNumber && (
                  <button
                    onClick={() => setPhoneNumber('')}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                    title="مسح الرقم"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Select Report Mode Buttons */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>اختر القالب ونطاق البيانات المراد إرسالها:</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">انقر للتحديد المباشر</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                
                {/* 1. Full Complete Report */}
                <button
                  onClick={() => setReportType('full')}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                    reportType === 'full'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-white">التقرير الميداني الشامل 📋</span>
                    {reportType === 'full' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    كل شيء: البيانات الشخصية والعسكرية + التحضير اليومي وسجل التواريخ كاملة
                  </p>
                </button>

                {/* 2. Personal & Military */}
                <button
                  onClick={() => setReportType('personal')}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                    reportType === 'personal'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-white">البيانات التعريفية والبطاقة 🎖️</span>
                    {reportType === 'personal' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    الرتبة، الرقم العسكري، الوحدة، السكن، الهوية، فصيلة الدم والطوارئ
                  </p>
                </button>

                {/* 3. Daily Attendance Status */}
                <button
                  onClick={() => setReportType('daily')}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                    reportType === 'daily'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-white">موقف اليوم والتحضير 📅</span>
                    {reportType === 'daily' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    حالة تحضير اليوم وتاريخه الميداني فقط مع بيانات الفرد الأساسية
                  </p>
                </button>

                {/* 4. Monthly Statistics & Rates */}
                <button
                  onClick={() => setReportType('monthly')}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                    reportType === 'monthly'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-white">السجل والانضباط التراكمي 📊</span>
                    {reportType === 'monthly' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    مجموع أيام الحضور والغياب والإجازات والنسبة المئوية العامة
                  </p>
                </button>

                {/* 5. Custom Mode */}
                <button
                  onClick={() => setReportType('custom')}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer col-span-1 sm:col-span-2 ${
                    reportType === 'custom'
                      ? 'bg-gradient-to-br from-amber-950/80 to-slate-900 border-amber-500/80 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>تخصيص مخصص بالكامل (اختيار حر) ⚙️</span>
                    </span>
                    {reportType === 'custom' && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    حدد بنفسك بدقة: تواريخ أيام الحضور، تواريخ الغياب، البيانات الطبية، إلخ.
                  </p>
                </button>

              </div>
            </div>

            {/* Custom Checkboxes if 'custom' selected */}
            {reportType === 'custom' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950 border border-amber-500/30 p-4 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <p className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>تحديد الحقول والعناصر المطلوبة بالتقرير:</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">انقر للتفعيل / الإلغاء</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incMilitary ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incMilitary} onChange={e => setIncMilitary(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-bold">البيانات العسكرية الأساسية</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incPersonal ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incPersonal} onChange={e => setIncPersonal(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-bold">البيانات الشخصية والحجم</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incMedical ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incMedical} onChange={e => setIncMedical(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-bold">فصيلة الدم والطوارئ</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incDailyAttendance ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incDailyAttendance} onChange={e => setIncDailyAttendance(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-bold">تحضير اليوم الميداني</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incMonthlyStats ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incMonthlyStats} onChange={e => setIncMonthlyStats(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-bold">إحصاء ومعدل الحضور التراكمي</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incPresentDatesList ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incPresentDatesList} onChange={e => setIncPresentDatesList(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                    <span className="font-black text-emerald-300">قائمة تواريخ الحضور ✅</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${incAbsentDatesList ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <input type="checkbox" checked={incAbsentDatesList} onChange={e => setIncAbsentDatesList(e.target.checked)} className="accent-amber-500 w-4 h-4 cursor-pointer" />
                    <span className="font-black text-amber-300">قائمة تواريخ الغياب والبدائل ⚠️</span>
                  </label>

                </div>
              </motion.div>
            )}

            {/* Custom Directive / Note */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-200 flex items-center justify-between">
                <span>إضافة توجيه أو ملاحظة قيادية خاصة مع الرسالة (اختياري):</span>
                <span className="text-[10px] text-slate-400 font-bold">نماذج سريعة</span>
              </label>

              {/* Quick Note Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {quickNotes.map((note, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setIncCustomNote(note)}
                    className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-emerald-400 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    + {note.substring(0, 32)}...
                  </button>
                ))}
              </div>

              <textarea
                value={incCustomNote}
                onChange={e => setIncCustomNote(e.target.value)}
                placeholder="اكتب توجيهاتك أو ملاحظاتك هنا ليتم إدراجها ضمن رسالة التقرير..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 outline-none h-16 resize-none shadow-inner"
              />
            </div>

            {/* Live Message Preview Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black text-slate-200">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>المعاينة المباشرة لنص رسالة الواتساب:</span>
                </span>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'تم النسخ بنجاح!' : 'نسخ النص للكبس'}</span>
                </button>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300/90 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto select-text custom-scrollbar dir-rtl shadow-inner">
                {generatedMessage}
              </div>
            </div>

          </div>

          {/* Modal Bottom Controls */}
          <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
            >
              إلغاء الأمر
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-7 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Send className="w-4.5 h-4.5 text-emerald-100" />
              <span>إرسال التقرير عبر الواتساب الآن</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WhatsAppShareModal;
