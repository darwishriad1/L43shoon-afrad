import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Mail, 
  Clock, 
  Award,
  Sparkles,
  ChevronDown,
  RefreshCw,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  Building2
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { createReportSpreadsheet } from '../lib/sheets';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface ReportsProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  googleAccessToken: string | null;
  onSetGoogleAccessToken: (token: string | null) => void;
}

const MONTHS_LIST = [
  { value: '01', name: 'يناير (رجب)', short: 'يناير' },
  { value: '02', name: 'فبراير (شعبان)', short: 'فبراير' },
  { value: '03', name: 'مارس (رمضان)', short: 'مارس' },
  { value: '04', name: 'أبريل (شوال)', short: 'أبريل' },
  { value: '05', name: 'مايو (ذو القعدة)', short: 'مايو' },
  { value: '06', name: 'يونيو (ذو الحجة)', short: 'يونيو' },
  { value: '07', name: 'يوليو (محرم)', short: 'يوليو' },
  { value: '08', name: 'أغسطس (صفر)', short: 'أغسطس' },
  { value: '09', name: 'سبتمبر (ربيع الأول)', short: 'سبتمبر' },
  { value: '10', name: 'أكتوبر (ربيع الثاني)', short: 'أكتوبر' },
  { value: '11', name: 'نوفمبر (جمادى الأولى)', short: 'نوفمبر' },
  { value: '12', name: 'ديسمبر (جمادى الآخرة)', short: 'ديسمبر' },
];

