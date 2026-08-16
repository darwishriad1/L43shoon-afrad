import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building, 
  Users, 
  UserPlus, 
  User as UserIcon,
  ArrowLeftRight, 
  Trash2, 
  Edit, 
  Plus, 
  FolderPlus,
  Search,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Settings,
  ArrowRight,
  RefreshCw,
  FileText,
  Activity,
  X,
  ChevronDown,
  ChevronLeft,
  Copy,
  MoreVertical,
  Layers,
  CheckSquare,
  Square,
  Check,
  Sliders,
  Shield,
  Phone,
  HeartPulse,
  ShieldAlert,
  ArrowUpRight,
  Sun,
  Moon,
  Sparkles,
  SlidersHorizontal,
  GitCompare,
  Printer,
  BarChart3,
  PieChart,
  Eye,
  Award,
  Crown,
  Target,
  TrendingUp,
  UserCheck,
  UserX,
  Star,
  Send,
  Calendar,
  ChevronRight,
  Milestone,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelImporter from './ExcelImporter';
import { Unit, Soldier, User, PrintSettings, AuditLog, AttendanceRecord } from '../types';
import { fetchWithRetry, safeJson } from '../lib/api';
import SoldierProfile from './SoldierProfile';
import SoldierMovementHistoryModal from './SoldierMovementHistoryModal';

interface OrgManagerProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance?: AttendanceRecord[];
  currentUser: { id: string; name: string; role: string; unitId: string | null };
  auditLogs?: AuditLog[];
  printSettings?: PrintSettings;
  selectedSoldierId?: string | null;
  isDarkMode?: boolean;
  onSelectSoldierId?: (id: string | null) => void;
  onAttendanceUpdated?: () => void;
  onImportCompleted?: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
  }) => void;
  onAddUnit: (
    name: string, 
    parentId: string | null, 
    commanderName: string | null,
    type?: string | null,
    location?: string | null,
    approvedStrength?: number | null,
    status?: string | null,
    code?: string | null
  ) => void;
  onEditUnit: (
    id: string, 
    name: string, 
    parentId: string | null, 
    commanderName: string | null,
    type?: string | null,
    location?: string | null,
    approvedStrength?: number | null,
    status?: string | null,
    code?: string | null
  ) => void;
  onDeleteUnit: (id: string) => void;
  onAddSoldier: (militaryNumber: string, fullName: string, rank: string, unitId: string) => void;
  onEditSoldier: (id: string, militaryNumber: string, fullName: string, rank: string, unitId: string, isActive: boolean) => void;
  onDeleteSoldier: (id: string) => void;
  onTransferSoldier: (
    soldierId: string, 
    targetUnitId: string,
    orderDetails?: { orderNumber?: string; orderDate?: string; issuedBy?: string; notes?: string }
  ) => void;
  onAddLog: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

const MILITARY_RANKS = [
  'عميد ركن', 'عقيد ركن', 'عقيد', 'مقدم ركن', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم',
  'رئيس رقباء', 'رقيب أول', 'رقيب', 'وكيل رقيب', 'عريف', 'جندي أول', 'جندي'
];

// 1. Animated Counter Component
const AnimatedCounter = ({ value, duration = 800, prefix = '', suffix = '' }: { value: number; duration?: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = Number(value) || 0;

    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const handle = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(handle);
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString('ar-EG')}{suffix}</span>;
};

