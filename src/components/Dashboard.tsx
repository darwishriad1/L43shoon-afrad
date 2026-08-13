import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { 
  Users, CheckCircle2, XCircle, Plane, ShieldAlert, TrendingUp, Award, AlertTriangle, Search, FileText, Printer, Download, Bell, Clock, ArrowLeftRight, Filter, Calendar, Briefcase, HeartPulse, History, Plus, RefreshCw, RotateCcw, Lock, Shield, Eye, Info, X, Check, FileCheck2, UserCheck, Radio, Settings, Database, ChevronLeft, LayoutDashboard, Sparkles, MessageSquare, CalendarDays, CalendarRange, BarChart2, BarChart3, Building2, User, Activity, BadgeCheck, Stethoscope, Phone, ShieldCheck, Share2, ExternalLink, QrCode, Copy, PhoneCall, ChevronRight, Smartphone, Monitor
} from 'lucide-react';

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

import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode, AuditLog, User as UserType, PrintSettings } from '../types';
import { normalizeStatusCode } from '../utils/attendanceStatus';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsAppShareModal from './WhatsAppShareModal';
import SoldierMonthlyAttendanceModal from './SoldierMonthlyAttendanceModal';
import { downloadElementAsPdf, downloadElementAsImage, shareElementViaWhatsApp, exportQuickReadinessPdfReport } from '../utils/pdfGenerator';
import { fetchWithRetry, safeJson } from '../lib/api';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';
import { triggerToast } from './ToastContainer';
import DashboardErrorBoundary from './DashboardErrorBoundary';

export interface LeavePassData {
  id: string;
  soldierName: string;
  fullName?: string;
  rank: string;
  militaryNumber: string;
  unitName: string;
  leaveType: string;
  illnessType?: string;
  diagnosis?: string;
  startDate: string;
  endDate: string;
  duration: number;
  grantingAuthority: string;
  orderNumber: string;
  orderDate: string;
  reason?: string;
}

export interface DrillDownItem {
  id?: string;
  fullName?: string;
  name?: string;
  unitName?: string;
  unit?: string;
  unitId?: string;
  userName?: string;
  militaryNumber?: string;
  militaryStatus?: string;
  rank?: string;
  type?: string;
  role?: string;
  statusCode?: AttendanceStatusCode | string;
  details?: string;
  specialization?: string;
  commanderName?: string;
  soldier?: Soldier;
  [key: string]: any;
}

export interface DrillDownModalState {
  title: string;
  categoryName: string;
  count: number;
  type: 'soldiers' | 'units' | 'approvals' | 'audit' | 'users';
  color: string;
  items: DrillDownItem[];
}

export interface ItemDetailModalState {
  type: 'soldier' | 'unit' | 'approval' | 'audit' | 'user';
  item: any;
}


interface DashboardProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  users?: UserType[];
  auditLogs?: AuditLog[];
  onNavigate?: (tab: string) => void;
  onViewSoldierProfile?: (soldierId: string) => void;
  currentUser?: { id: string; name: string; role: string; unitId: string | null };
  printSettings?: PrintSettings;
  onAddLog?: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
  onSaveAttendanceBatch?: (soldierIds: string[], dates: string[], status: AttendanceStatusCode) => void;
}

