import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  Info,
  Zap,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  X,
  Layers,
  Settings,
  FileSpreadsheet,
  Download,
  Sliders
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode, PrintSettings } from '../types';
import { ATTENDANCE_STATUS_MAP, MONTH_NAMES, normalizeStatusCode } from '../constants/attendance';

interface AttendanceSheetProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser: { id: string; name: string; role: string; unitId: string | null };
  printSettings?: PrintSettings;
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
  const [mobileStatusFilter, setMobileStatusFilter] = useState<'all' | 'unmarked' | AttendanceStatusCode>('all');
  const [mobileToast, setMobileToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Batch attendance modal & view states
  const [isBatchModeActive, setIsBatchModeActive] = useState<boolean>(false);
  const [batchConfirmStatus, setBatchConfirmStatus] = useState<AttendanceStatusCode | null>(null);

  // Export Settings Modal States
  const [isAttendanceSettingsOpen, setIsAttendanceSettingsOpen] = useState(false);
  const [exportPeriodType, setExportPeriodType] = useState<'monthly' | 'daily'>('monthly');
  const [exportMonth, setExportMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(() => new Date().getFullYear());
  const [exportDailyDate, setExportDailyDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [exportUnitId, setExportUnitId] = useState<string>('all');

  // Individual Soldier Monthly Grid Modal States
  const [activeMonthlySoldier, setActiveMonthlySoldier] = useState<Soldier | null>(null);
  const [modalYear, setModalYear] = useState<number>(() => new Date().getFullYear());
  const [modalMonth, setModalMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [soldierMonthlyGridState, setSoldierMonthlyGridState] = useState<Record<string, AttendanceStatusCode>>({});
  const [selectedGridDays, setSelectedGridDays] = useState<string[]>([]);
  const [isMonthlySaveConfirmOpen, setIsMonthlySaveConfirmOpen] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);

  // Reset page when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUnitId, mobileStatusFilter, mobileActiveDay]);

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
  
  // Spreadsheet calendar month setup defaulting to current date
  const todayDate = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => todayDate.getMonth() + 1);
  
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

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
    const key = `${soldierId}_${date}`;
    if (attendanceMap[key]) return attendanceMap[key];

    const s = soldiers.find(item => item.id === soldierId);
    if (s) {
      if (s.militaryStatus === 'إجازة' || s.militaryStatus === 'إجازة مرضية') return 'إ';
      if (s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف') return 'غ';
      if (s.militaryStatus === 'مهمة') return 'م';
    }
    return '';
  };

  // Target date for mobile & daily status filtering
  const mobileTargetDate = useMemo(() => {
    return `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${mobileActiveDay.toString().padStart(2, '0')}`;
  }, [currentYear, currentMonth, mobileActiveDay]);

  // Step 1: Base Filtered Soldiers List (Filtered by Unit, Search Query, and User Scope)
  const unitAndSearchFilteredSoldiers = useMemo(() => {
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
        const unitMatch = (units.find(u => u.id === s.unitId)?.name || '').toLowerCase().includes(query);
        return nameMatch || numberMatch || rankMatch || unitMatch;
      }
      return true;
    });
  }, [soldiers, activeUnitId, searchQuery, isRestrictedUser, currentUser.unitId, units]);

  // Step 2: Daily Attendance Summary Metrics computed on the Unit & Search filtered subset
  const mobileDailyMetrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let mission = 0;
    let excuse = 0;
    let half = 0;
    let unmarked = 0;

    unitAndSearchFilteredSoldiers.forEach(s => {
      const st = getCellStatus(s.id, mobileTargetDate);
      if (st === 'ح') present++;
      else if (st === 'غ') absent++;
      else if (st === 'إ') leave++;
      else if (st === 'م') mission++;
      else if (st === 'ع') excuse++;
      else if (st === 'ن') half++;
      else unmarked++;
    });

    return {
      total: unitAndSearchFilteredSoldiers.length,
      present,
      absent,
      leave,
      mission,
      excuse,
      half,
      unmarked
    };
  }, [unitAndSearchFilteredSoldiers, attendanceMap, mobileTargetDate]);

  // Step 3: Final Filtered Soldiers List (applies status filter as well)
  const filteredSoldiers = useMemo(() => {
    return unitAndSearchFilteredSoldiers.filter(s => {
      const st = getCellStatus(s.id, mobileTargetDate);
      if (mobileStatusFilter === 'unmarked') return !st;
      if (mobileStatusFilter !== 'all') return st === mobileStatusFilter;
      return true;
    });
  }, [unitAndSearchFilteredSoldiers, mobileStatusFilter, mobileTargetDate, attendanceMap]);

  // Backward compatibility alias for mobile view
  const mobileFilteredSoldiers = filteredSoldiers;

  // Paginated Soldiers List for both Desktop Table View & Mobile Cards View
  const paginatedSoldiers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSoldiers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSoldiers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSoldiers.length / itemsPerPage);
  const mobileTotalPages = totalPages;
  const mobilePaginatedSoldiers = paginatedSoldiers;

  // Reset all active filters
  const isFilterActive = selectedUnitId !== 'all' || mobileStatusFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedUnitId('all');
    setMobileStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // One-tap Quick Action: Mark all remaining unmarked visible soldiers as Present ('ح')
  const handleMarkAllRemainingPresent = () => {
    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      return;
    }

    const unmarkedIds = filteredSoldiers
      .filter(s => !getCellStatus(s.id, mobileTargetDate))
      .map(s => s.id);

    if (unmarkedIds.length === 0) {
      setMobileToast({ message: 'جميع الجنود المعروضين تم تحضيرهم بالفعل لهذا اليوم!', type: 'info' });
      setTimeout(() => setMobileToast(null), 3000);
      return;
    }

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      unmarkedIds.forEach(id => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === id && b.date === mobileTargetDate);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = 'ح';
        } else {
          newBuffer.push({ soldierId: id, date: mobileTargetDate, status: 'ح' });
        }
      });
      setOfflineBuffer(newBuffer);
    } else {
      onBulkUpdateAttendance(unmarkedIds, [mobileTargetDate], 'ح');
      onAddLog(
        'تعديل',
        'التحضير اليومي',
        `تحضير سريع عبر الهاتف: تسجيل (${unmarkedIds.length}) عسكري كـ (حاضر) ليوم ${mobileActiveDay}/${currentMonth}.`
      );
    }

    setMobileToast({
      message: `⚡ تم تسجيل حضور جميع المتبقين (${unmarkedIds.length} عسكري) بنجاح!`,
      type: 'success'
    });
    setTimeout(() => setMobileToast(null), 3500);
  };

  // Touch action handler for individual soldier on mobile with toast feedback
  const handleMobileCellChange = (soldierId: string, status: AttendanceStatusCode, soldierName: string) => {
    handleCellChange(soldierId, mobileTargetDate, status);
    
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }

    const statusObj = STATUS_OPTIONS.find(o => o.code === status);
    setMobileToast({
      message: `تم تسجيل [${statusObj?.label || status}] للعسكري (${soldierName}) وتحديث المؤشرات بالنظام`,
      type: 'success'
    });
    setTimeout(() => setMobileToast(null), 2500);
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
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthLabel = monthNames[currentMonth - 1] || 'يناير';
      alert(`تم الحفظ في مخزن عدم الاتصال: تعديل الحضور لـ (${selectedSoldierIds.length}) عسكري ليوم ${batchDayNum} ${monthLabel}.`);
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

  // Execution handler for batch attendance from the Indicators Card popup confirmation modal
  const executeBatchAttendanceConfirm = () => {
    if (!batchConfirmStatus) return;

    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      setBatchConfirmStatus(null);
      return;
    }

    if (selectedSoldierIds.length === 0) {
      alert('الرجاء اختيار جندي واحد على الأقل أولاً.');
      setBatchConfirmStatus(null);
      return;
    }

    const targetDate = mobileTargetDate;
    const statusObj = STATUS_OPTIONS.find(o => o.code === batchConfirmStatus);
    const statusLabel = statusObj?.label || batchConfirmStatus;
    const count = selectedSoldierIds.length;

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      selectedSoldierIds.forEach(id => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === id && b.date === targetDate);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = batchConfirmStatus;
        } else {
          newBuffer.push({ soldierId: id, date: targetDate, status: batchConfirmStatus });
        }
      });
      setOfflineBuffer(newBuffer);
    } else {
      onBulkUpdateAttendance(selectedSoldierIds, [targetDate], batchConfirmStatus);
      onAddLog(
        'تعديل',
        'التحضير اليومي',
        `تحضير جماعي للمحددين: تسجيل حالة (${statusLabel}) لعدد (${count}) عسكري ليوم ${targetDate}.`
      );
    }

    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([40, 40, 40]);
    }

    setMobileToast({
      message: `⚡ تم تحضير (${count}) عسكري كـ (${statusLabel}) وتحديث النظام بالكامل بنجاح!`,
      type: 'success'
    });
    setTimeout(() => setMobileToast(null), 3500);

    setSelectedSoldierIds([]);
    setIsBatchModeActive(false);
    setBatchConfirmStatus(null);
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
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthLabel = monthNames[currentMonth - 1] || 'يناير';
    const confirmAction = window.confirm(`هل أنت متأكد من تطبيق حالة (${status}) على كافة الجنود المعروضين (${filteredSoldiers.length} عسكري) ليوم ${dayNum} ${monthLabel}؟`);
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
        `تعديل عمود كامل: تطبيق حالة (${status}) لجميع عسكريي (${unitName}) المعروضين ليوم ${dayNum} ${monthLabel}.`
      );
    }
  };

  // Open Individual Soldier Monthly Attendance Grid Modal
  const handleOpenMonthlyModal = (soldier: Soldier) => {
    const yr = currentYear;
    const mo = currentMonth;
    setActiveMonthlySoldier(soldier);
    setModalYear(yr);
    setModalMonth(mo);
    setSelectedGridDays([]);
    setIsMonthlySaveConfirmOpen(false);

    const daysCount = new Date(yr, mo, 0).getDate();
    const initialGrid: Record<string, AttendanceStatusCode> = {};

    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${yr}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      initialGrid[dateStr] = (getCellStatus(soldier.id, dateStr) || 'ح') as AttendanceStatusCode;
    }

    setSoldierMonthlyGridState(initialGrid);
  };

  // Switch month/year inside monthly modal
  const handleModalMonthYearChange = (newYear: number, newMonth: number) => {
    setModalYear(newYear);
    setModalMonth(newMonth);
    setSelectedGridDays([]);

    if (!activeMonthlySoldier) return;

    const daysCount = new Date(newYear, newMonth, 0).getDate();
    const newGrid: Record<string, AttendanceStatusCode> = {};

    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${newYear}-${newMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      newGrid[dateStr] = (getCellStatus(activeMonthlySoldier.id, dateStr) || 'ح') as AttendanceStatusCode;
    }

    setSoldierMonthlyGridState(newGrid);
  };

  // Toggle selection of a day box in the grid
  const handleToggleGridDay = (dateStr: string) => {
    setSelectedGridDays(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  // Select all or clear selection
  const handleSelectAllGridDays = () => {
    const daysCount = new Date(modalYear, modalMonth, 0).getDate();
    const allDates = Array.from({ length: daysCount }, (_, i) => {
      const day = i + 1;
      return `${modalYear}-${modalMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    });
    setSelectedGridDays(allDates);
  };

  const handleClearGridSelection = () => {
    setSelectedGridDays([]);
  };

  // Apply selected status to all selected grid day boxes and clear selection
  const handleApplyStatusToSelectedGridDays = (statusCode: AttendanceStatusCode | '') => {
    if (selectedGridDays.length === 0) {
      setMobileToast({
        message: 'حدد يوماً أو عدة أيام من المربعات أولاً لتطبيق حالة التحضير',
        type: 'info'
      });
      setTimeout(() => setMobileToast(null), 3000);
      return;
    }

    setSoldierMonthlyGridState(prev => {
      const updated = { ...prev };
      selectedGridDays.forEach(d => {
        updated[d] = statusCode as AttendanceStatusCode;
      });
      return updated;
    });

    // Clear selection immediately so user can select other days easily
    setSelectedGridDays([]);
  };

  // Confirm and apply monthly changes to the full system
  const handleConfirmSaveMonthlyAttendance = () => {
    if (!activeMonthlySoldier) return;

    if (currentUser.role === 'operations') {
      alert('عذراً! دورك الحالي (ركن العمليات) يسمح بالقراءة فقط ولا يمكنك تعديل البيانات.');
      setIsMonthlySaveConfirmOpen(false);
      return;
    }

    // Group dates by status code for batch updating
    const statusGroups: Record<string, string[]> = {};

    Object.entries(soldierMonthlyGridState).forEach(([dateStr, status]) => {
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(dateStr);
    });

    if (isOffline) {
      const newBuffer = [...offlineBuffer];
      Object.entries(soldierMonthlyGridState).forEach(([dateStr, status]) => {
        const existingIdx = newBuffer.findIndex(b => b.soldierId === activeMonthlySoldier.id && b.date === dateStr);
        if (existingIdx > -1) {
          newBuffer[existingIdx].status = status;
        } else {
          newBuffer.push({ soldierId: activeMonthlySoldier.id, date: dateStr, status });
        }
      });
      setOfflineBuffer(newBuffer);
    } else {
      Object.entries(statusGroups).forEach(([status, dates]) => {
        if (dates.length > 0) {
          onBulkUpdateAttendance([activeMonthlySoldier.id], dates, status as AttendanceStatusCode);
        }
      });

      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      onAddLog(
        'تعديل',
        'التحضير اليومي',
        `تحديث وتحضير الكشف الشهري كاملاً للعسكري: ${activeMonthlySoldier.rank} / ${activeMonthlySoldier.fullName} لشهر ${monthNames[modalMonth - 1]} ${modalYear}.`
      );
    }

    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([30, 30, 30]);
    }

    setMobileToast({
      message: `✅ تم حفظ وتطبيق التحضير الشهري للفرد (${activeMonthlySoldier.fullName}) بنجاح!`,
      type: 'success'
    });
    setTimeout(() => setMobileToast(null), 3500);

    setIsMonthlySaveConfirmOpen(false);
    setActiveMonthlySoldier(null);
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

  // Export Attendance Records to Formatted Excel Worksheet
  const handleExportAttendanceExcel = () => {
    let targetSoldiers = filteredSoldiers;
    if (exportUnitId !== 'all') {
      targetSoldiers = soldiers.filter(s => s.unitId === exportUnitId);
    }

    if (targetSoldiers.length === 0) {
      alert('لا يوجد أفراد يطابقون التصفية المحددة للتصدير.');
      return;
    }

    const aoa: any[][] = [];

    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const exportDaysInMonth = new Date(exportYear, exportMonth, 0).getDate();
    const unitObj = units.find(u => u.id === exportUnitId);
    const unitNameText = exportUnitId === 'all' ? 'جميع الوحدات العسكرية' : (unitObj?.name || 'وحدة محددة');

    // Header Rows Block
    aoa.push(['كشف التحضير والجاهزية اليومية - قوة اللواء 43 عمالقة']);

    if (exportPeriodType === 'monthly') {
      aoa.push([`التقرير: كشف تحضير شهري - شهر ${monthNames[exportMonth - 1]} ${exportYear}`]);
    } else {
      aoa.push([`التقرير: كشف تحضير يومي بتاريخ - ${exportDailyDate}`]);
    }

    aoa.push([`التشكيل / الوحدة: ${unitNameText}`]);
    aoa.push([`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} - إجمالي القوة: ${targetSoldiers.length} عسكري`]);
    aoa.push([]); // Empty row space

    if (exportPeriodType === 'monthly') {
      // Monthly Header Columns
      const headerRow: string[] = [
        'م',
        'الرقم العسكري',
        'الرتبة',
        'الاسم الكامل',
        'الوحدة العسكرية'
      ];

      // Day numbers
      for (let d = 1; d <= exportDaysInMonth; d++) {
        headerRow.push(`${d}`);
      }

      // Summary Total Columns
      headerRow.push('عدد أيام الحضور');
      headerRow.push('عدد أيام الغياب');
      headerRow.push('عدد أيام الإجازة');
      headerRow.push('عدد أيام الإجازة المرضية/بعذر');

      aoa.push(headerRow);

      // Rows for each soldier
      targetSoldiers.forEach((soldier, idx) => {
        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        let sickCount = 0;

        const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير محدد';
        const row: any[] = [
          idx + 1,
          soldier.militaryNumber || '',
          soldier.rank || '',
          soldier.fullName || '',
          soldierUnit
        ];

        for (let d = 1; d <= exportDaysInMonth; d++) {
          const dateStr = `${exportYear}-${exportMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          const st = attendanceMap[`${soldier.id}_${dateStr}`] || '';
          row.push(st || '-');

          if (st === 'ح') presentCount++;
          else if (st === 'غ') absentCount++;
          else if (st === 'إ') leaveCount++;
          else if (st === 'ع' || st === 'م' || st === 'ن') sickCount++;
        }

        row.push(presentCount);
        row.push(absentCount);
        row.push(leaveCount);
        row.push(sickCount);

        aoa.push(row);
      });

    } else {
      // Daily Export Format
      const headerRow: string[] = [
        'م',
        'الرقم العسكري',
        'الرتبة',
        'الاسم الكامل',
        'الوحدة العسكرية',
        `حالة التحضير (${exportDailyDate})`,
        'إجمالي حضور الشهر',
        'إجمالي غياب الشهر',
        'إجمالي إجازات الشهر',
        'إجمالي الأعذار والمرضية'
      ];

      aoa.push(headerRow);

      targetSoldiers.forEach((soldier, idx) => {
        const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير محدد';
        const st = attendanceMap[`${soldier.id}_${exportDailyDate}`] || 'غير محدد';
        const statusLabel = STATUS_OPTIONS.find(o => o.code === st)?.label || st;

        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        let sickCount = 0;

        for (let d = 1; d <= exportDaysInMonth; d++) {
          const dateStr = `${exportYear}-${exportMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          const daySt = attendanceMap[`${soldier.id}_${dateStr}`] || '';
          if (daySt === 'ح') presentCount++;
          else if (daySt === 'غ') absentCount++;
          else if (daySt === 'إ') leaveCount++;
          else if (daySt === 'ع' || daySt === 'م' || daySt === 'ن') sickCount++;
        }

        aoa.push([
          idx + 1,
          soldier.militaryNumber || '',
          soldier.rank || '',
          soldier.fullName || '',
          soldierUnit,
          statusLabel,
          presentCount,
          absentCount,
          leaveCount,
          sickCount
        ]);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    const sheetName = exportPeriodType === 'monthly' 
      ? `تحضير_شهر_${exportMonth}_${exportYear}`
      : `تحضير_يوم_${exportDailyDate}`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    const fileName = exportPeriodType === 'monthly'
      ? `كشف_التحضير_الشهري_شهر_${exportMonth}_${exportYear}.xlsx`
      : `كشف_التحضير_اليومي_${exportDailyDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    if (onAddLog) {
      onAddLog(
        'تعديل',
        'التحضير اليومي',
        `تصدير كشف التحضير لـ (${targetSoldiers.length}) عسكري بصيغة Excel (${exportPeriodType === 'monthly' ? 'شهري' : 'يومي'}).`
      );
    }

    setIsAttendanceSettingsOpen(false);
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
    <div className="space-y-2 sm:space-y-6 text-right" dir="rtl">
      {/* Title & Connection Simulator Card (Hidden on mobile to maximize attendance workspace) */}
      <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
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

      {/* Grid Legend & Info (Hidden on mobile to save screen space) */}
      <div className="hidden md:grid bg-slate-50 p-4 rounded-xl border border-slate-200 grid-cols-2 md:grid-cols-6 gap-3">
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

      {/* Unified Contiguous Mobile-Optimized Controls Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-200/80">
        {/* 1. Advanced Search & Dual Filter Bar (Unit & Status Filters) */}
        <div className="p-3 bg-white space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px] sm:w-72">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث بالاسم، الرقم، الرتبة أو الوحدة..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pr-9 pl-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-sans shadow-2xs font-semibold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="مسح نص البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Unit Filter Dropdown */}
              {currentUser.role !== 'commander_unit' && currentUser.role !== 'data_writer' ? (
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-sans text-slate-800 shrink-0 shadow-2xs">
                  <Layers className="w-4 h-4 text-teal-600 ml-1.5 shrink-0" />
                  <span className="text-[11px] text-slate-500 font-bold ml-1.5 hidden sm:inline">الوحدة:</span>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => {
                      setSelectedUnitId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">جميع الوحدات ({soldiers.filter(s => s.isActive).length} فرد)</option>
                    {allowedUnits.map(u => {
                      const uCount = soldiers.filter(s => s.isActive && s.unitId === u.id).length;
                      return (
                        <option key={u.id} value={u.id}>{u.name} ({uCount} فرد)</option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-teal-850 font-sans shrink-0 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>{allowedUnits[0]?.name}</span>
                </div>
              )}

              {/* Status Filter Dropdown */}
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-sans text-slate-800 shrink-0 shadow-2xs">
                <Sliders className="w-4 h-4 text-blue-600 ml-1.5 shrink-0" />
                <span className="text-[11px] text-slate-500 font-bold ml-1.5 hidden sm:inline">الحالة:</span>
                <select
                  value={mobileStatusFilter}
                  onChange={(e) => {
                    setMobileStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كافة الحالات ({unitAndSearchFilteredSoldiers.length})</option>
                  <option value="unmarked">⏳ لم يتم تحضيرهم ({mobileDailyMetrics.unmarked})</option>
                  <option value="ح">🟢 حاضر ({mobileDailyMetrics.present})</option>
                  <option value="غ">🔴 غائب ({mobileDailyMetrics.absent})</option>
                  <option value="إ">🔵 إجازة ({mobileDailyMetrics.leave})</option>
                  <option value="م">🟣 مهمة عسكرية ({mobileDailyMetrics.mission})</option>
                  <option value="ع">🟡 بعذر مقبول ({mobileDailyMetrics.excuse})</option>
                  <option value="ن">⚪ نصف يوم ({mobileDailyMetrics.half})</option>
                </select>
              </div>

              {/* Reset All Filters Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                  title="إلغاء وتصفير كافة محددات البحث والتصفية"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>إعادة تعيين التصفيات</span>
                </button>
              )}

            </div>

            {/* Active Filters Summary Badge */}
            <div className="flex items-center gap-2 text-xs font-sans text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 justify-between lg:justify-end">
              <span className="font-bold text-slate-500">النتائج:</span>
              <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {filteredSoldiers.length} من أصل {unitAndSearchFilteredSoldiers.length}
              </span>
            </div>
          </div>

          {/* Quick Filter Status Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              تصفية سريعة:
            </span>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>الكل</span>
              <span className="font-mono text-[11px] opacity-80">({mobileDailyMetrics.total})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('unmarked'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'unmarked'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span>لم يحضر ⏳</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.unmarked})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('ح'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'ح'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>حاضر 🟢</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.present})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('غ'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'غ'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span>غائب 🔴</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.absent})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('إ'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'إ'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              <span>إجازة 🔵</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.leave})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('م'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'م'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              <span>مهمة 🟣</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.mission})</span>
            </button>

            <button
              type="button"
              onClick={() => { setMobileStatusFilter('ع'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                mobileStatusFilter === 'ع'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span>بعذر 🟡</span>
              <span className="font-mono text-[11px] opacity-90">({mobileDailyMetrics.excuse})</span>
            </button>
          </div>

          {/* Batch Operations Bar (Desktop Only) */}
          {!isMobileMode && (
            <div className="hidden md:flex border border-emerald-100 bg-emerald-50/50 p-3 rounded-xl flex-row items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800 font-sans">أداة التحضير الجماعي السريع</span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-500 font-sans">تطبيق ليوم:</span>
                <select 
                  value={batchDayNum}
                  onChange={(e) => setBatchDayNum(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-mono"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                    const monthLabel = monthNames[currentMonth - 1] || 'يناير';
                    return (
                      <option key={i+1} value={i+1}>{i+1} {monthLabel}</option>
                    );
                  })}
                </select>

                <select 
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value as AttendanceStatusCode)}
                  className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-sans font-bold"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.label} ({opt.code})</option>
                  ))}
                </select>

                <button
                  onClick={handleApplyBatchStatus}
                  disabled={selectedSoldierIds.length === 0}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedSoldierIds.length > 0 
                      ? 'bg-emerald-700 text-white cursor-pointer hover:bg-emerald-800' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  تطبيق على المحددين ({selectedSoldierIds.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Target Date Selector & Settings Ribbon (Compact Side-by-Side) */}
        <div className="bg-slate-50/90 p-1.5 px-2 flex items-center justify-between gap-1.5 text-xs font-sans">
          
          {/* Compact Date Switcher Ribbon */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setMobileActiveDay(prev => Math.max(1, prev - 1))}
              disabled={mobileActiveDay <= 1}
              className="p-1 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 rounded-lg shrink-0 cursor-pointer shadow-2xs"
              title="اليوم السابق"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            </button>

            <div className="flex items-center justify-center gap-1 bg-white border border-slate-200/90 py-0.5 px-2 rounded-lg text-center shadow-2xs shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-black text-slate-900 font-mono">
                {mobileTargetDate}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileActiveDay(prev => Math.min(daysInMonth, prev + 1))}
              disabled={mobileActiveDay >= daysInMonth}
              className="p-1 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 rounded-lg shrink-0 cursor-pointer shadow-2xs"
              title="اليوم التالي"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                setCurrentMonth(now.getMonth() + 1);
                setMobileActiveDay(now.getDate());
              }}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shrink-0 flex items-center gap-0.5 ${
                mobileActiveDay === new Date().getDate() && currentMonth === (new Date().getMonth() + 1)
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>اليوم</span>
              <span className="font-mono text-[9px]">({new Date().getDate()})</span>
            </button>

            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-black text-slate-800 shrink-0 font-sans focus:outline-hidden"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>شهر {i + 1}</option>
              ))}
            </select>
          </div>

          {/* Settings Icon Button (زر رمز الإعدادات) */}
          <button
            type="button"
            onClick={() => setIsAttendanceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer shadow-2xs border border-slate-700 hover:border-emerald-500/50"
            title="إعدادات وتصدير كشف التحضير اكسل"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold">الإعدادات</span>
          </button>

        </div>

        {/* 3. Today's Attendance Indicators & Mode Switcher (Contiguous Bottom Section) */}
        <div className="bg-slate-900 text-slate-100 p-2 sm:p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-emerald-400 flex items-center gap-1 shrink-0 text-[11px]">
                <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
                مؤشرات تحضير اليوم ({mobileActiveDay}/{currentMonth}):
              </span>

              {/* Interactive Selected Box ("مربع المحددين") */}
              <button
                type="button"
                onClick={() => {
                  if (selectedSoldierIds.length === 0) {
                    setMobileToast({
                      message: 'حدد أفراداً من القائمة أولاً (بالضغط على مربعات التحديد) للتحضير الجماعي',
                      type: 'info'
                    });
                    setTimeout(() => setMobileToast(null), 3000);
                  } else {
                    setIsBatchModeActive(prev => !prev);
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  selectedSoldierIds.length > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md ring-2 ring-amber-300/80 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                }`}
                title="اضغط للتحضير الجماعي للمحددين"
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>المحددين: <strong className="font-mono text-sm">{selectedSoldierIds.length}</strong></span>
                {selectedSoldierIds.length > 0 && (
                  <span className="text-[10px] bg-slate-950/20 px-1 py-0.5 rounded font-black">
                    {isBatchModeActive ? 'إلغاء ✖' : 'تحضير ✏️'}
                  </span>
                )}
              </button>

              {/* Integrated View Switcher Buttons */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileMode(false)}
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                    !isMobileMode 
                      ? 'bg-slate-100 text-slate-900 shadow-2xs font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>جدول 🖥️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileMode(true)}
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                    isMobileMode 
                      ? 'bg-emerald-600 text-white shadow-2xs font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>بطاقات 📱</span>
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 shrink-0">القوة: <strong className="text-white font-mono">{mobileDailyMetrics.total}</strong></span>
          </div>

          {/* Card Body: Standard Metrics Grid vs Batch Actions Grid */}
          {!isBatchModeActive ? (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-center">
              <button
                onClick={() => setMobileStatusFilter('all')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'all'
                    ? 'bg-slate-800 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-[9px] text-slate-400">الكل</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.total}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('unmarked')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'unmarked'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-amber-950/30 border-amber-800/40 text-amber-400 hover:bg-amber-950/60'
                }`}
              >
                <div className="text-[9px]">لم يحضر</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.unmarked}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('ح')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'ح'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60'
                }`}
              >
                <div className="text-[9px]">حاضر 🟢</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.present}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('غ')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'غ'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-rose-950/30 border-rose-800/40 text-rose-400 hover:bg-rose-950/60'
                }`}
              >
                <div className="text-[9px]">غائب 🔴</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.absent}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('إ')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'إ'
                    ? 'bg-blue-950/80 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                    : 'bg-blue-950/30 border-blue-800/40 text-blue-400 hover:bg-blue-950/60'
                }`}
              >
                <div className="text-[9px]">إجازة 🔵</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.leave}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('م')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'م'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-1 ring-purple-500/50'
                    : 'bg-purple-950/30 border-purple-800/40 text-purple-400 hover:bg-purple-950/60'
                }`}
              >
                <div className="text-[9px]">مهمة 🟣</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.mission}</div>
              </button>

              <button
                onClick={() => setMobileStatusFilter('ع')}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  mobileStatusFilter === 'ع'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-amber-950/30 border-amber-800/40 text-amber-400 hover:bg-amber-950/60'
                }`}
              >
                <div className="text-[9px]">بعذر 🟡</div>
                <div className="text-xs font-mono font-black mt-0.5">{mobileDailyMetrics.excuse}</div>
              </button>
            </div>
          ) : (
            /* Replaced Grid with Batch Attendance Action Buttons */
            <div className="bg-slate-800/90 p-2 rounded-xl border border-amber-500/60 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-amber-300 font-bold px-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  اختر حالة التحضير لـ (<span className="text-white font-mono text-sm font-black">{selectedSoldierIds.length}</span>) عسكري محدد:
                </span>
                <button
                  type="button"
                  onClick={() => setIsBatchModeActive(false)}
                  className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  رجوع للمؤشرات 📊
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBatchConfirmStatus('ح')}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="text-sm">🟢</span>
                  <span>حاضر (ح)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchConfirmStatus('غ')}
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="text-sm">🔴</span>
                  <span>غائب (غ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchConfirmStatus('إ')}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="text-sm">🔵</span>
                  <span>إجازة (إ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchConfirmStatus('م')}
                  className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="text-sm">🟣</span>
                  <span>مهمة (م)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchConfirmStatus('ع')}
                  className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="text-sm">🟡</span>
                  <span>بعذر/مرض (ع)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBatchModeActive(false)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">❌</span>
                  <span>إلغاء</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobileMode ? (
        /* Mobile Cards Mode Container */
        <div className="space-y-3">
          
          {/* Mobile Floating Sync Feedback Toast */}
          {mobileToast && (
            <div className={`p-3.5 rounded-2xl border shadow-lg flex items-center justify-between gap-3 text-xs font-black transition-all animate-bounce ${
              mobileToast.type === 'success' 
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{mobileToast.message}</span>
              </div>
              <button onClick={() => setMobileToast(null)} className="text-slate-300 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3. Fast One-Tap Bulk Action Header for Mobile */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3 rounded-2xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>التحضير السريع للهاتف المحمول:</span>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRemainingPresent}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>تحضير جميع المتبقين (حاضر 🟢) ({mobileDailyMetrics.unmarked} عسكري)</span>
            </button>
          </div>

          {/* 4. Filter Chips Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setMobileStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({filteredSoldiers.length})
            </button>
            <button
              onClick={() => setMobileStatusFilter('unmarked')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'unmarked'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              ⏳ لم يحضر بعد ({mobileDailyMetrics.unmarked})
            </button>
            <button
              onClick={() => setMobileStatusFilter('ح')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'ح'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              🟢 حاضر ({mobileDailyMetrics.present})
            </button>
            <button
              onClick={() => setMobileStatusFilter('غ')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'غ'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              🔴 غائب ({mobileDailyMetrics.absent})
            </button>
            <button
              onClick={() => setMobileStatusFilter('إ')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'إ'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              🔵 إجازة ({mobileDailyMetrics.leave})
            </button>
            <button
              onClick={() => setMobileStatusFilter('م')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'م'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              🟣 مهمة ({mobileDailyMetrics.mission})
            </button>
            <button
              onClick={() => setMobileStatusFilter('ع')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileStatusFilter === 'ع'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              🟡 مرضي/بعذر ({mobileDailyMetrics.excuse})
            </button>
          </div>

          {/* 5. Mobile Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredSoldiers.length === 0 ? (
              <div className="col-span-full bg-white p-8 text-center text-slate-500 rounded-2xl border border-slate-200 font-sans text-sm space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-extrabold text-slate-800 text-base">لا يوجد أفراد مطابقين لمعايير التصفية والبحث الحالية</p>
                <p className="text-xs text-slate-500">جرب تغيير خيار التصفية حسب الوحدة أو الحالة أو إعادة تعيين محددات البحث.</p>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <X className="w-4 h-4" />
                    <span>إعادة تعيين كافة التصفيات</span>
                  </button>
                )}
              </div>
            ) : (
              mobilePaginatedSoldiers.map(soldier => {
                const currentStatus = getCellStatus(soldier.id, mobileTargetDate);
                const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                const isSelectedForBatch = selectedSoldierIds.includes(soldier.id);
                
                return (
                  <div 
                    key={soldier.id}
                    className={`bg-white p-4 rounded-2xl border shadow-xs space-y-3 transition-all relative ${
                      isSelectedForBatch 
                        ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/30' 
                        : currentStatus === 'ح' ? 'border-slate-200 hover:border-emerald-300'
                        : currentStatus === 'غ' ? 'border-rose-200 bg-rose-50/10'
                        : currentStatus === 'إ' ? 'border-blue-200 bg-blue-50/10'
                        : currentStatus === 'م' ? 'border-purple-200 bg-purple-50/10'
                        : currentStatus === 'ع' ? 'border-amber-200 bg-amber-50/10'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {/* Soldier Info & Checkbox */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        
                        {/* Checkbox for Mobile Selection */}
                        <button
                          type="button"
                          onClick={() => toggleSelectSoldier(soldier.id)}
                          className="p-1 text-slate-400 hover:text-emerald-600 shrink-0"
                          title="تحديد للعامل الجماعي"
                        >
                          {isSelectedForBatch ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>

                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs shadow-2xs">
                          {soldier.photoUrl ? (
                            <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                              {soldier.rank}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {soldierUnit}
                            </span>
                          </div>
                          
                          {/* Clickable soldier name to open monthly modal */}
                          <div
                            onClick={() => handleOpenMonthlyModal(soldier)}
                            className="flex items-center gap-1.5 mt-1 cursor-pointer group hover:text-emerald-700 transition-colors"
                            title="اضغط لفتح شبكة التحضير الشهري للفرد"
                          >
                            <h4 className="text-sm font-black text-slate-900 font-sans group-hover:text-emerald-700 transition-colors">
                              {soldier.fullName}
                            </h4>
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-0.5">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span>شهري 📅</span>
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                            الرقم العسكري: <span className="font-mono font-bold text-slate-700">{soldier.militaryNumber}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Active Status Badge Indicator */}
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                        currentStatus === 'ح' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        currentStatus === 'غ' ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' :
                        currentStatus === 'إ' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        currentStatus === 'م' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                        currentStatus === 'ع' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        currentStatus === 'ن' ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                      }`}>
                        {currentStatus ? STATUS_OPTIONS.find(o => o.code === currentStatus)?.label : 'لم يحضر ⏳'}
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
                            onClick={() => handleMobileCellChange(soldier.id, opt.code, soldier.fullName)}
                            className={`min-h-[46px] py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-90 ${
                              isSelected
                                ? getCellColorClass(opt.code) + ' ring-2 ring-offset-1 ring-slate-500 shadow-sm scale-102'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
                            }`}
                            title={opt.label}
                          >
                            <span className="text-xs font-mono font-black">{opt.code}</span>
                            <span className="text-[9px] font-sans font-black">{opt.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 6. Mobile Pagination Footer */}
          {mobileTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl"
              >
                السابق
              </button>
              <span className="text-slate-600 font-mono">
                صفحة {currentPage} من {mobileTotalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(mobileTotalPages, prev + 1))}
                disabled={currentPage >= mobileTotalPages}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl"
              >
                التالي
              </button>
            </div>
          )}

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
                    <td colSpan={daysInMonth + 4} className="p-12 text-center text-slate-500 font-sans text-sm bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <Users className="w-10 h-10 text-slate-300" />
                        <p className="font-extrabold text-slate-800 text-base">لا يوجد أفراد مطابقين لمعايير البحث والتصفية المحددة</p>
                        <p className="text-xs text-slate-500">قد تكون التصفية الحالية (الوحدة أو الحالة) لا تحتوي على أفراد في هذا اليوم.</p>
                        {isFilterActive && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            <X className="w-4 h-4" />
                            <span>إعادة تعيين كافة التصفيات</span>
                          </button>
                        )}
                      </div>
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
                          <div 
                            onClick={() => handleOpenMonthlyModal(soldier)}
                            className="text-right cursor-pointer hover:text-emerald-700 transition-colors"
                            title="اضغط لفتح شاشة التحضير الشهري الفردية"
                          >
                            <span className="text-slate-400 text-[10px] font-sans block">{soldier.rank}</span>
                            <span className="text-slate-800 text-xs font-sans font-bold hover:text-emerald-700 flex items-center gap-1">
                              {soldier.fullName}
                              <Calendar className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100" />
                            </span>
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

      {/* Batch Attendance Confirmation Modal Pop-up */}
      {batchConfirmStatus && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4 text-right dir-rtl animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                  <Zap className="w-5 h-5 fill-amber-500 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-sans">تأكيد التحضير الجماعي</h3>
                  <p className="text-[11px] text-slate-500 font-sans">تطبيق حالة التحضير على كافة المحددين دفعة واحدة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchConfirmStatus(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Summary Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold">الحالة المراد تعيينها:</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                  batchConfirmStatus === 'ح' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  batchConfirmStatus === 'غ' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                  batchConfirmStatus === 'إ' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  batchConfirmStatus === 'م' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                  batchConfirmStatus === 'ع' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {STATUS_OPTIONS.find(o => o.code === batchConfirmStatus)?.label} ({batchConfirmStatus})
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold">عدد الأفراد المحددين:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {selectedSoldierIds.length} عسكري
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold">التاريخ المستهدف:</span>
                <span className="font-mono font-black text-emerald-700 text-xs">
                  {mobileTargetDate}
                </span>
              </div>

              {/* Selected Soldiers Tag List */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">قائمة الأفراد المشمولين بالتحضير:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-lg">
                  {selectedSoldierIds.map(id => {
                    const sol = soldiers.find(s => s.id === id);
                    return (
                      <span key={id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-sans font-bold">
                        {sol ? `${sol.rank} ${sol.fullName}` : id}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              عند التأكيد، سيتم تسجيل حالة <strong className="text-emerald-700">({STATUS_OPTIONS.find(o => o.code === batchConfirmStatus)?.label})</strong> فوراً لجميع العساكر المحددين أعلاه وتحديث المؤشرات بكافة النظام.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={executeBatchAttendanceConfirm}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد التحضير والتطبيق بالنظام</span>
              </button>

              <button
                type="button"
                onClick={() => setBatchConfirmStatus(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Attendance Excel Settings Modal */}
      {isAttendanceSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">إعدادات وتصدير التحضير (Excel)</h3>
                  <p className="text-[11px] text-slate-300 font-medium">تخصيص الفترة والوحدة لاستخراج كشف مرتب بأعلى المعايير</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAttendanceSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 text-right">
              
              {/* 1. Period Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 block">نوع النطاق التقريري:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportPeriodType('monthly')}
                    className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      exportPeriodType === 'monthly'
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <span>كشف شهري كامل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportPeriodType('daily')}
                    className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      exportPeriodType === 'daily'
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>تحديد تاريخ يومي</span>
                  </button>
                </div>
              </div>

              {/* 2. Date Selection Settings */}
              {exportPeriodType === 'monthly' ? (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">الشهر المستهدف:</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => setExportMonth(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      {[
                        'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
                        'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
                      ].map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>{mName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">السنة:</label>
                    <select
                      value={exportYear}
                      onChange={(e) => setExportYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">تحديد التاريخ اليومي المطلوب:</label>
                  <input
                    type="date"
                    value={exportDailyDate}
                    onChange={(e) => setExportDailyDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              )}

              {/* 3. Unit Filter Choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 block">اختيار الوحدة العسكرية:</label>
                <select
                  value={exportUnitId}
                  onChange={(e) => setExportUnitId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">جميع الوحدات العسكرية (الكل)</option>
                  {allowedUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* 4. Target Scope Preview Summary */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-emerald-950">الأفراد المشمولين بالتصدير:</span>
                </div>
                <span className="font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-xl text-xs font-mono">
                  {exportUnitId === 'all' 
                    ? soldiers.length 
                    : soldiers.filter(s => s.unitId === exportUnitId).length
                  } عسكري
                </span>
              </div>

              {/* Structure Info Box */}
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed font-sans space-y-1">
                <p className="font-bold text-slate-800">حقول وأعمدة الملف المصدر:</p>
                <p>• الترويسة: عنوان الصفحة الرسمي (باسم الشهر أو التاريخ المنسق) والوحدة.</p>
                <p>• الجدول: التسلسل، الرقم العسكري، الرتبة، الاسم، التواريخ كاملة للشهر، عدد أيام الحضور، عدد أيام الغياب، عدد أيام الإجازة، وعدد أيام الإجازة المرضية/بعذر.</p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                  <span>تأكيد واستخراج كشف Excel ({exportPeriodType === 'monthly' ? `شهر ${exportMonth}/${exportYear}` : exportDailyDate})</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Individual Soldier Monthly Attendance Grid Modal */}
      {activeMonthlySoldier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[96vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-3 sm:p-4 flex items-center justify-between border-b border-slate-700/80 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner overflow-hidden">
                  {activeMonthlySoldier.photoUrl ? (
                    <img src={activeMonthlySoldier.photoUrl} alt={activeMonthlySoldier.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.5 rounded-md">
                      {activeMonthlySoldier.rank}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      #{activeMonthlySoldier.militaryNumber}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white truncate mt-0.5">{activeMonthlySoldier.fullName}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMonthlySoldier(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Compact Single-Screen Mobile Layout */}
            <div className="p-3 space-y-2 text-right overflow-y-auto font-sans flex-1">
              
              {/* Month/Year Bar + Quick Selectors */}
              <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-black text-slate-800">شهر:</span>
                  <select
                    value={modalMonth}
                    onChange={(e) => handleModalMonthYearChange(modalYear, Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-black text-slate-900 focus:outline-hidden"
                  >
                    {[
                      'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
                      'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
                    ].map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>{mName}</option>
                    ))}
                  </select>

                  <select
                    value={modalYear}
                    onChange={(e) => handleModalMonthYearChange(Number(e.target.value), modalMonth)}
                    className="bg-white border border-slate-300 rounded-xl px-1.5 py-1 text-xs font-black text-slate-900 focus:outline-hidden"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Selection Helpers */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAllGridDays}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  {selectedGridDays.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearGridSelection}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      إلغاء ({selectedGridDays.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Instructions & Status Indicator */}
              <div className="flex items-center justify-between text-[11px] font-bold px-1">
                <span className="text-slate-600">
                  {selectedGridDays.length === 0 ? (
                    '💡 اضغط المربعات لتحديد الأيام ثم اختر الحالة:'
                  ) : (
                    <span className="text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      تم تحديد ({selectedGridDays.length}) يوم - اختر الحالة أدناه:
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(modalYear, modalMonth, 0).getDate()} يوم
                </span>
              </div>

              {/* 6 Rows x 5 Columns Compact Month Grid (6 سطور كل سطر 5 أيام) */}
              <div className="grid grid-cols-5 gap-1.5 bg-slate-100/80 p-2 rounded-2xl border border-slate-200">
                {Array.from({ length: new Date(modalYear, modalMonth, 0).getDate() }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${modalYear}-${modalMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                  const isSelected = selectedGridDays.includes(dateStr);
                  const status = soldierMonthlyGridState[dateStr] || '';

                  // Status background styling
                  let colorClass = 'bg-white text-slate-700 border-slate-200 hover:border-slate-300';
                  if (status === 'ح') colorClass = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black';
                  else if (status === 'غ') colorClass = 'bg-rose-100 text-rose-950 border-rose-300 font-black';
                  else if (status === 'إ') colorClass = 'bg-blue-100 text-blue-950 border-blue-300 font-black';
                  else if (status === 'م') colorClass = 'bg-purple-100 text-purple-950 border-purple-300 font-black';
                  else if (status === 'ع') colorClass = 'bg-amber-100 text-amber-950 border-amber-300 font-black';
                  else if (status === 'ن') colorClass = 'bg-slate-200 text-slate-900 border-slate-300 font-black';

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleToggleGridDay(dateStr)}
                      className={`h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 relative ${
                        isSelected 
                          ? 'ring-2 ring-amber-500 bg-amber-200/90 border-amber-500 text-amber-950 font-black shadow-sm scale-102 z-10' 
                          : colorClass
                      }`}
                    >
                      <span className={`text-[10px] font-mono leading-none ${isSelected ? 'font-black text-amber-900' : 'text-slate-500'}`}>
                        {dayNum}
                      </span>
                      <span className="text-xs font-black mt-0.5 leading-none">
                        {status ? status : '-'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status Action Buttons Palette */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-black text-slate-800 block">اختر حالة التحضير للأيام المحددة:</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('ح')}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>🟢</span>
                    <span>حاضر (ح)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('غ')}
                    className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>🔴</span>
                    <span>غائب (غ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('إ')}
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>🔵</span>
                    <span>إجازة (إ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('م')}
                    className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>🟣</span>
                    <span>مهمة (م)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('ع')}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>🟡</span>
                    <span>بعذر (ع)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('ن')}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>⚪</span>
                    <span>نوبتية (ن)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStatusToSelectedGridDays('')}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95 col-span-1"
                    title="تفريغ الحضور للأيام المحددة"
                  >
                    <span>✖</span>
                    <span>مسح</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer / Save Action */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsMonthlySaveConfirmOpen(true)}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>حفظ التحضير الشهري للفرد</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog before applying monthly changes */}
      {isMonthlySaveConfirmOpen && activeMonthlySoldier && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-60 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full shadow-2xl p-5 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">تأكيد حفظ التحضير الشهري</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من حفظ وتطبيق سجلات التحضير الشهري للعسكري:
              </p>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold text-emerald-950 text-xs mt-2">
                {activeMonthlySoldier.rank} / {activeMonthlySoldier.fullName}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                لشهر <span className="font-bold text-slate-800">{modalMonth}/{modalYear}</span> بالنظام كاملاً؟
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSaveMonthlyAttendance}
                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                تأكيد وحفظ بالنظام
              </button>
              <button
                type="button"
                onClick={() => setIsMonthlySaveConfirmOpen(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