// 2. Live Highlighting Search Text Helper
const renderHighlightedText = (text: string, query: string) => {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const escaped = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-amber-300 dark:bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow-2xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

// 3. Breadcrumb Path Finder
const getUnitBreadcrumbPath = (unitId: string | null, allUnits: Unit[]): Unit[] => {
  if (!unitId) return [];
  const path: Unit[] = [];
  let curr = allUnits.find(u => u.id === unitId);
  while (curr) {
    path.unshift(curr);
    curr = allUnits.find(u => u.id === curr?.parentId);
  }
  return path;
};

// 4. Recursive Sub-Unit IDs Gatherer (Unit and all descendants)
const getAllSubUnitIds = (unitId: string, allUnits: Unit[]): string[] => {
  const ids: string[] = [unitId];
  const children = allUnits.filter(u => u.parentId === unitId);
  for (const child of children) {
    ids.push(...getAllSubUnitIds(child.id, allUnits));
  }
  return ids;
};

export default function OrgManager({
  units,
  soldiers,
  attendance: propsAttendance = [],
  currentUser,
  auditLogs: propsAuditLogs = [],
  printSettings,
  selectedSoldierId,
  isDarkMode = false,
  onSelectSoldierId,
  onAttendanceUpdated,
  onImportCompleted: propsOnImportCompleted,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
  onAddSoldier,
  onEditSoldier,
  onDeleteSoldier,
  onTransferSoldier,
  onAddLog
}: OrgManagerProps) {
  // Tabs: Units Management, Soldiers Management
  const [activeTab, setActiveTab] = useState<'units' | 'soldiers'>('soldiers');
  const [selectedProfileSoldierId, setSelectedProfileSoldierId] = useState<string | null>(null);

  // Settings Modal State
  const [isOrgSettingsOpen, setIsOrgSettingsOpen] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'menu' | 'import' | 'export_settings'>('menu');

  // Export Settings Fields Config State
  const EXPORT_FIELDS_OPTIONS = useMemo(() => [
    // البيانات الأساسية والعسكرية
    { id: 'militaryNumber', label: 'الرقم العسكري', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.militaryNumber || '' },
    { id: 'rank', label: 'الرتبة العسكرية', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.rank || '' },
    { id: 'fullName', label: 'الاسم الكامل', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.fullName || '' },
    { id: 'unitName', label: 'الوحدة العسكرية / التشكيل', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier, u: string) => u },
    { id: 'militaryStatus', label: 'الحالة الميدانية', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.militaryStatus || (s.isActive ? 'على رأس العمل' : 'مستبعد') },
    { id: 'isActive', label: 'حالة القوة (نشط / مستبعد)', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.isActive ? 'نشط / جاهز' : 'مستبعد / احتياط' },

    // بيانات الهوية والتواصل
    { id: 'nationalId', label: 'رقم البطاقة / الهوية الوطنية', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.nationalId || '' },
    { id: 'phoneNumber', label: 'رقم الهاتف الخاص', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.phoneNumber || '' },
    { id: 'emergencyContact', label: 'أرقام الطوارئ', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.emergencyContact || '' },
    { id: 'address', label: 'العنوان / مكان السكن', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.address || '' },

    // البيانات الشخصية والطبية
    { id: 'bloodType', label: 'فصيلة الدم', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.bloodType || '' },
    { id: 'birthDate', label: 'تاريخ الميلاد', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.birthDate || '' },
    { id: 'qualification', label: 'المؤهل العلمي', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.qualification || '' },
    { id: 'specialization', label: 'التخصص العسكري / المهني', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.specialization || '' },

    // الهيكل التنظيمي والإداري
    { id: 'joinDate', label: 'تاريخ بدء الخدمة', category: 'الهيكل التنظيمي والإداري', defaultChecked: true, getValue: (s: Soldier) => s.joinDate || '' },
    { id: 'battalion', label: 'الكتيبة', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.battalion || '' },
    { id: 'company', label: 'السرية', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.company || '' },
    { id: 'platoon', label: 'الفصيلة', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.platoon || '' },
  ], []);

  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(() =>
    EXPORT_FIELDS_OPTIONS.filter(f => f.defaultChecked).map(f => f.id)
  );
  const [exportScopeFilter, setExportScopeFilter] = useState<'all' | 'active_only'>('all');

  const toggleExportField = (fieldId: string) => {
    setSelectedExportFields(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleCustomExportExcel = () => {
    if (!soldiers || soldiers.length === 0) {
      alert('لا توجد بيانات أفراد مجهزة للتصدير');
      return;
    }

    if (selectedExportFields.length === 0) {
      alert('يرجى تحديد حقل واحد على الأقل للتصدير');
      return;
    }

    let targetSoldiers = soldiers;
    if (exportScopeFilter === 'active_only') {
      targetSoldiers = soldiers.filter(s => s.isActive);
    }

    if (targetSoldiers.length === 0) {
      alert('لا توجد سجلات أفراد تطابق النطاق المحدد للتصدير');
      return;
    }

    const activeOptions = EXPORT_FIELDS_OPTIONS.filter(opt => selectedExportFields.includes(opt.id));

    const exportData = targetSoldiers.map((soldier, index) => {
      const unitName = units.find(u => u.id === soldier.unitId)?.name || 'غير محدد';
      const rowObj: Record<string, any> = {
        'م': index + 1
      };
      activeOptions.forEach(opt => {
        rowObj[opt.label] = opt.getValue(soldier, unitName);
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف القوة والأفراد');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `كشف_القوة_والأفراد_${todayStr}.xlsx`);

    if (onAddLog) {
      onAddLog('تعديل', 'الأفراد', `تصدير بيانات القوة والأفراد لعدد (${targetSoldiers.length}) فرد بصيغة Excel.`);
    }

    setIsOrgSettingsOpen(false);
    setSettingsSubTab('menu');
  };

  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'الرقم العسكري': '10001',
        'الرتبة العسكرية': 'جندي أول',
        'الاسم الكامل': 'محمد أحمد علي سالم',
        'الوحدة العسكرية': units[0]?.name || 'الكتيبة الأولى',
        'حالة الفرد': 'نشط'
      },
      {
        'الرقم العسكري': '10002',
        'الرتبة العسكرية': 'رقيب',
        'الاسم الكامل': 'خالد عمر حسن صالح',
        'الوحدة العسكرية': units[0]?.name || 'الكتيبة الأولى',
        'حالة الفرد': 'نشط'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_إدخال_الأفراد');
    XLSX.writeFile(workbook, 'نموذج_إدخال_بيانات_الأفراد.xlsx');
  };

  // Sync selectedSoldierId from prop
  useEffect(() => {
    if (selectedSoldierId) {
      setActiveTab('soldiers');
      setSelectedProfileSoldierId(selectedSoldierId);
    }
  }, [selectedSoldierId]);

  // Permissions helper
  const hasWriteAccess = useMemo(() => {
    return currentUser.role === 'admin' || currentUser.role === 'commander_formation';
  }, [currentUser]);

  // UNITS MANAGEMENT LOGIC
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitParentId, setUnitParentId] = useState<string>('');
  const [unitCommander, setUnitCommander] = useState('');
  const [unitType, setUnitType] = useState<string>('كتيبة');
  const [unitLocation, setUnitLocation] = useState('');
  const [unitApprovedStrength, setUnitApprovedStrength] = useState<number>(100);
  const [unitStatus, setUnitStatus] = useState<string>('نشط');
  const [unitCode, setUnitCode] = useState('');

  const handleOpenUnitModal = (unit: Unit | null = null, parentUnitId: string | null = null) => {
    if (!hasWriteAccess) {
      alert('عذراً! ليس لديك صلاحيات لتعديل أو إضافة وحدات عسكرية (متاح لمدير النظام وقائد التشكيل فقط).');
      return;
    }
    if (unit) {
      setEditingUnit(unit);
      setUnitName(unit.name);
      setUnitParentId(unit.parentId || '');
      setUnitCommander(unit.commanderName || '');
      setUnitType(unit.type || 'كتيبة');
      setUnitLocation(unit.location || '');
      setUnitApprovedStrength(unit.approvedStrength || 100);
      setUnitStatus(unit.status || 'نشط');
      setUnitCode(unit.code || '');
    } else {
      setEditingUnit(null);
      setUnitName('');
      setUnitParentId(parentUnitId || '');
      setUnitCommander('');
      setUnitType('كتيبة');
      setUnitLocation('');
      setUnitApprovedStrength(100);
      setUnitStatus('نشط');
      setUnitCode('');
    }
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;

    const parentVal = unitParentId === '' ? null : unitParentId;
    const commanderVal = unitCommander.trim() === '' ? null : unitCommander.trim();

    if (editingUnit) {
      onEditUnit(
        editingUnit.id, 
        unitName, 
        parentVal, 
        commanderVal,
        unitType,
        unitLocation,
        unitApprovedStrength,
        unitStatus,
        unitCode
      );
      onAddLog(
        'تعديل', 
        'الوحدات', 
        `تعديل بيانات الوحدة (${unitName})، المستوى: ${unitType}.`
      );
    } else {
      onAddUnit(
        unitName, 
        parentVal, 
        commanderVal,
        unitType,
        unitLocation,
        unitApprovedStrength,
        unitStatus,
        unitCode
      );
      onAddLog(
        'إضافة', 
        'الوحدات', 
        `إنشاء وحدة عسكرية جديدة باسم (${unitName}) بمستوى (${unitType}).`
      );
    }

    setIsUnitModalOpen(false);
  };

  const handleDeleteUnitClick = (id: string, name: string) => {
    if (!hasWriteAccess) {
      alert('صلاحية مرفوضة لمسح الوحدات العسكرية.');
      return;
    }

    setDeleteTargetType('unit');
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setDeleteVerificationCode('');
    setIsConfirmOpen(true);
  };

  // SOLDIERS MANAGEMENT LOGIC
  const [isSoldierModalOpen, setIsSoldierModalOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [soldierName, setSoldierName] = useState('');
  const [soldierMilNumber, setSoldierMilNumber] = useState('');
  const [soldierRank, setSoldierRank] = useState(MILITARY_RANKS[MILITARY_RANKS.length - 1]);
  const [soldierUnitId, setSoldierUnitId] = useState('');
  const [soldierActive, setSoldierActive] = useState(true);

  // Transfers state
  const [transferSoldierId, setTransferSoldierId] = useState('');
  const [transferTargetUnitId, setTransferTargetUnitId] = useState('');
  const [transferOrderNumber, setTransferOrderNumber] = useState('');
  const [transferOrderDate, setTransferOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferIssuedBy, setTransferIssuedBy] = useState('قيادة اللواء');
  const [transferNotes, setTransferNotes] = useState('سد الشواغر وملاك القوة التنظيمية');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Movement History Modal state
  const [isMovementHistoryModalOpen, setIsMovementHistoryModalOpen] = useState(false);
  const [movementHistorySoldier, setMovementHistorySoldier] = useState<Soldier | null>(null);

  const handleOpenMovementHistory = (soldier: Soldier) => {
    setMovementHistorySoldier(soldier);
    setIsMovementHistoryModalOpen(true);
  };

  // Search and filter for soldiers
  const [soldierSearch, setSoldierSearch] = useState('');
  const [soldierUnitFilter, setSoldierUnitFilter] = useState('all');
  const [soldierRankFilter, setSoldierRankFilter] = useState('all');
  const [soldierStatusFilter, setSoldierStatusFilter] = useState('all');

  // Search results
  const [searchedSoldiers, setSearchedSoldiers] = useState<Soldier[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loadingSoldiers, setLoadingSoldiers] = useState<boolean>(false);
  const [soldierSearchError, setSoldierSearchError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Virtual Scroll State
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);
  const [mobileScrollTop, setMobileScrollTop] = useState(0);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(soldierSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [soldierSearch]);

  const fetchSoldiers = async (pageIndex: number, resetList: boolean) => {
    setLoadingSoldiers(true);
    setSoldierSearchError(null);
    try {
      const limit = 30;
      const offset = pageIndex * limit;
      
      const params = new URLSearchParams({
        q: debouncedSearch,
        rank: soldierRankFilter,
        unitId: soldierUnitFilter,
        isActive: soldierStatusFilter,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const res = await fetchWithRetry(`/api/soldiers/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error('فشل جلب البيانات من الخادم العسكري');
      }
      const data = await safeJson(res, { results: [], totalCount: 0 });
      
      if (resetList) {
        setSearchedSoldiers(data.results);
      } else {
        setSearchedSoldiers(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newItems = data.results.filter((s: Soldier) => !existingIds.has(s.id));
          return [...prev, ...newItems];
        });
      }
      
      setTotalCount(data.totalCount);
      setPage(pageIndex);
      setHasMore(data.results.length === limit);
    } catch (err: any) {
      console.error("Error fetching soldiers:", err);
      setSoldierSearchError(err.message || 'خطأ غير متوقع في النظام');
    } finally {
      setLoadingSoldiers(false);
    }
  };

  // Always fetch soldiers on component mount and filter change
  useEffect(() => {
    if (activeTab === 'soldiers') {
      fetchSoldiers(0, true);
      setDesktopScrollTop(0);
      setMobileScrollTop(0);
      if (desktopContainerRef.current) desktopContainerRef.current.scrollTop = 0;
      if (mobileContainerRef.current) mobileContainerRef.current.scrollTop = 0;
    }
  }, [debouncedSearch, soldierRankFilter, soldierUnitFilter, soldierStatusFilter, activeTab]);

  // Deletion Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'soldier' | 'unit' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [deleteVerificationCode, setDeleteVerificationCode] = useState('');

  const activeSoldiersCount = useMemo(() => {
    if (!deleteTargetId || deleteTargetType !== 'unit') return 0;
    return soldiers.filter(s => s.unitId === deleteTargetId && s.isActive).length;
  }, [deleteTargetId, deleteTargetType, soldiers]);

  // Units Filter & State
  const [searchUnitQuery, setSearchUnitQuery] = useState('');
  const [filterNoCommanderOnly, setFilterNoCommanderOnly] = useState(false);
  const [selectedTreeUnitId, setSelectedTreeUnitId] = useState<string | null>(null);
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());
  const [quickActionUnitId, setQuickActionUnitId] = useState<string | null>(null);

  // Skeleton Loading, Toast Notification System & Popover State
  const [isUnitLoading, setIsUnitLoading] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [popoverUnit, setPopoverUnit] = useState<Unit | null>(null);
  const [popoverTab, setPopoverTab] = useState<'reports' | 'comparison' | 'operations' | 'management'>('reports');
  const [popoverSearch, setPopoverSearch] = useState<string>('');

  // Pinned / Bookmarked Favorite Units
  const [pinnedUnitIds, setPinnedUnitIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pinnedUnitIds');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const togglePinUnit = (unitId: string) => {
    setPinnedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
        showToast('تم إزالة التشكيل من قائمة الوصول السريع المفضلة', 'info');
      } else {
        next.add(unitId);
        showToast('تم تثبيت التشكيل في الوصول السريع بنجاح ★', 'success');
      }
      try { localStorage.setItem('pinnedUnitIds', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Quick Roll Call & Quick Mass Transfer Modals
  const [quickRollCallModal, setQuickRollCallModal] = useState<{
    unit: Unit;
    items: { id: string; fullName: string; rank: string; militaryNumber: string; militaryStatus: string; isActive: boolean; unitName: string }[];
  } | null>(null);

  const [quickMassTransferModal, setQuickMassTransferModal] = useState<{
    unit: Unit;
    selectedSoldierIds: string[];
    destinationUnitId: string;
    orderNotes: string;
  } | null>(null);

  // Operational Order Directive Modal State
  const [opOrderModal, setOpOrderModal] = useState<{
    unit: Unit;
    taskTitle: string;
    priority: 'عاجل جداً' | 'عادي' | 'سري للغاية' | 'مهمة ميدانية';
    location: string;
    instructions: string;
  } | null>(null);

  // Advanced Contextual Popover & Report Modals State
  const [activeReportModal, setActiveReportModal] = useState<{
    unit: Unit;
    type: 'roster' | 'attendance' | 'absence' | 'dossier' | 'leadership' | 'ranks' | 'matrix';
  } | null>(null);

  const [activeComparisonModal, setActiveComparisonModal] = useState<{
    unit: Unit;
    parallelUnits: Unit[];
  } | null>(null);

  const [reportSubUnitFilter, setReportSubUnitFilter] = useState<string>('all');

  const handleExportReportExcel = (targetUnit: Unit, reportType: string) => {
    const subUnitIds = getAllSubUnitIds(targetUnit.id, units);
    const targetSoldiers = soldiers.filter(s => subUnitIds.includes(s.unitId));

    if (targetSoldiers.length === 0) {
      alert('لا يوجد أفراد مسجلون في هذه الوحدة أو تبعياتها للتصدير.');
      return;
    }

    const exportData = targetSoldiers.map((s, idx) => {
      const unitObj = units.find(u => u.id === s.unitId);
      return {
        'م': idx + 1,
        'الرقم العسكري': s.militaryNumber || '',
        'الرتبة العسكرية': s.rank || '',
        'الاسم الكامل': s.fullName || '',
        'الوحدة الفرعية': unitObj?.name || 'غير محدد',
        'كود الوحدة': unitObj?.code || '',
        'الحالة الميدانية': s.militaryStatus || (s.isActive ? 'على رأس العمل' : 'مستبعد'),
        'رقم التواصل': s.phoneNumber || '',
        'رقم الطوارئ': s.emergencyContact || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `تقرير_${reportType}`);
    XLSX.writeFile(workbook, `تقرير_${targetUnit.name}_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);

    if (onAddLog) {
      onAddLog('تعديل', 'الوحدات', `تصدير تقرير (${reportType}) لـ (${targetUnit.name}) وتبعيته لعدد (${targetSoldiers.length}) فرد.`);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 3500);
  };

  const handleSelectTreeUnit = (unitId: string) => {
    if (selectedTreeUnitId !== unitId) {
      triggerHaptic(12);
      setIsUnitLoading(true);
      setSelectedTreeUnitId(unitId);
      setTimeout(() => {
        setIsUnitLoading(false);
      }, 350);
    }
  };

  const handleCopyUnitData = (unit: Unit) => {
    const unitSoldiers = soldiers.filter(s => s.unitId === unit.id);
    const activeCount = unitSoldiers.filter(s => s.isActive).length;
    const totalCount = unitSoldiers.length;
    const readiness = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    
    const text = `📋 بيانات التشكيل العسكري:
• الاسم: ${unit.name}
• التعرّف: ${unit.type || 'تشكيل عسكري'} (${unit.code || 'بلا رمز'})
• القائد: ${unit.commanderName || 'شاغر'}
• الموقع: ${unit.location || 'غير محدد'}
• الجاهزية التشغيلية: ${readiness}%
• القوة العاملة: ${activeCount} / ${totalCount} فرد
• الملاك المعتمد: ${unit.approvedStrength || 100} فرد`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      showToast(`تم نسخ بيانات "${unit.name}" إلى الحافظة بنجاح 📋`, 'success');
    } else {
      showToast(`بيانات "${unit.name}" جاهزة للعرض`, 'info');
    }
  };

  // Touch / Long Press timer for hidden context actions on mobile
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = (ms: number = 15) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(ms);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleUnitTouchStart = (unitId: string) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      triggerHaptic(35);
      setQuickActionUnitId(prev => (prev === unitId ? null : unitId));
    }, 450);
  };

  const handleUnitTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Smart Search Auto-Expander Effect: automatically expands ancestor nodes when searching
  useEffect(() => {
    if (searchUnitQuery.trim() !== '') {
      const query = searchUnitQuery.toLowerCase();
      const matchingUnitIds = units.filter(u => 
        u.name.toLowerCase().includes(query) || 
        (u.commanderName && u.commanderName.toLowerCase().includes(query))
      ).map(u => u.id);

      setExpandedUnitIds(prev => {
        const next = new Set(prev);
        matchingUnitIds.forEach(id => {
          let current = units.find(u => u.id === id);
          while (current && current.parentId) {
            next.add(current.parentId);
            current = units.find(u => u.id === current?.parentId);
          }
        });
        return next;
      });
    }
  }, [searchUnitQuery, units]);

  // Bulk Transfer Service
  const [bulkSourceUnitId, setBulkSourceUnitId] = useState('');
  const [bulkTargetUnitId, setBulkTargetUnitId] = useState('');
  const [bulkTransferMsg, setBulkTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBulkTransferCard, setShowBulkTransferCard] = useState(false);

  // Official Military Warrant Order Modal
  const [showOfficialWarrant, setShowOfficialWarrant] = useState(false);
  const [selectedWarrantUnitId, setSelectedWarrantUnitId] = useState('');

  // Helper to count descendants
  const getRecursiveDescendantsCount = (unitId: string | undefined, allUnits: Unit[]): number => {
    if (!unitId) return 0;
    let count = 0;
    const directChildren = allUnits.filter(u => u.parentId === unitId);
    count += directChildren.length;
    directChildren.forEach(child => {
      count += getRecursiveDescendantsCount(child.id, allUnits);
    });
    return count;
  };

  // Helper for unit type badge
  const getUnitTypeBadge = (type?: string | null) => {
    const t = (type || '').trim();
    if (t.includes('لواء') || t.includes('قوات') || t.includes('قيادة')) {
      return { label: 'لواء', icon: '🏛️', color: 'text-amber-800 bg-amber-50 border-amber-200' };
    }
    if (t.includes('كتيبة')) {
      return { label: 'كتيبة', icon: '⚔️', color: 'text-orange-800 bg-orange-50 border-orange-200' };
    }
    if (t.includes('سرية')) {
      return { label: 'سرية', icon: '🛡️', color: 'text-sky-800 bg-sky-50 border-sky-200' };
    }
    if (t.includes('فصيل') || t.includes('فصيلة')) {
      return { label: 'فصيلة', icon: '👥', color: 'text-blue-800 bg-blue-50 border-blue-200' };
    }
    return { label: t || 'تشكيل', icon: '🎖️', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
  };

  const toggleUnitExpanded = (unitId: string) => {
    setExpandedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (units.length > 0) {
      const rootIds = units.filter(u => !u.parentId).map(u => u.id);
      setExpandedUnitIds(prev => {
        const next = new Set(prev);
        rootIds.forEach(id => next.add(id));
        return next;
      });
      if (!selectedTreeUnitId && units[0]) {
        setSelectedTreeUnitId(units[0].id);
      }
    }
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      if (searchUnitQuery.trim() !== '') {
        const query = searchUnitQuery.toLowerCase();
        const nameMatch = unit.name.toLowerCase().includes(query);
        const cmdMatch = unit.commanderName ? unit.commanderName.toLowerCase().includes(query) : false;
        if (!nameMatch && !cmdMatch) return false;
      }
      if (filterNoCommanderOnly && unit.commanderName) {
        return false;
      }
      return true;
    });
  }, [units, searchUnitQuery, filterNoCommanderOnly]);

  const selectedTreeUnit = useMemo(() => {
    if (!selectedTreeUnitId) return filteredUnits[0] || null;
    return units.find(u => u.id === selectedTreeUnitId) || filteredUnits[0] || null;
  }, [selectedTreeUnitId, units, filteredUnits]);

  // Modal Handlers
  const handleOpenSoldierModal = (soldier: Soldier | null = null) => {
    if (soldier) {
      setEditingSoldier(soldier);
      setSoldierName(soldier.fullName);
      setSoldierMilNumber(soldier.militaryNumber);
      setSoldierRank(soldier.rank);
      setSoldierUnitId(soldier.unitId);
      setSoldierActive(soldier.isActive);
    } else {
      setEditingSoldier(null);
      setSoldierName('');
      setSoldierMilNumber('');
      setSoldierRank(MILITARY_RANKS[MILITARY_RANKS.length - 1]);
      setSoldierUnitId(units[0]?.id || '');
      setSoldierActive(true);
    }
    setIsSoldierModalOpen(true);
  };

  const handleSaveSoldier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldierName.trim() || !soldierMilNumber.trim() || !soldierUnitId) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم الكامل، الرقم العسكري، والوحدة).');
      return;
    }

    if (editingSoldier) {
      onEditSoldier(
        editingSoldier.id,
        soldierMilNumber.trim(),
        soldierName.trim(),
        soldierRank,
        soldierUnitId,
        soldierActive
      );
      onAddLog('تعديل', 'الأفراد', `تعديل بيانات العسكري (${soldierName})، الرقم: ${soldierMilNumber}.`);
    } else {
      onAddSoldier(
        soldierMilNumber.trim(),
        soldierName.trim(),
        soldierRank,
        soldierUnitId
      );
      onAddLog('إضافة', 'الأفراد', `تسجيل عسكري جديد باسم (${soldierName}) بالرقم العسكري (${soldierMilNumber}).`);
    }

    setIsSoldierModalOpen(false);
    fetchSoldiers(0, true);
  };

  const handleDeleteSoldierClick = (id: string, name: string) => {
    if (!hasWriteAccess) {
      alert('صلاحية مرفوضة لمسح بيانات الأفراد.');
      return;
    }
    setDeleteTargetType('soldier');
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setDeleteVerificationCode('');
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteVerificationCode !== 'تأكيد') return;

    if (deleteTargetType === 'soldier') {
      onDeleteSoldier(deleteTargetId);
      onAddLog('حذف', 'الأفراد', `مسح سجل العسكري (${deleteTargetName}) من القوة.`);
      fetchSoldiers(0, true);
    } else if (deleteTargetType === 'unit') {
      onDeleteUnit(deleteTargetId);
      onAddLog('حذف', 'الوحدات', `مسح الوحدة العسكرية (${deleteTargetName}) من الهيكل التنظيمي.`);
    }

    setIsConfirmOpen(false);
    setDeleteTargetType(null);
    setDeleteTargetId('');
    setDeleteTargetName('');
    setDeleteVerificationCode('');
  };

  const handleOpenTransfer = (soldier: Soldier) => {
    setTransferSoldierId(soldier.id);
    const availableTargets = units.filter(u => u.id !== soldier.unitId);
    setTransferTargetUnitId(availableTargets[0]?.id || '');
    setTransferOrderNumber(`ق/${Math.floor(100 + Math.random() * 900)}//2026`);
    setIsTransferOpen(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSoldierId || !transferTargetUnitId) return;

    onTransferSoldier(transferSoldierId, transferTargetUnitId, {
      orderNumber: transferOrderNumber,
      orderDate: transferOrderDate,
      issuedBy: transferIssuedBy,
      notes: transferNotes
    });

    const soldier = soldiers.find(s => s.id === transferSoldierId);
    const targetUnit = units.find(u => u.id === transferTargetUnitId);
    onAddLog('تعديل', 'الأفراد', `نقل العسكري (${soldier?.fullName}) إلى الوحدة (${targetUnit?.name}) بموجب الأمر (${transferOrderNumber}).`);

    setIsTransferOpen(false);
    fetchSoldiers(0, true);
  };

  const handleBulkForceTransfer = async () => {
    if (!bulkSourceUnitId || !bulkTargetUnitId) {
      setBulkTransferMsg({ type: 'error', text: 'يرجى اختيار الوحدة المصدر والوحدة المستقبلة أولاً.' });
      return;
    }
    if (bulkSourceUnitId === bulkTargetUnitId) {
      setBulkTransferMsg({ type: 'error', text: 'لا يمكن نقل القوة إلى نفس الوحدة المصدر.' });
      return;
    }

    const sourceSoldiers = soldiers.filter(s => s.unitId === bulkSourceUnitId);
    if (sourceSoldiers.length === 0) {
      setBulkTransferMsg({ type: 'error', text: 'لا يوجد أفراد منتسبين للوحدة المصدر المحددة.' });
      return;
    }

    const sourceUnitName = units.find(u => u.id === bulkSourceUnitId)?.name || '';
    const targetUnitName = units.find(u => u.id === bulkTargetUnitId)?.name || '';

    let count = 0;
    sourceSoldiers.forEach(s => {
      onTransferSoldier(s.id, bulkTargetUnitId, {
        orderNumber: `دمج-مباشر/${Date.now().toString().slice(-4)}`,
        notes: `نقل جماعي من ${sourceUnitName} إلى ${targetUnitName}`
      });
      count++;
    });

    onAddLog('تعديل', 'الأفراد', `دمج مباشر ونقل جماعي لعدد (${count}) عسكري من (${sourceUnitName}) إلى (${targetUnitName}).`);
    setBulkTransferMsg({ type: 'success', text: `تم بنجاح نقل ودمج جميع الأفراد (${count} عسكري) إلى ${targetUnitName}.` });
    setBulkSourceUnitId('');
    setBulkTargetUnitId('');
    fetchSoldiers(0, true);
  };

  // Render tree node
  const renderInteractiveTreeNode = (unit: Unit, depth: number = 0) => {
    const children = filteredUnits.filter(u => u.parentId === unit.id);
    const unitSoldiers = soldiers.filter(s => s.unitId === unit.id);
    const activeForce = unitSoldiers.filter(s => s.isActive).length;
    const totalForce = unitSoldiers.length;
    const readiness = totalForce > 0 ? Math.round((activeForce / totalForce) * 100) : 0;
    const isExpanded = expandedUnitIds.has(unit.id);
    const isSelected = selectedTreeUnitId === unit.id;
    const isQuickAction = quickActionUnitId === unit.id;
    const typeInfo = getUnitTypeBadge(unit.type);

    return (
      <div key={unit.id} className="space-y-1 text-right select-none font-sans">
        <div 
          onClick={() => handleSelectTreeUnit(unit.id)}
          onTouchStart={() => handleUnitTouchStart(unit.id)}
          onTouchEnd={handleUnitTouchEnd}
          onMouseDown={() => handleUnitTouchStart(unit.id)}
          onMouseUp={handleUnitTouchEnd}
          onMouseLeave={handleUnitTouchEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            triggerHaptic(25);
            setPopoverUnit(unit);
          }}
          className={`relative group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer overflow-hidden backdrop-blur-xl ${
            isSelected
              ? isDarkMode
                ? 'bg-emerald-950/60 border-emerald-500 shadow-xl ring-2 ring-emerald-500/40 text-emerald-100 font-extrabold scale-[1.01]'
                : 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/30 text-emerald-950 font-extrabold scale-[1.01]' 
              : isDarkMode
                ? 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 text-slate-200'
                : 'bg-white/80 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
          }`}
          style={{ marginRight: depth > 0 ? `${Math.min(depth * 0.85, 2.2)}rem` : 0 }}
        >
          {/* Long Press Quick Context Ribbon with Spring Physics */}
          {isQuickAction && (
            <div className="absolute inset-0 bg-rose-950/95 backdrop-blur-md z-10 flex items-center justify-between px-3 animate-in fade-in slide-in-from-left duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-white">
              <span className="text-[11px] font-black flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                خيارات عاجلة لـ {unit.name}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickActionUnitId(null);
                    setPopoverUnit(unit);
                  }}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 rounded-lg text-[10px] font-bold"
                >
                  القائمة المتقدمة
                </button>
                {hasWriteAccess && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickActionUnitId(null);
                      handleDeleteUnitClick(unit.id, unit.name);
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                  >
                    حذف عاجل
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickActionUnitId(null);
                  }}
                  className="p-1 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 min-w-0">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(12);
                  toggleUnitExpanded(unit.id);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 border ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title={isExpanded ? "طي التشكيل" : "توسيع التشكيل"}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-slate-400 text-[10px] shrink-0">●</div>
            )}

            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-extrabold flex items-center gap-1 shrink-0 ${typeInfo.color}`}>
              <span>{typeInfo.icon}</span>
              <span>{typeInfo.label}</span>
            </span>

            <span className="font-extrabold text-xs sm:text-sm truncate">
              {renderHighlightedText(unit.name, searchUnitQuery)}
            </span>

            {unit.code && (
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 hidden sm:inline-block ${
                isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {unit.code}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border transition-all ${
              readiness >= 85 
                ? isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : readiness >= 50 
                ? isDarkMode ? 'bg-amber-950/80 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'
                : isDarkMode ? 'bg-rose-950/80 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {readiness}% جاهزية
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(15);
                setPopoverUnit(unit);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
              title="خيارات إضافية"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="mt-1 space-y-1.5 border-r-2 border-emerald-500/40 pr-2 mr-1">
            {children.map(child => renderInteractiveTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-2.5 text-right font-sans transition-colors duration-200 ${isDarkMode ? 'dark text-slate-100' : ''}`} dir="rtl">
      {/* Tab Switcher Panel & Dynamic Dark Mode Toggle */}
      <div className={`p-1.5 sm:p-2 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 backdrop-blur-md transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className={`grid grid-cols-2 flex-1 sm:flex-initial p-0.5 rounded-xl gap-1 border ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => {
                triggerHaptic(10);
                setActiveTab('units');
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'units' 
                  ? 'bg-emerald-800 text-white shadow-xs' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>الهيكل والوحدات ({units.length})</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic(10);
                setActiveTab('soldiers');
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-md text-xs font-black transition-all cursor-pointer ${
                activeTab === 'soldiers' 
                  ? 'bg-emerald-800 text-white shadow-xs' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>القوة والأفراد ({soldiers.length})</span>
            </button>
          </div>
        </div>

        {currentUser.role !== 'operations' && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {activeTab === 'units' ? (
              <button
                onClick={() => {
                  triggerHaptic(12);
                  handleOpenUnitModal(null);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>إضافة وحدة عسكرية</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    triggerHaptic(12);
                    handleOpenSoldierModal(null);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>تسجيل عسكري جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setSettingsSubTab('menu');
                    setIsOrgSettingsOpen(true);
                  }}
                  className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer shrink-0"
                  title="إعدادات القوة والأفراد (تصدير واستيراد Excel)"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">إكسل وتصدير</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: UNITS HIERARCHY TREE */}
      {activeTab === 'units' && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          
          {/* Dual Split Section: Main Tree & Selected Details Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Units Tree Panel */}
            <div className={`lg:col-span-7 p-3 sm:p-4 rounded-2xl border shadow-lg backdrop-blur-md space-y-2.5 transition-all ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b pb-2 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                {/* Breadcrumb replacing heading "شجرة القيادة والتكوينات الهيكلية" */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-extrabold flex-1 min-w-0">
                  <Building className="w-4 h-4 text-emerald-500 shrink-0 ml-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      const rootUnit = units.find(u => !u.parentId);
                      if (rootUnit) handleSelectTreeUnit(rootUnit.id);
                    }}
                    className={`px-1.5 py-0.5 rounded transition-all shrink-0 cursor-pointer flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-800 ${
                      !selectedTreeUnitId ? 'bg-emerald-800 text-white font-black' : ''
                    }`}
                    title="الرئيسية"
                  >
                    <span>الرئيسية</span>
                  </button>

                  {getUnitBreadcrumbPath(selectedTreeUnitId, units).map((item) => {
                    const codeText = item.code 
                      ? (item.code.startsWith('[') ? item.code : `[${item.code}]`)
                      : `[${item.name}]`;
                    return (
                      <React.Fragment key={item.id}>
                        <ChevronLeft className="w-3 h-3 text-slate-400 shrink-0" />
                        <button
                          type="button"
                          onClick={() => handleSelectTreeUnit(item.id)}
                          title={item.name}
                          className={`px-1.5 py-0.5 rounded font-mono text-xs font-black transition-all shrink-0 cursor-pointer border ${
                            item.id === selectedTreeUnitId
                              ? 'bg-emerald-800 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          {codeText}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {/* Smart Search Input */}
                  <div className="relative w-36 sm:w-44">
                    <Search className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ابحث عن وحدة..."
                      value={searchUnitQuery}
                      onChange={(e) => setSearchUnitQuery(e.target.value)}
                      className={`w-full pr-8 pl-2 py-1 border rounded-xl text-xs font-bold focus:outline-hidden transition-all font-sans ${
                        isDarkMode 
                          ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-700'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-slate-400">
                    <button
                      type="button"
                      onClick={() => setExpandedUnitIds(new Set(units.map(u => u.id)))}
                      className="hover:text-emerald-500 underline cursor-pointer"
                    >
                      توسيع
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setExpandedUnitIds(new Set())}
                      className="hover:text-emerald-500 underline cursor-pointer"
                    >
                      طي
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[550px] overflow-y-auto pl-1">
                {filteredUnits.filter(u => !u.parentId).map(rootUnit => renderInteractiveTreeNode(rootUnit, 0))}

                {filteredUnits.length === 0 && (
                  <div className={`p-6 text-center rounded-xl border text-xs font-bold ${
                    isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    لا توجد وحدات عسكرية مطابقة لشروط البحث.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Unit Details Dashboard Card */}
            <div className="lg:col-span-5">
              {isUnitLoading ? (
                /* Shimmer Skeleton Loader */
                <div className={`p-4 rounded-2xl border shadow-xl backdrop-blur-xl space-y-4 animate-pulse relative overflow-hidden ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
                }`}>
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200/50 dark:border-slate-800">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3"></div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/3"></div>
                    </div>
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full"></div>
                  <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                    <div className="h-2 bg-slate-200/80 dark:bg-slate-800/60 rounded-full w-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
                    <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
                  </div>
                  <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                  </div>
                </div>
              ) : selectedTreeUnit ? (
                <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-xl space-y-3 sticky top-2 transition-all relative overflow-hidden ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900'
                }`}>
                  {/* Subtle Ambient Glow */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className={`flex items-start justify-between border-b pb-2.5 ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{getUnitTypeBadge(selectedTreeUnit.type).icon}</span>
                        <h5 className="font-black text-sm sm:text-base">{selectedTreeUnit.name}</h5>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedTreeUnit.type || 'تشكيل عسكري'} {selectedTreeUnit.location ? `• 📍 ${selectedTreeUnit.location}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyUnitData(selectedTreeUnit)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                        title="نسخ بيانات التشكيل"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${
                        selectedTreeUnit.commanderName 
                          ? isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : isDarkMode ? 'bg-rose-950/80 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {selectedTreeUnit.commanderName ? 'قيادة معينة' : 'قيادة شاغرة'}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const selSoldiers = soldiers.filter(s => s.unitId === selectedTreeUnit.id);
                    const activeSel = selSoldiers.filter(s => s.isActive).length;
                    const totalSel = selSoldiers.length;
                    const readinessSel = totalSel > 0 ? Math.round((activeSel / totalSel) * 100) : 0;
                    const directChildUnits = units.filter(u => u.parentId === selectedTreeUnit.id);
                    const parentUnit = units.find(u => u.id === selectedTreeUnit.parentId);

                    return (
                      <div className="space-y-3">

                        {/* Operational Readiness Meter with Animated Progress Bar */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${
                          isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex justify-between items-center text-xs font-black">
                            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>مؤشر الجاهزية التشغيلية:</span>
                            <span className={
                              readinessSel >= 85 
                                ? 'text-emerald-500 font-black' 
                                : readinessSel >= 50 
                                ? 'text-amber-500 font-black' 
                                : 'text-rose-500 font-black'
                            }>
                              <AnimatedCounter value={readinessSel} suffix="%" />
                            </span>
                          </div>
                          <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 ${
                            isDarkMode ? 'bg-slate-900' : 'bg-slate-200'
                          }`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                                readinessSel >= 85 
                                  ? 'from-emerald-600 to-teal-400' 
                                  : readinessSel >= 50 
                                  ? 'from-amber-500 to-yellow-400' 
                                  : 'from-rose-600 to-red-400'
                              }`}
                              style={{ width: `${readinessSel}%` }}
                            />
                          </div>
                        </div>

                        {/* Force Stats Grid with Animated Counters */}
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className={`p-2 rounded-xl border ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>وحدات فرعية</div>
                            <div className="text-xs sm:text-sm font-black text-emerald-500 mt-0.5">
                              <AnimatedCounter value={directChildUnits.length} />
                            </div>
                          </div>
                          <div className={`p-2 rounded-xl border ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>القوة العاملة</div>
                            <div className="text-xs sm:text-sm font-black mt-0.5">
                              <AnimatedCounter value={activeSel} /> / <AnimatedCounter value={totalSel} />
                            </div>
                          </div>
                        </div>

                        {/* Leadership & Administrative Hierarchy details */}
                        <div className={`space-y-1.5 text-xs p-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>قائد التشكيل:</span>
                            <span className="font-bold">{selectedTreeUnit.commanderName || 'غير معين (شاغر)'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>ملاك القوة المعتمد:</span>
                            <span className="font-bold text-emerald-500">
                              <AnimatedCounter value={selectedTreeUnit.approvedStrength || 100} suffix=" فرد" />
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>التبعية الإدارية:</span>
                            <span className="font-bold">{parentUnit?.name || 'قيادة رئيسية'}</span>
                          </div>
                        </div>

                        {/* Action Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {hasWriteAccess && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic(10);
                                handleOpenUnitModal(null, selectedTreeUnit.id);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة فرعية</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(10);
                              setSelectedWarrantUnitId(selectedTreeUnit.id);
                              setShowOfficialWarrant(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-800 hover:bg-sky-900 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>عرض الوثيقة</span>
                          </button>

                          {hasWriteAccess && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(10);
                                  handleOpenUnitModal(selectedTreeUnit);
                                }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs active:scale-95 ${
                                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800'
                                }`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(15);
                                  handleDeleteUnitClick(selectedTreeUnit.id, selectedTreeUnit.name);
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>مسح التشكيل</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className={`p-6 text-center border rounded-2xl font-bold text-xs ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  اختر أي وحدة عسكرية للتحكم بها وإدارتها.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SOLDIERS MANAGEMENT */}
      {activeTab === 'soldiers' && (
        selectedProfileSoldierId ? (
          <SoldierProfile 
            soldierId={selectedProfileSoldierId}
            currentUser={currentUser}
            units={units}
            printSettings={printSettings}
            onClose={() => {
              setSelectedProfileSoldierId(null);
              onSelectSoldierId?.(null);
            }}
            onSoldierUpdated={() => {
              fetchSoldiers(0, true);
            }}
            onAttendanceUpdated={onAttendanceUpdated}
            onOpenTransfer={(soldier) => {
              handleOpenTransfer(soldier);
            }}
          />
        ) : (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 sm:space-y-4 animate-in fade-in duration-150">
            
            {/* Mobile-Friendly Search & Filters */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 w-full">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                  <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ابحث بالاسم، الرقم العسكري..."
                    value={soldierSearch}
                    onChange={(e) => setSoldierSearch(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-lg text-xs font-bold focus:outline-hidden focus:border-emerald-700 transition-all font-sans"
                  />
                </div>

                {/* Unit Dropdown */}
                {currentUser.role !== 'commander_unit' && currentUser.role !== 'data_writer' ? (
                  <select
                    value={soldierUnitFilter}
                    onChange={(e) => setSoldierUnitFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="all">كل الوحدات</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800 shrink-0">
                    الكتيبة
                  </div>
                )}

                {/* Rank Filter */}
                <select
                  value={soldierRankFilter}
                  onChange={(e) => setSoldierRankFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[120px] truncate"
                >
                  <option value="all">كل الرتب</option>
                  {MILITARY_RANKS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={soldierStatusFilter}
                  onChange={(e) => setSoldierStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[110px] truncate"
                >
                  <option value="all">كل الحالات</option>
                  <option value="true">نشط / جاهز</option>
                  <option value="false">مستبعد / احتياط</option>
                </select>
              </div>

              {/* Match Count Badge */}
              <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-200">
                {loadingSoldiers && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                    <span>جاري التحميل...</span>
                  </div>
                )}
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-black font-sans whitespace-nowrap">
                  العدد: {totalCount}
                </span>
              </div>
            </div>

            {/* Soldiers Content List */}
            {soldierSearchError ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-center max-w-md mx-auto my-4 font-sans">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                <h4 className="font-extrabold text-xs">حدث خطأ أثناء تحميل السجلات</h4>
                <p className="text-xs text-rose-600 mt-1">{soldierSearchError}</p>
                <button
                  onClick={() => fetchSoldiers(0, true)}
                  className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : loadingSoldiers && searchedSoldiers.length === 0 ? (
              <div className="p-12 text-center font-sans">
                <RefreshCw className="w-7 h-7 text-emerald-800 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">جاري تحميل سجلات القوة والأفراد...</p>
              </div>
            ) : searchedSoldiers.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-center text-slate-500 font-bold text-xs max-w-md mx-auto my-4 font-sans">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                لا توجد سجلات تطابق البحث المحدد.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div 
                  ref={desktopContainerRef}
                  onScroll={(e) => setDesktopScrollTop(e.currentTarget.scrollTop)}
                  className="hidden lg:block overflow-auto rounded-xl border border-slate-200 max-h-[600px] relative scroll-smooth"
                >
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white border-b border-slate-800 font-sans sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 font-black text-center w-28">الرقم العسكري</th>
                        <th className="py-3 px-4 font-black">الاسم الكامل والمنصب</th>
                        <th className="py-3 px-4 font-black text-center w-28">الرتبة العسكرية</th>
                        <th className="py-3 px-4 font-black w-48">الوحدة الحالية</th>
                        <th className="py-3 px-4 font-black text-center w-28">الحالة</th>
                        <th className="py-3 px-4 font-black text-center w-40">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {searchedSoldiers.map(soldier => {
                        const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                        const isOfficer = soldier.rank.includes('عميد') || 
                                          soldier.rank.includes('عقيد') || 
                                          soldier.rank.includes('مقدم') || 
                                          soldier.rank.includes('رائد') || 
                                          soldier.rank.includes('نقيب') || 
                                          soldier.rank.includes('ملازم');
                        
                        return (
                          <tr key={soldier.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-center font-bold text-slate-600 bg-slate-50/40">
                              {soldier.militaryNumber}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div 
                                  onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                  className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center font-black text-slate-600 text-xs hover:scale-105 transition-transform"
                                >
                                  {soldier.photoUrl ? (
                                    <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs hover:text-emerald-800 transition-colors cursor-pointer" onClick={() => setSelectedProfileSoldierId(soldier.id)}>
                                    {soldier.fullName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-[11px] rounded-md font-bold border ${
                                isOfficer ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {soldier.rank}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-semibold text-xs">
                              {soldierUnit}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {soldier.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  جاهز
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  مستبعد
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                                  title="الملف الشامل"
                                >
                                  <FileText className="w-4 h-4 text-slate-700" />
                                </button>
                                <button
                                  onClick={() => handleOpenMovementHistory(soldier)}
                                  className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200 cursor-pointer"
                                  title="سجل الحركة والتنقلات والجهات المصدرة"
                                >
                                  <Milestone className="w-3.5 h-3.5 text-amber-600" />
                                </button>
                                {currentUser.role !== 'operations' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenSoldierModal(soldier)}
                                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                                      title="تعديل"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenTransfer(soldier)}
                                      className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
                                      title="نقل"
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSoldierClick(soldier.id, soldier.fullName)}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                      title="حذف"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div 
                  ref={mobileContainerRef}
                  onScroll={(e) => setMobileScrollTop(e.currentTarget.scrollTop)}
                  className="block lg:hidden overflow-auto max-h-[500px] space-y-3"
                >
                  {searchedSoldiers.map(soldier => {
                    const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                    const isOfficer = soldier.rank.includes('عميد') || 
                                      soldier.rank.includes('عقيد') || 
                                      soldier.rank.includes('مقدم') || 
                                      soldier.rank.includes('رائد') || 
                                      soldier.rank.includes('نقيب') || 
                                      soldier.rank.includes('ملازم');
                    return (
                      <div key={soldier.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              onClick={() => setSelectedProfileSoldierId(soldier.id)}
                              className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center font-black text-slate-600 text-xs"
                            >
                              {soldier.photoUrl ? (
                                <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className={`inline-block px-1.5 py-0.2 text-[9px] rounded font-bold border ${
                                isOfficer ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {soldier.rank}
                              </span>
                              <h5 className="font-bold text-xs text-slate-900 mt-0.5 line-clamp-1 cursor-pointer hover:text-emerald-800" onClick={() => setSelectedProfileSoldierId(soldier.id)}>
                                {soldier.fullName}
                              </h5>
                              <p className="text-[10px] text-slate-500">
                                رقم: <span className="font-mono font-bold text-slate-700">{soldier.militaryNumber}</span> • وحدة: <span className="font-bold text-slate-700">{soldierUnit}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {soldier.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                جاهز
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                مستبعد
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mobile Buttons Bar */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                          <button
                            onClick={() => setSelectedProfileSoldierId(soldier.id)}
                            className="flex-1 min-w-[90px] py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-700" />
                            <span>الملف الشامل</span>
                          </button>

                          <button
                            onClick={() => handleOpenMovementHistory(soldier)}
                            className="py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                            title="سجل الحركة والتنقلات"
                          >
                            <Milestone className="w-3 h-3 text-amber-600" />
                            <span>سجل الحركة</span>
                          </button>

                          {currentUser.role !== 'operations' && (
                            <>
                              <button
                                onClick={() => handleOpenSoldierModal(soldier)}
                                className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg transition-colors"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleOpenTransfer(soldier)}
                                className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-lg transition-colors"
                              >
                                نقل
                              </button>
                              <button
                                onClick={() => handleDeleteSoldierClick(soldier.id, soldier.fullName)}
                                className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-colors"
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progressive Pagination */}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => fetchSoldiers(page + 1, false)}
                      disabled={loadingSoldiers}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black cursor-pointer transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${loadingSoldiers ? 'animate-spin' : ''}`} />
                      <span>تحميل المزيد (عرض {searchedSoldiers.length} من {totalCount})</span>
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        )
      )}

      {/* UNIT ADD/EDIT MODAL DIALOG */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                {editingUnit ? `تعديل بيانات: ${editingUnit.name}` : 'إضافة وحدة عسكرية جديدة'}
              </h3>
              <button onClick={() => setIsUnitModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="mt-4 space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم الوحدة العسكرية</label>
                  <input 
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700"
                    placeholder="مثال: سرية القيادة، الكتيبة الأولى..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رمز / كود الوحدة</label>
                  <input 
                    type="text"
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700 font-mono text-center font-bold"
                    placeholder="مثال: BAT-101..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">المستوى العسكري للتشكيل</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="قوات">قوات (قيادة عليا)</option>
                    <option value="فرقة">فرقة (Division)</option>
                    <option value="لواء">لواء (Brigade)</option>
                    <option value="كتيبة">كتيبة (Battalion)</option>
                    <option value="سرية">سرية (Company)</option>
                    <option value="فصيلة">فصيلة (Platoon)</option>
                    <option value="مجموعة">مجموعة (Squad)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">تبعية السيطرة (الوحدة الأعلى)</label>
                  <select
                    value={unitParentId}
                    onChange={(e) => setUnitParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">لا توجد وحدة أعلى (قيادة مستقلة)</option>
                    {units.filter(u => !editingUnit || u.id !== editingUnit.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">قائد التشكيل المسؤول</label>
                  <input 
                    type="text"
                    value={unitCommander}
                    onChange={(e) => setUnitCommander(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700"
                    placeholder="اسم قائد التشكيل (اختياري)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ملاك القوة المعتمد (عدد الأفراد)</label>
                  <input 
                    type="number"
                    min="1"
                    max="5000"
                    value={unitApprovedStrength}
                    onChange={(e) => setUnitApprovedStrength(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  حفظ الوحدة العسكرية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOLDIER ADD/EDIT MODAL DIALOG */}
      {isSoldierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                {editingSoldier ? `تعديل بيانات: ${editingSoldier.fullName}` : 'تسجيل عسكري جديد بالنظام'}
              </h3>
              <button onClick={() => setIsSoldierModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSoldier} className="mt-4 space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الرقم العسكري</label>
                  <input 
                    type="text"
                    required
                    value={soldierMilNumber}
                    onChange={(e) => setSoldierMilNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700 font-mono font-bold"
                    placeholder="مثال: 10452..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الرتبة العسكرية</label>
                  <select
                    value={soldierRank}
                    onChange={(e) => setSoldierRank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {MILITARY_RANKS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">الاسم الكامل للفرد العسكري</label>
                <input 
                  type="text"
                  required
                  value={soldierName}
                  onChange={(e) => setSoldierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700 font-bold"
                  placeholder="الاسم الرباعي الكامل..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الوحدة العسكرية التابع لها</label>
                  <select
                    required
                    value={soldierUnitId}
                    onChange={(e) => setSoldierUnitId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">-- اختر الوحدة --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">حالة القوة الحالية</label>
                  <select
                    value={soldierActive ? 'true' : 'false'}
                    onChange={(e) => setSoldierActive(e.target.value === 'true')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-bold"
                  >
                    <option value="true">نشط / على رأس العمل</option>
                    <option value="false">مستبعد / احتياط</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSoldierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  حفظ البيانات العسكرية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900 font-sans pb-2 border-b border-slate-100">
              أمر نقل وتحويل إداري
            </h3>

            <p className="text-xs text-slate-600 mt-2 font-sans">
              العسكري المستهدف: <span className="font-bold text-emerald-800">{soldiers.find(s => s.id === transferSoldierId)?.rank} / {soldiers.find(s => s.id === transferSoldierId)?.fullName}</span>
            </p>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-3 font-sans text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">الوحدة العسكرية الجديدة المراد النقل إليها</label>
                <select
                  required
                  value={transferTargetUnitId}
                  onChange={(e) => setTransferTargetUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  <option value="">-- اختر الوحدة المستهدفة بالنقل --</option>
                  {units.filter(u => u.id !== soldiers.find(s => s.id === transferSoldierId)?.unitId).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم أمر النقل</label>
                  <input 
                    type="text"
                    required
                    value={transferOrderNumber}
                    onChange={(e) => setTransferOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">تاريخ أمر النقل</label>
                  <input 
                    type="date"
                    required
                    value={transferOrderDate}
                    onChange={(e) => setTransferOrderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetUnitId}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition-all cursor-pointer"
                >
                  تنفيذ أمر النقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETION CONFIRMATION BOTTOM SHEET MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className={`w-full sm:max-w-md border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl text-right animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 fade-in duration-200 font-sans ${
            isDarkMode ? 'bg-slate-900 border-rose-900 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-3" />

            <div className="flex items-center gap-2 text-rose-600 pb-2 border-b border-rose-100 dark:border-rose-950">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-extrabold">تأكيد إجراء الحذف النهائي</h3>
            </div>

            <div className={`border rounded-xl p-3 my-3 text-xs ${
              isDarkMode ? 'bg-rose-950/40 border-rose-900/60' : 'bg-rose-50 border-rose-100'
            }`}>
              <span className={`block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>العنصر المراد حذفه:</span>
              <span className="text-sm font-black text-rose-500 block mt-0.5">{deleteTargetName}</span>
            </div>

            <p className={`text-xs mb-3 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              تنبيه: سيتم إزالة السجل بشكل نهائي من قاعدة البيانات. اكتب كلمة <span className="font-extrabold text-rose-500">تأكيد</span> للبدء بالحذف:
            </p>

            <input
              type="text"
              value={deleteVerificationCode}
              onChange={(e) => setDeleteVerificationCode(e.target.value)}
              placeholder="اكتب تأكيد هنا"
              className={`w-full border focus:border-rose-600 rounded-xl px-3 py-2 text-xs font-black text-center mb-4 focus:outline-hidden ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />

            <div className={`flex gap-2 justify-end pt-3 border-t ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteVerificationCode !== 'تأكيد'}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white transition-all ${
                  deleteVerificationCode === 'تأكيد'
                    ? 'bg-rose-700 hover:bg-rose-800 cursor-pointer shadow-xs active:scale-95'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL MILITARY FORMATION WARRANT MODAL */}
      {showOfficialWarrant && (() => {
        const selectedUnit = units.find(u => u.id === selectedWarrantUnitId);
        if (!selectedUnit) return null;
        
        const unitSoldiers = soldiers.filter(s => s.unitId === selectedUnit.id);
        const activeCount = unitSoldiers.filter(s => s.isActive).length;
        const inactiveCount = unitSoldiers.length - activeCount;

        const rankCounts: Record<string, number> = {};
        unitSoldiers.forEach(s => {
          rankCounts[s.rank] = (rankCounts[s.rank] || 0) + 1;
        });

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
            <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-300 relative my-6 print:border-0 print:p-0">
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-4">
                <div className="text-right space-y-1">
                  <h4 className="text-xs font-black text-slate-800">وزارة الدفاع</h4>
                  <h4 className="text-xs font-extrabold text-slate-700">قيادة التشكيلات العسكرية</h4>
                  <h4 className="text-[10px] text-slate-500 font-bold">منظومة السيطرة الميدانية</h4>
                </div>

                <div className="text-center">
                  <Shield className="w-10 h-10 text-emerald-800 mx-auto" />
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">وثيقة رسمية</span>
                </div>

                <div className="text-left space-y-1 text-slate-500 text-[10px] font-bold">
                  <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div>الكود: {selectedUnit.id.substring(0, 8).toUpperCase()}</div>
                </div>
              </div>

              <div className="text-center my-4">
                <h3 className="text-base font-black text-slate-900 underline underline-offset-4 font-sans">
                  وثيقة تشكيل هيكل الوحدة العسكرية
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-right text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">اسم الوحدة:</span>
                  <span className="font-extrabold text-slate-900">{selectedUnit.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">قائد التشكيل:</span>
                  <span className="font-extrabold text-emerald-800">{selectedUnit.commanderName || 'غير عين'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-800">تعداد القوة البشرية والجاهزية:</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold">الرتبة</th>
                        <th className="p-2.5 font-bold text-center">التعداد الفعلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {Object.keys(rankCounts).length > 0 ? (
                        Object.entries(rankCounts).map(([rank, count]) => (
                          <tr key={rank}>
                            <td className="p-2.5 font-bold">{rank}</td>
                            <td className="p-2.5 text-center font-bold">{count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="p-3 text-center text-slate-400 italic">
                            لا يوجد أفراد مسجلين في ملاك هذه الوحدة.
                          </td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-black border-t border-slate-200">
                        <td className="p-2.5">إجمالي القوة:</td>
                        <td className="p-2.5 text-center">{unitSoldiers.length} (نشط: {activeCount})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end border-t border-slate-200 pt-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowOfficialWarrant(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>طباعة الوثيقة</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ORG SETTINGS MODAL */}
      {isOrgSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold font-sans">إعدادات وتصدير بيانات القوة</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOrgSettingsOpen(false);
                  setSettingsSubTab('menu');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-xs">
              {settingsSubTab === 'menu' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setSettingsSubTab('import')}
                      className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 p-4 rounded-xl cursor-pointer transition-all space-y-2 text-right"
                    >
                      <Upload className="w-6 h-6 text-emerald-800" />
                      <h4 className="font-bold text-emerald-950 text-sm">استيراد من Excel</h4>
                      <p className="text-emerald-800/80 text-[11px]">رفع واستيراد كشف الأفراد والقوة من ملف إكسل.</p>
                    </div>

                    <div 
                      onClick={() => setSettingsSubTab('export_settings')}
                      className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 p-4 rounded-xl cursor-pointer transition-all space-y-2 text-right"
                    >
                      <Sliders className="w-6 h-6 text-blue-800" />
                      <h4 className="font-bold text-blue-950 text-sm">تصدير إلى Excel مخصص</h4>
                      <p className="text-blue-800/80 text-[11px]">تخصيص وإصدار كشف Excel بالحقول المطلوبة.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-slate-800">تحميل نموذج Excel مفرغ</h5>
                      <p className="text-[10px] text-slate-500">احصل على قالب معتمد لتعبئة البيانات والاستيراد.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </button>
                  </div>
                </div>
              ) : settingsSubTab === 'export_settings' ? (
                <div className="space-y-4 text-right">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('menu')}
                      className="flex items-center gap-1 text-slate-700 text-xs font-bold"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>رجوع</span>
                    </button>
                    <span className="font-bold text-blue-900">حقول تصدير ملف Excel</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedExportFields(EXPORT_FIELDS_OPTIONS.map(f => f.id))}
                        className="px-2.5 py-1 bg-emerald-800 text-white text-xs font-bold rounded-lg"
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedExportFields([])}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                    <span className="font-bold text-slate-700">المحدد: {selectedExportFields.length}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pl-1">
                    {EXPORT_FIELDS_OPTIONS.map(field => {
                      const isSelected = selectedExportFields.includes(field.id);
                      return (
                        <div
                          key={field.id}
                          onClick={() => toggleExportField(field.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            isSelected ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-emerald-700 border-emerald-800 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{field.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleCustomExportExcel}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>تصدير ملف Excel</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('menu')}
                    className="flex items-center gap-1 text-slate-700 text-xs font-bold mb-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>رجوع للإعدادات</span>
                  </button>
                  <ExcelImporter
                    units={units}
                    soldiers={soldiers}
                    attendance={propsAttendance}
                    currentUser={currentUser}
                    onImportCompleted={(data) => {
                      if (propsOnImportCompleted) {
                        propsOnImportCompleted(data);
                      }
                      setSettingsSubTab('menu');
                      setIsOrgSettingsOpen(false);
                    }}
                    onAddLog={onAddLog}
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOrgSettingsOpen(false);
                  setSettingsSubTab('menu');
                }}
                className="px-4 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXTUAL POPOVER MENU */}
      {popoverUnit && (() => {
        const popoverSubIds = getAllSubUnitIds(popoverUnit.id, units);
        const popoverSoldiers = soldiers.filter(s => popoverSubIds.includes(s.unitId));
        const popoverActiveCount = popoverSoldiers.filter(s => s.isActive).length;
        const popoverApprovedCount = popoverUnit.approvedStrength || 100;
        const popoverReadiness = popoverApprovedCount ? Math.min(100, Math.round((popoverActiveCount / popoverApprovedCount) * 100)) : 85;
        const popoverDirectChildren = units.filter(u => u.parentId === popoverUnit.id);
        const isPinned = pinnedUnitIds.has(popoverUnit.id);

        const filterMatch = (text: string) => {
          if (!popoverSearch.trim()) return true;
          return text.toLowerCase().includes(popoverSearch.toLowerCase().trim());
        };

        return (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 font-sans"
            onClick={() => {
              setPopoverUnit(null);
              setPopoverSearch('');
            }}
          >
            <div 
              className={`w-full max-w-sm sm:max-w-md p-4 rounded-3xl border shadow-2xl space-y-3 animate-in zoom-in-95 duration-200 backdrop-blur-2xl max-h-[92vh] flex flex-col ${
                isDarkMode ? 'bg-slate-900/95 border-emerald-800/60 text-slate-100 shadow-slate-950/90' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/50'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Banner */}
              <div className="space-y-2.5 border-b pb-3 border-slate-200/80 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-emerald-800 text-white shrink-0 shadow-md ring-2 ring-emerald-500/30">
                      <Building className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-sm sm:text-base truncate">{popoverUnit.name}</h3>
                        {popoverUnit.code && (
                          <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            [{popoverUnit.code}]
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 truncate">
                        {popoverUnit.type || 'تشكيل عسكري'} {popoverUnit.commanderName ? `• القائد: ${popoverUnit.commanderName}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title={isPinned ? 'إزالة من المفضلة' : 'تثبيت في الوصول السريع'}
                      onClick={() => togglePinUnit(popoverUnit.id)}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        isPinned 
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30' 
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button 
                      type="button" 
                      onClick={() => {
                        setPopoverUnit(null);
                        setPopoverSearch('');
                      }} 
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Switcher & Commander Quick Info */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{popoverUnit.commanderName || 'لم يُحدد قائد'}</span>
                  </div>

                  {/* Interactive Status Switcher */}
                  <select
                    value={popoverUnit.status || 'نشط'}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      onEditUnit(
                        popoverUnit.id,
                        popoverUnit.name,
                        popoverUnit.parentId,
                        popoverUnit.commanderName,
                        popoverUnit.type,
                        popoverUnit.location,
                        popoverUnit.approvedStrength,
                        newStatus,
                        popoverUnit.code
                      );
                      setPopoverUnit(prev => prev ? { ...prev, status: newStatus } : null);
                      showToast(`تم تحديث الحالة التشغيلية لـ "${popoverUnit.name}" إلى (${newStatus})`, 'success');
                    }}
                    className={`px-2 py-0.5 rounded-lg border font-black text-[10px] cursor-pointer focus:outline-hidden ${
                      (popoverUnit.status || 'نشط') === 'نشط' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                      popoverUnit.status === 'جاهزية قصوى' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' :
                      popoverUnit.status === 'في مهمة' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' :
                      'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                    }`}
                  >
                    <option value="نشط">نشط (اعتيادي)</option>
                    <option value="جاهزية قصوى">جاهزية قصوى 100%</option>
                    <option value="في مهمة">في مهمة ميدانية</option>
                    <option value="إعادة تمركز">إعادة تمركز</option>
                    <option value="مؤمن بالكامل">مؤمن بالكامل</option>
                  </select>
                </div>

                {/* KPI HUD Bar */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-black text-xs">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block font-bold">القوة الفعلية</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{popoverSoldiers.length} فرد</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block font-bold">نسبة الجاهزية</span>
                    <span className={`font-mono font-black ${popoverReadiness >= 85 ? 'text-emerald-500' : popoverReadiness >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {popoverReadiness}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block font-bold">التشكيلات التابعة</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{popoverDirectChildren.length} تشكيل</span>
                  </div>
                </div>

                {/* Tactical Quick Action Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => {
                      const unitPersonnel = popoverSoldiers.map(s => {
                        const u = units.find(unitItem => unitItem.id === s.unitId);
                        return {
                          id: s.id,
                          fullName: s.fullName,
                          rank: s.rank,
                          militaryNumber: s.militaryNumber,
                          militaryStatus: s.militaryStatus || (s.isActive ? 'على رأس العمل' : 'مستبعد'),
                          isActive: s.isActive,
                          unitName: u?.name || popoverUnit.name
                        };
                      });
                      setQuickRollCallModal({ unit: popoverUnit, items: unitPersonnel });
                      setPopoverUnit(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>تحضير سريع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickMassTransferModal({
                        unit: popoverUnit,
                        selectedSoldierIds: [],
                        destinationUnitId: '',
                        orderNotes: 'إعادة توزيع القوة وفق المتبنيات التكتيكية الميدانية'
                      });
                      setPopoverUnit(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition-all cursor-pointer shrink-0"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" />
                    <span>نقل جماعي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpOrderModal({
                        unit: popoverUnit,
                        taskTitle: 'أمر رفع الجاهزية والربط الميداني',
                        priority: 'عاجل جداً',
                        location: popoverUnit.location || 'المقر الميداني الرئيسي',
                        instructions: 'بناءً على التوجيهات القيادية العليا، يُكلف قائد التشكيل برفع جاهزية كافة الوحدات والسرايا التابعة وإرسال تقرير التحضير الفوري.'
                      });
                      setPopoverUnit(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shrink-0"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-500" />
                    <span>أمر عمليات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportReportExcel(popoverUnit, 'full_package');
                      setPopoverUnit(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-500" />
                    <span>تصدير Excel</span>
                  </button>
                </div>

                {/* 4-Category Switcher Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => setPopoverTab('reports')}
                    className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
                      popoverTab === 'reports'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    التقارير
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopoverTab('comparison')}
                    className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
                      popoverTab === 'comparison'
                        ? 'bg-purple-800 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    المقارنة
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopoverTab('operations')}
                    className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
                      popoverTab === 'operations'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    العمليات
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopoverTab('management')}
                    className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer text-center truncate ${
                      popoverTab === 'management'
                        ? 'bg-sky-800 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الإدارة
                  </button>
                </div>

                {/* Search Bar inside Popover */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="تصفية الخيارات والإجراءات..."
                    value={popoverSearch}
                    onChange={(e) => setPopoverSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold focus:outline-hidden"
                  />
                  {popoverSearch && (
                    <button
                      type="button"
                      onClick={() => setPopoverSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Popover Menu Items Content */}
              <div className="overflow-y-auto space-y-2 flex-1 text-xs font-bold pr-0.5">
                
                {/* TAB 1: REPORTS & ROSTERS */}
                {popoverTab === 'reports' && (
                  <div className="space-y-1">
                    {filterMatch('كشف الأسماء الشامل القوة') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'roster' });
                          setReportSubUnitFilter('all');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">كشف الأسماء الشامل (القوة)</span>
                            <span className="block text-[10px] text-slate-400 font-medium">سجل الأفراد المباشر والوحدات التابعة</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('كشف التحضير واليومية الميدانية') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'attendance' });
                          setReportSubUnitFilter('all');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">كشف التحضير واليومية الميدانية</span>
                            <span className="block text-[10px] text-slate-400 font-medium">توزيع الموجود والجاهزية للوحدة وتوابعها</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('كشف الغياب والحالات بالتفصيل') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'absence' });
                          setReportSubUnitFilter('all');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">كشف الغياب والحالات بالتفصيل</span>
                            <span className="block text-[10px] text-slate-400 font-medium">تقرير الغائبين والمجازين والعيادات</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('مصفوفة الرتب والهرمية العسكرية') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'ranks' });
                          setReportSubUnitFilter('all');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 group-hover:scale-110 transition-transform">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">مصفوفة الرتب والهرمية العسكرية</span>
                            <span className="block text-[10px] text-slate-400 font-medium">تفكيك القوة بحسب الضباط وضباط الصف والجنود</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('بطاقة التشكيل التفصيلية Dossier') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'dossier' });
                          setReportSubUnitFilter('all');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">بطاقة التشكيل التفصيلية (Dossier)</span>
                            <span className="block text-[10px] text-slate-400 font-medium">ملاك القوة والموقع الميداني والبيانات القيادية</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('تصدير الحزمة التكتيكية الكاملة Excel') && (
                      <button
                        type="button"
                        onClick={() => {
                          handleExportReportExcel(popoverUnit, 'full_package');
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-right transition-all group cursor-pointer border border-emerald-500/20"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-600 text-white group-hover:scale-110 transition-transform">
                            <Download className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black">تصدير الحزمة التكتيكية الكاملة (Excel)</span>
                            <span className="block text-[10px] opacity-80 font-medium">جدول كامل يتضمن القوة والسجل الميداني</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-emerald-500 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 2: ANALYTICS & COMPARISON */}
                {popoverTab === 'comparison' && (
                  <div className="space-y-1">
                    {filterMatch('مقارنة التشكيلات الموازية') && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = popoverUnit;
                          let parallel: Unit[] = [];
                          if (target.parentId) {
                            parallel = units.filter(u => u.parentId === target.parentId);
                          } else {
                            parallel = units.filter(u => !u.parentId || u.type === target.type);
                          }
                          setActiveComparisonModal({ unit: target, parallelUnits: parallel });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform">
                            <GitCompare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">مقارنة التشكيلات الموازية</span>
                            <span className="block text-[10px] text-slate-400 font-medium">مقارنة الجاهزية والملاك مع الكيانات الموازية</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('هيكلية وأركان القيادة') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'leadership' });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform">
                            <Shield className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">هيكلية وأركان القيادة</span>
                            <span className="block text-[10px] text-slate-400 font-medium">التسلسل القيادي وقادة الوحدات التابعة</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('مصفوفة جاهزية الوحدات التابعة') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportModal({ unit: popoverUnit, type: 'matrix' });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">مصفوفة جاهزية الوحدات التابعة</span>
                            <span className="block text-[10px] text-slate-400 font-medium">مقارنة بصرية شاملة لكافة السرايا/الفصائل التابعة</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 3: FIELD OPERATIONS & QUICK ROLL CALL */}
                {popoverTab === 'operations' && (
                  <div className="space-y-1">
                    {filterMatch('التحضير الميداني السريع Roll Call') && (
                      <button
                        type="button"
                        onClick={() => {
                          const unitPersonnel = popoverSoldiers.map(s => {
                            const u = units.find(unitItem => unitItem.id === s.unitId);
                            return {
                              id: s.id,
                              fullName: s.fullName,
                              rank: s.rank,
                              militaryNumber: s.militaryNumber,
                              militaryStatus: s.militaryStatus || (s.isActive ? 'على رأس العمل' : 'مستبعد'),
                              isActive: s.isActive,
                              unitName: u?.name || popoverUnit.name
                            };
                          });
                          setQuickRollCallModal({
                            unit: popoverUnit,
                            items: unitPersonnel
                          });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">التحضير الميداني السريع (Roll Call)</span>
                            <span className="block text-[10px] text-slate-400 font-medium">تحديث حالة حضور وغياب أفراد التشكيل بنقرة واحدة</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('نقل وإعادة توزيع الأفراد الجماعي') && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMassTransferModal({
                            unit: popoverUnit,
                            selectedSoldierIds: [],
                            destinationUnitId: '',
                            orderNotes: 'إعادة توزيع القوة وفق المتبنيات التكتيكية الميدانية'
                          });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                            <ArrowLeftRight className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">نقل وإعادة توزيع الأفراد الجماعي</span>
                            <span className="block text-[10px] text-slate-400 font-medium">تحديد مجموعة أفراد ونقلهم دفعة واحدة لتشكيل آخر</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}

                    {filterMatch('إصدار أمر عمليات وتكليف ميداني') && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpOrderModal({
                            unit: popoverUnit,
                            taskTitle: 'أمر رفع الجاهزية والربط الميداني',
                            priority: 'عاجل جداً',
                            location: popoverUnit.location || 'المقر الميداني الرئيسي',
                            instructions: 'بناءً على التوجيهات القيادية العليا، يُكلف قائد التشكيل برفع جاهزية كافة الوحدات والسرایا التابعة وإرسال تقرير التحضير الفوري.'
                          });
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-right transition-all group cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-800 dark:text-slate-100">إصدار أمر عمليات وتكليف ميداني</span>
                            <span className="block text-[10px] text-slate-400 font-medium">وثيقة أمر تكتيكي موثقة ومجانية للطباعة والتصدير</span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 4: MANAGEMENT & ORGANIZATION */}
                {popoverTab === 'management' && (
                  <div className="space-y-1">
                    {hasWriteAccess && filterMatch('إضافة تشكيل فرعي تابع مباشرة') && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetParentId = popoverUnit.id;
                          setPopoverUnit(null);
                          handleOpenUnitModal({
                            id: '',
                            name: '',
                            code: '',
                            type: 'سرية',
                            parentId: targetParentId,
                            approvedStrength: 50,
                            commanderName: '',
                            commanderId: '',
                            location: '',
                            status: 'نشط'
                          });
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-right transition-all cursor-pointer font-extrabold"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span>إضافة تشكيل فرعي تابع مباشرة</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </button>
                    )}

                    {filterMatch('تثبيت إلغاء تثبيت المفضلة') && (
                      <button
                        type="button"
                        onClick={() => {
                          togglePinUnit(popoverUnit.id);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-right transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                            <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
                          </div>
                          <span>{isPinned ? 'إزالة من قائمة الوصول السريع المفضلة' : 'تثبيت التشكيل في المفضلة ★'}</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </button>
                    )}

                    {filterMatch('نسخ البيانات التكتيكية') && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyUnitData(popoverUnit);
                          setPopoverUnit(null);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            <Copy className="w-4 h-4 text-emerald-500" />
                          </div>
                          <span>نسخ البيانات التكتيكية للحافظة</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </button>
                    )}

                    {filterMatch('عرض التبعيات وتوسيع الشجرة') && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTreeUnit(popoverUnit.id);
                          setExpandedUnitIds(prev => new Set([...prev, popoverUnit.id]));
                          setPopoverUnit(null);
                          showToast(`تم تركيز الشجرة وتوسيع تبعيات "${popoverUnit.name}"`, 'info');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-500">
                            <Layers className="w-4 h-4" />
                          </div>
                          <span>عرض التبعيات وتوسيع الشجرة</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </button>
                    )}

                    {hasWriteAccess && filterMatch('تعديل بيانات التشكيل') && (
                      <button
                        type="button"
                        onClick={() => {
                          const u = popoverUnit;
                          setPopoverUnit(null);
                          handleOpenUnitModal(u);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                            <Edit className="w-4 h-4" />
                          </div>
                          <span>تعديل بيانات التشكيل</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </button>
                    )}

                    {hasWriteAccess && filterMatch('حذف التشكيل النهائي') && (
                      <button
                        type="button"
                        onClick={() => {
                          const u = popoverUnit;
                          setPopoverUnit(null);
                          handleDeleteUnitClick(u.id, u.name);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-all text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <span>حذف التشكيل النهائي</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-rose-500" />
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* UNIT REPORT MODAL (WITH SUBORDINATES) */}
      {activeReportModal && (() => {
        const targetUnit = activeReportModal.unit;
        const subUnitIds = getAllSubUnitIds(targetUnit.id, units);
        const subUnitsList = units.filter(u => subUnitIds.includes(u.id));

        const rawSoldiers = reportSubUnitFilter === 'all' 
          ? soldiers.filter(s => subUnitIds.includes(s.unitId))
          : soldiers.filter(s => s.unitId === reportSubUnitFilter);

        const totalForce = rawSoldiers.length;
        const activeForce = rawSoldiers.filter(s => s.isActive).length;
        const officersCount = rawSoldiers.filter(s => ['عميد ركن', 'عقيد ركن', 'عقيد', 'مقدم ركن', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم'].includes(s.rank)).length;
        const ncoCount = totalForce - officersCount;
        const absentCount = rawSoldiers.filter(s => s.militaryStatus === 'غائب' || s.militaryStatus === 'موقوف').length;
        const leaveCount = rawSoldiers.filter(s => s.militaryStatus === 'إجازة' || s.militaryStatus === 'استئذان').length;

        const reportTitle = 
          activeReportModal.type === 'roster' ? 'كشف الأسماء الشامل والقوة العسكرية (مع التبعية)' :
          activeReportModal.type === 'attendance' ? 'كشف التحضير واليومية الميدانية للتشكيل والوحدات التابعة' :
          activeReportModal.type === 'absence' ? 'كشف الغياب والحالات الاستثنائية والمستبعدين' :
          activeReportModal.type === 'dossier' ? 'بطاقة التشكيل التفصيلية وتوزيع الجاهزية' :
          activeReportModal.type === 'ranks' ? 'كشف توزيع الرتب القيادية والتخصصات' :
          activeReportModal.type === 'matrix' ? 'مصفوفة جاهزية السرايا والوحدات التابعة' :
          'هيكلية وتسلسل القيادة وأركان التشكيل';

        return (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
            onClick={() => setActiveReportModal(null)}
          >
            <div 
              className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 border-b flex items-center justify-between gap-3 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-800 text-white shrink-0 shadow-xs">
                    <Building className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm sm:text-base truncate">{reportTitle}</h3>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/40 font-mono font-bold shrink-0">
                        [{targetUnit.code || targetUnit.name}]
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      التشكيل الرئيسي: <span className="text-white font-bold">{targetUnit.name}</span> • عدد الوحدات الفرعية التابعة: ({subUnitsList.length})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExportReportExcel(targetUnit, activeReportModal.type)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="تصدير كملف Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">تصدير Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer border border-slate-700"
                    title="طباعة التقرير"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">طباعة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReportModal(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-unit Filter Bar */}
              <div className={`p-2.5 px-4 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                isDarkMode ? 'bg-slate-800/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-xs font-extrabold text-slate-500 shrink-0">تحديد النطاق التنظيمي:</span>
                  <select
                    value={reportSubUnitFilter}
                    onChange={(e) => setReportSubUnitFilter(e.target.value)}
                    className={`px-3 py-1 rounded-xl border text-xs font-bold focus:outline-hidden cursor-pointer flex-1 max-w-xs ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="all">الكل (التشكيل المباشر والوحدات التابعة - {soldiers.filter(s => subUnitIds.includes(s.unitId)).length} فرد)</option>
                    {subUnitsList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.id === targetUnit.id ? `★ ${u.name} (الوحدة المباشرة)` : `↳ ${u.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-black">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    القوة الفعلية: {totalForce}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    الضباط: {officersCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    الصف والجنود: {ncoCount}
                  </span>
                </div>
              </div>

              {/* Modal Body Scroll Area */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                
                {/* 1. ROSTER VIEW */}
                {activeReportModal.type === 'roster' && (
                  <div className="space-y-3">
                    {rawSoldiers.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        لا يوجد أفراد مسجلون في هذا التشكيل أو في الوحدات التابعة المحددة.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-right text-xs">
                          <thead className={`border-b font-black ${
                            isDarkMode ? 'bg-slate-800/90 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            <tr>
                              <th className="py-2.5 px-3 text-center w-12">م</th>
                              <th className="py-2.5 px-3">الرقم العسكري</th>
                              <th className="py-2.5 px-3">الرتبة</th>
                              <th className="py-2.5 px-3">الاسم الكامل</th>
                              <th className="py-2.5 px-3">الوحدة التابعة المباشرة</th>
                              <th className="py-2.5 px-3 text-center">الحالة الميدانية</th>
                              <th className="py-2.5 px-3 text-center">رقم التواصل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                            {rawSoldiers.map((soldier, idx) => {
                              const soldierUnit = units.find(u => u.id === soldier.unitId);
                              return (
                                <tr key={soldier.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                  <td className="py-2 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">{soldier.militaryNumber}</td>
                                  <td className="py-2 px-3">{soldier.rank}</td>
                                  <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-slate-100">{soldier.fullName}</td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                                      {soldierUnit?.name || 'غير محدد'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                      soldier.isActive 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                                    }`}>
                                      {soldier.militaryStatus || (soldier.isActive ? 'على رأس العمل' : 'مستبعد')}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-slate-500">{soldier.phoneNumber || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ATTENDANCE VIEW */}
                {activeReportModal.type === 'attendance' && (
                  <div className="space-y-4">
                    {/* Metrics Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-extrabold text-slate-400 block">إجمالي الموجود الفعلي</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{totalForce} فرد</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-emerald-950/40 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block">على رأس العمل / جاهز</span>
                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{activeForce} فرد</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-amber-950/40 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 block">إجازة / استئذان</span>
                        <span className="text-xl font-black text-amber-700 dark:text-amber-300">{leaveCount} فرد</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-rose-950/40 border-rose-800' : 'bg-rose-50 border-rose-200'}`}>
                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 block">غياب / موقوف</span>
                        <span className="text-xl font-black text-rose-700 dark:text-rose-300">{absentCount} فرد</span>
                      </div>
                    </div>

                    {/* Sub-unit Breakdown Cards */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">تفكيك اليومية بحسب الوحدات الفرعية التابعة:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {subUnitsList.map(subU => {
                          const subSoldiers = soldiers.filter(s => s.unitId === subU.id);
                          const subActive = subSoldiers.filter(s => s.isActive).length;
                          const subPct = subSoldiers.length > 0 ? Math.round((subActive / subSoldiers.length) * 100) : 0;

                          return (
                            <div key={subU.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                              isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                            }`}>
                              <div>
                                <div className="flex items-center gap-1.5 font-black text-xs">
                                  <span>{subU.name}</span>
                                  {subU.code && <span className="font-mono text-[10px] text-emerald-500">[{subU.code}]</span>}
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                  القوة: {subSoldiers.length} | جاهز: {subActive}
                                </span>
                              </div>

                              <div className="text-left shrink-0">
                                <span className={`text-xs font-mono font-black ${
                                  subPct >= 85 ? 'text-emerald-500' : subPct >= 50 ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                  {subPct}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                  <div className={`h-full rounded-full ${
                                    subPct >= 85 ? 'bg-emerald-500' : subPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} style={{ width: `${subPct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ABSENCE VIEW */}
                {activeReportModal.type === 'absence' && (
                  <div className="space-y-3">
                    {(() => {
                      const nonActiveSoldiers = rawSoldiers.filter(s => !s.isActive || s.militaryStatus === 'غائب' || s.militaryStatus === 'إجازة' || s.militaryStatus === 'موقوف');
                      if (nonActiveSoldiers.length === 0) {
                        return (
                          <div className={`p-8 rounded-2xl border text-center space-y-2 ${
                            isDarkMode ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                            <h4 className="font-black text-sm">لا توجد حالات غياب أو استبعاد حالياً</h4>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">جميع أفراد الوحدة والتشكيلات التابعة حاضرون وعلى رأس العمل بنسبة 100%.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-right text-xs">
                            <thead className={`border-b font-black ${
                              isDarkMode ? 'bg-slate-800/90 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              <tr>
                                <th className="py-2.5 px-3">الاسم والرتبة</th>
                                <th className="py-2.5 px-3">الرقم العسكري</th>
                                <th className="py-2.5 px-3">الوحدة الفرعية</th>
                                <th className="py-2.5 px-3 text-center">حالة الاستثناء</th>
                                <th className="py-2.5 px-3 text-center">رقم الطوارئ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                              {nonActiveSoldiers.map(s => {
                                const u = units.find(unit => unit.id === s.unitId);
                                return (
                                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                    <td className="py-2.5 px-3">
                                      <div className="font-extrabold text-slate-900 dark:text-slate-100">{s.fullName}</div>
                                      <div className="text-[10px] text-slate-400">{s.rank}</div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{s.militaryNumber}</td>
                                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{u?.name || 'غير محدد'}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800">
                                        {s.militaryStatus || 'مستبعد / غائب'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{s.emergencyContact || s.phoneNumber || '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. DOSSIER VIEW */}
                {activeReportModal.type === 'dossier' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-extrabold text-slate-400 block">القائد المسؤول</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white block">{targetUnit.commanderName || 'غير محدد'}</span>
                        <span className="text-[10px] text-emerald-500 font-mono">{targetUnit.type || 'تشكيل عسكري'}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-extrabold text-slate-400 block">الموقع الميداني</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white block">{targetUnit.location || 'المقر الرئيسي'}</span>
                        <span className="text-[10px] text-slate-400 font-bold">الحالة: {targetUnit.status || 'نشط'}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? 'bg-emerald-950/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block">نسبة ملاك القوة</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 block">
                          {totalForce} / {targetUnit.approvedStrength || 100} فرد
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          مكتمل بنسبة {Math.round((totalForce / (targetUnit.approvedStrength || 100)) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">سجل التشكيلات التابعة المباشرة:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subUnitsList.map(u => (
                          <div key={u.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                            isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div>
                                <span className="font-extrabold text-xs block">{u.name}</span>
                                <span className="text-[10px] text-slate-400 block">القائد: {u.commanderName || 'غير محدد'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-bold text-slate-600 dark:text-slate-300">
                              {u.code || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. LEADERSHIP HIERARCHY VIEW */}
                {activeReportModal.type === 'leadership' && (
                  <div className="space-y-4">
                    {/* Unit Commander */}
                    <div className={`p-4 rounded-3xl border flex items-center gap-3.5 ${
                      isDarkMode ? 'bg-slate-800/80 border-emerald-700/50' : 'bg-emerald-50/80 border-emerald-200'
                    }`}>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                        <Crown className="w-6 h-6 text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">قائد التشكيل الرئيسي</span>
                        <h4 className="font-black text-base text-slate-900 dark:text-white truncate">{targetUnit.commanderName || 'مركز قيادة شاغر / غير محدد'}</h4>
                        <p className="text-xs font-bold text-slate-500">{targetUnit.name} [{targetUnit.code || '—'}]</p>
                      </div>
                    </div>

                    {/* Subordinate Commanders */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">قادة الأركان والوحدات التابعة:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {subUnitsList.filter(u => u.id !== targetUnit.id).map(subU => (
                          <div key={subU.id} className={`p-3 rounded-2xl border flex items-center gap-3 ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                          }`}>
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs shrink-0">
                              <Shield className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100">{subU.commanderName || 'مركز شاغر'}</span>
                              <span className="text-[10px] font-bold text-slate-400 block truncate">قائد: {subU.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-500 font-bold shrink-0">[{subU.code || '—'}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. RANKS DISTRIBUTION VIEW */}
                {activeReportModal.type === 'ranks' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {['عميد ركن', 'عقيد ركن', 'عقيد', 'مقدم ركن', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم', 'مساعد أول', 'رقيب أول', 'رقيب', 'عريف', 'جندي أول', 'جندي'].map(r => {
                        const count = rawSoldiers.filter(s => s.rank === r).length;
                        if (count === 0) return null;
                        return (
                          <div key={r} className={`p-3 rounded-2xl border flex items-center justify-between ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{r}</span>
                            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                              {count} فرد
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 7. MATRIX OF READINESS VIEW */}
                {activeReportModal.type === 'matrix' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {subUnitsList.map(subU => {
                        const subSoldiers = soldiers.filter(s => s.unitId === subU.id);
                        const subActive = subSoldiers.filter(s => s.isActive).length;
                        const subApproved = subU.approvedStrength || 100;
                        const subReadiness = subApproved ? Math.min(100, Math.round((subActive / subApproved) * 100)) : 80;
                        return (
                          <div key={subU.id} className={`p-4 rounded-3xl border space-y-2.5 ${
                            isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-sky-500" />
                                <span className="font-black text-xs text-slate-900 dark:text-white">{subU.name}</span>
                                {subU.code && <span className="font-mono text-[10px] text-emerald-500 font-bold">[{subU.code}]</span>}
                              </div>
                              <span className={`text-xs font-mono font-black ${
                                subReadiness >= 85 ? 'text-emerald-500' : subReadiness >= 50 ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                {subReadiness}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${
                                subReadiness >= 85 ? 'bg-emerald-500' : subReadiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`} style={{ width: `${subReadiness}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                              <span>القائد: {subU.commanderName || 'غير محدد'}</span>
                              <span>القوة: {subActive} / {subApproved}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* CONTEXTUAL PARALLEL UNIT COMPARISON MODAL */}
      {activeComparisonModal && (() => {
        const target = activeComparisonModal.unit;
        const parallelList = activeComparisonModal.parallelUnits;
        const parentUnit = units.find(u => u.id === target.parentId);

        return (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
            onClick={() => setActiveComparisonModal(null)}
          >
            <div 
              className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 border-b flex items-center justify-between gap-3 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-800 text-white shrink-0 shadow-xs">
                    <GitCompare className="w-5 h-5 text-purple-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm sm:text-base truncate">
                      مقارنة التشكيلات الموازية - [مستوى {target.type || 'الوحدة'}]
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      مقارنة أداء وجاهزية <span className="text-white font-bold">{target.name}</span> مع التشكيلات الموازية لها تحت ({parentUnit ? parentUnit.name : 'القيادة العامة'}).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveComparisonModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comparison Cards Grid */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {parallelList.map(pUnit => {
                    const isSelected = pUnit.id === target.id;
                    const subIds = getAllSubUnitIds(pUnit.id, units);
                    const pSoldiers = soldiers.filter(s => subIds.includes(s.unitId));
                    const actualCount = pSoldiers.length;
                    const approvedCount = pUnit.approvedStrength || 100;
                    const activeCount = pSoldiers.filter(s => s.isActive).length;
                    const readiness = approvedCount ? Math.min(100, Math.round((activeCount / approvedCount) * 100)) : 85;
                    const childCount = units.filter(u => u.parentId === pUnit.id).length;

                    return (
                      <div 
                        key={pUnit.id}
                        className={`p-4 rounded-3xl border transition-all relative flex flex-col justify-between space-y-3 ${
                          isSelected 
                            ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/40' 
                            : isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 left-3 bg-emerald-800 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            الوحدة المختارة
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-black text-sm">
                            <Building className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="truncate">{pUnit.name}</span>
                            {pUnit.code && <span className="font-mono text-[10px] text-emerald-500">[{pUnit.code}]</span>}
                          </div>
                          <p className="text-[11px] text-slate-400 font-bold truncate">
                            القائد: {pUnit.commanderName || 'غير محدد'}
                          </p>
                        </div>

                        {/* Readiness Meter */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-slate-400">نسبة الجاهزية التشغيلية:</span>
                            <span className={readiness >= 85 ? 'text-emerald-500' : readiness >= 50 ? 'text-amber-500' : 'text-rose-500'}>
                              {readiness}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                readiness >= 85 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`} 
                              style={{ width: `${readiness}%` }}
                            />
                          </div>
                        </div>

                        {/* Comparative Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center text-xs font-bold">
                          <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                            <span className="text-[10px] text-slate-400 block font-bold">ملاك القوة</span>
                            <span className="font-mono font-black text-slate-800 dark:text-slate-200">{actualCount} / {approvedCount}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                            <span className="text-[10px] text-slate-400 block font-bold">على رأس العمل</span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{activeCount} فرد</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                            <span className="text-[10px] text-slate-400 block font-bold">الوحدات التابعة</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{childCount} وحدة</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                            <span className="text-[10px] text-slate-400 block font-bold">الحالة الميدانية</span>
                            <span className="font-black text-emerald-500">{pUnit.status || 'نشط'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QUICK ROLL CALL MODAL */}
      {quickRollCallModal && (() => {
        const unit = quickRollCallModal.unit;
        const items = quickRollCallModal.items;

        return (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
            onClick={() => setQuickRollCallModal(null)}
          >
            <div 
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between bg-amber-950 text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-800 text-white shrink-0">
                    <UserCheck className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm sm:text-base truncate">
                      التحضير الميداني السريع (Roll Call)
                    </h3>
                    <p className="text-[11px] text-amber-200/80 truncate">
                      التشكيل: <span className="text-white font-bold">{unit.name}</span> • إجمالي القوة: <span className="font-mono text-amber-300 font-black">{items.length} فرد</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickRollCallModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="p-3 border-b flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/60 text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">تعديل حالة أفراد التشكيل:</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickRollCallModal(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        items: prev.items.map(item => ({ ...item, isActive: true, militaryStatus: 'على رأس العمل' }))
                      };
                    });
                    showToast('تم تعليم جميع أفراد التشكيل كحاضرين على رأس العمل', 'info');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all cursor-pointer shadow-xs text-[11px]"
                >
                  ✓ تسجيل الجميع (حاضر على رأس العمل)
                </button>
              </div>

              {/* Personnel List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[55vh]">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    لا يوجد أفراد مسجلين في هذا التشكيل حالياً.
                  </div>
                ) : (
                  items.map(s => (
                    <div 
                      key={s.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        s.isActive 
                          ? isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl text-xs font-mono font-black shrink-0 ${
                          s.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {s.rank}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs truncate">{s.fullName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">الرقم العسكري: {s.militaryNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickRollCallModal(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                items: prev.items.map(item => item.id === s.id ? { ...item, isActive: true, militaryStatus: 'على رأس العمل' } : item)
                              };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                            s.isActive 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickRollCallModal(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                items: prev.items.map(item => item.id === s.id ? { ...item, isActive: false, militaryStatus: 'غائب / مستبعد' } : item)
                              };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                            !s.isActive 
                              ? 'bg-rose-600 text-white shadow-xs' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white'
                          }`}
                        >
                          غائب / مستبعد
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between gap-2 bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickRollCallModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    items.forEach(s => {
                      onEditSoldier(s.id, s.militaryNumber, s.fullName, s.rank, unit.id, s.isActive);
                    });
                    showToast(`تم حفظ وتحديث كشف التحضير الميداني لـ "${unit.name}" بنجاح`, 'success');
                    setQuickRollCallModal(null);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد كشف التحضير النهائي</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QUICK MASS TRANSFER MODAL */}
      {quickMassTransferModal && (() => {
        const unit = quickMassTransferModal.unit;
        const unitPersonnel = soldiers.filter(s => s.unitId === unit.id);
        const availableDestinations = units.filter(u => u.id !== unit.id);
        const selectedCount = quickMassTransferModal.selectedSoldierIds.length;

        const toggleSelectSoldier = (id: string) => {
          setQuickMassTransferModal(prev => {
            if (!prev) return null;
            const current = new Set(prev.selectedSoldierIds);
            if (current.has(id)) current.delete(id);
            else current.add(id);
            return { ...prev, selectedSoldierIds: [...current] };
          });
        };

        const toggleSelectAll = () => {
          setQuickMassTransferModal(prev => {
            if (!prev) return null;
            if (prev.selectedSoldierIds.length === unitPersonnel.length) {
              return { ...prev, selectedSoldierIds: [] };
            }
            return { ...prev, selectedSoldierIds: unitPersonnel.map(s => s.id) };
          });
        };

        return (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
            onClick={() => setQuickMassTransferModal(null)}
          >
            <div 
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between bg-sky-950 text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-sky-800 text-white shrink-0">
                    <ArrowLeftRight className="w-5 h-5 text-sky-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm sm:text-base truncate">
                      أمر النقل وإعادة التوزيع الجماعي
                    </h3>
                    <p className="text-[11px] text-sky-200/80 truncate">
                      من التشكيل: <span className="text-white font-bold">{unit.name}</span> • المحدد: <span className="font-mono text-sky-300 font-black">{selectedCount} فرد</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickMassTransferModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options Form */}
              <div className="p-4 border-b space-y-3 bg-slate-100 dark:bg-slate-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      التشكيل المستهدف (الجهة المنقول إليها):
                    </label>
                    <select
                      value={quickMassTransferModal.destinationUnitId}
                      onChange={(e) => setQuickMassTransferModal(prev => prev ? { ...prev, destinationUnitId: e.target.value } : null)}
                      className={`w-full p-2 rounded-xl border text-xs font-black focus:outline-hidden ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- اختر التشكيل المستهدف --</option>
                      {availableDestinations.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.code ? `[${u.code}]` : ''} ({u.type || 'تشكيل'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      ملاحظات وأسباب النقل:
                    </label>
                    <input
                      type="text"
                      value={quickMassTransferModal.orderNotes}
                      onChange={(e) => setQuickMassTransferModal(prev => prev ? { ...prev, orderNotes: e.target.value } : null)}
                      className={`w-full p-2 rounded-xl border text-xs font-medium focus:outline-hidden ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Personnel Selection List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[45vh]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-500">اختر الأفراد المطلوب نقلهم:</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    {quickMassTransferModal.selectedSoldierIds.length === unitPersonnel.length ? 'إلغاء تحديد الكل' : 'تحديد جميع أفراد التشكيل'}
                  </button>
                </div>

                {unitPersonnel.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold">
                    لا يوجد أفراد تابعين لهذه الوحدة مباشرة لربط نقلهم.
                  </div>
                ) : (
                  unitPersonnel.map(s => {
                    const isChecked = quickMassTransferModal.selectedSoldierIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSelectSoldier(s.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/30' 
                            : isDarkMode ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg border shrink-0 ${
                            isChecked ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-400 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs truncate">{s.rank} / {s.fullName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">الرقم العسكري: {s.militaryNumber}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          s.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {s.isActive ? 'على رأس العمل' : 'مستبعد'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between gap-2 bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickMassTransferModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0 || !quickMassTransferModal.destinationUnitId}
                  onClick={() => {
                    const destUnit = units.find(u => u.id === quickMassTransferModal.destinationUnitId);
                    quickMassTransferModal.selectedSoldierIds.forEach(sId => {
                      onTransferSoldier(sId, quickMassTransferModal.destinationUnitId, {
                        orderNumber: `أمر-توزيع-${Math.floor(Math.random() * 9000 + 1000)}`,
                        notes: quickMassTransferModal.orderNotes
                      });
                    });
                    showToast(`تم نقل ${selectedCount} فرد من "${unit.name}" إلى "${destUnit?.name || 'التشكيل الجديد'}" بنجاح`, 'success');
                    setQuickMassTransferModal(null);
                  }}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-black transition-all shadow-lg ${
                    selectedCount === 0 || !quickMassTransferModal.destinationUnitId
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 cursor-pointer shadow-sky-950/40'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>تنفيذ نقل ({selectedCount}) فرد فوراً</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* OPERATIONAL ORDER DIRECTIVE MODAL */}
      {opOrderModal && (() => {
        const targetUnit = opOrderModal.unit;
        return (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 font-sans"
            onClick={() => setOpOrderModal(null)}
          >
            <div 
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between bg-emerald-950 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-800 text-white">
                    <Target className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base">أمر عمليات وتكليف ميداني سري وعاجل</h3>
                    <p className="text-[11px] text-emerald-300/80">الموجه إلى: <span className="text-white font-bold">{targetUnit.name} [{targetUnit.code || '—'}]</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpOrderModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 font-bold text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block font-bold">عنوان المهمة / التكليف:</span>
                    <input
                      type="text"
                      value={opOrderModal.taskTitle}
                      onChange={(e) => setOpOrderModal(prev => prev ? { ...prev, taskTitle: e.target.value } : null)}
                      className={`w-full mt-1 p-2 rounded-xl border text-xs font-black focus:outline-hidden ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block font-bold">مستوى الأسبقية:</span>
                    <select
                      value={opOrderModal.priority}
                      onChange={(e) => setOpOrderModal(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                      className={`w-full mt-1 p-2 rounded-xl border text-xs font-black focus:outline-hidden ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="عاجل جداً">عاجل جداً (سري للغاية)</option>
                      <option value="أسبقية عالية">أسبقية عالية</option>
                      <option value="اعتيادي">اعتيادي</option>
                    </select>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 block font-bold">الموقع والتمركز التكتيكي:</span>
                  <input
                    type="text"
                    value={opOrderModal.location}
                    onChange={(e) => setOpOrderModal(prev => prev ? { ...prev, location: e.target.value } : null)}
                    className={`w-full mt-1 p-2 rounded-xl border text-xs font-black focus:outline-hidden ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 block font-bold">نص التعليمات والأوامر الميدانية:</span>
                  <textarea
                    rows={4}
                    value={opOrderModal.instructions}
                    onChange={(e) => setOpOrderModal(prev => prev ? { ...prev, instructions: e.target.value } : null)}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-xs font-medium focus:outline-hidden ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="p-4 border-t flex items-center justify-between gap-2 bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpOrderModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold transition-all cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`تم توثيق وإصدار أمر العمليات لـ "${targetUnit.name}" بنجاح`, 'success');
                    setOpOrderModal(null);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <Printer className="w-4 h-4" />
                  <span>توثيق وطباعة الأمر التنفيذي</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SOLDIER MOVEMENT HISTORY & TRANSFERS CHRONOLOGICAL MODAL */}
      {isMovementHistoryModalOpen && movementHistorySoldier && (
        <SoldierMovementHistoryModal
          isOpen={isMovementHistoryModalOpen}
          soldier={movementHistorySoldier}
          units={units}
          currentUser={currentUser}
          printSettings={printSettings}
          isDarkMode={isDarkMode}
          onClose={() => {
            setIsMovementHistoryModalOpen(false);
            setMovementHistorySoldier(null);
          }}
          onUpdateSoldier={(soldierId, updatedFields) => {
            setMovementHistorySoldier(prev => prev && prev.id === soldierId ? { ...prev, ...updatedFields } : prev);
            setSearchedSoldiers(prev => prev.map(s => s.id === soldierId ? { ...s, ...updatedFields } : s));
            showToast('تم تحديث وحفظ سجل الحركة بنجاح', 'success');
          }}
          onAddLog={(action, details) => {
            onAddLog('تعديل', 'سجل الحركة', details);
          }}
        />
      )}

      {/* SMART BOTTOM TOAST NOTIFICATION SYSTEM */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300 font-sans">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-black transition-all ${
            toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50' :
            toast.type === 'error' ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/50' :
            'bg-slate-900/95 border-sky-500/50 text-sky-100 shadow-slate-950/50'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toast.message}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)} 
              className="mr-1 p-0.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
