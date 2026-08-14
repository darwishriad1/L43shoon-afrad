import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ShieldCheck, Activity, Plus, HeartPulse, 
  Calendar, Phone, MapPin, Award, ChevronUp, Paperclip, 
  Printer, Edit, ArrowLeftRight, AlertCircle, AlertTriangle, History, 
  Download, Trash2, User, RefreshCw, FileText, CheckCircle2, Upload,
  Lock, Check, Building, Camera, X, MessageSquare, Stethoscope, ChevronRight, ChevronLeft, Filter,
  Clock, Sparkles, Grid, List, Shield, Medal, Search, FileSpreadsheet, Eye, SlidersHorizontal, Flag, GraduationCap,
  PackageCheck, Box, ShieldAlert, Key, Package, FileCheck2, CheckSquare, Layers, LayoutGrid, LogOut
} from 'lucide-react';
import { Soldier, SickLeave, AttendanceRecord, AuditLog, User as SystemUser, Unit, PrintSettings, MilitaryCustody } from '../types';
import { fetchWithRetry, safeJson } from '../lib/api';
import { downloadElementAsPdf, downloadElementAsImage, shareElementViaWhatsApp } from '../utils/pdfGenerator';
import WhatsAppShareModal from './WhatsAppShareModal';
import SoldierMonthlyAttendanceModal from './SoldierMonthlyAttendanceModal';
import SoldierAccountTasksTab from './SoldierAccountTasksTab';
import MilitaryIdCardModal from './MilitaryIdCardModal';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';

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

interface SoldierProfileProps {
  soldierId: string;
  currentUser: { id: string; name: string; role: string; unitId?: string | null };
  units: Unit[];
  printSettings?: PrintSettings;
  onClose: () => void;
  onLogout?: () => void;
  onSoldierUpdated?: () => void;
  onAttendanceUpdated?: () => void;
  onOpenTransfer?: (soldier: Soldier) => void;
}

