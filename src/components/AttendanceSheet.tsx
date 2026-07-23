import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Check, 
  UserPlus, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  ChevronRight, 
  ChevronLeft, 
  CheckSquare, 
  Square,
  Sparkles,
  User,
  Info
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode } from '../types';

interface AttendanceSheetProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser: { id: string; name: string; role: string; unitId: string | null };
  onUpdateAttendance: (soldierId: string, date: string, status: AttendanceStatusCode) => void;
  onBulkUpdateAttendance: (soldierIds: string[], dates: string[], status: AttendanceStatusCode) => void;
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

const STATUS_OPTIONS: { code: AttendanceStatusCode; label: string; colorClass: string; bgClass: string; hoverClass: string }[] = [
  { code: 'ح', label: 'حضور', colorClass: 'text-emerald-700 border-emerald-300', bgClass: 'bg-emerald-100', hoverClass: 'hover:bg-emerald-200' },
  { code: 'غ', label: 'غياب', colorClass: 'text-red-700 border-red-300', bgClass: 'bg-red-100', hoverClass: 'hover:bg-red-200' },
  { code: 'إ', label: 'إجازة', colorClass: 'text-blue-700 border-blue-300', bgClass: 'bg-blue-100', hoverClass: 'hover:bg-blue-200' },
  { code: 'م', label: 'مهمة عسكرية', colorClass: 'text-purple-700 border-purple-300', bgClass: 'bg-purple-100', hoverClass: 'hover:bg-purple-200' },
  { code: 'ع', label: 'بعذر مقبول', colorClass: 'text-amber-700 border-amber-300', bgClass: 'bg-amber-100', hoverClass: 'hover:bg-amber-200' },
  { code: 'ن', label: 'نصف يوم', colorClass: 'text-slate-700 border-slate-300', bgClass: 'bg-slate-100', hoverClass: 'hover:bg-slate-200' },
];