export default function Reports({ 
  units, 
  soldiers, 
  attendance, 
  currentUser,
  googleAccessToken, 
  onSetGoogleAccessToken 
}: ReportsProps) {
  // Unit restriction logic
  const isRestrictedUser = useMemo(() => {
    return currentUser && currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
  }, [currentUser]);

  const allowedUnits = useMemo(() => {
    if (isRestrictedUser && currentUser?.unitId) {
      return units.filter(u => u.id === currentUser.unitId);
    }
    return units;
  }, [units, isRestrictedUser, currentUser]);

  // Unique registered dates list
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(attendance.map(a => a.date))).sort().reverse();
    return dates.length > 0 ? dates : ['2026-07-16', '2026-07-15', '2026-07-14'];
  }, [attendance]);

  // Filter States
  const [reportMode, setReportMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(availableDates[0] || '2026-07-16');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-16');
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState<string>('07');
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<string>('2026');

  const [selectedUnitId, setSelectedUnitId] = useState(isRestrictedUser && currentUser?.unitId ? currentUser.unitId : 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Print Layout Toggle
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Email Scheduler States
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [isScheduled, setIsScheduled] = useState(false);

  // Google Sheets Export States
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState('');

  // Virtual Scrolling States and Refs for smooth rendering of thousands of reports
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);
  const [mobileScrollTop, setMobileScrollTop] = useState(0);
  const desktopContainerRef = React.useRef<HTMLDivElement>(null);
  const mobileContainerRef = React.useRef<HTMLDivElement>(null);

  // Reset virtual scroll offsets to top whenever filter criteria change
  React.useEffect(() => {
    setDesktopScrollTop(0);
    setMobileScrollTop(0);
    if (desktopContainerRef.current) desktopContainerRef.current.scrollTop = 0;
    if (mobileContainerRef.current) mobileContainerRef.current.scrollTop = 0;
  }, [reportMode, selectedDailyDate, startDate, endDate, selectedMonthlyMonth, selectedMonthlyYear, selectedUnitId, selectedStatus]);

  // Status mapping
  const statusLabels: Record<AttendanceStatusCode, string> = {
    'ح': 'حضور',
    'غ': 'غياب',
    'إ': 'إجازة',
    'م': 'مهمة عسكرية',
    'ع': 'بعذر رسمي',
    'ن': 'نصف يوم'
  };

  const statusColors: Record<AttendanceStatusCode, string> = {
    'ح': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'غ': 'bg-red-55 text-red-700 border-red-100',
    'إ': 'bg-blue-50 text-blue-700 border-blue-100',
    'م': 'bg-purple-50 text-purple-700 border-purple-100',
    'ع': 'bg-amber-50 text-amber-700 border-amber-100',
    'ن': 'bg-slate-50 text-slate-700 border-slate-100'
  };

  // Filtered attendance data based on reportMode
  const filteredRecords = useMemo(() => {
    return attendance.filter(record => {
      if (reportMode === 'daily') {
        // Daily matching
        if (selectedDailyDate) {
          if (record.date !== selectedDailyDate) return false;
        } else {
          if (record.date < startDate || record.date > endDate) return false;
        }
      } else {
        // Monthly matching (YYYY-MM)
        const monthPrefix = `${selectedMonthlyYear}-${selectedMonthlyMonth}`;
        if (!record.date.startsWith(monthPrefix)) return false;
      }

      // Find soldier details
      const soldier = soldiers.find(s => s.id === record.soldierId);
      if (!soldier || !soldier.isActive) return false;

      // Restricted user check
      if (isRestrictedUser && currentUser?.unitId && soldier.unitId !== currentUser.unitId) return false;

      // Unit match
      const effectiveUnitFilter = isRestrictedUser && currentUser?.unitId ? currentUser.unitId : selectedUnitId;
      if (effectiveUnitFilter !== 'all' && soldier.unitId !== effectiveUnitFilter) return false;

      // Status match
      if (selectedStatus !== 'all' && record.statusCode !== selectedStatus) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)); // descending dates
  }, [attendance, soldiers, reportMode, selectedDailyDate, startDate, endDate, selectedMonthlyMonth, selectedMonthlyYear, selectedUnitId, selectedStatus, isRestrictedUser, currentUser]);

  // Statistical calculations on filtered data
  const reportStats = useMemo(() => {
    const total = filteredRecords.length;
    const counts = { 'ح': 0, 'غ': 0, 'إ': 0, 'م': 0, 'ع': 0, 'ن': 0 };

    filteredRecords.forEach(r => {
      if (counts[r.statusCode] !== undefined) {
        counts[r.statusCode]++;
      }
    });

    const presentWeight = counts['ح'] + counts['ن'] * 0.5;
    const attendancePercentage = total > 0 ? Math.round((presentWeight / total) * 100) : 100;

    const uniqueDays = new Set(filteredRecords.map(r => r.date)).size;

    return {
      total,
      counts,
      attendancePercentage,
      uniqueDays
    };
  }, [filteredRecords]);

  // Selected Month name for display
  const selectedMonthObj = useMemo(() => {
    return MONTHS_LIST.find(m => m.value === selectedMonthlyMonth) || MONTHS_LIST[6];
  }, [selectedMonthlyMonth]);

  // ---- CSV & EXCEL DOWNLOAD SIMULATION ----
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('لا توجد بيانات لتصديرها! يرجى تعديل خيارات الفلترة.');
      return;
    }

    // CSV header in Arabic (with Excel-friendly UTF-8 BOM)
    let csvContent = '\uFEFF';
    csvContent += 'التاريخ,الرقم العسكري,الاسم الكامل,الرتبة,الوحدة العسكرية,الحالة,رمز الحالة\n';

    filteredRecords.forEach(r => {
      const soldier = soldiers.find(s => s.id === r.soldierId);
      const unitName = units.find(u => u.id === soldier?.unitId)?.name || 'غير معروف';
      
      csvContent += `${r.date},${soldier?.militaryNumber || ''},"${soldier?.fullName || ''}",${soldier?.rank || ''},"${unitName}",${statusLabels[r.statusCode]},${r.statusCode}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_التحضير_العسكري_${startDate}_إلى_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    // Excel simulation: we write an HTML table representing XLS so MS Excel opens it perfectly
    if (filteredRecords.length === 0) {
      alert('لا توجد بيانات لتصديرها!');
      return;
    }

    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; direction: rtl; }
          th { background-color: #0f766e; color: #ffffff; border: 1px solid #cccccc; padding: 8px; }
          td { border: 1px solid #cccccc; padding: 8px; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #0f766e; }
        </style>
      </head>
      <body>
        <div class="title">كشف الجاهزية والتحضير العسكري للقوة</div>
        <p>الفترة الزمنية: من ${startDate} إلى ${endDate}</p>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الرقم العسكري</th>
              <th>الاسم الكامل</th>
              <th>الرتبة</th>
              <th>الوحدة العسكرية</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRecords.forEach(r => {
      const soldier = soldiers.find(s => s.id === r.soldierId);
      const unitName = units.find(u => u.id === soldier?.unitId)?.name || 'غير معروف';
      excelTemplate += `
        <tr>
          <td>${r.date}</td>
          <td>${soldier?.militaryNumber || ''}</td>
          <td>${soldier?.fullName || ''}</td>
          <td>${soldier?.rank || ''}</td>
          <td>${unitName}</td>
          <td>${statusLabels[r.statusCode]}</td>
        </tr>
      `;
    });

    excelTemplate += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_الجاهزية_اليومي_${startDate}_إلى_${endDate}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- GOOGLE SHEETS EXPORT REAL INTEGRATION ----
  const handleConnectSheets = async () => {
    try {
      setIsExportingSheets(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        onSetGoogleAccessToken(credential.accessToken);
        alert('تم ربط حساب Google بنجاح! يمكنك الآن التصدير المباشر لجداول البيانات.');
        return credential.accessToken;
      } else {
        alert('فشل الحصول على رمز الوصول من حساب Google.');
      }
    } catch (err: any) {
      console.error('Failed to authorize Google Sheets:', err);
      alert(`خطأ في التفويض: ${err.message || 'يرجى المحاولة مجدداً.'}`);
    } finally {
      setIsExportingSheets(false);
    }
    return null;
  };

  const handleExportToGoogleSheets = async () => {
    if (filteredRecords.length === 0) {
      alert('لا توجد بيانات لتصديرها! يرجى تعديل شروط الفلترة لتعثر على سجلات.');
      return;
    }

    let activeToken = googleAccessToken;
    if (!activeToken) {
      const confirmed = window.confirm('لتصدير التقرير مباشرة إلى Google Sheets، يرجى ربط وتفويض حساب Google الخاص بك بشكل آمن أولاً.\nهل تريد المتابعة للربط والترخيص؟');
      if (!confirmed) return;
      activeToken = await handleConnectSheets();
      if (!activeToken) return;
    }

    try {
      setIsExportingSheets(true);
      const title = `تقرير_الجاهزية_العسكري_${startDate}_إلى_${endDate}`;
      const activeUnitName = selectedUnitId === 'all' ? 'جميع الوحدات' : units.find(u => u.id === selectedUnitId)?.name || 'غير معروف';

      const sheet = await createReportSpreadsheet(activeToken, title, {
        startDate,
        endDate,
        unitName: activeUnitName,
        reportStats,
        filteredRecords,
        soldiers,
        units
      });

      setExportedSheetUrl(sheet.url);
      alert(`تم بنجاح تصدير التقرير المنسق لـ Google Sheets في حسابك!\nالمعرف: ${sheet.id}`);
    } catch (err: any) {
      console.error('Failed to export report to Google Sheets:', err);
      alert(`فشل تصدير التقرير لـ Google Sheets:\n${err.message || 'يرجى التحقق من اتصالك والمحاولة لاحقاً.'}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  // ---- EMAIL SCHEDULER SUBMIT ----
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleEmail) return;

    setIsScheduled(true);
    setTimeout(() => {
      setIsScheduled(false);
      setScheduleEmail('');
      alert(`تمت جدولة التقارير الدورية بنجاح! سيتم إرسال تقرير (${scheduleFrequency === 'weekly' ? 'أسبوعي' : 'شهري'}) شامل تلقائياً إلى: ${scheduleEmail}`);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-800 font-sans">قسم التقارير والتحليلات المتقدمة</h1>
        <p className="text-slate-500 mt-1 text-sm">
          استخراج كشوف الحضور التاريخية، إحصاءات الجاهزية الدورية، وجدولة التقارير لقيادة اللواء.
        </p>
      </div>

      {/* Advanced Filter Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-800" />
            <h4 className="text-md font-bold text-slate-800">محدد نوع ونطاق التقرير</h4>
          </div>

          {/* Daily vs Monthly Mode Switcher Bar */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setReportMode('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'daily'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>📅 تقرير يومي (تحديد اليوم)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'monthly'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>🗓️ تقرير شهري (تحديد الشهر)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on reportMode */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {reportMode === 'daily' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ اليوم المحدد</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">أيام الأرشيف المحفوظة</label>
                <select
                  value={selectedDailyDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الشهر المستهدف</label>
                <select
                  value={selectedMonthlyMonth}
                  onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {MONTHS_LIST.map(m => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">السنة</label>
                <select
                  value={selectedMonthlyYear}
                  onChange={(e) => setSelectedMonthlyYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                >
                  <option value="2026">٢٠٢٦ م (١٤٤٨ هـ)</option>
                  <option value="2025">٢٠٢٥ م (١٤٤٧ هـ)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة العسكرية التابعة</label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {!isRestrictedUser && <option value="all">كل الوحدات</option>}
              {allowedUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">الحالة أو الرمز المستهدف</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="all">كافة الحالات (ح، غ، إ، م، ع، ن)</option>
              <option value="ح">حضور فقط (ح)</option>
              <option value="غ">غياب غير مبرر (غ)</option>
              <option value="إ">إجازة رسمية (إ)</option>
              <option value="م">مهمة عسكرية (م)</option>
              <option value="ع">بعذر مقبول (ع)</option>
              <option value="ن">نصف يوم (ن)</option>
            </select>
          </div>
        </div>

        {/* Exporter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            تم العثور على <span className="font-bold text-slate-800 font-mono text-sm">{filteredRecords.length}</span> سجل يطابق خياراتك الحالية.
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-97"
            >
              <Printer className="w-4 h-4 text-slate-550" />
              معاينة للطباعة (PDF)
            </button>

            <button
              onClick={handleExportToGoogleSheets}
              disabled={isExportingSheets}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-97"
            >
              {isExportingSheets ? (
                <RefreshCw className="w-4 h-4 animate-spin text-teal-200" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-350" />
              )}
              {googleAccessToken ? 'تصدير Google Sheets' : 'ربط وتصدير لـ Google Sheets'}
            </button>

            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-97"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              تصدير لملف Excel
            </button>

            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 bg-slate-150 hover:bg-slate-200 text-slate-850 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-97"
            >
              <Download className="w-4 h-4 text-slate-600" />
              تصدير CSV
            </button>
          </div>
        </div>

        {exportedSheetUrl && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-emerald-900">تم تصدير تقرير التصفية بنجاح إلى جدول البيانات:</span>
            </div>
            <a
              href={exportedSheetUrl}
              target="_blank"
              referrerPolicy="no-referrer"
              className="text-blue-600 font-extrabold underline hover:text-blue-800 break-all"
            >
              فتح الجدول في صفحة جديدة ↗
            </a>
          </div>
        )}
      </div>

      {/* Main Results Table & Side Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
          <h4 className="text-md font-bold text-slate-800">بيانات الكشف التفصيلي للفترة الزمنية المحددة</h4>
          
          {/* Results List - Desktop Only */}
          <div 
            ref={desktopContainerRef}
            onScroll={(e) => setDesktopScrollTop(e.currentTarget.scrollTop)}
            className="hidden lg:block overflow-auto rounded-xl border border-slate-150 max-h-[600px] relative scroll-smooth"
          >
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-150 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-center w-24">التاريخ</th>
                  <th className="py-2.5 px-3 font-semibold">الاسم والرتبة</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-20">الرقم العسكري</th>
                  <th className="py-2.5 px-3 font-semibold">الوحدة التابع لها</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">حالة التحضير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      لا توجد سجلات مطابقة لهذه الفترة أو الفلترة. يرجى تجربة تواريخ أخرى.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const desktopItemHeight = 52; // Height of each row in the reports table
                    const desktopStartIndex = Math.max(0, Math.floor(desktopScrollTop / desktopItemHeight) - 8);
                    const desktopEndIndex = Math.min(filteredRecords.length, Math.ceil((desktopScrollTop + 600) / desktopItemHeight) + 8);
                    
                    const paddingTop = desktopStartIndex * desktopItemHeight;
                    const paddingBottom = Math.max(0, (filteredRecords.length - desktopEndIndex) * desktopItemHeight);
                    
                    const visibleRecords = filteredRecords.slice(desktopStartIndex, desktopEndIndex);
                    
                    return (
                      <>
                        {paddingTop > 0 && (
                          <tr>
                            <td style={{ height: `${paddingTop}px`, padding: 0 }} colSpan={5} />
                          </tr>
                        )}
                        {visibleRecords.map(record => {
                          const soldier = soldiers.find(s => s.id === record.soldierId);
                          const unitName = units.find(u => u.id === soldier?.unitId)?.name || 'غير معروف';

                          return (
                            <tr key={record.id} className="hover:bg-slate-50/50 h-[52px]">
                              <td className="py-3 px-3 font-mono font-bold text-center text-slate-500">{record.date}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">
                                <span className="text-slate-400 font-sans text-[10px] block font-normal">{soldier?.rank}</span>
                                {soldier?.fullName}
                              </td>
                              <td className="py-3 px-3 font-mono text-center font-bold text-slate-700">{soldier?.militaryNumber}</td>
                              <td className="py-3 px-3 text-slate-600 truncate max-w-32">{unitName}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border ${statusColors[record.statusCode]}`}>
                                  {statusLabels[record.statusCode]} ({record.statusCode})
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {paddingBottom > 0 && (
                          <tr>
                            <td style={{ height: `${paddingBottom}px`, padding: 0 }} colSpan={5} />
                          </tr>
                        )}
                      </>
                    );
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Results List - Mobile Only */}
          <div 
            ref={mobileContainerRef}
            onScroll={(e) => setMobileScrollTop(e.currentTarget.scrollTop)}
            className="block lg:hidden overflow-auto max-h-[500px] relative space-y-4 pr-1 scroll-smooth"
          >
            {filteredRecords.length === 0 ? (
              <div className="bg-white p-8 text-center text-slate-400 rounded-xl border border-slate-150 italic text-sm">
                لا توجد سجلات مطابقة لهذه الفترة أو الفلترة. يرجى تجربة تواريخ أخرى.
              </div>
            ) : (
              (() => {
                const mobileItemHeight = 110; // Height of each mobile card including the gap
                const mobileStartIndex = Math.max(0, Math.floor(mobileScrollTop / mobileItemHeight) - 6);
                const mobileEndIndex = Math.min(filteredRecords.length, Math.ceil((mobileScrollTop + 500) / mobileItemHeight) + 6);
                
                const paddingTop = mobileStartIndex * mobileItemHeight;
                const paddingBottom = Math.max(0, (filteredRecords.length - mobileEndIndex) * mobileItemHeight);
                
                const visibleRecords = filteredRecords.slice(mobileStartIndex, mobileEndIndex);
                
                return (
                  <div style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }} className="space-y-4">
                    {visibleRecords.map(record => {
                      const soldier = soldiers.find(s => s.id === record.soldierId);
                      const unitName = units.find(u => u.id === soldier?.unitId)?.name || 'غير معروف';

                      return (
                        <div key={record.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-right h-[94px] flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-slate-400 font-sans block leading-none">{soldier?.rank}</span>
                              <h5 className="font-bold text-xs text-slate-800 font-sans line-clamp-1 mt-0.5">{soldier?.fullName}</h5>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5 leading-none">الرقم العسكري: {soldier?.militaryNumber}</p>
                            </div>
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-md border ${statusColors[record.statusCode]}`}>
                              {statusLabels[record.statusCode]} ({record.statusCode})
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 text-slate-500">
                            <span className="font-sans truncate max-w-[120px]">الوحدة: {unitName}</span>
                            <span className="font-mono font-bold text-slate-700">{record.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
          {filteredRecords.length > 0 && (
            <p className="text-[11px] text-slate-400/80 italic text-center font-sans font-medium">تم تطبيق التصفح الافتراضي السلس لعرض كافة البيانات المتاحة ({filteredRecords.length} سجل) بأقصى سرعة وأقل استهلاك للذاكرة.</p>
          )}
        </div>

        {/* Statistical Summary Sidebar */}
        <div className="space-y-6">
          {/* Readiness Gauge Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h4 className="text-md font-bold text-slate-800 pb-2 border-b border-slate-100">معدل الجاهزية للفترة</h4>

            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-700"
                    strokeDasharray={`${reportStats.attendancePercentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold font-mono text-slate-800">{reportStats.attendancePercentage}%</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-sans text-center">نسبة حضور القوة البشرية للفترة المحددة</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالات الحضور (ح)</span>
                <span className="font-bold text-slate-700 font-mono">{reportStats.counts['ح']} يوم</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالات الغياب غير المبرر (غ)</span>
                <span className="font-bold text-red-600 font-mono">{reportStats.counts['غ']} يوم</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالات الإجازات الرسمية (إ)</span>
                <span className="font-bold text-blue-600 font-mono">{reportStats.counts['إ']} يوم</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالات المهام العسكرية (م)</span>
                <span className="font-bold text-purple-600 font-mono">{reportStats.counts['م']} يوم</span>
              </div>
            </div>
          </div>

          {/* Report Scheduler (Simulated) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Mail className="w-5 h-5 text-teal-800" />
              <h4 className="text-md font-bold text-slate-800">جدولة تقارير الجاهزية الآلية</h4>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              يمكنك جدولة إرسال هذا التقرير مصفى تلقائياً إلى بريد قائد اللواء أو قائد التشكيل بصفة دورية منتظمة.
            </p>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">البريد الإلكتروني للقيادة</label>
                <input 
                  type="email"
                  required
                  placeholder="commander@force.gov.sa"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">دورية الإرسال</label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                  >
                    <option value="weekly">أسبوعياً (كل خميس)</option>
                    <option value="monthly">شهرياً (يوم 30)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">صيغة الملف</label>
                  <div className="bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-lg p-1.5 text-center text-xs">
                    ملف PDF معتمد
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1 bg-teal-800 hover:bg-teal-900 text-white font-bold py-2 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                تثبيت جدول التقارير
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ---- IMMERSIVE MILITARY PRINT PREVIEW MODAL ---- */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl p-8 shadow-2xl border border-slate-200 my-8 text-slate-900 text-right font-sans relative" id="report-print-container">
            
            {/* Modal Actions */}
            <div className="absolute top-4 left-4 flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
              <button
                onClick={() => downloadElementAsPdf('report-print-container', `تقرير_جاهزية_${reportMode}_${selectedDailyDate}`)}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تحميل PDF
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>

            {/* Interactive Control Bar inside Print Preview Modal (hidden during printing) */}
            <div className="mb-6 bg-slate-900 text-white p-4 rounded-xl border border-slate-700 no-print space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>التحكم في التقرير المعروض بالنافذة المبثقة:</span>
                </span>
                <span className="text-[10px] text-slate-400">يمكنك التبديل بين التقرير اليومي والشهري وتحديد التواريخ من هنا مباشرة</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReportMode('daily')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                      reportMode === 'daily'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4 text-emerald-300" />
                    <span>📅 تقرير يومي (تحديد اليوم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportMode('monthly')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                      reportMode === 'monthly'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 text-blue-300" />
                    <span>🗓️ تقرير شهري (تحديد الشهر)</span>
                  </button>
                </div>

                {reportMode === 'daily' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-slate-300">اليوم المحدد:</span>
                    <input
                      type="date"
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    />
                    <select
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-slate-300 font-mono text-xs focus:outline-none cursor-pointer"
                    >
                      {availableDates.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-slate-300">الشهر:</span>
                    <select
                      value={selectedMonthlyMonth}
                      onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                    <span className="font-extrabold text-slate-300">السنة:</span>
                    <select
                      value={selectedMonthlyYear}
                      onChange={(e) => setSelectedMonthlyYear(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-slate-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="2026">٢٠٢٦ م</option>
                      <option value="2025">٢٠٢٥ م</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Print Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
              <div className="space-y-1">
                <p className="font-bold text-sm">وزارة الدفاع والسيطرة</p>
                <p className="font-bold text-xs text-slate-600">قيادة المنطقة العسكرية واللواء</p>
                <p className="text-[11px] text-slate-500">الرقم المرجعي: ق/أ/705-{reportMode.toUpperCase()}</p>
              </div>

              <div className="text-center space-y-1">
                {/* Emblem Simulation */}
                <div className="w-12 h-12 bg-teal-850 text-white rounded-full mx-auto flex items-center justify-center font-bold text-sm border-2 border-slate-900 shadow-sm">
                  ★
                </div>
                <h2 className="text-lg font-bold font-sans tracking-wide mt-2">
                  {reportMode === 'daily' ? `سجل كشف الحضور والتحضير اليومي (${selectedDailyDate})` : `كشف كفاية وجاهزية الانضباط الشهري (${selectedMonthObj.name} ${selectedMonthlyYear})`}
                </h2>
                <p className="text-xs text-slate-500">مستند قيادي سري وموثق للغاية</p>
              </div>

              <div className="text-left text-xs space-y-1">
                <p>نوع الكشف: <span className="font-bold font-mono text-emerald-800">{reportMode === 'daily' ? 'تقرير يومي موثق' : 'تقرير إحصائي شهري'}</span></p>
                <p>النطاق المحدد: <span className="font-bold font-mono">{reportMode === 'daily' ? selectedDailyDate : `${selectedMonthObj.name} ${selectedMonthlyYear}`}</span></p>
              </div>
            </div>

            {/* General Metadata Info on Print */}
            <div className="grid grid-cols-3 gap-4 py-4 bg-slate-50 rounded-lg my-4 text-xs">
              <div className="pr-4">
                <span className="text-slate-500">الوحدة العسكرية المستهدفة:</span>
                <span className="font-bold text-slate-800 mr-2">
                  {selectedUnitId === 'all' ? 'جميع الوحدات التابعة للواء' : units.find(u => u.id === selectedUnitId)?.name}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-500">إجمالي السجلات المطبوعة:</span>
                <span className="font-bold text-slate-800 font-mono mr-2">{filteredRecords.length} سجل تحضير</span>
              </div>
              <div className="text-left pl-4">
                <span className="text-slate-500">معدل جاهزية القوة الموثقة:</span>
                <span className="font-bold text-emerald-800 mr-2">{reportStats.attendancePercentage}% ممتاز</span>
              </div>
            </div>

            {/* Print Data Table */}
            <table className="w-full text-sm border-collapse border border-slate-900 mt-4 text-right">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900">
                  <th className="border border-slate-900 p-2 font-bold w-24 text-center">التاريخ</th>
                  <th className="border border-slate-900 p-2 font-bold w-28 text-center">الرقم العسكري</th>
                  <th className="border border-slate-900 p-2 font-bold">الاسم الكامل للعسكري</th>
                  <th className="border border-slate-900 p-2 font-bold w-24 text-center">الرتبة</th>
                  <th className="border border-slate-900 p-2 font-bold">الوحدة العسكرية</th>
                  <th className="border border-slate-900 p-2 font-bold w-28 text-center">حالة التحضير المعتمدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {filteredRecords.slice(0, 30).map((record, idx) => {
                  const soldier = soldiers.find(s => s.id === record.soldierId);
                  const unitName = units.find(u => u.id === soldier?.unitId)?.name || '';
                  return (
                    <tr key={record.id} className="text-xs">
                      <td className="border border-slate-900 p-2 text-center font-mono">{record.date}</td>
                      <td className="border border-slate-900 p-2 text-center font-mono">{soldier?.militaryNumber}</td>
                      <td className="border border-slate-900 p-2 font-bold">{soldier?.fullName}</td>
                      <td className="border border-slate-900 p-2 text-center">{soldier?.rank}</td>
                      <td className="border border-slate-900 p-2">{unitName}</td>
                      <td className="border border-slate-900 p-2 text-center font-bold">{statusLabels[record.statusCode]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRecords.length > 30 && (
              <p className="text-[10px] text-slate-400 italic mt-2 text-center">تنويه: تم قطع العرض عند أول 30 سجلاً في الطباعة لتفادي تجزئة الأوراق.</p>
            )}

            {/* Military Signature Fields (Very Executive) */}
            <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-350 text-xs">
              <div className="text-right pr-8 space-y-4">
                <p className="font-bold text-slate-500">ركن التحضير وضابط العمليات المسؤول:</p>
                <div className="h-12 border-b border-dashed border-slate-400 w-48"></div>
                <p className="text-[11px] text-slate-400">الرتبة / الاسم: ......................................................</p>
              </div>

              <div className="text-left pl-8 space-y-4">
                <p className="font-bold text-slate-500">يعتمد قائد اللواء والتشكيل العسكري:</p>
                <div className="h-12 border-b border-dashed border-slate-400 w-48 mr-auto"></div>
                <p className="text-[11px] text-slate-400">الاسم: العميد الركن/ خالد الحربي</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