export default function SoldierProfile({ 
  soldierId, 
  currentUser, 
  units, 
  printSettings,
  onClose,
  onLogout,
  onSoldierUpdated,
  onAttendanceUpdated,
  onOpenTransfer
}: SoldierProfileProps) {
  
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy loaded states per tab
  const [activeTab, setActiveTab] = useState<'personal' | 'military' | 'medical' | 'attendance' | 'timeline' | 'operational_history' | 'custody' | 'account_tasks'>('personal');
  const [sickLeavesList, setSickLeavesList] = useState<SickLeave[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);
  const [custodiesList, setCustodiesList] = useState<MilitaryCustody[]>([]);

  // Custody Form & Modal states
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [editingCustody, setEditingCustody] = useState<MilitaryCustody | null>(null);
  const [custodyNumber, setCustodyNumber] = useState('');
  const [custodyType, setCustodyType] = useState('بندقية آلي');
  const [custodyTypeCustom, setCustodyTypeCustom] = useState('');
  const [custodyDescription, setCustodyDescription] = useState('');
  const [custodyQuantity, setCustodyQuantity] = useState<number>(1);
  const [custodyIssueDate, setCustodyIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [custodyStatus, setCustodyStatus] = useState<'نشط' | 'منتهٍ' | 'قيد التدقيق' | 'مفقود/متحفظ عليه'>('نشط');
  const [custodyOrderRef, setCustodyOrderRef] = useState('');
  const [custodyIssuingDept, setCustodyIssuingDept] = useState('التسليح العسكري');
  const [custodyIssuingDeptCustom, setCustodyIssuingDeptCustom] = useState('');
  const [custodyIssuingOfficer, setCustodyIssuingOfficer] = useState('');
  const [custodyNotes, setCustodyNotes] = useState('');
  const [custodyIndividualSigned, setCustodyIndividualSigned] = useState(true);
  const [custodyOfficerSigned, setCustodyOfficerSigned] = useState(true);
  const [custodyReturnDate, setCustodyReturnDate] = useState('');
  const [custodySubmitting, setCustodySubmitting] = useState(false);

  // Printable Custody Document Modal State
  const [printableCustody, setPrintableCustody] = useState<MilitaryCustody | null>(null);
  const [isPrintableCustodyOpen, setIsPrintableCustodyOpen] = useState(false);

  // Filters for Custody Tab
  const [custodySearch, setCustodySearch] = useState('');
  const [custodyStatusFilter, setCustodyStatusFilter] = useState<string>('all');
  const [custodyDeptFilter, setCustodyDeptFilter] = useState<string>('all');
  const [custodyViewMode, setCustodyViewMode] = useState<'table' | 'cards'>('table');
  
  const [loadingTab, setLoadingTab] = useState(false);

  // Modals inside Profile
  const [isSickLeaveModalOpen, setIsSickLeaveModalOpen] = useState(false);
  const [isGrantLeaveModalOpen, setIsGrantLeaveModalOpen] = useState(false);
  const [printableLeavePass, setPrintableLeavePass] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);

  // Delete & Edit Leave modal states
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [deletingLeave, setDeletingLeave] = useState<SickLeave | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [isEditLeaveModalOpen, setIsEditLeaveModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<SickLeave | null>(null);

  const [editLeaveType, setEditLeaveType] = useState<'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'>('استحقاق');
  const [editLeaveDiagnosis, setEditLeaveDiagnosis] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDuration, setEditDuration] = useState<number>(1);
  const [editReason, setEditReason] = useState('');
  const [editGrantingAuthority, setEditGrantingAuthority] = useState('الكتيبة');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLeaveSubmitting, setEditLeaveSubmitting] = useState(false);

  // New Grant Leave Form States
  const [leaveType, setLeaveType] = useState<'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'>('استحقاق');
  const [leaveDiagnosis, setLeaveDiagnosis] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [leaveDuration, setLeaveDuration] = useState<number>(4);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveGrantingAuthority, setLeaveGrantingAuthority] = useState('الكتيبة');
  const [leaveGrantingAuthorityCustom, setLeaveGrantingAuthorityCustom] = useState('');
  const [leaveOrderNumber, setLeaveOrderNumber] = useState('');
  const [leaveOrderDate, setLeaveOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState<string | null>(null);
  const [leaveNotes, setLeaveNotes] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Monthly Attendance Sheet States
  const today = useMemo(() => new Date(), []);
  const currentYearStr = useMemo(() => String(today.getFullYear()), [today]);
  const currentMonthStr = useMemo(() => String(today.getMonth() + 1).padStart(2, '0'), [today]);

  const [selectedAttendanceYear, setSelectedAttendanceYear] = useState<string>(currentYearStr);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState<string>(currentMonthStr);
  const [monthlyFilter, setMonthlyFilter] = useState<'all' | 'sick_only' | 'absent_only'>('all');
  const [isMonthlyAttendanceModalOpen, setIsMonthlyAttendanceModalOpen] = useState(false);
  const [printableMonthlySheet, setPrintableMonthlySheet] = useState<{ month: string; year: string } | null>(null);

  const handlePrevAttendanceMonth = () => {
    let m = parseInt(selectedAttendanceMonth) - 1;
    let y = parseInt(selectedAttendanceYear);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedAttendanceMonth(String(m).padStart(2, '0'));
    setSelectedAttendanceYear(String(y));
  };

  const handleNextAttendanceMonth = () => {
    let m = parseInt(selectedAttendanceMonth) + 1;
    let y = parseInt(selectedAttendanceYear);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedAttendanceMonth(String(m).padStart(2, '0'));
    setSelectedAttendanceYear(String(y));
  };

  const handleSaveAttendanceBatch = async (soldierIds: string[], dates: string[], status: any) => {
    try {
      const records = [];
      for (const sId of soldierIds) {
        for (const dateStr of dates) {
          records.push({
            id: `att_${sId}_${dateStr}`,
            soldierId: sId,
            date: dateStr,
            statusCode: status,
            recordedBy: currentUser.id,
            updatedAt: new Date().toISOString()
          });
        }
      }
      const res = await fetchWithRetry('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (!res.ok) throw new Error('فشل حفظ بيانات الحضور والعديد');
      await refreshAttendanceHistory();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تحديث الحضور والعديد');
    }
  };

  const handleSingleDayAttendanceChange = async (dateStr: string, newStatus: string) => {
    try {
      const record = {
        id: `att_${soldierId}_${dateStr}`,
        soldierId: soldierId,
        date: dateStr,
        statusCode: newStatus,
        recordedBy: currentUser.id,
        updatedAt: new Date().toISOString()
      };
      const res = await fetchWithRetry('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [record] })
      });
      if (!res.ok) throw new Error('فشل تحديث سجل اليوم');
      await refreshAttendanceHistory();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ في تحديث الحضور');
    }
  };

  const monthlySheetData = useMemo(() => {
    const daysInMonth = new Date(parseInt(selectedAttendanceYear), parseInt(selectedAttendanceMonth), 0).getDate();
    const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const list = daysList.map(dayNum => {
      const dayPadded = String(dayNum).padStart(2, '0');
      const dateStr = `${selectedAttendanceYear}-${selectedAttendanceMonth}-${dayPadded}`;
      
      let dayName = '';
      try {
        const dObj = new Date(parseInt(selectedAttendanceYear), parseInt(selectedAttendanceMonth) - 1, dayNum);
        dayName = dObj.toLocaleDateString('ar-EG', { weekday: 'long' });
      } catch {}

      const record = attendanceHistory.find(a => a.date === dateStr);
      const rawCode = record ? record.statusCode : null;

      let normCode = 'unrecorded';
      const rCode = rawCode as string;
      if (rCode === 'ح' || rCode === 'حاضر') normCode = 'ح';
      else if (rCode === 'غ' || rCode === 'غائب' || rCode === 'غياب') normCode = 'غ';
      else if (rCode === 'إ' || rCode === 'إجازة' || rCode === 'مجاز') normCode = 'إ';
      else if (rCode === 'م' || rCode === 'مأمورية' || rCode === 'مأموريات') normCode = 'م';
      else if (rCode === 'ع' || rCode === 'مريض' || rCode === 'طبي' || rCode === 'ط' || rCode === 'مرضية') normCode = 'ع';
      else if (rCode === 'ت' || rCode === 'تأخير' || rCode === 'تأخر') normCode = 'ت';

      return {
        dayNum,
        dateStr,
        dayName,
        record,
        rawCode,
        normCode
      };
    });

    const presentCount = list.filter(d => d.normCode === 'ح').length;
    const absentCount = list.filter(d => d.normCode === 'غ').length;
    const leaveCount = list.filter(d => d.normCode === 'إ').length;
    const dutyCount = list.filter(d => d.normCode === 'م').length;
    const sickCount = list.filter(d => d.normCode === 'ع').length;
    const tardyCount = list.filter(d => d.normCode === 'ت').length;
    const unrecordedCount = list.filter(d => d.normCode === 'unrecorded').length;

    let filtered = list;
    if (monthlyFilter === 'sick_only') {
      filtered = list.filter(d => d.normCode === 'ع');
    } else if (monthlyFilter === 'absent_only') {
      filtered = list.filter(d => d.normCode === 'غ' || d.normCode === 'ع' || d.normCode === 'ت');
    }

    return {
      daysInMonth,
      list,
      allDays: list,
      filtered,
      presentCount,
      absentCount,
      leaveCount,
      dutyCount,
      sickCount,
      tardyCount,
      unrecordedCount
    };
  }, [attendanceHistory, selectedAttendanceMonth, selectedAttendanceYear, monthlyFilter]);

  // Today's formatted date string YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayPadded = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayPadded}`;
  }, []);

  const todayRecord = useMemo(() => {
    return attendanceHistory.find(a => a.date === todayDateStr);
  }, [attendanceHistory, todayDateStr]);

  // Discipline & Attendance Analytics Stats
  const disciplineStats = useMemo(() => {
    const totalDaysCount = attendanceHistory.length;
    const presentDaysCount = attendanceHistory.filter(r => (r.statusCode as string) === 'ح' || (r.statusCode as string) === 'حاضر').length;
    const absentDaysCount = attendanceHistory.filter(r => (r.statusCode as string) === 'غ' || (r.statusCode as string) === 'غائب').length;
    const dutyDaysCount = attendanceHistory.filter(r => (r.statusCode as string) === 'م' || (r.statusCode as string) === 'مأمورية').length;
    const rate = totalDaysCount > 0 ? Math.round(((presentDaysCount + dutyDaysCount) / totalDaysCount) * 100) : 100;

    const sorted = [...attendanceHistory].sort((a, b) => a.date.localeCompare(b.date));
    let currentStreak = 0;
    let maxAbsenceStreak = 0;
    let tempAbsence = 0;

    for (const r of sorted) {
      const code = r.statusCode as string;
      if (code === 'ح' || code === 'حاضر') {
        currentStreak++;
        tempAbsence = 0;
      } else if (code === 'غ' || code === 'غائب' || code === 'غياب') {
        currentStreak = 0;
        tempAbsence++;
        if (tempAbsence > maxAbsenceStreak) maxAbsenceStreak = tempAbsence;
      } else {
        tempAbsence = 0;
      }
    }

    let riskLevel: 'excellent' | 'good' | 'warning' | 'danger' = 'excellent';
    let riskLabel = 'انضباط ممتاز ورائع 🛡️';
    let riskBadgeBg = 'bg-emerald-500/10 text-emerald-800 border-emerald-300';
    let adviceText = 'الفرد ملتزم بجميع التعليمات العسكرية ومواظب في الخدمة والعديد.';

    if (rate < 60 || absentDaysCount >= 5) {
      riskLevel = 'danger';
      riskLabel = 'خطورة انضباطية مرتفعة (غياب متكرر) 🚨';
      riskBadgeBg = 'bg-rose-500/10 text-rose-800 border-rose-300';
      adviceText = 'يتطلب توجيه إنذار رسمي كتابي واستدعاء الفرد للتحقيق في أسباب الغياب المتكرر.';
    } else if (rate < 80 || absentDaysCount >= 2) {
      riskLevel = 'warning';
      riskLabel = 'تحذير انضباطي (يلزم المتابعة) ⚠️';
      riskBadgeBg = 'bg-amber-500/10 text-amber-800 border-amber-300';
      adviceText = 'ينصح بالتنبيه الشفهي ومتابعة حضور الفرد بانتظام خلال الفترة القادمة.';
    } else if (rate < 92) {
      riskLevel = 'good';
      riskLabel = 'مستوى انضباط جيد جداً 🟢';
      riskBadgeBg = 'bg-sky-500/10 text-sky-800 border-sky-300';
      adviceText = 'سجل الحضور جيد ونسبة الالتزام مرتفعة ضمن المعدلات المقبولة.';
    }

    return {
      currentStreak,
      maxAbsenceStreak,
      riskLevel,
      riskLabel,
      riskBadgeBg,
      adviceText
    };
  }, [attendanceHistory]);

  // Date Range Batch Modal State
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState(todayDateStr);
  const [rangeEndDate, setRangeEndDate] = useState(todayDateStr);
  const [rangeStatus, setRangeStatus] = useState('م');

  const handleSaveDateRangeAttendance = async () => {
    if (!rangeStartDate || !rangeEndDate) {
      alert('يرجى تحديد تاريخ البداية وتاريخ النهاية');
      return;
    }
    const start = new Date(rangeStartDate);
    const end = new Date(rangeEndDate);
    if (start > end) {
      alert('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
      return;
    }

    const datesList: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      datesList.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    await handleSaveAttendanceBatch([soldierId], datesList, rangeStatus);
    setIsRangeModalOpen(false);
    alert(`تم تحضير الفترة الزمنية من ${rangeStartDate} إلى ${rangeEndDate} بحالة (${rangeStatus}) بنجاح`);
  };

  // Disciplinary Penalties Log State
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<Array<{
    id: string;
    date: string;
    type: string;
    authority: string;
    reason: string;
    notes?: string;
    issuerName: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`penalties_${soldierId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'pen_1',
        date: '2026-06-15',
        type: 'لفت نظر شفهي',
        authority: 'قائد الكتيبة',
        reason: 'التأخر عن موعد التحضير الصباحي المعتمد',
        issuerName: 'النقيب / علي المحسني',
        notes: 'تم أخذ تعهد بعدم التكرار'
      }
    ];
  });

  const [isAddPenaltyModalOpen, setIsAddPenaltyModalOpen] = useState(false);
  const [newPenaltyType, setNewPenaltyType] = useState('إنذار كتابي رسمي');
  const [newPenaltyAuthority, setNewPenaltyAuthority] = useState('قائد الكتيبة');
  const [newPenaltyReason, setNewPenaltyReason] = useState('');
  const [newPenaltyDate, setNewPenaltyDate] = useState(todayDateStr);
  const [newPenaltyNotes, setNewPenaltyNotes] = useState('');

  const handleAddPenalty = () => {
    if (!newPenaltyReason.trim()) {
      alert('يرجى كتابة سبب الإجراء أو الجزاء الانضباطي');
      return;
    }
    const record = {
      id: `pen_${Date.now()}`,
      date: newPenaltyDate,
      type: newPenaltyType,
      authority: newPenaltyAuthority,
      reason: newPenaltyReason,
      notes: newPenaltyNotes,
      issuerName: currentUser.name || 'الضابط المناوب'
    };
    const updated = [record, ...disciplinaryRecords];
    setDisciplinaryRecords(updated);
    try {
      localStorage.setItem(`penalties_${soldierId}`, JSON.stringify(updated));
    } catch {}
    setIsAddPenaltyModalOpen(false);
    setNewPenaltyReason('');
    setNewPenaltyNotes('');
  };

  const handleDeletePenalty = (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا الإجراء الانضباطي؟')) return;
    const updated = disciplinaryRecords.filter(p => p.id !== id);
    setDisciplinaryRecords(updated);
    try {
      localStorage.setItem(`penalties_${soldierId}`, JSON.stringify(updated));
    } catch {}
  };

  // View Modes & Active Tabs for Attendance/Discipline
  const [attendanceViewMode, setAttendanceViewMode] = useState<'table' | 'grid'>('table');
  const [disciplineActiveTab, setDisciplineActiveTab] = useState<'penalties' | 'commendations' | 'guards'>('penalties');

  // Commendations & Honors State
  const [commendationRecords, setCommendationRecords] = useState<Array<{
    id: string;
    date: string;
    type: string;
    authority: string;
    reason: string;
    notes?: string;
    issuerName: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`commendations_${soldierId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'com_1',
        date: '2026-05-10',
        type: 'كتاب شكر وتقدير',
        authority: 'قائد اللواء العسكري',
        reason: 'الانضباط التام والأداء المتميز في تنفيذ مهام الخدمة والمناوبة',
        issuerName: 'العميد الركن / أحمد القحطاني',
        notes: 'تم منح قدم ممتاز لمكافأة الالتزام'
      }
    ];
  });

  const [isAddCommendationModalOpen, setIsAddCommendationModalOpen] = useState(false);
  const [newCommendationType, setNewCommendationType] = useState('كتاب شكر وتقدير');
  const [newCommendationAuthority, setNewCommendationAuthority] = useState('قائد الكتيبة');
  const [newCommendationReason, setNewCommendationReason] = useState('');
  const [newCommendationDate, setNewCommendationDate] = useState(todayDateStr);
  const [newCommendationNotes, setNewCommendationNotes] = useState('');

  const handleAddCommendation = () => {
    if (!newCommendationReason.trim()) {
      alert('يرجى كتابة سبب الثناء أو التكريم');
      return;
    }
    const record = {
      id: `com_${Date.now()}`,
      date: newCommendationDate,
      type: newCommendationType,
      authority: newCommendationAuthority,
      reason: newCommendationReason,
      notes: newCommendationNotes,
      issuerName: currentUser.name || 'الضابط المناوب'
    };
    const updated = [record, ...commendationRecords];
    setCommendationRecords(updated);
    try {
      localStorage.setItem(`commendations_${soldierId}`, JSON.stringify(updated));
    } catch {}
    setIsAddCommendationModalOpen(false);
    setNewCommendationReason('');
    setNewCommendationNotes('');
  };

  const handleDeleteCommendation = (id: string) => {
    if (!confirm('هل أنت تأكد من حذف سجل الشكر والثناء؟')) return;
    const updated = commendationRecords.filter(c => c.id !== id);
    setCommendationRecords(updated);
    try {
      localStorage.setItem(`commendations_${soldierId}`, JSON.stringify(updated));
    } catch {}
  };

  // Guard Duty Shifts State
  const [guardRecords, setGuardRecords] = useState<Array<{
    id: string;
    date: string;
    shift: string;
    location: string;
    status: string;
    notes?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`guards_${soldierId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'grd_1',
        date: todayDateStr,
        shift: 'نوبة ليلية (12 ص - 6 ص)',
        location: 'بوابة الكتيبة الرئيسية',
        status: 'تم التنفيذ بنجاح 🟢',
        notes: 'انضباط ممتاز أثناء اليقظة العسكرية'
      }
    ];
  });

  const [isAddGuardModalOpen, setIsAddGuardModalOpen] = useState(false);
  const [newGuardDate, setNewGuardDate] = useState(todayDateStr);
  const [newGuardShift, setNewGuardShift] = useState('نوبة صباحية (6 ص - 12 م)');
  const [newGuardLocation, setNewGuardLocation] = useState('بوابة القيادة الرئيسية');
  const [newGuardNotes, setNewGuardNotes] = useState('');

  const handleAddGuard = () => {
    const record = {
      id: `grd_${Date.now()}`,
      date: newGuardDate,
      shift: newGuardShift,
      location: newGuardLocation,
      status: 'مكلف بالخدمة 🛡️',
      notes: newGuardNotes
    };
    const updated = [record, ...guardRecords];
    setGuardRecords(updated);
    try {
      localStorage.setItem(`guards_${soldierId}`, JSON.stringify(updated));
    } catch {}
    setIsAddGuardModalOpen(false);
    setNewGuardNotes('');
  };

  const handleDeleteGuard = (id: string) => {
    if (!confirm('هل أنت تأكد من حذف نوبة الخدمة؟')) return;
    const updated = guardRecords.filter(g => g.id !== id);
    setGuardRecords(updated);
    try {
      localStorage.setItem(`guards_${soldierId}`, JSON.stringify(updated));
    } catch {}
  };

  // Military Timeline (السجل الزمني للعسكري) States & Configuration
  const TIMELINE_CATEGORY_MAP: Record<string, { label: string; icon: any; badgeBg: string; textColor: string; borderColor: string; dotBg: string; emoji: string }> = useMemo(() => ({
    all: { label: 'جميع الأحداث', icon: History, badgeBg: 'bg-slate-800', textColor: 'text-slate-200', borderColor: 'border-slate-700', dotBg: 'bg-slate-500', emoji: '🌐' },
    service_start: { label: 'بداية الخدمة', icon: Flag, badgeBg: 'bg-emerald-500/20', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/40', dotBg: 'bg-emerald-500', emoji: '🟢' },
    promotions: { label: 'الترقيات', icon: ChevronUp, badgeBg: 'bg-amber-500/20', textColor: 'text-amber-300', borderColor: 'border-amber-500/40', dotBg: 'bg-amber-500', emoji: '⭐' },
    transfers: { label: 'التنقلات', icon: ArrowLeftRight, badgeBg: 'bg-sky-500/20', textColor: 'text-sky-300', borderColor: 'border-sky-500/40', dotBg: 'bg-sky-500', emoji: '🔄' },
    postings: { label: 'التكليفات', icon: ShieldCheck, badgeBg: 'bg-indigo-500/20', textColor: 'text-indigo-300', borderColor: 'border-indigo-500/40', dotBg: 'bg-indigo-500', emoji: '🎖️' },
    training: { label: 'التدريب والدورات', icon: GraduationCap, badgeBg: 'bg-cyan-500/20', textColor: 'text-cyan-300', borderColor: 'border-cyan-500/40', dotBg: 'bg-cyan-500', emoji: '📚' },
    discipline: { label: 'الانضباط والعقوبات', icon: AlertTriangle, badgeBg: 'bg-rose-500/20', textColor: 'text-rose-300', borderColor: 'border-rose-500/40', dotBg: 'bg-rose-500', emoji: '🛡️' },
    honors: { label: 'التكريم والإنواط', icon: Medal, badgeBg: 'bg-yellow-500/20', textColor: 'text-yellow-300', borderColor: 'border-yellow-500/40', dotBg: 'bg-yellow-500', emoji: '🏅' },
    leaves: { label: 'الإجازات', icon: Calendar, badgeBg: 'bg-purple-500/20', textColor: 'text-purple-300', borderColor: 'border-purple-500/40', dotBg: 'bg-purple-500', emoji: '📅' },
    medical: { label: 'السجل الطبي', icon: HeartPulse, badgeBg: 'bg-pink-500/20', textColor: 'text-pink-300', borderColor: 'border-pink-500/40', dotBg: 'bg-pink-500', emoji: '🚑' },
    admin_orders: { label: 'القرارات الإدارية', icon: FileText, badgeBg: 'bg-slate-800', textColor: 'text-slate-300', borderColor: 'border-slate-700', dotBg: 'bg-slate-400', emoji: '📄' },
    milestones: { label: 'الأحداث المهمة', icon: Activity, badgeBg: 'bg-orange-500/20', textColor: 'text-orange-300', borderColor: 'border-orange-500/40', dotBg: 'bg-orange-500', emoji: '⚠️' },
    audit_logs: { label: 'سجل التعديلات بالنظام', icon: History, badgeBg: 'bg-zinc-800', textColor: 'text-zinc-300', borderColor: 'border-zinc-700', dotBg: 'bg-zinc-500', emoji: '⚙️' }
  }), []);

  const [customTimelineEvents, setCustomTimelineEvents] = useState<Array<{
    id: string;
    category: string;
    title: string;
    date: string;
    orderNumber?: string;
    authority?: string;
    details: string;
    notes?: string;
    issuerName?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`timeline_custom_${soldierId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [timelineSearchQuery, setTimelineSearchQuery] = useState('');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('all');
  const [timelineSortOrder, setTimelineSortOrder] = useState<'desc' | 'asc'>('desc');
  const [timelineStartDateFilter, setTimelineStartDateFilter] = useState('');
  const [timelineEndDateFilter, setTimelineEndDateFilter] = useState('');

  const [isAddTimelineEventModalOpen, setIsAddTimelineEventModalOpen] = useState(false);
  const [newTlCategory, setNewTlCategory] = useState('training');
  const [newTlTitle, setNewTlTitle] = useState('');
  const [newTlDate, setNewTlDate] = useState(todayDateStr);
  const [newTlOrderNumber, setNewTlOrderNumber] = useState('');
  const [newTlAuthority, setNewTlAuthority] = useState('قيادة الكتيبة');
  const [newTlDetails, setNewTlDetails] = useState('');
  const [newTlNotes, setNewTlNotes] = useState('');

  const [selectedTimelineDetail, setSelectedTimelineDetail] = useState<any | null>(null);
  const [printableTimelinePass, setPrintableTimelinePass] = useState<any | null>(null);

  const handleAddCustomTimelineEvent = () => {
    if (!newTlTitle.trim() || !newTlDetails.trim()) {
      alert('يرجى ملء عنوان الحدث الزمني وتفاصيل الإجراء العسكري');
      return;
    }

    const record = {
      id: `tl_${Date.now()}`,
      category: newTlCategory,
      title: newTlTitle,
      date: newTlDate || todayDateStr,
      orderNumber: newTlOrderNumber,
      authority: newTlAuthority,
      details: newTlDetails,
      notes: newTlNotes,
      issuerName: currentUser.name || 'الموثق العسكري'
    };

    const updated = [record, ...customTimelineEvents];
    setCustomTimelineEvents(updated);
    try {
      localStorage.setItem(`timeline_custom_${soldierId}`, JSON.stringify(updated));
    } catch {}

    setIsAddTimelineEventModalOpen(false);
    setNewTlTitle('');
    setNewTlOrderNumber('');
    setNewTlDetails('');
    setNewTlNotes('');
  };

  const handleDeleteCustomTimelineEvent = (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا الحدث الزمني من المسيرة العسكرية؟')) return;
    const updated = customTimelineEvents.filter(e => e.id !== id);
    setCustomTimelineEvents(updated);
    try {
      localStorage.setItem(`timeline_custom_${soldierId}`, JSON.stringify(updated));
    } catch {}
    if (selectedTimelineDetail?.id === `tl_custom_${id}`) {
      setSelectedTimelineDetail(null);
    }
  };

  // Quick Month Batch Actions
  const handleMarkAllPresentForMonth = async () => {
    if (!confirm(`هل أنت تأكد من تحضير جميع الأيام غير المحضرة لشهر ${selectedAttendanceMonth}/${selectedAttendanceYear} بحالة "حاضر (ح)"؟`)) return;
    const unrecordedDates = monthlySheetData.allDays
      .filter(d => d.normCode === 'unrecorded')
      .map(d => d.dateStr);
    
    if (unrecordedDates.length === 0) {
      alert('جميع أيام هذا الشهر محسومة ومسجلة بالفعل!');
      return;
    }
    await handleSaveAttendanceBatch([soldierId], unrecordedDates, 'ح');
    alert(`تم تحضير (${unrecordedDates.length}) يوم بحالة "حاضر (ح)" بنجاح`);
  };

  const handleMarkWeekendsForMonth = async () => {
    if (!confirm(`هل تريد تعيين الجمعة والسبت لشهر ${selectedAttendanceMonth}/${selectedAttendanceYear} كأيام "إجازة أسبوعية (إ)"؟`)) return;
    const weekendDates = monthlySheetData.allDays
      .filter(d => d.dayName === 'الجمعة' || d.dayName === 'السبت')
      .map(d => d.dateStr);

    if (weekendDates.length === 0) return;
    await handleSaveAttendanceBatch([soldierId], weekendDates, 'إ');
    alert(`تم تعيين عطلات نهاية الأسبوع (${weekendDates.length} يوم) بحالة "إجازة (إ)" بنجاح`);
  };

  const handleShareDisciplineWhatsApp = () => {
    if (!soldier) return;
    const text = `*📋 تقرير الانضباط والحضور الموحد - اللواء العسكري*
*الفرد:* ${soldier.rank} / ${soldier.fullName}
*الرقم العسكري:* ${soldier.militaryNumber}
*الوحدة:* ${soldierUnitName}
----------------------------------
*📊 نسبة الانضباط والحضور العام:* ${attendanceRate}%
*🛡️ التقييم الانضباطي:* ${disciplineStats.riskLabel}
*🔥 التواجد المستمر الحالي:* ${disciplineStats.currentStreak} أيام
----------------------------------
*📈 إحصائيات الأيام:*
• أيام الحضور (ح): ${presentDays} يوم
• أيام الغياب (غ): ${absentDays} يوم
• المأموريات (م): ${dutyDays} يوم
• الإجازات المعتمدة (إ): ${attendanceHistory.filter(a => (a.statusCode as string) === 'إ' || (a.statusCode as string) === 'إجازة').length} يوم
• المرضية والعذر (ع): ${attendanceHistory.filter(a => (a.statusCode as string) === 'ع' || (a.statusCode as string) === 'مريض').length} يوم
----------------------------------
*⚖️ الجزاءات والانضباط:* ${disciplinaryRecords.length > 0 ? `تم تسجيل (${disciplinaryRecords.length}) إجراء انضباطي` : 'لا توجد جزاءات مقيدة'}
----------------------------------
*تاريخ الاستخراج:* ${new Date().toLocaleDateString('ar-EG')}`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Legacy Sick Leave form states
  const [slStartDate, setSlStartDate] = useState('');
  const [slEndDate, setSlEndDate] = useState('');
  const [slIllnessType, setSlIllnessType] = useState('');
  const [slDoctor, setSlDoctor] = useState('');
  const [slHospital, setSlHospital] = useState('');
  const [slNotes, setSlNotes] = useState('');
  const [slSubmitting, setSlSubmitting] = useState(false);

  // Auto calculate leave duration when dates change
  useEffect(() => {
    if (leaveStartDate && leaveEndDate) {
      const d1 = new Date(leaveStartDate);
      const d2 = new Date(leaveEndDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setLeaveDuration(diffDays);
      }
    }
  }, [leaveStartDate, leaveEndDate]);

  // Auto calculate edit leave duration
  useEffect(() => {
    if (editStartDate && editEndDate) {
      const d1 = new Date(editStartDate);
      const d2 = new Date(editEndDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setEditDuration(diffDays);
      }
    }
  }, [editStartDate, editEndDate]);

  // Refresh helper functions
  const refreshLeavesList = async () => {
    try {
      const res = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves`);
      if (res.ok) {
        const data = await safeJson(res, []);
        setSickLeavesList(data);
      }
    } catch (err) {
      console.error("Error refreshing leaves:", err);
    }
  };

  const refreshAttendanceHistory = async () => {
    try {
      const res = await fetchWithRetry(`/api/soldiers/${soldierId}/attendance-history`);
      if (res.ok) {
        const data = await safeJson(res, []);
        setAttendanceHistory(data);
      }
      onAttendanceUpdated?.();
    } catch (err) {
      console.error("Error refreshing attendance history:", err);
    }
  };

  // Handlers for Delete Leave
  const handleOpenDeleteLeaveModal = (leave: SickLeave) => {
    setDeletingLeave(leave);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleDeleteLeaveConfirm = async () => {
    if (!deletingLeave || !soldier) return;
    setDeleteSubmitting(true);
    try {
      // 1. Delete leave record
      const res = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves/${deletingLeave.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('فشل حذف الإجازة من الخادم');

      // 2. Reset attendance records for that leave date range to "لم يتم تحضيره"
      await fetchWithRetry(`/api/soldiers/${soldierId}/reset-attendance-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: deletingLeave.startDate,
          endDate: deletingLeave.endDate
        })
      });

      // 3. Add audit log
      await fetchWithRetry(`/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          userId: currentUser.id,
          userName: currentUser.name || "مدير النظام",
          userRole: currentUser.role,
          actionType: 'حذف',
          tableName: 'sick_leaves',
          details: `حذف إجازة (${deletingLeave.leaveType || deletingLeave.illnessType}) للفرد ${soldier.fullName} للفترة (${deletingLeave.startDate} إلى ${deletingLeave.endDate}) وإعادة تعيين الحضور إلى (لم يتم تحضيره).`,
          timestamp: new Date().toISOString()
        })
      });

      setIsDeleteConfirmModalOpen(false);
      setDeletingLeave(null);

      alert(`تم حذف الإجازة بنجاح، وتعديل حالة الحضور للفترة من (${deletingLeave.startDate}) إلى (${deletingLeave.endDate}) إلى (لم يتم تحضيره).`);

      await refreshLeavesList();
      await refreshAttendanceHistory();
      await fetchFullSoldier();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حذف الإجازة');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Handlers for Edit Leave
  const handleOpenEditLeaveModal = (leave: SickLeave) => {
    setEditingLeave(leave);
    const rawType = leave.leaveType || leave.illnessType || 'استحقاق';
    let lType: 'استحقاق' | 'إذن' | 'طارئة' | 'مرضية' = 'استحقاق';
    if (rawType.includes('مرض') || rawType === 'إجازة مرضية') lType = 'مرضية';
    else if (rawType.includes('طارئ')) lType = 'طارئة';
    else if (rawType.includes('إذن')) lType = 'إذن';
    else lType = 'استحقاق';

    setEditLeaveType(lType);
    setEditLeaveDiagnosis(leave.diagnosis || (leave.illnessType !== lType ? leave.illnessType : ''));
    setEditStartDate(leave.startDate || '');
    setEditEndDate(leave.endDate || '');
    setEditDuration(leave.duration || 1);
    setEditReason(leave.reason || '');
    setEditGrantingAuthority(leave.grantingAuthority || leave.doctorName || 'الكتيبة');
    setEditOrderNumber(leave.orderNumber || '');
    setEditOrderDate(leave.orderDate || leave.startDate || '');
    setEditNotes(leave.notes || '');
    setIsEditLeaveModalOpen(true);
  };

  const handleSaveEditLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !soldier) return;
    setEditLeaveSubmitting(true);
    try {
      const finalDuration = Number(editDuration) || 1;
      const isSickLeave = editLeaveType === 'مرضية';
      const computedLeaveType = isSickLeave ? 'إجازة مرضية' : editLeaveType;
      const computedIllness = isSickLeave ? (editLeaveDiagnosis.trim() || 'إجازة مرضية') : editLeaveType;
      const computedReason = editReason.trim()
        ? editReason
        : (isSickLeave ? `إجازة مرضية (التشخيص: ${computedIllness})` : 'إجازة رسمية');

      // 1. Update leave in backend
      const res = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves/${editingLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editStartDate,
          endDate: editEndDate,
          illnessType: computedIllness,
          leaveType: computedLeaveType,
          diagnosis: editLeaveDiagnosis.trim(),
          duration: finalDuration,
          doctorName: editGrantingAuthority,
          grantingAuthority: editGrantingAuthority,
          orderNumber: editOrderNumber,
          orderDate: editOrderDate || editStartDate,
          reason: computedReason,
          notes: editNotes,
          performedBy: currentUser.id,
          performedByName: currentUser.name || "مدير النظام",
          performedByRole: currentUser.role
        })
      });

      if (!res.ok) throw new Error('فشل حفظ تعديلات الإجازة');

      // 2. Reset old attendance date range
      await fetchWithRetry(`/api/soldiers/${soldierId}/reset-attendance-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editingLeave.startDate,
          endDate: editingLeave.endDate
        })
      });

      // 3. Register new attendance records for the updated range
      const attendanceRecords = [];
      let curDate = new Date(editStartDate);
      const stopDate = new Date(editEndDate);
      const statusCodeToUse = isSickLeave ? 'ع' : 'إ';
      while (curDate <= stopDate) {
        const dateStr = curDate.toISOString().split('T')[0];
        attendanceRecords.push({
          id: `att_${soldierId}_${dateStr}`,
          soldierId: soldierId,
          date: dateStr,
          statusCode: statusCodeToUse,
          recordedBy: currentUser.id,
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
      }

      // 4. Audit log
      await fetchWithRetry(`/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          userId: currentUser.id,
          userName: currentUser.name || "مدير النظام",
          userRole: currentUser.role,
          actionType: 'تعديل',
          tableName: 'sick_leaves',
          details: `تعديل إجازة (${computedLeaveType}) للفرد ${soldier.fullName} لتصبح الفترة (${editStartDate} إلى ${editEndDate}).`,
          timestamp: new Date().toISOString()
        })
      });

      alert('تم تعديل بيانات الإجازة والأمر الإداري وسجل الحضور بنجاح.');

      setIsEditLeaveModalOpen(false);
      setEditingLeave(null);

      await refreshLeavesList();
      await refreshAttendanceHistory();
      await fetchFullSoldier();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تعديل الإجازة');
    } finally {
      setEditLeaveSubmitting(false);
    }
  };

  // Leave Balances Calculation
  const leaveBalances = useMemo(() => {
    let usedAnnual = 0;
    let usedEmergency = 0;
    let usedMedical = 0;
    let countPermission = 0;
    let usedPermissionDays = 0;

    sickLeavesList.forEach(item => {
      const type = item.leaveType || item.illnessType || 'استحقاق';
      const dur = Number(item.duration) || 1;

      if (type === 'استحقاق' || type.includes('اعتياد') || type.includes('سنوي')) {
        usedAnnual += dur;
      } else if (type === 'طارئة' || type.includes('طارئ')) {
        usedEmergency += dur;
      } else if (type === 'إذن' || type.includes('خروج')) {
        countPermission += 1;
        usedPermissionDays += dur;
      } else {
        usedMedical += dur;
      }
    });

    return {
      annualTotal: 30,
      annualUsed: usedAnnual,
      annualRemaining: Math.max(0, 30 - usedAnnual),

      emergencyTotal: 10,
      emergencyUsed: usedEmergency,
      emergencyRemaining: Math.max(0, 10 - usedEmergency),

      medicalTotal: 30,
      medicalUsed: usedMedical,

      permissionCount: countPermission,
      permissionDays: usedPermissionDays
    };
  }, [sickLeavesList]);

  // Helper for alert status on active / expired leaves
  const getLeaveAlertInfo = (leave: SickLeave) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(leave.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(leave.endDate);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (today >= start && today <= end) {
      if (diffDays === 1) {
        return {
          text: '⚠️ تنبيه: متبقي يوم واحد على انتهاء الإجازة ووقت المباشرة غداً',
          badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
        };
      }
      return {
        text: '🟢 إجازة سارية المفعول',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
      };
    }

    if (today > end && (leave.status === 'نشط' || soldier?.militaryStatus === 'إجازة')) {
      const overdue = Math.abs(diffDays);
      return {
        text: `🚨 إنذار: تأخر عن العودة والمباشرة (متأخر بـ ${overdue} أيام)`,
        badge: 'bg-rose-100 text-rose-900 border-rose-300 font-black animate-pulse'
      };
    }

    return {
      text: '⚪ إجازة مكتملة / عائد للخدمة',
      badge: 'bg-slate-100 text-slate-600 border-slate-200 font-medium'
    };
  };

  // Edit Soldier Form States
  const [editName, setEditName] = useState('');
  const [editMilNum, setEditMilNum] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editBloodType, setEditBloodType] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');
  const [editBattalion, setEditBattalion] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPlatoon, setEditPlatoon] = useState('');
  const [editMilStatus, setEditMilStatus] = useState('');
  const [editMedicalHistory, setEditMedicalHistory] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Attachment form state
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentSubmitting, setAttachmentSubmitting] = useState(false);

  // Transfer history selected for detail modal
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  const fetchFullSoldier = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/soldiers/${soldierId}`);
      if (!res.ok) throw new Error('فشل جلب ملف العسكري من قاعدة البيانات');
      const data: Soldier = await safeJson(res);
      
      // Unit permission check: restricted users can only view soldiers in their assigned unit
      const isRestricted = currentUser && currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
      if (isRestricted && currentUser.unitId && data.unitId !== currentUser.unitId) {
        throw new Error('غير مصرح لك باستعراض بيانات منتسبي الوحدات أو الكتائب الأخرى.');
      }

      setSoldier(data);

      // Populate edit states
      setEditName(data.fullName || '');
      setEditMilNum(data.militaryNumber || '');
      setEditRank(data.rank || '');
      setEditUnitId(data.unitId || '');
      setEditNationalId(data.nationalId || '');
      setEditBirthDate(data.birthDate || '');
      setEditBloodType(data.bloodType || 'A+');
      setEditPhone(data.phoneNumber || '');
      setEditAddress(data.address || '');
      setEditEmergency(data.emergencyContact || '');
      setEditQualification(data.qualification || '');
      setEditSpecialization(data.specialization || '');
      setEditJoinDate(data.joinDate || '');
      setEditBattalion(data.battalion || '');
      setEditCompany(data.company || '');
      setEditPlatoon(data.platoon || '');
      setEditMilStatus(data.militaryStatus || 'على رأس العمل');
      setEditMedicalHistory(data.medicalHistory || '');
      setEditPhotoUrl(data.photoUrl || '');

    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullSoldier();
  }, [soldierId]);

  // Load soldier custodies list from JSON string or localStorage
  useEffect(() => {
    if (!soldier) return;
    let list: MilitaryCustody[] = [];
    if (soldier.custodiesHistory) {
      try {
        const parsed = JSON.parse(soldier.custodiesHistory);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        console.error('Error parsing custodiesHistory:', e);
      }
    }
    if (list.length === 0) {
      try {
        const savedLocal = localStorage.getItem(`soldier_custodies_${soldier.id}`);
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {
        console.error('Error loading local custodies:', e);
      }
    }
    setCustodiesList(list);
  }, [soldier]);

  const resetCustodyForm = () => {
    setEditingCustody(null);
    setCustodyNumber('');
    setCustodyType('بندقية آلي');
    setCustodyTypeCustom('');
    setCustodyDescription('');
    setCustodyQuantity(1);
    setCustodyIssueDate(new Date().toISOString().split('T')[0]);
    setCustodyStatus('نشط');
    setCustodyOrderRef('');
    setCustodyIssuingDept('التسليح العسكري');
    setCustodyIssuingDeptCustom('');
    setCustodyIssuingOfficer(currentUser.name || 'مسؤول الإمداد والتسليح');
    setCustodyNotes('');
    setCustodyIndividualSigned(true);
    setCustodyOfficerSigned(true);
    setCustodyReturnDate('');
  };

  const handleOpenNewCustodyModal = () => {
    resetCustodyForm();
    setIsCustodyModalOpen(true);
  };

  const handleEditCustody = (item: MilitaryCustody) => {
    setEditingCustody(item);
    setCustodyNumber(item.custodyNumber);
    
    const knownTypes = ['بندقية آلي', 'مسدس شخصي', 'جهاز اتصال لاسلكي', 'سيارة / طقم عسكري', 'نظارة رؤية ليلية', 'درع واقي وخوذة', 'أثاث ومستلزمات مكتبية', 'أمانات ومهمات شخصية'];
    if (knownTypes.includes(item.type)) {
      setCustodyType(item.type);
      setCustodyTypeCustom('');
    } else {
      setCustodyType('أخرى');
      setCustodyTypeCustom(item.type);
    }

    setCustodyDescription(item.description || '');
    setCustodyQuantity(item.quantity || 1);
    setCustodyIssueDate(item.issueDate || new Date().toISOString().split('T')[0]);
    setCustodyStatus(item.status);
    setCustodyOrderRef(item.orderRef || '');

    const knownDepts = ['التسليح العسكري', 'الإمداد والتموين', 'الشؤون الفنية والقيادة', 'شؤون الأفراد', 'ركن الإشارة والاتصالات'];
    if (knownDepts.includes(item.issuingDept)) {
      setCustodyIssuingDept(item.issuingDept);
      setCustodyIssuingDeptCustom('');
    } else {
      setCustodyIssuingDept('أخرى');
      setCustodyIssuingDeptCustom(item.issuingDept);
    }

    setCustodyIssuingOfficer(item.issuingOfficer || '');
    setCustodyNotes(item.notes || '');
    setCustodyIndividualSigned(Boolean(item.individualSigned));
    setCustodyOfficerSigned(Boolean(item.officerSigned));
    setCustodyReturnDate(item.returnDate || '');
    setIsCustodyModalOpen(true);
  };

  const handleSaveCustodySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodyNumber.trim()) {
      alert('الرجاء إدخال رقم العهدة أو الرقم المميز للسلاح/المركبة');
      return;
    }
    const finalType = custodyType === 'أخرى' ? (custodyTypeCustom.trim() || 'عهدة عسكرية') : custodyType;
    const finalDept = custodyIssuingDept === 'أخرى' ? (custodyIssuingDeptCustom.trim() || 'جهة إدارية') : custodyIssuingDept;

    setCustodySubmitting(true);
    try {
      const newItem: MilitaryCustody = {
        id: editingCustody ? editingCustody.id : `cust_${Date.now()}`,
        soldierId,
        custodyNumber: custodyNumber.trim(),
        type: finalType,
        description: custodyDescription.trim(),
        quantity: Number(custodyQuantity) || 1,
        issueDate: custodyIssueDate || new Date().toISOString().split('T')[0],
        status: custodyStatus,
        orderRef: custodyOrderRef.trim() || undefined,
        issuingDept: finalDept,
        issuingOfficer: custodyIssuingOfficer.trim() || (currentUser.name || 'مسؤول الإمداد والتسليح'),
        notes: custodyNotes.trim() || undefined,
        individualSigned: custodyIndividualSigned,
        officerSigned: custodyOfficerSigned,
        returnDate: custodyStatus === 'منتهٍ' ? (custodyReturnDate || new Date().toISOString().split('T')[0]) : undefined,
        createdAt: editingCustody?.createdAt || new Date().toISOString()
      };

      let updated: MilitaryCustody[];
      if (editingCustody) {
        updated = custodiesList.map(item => item.id === editingCustody.id ? newItem : item);
      } else {
        updated = [newItem, ...custodiesList];
      }

      setCustodiesList(updated);
      localStorage.setItem(`soldier_custodies_${soldierId}`, JSON.stringify(updated));

      if (soldier) {
        const updatedSoldier = { ...soldier, custodiesHistory: JSON.stringify(updated) };
        setSoldier(updatedSoldier);
        await fetchWithRetry(`/api/soldiers/${soldierId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSoldier)
        });
      }

      onSoldierUpdated?.();
      setIsCustodyModalOpen(false);
      resetCustodyForm();
    } catch (err) {
      console.error('Error saving custody:', err);
    } finally {
      setCustodySubmitting(false);
    }
  };

  const handleClearCustodyStatus = async (item: MilitaryCustody) => {
    if (!window.confirm(`هل أنت متأكد من إخلاء طرف الفرد من العهدة رقم (${item.custodyNumber}) وإرجاعها للجهة؟`)) return;

    const returnDateStr = new Date().toISOString().split('T')[0];
    const updated = custodiesList.map(c => c.id === item.id ? { ...c, status: 'منتهٍ' as const, returnDate: returnDateStr } : c);

    setCustodiesList(updated);
    localStorage.setItem(`soldier_custodies_${soldierId}`, JSON.stringify(updated));

    if (soldier) {
      const updatedSoldier = { ...soldier, custodiesHistory: JSON.stringify(updated) };
      setSoldier(updatedSoldier);
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSoldier)
      });
    }

    onSoldierUpdated?.();
  };

  const handleDeleteCustody = async (itemId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه العهدة نهائياً من السجل؟')) return;

    const updated = custodiesList.filter(c => c.id !== itemId);
    setCustodiesList(updated);
    localStorage.setItem(`soldier_custodies_${soldierId}`, JSON.stringify(updated));

    if (soldier) {
      const updatedSoldier = { ...soldier, custodiesHistory: JSON.stringify(updated) };
      setSoldier(updatedSoldier);
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSoldier)
      });
    }

    onSoldierUpdated?.();
  };

  // Lazy load tab data on activeTab switch
  useEffect(() => {
    if (!soldier) return;

    const loadTabData = async () => {
      setLoadingTab(true);
      try {
        if (activeTab === 'medical') {
          const res = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves`);
          if (res.ok) {
            const data = await safeJson(res, []);
            setSickLeavesList(data);
          }
        } else if (activeTab === 'attendance') {
          const res = await fetchWithRetry(`/api/soldiers/${soldierId}/attendance-history`);
          if (res.ok) {
            const data = await safeJson(res, []);
            setAttendanceHistory(data);
          }
        } else if (activeTab === 'timeline') {
          const res = await fetchWithRetry(`/api/soldiers/${soldierId}/audit-logs`);
          if (res.ok) {
            const data = await safeJson(res, []);
            setAuditLogsList(data);
          }
        }
      } catch (err) {
        console.error("Error loading tab data:", err);
      } finally {
        setLoadingTab(false);
      }
    };

    loadTabData();
  }, [activeTab, soldier]);

  const soldierUnitName = soldier ? (units.find(u => u.id === soldier.unitId)?.name || 'غير معروف') : 'غير معروف';

  // Send full soldier profile via WhatsApp modal selector
  const handleSendWhatsApp = () => {
    if (!soldier) return;
    setIsWhatsAppModalOpen(true);
  };

  const assignmentsList = React.useMemo(() => {
    let list: any[] = [];
    if (!soldier) return list;
    try {
      if (soldier.assignmentsHistory) {
        const parsed = JSON.parse(soldier.assignmentsHistory);
        if (Array.isArray(parsed)) {
          list = [...parsed];
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Sort entries by date desc
    list.sort((a, b) => new Date(b.date || b.orderDate).getTime() - new Date(a.date || a.orderDate).getTime());

    return list;
  }, [soldier]);

  // Unified Aggregated Military Timeline Data Source
  const allTimelineEvents = useMemo(() => {
    if (!soldier) return [];

    const items: Array<{
      id: string;
      category: 'service_start' | 'promotions' | 'transfers' | 'postings' | 'training' | 'discipline' | 'honors' | 'leaves' | 'medical' | 'admin_orders' | 'milestones' | 'audit_logs';
      categoryLabel: string;
      title: string;
      date: string;
      orderNumber?: string;
      authority?: string;
      details: string;
      notes?: string;
      issuerName?: string;
      isCustom?: boolean;
    }> = [];

    // 1. 🟢 بداية الخدمة (service_start)
    if (soldier.joinDate) {
      items.push({
        id: `tl_join_${soldier.id}`,
        category: 'service_start',
        categoryLabel: 'بداية الخدمة',
        title: 'مباشرة الخدمة والالتحاق العسكري الرسمي',
        date: soldier.joinDate,
        authority: (soldier as any).recruitmentOffice || 'مركز التجنيد وإدارة القوة البشرية',
        details: `مباشرة الخدمة العسكرية الرسمية والتعيين الأولي على ملاك وحدة (${soldierUnitName}).`,
        notes: `جهة التجنيد الأولى: ${(soldier as any).recruitmentOffice || 'مركز التجنيد الرئيسي'} - رقم الملف العسكري: ${soldier.militaryNumber}`,
        issuerName: 'إدارة الشؤون العسكرية والتجنيد'
      });
    }

    // 2. ⭐ الترقيات (promotions)
    items.push({
      id: `tl_rank_${soldier.id}`,
      category: 'promotions',
      categoryLabel: 'الترقيات',
      title: `ترقية استحقاق عسكري - رتبة (${soldier.rank})`,
      date: (soldier as any).lastPromotionDate || soldier.joinDate || todayDateStr,
      authority: 'القيادة العامة / إدارة شؤون الضباط والأفراد',
      orderNumber: `أ.ع/${soldier.militaryNumber}/2025`,
      details: `الترقية إلى رتبة (${soldier.rank}) بقرار رسمي معتمد وتعديل المسار الوظيفي بالفرد.`,
      notes: `الرتبة الحالية المعتمدة بالنظام: ${soldier.rank}`,
      issuerName: 'لجنة الترقيات العسكرية الموحدة'
    });

    // 3. 🔄 التنقلات (transfers)
    assignmentsList.forEach((transfer: any, index: number) => {
      items.push({
        id: `tl_transfer_${transfer.id || index}`,
        category: 'transfers',
        categoryLabel: 'التنقلات',
        title: `قرار نقل وتغيير تبعية - ${transfer.type || 'نقل إداري بين الوحدات'}`,
        date: transfer.date || transfer.orderDate || todayDateStr,
        orderNumber: transfer.orderNumber || `ن/ك/${index + 101}`,
        authority: transfer.authority || 'قيادة اللواء / الشؤون الإدارية',
        details: `نقل وحركة ملاك الفرد. التفاصيل: ${transfer.notes || transfer.reason || 'نقل إداري معتمد وحسب الخطة العملياتية.'}`,
        notes: transfer.recordedBy ? `رصد بواسطة: ${transfer.recordedBy}` : undefined,
        issuerName: transfer.recordedBy || 'ركن العمليات'
      });
    });

    // 4. 🛡️ الانضباط والعقوبات (discipline)
    disciplinaryRecords.forEach((pen: any) => {
      items.push({
        id: `tl_pen_${pen.id}`,
        category: 'discipline',
        categoryLabel: 'الانضباط والعقوبات',
        title: `إجراء انضباطي - (${pen.type})`,
        date: pen.date,
        authority: pen.authority || 'قائد الكتيبة',
        orderNumber: pen.id,
        details: `السبب والموجب: ${pen.reason}`,
        notes: pen.notes ? `ملاحظات: ${pen.notes}` : undefined,
        issuerName: pen.issuerName || 'الضابط المناوب'
      });
    });

    // 5. 🏅 التكريم والإنواط (honors)
    commendationRecords.forEach((com: any) => {
      items.push({
        id: `tl_com_${com.id}`,
        category: 'honors',
        categoryLabel: 'التكريم والإنواط',
        title: `كتاب ثناء وتكريم - (${com.type})`,
        date: com.date,
        authority: com.authority || 'قيادة اللواء',
        orderNumber: com.id,
        details: `السبب والتميز: ${com.reason}`,
        notes: com.notes ? `المكافأة والملاحظات: ${com.notes}` : undefined,
        issuerName: com.issuerName || 'الموثق العسكري'
      });
    });

    // 6. 📅 الإجازات (leaves) & 🚑 السجل الطبي (medical)
    sickLeavesList.forEach((leave: SickLeave) => {
      const isMedical = leave.leaveType === 'مرضية' || (leave.illnessType && leave.illnessType.includes('مرض')) || !!leave.diagnosis;
      items.push({
        id: `tl_leave_${leave.id}`,
        category: isMedical ? 'medical' : 'leaves',
        categoryLabel: isMedical ? 'السجل الطبي' : 'الإجازات',
        title: isMedical ? `تقرير طبي / إجازة مرضية (${leave.diagnosis || leave.illnessType || 'عذر طبي'})` : `منح إجازة رسمية - (${leave.leaveType || leave.illnessType || 'استحقاق'})`,
        date: leave.startDate,
        orderNumber: leave.orderNumber || `أم/${leave.id.slice(-4)}`,
        authority: leave.grantingAuthority || leave.doctorName || 'قيادة الكتيبة',
        details: `إجازة معتمدة لمدة (${leave.duration}) أيام للفترة من (${leave.startDate}) إلى (${leave.endDate}). السبب: ${leave.reason || leave.diagnosis || 'استحقاق دوري'}.`,
        notes: leave.notes ? `ملاحظات إضافية: ${leave.notes}` : undefined,
        issuerName: leave.doctorName || 'المفرزة الطبية / الشؤون العسكرية'
      });
    });

    // 7. ⚙️ سجل التعديلات والعمليات للنظام (audit_logs)
    auditLogsList.forEach((log: AuditLog) => {
      const dateStr = log.timestamp ? log.timestamp.split('T')[0] : todayDateStr;
      items.push({
        id: `tl_audit_${log.id}`,
        category: 'audit_logs',
        categoryLabel: 'سجل التعديلات بالنظام',
        title: `تعديل بالنظام - ${log.actionType}`,
        date: dateStr,
        authority: `${log.userName} (${log.userRole})`,
        details: log.details,
        issuerName: log.userName
      });
    });

    // 8. ➕ Custom Timeline Events added manually
    customTimelineEvents.forEach((ev: any) => {
      const catConf = TIMELINE_CATEGORY_MAP[ev.category] || TIMELINE_CATEGORY_MAP['milestones'];
      items.push({
        id: `tl_custom_${ev.id}`,
        category: (ev.category as any) || 'milestones',
        categoryLabel: catConf.label,
        title: ev.title,
        date: ev.date,
        orderNumber: ev.orderNumber,
        authority: ev.authority || 'القيادة العسكرية',
        details: ev.details,
        notes: ev.notes,
        issuerName: ev.issuerName || currentUser.name || 'المجرد العسكري',
        isCustom: true
      });
    });

    return items;
  }, [soldier, assignmentsList, disciplinaryRecords, commendationRecords, sickLeavesList, auditLogsList, customTimelineEvents, soldierUnitName, todayDateStr, currentUser, TIMELINE_CATEGORY_MAP]);

  // Filtered & Sorted Timeline Events
  const filteredTimelineEvents = useMemo(() => {
    let list = [...allTimelineEvents];

    if (timelineSearchQuery.trim()) {
      const q = timelineSearchQuery.toLowerCase();
      list = list.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.details && item.details.toLowerCase().includes(q)) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(q)) ||
        (item.authority && item.authority.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.date && String(item.date).includes(q))
      );
    }

    if (timelineCategoryFilter !== 'all') {
      list = list.filter(item => item.category === timelineCategoryFilter);
    }

    if (timelineStartDateFilter) {
      list = list.filter(item => item.date >= timelineStartDateFilter);
    }
    if (timelineEndDateFilter) {
      list = list.filter(item => item.date <= timelineEndDateFilter);
    }

    list.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return timelineSortOrder === 'desc' ? diff : -diff;
    });

    return list;
  }, [allTimelineEvents, timelineSearchQuery, timelineCategoryFilter, timelineStartDateFilter, timelineEndDateFilter, timelineSortOrder]);

  // CSV Export for Timeline Events
  const handleExportTimelineCsv = () => {
    if (!soldier || filteredTimelineEvents.length === 0) {
      alert('لا توجد أحداث زمنية متاحة للتصدير');
      return;
    }
    
    const headers = ["تاريخ الحدث", "فئة الإجراء", "عنوان الحدث", "تفاصيل الإجراء والقرار", "رقم القرار/الأمر", "الجهة الصادرة", "الملاحظات/الموثق"];
    const rows = filteredTimelineEvents.map(e => [
      `"${e.date || ''}"`,
      `"${e.categoryLabel || ''}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      `"${e.orderNumber || ''}"`,
      `"${e.authority || ''}"`,
      `"${(e.notes || e.issuerName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `السجل_الزمني_للعسكري_${soldier.militaryNumber}_${soldier.fullName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans" dir="rtl">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h4 className="font-extrabold text-sm text-slate-100">جاري تحميل الملف العسكري الموحد...</h4>
        <p className="text-xs text-slate-400 mt-1">يتم جلب البيانات الحية والملفات الطبية واللوجستية بأمان</p>
      </div>
    );
  }

  if (error || !soldier) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans text-center" dir="rtl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h4 className="font-extrabold text-sm text-slate-100">تعذر تحميل ملف العسكري</h4>
        <p className="text-xs text-rose-400 mt-1">{error || 'السجل المطلوب غير متوفر'}</p>
        <button 
          onClick={onClose}
          className="mt-5 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
        >
          العودة لإدارة القوة
        </button>
      </div>
    );
  }

  // Military rank badges color helper
  const isOfficer = Boolean(
    soldier?.rank && (
      soldier.rank.includes('عميد') || 
      soldier.rank.includes('عقيد') || 
      soldier.rank.includes('مقدم') || 
      soldier.rank.includes('رائد') || 
      soldier.rank.includes('نقيب') || 
      soldier.rank.includes('ملازم')
    )
  );

  // Handle file attachment upload for Leave Form
  const handleLeaveFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 8 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setLeaveAttachmentUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Grant Leave Form (منح إجازة)
  const handleGrantLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) {
      alert('الرجاء تحديد تاريخ بداية ونهاية الإجازة');
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

      // 1. Post to leaves API
      const response = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves`, {
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
          performedBy: currentUser.id,
          performedByName: currentUser.name,
          performedByRole: currentUser.role
        })
      });

      if (!response.ok) throw new Error('فشل تسجيل الإجازة في الخادم');
      const newLeave = await safeJson(response);

      // 2. Update soldier military status to "إجازة مرضية" or "إجازة"
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...soldier,
          militaryStatus: isSickLeave ? 'إجازة مرضية' : 'إجازة'
        })
      });

      // 3. Register attendance code ('ع' for sick leave, 'إ' for official leave)
      const attendanceRecords = [];
      let curDate = new Date(leaveStartDate);
      const stopDate = new Date(leaveEndDate);
      const statusCodeToUse = isSickLeave ? 'ع' : 'إ';
      while (curDate <= stopDate) {
        const dateStr = curDate.toISOString().split('T')[0];
        attendanceRecords.push({
          id: `att_${soldierId}_${dateStr}`,
          soldierId: soldierId,
          date: dateStr,
          statusCode: statusCodeToUse,
          recordedBy: currentUser.id,
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
      }

      // 4. Send notification to authorized users
      await fetchWithRetry('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'notif_leave_' + Date.now(),
          title: `منح ${computedLeaveType} للمنسوب ${soldier?.rank} / ${soldier?.fullName}`,
          message: `تم منح ${computedLeaveType} ${isSickLeave ? `(التشخيص: ${computedIllness})` : ''} برقم أمر (${leaveOrderNumber || 'غير محدد'}) لمدة ${finalDuration} أيام اعتباراً من ${leaveStartDate} إلى ${leaveEndDate} بقرار من (${finalAuthority}).`,
          isRead: false,
          type: 'info',
          createdAt: new Date().toISOString()
        })
      });

      // 5. Update local state
      setSickLeavesList(prev => [newLeave, ...prev]);
      await fetchFullSoldier();

      // 6. Open printable leave pass modal
      setPrintableLeavePass({
        ...newLeave,
        leaveType: computedLeaveType,
        illnessType: computedIllness,
        diagnosis: leaveDiagnosis,
        grantingAuthority: finalAuthority,
        orderNumber: leaveOrderNumber,
        orderDate: leaveOrderDate,
        reason: leaveReason,
        attachmentUrl: leaveAttachmentUrl,
        notes: leaveNotes
      });

      setIsGrantLeaveModalOpen(false);
      setLeaveReason('');
      setLeaveGrantingAuthorityCustom('');
      setLeaveOrderNumber('');
      setLeaveAttachmentUrl(null);
      setLeaveNotes('');

      if (onSoldierUpdated) onSoldierUpdated();

    } catch (err: any) {
      alert(err.message || 'خطأ أثناء منح الإجازة');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Submit new sick leave (Legacy fallback)
  const handleAddSickLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slStartDate || !slEndDate || !slIllnessType || !slDoctor) {
      alert('الرجاء ملء جميع الحقول الإلزامية للإجازة المرضية');
      return;
    }

    setSlSubmitting(true);
    try {
      // Calculate duration in days
      const d1 = new Date(slStartDate);
      const d2 = new Date(slEndDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const response = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: slStartDate,
          endDate: slEndDate,
          illnessType: slIllnessType,
          duration,
          doctorName: slDoctor,
          hospital: slHospital,
          notes: slNotes,
          status: 'نشط',
          performedBy: currentUser.id,
          performedByName: currentUser.name,
          performedByRole: currentUser.role
        })
      });

      if (!response.ok) throw new Error('فشل إرسال الإجازة الطبية للخادم');
      
      const newLeave = await safeJson(response);
      setSickLeavesList(prev => [newLeave, ...prev]);
      
      // Update soldier status to "إجازة" locally and trigger update on server
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...soldier,
          militaryStatus: 'إجازة'
        })
      });

      // Refresh Soldier state
      await fetchFullSoldier();

      setIsSickLeaveModalOpen(false);
      setSlStartDate('');
      setSlEndDate('');
      setSlIllnessType('');
      setSlDoctor('');
      setSlHospital('');
      setSlNotes('');

      if (onSoldierUpdated) onSoldierUpdated();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء إضافة الإجازة المرضية');
    } finally {
      setSlSubmitting(false);
    }
  };

  // Submit edit details form
  const handleEditDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editMilNum || !editRank) {
      alert('الاسم والرقم العسكري والرتبة حقول إلزامية');
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          militaryNumber: editMilNum,
          fullName: editName,
          rank: editRank,
          unitId: editUnitId,
          isActive: soldier.isActive,
          nationalId: editNationalId,
          birthDate: editBirthDate,
          bloodType: editBloodType,
          phoneNumber: editPhone,
          address: editAddress,
          emergencyContact: editEmergency,
          qualification: editQualification,
          specialization: editSpecialization,
          joinDate: editJoinDate,
          battalion: editBattalion,
          company: editCompany,
          platoon: editPlatoon,
          militaryStatus: editMilStatus,
          medicalHistory: editMedicalHistory,
          promotionHistory: soldier.promotionHistory,
          assignmentsHistory: soldier.assignmentsHistory,
          attachments: soldier.attachments,
          photoUrl: editPhotoUrl
        })
      });

      if (!response.ok) throw new Error('فشل حفظ التحديثات في خادم البيانات');

      // Refresh soldier state
      await fetchFullSoldier();
      setIsEditModalOpen(false);

      if (onSoldierUpdated) onSoldierUpdated();
    } catch (err: any) {
      alert(err.message || 'خطأ في تعديل الملف');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePhotoUploadDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      if (!soldier) return;

      try {
        setLoading(true);
        const response = await fetchWithRetry(`/api/soldiers/${soldierId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...soldier,
            photoUrl: base64String
          })
        });

        if (!response.ok) throw new Error('فشل تحديث صورة العسكري');

        await fetchFullSoldier();
        if (onSoldierUpdated) onSoldierUpdated();
      } catch (err: any) {
        alert(err.message || 'فشل تحديث الصورة');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Simulated Attachments list parsing
  const attachmentsList: Array<{ name: string; date: string; size: string }> = soldier.attachments 
    ? JSON.parse(soldier.attachments) 
    : [];

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName) {
      alert('الرجاء كتابة اسم المرفق');
      return;
    }

    setAttachmentSubmitting(true);
    try {
      const newAttach = {
        name: attachmentName,
        date: new Date().toISOString().split('T')[0],
        size: attachmentFile ? `${(attachmentFile.size / 1024).toFixed(1)} KB` : '1.5 MB'
      };

      const updatedAttachments = [newAttach, ...attachmentsList];

      const response = await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...soldier,
          attachments: JSON.stringify(updatedAttachments)
        })
      });

      if (!response.ok) throw new Error('فشل حفظ المرفق الجديد');

      await fetchFullSoldier();
      setIsAttachmentModalOpen(false);
      setAttachmentName('');
      setAttachmentFile(null);
      
      if (onSoldierUpdated) onSoldierUpdated();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ في تحميل المرفق');
    } finally {
      setAttachmentSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for attendance stats calculation
  const totalDays = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(r => r.statusCode === 'ح').length;
  const absentDays = attendanceHistory.filter(r => r.statusCode === 'غ').length;
  const leavesDays = attendanceHistory.filter(r => r.statusCode === 'إ').length;
  const dutyDays = attendanceHistory.filter(r => r.statusCode === 'م').length;
  const excuseDays = attendanceHistory.filter(r => r.statusCode === 'ع').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + dutyDays) / totalDays) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-900 overflow-y-auto font-sans select-none print:static print:z-auto print:bg-white print:p-0 print:overflow-visible" id="soldier-comprehensive-profile" dir="rtl">
      
      {/* Print-Only Military Official Header Block */}
      <div className="hidden print:block text-right mb-8 font-sans p-6">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black">القوات المسلحة الملكية</h2>
            <h3 className="text-base font-bold">قيادة شؤون الأفراد والخدمة الذاتية</h3>
            <p className="text-xs">رقم الملف الموحد: {soldier.id.toUpperCase()}</p>
          </div>
          <div className="text-center font-bold text-lg border border-slate-900 px-4 py-2 bg-slate-50">
            ملف الخدمة العسكرية الإلكتروني
          </div>
          <div className="text-left space-y-1">
            <p className="text-xs">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="text-xs">مستخرجه: {currentUser.name} ({currentUser.role})</p>
            <p className="text-xs">تصنيف المستند: سري للغاية // للاستخدام الرسمي فقط</p>
          </div>
        </div>
      </div>

      {/* Sticky Top Bar for Fullscreen View */}
      <div className="sticky top-0 z-30 bg-slate-950/90 text-slate-100 shadow-xl backdrop-blur-md border-b border-amber-500/20 px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 rounded-xl text-slate-200 transition-all cursor-pointer border border-slate-700 shrink-0 flex items-center gap-1.5 text-xs font-extrabold min-h-[40px] shadow-sm"
            title="العودة وإغلاق الملف"
          >
            <ArrowLeft className="w-4 h-4 rotate-180 text-amber-400" />
            <span className="hidden sm:inline">إغلاق والعودة</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider shrink-0 shadow-sm ${
                isOfficer 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                🎖️ {soldier.rank}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tight">{soldier.fullName}</h3>
              {currentUser.role === 'soldier' && (
                <span className="hidden lg:inline-block px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black rounded-full">
                  بوابة الخدمة الذاتية للفرد
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate mt-0.5">
              الرقم العسكري: <span className="font-mono text-emerald-400 tracking-wider">{soldier.militaryNumber}</span> • {soldierUnitName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsIdCardModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-950/40 cursor-pointer min-h-[40px] border border-indigo-400/40 active:scale-95"
            title="إصدار وطباعة بطاقة الهوية العسكرية المعتمدة"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-200" />
            <span className="hidden md:inline">بطاقة الهوية</span>
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-950/40 cursor-pointer min-h-[40px] border border-emerald-400/40 active:scale-95"
            title="تواصل عبر واتساب وإرسال التقرير الشامل"
          >
            <MessageSquare className="w-4 h-4 text-emerald-100" />
            <span className="hidden md:inline">تقرير واتساب</span>
          </button>
          {currentUser.role !== 'operations' && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-black transition-all border border-slate-700 cursor-pointer min-h-[40px] shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">تعديل</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer min-h-[40px] border border-amber-400/40"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">طباعة السجل</span>
          </button>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-rose-500/50 shadow-lg active:scale-95 shrink-0"
            title="إغلاق الصفحة (X)"
          >
            <X className="w-5 h-5 font-black" />
          </button>
        </div>
      </div>

      {/* Main Fullscreen Body Container with Reduced Margins */}
      <div className="max-w-7xl mx-auto p-1.5 sm:p-3 md:p-4 space-y-2.5 sm:space-y-3.5 print:p-0 print:space-y-4">

      {/* 1. Main File Navigation Tabs Bar (تبويبات خيارات الملف الشامل - أعلى الشاشة) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl overflow-hidden print:hidden backdrop-blur-md sticky top-14 z-20">
        <div className="bg-slate-950/90 p-2 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'personal' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>البيانات الشخصية والبطاقة</span>
            </button>

            <button
              onClick={() => setActiveTab('military')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'military' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>الخدمة والترقيات</span>
            </button>

            <button
              onClick={() => setActiveTab('medical')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'medical' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>الملف الطبي والإجازات</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'attendance' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>كشف الحضور والانضباط</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'timeline' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>التدقيق والسجل التاريخي</span>
            </button>

            <button
              onClick={() => setActiveTab('operational_history')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 ${
                activeTab === 'operational_history' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 text-purple-400" />
              <span>التحركات والمسار العملياتي</span>
            </button>

            <button
              onClick={() => setActiveTab('custody')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 relative ${
                activeTab === 'custody' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <PackageCheck className={`w-4 h-4 ${activeTab === 'custody' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>العهد والأمانات العسكرية</span>
              {custodiesList.filter(c => c.status === 'نشط').length > 0 && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'custody' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}>
                  {custodiesList.filter(c => c.status === 'نشط').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('account_tasks')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 min-h-[42px] flex items-center justify-center gap-2 relative ${
                activeTab === 'account_tasks' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'account_tasks' ? 'text-slate-950' : 'text-sky-400'}`} />
              <span>{currentUser.role === 'soldier' ? 'المهام والإجراءات المطلوب منك' : 'حساب الفرد وتحديد المهام'}</span>
              {soldier?.hasAccount && (
                <span className={`w-2 h-2 rounded-full ${activeTab === 'account_tasks' ? 'bg-slate-950' : 'bg-emerald-400'}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Tab Full Screen Content View Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-140px)]">
        
        {/* Tab Content Container */}
        <div className="p-3 sm:p-5 md:p-6">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Personal Info & Identity Card (البيانات الشخصية وبطاقة الهوية) */}
            {activeTab === 'personal' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Basic Identity Card (بطاقة الهوية والبيانات الفورية للفرد) */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 relative overflow-hidden shadow-lg border border-slate-800">
                  {/* Background tactical accent elements */}
                  <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
                  
                  <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                    
                    {/* Main Photo & Primary Identification */}
                    <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                      {/* Compact Soldier Photo Avatar */}
                      <div className="relative group shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-xl border-2 border-amber-500/40 p-0.5 relative shadow-xl overflow-hidden group-hover:border-amber-400 transition-colors">
                          <div className="w-full h-full rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center relative">
                            {soldier.photoUrl ? (
                              <img 
                                src={soldier.photoUrl} 
                                alt={soldier.fullName} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500 stroke-[1.25]" />
                            )}
                            
                            {/* Photo Upload Hover Overlay */}
                            {currentUser.role !== 'operations' && (
                              <label className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-opacity text-white text-[9px] font-black">
                                <Camera className="w-4 h-4 text-amber-400 animate-bounce" />
                                <span>تحديث</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={handlePhotoUploadDirect}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Official Seal Badge Icon */}
                        <div className="absolute -bottom-1 -left-1 bg-slate-900 border border-amber-500/50 p-1 rounded-lg shadow-md" title="سجل موثق إلكترونياً">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                      </div>

                      {/* Soldier Name, Ranks, Unit & Numbers */}
                      <div className="space-y-1 text-right min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-xs ${
                            isOfficer 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {soldier.rank}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                            {soldier.specialization || 'تخصص عسكري عام'}
                          </span>
                        </div>

                        <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">{soldier.fullName}</h1>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-slate-300 font-sans">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">الرقم العسكري:</span>
                            <span className="font-mono font-black text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              {soldier.militaryNumber}
                            </span>
                          </div>
                          {soldier.nationalId && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">الهوية:</span>
                              <span className="font-mono font-bold text-slate-200">{soldier.nationalId}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] sm:text-xs text-slate-400 font-bold flex flex-wrap items-center gap-1.5 pt-0.5 truncate">
                          <span className="text-amber-400/90 font-black">{soldierUnitName}</span>
                          <span>•</span>
                          <span>{soldier.battalion || 'كتيبة المشاة الثانية'}</span>
                          <span>•</span>
                          <span>{soldier.company || 'السرية الأولى'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metrics & Live Status Panel */}
                    <div className="grid grid-cols-4 md:grid-cols-2 gap-2 w-full md:w-auto font-sans pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                      {/* Status Card */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 font-black block">الحالة العسكرية</span>
                        {soldier.militaryStatus === 'على رأس العمل' || (soldier as any).status === 'على رأس العمل' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            على رأس العمل
                          </span>
                        ) : soldier.militaryStatus === 'إجازة' || (soldier as any).status === 'إجازة' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            إجازة رسمية
                          </span>
                        ) : soldier.militaryStatus === 'موقوف' || (soldier as any).status === 'موقوف' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            موقوف
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400">
                            {soldier.militaryStatus || (soldier as any).status || 'منقول'}
                          </span>
                        )}
                      </div>

                      {/* Discipline Rate */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 font-black block">الجاهزية</span>
                        <span className={`text-xs sm:text-sm font-black font-mono ${attendanceRate >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {attendanceRate}%
                        </span>
                      </div>

                      {/* Blood Type */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 font-black block">فصيلة الدم</span>
                        <span className="text-xs font-black text-rose-400 font-mono bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-500/30 inline-block">
                          {soldier.bloodType || 'O+'}
                        </span>
                      </div>

                      {/* Phone Number */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 font-black block">التواصل</span>
                        <span className="text-[11px] font-black text-slate-200 font-mono dir-ltr truncate block">
                          {soldier.phoneNumber || (soldier as any).phone || '0540000000'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Tactical Quick Actions Panel (لوحة الأوامر والإجراءات السريعة للفرد) */}
                <div className="bg-slate-950/90 border border-slate-800/90 p-2.5 sm:p-3.5 rounded-2xl print:hidden shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                      <span>لوحة الأوامر والإجراءات السريعة للفرد</span>
                    </h4>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      صلاحيات: {currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'commander' ? 'قائد وحدة' : 'ركن عمليات'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1 sm:gap-2">
                    
                    {/* Military Custody Shortcut (العهد والأمانات) */}
                    <button
                      onClick={() => setActiveTab('custody')}
                      className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/50 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                      title="العهد والأمانات"
                    >
                      <div className="p-1 sm:p-1.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors shrink-0">
                        <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-black text-slate-200 group-hover:text-amber-300 leading-tight">العهد والأمانات</span>
                    </button>
                    
                    {/* Grant Leave Button (منح إجازة) */}
                    {currentUser.role !== 'operations' ? (
                      <button
                        onClick={() => setIsGrantLeaveModalOpen(true)}
                        className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/50 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                        title="منح إجازة"
                      >
                        <div className="p-1 sm:p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors shrink-0">
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-200 group-hover:text-emerald-300 leading-tight">منح إجازة</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1 opacity-40 text-center min-h-[54px] sm:min-h-[64px]">
                        <div className="p-1 sm:p-1.5 bg-slate-800 text-slate-500 rounded-lg shrink-0">
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-500 leading-tight">منح إجازة</span>
                      </div>
                    )}

                    {/* Medical Record Shortcut */}
                    <button
                      onClick={() => setActiveTab('medical')}
                      className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/50 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                      title="السجل الطبي"
                    >
                      <div className="p-1 sm:p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors shrink-0">
                        <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-black text-slate-200 group-hover:text-emerald-300 leading-tight">السجل الطبي</span>
                    </button>

                    {/* Attendance Shortcut */}
                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                      title="التحضير والغياب"
                    >
                      <div className="p-1 sm:p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 transition-colors shrink-0">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-black text-slate-200 group-hover:text-indigo-300 leading-tight">التحضير والغياب</span>
                    </button>

                    {/* Transfer Soldier */}
                    {currentUser.role !== 'operations' && onOpenTransfer ? (
                      <button
                        onClick={() => onOpenTransfer(soldier)}
                        className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/50 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                        title="نقل وتبعية"
                      >
                        <div className="p-1 sm:p-1.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors shrink-0">
                          <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-200 group-hover:text-amber-300 leading-tight">نقل وتبعية</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1 opacity-40 text-center min-h-[54px] sm:min-h-[64px]">
                        <div className="p-1 sm:p-1.5 bg-slate-800 text-slate-500 rounded-lg shrink-0">
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-500 leading-tight">نقل وتبعية</span>
                      </div>
                    )}

                    {/* Edit Data */}
                    {currentUser.role !== 'operations' ? (
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                        title="تعديل الملف"
                      >
                        <div className="p-1 sm:p-1.5 bg-slate-800 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors shrink-0">
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-200 leading-tight">تعديل الملف</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1 opacity-40 text-center min-h-[54px] sm:min-h-[64px]">
                        <div className="p-1 sm:p-1.5 bg-slate-800 text-slate-500 rounded-lg shrink-0">
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[9px] sm:text-[11px] font-black text-slate-500 leading-tight">تعديل الملف</span>
                      </div>
                    )}

                    {/* Attachments */}
                    <button
                      onClick={() => setIsAttachmentModalOpen(true)}
                      className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-xs active:scale-95"
                      title="مرفقات الخدمة"
                    >
                      <div className="p-1 sm:p-1.5 bg-slate-800 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors shrink-0">
                        <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-black text-slate-200 leading-tight">مرفقات الخدمة</span>
                    </button>

                    {/* Print Sellsheet */}
                    <button
                      onClick={handlePrint}
                      className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 rounded-xl gap-1 transition-all group cursor-pointer text-center min-h-[54px] sm:min-h-[64px] shadow-md shadow-amber-950/30 active:scale-95"
                      title="طباعة السجل"
                    >
                      <div className="p-1 sm:p-1.5 bg-slate-950/10 rounded-lg shrink-0">
                        <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-black leading-tight">طباعة السجل</span>
                    </button>

                  </div>
                </div>

                {/* Detailed Personal Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* ID and Identification */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <User className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">بيانات الهوية والتحقق الأساسية</h5>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">الاسم رباعي:</p>
                      <p className="font-extrabold text-slate-800 text-sm">{soldier.fullName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">الرقم الوطني للهوية:</p>
                      <p className="font-bold text-slate-700 font-mono text-sm">{soldier.nationalId || 'لم يدخل بعد'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">تاريخ الميلاد:</p>
                      <p className="font-bold text-slate-700">{soldier.birthDate || 'غير مدخل'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">فصيلة الدم العسكرية:</p>
                      <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 font-black rounded-lg text-sm font-sans">
                        {soldier.bloodType || 'A+'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact and Emergency */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <Phone className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">بيانات الاتصال وحالات الطوارئ</h5>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">رقم الهاتف الجوال الفردي:</p>
                      <p className="font-bold text-slate-700 font-mono">{soldier.phoneNumber || 'غير مسجل'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">عنوان الإقامة الحالي:</p>
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{soldier.address || 'غير محدد'}</span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 font-bold mb-1">شخص للاتصال بالطوارئ (الاسم والهاتف):</p>
                      <p className="font-bold text-slate-700 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl">
                        {soldier.emergencyContact || 'لم يحدد اتصال طوارئ'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Educational Qualifications & Skillset */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl col-span-1 md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <Award className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">المؤهلات العلمية والتخصص الدقيق للفرد</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">المؤهل الدراسي الأكاديمي:</p>
                      <p className="font-bold text-slate-700">{soldier.qualification || 'بكالوريوس علوم عسكرية / دبلوم كفاءة'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">التخصص العملياتي الدقيق:</p>
                      <p className="font-bold text-emerald-800 bg-emerald-500/10 px-3 py-1.5 rounded-lg inline-block">
                        {soldier.specialization || 'عمليات خاصة / حراسة منشآت / إسناد إداري'}
                      </p>
                    </div>
                  </div>
                </div>

                </div>
              </motion.div>
            )}

            {/* TAB 2: Military Service (الخدمة العسكرية والتكليفات) */}
            {activeTab === 'military' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Command & Formation Assignment */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">التشكيل والهيكل القيادي الحالي</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">الوحدة العسكرية القيادية:</p>
                      <p className="font-black text-slate-800 text-sm">{soldierUnitName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">تاريخ الالتحاق والتطوع بالخدمة:</p>
                      <p className="font-bold text-slate-700">{soldier.joinDate || '1439/05/12 هـ // 2018/01/29 م'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">الكتيبة / لواء التابع:</p>
                      <p className="font-bold text-slate-700">{soldier.battalion || 'كتيبة المشاة الآلية الثانية'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">السرية / الفصيلة:</p>
                      <p className="font-bold text-slate-700">
                        {soldier.company ? `السرية: ${soldier.company}` : 'السرية الأولى'}
                        {soldier.platoon ? ` / الفصيلة: ${soldier.platoon}` : ' / الفصيلة الثالثة'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Quick Promotions Panel */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <ChevronUp className="w-4 h-4 text-amber-700" />
                    <h5 className="text-xs font-black text-slate-800">تاريخ الترقيات العسكرية</h5>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs border-r-2 border-emerald-600 pr-3 font-sans">
                      <div>
                        <p className="font-black text-slate-800">{soldier.rank}</p>
                        <p className="text-[10px] text-slate-400">الترقية الأخيرة الحالية</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">الحالية</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-r-2 border-slate-300 pr-3 opacity-60 font-sans">
                      <div>
                        <p className="font-semibold text-slate-700">رتبة سابقة</p>
                        <p className="text-[10px] text-slate-400">تلقائية قبل سنتين</p>
                      </div>
                      <span className="text-[10px] text-slate-400">منتهي</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Past Assignments & Deployments */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl col-span-1 md:col-span-3 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <Award className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">سجل التكليفات والمهام السابقة</h5>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs font-sans">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="pb-2 font-bold">الفترة الزمنية</th>
                          <th className="pb-2 font-bold">نوع التكليف العسكري</th>
                          <th className="pb-2 font-bold">موقع التكليف</th>
                          <th className="pb-2 font-bold">المرتب والكتيبة الحالية حينها</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                        <tr>
                          <td className="py-2.5">2024 - 2025</td>
                          <td className="py-2.5 font-bold">مهمة تأمين وحراسات حدودية مشددة</td>
                          <td className="py-2.5">المنطقة الجنوبية للواء السادس</td>
                          <td className="py-2.5">{soldierUnitName}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5">2022 - 2024</td>
                          <td className="py-2.5">دورة متقدمة في المهارات القتالية وصيانة الآليات</td>
                          <td className="py-2.5">المركز التدريبي التخصصي</td>
                          <td className="py-2.5">{soldierUnitName}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: Medical Record & Leaves Management (الملف الطبي وسجل الإجازات) */}
            {activeTab === 'medical' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Header Banner */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 font-sans">
                    <h5 className="text-xs font-black text-emerald-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>الملف الطبي ورصيد الإجازات المعتمدة للفرد</span>
                    </h5>
                    <p className="text-[11px] text-emerald-700">
                      تتضمن هذه الصفحة حاسبة رصيد الإجازات السنوية، وسجل أوامر منح الإجازات، والإنذارات الآلية للعودة والمباشرة.
                    </p>
                  </div>
                  {currentUser.role !== 'operations' && (
                    <button
                      onClick={() => setIsGrantLeaveModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>منح إجازة جديدة</span>
                    </button>
                  )}
                </div>

                {/* LEAVE BALANCES KPI SUMMARY CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                  {/* Annual Leave */}
                  <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl text-right">
                    <span className="text-[10px] font-black text-emerald-800 block mb-1">🟢 رصيد الاستحقاق السنوي</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-emerald-900">{leaveBalances.annualRemaining}</span>
                      <span className="text-xs font-bold text-emerald-700">يوم متبقي</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">مستهلك: {leaveBalances.annualUsed} من 30 يوم</span>
                  </div>

                  {/* Emergency Leave */}
                  <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-right">
                    <span className="text-[10px] font-black text-amber-800 block mb-1">🟡 رصيد الإجازات الطارئة</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-amber-900">{leaveBalances.emergencyRemaining}</span>
                      <span className="text-xs font-bold text-amber-700">يوم متبقي</span>
                    </div>
                    <span className="text-[10px] text-amber-600 block mt-1 font-semibold">مستهلك: {leaveBalances.emergencyUsed} من 10 أيام</span>
                  </div>

                  {/* Sick Leave */}
                  <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl text-right">
                    <span className="text-[10px] font-black text-rose-800 block mb-1">🔴 سجل الإجازات المرضية</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-rose-900">{leaveBalances.medicalUsed}</span>
                      <span className="text-xs font-bold text-rose-700">أيام ممنوحة</span>
                    </div>
                    <span className="text-[10px] text-rose-600 block mt-1 font-semibold">حد أقصى مسموح: 30 يوم</span>
                  </div>

                  {/* Permission Leaves */}
                  <div className="bg-sky-50/80 border border-sky-200 p-3.5 rounded-2xl text-right">
                    <span className="text-[10px] font-black text-sky-800 block mb-1">🔵 الأذونات الإدارية</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black font-mono text-sky-900">{leaveBalances.permissionCount}</span>
                      <span className="text-xs font-bold text-sky-700">أذونات مغادرة</span>
                    </div>
                    <span className="text-[10px] text-sky-600 block mt-1 font-semibold">إجمالي: {leaveBalances.permissionDays} أيام</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Medical History Input Box */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 md:col-span-1">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      <h5 className="text-xs font-black text-slate-800">الملف والأمراض المزمنة</h5>
                    </div>
                    <div className="text-xs font-sans text-slate-700 space-y-3">
                      <div>
                        <p className="text-slate-400 font-bold mb-1">الملاحظات الطبية المسجلة:</p>
                        <p className="bg-white p-3 rounded-xl border border-slate-200 min-h-[100px] leading-relaxed">
                          {soldier.medicalHistory || 'لا يوجد ملاحظات طبية أو قيود صحية مسجلة على الفرد. يتمتع بلياقة بدنية وعملياتية كاملة جاهزة للمهام.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Granted Leaves Table */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-800" />
                        <h5 className="text-xs font-black text-slate-800">سجل الإجازات الممنوحة للفرد والأوامر الإدارية</h5>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">إجمالي: {sickLeavesList.length} قيد</span>
                    </div>

                    {loadingTab ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-bold font-sans">
                        <RefreshCw className="w-6 h-6 text-emerald-800 animate-spin mx-auto mb-2" />
                        جاري جلب سجلات الإجازات...
                      </div>
                    ) : sickLeavesList.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs font-bold font-sans">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        لا توجد إجازات مسجلة مسبقاً لهذا الفرد.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-right text-xs font-sans">
                          <thead className="bg-slate-900 text-slate-100 font-sans">
                            <tr>
                              <th className="p-2.5 font-bold text-center">نوع الإجازة</th>
                              <th className="p-2.5 font-bold text-center">الفترة والمدة</th>
                              <th className="p-2.5 font-bold">الجهة المانحة والأمر</th>
                              <th className="p-2.5 font-bold text-center">حالة العودة والإنذار</th>
                              <th className="p-2.5 font-bold text-center">التصريح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sickLeavesList.map(leave => {
                              const lType = leave.leaveType || leave.illnessType || 'استحقاق';
                              const alertInfo = getLeaveAlertInfo(leave);
                              return (
                                <tr key={leave.id} className="hover:bg-slate-50/60 font-sans">
                                  <td className="p-2.5 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                      lType === 'استحقاق' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                      lType === 'طارئة' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                      lType === 'إذن' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                                      'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                      {lType}
                                    </span>
                                    {(leave.diagnosis || (leave.illnessType && leave.illnessType !== lType)) && (
                                      <div className="text-[10px] text-rose-700 font-bold mt-1 max-w-[150px] mx-auto truncate" title={leave.diagnosis || leave.illnessType}>
                                        🏥 {leave.diagnosis || leave.illnessType}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <div className="font-mono font-bold text-slate-800">{leave.startDate} ← {leave.endDate}</div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{leave.duration} أيام</div>
                                  </td>
                                  <td className="p-2.5">
                                    <div className="font-bold text-slate-800">{leave.grantingAuthority || leave.doctorName || 'الكتيبة'}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">أمر: {leave.orderNumber || 'بدون رقم'}</div>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${alertInfo.badge}`}>
                                      {alertInfo.text}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => setPrintableLeavePass(leave)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200 shadow-3xs"
                                        title="معاينة وطباعة النموذج الرسمية"
                                      >
                                        <Printer className="w-3 h-3 text-slate-600" />
                                        <span>طباعة</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setPrintableLeavePass(leave);
                                          setTimeout(() => {
                                            const leaveTypeStr = leave.leaveType || leave.illnessType || 'إجازة رسمية';
                                            const summaryText = `🎖️ *تصريح ونموذج إجازة رسمية - القوات المسلحة*
===================================
👤 *الاسم الكامل:* ${soldier.fullName}
🎖️ *الرتبة العسكرية:* ${soldier.rank}
🆔 *الرقم العسكري:* ${soldier.militaryNumber}
🏢 *التشكيل / الوحدة:* ${soldierUnitName}

📋 *تفاصيل الإجازة والمدة:*
• *نوع الإجازة:* ${leaveTypeStr}
• *بداية الإجازة:* ${leave.startDate}
• *تاريخ الانتهاء:* ${leave.endDate}
• *المدة المعتمدة:* ${leave.duration} أيام
• *الجهة المانحة:* ${leave.grantingAuthority || leave.doctorName || 'قيادة الوحدة'}
• *رقم الأمر الإداري:* ${leave.orderNumber || 'بدون رقم'}

📌 *حالة الوثيقة:* معتمدة وموثقة رسمياً من قيادة الشؤون العسكرية.`;

                                            shareElementViaWhatsApp(
                                              'printable-leave-pass',
                                              `تصريح_إجازة_${soldier.militaryNumber}_${leave.startDate}`,
                                              summaryText,
                                              soldier.phoneNumber
                                            );
                                          }, 300);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black transition-all cursor-pointer border border-emerald-300 shadow-3xs"
                                        title="مشاركة صورة التصريح عبر الواتساب"
                                      >
                                        <MessageSquare className="w-3 h-3 text-emerald-700 fill-emerald-700" />
                                        <span>واتساب (صورة)</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setPrintableLeavePass(leave);
                                          setTimeout(() => {
                                            downloadElementAsPdf('printable-leave-pass', `نموذج_إجازة_${soldier.militaryNumber}_${leave.startDate}`);
                                          }, 250);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-purple-200 shadow-3xs"
                                        title="تنزيل نموذج الإجازة والأمر الإداري بصيغة PDF"
                                      >
                                        <Download className="w-3 h-3 text-purple-600" />
                                        <span>تحميل PDF</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenEditLeaveModal(leave)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-amber-300 shadow-3xs"
                                        title="تعديل بيانات الإجازة والأمر الإداري"
                                      >
                                        <Edit className="w-3 h-3 text-amber-700" />
                                        <span>تعديل</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenDeleteLeaveModal(leave)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-rose-300 shadow-3xs"
                                        title="حذف الإجازة وإعادة تعيين الحضور إلى (لم يتم تحضيره)"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-700" />
                                        <span>حذف</span>
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
                </div>

              </motion.div>
            )}

            {/* TAB 4: Attendance & Discipline History (كشف التحضير والتواجد الشهري باليوم) */}
            {activeTab === 'attendance' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* 1. Unified Dark High-Density Control Header */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md space-y-3.5">
                  {/* Top Bar: Key Analytics & Quick Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-white">تحضير وانضباط اليوم ({todayDateStr})</h4>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-black">
                            تحديث فوري
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-bold mt-0.5">
                          الحالة الحالية: {todayRecord ? (
                            <span className="text-amber-400 font-black">
                              ({(todayRecord.statusCode as string) === 'ح' ? 'حاضر بالكتيبة 🟢' : (todayRecord.statusCode as string) === 'غ' ? 'غائب غير مبرر 🔴' : (todayRecord.statusCode as string) === 'إ' ? 'إجازة رسمية 🟡' : (todayRecord.statusCode as string) === 'م' ? 'في مأمورية 🔵' : (todayRecord.statusCode as string) === 'ت' ? 'متأخر عن الموعد 🟧' : 'مرضية 🩺'})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">لم يتم تحضيره اليوم بعد ⏳</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Quick Header Metric Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">نسبة الانضباط</span>
                        <span className={`text-sm font-black ${attendanceRate >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>{attendanceRate}%</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">حاضر (ح)</span>
                        <span className="text-sm font-black text-emerald-400">{presentDays}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">غياب (غ)</span>
                        <span className="text-sm font-black text-rose-400">{absentDays}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">مأموريات (م)</span>
                        <span className="text-sm font-black text-indigo-400">{dutyDays}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">تأخير (ت)</span>
                        <span className="text-sm font-black text-amber-400">{monthlySheetData.tardyCount}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block font-normal">سلسلة التواجد</span>
                        <span className="text-sm font-black text-emerald-400">{disciplineStats.currentStreak} يوم 🔥</span>
                      </div>
                    </div>
                  </div>

                  {/* Fast Check-In Action Buttons Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="text-xs font-bold text-slate-300">
                      تسجيل تحضير اليوم بنقرة واحدة:
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs font-black w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'ح')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          todayRecord?.statusCode === 'ح'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm ring-2 ring-emerald-400'
                            : 'bg-slate-800 hover:bg-emerald-950/70 text-emerald-300 border-slate-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ح حاضر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'غ')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          todayRecord?.statusCode === 'غ'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-sm ring-2 ring-rose-400'
                            : 'bg-slate-800 hover:bg-rose-950/70 text-rose-300 border-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>غ غائب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'إ')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          todayRecord?.statusCode === 'إ'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-sm ring-2 ring-amber-400'
                            : 'bg-slate-800 hover:bg-amber-950/70 text-amber-300 border-slate-700'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>إ إجازة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'م')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          todayRecord?.statusCode === 'م'
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-400'
                            : 'bg-slate-800 hover:bg-indigo-950/70 text-indigo-300 border-slate-700'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>م مأمورية</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'ع')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          todayRecord?.statusCode === 'ع'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-sm ring-2 ring-sky-400'
                            : 'bg-slate-800 hover:bg-sky-950/70 text-sky-300 border-slate-700'
                        }`}
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>ع مرضية</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDayAttendanceChange(todayDateStr, 'ت')}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          (todayRecord?.statusCode as string) === 'ت'
                            ? 'bg-orange-600 text-white border-orange-400 shadow-sm ring-2 ring-orange-400'
                            : 'bg-slate-800 hover:bg-orange-950/70 text-orange-300 border-slate-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>ت تأخير</span>
                      </button>
                    </div>
                  </div>
                </div>



                {/* 2. Monthly Presence & Attendance Sheet Control */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 font-sans text-right">
                  {/* Toolbar Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <h4 className="text-sm font-black text-slate-900">سجل التواجد والعديد الشهري</h4>
                      <span className="text-xs text-slate-500 font-bold font-mono">
                        ({selectedAttendanceMonth}/{selectedAttendanceYear})
                      </span>
                    </div>

                    {/* Actions & Filters Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Month & Year Selection */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <select
                          value={selectedAttendanceMonth}
                          onChange={(e) => setSelectedAttendanceMonth(e.target.value)}
                          className="bg-transparent font-black text-xs text-slate-800 focus:outline-none cursor-pointer px-1"
                        >
                          {MONTHS_LIST.map(m => (
                            <option key={m.value} value={m.value}>{m.name}</option>
                          ))}
                        </select>
                        <select
                          value={selectedAttendanceYear}
                          onChange={(e) => setSelectedAttendanceYear(e.target.value)}
                          className="bg-transparent font-black text-xs text-slate-800 focus:outline-none cursor-pointer px-1"
                        >
                          {YEARS_LIST.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      {/* View Mode Toggle: Table vs Calendar Chip Grid */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setAttendanceViewMode('table')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            attendanceViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="عرض جدول تفصيلي"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>جدول</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceViewMode('grid')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            attendanceViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
                          }`}
                          title="عرض شبكة المربعات الشهرية"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>شبكة</span>
                        </button>
                      </div>

                      {/* Quick Tools */}
                      <button
                        type="button"
                        onClick={() => setIsRangeModalOpen(true)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>فترة زمنية 📅</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMarkAllPresentForMonth}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                        title="تحضير جميع الأيام المتبقية كـ حاضر"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تحضير المتبقي حاضر (ح)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMarkWeekendsForMonth}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                        title="تعيين الجمعة والسبت كـ إجازة أسبوعية"
                      >
                        <User className="w-3.5 h-3.5 text-amber-600" />
                        <span>العطلات (إ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintableMonthlySheet({ month: selectedAttendanceMonth, year: selectedAttendanceYear })}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>طباعة</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareDisciplineWhatsApp}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 text-xs font-bold pt-1">
                    <span className="text-slate-400 text-[11px]">تصفية السجل:</span>
                    <button
                      type="button"
                      onClick={() => setMonthlyFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        monthlyFilter === 'all'
                          ? 'bg-slate-900 text-white font-black'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      كافة الأيام ({monthlySheetData.list.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthlyFilter('absent_only')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        monthlyFilter === 'absent_only'
                          ? 'bg-rose-700 text-white font-black'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      الغياب والمرضية والتأخير ({monthlySheetData.absentCount + monthlySheetData.sickCount + monthlySheetData.tardyCount})
                    </button>
                  </div>

                  {/* DISPLAY MODE 1: Interactive Calendar Chip Grid */}
                  {attendanceViewMode === 'grid' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>انقر على أي يوم لتغيير حالة التحضير فوراً:</span>
                        <div className="flex items-center gap-3 text-[11px] font-bold">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> حاضر (ح)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> غائب (غ)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> إجازة (إ)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> مأمورية (م)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> مرضية (ع)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> تأخير (ت)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2">
                        {monthlySheetData.list.map((item) => {
                          let tileBg = 'bg-white border-slate-200 text-slate-700 hover:border-slate-400';
                          let codeBadge = 'bg-slate-100 text-slate-600';
                          if (item.normCode === 'ح') {
                            tileBg = 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100';
                            codeBadge = 'bg-emerald-600 text-white';
                          } else if (item.normCode === 'غ') {
                            tileBg = 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100';
                            codeBadge = 'bg-rose-600 text-white';
                          } else if (item.normCode === 'إ') {
                            tileBg = 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100';
                            codeBadge = 'bg-amber-600 text-white';
                          } else if (item.normCode === 'م') {
                            tileBg = 'bg-indigo-50 border-indigo-300 text-indigo-950 hover:bg-indigo-100';
                            codeBadge = 'bg-indigo-600 text-white';
                          } else if (item.normCode === 'ع') {
                            tileBg = 'bg-sky-50 border-sky-300 text-sky-950 hover:bg-sky-100';
                            codeBadge = 'bg-sky-600 text-white';
                          } else if (item.normCode === 'ت') {
                            tileBg = 'bg-orange-50 border-orange-300 text-orange-950 hover:bg-orange-100';
                            codeBadge = 'bg-orange-600 text-white';
                          }

                          const nextCode = item.normCode === 'unrecorded' ? 'ح' : item.normCode === 'ح' ? 'غ' : item.normCode === 'غ' ? 'إ' : item.normCode === 'إ' ? 'م' : item.normCode === 'م' ? 'ع' : item.normCode === 'ع' ? 'ت' : 'ح';

                          return (
                            <button
                              key={item.dateStr}
                              type="button"
                              onClick={() => handleSingleDayAttendanceChange(item.dateStr, nextCode as any)}
                              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between h-18 shadow-2xs relative group ${tileBg}`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                <span>{item.dayName.substring(0, 6)}</span>
                                <span className="font-mono font-black text-slate-900">{item.dayNum}</span>
                              </div>
                              <div className="my-auto">
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-2xs ${codeBadge}`}>
                                  {item.normCode === 'unrecorded' ? '؟' : item.normCode}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 group-hover:text-slate-800 font-bold block">
                                انقر للتغيير
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DISPLAY MODE 2: Detailed Monthly Table */}
                  {attendanceViewMode === 'table' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-900 text-slate-100 font-bold sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 text-center w-12">#</th>
                            <th className="p-2.5">اليوم والتاريخ</th>
                            <th className="p-2.5 text-center">رمز الحالة</th>
                            <th className="p-2.5">التوصيف الإداري</th>
                            <th className="p-2.5 text-center">تحديث فوري</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {monthlySheetData.filtered.map((item) => {
                            let badgeBg = 'bg-slate-100 text-slate-600 border-slate-300';
                            let label = 'لم يتم تحضيره ⏳';
                            
                            if (item.normCode === 'ح') {
                              badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black';
                              label = 'حاضر بالخدمة والكتيبة 🟢';
                            } else if (item.normCode === 'غ') {
                              badgeBg = 'bg-rose-100 text-rose-900 border-rose-300 font-black';
                              label = 'غياب غير مبرر 🔴';
                            } else if (item.normCode === 'إ') {
                              badgeBg = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                              label = 'في إجازة رسمية معتمدة 🟡';
                            } else if (item.normCode === 'م') {
                              badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-300 font-black';
                              label = 'في مأمورية عمل عسكرية 🔵';
                            } else if (item.normCode === 'ع') {
                              badgeBg = 'bg-sky-100 text-sky-900 border-sky-300 font-black';
                              label = 'إجازة مرضية / عذر طبي معتمد 🩺';
                            } else if (item.normCode === 'ت') {
                              badgeBg = 'bg-orange-100 text-orange-900 border-orange-300 font-black';
                              label = 'تأخير عن موعد التحضير 🟧';
                            }

                            return (
                              <tr key={item.dateStr} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 text-center font-mono font-black text-slate-700 bg-slate-50/50">
                                  {item.dayNum}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-2">
                                    <span>{item.dayName}</span>
                                    <span className="text-[11px] font-mono text-slate-500 dir-ltr font-normal">
                                      ({item.dateStr})
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`inline-block px-3 py-0.5 rounded-lg text-xs border ${badgeBg}`}>
                                    {item.normCode === 'unrecorded' ? 'غير محضر' : item.normCode}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className="font-extrabold text-slate-800 text-xs">{label}</span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <select
                                    value={item.normCode === 'unrecorded' ? '' : item.normCode}
                                    onChange={(e) => handleSingleDayAttendanceChange(item.dateStr, e.target.value as any)}
                                    className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                  >
                                    <option value="">تغيير الحالة...</option>
                                    <option value="ح">حاضر (ح)</option>
                                    <option value="غ">غياب (غ)</option>
                                    <option value="إ">إجازة (إ)</option>
                                    <option value="م">مأمورية (م)</option>
                                    <option value="ع">مرضية/بعذر (ع)</option>
                                    <option value="ت">تأخير (ت)</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Combined Discipline, Commendations & Guard Duty Register */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 font-sans text-right">
                  {/* Segmented Control Navigation Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-800" />
                      <h4 className="text-sm font-black text-slate-900">سجل الانضباط والثواب والخدمات</h4>
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDisciplineActiveTab('penalties')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          disciplineActiveTab === 'penalties'
                            ? 'bg-rose-700 text-white font-black shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>الجزاءات ({disciplinaryRecords.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDisciplineActiveTab('commendations')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          disciplineActiveTab === 'commendations'
                            ? 'bg-amber-600 text-white font-black shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Medal className="w-3.5 h-3.5" />
                        <span>الشكر والثناء ({commendationRecords.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDisciplineActiveTab('guards')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          disciplineActiveTab === 'guards'
                            ? 'bg-indigo-700 text-white font-black shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>الخدمات والمناوبات ({guardRecords.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB 1: Penalties Log */}
                  {disciplineActiveTab === 'penalties' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-bold">توثيق العقوبات والإنذارات الرسمية الصادرة بحق الفرد:</p>
                        <button
                          type="button"
                          onClick={() => setIsAddPenaltyModalOpen(true)}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تسجيل جزاء انضباطي</span>
                        </button>
                      </div>

                      {disciplinaryRecords.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          سجل الفرد نظيف تماماً — لا توجد أي جزاءات أو قرارات انضباطية مقيدة.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {disciplinaryRecords.map((pen, idx) => (
                            <motion.div
                              key={pen.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.04 }}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs relative shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="font-black text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-200">
                                  {pen.type}
                                </span>
                                <span className="font-mono text-slate-500 font-bold">{pen.date}</span>
                              </div>

                              <div className="space-y-1 font-bold text-slate-800">
                                <p><span className="text-slate-500 font-normal">الجهة الصادرة:</span> {pen.authority}</p>
                                <p><span className="text-slate-500 font-normal">السبب:</span> {pen.reason}</p>
                                {pen.notes && <p className="text-slate-600 italic text-[11px]"><span className="text-slate-400">ملاحظات:</span> {pen.notes}</p>}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                                <span>الموثق: {pen.issuerName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePenalty(pen.id)}
                                  className="text-rose-600 hover:text-rose-800 font-black cursor-pointer underline flex items-center gap-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 2: Commendations & Honors Log */}
                  {disciplineActiveTab === 'commendations' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-bold">توثيق كتب الشكر والأوسمة والتكريم الانضباطي:</p>
                        <button
                          type="button"
                          onClick={() => setIsAddCommendationModalOpen(true)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة ثناء أو شكر</span>
                        </button>
                      </div>

                      {commendationRecords.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          لا توجد كتب شكر أو ثناء مقيدة للفرد حتى الآن.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {commendationRecords.map((com, idx) => (
                            <motion.div
                              key={com.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.04 }}
                              className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs relative shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                                <span className="font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1">
                                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{com.type}</span>
                                </span>
                                <span className="font-mono text-slate-600 font-bold">{com.date}</span>
                              </div>

                              <div className="space-y-1 font-bold text-slate-800">
                                <p><span className="text-slate-500 font-normal">الجهة المنحت:</span> {com.authority}</p>
                                <p><span className="text-slate-500 font-normal">السبب والتميز:</span> {com.reason}</p>
                                {com.notes && <p className="text-amber-900 italic text-[11px]"><span className="text-slate-400">ملاحظات ومكافأة:</span> {com.notes}</p>}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-amber-200 text-[11px] text-slate-500">
                                <span>الموثق: {com.issuerName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCommendation(com.id)}
                                  className="text-rose-600 hover:text-rose-800 font-black cursor-pointer underline flex items-center gap-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 3: Guard Duty & Field Shifts */}
                  {disciplineActiveTab === 'guards' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-bold">سجل خفر النوبات والخدمات الميدانية المسندة:</p>
                        <button
                          type="button"
                          onClick={() => setIsAddGuardModalOpen(true)}
                          className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تكليف بنوبة خدمة</span>
                        </button>
                      </div>

                      {guardRecords.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          لا توجد نوبات خدمة أو خفر مسندة للفرد حتى الآن.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {guardRecords.map((grd, idx) => (
                            <motion.div
                              key={grd.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.04 }}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs relative shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="font-black text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{grd.shift}</span>
                                </span>
                                <span className="font-mono text-slate-600 font-bold">{grd.date}</span>
                              </div>

                              <div className="space-y-1 font-bold text-slate-800">
                                <p><span className="text-slate-500 font-normal">موقع الخدمة:</span> {grd.location}</p>
                                <p><span className="text-slate-500 font-normal">الحالة:</span> <span className="text-emerald-700 font-black">{grd.status}</span></p>
                                {grd.notes && <p className="text-slate-600 italic text-[11px]"><span className="text-slate-400">ملاحظات:</span> {grd.notes}</p>}
                              </div>

                              <div className="flex items-center justify-end pt-2 border-t border-slate-200 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGuard(grd.id)}
                                  className="text-rose-600 hover:text-rose-800 font-black cursor-pointer underline flex items-center gap-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>





                {/* Historical Log Records Table */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <History className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">السجل التاريخي لإدخالات وتعديلات الحضور</h5>
                  </div>

                  {loadingTab ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold font-sans">
                      <RefreshCw className="w-5 h-5 text-emerald-800 animate-spin mx-auto mb-2" />
                      جاري الاستعلام عن سجلات الحضور والانضباط...
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold font-sans">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      لا توجد سجلات حضور مسجلة للفرد مسبقاً في نظام الحضور والعديد اليومي.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[250px] overflow-y-auto">
                      <table className="w-full text-right text-xs font-sans">
                        <thead className="bg-slate-900 text-slate-100 font-sans sticky top-0 z-10">
                          <tr>
                            <th className="p-3 font-bold">تاريخ السجل</th>
                            <th className="p-3 font-bold text-center">الرمز والكود العسكري للحالة</th>
                            <th className="p-3 font-bold">الحالة الإدارية الكاملة</th>
                            <th className="p-3 font-bold">تاريخ ووقت الرصد الفوري</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {attendanceHistory.map(record => {
                            let statusText = 'حضور';
                            let statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                            if (record.statusCode === 'غ') {
                              statusText = 'غياب غير مبرر';
                              statusColor = 'bg-rose-50 text-rose-800 border-rose-200';
                            } else if (record.statusCode === 'إ') {
                              statusText = 'في إجازة رسمية';
                              statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
                            } else if (record.statusCode === 'م') {
                              statusText = 'في مأموريات عسكرية';
                              statusColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                            } else if (record.statusCode === 'ع') {
                              statusText = 'غياب بعذر معتمد / مرضية';
                              statusColor = 'bg-sky-50 text-sky-800 border-sky-200';
                            }

                            return (
                              <tr key={record.id} className="hover:bg-slate-50/60">
                                <td className="p-3 font-mono font-bold text-slate-700">{record.date}</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg border font-black text-xs font-sans ${statusColor}`}>
                                    {record.statusCode}
                                  </span>
                                </td>
                                <td className="p-3 font-extrabold text-slate-800">{statusText}</td>
                                <td className="p-3 text-slate-400 font-mono text-[10px]">
                                  {new Date(record.updatedAt).toLocaleString('ar-EG')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 5: Military Timeline (السجل الزمني للعسكري) */}
            {activeTab === 'timeline' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 font-sans"
              >
                {/* Header Banner & Actions */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl border border-slate-700 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                        <History className="w-5 h-5" />
                      </div>
                      <h5 className="text-sm font-black text-white">السجل الزمني للعسكري (Military Timeline)</h5>
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        مستند رسمي موحد
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-bold leading-relaxed">
                      يعرض جميع الأحداث المحورية والإجراءات العسكرية للفرد منذ التحاقه بالخدمة وحتى اليوم في خط زمني تفاعلي معتمد.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsAddTimelineEventModalOpen(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة حدث زمني</span>
                    </button>

                    <button
                      onClick={() => setPrintableTimelinePass({ events: filteredTimelineEvents, soldier, unitName: soldierUnitName })}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-sky-400" />
                      <span>طباعة المسيرة</span>
                    </button>

                    <button
                      onClick={handleExportTimelineCsv}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>تصدير Excel</span>
                    </button>
                  </div>
                </div>

                {/* Search & Multi-Filter Control Bar */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 text-white shadow-sm print:hidden">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search Field */}
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        value={timelineSearchQuery}
                        onChange={(e) => setTimelineSearchQuery(e.target.value)}
                        placeholder="البحث بالقرار، العنوان، التفاصيل، أو الجهة الصادرة..."
                        className="w-full bg-slate-950 border border-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    {/* Date Start Filter */}
                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">من:</span>
                      <input
                        type="date"
                        value={timelineStartDateFilter}
                        onChange={(e) => setTimelineStartDateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    {/* Date End Filter */}
                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">إلى:</span>
                      <input
                        type="date"
                        value={timelineEndDateFilter}
                        onChange={(e) => setTimelineEndDateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    {/* Sort Direction Toggle */}
                    <div className="md:col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => setTimelineSortOrder(timelineSortOrder === 'desc' ? 'asc' : 'desc')}
                        title={timelineSortOrder === 'desc' ? 'التنظيم: الأحدث أولاً' : 'التنظيم: الأقدم أولاً'}
                        className="w-full h-full min-h-[36px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px]">{timelineSortOrder === 'desc' ? 'الأحدث' : 'الأقدم'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
                    {Object.entries(TIMELINE_CATEGORY_MAP).map(([catKey, catObj]) => {
                      const isActive = timelineCategoryFilter === catKey;
                      const CatIcon = catObj.icon;
                      return (
                        <button
                          key={catKey}
                          onClick={() => setTimelineCategoryFilter(catKey)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                              : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{catObj.emoji}</span>
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{catObj.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline Stats Summary Counter */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>إجمالي الأحداث المعروضة بالخط الزمني:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{filteredTimelineEvents.length}</span>
                    <span>من أصل ({allTimelineEvents.length}) سجل</span>
                  </div>
                  {(timelineSearchQuery || timelineCategoryFilter !== 'all' || timelineStartDateFilter || timelineEndDateFilter) && (
                    <button
                      onClick={() => {
                        setTimelineSearchQuery('');
                        setTimelineCategoryFilter('all');
                        setTimelineStartDateFilter('');
                        setTimelineEndDateFilter('');
                      }}
                      className="text-rose-600 hover:text-rose-800 font-black underline cursor-pointer text-[11px]"
                    >
                      إعادة تعيين الفلاتر ↺
                    </button>
                  )}
                </div>

                {/* Timeline Thread Stream */}
                {filteredTimelineEvents.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-3 font-sans">
                    <History className="w-12 h-12 text-slate-600 mx-auto" />
                    <h6 className="text-sm font-black text-slate-200">لا توجد سجلات زمنية تطابق خيارات البحث والحظر</h6>
                    <p className="text-xs text-slate-400">جرب تعديل كلمة البحث أو فلتر الفئة والتواريخ لاستعراض الأحداث.</p>
                  </div>
                ) : (
                  <div className="relative pr-6 md:pr-8 border-r-2 border-slate-800 space-y-6 font-sans py-2">
                    {filteredTimelineEvents.map((item, idx) => {
                      const catConfig = TIMELINE_CATEGORY_MAP[item.category] || TIMELINE_CATEGORY_MAP['milestones'];
                      const CategoryIcon = catConfig.icon;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className="relative group"
                        >
                          {/* Node Icon on Thread */}
                          <div className={`absolute -right-[35px] md:-right-[43px] top-3.5 w-8 h-8 rounded-full border-2 border-slate-900 ${catConfig.dotBg} text-white flex items-center justify-center shadow-md shadow-black/20 group-hover:scale-110 transition-transform`}>
                            <CategoryIcon className="w-4 h-4" />
                          </div>

                          {/* Event Card */}
                          <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 md:p-5 shadow-sm space-y-3 transition-all hover:shadow-md">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                              {/* Category & Date Badge */}
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg border font-black text-xs flex items-center gap-1.5 ${catConfig.badgeBg} ${catConfig.textColor} ${catConfig.borderColor}`}>
                                  <span>{catConfig.emoji}</span>
                                  <span>{item.categoryLabel}</span>
                                </span>

                                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                  {item.date}
                                </span>
                              </div>

                              {/* Order Number Badge */}
                              {item.orderNumber && (
                                <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                                  رقم القرار: {item.orderNumber}
                                </span>
                              )}
                            </div>

                            {/* Title & Body Details */}
                            <div className="space-y-1.5">
                              <h6 className="text-sm font-black text-white leading-snug flex items-center justify-between">
                                <span>{item.title}</span>
                              </h6>
                              <p className="text-xs text-slate-300 font-bold leading-relaxed whitespace-pre-line">
                                {item.details}
                              </p>
                              {item.notes && (
                                <p className="text-[11px] text-slate-400 font-medium italic bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                                  📌 <span className="font-bold text-slate-300">ملاحظات ومرفقات:</span> {item.notes}
                                </p>
                              )}
                            </div>

                            {/* Card Footer Info & Controls */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                              <div className="flex items-center gap-2 text-slate-400 font-bold">
                                <span>جهة الإصدار: <strong className="text-slate-200">{item.authority || 'القيادة العسكرية'}</strong></span>
                                {item.issuerName && (
                                  <span className="text-slate-500">| توثيق: {item.issuerName}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedTimelineDetail(item)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>التفاصيل الكاملة</span>
                                </button>

                                {item.isCustom && (
                                  <button
                                    onClick={() => handleDeleteCustomTimelineEvent(item.id.replace('tl_custom_', ''))}
                                    className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-800/40"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>حذف</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'operational_history' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Tab Header Description */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
                  <div className="space-y-1 font-sans">
                    <h5 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      سجل الحركة والمسار العملياتي للفرد
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      يعرض هذا القسم السلسلة الزمنية الكاملة لكافة تنقلات الفرد، قرارات التكليف والتحويل الإداري بين الوحدات والتشكيلات العسكرية منذ تاريخ مباشرة الخدمة.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  {/* Timeline Panel */}
                  <div className="lg:col-span-2 bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                      <History className="w-4 h-4 text-slate-700" />
                      <h5 className="text-xs font-black text-slate-800">التدرج الزمني لتحركات الفرد</h5>
                    </div>

                    {assignmentsList.length === 0 ? (
                      <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center space-y-3 font-sans my-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <ArrowLeftRight className="w-6 h-6" />
                        </div>
                        <h6 className="font-extrabold text-sm text-slate-800">لا توجد حركات نقل أو تحويل إداري مسجلة لهذا الفرد</h6>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-bold">
                          الفرد مستقر حالياً على ملاك وحدة <span className="font-black text-emerald-700">{soldierUnitName}</span> منذ الانضمام والتعيين المبدئي ({soldier.joinDate || 'تاريخ المباشرة الأولى'}).
                        </p>
                        <div className="pt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl max-w-md mx-auto font-bold leading-relaxed">
                          💡 يتم توثيق أي مسار حركة أو نقل بين الوحدات فورياً بمجرد إجرائه عبر زر (نقل وتبعية) من قبل أي مستخدم مخوّل بالنظام.
                        </div>
                      </div>
                    ) : (
                      <div className="relative pr-6 border-r-2 border-slate-200 space-y-8 mt-4 font-sans">
                        {assignmentsList.map((transfer, idx) => (
                          <div key={transfer.id || idx} className="relative space-y-2">
                            {/* Timeline Dot */}
                            <div className={`absolute -right-[31px] top-1 bg-white p-1 rounded-full border-2 ${
                              idx === 0 ? 'border-teal-600 shadow-3xs scale-110' : 'border-slate-400'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-teal-600' : 'bg-slate-400'}`} />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-500 font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                {transfer.date}
                              </span>
                              {idx === 0 && (
                                <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-bold w-max">
                                  آخر نقل إداري معتمد
                                </span>
                              )}
                            </div>

                            <div className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-2xs transition-all">
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                  <h6 className="font-extrabold text-xs text-slate-800">{transfer.type || 'نقل عسكري'}</h6>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">بموجب الأمر رقم: <span className="font-mono text-slate-600">{transfer.orderNumber || 'غير محدد'}</span></p>
                                  {transfer.recordedBy && (
                                    <span className="inline-block text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mt-1">
                                      رصد بواسطة: {transfer.recordedBy}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setSelectedTransfer(transfer)}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-3 py-1.5 rounded-lg font-black transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                                  <span>عرض القرار التفصيلي</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                                  <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">الوحدة العسكرية السابقة:</span>
                                  <span className="font-black text-slate-600">{transfer.fromUnitName || 'غير معروفة'}</span>
                                </div>
                                <div className="bg-teal-50/40 p-2.5 rounded-lg border border-teal-100">
                                  <span className="text-[9px] text-teal-600 block mb-0.5 font-bold">الوحدة العسكرية المستهدفة:</span>
                                  <span className="font-black text-slate-800">{transfer.toUnitName || 'غير معروفة'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary Widget Panel */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                        <Activity className="w-4 h-4 text-emerald-800" />
                        <h5 className="text-xs font-black text-slate-800">مؤشرات الاستقرار والخدمة</h5>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-bold">إجمالي عمليات النقل السابقة</span>
                          <span className="font-black text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">{assignmentsList.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-bold">تاريخ أول مباشرة خدمة</span>
                          <span className="font-black text-slate-700">{soldier.joinDate || '1439/05/12 هـ'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-200">
                          <span className="text-slate-500 font-bold">آخر جهة إدارية منسق معها</span>
                          <span className="font-black text-teal-800">{assignmentsList[0]?.issuedBy || 'شؤون الأفراد'}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[10px] text-teal-800 leading-relaxed space-y-1.5">
                        <p className="font-black">💡 تلميح الرقابة التنظيمية:</p>
                        <p>إن التنقلات المسجلة هنا رسمية ومؤرشفة بشكل مشفر في الخادم الرئيسي، ولا يمكن تعديل أو شطب أي قيد إلا بموافقة المدير العام لشؤون الأفراد والخدمة بوزارة الدفاع.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: Military Custody (العهد والأمانات العسكرية) */}
            {activeTab === 'custody' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 font-sans"
              >
                {/* Custody Header Banner & Official Description */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="space-y-2 font-sans max-w-4xl relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                        <PackageCheck className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-amber-400 flex items-center gap-2">
                          العهد والأمانات والمسؤوليات العسكرية الموكولة للفرد
                        </h5>
                        <span className="text-[10px] text-slate-400 font-bold">منظومة التوثيق وحصر العهد وإخلاء الطرف</span>
                      </div>
                    </div>
                    
                    {/* User specified description text */}
                    <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed font-bold shadow-inner">
                      "يُثبّت في هذا القسم جميع التعهدات والمسؤوليات الملقاة على عاتق الفرد العسكري تجاه المعدات أو المهمات أو الأمانات المسلّمة له، مع تحديد تاريخ التسلم، وحالة العهد، وتوقيع الفرد والمسؤول المُسلّم، وأي ملاحظات تتعلق بالعهد أو بنود إخلاء الطرف منه. يُعتبر هذا القسم مرجعاً أساسياً لمتابعة الممتلكات العسكرية الموكولة للفرد طوال فترة خدمته."
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-col items-stretch gap-2.5 w-full md:w-auto shrink-0 relative z-10">
                    {currentUser.role !== 'operations' && (
                      <button
                        onClick={handleOpenNewCustodyModal}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>تسجيل عهدة / أمانة جديدة</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters, View Switcher & Search Controls */}
                <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-3 font-sans">
                  <div className="relative w-full lg:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="بحث برقم العهدة / نوع السلاح / الوصف / مرجع الأمر..."
                      value={custodySearch}
                      onChange={(e) => setCustodySearch(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-amber-500 font-bold placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto overflow-x-auto justify-between lg:justify-end">
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs shrink-0">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-bold">الحالة:</span>
                      <select
                        value={custodyStatusFilter}
                        onChange={(e) => setCustodyStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer text-xs"
                      >
                        <option value="all" className="bg-slate-900">جميع الحالات</option>
                        <option value="نشط" className="bg-slate-900">نشط بعهدة الفرد</option>
                        <option value="منتهٍ" className="bg-slate-900">منتهٍ (تم إخلاء الطرف)</option>
                        <option value="قيد التدقيق" className="bg-slate-900">قيد التدقيق والتعقيب</option>
                        <option value="مفقود/متحفظ عليه" className="bg-slate-900">مفقود/متحفظ عليه</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs shrink-0">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-bold">الجهة:</span>
                      <select
                        value={custodyDeptFilter}
                        onChange={(e) => setCustodyDeptFilter(e.target.value)}
                        className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer text-xs"
                      >
                        <option value="all" className="bg-slate-900">جميع الجهات</option>
                        <option value="التسليح العسكري" className="bg-slate-900">التسليح العسكري</option>
                        <option value="الإمداد والتموين" className="bg-slate-900">الإمداد والتموين</option>
                        <option value="الشؤون الفنية والقيادة" className="bg-slate-900">الشؤون الفنية والقيادة</option>
                        <option value="شؤون الأفراد" className="bg-slate-900">شؤون الأفراد</option>
                        <option value="ركن الإشارة والاتصالات" className="bg-slate-900">ركن الإشارة والاتصالات</option>
                      </select>
                    </div>

                    {/* View Switcher: Table vs Cards */}
                    <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs shrink-0">
                      <button
                        onClick={() => setCustodyViewMode('table')}
                        className={`px-3 py-1 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          custodyViewMode === 'table'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>جدول رسمي</span>
                      </button>
                      <button
                        onClick={() => setCustodyViewMode('cards')}
                        className={`px-3 py-1 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          custodyViewMode === 'cards'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>بطاقات مصغرة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custody Items Rendering */}
                {(() => {
                  let filtered = [...custodiesList];
                  if (custodySearch.trim()) {
                    const q = custodySearch.toLowerCase();
                    filtered = filtered.filter(item =>
                      (item.custodyNumber && item.custodyNumber.toLowerCase().includes(q)) ||
                      (item.type && item.type.toLowerCase().includes(q)) ||
                      (item.description && item.description.toLowerCase().includes(q)) ||
                      (item.orderRef && item.orderRef.toLowerCase().includes(q)) ||
                      (item.notes && item.notes.toLowerCase().includes(q)) ||
                      (item.issuingDept && item.issuingDept.toLowerCase().includes(q)) ||
                      (item.issuingOfficer && item.issuingOfficer.toLowerCase().includes(q))
                    );
                  }
                  if (custodyStatusFilter !== 'all') {
                    filtered = filtered.filter(item => item.status === custodyStatusFilter);
                  }
                  if (custodyDeptFilter !== 'all') {
                    filtered = filtered.filter(item => item.issuingDept === custodyDeptFilter);
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-slate-950/80 border border-slate-800 p-10 rounded-2xl text-center space-y-3 font-sans">
                        <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-slate-800">
                          <Box className="w-7 h-7" />
                        </div>
                        <h6 className="font-extrabold text-sm text-slate-200">لا توجد عهد أو أمانات عسكرية مسجلة بهذا الفرد حالياً</h6>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-bold">
                          يمكنك تسجيل السلاح أو المعدات أو المركبات أو المهمات الشخصية وتوثيق تاريخ التسلم والجهة المسلّمة بسهولة.
                        </p>
                        {currentUser.role !== 'operations' && (
                          <button
                            onClick={handleOpenNewCustodyModal}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>تسجيل أول عهدة الآن</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  {/* VIEW 1: Professional Military Register Table */}
                  if (custodyViewMode === 'table') {
                    return (
                      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl font-sans">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-black text-[11px]">
                                <th className="p-3 text-center w-10">#</th>
                                <th className="p-3">نوع العهدة والمواصفات</th>
                                <th className="p-3">رقم العهدة / الرقم المميز</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3">تاريخ التسلم / الإرجاع</th>
                                <th className="p-3">الجهة والمسؤول المُسلّم</th>
                                <th className="p-3 text-center">حالة العهدة</th>
                                <th className="p-3 text-center">التواثيق</th>
                                <th className="p-3 text-center">الإجراءات والطباعة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-bold">
                              {filtered.map((item, index) => {
                                // Expressive status styling
                                const isStatusActive = item.status === 'نشط';
                                const isStatusEnded = item.status === 'منتهٍ';
                                const isStatusPending = item.status === 'قيد التدقيق';

                                const rowBgClass = isStatusActive
                                  ? 'hover:bg-emerald-950/20'
                                  : isStatusEnded
                                  ? 'hover:bg-sky-950/20'
                                  : isStatusPending
                                  ? 'hover:bg-amber-950/20'
                                  : 'hover:bg-rose-950/20';

                                const statusBadgeClass = isStatusActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : isStatusEnded
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                  : isStatusPending
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';

                                const statusDotClass = isStatusActive
                                  ? 'bg-emerald-400 animate-pulse'
                                  : isStatusEnded
                                  ? 'bg-sky-400'
                                  : isStatusPending
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400';

                                return (
                                  <tr key={item.id} className={`transition-colors ${rowBgClass}`}>
                                    {/* Index */}
                                    <td className="p-3 text-center font-mono text-slate-500 text-[11px]">
                                      {index + 1}
                                    </td>

                                    {/* Type & Specs */}
                                    <td className="p-3 max-w-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 text-amber-400 shrink-0">
                                          <Package className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <span className="font-extrabold text-white text-xs block">{item.type}</span>
                                          {item.description && (
                                            <span className="text-[10px] text-slate-400 line-clamp-1 font-normal block mt-0.5">
                                              {item.description}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Custody / Serial Number */}
                                    <td className="p-3 font-mono">
                                      <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
                                        {item.custodyNumber}
                                      </span>
                                      {item.orderRef && (
                                        <span className="text-[10px] text-slate-500 block font-sans mt-0.5">
                                          أمر: {item.orderRef}
                                        </span>
                                      )}
                                    </td>

                                    {/* Quantity */}
                                    <td className="p-3 text-center font-mono text-slate-200">
                                      {item.quantity}
                                    </td>

                                    {/* Dates */}
                                    <td className="p-3">
                                      <span className="text-slate-200 font-mono block text-[11px]">{item.issueDate}</span>
                                      {item.returnDate && (
                                        <span className="text-[10px] text-sky-400 font-mono block mt-0.5">
                                          إرجاع: {item.returnDate}
                                        </span>
                                      )}
                                    </td>

                                    {/* Issuing Dept & Officer */}
                                    <td className="p-3">
                                      <span className="text-slate-200 block text-xs">{item.issuingDept}</span>
                                      <span className="text-[10px] text-slate-400 block">{item.issuingOfficer}</span>
                                    </td>

                                    {/* Expressive Status Badge */}
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${statusBadgeClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                                        <span>
                                          {item.status === 'نشط' ? 'نشط بعهدة الفرد' :
                                           item.status === 'منتهٍ' ? 'منتهٍ (إخلاء طرف)' :
                                           item.status === 'قيد التدقيق' ? 'قيد التدقيق' :
                                           'مفقود / متحفظ'}
                                        </span>
                                      </span>
                                    </td>

                                    {/* Signatures */}
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                        <span
                                          className={`px-1.5 py-0.5 rounded border ${
                                            item.individualSigned
                                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                              : 'bg-slate-900 text-slate-500 border-slate-800'
                                          }`}
                                          title="توقيع الفرد"
                                        >
                                          فرد: {item.individualSigned ? '✓' : '✗'}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded border ${
                                            item.officerSigned
                                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                              : 'bg-slate-900 text-slate-500 border-slate-800'
                                          }`}
                                          title="توقيع المسؤول"
                                        >
                                          مسؤول: {item.officerSigned ? '✓' : '✗'}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Quick Print & Actions */}
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {/* Quick Print Icon Button */}
                                        <button
                                          onClick={() => {
                                            setPrintableCustody(item);
                                            setIsPrintableCustodyOpen(true);
                                          }}
                                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                          title="طباعة فورية لسند العهدة / إخلاء الطرف"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-black hidden sm:inline">طباعة</span>
                                        </button>

                                        {currentUser.role !== 'operations' && item.status === 'نشط' && (
                                          <button
                                            onClick={() => handleClearCustodyStatus(item)}
                                            className="p-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded-lg border border-sky-800/50 transition-all cursor-pointer"
                                            title="إخلاء طرف الفرد من العهدة"
                                          >
                                            <FileCheck2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {currentUser.role !== 'operations' && (
                                          <button
                                            onClick={() => handleEditCustody(item)}
                                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                                            title="تعديل العهدة"
                                          >
                                            <Edit className="w-3.5 h-3.5 text-amber-400" />
                                          </button>
                                        )}

                                        {currentUser.role !== 'operations' && (
                                          <button
                                            onClick={() => handleDeleteCustody(item.id)}
                                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg transition-all cursor-pointer border border-rose-800/40"
                                            title="حذف القيد"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  {/* VIEW 2: Refined Micro-cards with Expressive Colors & Quick Print */}
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                      {filtered.map((item) => {
                        const isStatusActive = item.status === 'نشط';
                        const isStatusEnded = item.status === 'منتهٍ';
                        const isStatusPending = item.status === 'قيد التدقيق';

                        const cardBorderAccent = isStatusActive
                          ? 'border-r-4 border-r-emerald-500 border-slate-800 bg-slate-950/90 hover:border-emerald-500/50'
                          : isStatusEnded
                          ? 'border-r-4 border-r-sky-500 border-slate-800 bg-slate-950/90 hover:border-sky-500/50'
                          : isStatusPending
                          ? 'border-r-4 border-r-amber-500 border-slate-800 bg-slate-950/90 hover:border-amber-500/50'
                          : 'border-r-4 border-r-rose-500 border-slate-800 bg-slate-950/90 hover:border-rose-500/50';

                        const badgeClass = isStatusActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isStatusEnded
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                          : isStatusPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';

                        return (
                          <div
                            key={item.id}
                            className={`border p-4 rounded-2xl space-y-3 transition-all relative group shadow-md ${cardBorderAccent}`}
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-amber-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h6 className="font-black text-sm text-white">{item.type}</h6>
                                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                      الكمية: {item.quantity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono font-bold mt-0.5">
                                    رقم العهدة / السلاح: <span className="text-amber-400">{item.custodyNumber}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Expressive Status Badge */}
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isStatusActive ? 'bg-emerald-400 animate-pulse' : isStatusEnded ? 'bg-sky-400' : isStatusPending ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                <span>
                                  {item.status === 'نشط' ? 'نشط بعهدة الفرد' :
                                   item.status === 'منتهٍ' ? 'منتهٍ (تم إخلاء الطرف)' :
                                   item.status === 'قيد التدقيق' ? 'قيد التدقيق والمراجعة' :
                                   'مفقود / متحفظ عليه'}
                                </span>
                              </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 font-bold">
                              <div>
                                <span className="text-slate-500 block text-[10px]">تاريخ التسلم:</span>
                                <span className="text-slate-200 font-mono">{item.issueDate}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">الجهة المسلمة:</span>
                                <span className="text-slate-200">{item.issuingDept}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">المسؤول المُسلّم:</span>
                                <span className="text-slate-200">{item.issuingOfficer}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">مرجع الأمر:</span>
                                <span className="text-slate-200 font-mono">{item.orderRef || 'بدون أمر خاص'}</span>
                              </div>
                              {item.returnDate && (
                                <div className="col-span-2 pt-1 border-t border-slate-800/80">
                                  <span className="text-sky-400 block text-[10px]">تاريخ الإرجاع وإخلاء الطرف:</span>
                                  <span className="text-sky-300 font-mono">{item.returnDate}</span>
                                </div>
                              )}
                            </div>

                            {/* Description & Notes */}
                            {item.description && (
                              <p className="text-xs text-slate-300 leading-relaxed font-bold bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-amber-400/80 text-[10px] block mb-0.5">الوصف والمواصفات:</span>
                                {item.description}
                              </p>
                            )}

                            {item.notes && (
                              <p className="text-[11px] text-slate-400 italic bg-slate-900/30 p-2 rounded-lg">
                                ملاحظات إخلاء الطرف: {item.notes}
                              </p>
                            )}

                            {/* Signatures Status */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-bold text-slate-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>توقيع الفرد: {item.individualSigned ? 'موقع ومعتمد' : 'غير موقع'}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>توقيع المسؤول: {item.officerSigned ? 'موقع ومعتمد' : 'غير موقع'}</span>
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons & Quick Print */}
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                              <button
                                onClick={() => {
                                  setPrintableCustody(item);
                                  setIsPrintableCustodyOpen(true);
                                }}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                                title="طباعة فورية لسند تسليم العهدة أو إخلاء الطرف"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة السند</span>
                              </button>

                              {currentUser.role !== 'operations' && item.status === 'نشط' && (
                                <button
                                  onClick={() => handleClearCustodyStatus(item)}
                                  className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 font-bold text-xs rounded-xl border border-sky-800/50 transition-all cursor-pointer flex items-center gap-1"
                                  title="إخلاء طرف الفرد من العهدة"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5" />
                                  <span>إخلاء طرف</span>
                                </button>
                              )}

                              {currentUser.role !== 'operations' && (
                                <button
                                  onClick={() => handleEditCustody(item)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-400" />
                                  <span>تعديل</span>
                                </button>
                              )}

                              {currentUser.role !== 'operations' && (
                                <button
                                  onClick={() => handleDeleteCustody(item.id)}
                                  className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl transition-all cursor-pointer border border-rose-800/40"
                                  title="حذف القيد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* TAB 8: Soldier Account Settings & Assigned Tasks */}
            {activeTab === 'account_tasks' && soldier && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <SoldierAccountTasksTab
                  soldier={soldier}
                  currentUser={currentUser}
                  onAccountUpdated={() => {
                    fetchFullSoldier();
                    if (onSoldierUpdated) onSoldierUpdated();
                  }}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* MODAL 1: GRANT LEAVE (منح إجازة) */}
      {isGrantLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4 font-sans print:hidden overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden text-right my-auto"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-sm">✚ إصدار وتوثيق قرار منح إجازة للفرد</span>
              </div>
              <button 
                onClick={() => setIsGrantLeaveModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base p-1"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleGrantLeaveSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              
              {/* 1. Leave Type Tabs / Buttons */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1.5">نوع الإجازة المعتمدة *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'استحقاق', name: 'استحقاق (اعتيادية)', color: 'emerald' },
                    { id: 'إذن', name: 'إذن مغادرة / إدارية', color: 'sky' },
                    { id: 'طارئة', name: 'إجازة طارئة', color: 'amber' },
                    { id: 'مرضية', name: 'إجازة مرضية', color: 'rose' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLeaveType(tab.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${
                        leaveType === tab.id
                          ? tab.color === 'emerald' ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                            : tab.color === 'sky' ? 'bg-sky-700 text-white border-sky-800 shadow-sm'
                            : tab.color === 'amber' ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                            : 'bg-rose-700 text-white border-rose-800 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sick Leave Diagnosis & Medical Record Field */}
              {leaveType === 'مرضية' && (
                <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn">
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
                      className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
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

              {/* 2. Dates & Auto Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">تاريخ بداية الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">تاريخ نهاية الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">عدد الأيام (يحسب تلقائياً) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={leaveDuration}
                    onChange={(e) => setLeaveDuration(parseInt(e.target.value) || 1)}
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs font-black text-emerald-900 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* 3. Reason */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">سبب ومبررات الإجازة</label>
                <input
                  type="text"
                  placeholder="مثال: ظروف عائلية خاصة / استكمال العلاج / راحة اعتيادية سنوية"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              {/* 4. Granting Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">الجهة المانحة للإجازة *</label>
                  <select
                    value={leaveGrantingAuthority}
                    onChange={(e) => setLeaveGrantingAuthority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none cursor-pointer"
                  >
                    <option value="الكتيبة">الكتيبة</option>
                    <option value="قائد اللواء">قائد اللواء</option>
                    <option value="مكتب القائد">مكتب القائد</option>
                    <option value="ركن القوة البشرية">ركن القوة البشرية</option>
                    <option value="الخدمات الطبية">الخدمات الطبية / المستشفى العسكري</option>
                    <option value="أخرى">جهة أخرى (كتابة مخصصة)</option>
                  </select>
                </div>

                {leaveGrantingAuthority === 'أخرى' && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">اكتب اسم الجهة المانحة</label>
                    <input
                      type="text"
                      placeholder="اسم الجهة أو الإدارة"
                      value={leaveGrantingAuthorityCustom}
                      onChange={(e) => setLeaveGrantingAuthorityCustom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 5. Order Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">رقم الأمر الإداري</label>
                  <input
                    type="text"
                    placeholder="مثال: أ-إ/2026/102"
                    value={leaveOrderNumber}
                    onChange={(e) => setLeaveOrderNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">تاريخ الأمر الإداري</label>
                  <input
                    type="date"
                    value={leaveOrderDate}
                    onChange={(e) => setLeaveOrderDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              {/* 6. Attachments (Upload image or PDF) */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">المرفقات (رفع صورة أو PDF للأمر أو التقرير)</label>
                <div className="border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/80 rounded-xl p-3 text-center transition-all">
                  {leaveAttachmentUrl ? (
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">تم رفع المرفق بنجاح</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLeaveAttachmentUrl(null)}
                        className="text-rose-600 text-xs font-bold hover:underline cursor-pointer"
                      >
                        حذف المرفق
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-1">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                      <span className="text-xs font-bold text-slate-600 block">انقر لرفع صورة الأمر الإداري أو التقرير الطبي</span>
                      <span className="text-[10px] text-slate-400 block font-normal">يدعم الصور والمستندات (PNG, JPG, PDF) حتى 8 ميجابايت</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleLeaveFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 7. Notes */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">ملاحظات إضافية وتوجيهات المغادرة</label>
                <textarea
                  placeholder="ملاحظات القيادة أو الشروط الخاصة بالعودة والمباشرة"
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 min-h-[60px] focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-900 leading-relaxed font-bold">
                ⚡ بمجرد الحفظ: سيقوم النظام تلقائياً بتحديث حالة الفرد إلى (في إجازة)، وتحديث كشف الحضور، وتوليد التصريح القابل للطباعة، وإرسال تنبيه للمسؤولين.
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGrantLeaveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {leaveSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ وتوثيق الإجازة وإصدار التصريح</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* PRINTABLE LEAVE PASS MODAL */}
      {printableLeavePass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[130] p-3 sm:p-4 overflow-y-auto font-sans print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden text-right print:shadow-none print:border-none print:max-w-none print:w-full my-auto">
            
            {/* Header action bar (hidden in print) */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 font-bold text-xs flex flex-wrap gap-2 justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>معاينة وتأكيد تصريح نموذج إجازة رسمية</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const leaveTypeStr = printableLeavePass.leaveType || printableLeavePass.illnessType || 'إجازة رسمية';
                    const summaryText = `🎖️ *تصريح ونموذج إجازة رسمية - القوات المسلحة*
===================================
👤 *الاسم الكامل:* ${soldier.fullName}
🎖️ *الرتبة العسكرية:* ${soldier.rank}
🆔 *الرقم العسكري:* ${soldier.militaryNumber}
🏢 *التشكيل / الوحدة:* ${soldierUnitName}

📋 *تفاصيل الإجازة والمدة:*
• *نوع الإجازة:* ${leaveTypeStr}
• *بداية الإجازة:* ${printableLeavePass.startDate}
• *تاريخ الانتهاء:* ${printableLeavePass.endDate}
• *المدة المعتمدة:* ${printableLeavePass.duration} أيام
• *الجهة المانحة:* ${printableLeavePass.grantingAuthority || printableLeavePass.doctorName || 'قيادة الوحدة'}
• *رقم الأمر الإداري:* ${printableLeavePass.orderNumber || 'غير مدون'}

📌 *حالة الوثيقة:* معتمدة وموثقة رسمياً من قيادة الشؤون العسكرية.`;

                    shareElementViaWhatsApp(
                      'printable-leave-pass',
                      `تصريح_إجازة_${soldier.militaryNumber}_${printableLeavePass.startDate}`,
                      summaryText,
                      soldier.phoneNumber
                    );
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md border border-emerald-500/40"
                  title="مشاركة صورة التصريح الرسمية ونصه التوثيقي مباشرة عبر الواتساب"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-100 fill-emerald-100" />
                  <span>مشاركة صورة عبر الواتساب</span>
                </button>

                <button
                  onClick={() => downloadElementAsImage('printable-leave-pass', `تصريح_إجازة_${soldier.militaryNumber}_${printableLeavePass.startDate}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="تنزيل نموذج التصريح كصورة فائقة الدقة PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>صورة PNG</span>
                </button>

                <button
                  onClick={() => downloadElementAsPdf('printable-leave-pass', `تصريح_إجازة_${soldier.militaryNumber}_${printableLeavePass.startDate}`)}
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

            {/* Printable Document Body */}
            <div className="p-8 space-y-5 text-slate-900 bg-white font-sans print:p-6 border-2 border-slate-900 rounded-2xl shadow-xl" id="printable-leave-pass" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
              {/* Document Military Header */}
              <PrintHeader 
                printSettings={printSettings}
                documentTitle="تصريح ونموذج إجازة رسمية"
                documentSubtitle={`نوع الإجازة: ${printableLeavePass.leaveType || printableLeavePass.illnessType || 'إجازة رسمية'}`}
                documentRef={printableLeavePass.orderNumber || printableLeavePass.id}
                documentDate={printableLeavePass.orderDate || new Date().toISOString().split('T')[0]}
                unitOverride={soldierUnitName}
              />

              {/* Soldier Info Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-900 text-white font-black p-2.5 text-right flex items-center justify-between">
                  <span>أولاً: بيانات صاحب التصريح (الفرد)</span>
                  <span className="text-[10px] text-emerald-300 font-normal">بيانات شؤون الأفراد</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 font-sans">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الاسم الكامل:</span>
                    <span className="font-black text-slate-900">{soldier.fullName}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الرتبة العسكرية:</span>
                    <span className="font-black text-slate-900">{soldier.rank}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الرقم العسكري:</span>
                    <span className="font-mono font-black text-slate-900">{soldier.militaryNumber}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الهوية الوطنية:</span>
                    <span className="font-mono font-black text-slate-900">{soldier.nationalId || 'غير مدون'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الوحدة والتشكيل:</span>
                    <span className="font-black text-slate-900">{soldierUnitName}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">السرية / الفصيلة:</span>
                    <span className="font-black text-slate-900">{soldier.company || 'السرية الأولى'} - {soldier.platoon || 'الفصيلة الأولى'}</span>
                  </div>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-900 text-white font-black p-2.5 text-right flex items-center justify-between">
                  <span>ثانياً: تفاصيل مدة الإجازة والجهة المانحة</span>
                  <span className="text-[10px] text-emerald-300 font-normal">التوثيق الإداري</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-emerald-50/60 font-sans">
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ بداية الإجازة:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.startDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ نهاية الإجازة:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.endDate}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">عدد الأيام المعتمدة:</span>
                    <span className="font-black text-emerald-800 text-sm">{printableLeavePass.duration} أيام</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">الجهة المانحة للإجازة:</span>
                    <span className="font-black text-slate-900">{printableLeavePass.grantingAuthority || printableLeavePass.doctorName || 'الكتيبة'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">رقم الأمر الإداري:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderNumber || 'بدون رقم أمر'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200">
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ الأمر:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderDate || printableLeavePass.startDate}</span>
                  </div>
                  {printableLeavePass.reason && (
                    <div className="col-span-2 sm:col-span-3 bg-amber-50 p-2.5 rounded-lg border border-amber-300">
                      <span className="text-amber-950 font-bold block text-[10px]">سبب ومبررات الإجازة:</span>
                      <span className="font-bold text-slate-900">{printableLeavePass.reason}</span>
                    </div>
                  )}
                  {(printableLeavePass.diagnosis || (printableLeavePass.illnessType && printableLeavePass.illnessType !== printableLeavePass.leaveType)) && (
                    <div className="col-span-2 sm:col-span-3 bg-rose-50 p-2.5 rounded-lg border border-rose-300">
                      <span className="text-rose-950 font-bold block text-[10px]">التشخيص ونوع المرض (السجل الطبي):</span>
                      <span className="font-bold text-rose-900">{printableLeavePass.diagnosis || printableLeavePass.illnessType}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Warnings */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 space-y-1 font-bold">
                <p className="font-black">📌 تعليمات الانضباط العسكري والعودة:</p>
                <p>• يتوجب على الفرد التواجد في مقر وحدته في تمام الساعة 06:00 صباحاً من اليوم التالي لتاريخ انتهاء الإجازة.</p>
                <p>• أي تأخر غير مبرر يخضع الفرد لمساءلة انضباطية وفق قانون الخدمة العسكرية.</p>
              </div>

              {/* Signatures & Seal Block */}
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
                    const leaveTypeStr = printableLeavePass.leaveType || printableLeavePass.illnessType || 'إجازة رسمية';
                    const summaryText = `🎖️ *تصريح ونموذج إجازة رسمية - القوات المسلحة*
===================================
👤 *الاسم الكامل:* ${soldier.fullName}
🎖️ *الرتبة العسكرية:* ${soldier.rank}
🆔 *الرقم العسكري:* ${soldier.militaryNumber}
🏢 *التشكيل / الوحدة:* ${soldierUnitName}

📋 *تفاصيل الإجازة والمدة:*
• *نوع الإجازة:* ${leaveTypeStr}
• *بداية الإجازة:* ${printableLeavePass.startDate}
• *تاريخ الانتهاء:* ${printableLeavePass.endDate}
• *المدة المعتمدة:* ${printableLeavePass.duration} أيام
• *الجهة المانحة:* ${printableLeavePass.grantingAuthority || printableLeavePass.doctorName || 'قيادة الوحدة'}
• *رقم الأمر الإداري:* ${printableLeavePass.orderNumber || 'غير مدون'}

📌 *حالة الوثيقة:* معتمدة وموثقة رسمياً من قيادة الشؤون العسكرية.`;

                    shareElementViaWhatsApp(
                      'printable-leave-pass',
                      `تصريح_إجازة_${soldier.militaryNumber}_${printableLeavePass.startDate}`,
                      summaryText,
                      soldier.phoneNumber
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

      {/* MODAL 2: ADD SICK LEAVE (LEGACY) */}
      {isSickLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center">
              <span>✚ رصد وتسجيل إجازة مرضية معتمدة</span>
              <button 
                onClick={() => setIsSickLeaveModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddSickLeaveSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ بدء الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={slStartDate}
                    onChange={(e) => setSlStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ انتهاء الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={slEndDate}
                    onChange={(e) => setSlEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">نوع المرض / العذر الطبي المعترف به *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وعكة صحية، كسر مبرر، إعفاء طبي مؤقت"
                  value={slIllnessType}
                  onChange={(e) => setSlIllnessType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">الطبيب المعتمد والمصادق *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الطبيب العسكري"
                    value={slDoctor}
                    onChange={(e) => setSlDoctor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">المستشفى أو المركز الطبي</label>
                  <input
                    type="text"
                    placeholder="مثال: المستشفى العسكري بالمنطقة"
                    value={slHospital}
                    onChange={(e) => setSlHospital(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">شرح وتفاصيل التقرير الطبي</label>
                <textarea
                  placeholder="ملاحظات إضافية حول الإجازة الطبية والراحة الممنوحة"
                  value={slNotes}
                  onChange={(e) => setSlNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSickLeaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={slSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {slSubmitting ? 'جاري الرصد والتوثيق...' : 'تأكيد وحفظ الإجازة'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: EDIT FULL DETAILS */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center">
              <span>📝 تعديل وتحديث بيانات الفرد الشاملة</span>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditDetailsSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Photo Upload Section */}
              <div className="border-b border-slate-100 pb-2">
                <h5 className="text-xs font-black text-slate-800">صورة الفرد العسكرية</h5>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 relative shadow-inner">
                  {editPhotoUrl ? (
                    <img src={editPhotoUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div className="space-y-1 w-full text-center sm:text-right">
                  <label className="block text-xs font-black text-slate-700">تحميل صورة شخصية جديدة</label>
                  <p className="text-[10px] text-slate-400 font-semibold">التنسيقات المدعومة: JPG, PNG. الحجم الأقصى: 2 ميجابايت.</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditPhotoUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-600 file:ml-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {editPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl('')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200 cursor-pointer"
                      >
                        حذف الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Information Section */}
              <div className="border-b border-slate-100 pb-2">
                <h5 className="text-xs font-black text-slate-800">1. البيانات العسكرية والأساسية</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الاسم الكامل للفرد *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الرقم العسكري للفرد *</label>
                  <input
                    type="text"
                    required
                    value={editMilNum}
                    onChange={(e) => setEditMilNum(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الرتبة العسكرية الحالية *</label>
                  <input
                    type="text"
                    required
                    value={editRank}
                    onChange={(e) => setEditRank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Personal details & Identification */}
              <div className="border-b border-slate-100 pb-2 pt-2">
                <h5 className="text-xs font-black text-slate-800">2. بيانات التحقق الشخصية والاتصال</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الرقم الوطني للهوية</label>
                  <input
                    type="text"
                    placeholder="مثال: 1024345678"
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">تاريخ الميلاد</label>
                  <input
                    type="text"
                    placeholder="مثال: 1412/04/15 هـ"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">فصيلة الدم</label>
                  <select
                    value={editBloodType}
                    onChange={(e) => setEditBloodType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">رقم الهاتف الجوال</label>
                  <input
                    type="text"
                    placeholder="مثال: 0541234567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">عنوان الإقامة الحالي</label>
                  <input
                    type="text"
                    placeholder="المدينة والحي والشارع"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">رقم طوارئ للتواصل</label>
                  <input
                    type="text"
                    placeholder="الاسم والعلاقة ورقم الهاتف"
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Military structures & organizational assignment */}
              <div className="border-b border-slate-100 pb-2 pt-2">
                <h5 className="text-xs font-black text-slate-800">3. التشكيلات اللوجستية والمهارة</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">تاريخ التطوع / الخدمة</label>
                  <input
                    type="text"
                    placeholder="تاريخ الالتحاق"
                    value={editJoinDate}
                    onChange={(e) => setEditJoinDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">اسم الكتيبة</label>
                  <input
                    type="text"
                    placeholder="مثال: كتيبة المشاة الثانية"
                    value={editBattalion}
                    onChange={(e) => setEditBattalion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">السرية</label>
                  <input
                    type="text"
                    placeholder="مثال: السرية الأولى"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الفصيلة</label>
                  <input
                    type="text"
                    placeholder="مثال: الفصيلة الثالثة"
                    value={editPlatoon}
                    onChange={(e) => setEditPlatoon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">المؤهل الدراسي الأكاديمي</label>
                  <input
                    type="text"
                    value={editQualification}
                    onChange={(e) => setEditQualification(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">التخصص العملياتي الدقيق</label>
                  <input
                    type="text"
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">حالة الفرد الحالية</label>
                  <select
                    value={editMilStatus}
                    onChange={(e) => setEditMilStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="على رأس العمل">على رأس العمل</option>
                    <option value="إجازة">في إجازة رسمية</option>
                    <option value="موقوف">موقوف احتياطياً</option>
                    <option value="منقول">منقول لكتيبة/جهة أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">الملخص والأمراض الطبية (إن وجد)</label>
                  <input
                    type="text"
                    placeholder="أي قيود صحية أو أمراض مزمنة للفرد"
                    value={editMedicalHistory}
                    onChange={(e) => setEditMedicalHistory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-3xs"
                >
                  {editSubmitting ? 'جاري الحفظ والتوثيق...' : 'تعديل وحفظ ملف الفرد'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: MANAGE ATTACHMENTS */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center">
              <span>📎 إدارة مرفقات ومستندات الخدمة</span>
              <button 
                onClick={() => setIsAttachmentModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* List of current attachments */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                <p className="text-[10px] font-black text-slate-400 tracking-wider">الملفات المرفقة حالياً بملف الخدمة</p>
                {attachmentsList.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-400">
                    لا يوجد مستندات أو مرفقات مضافة بعد
                  </div>
                ) : (
                  attachmentsList.map((attach, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-extrabold text-slate-800">{attach.name}</p>
                          <p className="text-[9px] text-slate-400">تاريخ الرفع: {attach.date} • الحجم: {attach.size}</p>
                        </div>
                      </div>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); alert(`جاري تنزيل الملف المرفق الشامل: ${attach.name}`); }}
                        className="p-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        title="تحميل المرفق"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Upload new Attachment */}
              <form onSubmit={handleAddAttachment} className="border-t border-slate-100 pt-3 space-y-3">
                <p className="text-[10px] font-black text-slate-400 tracking-wider">تحميل مستند عسكري أو شهادة جديدة</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">اسم المستند الجديد *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: قرار الترقية الأخير، رخصة القيادة العسكرية"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 animate-in"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">اختيار الملف (PDF, JPG)</label>
                  <div className="border border-dashed border-slate-200 hover:border-emerald-700/40 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-50/10 transition-colors bg-slate-50">
                    <input 
                      type="file" 
                      className="hidden" 
                      id="soldier-upload-attach-file" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachmentFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label htmlFor="soldier-upload-attach-file" className="cursor-pointer space-y-1 block">
                      <Paperclip className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-600">
                        {attachmentFile ? `الملف المحدد: ${attachmentFile.name}` : 'اسحب الملف هنا أو اضغط للاختيار والتصفح'}
                      </p>
                      <p className="text-[9px] text-slate-400">الحد الأقصى لحجم الملف: 10 ميغابايت</p>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={attachmentSubmitting}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-3xs"
                  >
                    {attachmentSubmitting ? 'جاري الرفع والتوثيق...' : 'رفع وحفظ المرفق'}
                  </button>
                </div>
              </form>

            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: VIEW TRANSFER DETAILS */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4 font-sans print:bg-white print:p-0">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full border-2 border-slate-300 shadow-2xl overflow-hidden text-right print:border-0 print:shadow-none"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center print:hidden">
              <span className="flex items-center gap-1.5 font-sans font-black">
                <FileText className="w-4 h-4 text-emerald-400" />
                تفاصيل قرار النقل والتعيين العسكري
              </span>
              <button 
                onClick={() => setSelectedTransfer(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Official decision document card sheet */}
            <div className="p-6 space-y-5 relative" id="printable-transfer-order">
              {/* Decorative military watermark logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <ShieldCheck className="w-64 h-64 text-slate-900" />
              </div>

              <div className="relative space-y-4">
                {/* Document Header block */}
                <PrintHeader 
                  printSettings={printSettings}
                  documentTitle="قرار وأمر إداري نقل عسكري"
                  documentRef={selectedTransfer.orderNumber || selectedTransfer.id}
                  documentDate={selectedTransfer.orderDate}
                  unitOverride={selectedTransfer.toUnitName || soldierUnitName}
                />

                {/* Content body with custom field boxes */}
                <div className="space-y-3.5 text-xs">
                  <p className="font-sans leading-relaxed text-slate-700 font-bold">
                    بناءً على الصلاحيات الإدارية والتنظيمية الممنوحة، وبموجب مصلحة العمل العسكري وسد الاحتياج العملياتي، صدر القرار الإداري التالي:
                  </p>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">اسم الفرد المعني:</span>
                        <span className="font-black text-slate-800">{soldier?.rank}/ {soldier?.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">الرقم العسكري:</span>
                        <span className="font-bold text-slate-700 font-mono tracking-widest">{soldier?.militaryNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-150 pt-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">من الوحدة العسكرية:</span>
                        <span className="font-black text-slate-600">{selectedTransfer.fromUnitName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-600 block font-bold">إلى الوحدة العسكرية:</span>
                        <span className="font-black text-teal-800">{selectedTransfer.toUnitName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">رقم القرار / الأمر الإداري:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{selectedTransfer.orderNumber}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">تاريخ صدور القرار:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{selectedTransfer.orderDate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">الجهة المصدرة للقرار الإداري:</span>
                      <span className="font-black text-slate-800">{selectedTransfer.issuedBy}</span>
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-500">الأسباب والمسوغات التنظيمية:</span>
                      <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-slate-600 leading-relaxed italic font-sans font-semibold">
                        {selectedTransfer.notes || 'سد الاحتياج العملياتي وإدارة ملاكات السيطرة والجاهزية بالوحدة.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures and Seal */}
                <PrintFooter printSettings={printSettings} />
              </div>

              {/* Action Buttons for dialog inside print container */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الأمر</span>
                  </button>
                  <button
                    onClick={() => downloadElementAsPdf('printable-transfer-order', `قرار_إداري_${soldier?.militaryNumber || 'فرد'}_${selectedTransfer.orderNumber}`)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل PDF</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  إغلاق مستند المعاملة
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: DELETE LEAVE CONFIRMATION */}
      {isDeleteConfirmModalOpen && deletingLeave && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[120] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-rose-900 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-rose-800">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-300" />
                <span className="font-black text-sm">تأكيد حذف قرار الإجازة والأمر الإداري</span>
              </div>
              <button 
                onClick={() => { setIsDeleteConfirmModalOpen(false); setDeletingLeave(null); }}
                className="text-rose-200 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تنبيه هـام بشأن الحذف وإلغاء الحضور:</span>
                </div>
                <p className="text-[11px] text-rose-800 font-bold leading-relaxed">
                  عند الحذف، سيتم شطب قيد هذه الإجازة نهائياً، وإعادة تعيين سجل الحضور والانضباط للفرد خلال الفترة من ({deletingLeave.startDate}) إلى ({deletingLeave.endDate}) تلقائياً إلى <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black border border-amber-300">لم يتم تحضيره ⏳</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">اسم المنسوب:</span>
                  <span className="font-black text-slate-900">{soldier?.rank} / {soldier?.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">نوع الإجازة:</span>
                  <span className="font-black text-emerald-800">{deletingLeave.leaveType || deletingLeave.illnessType || 'استحقاق'}</span>
                </div>
                {(deletingLeave.diagnosis || (deletingLeave.illnessType && deletingLeave.illnessType !== deletingLeave.leaveType)) && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">التشخيص الطبي:</span>
                    <span className="font-bold text-rose-800">{deletingLeave.diagnosis || deletingLeave.illnessType}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">فترة الإجازة والمدة:</span>
                  <span className="font-mono font-black text-slate-900">{deletingLeave.startDate} ← {deletingLeave.endDate} ({deletingLeave.duration} أيام)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">الأمر الإداري والجهة:</span>
                  <span className="font-bold text-slate-800">{deletingLeave.orderNumber || 'بدون أمر'} ({deletingLeave.grantingAuthority || deletingLeave.doctorName || 'الكتيبة'})</span>
                </div>
              </div>

              <p className="text-center text-xs text-slate-600 font-bold">هل أنت أكتيد من الرغبة في تنفيذ الحذف؟</p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsDeleteConfirmModalOpen(false); setDeletingLeave(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteLeaveConfirm}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {deleteSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد الحذف وإعادة التعيين</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: EDIT LEAVE */}
      {isEditLeaveModalOpen && editingLeave && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[120] p-3 sm:p-4 font-sans print:hidden overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden text-right my-auto"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm">تعديل بيانات الإجازة والأمر الإداري</span>
              </div>
              <button 
                onClick={() => { setIsEditLeaveModalOpen(false); setEditingLeave(null); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditLeave} className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-bold ml-1">المنسوب:</span>
                  <span className="font-black text-slate-900">{soldier?.rank} / {soldier?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold ml-1">الرقم العسكري:</span>
                  <span className="font-mono font-black text-slate-900">{soldier?.militaryNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">نوع الإجازة المعتمدة *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['استحقاق', 'طارئة', 'إذن', 'مرضية'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditLeaveType(t)}
                      className={`py-2 px-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        editLeaveType === t
                          ? t === 'مرضية' ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : t === 'طارئة' ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : t === 'إذن' ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {editLeaveType === 'مرضية' && (
                <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                    <Stethoscope className="w-4 h-4 text-rose-600" />
                    <span>التشخيص الطبي ونوع المرض (يدوّن بالسجل الطبي) *</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editLeaveDiagnosis}
                    onChange={(e) => setEditLeaveDiagnosis(e.target.value)}
                    placeholder="اكتب التشخيص الطبي / نوع المرض..."
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">تاريخ بداية الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">تاريخ نهاية الإجازة *</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">المدة (أيام)</label>
                  <div className="w-full bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs font-mono font-black text-amber-900 flex items-center justify-between">
                    <span>{editDuration} أيام</span>
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">الجهة المانحة *</label>
                  <select
                    value={editGrantingAuthority}
                    onChange={(e) => setEditGrantingAuthority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="الكتيبة">قيادة الكتيبة</option>
                    <option value="قائد اللواء">مكتب قائد اللواء</option>
                    <option value="ركن القوة البشرية">ركن القوة البشرية</option>
                    <option value="الخدمات الطبية">الخدمات الطبية / المستشفى العسكري</option>
                    <option value="مكتب القائد">مكتب القائد</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">رقم الأمر الإداري</label>
                  <input
                    type="text"
                    value={editOrderNumber}
                    onChange={(e) => setEditOrderNumber(e.target.value)}
                    placeholder="مثال: 104 / 2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">تاريخ صدور الأمر</label>
                  <input
                    type="date"
                    value={editOrderDate}
                    onChange={(e) => setEditOrderDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">سبب أو ملاحظات الإجازة</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="ملاحظات أو مبررات القرار الإداري..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsEditLeaveModalOpen(false); setEditingLeave(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editLeaveSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {editLeaveSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Soldier Monthly Attendance Modal (نافذة كشف التحضير والتواجد الشهري) */}
      {isMonthlyAttendanceModalOpen && soldier && (
        <SoldierMonthlyAttendanceModal
          soldier={soldier}
          units={units}
          attendance={attendanceHistory}
          onClose={() => setIsMonthlyAttendanceModalOpen(false)}
          onSaveAttendanceBatch={handleSaveAttendanceBatch}
        />
      )}

      {/* Printable Monthly Attendance Sheet Modal (نافذة وثيقة كشف التحضير الشهري للطباعة والتحميل) */}
      {printableMonthlySheet && soldier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[130] p-2 sm:p-4 overflow-y-auto font-sans print:p-0 print:bg-white print:fixed print:inset-0">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl overflow-hidden my-auto"
          >
            {/* Top Toolbar (Hidden on print) */}
            <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="font-black text-sm text-white">
                  معاينة وطباعة كشف التحضير والتواجد الشهري - {soldier.rank} / {soldier.fullName}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadElementAsPdf('printable-monthly-sheet', `كشف_تحضير_شهري_${soldier.militaryNumber}_${printableMonthlySheet.month}_${printableMonthlySheet.year}`)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل PDF 📄</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadElementAsImage('printable-monthly-sheet', `كشف_تحضير_شهري_${soldier.militaryNumber}_${printableMonthlySheet.month}_${printableMonthlySheet.year}`)}
                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل صورة 🖼️</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareElementViaWhatsApp('printable-monthly-sheet', `كشف_تحضير_شهري_${soldier.militaryNumber}`)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>مشاركة واتساب 💬</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة مباشرة 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintableMonthlySheet(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  إغلاق ✕
                </button>
              </div>
            </div>

            {/* Document Printable Body */}
            <div id="printable-monthly-sheet" className="p-8 sm:p-10 bg-white text-slate-900 font-sans space-y-6 dir-rtl">
              
              {/* Document Header */}
              <PrintHeader 
                printSettings={printSettings}
                documentTitle="كشف التحضير والتواجد الشهري الموحد باليوم"
                documentSubtitle={`عن شهر: ${MONTHS_LIST.find(m => m.value === printableMonthlySheet.month)?.name} - لعام ${printableMonthlySheet.year}`}
                documentRef={`MON-ATT-${soldier.militaryNumber}`}
                unitOverride={soldierUnitName}
              />

              {/* Soldier Profile Summary Grid */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <span className="text-slate-500 block text-[10px]">الاسم الرباعي:</span>
                  <span className="text-slate-900 font-black text-sm">{soldier.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الرقم العسكري:</span>
                  <span className="text-slate-900 font-mono font-black text-sm">{soldier.militaryNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الرتبة العسكرية:</span>
                  <span className="text-slate-900 font-black text-sm">{soldier.rank}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الحالة الوظيفية:</span>
                  <span className="text-slate-900 font-black text-sm">{soldier.militaryStatus || (soldier as any).status}</span>
                </div>
              </div>

              {/* Monthly Stats Box */}
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold font-sans">
                <div className="border border-emerald-300 bg-emerald-50 p-2 rounded-lg text-emerald-950">
                  <span className="block text-[10px] text-emerald-800">حضور (ح)</span>
                  <span className="text-sm font-black">{monthlySheetData.presentCount} يوم</span>
                </div>
                <div className="border border-rose-300 bg-rose-50 p-2 rounded-lg text-rose-950">
                  <span className="block text-[10px] text-rose-800">غياب (غ)</span>
                  <span className="text-sm font-black">{monthlySheetData.absentCount} يوم</span>
                </div>
                <div className="border border-amber-300 bg-amber-50 p-2 rounded-lg text-amber-950">
                  <span className="block text-[10px] text-amber-800">إجازة (إ)</span>
                  <span className="text-sm font-black">{monthlySheetData.leaveCount} يوم</span>
                </div>
                <div className="border border-indigo-300 bg-indigo-50 p-2 rounded-lg text-indigo-950">
                  <span className="block text-[10px] text-indigo-800">مأمورية (م)</span>
                  <span className="text-sm font-black">{monthlySheetData.dutyCount} يوم</span>
                </div>
                <div className="border border-sky-300 bg-sky-50 p-2 rounded-lg text-sky-950">
                  <span className="block text-[10px] text-sky-800">مرضية/بعذر (ع)</span>
                  <span className="text-sm font-black">{monthlySheetData.sickCount} يوم</span>
                </div>
                <div className="border border-slate-300 bg-slate-100 p-2 rounded-lg text-slate-900">
                  <span className="block text-[10px] text-slate-700">غير محضر</span>
                  <span className="text-sm font-black">{monthlySheetData.unrecordedCount} يوم</span>
                </div>
              </div>

              {/* 31-Day Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2 text-center border-l border-slate-700 w-12">#</th>
                      <th className="p-2 border-l border-slate-700">اليوم والتاريخ</th>
                      <th className="p-2 text-center border-l border-slate-700 w-24">رمز الحضور</th>
                      <th className="p-2 border-l border-slate-700">الوصف والحالة التفصيلية</th>
                      <th className="p-2">ملاحظات واعتماد القوة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-white">
                    {monthlySheetData.list.map((item) => {
                      let codeText = '-';
                      let label = 'لم يتم تحضيره';
                      if (item.normCode === 'ح') { codeText = 'ح'; label = 'حاضر بالخدمة'; }
                      else if (item.normCode === 'غ') { codeText = 'غ'; label = 'غياب غير مبرر'; }
                      else if (item.normCode === 'إ') { codeText = 'إ'; label = 'إجازة رسمية معتمدة'; }
                      else if (item.normCode === 'م') { codeText = 'م'; label = 'في مأمورية عمل'; }
                      else if (item.normCode === 'ع') { codeText = 'ع'; label = 'إجازة مرضية / عذر طبي'; }

                      return (
                        <tr key={item.dateStr} className="border-b border-slate-200">
                          <td className="p-1.5 text-center font-mono font-bold border-l border-slate-200 bg-slate-50">{item.dayNum}</td>
                          <td className="p-1.5 font-bold border-l border-slate-200">
                            {item.dayName} <span className="font-mono text-[10px] text-slate-600">({item.dateStr})</span>
                          </td>
                          <td className="p-1.5 text-center font-black border-l border-slate-200">
                            <span className="inline-block px-2 py-0.5 border border-slate-800 rounded font-mono text-xs">
                              {codeText}
                            </span>
                          </td>
                          <td className="p-1.5 font-bold border-l border-slate-200 text-slate-900">{label}</td>
                          <td className="p-1.5 text-slate-400 text-[10px] italic">مستند رسمي معتمد</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Official Stamps */}
              <PrintFooter printSettings={printSettings} />

            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: BATCH DATE RANGE ATTENDANCE */}
      {isRangeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[120] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm">تحضير نطاق زمني محدد للفرد</span>
              </div>
              <button 
                onClick={() => setIsRangeModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold block">المنسوب المختار:</span>
                <span className="font-black text-slate-900 text-sm block">{soldier?.rank} / {soldier?.fullName}</span>
                <span className="text-slate-500 font-mono">الرقم العسكري: {soldier?.militaryNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">من تاريخ *</label>
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">إلى تاريخ *</label>
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">حالة التحضير المعتمدة للفترة *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'ح', label: 'حاضر 🟢' },
                    { code: 'م', label: 'مأمورية 🔵' },
                    { code: 'إ', label: 'إجازة 🟡' },
                    { code: 'ع', label: 'مرضية 🩺' },
                    { code: 'غ', label: 'غياب 🔴' },
                  ].map(s => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setRangeStatus(s.code)}
                      className={`p-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                        rangeStatus === s.code
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRangeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveDateRangeAttendance}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl cursor-pointer shadow-sm"
                >
                  حفظ وتطبيق التحضير 💾
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD DISCIPLINARY PENALTY */}
      {isAddPenaltyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[120] p-3 sm:p-4 font-sans print:hidden">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-right"
          >
            <div className="bg-rose-950 text-white p-4 font-bold text-xs flex justify-between items-center border-b border-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="font-extrabold text-sm">تسجيل إجراء أو جزاء انضباطي رسمي</span>
              </div>
              <button 
                onClick={() => setIsAddPenaltyModalOpen(false)}
                className="text-rose-300 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1">
                <span className="text-rose-700 font-bold block">الفرد الصادر بحقه الجزاء:</span>
                <span className="font-black text-rose-950 text-sm block">{soldier?.rank} / {soldier?.fullName}</span>
                <span className="text-rose-800 font-mono">الرقم العسكري: {soldier?.militaryNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">نوع الإجراء / الجزاء *</label>
                  <select
                    value={newPenaltyType}
                    onChange={(e) => setNewPenaltyType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    <option value="لفت نظر شفهي">لفت نظر شفهي</option>
                    <option value="تنبيه رسمي كتابي">تنبيه رسمي كتابي</option>
                    <option value="إنذار كتابي رسمي">إنذار كتابي رسمي</option>
                    <option value="خصم مستحقات">خصم مستحقات مالية</option>
                    <option value="حجز انضباطي">حجز انضباطي في الكتيبة</option>
                    <option value="تأخير ترقية">تأخير ترقية مستحقة</option>
                    <option value="إحالة للتحقيق العسكري">إحالة للتحقيق العسكري</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">الجهة الآمرة الصادرة *</label>
                  <input
                    type="text"
                    value={newPenaltyAuthority}
                    onChange={(e) => setNewPenaltyAuthority(e.target.value)}
                    placeholder="مثال: قائد الكتيبة / ركن القوة البشرية..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">تاريخ صدور القرار *</label>
                  <input
                    type="date"
                    value={newPenaltyDate}
                    onChange={(e) => setNewPenaltyDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">اسم الضابط الموثق</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name || 'الضابط المناوب'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">سبب ومخالفة الجزاء بالتفصيل *</label>
                <textarea
                  rows={3}
                  value={newPenaltyReason}
                  onChange={(e) => setNewPenaltyReason(e.target.value)}
                  placeholder="اكتب أسباب ومخالفة صدور القرار الانضباطي..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                ></textarea>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">ملاحظات والتزامات إضافية (اختياري)</label>
                <input
                  type="text"
                  value={newPenaltyNotes}
                  onChange={(e) => setNewPenaltyNotes(e.target.value)}
                  placeholder="مثال: تم أخذ تعهد خطي بعدم تكرار الغياب..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPenaltyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddPenalty}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm"
                >
                  حفظ وتسجيل الجزاء ⚖️
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Add Custom Timeline Event */}
      {isAddTimelineEventModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">إضافة حدث زمني جديد للمسيرة العسكرية</h4>
                  <p className="text-[11px] text-slate-400">توثيق قرار، ترقية، تنقل، دورة تدريبية، أو إجراء محوري بالملف</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddTimelineEventModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">فئة الإجراء العسكري *</label>
                  <select
                    value={newTlCategory}
                    onChange={(e) => setNewTlCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="training">📚 التدريب والدورات العسكرية</option>
                    <option value="promotions">⭐ الترقيات والرتب</option>
                    <option value="transfers">🔄 التنقلات وحركة الملاك</option>
                    <option value="postings">🎖️ التكليفات والمناصب</option>
                    <option value="discipline">🛡️ الانضباط والعقوبات</option>
                    <option value="honors">🏅 التكريم والأنواط</option>
                    <option value="leaves">📅 الإجازات والاستحقاقات</option>
                    <option value="medical">🚑 السجل الطبي والإصابات</option>
                    <option value="admin_orders">📄 القرارات الأوامر الإدارية</option>
                    <option value="milestones">⚠️ الأحداث المحورية والإنهاء</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">تاريخ وقوع الحدث *</label>
                  <input
                    type="date"
                    value={newTlDate}
                    onChange={(e) => setNewTlDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono font-bold text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">عنوان الحدث العسكري *</label>
                <input
                  type="text"
                  value={newTlTitle}
                  onChange={(e) => setNewTlTitle(e.target.value)}
                  placeholder="مثال: اجتياز دورة الصاعقة العسكرية المتقدمة بتقدير ممتاز..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">رقم الأمر / القرار الإداري</label>
                  <input
                    type="text"
                    value={newTlOrderNumber}
                    onChange={(e) => setNewTlOrderNumber(e.target.value)}
                    placeholder="مثال: أ.ع/1049/2026..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono font-bold text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">الجهة الآمرة الصادرة</label>
                  <input
                    type="text"
                    value={newTlAuthority}
                    onChange={(e) => setNewTlAuthority(e.target.value)}
                    placeholder="مثال: قيادة اللواء / ركن العمليات والتدرّب..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">تفاصيل البيان والأمر العسكري بالتفصيل *</label>
                <textarea
                  rows={3}
                  value={newTlDetails}
                  onChange={(e) => setNewTlDetails(e.target.value)}
                  placeholder="اكتب تفاصيل القرار أو الحدث العسكري ومضمونه بالكامل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-amber-500/60"
                ></textarea>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ملاحظات ومرفقات إضافية (اختياري)</label>
                <input
                  type="text"
                  value={newTlNotes}
                  onChange={(e) => setNewTlNotes(e.target.value)}
                  placeholder="مثال: تم إرفاق الشهادة الموثقة بملف الشؤون الإدارية..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTimelineEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomTimelineEvent}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm"
                >
                  حفظ وتسجيل الحدث 🟢
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: View Single Timeline Event Details */}
      {selectedTimelineDetail && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {TIMELINE_CATEGORY_MAP[selectedTimelineDetail.category]?.emoji || '🛡️'}
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-white">{selectedTimelineDetail.title}</h4>
                  <span className="text-[10px] text-amber-400 font-bold">
                    فئة: {selectedTimelineDetail.categoryLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTimelineDetail(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">تاريخ الحدث:</span>
                  <span className="font-mono font-black text-white text-sm block">{selectedTimelineDetail.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">رقم القرار / الأمر:</span>
                  <span className="font-mono font-black text-amber-400 text-sm block">
                    {selectedTimelineDetail.orderNumber || 'غير محدد'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">الجهة الصادرة الآمرة:</span>
                <span className="font-extrabold text-slate-200 block text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  {selectedTimelineDetail.authority || 'القيادة العامة'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">تفاصيل البيان والأمر العسكري:</span>
                <p className="font-bold text-slate-200 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedTimelineDetail.details}
                </p>
              </div>

              {selectedTimelineDetail.notes && (
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">ملاحظات ومرفقات:</span>
                  <p className="font-bold text-slate-300 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 italic">
                    {selectedTimelineDetail.notes}
                  </p>
                </div>
              )}

              {selectedTimelineDetail.issuerName && (
                <div className="text-[11px] text-slate-400 font-bold text-left pt-2 border-t border-slate-800">
                  توثيق بواسطة: <span className="text-slate-200 font-black">{selectedTimelineDetail.issuerName}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  {selectedTimelineDetail.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomTimelineEvent(selectedTimelineDetail.id.replace('tl_custom_', ''))}
                      className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl cursor-pointer border border-rose-800 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الحدث</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTimelineDetail(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintableTimelinePass({ events: [selectedTimelineDetail], soldier, unitName: soldierUnitName });
                      setSelectedTimelineDetail(null);
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة إفادة الحدث</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Printable Military Timeline Official Document View */}
      {printableTimelinePass && (
        <div className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto" dir="rtl">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl my-8 overflow-hidden">
            {/* Control Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm">معاينة طباعة السجل الزمني للمسيرة العسكرية</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadElementAsPdf('printable-military-timeline', `السجل_الزمني_${soldier?.militaryNumber}.pdf`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setPrintableTimelinePass(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div id="printable-military-timeline" className="p-8 space-y-6 font-sans bg-white text-slate-900 min-h-[800px]">
              {/* Document Official Header */}
              <PrintHeader 
                printSettings={printSettings}
                documentTitle="السجل الزمني والمسيرة العسكرية الشاملة للفرد"
                documentRef={`TL-${soldier?.militaryNumber}`}
                unitOverride={soldierUnitName}
              />

              {/* Soldier Info Summary Strip */}
              <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">اسم الفرد:</span>
                  <span className="font-black text-slate-950 text-sm block">{soldier?.rank} / {soldier?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">الرقم العسكري:</span>
                  <span className="font-mono font-black text-slate-900 text-sm block">{soldier?.militaryNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">الوحدة الحالية:</span>
                  <span className="font-extrabold text-slate-900 block">{soldierUnitName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">تاريخ الالتحاق بالخدمة:</span>
                  <span className="font-mono font-black text-slate-900 block">{soldier?.joinDate || 'غير محدد'}</span>
                </div>
              </div>

              {/* Printable Table of Timeline Events */}
              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-1">
                  سجل الأحداث والقرارات العسكرية الموثقة ({printableTimelinePass.events.length} حدث):
                </h5>

                <table className="w-full text-right border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 border-b border-slate-300 font-black">
                      <th className="p-2 border border-slate-300 w-24">التاريخ</th>
                      <th className="p-2 border border-slate-300 w-28">فئة الإجراء</th>
                      <th className="p-2 border border-slate-300">عنوان الحدث والتفاصيل</th>
                      <th className="p-2 border border-slate-300 w-28">رقم القرار</th>
                      <th className="p-2 border border-slate-300 w-32">الجهة الصادرة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printableTimelinePass.events.map((ev: any, index: number) => (
                      <tr key={ev.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">{ev.date}</td>
                        <td className="p-2 border border-slate-300 font-black text-slate-900">{ev.categoryLabel}</td>
                        <td className="p-2 border border-slate-300">
                          <strong className="block text-slate-950 font-black">{ev.title}</strong>
                          <span className="text-slate-700 block text-[11px] leading-relaxed mt-0.5">{ev.details}</span>
                          {ev.notes && <span className="text-slate-500 block text-[10px] italic mt-0.5">ملاحظة: {ev.notes}</span>}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">{ev.orderNumber || '-'}</td>
                        <td className="p-2 border border-slate-300 font-bold text-slate-800">{ev.authority || 'القيادة'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Signatures & Seal */}
              <PrintFooter printSettings={printSettings} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Military Custody (إضافة / تعديل عهدة عسكرية) */}
      {isCustodyModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans overflow-y-auto" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden my-6"
          >
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <PackageCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100">
                    {editingCustody ? 'تعديل بيانات العهدة العسكرية' : 'تسجيل عهدة عسكرية جديدة بالفرد'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-bold">
                    إثبات العهد والمهمات والأمانات المسلّمة للفرد: {soldier?.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustodyModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustodySubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Custody Type (نوع العهد) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">نوع العهدة العسكرية <span className="text-rose-400">*</span></label>
                  <select
                    value={custodyType}
                    onChange={(e) => setCustodyType(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="بندقية آلي">بندقية آلي (AK-47 / G3 / M16)</option>
                    <option value="مسدس شخصي">مسدس شخصي / ضابط</option>
                    <option value="جهاز اتصال لاسلكي">جهاز اتصال لاسلكي / إشارة</option>
                    <option value="سيارة / طقم عسكري">سيارة / طقم عسكري / مدرعة</option>
                    <option value="نظارة رؤية ليلية">نظارة رؤية ليلية / منظار</option>
                    <option value="درع واقي وخوذة">درع واقي وخوذة عسكرية</option>
                    <option value="أثاث ومستلزمات مكتبية">أثاث ومستلزمات مكتبية</option>
                    <option value="أمانات ومهمات شخصية">أمانات ومهمات شخصية</option>
                    <option value="أخرى">نوع آخر (حدد يدويًا)...</option>
                  </select>
                  {custodyType === 'أخرى' && (
                    <input
                      type="text"
                      placeholder="اكتب نوع العهدة بالتفصيل..."
                      value={custodyTypeCustom}
                      onChange={(e) => setCustodyTypeCustom(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500 mt-1"
                      required
                    />
                  )}
                </div>

                {/* 2. Custody Identifier / Number (رقم العهدة / الرقم المميز) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">
                    رقم العهدة / رقم السلاح أو اللوحة <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: AK-8842 / لوحة 3021 / SN-1092..."
                    value={custodyNumber}
                    onChange={(e) => setCustodyNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500">رقم السلاح أو الرقم المميز للسيارة/الجهاز</p>
                </div>

                {/* 3. Quantity (الكمية) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">الكمية المسلّمة <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={custodyQuantity}
                    onChange={(e) => setCustodyQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* 4. Issue Date (تاريخ التسلم / العهد) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">تاريخ التسلم (تاريخ العهد) <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    value={custodyIssueDate}
                    onChange={(e) => setCustodyIssueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* 5. Status (حالة العهد) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">حالة العهدة <span className="text-rose-400">*</span></label>
                  <select
                    value={custodyStatus}
                    onChange={(e) => setCustodyStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="نشط">نشط (بعهدة الفرد حالياً)</option>
                    <option value="منتهٍ">منتهٍ (تم إخلاء الطرف والإرجاع)</option>
                    <option value="قيد التدقيق">قيد التدقيق والمراجعة</option>
                    <option value="مفقود/متحفظ عليه">مفقود / متحفظ عليه</option>
                  </select>
                </div>

                {/* 6. Issuing Dept (اسم الجهة المسلمة) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">اسم الجهة المسلّمة <span className="text-rose-400">*</span></label>
                  <select
                    value={custodyIssuingDept}
                    onChange={(e) => setCustodyIssuingDept(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="التسليح العسكري">قسم التسليح العسكري</option>
                    <option value="الإمداد والتموين">ركن الإمداد والتموين</option>
                    <option value="الشؤون الفنية والقيادة">الشؤون الفنية والقيادة</option>
                    <option value="شؤون الأفراد">مكتب شؤون الأفراد</option>
                    <option value="ركن الإشارة والاتصالات">ركن الإشارة والاتصالات</option>
                    <option value="أخرى">قسم/جهة أخرى (حدد يدويًا)...</option>
                  </select>
                  {custodyIssuingDept === 'أخرى' && (
                    <input
                      type="text"
                      placeholder="اكتب اسم الجهة المسلمة..."
                      value={custodyIssuingDeptCustom}
                      onChange={(e) => setCustodyIssuingDeptCustom(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500 mt-1"
                      required
                    />
                  )}
                </div>

                {/* 7. Issuing Officer (اسم الموظف أو القائد المسلم) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">اسم الموظف / القائد المسلّم <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    placeholder="اسم الضابط أو المسؤول المباشر المسلّم للعهدة..."
                    value={custodyIssuingOfficer}
                    onChange={(e) => setCustodyIssuingOfficer(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* 8. Administrative Order Ref (مرجع الأمر الإداري) */}
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">مرجع الأمر الإداري (إن وجد)</label>
                  <input
                    type="text"
                    placeholder="مثال: أمر تسليح رقم 442/2026..."
                    value={custodyOrderRef}
                    onChange={(e) => setCustodyOrderRef(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 9. Description (وصف العهدة) */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-300 block">وصف العهدة والمواصفات الفنية</label>
                <textarea
                  rows={2}
                  placeholder="وصف حالة العهدة عند الاستلام، المواصفات، الملحقات المسلمة معها..."
                  value={custodyDescription}
                  onChange={(e) => setCustodyDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 10. Notes & Clearance Terms (ملاحظات وبنود إخلاء الطرف) */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-300 block">ملاحظات وبنود إخلاء الطرف</label>
                <textarea
                  rows={2}
                  placeholder="أدخل أي ملاحظات تتعلق بالعهد أو شروط التسليم والإرجاع بنهاية الخدمة..."
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* If Status is Returned/Completed */}
              {custodyStatus === 'منتهٍ' && (
                <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
                  <label className="font-extrabold text-sky-300 block">تاريخ الإرجاع وإخلاء الطرف الرسمية</label>
                  <input
                    type="date"
                    value={custodyReturnDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCustodyReturnDate(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-sky-200 font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* 11. Signatures Checkboxes (توقيع الفرد والمسؤول) */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                <label className="font-black text-amber-400 block">المصادقة والتواقيع الرسمية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                    <input
                      type="checkbox"
                      checked={custodyIndividualSigned}
                      onChange={(e) => setCustodyIndividualSigned(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>توقيع الفرد المستلم (تأكيد الاستلام والتعهد)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                    <input
                      type="checkbox"
                      checked={custodyOfficerSigned}
                      onChange={(e) => setCustodyOfficerSigned(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>توقيع المسؤول المسلّم (مصادقة الجهة)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustodyModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={custodySubmitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{custodySubmitting ? 'جاري الحفظ...' : 'حفظ وتوثيق العهدة'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Printable Custody Receipt / Clearance Document (سند وثيقة تسليم وإخلاء طرف عهدة عسكرية) */}
      {isPrintableCustodyOpen && printableCustody && (
        <div className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto" dir="rtl">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl my-8 overflow-hidden">
            {/* Control Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm">
                  {printableCustody.status === 'منتهٍ' ? 'وثيقة إخلاء طرف واستلام عهدة عسكرية' : 'سند تسليم وثبات عهدة عسكرية رسمية'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadElementAsPdf('printable-custody-document', `وثيقة_عهدة_${printableCustody.custodyNumber}.pdf`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => {
                    setIsPrintableCustodyOpen(false);
                    setPrintableCustody(null);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div id="printable-custody-document" className="p-8 space-y-6 font-sans bg-white text-slate-900 min-h-[750px]">
              <PrintHeader
                printSettings={printSettings}
                documentTitle={printableCustody.status === 'منتهٍ' ? 'إشعار إخلاء طرف واستلام عهدة عسكرية' : 'سند تسليم واستلام عهدة ومسؤولية عسكرية'}
                documentSubtitle={`الجهة المسلّمة: ${printableCustody.issuingDept}`}
                documentRef={printableCustody.orderRef || printableCustody.custodyNumber}
                documentDate={printableCustody.issueDate}
                unitOverride={soldierUnitName}
              />

              {/* Soldier Info Box */}
              <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <span className="text-slate-500 block text-[10px]">اسم الفرد العسكري:</span>
                  <span className="text-slate-950 font-extrabold">{soldier?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الرقم العسكري:</span>
                  <span className="text-slate-950 font-mono font-extrabold">{soldier?.militaryNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الرتبة:</span>
                  <span className="text-slate-950 font-extrabold">{soldier?.rank}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الوحدة العسكرية:</span>
                  <span className="text-slate-950 font-extrabold">{soldierUnitName}</span>
                </div>
              </div>

              {/* Custody Detailed Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-1">
                  بيانات وتفاصيل العهدة العسكرية الموثقة:
                </h5>

                <table className="w-full text-right border-collapse border-2 border-slate-900 text-xs">
                  <tbody>
                    <tr className="bg-slate-100">
                      <td className="p-2.5 border border-slate-900 font-black w-32 bg-slate-200">نوع العهدة:</td>
                      <td className="p-2.5 border border-slate-900 font-extrabold text-slate-950">{printableCustody.type}</td>
                      <td className="p-2.5 border border-slate-900 font-black w-32 bg-slate-200">رقم العهدة / المميز:</td>
                      <td className="p-2.5 border border-slate-900 font-mono font-extrabold text-slate-950">{printableCustody.custodyNumber}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">الكمية المسلّمة:</td>
                      <td className="p-2.5 border border-slate-900 font-mono font-extrabold">{printableCustody.quantity}</td>
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">حالة العهدة:</td>
                      <td className="p-2.5 border border-slate-900 font-extrabold">
                        {printableCustody.status === 'منتهٍ' ? 'تم إخلاء الطرف والإرجاع' : printableCustody.status}
                      </td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">تاريخ التسلم:</td>
                      <td className="p-2.5 border border-slate-900 font-mono font-extrabold">{printableCustody.issueDate}</td>
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">الجهة المسلّمة:</td>
                      <td className="p-2.5 border border-slate-900 font-extrabold">{printableCustody.issuingDept}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">المسؤول المُسلّم:</td>
                      <td className="p-2.5 border border-slate-900 font-extrabold">{printableCustody.issuingOfficer}</td>
                      <td className="p-2.5 border border-slate-900 font-black bg-slate-200">مرجع الأمر:</td>
                      <td className="p-2.5 border border-slate-900 font-mono font-extrabold">{printableCustody.orderRef || 'بدون أمر'}</td>
                    </tr>
                    {printableCustody.description && (
                      <tr className="bg-slate-100">
                        <td className="p-2.5 border border-slate-900 font-black bg-slate-200">الوصف والمواصفات:</td>
                        <td colSpan={3} className="p-2.5 border border-slate-900 leading-relaxed font-bold">
                          {printableCustody.description}
                        </td>
                      </tr>
                    )}
                    {printableCustody.notes && (
                      <tr>
                        <td className="p-2.5 border border-slate-900 font-black bg-slate-200">ملاحظات وشروط إخلاء الطرف:</td>
                        <td colSpan={3} className="p-2.5 border border-slate-900 italic font-bold">
                          {printableCustody.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Declaration Text */}
              <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl text-xs leading-relaxed text-slate-800 font-bold text-justify">
                {printableCustody.status === 'منتهٍ' ? (
                  <p>
                    تأكيد إخلاء طرف: تشهد القيادة والجهة المختصة بـ ({printableCustody.issuingDept}) بأن الفرد المذكور أعلاه قد قام بأسلوب رسمي بتسليم وإرجاع العهدة المبينة أعلاه، وتم إخلاء طرفه منها بالكامل وتسجيل الإخلاء بالمنظومة العسكرية.
                  </p>
                ) : (
                  <p>
                    تعهد واستلام: أقرّ أنا الفرد الموضح اسمه وبياناته بعاليه، بأنني تسلمت العهدة المبينة في هذه الوثيقة بحالة جيدة وصالحة للاستخدام، وأتحمل كامل المسؤولية القانونية والعسكرية للتحفظ عليها وصيانتها وإرجاعها فور طلب القيادة أو عند انتهاء تكليفي بموجب الأنظمة والتعليمات العسكرية النافذة.
                  </p>
                )}
              </div>

              {/* Official Signatures & Seal */}
              <PrintFooter printSettings={printSettings} />
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Custom Share Modal */}
      <WhatsAppShareModal
        soldier={soldier}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        units={units}
        attendanceRecords={attendanceHistory}
      />

      {/* Official Military ID Card Modal */}
      {isIdCardModalOpen && soldier && (
        <MilitaryIdCardModal
          soldier={soldier}
          unit={units.find(u => u.id === soldier.unitId)}
          onClose={() => setIsIdCardModalOpen(false)}
        />
      )}

      </div>
    </div>
  );
}
