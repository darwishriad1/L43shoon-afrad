import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  FileText, 
  Stethoscope, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  Printer, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Soldier, Unit, AttendanceRecord, AttendanceStatusCode } from '../types';
import { normalizeStatusCode } from './Dashboard';

interface SoldierMonthlyAttendanceModalProps {
  soldier: Soldier;
  units: Unit[];
  attendance: AttendanceRecord[];
  onClose: () => void;
  onSaveAttendanceBatch?: (soldierIds: string[], dates: string[], status: AttendanceStatusCode) => void;
}

const MONTHS_LIST = [
  { value: '01', name: 'يناير (شهر 1)' },
  { value: '02', name: 'فبراير (شهر 2)' },
  { value: '03', name: 'مارس (شهر 3)' },
  { value: '04', name: 'أبريل (شهر 4)' },
  { value: '05', name: 'مايو (شهر 5)' },
  { value: '06', name: 'يونيو (شهر 6)' },
  { value: '07', name: 'يوليو (شهر 7)' },
  { value: '08', name: 'أغسطس (شهر 8)' },
  { value: '09', name: 'سبتمبر (شهر 9)' },
  { value: '10', name: 'أكتوبر (شهر 10)' },
  { value: '11', name: 'نوفمبر (شهر 11)' },
  { value: '12', name: 'ديسمبر (شهر 12)' },
];

const YEARS_LIST = ['2026', '2025', '2024', '2027'];

