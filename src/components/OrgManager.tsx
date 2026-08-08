import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Users, 
  UserPlus, 
  User as UserIcon,
  ArrowLeftRight, 
  Trash2, 
  Edit, 
  ShieldCheck, 
  ShieldAlert,
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
  History,
  Wifi,
  Radio,
  Terminal,
  Filter,
  ArrowUpRight,
  Info,
  X,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  CheckSquare,
  Square,
  Check,
  Sliders,
  Shield,
  Phone,
  HeartPulse
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelImporter from './ExcelImporter';
import { Unit, Soldier, User, PrintSettings, AuditLog, AttendanceRecord } from '../types';
import { fetchWithRetry, safeJson } from '../lib/api';
import SoldierProfile from './SoldierProfile';

interface OrgManagerProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance?: AttendanceRecord[];
  currentUser: { id: string; name: string; role: string; unitId: string | null };
  auditLogs?: AuditLog[];
  printSettings?: PrintSettings;
  selectedSoldierId?: string | null;
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

export default function OrgManager({
  units,
  soldiers,
  attendance: propsAttendance = [],
  currentUser,
  auditLogs: propsAuditLogs = [],
  printSettings,
  selectedSoldierId,
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
    { id: 'militaryStatus', label: 'الحالة الميدانية (على رأس العمل/إجازة...)', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.militaryStatus || (s.isActive ? 'على رأس العمل' : 'مستبعد') },
    { id: 'isActive', label: 'حالة القوة (نشط / مستبعد)', category: 'البيانات الأساسية والعسكرية', defaultChecked: true, getValue: (s: Soldier) => s.isActive ? 'نشط / جاهز' : 'مستبعد / احتياط' },

    // بيانات الهوية والتواصل
    { id: 'nationalId', label: 'رقم البطاقة / الهوية الوطنية', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.nationalId || '' },
    { id: 'phoneNumber', label: 'رقم الهاتف الخاص', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.phoneNumber || '' },
    { id: 'emergencyContact', label: 'أرقام المقربين / أرقام الطوارئ', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.emergencyContact || '' },
    { id: 'address', label: 'العنوان / مكان السكن', category: 'بيانات الهوية والتواصل', defaultChecked: true, getValue: (s: Soldier) => s.address || '' },

    // البيانات الشخصية والطبية
    { id: 'bloodType', label: 'فصيلة الدم', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.bloodType || '' },
    { id: 'birthDate', label: 'تاريخ الميلاد', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.birthDate || '' },
    { id: 'qualification', label: 'المؤهل العلمي', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.qualification || '' },
    { id: 'specialization', label: 'التخصص العسكري / المهني', category: 'البيانات الشخصية والطبية', defaultChecked: true, getValue: (s: Soldier) => s.specialization || '' },
    { id: 'medicalHistory', label: 'السجل الطبي / الحالة الصحية', category: 'البيانات الشخصية والطبية', defaultChecked: false, getValue: (s: Soldier) => s.medicalHistory || '' },

    // الهيكل التنظيمي والإداري
    { id: 'joinDate', label: 'تاريخ الانضمام / بدء الخدمة', category: 'الهيكل التنظيمي والإداري', defaultChecked: true, getValue: (s: Soldier) => s.joinDate || '' },
    { id: 'battalion', label: 'الكتيبة', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.battalion || '' },
    { id: 'company', label: 'السرية', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.company || '' },
    { id: 'platoon', label: 'الفصيلة', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.platoon || '' },
    { id: 'assignedTasks', label: 'المهام والتكليفات الرسمية', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.assignedTasks || '' },
    { id: 'accountUsername', label: 'اسم مستخدم حساب البوابة', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.accountUsername || '' },
    { id: 'createdAt', label: 'تاريخ التسجيل بالنظام', category: 'الهيكل التنظيمي والإداري', defaultChecked: false, getValue: (s: Soldier) => s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-SA') : '' },
  ], []);

  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(() =>
    EXPORT_FIELDS_OPTIONS.filter(f => f.defaultChecked).map(f => f.id)
  );
  const [exportScopeFilter, setExportScopeFilter] = useState<'all' | 'active_only'>('all');

  // Toggle field helper
  const toggleExportField = (fieldId: string) => {
    setSelectedExportFields(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  // Custom Excel Export Handler
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
      onAddLog('تصدير', 'الأفراد', `تصدير بيانات القوة والأفراد لعدد (${targetSoldiers.length}) فرد مع تحديد (${activeOptions.length}) حقل مخصص بصيغة Excel.`);
    }

    setIsOrgSettingsOpen(false);
    setSettingsSubTab('menu');
  };

  // Excel Template Download Handler
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

  // Recent Operations Audit Log State
  const [fetchedAuditLogs, setFetchedAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  const loadRecentAuditLogs = async () => {
    try {
      setLoadingAuditLogs(true);
      const res = await fetchWithRetry('/api/audit-logs');
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          setFetchedAuditLogs(data);
        }
      }
    } catch (err) {
      console.error('Failed to load recent audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  React.useEffect(() => {
    loadRecentAuditLogs();
  }, []);

  const displayAuditLogs = useMemo(() => {
    const combined = propsAuditLogs && propsAuditLogs.length > 0 ? propsAuditLogs : fetchedAuditLogs;
    return [...combined]
      .filter(log => {
        const details = log.details || '';
        const tableName = log.tableName || '';

        // Exclude leaves / vacations
        if (
          tableName.includes('sick_leaves') || 
          tableName.includes('leave') || 
          details.includes('إجاز') || 
          details.includes('اجاز')
        ) {
          return false;
        }

        // Include key soldier operations: soldier edit, transfer, delete/exclude, add/register, promotion
        return (
          tableName.includes('الأفراد') ||
          tableName.includes('soldier') ||
          details.includes('عسكري') ||
          details.includes('فرد') ||
          details.includes('تعديل') ||
          details.includes('ترقية') ||
          details.includes('نقل') ||
          details.includes('حذف') ||
          details.includes('استبعاد') ||
          details.includes('تسجيل') ||
          details.includes('إضافة') ||
          details.includes('توظيف')
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [propsAuditLogs, fetchedAuditLogs]);

  // Sync selectedSoldierId from prop
  React.useEffect(() => {
    if (selectedSoldierId) {
      setActiveTab('soldiers');
      setSelectedProfileSoldierId(selectedSoldierId);
    }
  }, [selectedSoldierId]);

  // Permissions helper
  const hasWriteAccess = useMemo(() => {
    return currentUser.role === 'admin' || currentUser.role === 'commander_formation';
  }, [currentUser]);

  // Restrict unit context if unit-restricted role
  const isRestrictedUser = useMemo(() => {
    return currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
  }, [currentUser]);

  const allowedUnits = useMemo(() => {
    if (isRestrictedUser) {
      return units.filter(u => u.id === currentUser.unitId);
    }
    return units;
  }, [units, isRestrictedUser, currentUser.unitId]);

  const scopedSoldiers = useMemo(() => {
    if (isRestrictedUser) {
      return soldiers.filter(s => s.unitId === currentUser.unitId);
    }
    return soldiers;
  }, [soldiers, isRestrictedUser, currentUser.unitId]);

  // ---- 1. UNITS MANAGEMENT LOGIC ----
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitParentId, setUnitParentId] = useState<string>('');
  const [unitCommander, setUnitCommander] = useState('');
  const [unitType, setUnitType] = useState<string>('كتيبة'); // قوات | فرقة | لواء | كتيبة | سرية | فصيلة | مجموعة
  const [unitLocation, setUnitLocation] = useState('');
  const [unitApprovedStrength, setUnitApprovedStrength] = useState<number>(100);
  const [unitStatus, setUnitStatus] = useState<string>('نشط'); // نشط | ملغى | مؤرشف
  const [unitCode, setUnitCode] = useState('');

  const handleOpenUnitModal = (unit: Unit | null = null) => {
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
      setUnitParentId('');
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
        `تعديل بيانات الوحدة (${unitName})، المستوى: ${unitType}، الرمز: ${unitCode || 'لا يوجد'}، القائد: ${commanderVal || 'لم يعين'}.`
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


  // ---- 2. SOLDIERS MANAGEMENT LOGIC ----
  const [isSoldierModalOpen, setIsSoldierModalOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [soldierName, setSoldierName] = useState('');
  const [soldierMilNumber, setSoldierMilNumber] = useState('');
  const [soldierRank, setSoldierRank] = useState(MILITARY_RANKS[MILITARY_RANKS.length - 1]); // default 'جندي'
  const [soldierUnitId, setSoldierUnitId] = useState('');
  const [soldierActive, setSoldierActive] = useState(true);

  // Transfers state
  const [transferSoldierId, setTransferSoldierId] = useState('');
  const [transferTargetUnitId, setTransferTargetUnitId] = useState('');
  const [transferOrderNumber, setTransferOrderNumber] = useState('');
  const [transferOrderDate, setTransferOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferIssuedBy, setTransferIssuedBy] = useState('قيادة لواء المشاة الآلي');
  const [transferNotes, setTransferNotes] = useState('سد الشواغر وملاك القوة التنظيمية للكتيبة');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Search and filter for soldiers table
  const [soldierSearch, setSoldierSearch] = useState('');
  const [soldierUnitFilter, setSoldierUnitFilter] = useState('all');
  const [soldierRankFilter, setSoldierRankFilter] = useState('all');
  const [soldierStatusFilter, setSoldierStatusFilter] = useState('all');

  // High performance search states
  const [searchedSoldiers, setSearchedSoldiers] = useState<Soldier[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loadingSoldiers, setLoadingSoldiers] = useState<boolean>(false);
  const [soldierSearchError, setSoldierSearchError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [fetchingIndividualSoldier, setFetchingIndividualSoldier] = useState(false);

  // Virtual Scrolling States and Refs for smooth rendering of thousands of records
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);
  const [mobileScrollTop, setMobileScrollTop] = useState(0);
  const desktopContainerRef = React.useRef<HTMLDivElement>(null);
  const mobileContainerRef = React.useRef<HTMLDivElement>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const hasActiveFilters = useMemo(() => {
    return (debouncedSearch && debouncedSearch.trim() !== '') || 
           soldierRankFilter !== 'all' || 
           soldierUnitFilter !== 'all' || 
           soldierStatusFilter !== 'all';
  }, [debouncedSearch, soldierRankFilter, soldierUnitFilter, soldierStatusFilter]);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(soldierSearch);
    }, 400);
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

  // Fetch soldiers on filter change
  React.useEffect(() => {
    if (!hasActiveFilters) {
      setSearchedSoldiers([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    fetchSoldiers(0, true);
    
    // Reset virtual scroll state and container scroll positions to top on search/filter changes
    setDesktopScrollTop(0);
    setMobileScrollTop(0);
    if (desktopContainerRef.current) desktopContainerRef.current.scrollTop = 0;
    if (mobileContainerRef.current) mobileContainerRef.current.scrollTop = 0;
  }, [debouncedSearch, soldierRankFilter, soldierUnitFilter, soldierStatusFilter, hasActiveFilters]);

  // Infinite scroll support
  React.useEffect(() => {
    if (activeTab !== 'soldiers') return;
    
    const handleScroll = () => {
      if (loadingSoldiers || !hasMore) return;
      
      const threshold = 150;
      const totalHeight = document.documentElement.scrollHeight;
      const currentScroll = window.innerHeight + window.scrollY;
      
      if (totalHeight - currentScroll < threshold) {
        fetchSoldiers(page + 1, false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, loadingSoldiers, hasMore, page, debouncedSearch, soldierRankFilter, soldierUnitFilter, soldierStatusFilter]);

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

  // Advanced Hierarchy States & Services
  const [searchUnitQuery, setSearchUnitQuery] = useState('');
  const [filterNoCommanderOnly, setFilterNoCommanderOnly] = useState(false);
  const [showAsGrid, setShowAsGrid] = useState(false);

  // C2 Connectivity Simulation
  const [c2Testing, setC2Testing] = useState(false);
  const [c2Status, setC2Status] = useState<'idle' | 'testing' | 'success'>('idle');
  const [c2Logs, setC2Logs] = useState<string[]>([]);

  // Bulk Transfer Service
  const [bulkSourceUnitId, setBulkSourceUnitId] = useState('');
  const [bulkTargetUnitId, setBulkTargetUnitId] = useState('');
  const [bulkTransferMsg, setBulkTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Official Military Warrant Order Modal
  const [showOfficialWarrant, setShowOfficialWarrant] = useState(false);
  const [selectedWarrantUnitId, setSelectedWarrantUnitId] = useState('');

  // Memoized filter for the military units hierarchy & search system
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      // 1. Search text query
      if (searchUnitQuery.trim() !== '') {
        const query = searchUnitQuery.toLowerCase();
        const nameMatch = unit.name.toLowerCase().includes(query);
        const cmdMatch = unit.commanderName ? unit.commanderName.toLowerCase().includes(query) : false;
        if (!nameMatch && !cmdMatch) return false;
      }
      // 2. Filter No Commander Only
      if (filterNoCommanderOnly && unit.commanderName) {
        return false;
      }
      return true;
    });
  }, [units, searchUnitQuery, filterNoCommanderOnly]);

  // C2 Link simulation trigger
  const handleRunC2Test = (unitName: string) => {
    setC2Testing(true);
    setC2Status('testing');
    setC2Logs([`[${new Date().toLocaleTimeString('ar-EG')}] جاري استدعاء قنوات الاتصال وتأمين الاتصال التكتيكي المشفر...`]);
    
    const steps = [
      `[${new Date().toLocaleTimeString('ar-EG')}] جاري التحقق من المدار النشط لقمر الاتصال (SAT-COM 9A)...`,
      `[${new Date().toLocaleTimeString('ar-EG')}] تم التحقق من سلامة نفق بروتوكول القيادة الآمن (AES-256 TLS 1.3)...`,
      `[${new Date().toLocaleTimeString('ar-EG')}] جاري فحص استجابة الخادم المحلي لوحدة: ${unitName}...`,
      `[${new Date().toLocaleTimeString('ar-EG')}] تم التحقق من جاهزية مزامنة قاعدة البيانات والتحضير الفوري...`,
      `[${new Date().toLocaleTimeString('ar-EG')}] الربط الإلكتروني للقيادة والسيطرة (C2) مع [${unitName}] نشط ومستقر تماماً.`
    ];

    steps.forEach((stepText, idx) => {
      setTimeout(() => {
        setC2Logs(prev => [...prev, stepText]);
        if (idx === steps.length - 1) {
          setC2Status('success');
          setC2Testing(false);
        }
      }, (idx + 1) * 700);
    });
  };

  // Bulk force transfer service execution
  const handleBulkForceTransfer = () => {
    if (!bulkSourceUnitId || !bulkTargetUnitId) {
      setBulkTransferMsg({ type: 'error', text: 'يرجى تحديد وحدة المصدر ووحدة المقصد أولاً.' });
      return;
    }
    if (bulkSourceUnitId === bulkTargetUnitId) {
      setBulkTransferMsg({ type: 'error', text: 'لا يمكن النقل التلقائي لنفس الوحدة العسكرية المصدر.' });
      return;
    }

    const srcUnit = units.find(u => u.id === bulkSourceUnitId);
    const destUnit = units.find(u => u.id === bulkTargetUnitId);
    if (!srcUnit || !destUnit) {
      setBulkTransferMsg({ type: 'error', text: 'الوحدة المحددة غير صحيحة.' });
      return;
    }

    const sourceForce = soldiers.filter(s => s.unitId === bulkSourceUnitId);
    if (sourceForce.length === 0) {
      setBulkTransferMsg({ type: 'error', text: `وحدة (${srcUnit.name}) لا تحتوي حالياً على أي عسكريين لنقلهم.` });
      return;
    }

    // Execute sequential transfers
    sourceForce.forEach(soldier => {
      onTransferSoldier(soldier.id, bulkTargetUnitId);
    });

    onAddLog(
      'تعديل',
      'الأفراد',
      `نقل جماعي استثنائي: إعادة توجيه وتعيين كامل قوة (${srcUnit.name}) بعدد (${sourceForce.length}) عسكري إلى ملاك (${destUnit.name}) لأسباب دمج وإعادة هيكلة.`
    );

    setBulkTransferMsg({
      type: 'success',
      text: `تمت عملية إعادة توجيه القوة التكتيكية بنجاح! تم نقل عدد (${sourceForce.length}) عسكري من [${srcUnit.name}] إلى [${destUnit.name}].`
    });

    setBulkSourceUnitId('');
    setBulkTargetUnitId('');

    setTimeout(() => {
      setBulkTransferMsg(null);
    }, 8000);
  };

  const handleOpenSoldierModal = async (soldier: Soldier | null = null) => {
    // Check write rights: restricted users can modify their unit's soldiers!
    const canWriteSoldier = currentUser.role !== 'operations';
    if (!canWriteSoldier) {
      alert('عذراً! دورك الحالي لا يسمح بإضافة أو تعديل الأفراد.');
      return;
    }

    // Default target unit
    const defaultUnitId = currentUser.unitId || allowedUnits[0]?.id || '';

    if (soldier) {
      setFetchingIndividualSoldier(true);
      try {
        const res = await fetchWithRetry(`/api/soldiers/${soldier.id}`);
        if (!res.ok) throw new Error('فشل جلب بيانات العسكري الكاملة');
        const fullSoldier = await safeJson(res);
        setEditingSoldier(fullSoldier);
        setSoldierName(fullSoldier.fullName);
        setSoldierMilNumber(fullSoldier.militaryNumber);
        setSoldierRank(fullSoldier.rank);
        setSoldierUnitId(fullSoldier.unitId);
        setSoldierActive(fullSoldier.isActive);
      } catch (err: any) {
        alert(err.message || 'فشل جلب البيانات الكاملة للعسكري');
        return;
      } finally {
        setFetchingIndividualSoldier(false);
      }
    } else {
      setEditingSoldier(null);
      setSoldierName('');
      setSoldierMilNumber('');
      setSoldierRank(MILITARY_RANKS[MILITARY_RANKS.length - 1]);
      setSoldierUnitId(defaultUnitId);
      setSoldierActive(true);
    }
    setIsSoldierModalOpen(true);
  };

  const handleSaveSoldier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldierName.trim() || !soldierMilNumber.trim() || !soldierUnitId) return;

    // Check duplicate military number
    const isDuplicate = soldiers.some(s => s.militaryNumber === soldierMilNumber && (!editingSoldier || s.id !== editingSoldier.id));
    if (isDuplicate) {
      alert('الرقم العسكري مسجل مسبقاً لعسكري آخر! يرجى إدخال رقم فريد.');
      return;
    }

    if (editingSoldier) {
      const changes: string[] = [];
      if (editingSoldier.fullName !== soldierName) {
        changes.push(`تعديل الاسم من [${editingSoldier.fullName}] إلى [${soldierName}]`);
      }
      if (editingSoldier.militaryNumber !== soldierMilNumber) {
        changes.push(`تعديل الرقم العسكري من [${editingSoldier.militaryNumber}] إلى [${soldierMilNumber}]`);
      }
      if (editingSoldier.rank !== soldierRank) {
        changes.push(`ترقية/تعديل الرتبة من [${editingSoldier.rank}] إلى [${soldierRank}]`);
      }
      if (editingSoldier.unitId !== soldierUnitId) {
        const oldUnit = units.find(u => u.id === editingSoldier.unitId)?.name || 'غير محدد';
        const newUnit = units.find(u => u.id === soldierUnitId)?.name || 'غير محدد';
        changes.push(`نقل/تعديل الوحدة من [${oldUnit}] إلى [${newUnit}]`);
      }
      if (editingSoldier.isActive !== soldierActive) {
        changes.push(`تعديل الحالة إلى [${soldierActive ? 'نشط/جاهز' : 'مستبعد/احتياط'}]`);
      }

      const detailsMsg = changes.length > 0 
        ? `تعديل ملف العسكري (${soldierRank}/ ${soldierName}): تم [${changes.join('، ')}].`
        : `تعديل ملف العسكري: ${soldierRank}/ ${soldierName} (رقم عسكري: ${soldierMilNumber}).`;

      onEditSoldier(editingSoldier.id, soldierMilNumber, soldierName, soldierRank, soldierUnitId, soldierActive);
      onAddLog('تعديل', 'الأفراد', detailsMsg);
    } else {
      onAddSoldier(soldierMilNumber, soldierName, soldierRank, soldierUnitId);
      onAddLog(
        'إضافة', 
        'الأفراد', 
        `تسجيل عسكري جديد بالقوة: ${soldierRank}/ ${soldierName} (رقم عسكري: ${soldierMilNumber}) بالوحدة (${units.find(u => u.id === soldierUnitId)?.name || 'غير محدد'}).`
      );
    }

    setIsSoldierModalOpen(false);

    // Synchronize local search
    setTimeout(() => {
      fetchSoldiers(page, true);
    }, 500);
  };

  const handleDeleteSoldierClick = (id: string, name: string) => {
    if (currentUser.role === 'operations') {
      alert('لا توجد صلاحيات لحذف الأفراد.');
      return;
    }
    
    setDeleteTargetType('soldier');
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setDeleteVerificationCode('');
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetType === 'soldier') {
      onDeleteSoldier(deleteTargetId);
      onAddLog('حذف', 'الأفراد', `حذف بيانات العسكري (${deleteTargetName}) بشكل دائم.`);
    } else if (deleteTargetType === 'unit') {
      onDeleteUnit(deleteTargetId);
      onAddLog('حذف', 'الوحدات', `حذف الوحدة العسكرية (${deleteTargetName}) من الهيكل التنظيمي.`);
    }
    setIsConfirmOpen(false);
    setDeleteTargetType(null);
    setDeleteTargetId('');
    setDeleteTargetName('');
    setDeleteVerificationCode('');

    // Synchronize local search
    setTimeout(() => {
      fetchSoldiers(page, true);
    }, 500);
  };

  // Move soldier to new unit
  const handleOpenTransfer = async (soldier: Soldier) => {
    if (currentUser.role === 'operations') {
      alert('لا توجد صلاحيات لنقل العسكريين للعمليات.');
      return;
    }
    setFetchingIndividualSoldier(true);
    try {
      const res = await fetchWithRetry(`/api/soldiers/${soldier.id}`);
      if (!res.ok) throw new Error('فشل جلب بيانات العسكري الكاملة');
      const fullSoldier = await safeJson(res);
      setTransferSoldierId(fullSoldier.id);
      setTransferTargetUnitId('');
      setTransferOrderNumber(`أ-${Math.floor(1000 + Math.random() * 9000)}//${new Date().getFullYear()}`);
      setTransferOrderDate(new Date().toISOString().split('T')[0]);
      setTransferIssuedBy('قيادة لواء المشاة الآلي');
      setTransferNotes('سد شواغر القوة وملاكات الاستعداد العملياتي');
      setIsTransferOpen(true);
    } catch (err: any) {
      alert(err.message || 'فشل جلب البيانات الكاملة للعسكري');
    } finally {
      setFetchingIndividualSoldier(false);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSoldierId || !transferTargetUnitId) return;

    const soldier = soldiers.find(s => s.id === transferSoldierId);
    const sourceUnit = units.find(u => u.id === soldier?.unitId)?.name || '';
    const targetUnit = units.find(u => u.id === transferTargetUnitId)?.name || '';

    if (soldier) {
      onTransferSoldier(transferSoldierId, transferTargetUnitId, {
        orderNumber: transferOrderNumber || 'غير محدد',
        orderDate: transferOrderDate || new Date().toISOString().split('T')[0],
        issuedBy: transferIssuedBy || 'قيادة اللواء',
        notes: transferNotes || 'سد شواغر القوة'
      });
      onAddLog(
        'تعديل', 
        'الأفراد', 
        `نقل العسكري: ${soldier.rank}/ ${soldier.fullName} من (${sourceUnit}) إلى (${targetUnit}) بموجب القرار الإداري رقم (${transferOrderNumber || 'غير محدد'}).`
      );
      alert(`تمت عملية النقل بنجاح إلى ${targetUnit}!`);
    }

    setIsTransferOpen(false);

    // Synchronize local search
    setTimeout(() => {
      fetchSoldiers(page, true);
    }, 500);
  };

  // Filtered soldiers list for visual table
  const searchAndFilterSoldiers = useMemo(() => {
    return scopedSoldiers.filter(s => {
      // Unit filter
      const activeFilter = isRestrictedUser
        ? (currentUser.unitId || 'all')
        : soldierUnitFilter;

      if (activeFilter !== 'all' && s.unitId !== activeFilter) return false;

      // Search match
      if (soldierSearch) {
        const query = soldierSearch.trim().toLowerCase();
        return s.fullName.toLowerCase().includes(query) || 
               s.militaryNumber.includes(query) || 
               s.rank.toLowerCase().includes(query);
      }
      return true;
    });
  }, [scopedSoldiers, soldierUnitFilter, soldierSearch, isRestrictedUser, currentUser.unitId]);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Tab Switcher Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <div className="grid grid-cols-2 w-full sm:flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200 sm:w-auto">
            <button
              onClick={() => setActiveTab('units')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === 'units' 
                  ? 'bg-emerald-800 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              الهيكل التنظيمي والوحدات ({units.length})
            </button>
            <button
              onClick={() => setActiveTab('soldiers')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === 'soldiers' 
                  ? 'bg-emerald-800 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              إدارة القوة والأفراد ({soldiers.length})
            </button>
          </div>

          {/* Dynamic add buttons based on tab */}
          {currentUser.role !== 'operations' && (
            <div className="flex">
              {activeTab === 'units' ? (
                <button
                  onClick={() => handleOpenUnitModal(null)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer border border-emerald-700/30"
                >
                  <FolderPlus className="w-4 h-4" />
                  إضافة وحدة عسكرية
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenSoldierModal(null)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer border border-emerald-700/30"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>تسجيل عسكري جديد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsSubTab('menu');
                      setIsOrgSettingsOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer border border-slate-700 shrink-0"
                    title="إعدادات القوة والأفراد (تصدير واستيراد Excel)"
                  >
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span>الإعدادات</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- TAB 1: UNITS HIERARCHY TREE ---- */}
      {activeTab === 'units' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* Advanced Tactical Search & Filter Panel */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center relative z-10">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث عن وحدة تكتيكية أو قائد بالاسم..."
                  value={searchUnitQuery}
                  onChange={(e) => setSearchUnitQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans font-bold"
                />
              </div>

              {/* Checkbox for vacant command */}
              <label className="flex items-center gap-2.5 text-xs font-black text-slate-300 cursor-pointer select-none hover:text-slate-100 transition-colors">
                <input 
                  type="checkbox"
                  checked={filterNoCommanderOnly}
                  onChange={(e) => setFilterNoCommanderOnly(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500/30 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  عرض القيادات الشاغرة فقط
                </span>
              </label>
            </div>

            {/* Toggle View Mode */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 gap-1 self-stretch md:self-auto justify-center relative z-10">
              <button
                onClick={() => setShowAsGrid(false)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !showAsGrid 
                    ? 'bg-emerald-800 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                التسلسل الشجري الهرمي
              </button>
              <button
                onClick={() => setShowAsGrid(true)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  showAsGrid 
                    ? 'bg-emerald-800 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                شبكة المؤشرات التكتيكية
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Main Hierarchy Tree or Grid */}
            <div className="lg:col-span-2 space-y-4">
              
              {!showAsGrid ? (
                /* VIEW 1: ADVANCED STAGGERED HIERARCHICAL TREE */
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
                  {/* Subtle Background Grid Line Styling */}
                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h4 className="text-base font-black text-slate-200 font-sans">مخطط السيطرة وتوزيع القيادة الحية</h4>
                      <p className="text-[10px] text-slate-400 mt-1">توضح هذه الشجرة الرابط المباشر للوحدات المعتمدة ونسبة الجاهزية التشغيلية لكل تشكيل عسكري.</p>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      مزامنة القيادة نشطة
                    </div>
                  </div>

                  <div className="space-y-6 pt-4 border-t border-slate-800/80 relative z-10">
                    {/* Render Root Units that match filters */}
                    {filteredUnits.filter(u => !u.parentId).map(rootUnit => {
                      // Find direct children
                      const rootChildren = filteredUnits.filter(u => u.parentId === rootUnit.id);
                      
                      // Calculate force metrics for root
                      const rootSoldiers = soldiers.filter(s => s.unitId === rootUnit.id);
                      const rootTotalForce = rootSoldiers.length;
                      const rootActiveForce = rootSoldiers.filter(s => s.isActive).length;
                      const rootReadiness = rootTotalForce > 0 ? Math.round((rootActiveForce / rootTotalForce) * 100) : 0;
                      
                      return (
                        <div key={rootUnit.id} className="border border-slate-800 rounded-2xl p-5 bg-slate-950/60 hover:border-slate-700/80 transition-all duration-150 shadow-xs relative">
                          
                          {/* Unit Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-emerald-100 border border-emerald-700/40 shadow-inner flex-shrink-0">
                                <Building className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="font-extrabold text-slate-100 font-sans text-sm sm:text-base">{rootUnit.name}</h5>
                                  <span className="bg-emerald-900/40 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800/40 font-bold font-sans">
                                    {rootUnit.type || 'قوات'}
                                  </span>
                                  {rootUnit.code && (
                                    <span className="bg-slate-800 text-amber-400 font-mono text-[9px] px-2 py-0.5 rounded border border-slate-700 font-bold">
                                      {rootUnit.code}
                                    </span>
                                  )}
                                  {rootUnit.location && (
                                    <span className="bg-slate-900 text-slate-400 text-[9px] px-2 py-0.5 rounded border border-slate-800 font-sans">
                                      📍 {rootUnit.location}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400 font-sans">
                                  <p>قائد التشكيل: <span className="font-bold text-slate-200">{rootUnit.commanderName || '⚠️ شاغر القيادة'}</span></p>
                                  <p className="border-r border-slate-800 pr-4 mr-4 hidden sm:block">
                                    ملاك القوة: <span className="font-bold text-amber-400">{rootTotalForce}</span> / <span className="text-slate-300">{rootUnit.approvedStrength || 120} فرد معتمد</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Live metrics indicator inside tree */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-left">
                                <div className="text-[10px] text-slate-400 font-sans">جاهزية القوة البشرية</div>
                                <div className="flex items-center gap-2 justify-end mt-0.5">
                                  <span className="text-xs font-black text-slate-200 font-mono">{rootReadiness}%</span>
                                  <span className="text-[10px] text-slate-500 font-mono">({rootActiveForce}/{rootTotalForce})</span>
                                </div>
                              </div>
                              <div className={`w-2.5 h-2.5 rounded-full border ${
                                rootReadiness >= 85 ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/20' : 
                                rootReadiness >= 50 ? 'bg-amber-500 border-amber-400' : 'bg-rose-600 border-rose-500'
                              }`}></div>
                            </div>
                          </div>

                          {/* Horizontal Readiness Bar */}
                          <div className="mt-2.5 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                rootReadiness >= 85 ? 'bg-gradient-to-l from-emerald-500 to-teal-600' : 
                                rootReadiness >= 50 ? 'bg-gradient-to-l from-amber-500 to-yellow-600' : 'bg-gradient-to-l from-rose-600 to-red-700'
                              }`} 
                              style={{ width: `${Math.max(rootReadiness, 4)}%` }}
                            ></div>
                          </div>

                          {/* Quick Interactive Toolset for Root */}
                          <div className="mt-3 flex flex-wrap gap-2 justify-start sm:justify-end border-t border-slate-900/50 pt-2.5">
                            <button
                              onClick={() => {
                                setSelectedWarrantUnitId(rootUnit.id);
                                setShowOfficialWarrant(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-bold border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              وثيقة التشكيل
                            </button>

                            <button
                              onClick={() => handleRunC2Test(rootUnit.name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-bold border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                              فحص الإشارة C2
                            </button>

                            {hasWriteAccess && (
                              <>
                                <button
                                  onClick={() => handleOpenUnitModal(rootUnit)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-sky-400 text-[10px] font-bold border border-slate-800 hover:border-slate-750 transition-all cursor-pointer"
                                  title="تعديل التشكيل الرئيسي"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDeleteUnitClick(rootUnit.id, rootUnit.name)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/20 text-rose-500 text-[10px] font-bold border border-slate-800 hover:border-rose-900/40 transition-all cursor-pointer"
                                  title="حذف التشكيل الرئيسي"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  مسح
                                </button>
                              </>
                            )}
                          </div>

                          {/* First Level Children (Subelements: Battalion, Company) */}
                          {rootChildren.length > 0 ? (
                            <div className="mt-5 pr-4 border-r-2 border-dashed border-slate-800 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rootChildren.map(childUnit => {
                                  // Find grand children
                                  const childChildren = filteredUnits.filter(u => u.parentId === childUnit.id);
                                  
                                  // Calculate force metrics for child
                                  const childSoldiers = soldiers.filter(s => s.unitId === childUnit.id);
                                  const childTotalForce = childSoldiers.length;
                                  const childActiveForce = childSoldiers.filter(s => s.isActive).length;
                                  const childReadiness = childTotalForce > 0 ? Math.round((childActiveForce / childTotalForce) * 100) : 0;
                                  
                                  return (
                                    <div key={childUnit.id} className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/60 p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-150 relative">
                                      
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                            <h6 className="font-bold text-slate-100 font-sans text-xs sm:text-sm">{childUnit.name}</h6>
                                            <span className="bg-slate-900 text-slate-400 text-[8px] px-1.5 py-0.5 rounded border border-slate-850 font-sans">
                                              {childUnit.type || 'كتيبة'}
                                            </span>
                                            {childUnit.code && (
                                              <span className="bg-slate-900 text-amber-400 font-mono text-[8px] px-1 py-0.5 rounded border border-slate-850 font-bold">
                                                {childUnit.code}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-1">
                                            القائد: <span className="font-semibold text-slate-300">{childUnit.commanderName || 'غير معين'}</span>
                                            {childUnit.location && <span className="text-slate-500 mr-2 border-r border-slate-900 pr-2">📍 {childUnit.location}</span>}
                                          </p>
                                        </div>

                                        {hasWriteAccess && (
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={() => handleOpenUnitModal(childUnit)}
                                              className="p-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                                              title="تعديل التابع"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={() => handleDeleteUnitClick(childUnit.id, childUnit.name)}
                                              className="p-1 text-rose-500/70 hover:text-rose-500 transition-colors cursor-pointer"
                                              title="حذف التابع"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Mini Stats Bar for Sub-unit */}
                                      <div className="mt-3 space-y-1.5 text-[10px]">
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500">القوة العاملة الفعلية:</span>
                                          <span className="font-bold text-emerald-400 font-mono">{childActiveForce} فرد جاهز</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500">ملاك القوة المعتمد:</span>
                                          <span className="font-bold text-slate-300 font-mono">{childTotalForce} / {childUnit.approvedStrength || 100} فرد معتمد</span>
                                        </div>
                                      </div>
                                      <div className="mt-1 w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${
                                            childReadiness >= 85 ? 'bg-emerald-500' : 
                                            childReadiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.max(childReadiness, 4)}%` }}
                                        ></div>
                                      </div>

                                      {/* Grand-children indicators (e.g., Platoons / Sections) */}
                                      {childChildren.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-900 pl-1 space-y-1.5">
                                          <p className="text-slate-500 text-[9px] font-bold">الفصائل والمنشآت الفرعية:</p>
                                          <div className="grid grid-cols-1 gap-1">
                                            {childChildren.map(gc => {
                                              const gcSoldiers = soldiers.filter(s => s.unitId === gc.id);
                                              return (
                                                <div key={gc.id} className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded border border-slate-850/60 text-[9px]">
                                                  <span className="text-slate-300 font-extrabold">{gc.name}</span>
                                                  <span className="text-slate-500 font-mono font-bold">({gcSoldiers.filter(s => s.isActive).length}/{gcSoldiers.length} عسكري)</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Mini Action triggers */}
                                      <div className="mt-3.5 pt-2 border-t border-slate-900/40 flex justify-between gap-1">
                                        <button
                                          onClick={() => {
                                            setSelectedWarrantUnitId(childUnit.id);
                                            setShowOfficialWarrant(true);
                                          }}
                                          className="text-[9px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                        >
                                          وثيقة التشكيل
                                        </button>
                                        <button
                                          onClick={() => handleRunC2Test(childUnit.name)}
                                          className="text-[9px] font-bold text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Wifi className="w-2.5 h-2.5" />
                                          فحص الربط
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 pr-6 py-2 border-r-2 border-slate-850 text-xs text-slate-500 italic font-sans">
                              لا تندرج أي سرايا، كتائب أو فصائل فرعية مباشرة تحت هذا التشكيل حالياً.
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredUnits.length === 0 && (
                      <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-850">
                        <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2.5" />
                        <p className="text-xs text-slate-400 font-bold font-sans">لا توجد وحدات عسكرية تطابق شروط البحث والترشيح المحددة.</p>
                        <button
                          onClick={() => {
                            setSearchUnitQuery('');
                            setFilterNoCommanderOnly(false);
                          }}
                          className="mt-3 text-[10px] text-emerald-500 hover:underline font-bold font-sans"
                        >
                          تصفية كافة المعايير
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VIEW 2: TACTICAL BENTO STATS GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUnits.map(unit => {
                    const unitSoldiers = soldiers.filter(s => s.unitId === unit.id);
                    const totalForce = unitSoldiers.length;
                    const activeForce = unitSoldiers.filter(s => s.isActive).length;
                    const inactiveForce = totalForce - activeForce;
                    const readiness = totalForce > 0 ? Math.round((activeForce / totalForce) * 100) : 0;
                    
                    const parentName = units.find(u => u.id === unit.parentId)?.name;

                    return (
                      <div key={unit.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between hover:border-slate-750 transition-all">
                        {/* Upper Details */}
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Building className="w-4 h-4 text-emerald-500" />
                                <h5 className="font-extrabold text-slate-100 font-sans text-sm">{unit.name}</h5>
                              </div>
                              {parentName && (
                                <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-850 block w-max mt-1">
                                  تبعية: {parentName}
                                </span>
                              )}
                            </div>
                            
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              readiness >= 85 ? 'bg-emerald-500/10 text-emerald-400' :
                              readiness >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {readiness >= 85 ? 'جاهزية قتالية عالية' : readiness >= 50 ? 'جاهزية متوسطة' : 'جاهزية حرجة'}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                            <div>
                              <div className="text-[9px] text-slate-500 font-sans">إجمالي القوة</div>
                              <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">{totalForce}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500 font-sans">القوة النشطة</div>
                              <div className="text-sm font-bold text-emerald-500 font-mono mt-0.5">{activeForce}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500 font-sans">قوة احتياطية</div>
                              <div className="text-sm font-bold text-amber-500 font-mono mt-0.5">{inactiveForce}</div>
                            </div>
                          </div>
                          
                          <div className="mt-3.5">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>مؤشر الجاهزية التشغيلية</span>
                              <span className="font-bold text-slate-200 font-mono">{readiness}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                              <div 
                                className={`h-full rounded-full ${
                                  readiness >= 85 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`} 
                                style={{ width: `${Math.max(readiness, 5)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="mt-3 text-[11px] text-slate-300 font-sans">
                            القائد المسؤول: <span className="font-extrabold text-slate-100">{unit.commanderName || '⚠️ لم يتم تعيين قائد'}</span>
                          </div>
                        </div>

                        {/* Bottom Action strip */}
                        <div className="mt-4 pt-3 border-t border-slate-950 flex justify-between items-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedWarrantUnitId(unit.id);
                                setShowOfficialWarrant(true);
                              }}
                              className="text-[9px] font-bold text-slate-300 hover:text-emerald-400 flex items-center gap-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg hover:border-emerald-900 transition-all cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              عرض الوثيقة
                            </button>
                            <button
                              onClick={() => handleRunC2Test(unit.name)}
                              className="text-[9px] font-bold text-slate-300 hover:text-emerald-400 flex items-center gap-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg hover:border-emerald-900 transition-all cursor-pointer"
                            >
                              <Wifi className="w-3 h-3" />
                              فحص الإشارة
                            </button>
                          </div>

                          {hasWriteAccess && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleOpenUnitModal(unit)}
                                className="p-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUnitClick(unit.id, unit.name)}
                                className="p-1 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side: Advanced Operational Services Panel */}
            <div className="space-y-6">
              
              {/* SERVICE 1: SATELLITE COMMAND & CONTROL (C2) CONNECTIVITY SIMULATION */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30 text-emerald-400 flex-shrink-0">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-200 text-xs font-sans">منظومة فحص وتأمين قنوات السيطرة (C2)</h5>
                    <span className="text-[8px] text-slate-500 block font-mono">MILITARY COMMUNICATION LINK TESTER</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans text-right">
                    خدمة عملياتية متكاملة تتيح لمشرفي النظام فحص جودة الربط السيبراني المباشر ومزامنة حالة الأفراد بين غرف العمليات الميدانية وسيرفر القيادة المركزي بشكل مشفر وآمن.
                  </p>

                  {/* Terminal Logs window */}
                  {c2Status !== 'idle' && (
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 font-mono text-[9px] text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
                      <div className="flex items-center gap-1.5 text-slate-400 border-b border-slate-900 pb-1.5 mb-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                        <span>محاكي قناة الاتصال والربط العسكري</span>
                      </div>
                      {c2Logs.map((log, i) => (
                        <div key={i} className="leading-normal animate-in fade-in duration-100">{log}</div>
                      ))}
                      {c2Testing && (
                        <div className="flex items-center gap-1 text-slate-500 mt-1 animate-pulse">
                          <span>■ جاري معالجة الإشارة المشفرة...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test action trigger */}
                  <div className="pt-2">
                    {c2Testing ? (
                      <button 
                        disabled
                        className="w-full py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        جاري معالجة الاتصال...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRunC2Test('كافة تشكيلات اللواء')}
                        className="w-full py-2.5 bg-gradient-to-l from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white text-xs font-bold rounded-xl border border-emerald-600/30 hover:border-emerald-500/50 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Wifi className="w-4 h-4 text-emerald-300" />
                        تشغيل فحص قنوات الاتصال العام
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SERVICE 2: BULK FORCE REASSIGNMENT (دمج وإعادة تعيين القوة البشرية) */}
              {hasWriteAccess && (
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <div className="p-1.5 rounded-lg bg-teal-900/40 border border-teal-700/30 text-teal-400 flex-shrink-0">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-200 text-xs font-sans">الدمج والتعيين المباشر لكامل القوة</h5>
                      <span className="text-[8px] text-slate-500 block font-mono">BULK FORCE TRANSFER PROTOCOL</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 font-sans" dir="rtl">
                    <p className="text-[10px] text-slate-400 leading-relaxed text-right">
                      تسمح هذه الخدمة المتميزة بنقل جميع العسكريين المنتسبين لوحدة عسكرية معينة إلى وحدة بديلة فوراً بضغطة زر واحدة (مفيدة في حال حل وحدة عسكرية أو دمج السرية/الكتيبة).
                    </p>

                    {/* Bulk Reassignment form */}
                    <div className="space-y-2 text-right">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 mr-0.5">الوحدة العسكرية المستهدفة (المصدر):</label>
                        <select
                          value={bulkSourceUnitId}
                          onChange={(e) => setBulkSourceUnitId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-600 text-slate-200 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="">-- اختر الوحدة المراد تفريغها --</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({soldiers.filter(s => s.unitId === u.id).length} عسكري)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 mr-0.5">الوحدة البديلة لاستقبال القوة (المستقبل):</label>
                        <select
                          value={bulkTargetUnitId}
                          onChange={(e) => setBulkTargetUnitId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-600 text-slate-200 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="">-- اختر الوحدة الحاضنة البديلة --</option>
                          {units.filter(u => u.id !== bulkSourceUnitId).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      {bulkTransferMsg && (
                        <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed border ${
                          bulkTransferMsg.type === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {bulkTransferMsg.text}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleBulkForceTransfer}
                        disabled={!bulkSourceUnitId || !bulkTargetUnitId}
                        className={`w-full py-2 rounded-xl text-[11px] font-black transition-all ${
                          bulkSourceUnitId && bulkTargetUnitId
                            ? 'bg-gradient-to-l from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white shadow-md cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        تأكيد نقل القوة المجمعة بالكامل
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SERVICE 3: HIERARCHICAL ANALYSIS & STATS (مؤشرات الهيكل الإداري) */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-750 text-slate-300 flex-shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-200 text-xs font-sans">تحليلات ومؤشرات القوة والهيكل</h5>
                    <span className="text-[8px] text-slate-500 block font-mono">ORGANIZATIONAL METRICS</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 font-sans">إجمالي التشكيلات المعتمدة</span>
                    <span className="font-bold text-slate-200 font-mono text-xs">{units.length} تشكيلات</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 font-sans">وحدات شاغرة من القيادة</span>
                    <span className={`font-bold font-mono text-xs ${units.filter(u => !u.commanderName).length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {units.filter(u => !u.commanderName).length} وحدات
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 font-sans">عسكريين نشطين في الهيكل</span>
                    <span className="font-bold text-emerald-500 font-mono text-xs">
                      {soldiers.filter(s => s.isActive).length} من أصل {soldiers.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 font-sans">معدل التغطية التكتيكية للأفراد</span>
                    <span className="font-bold text-teal-400 font-mono text-xs">
                      {units.length > 0 ? Math.round(soldiers.filter(s => s.isActive).length / units.length) : 0} عسكري / وحدة
                    </span>
                  </div>
                </div>

                <div className="p-3 mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] text-emerald-400/90 leading-relaxed text-right space-y-1.5">
                  <p className="font-black font-sans">توجيهات الرقابة التنظيمية للواء:</p>
                  <ul className="list-disc list-inside space-y-1 font-sans text-[9px]">
                    <li>توزيع القادة بدقة يمنع تسرب القيادة ويعزز من جودة اتصالات السيطرة.</li>
                    <li>عند إعادة دمج أو دمج قوة عسكرية، يوصى باستخدام "الدمج المباشر" لضمان ثبات كشف التحضير.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ---- TAB 2: SOLDIERS MANAGEMENT ---- */}
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
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4 animate-in fade-in duration-200">
            
            {/* Compact Single-Line Search & Filter Bar */}
            <div className="bg-slate-100/90 border border-slate-200/90 p-2 sm:p-2.5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 flex-1 w-full">
                {/* Search Box */}
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
                    className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="all">كل الوحدات</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg text-[10px] font-black text-emerald-800 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>الكتيبة فقط</span>
                  </div>
                )}

                {/* Rank Filter */}
                <select
                  value={soldierRankFilter}
                  onChange={(e) => setSoldierRankFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[120px] truncate"
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
                  className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer max-w-[110px] truncate"
                >
                  <option value="all">كل الحالات</option>
                  <option value="true">نشط / جاهز</option>
                  <option value="false">مستبعد / احتياط</option>
                </select>
              </div>

              {/* Matched Count & Loader Badge */}
              <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-200/80">
                {loadingSoldiers && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-[10px] font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                    <span>استعلام...</span>
                  </div>
                )}
                <span className="bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black font-sans whitespace-nowrap">
                  المطابق: {totalCount}
                </span>
              </div>
            </div>

            {/* Conditional Display: Recent Operations vs Soldiers List */}
            {!hasActiveFilters ? (
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-wide">
                      سجل العمليات الأخيرة (آخر 10 عمليات)
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold shrink-0">
                      تحديث تلقائي ⏱️
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadRecentAuditLogs}
                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="تحديث سجل العمليات"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? 'animate-spin text-emerald-600' : ''}`} />
                    <span className="hidden sm:inline">تحديث</span>
                  </button>
                </div>

                {displayAuditLogs.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-bold font-sans">
                    لا توجد سجلات عمليات مسجلة بالنظام حالياً.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {displayAuditLogs.map((log, index) => {
                      let badgeLabel = log.actionType || 'إجراء';
                      let badgeClass = "bg-blue-100 text-blue-800 border-blue-200";

                      const detailsStr = log.details || '';
                      if (detailsStr.includes('ترقية') || detailsStr.includes('الرتبة')) {
                        badgeLabel = 'ترقية';
                        badgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
                      } else if (detailsStr.includes('نقل')) {
                        badgeLabel = 'نقل عسكري';
                        badgeClass = "bg-sky-100 text-sky-800 border-sky-200";
                      } else if (log.actionType === 'إضافة' || detailsStr.includes('تسجيل') || detailsStr.includes('توظيف')) {
                        badgeLabel = 'تسجيل/إضافة';
                        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                      } else if (log.actionType === 'تعديل') {
                        badgeLabel = 'تعديل ملف';
                        badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                      } else if (log.actionType === 'حذف' || detailsStr.includes('استبعاد')) {
                        badgeLabel = 'حذف/استبعاد';
                        badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
                      } else if (log.actionType === 'استيراد' || log.actionType === 'استعادة') {
                        badgeClass = "bg-purple-100 text-purple-800 border-purple-200";
                      }

                      return (
                        <div 
                          key={log.id || `audit_${index}`} 
                          className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-1.5 text-xs hover:border-slate-300 transition-all font-sans"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold dir-ltr">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-SA', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-slate-800 font-bold line-clamp-3 text-[11px] leading-relaxed">
                            {log.details || 'بدون تفاصيل'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-sans">
                            <span>المستخدم: <strong className="text-slate-700 font-black">{log.userName || 'النظام'}</strong></span>
                            <span className="text-slate-500 font-bold">{log.tableName || ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Conditional Rendering of Soldiers List (Visible only when searching/filtering) */
              <>
                {soldierSearchError ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-8 rounded-2xl text-center max-w-md mx-auto my-8 font-sans">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <h4 className="font-extrabold text-sm">حدث خطأ أثناء الاستعلام عن البيانات</h4>
                    <p className="text-xs text-rose-600 mt-1">{soldierSearchError}</p>
                    <button
                      onClick={() => fetchSoldiers(0, true)}
                      className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                ) : loadingSoldiers && searchedSoldiers.length === 0 ? (
                  <div className="p-16 text-center font-sans">
                    <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-bold">جاري استعلام ومعالجة السجلات من قاعدة البيانات العسكرية...</p>
                  </div>
                ) : searchedSoldiers.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-150 p-12 rounded-2xl text-center text-slate-400 font-bold text-xs max-w-md mx-auto my-8 font-sans">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    لا توجد نتائج تطابق معايير البحث والفلترة المحددة. يرجى تعديل خيارات البحث.
                  </div>
                ) : (
                  <>
                    {/* Soldiers Table - Desktop Only */}
              {/* Soldiers Table - Desktop Only with High-Contrast Military Design */}
              <div 
                ref={desktopContainerRef}
                onScroll={(e) => setDesktopScrollTop(e.currentTarget.scrollTop)}
                className="hidden lg:block overflow-auto rounded-xl border border-slate-200/80 shadow-xs max-h-[600px] relative scroll-smooth"
              >
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-900 text-slate-100 border-b border-slate-800 font-sans sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-black text-center w-32 tracking-wider">الرقم العسكري</th>
                      <th className="py-3.5 px-4 font-black">الاسم الكامل والمنصب العملياتي</th>
                      <th className="py-3.5 px-4 font-black text-center w-32">الرتبة العسكرية</th>
                      <th className="py-3.5 px-4 font-black w-56">الوحدة أو التشكيل الحالي</th>
                      <th className="py-3.5 px-4 font-black text-center w-28">الحالة العملياتية</th>
                      <th className="py-3.5 px-4 font-black text-center w-52">إجراءات الخدمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(() => {
                      const desktopItemHeight = 65; // Height of each table row
                      const desktopStartIndex = Math.max(0, Math.floor(desktopScrollTop / desktopItemHeight) - 8);
                      const desktopEndIndex = Math.min(searchedSoldiers.length, Math.ceil((desktopScrollTop + 600) / desktopItemHeight) + 8);
                      
                      const paddingTop = desktopStartIndex * desktopItemHeight;
                      const paddingBottom = Math.max(0, (searchedSoldiers.length - desktopEndIndex) * desktopItemHeight);
                      
                      const visibleSoldiers = searchedSoldiers.slice(desktopStartIndex, desktopEndIndex);
                      
                      return (
                        <>
                          {paddingTop > 0 && (
                            <tr>
                              <td style={{ height: `${paddingTop}px`, padding: 0 }} colSpan={6} />
                            </tr>
                          )}
                          {visibleSoldiers.map(soldier => {
                            const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                            const isOfficer = soldier.rank.includes('عميد') || 
                                              soldier.rank.includes('عقيد') || 
                                              soldier.rank.includes('مقدم') || 
                                              soldier.rank.includes('رائد') || 
                                              soldier.rank.includes('نقيب') || 
                                              soldier.rank.includes('ملازم');
                            
                            return (
                              <tr key={soldier.id} className="hover:bg-slate-50/80 transition-colors duration-100 h-[65px]">
                                <td className="py-3.5 px-4 font-mono text-center font-bold text-slate-600 bg-slate-50/30">
                                  {soldier.militaryNumber}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                      className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center font-black text-slate-600 text-xs shadow-2xs hover:scale-105 transition-transform"
                                      title="فتح ملف الفرد"
                                    >
                                      {soldier.photoUrl ? (
                                        <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                      ) : (
                                        <UserIcon className="w-5 h-5 text-slate-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-slate-800 text-sm hover:text-teal-700 transition-colors" onClick={() => setSelectedProfileSoldierId(soldier.id)} style={{ cursor: 'pointer' }}>{soldier.fullName}</div>
                                      <span className="text-[10px] text-slate-400">كود التحقق: {soldier.id.substring(0, 8).toUpperCase()}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-block px-3 py-1 text-xs rounded-lg font-black border ${
                                    isOfficer 
                                      ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' 
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {soldier.rank}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    {soldierUnit}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  {soldier.isActive ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-3xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      جاهز/نشط
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500 border border-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                      مستبعد/احتياط
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                                      title="عرض ملف الفرد العسكري الشامل"
                                    >
                                      <FileText className="w-4 h-4 text-slate-700" />
                                    </button>
                                    {currentUser.role !== 'operations' && (
                                      <>
                                        <button
                                          onClick={() => handleOpenSoldierModal(soldier)}
                                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                                          title="تعديل بيانات العسكري"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleOpenTransfer(soldier)}
                                          className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border border-transparent hover:border-emerald-100 cursor-pointer"
                                          title="تحويل التشكيل والتبعية"
                                        >
                                          <ArrowLeftRight className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSoldierClick(soldier.id, soldier.fullName)}
                                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                                          title="حذف من الخدمة والعديد"
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
                          {paddingBottom > 0 && (
                            <tr>
                              <td style={{ height: `${paddingBottom}px`, padding: 0 }} colSpan={6} />
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Soldiers Cards View - Mobile/Responsive layout with custom card elements */}
              <div 
                ref={mobileContainerRef}
                onScroll={(e) => setMobileScrollTop(e.currentTarget.scrollTop)}
                className="block lg:hidden overflow-auto max-h-[500px] relative space-y-4 pr-1 scroll-smooth"
              >
                {(() => {
                  const mobileItemHeight = 160; // Card height in OrgManager including gap (around 160px)
                  const mobileStartIndex = Math.max(0, Math.floor(mobileScrollTop / mobileItemHeight) - 6);
                  const mobileEndIndex = Math.min(searchedSoldiers.length, Math.ceil((mobileScrollTop + 500) / mobileItemHeight) + 6);
                  
                  const paddingTop = mobileStartIndex * mobileItemHeight;
                  const paddingBottom = Math.max(0, (searchedSoldiers.length - mobileEndIndex) * mobileItemHeight);
                  
                  const visibleSoldiers = searchedSoldiers.slice(mobileStartIndex, mobileEndIndex);
                  
                  return (
                    <div style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }} className="space-y-4">
                      {visibleSoldiers.map(soldier => {
                        const soldierUnit = units.find(u => u.id === soldier.unitId)?.name || 'غير معروف';
                        const isOfficer = soldier.rank.includes('عميد') || 
                                          soldier.rank.includes('عقيد') || 
                                          soldier.rank.includes('مقدم') || 
                                          soldier.rank.includes('رائد') || 
                                          soldier.rank.includes('نقيب') || 
                                          soldier.rank.includes('ملازم');
                        return (
                          <div key={soldier.id} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 min-h-[144px] flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div 
                                  onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                  className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center font-black text-slate-600 text-xs shadow-2xs hover:scale-105 transition-transform"
                                  title="عرض ملف الفرد"
                                >
                                  {soldier.photoUrl ? (
                                    <img src={soldier.photoUrl} alt={soldier.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`inline-block px-1.5 py-0.2 text-[9px] rounded font-black border ${
                                    isOfficer 
                                      ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' 
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                    {soldier.rank}
                                  </span>
                                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 mt-0.5 font-sans line-clamp-1 cursor-pointer hover:text-teal-700" onClick={() => setSelectedProfileSoldierId(soldier.id)}>{soldier.fullName}</h5>
                                  <p className="text-[10px] text-slate-500 font-sans">
                                    الرقم العسكري: <span className="font-mono font-bold text-slate-700">{soldier.militaryNumber}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-sans line-clamp-1">الوحدة: <span className="font-bold">{soldierUnit}</span></p>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {soldier.isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    في الخدمة
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    خارج القوة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                              {/* View Profile */}
                              <button
                                onClick={() => setSelectedProfileSoldierId(soldier.id)}
                                className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 py-1 rounded-xl font-black font-sans cursor-pointer transition-colors active:scale-97"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-700" />
                                الملف الشامل
                              </button>

                              {currentUser.role !== 'operations' && (
                                <>
                                  <button
                                    onClick={() => handleOpenSoldierModal(soldier)}
                                    className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1 rounded-xl font-black font-sans cursor-pointer transition-colors active:scale-97"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => handleOpenTransfer(soldier)}
                                    className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-1 rounded-xl font-black font-sans cursor-pointer transition-colors active:scale-97"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-700" />
                                    نقل
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSoldierClick(soldier.id, soldier.fullName)}
                                    className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 py-1 rounded-xl font-black font-sans cursor-pointer transition-colors active:scale-97"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    حذف
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Progressive Loading / Pagination Control */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchSoldiers(page + 1, false)}
                    disabled={loadingSoldiers}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-black font-sans cursor-pointer transition-all shadow-3xs"
                  >
                    {loadingSoldiers ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>تحميل المزيد من العسكريين (عرض {searchedSoldiers.length} من {totalCount})</span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
)}

      {/* ---- UNIT ADD/EDIT MODAL DIALOG ---- */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-150 text-right animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-800 font-sans pb-3 border-b border-slate-100">
              {editingUnit ? `تعديل بيانات: ${editingUnit.name}` : 'إضافة وحدة عسكرية جديدة للهيكل التنظيمي'}
            </h3>

            <form onSubmit={handleSaveUnit} className="mt-4 space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الوحدة العسكرية</label>
                  <input 
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700"
                    placeholder="مثال: سرية القيادة، الفصيل الأول..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">رمز / كود الوحدة</label>
                  <input 
                    type="text"
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700 font-mono text-center font-bold"
                    placeholder="مثال: SIG-COY-101..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">المستوى العسكري للتشكيل</label>
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
                    <option value="مجموعة">مجموعة (Squad/Group)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">تبعية السيطرة (الوحدة الأعلى)</label>
                  <select
                    value={unitParentId}
                    onChange={(e) => setUnitParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">لا توجد وحدة أعلى (قيادة مستقلة)</option>
                    {units.filter(u => !editingUnit || u.id !== editingUnit.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.type || 'تشكيل'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">قائد الوحدة المعين</label>
                  <input 
                    type="text"
                    value={unitCommander}
                    onChange={(e) => setUnitCommander(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    placeholder="مثال: الرائد/ محمد فهد الرويلي..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الموقع الجغرافي / التمركز</label>
                  <input 
                    type="text"
                    value={unitLocation}
                    onChange={(e) => setUnitLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    placeholder="مثال: القطاع الشرقي، المعسكر الشمالي..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">العديد المعتمد (القوة المعتمدة بالملاك)</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={unitApprovedStrength}
                    onChange={(e) => setUnitApprovedStrength(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">حالة التشكيل</label>
                  <select
                    value={unitStatus}
                    onChange={(e) => setUnitStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="نشط">نشط عسكرياً (Active)</option>
                    <option value="ملغى">تم حله / ملغى (Disbanded)</option>
                    <option value="مؤرشف">في الاحتياط / مؤرشف (Reserve)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer"
                >
                  {editingUnit ? 'حفظ التعديلات' : 'تأسيس الوحدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- SOLDIER ADD/EDIT MODAL DIALOG ---- */}
      {isSoldierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-150 text-right animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-800 font-sans pb-3 border-b border-slate-100">
              {editingSoldier ? `تعديل بيانات الفرد: ${editingSoldier.fullName}` : 'تسجيل عسكري جديد بالقوة'}
            </h3>

            <form onSubmit={handleSaveSoldier} className="mt-4 space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الرقم العسكري الفريد (ID)</label>
                  <input 
                    type="text"
                    required
                    value={soldierMilNumber}
                    onChange={(e) => setSoldierMilNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700 font-mono text-center font-bold"
                    placeholder="أدخل الرقم العسكري المكون من 5 خانات..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الرتبة العسكرية</label>
                  <select
                    value={soldierRank}
                    onChange={(e) => setSoldierRank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {MILITARY_RANKS.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم الكامل للعسكري رباعياً</label>
                <input 
                  type="text"
                  required
                  value={soldierName}
                  onChange={(e) => setSoldierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-700"
                  placeholder="الاسم الكامل كما في السجلات الرسمية..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة العسكرية التابع لها</label>
                  {currentUser.role !== 'commander_unit' && currentUser.role !== 'data_writer' ? (
                    <select
                      value={soldierUnitId}
                      required
                      onChange={(e) => setSoldierUnitId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 text-xs font-bold">
                      {allowedUnits[0]?.name}
                      <input type="hidden" value={soldierUnitId} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">حالة تفعيل العنصر</label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={soldierActive === true} 
                        onChange={() => setSoldierActive(true)}
                        className="accent-emerald-700"
                      />
                      في الخدمة (نشط)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={soldierActive === false} 
                        onChange={() => setSoldierActive(false)}
                        className="accent-slate-400"
                      />
                      خارج القوة (مجمد)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSoldierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold"
                >
                  {editingSoldier ? 'حفظ التغييرات' : 'إدراج بالقوة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- TRANSFER SOLDIER (MOVE) MODAL DIALOG ---- */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 text-right animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-800 font-sans pb-3 border-b border-slate-100 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-teal-700" />
              أمر نقل وتحويل إداري
            </h3>

            <p className="text-xs text-slate-500 mt-2 font-sans">
              تم تحديد العسكري: <span className="font-bold text-slate-800">{soldiers.find(s => s.id === transferSoldierId)?.rank}/ {soldiers.find(s => s.id === transferSoldierId)?.fullName}</span>
            </p>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الوحدة العسكرية الجديدة المراد النقل إليها</label>
                <select
                  required
                  value={transferTargetUnitId}
                  onChange={(e) => setTransferTargetUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-700"
                >
                  <option value="">-- اختر الوحدة المستهدفة بالنقل --</option>
                  {units.filter(u => u.id !== soldiers.find(s => s.id === transferSoldierId)?.unitId).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">رقم أمر النقل / القرار الإداري</label>
                  <input 
                    type="text"
                    required
                    value={transferOrderNumber}
                    onChange={(e) => setTransferOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-700 text-center font-mono font-bold"
                    placeholder="مثال: ق/221أ//2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ أمر النقل</label>
                  <input 
                    type="date"
                    required
                    value={transferOrderDate}
                    onChange={(e) => setTransferOrderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-700 text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">الجهة الإدارية المصدرة</label>
                  <input 
                    type="text"
                    required
                    value={transferIssuedBy}
                    onChange={(e) => setTransferIssuedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-700"
                    placeholder="مثال: قيادة لواء المشاة"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">سبب النقل / الملاحظات التنظيمية</label>
                  <input 
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-700"
                    placeholder="مثال: سد الشواغر، ملاك القوة..."
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetUnitId}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                    transferTargetUnitId 
                      ? 'bg-teal-700 hover:bg-teal-850 cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  تنفيذ أمر النقل الإداري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- CUSTOM MILITARY DELETION CONFIRMATION MODAL ---- */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-slate-900 border border-rose-950/60 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150">
            {/* Top Warning Accent Bar */}
            <div className="absolute top-0 right-0 left-0 h-[4px] bg-gradient-to-l from-rose-600 to-amber-500"></div>
            
            {/* Warning Shield Graphic */}
            <div className="flex flex-col items-center justify-center text-center mt-3 mb-4">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/30 mb-2">
                <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-rose-400 font-sans">
                تأكيد إجراء الحذف الأمني
              </h3>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">SECURE DATA PURGE PROTOCOL</span>
            </div>

            {/* Target Record Card */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-4">
              <span className="text-[10px] text-slate-500 block font-sans">نوع السجل المستهدف:</span>
              <span className="text-xs font-bold text-slate-300 block font-sans mt-0.5">
                {deleteTargetType === 'soldier' ? 'ملف عسكري فردي (أفراد وقوة)' : 'وحدة عسكرية تنظيمية (الهيكل العملياتي)'}
              </span>
              
              <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 block font-sans">اسم العنصر المراد حذفه:</span>
                <span className="text-sm font-black text-rose-400 block font-sans mt-0.5">
                  {deleteTargetName}
                </span>
              </div>
            </div>

            {/* Security Warning notice */}
            {deleteTargetType === 'unit' && activeSoldiersCount > 0 ? (
              <div className="font-sans text-[11px] leading-relaxed text-amber-300 mb-4 bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 text-right">
                <strong>تنبيه عملياتي هام:</strong> تحتوي هذه الوحدة على <span className="text-amber-400 font-extrabold">{activeSoldiersCount} عسكري نشط</span> حالياً. عند إكمال عملية الحذف، سيتم نقلهم تلقائياً إلى <strong>قوة الاحتياط (غير معين)</strong> حفاظاً على استمرارية سجلاتهم العسكرية. سيتم رصد عملية الحذف وتوثيقها باسم حسابك في سجل الرقابة العسكري المباشر.
              </div>
            ) : (
              <p className="font-sans text-[11px] leading-relaxed text-slate-400 mb-4 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                <strong>تنبيه صارم:</strong> سيتم إزالة هذا السجل نهائياً من قاعدة البيانات السحابية الحية، ولن تظهر بياناته في كشوفات التحضير اليومية أو التقارير الدورية المرتبطة به. سيتم رصد وتوثيق عملية الحذف هذه باسم حسابك في سجل الرقابة العسكري المباشر.
              </p>
            )}

            {/* Verification Input */}
            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-bold text-slate-300 mr-1">
                لتأكيد الحذف الأمني، اكتب كلمة <span className="text-rose-400 font-extrabold font-mono select-all">تأكيد</span> أدناه:
              </label>
              <input
                type="text"
                value={deleteVerificationCode}
                onChange={(e) => setDeleteVerificationCode(e.target.value)}
                placeholder="اكتب تأكيد هنا"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none text-center"
              />
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setDeleteTargetType(null);
                  setDeleteTargetId('');
                  setDeleteTargetName('');
                  setDeleteVerificationCode('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold transition-all text-xs cursor-pointer"
              >
                إلغاء وتراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteVerificationCode !== 'تأكيد'}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all ${
                  deleteVerificationCode === 'تأكيد'
                    ? 'bg-gradient-to-l from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 cursor-pointer shadow-lg shadow-rose-950/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                }`}
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- OFFICIAL MILITARY FORMATION WARRANT MODAL (وثيقة تشكيل معتمدة) ---- */}
      {showOfficialWarrant && (() => {
        const selectedUnit = units.find(u => u.id === selectedWarrantUnitId);
        if (!selectedUnit) return null;
        
        const unitSoldiers = soldiers.filter(s => s.unitId === selectedUnit.id);
        const activeCount = unitSoldiers.filter(s => s.isActive).length;
        const inactiveCount = unitSoldiers.length - activeCount;

        // Group force by ranks
        const rankCounts: Record<string, number> = {};
        unitSoldiers.forEach(s => {
          rankCounts[s.rank] = (rankCounts[s.rank] || 0) + 1;
        });

        return (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
            <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-double border-slate-300 relative my-8 print:border-0 print:p-0">
              
              {/* Classification Tag */}
              <div className="absolute top-4 left-4 bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-sm border border-red-200 uppercase tracking-widest">
                سري للغاية ومحدد
              </div>

              {/* Document Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-5 mb-6">
                <div className="text-right space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-800">الجمهورية العربية السورية</h4>
                  <h4 className="text-xs font-black text-slate-700">وزارة الدفاع</h4>
                  <h4 className="text-[10px] text-slate-500 font-bold">رئاسة القيادة والأركان العامة</h4>
                  <h4 className="text-[10px] text-slate-500 font-bold">منظومة السيطرة والتحضير</h4>
                </div>

                {/* Central Crest */}
                <div className="flex flex-col items-center">
                  {/* Styled Emblem */}
                  <div className="w-16 h-16 bg-slate-50 border-2 border-slate-300 rounded-full flex items-center justify-center shadow-inner">
                    <ShieldAlert className="w-9 h-9 text-slate-700" />
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono mt-1">ORGANIZATION CERTIFICATE</span>
                </div>

                <div className="text-left space-y-1 text-slate-500 text-[10px] font-bold">
                  <div>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div>الرقم الوطني: {selectedUnit.id.substring(0, 8).toUpperCase()}-MIL</div>
                  <div>الصفحة: 1 من 1</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-6">
                <h3 className="text-lg font-black text-slate-900 tracking-wide underline decoration-double underline-offset-4 font-sans">
                  وثيقة تشكيل وتثبيت هيكل القوة الميداني
                </h3>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">OFFICIAL MILITARY FORMATION WARRANT</span>
              </div>

              {/* Unit info section */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">الاسم الرسمي للوحدة:</span>
                  <span className="text-sm font-black text-slate-800 font-sans">{selectedUnit.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">القائد المسؤول حالياً:</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-sans">{selectedUnit.commanderName || 'شاغر ولم يعين بعد'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">التبعية الإدارية:</span>
                  <span className="text-xs font-bold text-slate-600 font-sans">
                    {units.find(u => u.id === selectedUnit.parentId)?.name || 'القيادة العامة للواء'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">معرف السجل التنظيمي:</span>
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{selectedUnit.id}</span>
                </div>
              </div>

              {/* Force Statistics Table */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-750" />
                  تفاصيل تعداد القوة البشرية والجاهزية الفورية:
                </h5>

                <div className="border border-slate-250 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-250 text-slate-700">
                      <tr>
                        <th className="p-3 font-extrabold">الرتبة العسكرية</th>
                        <th className="p-3 font-extrabold text-center">التعداد الفعلي الحالي</th>
                        <th className="p-3 font-extrabold text-left">ملاحظات القيادة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {Object.keys(rankCounts).length > 0 ? (
                        Object.entries(rankCounts).map(([rank, count]) => (
                          <tr key={rank} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold">{rank}</td>
                            <td className="p-3 text-center font-mono font-extrabold text-slate-900">{count}</td>
                            <td className="p-3 text-left text-slate-400 text-[10px]">قوة معتمدة بجدول التشكيل</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                            لا يوجد أفراد مسجلين في ملاك هذه الوحدة حالياً.
                          </td>
                        </tr>
                      )}
                      
                      {/* Total line */}
                      <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-300">
                        <td className="p-3 text-slate-900">إجمالي القوة (العديد):</td>
                        <td className="p-3 text-center font-mono text-sm font-black text-slate-900">{unitSoldiers.length} عسكري</td>
                        <td className="p-3 text-left text-slate-500 text-[10px]">
                          نشط: {activeCount} | احتياط: {inactiveCount}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warrant Signatures Block */}
              <div className="mt-8 grid grid-cols-2 gap-8 text-center pt-6 border-t border-slate-200">
                <div className="space-y-6">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-700 font-sans">توقيع قائد فرع التنظيم والإدارة والتحضير</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">شعبة التنظيم القيادي</p>
                  </div>
                  <div className="italic text-xs text-slate-400 select-none font-sans">
                    [ تم التوقيع إلكترونياً ]
                  </div>
                </div>

                <div className="space-y-6 relative">
                  {/* Seal circle representation */}
                  <div className="absolute top-0 right-1/4 w-16 h-16 border border-dashed border-emerald-600/30 rounded-full flex items-center justify-center rotate-12 pointer-events-none select-none">
                    <span className="text-[8px] text-emerald-600/50 font-black tracking-widest text-center font-sans">ختم القيادة المعتمد</span>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-black text-slate-700 font-sans">اعتماد قائد تشكيل لواء الدفاع والمشاة</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">مكتب التحضير الميداني العام</p>
                  </div>
                  <div className="italic text-xs text-slate-400 select-none font-sans">
                    [ تم الختم وتدقيق الجاهزية ]
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="mt-8 text-center text-[9px] text-slate-400 leading-normal border-t border-slate-100 pt-3">
                تعتبر هذه الوثيقة كشف إلكتروني رسمي معتمد ومحمي بموجب أنظمة حماية السجلات العسكرية الإلكترونية.<br />
                يمنع تداول هذه البيانات أو مشاركتها عبر قنوات اتصال غير آمنة خارج منظومة السيطرة المباشرة.
              </p>

              {/* Modal footer / action panel */}
              <div className="mt-6 flex gap-3 justify-end border-t border-slate-200 pt-4 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowOfficialWarrant(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  طباعة الوثيقة الرسمية
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      {/* Loading Overlay for demand-fetched Soldier Details */}
      {fetchingIndividualSoldier && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55">
          <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-2xl flex items-center gap-3 font-sans">
            <RefreshCw className="w-5 h-5 text-emerald-800 animate-spin" />
            <span className="text-xs font-black text-slate-800">جاري تحميل الملف الكامل للفرد بأمان...</span>
          </div>
        </div>
      )}

      {/* ---- ORG SETTINGS MODAL (إعدادات القوة والأفراد - استيراد وتصدير) ---- */}
      {isOrgSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-sans text-white">
                    إعدادات إدارة القوة والأفراد
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    خيارات التصدير والاستيراد لبيانات القوة والسجلات العسكرية
                  </p>
                </div>
              </div>

              {/* Exit / Close button (X) */}
              <button
                type="button"
                onClick={() => {
                  setIsOrgSettingsOpen(false);
                  setSettingsSubTab('menu');
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
                title="إغلاق النافذة (X)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 font-sans">
              {settingsSubTab === 'menu' ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 text-right">
                    اختر الإجراء المطلوب لإدارة وتداول بيانات الأفراد مع ملفات Excel:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Option 1: Import Excel */}
                    <div 
                      onClick={() => setSettingsSubTab('import')}
                      className="group bg-emerald-50/60 hover:bg-emerald-100/80 border-2 border-emerald-200/90 hover:border-emerald-500 p-5 rounded-2xl cursor-pointer transition-all shadow-2xs hover:shadow-md flex flex-col justify-between text-right"
                    >
                      <div>
                        <div className="w-12 h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-emerald-950 mb-1">
                          إستيراد اكسل
                        </h4>
                        <p className="text-xs text-emerald-800/80 leading-relaxed font-sans">
                          رفع ملف كشف الأفراد والقوة العسكرية بصيغة Excel (.xlsx, .xls) وإضافتهم تلقائياً للنظام مع المطابقة الذكية.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-black text-emerald-900">
                        <span>فتح واجهة الاستيراد الذكية</span>
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      </div>
                    </div>

                    {/* Option 2: Export Excel */}
                    <div 
                      onClick={() => setSettingsSubTab('export_settings')}
                      className="group bg-blue-50/60 hover:bg-blue-100/80 border-2 border-blue-200/90 hover:border-blue-500 p-5 rounded-2xl cursor-pointer transition-all shadow-2xs hover:shadow-md flex flex-col justify-between text-right"
                    >
                      <div>
                        <div className="w-12 h-12 bg-blue-700 text-white rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                          <Sliders className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-blue-950 mb-1">
                          تصدير اكسل (إعدادات الحقول)
                        </h4>
                        <p className="text-xs text-blue-800/80 leading-relaxed font-sans">
                          تخصيص البيانات والحقول المطلوبة للتصدير (رقم الهوية، رقم الهاتف، فصيلة الدم، أرقام المقربين، وغيرها) واستخراج كشف Excel مخصص.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs font-black text-blue-900">
                        <span>فتح إعدادات وتحديد حقول التصدير</span>
                        <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                      </div>
                    </div>

                  </div>

                  {/* Template Download Section */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">تحميل نموذج Excel المفرغ</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">احصل على كشف مفرغ بالهيكلية الرسمية لتعبئة بيانات الأفراد واستيرادها بسهولة.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل النموذج</span>
                    </button>
                  </div>

                </div>
              ) : settingsSubTab === 'export_settings' ? (
                /* Sub-tab: Export Excel Custom Settings */
                <div className="space-y-5 text-right font-sans">
                  
                  {/* Header Sub-bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('menu')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>العودة للقائمة</span>
                    </button>

                    <span className="text-xs font-black text-blue-800 bg-blue-50 px-3 py-1 rounded-md border border-blue-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>نافذة إعدادات تصدير ملف Excel</span>
                    </span>
                  </div>

                  {/* Toolbar Controls */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedExportFields(EXPORT_FIELDS_OPTIONS.map(f => f.id))}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>تحديد الكل</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setSelectedExportFields([])}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>إلغاء تحديد الكل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedExportFields(EXPORT_FIELDS_OPTIONS.filter(f => f.defaultChecked).map(f => f.id))}
                          className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer underline"
                        >
                          استعادة الافتراضي
                        </button>
                      </div>

                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5">
                        <span>الحقول المختارة:</span>
                        <span className="text-emerald-700 font-extrabold">{selectedExportFields.length}</span>
                        <span className="text-slate-400">/</span>
                        <span>{EXPORT_FIELDS_OPTIONS.length}</span>
                      </div>
                    </div>

                    {/* Scope Filter */}
                    <div className="pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">نطاق الأفراد المراد تصديرهم:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExportScopeFilter('all')}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                            exportScopeFilter === 'all'
                              ? 'bg-blue-900 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          جميع الأفراد بالقوة ({soldiers.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportScopeFilter('active_only')}
                          className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                            exportScopeFilter === 'active_only'
                              ? 'bg-blue-900 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          الأفراد النشطون فقط ({soldiers.filter(s => s.isActive).length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Categorized Fields Grid */}
                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {Array.from(new Set(EXPORT_FIELDS_OPTIONS.map(f => f.category))).map(category => {
                      const categoryFields = EXPORT_FIELDS_OPTIONS.filter(f => f.category === category);
                      const selectedInCategoryCount = categoryFields.filter(f => selectedExportFields.includes(f.id)).length;

                      return (
                        <div key={category} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                          
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              {category === 'البيانات الأساسية والعسكرية' && <Shield className="w-4 h-4 text-emerald-800" />}
                              {category === 'بيانات الهوية والتواصل' && <Phone className="w-4 h-4 text-blue-800" />}
                              {category === 'البيانات الشخصية والطبية' && <HeartPulse className="w-4 h-4 text-rose-800" />}
                              {category === 'الهيكل التنظيمي والإداري' && <Building className="w-4 h-4 text-amber-800" />}
                              <h4 className="text-xs font-black text-slate-900">{category}</h4>
                            </div>

                            <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                              محدد ({selectedInCategoryCount} / {categoryFields.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {categoryFields.map(field => {
                              const isSelected = selectedExportFields.includes(field.id);
                              return (
                                <div
                                  key={field.id}
                                  onClick={() => toggleExportField(field.id)}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                                    isSelected
                                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/70 hover:border-slate-300'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected ? 'bg-emerald-700 border-emerald-800 text-white' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{field.label}</span>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Confirm & Export Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCustomExportExcel}
                      className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-700/50"
                    >
                      <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                      <span>تأكيد وتصدير ملف Excel ({selectedExportFields.length} حقل مخصص)</span>
                    </button>
                  </div>

                </div>
              ) : (
                /* Sub-tab: Embedded Excel Importer */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('menu')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>العودة لقائمة الإعدادات</span>
                    </button>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      مستورد البيانات الذكي
                    </span>
                  </div>

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

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOrgSettingsOpen(false);
                  setSettingsSubTab('menu');
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-slate-600" />
                <span>خروج (X)</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