function DashboardContent({ 
  units, 
  soldiers, 
  attendance, 
  users = [],
  auditLogs = [],
  onNavigate, 
  onViewSoldierProfile,
  currentUser, 
  printSettings,
  onAddLog,
  onSaveAttendanceBatch
}: DashboardProps) {
  // Safe default user
  const activeUser = useMemo(() => {
    return currentUser || { id: 'admin-1', name: 'قائد لواء المشاة الآلي /٢٦/', role: 'admin', unitId: null };
  }, [currentUser]);

  // Real-time actual current date (today)
  const actualToday = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Dates list containing all recorded dates plus actualToday sorted descending
  const dates = useMemo(() => {
    const uniqueDates = Array.from(new Set([actualToday, ...attendance.map(a => a.date)]));
    return uniqueDates.sort().reverse();
  }, [attendance, actualToday]);

  // Default latest date always points to today's real date
  const latestDate = actualToday;

  // Extract unit-scoped soldiers, units & active soldiers
  const isRestrictedUser = useMemo(() => {
    return activeUser.role !== 'admin' && activeUser.role !== 'commander_formation' && Boolean(activeUser.unitId);
  }, [activeUser]);

  const scopedSoldiers = useMemo(() => {
    if (isRestrictedUser) {
      return soldiers.filter(s => s.unitId === activeUser.unitId);
    }
    return soldiers;
  }, [soldiers, isRestrictedUser, activeUser.unitId]);

  const scopedUnits = useMemo(() => {
    if (isRestrictedUser) {
      return units.filter(u => u.id === activeUser.unitId);
    }
    return units;
  }, [units, isRestrictedUser, activeUser.unitId]);

  const activeSoldiers = useMemo(() => {
    return scopedSoldiers.filter(s => s.isActive);
  }, [scopedSoldiers]);

  const totalStrength = activeSoldiers.length;

  // States
  const [activeSubTab, setActiveSubTab] = useState<'units_readiness' | 'analytics' | 'periodic_reports' | 'ops_center' | 'live_feed'>('units_readiness');
  const [reportPeriodMode, setReportPeriodMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('');
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState<string>('07');
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<string>('2026');
  const [showDailyDatePickerModal, setShowDailyDatePickerModal] = useState<boolean>(false);
  const [activeLauncher, setActiveLauncher] = useState<string>('units_readiness');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [selectedSoldierMonthlyAttendance, setSelectedSoldierMonthlyAttendance] = useState<Soldier | null>(null);

  // Digital Military ID Card modal state
  const [idCardTab, setIdCardTab] = useState<'identity' | 'attendance' | 'contact'>('identity');
  const [idCardMonth, setIdCardMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [idCardYear, setIdCardYear] = useState<string>(() => String(new Date().getFullYear()));
  const [idCardFilter, setIdCardFilter] = useState<'all' | 'sick_only'>('all');
  const [copiedMilitaryNum, setCopiedMilitaryNum] = useState<boolean>(false);

  // Grant Leave modal state
  const [grantLeaveSoldier, setGrantLeaveSoldier] = useState<Soldier | null>(null);
  const [isGrantLeaveModalOpen, setIsGrantLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'>('استحقاق');
  const [leaveDiagnosis, setLeaveDiagnosis] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [leaveDuration, setLeaveDuration] = useState('7');
  const [leaveGrantingAuthority, setLeaveGrantingAuthority] = useState('قيادة الكتيبة');
  const [leaveGrantingAuthorityCustom, setLeaveGrantingAuthorityCustom] = useState('');
  const [leaveOrderNumber, setLeaveOrderNumber] = useState('');
  const [leaveOrderDate, setLeaveOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState<string | null>(null);

  // Printable official leave pass modal state
  const [printableLeavePass, setPrintableLeavePass] = useState<LeavePassData | null>(null);

  // Timer refs for cleanup
  const quickReportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (quickReportTimerRef.current) clearTimeout(quickReportTimerRef.current);
      if (workspaceScrollTimerRef.current) clearTimeout(workspaceScrollTimerRef.current);
      if (copyNoticeTimerRef.current) clearTimeout(copyNoticeTimerRef.current);
    };
  }, []);

  // Quick Daily Readiness PDF Report Modal State
  const [showQuickReportModal, setShowQuickReportModal] = useState(false);
  const [isGeneratingQuickReport, setIsGeneratingQuickReport] = useState(false);
  const [reportMobileFit, setReportMobileFit] = useState(true);

  // Executive Readiness Indicators Cards View Mode & Details Modal
  const [executiveTickerMode, setExecutiveTickerMode] = useState<'general' | 'daily_movement'>('general');
  const [movementDetailModal, setMovementDetailModal] = useState<'resumed' | 'granted' | 'overdue' | null>(null);
  const [grantSearchQueryModal, setGrantSearchQueryModal] = useState('');

  const searchMatchedSoldiers = useMemo(() => {
    if (!grantSearchQueryModal.trim()) return [];
    const q = grantSearchQueryModal.trim().toLowerCase();
    return soldiers.filter(s => 
      s.fullName.toLowerCase().includes(q) ||
      s.militaryNumber.toLowerCase().includes(q) ||
      (s.rank && s.rank.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [soldiers, grantSearchQueryModal]);

  const handleResumeDuty = useCallback(async (soldier: Soldier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetDateStr = selectedDailyDate || actualToday;

    try {
      const updatedSoldier = { ...soldier, militaryStatus: 'على رأس العمل', isActive: true };
      
      // Update soldier status
      await fetchWithRetry(`/api/soldiers/${soldier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSoldier)
      });

      // Save attendance batch with code 'ح' (Present / Resumed duty)
      if (onSaveAttendanceBatch) {
        onSaveAttendanceBatch([soldier.id], [targetDateStr], 'ح');
      }

      await fetchWithRetry('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{
            id: `att_${soldier.id}_${targetDateStr}`,
            soldierId: soldier.id,
            date: targetDateStr,
            statusCode: 'ح',
            recordedBy: activeUser.id,
            updatedAt: new Date().toISOString()
          }]
        })
      });

      if (onAddLog) {
        onAddLog('تعديل', 'شؤون الأفراد', `تسديد مواصلة عمل للفرد: ${soldier.rank} / ${soldier.fullName} بتاريخ ${targetDateStr}`);
      }

      triggerToast(`✅ تم تسجيل وتسديد مواصلة العمل الميداني بنجاح للفرد: ${soldier.rank} / ${soldier.fullName}`, 'success');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in handleResumeDuty:', err);
      }
      triggerToast(`✅ تم تسديد مواصلة العمل للفرد ${soldier.fullName}`, 'success');
    }
  }, [selectedDailyDate, actualToday, onSaveAttendanceBatch, activeUser, onAddLog]);

  const quickReportPrintSettings = useMemo<PrintSettings>(() => ({
    logoUrl: printSettings?.logoUrl || null,
    signatureUrl: printSettings?.signatureUrl || null,
    sealUrl: printSettings?.sealUrl || null,
    countryName: 'الجمهورية اليمنية',
    ministryName: 'وزارة الدفاع - القيادة العامة',
    commandName: 'قيادة السيطرة والعمليات العسكرية',
    unitName: 'اللواء 43 عمالقة',
    headerText: 'الموقف اليومي الشامل للجاهزية والاستعداد القتالي',
    footerText: 'تقرير عسكري سري ومحدود - يخضع لتعليمات القيادة العسكرية العليا والسيطرة والعمليات.',
    showLogo: true,
    showSignature: true,
    showSeal: true,
    paperSize: 'A4',
    orientation: 'portrait',
    templateId: 'military_tactical'
  }), [printSettings]);

  const handleGenerateQuickPdfReport = useCallback(() => {
    setShowQuickReportModal(true);
    triggerToast('تم فتح معاينة تقرير الجاهزية اليومي - يمكنك الاطلاع أو الضغط على زر التنزيل لطباعة PDF', 'info', 3000);
  }, []);

  const handleOpenGrantLeaveModal = useCallback((s: Soldier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGrantLeaveSoldier(s);
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setLeaveStartDate(today);
    setLeaveEndDate(nextWeek);
    setLeaveDuration('7');
    setLeaveOrderNumber(`L-ORD-${Math.floor(1000 + Math.random() * 9000)}`);
    setLeaveOrderDate(today);
    setLeaveReason('');
    setLeaveDiagnosis('');
    setLeaveNotes('');
    setLeaveAttachmentUrl(null);
    setIsGrantLeaveModalOpen(true);
  }, []);

  const handleLeaveDateChange = useCallback((start: string, end: string) => {
    setLeaveStartDate(start);
    setLeaveEndDate(end);
    if (start && end) {
      const startDt = new Date(start);
      const endDt = new Date(end);
      const diffTime = endDt.getTime() - startDt.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setLeaveDuration(diffDays > 0 ? String(diffDays) : '1');
    }
  }, []);

  const handleLeaveAttachmentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLeaveAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Submits leave pass request, posts record to backend API, updates attendance and sends system notification.
   */
  const handleGrantLeaveSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantLeaveSoldier) return;
    if (!leaveStartDate || !leaveEndDate) {
      triggerToast('الرجاء تحديد تاريخ بداية ونهاية الإجازة', 'warning');
      return;
    }

    const finalAuthority = leaveGrantingAuthority === 'أخرى' 
      ? (leaveGrantingAuthorityCustom.trim() || 'جهة إدارية أخرى') 
      : leaveGrantingAuthority;

    setLeaveSubmitting(true);
    try {
      const finalDuration = Number(leaveDuration) || 1;
      const isSickLeave = leaveType === 'مرضية';
      const computedLeaveType = isSickLeave ? 'إجازة مرضية' : leaveType;
      const computedIllness = isSickLeave ? (leaveDiagnosis.trim() || 'إجازة مرضية') : leaveType;
      const computedReason = leaveReason.trim() 
        ? leaveReason 
        : (isSickLeave ? `إجازة مرضية (التشخيص: ${computedIllness})` : 'إجازة رسمية');

      // 1. Post leave record
      const response = await fetchWithRetry(`/api/soldiers/${grantLeaveSoldier.id}/sick-leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          illnessType: computedIllness,
          leaveType: computedLeaveType,
          diagnosis: leaveDiagnosis.trim(),
          duration: finalDuration,
          doctorName: finalAuthority,
          grantingAuthority: finalAuthority,
          orderNumber: leaveOrderNumber || 'بدون أمر',
          orderDate: leaveOrderDate || leaveStartDate,
          reason: computedReason,
          attachmentUrl: leaveAttachmentUrl,
          hospital: finalAuthority,
          notes: leaveNotes,
          status: 'نشط',
          performedBy: activeUser.id,
          performedByName: activeUser.name,
          performedByRole: activeUser.role
        })
      });

      let newLeave = { id: 'leave_' + Date.now() };
      if (response.ok) {
        newLeave = await safeJson(response);
      }

      // 2. Update soldier military status
      await fetchWithRetry(`/api/soldiers/${grantLeaveSoldier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...grantLeaveSoldier,
          militaryStatus: isSickLeave ? 'إجازة مرضية' : 'إجازة'
        })
      });

      // 3. Register attendance code ('ع' for sick leave, 'إ' for official leave)
      const attendanceRecords = [];
      let curDate = new Date(leaveStartDate);
      const stopDate = new Date(leaveEndDate);
      const statusCodeToUse: AttendanceStatusCode = isSickLeave ? 'ع' : 'إ';
      while (curDate <= stopDate) {
        const dateStr = curDate.toISOString().split('T')[0];
        attendanceRecords.push({
          id: `att_${grantLeaveSoldier.id}_${dateStr}`,
          soldierId: grantLeaveSoldier.id,
          date: dateStr,
          statusCode: statusCodeToUse,
          recordedBy: activeUser.id,
          updatedAt: new Date().toISOString()
        });
        curDate.setDate(curDate.getDate() + 1);
      }

      if (attendanceRecords.length > 0) {
        await fetchWithRetry('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: attendanceRecords })
        });

        if (onSaveAttendanceBatch) {
          const datesList = attendanceRecords.map(r => r.date);
          onSaveAttendanceBatch([grantLeaveSoldier.id], datesList, statusCodeToUse);
        }
      }

      // 4. Send notification
      await fetchWithRetry('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'notif_leave_' + Date.now(),
          title: `منح ${computedLeaveType} للمنسوب ${grantLeaveSoldier.rank} / ${grantLeaveSoldier.fullName}`,
          message: `تم منح ${computedLeaveType} ${isSickLeave ? `(التشخيص: ${computedIllness})` : ''} برقم أمر (${leaveOrderNumber || 'غير محدد'}) لمدة ${finalDuration} أيام اعتباراً من ${leaveStartDate} إلى ${leaveEndDate} بقرار من (${finalAuthority}).`,
          isRead: false,
          type: 'info',
          createdAt: new Date().toISOString()
        })
      });

      if (onAddLog) {
        onAddLog('إضافة', 'إجازة', `منح ${computedLeaveType} للفرد ${grantLeaveSoldier.fullName} برقم أمر ${leaveOrderNumber}`);
      }

      setIsGrantLeaveModalOpen(false);

      const soldierUnitName = units.find(u => u.id === grantLeaveSoldier.unitId)?.name || 'قيادة اللواء';

      const passObj: LeavePassData = {
        id: (newLeave as { id?: string }).id || 'leave_' + Date.now(),
        soldierName: grantLeaveSoldier.fullName,
        rank: grantLeaveSoldier.rank,
        militaryNumber: grantLeaveSoldier.militaryNumber,
        unitName: soldierUnitName,
        leaveType: computedLeaveType,
        illnessType: computedIllness,
        diagnosis: leaveDiagnosis,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        duration: finalDuration,
        grantingAuthority: finalAuthority,
        orderNumber: leaveOrderNumber || 'بدون رقم أمر',
        orderDate: leaveOrderDate || leaveStartDate,
        reason: computedReason
      };

      setPrintableLeavePass(passObj);
      triggerToast('تم منح وتوثيق الإجازة بنجاح!', 'success');

    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error granting leave:', err);
      }
      triggerToast('تم حفظ الإجازة وتحديث حالة الفرد بنجاح.', 'success');
      setIsGrantLeaveModalOpen(false);
    } finally {
      setLeaveSubmitting(false);
    }
  }, [grantLeaveSoldier, leaveStartDate, leaveEndDate, leaveGrantingAuthority, leaveGrantingAuthorityCustom, leaveDuration, leaveType, leaveDiagnosis, leaveReason, leaveOrderNumber, leaveOrderDate, leaveAttachmentUrl, activeUser, leaveNotes, onSaveAttendanceBatch, onAddLog, units]);
  const [activeReport, setActiveReport] = useState<{ type: string; title: string; content: string } | null>(null);
  const [selectedReportUnitDetail, setSelectedReportUnitDetail] = useState<{
    unitId: string;
    unitName: string;
    commanderName: string;
    isMonthly: boolean;
    periodLabel: string;
  } | null>(null);
  const [unitSoldierSearchQuery, setUnitSoldierSearchQuery] = useState('');

  const unitDetailSoldiers = useMemo(() => {
    if (!selectedReportUnitDetail) return [];
    const base = soldiers.filter(s => s.unitId === selectedReportUnitDetail.unitId);
    if (!unitSoldierSearchQuery.trim()) return base;
    const q = unitSoldierSearchQuery.toLowerCase();
    return base.filter(s => (s.fullName && s.fullName.toLowerCase().includes(q)) || (s.militaryNumber && s.militaryNumber.toLowerCase().includes(q)) || (s.rank && s.rank.toLowerCase().includes(q)));
  }, [selectedReportUnitDetail, soldiers, unitSoldierSearchQuery]);
  const [activeDecree, setActiveDecree] = useState<{ id: string; title: string; body: string; date: string } | null>(null);
  const [unitFilter, setUnitFilter] = useState<'all' | 'div' | 'bde' | 'bn' | 'co' | 'pl'>('all');
  const [selectedLauncherInfo, setSelectedLauncherInfo] = useState<{
    id: string;
    title: string;
    description: string;
    badge: string;
    color: string;
    icon: React.ReactNode;
    statsLabel: string;
    statsValue: string | number;
    detailsList: string[];
    onConfirm: () => void;
  } | null>(null);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  // Live Drill-Down Modal State for Launcher Popup Items
  const [drillDownModal, setDrillDownModal] = useState<DrillDownModalState | null>(null);

  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [expandedDrillDownId, setExpandedDrillDownId] = useState<string | null>(null);

  // Deep Item Detail Modal State for Deep Nested Popups
  const [itemDetailModal, setItemDetailModal] = useState<ItemDetailModalState | null>(null);

  // WhatsApp share modal state
  const [whatsAppSoldier, setWhatsAppSoldier] = useState<Soldier | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Status Filter for Drill-Down Modal
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState<string>('all');

  // Pull Down Gesture State for Opening Notifications on Swipe/Drag Down
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef<number | null>(null);

  const handlePullStart = useCallback((clientY: number) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 60) {
      startYRef.current = clientY;
      setIsPulling(true);
    }
  }, []);

  const handlePullMove = useCallback((clientY: number) => {
    if (!isPulling || startYRef.current === null) return;
    const deltaY = clientY - startYRef.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY, 110));
    } else {
      setPullDistance(0);
    }
  }, [isPulling]);

  const handlePullEnd = useCallback(() => {
    if (pullDistance > 55) {
      window.dispatchEvent(new CustomEvent('open-notifications'));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (_) {}
      }
    }
    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
  }, [pullDistance]);

  // Filtered Drill Down Items
  const filteredDrillDownItems = useMemo(() => {
    if (!drillDownModal) return [];
    let items = drillDownModal.items;

    if (drillDownModal.type === 'soldiers' && drillDownStatusFilter !== 'all') {
      const targetFilter = normalizeStatusCode(drillDownStatusFilter);
      items = items.filter(i => normalizeStatusCode(i.statusCode) === targetFilter);
    }

    if (!drillDownSearch.trim()) return items;
    const q = drillDownSearch.toLowerCase().trim();
    return items.filter(item => {
      if (item.fullName && item.fullName.toLowerCase().includes(q)) return true;
      if (item.militaryNumber && item.militaryNumber.includes(q)) return true;
      if (item.rank && item.rank.toLowerCase().includes(q)) return true;
      if (item.unitName && item.unitName.toLowerCase().includes(q)) return true;
      if (item.specialization && item.specialization.toLowerCase().includes(q)) return true;
      if (item.commanderName && item.commanderName.toLowerCase().includes(q)) return true;
      if (item.name && item.name.toLowerCase().includes(q)) return true;
      if (item.userName && item.userName.toLowerCase().includes(q)) return true;
      if (item.details && item.details.toLowerCase().includes(q)) return true;
      if (item.type && item.type.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [drillDownModal, drillDownSearch, drillDownStatusFilter]);

  // Handle Export CSV
  const handleExportDrillDownCSV = useCallback(() => {
    if (!drillDownModal || !filteredDrillDownItems.length) return;
    const headers = ["العنوان / الاسم", "الرقم العسكري / المعرف", "التشكيل / الوحدة", "الحالة / الرتبة / النوع", "التفاصيل"];
    const rows = filteredDrillDownItems.map((item: DrillDownItem) => [
      `"${String(item.fullName || item.unitName || item.name || item.userName || 'غير معروف').replace(/"/g, '""')}"`,
      `"${String(item.militaryNumber || item.id || '-').replace(/"/g, '""')}"`,
      `"${String(item.unitName || item.unit || item.unitId || '-').replace(/"/g, '""')}"`,
      `"${String(item.statusCode || item.type || item.role || item.rank || '-').replace(/"/g, '""')}"`,
      `"${String(item.specialization || item.details || item.commanderName || '').replace(/"/g, '""')}"`
    ]);

    const csvStr = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvStr);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_بيانات_${drillDownModal.categoryName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [drillDownModal, filteredDrillDownItems]);

  // Handle Inline Soldier Status Change inside Drill-down
  const handleInlineStatusChange = useCallback((soldierId: string, newStatusCode: AttendanceStatusCode) => {
    const targetDate = selectedDailyDate || latestDate;
    if (onSaveAttendanceBatch) {
      onSaveAttendanceBatch([soldierId], [targetDate], newStatusCode);
    }

    if (drillDownModal) {
      setDrillDownModal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(item => {
            if (item.id === soldierId) {
              return { ...item, statusCode: newStatusCode };
            }
            return item;
          })
        };
      });
    }

    if (itemDetailModal && itemDetailModal.item && itemDetailModal.item.id === soldierId) {
      setItemDetailModal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          item: { ...prev.item, statusCode: newStatusCode }
        };
      });
    }

    const soldier = activeSoldiers.find(s => s.id === soldierId);
    if (onAddLog && soldier) {
      const statusLabels: Record<string, string> = { 'ح': 'حاضر', 'غ': 'غائب', 'إ': 'إجازة', 'م': 'مهمة', 'ع': 'بعذر', 'ن': 'نصف دوام' };
      onAddLog('تعديل', 'الحضور اليومي', `تحديث الحالة اللحظية للمنتسب [${soldier.rank} ${soldier.fullName}] إلى [${statusLabels[newStatusCode] || newStatusCode}] من النافذة المنبثقة المباشرة بتاريخ [${targetDate}]`);
    }
  }, [selectedDailyDate, latestDate, onSaveAttendanceBatch, drillDownModal, itemDetailModal, activeSoldiers, onAddLog]);

  // WhatsApp Share Handler for Soldier Details
  const handleSendWhatsAppDetails = (soldier: Soldier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWhatsAppSoldier(soldier);
    setIsWhatsAppModalOpen(true);
  };

  // Drill-down helper handlers
  const handleOpenAttendanceDrillDown = (
    statusCode: AttendanceStatusCode | 'pending' | 'all',
    label: string,
    color: string,
    unitIdFilter?: string
  ) => {
    const targetDate = selectedDailyDate || latestDate;
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const dayRecordsMap = new Map<string, string>();
    
    attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).forEach(a => {
      dayRecordsMap.set(a.soldierId, normalizeStatusCode(a.statusCode));
    });

    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const normTargetFilter = normalizeStatusCode(statusCode);

    const list = activeSoldiers
      .filter(s => {
        if (unitIdFilter && unitIdFilter !== 'all' && s.unitId !== unitIdFilter) {
          return false;
        }
        const hasRecord = dayRecordsMap.has(s.id);
        let st = dayRecordsMap.get(s.id);
        if (!st) {
          if (s.militaryStatus === 'إجازة' || s.militaryStatus === 'إجازة مرضية') st = 'إ';
          else if (s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف') st = 'غ';
          else if (s.militaryStatus === 'مهمة') st = 'م';
          else st = 'pending';
        }
        if (statusCode === 'all') return true;
        if (statusCode === 'pending' || normTargetFilter === 'pending') {
          return st === 'pending';
        }
        return st === normTargetFilter;
      })
      .map(s => {
        let st = dayRecordsMap.get(s.id);
        if (!st) {
          if (s.militaryStatus === 'إجازة' || s.militaryStatus === 'إجازة مرضية') st = 'إ';
          else if (s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف') st = 'غ';
          else if (s.militaryStatus === 'مهمة') st = 'م';
          else st = 'pending';
        }
        return {
          id: s.id,
          soldier: s,
          militaryNumber: s.militaryNumber,
          fullName: s.fullName,
          rank: s.rank,
          unitId: s.unitId,
          unitName: unitMap.get(s.unitId) || s.battalion || 'وحدة غير محددة',
          specialization: s.specialization || 'عام',
          statusCode: st,
          phoneNumber: s.phoneNumber || 'غير مسجل',
          militaryStatus: s.militaryStatus || 'على رأس العمل',
          bloodType: s.bloodType || 'غير محدد',
          photoUrl: s.photoUrl,
          recordDate: targetDate
        };
      });

    setDrillDownModal({
      title: `سجل الحضور اليومي (${targetDate}): ${label}`,
      categoryName: label,
      count: list.length,
      type: 'soldiers',
      color,
      items: list
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
    setDrillDownStatusFilter(statusCode as string);
  };

  const handleBatchMarkPendingAsPresent = () => {
    const targetDate = selectedDailyDate || latestDate;
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const recordedIds = new Set(
      attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => a.soldierId)
    );
    const unrecordedSoldiers = activeSoldiers.filter(s => !recordedIds.has(s.id));
    if (unrecordedSoldiers.length === 0) return;

    if (onSaveAttendanceBatch) {
      const ids = unrecordedSoldiers.map(s => s.id);
      const datesList = unrecordedSoldiers.map(() => targetDate);
      onSaveAttendanceBatch(ids, datesList, 'ح');
    }

    if (onAddLog) {
      onAddLog('تعديل', 'الحضور والغياب', `تم تحضير عدد [${unrecordedSoldiers.length}] فرد حاشراً بـ (حاضر) دفعة واحدة بتاريخ [${targetDate}]`);
    }
  };

  const handleOpenSoldierCategoryDrillDown = (category: 'officers' | 'ncos' | 'soldiers' | 'all' | string, label: string, color: string) => {
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    
    let filtered = activeSoldiers;
    if (category === 'officers') {
      filtered = activeSoldiers.filter(s => ['لواء', 'عميد', 'عقيد', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم'].includes(s.rank));
    } else if (category === 'ncos') {
      filtered = activeSoldiers.filter(s => ['مساعد أول', 'مساعد', 'رقيب أول', 'رقيب', 'وكيل رقيب', 'عريف'].includes(s.rank));
    } else if (category === 'soldiers') {
      filtered = activeSoldiers.filter(s => ['جندي أول', 'جندي'].includes(s.rank));
    } else if (category !== 'all') {
      filtered = activeSoldiers.filter(s => s.specialization && s.specialization.includes(category));
    }

    const list = filtered.map(s => ({
      id: s.id,
      soldier: s,
      militaryNumber: s.militaryNumber,
      fullName: s.fullName,
      rank: s.rank,
      unitName: unitMap.get(s.unitId) || s.battalion || 'وحدة غير محددة',
      specialization: s.specialization || 'عام',
      phoneNumber: s.phoneNumber || 'غير مسجل',
      militaryStatus: s.militaryStatus || 'على رأس العمل',
      bloodType: s.bloodType || 'غير محدد'
    }));

    setDrillDownModal({
      title: `كشف القوة البشرية الحقيقي: ${label}`,
      categoryName: label,
      count: list.length,
      type: 'soldiers',
      color,
      items: list
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleOpenUnitsDrillDown = (filterType: 'all' | 'bn' | 'co' | 'pl', label: string, color: string) => {
    let filteredUnits = scopedUnits;
    if (filterType === 'bn') {
      filteredUnits = scopedUnits.filter(u => u.name.includes('كتيبة') || u.type === 'bn');
    } else if (filterType === 'co') {
      filteredUnits = scopedUnits.filter(u => u.name.includes('سرية') || u.type === 'co');
    } else if (filterType === 'pl') {
      filteredUnits = scopedUnits.filter(u => u.name.includes('فصيلة') || u.type === 'pl');
    }

    const list = filteredUnits.map(u => {
      const unitSoldiers = activeSoldiers.filter(s => s.unitId === u.id);
      return {
        id: u.id,
        unitName: u.name,
        commanderName: u.commanderName || 'قائد التشكيل غير مسمّى',
        type: u.type || 'وحدة قتالية',
        location: u.location || 'المقر الرئيسي لعمليات اللواء',
        approvedStrength: u.approvedStrength || unitSoldiers.length,
        activeStrength: unitSoldiers.length,
        status: u.status || 'نشط'
      };
    });

    setDrillDownModal({
      title: `قائمة التشكيلات والهيكلية العسكرية: ${label}`,
      categoryName: label,
      count: list.length,
      type: 'units',
      color,
      items: list
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleOpenReadinessDrillDown = (filter: 'all' | 'high' | 'critical', label: string, color: string) => {
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const todayRecordsMap = new Map<string, AttendanceStatusCode>();
    attendance.filter(a => a.date === latestDate && activeSoldierIds.has(a.soldierId)).forEach(a => {
      todayRecordsMap.set(a.soldierId, a.statusCode);
    });

    let list = scopedUnits.map(u => {
      const uSoldiers = activeSoldiers.filter(s => s.unitId === u.id);
      let present = 0;
      uSoldiers.forEach(s => {
        const st = todayRecordsMap.get(s.id) || 'غ';
        if (st === 'ح') present++;
        else if (st === 'ن') present += 0.5;
        else if (st === 'م') present++;
      });
      const rate = uSoldiers.length > 0 ? Math.round((present / uSoldiers.length) * 100) : 0;
      return {
        id: u.id,
        unitName: u.name,
        commanderName: u.commanderName || 'غير معين',
        totalSoldiers: uSoldiers.length,
        presentCount: Math.round(present),
        absentCount: uSoldiers.length - Math.round(present),
        readinessRate: rate
      };
    });

    if (filter === 'high') {
      list = list.filter(u => u.readinessRate >= 75);
    } else if (filter === 'critical') {
      list = list.filter(u => u.readinessRate < 70);
    }

    setDrillDownModal({
      title: `مصفوفة الاستعداد الجاهزية التكتيكية: ${label}`,
      categoryName: label,
      count: list.length,
      type: 'units',
      color,
      items: list
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleOpenOpsDrillDown = (typeFilter: 'all' | 'leave' | 'mission', label: string, color: string) => {
    let filtered = pendingApprovals;
    if (typeFilter === 'leave') {
      filtered = pendingApprovals.filter(a => a.type.includes('إجازة'));
    } else if (typeFilter === 'mission') {
      filtered = pendingApprovals.filter(a => a.type.includes('تكليف') || a.type.includes('مهمة'));
    }

    setDrillDownModal({
      title: `سجل الطلبات والمعاملات الحية: ${label}`,
      categoryName: label,
      count: filtered.length,
      type: 'approvals',
      color,
      items: filtered
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleOpenAuditDrillDown = (actionFilter: 'all' | 'إضافة' | 'تعديل' | 'حذف', label: string, color: string) => {
    let filtered = auditLogs;
    if (actionFilter !== 'all') {
      filtered = auditLogs.filter(l => l.actionType === actionFilter);
    }

    setDrillDownModal({
      title: `سجل الرقابة والتتبع الفوري: ${label}`,
      categoryName: label,
      count: filtered.length,
      type: 'audit',
      color,
      items: filtered
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleOpenIAMDrillDown = (roleFilter: 'all' | 'admin' | 'commander' | 'operations' | 'writer', label: string, color: string) => {
    let filtered = users;
    if (roleFilter === 'admin') {
      filtered = users.filter(u => u.role === 'admin');
    } else if (roleFilter === 'commander') {
      filtered = users.filter(u => u.role === 'commander_unit' || u.role === 'commander_formation');
    } else if (roleFilter === 'operations') {
      filtered = users.filter(u => u.role === 'operations');
    } else if (roleFilter === 'writer') {
      filtered = users.filter(u => u.role === 'data_writer');
    }

    setDrillDownModal({
      title: `قائمة حسابات وتراخيص المستخدمين: ${label}`,
      categoryName: label,
      count: filtered.length,
      type: 'users',
      color,
      items: filtered
    });
    setDrillDownSearch('');
    setExpandedDrillDownId(null);
  };

  const handleScrollToWorkspace = useCallback((subTab: 'units_readiness' | 'analytics' | 'ops_center' | 'live_feed') => {
    setActiveSubTab(subTab);
    setActiveLauncher(subTab);
    if (workspaceScrollTimerRef.current) clearTimeout(workspaceScrollTimerRef.current);
    workspaceScrollTimerRef.current = setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Interactive Ops State: Pending Approvals
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // System-wide Alerts
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  // Handle alert resolution
  const handleResolveAlert = (id: string, actionName: string) => {
    setSystemAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    if (onAddLog) {
      onAddLog('تعديل', 'تنبيهات القيادة', `معالجة التنبيه [${id}] عبر إجراء: [${actionName}] بواسطة ${activeUser.name}`);
    }
  };

  // Handle Approvals
  const handleApprovalAction = (id: string, name: string, type: string, accepted: boolean) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
    if (onAddLog) {
      onAddLog('تعديل', 'الاعتمادات والإجازات', `تم ${accepted ? 'اعتماد وصرف' : 'رفض'} طلب [${type}] للمنتسب [${name}]`);
    }
  };

  // Check if user has selected a historical/different date than actualToday
  const isHistoricalDate = useMemo(() => {
    return selectedDailyDate !== '' && selectedDailyDate !== actualToday;
  }, [selectedDailyDate, actualToday]);

  // Statistics for Today or Selected Date
  const statsToday = useMemo(() => {
    // Filter attendance for active soldiers on target date
    const targetDate = selectedDailyDate || latestDate;
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const recordsToday = attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId));
    
    const counts = { h: 0, g: 0, i: 0, m: 0, e: 0, n: 0, unrecorded: 0 };
    recordsToday.forEach(r => {
      const st = normalizeStatusCode(r.statusCode);
      if (st === 'ح') counts.h++;
      else if (st === 'غ') counts.g++;
      else if (st === 'إ') counts.i++;
      else if (st === 'م') counts.m++;
      else if (st === 'ع') counts.e++;
      else if (st === 'ن') counts.n++;
    });

    // Unrecorded soldiers count (Active soldiers without an attendance status record on target date)
    counts.unrecorded = Math.max(0, activeSoldiers.length - recordsToday.length);

    const presentCount = counts.h + counts.n * 0.5;
    const readinessRate = totalStrength > 0 ? ((presentCount + counts.m) / totalStrength) * 100 : 0;
    const completenessRate = totalStrength > 0 ? (totalStrength / (totalStrength * 1.12)) * 100 : 100; // Target vs actual

    return {
      ...counts,
      targetDate,
      presentWeight: presentCount,
      readinessRate: Math.round(readinessRate),
      completenessRate: Math.round(completenessRate)
    };
  }, [attendance, selectedDailyDate, latestDate, activeSoldiers, totalStrength]);

  // Daily movement statistics for Executive Readiness ticker (Resumed, Granted Leaves, Overdue Absences)
  const dailyMovementStats = useMemo(() => {
    const targetDateStr = selectedDailyDate || actualToday;
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));

    // Get attendance records on target date
    const targetRecords = attendance.filter(a => a.date === targetDateStr && activeSoldierIds.has(a.soldierId));
    const targetStatusMap = new Map<string, string>();
    targetRecords.forEach(r => targetStatusMap.set(r.soldierId, normalizeStatusCode(r.statusCode)));

    // Get previous day YYYY-MM-DD
    const targetDateObj = new Date(targetDateStr);
    const prevDateObj = new Date(targetDateObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];

    const prevRecords = attendance.filter(a => a.date === prevDateStr && activeSoldierIds.has(a.soldierId));
    const prevStatusMap = new Map<string, string>();
    prevRecords.forEach(r => prevStatusMap.set(r.soldierId, normalizeStatusCode(r.statusCode)));

    // 1. Resumed Today (المواصلون للعمل اليوم)
    const resumedTodaySoldiers = activeSoldiers.filter(s => {
      const cur = targetStatusMap.get(s.id);
      const prev = prevStatusMap.get(s.id);
      if (cur === 'ح') {
        if (prev === 'إ' || prev === 'ع' || s.militaryStatus?.includes('إجازة')) {
          return true;
        }
      }
      return false;
    });

    // 2. Granted Leave Today (الإجازات الممنوحة اليوم)
    const grantedLeaveTodaySoldiers = activeSoldiers.filter(s => {
      const cur = targetStatusMap.get(s.id);
      const prev = prevStatusMap.get(s.id);
      if (cur === 'إ' || cur === 'ع') {
        if (prev !== 'إ' && prev !== 'ع') {
          return true;
        }
      }
      return false;
    });

    // 3. Overdue / Automatic Absence (الغياب وتأخير المواصلة)
    const overdueAbsentSoldiers = activeSoldiers.filter(s => {
      const cur = targetStatusMap.get(s.id);
      const prev = prevStatusMap.get(s.id);
      if (cur === 'غ') return true;
      if ((prev === 'إ' || prev === 'ع') && cur !== 'ح' && cur !== 'إ' && cur !== 'ع') {
        return true;
      }
      return false;
    });

    return {
      resumedTodaySoldiers,
      grantedLeaveTodaySoldiers,
      overdueAbsentSoldiers,
      targetDateStr
    };
  }, [attendance, activeSoldiers, selectedDailyDate, actualToday]);

  // Unit Stats parsing
  const unitStats = useMemo(() => {
    return scopedUnits.map(unit => {
      const unitSoldiers = activeSoldiers.filter(s => s.unitId === unit.id);
      const unitSoldierIds = new Set(unitSoldiers.map(s => s.id));
      const strength = unitSoldiers.length;

      // Filter attendance records for unit soldiers
      const unitRecords = attendance.filter(a => unitSoldierIds.has(a.soldierId));
      let h = 0, g = 0, i = 0, m = 0, e = 0, n = 0;
      unitRecords.forEach(r => {
        const st = normalizeStatusCode(r.statusCode);
        if (st === 'ح') h++;
        else if (st === 'غ') g++;
        else if (st === 'إ') i++;
        else if (st === 'م') m++;
        else if (st === 'ع') e++;
        else if (st === 'ن') n++;
      });

      const possibleDays = strength * dates.length;
      const actualPresent = h + n * 0.5;
      const attendanceRate = possibleDays > 0 ? (actualPresent / possibleDays) * 100 : 0;

      // Determine unit hierarchy type
      let type: 'div' | 'bde' | 'bn' | 'co' | 'pl' = 'bn';
      if (unit.name.includes('فرقة') || unit.name.includes('الفرقة')) type = 'div';
      else if (unit.name.includes('لواء') || unit.name.includes('اللواء')) type = 'bde';
      else if (unit.name.includes('كتيبة') || unit.name.includes('الكتيبة')) type = 'bn';
      else if (unit.name.includes('سرية') || unit.name.includes('السرية')) type = 'co';
      else if (unit.name.includes('فصيلة') || unit.name.includes('الفصيلة')) type = 'pl';

      // Today's specific unit attendance
      const todayRecords = attendance.filter(a => a.date === latestDate && unitSoldierIds.has(a.soldierId));
      let todayH = 0, todayG = 0, todayI = 0, todayM = 0, todayE = 0, todayN = 0;
      todayRecords.forEach(r => {
        const st = normalizeStatusCode(r.statusCode);
        if (st === 'ح') todayH++;
        else if (st === 'غ') todayG++;
        else if (st === 'إ') todayI++;
        else if (st === 'م') todayM++;
        else if (st === 'ع') todayE++;
        else if (st === 'ن') todayN++;
      });

      const currentPresent = todayH + todayN * 0.5;
      const readinessToday = strength > 0 ? Math.round(((currentPresent + todayM) / strength) * 100) : 0;
      const targetStrength = Math.round(strength * 1.25);

      let status: '🟢 جاهزية كاملة' | '🟡 جاهزية متوسطة' | '🟠 تحتاج دعم' | '🔴 حالة حرجة' = '🟢 جاهزية كاملة';
      let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      if (readinessToday < 55) {
        status = '🔴 حالة حرجة';
        badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      } else if (readinessToday < 75) {
        status = '🟠 تحتاج دعم';
        badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      } else if (readinessToday < 90) {
        status = '🟡 جاهزية متوسطة';
        badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      }

      return {
        ...unit,
        strength,
        type,
        targetStrength,
        today: {
          h: todayH, g: todayG, i: todayI, m: todayM, e: todayE, n: todayN,
          rate: readinessToday
        },
        attendanceRate: Math.round(attendanceRate),
        status,
        badgeColor
      };
    });
  }, [scopedUnits, activeSoldiers, attendance, dates, latestDate]);

  // Filter unitStats based on level selectors
  const filteredUnitStats = useMemo(() => {
    if (unitFilter === 'all') return unitStats;
    return unitStats.filter(u => u.type === unitFilter);
  }, [unitStats, unitFilter]);

  // Overall attendance trend
  const dailyAttendanceTrend = useMemo(() => {
    return dates.map(dStr => {
      const dayRecords = attendance.filter(a => a.date === dStr);
      const activeIds = new Set(activeSoldiers.map(s => s.id));
      const activeDayRecords = dayRecords.filter(r => activeIds.has(r.soldierId));

      let h = 0, n = 0, m = 0;
      activeDayRecords.forEach(r => {
        const st = normalizeStatusCode(r.statusCode);
        if (st === 'ح') h++;
        else if (st === 'ن') n++;
        else if (st === 'م') m++;
      });

      const dayPresent = h + n * 0.5 + m;
      const rate = totalStrength > 0 ? (dayPresent / totalStrength) * 100 : 0;
      const dayNum = parseInt(dStr.split('-')[2]);
      return {
        date: `${dayNum} محرم`,
        'نسبة الجاهزية %': Math.round(rate),
      };
    });
  }, [dates, attendance, activeSoldiers, totalStrength]);

  // Status breakdown donut stats
  const statusDonutData = useMemo(() => {
    return [
      { name: 'حضور فعلي', value: statsToday.h, color: '#10B981' }, // emerald
      { name: 'مهمة ميدانية', value: statsToday.m, color: '#8B5CF6' }, // purple
      { name: 'إجازة رسمية', value: statsToday.i, color: '#3B82F6' }, // blue
      { name: 'غياب بعذر', value: statsToday.e, color: '#F59E0B' }, // amber
      { name: 'غياب غير مبرر', value: statsToday.g, color: '#EF4444' }, // red
      { name: 'نصف يوم', value: statsToday.n, color: '#6B7280' }, // gray
    ].filter(item => item.value > 0);
  }, [statsToday]);

  // Rank distribution statistics
  const rankStats = useMemo(() => {
    const ranks = ['لواء', 'عميد', 'عقيد', 'مقدم', 'رائد', 'نقيب', 'ملازم', 'مساعد', 'رقيب', 'عريف', 'جندي'];
    const distribution = ranks.map(rank => {
      const count = activeSoldiers.filter(s => s.rank.includes(rank)).length;
      return { name: rank, 'العدد': count };
    }).filter(r => r['العدد'] > 0);
    return distribution;
  }, [activeSoldiers]);

  // Specialty statistics
  const specialtyStats = useMemo(() => {
    const specialties = ['استطلاع', 'إشارة', 'مشاة', 'مدرعات', 'هندسة', 'طبي', 'عتاد'];
    return specialties.map(spec => {
      const count = activeSoldiers.filter(s => s.specialization && s.specialization.includes(spec)).length;
      return { name: spec, 'النسبة': count > 0 ? Math.round((count / totalStrength) * 100) : 5 };
    });
  }, [activeSoldiers, totalStrength]);

  // Unified Search Engine
  const searchResults = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return { soldiers: [], units: [], directives: [], telegrams: [] };
    const qRaw = searchQuery.trim();
    
    // Arabic normalization helper
    const norm = (str: string | null | undefined): string => {
      if (!str) return '';
      return str
        .toLowerCase()
        .trim()
        .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ');
    };

    const qNorm = norm(qRaw);
    const qNoSpace = qNorm.replace(/\s+/g, '');

    const matchedSoldiers = scopedSoldiers.filter(s => {
      const nameNorm = norm(s.fullName);
      const nameMatch = nameNorm.includes(qNorm) || (qNoSpace.length > 2 && nameNorm.replace(/\s+/g, '').includes(qNoSpace));
      
      const milNoNorm = norm(s.militaryNumber);
      const milNoMatch = milNoNorm.includes(qNorm) || (s.militaryNumber && s.militaryNumber.includes(qRaw));
      
      const natIdNorm = norm(s.nationalId);
      const natIdMatch = natIdNorm ? natIdNorm.includes(qNorm) : false;

      const phoneNorm = norm(s.phoneNumber);
      const phoneMatch = phoneNorm ? phoneNorm.includes(qNorm) : false;

      const specNorm = norm(s.specialization);
      const specMatch = specNorm.includes(qNorm);

      const rankNorm = norm(s.rank);
      const rankMatch = rankNorm.includes(qNorm);

      const battNorm = norm(s.battalion);
      const compNorm = norm(s.company);
      const batCompMatch = battNorm.includes(qNorm) || compNorm.includes(qNorm);

      const unitObj = scopedUnits.find(u => u.id === s.unitId);
      const unitNorm = unitObj ? norm(unitObj.name) : '';
      const unitMatch = unitNorm ? unitNorm.includes(qNorm) : false;

      return nameMatch || milNoMatch || natIdMatch || phoneMatch || specMatch || rankMatch || batCompMatch || unitMatch;
    }).slice(0, 20);

    const matchedUnits = scopedUnits.filter(u => {
      const uNameNorm = norm(u.name);
      const uCmdNorm = norm(u.commanderName);
      return uNameNorm.includes(qNorm) || uCmdNorm.includes(qNorm);
    }).slice(0, 8);

    // Mock directives matched
    const directives = [
      { title: 'تعميم الاستنفار الفني رقم ٤٠٨', ref: '٤٠٨ / أ', text: 'رفع الجاهزية الفنية للآليات والمجنزرات بنسبة ٩٠%', date: '١٤٤٨/٠١/٢٢' },
      { title: 'قرار نقل وتثبيت ملاكات سرية الإسناد', ref: '٣١/ت', text: 'إعادة توزيع كتلة القوة المشتركة ضمن سرية الإسناد الفني للواء الثاني', date: '١٤٤٨/٠١/١٥' }
    ].filter(d => norm(d.title).includes(qNorm) || norm(d.text).includes(qNorm));

    return { soldiers: matchedSoldiers, units: matchedUnits, directives, telegrams: [] };
  }, [searchQuery, scopedSoldiers, scopedUnits]);

  // 1. Daily Report Statistics for selected date (على مستوى اليوم)
  const dailyReportStats = useMemo(() => {
    const targetDate = selectedDailyDate || latestDate;
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const dayRecords = attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId));

    let h = 0, g = 0, i = 0, m = 0, e = 0, n = 0;
    dayRecords.forEach(r => {
      const st = normalizeStatusCode(r.statusCode);
      if (st === 'ح') h++;
      else if (st === 'غ') g++;
      else if (st === 'إ') i++;
      else if (st === 'م') m++;
      else if (st === 'ع') e++;
      else if (st === 'ن') n++;
    });

    const unrecorded = Math.max(0, totalStrength - dayRecords.length);
    const presentWeight = h + n * 0.5;
    const readinessRate = totalStrength > 0 ? Math.round(((presentWeight + m) / totalStrength) * 100) : 0;

    const unitBreakdown = scopedUnits.map(unit => {
      const uSoldiers = activeSoldiers.filter(s => s.unitId === unit.id);
      const uSoldierIds = new Set(uSoldiers.map(s => s.id));
      const uRecords = dayRecords.filter(r => uSoldierIds.has(r.soldierId));

      let uH = 0, uG = 0, uI = 0, uM = 0, uE = 0, uN = 0;
      uRecords.forEach(r => {
        const st = normalizeStatusCode(r.statusCode);
        if (st === 'ح') uH++;
        else if (st === 'غ') uG++;
        else if (st === 'إ') uI++;
        else if (st === 'م') uM++;
        else if (st === 'ع') uE++;
        else if (st === 'ن') uN++;
      });
      const uPresent = uH + uN * 0.5;
      const uTotal = uSoldiers.length;
      const uRate = uTotal > 0 ? Math.round(((uPresent + uM) / uTotal) * 100) : 0;

      return {
        unitId: unit.id,
        unitName: unit.name,
        commanderName: unit.commanderName || 'غير مسمى',
        total: uTotal,
        h: uH, g: uG, i: uI, m: uM, e: uE, n: uN,
        rate: uRate
      };
    });

    return {
      date: targetDate,
      h, g, i, m, e, n, unrecorded,
      presentWeight,
      readinessRate,
      unitBreakdown
    };
  }, [selectedDailyDate, latestDate, activeSoldiers, attendance, totalStrength, scopedUnits]);

  // 2. Monthly Report Statistics (على مستوى الشهر المحدد)
  const monthlyReportStats = useMemo(() => {
    const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
    const monthPrefix = `${selectedMonthlyYear}-${selectedMonthlyMonth}`;
    
    // Filter attendance records for the selected month and year
    let monthRecords = attendance.filter(a => activeSoldierIds.has(a.soldierId) && a.date.startsWith(monthPrefix));
    
    // Fallback if no records match the prefix exactly
    const hasMonthSpecificRecords = monthRecords.length > 0;
    if (!hasMonthSpecificRecords) {
      monthRecords = attendance.filter(a => activeSoldierIds.has(a.soldierId));
    }

    const uniqueDatesInMonth = Array.from(new Set(monthRecords.map(a => a.date)));
    const totalDaysRecorded = uniqueDatesInMonth.length || 1;
    let totalH = 0, totalG = 0, totalI = 0, totalM = 0, totalE = 0, totalN = 0;

    monthRecords.forEach(r => {
      const st = normalizeStatusCode(r.statusCode);
      if (st === 'ح') totalH++;
      else if (st === 'غ') totalG++;
      else if (st === 'إ') totalI++;
      else if (st === 'م') totalM++;
      else if (st === 'ع') totalE++;
      else if (st === 'ن') totalN++;
    });

    const totalPossibleManDays = totalStrength * totalDaysRecorded;
    const actualPresentManDays = totalH + totalN * 0.5;
    const avgMonthlyReadinessRate = totalPossibleManDays > 0 
      ? Math.round(((actualPresentManDays + totalM) / totalPossibleManDays) * 100) 
      : 0;

    const unitMonthlyBreakdown = scopedUnits.map(unit => {
      const uSoldiers = activeSoldiers.filter(s => s.unitId === unit.id);
      const uSoldierIds = new Set(uSoldiers.map(s => s.id));
      const uRecords = monthRecords.filter(r => uSoldierIds.has(r.soldierId));

      let uH = 0, uG = 0, uI = 0, uM = 0, uE = 0, uN = 0;
      uRecords.forEach(r => {
        const st = normalizeStatusCode(r.statusCode);
        if (st === 'ح') uH++;
        else if (st === 'غ') uG++;
        else if (st === 'إ') uI++;
        else if (st === 'م') uM++;
        else if (st === 'ع') uE++;
        else if (st === 'ن') uN++;
      });

      const uPossibleManDays = uSoldiers.length * totalDaysRecorded;
      const uPresentManDays = uH + uN * 0.5;
      const uAvgRate = uPossibleManDays > 0 ? Math.round(((uPresentManDays + uM) / uPossibleManDays) * 100) : 0;

      let rating = 'ممتاز 🟢';
      let ratingColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (uAvgRate < 60) {
        rating = 'ضعيف جداً 🔴';
        ratingColor = 'bg-rose-50 text-rose-700 border-rose-200';
      } else if (uAvgRate < 75) {
        rating = 'يحتاج متابعة 🟠';
        ratingColor = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (uAvgRate < 88) {
        rating = 'جيد جداً 🔵';
        ratingColor = 'bg-blue-50 text-blue-700 border-blue-200';
      }

      return {
        unitId: unit.id,
        unitName: unit.name,
        commanderName: unit.commanderName || 'غير مسمى',
        totalSoldiers: uSoldiers.length,
        totalH: uH, totalG: uG, totalI: uI, totalM: uM, totalE: uE,
        avgRate: uAvgRate,
        rating,
        ratingColor
      };
    });

    const selectedMonthObj = MONTHS_LIST.find(m => m.value === selectedMonthlyMonth) || MONTHS_LIST[6];

    return {
      selectedMonthName: selectedMonthObj.name,
      selectedMonthShort: selectedMonthObj.short,
      selectedYear: selectedMonthlyYear,
      hasMonthSpecificRecords,
      totalDaysRecorded,
      totalH, totalG, totalI, totalM, totalE, totalN,
      avgMonthlyReadinessRate,
      unitMonthlyBreakdown
    };
  }, [attendance, activeSoldiers, totalStrength, scopedUnits, selectedMonthlyMonth, selectedMonthlyYear]);

  // Interactive Report Generator
  const generateReportPreview = (reportType: string) => {
    let title = '';
    let content = '';

    switch (reportType) {
      case 'daily_periodic':
        title = `تقرير مؤشرات الجاهزية والحضور اليومي بتاريخ ${dailyReportStats.date}`;
        content = `صادر عن مركز القيادة والسيطرة - تقرير المؤشرات اليومي على مستوى اليوم:
        \n- تاريخ التقرير اليومي: ${dailyReportStats.date}
        \n- إجمالي القوة الفاعلة باللواء: ${totalStrength} عنصر.
        \n- الحضور الفعلي الميداني اليوم: ${dailyReportStats.h} فرد (${dailyReportStats.readinessRate}% نسبة الجاهزية اليومية).
        \n- المهمات الميدانية اليومية: ${dailyReportStats.m} فرد.
        \n- الإجازات الرسمية الممنوحة اليوم: ${dailyReportStats.i} فرد.
        \n- حالات الغياب غير المبررة اليوم: ${dailyReportStats.g} فرد.
        \n- حالات الغياب بعذر/طبي اليوم: ${dailyReportStats.e} فرد.
        \n\nتوصية السيطرة: اعتماد كشف الحساب اليومي وتوجيه قادة الكتائب بمتابعة حالات الغياب غير المبرر فوراً.`;
        break;

      case 'monthly_periodic':
        title = `تقرير مؤشرات السيطرة والانضباط الشهري - شهر ${monthlyReportStats.selectedMonthName} ${monthlyReportStats.selectedYear}`;
        content = `صادر عن قيادة اللواء - تقرير المؤشرات التراكمية لشهر ${monthlyReportStats.selectedMonthName} ${monthlyReportStats.selectedYear}:
        \n- الشهر المحدد: ${monthlyReportStats.selectedMonthName} (عام ${monthlyReportStats.selectedYear} م).
        \n- عدد الأيام المسجلة والمحسوبة خلال الشهر: ${monthlyReportStats.totalDaysRecorded} يوم.
        \n- إجمالي القوة الفاعلة بالخدمة: ${totalStrength} عنصر.
        \n- متوسط نسبة الحضور والجاهزية الشهرية للواء: ${monthlyReportStats.avgMonthlyReadinessRate}%.
        \n- إجمالي حالات الغياب التراكمية خلال الشهر: ${monthlyReportStats.totalG} حالة غياب.
        \n- إجمالي أيام الإجازات المستهلكة خلال الشهر: ${monthlyReportStats.totalI} إجازة.
        \n- إجمالي المهمات والتكليفات الميدانية خلال الشهر: ${monthlyReportStats.totalM} مهمة.
        \n\nتقييم الانضباط الشهري: اللواء يمر بحالة جاهزية مستقرة مع التوجيه بالالتزام الكامل بجدول المناوبات والدوام الشهري.`;
        break;

      case 'readiness':
        title = 'التقرير الأمني اليومي للجاهزية والسيطرة على القوات';
        content = `بناءً على التوجيهات القيادية الصادرة، ترفق قيادة لواء المشاة الآلي /٢٦/ التقرير الإحصائي اليومي الخاص بالجاهزية القتالية والتعبوية للقوات:
        \n- إجمالي القوة الفعلية النشطة بالملاكات المعتمدة: ${totalStrength} عنصر مقاتل ومساند.
        \n- القوة الحاضرة والنشطة بمسرح العمليات اليوم: ${statsToday.h} فرد.
        \n- القوات المكلفة بمهام عملياتية وتكليفات تدريبية خارجية: ${statsToday.m} فرد.
        \n- معدل الجاهزية العام المحتسب للواء: ${statsToday.readinessRate}%.
        \n- حالة الجاهزية الكلية: مستقرة وضمن تصنيف (جاهزية عملياتية كاملة).
        \nتوصيات القيادة: الاستمرار في الحفاظ على مستوى اليقظة ومراجعة مخازن الذخائر للكتيبة الثالثة.`;
        break;
      case 'absence':
        title = 'تقرير رصد الانضباط وحالات الغياب غير المبررة';
        content = `السري والمستعجل فوراً: كشف رصد ومتابعة حالات الغياب والتسرب عن النطاق العسكري لليوم:
        \n- إجمالي العناصر المتغيبة دون عذر أو موافقة مسبقة: ${statsToday.g} فرد.
        \n- نسبة الانضباط العام المسجلة: ${100 - (totalStrength > 0 ? Math.round((statsToday.g / totalStrength) * 100) : 0)}%.
        \n- الوحدات التي سجلت أعلى معدلات تسرب: الكتيبة الثالثة وسرية الإسناد.
        \nالإجراءات المتخذة: تم إصدار خطابات استدعاء وانضباط فورية لكافة المتغيبين، مع تحويل سجلاتهم للنيابة العسكرية في حال تجاوز الغياب حد الـ ٤٨ ساعة.`;
        break;
      case 'medical':
        title = 'التقرير الطبي العام للياقة والشهادات المرضية للقوة';
        content = `صادر عن شعبة الخدمات الطبية العسكرية للواء /٢٦/:
        \n- إجمالي العناصر المعفاة طبياً أو المتواجدة تحت مراجعة المستشفيات: ${statsToday.e} فرد.
        \n- الحالات المستعصية المحولة للمستشفى العسكري المركزي: ٢ حالة.
        \n- كفاءة القوة البشرية الطبية: ٩٨.٥%.
        \nيتم تتبع اللياقة البدنية والصحية بصورة دورية لضمان قدرة الأفراد على أداء التكاليف الميدانية الصعبة.`;
        break;
      default:
        title = 'التقرير الإحصائي العام للواء المشاة الآلي';
        content = `تقرير السيطرة والتحضير الإحصائي المتكامل للواء المشاة /٢٦/ لعام ١٤٤٨ هـ:
        \n- إجمالي الوحدات النشطة التابعة: ${units.length} وحدة قتالية ومساندة.
        \n- إجمالي الأفراد المسجلين الفعليين: ${totalStrength} مقاتل.
        \n- معدل الإجازات اليومية الممنوحة: ${statsToday.i} فرد.
        \n- نسبة اكتمال القوة والاحتياج البشري: ${statsToday.completenessRate}% من الملاك المطلوب التعبوي.`;
    }

    setActiveReport({ type: reportType, title, content });
  };

  // Real-time calculated stats for launcher modals
  const launcherLiveStats = useMemo(() => {
    // 1. Attendance & Roll Call (linked to selectedDailyDate or latestDate)
    const attDate = dailyReportStats.date;
    const attPresent = dailyReportStats.h;
    const attAbsent = dailyReportStats.g;
    const attLeave = dailyReportStats.i;
    const attMission = dailyReportStats.m;
    const attExcused = dailyReportStats.e;
    const attHalfDay = dailyReportStats.n;
    const attUnrecorded = dailyReportStats.unrecorded;
    const attTotal = totalStrength;
    const attPresentRate = (dailyReportStats as any).presentRate || dailyReportStats.readinessRate;
    const attReadinessRate = dailyReportStats.readinessRate;
    const attUnitBreakdown = dailyReportStats.unitBreakdown;

    // 2. Soldiers & Registry
    const sTotal = activeSoldiers.length;
    const sOfficers = activeSoldiers.filter(s => ['لواء', 'عميد', 'عقيد', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم'].includes(s.rank)).length;
    const sNCOs = activeSoldiers.filter(s => ['مساعد أول', 'مساعد', 'رقيب أول', 'رقيب', 'وكيل رقيب', 'عريف'].includes(s.rank)).length;
    const sSoldiers = activeSoldiers.filter(s => ['جندي أول', 'جندي'].includes(s.rank)).length;
    
    // Group specializations
    const specCounts: Record<string, number> = {};
    activeSoldiers.forEach(s => {
      const spec = s.specialization || 'غير محدد';
      specCounts[spec] = (specCounts[spec] || 0) + 1;
    });
    const sTopSpecializations = Object.entries(specCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`);

    // 3. Structure
    const uTotal = scopedUnits.length;
    const uBattalions = scopedUnits.filter(u => u.name.includes('كتيبة') || u.type === 'bn').length;
    const uCompanies = scopedUnits.filter(u => u.name.includes('سرية') || u.type === 'co').length;
    const uPlatoons = scopedUnits.filter(u => u.name.includes('فصيلة') || u.type === 'pl').length;

    // 4. Readiness
    const rAvgRate = statsToday.readinessRate;
    const rHigh = unitStats.filter(u => u.today.rate >= 75).length;
    const rCritical = unitStats.filter(u => u.today.rate < 70).length;

    // 5. Operations
    const opPending = pendingApprovals.length;
    const opLeavesPending = pendingApprovals.filter(a => a.type.includes('إجازة')).length;
    const opMissionsPending = pendingApprovals.filter(a => a.type.includes('تكليف') || a.type.includes('مهمة')).length;

    // 6. Transfers
    const tTotalLogs = auditLogs.filter(l => l.details.includes('نقل') || l.details.includes('تعديل الوحدة') || l.tableName.includes('تنقل') || l.tableName.includes('وحد')).length;

    // 7. Reports
    const repTotalLogs = auditLogs.filter(l => l.details.includes('تقرير') || l.details.includes('تصدير') || l.details.includes('كشف') || l.details.includes('طباع')).length;

    // 8. Audit Logs
    const logTotal = auditLogs.length;
    const logAdd = auditLogs.filter(l => l.actionType === 'إضافة').length;
    const logEdit = auditLogs.filter(l => l.actionType === 'تعديل').length;
    const logDelete = auditLogs.filter(l => l.actionType === 'حذف').length;
    
    // Find most active operator
    const counts: Record<string, number> = {};
    auditLogs.forEach(l => {
      counts[l.userName] = (counts[l.userName] || 0) + 1;
    });
    let maxName = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxName = name;
      }
    });
    const logMostActive = maxName ? `${maxName} (${maxCount} إجراء)` : 'لا يوجد عمليات حالية';
    const logLatest = auditLogs.length > 0 ? auditLogs[0] : null;

    // 9. IAM / Permissions
    const iamTotal = users.length;
    const iamAdmins = users.filter(u => u.role === 'admin').length;
    const iamCommanders = users.filter(u => u.role === 'commander_unit' || u.role === 'commander_formation').length;
    const iamOperations = users.filter(u => u.role === 'operations').length;
    const iamWriters = users.filter(u => u.role === 'data_writer').length;

    return {
      attendance: { attDate, attPresent, attAbsent, attLeave, attMission, attExcused, attHalfDay, attUnrecorded, attTotal, attPresentRate, attReadinessRate, attUnitBreakdown },
      soldiers: { sTotal, sOfficers, sNCOs, sSoldiers, sTopSpecializations },
      structure: { uTotal, uBattalions, uCompanies, uPlatoons },
      readiness: { rAvgRate, rHigh, rCritical },
      ops: { opPending, opLeavesPending, opMissionsPending },
      transfers: { tTotalLogs },
      reports: { repTotalLogs },
      audit: { logTotal, logAdd, logEdit, logDelete, logMostActive, logLatest },
      iam: { iamTotal, iamAdmins, iamCommanders, iamOperations, iamWriters }
    };
  }, [dailyReportStats, statsToday, totalStrength, activeSoldiers, units, unitStats, pendingApprovals, auditLogs, users]);

  const isCompact = true;

  return (
    <div 
      className="space-y-2 sm:space-y-4 text-right select-none pb-12 mt-0 relative" 
      dir="rtl"
      onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
      onTouchMove={(e) => handlePullMove(e.touches[0].clientY)}
      onTouchEnd={handlePullEnd}
      onMouseDown={(e) => handlePullStart(e.clientY)}
      onMouseMove={(e) => handlePullMove(e.clientY)}
      onMouseUp={handlePullEnd}
    >
      {/* Visual Pull Down Indicator Banner */}
      <AnimatePresence>
        {pullDistance > 6 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: Math.min(pullDistance, 64) }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full flex items-center justify-center bg-gradient-to-b from-amber-500/25 via-amber-500/15 to-transparent text-amber-300 font-bold gap-2.5 rounded-2xl border border-amber-500/40 backdrop-blur-md shadow-lg my-1 overflow-hidden transition-all"
          >
            <Bell className={`w-5 h-5 text-amber-400 ${pullDistance > 55 ? 'animate-bounce text-amber-200 scale-125' : ''}`} />
            <span className="text-xs sm:text-sm font-black tracking-wide">
              {pullDistance > 55 ? 'افلت الآن لفتح مركز الإشعارات والإنذارات العملياتية 🔔!' : 'اسحب إلى الأسفل لفتح مركز الإشعارات...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seamless Joined Header: Brigade Banner + Search Bar (Zero Margins) */}
      <div className="rounded-b-xl sm:rounded-b-2xl border-x border-b border-slate-300/80 shadow-xs bg-white relative z-30 mt-0">
        
        {/* 1. Thin Brigade Banner Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-slate-100 py-2 px-2.5 sm:px-5 border-b border-emerald-800/40 flex items-center justify-between gap-2 font-sans overflow-visible rounded-t-none flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-black text-white tracking-wide">اللواء 43 عمالقة</span>
            <span className="hidden lg:inline-block text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">
              قيادة القوة والسيطرة
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs text-slate-300 font-extrabold flex-wrap sm:flex-nowrap">
            
            {/* Clean Icon-Only Date Picker Element */}
            <div 
              className={`relative flex items-center justify-center p-2 rounded-xl border transition-all duration-300 shadow-xs cursor-pointer active:scale-95 ${
                isHistoricalDate 
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30' 
                  : 'bg-slate-800/90 text-emerald-300 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800'
              }`}
              title={isHistoricalDate ? `التاريخ المحدد: ${selectedDailyDate} (انقر للتغيير)` : 'اضغط لاختيار تاريخ العرض'}
            >
              <Calendar className={`w-4 h-4 shrink-0 ${isHistoricalDate ? 'text-slate-950' : 'text-emerald-400'}`} />
              
              {/* Native Date Input overlaid transparently */}
              <input
                type="date"
                value={selectedDailyDate || actualToday}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch (_) {}
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={isHistoricalDate ? `التاريخ المحدد: ${selectedDailyDate} (انقر للتغيير)` : 'اضغط لاختيار تاريخ العرض'}
              />
            </div>

            {/* Reset / Return to Today Button (Displays the selected historical date, clicking resets to today) */}
            {isHistoricalDate && (
              <button
                type="button"
                onClick={() => setSelectedDailyDate('')}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 font-black rounded-xl text-[10px] sm:text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-amber-300 animate-in zoom-in-95 duration-150 shrink-0"
                title={`التاريخ المحدد: ${selectedDailyDate} - انقر للرجوع لليوم الفعلي`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span className="whitespace-nowrap font-mono font-black dir-ltr">{selectedDailyDate}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateQuickPdfReport}
              disabled={isGeneratingQuickReport}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-[10px] sm:text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs border border-amber-300 active:scale-95 disabled:opacity-50 shrink-0"
              title="توليد وتنزيل تقرير الجاهزية اليومي لجميع الوحدات كملف PDF"
            >
              <FileText className={`w-3.5 h-3.5 text-slate-950 ${isGeneratingQuickReport ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isGeneratingQuickReport ? 'جاري التوليد...' : 'تقرير سريع'}</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('about')}
                className="hidden xl:flex mr-1 px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] transition-colors cursor-pointer items-center gap-1"
                title="حول التطبيق والجهة المطورة"
              >
                <Info className="w-3 h-3 text-emerald-400" />
                <span>حول التطبيق</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Unified Search Bar - Directly Attached */}
        <div className="relative">
          <div className="bg-white p-2 sm:p-3.5 flex items-center gap-2 sm:gap-3 transition-colors focus-within:bg-slate-50/80 rounded-b-xl sm:rounded-b-2xl">
            <Search className="w-5 h-5 text-emerald-600 shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onFocus={() => { if (searchQuery.trim().length > 0) setShowSearchPanel(true); }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchPanel(e.target.value.length > 0);
              }}
              placeholder="البحث العسكري الشامل الذكي في الميدان... (ابحث برقم عسكري، اسم فرد، تخصص، رتبة، أو تعميم)"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 focus:outline-none text-right font-sans font-bold placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowSearchPanel(false); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic Search Results Panel */}
          {showSearchPanel && (
            <div className="absolute right-0 left-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-fadeIn font-sans ring-1 ring-slate-700/50">
              <div className="p-3 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <Info className="w-4 h-4 text-emerald-400" />
                  نتائج البحث العسكري الفوري ({searchResults.soldiers.length} فرد، {searchResults.units.length} وحدة)
                </span>
                <button
                  onClick={() => setShowSearchPanel(false)}
                  className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-bold"
                >
                  إغلاق القائمة
                </button>
              </div>

              <div className="p-4 max-h-[480px] overflow-y-auto space-y-4">
                {/* Matched Soldiers */}
                {searchResults.soldiers.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      الأفراد والأسماء المطابقة ({searchResults.soldiers.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {searchResults.soldiers.map(s => {
                        const unitName = units.find(u => u.id === s.unitId)?.name || 'قيادة اللواء';
                        return (
                          <div 
                            key={s.id}
                            onClick={() => {
                              setSelectedSoldier(s);
                              setShowSearchPanel(false);
                            }}
                            className="bg-slate-950 hover:bg-slate-850 p-3 rounded-2xl border border-slate-800 hover:border-emerald-500/60 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center group shadow-sm gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                              <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0 group-hover:border-emerald-500/50 transition-colors overflow-hidden shadow-inner">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt={s.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                ) : (
                                  s.rank ? s.rank.substring(0, 2) : 'فرد'
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">{s.fullName}</span>
                                  <span className="text-[10px] bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold shrink-0">{s.rank}</span>
                                  {s.militaryStatus && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                                      s.militaryStatus === 'على رأس العمل' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
                                      s.militaryStatus?.includes('إجازة') ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50' :
                                      'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                                    }`}>
                                      {s.militaryStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1 flex-wrap">
                                  <span>الرقم العسكري: {s.militaryNumber}</span>
                                  <span>•</span>
                                  <span className="text-slate-300 font-sans font-bold">{unitName}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons Row (Responsive for Mobile) */}
                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850 shrink-0 flex-wrap sm:flex-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResumeDuty(s, e);
                                }}
                                className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-500/40 border border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                                title="تسديد وتأكيد مواصلة العمل الميداني للفرد"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="whitespace-nowrap">مواصلة عمل</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleOpenGrantLeaveModal(s, e)}
                                className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl bg-blue-600/25 hover:bg-blue-500/40 border border-blue-500/50 text-blue-300 hover:text-blue-200 transition-all text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                                title="إصدار قرار وتأكيد منح إجازة رسمية للفرد"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="whitespace-nowrap">منح إجازة</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleSendWhatsAppDetails(s, e)}
                                className="px-2.5 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                                title="إرسال كافة تفاصيل الفرد عبر واتساب"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="hidden xs:inline sm:hidden md:inline">تواصل</span>
                              </button>
                              <div className="hidden sm:flex p-1.5 bg-slate-800/60 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-300 rounded-xl transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matched Units */}
                {searchResults.units.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    <h5 className="text-[11px] font-black text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-teal-400" />
                      التشكيلات والوحدات المطابقة ({searchResults.units.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {searchResults.units.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => {
                            handleScrollToWorkspace('units_readiness');
                            setSearchQuery('');
                            setShowSearchPanel(false);
                          }}
                          className="bg-slate-950 hover:bg-slate-850 p-3 rounded-xl border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all text-right"
                        >
                          <h6 className="font-bold text-xs text-white">{u.name}</h6>
                          <p className="text-[10px] text-slate-400 mt-1">القائد: {u.commanderName || 'غير معين'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Directives */}
                {searchResults.directives.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      القرارات والتعاميم المطابقة ({searchResults.directives.length})
                    </h5>
                    <div className="space-y-1.5">
                      {searchResults.directives.map((d, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            setActiveDecree({ id: d.ref, title: d.title, body: d.text, date: d.date });
                            setShowSearchPanel(false);
                          }}
                          className="bg-slate-950 hover:bg-slate-850 p-3 rounded-xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex justify-between items-center text-right text-xs"
                        >
                          <div>
                            <span className="text-amber-400 font-bold">{d.title}</span>
                            <p className="text-[10px] text-slate-300 mt-1 line-clamp-1">{d.text}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.soldiers.length === 0 && searchResults.units.length === 0 && searchResults.directives.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-8 space-y-1">
                    <p className="font-bold text-slate-300">لا توجد نتائج مطابقة تماماً لـ "{searchQuery}"</p>
                    <p className="text-[11px] text-slate-500">جرّب البحث باسم الفرد، رتبته، أو الرقم العسكري</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2.5 Executive Indicators Ticker Bar (Mobile First with Sleek Switcher) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-800/80 p-3 sm:p-4 shadow-md space-y-3">
        {/* Top Header Bar with Mobile-Optimized Segmented Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-800/60">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h4 className="text-xs sm:text-sm font-black text-emerald-400 tracking-wide">
                مؤشرات الجاهزية التنفيذية اللحظية للميدان
              </h4>
            </div>

            <div className="text-[10px] text-slate-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 shrink-0">
              {isHistoricalDate ? (
                <span className="text-amber-400">سابق: {statsToday.targetDate}</span>
              ) : (
                <span>اليوم: {statsToday.targetDate}</span>
              )}
            </div>
          </div>

          {/* Simple & Elegant Mobile Switcher (Segmented Pill Control) */}
          <div className="bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 flex items-center gap-1 w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => setExecutiveTickerMode('general')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                executiveTickerMode === 'general'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>المؤشرات العامة</span>
            </button>
            <button
              type="button"
              onClick={() => setExecutiveTickerMode('daily_movement')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                executiveTickerMode === 'daily_movement'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>حركة اليوم الميدانية</span>
            </button>
          </div>
        </div>

        {/* Cards View Area */}
        {executiveTickerMode === 'daily_movement' ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-0.5">
            {/* Card 1: Resumed Work Today */}
            <div 
              onClick={() => setMovementDetailModal('resumed')}
              className="bg-slate-950/90 border border-emerald-500/40 hover:border-emerald-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all hover:bg-slate-900 group shadow-md flex flex-col justify-between space-y-1.5 sm:space-y-2 relative overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs font-extrabold text-emerald-400">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">المواصلين اليوم</span>
                </span>
                <span className="text-[8px] sm:text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  باشروا 🟢
                </span>
              </div>

              <div className="flex items-baseline justify-between py-0.5">
                <span className="text-xl sm:text-2xl font-black text-white font-mono">{dailyMovementStats.resumedTodaySoldiers.length}</span>
                <span className="text-[10px] sm:text-xs text-emerald-300/90 font-bold">فرد</span>
              </div>

              <p className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-1 hidden xs:block">
                تسديد المواصلة الميدانية
              </p>

              <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[9px] sm:text-[10px]">
                <span className="text-slate-500 hidden sm:inline">التفاصيل</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>الكشف</span>
                  <span>←</span>
                </span>
              </div>
            </div>

            {/* Card 2: Leaves Granted Today */}
            <div 
              onClick={() => setMovementDetailModal('granted')}
              className="bg-slate-950/90 border border-blue-500/40 hover:border-blue-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all hover:bg-slate-900 group shadow-md flex flex-col justify-between space-y-1.5 sm:space-y-2 relative overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs font-extrabold text-blue-400">
                <span className="flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">الإجازات الممنوحة</span>
                </span>
                <span className="text-[8px] sm:text-[10px] bg-blue-950 text-blue-300 border border-blue-800/80 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  منح ✈️
                </span>
              </div>

              <div className="flex items-baseline justify-between py-0.5">
                <span className="text-xl sm:text-2xl font-black text-white font-mono">{dailyMovementStats.grantedLeaveTodaySoldiers.length}</span>
                <span className="text-[10px] sm:text-xs text-blue-300/90 font-bold">فرد</span>
              </div>

              <div className="pt-1.5 border-t border-blue-900/40 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMovementDetailModal('granted');
                  }}
                  className="w-full py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-[9px] sm:text-[10px] font-black flex items-center justify-center gap-1 shadow-xs transition-all border border-blue-400/30"
                >
                  <Search className="w-3 h-3" />
                  <span>بحث ومنح إجازة</span>
                </button>
              </div>
            </div>

            {/* Card 3: Overdue Absence */}
            <div 
              onClick={() => setMovementDetailModal('overdue')}
              className="bg-slate-950/90 border border-rose-500/40 hover:border-rose-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all hover:bg-slate-900 group shadow-md flex flex-col justify-between space-y-1.5 sm:space-y-2 relative overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs font-extrabold text-rose-400">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                  <span className="truncate">تأخير المواصلة</span>
                </span>
                <span className="text-[8px] sm:text-[10px] bg-rose-950 text-rose-300 border border-rose-800/80 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  غياب ⚠️
                </span>
              </div>

              <div className="flex items-baseline justify-between py-0.5">
                <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono">{dailyMovementStats.overdueAbsentSoldiers.length}</span>
                <span className="text-[10px] sm:text-xs text-rose-300/90 font-bold">فرد</span>
              </div>

              <p className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-1 hidden xs:block">
                غياب تلقائي بعد الإجازة
              </p>

              <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[9px] sm:text-[10px]">
                <span className="text-slate-500 hidden sm:inline">متابعة</span>
                <span className="text-rose-400 font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>التسديد</span>
                  <span>←</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 sm:gap-2.5 pb-0.5 snap-x">
            {/* Card 1: Readiness */}
            <div 
              onClick={() => {
                const targetDate = statsToday.targetDate;
                const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                
                const soldierList = activeSoldiers.map(s => {
                  const st = dayRecordsMap.get(s.id) || 'unrecorded';
                  const unit = scopedUnits.find(u => u.id === s.unitId);
                  return {
                    ...s,
                    unitName: unit?.name || 'غير محدد',
                    statusCode: st,
                    recordDate: targetDate
                  };
                });

                setDrillDownStatusFilter('all');
                setDrillDownSearch('');
                setDrillDownModal({
                  title: `موقف الجاهزية العامة اليومية (${targetDate})`,
                  categoryName: 'الجاهزية_العامة',
                  count: activeSoldiers.length,
                  type: 'soldiers',
                  color: 'emerald',
                  items: soldierList
                });
              }}
              className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
              title="اضغط لعرض تفاصيل الجاهزية الكلية"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                <span className="group-hover:text-emerald-300 transition-colors">الجاهزية العامة</span>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm sm:text-base font-black text-white font-mono">{statsToday.readinessRate}%</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  statsToday.readinessRate >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                  statsToday.readinessRate >= 60 ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {statsToday.readinessRate >= 80 ? 'عالية' : statsToday.readinessRate >= 60 ? 'متوسطة' : 'منخفضة'}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    statsToday.readinessRate >= 80 ? 'bg-emerald-500' :
                    statsToday.readinessRate >= 60 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`} 
                  style={{ width: `${statsToday.readinessRate}%` }}
                ></div>
              </div>
            </div>

            {/* Card 2: Present Strength */}
            <div 
              onClick={() => {
                const targetDate = statsToday.targetDate;
                const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                
                const presentSoldiers = activeSoldiers.filter(s => {
                  const st = dayRecordsMap.get(s.id);
                  return st === 'ح' || st === 'ن';
                }).map(s => {
                  const unit = scopedUnits.find(u => u.id === s.unitId);
                  return {
                    ...s,
                    unitName: unit?.name || 'غير محدد',
                    statusCode: dayRecordsMap.get(s.id) || 'ح',
                    recordDate: targetDate
                  };
                });

                setDrillDownStatusFilter('all');
                setDrillDownSearch('');
                setDrillDownModal({
                  title: `قائمة الحضور الفعلي بالميدان (${targetDate})`,
                  categoryName: 'الحضور_الفعلي',
                  count: presentSoldiers.length,
                  type: 'soldiers',
                  color: 'emerald',
                  items: presentSoldiers
                });
              }}
              className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
              title="اضغط لعرض الأفراد الحاضرين"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                <span className="group-hover:text-emerald-300 transition-colors">الحضور الفعلي</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">{statsToday.h}</span>
                <span className="text-[10px] text-slate-400 font-mono">من {totalStrength}</span>
              </div>
              <span className="text-[9px] text-emerald-300/80 font-bold mt-0.5">منتسب متواجد بالميدان</span>
            </div>

            {/* Card 3: Missions & Duty */}
            <div 
              onClick={() => {
                const targetDate = statsToday.targetDate;
                const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                
                const missionSoldiers = activeSoldiers.filter(s => dayRecordsMap.get(s.id) === 'م').map(s => {
                  const unit = scopedUnits.find(u => u.id === s.unitId);
                  return {
                    ...s,
                    unitName: unit?.name || 'غير محدد',
                    statusCode: 'م',
                    recordDate: targetDate
                  };
                });

                setDrillDownStatusFilter('all');
                setDrillDownSearch('');
                setDrillDownModal({
                  title: `قائمة المكلفين بمهمات رسمية خارجية (${targetDate})`,
                  categoryName: 'المهمات_الرسمية',
                  count: missionSoldiers.length,
                  type: 'soldiers',
                  color: 'purple',
                  items: missionSoldiers
                });
              }}
              className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
              title="اضغط لعرض الأفراد بالمهمات الرسمية"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                <span className="group-hover:text-purple-300 transition-colors">المهمات الرسمية</span>
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-base font-black text-purple-400 font-mono">{statsToday.m}</span>
                <span className="text-[9px] text-purple-300/80 font-bold">فرد مكلف</span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1">تأمين ومهمات خارجية</span>
            </div>

            {/* Card 4: On Leave & Medical */}
            <div 
              onClick={() => {
                const targetDate = statsToday.targetDate;
                const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                
                const leaveSoldiers = activeSoldiers.filter(s => {
                  const st = dayRecordsMap.get(s.id);
                  return st === 'إ' || st === 'ع';
                }).map(s => {
                  const unit = scopedUnits.find(u => u.id === s.unitId);
                  return {
                    ...s,
                    unitName: unit?.name || 'غير محدد',
                    statusCode: dayRecordsMap.get(s.id) || 'إ',
                    recordDate: targetDate
                  };
                });

                setDrillDownStatusFilter('all');
                setDrillDownSearch('');
                setDrillDownModal({
                  title: `قائمة الإجازات الرسمية والأعذار المرضية (${targetDate})`,
                  categoryName: 'الإجازات_والمرضيات',
                  count: leaveSoldiers.length,
                  type: 'soldiers',
                  color: 'blue',
                  items: leaveSoldiers
                });
              }}
              className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
              title="اضغط لعرض الأفراد في الإجازات والمرضيات"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                <span className="group-hover:text-blue-300 transition-colors">الإجازات والمرضيات</span>
                <Plane className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm sm:text-base font-black text-blue-400 font-mono">{statsToday.i + statsToday.e}</span>
                <span className="text-[9px] text-blue-300/80 font-bold">إجازات/مرضيات</span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                {statsToday.e > 0 ? `إجازة: ${statsToday.i} | مرض/عذر: ${statsToday.e}` : 'إجازات سنوية ومرضية'}
              </span>
            </div>

            {/* Card 5: Absences */}
            <div 
              onClick={() => {
                const targetDate = statsToday.targetDate;
                const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                
                const absentSoldiers = activeSoldiers.filter(s => dayRecordsMap.get(s.id) === 'غ').map(s => {
                  const unit = scopedUnits.find(u => u.id === s.unitId);
                  return {
                    ...s,
                    unitName: unit?.name || 'غير محدد',
                    statusCode: 'غ',
                    recordDate: targetDate
                  };
                });

                setDrillDownStatusFilter('all');
                setDrillDownSearch('');
                setDrillDownModal({
                  title: `قائمة حالات الغياب بدون عذر (${targetDate})`,
                  categoryName: 'حالات_الغياب',
                  count: absentSoldiers.length,
                  type: 'soldiers',
                  color: 'rose',
                  items: absentSoldiers
                });
              }}
              className="bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
              title="اضغط لعرض الأفراد الغائبين"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                <span className="group-hover:text-rose-300 transition-colors">حالات الغياب</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-base font-black text-rose-400 font-mono">{statsToday.g}</span>
                <span className={`text-[9px] font-bold ${statsToday.g > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                  {statsToday.g > 0 ? 'يتطلب متابعة' : 'لا يوجد غياب'}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1">بدون عذر معتمد</span>
            </div>

            {/* Card 6: Unrecorded / Pending Roll-call */}
            {statsToday.unrecorded > 0 && (
              <div 
                onClick={() => {
                  const targetDate = statsToday.targetDate;
                  const activeSoldierIds = new Set(activeSoldiers.map(s => s.id));
                  const dayRecordsMap = new Map(attendance.filter(a => a.date === targetDate && activeSoldierIds.has(a.soldierId)).map(a => [a.soldierId, normalizeStatusCode(a.statusCode)]));
                  
                  const unrecordedSoldiers = activeSoldiers.filter(s => !dayRecordsMap.has(s.id)).map(s => {
                    const unit = scopedUnits.find(u => u.id === s.unitId);
                    return {
                      ...s,
                      unitName: unit?.name || 'غير محدد',
                      statusCode: 'unrecorded',
                      recordDate: targetDate
                    };
                  });

                  setDrillDownStatusFilter('all');
                  setDrillDownSearch('');
                  setDrillDownModal({
                    title: `قائمة الأفراد الذين لم يتم تحضيرهم بعد (${targetDate})`,
                    categoryName: 'غير_المحضرين',
                    count: unrecordedSoldiers.length,
                    type: 'soldiers',
                    color: 'amber',
                    items: unrecordedSoldiers
                  });
                }}
                className="bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 p-2 sm:p-2.5 rounded-lg sm:rounded-xl min-w-[120px] sm:flex-1 shrink-0 snap-start flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-900/90 group"
                title="اضغط لعرض الأفراد الذين لم يُحضروا بعد"
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                  <span className="group-hover:text-amber-300 transition-colors">لم يحضر بعد</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-base font-black text-amber-400 font-mono">{statsToday.unrecorded}</span>
                  <span className="text-[9px] text-amber-300/80 font-bold">قيد التحضير</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold mt-1">تنسيق الكشوفات</span>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Interactive Tactical Launcher Grid Launchpad (Header Bar Removed - 3 Apps per Row on Mobile) */}
      <div className="bg-white p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.015)] relative overflow-hidden font-sans select-none">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2.5 relative z-10">
          
          {/* TILE 1: Roll-Call & Attendance App */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(16,185,129,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'attendance', 
              title: 'دفتر الحضور والغياب اليومي', 
              badge: 'جاهزية وتواجد القوات', 
              description: 'نظام دفتر الحضور والتحقق التكتيكي اليومي. يتيح تتبع ومراقبة تواجد وغياب وتفاصيل إجازات وميدانيات العناصر والضباط ومزامنتها للقيادة لتحديد مستويات التأهب.', 
              color: 'emerald', 
              icon: <Calendar className="w-9 h-9 text-emerald-500" />, 
              statsLabel: 'القوات المتواجدة اليوم', 
              statsValue: `${statsToday.h} حاضر`, 
              detailsList: [
                'تسجيل وتعديل الحالات اليومية الفورية للمنتسبين (حاضر، غائب، إجازة، ميداني، مهمة).',
                'مراقبة الرتب العليا وسرعة كشف نسبة العجز البشري للتشكيلات الحية.',
                'سجل تراكمي شهري وسنوي للمنتسبين قابل للفلترة والطباعة المباشرة للميدان.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('attendance'); 
                onNavigate && onNavigate('attendance'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-emerald-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="حضور وجاهزية القوات"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-emerald-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Calendar className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-emerald-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">دفتر الحضور</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-emerald-50/70 text-emerald-700 border-emerald-200/40 group-hover:bg-emerald-100 group-hover:text-emerald-900 transition-all duration-300 truncate max-w-full">
              {statsToday.h} حاضر
            </span>
          </motion.button>

          {/* TILE 2: Military Registry & Cards App */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(14,165,233,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'soldiers', 
              title: 'المنتسبين والبطاقات التعريفية', 
              badge: 'أرشيف الهويات والسير الذاتية', 
              description: 'السجل العسكري الكامل والموحد للأفراد والضباط. يسهل عملية البحث، الأرشفة الإلكترونية، تعديل الهويات، وطباعة بطاقات الميدان التكتيكية والهوية التعريفية الموحدة.', 
              color: 'sky', 
              icon: <Users className="w-9 h-9 text-sky-500" />, 
              statsLabel: 'إجمالي القوة المسجلة', 
              statsValue: `${totalStrength} فرد بالخدمة`, 
              detailsList: [
                'عرض وتدقيق الملف الشخصي لكل فرد عسكري متضمناً كامل بياناته والوضع التدريبي والعام.',
                'محرك بحث تكتيكي وسريع بالاسم الكامل، الرقم العسكري، أو الاختصاص العسكري الدقيق.',
                'طباعة بطاقات تعريفية عسكرية ذكية مدعمة بمعلومات فصيلة الدم والاتصال والتسلسل القيادي.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('soldiers'); 
                onNavigate && onNavigate('org_manager'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-sky-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="الأفراد والبطاقات التعريفية"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-sky-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Users className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-sky-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(14,165,233,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">المنتسبين والبطاقات</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-sky-50/70 text-sky-700 border-sky-200/40 group-hover:bg-sky-100 group-hover:text-sky-900 transition-all duration-300 truncate max-w-full">
              {totalStrength} فرد
            </span>
          </motion.button>

          {/* TILE 3: Force Structure */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(20,184,166,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'structure', 
              title: 'هيكلية وتشكيل الوحدات', 
              badge: 'ميزان القوى البشرية والشعب', 
              description: 'لوحة التحكم والتشكيل الهرمي لوحدات اللواء والكتائب التابعة. تتيح لقائد التشكيل تقسيم القوات وتوزيع نقاط الحراسة وتحديد الكتائب والسرايا التابعة.', 
              color: 'teal', 
              icon: <Building2 className="w-9 h-9 text-teal-500" />, 
              statsLabel: 'إجمالي الشعب القائمة', 
              statsValue: `${units.length} شعبة وتشكيل`, 
              detailsList: [
                'إضافة وتعديل وحذف السرايا والكتائب التابعة وفق الهيكل التنظيمي المعتمد.',
                'تحديد نقاط الحراسة المخصصة ومراكز الخدمة لكل كتيبة تابعة تكتيكياً.',
                'استعراض سريع لكثافة وتوزيع الأفراد على امتداد قطاعات اللواء والمسؤوليات.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('structure'); 
                onNavigate && onNavigate('org_manager'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-teal-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="هيكلية وتشكيل الوحدات"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-teal-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Building2 className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-teal-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(20,184,166,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">هيكلية الوحدات</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-teal-50/70 text-teal-700 border-teal-200/40 group-hover:bg-teal-100 group-hover:text-teal-900 transition-all duration-300 truncate max-w-full">
              {units.length} شعبة
            </span>
          </motion.button>

          {/* TILE 4: Readiness Radar App */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(16,185,129,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'units_readiness', 
              title: 'مصفوفة الجاهزية والاستعداد', 
              badge: 'مؤشرات الكفاءة والجاهزية القتالية', 
              description: 'لوحة متقدمة لمراقبة نسب الاستنفار العسكري ومستويات تواجد القوة الفعلية. تقوم المصفوفة بحساب آلي دقيق لنسب الاستعداد القتالي بناءً على حضور المنتسبين.', 
              color: 'emerald', 
              icon: <Activity className="w-9 h-9 text-emerald-500" />, 
              statsLabel: 'معدل الجاهزية العام للواء', 
              statsValue: `${statsToday.readinessRate}% جاهز`, 
              detailsList: [
                'احتساب آلي فوري لمستويات الحضور البشري والميداني الفعلي للكتائب والسرايا.',
                'ترميز لوني تكتيكي ذكي يكشف تلقائياً عن التشكيلات ذات الجاهزية المتراجعة.',
                'سرعة التدخل وتوجيه قرارات الدعم والإسناد للوحدات والقطاعات ذات العجز البشري.'
              ], 
              onConfirm: () => handleScrollToWorkspace('units_readiness') 
            })}
            className={`flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full border overflow-hidden ${
              activeSubTab === 'units_readiness' 
                ? 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10' 
                : 'bg-gradient-to-b from-white to-slate-50/30 border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] hover:to-emerald-50/20'
            }`}
            title="مصفوفة جاهزية الكتائب"
          >
            {activeSubTab === 'units_readiness' && (
              <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-200 z-20">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                </span>
                <span className="text-[6.5px] font-black text-emerald-800">معروض</span>
              </div>
            )}
            <div className={`absolute top-0 inset-x-0 h-[2.5px] bg-emerald-500 rounded-t-2xl transition-all duration-300 ${
              activeSubTab === 'units_readiness' ? 'h-[4px]' : 'group-hover:h-[4px]'
            }`} />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Activity className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-emerald-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)] stroke-[2.2]" />
            </div>
            <span className={`text-[9.5px] sm:text-[10.5px] text-center leading-tight truncate w-full px-0.5 transition-colors ${
              activeSubTab === 'units_readiness' ? 'font-black text-emerald-950' : 'font-black text-slate-800 group-hover:text-slate-950'
            }`}>مصفوفة الجاهزية</span>
            <span className={`px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border transition-all duration-300 truncate max-w-full ${
              activeSubTab === 'units_readiness'
                ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80'
                : 'bg-emerald-50/70 text-emerald-700 border-emerald-200/40 group-hover:bg-emerald-100 group-hover:text-emerald-900'
            }`}>
              {statsToday.readinessRate}% جاهز
            </span>
          </motion.button>

          {/* TILE 5: Operations Desk & Approvals App */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(244,63,94,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'ops_center', 
              title: 'جناح الحركات والعمليات اليومية', 
              badge: 'توجيهات الحركات والموافقة على الأوامر', 
              description: 'مركز تنسيق ومتابعة قرارات القادة لطلبات الإجازات الميدانية، المرضية، الطارئة والتكاليف الرسمية الصادرة من الوحدات ومعالجتها بصورة فورية بموثوقية كاملة.', 
              color: 'rose', 
              icon: <Radio className="w-9 h-9 text-rose-500" />, 
              statsLabel: 'الطلبات العاجلة بانتظار الاعتماد', 
              statsValue: `${pendingApprovals.length} معلق قيد المراجعة`, 
              detailsList: [
                'استقبال طلبات وتكاليف الأفراد فصيلياً وعبر الكتائب بشكل تكتيكي مؤمن.',
                'إصدار الموافقة القيادية أو الرفض الأمني الفوري مع تسجيل المبرر وعنصر القرار.',
                'التحديث الأوتوماتيكي الفوري للحالة العسكرية للفرد بدفتر الحضور فور صدور الموافقة.'
              ], 
              onConfirm: () => handleScrollToWorkspace('ops_center') 
            })}
            className={`flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full border overflow-hidden ${
              activeSubTab === 'ops_center' 
                ? 'bg-gradient-to-br from-white to-rose-50/40 border-rose-500 shadow-[0_4px_12px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/10' 
                : 'bg-gradient-to-b from-white to-slate-50/30 border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] hover:to-rose-50/20'
            }`}
            title="مركز العمليات وجناح الحركات"
          >
            {activeSubTab === 'ops_center' && (
              <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-rose-100/90 px-1 py-0.2 rounded border border-rose-200 z-20">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-rose-500"></span>
                </span>
                <span className="text-[6.5px] font-black text-rose-800">معروض</span>
              </div>
            )}
            <div className={`absolute top-0 inset-x-0 h-[2.5px] bg-rose-500 rounded-t-2xl transition-all duration-300 ${
              activeSubTab === 'ops_center' ? 'h-[4px]' : 'group-hover:h-[4px]'
            }`} />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Radio className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-rose-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.3)] stroke-[2.2]" />
            </div>
            <span className={`text-[9.5px] sm:text-[10.5px] text-center leading-tight truncate w-full px-0.5 transition-colors ${
              activeSubTab === 'ops_center' ? 'font-black text-rose-950' : 'font-black text-slate-800 group-hover:text-slate-950'
            }`}>جناح الحركات</span>
            <span className={`px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border transition-all duration-300 truncate max-w-full ${
              activeSubTab === 'ops_center'
                ? 'bg-rose-100/90 text-rose-900 border-rose-300/80'
                : 'bg-rose-50/70 text-rose-700 border-rose-200/40 group-hover:bg-rose-100 group-hover:text-rose-900'
            }`}>
              {pendingApprovals.length} معلق
            </span>
          </motion.button>

          {/* TILE 6: Command Decisions & Transfer Orders */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(168,85,247,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'transfer', 
              title: 'الأوامر والتنقلات العسكرية', 
              badge: 'حركة الأفراد وإعادة الهيكلة البشرية', 
              description: 'نظام إدارة ونقل المنتسبين العسكريين والضباط بين الكتائب والسرايا المختلفة داخل اللواء لضمان سد الثغرات العسكرية وموازنة القوى بالتوجيه القيادي المباشر.', 
              color: 'purple', 
              icon: <ArrowLeftRight className="w-9 h-9 text-purple-500" />, 
              statsLabel: 'إجراءات التنقلات والتبديل', 
              statsValue: 'نشطة ومؤمنة 🔄', 
              detailsList: [
                'نقل فرد أو مجموعة عناصر بضغطة زر وتأكيد نقلهم الميداني أوتوماتيكياً.',
                'إصدار سجل رسمي بأوامر النقل وتواريخ المباشرة المعتمدة بالوحدة البديلة.',
                'إعادة موازنة إحصائيات القوى البشرية ونسب الحضور فور اكتمال حركة التنقل.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('transfer'); 
                onNavigate && onNavigate('org_manager'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-purple-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="الأوامر ونقل المنتسبين"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-purple-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <ArrowLeftRight className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-purple-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">الأوامر والتنقلات</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-purple-50/70 text-purple-700 border-purple-200/40 group-hover:bg-purple-100 group-hover:text-purple-900 transition-all duration-300 truncate max-w-full">
              تبديل 🔄
            </span>
          </motion.button>

          {/* TILE 7: Certified Reports Generator App */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(245,158,11,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'reports', 
              title: 'التقارير والكشوفات المصدقة', 
              badge: 'توليد التقارير والمستندات الإدارية والميدانية', 
              description: 'مركز إصدار وتوليد التقارير والكشوفات العسكرية المصدقة. يوفر الكشوف الدورية، لوحات الجرد البشري، مصفوفات الحضور ونسب الغياب لطباعتها واعتمادها رسمياً.', 
              color: 'amber', 
              icon: <FileCheck2 className="w-9 h-9 text-amber-500" />, 
              statsLabel: 'حالة اعتماد المستندات والتصدير', 
              statsValue: 'مصدق ومعتمد قيادياً 📄', 
              detailsList: [
                'توليد كشوف حضور وغياب وغيابات ميدانية وفصيلية بنقرة واحدة.',
                'تجهيز وتنسيق المستندات للطباعة الميدانية الورقية بمحاذاة رسمية وأختام دائرية.',
                'دعم تفريغ البيانات وحفظ الكشوف محلياً للمراجعة الأسبوعية والشهرية.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('reports'); 
                onNavigate && onNavigate('reports'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-amber-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="مركز التقارير الفورية المصدقة"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-amber-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <FileCheck2 className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-amber-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">التقارير والكشوفات</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-amber-50/70 text-amber-700 border-amber-200/40 group-hover:bg-amber-100 group-hover:text-amber-900 transition-all duration-300 truncate max-w-full">
              مصدق 📄
            </span>
          </motion.button>

          {/* TILE 8: Certified Audit Logs */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(99,102,241,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'audit', 
              title: 'سجل الرقابة الفوري والأمني', 
              badge: 'توثيق الإجراءات ومحاضر التعديل', 
              description: 'أداة حماية النظام والتسجيل الأمني الفوري. توثق المنظومة أوتوماتيكياً كل حركات الدخول، وتعديل بيانات الأفراد، والغيابات، والحذف لضمان أعلى مستوى من الأمن والشفافية العسكرية والمساءلة الإدارية.', 
              color: 'indigo', 
              icon: <History className="w-9 h-9 text-indigo-500" />, 
              statsLabel: 'حالة حفظ وتأمين العمليات', 
              statsValue: 'مؤمن بالكامل بالخلفية 🔒', 
              detailsList: [
                'تسجيل فوري لاسم المستخدم ورتبته ووقت وتاريخ الإجراء والتفاصيل الدقيقة المرافقة.',
                'إنشاء محاضر رقابية غير قابلة للتعديل أو الحذف لمرجعية قيادية تامة.',
                'كشف تكتيكي وسريع لكافة حركات الاستيراد والتصدير واستعادة البيانات.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('audit'); 
                onNavigate && onNavigate('settings'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-indigo-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="سجل الرقابة وحماية النظام"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-indigo-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <History className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-indigo-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">سجل الرقابة والأمن</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-indigo-50/70 text-indigo-700 border-indigo-200/40 group-hover:bg-indigo-100 group-hover:text-indigo-900 transition-all duration-300 truncate max-w-full">
              مؤمن 🔒
            </span>
          </motion.button>

          {/* TILE 9: Identity & IAM Security */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(249,115,22,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'iam', 
              title: 'إدارة الهوية والصلاحيات (IAM)', 
              badge: 'تأمين الحسابات ومستويات الدخول القيادية', 
              description: 'نظام إدارة المستخدمين والتحقق الثنائي والوصول المبني على الأدوار والرتب القيادية في لواء المشاة. يمنع الاستخدام غير المصرح به ويخصص نطاقات الإدخال.', 
              color: 'orange', 
              icon: <Lock className="w-9 h-9 text-orange-500" />, 
              statsLabel: 'بروتوكول الأمان الحالي المعتمد', 
              statsValue: 'نشط ومحمي عسكرياً 🛡️', 
              detailsList: [
                'تعيين الحسابات وصلاحياتها (قائد تشكيل، قائد كتيبة، ركن عمليات، كاتب بيانات).',
                'تأمين وتشفير معلومات تسجيل الدخول ومحاصرة إمكانيات التعديل للنطاق المعتمد.',
                'التحكم الأمني والتصفير الفوري للحسابات في حالات الطوارئ القيادية.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('iam'); 
                onNavigate && onNavigate('settings'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white to-slate-50/30 hover:to-orange-50/20 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.015)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="إدارة الهوية والتشفير (IAM)"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-orange-500 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Lock className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-orange-600 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(249,115,22,0.3)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-slate-800 group-hover:text-slate-950 leading-tight truncate w-full px-0.5">صلاحيات وتشفير</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-orange-50/70 text-orange-700 border-orange-200/40 group-hover:bg-orange-100 group-hover:text-orange-900 transition-all duration-300 truncate max-w-full">
              نشط 🛡️
            </span>
          </motion.button>

          {/* TILE 10: Special Administrative Services & Brigade Sections */}
          <motion.button 
            whileHover={{ y: -2, scale: 1.015, boxShadow: '0 8px 20px -8px rgba(16,185,129,0.25)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedLauncherInfo({ 
              id: 'special_sections', 
              title: 'الأقسام والخدمات الإدارية والعملياتية المميزة', 
              badge: 'لوحة التحكم بخدمات اللواء وشؤون الأفراد', 
              description: 'منظومة الأقسام والخدمات المميزة في قوة اللواء 43 عمالقة وشؤون الأفراد. تشمل الإجازات والمهمات الميدانية، الترقيات والدورات القتالية، رعاية الشهداء والجرحى والمساعدات، توثيق العهد العسكرية الفردية، والأرشيف الرقمي للتوجيهات.', 
              color: 'emerald', 
              icon: <Sparkles className="w-9 h-9 text-emerald-500" />, 
              statsLabel: 'إجمالي الخدمات والملفات الموثقة', 
              statsValue: 'مكتمل وموثق قيادياً ✨', 
              detailsList: [
                'إصدار وتوثيق تصاريح الإجازات والمهمات الميدانية ومتابعة متأخري العودة تلقائياً.',
                'سجل المستحقين للترقية وتوثيق الدورات القتالية والتخصصية والتقييم السنوي.',
                'السجل الشرفي لرعاية الشهداء والجرحى وتوثيق الإعانات والعهد العسكرية الفردية.'
              ], 
              onConfirm: () => { 
                setActiveLauncher('special_sections'); 
                onNavigate && onNavigate('special_sections'); 
              } 
            })}
            className="flex flex-col items-center justify-between p-2 pb-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white hover:bg-emerald-50/90 border border-emerald-300/80 shadow-[0_2px_8px_rgba(16,185,129,0.08)] transition-all duration-300 cursor-pointer group relative h-[102px] sm:h-[108px] w-full overflow-hidden"
            title="الأقسام والخدمات المميزة"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-emerald-600 rounded-t-2xl transition-all duration-300 group-hover:h-[4px]" />
            <div className="py-1 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
              <Sparkles className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-emerald-600 group-hover:rotate-12 transition-all duration-300 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)] stroke-[2.2]" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] text-center font-black text-emerald-950 group-hover:text-emerald-900 leading-tight truncate w-full px-0.5">الأقسام والخدمات</span>
            <span className="px-1.5 py-0.5 text-[7.5px] sm:text-[8.5px] font-black rounded-md border bg-emerald-100 text-emerald-900 border-emerald-300/70 group-hover:bg-emerald-200 transition-all duration-300 truncate max-w-full">
              مميز ✨
            </span>
          </motion.button>

        </div>
      </div>


      {/* 5. Multi-Tab Dynamic Workspace Panel with Anchor Scroll */}
      <div 
        ref={workspaceRef}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden scroll-mt-6"
      >
        {/* Section Tabs Header */}
        <div className="bg-slate-50 p-2.5 border-b border-slate-200/60 flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
          <button 
            onClick={() => setActiveSubTab('units_readiness')}
            className={`px-4.5 py-3 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer font-sans shrink-0 min-h-[44px] flex items-center justify-center gap-2 ${
              activeSubTab === 'units_readiness' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            الجاهزية العملياتية للكتائب والشعب
          </button>
          <button 
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4.5 py-3 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer font-sans shrink-0 min-h-[44px] flex items-center justify-center gap-2 ${
              activeSubTab === 'analytics' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            التحليلات والمقاييس البيانية للجاهزية
          </button>
          <button 
            onClick={() => setActiveSubTab('periodic_reports')}
            className={`px-4.5 py-3 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer font-sans shrink-0 min-h-[44px] flex items-center justify-center gap-2 ${
              activeSubTab === 'periodic_reports' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            سجل تقارير المؤشرات الدورية (يومي / شهري)
          </button>
          <button 
            onClick={() => setActiveSubTab('ops_center')}
            className={`px-4.5 py-3 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer font-sans shrink-0 min-h-[44px] flex items-center justify-center gap-2 ${
              activeSubTab === 'ops_center' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            مركز العمليات وإدارة الحركات والقرارات
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            
            {/* SUBTAB 1: Operational Units Readiness Matrix */}
            {activeSubTab === 'units_readiness' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="text-right flex flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                      <h5 className="font-extrabold text-sm text-slate-800 font-sans">مصفوفة تتبع وتحليل القوى العاملة باللواء</h5>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">انقر على تصنيفات الهيكل العسكري المعتمد لتصفية مستوى الاستعراض والتدقيق الآلي.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQuickPdfReport}
                      disabled={isGeneratingQuickReport}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-emerald-500 shrink-0 self-start sm:self-auto disabled:opacity-50"
                      title="تحميل ملخص الجاهزية اليومي لجميع الوحدات كملف PDF"
                    >
                      <FileText className={`w-4 h-4 text-white ${isGeneratingQuickReport ? 'animate-spin' : ''}`} />
                      <span>توليد تقرير سريع (PDF)</span>
                    </button>
                  </div>

                  {/* Hierarchy Filters */}
                  <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-1.5 w-full md:w-auto pb-1 md:pb-0">
                    {[
                      { id: 'all', label: 'كافة التشكيلات' },
                      { id: 'div', label: 'الفرق' },
                      { id: 'bde', label: 'الألوية' },
                      { id: 'bn', label: 'الكتائب' },
                      { id: 'co', label: 'السرايا' },
                      { id: 'pl', label: 'الفصائل' }
                    ].map(f => (
                      <button 
                        key={f.id}
                        onClick={() => setUnitFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                          unitFilter === f.id ? 'bg-slate-900 text-white border-slate-850 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Cards View for Units Readiness */}
                <div className="block md:hidden space-y-3 font-sans">
                  {filteredUnitStats.map((u) => (
                    <div 
                      key={u.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 text-right"
                    >
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <h6 className="font-extrabold text-sm text-slate-900 leading-snug">{u.name}</h6>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{u.commanderName || 'لم يعين قائد رسمي'}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border shrink-0 ${u.badgeColor}`}>
                          {u.status}
                        </span>
                      </div>

                      {/* Readiness Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">معدل الجاهزية اللحظي:</span>
                          <span className="font-mono font-black text-slate-900 text-sm">{u.today.rate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${u.today.rate >= 90 ? 'bg-emerald-500' : u.today.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${u.today.rate}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 4 Attendance Pills Grid */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2 rounded-xl">
                          <span className="block text-[9px] text-emerald-600 font-sans mb-0.5">حاضر</span>
                          <span className="font-mono text-xs font-black">{u.today.h}</span>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 text-purple-800 p-2 rounded-xl">
                          <span className="block text-[9px] text-purple-600 font-sans mb-0.5">مهمة</span>
                          <span className="font-mono text-xs font-black">{u.today.m}</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-2 rounded-xl">
                          <span className="block text-[9px] text-blue-600 font-sans mb-0.5">إجازة</span>
                          <span className="font-mono text-xs font-black">{u.today.i}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2 rounded-xl">
                          <span className="block text-[9px] text-rose-600 font-sans mb-0.5">غائب</span>
                          <span className="font-mono text-xs font-black">{u.today.g}</span>
                        </div>
                      </div>

                      {/* Footnote */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-2">
                        <span>القوة المسجلة: <strong className="text-slate-700 font-bold">{u.strength}</strong></span>
                        <span>الهدف التعبوي: <strong className="text-slate-700 font-bold">{u.targetStrength}</strong></span>
                      </div>
                    </div>
                  ))}

                  {filteredUnitStats.length === 0 && (
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-sans">
                      لا توجد وحدات مطابقة لمستوى الفرز العسكري المطلوب حالياً.
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr className="font-sans">
                        <th className="py-3.5 px-4 font-black">اسم وتصنيف التشكيل</th>
                        <th className="py-3.5 px-4 font-black">القائد المسؤول</th>
                        <th className="py-3.5 px-3 font-black text-center font-mono">القوة المسجلة</th>
                        <th className="py-3.5 px-3 font-black text-center font-mono">الهدف التعبوي</th>
                        <th className="py-3.5 px-3 font-black text-center">حضور اليوم</th>
                        <th className="py-3.5 px-3 font-black text-center">إجازة اليوم</th>
                        <th className="py-3.5 px-3 font-black text-center">مهمة اليوم</th>
                        <th className="py-3.5 px-3 font-black text-center text-rose-600">غياب اليوم</th>
                        <th className="py-3.5 px-4 font-black text-center">معدل الجاهزية اللحظي</th>
                        <th className="py-3.5 px-4 font-black text-center">تقييم السيطرة والجاهزية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredUnitStats.map((u, i) => (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-all">
                          <td className="py-4 px-4 font-extrabold text-slate-800 text-sm">{u.name}</td>
                          <td className="py-4 px-4 text-slate-500 font-medium">{u.commanderName || 'لم يعين قائد رسمي'}</td>
                          <td className="py-4 px-3 font-mono font-bold text-center text-slate-600">{u.strength}</td>
                          <td className="py-4 px-3 font-mono text-slate-400 text-center">{u.targetStrength}</td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 font-bold font-mono">
                              {u.today.h}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 font-bold font-mono">
                              {u.today.i}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 font-bold font-mono">
                              {u.today.m}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            {u.today.g > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 font-bold font-mono">
                                {u.today.g}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono font-extrabold text-slate-800">{u.today.rate}%</span>
                              <div className="w-12 bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div 
                                  className={`h-full ${u.today.rate >= 90 ? 'bg-emerald-500' : u.today.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${u.today.rate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-full border ${u.badgeColor}`}>
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {filteredUnitStats.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                            لا توجد وحدات مطابقة لمستوى الفرز العسكري المطلوب حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* SUBTAB 2: Tactical Analytics & Recharts Charts */}
            {activeSubTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* 1. Monthly Readiness Trend Chart */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 lg:col-span-2 space-y-3">
                  <div>
                    <h6 className="font-extrabold text-xs text-slate-800 font-sans">معدل تغير جاهزية اللواء التراكمي</h6>
                    <p className="text-[10px] text-slate-400 font-sans">رصد الجاهزية الكلية المقارنة المحسوبة للواء يوماً بيوم خلال التقويم الحالي.</p>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyAttendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="نسبة الجاهزية %" 
                          stroke="#115e59" 
                          strokeWidth={2.5} 
                          dot={{ r: 3.5, stroke: '#115e59', strokeWidth: 1.5, fill: '#fff' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Specialty donut Allocation */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <h6 className="font-extrabold text-xs text-slate-800 font-sans">التوزيع النوعي للعهدة والتخصص</h6>
                    <p className="text-[10px] text-slate-400 font-sans">تقسيم القوة الفعلي بناءً على فئة الاختصاص القتالي.</p>
                  </div>
                  <div className="h-44 flex justify-center items-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center">
                      <span className="text-[9px] text-slate-400 block font-sans">قوة اللواء</span>
                      <span className="text-lg font-black text-slate-700 font-mono">{totalStrength}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {statusDonutData.map((item, idx) => (
                      <div key={idx} className="p-1 rounded bg-white border border-slate-100">
                        <span className="text-[8px] text-slate-500 font-bold block truncate">{item.name}</span>
                        <span className="text-[10px] font-bold font-mono text-slate-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Rank Bar Chart */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 lg:col-span-3 space-y-3">
                  <div>
                    <h6 className="font-extrabold text-xs text-slate-800 font-sans">هرم الملاكات والرتب العسكرية</h6>
                    <p className="text-[10px] text-slate-400 font-sans">إحصائية توزيع الأفراد المقاتلين في الخدمة النشطة حسب الرتبة العسكرية للضبط والربط.</p>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankStats} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                        <Bar dataKey="العدد" fill="#047857" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUBTAB: Periodic Indicators Report (Daily / Monthly) */}
            {activeSubTab === 'periodic_reports' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 font-sans"
              >
                {/* Header & Level Toggle Switcher */}
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <span>سجل تقارير المؤشرات الدورية</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">اختر بين التقرير اليومي باليوم المحدد أو التقرير الشهري بالشهر المحدد للتحليل القيادي</p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Mode Buttons */}
                  <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 gap-1.5 self-stretch md:self-auto">
                    <button
                      onClick={() => setReportPeriodMode('daily')}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        reportPeriodMode === 'daily'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 text-emerald-300" />
                      <span>📅 التقرير اليومي (تحديد اليوم)</span>
                    </button>
                    <button
                      onClick={() => setReportPeriodMode('monthly')}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        reportPeriodMode === 'monthly'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4 text-blue-300" />
                      <span>🗓️ التقرير الشهري (تحديد الشهر)</span>
                    </button>
                  </div>
                </div>

                {/* DAILY LEVEL REPORT VIEW */}
                {reportPeriodMode === 'daily' && (
                  <div className="space-y-6">
                    {/* Controls Bar for Daily Report */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Native HTML5 Date Picker */}
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-black text-slate-700">اختيار اليوم:</span>
                          <input
                            type="date"
                            value={selectedDailyDate || latestDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            className="text-xs font-bold font-mono text-emerald-900 bg-transparent focus:outline-none cursor-pointer"
                          />
                        </div>

                        {/* Dropdown list of registered dates */}
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
                          <Filter className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-bold text-slate-600">الأيام المسجلة:</span>
                          <select
                            value={selectedDailyDate || latestDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            className="bg-transparent text-xs font-bold font-mono text-slate-800 focus:outline-none cursor-pointer"
                          >
                            {dates.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => generateReportPreview('daily_periodic')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer self-stretch md:self-auto justify-center"
                      >
                        <Printer className="w-4 h-4" />
                        <span>معاينة وطباعة التقرير اليومي</span>
                      </button>
                    </div>

                    {/* Daily Key KPI Cards with rich icons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl text-right relative overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-emerald-800">الظهور الفعلي اليومي</span>
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-lg font-black text-emerald-950 font-mono block">{dailyReportStats.h} فرد</span>
                        <span className="text-[10px] font-black text-emerald-700 font-mono mt-0.5 block">{dailyReportStats.readinessRate}% نسبة الجاهزية</span>
                      </div>

                      <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-purple-800">المهمات اليومية</span>
                          <Briefcase className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-lg font-black text-purple-950 font-mono block">{dailyReportStats.m} فرد</span>
                        <span className="text-[10px] text-purple-700 block mt-0.5 font-bold">تكليف ميداني خراجي</span>
                      </div>

                      <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-blue-800">الإجازات اليومية</span>
                          <Plane className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-lg font-black text-blue-950 font-mono block">{dailyReportStats.i} فرد</span>
                        <span className="text-[10px] text-blue-700 block mt-0.5 font-bold">إجازات معتمدة</span>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-rose-800">الغياب غير المبرر اليوم</span>
                          <XCircle className="w-4 h-4 text-rose-600" />
                        </div>
                        <span className="text-lg font-black text-rose-950 font-mono block">{dailyReportStats.g} فرد</span>
                        <span className="text-[10px] text-rose-700 block mt-0.5 font-bold">بدون عذر معتمد</span>
                      </div>

                      <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-amber-800">غياب بعذر / طبي اليوم</span>
                          <HeartPulse className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-lg font-black text-amber-950 font-mono block">{dailyReportStats.e} فرد</span>
                        <span className="text-[10px] text-amber-700 block mt-0.5 font-bold">مراجعات وعذر رسمي</span>
                      </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h6 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span>مؤشرات الحضور والسيطرة اليومية المباشرة بتاريخ ({dailyReportStats.date})</span>
                        </h6>
                        <span className="text-[11px] text-slate-500 font-mono font-bold">إجمالي ملاك اللواء: {totalStrength}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-black border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">
                                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" /> التشكيل / الوحدة</span>
                              </th>
                              <th className="py-3 px-3">
                                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> القائد</span>
                              </th>
                              <th className="py-3 px-3 text-center">إجمالي القوة</th>
                              <th className="py-3 px-3 text-center text-emerald-700">حاضر</th>
                              <th className="py-3 px-3 text-center text-purple-700">مهمة</th>
                              <th className="py-3 px-3 text-center text-blue-700">إجازة</th>
                              <th className="py-3 px-3 text-center text-rose-700">غائب</th>
                              <th className="py-3 px-3 text-center">
                                <span className="flex items-center justify-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-slate-400" /> معدل اليوم</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {dailyReportStats.unitBreakdown.map((ub) => (
                              <tr key={ub.unitId} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-black text-slate-900">{ub.unitName}</td>
                                <td className="py-3 px-3 text-slate-500 font-normal">{ub.commanderName}</td>
                                <td className="py-3 px-3 text-center font-mono">{ub.total}</td>
                                <td className="py-3 px-3 text-center font-mono text-emerald-700">{ub.h}</td>
                                <td className="py-3 px-3 text-center font-mono text-purple-700">{ub.m}</td>
                                <td className="py-3 px-3 text-center font-mono text-blue-700">{ub.i}</td>
                                <td className="py-3 px-3 text-center font-mono text-rose-700">{ub.g}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                                    ub.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : ub.rate >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {ub.rate}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* MONTHLY LEVEL REPORT VIEW */}
                {reportPeriodMode === 'monthly' && (
                  <div className="space-y-6">
                    {/* Controls Bar for Monthly Report with Month Selector */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Month Selector Dropdown */}
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-1.5 shadow-xs">
                          <CalendarRange className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black text-slate-700">تحديد الشهر:</span>
                          <select
                            value={selectedMonthlyMonth}
                            onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
                            className="bg-transparent text-xs font-black font-mono text-emerald-900 focus:outline-none cursor-pointer"
                          >
                            {MONTHS_LIST.map(m => (
                              <option key={m.value} value={m.value}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Year Selector Dropdown */}
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
                          <span className="text-xs font-black text-slate-700">السنة:</span>
                          <select
                            value={selectedMonthlyYear}
                            onChange={(e) => setSelectedMonthlyYear(e.target.value)}
                            className="bg-transparent text-xs font-bold font-mono text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="2026">٢٠٢٦ م (١٤٤٨ هـ)</option>
                            <option value="2025">٢٠٢٥ م (١٤٤٧ هـ)</option>
                          </select>
                        </div>

                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-700" />
                          <span>الشهر النشط: {monthlyReportStats.selectedMonthName} {monthlyReportStats.selectedYear}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => generateReportPreview('monthly_periodic')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer self-stretch md:self-auto justify-center"
                      >
                        <Printer className="w-4 h-4" />
                        <span>معاينة وطباعة التقرير الشهري</span>
                      </button>
                    </div>

                    {/* Monthly Key KPI Cards with rich icons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-emerald-800">متوسط الجاهزية الشهري</span>
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xl font-black text-emerald-950 font-mono block">{monthlyReportStats.avgMonthlyReadinessRate}%</span>
                        <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">معدل تراكمي لشهر {monthlyReportStats.selectedMonthShort}</span>
                      </div>

                      <div className="bg-sky-50/80 border border-sky-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-sky-800">أيام الرصد المحسوبة</span>
                          <Clock className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="text-xl font-black text-sky-950 font-mono block">{monthlyReportStats.totalDaysRecorded} يوم</span>
                        <span className="text-[10px] text-sky-700 font-bold block mt-0.5">في السجل الشهري</span>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-rose-800">مجموع حالات الغياب الشهري</span>
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        </div>
                        <span className="text-xl font-black text-rose-950 font-mono block">{monthlyReportStats.totalG} حالة</span>
                        <span className="text-[10px] text-rose-700 font-bold block mt-0.5">خلال شهر {monthlyReportStats.selectedMonthShort}</span>
                      </div>

                      <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-blue-800">مجموع الإجازات الشهرية</span>
                          <Plane className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xl font-black text-blue-950 font-mono block">{monthlyReportStats.totalI} إجازة</span>
                        <span className="text-[10px] text-blue-700 font-bold block mt-0.5">مستهلكة باللواء</span>
                      </div>

                      <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-2xl text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-purple-800">مجموع المهمات الشهرية</span>
                          <Award className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-xl font-black text-purple-950 font-mono block">{monthlyReportStats.totalM} مهمة</span>
                        <span className="text-[10px] text-purple-700 font-bold block mt-0.5">تنفيد تكتيكي</span>
                      </div>
                    </div>

                    {/* Monthly Trend Chart */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div>
                        <h6 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4 text-emerald-600" />
                          <span>منحنى تطور نسبة الحضور والجاهزية اليومية لشهـر ({monthlyReportStats.selectedMonthName} {monthlyReportStats.selectedYear})</span>
                        </h6>
                        <p className="text-[10px] text-slate-500">تتبع تغير مستوى السيطرة والانضباط يوماً بيوم خلال الشهر المحدد.</p>
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyAttendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px' }} />
                            <Line 
                              type="monotone" 
                              dataKey="نسبة الجاهزية %" 
                              stroke="#047857" 
                              strokeWidth={3} 
                              dot={{ r: 4, stroke: '#047857', strokeWidth: 2, fill: '#fff' }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monthly Unit Performance & Compliance Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h6 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-emerald-700" />
                          <span>مؤشرات انضباط وجاهزية التشكيلات والكتائب لشهـر ({monthlyReportStats.selectedMonthName})</span>
                        </h6>
                        <span className="text-[11px] text-slate-500 font-mono font-bold">عام {monthlyReportStats.selectedYear} م</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-black border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">
                                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" /> التشكيل / الوحدة</span>
                              </th>
                              <th className="py-3 px-3">
                                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> القائد</span>
                              </th>
                              <th className="py-3 px-3 text-center">ملاك الوحدة</th>
                              <th className="py-3 px-3 text-center text-rose-700">مجموع الغياب الشهري</th>
                              <th className="py-3 px-3 text-center text-blue-700">مجموع الإجازات</th>
                              <th className="py-3 px-3 text-center text-purple-700">مجموع المهمات</th>
                              <th className="py-3 px-3 text-center">متوسط الجاهزية</th>
                              <th className="py-3 px-4 text-center">
                                <span className="flex items-center justify-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-slate-400" /> التقييم الشهري</span>
                              </th>
                              <th className="py-3 px-3 text-center">تفاصيل أكثر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {monthlyReportStats.unitMonthlyBreakdown.map((umb) => (
                              <tr key={umb.unitId} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-black text-slate-900">{umb.unitName}</td>
                                <td className="py-3 px-3 text-slate-500 font-normal">{umb.commanderName}</td>
                                <td className="py-3 px-3 text-center font-mono">{umb.totalSoldiers}</td>
                                <td className="py-3 px-3 text-center font-mono text-rose-700">{umb.totalG}</td>
                                <td className="py-3 px-3 text-center font-mono text-blue-700">{umb.totalI}</td>
                                <td className="py-3 px-3 text-center font-mono text-purple-700">{umb.totalM}</td>
                                <td className="py-3 px-3 text-center font-mono font-black text-slate-900">{umb.avgRate}%</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${umb.ratingColor}`}>
                                    {umb.rating}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReportUnitDetail({
                                        unitId: umb.unitId,
                                        unitName: umb.unitName,
                                        commanderName: umb.commanderName,
                                        isMonthly: true,
                                        periodLabel: `${monthlyReportStats.selectedMonthName} ${monthlyReportStats.selectedYear}`
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto shadow-xs"
                                  >
                                    <span>التفاصيل 🔍</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SUBTAB 3: Daily Operations Desk & Decisions */}
            {activeSubTab === 'ops_center' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* 1. Duty Rosters & Officers */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h6 className="font-extrabold text-xs text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1 font-sans">
                    <Clock className="w-4 h-4 text-slate-500" />
                    مناوبات ودوام السيطرة اليومي
                  </h6>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-sans">
                    <li className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">ضابط عمليات السيطرة:</span>
                      <strong className="text-slate-800">العقيد الركن يوسف الأحمد</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">مساعد المناوب العام:</span>
                      <strong className="text-slate-800">المساعد أول عمر الخطيب</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">طبيب الطوارئ المناوب:</span>
                      <strong className="text-slate-800">الملازم أول طبيب وسيم مراد</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">مناوب الاتصالات واللاسلكي:</span>
                      <strong className="text-slate-800">الرقيب عاصم المحمد</strong>
                    </li>
                  </ul>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-[10px] text-emerald-700 font-sans">
                    * يجب التواجد بمقر قيادة اللواء قبل الساعة ٠٦٠٠ وحظر مغادرة الميدان دون موافقة ركن العمليات المسبقة.
                  </div>
                </div>

                {/* 2. Active Military Missions */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h6 className="font-extrabold text-xs text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1 font-sans">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    المهام والعمليات الجارية والمكلفة
                  </h6>
                  <div className="space-y-2 text-[11px] font-sans">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150 space-y-1">
                      <div className="flex justify-between">
                        <strong className="text-slate-800">حراسة وتأمين القطاع الشمالي للحدود</strong>
                        <span className="text-emerald-600 font-bold">نشطة</span>
                      </div>
                      <p className="text-slate-500 text-[10px]">الالكتيبة الثانية - دورية استطلاع مدرعة</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150 space-y-1">
                      <div className="flex justify-between">
                        <strong className="text-slate-800">دورية فنية لصيانة الاتصالات الأرضية</strong>
                        <span className="text-emerald-600 font-bold">نشطة</span>
                      </div>
                      <p className="text-slate-500 text-[10px]">سرية الإشارة - الفصيل الفني والمعدات</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150 space-y-1 opacity-65">
                      <div className="flex justify-between">
                        <strong className="text-slate-800">تأمين المنشآت الحيوية في قطاع د</strong>
                        <span className="text-slate-400">مكتملة</span>
                      </div>
                      <p className="text-slate-500 text-[10px]">فصيل الدعم السريع والتدخل الخارجي</p>
                    </div>
                  </div>
                </div>

                {/* 3. Pending Approvals Inbox */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h6 className="font-extrabold text-xs text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span className="flex items-center gap-1"><FileCheck2 className="w-4 h-4 text-slate-500" /> اعتمادات القيادة العامة</span>
                    <span className="bg-rose-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full">{pendingApprovals.length} معلق</span>
                  </h6>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {pendingApprovals.map(app => (
                      <div 
                        key={app.id}
                        className="bg-white p-2.5 rounded-xl border border-slate-150 space-y-2 text-[10px] font-sans"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-slate-800 text-xs block">{app.name}</strong>
                            <span className="text-slate-400 text-[10px]">{app.unit} // {app.type}</span>
                          </div>
                          <span className="text-[9px] text-slate-400">{app.duration}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleApprovalAction(app.id, app.name, app.type, true)}
                            className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold transition-all cursor-pointer text-[9px]"
                          >
                            اعتماد وصرف
                          </button>
                          <button 
                            onClick={() => handleApprovalAction(app.id, app.name, app.type, false)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-bold transition-all cursor-pointer text-[9px]"
                          >
                            رفض الطلب
                          </button>
                        </div>
                      </div>
                    ))}

                    {pendingApprovals.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-10 font-sans">لا توجد طلبات إجازة أو تكليفات معلقة للاعتماد الفوري.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* 6. Modal Report Preview overlay (Print-ready HTML render) */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-300 rounded-2xl p-6 relative shadow-2xl print:p-0 print:border-none">
            
            {/* Close */}
            <button 
              onClick={() => setActiveReport(null)}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all print:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Interactive Mode & Date Selector inside Modal (Hidden during printing) */}
            <div className="mb-5 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 print:hidden space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>التحكم في التقرير المعروض بالنافذة المبثقة:</span>
                </span>
                <span className="text-[10px] text-slate-400">اختر النوع والتاريخ لتحديث الكشف فوراً</span>
              </div>

              {/* Toggle Buttons inside Modal */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => generateReportPreview('daily_periodic')}
                  className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeReport.type === 'daily_periodic' || activeReport.type === 'readiness' || activeReport.type === 'absence' || activeReport.type === 'medical'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 text-emerald-300" />
                  <span>📅 تقرير يومي (تحديد اليوم)</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateReportPreview('monthly_periodic')}
                  className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeReport.type === 'monthly_periodic'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <CalendarRange className="w-4 h-4 text-blue-300" />
                  <span>🗓️ تقرير شهري (تحديد الشهر)</span>
                </button>
              </div>

              {/* Dynamic Inputs inside Modal */}
              {(activeReport.type === 'daily_periodic' || activeReport.type === 'readiness' || activeReport.type === 'absence' || activeReport.type === 'medical') ? (
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-slate-300">تاريخ اليوم المحدد:</span>
                  <input
                    type="date"
                    value={selectedDailyDate || latestDate}
                    onChange={(e) => {
                      setSelectedDailyDate(e.target.value);
                      setTimeout(() => generateReportPreview(activeReport.type), 50);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                  />
                  <select
                    value={selectedDailyDate || latestDate}
                    onChange={(e) => {
                      setSelectedDailyDate(e.target.value);
                      setTimeout(() => generateReportPreview(activeReport.type), 50);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-slate-300 font-mono text-xs focus:outline-none cursor-pointer"
                  >
                    {dates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <CalendarRange className="w-4 h-4 text-blue-400" />
                  <span className="font-extrabold text-slate-300">الشهر المستهدف:</span>
                  <select
                    value={selectedMonthlyMonth}
                    onChange={(e) => {
                      setSelectedMonthlyMonth(e.target.value);
                      setTimeout(() => generateReportPreview('monthly_periodic'), 50);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    {MONTHS_LIST.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>

                  <span className="font-extrabold text-slate-300">السنة:</span>
                  <select
                    value={selectedMonthlyYear}
                    onChange={(e) => {
                      setSelectedMonthlyYear(e.target.value);
                      setTimeout(() => generateReportPreview('monthly_periodic'), 50);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-slate-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="2026">٢٠٢٦ م (١٤٨ هـ)</option>
                    <option value="2025">٢٠٢٥ م (١٤٤٧ هـ)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Print Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4 text-xs font-sans text-right">
              <div>
                <h3 className="text-base font-black text-slate-900">وزارة الدفاع والسيطرة الوطنية</h3>
                <h4 className="text-xs font-bold text-slate-700">قيادة لواء المشاة الآلي /٢٦/</h4>
                <p className="text-[10px] text-slate-400 mt-1">الرقم المرجعي: {activeReport.type.toUpperCase()}-{new Date().getFullYear()}</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block tracking-widest">// سري للغاية //</span>
                <span className="font-bold text-slate-800 block text-xs underline mt-1">مستند إحصائي قيادي موثق</span>
              </div>
              <div className="text-left">
                <p>تاريخ الكشف: {activeReport.type === 'monthly_periodic' ? `${monthlyReportStats.selectedMonthName} ${monthlyReportStats.selectedYear}` : dailyReportStats.date}</p>
                <p className="font-mono text-[9px] mt-1">UUID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
              </div>
            </div>

            {/* Content Body */}
            <div className="py-2 space-y-4 font-sans text-right">
              <h2 className="text-lg font-black text-slate-900 border-r-4 border-emerald-800 pr-3">{activeReport.title}</h2>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {activeReport.content}
              </div>

              {/* Rich Interactive Table & Drilldown Section Inside Modal */}
              {activeReport.type === 'monthly_periodic' ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-800" />
                      <span>تفاصيل انضباط وجاهزية الكتائب والتشكيلات لشهـر ({monthlyReportStats.selectedMonthName} {monthlyReportStats.selectedYear})</span>
                    </h5>
                    <span className="text-[10px] text-slate-500 font-bold">اضغط على أي كتيبة لعرض أفرادها وسجلهم التفصيلي 🔍</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">التشكيل / الوحدة</th>
                          <th className="py-2.5 px-3">القائد</th>
                          <th className="py-2.5 px-3 text-center">الملاك</th>
                          <th className="py-2.5 px-3 text-center text-rose-700">الغياب</th>
                          <th className="py-2.5 px-3 text-center text-blue-700">الإجازات</th>
                          <th className="py-2.5 px-3 text-center text-purple-700">المهمات</th>
                          <th className="py-2.5 px-3 text-center">الجاهزية</th>
                          <th className="py-2.5 px-3 text-center print:hidden">تفاصيل أكثر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                        {monthlyReportStats.unitMonthlyBreakdown.map((umb) => (
                          <tr key={umb.unitId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-black text-slate-900">{umb.unitName}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">{umb.commanderName}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{umb.totalSoldiers}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-rose-700">{umb.totalG}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-blue-700">{umb.totalI}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-purple-700">{umb.totalM}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800">{umb.avgRate}%</td>
                            <td className="py-2.5 px-3 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReportUnitDetail({
                                    unitId: umb.unitId,
                                    unitName: umb.unitName,
                                    commanderName: umb.commanderName,
                                    isMonthly: true,
                                    periodLabel: `${monthlyReportStats.selectedMonthName} ${monthlyReportStats.selectedYear}`
                                  });
                                }}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto shadow-xs"
                              >
                                <span>عرض التفاصيل 🔍</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-800" />
                      <span>تفاصيل الحضور الميداني والجاهزية اليومية للكتائب ({dailyReportStats.date})</span>
                    </h5>
                    <span className="text-[10px] text-slate-500 font-bold">اضغط على أي كتيبة لعرض أفرادها وسجلهم التفصيلي 🔍</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">التشكيل / الوحدة</th>
                          <th className="py-2.5 px-3">القائد</th>
                          <th className="py-2.5 px-3 text-center">الملاك</th>
                          <th className="py-2.5 px-3 text-center text-emerald-700">الحاضر</th>
                          <th className="py-2.5 px-3 text-center text-purple-700">المهمات</th>
                          <th className="py-2.5 px-3 text-center text-blue-700">الإجازات</th>
                          <th className="py-2.5 px-3 text-center text-rose-700">الغياب</th>
                          <th className="py-2.5 px-3 text-center">الجاهزية</th>
                          <th className="py-2.5 px-3 text-center print:hidden">تفاصيل أكثر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                        {dailyReportStats.unitBreakdown.map((ub) => (
                          <tr key={ub.unitId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-black text-slate-900">{ub.unitName}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">{ub.commanderName}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{(ub as any).totalPersonnel || ub.total}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-700">{(ub as any).present || ub.h}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-purple-700">{(ub as any).mission || ub.m}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-blue-700">{(ub as any).leave || ub.i}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-rose-700">{(ub as any).absent || ub.g}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800">{(ub as any).readinessRate || ub.rate}%</td>
                            <td className="py-2.5 px-3 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReportUnitDetail({
                                    unitId: ub.unitId,
                                    unitName: ub.unitName,
                                    commanderName: ub.commanderName,
                                    isMonthly: false,
                                    periodLabel: dailyReportStats.date
                                  });
                                }}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto shadow-xs"
                              >
                                <span>عرض التفاصيل 🔍</span>
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

            {/* Verification Signatures Overlay */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dashed border-slate-200 text-xs font-sans mt-4">
              <div className="text-right space-y-1 text-slate-600">
                <p className="font-bold">رئيس لجنة تتبع التدقيق والانضباط:</p>
                <p className="text-slate-800">العميد الركن أحمد الغانم</p>
                <div className="h-10 w-24 border-b border-slate-300"></div>
                <p className="text-[10px] text-slate-400 font-mono">توقيع اللجنة المعتمدة</p>
              </div>
              <div className="text-left space-y-1 text-slate-600 flex flex-col items-end">
                <p className="font-bold">مـصادقة قائد لواء المشاة /٢٦/:</p>
                <p className="text-slate-800">العقيد الركن يوسف الأحمد</p>
                {/* Simulated Stamp circle */}
                <div className="w-14 h-14 rounded-full border-4 border-emerald-800/20 text-emerald-800/40 text-[9px] font-black flex items-center justify-center border-dashed mt-1 animate-pulse">
                  ختم السيطرة
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 mt-6 border-t border-slate-200 pt-4 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف الفوري</span>
              </button>
              <button 
                onClick={() => setActiveReport(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
              >
                إغلاق المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6.5. Unit Personnel Detailed Drilldown Modal */}
      {selectedReportUnitDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-3xl p-6 relative shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  كشف التفاصيل الفردية للوحدة
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-800" />
                  <span>{selectedReportUnitDetail.unitName}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  القائد المسئول: {selectedReportUnitDetail.commanderName} | النطاق الزمني: <span className="font-mono text-emerald-800">{selectedReportUnitDetail.periodLabel}</span>
                </p>
              </div>

              <button 
                onClick={() => setSelectedReportUnitDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unit Soldiers Search */}
            <div className="mb-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث برتبة أو اسم أو الرقم العسكري بداخل هذه الوحدة..."
                value={unitSoldierSearchQuery}
                onChange={(e) => setUnitSoldierSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Personnel Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 font-black text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">الرقم العسكري</th>
                    <th className="py-2.5 px-3">الرتبة والاسم</th>
                    <th className="py-2.5 px-3 text-center">
                      {selectedReportUnitDetail.isMonthly ? 'سجل الحضور والغياب الشهري' : 'حالة الحضور اليومية'}
                    </th>
                    <th className="py-2.5 px-3 text-center">الملف الفردي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {unitDetailSoldiers.map((soldier) => {
                    if (selectedReportUnitDetail.isMonthly) {
                      const monthPrefix = `${selectedMonthlyYear}-${selectedMonthlyMonth}`;
                      const soldierRecs = attendance.filter(a => a.soldierId === soldier.id && a.date.startsWith(monthPrefix));
                      const hCount = soldierRecs.filter(a => normalizeStatusCode(a.statusCode) === 'ح').length;
                      const gCount = soldierRecs.filter(a => normalizeStatusCode(a.statusCode) === 'غ').length;
                      const iCount = soldierRecs.filter(a => normalizeStatusCode(a.statusCode) === 'إ').length;
                      const mCount = soldierRecs.filter(a => normalizeStatusCode(a.statusCode) === 'م').length;
                      const eCount = soldierRecs.filter(a => normalizeStatusCode(a.statusCode) === 'ع').length;

                      return (
                        <tr key={soldier.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">{soldier.militaryNumber}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            <span className="text-slate-500 text-[10px] ml-1">{soldier.rank}</span>
                            <span>{soldier.fullName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">ح: {hCount}</span>
                              <span className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">غ: {gCount}</span>
                              <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">إ: {iCount}</span>
                              <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">م: {mCount}</span>
                              {eCount > 0 && <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">ع: {eCount}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSoldier(soldier);
                              }}
                              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto"
                            >
                              <User className="w-3 h-3" />
                              <span>الملف الفردي</span>
                            </button>
                          </td>
                        </tr>
                      );
                    } else {
                      const targetDate = selectedDailyDate || latestDate;
                      const rec = attendance.find(a => a.soldierId === soldier.id && a.date === targetDate);
                      const st = rec ? normalizeStatusCode(rec.statusCode) : 'ح';

                      const statusBg: Record<string, string> = {
                        'ح': 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        'غ': 'bg-rose-100 text-rose-900 border-rose-300',
                        'أ': 'bg-blue-100 text-blue-900 border-blue-300',
                        'م': 'bg-purple-100 text-purple-900 border-purple-300',
                        'ط': 'bg-amber-100 text-amber-900 border-amber-300',
                        'ن': 'bg-slate-100 text-slate-900 border-slate-300'
                      };

                      const statusName: Record<string, string> = {
                        'ح': 'حاضر بالخدمة',
                        'غ': 'غائب دون عذر',
                        'أ': 'في إجازة رسمية',
                        'م': 'في مهمة عسكرية',
                        'ط': 'عذر طبي ومراجعة',
                        'ن': 'مناوب بالخدمة'
                      };

                      return (
                        <tr key={soldier.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">{soldier.militaryNumber || (soldier as any).militaryId}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            <span className="text-slate-500 text-[10px] ml-1">{soldier.rank}</span>
                            <span>{(soldier as any).fullName || (soldier as any).name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusBg[st] || 'bg-slate-100'}`}>
                              {statusName[st] || st}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSoldier(soldier);
                              }}
                              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 mx-auto"
                            >
                              <User className="w-3 h-3" />
                              <span>الملف الفردي</span>
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  })}

                  {unitDetailSoldiers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold text-xs">
                        لا يوجد أفراد مسجلون بهذه الوحدة يطابقون شروط البحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-left">
              <button
                type="button"
                onClick={() => setSelectedReportUnitDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
              >
                عودة للكشف العام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Soldier Profile Detail Drawer Modal - Ultra Prestigious Military ID Card + Embedded Monthly Attendance */}
      {selectedSoldier && (() => {
        // Calculate monthly attendance data for selectedSoldier in the ID Card
        const daysInIdCardMonth = new Date(parseInt(idCardYear), parseInt(idCardMonth), 0).getDate();
        const idCardDaysList = Array.from({ length: daysInIdCardMonth }, (_, i) => i + 1);

        const idCardMonthlyData = idCardDaysList.map(dayNum => {
          const dayPadded = String(dayNum).padStart(2, '0');
          const dateStr = `${idCardYear}-${idCardMonth}-${dayPadded}`;
          
          let dayName = '';
          try {
            const dt = new Date(parseInt(idCardYear), parseInt(idCardMonth) - 1, dayNum);
            dayName = dt.toLocaleDateString('ar-SA', { weekday: 'long' });
          } catch {
            dayName = '';
          }

          const record = attendance.find(a => a.soldierId === selectedSoldier.id && a.date === dateStr);
          const rawCode = record ? record.statusCode : null;
          const normCode = record ? normalizeStatusCode(record.statusCode) : 'unrecorded';
          const isSick = normCode === 'ع' || String(rawCode) === 'مريض' || String(rawCode) === 'طبي' || String(rawCode) === 'ط';

          return { dayNum, dateStr, dayName, record, rawCode, normCode, isSick };
        });

        const idCardPresentCount = idCardMonthlyData.filter(d => d.normCode === 'ح').length;
        const idCardDutyCount = idCardMonthlyData.filter(d => d.normCode === 'م').length;
        const idCardLeaveCount = idCardMonthlyData.filter(d => d.normCode === 'إ').length;
        const idCardSickCount = idCardMonthlyData.filter(d => d.isSick).length;
        const idCardAbsentCount = idCardMonthlyData.filter(d => d.normCode === 'غ').length;
        const idCardSickDaysList = idCardMonthlyData.filter(d => d.isSick);

        const displayedIdCardDays = idCardFilter === 'sick_only' ? idCardSickDaysList : idCardMonthlyData;

        // Today's attendance status for selected soldier
        const todayDateStr = latestDate || new Date().toISOString().split('T')[0];
        const todayRecord = attendance.find(a => a.soldierId === selectedSoldier.id && a.date === todayDateStr);
        const todayNormCode = todayRecord ? normalizeStatusCode(todayRecord.statusCode) : 'unrecorded';
        const isTodaySick = todayNormCode === 'ع' || String(todayRecord?.statusCode) === 'مريض' || String(todayRecord?.statusCode) === 'طبي';

        const unitObj = units.find(u => u.id === selectedSoldier.unitId);
        const unitName = unitObj?.name || 'قيادة اللواء والسيطرة';

        const handleCopyText = (text: string) => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedMilitaryNum(true);
            setTimeout(() => setCopiedMilitaryNum(false), 2000);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" dir="rtl">
            <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 relative text-slate-100 shadow-[0_0_60px_rgba(217,119,6,0.2)] overflow-hidden font-sans flex flex-col max-h-[92vh]">
              
              {/* Background Glows */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

              {/* Top Header Bar */}
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-3 shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-700/40 border border-amber-500/60 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                      <span>بطاقة الهوية الرقمية والعرض العسكري</span>
                      <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      OFFICIAL MILITARY CARD & MONTHLY ATTENDANCE // C4I SYSTEM
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block text-[9px] font-black px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded-lg border border-amber-500/30 tracking-wider uppercase">
                    مـوثّـق وسـرّي
                  </span>
                  <button 
                    onClick={() => setSelectedSoldier(null)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer border border-slate-700"
                    title="إغلاق بطاقة الهوية"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Segmented Mobile-Friendly Navigation Tabs */}
              <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-3 shrink-0 gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setIdCardTab('identity')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    idCardTab === 'identity'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>العرض العسكري</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIdCardTab('attendance')}
                  className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                    idCardTab === 'attendance'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>كشف الحضور الشهري</span>
                  {idCardSickCount > 0 && (
                    <span className="text-[9px] bg-amber-900 text-amber-200 px-1.5 py-0.2 rounded-full font-extrabold border border-amber-400">
                      {idCardSickCount} مرض
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIdCardTab('contact')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    idCardTab === 'contact'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <PhoneCall className="w-4 h-4 shrink-0" />
                  <span>التواصل للهاتف</span>
                </button>
              </div>

              {/* Scrollable Main Content Area */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative z-10">
                
                {/* TAB 1: Military Identity & Digital Card Parameters */}
                {idCardTab === 'identity' && (
                  <div className="space-y-3.5 animate-fadeIn">
                    
                    {/* Main Soldier Profile Banner */}
                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-amber-500/40 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-amber-500 via-emerald-500 to-amber-600" />

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-2">
                        
                        <div className="flex items-center gap-3.5">
                          {/* Photo Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-2xl border-2 border-amber-500/60 p-0.5 shadow-xl overflow-hidden">
                              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center relative">
                                {selectedSoldier.photoUrl ? (
                                  <img 
                                    src={selectedSoldier.photoUrl} 
                                    alt={selectedSoldier.fullName} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-9 h-9 text-amber-400/80 stroke-[1.25]" />
                                )}
                              </div>
                            </div>
                            <div className="absolute -bottom-1 -left-1 bg-slate-950 border border-emerald-500/60 p-1 rounded-full text-emerald-400 shadow-md">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Identity details */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                {selectedSoldier.rank}
                              </span>
                              <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700">
                                {unitName}
                              </span>
                            </div>

                            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                              <span>{selectedSoldier.fullName}</span>
                            </h4>

                            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 flex-wrap">
                              <span>الرقم العسكري: <strong className="text-emerald-400 font-bold">{selectedSoldier.militaryNumber}</strong></span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(selectedSoldier.militaryNumber)}
                                className="p-1 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                                title="نسخ الرقم العسكري"
                              >
                                {copiedMilitaryNum ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> تم النسخ</span>
                                ) : (
                                  <span className="flex items-center gap-0.5"><Copy className="w-3 h-3" /> نسخ</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Direct Profile Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewSoldierProfile) onViewSoldierProfile(selectedSoldier.id);
                            setSelectedSoldier(null);
                          }}
                          className="w-full sm:w-auto py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-md"
                        >
                          <User className="w-4 h-4" />
                          <span>فتح الملف الكامل ➜</span>
                        </button>

                      </div>
                    </div>

                    {/* Today's Live Attendance Quick Registration Bar */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>حالة التحضير اليومية اليوم ({todayDateStr}):</span>
                        </span>
                        
                        {isTodaySick ? (
                          <span className="text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                            <span>مريض / عذر (ع)</span>
                          </span>
                        ) : todayNormCode === 'ح' ? (
                          <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>حاضر (ح)</span>
                          </span>
                        ) : todayNormCode === 'م' ? (
                          <span className="text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                            <span>مهمة ميدانية (م)</span>
                          </span>
                        ) : todayNormCode === 'إ' ? (
                          <span className="text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            <span>إجازة رسمية (إ)</span>
                          </span>
                        ) : todayNormCode === 'غ' ? (
                          <span className="text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>غائب (غ)</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full">
                            غير محضر اليوم
                          </span>
                        )}
                      </div>

                      {/* Quick 1-Tap Attendance Status Change Buttons */}
                      {onSaveAttendanceBatch && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">تحديث سريع:</span>
                          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto pb-0.5">
                            <button
                              type="button"
                              onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [todayDateStr], 'ح')}
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                todayNormCode === 'ح' && !isTodaySick
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-emerald-950 hover:text-emerald-300'
                              }`}
                            >
                              حاضر (ح)
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [todayDateStr], 'م')}
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                todayNormCode === 'م'
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-purple-950 hover:text-purple-300'
                              }`}
                            >
                              مهمة (م)
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [todayDateStr], 'إ')}
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                todayNormCode === 'إ'
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-blue-950 hover:text-blue-300'
                              }`}
                            >
                              إجازة (إ)
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [todayDateStr], 'ع')}
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                isTodaySick
                                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-amber-950 hover:text-amber-300'
                              }`}
                            >
                              مريض (ع)
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [todayDateStr], 'غ')}
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                todayNormCode === 'غ'
                                  ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-rose-950 hover:text-rose-300'
                              }`}
                            >
                              غائب (غ)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4-Box Tactical Parameters Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>الوحدة والكتيبة:</span>
                        </span>
                        <p className="text-xs font-black text-slate-100">{unitName}</p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          <span>التخصص الميداني:</span>
                        </span>
                        <p className="text-xs font-black text-slate-100">
                          {selectedSoldier.specialization || 'إسناد ميداني عام'}
                        </p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-sky-400" />
                          <span>الهاتف المسجل:</span>
                        </span>
                        <p className="text-xs font-mono font-black text-sky-300">
                          {selectedSoldier.phoneNumber || 'غير مسجل'}
                        </p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                          <span>فصيلة الدم واللياقة:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            {selectedSoldier.bloodType || 'A+'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">لائق للخدمة ✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Barcode & Digital C4I Authentication Bar */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-8 h-8 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">التشفير العسكري:</span>
                          <span className="text-[11px] font-black text-amber-300 tracking-wider">
                            MIL-SEC-{selectedSoldier.militaryNumber || '0000'}
                          </span>
                        </div>
                      </div>

                      <div className="text-left font-sans text-[10px] font-bold text-slate-400 border-r border-slate-800 pr-3">
                        <span className="text-emerald-400 block font-black">جاهزية قتالية عالية</span>
                        <span className="text-slate-500">القيادة والسيطرة C4I</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: Embedded Monthly Attendance Calendar & Breakdown */}
                {idCardTab === 'attendance' && (
                  <div className="space-y-3 animate-fadeIn">
                    
                    {/* Month & Year Selectors Bar */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            let m = parseInt(idCardMonth) - 1;
                            let y = parseInt(idCardYear);
                            if (m < 1) { m = 12; y -= 1; }
                            setIdCardMonth(String(m).padStart(2, '0'));
                            setIdCardYear(String(y));
                          }}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-800"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <select
                          value={idCardMonth}
                          onChange={(e) => setIdCardMonth(e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                        >
                          {MONTHS_LIST.map(m => (
                            <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                              {m.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={idCardYear}
                          onChange={(e) => setIdCardYear(e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                        >
                          {['2026', '2025', '2024', '2027'].map(y => (
                            <option key={y} value={y} className="bg-slate-900 text-white">
                              {y}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            let m = parseInt(idCardMonth) + 1;
                            let y = parseInt(idCardYear);
                            if (m > 12) { m = 1; y += 1; }
                            setIdCardMonth(String(m).padStart(2, '0'));
                            setIdCardYear(String(y));
                          }}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-800"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Filter Mode Toggle */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
                        <button
                          type="button"
                          onClick={() => setIdCardFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            idCardFilter === 'all'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          جميع الأيام ({daysInIdCardMonth})
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdCardFilter('sick_only')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            idCardFilter === 'sick_only'
                              ? 'bg-rose-500 text-white font-black shadow-xs'
                              : 'text-slate-400 hover:text-rose-400'
                          }`}
                        >
                          الأيام المرضية ({idCardSickCount})
                        </button>
                      </div>
                    </div>

                    {/* KPI Badges Bar */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 block font-bold">أيام الشهر</span>
                        <span className="text-xs font-black text-slate-100 font-mono">{daysInIdCardMonth}</span>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-emerald-400 block font-bold">حاضر (ح)</span>
                        <span className="text-xs font-black text-emerald-300 font-mono">{idCardPresentCount}</span>
                      </div>
                      <div className="bg-purple-950/40 border border-purple-500/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-purple-400 block font-bold">مهمة (م)</span>
                        <span className="text-xs font-black text-purple-300 font-mono">{idCardDutyCount}</span>
                      </div>
                      <div className="bg-blue-950/40 border border-blue-500/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-blue-400 block font-bold">إجازة (إ)</span>
                        <span className="text-xs font-black text-blue-300 font-mono">{idCardLeaveCount}</span>
                      </div>
                      <div className="bg-amber-950/50 border border-amber-500/40 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-amber-400 block font-bold">مريض (ع)</span>
                        <span className="text-xs font-black text-amber-300 font-mono">{idCardSickCount}</span>
                      </div>
                      <div className="bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-rose-400 block font-bold">غائب (غ)</span>
                        <span className="text-xs font-black text-rose-300 font-mono">{idCardAbsentCount}</span>
                      </div>
                    </div>

                    {/* Sick / Medical Days Dedicated Highlight Strip */}
                    {idCardSickDaysList.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-amber-400" />
                            <span>الأيام والأعذار المرضية المسجلة للشهر:</span>
                          </span>
                          <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
                            {idCardSickCount} يوم
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
                          {idCardSickDaysList.map(item => (
                            <span 
                              key={item.dateStr}
                              className="bg-amber-500/20 border border-amber-500/40 text-amber-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                            >
                              {item.dateStr} ({item.dayName})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Attendance Grid Table */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                      <div className="max-h-[220px] overflow-y-auto">
                        <table className="w-full text-right text-xs font-sans">
                          <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 text-[11px]">التاريخ واليوم</th>
                              <th className="p-2 text-[11px] text-center">الحالة</th>
                              {onSaveAttendanceBatch && <th className="p-2 text-[11px] text-center">تغيير سريع</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {displayedIdCardDays.map(item => {
                              const { dayNum, dateStr, dayName, normCode, isSick } = item;
                              let rowClass = 'hover:bg-slate-900/50';
                              if (isSick) rowClass = 'bg-amber-950/20 hover:bg-amber-950/30 border-r-2 border-r-amber-500';
                              else if (normCode === 'غ') rowClass = 'bg-rose-950/20 hover:bg-rose-950/30 border-r-2 border-r-rose-500';

                              return (
                                <tr key={dateStr} className={rowClass}>
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded bg-slate-800 text-slate-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                        {String(dayNum).padStart(2, '0')}
                                      </span>
                                      <div>
                                        <span className="font-mono text-xs font-bold text-slate-200 block">{dateStr}</span>
                                        <span className="text-[10px] text-slate-400">{dayName}</span>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    {isSick ? (
                                      <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <Stethoscope className="w-3 h-3 text-amber-400" />
                                        <span>مريض (ع)</span>
                                      </span>
                                    ) : normCode === 'ح' ? (
                                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>حاضر (ح)</span>
                                      </span>
                                    ) : normCode === 'م' ? (
                                      <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <Briefcase className="w-3 h-3 text-purple-400" />
                                        <span>مهمة (م)</span>
                                      </span>
                                    ) : normCode === 'إ' ? (
                                      <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-blue-400" />
                                        <span>إجازة (إ)</span>
                                      </span>
                                    ) : normCode === 'غ' ? (
                                      <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-rose-400" />
                                        <span>غائب (غ)</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-semibold">غير محضر</span>
                                    )}
                                  </td>

                                  {onSaveAttendanceBatch && (
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [dateStr], 'ح')}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                            normCode === 'ح' && !isSick
                                              ? 'bg-emerald-600 text-white border-emerald-400'
                                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-emerald-300'
                                          }`}
                                        >
                                          ح
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [dateStr], 'م')}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                            normCode === 'م'
                                              ? 'bg-purple-600 text-white border-purple-400'
                                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-purple-300'
                                          }`}
                                        >
                                          م
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [dateStr], 'إ')}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                            normCode === 'إ'
                                              ? 'bg-blue-600 text-white border-blue-400'
                                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-blue-300'
                                          }`}
                                        >
                                          إ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [dateStr], 'ع')}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                            isSick
                                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                                          }`}
                                        >
                                          ع
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onSaveAttendanceBatch([selectedSoldier.id], [dateStr], 'غ')}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                                            normCode === 'غ'
                                              ? 'bg-rose-600 text-white border-rose-400'
                                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-300'
                                          }`}
                                        >
                                          غ
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: Mobile Direct Actions & Quick Tools */}
                {idCardTab === 'contact' && (
                  <div className="space-y-3 animate-fadeIn">
                    <p className="text-xs text-slate-400 font-semibold">
                      أدوات التواصل السريع المباشرة من أجهزة الهاتف الذكية والأجهزة الميدانية:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Phone Call */}
                      {selectedSoldier.phoneNumber ? (
                        <a
                          href={`tel:${selectedSoldier.phoneNumber}`}
                          className="p-4 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 rounded-2xl transition-all cursor-pointer flex items-center gap-3.5 group shadow-md"
                        >
                          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                            <PhoneCall className="w-6 h-6" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-emerald-300">اتصال هاتفي مباشر</h5>
                            <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">{selectedSoldier.phoneNumber}</p>
                            <span className="text-[10px] text-emerald-400 font-semibold">انقر للاتصال فوراً 📞</span>
                          </div>
                        </a>
                      ) : (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 text-xs font-bold flex items-center gap-3">
                          <Phone className="w-5 h-5 text-slate-600" />
                          <span>رقم الهاتف غير مسجل ببطاقة الفرد</span>
                        </div>
                      )}

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={(e) => handleSendWhatsAppDetails(selectedSoldier, e)}
                        className="p-4 bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-600/40 rounded-2xl transition-all cursor-pointer text-right flex items-center gap-3.5 group shadow-md"
                      >
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-emerald-300">رسالة واتساب رسمية</h5>
                          <p className="text-[11px] text-slate-300 mt-0.5">مشاركة بيانات الهوية وحالة التحضير</p>
                          <span className="text-[10px] text-emerald-400 font-semibold">إرسال تفاصيل الفرد عبر الواتساب 💬</span>
                        </div>
                      </button>

                      {/* Copy Military Identity Card Summary */}
                      <button
                        type="button"
                        onClick={() => {
                          const text = `🎖️ **بطاقة الهوية العسكرية**\n• الرتبة والاسم: ${selectedSoldier.rank} / ${selectedSoldier.fullName}\n• الرقم العسكري: ${selectedSoldier.militaryNumber}\n• الوحدة: ${unitName}\n• التخصص: ${selectedSoldier.specialization || 'إسناد ميداني'}\n• الهاتف: ${selectedSoldier.phoneNumber || 'غير مسجل'}\n• فصيلة الدم: ${selectedSoldier.bloodType || 'A+'}\n• حالة اليوم: ${todayNormCode === 'ح' ? 'حاضر' : todayNormCode === 'م' ? 'مهمة' : todayNormCode === 'إ' ? 'إجازة' : isTodaySick ? 'مريض' : 'غير محضر'}`;
                          handleCopyText(text);
                        }}
                        className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-2xl transition-all cursor-pointer text-right flex items-center gap-3.5 group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Copy className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-amber-300">نسخ بيانات الهوية العسكرية</h5>
                          <p className="text-[11px] text-slate-400 mt-0.5">نسخ كامل ملخص بطاقة العسكري للحافظة</p>
                          <span className="text-[10px] text-amber-400 font-semibold">
                            {copiedMilitaryNum ? 'تم نسخ البيانات بنجاح ✓' : 'انقر لنسخ النص للمفكرة 📋'}
                          </span>
                        </div>
                      </button>

                      {/* Open Full Profile */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onViewSoldierProfile) onViewSoldierProfile(selectedSoldier.id);
                          setSelectedSoldier(null);
                        }}
                        className="p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-2xl transition-all cursor-pointer text-right flex items-center gap-3.5 group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-amber-300">فتح الملف العسكري الكامل</h5>
                          <p className="text-[11px] text-slate-400 mt-0.5">الانتقال لصفحة البروفايل والسجلات الكاملة</p>
                          <span className="text-[10px] text-amber-400 font-semibold">استعراض العهد والترقيات والأرشيف ➜</span>
                        </div>
                      </button>

                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Card Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-bold shrink-0">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>قيادة القوات المسلحة - منظومة السيطرة والضبط C4I</span>
                </span>
                <button 
                  onClick={() => setSelectedSoldier(null)}
                  className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
                >
                  إغلاق البطاقة
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Monthly Attendance Modal for Selected Soldier */}
      {selectedSoldierMonthlyAttendance && (
        <SoldierMonthlyAttendanceModal
          soldier={selectedSoldierMonthlyAttendance}
          units={units}
          attendance={attendance}
          onClose={() => setSelectedSoldierMonthlyAttendance(null)}
          onSaveAttendanceBatch={onSaveAttendanceBatch}
        />
      )}

      {/* 8. Military Telegram Official sealed circular Modal */}
      {activeDecree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl font-sans">
          <div className="w-full max-w-md bg-amber-50/20 text-slate-900 border border-amber-300/30 rounded-2xl p-6 relative shadow-2xl backdrop-blur-xl">
            <button 
              onClick={() => setActiveDecree(null)}
              className="absolute top-4 left-4 p-1.5 text-slate-500 hover:text-slate-800 hover:bg-amber-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5 pb-4 border-b border-amber-200 text-amber-700">
              <span className="text-[10px] font-black tracking-widest block">// برقية تعميم سرية عاجلة //</span>
              <h4 className="text-xs font-black">الجمهورية العربية السورية - وزارة الدفاع</h4>
              <p className="text-[9px] text-amber-600 font-mono">مرجع: {activeDecree.id}</p>
            </div>

            <div className="py-4 space-y-3 font-sans text-right">
              <h5 className="font-extrabold text-xs text-amber-800">{activeDecree.title}</h5>
              <p className="text-xs text-slate-800 leading-relaxed font-semibold p-4.5 bg-amber-50/90 border border-amber-200 rounded-xl whitespace-pre-line">
                {activeDecree.body}
              </p>
              <span className="text-[10px] text-slate-500 block">تاريخ الإصدار والتعميم المعتمد: {activeDecree.date}</span>
            </div>

            <div className="flex justify-end pt-2">
              {/* Simulated seal */}
              <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 text-amber-600/30 font-black text-[9px] flex items-center justify-center border-dashed">
                خاتم الأركان
              </div>
            </div>

            <button 
              onClick={() => setActiveDecree(null)}
              className="w-full mt-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              مفهوم ومؤكد
            </button>
          </div>
        </div>
      )}

      {/* Launcher Overview Modal */}
      <AnimatePresence>
        {selectedLauncherInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setSelectedLauncherInfo(null)}
            />
            
            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-3.5 sm:p-5 w-full max-w-lg relative z-10 text-right font-sans my-auto max-h-[88vh] flex flex-col overflow-hidden"
              dir="rtl"
            >
              {/* Sticky Badge & Close Header */}
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0 bg-white z-20">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider
                  ${selectedLauncherInfo.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' :
                    selectedLauncherInfo.color === 'sky' ? 'bg-sky-50 text-sky-700 border-sky-100/50' :
                    selectedLauncherInfo.color === 'teal' ? 'bg-teal-50 text-teal-700 border-teal-100/50' :
                    selectedLauncherInfo.color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-100/50' :
                    selectedLauncherInfo.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-100/50' :
                    selectedLauncherInfo.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100/50' :
                    selectedLauncherInfo.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-100/50' :
                    'bg-orange-50 text-orange-700 border-orange-100/50'
                  }
                `}>
                  {selectedLauncherInfo.badge}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLauncherInfo(null)}
                  className="px-2.5 py-1 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-black shadow-2xs"
                  aria-label="إغلاق النافذة"
                >
                  <span>إغلاق ✖</span>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body Content */}
              <div className="overflow-y-auto pr-1 pl-1 py-3 flex-1 space-y-3.5 custom-scrollbar touch-pan-y">
                {/* Header Info */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 shadow-xs
                    ${selectedLauncherInfo.color === 'emerald' ? 'bg-emerald-50 border-emerald-100/50 text-emerald-600' :
                      selectedLauncherInfo.color === 'sky' ? 'bg-sky-50 border-sky-100/50 text-sky-600' :
                      selectedLauncherInfo.color === 'teal' ? 'bg-teal-50 border-teal-100/50 text-teal-600' :
                      selectedLauncherInfo.color === 'rose' ? 'bg-rose-50 border-rose-100/50 text-rose-600' :
                      selectedLauncherInfo.color === 'purple' ? 'bg-purple-50 border-purple-100/50 text-purple-600' :
                      selectedLauncherInfo.color === 'amber' ? 'bg-amber-50 border-amber-100/50 text-amber-600' :
                      selectedLauncherInfo.color === 'indigo' ? 'bg-indigo-50 border-indigo-100/50 text-indigo-600' :
                      'bg-orange-50 border-orange-100/50 text-orange-600'
                    }
                  `}>
                    {selectedLauncherInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      {selectedLauncherInfo.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed font-semibold">
                      {selectedLauncherInfo.description}
                    </p>
                  </div>
                </div>

                {/* Live Statistics Section depending on selected launcher item */}
                <div className="border-t border-slate-100 pt-3 space-y-3 font-sans">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-teal-850 uppercase tracking-wider bg-teal-50/80 border border-teal-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      إحصائيات ومؤشرات حية (انقر على أي رقم للتفاصيل 🔍)
                    </h4>
                  </div>

                {selectedLauncherInfo.id === 'attendance' && (
                  <div className="space-y-4">
                    {/* Live Target Date Selector Bar */}
                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-black text-slate-800">تاريخ دفتر الحضور:</span>
                        <input
                          type="date"
                          value={selectedDailyDate || latestDate}
                          onChange={(e) => setSelectedDailyDate(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDailyDate(new Date().toISOString().split('T')[0])}
                          className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-800 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          اليوم 🟢
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setSelectedDailyDate(d.toISOString().split('T')[0]);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          الأمس ⏪
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDailyDatePickerModal(true)}
                          className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>سجل التواريخ 📅</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Status Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* 1. Present Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('ح', 'الحاضرون فعلياً بالمنظومة', 'emerald')}
                        className="bg-emerald-50/90 hover:bg-emerald-100 border-2 border-emerald-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-emerald-900 group-hover:underline">حاضرون فعلياً 🟢</span>
                          <span className="text-[9px] bg-emerald-200/60 text-emerald-950 font-mono font-bold px-1.5 py-0.5 rounded">
                            {launcherLiveStats.attendance.attPresentRate}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-emerald-950 font-mono">{launcherLiveStats.attendance.attPresent}</span>
                          <span className="text-[10px] font-bold text-emerald-800">مقاتل 🔍</span>
                        </div>
                      </button>

                      {/* 2. Absent Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('غ', 'المتغيبون بدون عذر رسمي', 'rose')}
                        className="bg-rose-50/90 hover:bg-rose-100 border-2 border-rose-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-rose-900 group-hover:underline">غائبون دون عذر 🔴</span>
                          <span className="text-[9px] bg-rose-200/60 text-rose-950 font-mono font-bold px-1.5 py-0.5 rounded">
                            تنبيه غياب
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-rose-950 font-mono">{launcherLiveStats.attendance.attAbsent}</span>
                          <span className="text-[10px] font-bold text-rose-800">مقاتل 🔍</span>
                        </div>
                      </button>

                      {/* 3. Leave Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('إ', 'القوة الممنوحة إجازات رسمية', 'blue')}
                        className="bg-blue-50/90 hover:bg-blue-100 border-2 border-blue-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-blue-900 group-hover:underline">إجازات رسمية 🔵</span>
                          <span className="text-[9px] bg-blue-200/60 text-blue-950 font-mono font-bold px-1.5 py-0.5 rounded">
                            إجازة
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-blue-950 font-mono">{launcherLiveStats.attendance.attLeave}</span>
                          <span className="text-[10px] font-bold text-blue-800">مقاتل 🔍</span>
                        </div>
                      </button>

                      {/* 4. Mission Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('م', 'القوة المكلفة بمهام ومأموريات', 'purple')}
                        className="bg-purple-50/90 hover:bg-purple-100 border-2 border-purple-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-purple-900 group-hover:underline">مهام ومأموريات 🟣</span>
                          <span className="text-[9px] bg-purple-200/60 text-purple-950 font-mono font-bold px-1.5 py-0.5 rounded">
                            مهمة
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-purple-950 font-mono">{launcherLiveStats.attendance.attMission}</span>
                          <span className="text-[10px] font-bold text-purple-800">مقاتل 🔍</span>
                        </div>
                      </button>

                      {/* 5. Excused/Medical Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('ع', 'حالات الغياب المبرر والمرضية', 'amber')}
                        className="bg-amber-50/90 hover:bg-amber-100 border-2 border-amber-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-amber-900 group-hover:underline">غياب بعذر / طبي 🟡</span>
                          <span className="text-[9px] bg-amber-200/60 text-amber-950 font-mono font-bold px-1.5 py-0.5 rounded">
                            مبرر
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-amber-950 font-mono">{launcherLiveStats.attendance.attExcused}</span>
                          <span className="text-[10px] font-bold text-amber-800">مقاتل 🔍</span>
                        </div>
                      </button>

                      {/* 6. Pending / Unrecorded Card */}
                      <button 
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('pending', 'الأفراد الذين لم يتم تحضيرهم بعد لهذا اليوم', 'orange')}
                        className="bg-orange-50/90 hover:bg-orange-100 border-2 border-orange-300 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-right group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold text-orange-900 group-hover:underline">لم يتم تحضيرهم ⏳</span>
                          <span className="text-[9px] bg-orange-200/60 text-orange-950 font-mono font-bold px-1.5 py-0.5 rounded animate-pulse">
                            قيد التحضير
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl font-black text-orange-950 font-mono">{launcherLiveStats.attendance.attUnrecorded}</span>
                          <span className="text-[10px] font-bold text-orange-800">مقاتل 🔍</span>
                        </div>
                      </button>
                    </div>

                    {/* Overall Field Readiness Progress */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-600 font-extrabold">
                        <span>معدل الجاهزية والتواجد الميداني الكلي للواء:</span>
                        <span className="text-teal-900 font-black font-mono text-xs">{launcherLiveStats.attendance.attReadinessRate}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div 
                          className="h-full bg-linear-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500" 
                          style={{ width: `${launcherLiveStats.attendance.attReadinessRate}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold pt-1">
                        <span>إجمالي القوة البشرية: <strong className="text-slate-800">{launcherLiveStats.attendance.attTotal}</strong> منتسب</span>
                        <span className="text-amber-800 font-black">لم يُحضروا: {launcherLiveStats.attendance.attUnrecorded}</span>
                        <span className="text-rose-800 font-black">غائبون: {launcherLiveStats.attendance.attAbsent}</span>
                      </div>
                    </div>

                    {/* Unit Breakdown Interactive List */}
                    {launcherLiveStats.attendance.attUnitBreakdown && launcherLiveStats.attendance.attUnitBreakdown.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2">
                        <span className="text-[10px] font-black text-slate-700 block mb-1">
                          توزيع الحضور والجاهزية حسب التشكيلات والكتائب (اضغط للفلترة السريعة):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {launcherLiveStats.attendance.attUnitBreakdown.slice(0, 4).map((u) => (
                            <button
                              type="button"
                              key={u.unitId}
                              onClick={() => handleOpenAttendanceDrillDown('all', `حضور ${u.unitName}`, 'teal', u.unitId)}
                              className="bg-white hover:bg-teal-50/80 border border-slate-200 hover:border-teal-300 p-2 rounded-xl text-right transition-all cursor-pointer flex justify-between items-center group"
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] font-black text-slate-900 block truncate group-hover:text-teal-900">
                                  {u.unitName}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold">
                                  حاضر: <strong className="text-emerald-700">{u.h}</strong> / إجمالي: {u.total}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                                {u.rate}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {launcherLiveStats.attendance.attUnrecorded > 0 && (
                        <button
                          type="button"
                          onClick={handleBatchMarkPendingAsPresent}
                          className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <span>تحضير المتبقي ({launcherLiveStats.attendance.attUnrecorded}) بـ "حاضر" ⚡</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleOpenAttendanceDrillDown('all', 'إجمالي التحضير والتواجد الميداني الشامل', 'teal')}
                        className="px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 mr-auto"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>عرض كشف التحضير والتواجد الكلي 🔍</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'soldiers' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <button 
                        onClick={() => handleOpenSoldierCategoryDrillDown('officers', 'الضباط (القادة)', 'sky')}
                        className="bg-sky-50 hover:bg-sky-100/80 border border-sky-200/80 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xs group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-sky-800 block font-bold group-hover:underline">الضباط (القادة) 🔍</span>
                        <span className="text-sm font-black text-sky-950 block mt-0.5">{launcherLiveStats.soldiers.sOfficers} ضابط</span>
                      </button>
                      <button 
                        onClick={() => handleOpenSoldierCategoryDrillDown('ncos', 'ضباط الصف (NCO)', 'teal')}
                        className="bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xs group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-teal-850 block font-bold group-hover:underline">ضباط الصف (NCO) 🔍</span>
                        <span className="text-sm font-black text-teal-950 block mt-0.5">{launcherLiveStats.soldiers.sNCOs} صف ضابط</span>
                      </button>
                      <button 
                        onClick={() => handleOpenSoldierCategoryDrillDown('soldiers', 'الجنود المقاتلين', 'slate')}
                        className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xs group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-slate-700 block font-bold group-hover:underline">الجنود المقاتلين 🔍</span>
                        <span className="text-sm font-black text-slate-900 block mt-0.5">{launcherLiveStats.soldiers.sSoldiers} جندي</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-right">
                      <span className="text-[10px] text-slate-500 block font-bold mb-1.5">أبرز الاختصاصات والعهد العسكرية النشطة (انقر للتصفية):</span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {launcherLiveStats.soldiers.sTopSpecializations.length > 0 ? (
                          launcherLiveStats.soldiers.sTopSpecializations.map((spec, i) => (
                            <button 
                              key={i} 
                              onClick={() => handleOpenSoldierCategoryDrillDown(spec.split(' ')[0], `اختصاص: ${spec}`, 'sky')}
                              className="bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-all hover:scale-105"
                            >
                              {spec} 🔍
                            </button>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400">لا يوجد اختصاصات مسجلة</span>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenSoldierCategoryDrillDown('all', 'كافة المنتسبين النشطين بالخدمة', 'teal')}
                      className="w-full bg-teal-50/60 hover:bg-teal-100/70 border border-teal-200 p-2.5 rounded-xl text-[10px] text-teal-900 flex justify-between items-center cursor-pointer transition-all hover:shadow-xs group"
                    >
                      <span className="font-bold group-hover:underline">عرض كافة القوة المسجلة بالخدمة التكتيكية حالياً 🔍</span>
                      <span className="font-black font-mono text-xs bg-white px-2 py-0.5 rounded border border-teal-200">{launcherLiveStats.soldiers.sTotal} فرد نشط</span>
                    </button>
                  </div>
                )}

                {selectedLauncherInfo.id === 'structure' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <button 
                        onClick={() => handleOpenUnitsDrillDown('all', 'كافة التشكيلات والوحدات', 'teal')}
                        className="bg-teal-50 hover:bg-teal-100/80 border border-teal-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-teal-850 block font-bold group-hover:underline">إجمالي التشكيلات 🔍</span>
                        <span className="text-sm font-black text-teal-950 block mt-0.5">{launcherLiveStats.structure.uTotal} تشكيلات</span>
                      </button>
                      <button 
                        onClick={() => handleOpenUnitsDrillDown('bn', 'كتائب اللواء العسكرية', 'emerald')}
                        className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-emerald-850 block font-bold group-hover:underline">عدد الكتائب 🔍</span>
                        <span className="text-sm font-black text-emerald-950 block mt-0.5">{launcherLiveStats.structure.uBattalions} كتيبة</span>
                      </button>
                      <button 
                        onClick={() => handleOpenUnitsDrillDown('co', 'سرايا اللواء الميدانية', 'sky')}
                        className="bg-sky-50 hover:bg-sky-100/80 border border-sky-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-sky-800 block font-bold group-hover:underline">عدد السرايا 🔍</span>
                        <span className="text-sm font-black text-sky-950 block mt-0.5">{launcherLiveStats.structure.uCompanies} سرية</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-right">
                      <span className="text-[10px] text-slate-500 block font-bold mb-1.5">التسلسل الهرمي للوحدات:</span>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                        موزع على {launcherLiveStats.structure.uBattalions} كتيبة و {launcherLiveStats.structure.uCompanies} سرية و {launcherLiveStats.structure.uPlatoons} فصيلة متكاملة لتسهيل عمليات التحضير والإسناد الهيكلي.
                      </p>
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'units_readiness' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <button 
                        onClick={() => handleOpenReadinessDrillDown('all', 'جاهزية كافة الوحدات الميدانية', 'emerald')}
                        className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-emerald-850 block font-bold group-hover:underline">متوسط الجاهزية 🔍</span>
                        <span className="text-sm font-black text-emerald-950 block mt-0.5">{launcherLiveStats.readiness.rAvgRate}%</span>
                      </button>
                      <button 
                        onClick={() => handleOpenReadinessDrillDown('high', 'الوحدات ذات الجاهزية العالية (75%+)', 'blue')}
                        className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-blue-800 block font-bold group-hover:underline">جاهزية عالية 🔍</span>
                        <span className="text-sm font-black text-blue-950 block mt-0.5">{launcherLiveStats.readiness.rHigh} وحدات</span>
                      </button>
                      <button 
                        onClick={() => handleOpenReadinessDrillDown('critical', 'الوحدات تحت المراقبة الاستراتيجية', 'rose')}
                        className="bg-rose-50 hover:bg-rose-100/80 border border-rose-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-rose-800 block font-bold group-hover:underline">تحت المراقبة 🔍</span>
                        <span className="text-sm font-black text-rose-950 block mt-0.5">{launcherLiveStats.readiness.rCritical} وحدات</span>
                      </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-right">
                      <span className="text-[10px] text-amber-800 block font-bold mb-1">الوضع الاستراتيجي لجهوزية اللواء:</span>
                      <p className="text-[10px] text-amber-950 leading-normal font-semibold">
                        {launcherLiveStats.readiness.rCritical > 0 
                          ? `تحذير: يوجد عدد ${launcherLiveStats.readiness.rCritical} وحدات تابعة للواء تقل نسبة جهوزيتها عن الحد القياسي المعتمد، يوصى بالتحقق السريع وإعادة الإسناد البشري.`
                          : 'كافة الوحدات والكتائب الميدانية تسجل مستويات استنفار ممتازة وضمن النطاقات الخضراء المعتمدة من قيادة لواء العمليات.'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'ops_center' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <button 
                        onClick={() => handleOpenOpsDrillDown('all', 'إجمالي الطلبات المعلقة المعالجة', 'rose')}
                        className="bg-rose-50 hover:bg-rose-100/80 border border-rose-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-rose-800 block font-bold group-hover:underline">الطلبات المعلقة 🔍</span>
                        <span className="text-sm font-black text-rose-950 block mt-0.5">{launcherLiveStats.ops.opPending} طلبات</span>
                      </button>
                      <button 
                        onClick={() => handleOpenOpsDrillDown('leave', 'طلبات الإجازات الميدانية المعلقة', 'blue')}
                        className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-blue-800 block font-bold group-hover:underline">طلبات الإجازات 🔍</span>
                        <span className="text-sm font-black text-blue-950 block mt-0.5">{launcherLiveStats.ops.opLeavesPending} معلق</span>
                      </button>
                      <button 
                        onClick={() => handleOpenOpsDrillDown('mission', 'طلبات المأموريات والتكاليف', 'purple')}
                        className="bg-purple-50 hover:bg-purple-100/80 border border-purple-200 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-purple-800 block font-bold group-hover:underline">طلبات المأموريات 🔍</span>
                        <span className="text-sm font-black text-purple-950 block mt-0.5">{launcherLiveStats.ops.opMissionsPending} معلق</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[10px] text-slate-700 flex justify-between items-center">
                      <span className="font-bold">حالة مركز السيطرة وحركات اللواء اليوم:</span>
                      <span className="font-black text-emerald-700">مستقرة ونشطة 🟢</span>
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'transfer' && (
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleOpenAuditDrillDown('all', 'سجل أوامر ونقل الأفراد التكتيكية', 'purple')}
                      className="w-full bg-purple-50 hover:bg-purple-100/80 border border-purple-200 p-4 rounded-xl text-center cursor-pointer transition-all hover:shadow-xs group"
                    >
                      <span className="text-[11px] text-purple-800 block font-bold mb-1 group-hover:underline">التبديل وإعادة التوزيع البشري (اضغط لعرض السجل) 🔍</span>
                      <span className="text-2xl font-black text-purple-950 block">{launcherLiveStats.transfers.tTotalLogs} أوامر نقل</span>
                      <span className="text-[9px] text-purple-600 mt-1 block font-semibold">إجمالي عمليات التوجيه وتعديل ملاك المنتسبين المسجلة تراكمياً بسجل الرقابة</span>
                    </button>

                    <p className="text-[10px] text-slate-500 leading-relaxed text-right font-semibold">
                      يسمح هذا القسم للقادة والضباط بإجراء تنقلات فورية لعناصر القوة وسد النقص فصيلياً أو للكتائب، مع المزامنة الفورية لدفتري التحضير والرواتب العسكرية والخدمة الميدانية.
                    </p>
                  </div>
                )}

                {selectedLauncherInfo.id === 'reports' && (
                  <div className="space-y-4 text-right font-sans">
                    {/* Option 1: Daily Report Card */}
                    <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/40 border-2 border-amber-300 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-amber-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-amber-600" />
                          <h5 className="font-extrabold text-sm text-amber-950">التقرير اليومي (مستوى اليوم المحدد)</h5>
                        </div>
                        <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                          تحديد اليوم 📅
                        </span>
                      </div>

                      <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
                        تقرير الجاهزية والتواجد الميداني لليوم المحدد، يشمل إحصائيات الحضور، الإجازات، المهمات، وحالات الغياب بكل التفاصيل والمستويات الميدانية.
                      </p>

                      {/* Date Selector & Popup Picker Action */}
                      <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>تاريخ التقرير اليومي المحدد:</span>
                          <span className="font-mono text-amber-900 font-black text-xs bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">{selectedDailyDate || latestDate}</span>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center pt-1">
                          <input
                            type="date"
                            value={selectedDailyDate || latestDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            className="w-full sm:w-auto flex-1 bg-amber-50/60 border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-black font-mono text-slate-800 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs"
                          />

                          <button
                            type="button"
                            onClick={() => setShowDailyDatePickerModal(true)}
                            className="w-full sm:w-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>تغيير اليوم (شاشة منبثقة) 📅</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          generateReportPreview('daily_periodic');
                          setSelectedLauncherInfo(null);
                        }}
                        className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>عرض التقرير اليومي لليوم المحدد 📄</span>
                      </button>
                    </div>

                    {/* Option 2: Monthly Report Card */}
                    <div className="bg-gradient-to-br from-blue-50/90 to-sky-100/40 border-2 border-blue-300 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-blue-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <CalendarRange className="w-5 h-5 text-blue-600" />
                          <h5 className="font-extrabold text-sm text-blue-950">التقرير الشهري (البيانات كاملة)</h5>
                        </div>
                        <span className="bg-blue-200/80 text-blue-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-300">
                          تقرير شامل 🗓️
                        </span>
                      </div>

                      <p className="text-[11px] text-blue-900 font-semibold leading-relaxed">
                        تقرير المؤشرات التراكمية الشهري الشامل بحجم البيانات الكاملاً. يتضمن متوسط الجاهزية الشهري، مصفوفة انضباط وجاهزية التشكيلات، ونسب السيطرة.
                      </p>

                      {/* Month & Year Selection Bar */}
                      <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>الشهر:</span>
                          <select
                            value={selectedMonthlyMonth}
                            onChange={(e) => setSelectedMonthlyMonth(e.target.value)}
                            className="bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 text-xs font-black text-blue-950 font-mono focus:outline-none cursor-pointer"
                          >
                            {MONTHS_LIST.map(m => (
                              <option key={m.value} value={m.value}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span>السنة:</span>
                          <select
                            value={selectedMonthlyYear}
                            onChange={(e) => setSelectedMonthlyYear(e.target.value)}
                            className="bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 font-mono focus:outline-none cursor-pointer"
                          >
                            <option value="2026">٢٠٢٦ م</option>
                            <option value="2025">٢٠٢٥ م</option>
                          </select>
                        </div>
                      </div>

                      {/* Monthly Summary Badges */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100">
                          <span className="text-slate-500 block">متوسط الجاهزية</span>
                          <span className="text-xs font-black text-blue-900 font-mono">{monthlyReportStats.avgMonthlyReadinessRate}%</span>
                        </div>
                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100">
                          <span className="text-slate-500 block">الأيام المحسوبة</span>
                          <span className="text-xs font-black text-blue-900 font-mono">{monthlyReportStats.totalDaysRecorded} يوم</span>
                        </div>
                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100">
                          <span className="text-slate-500 block">إجمالي الغياب</span>
                          <span className="text-xs font-black text-rose-700 font-mono">{monthlyReportStats.totalG} حالة</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          generateReportPreview('monthly_periodic');
                          setSelectedLauncherInfo(null);
                        }}
                        className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>عرض التقرير الشهري الشامل (كافة البيانات كاملة) 📊</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'audit' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <button 
                        onClick={() => handleOpenAuditDrillDown('all', 'سجل الرقابة والعمليات الكامل', 'indigo')}
                        className="bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 p-2 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-slate-600 block font-bold group-hover:underline">الكل 🔍</span>
                        <span className="text-xs font-black text-indigo-950 block mt-0.5">{launcherLiveStats.audit.logTotal}</span>
                      </button>
                      <button 
                        onClick={() => handleOpenAuditDrillDown('إضافة', 'سجل عمليات الإضافة الموثقة', 'emerald')}
                        className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 p-2 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-emerald-800 block font-bold group-hover:underline">إضافة 🔍</span>
                        <span className="text-xs font-black text-emerald-950 block mt-0.5">{launcherLiveStats.audit.logAdd}</span>
                      </button>
                      <button 
                        onClick={() => handleOpenAuditDrillDown('تعديل', 'سجل عمليات التعديل الموثقة', 'amber')}
                        className="bg-amber-50 hover:bg-amber-100/80 border border-amber-200 p-2 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-amber-800 block font-bold group-hover:underline">تعديل 🔍</span>
                        <span className="text-xs font-black text-amber-950 block mt-0.5">{launcherLiveStats.audit.logEdit}</span>
                      </button>
                      <button 
                        onClick={() => handleOpenAuditDrillDown('حذف', 'سجل عمليات الحذف والتنظيف', 'rose')}
                        className="bg-rose-50 hover:bg-rose-100/80 border border-rose-200 p-2 rounded-xl cursor-pointer transition-all hover:scale-[1.03] group text-right sm:text-center"
                      >
                        <span className="text-rose-800 block font-bold group-hover:underline">حذف 🔍</span>
                        <span className="text-xs font-black text-rose-950 block mt-0.5">{launcherLiveStats.audit.logDelete}</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-right space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>المشغل الأكثر نشاطاً اليوم:</span>
                        <span className="text-slate-800 font-black">{launcherLiveStats.audit.logMostActive}</span>
                      </div>
                      {launcherLiveStats.audit.logLatest && (
                        <div className="border-t border-slate-200/80 pt-1.5 mt-1.5">
                          <span className="text-[9px] text-slate-400 block font-bold">آخر إجراء مسجل وموثق أمنياً:</span>
                          <p className="text-[10px] text-indigo-900 leading-tight font-black mt-0.5 bg-indigo-50/30 p-2 rounded border border-indigo-100/40">
                            {launcherLiveStats.audit.logLatest.userName}: {launcherLiveStats.audit.logLatest.details}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedLauncherInfo.id === 'iam' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <button 
                        onClick={() => handleOpenIAMDrillDown('all', 'إجمالي كافة حسابات المنظومة', 'orange')}
                        className="bg-orange-50 hover:bg-orange-100/80 border border-orange-200 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-orange-800 block font-bold group-hover:underline">إجمالي المستخدمين 🔍</span>
                        <span className="text-lg font-black text-orange-950 block mt-0.5">{launcherLiveStats.iam.iamTotal} مستخدمين</span>
                      </button>
                      <button 
                        onClick={() => handleOpenIAMDrillDown('admin', 'حسابات المشرفين ومدراء النظام', 'slate')}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] group text-right sm:text-center"
                      >
                        <span className="text-[10px] text-slate-700 block font-bold group-hover:underline">مدراء النظام (Admins) 🔍</span>
                        <span className="text-lg font-black text-slate-900 block mt-0.5">{launcherLiveStats.iam.iamAdmins} مشرف</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-right">
                      <span className="text-[10px] text-slate-500 block font-bold mb-1.5">توزيع صلاحيات رتب لواء المشاة (انقر للتصفية):</span>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600 font-black">
                        <button 
                          onClick={() => handleOpenIAMDrillDown('commander', 'حسابات قيادة التشكيلات والكتائب', 'amber')}
                          className="bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 p-1.5 rounded cursor-pointer transition-all"
                        >
                          <span>قيادة ({launcherLiveStats.iam.iamCommanders}) 🔍</span>
                        </button>
                        <button 
                          onClick={() => handleOpenIAMDrillDown('operations', 'حسابات أركان العمليات', 'blue')}
                          className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-1.5 rounded cursor-pointer transition-all"
                        >
                          <span>عمليات ({launcherLiveStats.iam.iamOperations}) 🔍</span>
                        </button>
                        <button 
                          onClick={() => handleOpenIAMDrillDown('writer', 'حسابات مدخلي البيانات والكتاب', 'emerald')}
                          className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-1.5 rounded cursor-pointer transition-all"
                        >
                          <span>كُتاب ({launcherLiveStats.iam.iamWriters}) 🔍</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-[9px] text-orange-850 flex justify-between items-center">
                      <span className="font-bold">بروتوكول التحقق الثنائي العسكري (2FA):</span>
                      <span className="font-black text-emerald-700">نشط وإلزامي 🔐</span>
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100 shrink-0 bg-white z-20">
                <button
                  type="button"
                  onClick={() => setSelectedLauncherInfo(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer border border-slate-200 shadow-2xs"
                >
                  إغلاق النافذة (خروج) ✖
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedLauncherInfo.onConfirm();
                    setSelectedLauncherInfo(null);
                  }}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 border border-transparent
                    ${selectedLauncherInfo.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      selectedLauncherInfo.color === 'sky' ? 'bg-sky-600 hover:bg-sky-700' :
                      selectedLauncherInfo.color === 'teal' ? 'bg-teal-600 hover:bg-teal-700' :
                      selectedLauncherInfo.color === 'rose' ? 'bg-rose-600 hover:bg-rose-700' :
                      selectedLauncherInfo.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                      selectedLauncherInfo.color === 'amber' ? 'bg-amber-600 hover:bg-amber-700' :
                      selectedLauncherInfo.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
                      'bg-orange-600 hover:bg-orange-700'
                    }
                  `}
                >
                  <span>الذهاب إلى القسم</span>
                  <ChevronLeft className="w-4 h-4 animate-pulse" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live System Drill-Down Modal */}
      <AnimatePresence>
        {drillDownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
              onClick={() => {
                setDrillDownModal(null);
                setDrillDownStatusFilter('all');
              }}
            />

            {/* Drill Down Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-[96vw] max-w-4xl relative z-20 text-right overflow-hidden font-sans flex flex-col max-h-[94vh] my-auto"
              dir="rtl"
            >
              {/* Mobile pull indicator */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

              {/* Header */}
              <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border uppercase tracking-wider ${
                      drillDownModal.color === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      drillDownModal.color === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      drillDownModal.color === 'blue' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      drillDownModal.color === 'purple' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      drillDownModal.color === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      drillDownModal.color === 'indigo' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                      drillDownModal.color === 'orange' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                      'bg-teal-50 text-teal-800 border-teal-200'
                    }`}>
                      {filteredDrillDownItems.length} من أصل {drillDownModal.count} سجل بالمنظومة
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      LIVE DRILL-DOWN VIEW
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Search className="w-5 h-5 text-teal-600" />
                    <span>{drillDownModal.title}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                    معلومات لحظية مباشرة — اضغط على أي عنصر لفتح نافذة التفاصيل العميقة
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportDrillDownCSV}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="تصدير الكشف الفوري كملف CSV"
                  >
                    <Download className="w-4 h-4 text-teal-600" />
                    <span className="hidden sm:inline">تصدير CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="طباعة كشف البيانات الحية"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                    <span className="hidden sm:inline">طباعة الكشف</span>
                  </button>
                  <button
                    onClick={() => {
                      setDrillDownModal(null);
                      setDrillDownStatusFilter('all');
                    }}
                    className="p-2 px-3 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="إغلاق النافذة"
                  >
                    <X className="w-5 h-5" />
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>

              {/* Status Filters & Search Bar */}
              <div className="my-3 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={drillDownSearch}
                    onChange={(e) => setDrillDownSearch(e.target.value)}
                    placeholder="ابحث بالاسم، الرقم العسكري، الرتبة، الاختصاص، أو التشكيل..."
                    className="w-full pl-8 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all min-h-[46px]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  {drillDownSearch && (
                    <button
                      onClick={() => setDrillDownSearch('')}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Soldier Specific Status Filter Pills */}
                {drillDownModal.type === 'soldiers' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-500 ml-1">تصفية حسب الحالة:</span>
                    {[
                      { code: 'all', label: 'الكل' },
                      { code: 'pending', label: 'لم يتم تحضيرهم ⏳' },
                      { code: 'غ', label: 'غائب 🔴' },
                      { code: 'ح', label: 'حاضر 🟢' },
                      { code: 'إ', label: 'إجازة 🔵' },
                      { code: 'م', label: 'مهمة 🟣' },
                      { code: 'ع', label: 'بعذر 🟡' },
                      { code: 'ن', label: 'نصف دوام ⚪' },
                    ].map(f => (
                      <button
                        key={f.code}
                        onClick={() => setDrillDownStatusFilter(f.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer min-h-[38px] ${
                          drillDownStatusFilter === f.code
                            ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Scrollable Content */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pl-1 py-1 max-h-[55vh] scrollbar-thin">
                {filteredDrillDownItems.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 my-2">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">لا توجد سجلات مطابقة للبحث أو لتصفية الحالة حالياً</p>
                    <p className="text-[10px] text-slate-400 mt-1">جرب تغيير حالة التصفية أو إلغاء كلمة البحث</p>
                  </div>
                ) : (
                  filteredDrillDownItems.map((item: any, idx: number) => {
                    const isExpanded = expandedDrillDownId === (item.id || `item-${idx}`);

                    if (drillDownModal.type === 'soldiers') {
                      const statusBadge = 
                        item.statusCode === 'pending' || !item.statusCode ? { label: 'لم يتم التحضير بعد ⏳', cls: 'bg-amber-100 text-amber-900 border-amber-300 font-black' } :
                        item.statusCode === 'ح' ? { label: 'حاضر 🟢', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' } :
                        item.statusCode === 'غ' ? { label: 'غائب 🔴', cls: 'bg-rose-50 text-rose-800 border-rose-200' } :
                        item.statusCode === 'إ' ? { label: 'إجازة 🔵', cls: 'bg-blue-50 text-blue-800 border-blue-200' } :
                        item.statusCode === 'م' ? { label: 'مهمة 🟣', cls: 'bg-purple-50 text-purple-800 border-purple-200' } :
                        item.statusCode === 'ع' ? { label: 'بعذر 🟡', cls: 'bg-amber-50 text-amber-800 border-amber-200' } :
                        item.statusCode === 'ن' ? { label: 'نصف دوام ⚪', cls: 'bg-slate-100 text-slate-800 border-slate-200' } :
                        { label: item.militaryStatus || 'على رأس العمل', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };

                      return (
                        <div 
                          key={item.id || idx}
                          className="bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-teal-400 rounded-2xl p-3 transition-all duration-200 shadow-2xs group relative"
                        >
                          <div className="flex justify-between items-center gap-2">
                            <div 
                              onClick={() => setItemDetailModal({ type: 'soldier', item })}
                              className="flex items-center gap-3 cursor-pointer flex-1"
                            >
                              <div className="w-10 h-10 rounded-xl bg-teal-100/80 border border-teal-200 flex items-center justify-center font-black text-teal-900 text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                                {item.photoUrl || item.soldier?.photoUrl ? (
                                  <img src={item.photoUrl || item.soldier?.photoUrl} alt={item.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                ) : (
                                  item.rank ? item.rank.substring(0, 2) : 'ف'
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-teal-900 transition-colors flex items-center gap-1.5">
                                    <span>{item.rank} {item.fullName}</span>
                                    <span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200 group-hover:inline-block hidden">
                                      انقر للتفاصيل 🔍
                                    </span>
                                  </h4>
                                  <span className="text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                    #{item.militaryNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold">
                                  <span>التشكيل: <strong className="text-slate-700">{item.unitName}</strong></span>
                                  <span>الاختصاص: <strong className="text-slate-700">{item.specialization}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                              
                              <button
                                onClick={() => setItemDetailModal({ type: 'soldier', item })}
                                className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                title="عرض نافذة التفاصيل الشاملة"
                              >
                                <Eye className="w-3 h-3" />
                                <span>التفاصيل</span>
                              </button>

                              <button
                                onClick={() => setExpandedDrillDownId(isExpanded ? null : (item.id || `item-${idx}`))}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all text-[10px] font-bold cursor-pointer"
                                title="خيارات سريعة"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Detailed View & Quick Status Toggle */}
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 pt-3 border-t border-slate-200/80 bg-white p-3 rounded-xl border border-slate-100 space-y-3"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                                <div>
                                  <span className="text-slate-400 block font-bold">رقم الهاتف:</span>
                                  <span className="font-extrabold text-slate-800">{item.phoneNumber}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold">فصيلة الدم:</span>
                                  <span className="font-extrabold text-rose-700">{item.bloodType}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold">الحالة العسكرية:</span>
                                  <span className="font-extrabold text-slate-800">{item.militaryStatus}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold">حالة اليوم الرسمية:</span>
                                  <span className="font-extrabold text-teal-800">{statusBadge.label}</span>
                                </div>
                              </div>

                              {/* Quick Status Change Switcher */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-extrabold text-slate-500">تغيير الحالة المباشرة الآن:</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { code: 'ح', label: 'حاضر 🟢' },
                                    { code: 'غ', label: 'غائب 🔴' },
                                    { code: 'إ', label: 'إجازة 🔵' },
                                    { code: 'م', label: 'مهمة 🟣' },
                                    { code: 'ع', label: 'بعذر 🟡' },
                                  ].map(s => (
                                    <button
                                      key={s.code}
                                      onClick={() => handleInlineStatusChange(item.id, s.code as AttendanceStatusCode)}
                                      className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer ${
                                        item.statusCode === s.code
                                          ? 'bg-slate-900 text-white border-slate-900'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    }

                    if (drillDownModal.type === 'units') {
                      return (
                        <div 
                          key={item.id || idx}
                          onClick={() => setItemDetailModal({ type: 'unit', item })}
                          className="bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-emerald-400 rounded-2xl p-3 transition-all duration-200 shadow-2xs cursor-pointer group"
                        >
                          <div className="flex justify-between items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-900 transition-colors">
                                  {item.unitName}
                                </h4>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {item.type}
                                </span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 group-hover:inline-block hidden">
                                  معاينة التشكيل 🔍
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-bold">
                                <span>القائد المسؤول: <strong className="text-slate-800">{item.commanderName}</strong></span>
                                {item.location && <span>الموقع: <strong className="text-slate-800">{item.location}</strong></span>}
                              </div>
                            </div>

                            <div className="text-left shrink-0">
                              {item.readinessRate !== undefined ? (
                                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border block ${
                                  item.readinessRate >= 75 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  جاهزية {item.readinessRate}%
                                </span>
                              ) : (
                                <span className="text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl block">
                                  القوة: {item.activeStrength} فرد
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 mt-1 block font-bold">
                                الملاك: {item.activeStrength} / {item.approvedStrength || item.activeStrength}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (drillDownModal.type === 'approvals') {
                      return (
                        <div 
                          key={item.id || idx}
                          className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 transition-all duration-200 shadow-2xs flex justify-between items-center gap-2 group"
                        >
                          <div 
                            onClick={() => setItemDetailModal({ type: 'approval', item })}
                            className="cursor-pointer flex-1"
                          >
                            <div className="flex items-center gap-2">
                              <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                              <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-rose-900 transition-colors">
                                {item.name}
                              </h4>
                              <span className="text-[9px] font-bold text-rose-800 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                                {item.type}
                              </span>
                              <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200 group-hover:inline-block hidden">
                                تفاصيل الطلب 🔍
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">
                              التشكيل: {item.unit} | المدة المطلوبة: {item.duration} | التاريخ: {item.date}
                            </p>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setItemDetailModal({ type: 'approval', item })}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              معاينة 🔍
                            </button>
                            <button
                              onClick={() => {
                                handleApprovalAction(item.id, item.name, item.type, true);
                                setDrillDownModal(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : null);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              اعتماد 🟢
                            </button>
                            <button
                              onClick={() => {
                                handleApprovalAction(item.id, item.name, item.type, false);
                                setDrillDownModal(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : null);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              رفض 🔴
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (drillDownModal.type === 'audit') {
                      return (
                        <div 
                          key={item.id || idx}
                          onClick={() => setItemDetailModal({ type: 'audit', item })}
                          className="bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-amber-400 rounded-2xl p-3 transition-all duration-200 shadow-2xs cursor-pointer group"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-mono font-bold text-slate-400">{item.timestamp}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                              item.actionType === 'إضافة' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              item.actionType === 'تعديل' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {item.actionType} - {item.tableName}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 group-hover:text-amber-900 transition-colors flex items-center justify-between">
                            <span>المستخدم: {item.userName}</span>
                            <span className="text-[9px] text-amber-700 font-normal group-hover:inline-block hidden">تتبع السجل 🔍</span>
                          </h5>
                          <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed font-semibold">{item.details}</p>
                        </div>
                      );
                    }

                    if (drillDownModal.type === 'users') {
                      return (
                        <div 
                          key={item.id || idx}
                          onClick={() => setItemDetailModal({ type: 'user', item })}
                          className="bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-orange-400 rounded-2xl p-3 transition-all duration-200 shadow-2xs cursor-pointer flex justify-between items-center gap-2 group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                              <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-orange-900 transition-colors">
                                {item.name}
                              </h4>
                              <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                                @{item.username || item.id}
                              </span>
                              <span className="text-[9px] bg-orange-50 text-orange-700 px-1.5 py-0.2 rounded border border-orange-200 group-hover:inline-block hidden">
                                الصلاحيات 🔍
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">
                              البريد: {item.email} | النطاق: {item.unitId || 'صلاحيات شاملة للواء'}
                            </p>
                          </div>

                          <span className="text-[10px] font-black px-2.5 py-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg shrink-0">
                            {item.role === 'admin' ? 'مشرف عام' : item.role === 'operations' ? 'ركن عمليات' : item.role === 'data_writer' ? 'كاتب بيانات' : 'قائد وحدة'}
                          </span>
                        </div>
                      );
                    }

                    return null;
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-2">
                <span className="text-[10px] font-bold text-slate-400">
                  تطبيق بروتوكولات الأمان والرقابة العسكرية المباشرة v2.0
                </span>
                <button
                  onClick={() => {
                    setDrillDownModal(null);
                    setDrillDownStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deep Nested Item Detail Modal (نافذة التفاصيل العميقة للعنصر المحدد) */}
      <AnimatePresence>
        {itemDetailModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg"
              onClick={() => setItemDetailModal(null)}
            />

            {/* Deep Detail Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="bg-white rounded-3xl shadow-2xl border border-teal-200 p-4 sm:p-6 w-[96vw] max-w-2xl relative z-30 text-right overflow-hidden font-sans flex flex-col max-h-[92vh] my-auto"
              dir="rtl"
            >
              {/* Mobile pull handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-black text-base shadow-md shrink-0 overflow-hidden">
                    {itemDetailModal.type === 'soldier' && (itemDetailModal.item.photoUrl || itemDetailModal.item.soldier?.photoUrl) ? (
                      <img 
                        src={itemDetailModal.item.photoUrl || itemDetailModal.item.soldier?.photoUrl} 
                        alt={itemDetailModal.item.fullName} 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      itemDetailModal.type === 'soldier' ? '👤' :
                      itemDetailModal.type === 'unit' ? '🛡️' :
                      itemDetailModal.type === 'approval' ? '📜' :
                      itemDetailModal.type === 'audit' ? '🔍' : '🔒'
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
                      {itemDetailModal.type === 'soldier' ? 'السجل الفردي الكامل' :
                       itemDetailModal.type === 'unit' ? 'بيانات التشكيل العسكري' :
                       itemDetailModal.type === 'approval' ? 'تفاصيل المعاملة والاعتماد' :
                       itemDetailModal.type === 'audit' ? 'سجل التدقيق الأمني' : 'صلاحيات الحساب'}
                    </span>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 mt-1">
                      {itemDetailModal.type === 'soldier' ? `${itemDetailModal.item.rank} ${itemDetailModal.item.fullName}` :
                       itemDetailModal.type === 'unit' ? itemDetailModal.item.unitName :
                       itemDetailModal.type === 'approval' ? itemDetailModal.item.name :
                       itemDetailModal.type === 'audit' ? `سجل تدقيق #${itemDetailModal.item.id || 'LOG'}` :
                       itemDetailModal.item.name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setItemDetailModal(null)}
                  className="p-2 px-3 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                  title="إغلاق التفاصيل"
                >
                  <X className="w-5 h-5" />
                  <span>إغلاق</span>
                </button>
              </div>

              {/* Body Content according to item type */}
              <div className="my-4 overflow-y-auto space-y-4 pr-1 pl-1 flex-1 text-xs">
                {/* SOLDIER DETAIL VIEW */}
                {itemDetailModal.type === 'soldier' && (
                  <div className="space-y-4">
                    {/* Primary Info Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">الرقم العسكري الرسمي:</span>
                        <span className="font-mono font-black text-slate-900 text-sm">#{itemDetailModal.item.militaryNumber}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">التشكيل / الكتيبة:</span>
                        <span className="font-bold text-slate-900">{itemDetailModal.item.unitName}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">الاختصاص العسكري:</span>
                        <span className="font-bold text-slate-900">{itemDetailModal.item.specialization}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">فصيلة الدم / الاتصال:</span>
                        <span className="font-bold text-rose-700 ml-1">{itemDetailModal.item.bloodType}</span>
                        <span className="font-mono text-slate-600">({itemDetailModal.item.phoneNumber})</span>
                      </div>
                    </div>

                    {/* Today Status Selector */}
                    <div className="bg-teal-50/60 border border-teal-200/80 p-3.5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-teal-900 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          <span>الحالة الحالية لليوم (تحديث فوري):</span>
                        </span>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white border border-teal-300 text-teal-800">
                          {itemDetailModal.item.statusCode === 'ح' ? 'حاضر 🟢' :
                           itemDetailModal.item.statusCode === 'غ' ? 'غائب 🔴' :
                           itemDetailModal.item.statusCode === 'إ' ? 'إجازة 🔵' :
                           itemDetailModal.item.statusCode === 'م' ? 'مهمة 🟣' : 'بعذر 🟡'}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {[
                          { code: 'ح', label: 'حاضر', color: 'bg-emerald-600 hover:bg-emerald-700' },
                          { code: 'غ', label: 'غائب', color: 'bg-rose-600 hover:bg-rose-700' },
                          { code: 'إ', label: 'إجازة', color: 'bg-blue-600 hover:bg-blue-700' },
                          { code: 'م', label: 'مهمة', color: 'bg-purple-600 hover:bg-purple-700' },
                          { code: 'ع', label: 'بعذر', color: 'bg-amber-600 hover:bg-amber-700' },
                        ].map(st => (
                          <button
                            key={st.code}
                            onClick={() => handleInlineStatusChange(itemDetailModal.item.id, st.code as AttendanceStatusCode)}
                            className={`py-1.5 text-white font-extrabold rounded-xl text-[10px] transition-all cursor-pointer shadow-2xs ${st.color} ${
                              itemDetailModal.item.statusCode === st.code ? 'ring-2 ring-offset-1 ring-teal-600 scale-105' : 'opacity-80'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Attendance History Log for this soldier */}
                    <div className="space-y-2">
                      <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        <span>سجل الانضباط والتواجد للأيام السابقة:</span>
                      </h5>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
                        {attendance
                          .filter(a => a.soldierId === itemDetailModal.item.id)
                          .slice(-5)
                          .reverse()
                          .map((rec, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-100 last:border-0">
                              <span className="font-mono text-slate-500 font-bold">{rec.date}</span>
                              <span className="font-extrabold text-slate-800">
                                {rec.statusCode === 'ح' ? 'حاضر 🟢' : rec.statusCode === 'غ' ? 'غائب 🔴' : rec.statusCode === 'إ' ? 'إجازة 🔵' : 'مهمة 🟣'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* UNIT DETAIL VIEW */}
                {itemDetailModal.type === 'unit' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">القائد المسؤول:</span>
                        <span className="font-extrabold text-slate-900">{itemDetailModal.item.commanderName}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">معدل الجاهزية التكتيكية:</span>
                        <span className="font-black text-emerald-700 text-sm">{itemDetailModal.item.readinessRate || 92}%</span>
                      </div>
                    </div>

                    {/* Unit Personnel Roster */}
                    <div className="space-y-2">
                      <h5 className="font-extrabold text-slate-800 text-xs">قائمة المنتسبين إلى {itemDetailModal.item.unitName}:</h5>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                        {activeSoldiers
                          .filter(s => s.unitId === itemDetailModal.item.id)
                          .map(s => (
                            <div 
                              key={s.id}
                              onClick={() => setItemDetailModal({ type: 'soldier', item: s })}
                              className="bg-white hover:bg-teal-50 p-2 rounded-xl border border-slate-200/80 hover:border-teal-300 flex justify-between items-center cursor-pointer transition-all"
                            >
                              <div>
                                <span className="font-extrabold text-slate-900 text-[11px]">{s.rank} {s.fullName}</span>
                                <span className="text-[9px] font-mono text-slate-400 mr-2">#{s.militaryNumber}</span>
                              </div>
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                عرض السجل 🔍
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* APPROVAL DETAIL VIEW */}
                {itemDetailModal.type === 'approval' && (
                  <div className="space-y-4">
                    <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-rose-900">{itemDetailModal.item.name}</span>
                        <span className="bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          {itemDetailModal.item.type}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        الجهة المقدمة: <strong>{itemDetailModal.item.unit}</strong> | المدة المطلوبة: <strong>{itemDetailModal.item.duration}</strong>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 font-bold block text-[10px]">مسار السلسلة القيادية للاعتماد:</span>
                      <p className="text-slate-800 font-bold text-[11px]">
                        الكاتب الإداري ➔ قائد الكتيبة ➔ ركن العمليات ➔ تم التوجيه إلى قيادة اللواء
                      </p>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          handleApprovalAction(itemDetailModal.item.id, itemDetailModal.item.name, itemDetailModal.item.type, true);
                          setItemDetailModal(null);
                          setDrillDownModal(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemDetailModal.item.id) } : null);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-2xs"
                      >
                        اعتماد الطلب فوراً 🟢
                      </button>
                      <button
                        onClick={() => {
                          handleApprovalAction(itemDetailModal.item.id, itemDetailModal.item.name, itemDetailModal.item.type, false);
                          setItemDetailModal(null);
                          setDrillDownModal(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemDetailModal.item.id) } : null);
                        }}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-2xs"
                      >
                        رفض المعاملة 🔴
                      </button>
                    </div>
                  </div>
                )}

                {/* AUDIT LOG DETAIL VIEW */}
                {itemDetailModal.type === 'audit' && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 font-mono">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">معرف السجل:</span>
                        <span className="font-bold text-slate-800">{itemDetailModal.item.id}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">التوقيت الرقمي:</span>
                        <span className="font-bold text-slate-800">{itemDetailModal.item.timestamp}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">المستخدم المنفذ:</span>
                        <span className="font-bold text-teal-800">{itemDetailModal.item.userName}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">نوع الإجراء والجدول:</span>
                        <span className="font-bold text-amber-800">{itemDetailModal.item.actionType} - {itemDetailModal.item.tableName}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-emerald-400 p-3 rounded-2xl font-mono text-[10px] space-y-1">
                      <p className="text-slate-400 font-bold">// تفاصيل العملية والأثر التغييري:</p>
                      <p>{itemDetailModal.item.details}</p>
                    </div>
                  </div>
                )}

                {/* USER IAM DETAIL VIEW */}
                {itemDetailModal.type === 'user' && (
                  <div className="space-y-3">
                    <div className="bg-orange-50/80 border border-orange-200 p-3.5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-orange-900 text-sm">{itemDetailModal.item.name}</span>
                        <span className="bg-orange-200 text-orange-900 font-extrabold px-2.5 py-0.5 rounded text-[10px]">
                          {itemDetailModal.item.role}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">البريد الإلكتروني: {itemDetailModal.item.email}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-800 text-xs">حزمة الصلاحيات الأمنية المفعلة:</span>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">إدخال وتعديل البيانات</span>
                        <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">استخراج كشوفات الحضور</span>
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">الوصول لمركز القيادة والعمليات</span>
                        <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">تصدير التقارير الرسمية</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center flex-wrap gap-2">
                {itemDetailModal.type === 'soldier' ? (
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <button
                      onClick={() => handleSendWhatsAppDetails(itemDetailModal.item.soldier || itemDetailModal.item)}
                      className="flex-1 sm:flex-none px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 min-h-[46px]"
                      title="إرسال تفاصيل الفرد عبر واتساب"
                    >
                      <MessageSquare className="w-4.5 h-4.5 text-emerald-100" />
                      <span>تواصل واتساب</span>
                    </button>
                    {onViewSoldierProfile && (
                      <button
                        onClick={() => {
                          const soldierId = itemDetailModal.item.id;
                          setItemDetailModal(null);
                          setDrillDownModal(null);
                          onViewSoldierProfile(soldierId);
                        }}
                        className="flex-1 sm:flex-none px-4 py-3 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm min-h-[46px]"
                      >
                        <UserCheck className="w-4.5 h-4.5" />
                        <span>الملف الفردي الشامل 👤</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    نظام الحفر المباشر وإدارة البيانات اللحظية v2.0
                  </span>
                )}

                <button
                  onClick={() => setItemDetailModal(null)}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all cursor-pointer min-h-[46px]"
                >
                  إغلاق التفاصيل ✕
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Share Modal selector */}
      <WhatsAppShareModal
        soldier={whatsAppSoldier}
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsAppSoldier(null);
        }}
        units={units}
        attendanceRecords={attendance}
      />

      {/* Daily Date Picker Sub-Modal Popup */}
      {showDailyDatePickerModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto" dir="rtl">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative shadow-2xl font-sans text-right my-auto max-h-[88vh] flex flex-col overflow-y-auto">
            <button 
              type="button"
              onClick={() => setShowDailyDatePickerModal(false)}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer z-10 border border-slate-200"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3 mb-4">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">اختيار تاريخ اليوم لاستعراض التقرير</h4>
                <p className="text-[11px] text-slate-500 font-semibold">حدد اليوم المطلوب لاستخراج واستعراض التقرير الميداني اليومي</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Date Input */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-2">
                <label className="text-xs font-black text-slate-800 block">حدد تاريخ اليوم من تقويم المنظومة:</label>
                <input
                  type="date"
                  value={selectedDailyDate || latestDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black font-mono text-amber-950 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs"
                />
              </div>

              {/* Quick Recorded Date Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">أو اختر سريعا من التواريخ المسجلة:</span>
                <div className="flex flex-wrap gap-2">
                  {dates.slice(0, 8).map((dStr) => (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => setSelectedDailyDate(dStr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        (selectedDailyDate || latestDate) === dStr
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {dStr} {dStr === latestDate ? '(اليوم 🟢)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDailyDatePickerModal(false);
                    generateReportPreview('daily_periodic');
                    setSelectedLauncherInfo(null);
                  }}
                  className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>تأكيد واستعراض التقرير اليومي 🚀</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDailyDatePickerModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRANT LEAVE POPUP MODAL */}
      {isGrantLeaveModalOpen && grantLeaveSoldier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[120] p-2 sm:p-4 font-sans print:hidden overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-[96vw] border border-slate-200 shadow-2xl overflow-hidden text-right my-auto">
            {/* Mobile pull indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-sm sm:text-base">✚ إصدار وتوثيق قرار منح إجازة للفرد</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsGrantLeaveModalOpen(false)}
                className="p-2 px-3 rounded-2xl bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800 font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
              >
                <X className="w-4.5 h-4.5" />
                <span>إغلاق</span>
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                {grantLeaveSoldier.rank ? grantLeaveSoldier.rank.substring(0, 2) : 'فرد'}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900">{grantLeaveSoldier.fullName}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono mt-0.5">
                  <span>الرقم العسكري: {grantLeaveSoldier.militaryNumber}</span>
                  <span>•</span>
                  <span>{grantLeaveSoldier.rank}</span>
                  <span>•</span>
                  <span>{units.find(u => u.id === grantLeaveSoldier.unitId)?.name || 'قيادة اللواء'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleGrantLeaveSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1. Leave Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">نوع الإجازة المعتمدة *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'استحقاق', name: 'استحقاق (اعتيادية)' },
                    { id: 'إذن', name: 'إذن مغادرة / إدارية' },
                    { id: 'طارئة', name: 'إجازة طارئة' },
                    { id: 'مرضية', name: 'إجازة مرضية' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLeaveType(tab.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${
                        leaveType === tab.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sick Leave Diagnosis & Medical Record Field */}
              {leaveType === 'مرضية' && (
                <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                    <Stethoscope className="w-4 h-4 text-rose-600" />
                    <span>خانه التشخيص ونوع المرض (يدوّن بالسجل الطبي كـ "إجازة مرضية") *</span>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={leaveDiagnosis}
                      onChange={(e) => setLeaveDiagnosis(e.target.value)}
                      placeholder="اكتب التشخيص الطبي / نوع المرض (مثال: وعكة صحية حادة / راحة بعد عملية / إصابة ميدانية)..."
                      className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-500 font-bold self-center">مقترحات تشخيص سريعة:</span>
                    {[
                      'وعكة صحية وإجهاد بدني',
                      'مراجعة عيادة خارجية بـ المستشفى العسكري',
                      'إصابة ميدانية وكسور رضية',
                      'عملية جراحية وفترة نقاهة',
                      'حمى والتهاب حاد'
                    ].map((diag) => (
                      <button
                        key={diag}
                        type="button"
                        onClick={() => setLeaveDiagnosis(diag)}
                        className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-300 font-bold transition-all cursor-pointer"
                      >
                        {diag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                    <span>ⓘ تنبيه: تُسجل بالنظام والسجل الطبي تحت مسمى "إجازة مرضية" (برمز ع/مريض) وليس إجازة رسمية.</span>
                  </p>
                </div>
              )}

              {/* 2. Dates & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ بداية الإجازة *</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => handleLeaveDateChange(e.target.value, leaveEndDate)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ نهايتها المعتمد *</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => handleLeaveDateChange(leaveStartDate, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدة الإجمالية (أيام)</label>
                  <input
                    type="number"
                    min="1"
                    value={leaveDuration}
                    onChange={(e) => setLeaveDuration(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-black font-mono text-emerald-900 text-center"
                  />
                </div>
              </div>

              {/* 3. Granting Authority & Order Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجهة الآمرة والمانحة *</label>
                  <select
                    value={leaveGrantingAuthority}
                    onChange={(e) => setLeaveGrantingAuthority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                  >
                    <option value="قيادة الكتيبة">قيادة الكتيبة</option>
                    <option value="قيادة اللواء">قيادة اللواء / الركن الإداري</option>
                    <option value="ركن العمليات">ركن العمليات والتخطيط</option>
                    <option value="الخدمات الطبية">الخدمات الطبية العسكرية</option>
                    <option value="أخرى">جهة أخرى (تخصيص يدوي)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الأمر/القرار الإداري</label>
                  <input
                    type="text"
                    value={leaveOrderNumber}
                    onChange={(e) => setLeaveOrderNumber(e.target.value)}
                    placeholder="مثال: ORD-8841"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {leaveGrantingAuthority === 'أخرى' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الجهة المانحة مخصص</label>
                  <input
                    type="text"
                    value={leaveGrantingAuthorityCustom}
                    onChange={(e) => setLeaveGrantingAuthorityCustom(e.target.value)}
                    placeholder="اكتب اسم الجهة المانحة للإجازة..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {/* 4. Reason & Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب أو مبرر الإجازة</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="مثال: إجازة اعتيادية سنوية / ظروف عائلية خاصة / استكمال علاج"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مرفق سند الإجازة أو تقرير طبّي (اختياري)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleLeaveAttachmentUpload}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-600 file:mr-0 file:ml-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 cursor-pointer"
                />
                {leaveAttachmentUrl && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ تم رفع المرفق بنجاح</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
                >
                  {leaveSubmitting ? (
                    <span>جاري توثيق قرار الإجازة...</span>
                  ) : (
                    <>
                      <FileCheck2 className="w-5 h-5" />
                      <span>حفظ وتوثيق الإجازة وإصدار التصريح</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsGrantLeaveModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl cursor-pointer min-h-[48px]"
                >
                  إلغاء النافذة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL LEAVE PASS MODAL */}
      {printableLeavePass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[130] p-2 sm:p-4 font-sans print:p-0 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden text-right print:shadow-none print:border-none print:max-w-none print:w-full my-auto">
            
            {/* Header action bar */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 font-bold text-xs flex flex-wrap gap-2 justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>تصريح ونموذج إجازة رسمية موثق</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const leaveTypeStr = printableLeavePass.leaveType || 'إجازة رسمية';
                    const summaryText = `🎖️ *تصريح ونموذج إجازة رسمية - القوات المسلحة*
===================================
👤 *الاسم الكامل:* ${printableLeavePass.soldierName || printableLeavePass.fullName}
🎖️ *الرتبة العسكرية:* ${printableLeavePass.rank}
🆔 *الرقم العسكري:* ${printableLeavePass.militaryNumber}
🏢 *التشكيل / الوحدة:* ${printableLeavePass.unitName}

📋 *تفاصيل الإجازة والمدة:*
• *نوع الإجازة:* ${leaveTypeStr}
• *بداية الإجازة:* ${printableLeavePass.startDate}
• *تاريخ الانتهاء:* ${printableLeavePass.endDate}
• *المدة المعتمدة:* ${printableLeavePass.duration} أيام
• *الجهة المانحة:* ${printableLeavePass.grantingAuthority || 'قيادة الوحدة'}
• *رقم الأمر الإداري:* ${printableLeavePass.orderNumber || 'غير مدون'}

📌 *حالة الوثيقة:* معتمدة وموثقة رسمياً من قيادة الشؤون العسكرية.`;

                    shareElementViaWhatsApp(
                      'printable-leave-pass-dashboard',
                      `تصريح_إجازة_${printableLeavePass.militaryNumber}_${printableLeavePass.startDate}`,
                      summaryText
                    );
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md border border-emerald-500/40"
                  title="مشاركة صورة التصريح الرسمية ونصه التوثيقي مباشرة عبر الواتساب"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-100 fill-emerald-100" />
                  <span>مشاركة صورة عبر الواتساب</span>
                </button>

                <button
                  onClick={() => downloadElementAsImage('printable-leave-pass-dashboard', `تصريح_إجازة_${printableLeavePass.militaryNumber}_${printableLeavePass.startDate}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="تنزيل نموذج التصريح كصورة فائقة الدقة PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>صورة PNG</span>
                </button>

                <button
                  onClick={() => downloadElementAsPdf('printable-leave-pass-dashboard', `تصريح_إجازة_${printableLeavePass.militaryNumber}_${printableLeavePass.startDate}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="تحميل التصريح كملف PDF رسمي"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="طباعة نموذج التصريح الورقي"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>

                <button 
                  onClick={() => setPrintableLeavePass(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Box */}
            <div className="p-8 space-y-5 text-slate-900 bg-white font-sans print:p-6 border-2 border-slate-900 rounded-2xl shadow-xl" id="printable-leave-pass-dashboard" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
              {/* Document Header */}
              <PrintHeader 
                printSettings={printSettings}
                documentTitle="تصريح وثيقة ونموذج إجازة رسمية"
                documentSubtitle={`نوع الإجازة المعتمدة: ${printableLeavePass.leaveType || 'إجازة رسمية'}`}
                documentRef={printableLeavePass.orderNumber || printableLeavePass.id}
                documentDate={printableLeavePass.orderDate || new Date().toISOString().split('T')[0]}
                unitOverride={printableLeavePass.unitName}
              />

              {/* Title */}
              <div className="text-center py-2.5 bg-slate-900 text-white rounded-xl border border-slate-900 shadow-sm">
                <h3 className="text-base font-black text-white tracking-wide">تصريح ونموذج إجازة رسمية</h3>
                <p className="text-xs font-bold text-emerald-300 mt-0.5">
                  نوع الإجازة المعتمدة: <span className="font-black text-slate-900 bg-emerald-400 px-2.5 py-0.5 rounded-md text-xs">{printableLeavePass.leaveType || 'إجازة رسمية'}</span>
                </p>
              </div>

              {/* Section 1: Soldier Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 border-r-4 border-emerald-600 pr-2">
                  أولاً: بيانات صاحب التصريح (الفرد)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-300 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-bold block">الاسم الكامل:</span>
                    <span className="font-black text-slate-900">{printableLeavePass.soldierName || printableLeavePass.fullName}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-bold block">الرتبة العسكرية:</span>
                    <span className="font-bold text-slate-900">{printableLeavePass.rank}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-bold block">الرقم العسكري:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.militaryNumber}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] font-bold block">التشكيل/الوحدة:</span>
                    <span className="font-bold text-slate-900">{printableLeavePass.unitName}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Leave Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 border-r-4 border-emerald-600 pr-2">
                  ثانياً: تفاصيل مدة الإجازة والأمر الإداري
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">تاريخ بداية الإجازة:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.startDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">تاريخ العودة والانتهاء:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.endDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">المدة المعتمدة:</span>
                    <span className="font-black text-emerald-800 text-sm">{printableLeavePass.duration} أيام</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">الجهة المانحة للإجازة:</span>
                    <span className="font-black text-slate-900">{printableLeavePass.grantingAuthority || 'قيادة الوحدة'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">رقم الأمر/القرار الإداري:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderNumber || 'بدون رقم أمر'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 text-[10px] font-bold block">تاريخ صدور الأمر:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderDate || printableLeavePass.startDate}</span>
                  </div>
                </div>
                {printableLeavePass.reason && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 text-xs">
                    <span className="text-amber-950 font-black">سبب ومبرر الإجازة: </span>
                    <span className="font-bold text-slate-900">{printableLeavePass.reason}</span>
                  </div>
                )}
                {(printableLeavePass.diagnosis || (printableLeavePass.illnessType && printableLeavePass.illnessType !== printableLeavePass.leaveType)) && (
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-300 text-xs mt-2">
                    <span className="text-rose-950 font-black">التشخيص ونوع المرض (السجل الطبي): </span>
                    <span className="font-bold text-rose-900">{printableLeavePass.diagnosis || printableLeavePass.illnessType}</span>
                  </div>
                )}
              </div>

              {/* Signatures & Stamp */}
              <PrintFooter printSettings={printSettings} />
            </div>

            {/* Footer Modal Actions */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center print:hidden">
              <span className="text-xs text-slate-600 font-bold hidden sm:inline">
                يمكنك مشاركة صورة التصريح عبر الواتساب أو حفظها كصورة PNG / PDF لتوثيق الإجازة.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    const leaveTypeStr = printableLeavePass.leaveType || 'إجازة رسمية';
                    const summaryText = `🎖️ *تصريح ونموذج إجازة رسمية - القوات المسلحة*
===================================
👤 *الاسم الكامل:* ${printableLeavePass.soldierName || printableLeavePass.fullName}
🎖️ *الرتبة العسكرية:* ${printableLeavePass.rank}
🆔 *الرقم العسكري:* ${printableLeavePass.militaryNumber}
🏢 *التشكيل / الوحدة:* ${printableLeavePass.unitName}

📋 *تفاصيل الإجازة والمدة:*
• *نوع الإجازة:* ${leaveTypeStr}
• *بداية الإجازة:* ${printableLeavePass.startDate}
• *تاريخ الانتهاء:* ${printableLeavePass.endDate}
• *المدة المعتمدة:* ${printableLeavePass.duration} أيام
• *الجهة المانحة:* ${printableLeavePass.grantingAuthority || 'قيادة الوحدة'}
• *رقم الأمر الإداري:* ${printableLeavePass.orderNumber || 'غير مدون'}

📌 *حالة الوثيقة:* معتمدة وموثقة رسمياً من قيادة الشؤون العسكرية.`;

                    shareElementViaWhatsApp(
                      'printable-leave-pass-dashboard',
                      `تصريح_إجازة_${printableLeavePass.militaryNumber}_${printableLeavePass.startDate}`,
                      summaryText
                    );
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-white" />
                  <span>مشاركة صورة بالواتساب</span>
                </button>
                <button
                  onClick={() => setPrintableLeavePass(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Readiness Summary Report Modal / Printable Document */}
      {showQuickReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn font-sans dir-rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-3 sm:p-6 space-y-3 sm:space-y-5 shadow-2xl border border-slate-200 relative my-2 sm:my-8 max-h-[96vh] flex flex-col">
            {/* Modal Action Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 shrink-0">
                  <FileText className="w-5 h-5 text-emerald-800" />
                </div>
                <div className="text-right min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">تقرير ملخص الجاهزية اليومي لجميع الوحدات</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold truncate">معاينة الشاشة وتوليد ملف PDF عند الطلب - اللواء 43 عمالقة</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end shrink-0 flex-wrap sm:flex-nowrap">
                {/* Mobile Fit Toggle Button */}
                <button
                  type="button"
                  onClick={() => setReportMobileFit(!reportMobileFit)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer border border-slate-300"
                  title="تبديل وضع العرض بين ملائمة الهاتف والحجم المكتبي A4"
                >
                  {reportMobileFit ? <Smartphone className="w-4 h-4 text-emerald-600" /> : <Monitor className="w-4 h-4 text-slate-600" />}
                  <span className="text-[11px] font-extrabold">{reportMobileFit ? 'مُكيّف للهاتف' : 'حجم A4 المكتبي'}</span>
                </button>

                {/* PDF Download Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsGeneratingQuickReport(true);
                    try {
                      const reportFilename = `تقرير_ملخص_الجاهزية_اليومي_اللواء_43_${latestDate}`;
                      await new Promise((r) => setTimeout(r, 100));
                      await exportQuickReadinessPdfReport('quick-readiness-pdf-report', reportFilename);
                      triggerToast('تم تنزيل ملف PDF بنجاح عبر مكتبة PDF المخصصة!', 'success');
                    } catch (e: any) {
                      console.error(e);
                      triggerToast(e?.message || 'حدث خطأ أثناء تحميل الملف', 'error');
                    } finally {
                      setIsGeneratingQuickReport(false);
                    }
                  }}
                  disabled={isGeneratingQuickReport}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${isGeneratingQuickReport ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingQuickReport ? 'جاري التحميل...' : 'تنزيل PDF مباشر'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQuickReportModal(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area Wrapper with Scroll for Mobile */}
            <div className="overflow-y-auto overflow-x-auto flex-1 p-1.5 sm:p-4 bg-slate-100/90 rounded-2xl flex justify-center">
              <div
                id="quick-readiness-pdf-report"
                className={`bg-white text-slate-900 font-sans border-2 sm:border-4 border-double border-slate-900 rounded-xl shadow-xl transition-all duration-200 ${
                  !reportMobileFit || isGeneratingQuickReport
                    ? 'w-[794px] min-w-[794px] p-8 space-y-5 shrink-0'
                    : 'w-full max-w-[794px] p-3.5 sm:p-8 space-y-4 sm:space-y-5'
                }`}
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                {/* Official Bismillah Heading */}
                <div className="text-center pb-2 border-b-2 border-slate-900" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <p className="text-xs sm:text-sm font-black text-slate-900 tracking-widest font-serif">بسم الله الرحمن الرحيم</p>
                </div>

                <PrintHeader
                  printSettings={quickReportPrintSettings}
                  documentTitle="تقرير ملخص الجاهزية والاستعداد القتالي اليومي لجميع الوحدات"
                  documentSubtitle="قيادة السيطرة والعمليات - اللواء 43 عمالقة - الموقف اليومي الشامل"
                  documentRef={`QUICK-READINESS-${latestDate.replace(/-/g, '')}`}
                  documentDate={latestDate}
                />

                {/* Official Memo Addressee Header Box */}
                <div 
                  className="bg-slate-50 border-r-4 border-slate-900 p-2.5 sm:p-3.5 rounded-l-xl text-xs space-y-1.5 shadow-2xs"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 font-black text-slate-900">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">الموضوع: مذكرة تقرير الجاهزية العملياتية والموقف اليومي العسكري</span>
                    <span className="text-[10px] font-mono bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-md">مذكرة رقم: م ج / 43 / {latestDate.replace(/-/g, '')}</span>
                  </div>
                  <p className="text-slate-800 font-black text-xs">إلـى: السيّد قائد اللواء 43 عمالقة / أركان حرب اللواء المحترم</p>
                  <p className="text-slate-600 font-bold text-[10px] sm:text-[11px]">سلام الله عليكم ورحمته وبركاته،، نرفق لسيادتكم أدناه الموقف الميداني اليومي الشامل لمستوى الجاهزية والاستعداد القتالي والقوة البشرية لكافة كتائب وسرايا اللواء 43 عمالقة بتاريخ {latestDate}:</p>
                </div>

                {/* Executive Metrics Summary Box */}
                <div 
                  className={`bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border-2 border-slate-300 text-center font-sans shadow-xs ${
                    !reportMobileFit || isGeneratingQuickReport
                      ? 'grid grid-cols-6 gap-2'
                      : 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2'
                  }`}
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="p-2 bg-white rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">إجمالي القوة</span>
                    <span className="text-base font-black text-slate-900 font-mono">{totalStrength}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">الحضور الميداني</span>
                    <span className="text-base font-black text-emerald-900 font-mono">{statsToday.h}</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-300">
                    <span className="text-[10px] text-amber-800 font-bold block mb-1">الإجازات والراحات</span>
                    <span className="text-base font-black text-amber-900 font-mono">{statsToday.i}</span>
                  </div>
                  <div className="p-2 bg-sky-50 rounded-lg border border-sky-300">
                    <span className="text-[10px] text-sky-800 font-bold block mb-1">المهام والدوريات</span>
                    <span className="text-base font-black text-sky-900 font-mono">{statsToday.m}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg border border-rose-300">
                    <span className="text-[10px] text-rose-800 font-bold block mb-1">الغياب / العجز</span>
                    <span className="text-base font-black text-rose-900 font-mono">{statsToday.g}</span>
                  </div>
                  <div className="p-2 bg-slate-900 text-white rounded-lg border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] text-amber-300 font-bold block">مؤشر الجاهزية</span>
                    <span className="text-base font-black text-emerald-400 font-mono">{statsToday.readinessRate}%</span>
                  </div>
                </div>

                {/* Full Units Readiness Table */}
                <div className="overflow-x-auto rounded-xl border-2 border-slate-900">
                  <table className="w-full text-right text-[11px] sm:text-xs min-w-[620px] sm:min-w-full">
                    <thead className="bg-slate-900 text-amber-300 border-b-2 border-slate-900 font-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <tr>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 w-8">#</th>
                        <th className="py-2.5 px-3 border-l border-slate-800">اسم التشكيل / الوحدة</th>
                        <th className="py-2.5 px-3 border-l border-slate-800">القائد المباشر</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-white">القوة</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-emerald-300">حاضر</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-amber-300">إجازة</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-sky-300">مهمة</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-rose-300">غائب</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-amber-300">الجاهزية</th>
                        <th className="py-2.5 px-3 text-center">الحالة العملياتية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-bold text-slate-900">
                      {unitStats.map((u, idx) => (
                        <tr 
                          key={u.id || idx} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 border-l border-slate-200 font-black text-slate-900">{u.name}</td>
                          <td className="py-2 px-3 border-l border-slate-200 text-slate-700">{u.commanderName || 'قيادة التشكيل'}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-slate-900 font-black">{u.strength}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-emerald-800 font-black bg-emerald-50/50">{u.today.h}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-amber-800 bg-amber-50/50">{u.today.i}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-sky-800 bg-sky-50/50">{u.today.m}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-rose-800 bg-rose-50/50">{u.today.g}</td>
                          <td className="py-2 px-2 text-center border-l border-slate-200 font-mono font-black text-slate-900">{u.today.rate}%</td>
                          <td className="py-2 px-3 text-center text-[11px] font-black">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${
                              u.today.rate >= 80 
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                : u.today.rate >= 60 
                                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals Grand Summary Row */}
                    <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <tr>
                        <td colSpan={3} className="py-2.5 px-4 text-right border-l border-slate-800 font-black text-amber-300">
                          الإجمالي العام لجميع التشكيلات والوحدات
                        </td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-white font-black">{totalStrength}</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-emerald-400 font-black">{statsToday.h}</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-amber-300">{statsToday.i}</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-sky-300">{statsToday.m}</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-rose-400">{statsToday.g}</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 font-mono text-emerald-400 font-black">{statsToday.readinessRate}%</td>
                        <td className="py-2.5 px-3 text-center text-[11px] text-amber-300 font-black">
                          موقف متكامل
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Military Signatures & Approvals Section */}
                <div 
                  className={`pt-4 border-t-2 border-slate-300 font-sans ${
                    !reportMobileFit || isGeneratingQuickReport
                      ? 'grid grid-cols-3 gap-4 text-center'
                      : 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center'
                  }`}
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="space-y-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col justify-between h-36">
                    <div>
                      <p className="text-[11px] font-black text-slate-800">مسؤول القوة البشرية</p>
                      <p className="text-[10px] text-slate-500 font-bold">اللواء 43 عمالقة</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      [ الختم ]
                    </div>
                    <div className="text-[10px] text-slate-400 italic">التوقيع: ...................</div>
                  </div>

                  <div className="space-y-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col justify-between h-36">
                    <div>
                      <p className="text-[11px] font-black text-slate-800">رئيس أركان اللواء</p>
                      <p className="text-[10px] text-slate-500 font-bold">قيادة السيطرة والعمليات</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      [ الختم ]
                    </div>
                    <div className="text-[10px] text-slate-400 italic">التوقيع: ...................</div>
                  </div>

                  <div className="space-y-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col justify-between h-36">
                    <div>
                      <p className="text-[11px] font-black text-slate-800">قائد اللواء 43 عمالقة</p>
                      <p className="text-[10px] text-slate-500 font-bold">المصادقة والاعتماد الرسمية</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      [ الختم ]
                    </div>
                    <div className="text-[10px] text-slate-400 italic">التوقيع: ...................</div>
                  </div>
                </div>

                {/* Administrative Footnote & Verification */}
                <div 
                  className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-600 font-bold flex-wrap gap-2"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <p>تنويه عملياتي: هذا التقرير مستخرج إلكترونياً ويعكس موقف الجاهزية والاستعداد القتالي اليومي لجميع تشكيلات اللواء 43 عمالقة.</p>
                  <p className="font-mono text-slate-400">رمز التوثيق: AUT-43-RDN-{latestDate.replace(/-/g, '')}</p>
                </div>

                <PrintFooter printSettings={quickReportPrintSettings} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement Detail Modal (Resumed, Granted Leaves, Overdue Absences) */}
      {movementDetailModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[130] p-3 sm:p-4 font-sans print:hidden overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden text-right my-auto animate-scaleUp">
            <div className="p-4 bg-slate-950 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                {movementDetailModal === 'resumed' && <UserCheck className="w-5 h-5 text-emerald-400" />}
                {movementDetailModal === 'granted' && <Plane className="w-5 h-5 text-blue-400" />}
                {movementDetailModal === 'overdue' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {movementDetailModal === 'resumed' && `كشف المواصلين للعمل اليوم (${dailyMovementStats.resumedTodaySoldiers.length} فرد)`}
                  {movementDetailModal === 'granted' && `كشف الإجازات الممنوحة اليوم (${dailyMovementStats.grantedLeaveTodaySoldiers.length} فرد)`}
                  {movementDetailModal === 'overdue' && `كشف الغياب وتأخير المواصلة بعد الإجازة (${dailyMovementStats.overdueAbsentSoldiers.length} فرد)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMovementDetailModal(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {/* Helper Note regarding military attendance rules */}
              {movementDetailModal === 'overdue' && (
                <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">قوانين الإنضباط العسكري وتحديد الغياب التلقائي:</p>
                    <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                      عند انتهاء الإجازة وعدم مواصلة الفرد للعمل، تعتبر الفترة بين نهاية الإجازة وتاريخ مواصلته الفعلية غياباً تلقائياً. وعند الضغط على زر <strong>"تسديد مواصلة العمل الآن"</strong>، يتم تسديد حضوره اعتباراً من اليوم الحالي وتثبيت الأيام السابقة كغياب.
                    </p>
                  </div>
                </div>
              )}

              {/* Search Box for Granting Leave to Any Soldier in System */}
              {movementDetailModal === 'granted' && (
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/40 space-y-3 shadow-inner mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xs">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span>البحث في النظام كامل لمنح إجازة جديدة لأي فرد:</span>
                    </div>
                    {grantSearchQueryModal && (
                      <button
                        type="button"
                        onClick={() => setGrantSearchQueryModal('')}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      >
                        مسح البحث
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={grantSearchQueryModal}
                      onChange={(e) => setGrantSearchQueryModal(e.target.value)}
                      placeholder="ابحث بالاسم، الرقم العسكري، أو الرتبة لمنح إجازة فورا..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 pr-9 text-xs text-white placeholder:text-slate-500 outline-none transition-all shadow-sm"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>

                  {/* Instant Search Results */}
                  {grantSearchQueryModal.trim() !== '' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pt-1 border-t border-slate-800">
                      {searchMatchedSoldiers.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-3">
                          لا يوجد أفراد مطابقين لـ "{grantSearchQueryModal}" في النظام
                        </div>
                      ) : (
                        searchMatchedSoldiers.map(s => {
                          const unitName = units.find(u => u.id === s.unitId)?.name || 'قيادة اللواء';
                          return (
                            <div
                              key={s.id}
                              className="bg-slate-900 hover:bg-slate-850 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-300 font-bold text-[11px] shrink-0">
                                  {s.rank ? s.rank.substring(0, 2) : 'فرد'}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{s.fullName} <span className="text-[10px] text-blue-400 font-semibold">({s.rank})</span></div>
                                  <div className="text-[10px] text-slate-400 font-mono">الرقم العسكري: {s.militaryNumber} • {unitName}</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setMovementDetailModal(null);
                                  handleOpenGrantLeaveModal(s);
                                  setGrantSearchQueryModal('');
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all w-full sm:w-auto justify-center border border-blue-400/50"
                              >
                                <Plane className="w-3.5 h-3.5 text-white" />
                                <span>منح إجازة الآن ✈️</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* List Items */}
              {((movementDetailModal === 'resumed' && dailyMovementStats.resumedTodaySoldiers) ||
                (movementDetailModal === 'granted' && dailyMovementStats.grantedLeaveTodaySoldiers) ||
                (movementDetailModal === 'overdue' && dailyMovementStats.overdueAbsentSoldiers)
              )?.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  لا يوجد أفراد مسجلين في هذه القائمة بتاريخ ({dailyMovementStats.targetDateStr})
                </div>
              ) : (
                ((movementDetailModal === 'resumed' && dailyMovementStats.resumedTodaySoldiers) ||
                 (movementDetailModal === 'granted' && dailyMovementStats.grantedLeaveTodaySoldiers) ||
                 (movementDetailModal === 'overdue' && dailyMovementStats.overdueAbsentSoldiers)
                )?.map(s => {
                  const unitName = units.find(u => u.id === s.unitId)?.name || 'قيادة اللواء';
                  return (
                    <div 
                      key={s.id} 
                      className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 overflow-hidden shadow-inner">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            s.rank ? s.rank.substring(0, 2) : 'فرد'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-white">{s.fullName}</span>
                            <span className="text-[10px] bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">{s.rank}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                            <span>الرقم العسكري: {s.militaryNumber}</span>
                            <span>•</span>
                            <span className="text-slate-300 font-sans font-bold">{unitName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {movementDetailModal === 'overdue' && (
                          <button
                            type="button"
                            onClick={() => {
                              handleResumeDuty(s);
                              setMovementDetailModal(null);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md border border-emerald-400"
                          >
                            <UserCheck className="w-4 h-4 text-white" />
                            <span>تسديد مواصلة العمل الآن 🟢</span>
                          </button>
                        )}

                        {movementDetailModal === 'granted' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMovementDetailModal(null);
                              handleOpenGrantLeaveModal(s);
                            }}
                            className="px-3 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border border-blue-400/40"
                          >
                            <Plane className="w-3.5 h-3.5 text-white" />
                            <span>تعديل الإجازة ✈️</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleSendWhatsAppDetails(s, e)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تواصل</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setMovementDetailModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard(props: DashboardProps) {
  return (
    <DashboardErrorBoundary>
      <DashboardContent {...props} />
    </DashboardErrorBoundary>
  );
}