export const SoldierMonthlyAttendanceModal: React.FC<SoldierMonthlyAttendanceModalProps> = ({
  soldier,
  units,
  attendance,
  onClose,
  onSaveAttendanceBatch,
}) => {
  // Default to current year and month (e.g. 2026-07)
  const today = new Date();
  const currentYearStr = String(today.getFullYear());
  const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [filterMode, setFilterMode] = useState<'all' | 'sick_only'>('all');

  // Find unit name
  const unitName = units.find(u => u.id === soldier.unitId)?.name || 'قيادة اللواء';

  // Calculate days count for selected month/year
  const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();

  // Generate days array [1..daysInMonth]
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to format date string YYYY-MM-DD
  const getDateStr = (dayNum: number) => {
    const dayPadded = String(dayNum).padStart(2, '0');
    return `${selectedYear}-${selectedMonth}-${dayPadded}`;
  };

  // Helper to get day name in Arabic (e.g. الأحد, الإثنين)
  const getDayNameInArabic = (dayNum: number) => {
    try {
      const dateObj = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, dayNum);
      return dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  // Build daily data for the selected month
  const monthlyData = daysList.map(dayNum => {
    const dateStr = getDateStr(dayNum);
    const dayName = getDayNameInArabic(dayNum);
    const record = attendance.find(a => a.soldierId === soldier.id && a.date === dateStr);
    const rawCode = record ? record.statusCode : null;
    const normCode = record ? normalizeStatusCode(record.statusCode) : 'unrecorded';

    const isSick = normCode === 'ع' || (rawCode as string) === 'مريض' || (rawCode as string) === 'طبي' || (rawCode as string) === 'ط';

    return {
      dayNum,
      dateStr,
      dayName,
      record,
      rawCode,
      normCode,
      isSick,
    };
  });

  // Calculate Monthly Statistics
  const presentCount = monthlyData.filter(d => d.normCode === 'ح').length;
  const dutyCount = monthlyData.filter(d => d.normCode === 'م').length;
  const leaveCount = monthlyData.filter(d => d.normCode === 'إ').length;
  const sickCount = monthlyData.filter(d => d.isSick).length;
  const absentCount = monthlyData.filter(d => d.normCode === 'غ').length;
  const unrecordedCount = monthlyData.filter(d => d.normCode === 'unrecorded').length;

  // Sick days specific list
  const sickDaysList = monthlyData.filter(d => d.isSick);

  // Filtered list according to tab/filter mode
  const displayedDays = filterMode === 'sick_only' ? sickDaysList : monthlyData;

  // Month navigation handlers
  const handlePrevMonth = () => {
    let m = parseInt(selectedMonth) - 1;
    let y = parseInt(selectedYear);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleNextMonth = () => {
    let m = parseInt(selectedMonth) + 1;
    let y = parseInt(selectedYear);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  // Change status handler
  const handleChangeStatus = (dateStr: string, newCode: AttendanceStatusCode) => {
    if (onSaveAttendanceBatch) {
      onSaveAttendanceBatch([soldier.id], [dateStr], newCode);
    }
  };

  const selectedMonthName = MONTHS_LIST.find(m => m.value === selectedMonth)?.name || `شهر ${selectedMonth}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="w-[96vw] max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl relative text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* Mobile pull indicator */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-bold">
                  {soldier.rank}
                </span>
                <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                  {soldier.fullName}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-3">
                <span>الرقم العسكري: {soldier.militaryNumber}</span>
                <span>•</span>
                <span className="text-slate-300 font-sans">{unitName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 px-4 rounded-2xl bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/80 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all shadow-md shrink-0"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
            <span>إغلاق النافذة</span>
          </button>
        </div>

        {/* Modal Controls & Filters */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700"
                title="الشهر السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {MONTHS_LIST.map(m => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {YEARS_LIST.map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700"
                title="الشهر التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>كافة أجزاء الشهر ({daysInMonth} يوم)</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('sick_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'sick_only'
                    ? 'bg-rose-500 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                <span>الأيام المرضية فقط ({sickCount})</span>
              </button>
            </div>

          </div>

          {/* Monthly KPI Counters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">أيام الشهر</span>
              <span className="text-sm font-black text-slate-100 font-mono mt-0.5 block">{daysInMonth}</span>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-emerald-400 block font-bold">حاضر (ح)</span>
              <span className="text-sm font-black text-emerald-300 font-mono mt-0.5 block">{presentCount}</span>
            </div>

            <div className="bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-purple-400 block font-bold">مهمة/ميدان (م)</span>
              <span className="text-sm font-black text-purple-300 font-mono mt-0.5 block">{dutyCount}</span>
            </div>

            <div className="bg-blue-950/40 border border-blue-500/30 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-blue-400 block font-bold">إجازة (إ)</span>
              <span className="text-sm font-black text-blue-300 font-mono mt-0.5 block">{leaveCount}</span>
            </div>

            <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl text-center relative overflow-hidden">
              <span className="text-[10px] text-amber-400 block font-bold flex items-center justify-center gap-1">
                <Stethoscope className="w-3 h-3 text-amber-400" />
                <span>مريض / عذر (ع)</span>
              </span>
              <span className="text-sm font-black text-amber-300 font-mono mt-0.5 block">{sickCount}</span>
            </div>

            <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-rose-400 block font-bold">غائب (غ)</span>
              <span className="text-sm font-black text-rose-300 font-mono mt-0.5 block">{absentCount}</span>
            </div>
          </div>
        </div>

        {/* Dedicated Sick / Medical Days Highlight Box */}
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-b border-amber-500/20 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <span>سجل الحالات والأيام المرضية والأعذار الطبية ({selectedMonthName} {selectedYear})</span>
                </h4>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                  إجمالي {sickCount} يوم مرض
                </span>
              </div>

              {sickDaysList.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 max-h-[80px] overflow-y-auto pl-1">
                  {sickDaysList.map(item => (
                    <div 
                      key={item.dateStr}
                      className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="font-mono">{item.dateStr}</span>
                      <span className="text-[10px] text-amber-400">({item.dayName})</span>
                      <span className="text-[10px] bg-amber-500/30 text-amber-100 px-1.5 py-0.2 rounded font-black">مريض</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  لا توجد أي أيام مرضية أو أعذار طبية مسجلة للفرد خلال شهر {selectedMonthName} {selectedYear}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Days Table Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {displayedDays.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-2">
              <Stethoscope className="w-8 h-8 text-slate-600 mx-auto" />
              <p>لا توجد أي أيام مطابقة للتصفية المحددة في هذا الشهر.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner">
              <table className="w-full text-right text-xs font-sans">
                <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">التاريخ واليوم</th>
                    <th className="p-3 text-center">حالة التحضير</th>
                    <th className="p-3 text-center">تحديث الحالة السريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/80">
                  {displayedDays.map(item => {
                    const { dayNum, dateStr, dayName, normCode, isSick } = item;

                    // Row styling based on status
                    let rowBg = 'hover:bg-slate-900/60 transition-colors';
                    if (isSick) {
                      rowBg = 'bg-amber-950/20 hover:bg-amber-950/30 border-r-4 border-r-amber-500 transition-colors';
                    } else if (normCode === 'غ') {
                      rowBg = 'bg-rose-950/15 hover:bg-rose-950/25 border-r-4 border-r-rose-500 transition-colors';
                    } else if (normCode === 'م') {
                      rowBg = 'bg-purple-950/15 hover:bg-purple-950/25 transition-colors';
                    } else if (normCode === 'إ') {
                      rowBg = 'bg-blue-950/15 hover:bg-blue-950/25 transition-colors';
                    }

                    return (
                      <tr key={dateStr} className={rowBg}>
                        {/* Date & Day */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              {String(dayNum).padStart(2, '0')}
                            </span>
                            <div>
                              <span className="font-mono font-bold text-slate-200 block text-xs">{dateStr}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{dayName}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center">
                          {isSick ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                              <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                              <span>مريض / عذر طبي (ع)</span>
                            </span>
                          ) : normCode === 'ح' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>حاضر بالخدمة (ح)</span>
                            </span>
                          ) : normCode === 'م' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-full text-xs font-black">
                              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                              <span>مهمة ميدانية (م)</span>
                            </span>
                          ) : normCode === 'إ' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-full text-xs font-black">
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              <span>إجازة رسمية (إ)</span>
                            </span>
                          ) : normCode === 'غ' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-black">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>غائب بدون عذر (غ)</span>
                            </span>
                          ) : normCode === 'ن' ? (
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full text-xs font-black">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>مناوب (ن)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                              <span>غير مسجل (ح)</span>
                            </span>
                          )}
                        </td>

                        {/* Quick Interactive Actions to update status */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleChangeStatus(dateStr, 'ح')}
                              className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                                normCode === 'ح' && !isSick
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-emerald-300'
                              }`}
                              title="تسجيل حاضر"
                            >
                              ح
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeStatus(dateStr, 'م')}
                              className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                                normCode === 'م'
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-purple-300'
                              }`}
                              title="تسجيل مهمة"
                            >
                              م
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeStatus(dateStr, 'إ')}
                              className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                                normCode === 'إ'
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-blue-300'
                              }`}
                              title="تسجيل إجازة"
                            >
                              إ
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeStatus(dateStr, 'ع')}
                              className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                                isSick
                                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-amber-500/20 hover:text-amber-300'
                              }`}
                              title="تسجيل مريض / عذر طبي"
                            >
                              ع (مريض)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeStatus(dateStr, 'غ')}
                              className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                                normCode === 'غ'
                                  ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-rose-300'
                              }`}
                              title="تسجيل غائب"
                            >
                              غ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>نظام التدقيق الفوري لحضور جاهزية القوة الموحدة</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all cursor-pointer border border-slate-700 min-h-[48px]"
          >
            إغلاق الكشف ✕
          </button>
        </div>

      </div>
    </div>
  );
};

export default SoldierMonthlyAttendanceModal;