export default function AttendanceSheet({ 
  units, 
  soldiers, 
  attendance, 
  currentUser,
  onUpdateAttendance,
  onBulkUpdateAttendance,
  onAddLog
}: AttendanceSheetProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineBuffer, setOfflineBuffer] = useState<{ soldierId: string; date: string; status: AttendanceStatusCode }[]>([]);
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<string[]>([]);
  
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [mobileActiveDay, setMobileActiveDay] = useState(() => new Date().getDate()); // Default to current day of the month

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);

  // Reset page when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUnitId]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobileMode(window.innerWidth < 1024);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Spreadsheet calendar month setup (July 2026 has 31 days)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // July
  const daysInMonth = 31; // July is 31 days

  const dateList = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    });
  }, [currentYear, currentMonth, daysInMonth]);

  // Restrict unit filtering if current user has restricted unit role (e.g. Unit Commander, Data Writer, or restricted unitId)
  const isRestrictedUser = useMemo(() => {
    return currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
  }, [currentUser]);

  const allowedUnits = useMemo(() => {
    if (isRestrictedUser) {
      const uId = currentUser.unitId;
      return units.filter(u => u.id === uId);
    }
    return units;
  }, [units, isRestrictedUser, currentUser.unitId]);

  // Active unit filter selection (fall back to user's unit if restricted)
  const activeUnitId = useMemo(() => {
    if (isRestrictedUser) {
      return currentUser.unitId || 'all';
    }
    return selectedUnitId;
  }, [selectedUnitId, isRestrictedUser, currentUser.unitId]);

  // Filtered soldiers list
  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      // Must be active
      if (!s.isActive) return false;
      // Restricted user check
      if (isRestrictedUser && currentUser.unitId && s.unitId !== currentUser.unitId) return false;
      // Unit match
      if (activeUnitId !== 'all' && s.unitId !== activeUnitId) return false;
      // Search match
      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = s.fullName.toLowerCase().includes(query);
        const numberMatch = s.militaryNumber.includes(query);
        const rankMatch = s.rank.toLowerCase().includes(query);
        return nameMatch || numberMatch || rankMatch;
      }
      return true;
    });
  }, [soldiers, activeUnitId, searchQuery, isRestrictedUser, currentUser.unitId]);

  // Paginated soldiers list
  const paginatedSoldiers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSoldiers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSoldiers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSoldiers.length / itemsPerPage);

  // Map attendance for fast lookup: { "soldierId_date": statusCode }
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatusCode> = {};
    attendance.forEach(record => {
      map[`${record.soldierId}_${record.date}`] = record.statusCode;
    });
    // Overlay offline buffer changes so UI is immediately responsive in offline mode
    offlineBuffer.forEach(buffer => {
      map[`${buffer.soldierId}_${buffer.date}`] = buffer.status;
    });
    return map;
  }, [attendance, offlineBuffer]);

  // Cell rendering status fetch
  const getCellStatus = (soldierId: string, date: string): AttendanceStatusCode | '' => {
    return attendanceMap[`${soldierId}_${date}`] || '';
  };

  // Change single cell handler
  const handleCellChange = (soldierId: string, date: string, status: AttendanceStatusCode) => {
    // Check write permissions
    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      return;
    }

    if (isOffline) {
      // In offline mode: save to buffer and update UI state
      const newBuffer = [...offlineBuffer];
      const existingIdx = newBuffer.findIndex(b => b.soldierId === soldierId && b.date === date);
      if (existingIdx > -1) {
        newBuffer[existingIdx].status = status;
      } else {
        newBuffer.push({ soldierId, date, status });
      }
      setOfflineBuffer(newBuffer);
    } else {
      // In online mode: perform normal update
      onUpdateAttendance(soldierId, date, status);
    }
  };

  // Toggle soldier selection for batch operations
  const toggleSelectSoldier = (id: string) => {
    setSelectedSoldierIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSoldiers = () => {
    const paginatedIds = paginatedSoldiers.map(s => s.id);
    const allPaginatedSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedSoldierIds.includes(id));
    
    if (allPaginatedSelected) {
      // Unselect only the paginated ones on this page
      setSelectedSoldierIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      // Select all paginated ones on this page
      setSelectedSoldierIds(prev => {
        const union = new Set([...prev, ...paginatedIds]);
        return Array.from(union);
      });
    }
  };

  // Batch apply status to all selected soldiers for a target day
  const [batchDayNum, setBatchDayNum] = useState<number>(16); // Default to current day
  const [batchStatus, setBatchStatus] = useState<AttendanceStatusCode>('ح');

  const handleApplyBatchStatus = () => {
    if (selectedSoldierIds.length === 0) {
      alert('الرجاء اختيار جندي واحد على الأقل من الجدول لتطبيق الإدخال الجماعي.');
      return;
    }
    const targetDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${batchDayNum.toString().padStart(2, '0')}`;

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      selectedSoldierIds.forEach(id => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === id && b.date === targetDate);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = batchStatus;
        } else {
          newBuffer.push({ soldierId: id, date: targetDate, status: batchStatus });
        }
      });
      setOfflineBuffer(newBuffer);
      alert(`تم الحفظ في مخزن عدم الاتصال: تعديل الحضور لـ (${selectedSoldierIds.length}) عسكري ليوم ${batchDayNum} يوليو.`);
    } else {
      onBulkUpdateAttendance(selectedSoldierIds, [targetDate], batchStatus);
      onAddLog(
        'تعديل', 
        'التحضير اليومي', 
        `إدخال جماعي: تسجيل حالة (${batchStatus}) لعدد (${selectedSoldierIds.length}) عسكري ليوم ${targetDate}.`
      );
    }
    setSelectedSoldierIds([]);
  };

  // Row operations (Full Month apply)
  const handleApplyRowStatus = (soldierId: string, status: AttendanceStatusCode) => {
    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      return;
    }

    const confirmAction = window.confirm(`هل أنت متأكد من رغبتك في تطبيق حالة (${status}) على كامل الشهر الحالي لهذا العسكري؟`);
    if (!confirmAction) return;

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      dateList.forEach(date => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === soldierId && b.date === date);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = status;
        } else {
          newBuffer.push({ soldierId, date, status });
        }
      });
      setOfflineBuffer(newBuffer);
    } else {
      onBulkUpdateAttendance([soldierId], dateList, status);
      const sName = soldiers.find(s => s.id === soldierId)?.fullName || '';
      onAddLog(
        'تعديل', 
        'التحضير اليومي', 
        `تعديل صف كامل: تطبيق حالة (${status}) لكافة أيام الشهر للعسكري: ${sName}.`
      );
    }
  };

  // Column operations (Apply to all visible soldiers on a given day)
  const handleApplyColumnStatus = (date: string, status: AttendanceStatusCode) => {
    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      return;
    }

    if (filteredSoldiers.length === 0) return;

    const dayNum = parseInt(date.split('-')[2]);
    const confirmAction = window.confirm(`هل أنت متأكد من تطبيق حالة (${status}) على كافة الجنود المعروضين (${filteredSoldiers.length} عسكري) ليوم ${dayNum} يوليو؟`);
    if (!confirmAction) return;

    const targetSoldierIds = filteredSoldiers.map(s => s.id);

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      targetSoldierIds.forEach(id => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === id && b.date === date);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = status;
        } else {
          newBuffer.push({ soldierId: id, date, status });
        }
      });
      setOfflineBuffer(newBuffer);
    } else {
      onBulkUpdateAttendance(targetSoldierIds, [date], status);
      const unitName = activeUnitId === 'all' ? 'جميع الوحدات' : units.find(u => u.id === activeUnitId)?.name || '';
      onAddLog(
        'تعديل', 
        'التحضير اليومي', 
        `تعديل عمود كامل: تطبيق حالة (${status}) لجميع عسكريي (${unitName}) المعروضين ليوم ${dayNum} يوليو.`
      );
    }
  };

  // Sync Offline Buffer
  const handleSyncOfflineData = () => {
    if (offlineBuffer.length === 0) return;
    
    // Process buffer and update state
    offlineBuffer.forEach(buffer => {
      onUpdateAttendance(buffer.soldierId, buffer.date, buffer.status);
    });

    onAddLog(
      'استيراد', 
      'التحضير اليومي', 
      `مزامنة البيانات من وضع عدم الاتصال: تم إدخال ودمج (${offlineBuffer.length}) سجل حضور مخزن مؤقتاً.`
    );

    setOfflineBuffer([]);
    alert(`تمت مزامنة (${offlineBuffer.length}) تعديل بنجاح مع الخادم الرئيسي!`);
  };

  // Helper styles for codes
  const getCellColorClass = (code: AttendanceStatusCode | '') => {
    switch (code) {
      case 'ح': return 'bg-emerald-500 text-white font-bold hover:bg-emerald-600';
      case 'غ': return 'bg-red-500 text-white font-bold hover:bg-red-600 animate-pulse';
      case 'إ': return 'bg-blue-500 text-white font-bold hover:bg-blue-600';
      case 'م': return 'bg-purple-600 text-white font-bold hover:bg-purple-700';
      case 'ع': return 'bg-amber-500 text-white font-bold hover:bg-amber-600';
      case 'ن': return 'bg-slate-400 text-white font-bold hover:bg-slate-500';
      default: return 'bg-slate-50 text-slate-300 hover:bg-slate-100 border border-dashed border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Title & Connection Simulator Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-sans">كشف التحضير والجاهزية اليومية</h1>
          <p className="text-slate-500 mt-1 text-sm font-sans">
            سجل إدخال شهري تفاعلي شبيه بـ Excel. اختر الرموز المناسبة للحالة اليومية لكل عسكري.
          </p>
        </div>

        {/* Offline Mode Switcher */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <button 
            onClick={() => setIsOffline(!isOffline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isOffline 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-emerald-600 text-white shadow-xs'
            }`}
          >
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {isOffline ? 'وضع غير متصل بالشبكة (مفعل)' : 'متصل بالشبكة'}
          </button>

          {isOffline && offlineBuffer.length > 0 && (
            <button
              onClick={handleSyncOfflineData}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-bounce"
            >
              <RotateCw className="w-3.5 h-3.5" />
              مزامنة ({offlineBuffer.length})
            </button>
          )}
        </div>
      </div>

      {/* Grid Legend & Info */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-6 gap-3">
        {STATUS_OPTIONS.map(opt => (
          <div key={opt.code} className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-150 shadow-2xs">
            <span className={`w-8 h-8 rounded-md flex items-center justify-center font-bold font-mono text-sm ${opt.bgClass} ${opt.colorClass}`}>
              {opt.code}
            </span>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700 font-sans">{opt.label}</p>
              <p className="text-[10px] text-slate-400">الرمز المعياري</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Batch Actions Area */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو الرقم العسكري..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-sans"
              />
            </div>

            {/* Unit Filter - Disabled if restricted to one unit */}
            {currentUser.role !== 'commander_unit' && currentUser.role !== 'data_writer' ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
                >
                  <option value="all">جميع الوحدات</option>
                  {allowedUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-teal-850 font-sans">
                الوحدة المتاحة: {allowedUnits[0]?.name}
              </div>
            )}
          </div>

          {/* Quick Actions Helper info */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-teal-50/50 text-teal-800 p-2 rounded-lg border border-teal-100">
            <Info className="w-4 h-4" />
            <span className="font-sans">اضغط على اسم العسكري لتسجيل حالته لكامل أيام الشهر، أو على رقم اليوم لتسجيل حالة الوحدة كاملة.</span>
          </div>
        </div>

        {/* Batch Operations Bar */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            <div>
              <p className="text-sm font-bold text-slate-800 font-sans">أداة التحضير الجماعي السريع</p>
              <p className="text-xs text-slate-500 font-sans">حدد مجموعة من الجنود ثم قم بتعيين حالتهم دفعة واحدة</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-sans">تطبيق ليوم:</span>
              <select 
                value={batchDayNum}
                onChange={(e) => setBatchDayNum(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
              >
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <option key={i+1} value={i+1}>{i+1} يوليو</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-sans">الحالة المراد تعيينها:</span>
              <select 
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as AttendanceStatusCode)}
                className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-sans font-bold"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.label} ({opt.code})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApplyBatchStatus}
              disabled={selectedSoldierIds.length === 0}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSoldierIds.length > 0 
                  ? 'bg-emerald-700 text-white cursor-pointer hover:bg-emerald-800' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              تطبيق على المحددين ({selectedSoldierIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100 p-3 rounded-2xl border border-slate-200">
        <span className="text-xs font-bold text-slate-700 font-sans mr-1">
          ⚙️ طريقة العرض لكشف التحضير:
        </span>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMobileMode(false)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isMobileMode 
                ? 'bg-slate-800 text-white shadow-md scale-102' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>🖥️</span>
            <span>عرض الجدول الشامل</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMode(true)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isMobileMode 
                ? 'bg-teal-800 text-white shadow-md scale-102' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>📱</span>
            <span>عرض الهواتف المحمولة</span>
          </button>
        </div>
      </div>

      {isMobileMode ? (
        /* Mobile Cards Mode Container */
        <div className="space-y-4">
          {/* Day Selector Ribbon */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="text-sm font-bold text-slate-800">تحضير القوة لليوم المستهدف:</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileActiveDay(prev => Math.max(1, prev - 1))}
                disabled={mobileActiveDay <= 1}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                title="اليوم السابق"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
              
              <div className="flex items-center gap-2">
                <select
                  value={mobileActiveDay}
                  onChange={(e) => setMobileActiveDay(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold font-mono text-slate-800 cursor-pointer"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <option key={i+1} value={i+1}>
                      {i+1} يوليو ٢٠٢٦ م
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setMobileActiveDay(prev => Math.min(daysInMonth, prev + 1))}
                disabled={mobileActiveDay >= daysInMonth}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
                title="اليوم التالي"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <div className="text-[11px] text-teal-800 bg-teal-50 px-3 py-1 rounded-full font-bold">
              تاريخ التحضير: 1448/01/{mobileActiveDay} هـ
            </div>
          </div>

          {/* Soldiers Cards List for Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSoldiers.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 font-sans text-sm">
                لا يوجد جنود مطابقين لمعايير البحث في هذه الوحدة.
              </div>
            ) : (
              paginatedSoldiers.map(soldier => {
                const targetDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${mobileActiveDay.toString().padStart(2, '0')}`;
                const currentStatus = getCellStatus(soldier.id, targetDate);
                const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                
                return (
                  <div 
                    key={soldier.id}
                    className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs space-y-3 hover:border-teal-300 transition-all"
                  >
                    {/* Soldier Info */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs shadow-2xs">
                          {soldier.photoUrl ? (
                            <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                            {soldier.rank}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5 font-sans">{soldier.fullName}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                            {soldierUnit} • رقم عسكري: <span className="font-mono">{soldier.militaryNumber}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Active Status Badge Indicator */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        currentStatus === 'ح' ? 'bg-emerald-100 text-emerald-800' :
                        currentStatus === 'غ' ? 'bg-red-100 text-red-800' :
                        currentStatus === 'إ' ? 'bg-blue-100 text-blue-800' :
                        currentStatus === 'م' ? 'bg-purple-100 text-purple-800' :
                        currentStatus === 'ع' ? 'bg-amber-100 text-amber-800' :
                        currentStatus === 'ن' ? 'bg-slate-100 text-slate-850' :
                        'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                      }`}>
                        {currentStatus ? STATUS_OPTIONS.find(o => o.code === currentStatus)?.label : 'لم يحضر'}
                      </span>
                    </div>

                    {/* Touch-Friendly Action Buttons */}
                    <div className="grid grid-cols-6 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      {STATUS_OPTIONS.map(opt => {
                        const isSelected = currentStatus === opt.code;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => handleCellChange(soldier.id, targetDate, opt.code)}
                            className={`min-h-[44px] py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                              isSelected
                                ? getCellColorClass(opt.code) + ' ring-2 ring-offset-1 ring-slate-400'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                            title={opt.label}
                          >
                            <span className="text-xs font-mono font-bold">{opt.code}</span>
                            <span className="text-[9px] font-sans font-extrabold">{opt.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Original Spreadsheet View Container */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-right border-collapse text-xs select-none">
              <thead className="bg-slate-100 border-b border-slate-200 font-sans sticky top-0 z-10">
                <tr>
                  {/* Select All */}
                  <th className="p-3 border-r border-slate-200 w-10 text-center sticky right-0 bg-slate-100 z-20">
                    <button onClick={toggleSelectAllSoldiers} className="text-slate-600 hover:text-slate-800">
                      {paginatedSoldiers.length > 0 && paginatedSoldiers.every(s => selectedSoldierIds.includes(s.id)) ? (
                        <CheckSquare className="w-4.5 h-4.5 text-teal-700" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </th>
                  
                  {/* Personnel Info columns */}
                  <th className="p-3 border-r border-slate-200 min-w-56 text-right sticky right-10 bg-slate-100 z-20">اسم العسكري والرتبة</th>
                  <th className="p-3 border-r border-slate-200 text-center w-20">رقم عسكري</th>
                  <th className="p-3 border-r border-slate-200 text-center w-24">الوحدة</th>

                  {/* Days 1 to 31 */}
                  {dateList.map((date, idx) => {
                    const dayNum = idx + 1;
                    return (
                      <th 
                        key={date} 
                        className="p-1 border-r border-slate-200 text-center w-9 min-w-[36px] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer group"
                        title="اضغط هنا لتعديل حالة هذا اليوم لجميع المعروضين"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-xs font-bold">{dayNum}</span>
                          {/* Column Quick Apply dropdown indicator */}
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                handleApplyColumnStatus(date, e.target.value as AttendanceStatusCode);
                                e.target.value = ''; // Reset select after applying
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-300 rounded text-[9px] font-bold p-0 w-8 h-4 cursor-pointer mt-0.5"
                          >
                            <option value="">+</option>
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.code} value={opt.code}>{opt.code}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-sans">
                {filteredSoldiers.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 4} className="p-8 text-center text-slate-400 font-sans text-sm">
                      لا يوجد جنود أو عساكر مطابقين لمعايير البحث في هذه الوحدة.
                    </td>
                  </tr>
                ) : (
                  paginatedSoldiers.map((soldier) => {
                    const isSelected = selectedSoldierIds.includes(soldier.id);
                    const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';

                    return (
                      <tr 
                        key={soldier.id} 
                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-teal-50/20' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 border-r border-slate-250 text-center sticky right-0 bg-white z-10">
                          <button onClick={() => toggleSelectSoldier(soldier.id)} className="text-slate-600">
                            {isSelected ? (
                              <CheckSquare className="w-4.5 h-4.5 text-teal-700" />
                            ) : (
                              <Square className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </td>

                        {/* Soldier Name with Row Operations */}
                        <td className="p-3 border-r border-slate-200 font-semibold sticky right-10 bg-white z-10 flex items-center justify-between group">
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] font-sans block">{soldier.rank}</span>
                            <span className="text-slate-800 text-xs font-sans font-bold">{soldier.fullName}</span>
                          </div>
                          {/* Quick Row action selector */}
                          <select
                            title="تطبيق حالة لكامل أيام الشهر لهذا العسكري"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleApplyRowStatus(soldier.id, e.target.value as AttendanceStatusCode);
                                e.target.value = ''; // Reset select
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 border border-slate-300 rounded text-[9px] font-bold p-0.5 w-12 cursor-pointer"
                          >
                            <option value="">كامل الشهر</option>
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.code} value={opt.code}>{opt.code} ({opt.label})</option>
                            ))}
                          </select>
                        </td>

                        {/* Military ID */}
                        <td className="p-3 border-r border-slate-200 text-center text-slate-500 font-mono">{soldier.militaryNumber}</td>

                        {/* Unit Name */}
                        <td className="p-3 border-r border-slate-200 text-center text-slate-500 font-sans truncate max-w-24" title={soldierUnit}>
                          {soldierUnit.replace('الكتيبة', 'كت').replace('سرية', 'سر')}
                        </td>

                        {/* Day Cells 1 to 31 */}
                        {dateList.map((date) => {
                          const cellCode = getCellStatus(soldier.id, date);
                          return (
                            <td key={date} className="p-0 border-r border-slate-200 text-center relative group/cell">
                              {/* Visual cell trigger */}
                              <div className="relative w-9 h-9 flex items-center justify-center">
                                {/* Sleek inline dropdown instead of native select to make it look highly customized */}
                                <button 
                                  className={`w-7 h-7 rounded-md text-[10px] flex items-center justify-center transition-colors shadow-2xs ${getCellColorClass(cellCode)}`}
                                >
                                  {cellCode || '.'}
                                </button>

                                {/* Hover Overlay selectors for rapid clicking */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden group-cell-hover/cell:grid grid-cols-3 gap-0.5 bg-slate-900/95 p-1 rounded-md z-30 shadow-lg w-[100px]">
                                  {STATUS_OPTIONS.map(opt => (
                                    <button
                                      key={opt.code}
                                      onClick={() => handleCellChange(soldier.id, date, opt.code)}
                                      className="w-7 h-5 text-[10px] font-bold text-white bg-slate-800 hover:bg-teal-500 rounded transition-colors"
                                      title={opt.label}
                                    >
                                      {opt.code}
                                    </button>
                                  ))}
                                  {/* Reset Cell */}
                                  <button
                                    onClick={() => handleCellChange(soldier.id, date, 'ح')} // Reset defaults to presence
                                    className="col-span-3 text-[9px] text-rose-300 bg-rose-950/40 hover:bg-rose-900 rounded py-0.5 transition-colors"
                                  >
                                    إلغاء التعيين
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredSoldiers.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans">
          {/* Info about current range */}
          <div className="text-slate-500 text-center sm:text-right">
            عرض <span className="font-bold text-slate-800 font-mono">{Math.min(filteredSoldiers.length, (currentPage - 1) * itemsPerPage + 1)}</span>
            {' - '}
            <span className="font-bold text-slate-800 font-mono">{Math.min(filteredSoldiers.length, currentPage * itemsPerPage)}</span>
            {' من أصل '}
            <span className="font-bold text-teal-800 font-mono">{filteredSoldiers.length}</span>
            {' عسكري في القوة المحددة'}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5" dir="rtl">
            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>

            {/* Page Numbers */}
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === 1
                        ? 'bg-teal-800 text-white font-mono'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-mono'
                    }`}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pages.push(<span key="ellipsis-start" className="px-1 text-slate-400 font-mono">...</span>);
                }
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === i
                        ? 'bg-teal-800 text-white font-mono'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-mono'
                    }`}
                  >
                    {i}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(<span key="ellipsis-end" className="px-1 text-slate-400 font-mono">...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === totalPages
                        ? 'bg-teal-800 text-white font-mono'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-mono'
                    }`}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-colors"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Items Per Page Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-sans">عدد العناصر بالصفحة:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-800 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
