import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, LogOut, Shield, Award, Calendar, FileText, 
  Phone, MapPin, Heart, BookOpen, Clock, Package, CheckCircle2, 
  AlertCircle, RefreshCw, Send, Plus, Check, X, Building, 
  ShieldAlert, Stethoscope, ChevronLeft, Lock, FileCheck2, UserCheck,
  Briefcase, Medal, AlertTriangle, FileSpreadsheet, Bell, BellRing, Sparkles,
  Upload, Paperclip, File, Download, CheckSquare, Camera, FileCheck,
  QrCode, CreditCard, DollarSign, ShieldCheck, Printer, Share2,
  Compass, PhoneCall, HelpCircle, Layers, ChevronRight, Eye, Star,
  Smartphone, Bookmark, Navigation, AlertOctagon, Activity, Hash, ExternalLink,
  XCircle, Filter, CalendarDays, Info, LayoutGrid, Grid3X3, Table, Sun, Moon
} from 'lucide-react';
import { Soldier, User as SystemUser, Unit, PrintSettings, SickLeave, MilitaryCustody, SoldierActionRequest } from '../types';
import { fetchWithRetry, safeJson } from '../lib/api';
import { triggerToast } from './ToastContainer';
import OfficialMemoSurveyModal from './OfficialMemoSurveyModal';
import AndroidExitToast, { AndroidExitConfirmModal } from './AndroidExitToast';

const TASK_INFO_MAP: Record<string, { label: string; desc: string; category: string }> = {
  't_phone': { 
    label: 'تحديث رقم الهاتف الخاص ورقم التواصل بالواتساب', 
    desc: 'يتوجب تزويد الإدارة برقم الهاتف المباشر الفعال لاستقبال التنبيهات والأوامر الرسمية.',
    category: 'بيانات التواصل'
  },
  't_emergency': { 
    label: 'إدخال بيانات أقرب قريب للتواصل في حالات الطوارئ', 
    desc: 'يرجى تسجيل اسم وقرابة ورقم هاتف الشخص المعني بالطوارئ.',
    category: 'الطوارئ'
  },
  't_photo': { 
    label: 'إرفاق الصورة الشخصية الرسمية بالزي العسكري', 
    desc: 'يرجى رفع صورة شخصية واضحة بخلفية بيضاء وبالزي العسكري الرسمي.',
    category: 'الهوية العسكرية'
  },
  't_address': { 
    label: 'تأكيد العنوان الوطني والسكن الحالي التفصيلي', 
    desc: 'تحديد موقع وسكن الفرد الفعلي والمنطقة والحي.',
    category: 'العنوان'
  },
  't_medical': { 
    label: 'تحديث فصيلة الدم والبيانات والتقارير الطبية', 
    desc: 'تزويد السجلات الطبية بالفحوصات وفصيلة الدم المؤكدة.',
    category: 'الطبابة'
  },
  't_custody': { 
    label: 'معاينة وتأكيد كشف العهد العسكرية والأمانات', 
    desc: 'مراجعة كافة العهد المسلمة والتأكيد عليها رسمياً.',
    category: 'العهد العسكرية'
  }
};

const MONTHS_OPTIONS = [
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

const YEARS_OPTIONS = ['2026', '2025', '2024', '2027'];

const getAttendanceStatusDetails = (statusCode: string | null | undefined) => {
  if (!statusCode) return { code: 'unrecorded', label: 'لم يُسجل تحضير', bg: 'bg-slate-950/80 border-slate-800 text-slate-400', badge: 'bg-slate-800/80 text-slate-400 border-slate-700', icon: Clock };
  const c = String(statusCode).trim();
  if (c === 'ح' || c === 'حاضر' || c.startsWith('حاضر')) {
    return { code: 'ح', label: 'حاضر بالدوام', bg: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 };
  }
  if (c === 'غ' || c === 'غائب' || c.startsWith('غائب')) {
    return { code: 'غ', label: 'غائب', bg: 'bg-rose-950/20 border-rose-500/30 text-rose-300', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: XCircle };
  }
  if (c === 'إ' || c === 'إجازة' || c.startsWith('إجاز')) {
    return { code: 'إ', label: 'إجازة رسمية', bg: 'bg-blue-950/20 border-blue-500/30 text-blue-300', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: Calendar };
  }
  if (c === 'م' || c === 'مرضية' || c === 'راحة' || c === 'مستشفى' || c === 'طبي' || c === 'ط') {
    return { code: 'م', label: 'راحة طبية / مستشفى', bg: 'bg-purple-950/20 border-purple-500/30 text-purple-300', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: Stethoscope };
  }
  if (c === 'ع' || c === 'مهمة' || c === 'بعذر' || (typeof c === 'string' && c.includes('عذر')) || (typeof c === 'string' && c.includes('انتداب'))) {
    return { code: 'ع', label: 'مهمة / عمل ميداني', bg: 'bg-amber-950/20 border-amber-500/30 text-amber-300', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Briefcase };
  }
  if (c === 'ن' || c === 'نوبة' || c === 'خفارة' || (typeof c === 'string' && c.includes('نصف'))) {
    return { code: 'ن', label: 'نوبة / خفارة', bg: 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: Shield };
  }
  return { code: c, label: c, bg: 'bg-slate-900 border-slate-800 text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-700', icon: Activity };
};

interface SoldierPortalProps {
  soldier: Soldier;
  currentUser: SystemUser;
  units: Unit[];
  printSettings?: PrintSettings;
  onLogout: () => void;
  onSoldierUpdated?: () => void;
}

export default function SoldierPortal({
  soldier,
  currentUser,
  units,
  printSettings,
  onLogout,
  onSoldierUpdated
}: SoldierPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'digital_id' | 'bio' | 'duty' | 'attendance' | 'financial' | 'leaves' | 'custody' | 'requests'>('overview');
  const [sickLeaves, setSickLeaves] = useState<SickLeave[]>([]);
  const [custodies, setCustodies] = useState<MilitaryCustody[]>([]);
  const [actionRequests, setActionRequests] = useState<SoldierActionRequest[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light') {
      setTheme('light');
      document.body.classList.add('light-mode');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  // Attendance Date & Filter State
  const todayNow = new Date();
  const [attYear, setAttYear] = useState<string>(String(todayNow.getFullYear()));
  const [attMonth, setAttMonth] = useState<string>(String(todayNow.getMonth() + 1).padStart(2, '0'));
  const [attFilter, setAttFilter] = useState<'all' | 'present' | 'absent' | 'leave' | 'duty'>('all');
  const [attViewMode, setAttViewMode] = useState<'grid' | 'excel' | 'table'>('grid');
  const [selectedDayDetail, setSelectedDayDetail] = useState<any | null>(null);
  
  // Digital ID Card State
  const [isIdCardFlipped, setIsIdCardFlipped] = useState(false);
  const [showIdQrModal, setShowIdQrModal] = useState(false);

  // Duty Roster State
  const [dutyCheckedIn, setDutyCheckedIn] = useState(false);
  const [dutyCheckInTime, setDutyCheckInTime] = useState<string | null>(null);

  // Salary Certificate Modal State
  const [isSalaryCertModalOpen, setIsSalaryCertModalOpen] = useState(false);
  const [salaryCertTarget, setSalaryCertTarget] = useState('إلى من يهمه الأمر (البنوك والجهات الحكومية)');
  const [salaryCertNotes, setSalaryCertNotes] = useState('');
  const [salaryCertGeneratedDoc, setSalaryCertGeneratedDoc] = useState<any | null>(null);

  // Course Request Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCenter, setCourseCenter] = useState('');
  const [courseDate, setCourseDate] = useState('');
  const [courseDocName, setCourseDocName] = useState('');
  const [courseDocBase64, setCourseDocBase64] = useState('');
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // Submit request form modal
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [selectedMemoForFilling, setSelectedMemoForFilling] = useState<SoldierActionRequest | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [reqType, setReqType] = useState<'leave_request' | 'update_profile' | 'required_task' | 'general'>('leave_request');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');

  // Active Direct Task Execution Modal State
  const [activeTaskModal, setActiveTaskModal] = useState<string | null>(null);
  const [isUnifiedDirectiveModalOpen, setIsUnifiedDirectiveModalOpen] = useState(false);
  const [isNotificationsMarkedRead, setIsNotificationsMarkedRead] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Form states for direct task completion
  const [taskPhone, setTaskPhone] = useState(soldier.phoneNumber || '');
  const [taskWhatsapp, setTaskWhatsapp] = useState('');
  const [taskEmergencyName, setTaskEmergencyName] = useState(soldier.emergencyContact || '');
  const [taskEmergencyRelation, setTaskEmergencyRelation] = useState('أب');
  const [taskEmergencyPhone, setTaskEmergencyPhone] = useState('');
  const [taskPhotoUrl, setTaskPhotoUrl] = useState(soldier.photoUrl || '');
  const [taskAddressCity, setTaskAddressCity] = useState(soldier.address?.split('-')?.[0]?.trim() || soldier.address || '');
  const [taskAddressDetails, setTaskAddressDetails] = useState(soldier.address?.split('-')?.[1]?.trim() || '');
  const [taskBloodType, setTaskBloodType] = useState(soldier.bloodType || 'O+');
  const [taskMedicalNotes, setTaskMedicalNotes] = useState(soldier.medicalHistory || '');
  const [taskDocFileName, setTaskDocFileName] = useState('');
  const [taskDocBase64, setTaskDocBase64] = useState('');
  const [taskInstructionReply, setTaskInstructionReply] = useState('');
  const [confirmedCustodies, setConfirmedCustodies] = useState<Record<string, boolean>>({});

  // Attendance Synchronization & Inquiry State
  const [isAttInquiryModalOpen, setIsAttInquiryModalOpen] = useState(false);
  const [attInquiryDate, setAttInquiryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attInquiryReason, setAttInquiryReason] = useState('');
  const [isRefreshingAtt, setIsRefreshingAtt] = useState(false);

  // Android Back Navigation for Soldier Portal
  const [showExitToast, setShowExitToast] = useState(false);
  const [isExitConfirmModalOpen, setIsExitConfirmModalOpen] = useState(false);
  const lastPortalBackPressRef = React.useRef<number>(0);
  const exitToastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ tab: 'overview', root: true }, '', window.location.href);
    }

    const hasOpenModal = 
      isSalaryCertModalOpen ||
      isCourseModalOpen ||
      isRequestModalOpen ||
      isMemoModalOpen ||
      isNotificationsOpen ||
      isLogoutConfirmOpen ||
      activeTaskModal !== null ||
      isUnifiedDirectiveModalOpen ||
      isAttInquiryModalOpen ||
      showIdQrModal ||
      selectedDayDetail !== null ||
      activeTab !== 'overview';

    if (hasOpenModal) {
      window.history.pushState({ tab: activeTab, ts: Date.now() }, '', window.location.href);
    }
  }, [
    activeTab,
    isSalaryCertModalOpen,
    isCourseModalOpen,
    isRequestModalOpen,
    isMemoModalOpen,
    isNotificationsOpen,
    isLogoutConfirmOpen,
    activeTaskModal,
    isUnifiedDirectiveModalOpen,
    isAttInquiryModalOpen,
    showIdQrModal,
    selectedDayDetail
  ]);

  useEffect(() => {
    const handlePortalPopState = () => {
      // 1. Close open modals first
      if (showIdQrModal) { setShowIdQrModal(false); return; }
      if (selectedDayDetail) { setSelectedDayDetail(null); return; }
      if (activeTaskModal) { setActiveTaskModal(null); return; }
      if (isUnifiedDirectiveModalOpen) { setIsUnifiedDirectiveModalOpen(false); return; }
      if (isAttInquiryModalOpen) { setIsAttInquiryModalOpen(false); return; }
      if (isSalaryCertModalOpen) { setIsSalaryCertModalOpen(false); return; }
      if (isCourseModalOpen) { setIsCourseModalOpen(false); return; }
      if (isRequestModalOpen) { setIsRequestModalOpen(false); return; }
      if (isMemoModalOpen) { setIsMemoModalOpen(false); return; }
      if (isNotificationsOpen) { setIsNotificationsOpen(false); return; }
      if (isLogoutConfirmOpen) { setIsLogoutConfirmOpen(false); return; }

      // 2. Return to overview tab if on another tab
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        return;
      }

      // 3. If on overview tab with no modals: double-back to exit
      const now = Date.now();
      const diff = now - lastPortalBackPressRef.current;
      if (diff < 2500 && diff > 0) {
        setShowExitToast(false);
        setIsExitConfirmModalOpen(true);
      } else {
        window.history.pushState({ tab: 'overview', root: true }, '', window.location.href);
        lastPortalBackPressRef.current = now;
        setShowExitToast(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
          lastPortalBackPressRef.current = 0;
        }, 2500);
      }
    };

    window.addEventListener('popstate', handlePortalPopState);
    return () => {
      window.removeEventListener('popstate', handlePortalPopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [
    activeTab,
    showIdQrModal,
    selectedDayDetail,
    activeTaskModal,
    isUnifiedDirectiveModalOpen,
    isAttInquiryModalOpen,
    isSalaryCertModalOpen,
    isCourseModalOpen,
    isRequestModalOpen,
    isMemoModalOpen,
    isNotificationsOpen,
    isLogoutConfirmOpen
  ]);

  const handleRefreshAttendance = async () => {
    setIsRefreshingAtt(true);
    try {
      const attRes = await fetchWithRetry(`/api/soldiers/${soldier.id}/attendance-history`);
      if (attRes.ok) {
        const attData = await safeJson(attRes, []);
        setAttendanceList(Array.isArray(attData) ? attData : []);
        triggerToast('تم تحديث وتزامن بيانات التحضير مع السجلات المركزية', 'success');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshingAtt(false), 500);
    }
  };

  const handleSubmitAttInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attInquiryReason.trim()) return;

    setSubmittingReq(true);
    try {
      const res = await fetchWithRetry('/api/action-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldierId: soldier.id,
          soldierName: soldier.fullName,
          soldierRank: soldier.rank,
          militaryNumber: soldier.militaryNumber,
          unitId: soldier.unitId,
          requestType: 'attendance_inquiry',
          title: `استفسار/اعتراض على تحضير يوم ${attInquiryDate}`,
          description: `التاريخ المعني: ${attInquiryDate}\nتفاصيل الإفادة/الاعتراض: ${attInquiryReason}`
        })
      });

      if (res.ok) {
        triggerToast('تم إرسال الإفادة والاستفسار بخصوص التحضير إلى إدارة السجلات بنجاح', 'success');
        setIsAttInquiryModalOpen(false);
        setAttInquiryReason('');
        loadSoldierData();
      }
    } catch (err) {
      console.error(err);
      triggerToast('حدث خطأ أثناء إرسال الإفادة', 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  useEffect(() => {
    if (soldier) {
      setTaskPhone(soldier.phoneNumber || '');
      setTaskEmergencyName(soldier.emergencyContact || '');
      setTaskPhotoUrl(soldier.photoUrl || '');
      setTaskAddressCity(soldier.address || '');
      setTaskBloodType(soldier.bloodType || 'O+');
      setTaskMedicalNotes(soldier.medicalHistory || '');
    }
  }, [soldier]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPhoto = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('حجم الملف كبير جداً (أقصى حد مسموح به هو 5 ميجابايت)', 'warning');
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      if (isPhoto) {
        setTaskPhotoUrl(base64);
        triggerToast('تم تحميل وترشيح الصورة الشخصية بنجاح 📷', 'success');
      } else {
        setTaskDocFileName(file.name);
        setTaskDocBase64(base64);
        triggerToast(`تم تحميل المرفق (${file.name}) بنجاح 📎`, 'success');
      }
    } catch (err) {
      triggerToast('فشل تحميل الملف المرفق', 'error');
    }
  };

  const handleOpenTaskModal = (taskId: string) => {
    setIsNotificationsOpen(false);
    setActiveTaskModal(taskId);

    if (taskId === 't_custody') {
      const initObj: Record<string, boolean> = {};
      custodies.forEach(c => {
        initObj[c.id] = true;
      });
      setConfirmedCustodies(initObj);
    }
  };

  const handleSaveTaskExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskModal) return;

    setIsSubmittingTask(true);
    try {
      let updatedSoldierFields: Partial<Soldier> = {};
      let taskTitle = '';
      let taskDescription = '';
      let proposedDataObj: any = {};

      if (activeTaskModal === 't_phone') {
        const fullPhone = taskWhatsapp ? `${taskPhone} (واتساب: ${taskWhatsapp})` : taskPhone;
        updatedSoldierFields = { phoneNumber: fullPhone };
        taskTitle = 'تحديث بيانات الجوال والتواصل المباشر';
        taskDescription = `قام الفرد بتحديث رقم الهاتف المباشر إلى: ${fullPhone}`;
        proposedDataObj = { phoneNumber: fullPhone };
      } 
      else if (activeTaskModal === 't_emergency') {
        const emContactStr = `${taskEmergencyName} (${taskEmergencyRelation}) - هاتف: ${taskEmergencyPhone}`;
        updatedSoldierFields = { emergencyContact: emContactStr };
        taskTitle = 'تحديث بيانات الاتصال بالطوارئ';
        taskDescription = `قام الفرد بتسجيل بيانات الطوارئ: ${emContactStr}`;
        proposedDataObj = { emergencyContact: emContactStr };
      } 
      else if (activeTaskModal === 't_photo') {
        if (!taskPhotoUrl) {
          triggerToast('يرجى اختيار وإرفاق الصورة الشخصية الرسمية أولاً', 'warning');
          setIsSubmittingTask(false);
          return;
        }
        updatedSoldierFields = { photoUrl: taskPhotoUrl };
        taskTitle = 'تحديث الصورة الشخصية العسكرية الرسمية';
        taskDescription = 'قام الفرد برفع واعتماد صورة شخصية بالزي العسكري في ملفه الشخصي';
        proposedDataObj = { photoUrl: taskPhotoUrl };
      } 
      else if (activeTaskModal === 't_address') {
        const fullAddress = taskAddressDetails ? `${taskAddressCity} - ${taskAddressDetails}` : taskAddressCity;
        updatedSoldierFields = { address: fullAddress };
        taskTitle = 'تحديث وتأكيد العنوان الوطني والسكن';
        taskDescription = `العنوان المعتمد حالياً: ${fullAddress}`;
        proposedDataObj = { address: fullAddress };
      } 
      else if (activeTaskModal === 't_medical') {
        updatedSoldierFields = { 
          bloodType: taskBloodType,
          medicalHistory: taskMedicalNotes ? taskMedicalNotes : soldier.medicalHistory
        };

        if (taskDocBase64) {
          let currentAttachments: any[] = [];
          try {
            if (soldier.attachments) currentAttachments = JSON.parse(soldier.attachments);
          } catch (e) {}
          currentAttachments.push({
            id: `doc_${Date.now()}`,
            name: taskDocFileName || 'تقرير / فحص طبي رسمي',
            data: taskDocBase64,
            uploadedAt: new Date().toISOString()
          });
          updatedSoldierFields.attachments = JSON.stringify(currentAttachments);
        }

        taskTitle = 'تحديث البيانات وفصيلة الدم والتقارير الطبية';
        taskDescription = `فصيلة الدم: ${taskBloodType}${taskMedicalNotes ? ` - ملاحظات: ${taskMedicalNotes}` : ''}${taskDocFileName ? ` - مرفق: ${taskDocFileName}` : ''}`;
        proposedDataObj = updatedSoldierFields;
      } 
      else if (activeTaskModal === 't_custody') {
        taskTitle = 'تأكيد واستلام العهد العسكرية والأمانات';
        taskDescription = `قام الفرد بمعاينة وإقرار استلام جميع العهد العسكرية المقيدة بملفه عدد (${custodies.length})`;
      } 
      else if (activeTaskModal === 'custom_instruction') {
        let currentAttachments: any[] = [];
        try {
          if (soldier.attachments) currentAttachments = JSON.parse(soldier.attachments);
        } catch (e) {}

        if (taskDocBase64) {
          currentAttachments.push({
            id: `doc_${Date.now()}`,
            name: taskDocFileName || 'وثيقة ومستند مرفق بناءً على توجيه القيادة',
            data: taskDocBase64,
            uploadedAt: new Date().toISOString()
          });
          updatedSoldierFields.attachments = JSON.stringify(currentAttachments);
        }

        taskTitle = 'تنفيذ التوجيه الإداري المباشر الصادر من القيادة';
        taskDescription = `إفادة الفرد: ${taskInstructionReply || 'تم تنفيذ المطلوب بنجاح'}${taskDocFileName ? ` (مرفق: ${taskDocFileName})` : ''}`;
      }

      // 1. Direct update to soldier record if fields updated
      if (Object.keys(updatedSoldierFields).length > 0) {
        await fetchWithRetry(`/api/soldiers/${soldier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...soldier,
            ...updatedSoldierFields
          })
        });
      }

      // 2. Submit action request for command audit
      await fetchWithRetry('/api/action-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldierId: soldier.id,
          soldierName: soldier.fullName,
          soldierRank: soldier.rank,
          militaryNumber: soldier.militaryNumber,
          unitId: soldier.unitId,
          requestType: 'required_task',
          title: taskTitle,
          description: taskDescription,
          proposedData: proposedDataObj,
          status: 'approved'
        })
      });

      // 3. Remove completed task from soldier's assignedTasks
      const remainingTasks = parsedAssignedTasksList.filter(t => t !== activeTaskModal);
      const newInstructions = activeTaskModal === 'custom_instruction' ? '' : managerInstructions;

      await fetchWithRetry(`/api/soldiers/${soldier.id}/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasAccount: soldier.hasAccount,
          username: soldier.accountUsername || soldier.militaryNumber,
          password: soldier.accountPassword || '123456',
          allowProfileEdit: soldier.allowProfileEdit !== false,
          assignedTasks: {
            tasks: remainingTasks,
            instructions: newInstructions
          }
        })
      });

      triggerToast('تم تنفيذ الإجراء المطلوب وتحديث بياناتك بملف الخدمة بنجاح 🟢', 'success');
      setActiveTaskModal(null);
      setTaskDocFileName('');
      setTaskDocBase64('');
      setTaskInstructionReply('');
      
      loadSoldierData();
      if (onSoldierUpdated) onSoldierUpdated();

    } catch (err: any) {
      console.error("Failed to save task execution:", err);
      triggerToast('حدث خطأ أثناء حفظ البيانات: ' + err.message, 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Handler to submit and save ALL items in unified directive order window at once
  const handleSaveUnifiedDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTask(true);

    try {
      const updatedSoldierFields: Record<string, any> = {};
      const completedItemsSummary: string[] = [];

      // 1. Phone
      if (taskPhone && taskPhone !== soldier.phoneNumber) {
        const fullPhone = taskWhatsapp ? `${taskPhone} (واتساب: ${taskWhatsapp})` : taskPhone;
        updatedSoldierFields.phoneNumber = fullPhone;
        completedItemsSummary.push(`رقم الجوال: ${fullPhone}`);
      }

      // 2. Emergency Contact
      if (taskEmergencyName) {
        const emContactStr = `${taskEmergencyName} (${taskEmergencyRelation}) - هاتف: ${taskEmergencyPhone || 'غير مدون'}`;
        updatedSoldierFields.emergencyContact = emContactStr;
        completedItemsSummary.push(`جهة الطوارئ: ${emContactStr}`);
      }

      // 3. Photo
      if (taskPhotoUrl && taskPhotoUrl !== soldier.photoUrl) {
        updatedSoldierFields.photoUrl = taskPhotoUrl;
        completedItemsSummary.push('الصورة الشخصية الرسمية');
      }

      // 4. Address
      if (taskAddressCity) {
        const fullAddress = taskAddressDetails ? `${taskAddressCity} - ${taskAddressDetails}` : taskAddressCity;
        updatedSoldierFields.address = fullAddress;
        completedItemsSummary.push(`العنوان: ${fullAddress}`);
      }

      // 5. Blood type & medical
      if (taskBloodType) {
        updatedSoldierFields.bloodType = taskBloodType;
        if (taskMedicalNotes) updatedSoldierFields.medicalHistory = taskMedicalNotes;
        completedItemsSummary.push(`فصيلة الدم: ${taskBloodType}`);
      }

      // 6. Attachments
      if (taskDocBase64) {
        let currentAttachments: any[] = [];
        try {
          if (soldier.attachments) currentAttachments = JSON.parse(soldier.attachments);
        } catch (e) {}
        currentAttachments.push({
          id: `doc_${Date.now()}`,
          name: taskDocFileName || 'مستند مرفق بناءً على الأمر الإداري',
          data: taskDocBase64,
          uploadedAt: new Date().toISOString()
        });
        updatedSoldierFields.attachments = JSON.stringify(currentAttachments);
        completedItemsSummary.push(`مرفق: ${taskDocFileName || 'مستند رسمي'}`);
      }

      // 1. Direct update to soldier record if fields updated
      if (Object.keys(updatedSoldierFields).length > 0) {
        await fetchWithRetry(`/api/soldiers/${soldier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...soldier,
            ...updatedSoldierFields
          })
        });
      }

      // 2. Submit action request for command audit
      await fetchWithRetry('/api/action-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldierId: soldier.id,
          soldierName: soldier.fullName,
          soldierRank: soldier.rank,
          militaryNumber: soldier.militaryNumber,
          unitId: soldier.unitId,
          requestType: 'required_task',
          title: 'استكمال وتنفيذ كافة متطلبات الأمر الإداري الصادر من القيادة',
          description: `قام الفرد بالاطلاع وتنفيذ كامل متطلبات الأمر الإداري. الإفادة: ${taskInstructionReply || 'تم الاستكمال بالكامل'}. الإجراءات المنجزة: ${completedItemsSummary.join(' | ') || 'جميع البيانات المحددة'}`,
          proposedData: updatedSoldierFields,
          status: 'approved'
        })
      });

      // 3. Clear ALL assigned tasks from soldier's account
      await fetchWithRetry(`/api/soldiers/${soldier.id}/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasAccount: soldier.hasAccount,
          username: soldier.accountUsername || soldier.militaryNumber,
          password: soldier.accountPassword || '123456',
          allowProfileEdit: soldier.allowProfileEdit !== false,
          assignedTasks: {
            tasks: [],
            instructions: ''
          }
        })
      });

      triggerToast('تم اعتماد واستكمال جميع متطلبات الأمر الإداري وإرسالها للقيادة بنجاح 🟢', 'success');
      setIsUnifiedDirectiveModalOpen(false);
      setTaskDocFileName('');
      setTaskDocBase64('');
      setTaskInstructionReply('');
      
      loadSoldierData();
      if (onSoldierUpdated) onSoldierUpdated();

    } catch (err: any) {
      console.error("Failed to save unified directive execution:", err);
      triggerToast('حدث خطأ أثناء حفظ التوجيه: ' + err.message, 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const unitName = units.find(u => u.id === soldier.unitId)?.name || soldier.battalion || 'الكتيبة الرئيسية';

  // Parse assigned tasks & instructions from manager
  let parsedAssignedTasksList: string[] = [];
  let managerInstructions = '';

  if (soldier.assignedTasks) {
    try {
      const parsed = JSON.parse(soldier.assignedTasks);
      if (Array.isArray(parsed.tasks)) parsedAssignedTasksList = parsed.tasks;
      if (parsed.instructions) managerInstructions = parsed.instructions;
    } catch (e) {
      if (typeof soldier.assignedTasks === 'string') {
        managerInstructions = soldier.assignedTasks;
      }
    }
  }

  // Strictly filter notifications meant for THIS individual soldier only
  const soldierNotifications = notificationsList.filter(n => {
    if (!n) return false;
    if (n.soldierId && String(n.soldierId) === String(soldier.id)) return true;
    if (n.targetSoldierId && String(n.targetSoldierId) === String(soldier.id)) return true;
    if (n.militaryNumber && String(n.militaryNumber) === String(soldier.militaryNumber)) return true;
    if (n.message && ((soldier.militaryNumber && n.message.includes(String(soldier.militaryNumber))) || (soldier.fullName && n.message.includes(String(soldier.fullName))))) return true;
    return false;
  });

  const reviewedRequests = actionRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
  const requiredTasksCount = parsedAssignedTasksList.length + (managerInstructions ? 1 : 0);
  const directiveOrdersCount = requiredTasksCount > 0 ? 1 : 0;
  const unreadNotifsCount = isNotificationsMarkedRead ? 0 : soldierNotifications.filter(n => !n.isRead).length;
  const totalAlertsCount = isNotificationsMarkedRead 
    ? 0 
    : (directiveOrdersCount + reviewedRequests.length + unreadNotifsCount);

  const handleStartTaskProcedure = (taskLabel: string, taskDesc?: string) => {
    setIsNotificationsOpen(false);
    setReqType('update_profile');
    setReqTitle(taskLabel);
    setReqDesc(taskDesc || `إشعار تنفيذ إجراء مطلوب من المدير: ${taskLabel}`);
    setIsRequestModalOpen(true);
  };

  // Fetch soldier specific records
  const loadSoldierData = async () => {
    setLoadingData(true);
    try {
      const [leavesRes, custodiesRes, requestsRes, notifsRes, attRes] = await Promise.all([
        fetchWithRetry(`/api/sick-leaves?soldierId=${soldier.id}`),
        fetchWithRetry(`/api/custodies?soldierId=${soldier.id}`),
        fetchWithRetry(`/api/action-requests?soldierId=${soldier.id}`),
        fetchWithRetry(`/api/notifications`),
        fetchWithRetry(`/api/soldiers/${soldier.id}/attendance-history`)
      ]);

      if (leavesRes.ok) {
        const data = await safeJson(leavesRes, []);
        setSickLeaves(Array.isArray(data) ? data : []);
      }
      if (custodiesRes.ok) {
        const data = await safeJson(custodiesRes, []);
        setCustodies(Array.isArray(data) ? data : []);
      }
      if (requestsRes.ok) {
        const data = await safeJson(requestsRes, []);
        setActionRequests(Array.isArray(data) ? data : []);
      }
      if (notifsRes.ok) {
        const notifsData = await safeJson(notifsRes, []);
        setNotificationsList(Array.isArray(notifsData) ? notifsData : []);
      }
      if (attRes.ok) {
        const attData = await safeJson(attRes, []);
        setAttendanceList(Array.isArray(attData) ? attData : []);
      }
    } catch (err) {
      console.error("Error loading soldier portal data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (soldier?.id) {
      loadSoldierData();
      // Periodically refresh data to receive live requests and tasks from manager
      const timer = setInterval(() => {
        loadSoldierData();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [soldier?.id]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDesc.trim()) return;

    setSubmittingReq(true);
    setReqSuccessMsg('');
    try {
      const res = await fetchWithRetry('/api/action-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldierId: soldier.id,
          soldierName: soldier.fullName,
          soldierRank: soldier.rank,
          militaryNumber: soldier.militaryNumber,
          unitId: soldier.unitId,
          requestType: reqType,
          title: reqTitle,
          description: reqDesc
        })
      });

      if (res.ok) {
        setReqSuccessMsg('تم تقديم الطلب بنجاح وإرساله للقيادة والمتابعة');
        setReqTitle('');
        setReqDesc('');
        setTimeout(() => {
          setIsRequestModalOpen(false);
          setReqSuccessMsg('');
        }, 1500);
        loadSoldierData();
      }
    } catch (err) {
      console.error("Failed to submit request:", err);
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans dir-rtl flex flex-col antialiased">
      
      {/* --- STANDALONE HEADER BAR --- */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 shadow-xl backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Right: Emblem & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-amber-300/40">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">بوابة الخدمة الذاتية للفرد</h1>
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  متصل الآن
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold truncate">
                {unitName} • القيادة العامة
              </p>
            </div>
          </div>

          {/* Left: Soldier Quick Identity, Theme Toggle, Notification & LOGOUT BUTTON */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2.5 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {soldier.rank}
              </span>
              <span className="text-xs font-bold text-slate-200">{soldier.fullName}</span>
              <span className="text-[11px] font-mono text-emerald-400 border-r border-slate-800 pr-2 mr-1">
                #{soldier.militaryNumber}
              </span>
            </div>

            {/* THEME TOGGLE BUTTON (DARK / LIGHT MODE) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all cursor-pointer border flex items-center justify-center shadow-lg active:scale-95 group ${
                theme === 'light'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300/80'
                  : 'bg-slate-950 hover:bg-slate-800 text-amber-400 border-slate-800 hover:border-amber-500/50'
              }`}
              title={theme === 'dark' ? 'التحويل إلى الوضع النهاري (الفاتح)' : 'التحويل إلى الوضع المظلم (الليلي)'}
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
              ) : (
                <Sun className="w-5 h-5 text-amber-600 group-hover:rotate-45 transition-transform" />
              )}
            </button>

            {/* NOTIFICATION BELL BUTTON */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2.5 bg-slate-950 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer border border-slate-800 flex items-center justify-center shadow-lg hover:border-amber-500/50 group"
              title="تنبيهات الفرد والمهام المطلوبة من القيادة"
            >
              <Bell className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950 shadow-lg shadow-rose-950">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {/* DIRECT LOGOUT BUTTON */}
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-950/50 border border-rose-400/50 hover:scale-[1.02]"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* --- HERO SOLDIER BANNER (يظهر فقط في قسم النظرة العامة) --- */}
      {activeTab === 'overview' && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/60 px-4 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-right w-full md:w-auto">
              {/* Avatar */}
              <div className="relative">
                {soldier.photoUrl ? (
                  <img 
                    src={soldier.photoUrl} 
                    alt={soldier.fullName} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl shadow-slate-950"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 shadow-xl">
                    <UserIcon className="w-10 h-10 text-slate-500" />
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-md ${
                  soldier.militaryStatus === 'إجازة' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                  soldier.militaryStatus === 'موقوف' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}>
                  {soldier.militaryStatus || 'على رأس العمل'}
                </span>
              </div>

              {/* Soldier Info */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    🎖️ {soldier.rank}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{soldier.fullName}</h2>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300 font-medium">
                  <span>الرقم العسكري: <strong className="text-emerald-400 font-mono tracking-wider">{soldier.militaryNumber}</strong></span>
                  <span>•</span>
                  <span>الوحدة: <strong className="text-slate-100">{unitName}</strong></span>
                  {soldier.nationalId && (
                    <>
                      <span>•</span>
                      <span>الهوية الوطنية: <strong className="text-slate-300 font-mono">{soldier.nationalId}</strong></span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {soldier.specialization && (
                    <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-lg">
                      التخصص: {soldier.specialization}
                    </span>
                  )}
                  {soldier.qualification && (
                    <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-lg">
                      المؤهل: {soldier.qualification}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-center sm:justify-end">
              <button
                onClick={() => setActiveTab('digital_id')}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 border border-amber-500/30 hover:border-amber-400 shadow-md"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>بطاقتي الرقمية</span>
              </button>

              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Send className="w-4 h-4" />
                <span>تقديم طلب جديد</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- NAVIGATION TABS --- */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 sticky top-[61px] z-30 shadow-md backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>نظرة عامة والمهام</span>
          </button>

          <button
            onClick={() => setActiveTab('digital_id')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'digital_id'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>بطاقة الهوية الرقمية</span>
          </button>

          <button
            onClick={() => setActiveTab('bio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'bio'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>السجل العسكري والمؤهلات</span>
          </button>

          <button
            onClick={() => setActiveTab('duty')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'duty'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>الخدمة والخفارات الميدانية</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>قسم التحضير والحضور</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'financial'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>مسيرات الرواتب والتعريف</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'leaves'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-blue-400" />
            <span>الإجازات والأعذار ({sickLeaves.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('custody')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'custody'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>العهدة الشخصية ({custodies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>مركز الطلبات والمتابعة ({actionRequests.length})</span>
          </button>
        </div>
      </div>

      {/* --- MAIN PORTAL CONTENT --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* --- LIVE SYNCHRONIZED ATTENDANCE & READINESS BANNER CARD --- */}
            {(() => {
              const nowObj = new Date();
              const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
              const todayAttRecord = attendanceList.find(a => a.date === todayStr);
              const todayStatusInfo = getAttendanceStatusDetails(todayAttRecord?.statusCode);
              const TodayStatusIcon = todayStatusInfo.icon;

              const currentMonthStr = String(nowObj.getMonth() + 1).padStart(2, '0');
              const currentYearStr = String(nowObj.getFullYear());
              const currentMonthRecords = attendanceList.filter(a => a.date && a.date.startsWith(`${currentYearStr}-${currentMonthStr}`));
              const curPresentCount = currentMonthRecords.filter(a => a.statusCode === 'ح').length;
              const curAbsentCount = currentMonthRecords.filter(a => a.statusCode === 'غ').length;
              const curLeaveCount = currentMonthRecords.filter(a => a.statusCode === 'إ' || a.statusCode === 'م').length;
              const curDutyCount = currentMonthRecords.filter(a => a.statusCode === 'ع' || a.statusCode === 'ن').length;
              const totalRecordedMonth = currentMonthRecords.length;
              const curAttendanceRate = totalRecordedMonth > 0 ? Math.round((curPresentCount / totalRecordedMonth) * 100) : 100;

              const dayNamesArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
              const todayNameArabic = dayNamesArabic[nowObj.getDay()];

              return (
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 transition-all">
                  
                  {/* Top row: Title + Live Sync Badge + Refresh Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl shrink-0 shadow-inner">
                        <CheckSquare className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-white">حالة التحضير والجاهزية اليومية المزامنة</h3>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            مزامنة فورية مع كشوفات القيادة
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          تاريخ اليوم: {todayNameArabic} {todayStr} • وحدة: {unitName}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleRefreshAttendance}
                        disabled={isRefreshingAtt}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        title="إعادة جلب ومزامنة كشف الحضور الآن"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshingAtt ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingAtt ? 'جاري المزامنة...' : 'مزامنة التحضير الان 🔄'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Center Status Card & Month Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                    
                    {/* Today Status Block (7 cols) */}
                    <div className={`md:col-span-7 rounded-2xl p-4 sm:p-5 border flex flex-col justify-between gap-4 transition-all ${todayStatusInfo.bg}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                            حالة تحضيرك المسجلة اليوم بالنظام
                          </span>
                          <div className="flex items-center gap-3 pt-1">
                            <div className={`p-2.5 rounded-xl border ${todayStatusInfo.badge}`}>
                              <TodayStatusIcon className="w-7 h-7" />
                            </div>
                            <div>
                              <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                {todayStatusInfo.label}
                              </h4>
                              <p className="text-xs text-slate-300 font-medium">
                                {todayAttRecord 
                                  ? `تم التدوين بالسجل: ${todayAttRecord.updatedAt ? new Date(todayAttRecord.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'اليوم'} بواسطة (${todayAttRecord.recordedBy || 'شؤون الأفراد'})`
                                  : 'لم يتم تسجيل حالة التحضير اليومي حتى اللحظة من قبل الإدارة.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <span className={`text-base font-black px-3 py-1 rounded-xl border font-mono ${todayStatusInfo.badge}`}>
                          كود ({todayStatusInfo.code === 'unrecorded' ? '—' : todayStatusInfo.code})
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>سجل معتمد ومحمي بالقيادة</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setAttInquiryDate(todayStr);
                            setIsAttInquiryModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>توضيح / اعتراض على تحضير اليوم</span>
                        </button>
                      </div>
                    </div>

                    {/* Monthly Summary Stats Block (5 cols) */}
                    <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-amber-400" />
                          <span>إحصائيات انضباط الشهر الحالي</span>
                        </h5>
                        <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                          {curAttendanceRate}% نسبة الحضور
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
                          <span className="text-[10px] text-emerald-300 font-bold block">أيام الحضور (ح)</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">{curPresentCount} يوم</span>
                        </div>
                        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                          <span className="text-[10px] text-rose-300 font-bold block">أيام الغياب (غ)</span>
                          <span className="text-lg font-black text-rose-400 font-mono">{curAbsentCount} يوم</span>
                        </div>
                        <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2.5">
                          <span className="text-[10px] text-blue-300 font-bold block">الإجازات والراحات</span>
                          <span className="text-lg font-black text-blue-400 font-mono">{curLeaveCount} يوم</span>
                        </div>
                        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-2.5">
                          <span className="text-[10px] text-purple-300 font-bold block">المأموريات والنوب</span>
                          <span className="text-lg font-black text-purple-400 font-mono">{curDutyCount} يوم</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('attendance')}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Table className="w-4 h-4 text-amber-400" />
                        <span>استعراض سجل التحضير الشهري التفصيلي</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>
              );
            })()}
            
            {/* Direct Manager Notification Banner */}
            {totalAlertsCount > 0 && (
              <div 
                onClick={() => setIsNotificationsOpen(true)}
                className="bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-slate-900 border-2 border-amber-500/70 hover:border-amber-400 rounded-2xl p-4 cursor-pointer transition-all shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                    <Bell className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>تنبيه هام: توجيهات ومهام مطلوبة من القيادة والمدير</span>
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        {totalAlertsCount} جديد
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 font-bold">
                      {managerInstructions 
                        ? `توجيه خاص: "${managerInstructions.substring(0, 80)}${managerInstructions.length > 80 ? '...' : ''}"`
                        : `يوجد ${requiredTasksCount} مهام مطلوب استكمال بياناتها وإرسالها للمدير.`}
                    </p>
                  </div>
                </div>

                <button className="px-4 py-2.5 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20">
                  <span>فتح التنبيهات والمهام</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Interactive Required Tasks Direct Action Grid on Overview */}
            {requiredTasksCount > 0 && (
              <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                {/* Unified Order Card */}
                <div 
                  onClick={() => setIsUnifiedDirectiveModalOpen(true)}
                  className="bg-gradient-to-r from-amber-950/80 via-amber-900/50 to-slate-950 border-2 border-amber-500/80 hover:border-amber-400 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-sm">
                          أمر إداري رقم: DIR-2026-882
                        </span>
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30">
                          {requiredTasksCount} متطلبات مجتمعة
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        توجيه وأمر إداري شامل من القيادة: استكمال وتحديث ملف الخدمة
                      </h3>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {managerInstructions ? `التوجيه: "${managerInstructions}"` : 'توجيه إداري لاستكمال الصورة، البيانات الشخصية، وتأكيد العهد العسكرية.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUnifiedDirectiveModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <span>فتح نافذة الأمر الإداري المكتملة</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-item quick access cards */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span>عناصر ومكونات هذا الأمر الإداري (أو يمكنك فتحها فردياً):</span>
                    <span className="text-amber-400 font-mono text-[11px]">{requiredTasksCount} بنود</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {parsedAssignedTasksList.map((taskId) => {
                      const taskInfo = TASK_INFO_MAP[taskId] || {
                        label: taskId,
                        desc: 'إجراء مطلوب تحديثه في الملف الشخصي من قبل المدير',
                        category: 'إجراء مطلوب'
                      };
                      return (
                        <div
                          key={taskId}
                          onClick={() => handleOpenTaskModal(taskId)}
                          className="bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {taskInfo.category}
                            </span>
                            <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                              {taskInfo.label}
                            </h4>
                          </div>

                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                            تنفيذ منفرد
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* --- GRID OF INTERACTIVE QUICK SERVICE APP TILES (لوحة الخدمات السريعة - شبكية 4 ايقونات بالسطر) --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white tracking-tight">لوحة الخدمات الذاتية المباشرة للفرد</h3>
                </div>
                <span className="text-[10px] sm:text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  4 أزرار بالسطر 📱
                </span>
              </div>

              {/* 4 Cards Per Row Grid Layout */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                
                {/* 1. Digital ID */}
                <div 
                  onClick={() => setActiveTab('digital_id')}
                  className="bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 hover:from-amber-900/60 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-amber-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                      الهوية الرقمية
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      بطاقتك الرسمية
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    معتمدة
                  </span>
                </div>

                {/* 2. Request Leave */}
                <div 
                  onClick={() => {
                    setReqType('leave_request');
                    setReqTitle('طلب إجازة رسمية / استئذان');
                    setReqDesc('يرجى الموافقة على منح إجازة رسمية بناءً على النظام والدواعي الإدارية.');
                    setIsRequestModalOpen(true);
                  }}
                  className="bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 hover:from-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-emerald-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                      طلب إجازة
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      اعتيادية/مرابطة
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    استئذان
                  </span>
                </div>

                {/* 3. Salary Certificate */}
                <div 
                  onClick={() => setIsSalaryCertModalOpen(true)}
                  className="bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 hover:from-blue-900/60 border border-blue-500/40 hover:border-blue-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-blue-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-blue-300 transition-colors truncate">
                      تعريف الراتب
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      خطاب للبنوك
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    طباعة فورية
                  </span>
                </div>

                {/* 4. Duty & Patrol */}
                <div 
                  onClick={() => setActiveTab('duty')}
                  className="bg-gradient-to-br from-purple-950/50 via-slate-900 to-slate-950 hover:from-purple-900/60 border border-purple-500/40 hover:border-purple-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-purple-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-purple-300 transition-colors truncate">
                      الخفارات والخدمة
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      النوبة والمواقع
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    جاهزية
                  </span>
                </div>

                {/* 5. Attendance & Roll Call */}
                <div 
                  onClick={() => setActiveTab('attendance')}
                  className="bg-gradient-to-br from-teal-950/50 via-slate-900 to-slate-950 hover:from-teal-900/60 border border-teal-500/40 hover:border-teal-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-teal-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-teal-300 transition-colors truncate">
                      سجل التحضير
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      حضور وغياب
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded-md w-full truncate flex items-center justify-center gap-1">
                    <Lock className="w-2 h-2 shrink-0" />
                    اطلاع فقط
                  </span>
                </div>

                {/* 6. Salary Slips */}
                <div 
                  onClick={() => setActiveTab('financial')}
                  className="bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 hover:from-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-emerald-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                      مسير الراتب
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      البدلات والمسيرات
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    مالية
                  </span>
                </div>

                {/* 7. Medical & Leaves */}
                <div 
                  onClick={() => setActiveTab('leaves')}
                  className="bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-950 hover:from-rose-900/60 border border-rose-500/40 hover:border-rose-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-rose-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-rose-300 transition-colors truncate">
                      التقرير الطبي
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      الراحات والأعذار
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    {sickLeaves.length} سجل
                  </span>
                </div>

                {/* 8. Custody */}
                <div 
                  onClick={() => setActiveTab('custody')}
                  className="bg-gradient-to-br from-orange-950/50 via-slate-900 to-slate-950 hover:from-orange-900/60 border border-orange-500/40 hover:border-orange-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-orange-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-orange-300 transition-colors truncate">
                      العهدة العسكرية
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      السلاح والعتاد
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    {custodies.length} بند
                  </span>
                </div>

                {/* 9. Course Request */}
                <div 
                  onClick={() => setIsCourseModalOpen(true)}
                  className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 hover:from-indigo-900/60 border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-indigo-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-indigo-300 transition-colors truncate">
                      طلب دورة
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      تأهيل وتطوير
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    تأهيل
                  </span>
                </div>

                {/* 10. Unified Directive Order */}
                <div 
                  onClick={() => setIsUnifiedDirectiveModalOpen(true)}
                  className="bg-gradient-to-br from-amber-950/70 via-amber-900/40 to-slate-950 hover:from-amber-900/80 border-2 border-amber-500/70 hover:border-amber-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-xl hover:shadow-amber-500/20 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/30 border border-amber-500/50 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-amber-300 group-hover:text-amber-200 transition-colors truncate">
                      الأمر الإداري
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-300 truncate mt-0.5">
                      توجيه الإدارة
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    {requiredTasksCount > 0 ? `${requiredTasksCount} هام` : 'مكتمل'}
                  </span>
                </div>

                {/* 11. Requests Center */}
                <div 
                  onClick={() => setActiveTab('requests')}
                  className="bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 hover:from-violet-900/60 border border-violet-500/40 hover:border-violet-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-violet-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-violet-300 transition-colors truncate">
                      مركز الطلبات
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      المعاملات
                    </p>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1 py-0.5 rounded-md w-full truncate">
                    {actionRequests.length} طلب
                  </span>
                </div>

                {/* 12. Notifications */}
                <div 
                  onClick={() => setIsNotificationsOpen(true)}
                  className="bg-gradient-to-br from-yellow-950/50 via-slate-900 to-slate-950 hover:from-yellow-900/60 border border-yellow-500/40 hover:border-yellow-400 rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-200 shadow-md hover:shadow-yellow-500/10 flex flex-col items-center text-center justify-between gap-1.5 sm:gap-2 group active:scale-95"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-inner">
                    <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="text-[10px] sm:text-xs font-black text-white group-hover:text-yellow-300 transition-colors truncate">
                      الإشعارات
                    </h4>
                    <p className="hidden sm:block text-[9px] text-slate-400 truncate mt-0.5">
                      التكليفات
                    </p>
                  </div>
                  {totalAlertsCount > 0 ? (
                    <span className="text-[8px] sm:text-[9px] font-black bg-rose-600 text-white px-1 py-0.5 rounded-md w-full truncate animate-pulse text-center">
                      {totalAlertsCount} جديد
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1 py-0.5 rounded-md w-full truncate">
                      التنبيهات
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">حالة الخدمة</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-lg font-black text-white">{soldier.militaryStatus || 'على رأس العمل'}</p>
                <p className="text-[11px] text-slate-400 mt-1">تاريخ الالتحاق: {soldier.joinDate || 'غير محدد'}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">العهدة الشخصية</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-400">{custodies.length} <span className="text-xs text-slate-400 font-normal">بند مسجل</span></p>
                <p className="text-[11px] text-slate-400 mt-1">أسلحة ومعدات بذمتك</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">الراحات والإجازات</span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-blue-400">{sickLeaves.length} <span className="text-xs text-slate-400 font-normal">سجل مراجعة</span></p>
                <p className="text-[11px] text-slate-400 mt-1">المستشفى والراحات المرضية</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">الطلبات المقترحة</span>
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-purple-400">{actionRequests.length} <span className="text-xs text-slate-400 font-normal">طلب</span></p>
                <p className="text-[11px] text-slate-400 mt-1">طلبات مقدمة للقيادة</p>
              </div>
            </div>

            {/* Important Personal Details & Quick Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Personal Details */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserIcon className="w-5 h-5 text-amber-400" />
                  <span>البيانات الأساسية ومعلومات التواصل</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">الاسم الرباعي:</span>
                    <strong className="text-slate-100 font-bold text-sm">{soldier.fullName}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">الرتبة العسكرية:</span>
                    <strong className="text-amber-400 font-bold text-sm">{soldier.rank}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">الرقم العسكري:</span>
                    <strong className="text-emerald-400 font-mono text-sm tracking-wider">{soldier.militaryNumber}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">الهوية الوطنية:</span>
                    <strong className="text-slate-200 font-mono text-sm">{soldier.nationalId || 'غير مسجل'}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">رقم الهاتف:</span>
                    <strong className="text-slate-200 font-mono text-sm">{soldier.phoneNumber || 'غير مسجل'}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">فصيلة الدم:</span>
                    <strong className="text-rose-400 font-bold text-sm">{soldier.bloodType || 'غير محدد'}</strong>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 sm:col-span-2">
                    <span className="text-slate-400 block mb-1">جهة الاتصال في حالات الطوارئ:</span>
                    <strong className="text-slate-200 text-sm">{soldier.emergencyContact || 'غير مدونة'}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Custody Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-black text-white flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <span>العهدة الشخصية</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('custody')} 
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    عرض الكل
                  </button>
                </h3>

                {custodies.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لا توجد عهدة عسكرية مسجلة حالياً
                  </div>
                ) : (
                  <div className="space-y-3">
                    {custodies.slice(0, 3).map((item) => (
                      <div key={item.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-slate-200">{item.type} - {item.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono">رقم: {item.custodyNumber}</p>
                        </div>
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: DIGITAL MILITARY ID CARD */}
        {activeTab === 'digital_id' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-amber-400" />
                    <span>بطاقة الهوية العسكرية الرقمية المعتمدة</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    هوية رسمية مشفرة ومصممة خصيصاً للتحقق الميداني وبوابات الدخول الأمنية
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsIdCardFlipped(!isIdCardFlipped)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{isIdCardFlipped ? 'عرض الوجه الأمامي' : 'عرض الوجه الخلفي'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة البطاقة</span>
                  </button>
                </div>
              </div>

              {/* CARD CONTAINER (معدل للهاتف - هوامش مدمجة واستغلال كامل للمساحة) */}
              <div className="flex justify-center py-2 sm:py-4 px-0">
                <div className="military-id-card w-full max-w-lg aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-amber-500/70 p-3 sm:p-5 shadow-2xl shadow-amber-500/10 relative overflow-hidden flex flex-col justify-between dir-rtl transform transition-all duration-300">
                  
                  {/* Subtle Background Watermark */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                    <Shield className="w-64 h-64 text-amber-400" />
                  </div>

                  {!isIdCardFlipped ? (
                    /* FRONT SIDE OF MILITARY ID */
                    <>
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-amber-500/30 pb-2 sm:pb-3 relative z-10">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md border border-amber-300/50">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                          </div>
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-black text-amber-300 tracking-tight">المملكة العربية السعودية</h4>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-300">وزارة الدفاع • القيادة العامة</p>
                          </div>
                        </div>

                        <span className="text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 tracking-wider">
                          بطاقة عسكرية
                        </span>
                      </div>

                      {/* Middle Content */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 my-auto py-1 sm:py-2 relative z-10 items-center">
                        {/* Photo */}
                        <div className="col-span-1 flex flex-col items-center">
                          {soldier.photoUrl ? (
                            <img
                              src={soldier.photoUrl}
                              alt={soldier.fullName}
                              className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg sm:rounded-xl object-cover border-2 border-amber-400 shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg sm:rounded-xl bg-slate-800 border-2 border-slate-700 flex flex-col items-center justify-center text-slate-500">
                              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                            </div>
                          )}
                          <span className="text-[8px] sm:text-[9px] font-mono text-emerald-400 mt-1 font-bold bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20">
                            فصيلة: {soldier.bloodType || 'O+'}
                          </span>
                        </div>

                        {/* Soldier Info */}
                        <div className="col-span-2 space-y-0.5 sm:space-y-1 text-right">
                          <span className="inline-block text-[9px] sm:text-[10px] font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                            🎖️ {soldier.rank}
                          </span>
                          <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate">{soldier.fullName}</h3>

                          <div className="space-y-0.5 text-[10px] sm:text-[11px] pt-0.5">
                            <p className="text-slate-300">
                              <span className="text-slate-400">الرقم العسكري:</span>{' '}
                              <strong className="text-emerald-400 font-mono">{soldier.militaryNumber}</strong>
                            </p>
                            <p className="text-slate-300">
                              <span className="text-slate-400">الهوية الوطنية:</span>{' '}
                              <strong className="text-slate-200 font-mono">{soldier.nationalId || 'غير مدون'}</strong>
                            </p>
                            <p className="text-slate-300 truncate">
                              <span className="text-slate-400">الوحدة:</span>{' '}
                              <strong className="text-slate-100">{unitName}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer & Barcode */}
                      <div className="pt-1.5 sm:pt-2 border-t border-amber-500/30 flex items-center justify-between relative z-10">
                        {/* Barcode Mock */}
                        <div className="flex flex-col items-start">
                          <div className="h-5 sm:h-6 w-24 sm:w-32 bg-slate-200 rounded flex items-center justify-around px-1">
                            {[...Array(24)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-full bg-slate-900 ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 mt-0.5 tracking-widest">
                            *{soldier.militaryNumber}*
                          </span>
                        </div>

                        <div className="text-left">
                          <span className="text-[7px] sm:text-[8px] text-slate-400 block">حالة الهوية</span>
                          <span className="text-[8px] sm:text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-500/40">
                            سارية معتمدة 🟢
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* BACK SIDE OF MILITARY ID */
                    <>
                      {/* Top Back Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 relative z-10">
                        <span className="text-[9px] sm:text-[10px] font-black text-amber-400">شروط واستخدام البطاقة الرسمية</span>
                        <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">توثيق: SA-MIL-2026</span>
                      </div>

                      {/* Middle Back Info */}
                      <div className="space-y-1.5 sm:space-y-2 my-auto text-[9px] sm:text-[10px] text-slate-300 leading-relaxed relative z-10 text-right">
                        <p className="bg-slate-950/80 p-1.5 sm:p-2 rounded-lg border border-slate-800">
                          هذه البطاقة وثيقة رسمية سارية بالقطاع العسكري ويجب إبرازها عند الطلب. أي تلاعب يخضع للمساءلة القانونية.
                        </p>

                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[9px] sm:text-[10px]">
                          <div className="bg-slate-950/80 p-1.5 sm:p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block">تاريخ التعيين:</span>
                            <strong className="text-slate-200">{soldier.joinDate || 'غير مدون'}</strong>
                          </div>
                          <div className="bg-slate-950/80 p-1.5 sm:p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block">تاريخ الانتهاء:</span>
                            <strong className="text-amber-400 font-mono">1450/12/30 هـ</strong>
                          </div>
                        </div>
                      </div>

                      {/* Back Footer & Vector QR Code */}
                      <div className="pt-1.5 sm:pt-2 border-t border-slate-800 flex items-center justify-between relative z-10">
                        <div className="text-right">
                          <span className="text-[7px] sm:text-[8px] text-slate-400 block">اعتماد السلطات العسكرية:</span>
                          <span className="text-[8px] sm:text-[9px] font-black text-slate-200">قيادة شؤون الأفراد والضباط</span>
                        </div>

                        {/* Vector QR Code SVG */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white p-1 rounded-lg border border-amber-400/50 shadow-md flex items-center justify-center">
                          <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-slate-950" />
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: DUTY SCHEDULE & GUARD SHIFTS */}
        {activeTab === 'duty' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Navigation className="w-6 h-6 text-emerald-400" />
                    <span>جدول الخدمة والخفارات الميدانية اليومية</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    المهام والمواقع الميدانية المقيدة باسمك لليوم والأيام القادمة
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDutyCheckedIn(true);
                    setDutyCheckInTime(new Date().toLocaleTimeString('ar-SA'));
                    triggerToast('تم تسجيل وتأكيد التواجد في موقع الخفارة الميداني بنجاح 🟢', 'success');
                  }}
                  disabled={dutyCheckedIn}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                    dutyCheckedIn
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{dutyCheckedIn ? `تم تأكيد التواجد (${dutyCheckInTime})` : 'تأكيد استلام والتواجد بالخفارة'}</span>
                </button>
              </div>

              {/* Duty Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Active Guard Shift Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-black text-white">موقع الخفارة الحالي - النوبة الرئيسية</h4>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                      خفارة قائمة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">الموقع الميداني:</span>
                      <strong className="text-amber-400 text-sm font-bold">بوابة القيادة الرئيسية - النقطة الشرقية</strong>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">فترة الوردية (الخفارة):</span>
                      <strong className="text-emerald-400 font-mono text-sm">08:00 صباحاً - 04:00 عصراً</strong>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">السلاح والعتاد المقيد:</span>
                      <strong className="text-slate-200">بندقية آلية G3 + جهاز لاسلكي مشفر</strong>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">ضابط الخفارة المسؤول:</span>
                      <strong className="text-slate-200">النقيب / خالد العتيبي</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>تنبيه الخفارات: يرجى الالتزام بالزي الرسمي والانضباط الكامل والإبلاغ الفوري عن أي ملاحظات أمنية.</span>
                  </div>
                </div>

                {/* Emergency & Operations Hotlines */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                    <PhoneCall className="w-4 h-4" />
                    <span>أرقام الطوارئ وغرفة العمليات</span>
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">غرفة العمليات والمراقبة</p>
                        <p className="text-[10px] text-slate-400">الخط المباشر الميداني</p>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        011-888-111
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">الطبابة العسكرية والطوارئ</p>
                        <p className="text-[10px] text-slate-400">الإسعاف والخدمات الطبية</p>
                      </div>
                      <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                        011-888-222
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">الشؤون الفنية والتسليح</p>
                        <p className="text-[10px] text-slate-400">الدعم اللوجستي والمعدات</p>
                      </div>
                      <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                        011-888-333
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 4: FINANCIAL & SALARY STATEMENTS */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    <span>مسيرات الرواتب والتعريف المالي الرسمي</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    كشف تفصيلي بالبدلات واستحقاقات الشهر مع إمكانية إصدار خطابات التعريف بالراتب
                  </p>
                </div>

                <button
                  onClick={() => setIsSalaryCertModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>طلب إصدار شهادة تعريف بالراتب</span>
                </button>
              </div>

              {/* Salary Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Pay Slip Breakdown */}
                <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <h4 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>تفاصيل مسير راتب الشهر الحالي (شوال 1447)</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      تم الصرف 🟢
                    </span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <span className="text-slate-300">الراتب الأساسي (رتبة {soldier.rank}):</span>
                      <strong className="text-white font-mono">4,455.00 ريال</strong>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <span className="text-slate-300">بدل الخفارة والميدان:</span>
                      <strong className="text-emerald-400 font-mono">+ 1,500.00 ريال</strong>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <span className="text-slate-300">بدل السكن والنقل الإداري:</span>
                      <strong className="text-emerald-400 font-mono">+ 1,000.00 ريال</strong>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <span className="text-slate-300">بدل التخصص الفني والتشغيل:</span>
                      <strong className="text-emerald-400 font-mono">+ 800.00 ريال</strong>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                      <span className="text-rose-400">حسومات التقاعد والتأمينات (9%):</span>
                      <strong className="text-rose-400 font-mono">- 400.95 ريال</strong>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 text-sm mt-3">
                      <span className="font-black text-emerald-300">صافي الراتب المحول للحساب البنكي:</span>
                      <strong className="text-emerald-400 font-black font-mono text-base">7,354.05 ريال سعودي</strong>
                    </div>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Building className="w-4 h-4" />
                    <span>الحساب البنكي المعتمد للصرف</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">اسم البنك:</span>
                      <strong className="text-white font-bold">مصرف الراجحي (Al Rajhi Bank)</strong>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">رقم الحساب الآيبان (IBAN):</span>
                      <strong className="text-emerald-400 font-mono text-xs block tracking-wider">
                        SA82 8000 0214 6080 1009 9882
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">حالة مطابقة الآيبان:</span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        مؤكد ومطابق رسمياً 🟢
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 5: BIO & MILITARY DETAILS */}
        {activeTab === 'bio' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Shield className="w-6 h-6 text-amber-400" />
              <span>السجل العسكري والمؤهلات كاملة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-black text-amber-400 text-sm border-b border-slate-800 pb-2">بيانات التعيين والخدمة</h4>
                <p><span className="text-slate-400">تاريخ الالتحاق:</span> <strong className="text-slate-100">{soldier.joinDate || 'غير مدون'}</strong></p>
                <p><span className="text-slate-400">الكتيبة:</span> <strong className="text-slate-100">{soldier.battalion || unitName}</strong></p>
                <p><span className="text-slate-400">السرية:</span> <strong className="text-slate-100">{soldier.company || 'غير محدد'}</strong></p>
                <p><span className="text-slate-400">الفصيلة:</span> <strong className="text-slate-100">{soldier.platoon || 'غير محدد'}</strong></p>
              </div>

              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-black text-amber-400 text-sm border-b border-slate-800 pb-2">التخصص والمؤهل</h4>
                <p><span className="text-slate-400">المؤهل العلمي:</span> <strong className="text-slate-100">{soldier.qualification || 'غير مدون'}</strong></p>
                <p><span className="text-slate-400">التخصص العسكري:</span> <strong className="text-slate-100">{soldier.specialization || 'غير مدون'}</strong></p>
                <p><span className="text-slate-400">عنوان السكن:</span> <strong className="text-slate-100">{soldier.address || 'غير مدون'}</strong></p>
              </div>

              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-black text-amber-400 text-sm border-b border-slate-800 pb-2">الملاحظات الطبية</h4>
                <p className="text-slate-300 leading-relaxed">
                  {soldier.medicalHistory || 'لا توجد ملاحظات سلبية مسجلة بالسجل الطبي.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEAVES */}
        {activeTab === 'leaves' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-blue-400" />
                <span>سجل الراحات الإجازات المرضية</span>
              </h3>
              <button
                onClick={() => {
                  setReqType('leave_request');
                  setIsRequestModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>طلب إجازة / عذر طبي</span>
              </button>
            </div>

            {sickLeaves.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                لا توجد سجلات إجازات مرخصة حالية
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-black border-b border-slate-800">
                    <tr>
                      <th className="p-3">نوع الإجازة / التشخيص</th>
                      <th className="p-3">تاريخ البداية</th>
                      <th className="p-3">تاريخ الانتهاء</th>
                      <th className="p-3">المدة (أيام)</th>
                      <th className="p-3">المستشفى / المستوصف</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sickLeaves.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850">
                        <td className="p-3 font-bold text-white">{item.diagnosis || 'إجازة مرضية'}</td>
                        <td className="p-3 font-mono">{item.startDate}</td>
                        <td className="p-3 font-mono">{item.endDate}</td>
                        <td className="p-3 font-bold text-amber-400">{(item as any).daysCount || (item as any).durationDays || 1} يوم</td>
                        <td className="p-3">{(item as any).hospitalName || item.hospital || 'المستشفى العسكري'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            معتمدة
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUSTODY */}
        {activeTab === 'custody' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Package className="w-6 h-6 text-amber-400" />
              <span>العهدة الشخصية والأسلحة العسكرية</span>
            </h3>

            {custodies.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                لا توجد بضائع أو أسلحة عسكرية مسجلة بعهدتك حالياً
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {custodies.map((item) => (
                  <div key={item.id} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-white">{item.type}</h4>
                      <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black rounded-lg">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{item.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
                      <span>رقم العهدة: {item.custodyNumber}</span>
                      <span>تاريخ التسلم: {item.issueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REQUESTS & OFFICIAL MEMOS */}
        {activeTab === 'requests' && (() => {
          // Separate incoming memos/surveys from soldier-submitted requests
          const incomingMemos = actionRequests.filter(r => 
            Boolean(r.surveyId) || 
            ['survey', 'declaration', 'required_task', 'upload_doc', 'info_request'].includes(r.requestType) ||
            (r.historyLogs && typeof r.historyLogs === 'string' && r.historyLogs.includes('شؤون الأفراد'))
          );
          const outgoingRequests = actionRequests.filter(r => 
            !r.surveyId && 
            !['survey', 'declaration', 'required_task', 'upload_doc', 'info_request'].includes(r.requestType) &&
            (!r.historyLogs || (typeof r.historyLogs === 'string' && !r.historyLogs.includes('شؤون الأفراد')))
          );

          return (
            <div className="space-y-6">
              
              {/* SECTION A: OFFICIAL INCOMING MEMOS & SURVEYS FROM COMMAND */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <span>المذكرات والاستبيانات والبيانات المطلوبة الواردة من القيادة</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      نماذج رسمية ومذكرات إدارية تتطلب التعبئة والتوقيع الإلكتروني وتوثيق البيانات
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMemoForFilling(null);
                      setIsMemoModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <FileText className="w-4 h-4" />
                    <span>تعبئة مذكرة رسمية جديدة</span>
                  </button>
                </div>

                {incomingMemos.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                    <p className="text-xs text-slate-300 font-bold">لا توجد مذكرات أو استبيانات معلقة مطلوبة من القيادة حالياً</p>
                    <p className="text-[11px] text-slate-500">يمكنك النقر على "تعبئة مذكرة رسمية جديدة" لتقديم إقرار أو بيانات للخدمة الإدارية</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingMemos.map((memo) => {
                      const memoRef = `MEM-2026-${memo.id.slice(-5).toUpperCase()}`;
                      const isPendingOrSubmitted = memo.status === 'submitted' || memo.status === 'pending' || memo.status === 'under_review';
                      const isApproved = memo.status === 'approved';
                      const isRejected = memo.status === 'rejected';

                      return (
                        <div key={memo.id} className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 space-y-3 hover:border-amber-500/40 transition-all shadow-lg flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                                {memoRef}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg ${
                                isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                isRejected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                isPendingOrSubmitted ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              }`}>
                                {isApproved ? 'معتمد رسمياً ✅' : isRejected ? 'مرفوض ❌' : isPendingOrSubmitted ? 'تم الإرسال - قيد التدقيق 🟡' : 'مطلوب التعبئة والتوقيع 🔴'}
                              </span>
                            </div>

                            <h4 className="text-xs font-black text-white leading-snug">{memo.title}</h4>
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{memo.description}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              تاريخ التوجيه: {new Date(memo.submittedAt).toLocaleDateString('ar-SA')}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMemoForFilling(memo);
                                setIsMemoModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{isApproved ? 'معاينة المذكرة' : 'تعبئة وتوقيع المذكرة'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION B: INDIVIDUAL OUTGOING REQUESTS SUBMITTED BY SOLDIER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <span>الطلبات والمراسلات الإدارية الصادرة من الفرد</span>
                    </h3>
                    <p className="text-xs text-slate-400">طلبات الإجازات والأعذار وتحديثات البيانات الشخصية المرفوعة من قبل الفرد</p>
                  </div>
                  <button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تقديم طلب إداري جديد</span>
                  </button>
                </div>

                {outgoingRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لم تقم بتقديم أية طلبات إدارية فردية حتى الآن
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((req) => (
                      <div key={req.id} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-white">{req.title}</h4>
                          <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg ${
                            req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            req.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}>
                            {req.status === 'approved' ? 'موافق عليه ✅' : req.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة والتدقيق 🟡'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                          <span>تاريخ التقديم: {new Date(req.submittedAt).toLocaleDateString('ar-SA')}</span>
                          {req.rejectionReason && (
                            <span className="text-rose-400 font-sans font-bold">سبب الرفض: {req.rejectionReason}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* TAB: ATTENDANCE / ROLL CALL (التحضير والحضور - للاطلاع فقط) */}
        {activeTab === 'attendance' && (() => {
          const daysInMonth = new Date(parseInt(attYear), parseInt(attMonth), 0).getDate();
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          const getDayName = (dayNum: number) => {
            try {
              const d = new Date(parseInt(attYear), parseInt(attMonth) - 1, dayNum);
              return d.toLocaleDateString('ar-SA', { weekday: 'long' });
            } catch {
              return '';
            }
          };

          const dailyRecords = daysArray.map(dayNum => {
            const dayStrPadded = String(dayNum).padStart(2, '0');
            const dateStr = `${attYear}-${attMonth}-${dayStrPadded}`;
            const dayName = getDayName(dayNum);
            const record = attendanceList.find(a => a.date === dateStr);
            const statusInfo = getAttendanceStatusDetails(record?.statusCode);
            return {
              dayNum,
              dateStr,
              dayName,
              record,
              statusInfo
            };
          });

          // Statistics
          const totalDays = daysInMonth;
          const presentCount = dailyRecords.filter(d => d.statusInfo.code === 'ح').length;
          const absentCount = dailyRecords.filter(d => d.statusInfo.code === 'غ').length;
          const leaveCount = dailyRecords.filter(d => d.statusInfo.code === 'إ').length;
          const sickCount = dailyRecords.filter(d => d.statusInfo.code === 'م').length;
          const dutyCount = dailyRecords.filter(d => d.statusInfo.code === 'ع' || d.statusInfo.code === 'ن').length;
          const unrecordedCount = dailyRecords.filter(d => d.statusInfo.code === 'unrecorded').length;

          const recordedCount = totalDays - unrecordedCount;
          const attendanceRate = recordedCount > 0 ? Math.round((presentCount / recordedCount) * 100) : 0;

          // Filtered list
          const filteredDailyRecords = dailyRecords.filter(d => {
            if (attFilter === 'present') return d.statusInfo.code === 'ح';
            if (attFilter === 'absent') return d.statusInfo.code === 'غ';
            if (attFilter === 'leave') return d.statusInfo.code === 'إ' || d.statusInfo.code === 'م';
            if (attFilter === 'duty') return d.statusInfo.code === 'ع' || d.statusInfo.code === 'ن';
            return true;
          });

          const selectedMonthObj = MONTHS_OPTIONS.find(m => m.value === attMonth);

          const handlePrevMonth = () => {
            let m = parseInt(attMonth) - 1;
            let y = parseInt(attYear);
            if (m < 1) { m = 12; y -= 1; }
            setAttMonth(String(m).padStart(2, '0'));
            setAttYear(String(y));
          };

          const handleNextMonth = () => {
            let m = parseInt(attMonth) + 1;
            let y = parseInt(attYear);
            if (m > 12) { m = 1; y += 1; }
            setAttMonth(String(m).padStart(2, '0'));
            setAttYear(String(y));
          };

          const handleCurrentMonth = () => {
            const now = new Date();
            setAttYear(String(now.getFullYear()));
            setAttMonth(String(now.getMonth() + 1).padStart(2, '0'));
            setAttFilter('all');
          };

          return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
              
              {/* Header Title & Read-Only Badge */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        سجل التحضير والحضور العسكري
                      </h3>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        للاطلاع فقط
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      استعراض قيد الحضور والغياب المعتمد رسمياً للفرد خلال الشهر
                    </p>
                  </div>
                </div>

                {/* Read-only Notice Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">
                    البيانات مدخلة وموثقة من سكرتارية وحدة العمليات - لا يمكن التعديل من البوابة
                  </span>
                </div>
              </div>

              {/* Month / Year Controls & Filters */}
              <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  {/* Month & Year Selectors with Prev/Next */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="الشهر السابق"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <select
                      value={attMonth}
                      onChange={(e) => setAttMonth(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                      {MONTHS_OPTIONS.map(m => (
                        <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={attYear}
                      onChange={(e) => setAttYear(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                      {YEARS_OPTIONS.map(y => (
                        <option key={y} value={y} className="bg-slate-900 text-white">
                          عام {y}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="الشهر التالي"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCurrentMonth}
                      className="px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0"
                    >
                      الشهر الحالي
                    </button>
                  </div>

                  {/* Selected Month Name Display */}
                  <div className="text-xs font-bold text-slate-300 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>{selectedMonthObj?.name} - {attYear} م</span>
                  </div>

                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 dir-rtl scrollbar-none pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 ml-1 shrink-0 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    فلترة العرض:
                  </span>

                  <button
                    type="button"
                    onClick={() => setAttFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      attFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    عرض جميع الأيام ({totalDays})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttFilter('present')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      attFilter === 'present'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    حاضر ({presentCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttFilter('absent')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      attFilter === 'absent'
                        ? 'bg-rose-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    غائب ({absentCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttFilter('leave')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      attFilter === 'leave'
                        ? 'bg-blue-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-blue-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    إجازة/راحة ({leaveCount + sickCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttFilter('duty')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      attFilter === 'duty'
                        ? 'bg-purple-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-purple-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    مهمة/خفارة ({dutyCount})
                  </button>
                </div>

              </div>

              {/* Attendance Monthly Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                
                {/* Attendance Rate Progress Card */}
                <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      نسبة الحضور والالتزام
                    </span>
                    <span className="text-emerald-400 font-black text-lg font-mono">
                      %{attendanceRate}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    تم تسجيل {recordedCount} يوم من إجمالي {totalDays} يوم بالشهر
                  </p>
                </div>

                {/* Present Count */}
                <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-base shrink-0">
                    {presentCount}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">أيام الحضور</span>
                    <span className="text-xs font-black text-emerald-300 font-mono">رمز (ح)</span>
                  </div>
                </div>

                {/* Absent Count */}
                <div className="bg-slate-950/80 border border-rose-500/30 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-black text-base shrink-0">
                    {absentCount}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">أيام الغياب</span>
                    <span className="text-xs font-black text-rose-300 font-mono">رمز (غ)</span>
                  </div>
                </div>

                {/* Leave & Sick Count */}
                <div className="bg-slate-950/80 border border-blue-500/30 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-black text-base shrink-0">
                    {leaveCount + sickCount}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">إجازة / راحة</span>
                    <span className="text-xs font-black text-blue-300 font-mono">رمز (إ / م)</span>
                  </div>
                </div>

                {/* Duty / Mission Count */}
                <div className="bg-slate-950/80 border border-purple-500/30 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-base shrink-0">
                    {dutyCount}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">مهمة / خفارة</span>
                    <span className="text-xs font-black text-purple-300 font-mono">رمز (ع / ن)</span>
                  </div>
                </div>

              </div>

              {/* Monthly Attendance Days Display - Multi-Pattern View Modes (Grid, Excel, Table) */}
              <div className="space-y-4">
                
                {/* Header & View Mode Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-200">
                        سجل التحضير اليومي لشهر {selectedMonthObj?.name} ({filteredDailyRecords.length} يوم)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        اختر نمط العرض المناسب لك (بطاقات شبكية للهاتف، جدول إكسل تقويمي، أو قائمة تفصيلية)
                      </p>
                    </div>
                  </div>

                  {/* View Mode Toggle Buttons */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 self-stretch sm:self-auto justify-center">
                    <button
                      type="button"
                      onClick={() => setAttViewMode('grid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        attViewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>شبكي (مربعات)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttViewMode('excel')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        attViewMode === 'excel'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span>تقويمي (إكسل)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttViewMode('table')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        attViewMode === 'table'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>جدول تفصيلي</span>
                    </button>
                  </div>
                </div>

                {filteredDailyRecords.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-2">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">
                      لا توجد سجلات تحضير تطابق معيار الفلترة المحدد لهذا الشهر
                    </p>
                  </div>
                ) : (
                  <>
                    {/* --- VIEW MODE 1: GRID TILES (شبكي مربعات - ممتاز للهاتف) --- */}
                    {attViewMode === 'grid' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {filteredDailyRecords.map((item) => {
                          const StatusIcon = item.statusInfo.icon;
                          const isSelected = selectedDayDetail?.dayNum === item.dayNum;
                          return (
                            <div
                              key={item.dayNum}
                              onClick={() => setSelectedDayDetail(item)}
                              className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 shadow-sm cursor-pointer active:scale-95 ${item.statusInfo.bg} ${
                                isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : 'hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 text-amber-400 font-mono font-black text-xs flex items-center justify-center shadow-inner">
                                    {item.dayNum}
                                  </span>
                                  <div>
                                    <h5 className="text-xs font-black text-white">
                                      {item.dayName}
                                    </h5>
                                    <p className="text-[9px] text-slate-400 font-mono">
                                      {item.dateStr}
                                    </p>
                                  </div>
                                </div>

                                <Lock className="w-3 h-3 text-slate-500" />
                              </div>

                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`px-2 py-1 rounded-xl border text-[11px] font-black flex items-center gap-1 ${item.statusInfo.badge}`}>
                                  <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{item.statusInfo.label}</span>
                                </span>

                                <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                                  {item.statusInfo.code === 'unrecorded' ? '—' : item.statusInfo.code}
                                </span>
                              </div>

                              {item.record?.updatedAt && (
                                <div className="text-[9px] text-slate-400/80 font-mono pt-1 border-t border-slate-800/40 flex items-center justify-between">
                                  <span>موثق بالعمليات</span>
                                  <span>{new Date(item.record.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* --- VIEW MODE 2: EXCEL / CALENDAR MATRIX (نمط إكسل / تقويم مربعات مدمجة) --- */}
                    {attViewMode === 'excel' && (
                      <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-3 overflow-hidden">
                        
                        {/* Excel Header Banner */}
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <Grid3X3 className="w-4 h-4" />
                            جدول مربعات الشهر المباشر (مثل الإكسل):
                          </span>
                          <span className="text-[10px]">انقر على أي يوم لاستعراض التوثيق الكامل</span>
                        </div>

                        {/* Calendar Day Grid (7 Columns Matrix or Compact 5-6 Grid on Mobile) */}
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 sm:gap-2">
                          {filteredDailyRecords.map((item) => {
                            const isSelected = selectedDayDetail?.dayNum === item.dayNum;
                            return (
                              <div
                                key={item.dayNum}
                                onClick={() => setSelectedDayDetail(item)}
                                className={`aspect-square p-1.5 rounded-xl border flex flex-col justify-between items-center text-center cursor-pointer transition-all active:scale-95 ${item.statusInfo.bg} ${
                                  isSelected ? 'ring-2 ring-amber-400 scale-105 z-10 shadow-lg' : 'hover:border-amber-500/50'
                                }`}
                              >
                                {/* Day Number */}
                                <div className="w-full flex items-center justify-between text-[9px] font-mono">
                                  <span className="font-black text-amber-300 bg-slate-950/80 px-1 rounded border border-slate-800">
                                    {item.dayNum}
                                  </span>
                                  <span className="text-slate-400 text-[8px] truncate hidden sm:inline">
                                    {item.dayName.replace('اليوم', '').trim()}
                                  </span>
                                </div>

                                {/* Status Code Symbol */}
                                <div className="my-auto flex flex-col items-center">
                                  <span className={`text-base sm:text-lg font-black font-mono px-2 py-0.5 rounded-lg border ${item.statusInfo.badge}`}>
                                    {item.statusInfo.code === 'unrecorded' ? '—' : item.statusInfo.code}
                                  </span>
                                </div>

                                {/* Short Status Label */}
                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 truncate w-full">
                                  {item.statusInfo.label.split('/')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}

                    {/* --- VIEW MODE 3: TABLE ROW VIEW (جدول صفوف تفصيلي) --- */}
                    {attViewMode === 'table' && (
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
                        <table className="w-full text-right text-xs dir-rtl">
                          <thead className="bg-slate-900 border-b border-slate-800 text-amber-400 font-bold">
                            <tr>
                              <th className="p-3 text-center w-12">#</th>
                              <th className="p-3">اليوم والتاريخ</th>
                              <th className="p-3">حالة التحضير</th>
                              <th className="p-3 text-center">كود الرمز</th>
                              <th className="p-3">سجل التوثيق والاعتماد</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredDailyRecords.map((item) => {
                              const StatusIcon = item.statusInfo.icon;
                              return (
                                <tr 
                                  key={item.dayNum} 
                                  onClick={() => setSelectedDayDetail(item)}
                                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                                >
                                  <td className="p-3 text-center font-mono font-black text-amber-400">
                                    {item.dayNum}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-white block">يوم {item.dayName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{item.dateStr}</span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black ${item.statusInfo.badge}`}>
                                      <StatusIcon className="w-3.5 h-3.5" />
                                      <span>{item.statusInfo.label}</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="font-mono font-black bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-200">
                                      {item.statusInfo.code === 'unrecorded' ? 'غير مدون' : item.statusInfo.code}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                      <Lock className="w-3 h-3 text-emerald-400" />
                                      <span>موثق ومسجل بسجلات عمليات الوحدة</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* --- DAY DETAIL MODAL/CARD WHEN CLICKED --- */}
                    {selectedDayDetail && (
                      <div className="bg-slate-950 border-2 border-amber-500/50 p-4 rounded-2xl shadow-2xl relative space-y-2 animate-fadeIn dir-rtl">
                        <button
                          type="button"
                          onClick={() => setSelectedDayDetail(null)}
                          className="absolute top-3 left-3 w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-black text-sm flex items-center justify-center border border-amber-500/40">
                            {selectedDayDetail.dayNum}
                          </span>
                          <div>
                            <h5 className="text-sm font-black text-white">
                              تفاصيل تحضير يوم {selectedDayDetail.dayName} ({selectedDayDetail.dateStr})
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              تاريخ التوثيق بالسجل المعتمد للفرد
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[10px] block font-bold">الحالة المعتمدة:</span>
                            <span className={`font-black inline-block mt-1 ${selectedDayDetail.statusInfo.badge} px-2 py-0.5 rounded-lg border`}>
                              {selectedDayDetail.statusInfo.label}
                            </span>
                          </div>

                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[10px] block font-bold">رمز القيد (الكود):</span>
                            <span className="font-mono font-black text-amber-300 text-sm mt-1 block">
                              كود ({selectedDayDetail.statusInfo.code})
                            </span>
                          </div>

                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[10px] block font-bold">حالة التوثيق:</span>
                            <span className="text-emerald-400 font-bold text-xs mt-1 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              معتمد من سكرتارية الوحدة
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Legend Box */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>دليل رموز التحضير العسكري المعتمدة:</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-emerald-500/30">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs">ح</span>
                    <span className="text-slate-300 font-bold">حاضر بالدوام</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-rose-500/30">
                    <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-xs">غ</span>
                    <span className="text-slate-300 font-bold">غائب عن الدوام</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-blue-500/30">
                    <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-xs">إ</span>
                    <span className="text-slate-300 font-bold">إجازة رسمية</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-purple-500/30">
                    <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 font-black flex items-center justify-center text-xs">م</span>
                    <span className="text-slate-300 font-bold">راحة طبية / مستشفى</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-amber-500/30">
                    <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs">ع</span>
                    <span className="text-slate-300 font-bold">مهمة / عمل ميداني</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-xl border border-indigo-500/30">
                    <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-xs">ن</span>
                    <span className="text-slate-300 font-bold">نوبة / خفارة</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

      </main>

      {/* --- MODAL FOR SUBMITTING REQUEST --- */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <span>تقديم طلب جديد للشؤون الإدارية</span>
              </h3>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reqSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-bold text-center">
                {reqSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">نوع الطلب:</label>
                <select
                  value={reqType}
                  onChange={(e: any) => setReqType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-amber-500"
                >
                  <option value="leave_request">طلب إجازة / عذر</option>
                  <option value="update_profile">تحديث بيانات شخصية</option>
                  <option value="required_task">مراجعة مهمة / عهدة</option>
                  <option value="general">طلب عام</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان الطلب:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طلب إجازة اعتيادية / عذر طبي"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تفاصيل الطلب والأسباب:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب هنا التفاصيل كاملة..."
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL FOR ATTENDANCE INQUIRY & OBJECTION --- */}
      {isAttInquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>إرسال إفادة / اعتراض على تحضير اليوم</span>
              </h3>
              <button 
                onClick={() => setIsAttInquiryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAttInquiry} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">تاريخ التحضير المعني:</label>
                <input
                  type="date"
                  value={attInquiryDate}
                  onChange={(e) => setAttInquiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">تفاصيل الإفادة / سبب الاعتراض:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="مثال: كنت حاضراً بالدوام وتم تسجيل غياب بالخطأ، أو كنت في مهمة رسمية برفقة كتاب التكليف..."
                  value={attInquiryReason}
                  onChange={(e) => setAttInquiryReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAttInquiryModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? 'جاري الإرسال...' : 'إرسال الإفادة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL FOR LOGOUT CONFIRMATION --- */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl dir-rtl">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-950/50">
              <LogOut className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">تأكيد تسجيل الخروج</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                أخي <strong className="text-amber-400">{soldier.rank} / {soldier.fullName}</strong>، هل أنت تأكد من رغبتك في تسجيل الخروج من حساب الفرد والعودة إلى شاشة الدخول؟
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700 flex-1"
              >
                إلغاء والعودة
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 shadow-lg shadow-rose-950/50 border border-rose-400/50"
              >
                <LogOut className="w-4 h-4" />
                <span>تأكيد الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FOR NOTIFICATIONS & MANAGER REQUIRED PROCEDURES --- */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full my-8 p-6 space-y-6 shadow-2xl dir-rtl">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
                  <BellRing className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>مركز التنبيهات والمهام المطلوبة من القيادة</span>
                    {totalAlertsCount > 0 && (
                      <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        {totalAlertsCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    التوجيهات والمهام المحددة لك من قبل القائد والمدير المباشر
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* 1. DIRECT MANAGER INSTRUCTIONS */}
              {managerInstructions && (
                <div className="bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                    <ShieldAlert className="w-5 h-5" />
                    <span>توجيه إداري مباشر من المدير / القائد</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-bold bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/20 whitespace-pre-wrap">
                    {managerInstructions}
                  </p>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenTaskModal('custom_instruction')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>تنفيذ التوجيه ورفع الوثائق المطلوبة</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. PRESET REQUIRED TASKS ASSIGNED BY MANAGER */}
              {parsedAssignedTasksList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>المهام المحددة المطلوب منك إنجازها ({parsedAssignedTasksList.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {parsedAssignedTasksList.map((taskId) => {
                      const taskInfo = TASK_INFO_MAP[taskId] || {
                        label: taskId,
                        desc: 'إجراء مطلوب تحديثه في الملف الشخصي من قبل المدير',
                        category: 'إجراء مطلوب'
                      };

                      return (
                        <div 
                          key={taskId}
                          className="bg-slate-950/90 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all shadow-md"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {taskInfo.category}
                              </span>
                              <h5 className="text-xs font-black text-white">{taskInfo.label}</h5>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal">
                              {taskInfo.desc}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenTaskModal(taskId)}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-500/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>تنفيذ الإجراء الآن</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. REQUEST REVIEWS & STATUSES */}
              {actionRequests.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <span>تحديثات حالة الطلبات والإجراءات السابقة</span>
                  </h4>

                  <div className="space-y-2">
                    {actionRequests.slice(0, 6).map((req) => (
                      <div 
                        key={req.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-white">{req.title}</h5>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{req.description}</p>
                          {req.rejectionReason && (
                            <p className="text-[11px] text-rose-400 font-medium">ملاحظة الرفض: {req.rejectionReason}</p>
                          )}
                        </div>

                        <div className="shrink-0 text-left">
                          {req.status === 'approved' ? (
                            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مقبول ومُعتمد</span>
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-[10px] font-black flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>مرفوض</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-[10px] font-black flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" />
                              <span>قيد المراجعة</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. GENERAL NOTIFICATIONS FOR THIS SOLDIER */}
              {soldierNotifications.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <span>التنبيهات والإشعارات الخاصة بك ({soldierNotifications.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {soldierNotifications.slice(0, 6).map((notif) => (
                      <div key={notif.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-1">
                        <h5 className="text-xs font-bold text-slate-200">{notif.title}</h5>
                        <p className="text-[11px] text-slate-400">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {!managerInstructions && parsedAssignedTasksList.length === 0 && actionRequests.length === 0 && soldierNotifications.length === 0 && (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs text-slate-300 font-bold">لا توجد مهام أو إشعارات جديدة بانتظارك حالياً</p>
                  <p className="text-[11px] text-slate-500">كافة بياناتك وإجراءاتك المكتوبة مكتملة ومحدثة.</p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsMarkedRead(true);
                    triggerToast('تم تمييز جميع التنبيهات والإشعارات كمقروءة 🟢', 'info');
                  }}
                  className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تصفير الإشعارات (تعيين كمقروء)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    setIsRequestModalOpen(true);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تقديم طلب إجراء</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsNotificationsMarkedRead(true);
                  setIsNotificationsOpen(false);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                تم الاطلاع والتأكيد
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- UNIFIED DIRECTIVE ORDER MODAL (نافذة الأمر الإداري الشاملة كاملة) --- */}
      {isUnifiedDirectiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-2xl w-full my-6 p-4 sm:p-6 space-y-5 shadow-2xl dir-rtl">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded border border-amber-500/30">
                      أمر إداري رسمي رقم: DIR-2026-882
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      نافذة طلبات كاملة وموحدة
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    الأمر الإداري الشامل: استكمال وتسوية بيانات وملف الخدمة العسكرية
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnifiedDirectiveModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Manager Instruction Box */}
            {managerInstructions && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-1.5">
                <h5 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>التوجيه الصادر من القيادة / المدير المباشر:</span>
                </h5>
                <p className="text-xs text-slate-200 font-bold leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-amber-500/20">
                  {managerInstructions}
                </p>
              </div>
            )}

            {/* Form containing all sub-tasks combined in one window */}
            <form onSubmit={handleSaveUnifiedDirective} className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              
              {/* SECTION 1: PHOTO */}
              {(parsedAssignedTasksList.includes('t_photo') || !parsedAssignedTasksList.length) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>1. الصورة الشخصية العسكرية الرسمية</span>
                  </h4>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {taskPhotoUrl ? (
                      <img
                        src={taskPhotoUrl}
                        alt="الصورة"
                        className="w-20 h-20 object-cover rounded-2xl border-2 border-amber-500 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 shrink-0">
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="space-y-2 w-full">
                      <p className="text-[11px] text-slate-400">يرجى رفع صورة بالزي العسكري المعتمد وبخلفية فاتحة.</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/40 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>اختيار أو التقاط الصورة</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: PHONE & WHATSAPP */}
              {(parsedAssignedTasksList.includes('t_phone') || !parsedAssignedTasksList.length) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>2. أرقام التواصل المباشرة والواتساب</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم الجوال المباشر:</label>
                      <input
                        type="text"
                        placeholder="05xxxxxxxx"
                        value={taskPhone}
                        onChange={(e) => setTaskPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم الواتساب:</label>
                      <input
                        type="text"
                        placeholder="05xxxxxxxx"
                        value={taskWhatsapp}
                        onChange={(e) => setTaskWhatsapp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: EMERGENCY CONTACT */}
              {(parsedAssignedTasksList.includes('t_emergency') || !parsedAssignedTasksList.length) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>3. بيانات جهة التواصل للطوارئ</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-bold mb-1">اسم قريب الطوارئ:</label>
                      <input
                        type="text"
                        placeholder="الاسم الرباعي"
                        value={taskEmergencyName}
                        onChange={(e) => setTaskEmergencyName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">صلة القرابة:</label>
                      <select
                        value={taskEmergencyRelation}
                        onChange={(e) => setTaskEmergencyRelation(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="أب">أب</option>
                        <option value="أم">أم</option>
                        <option value="أخ">أخ</option>
                        <option value="أخت">أخت</option>
                        <option value="زوجة">زوجة</option>
                        <option value="ابن">ابن</option>
                        <option value="قريب">قريب / آخر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم هاتف الطوارئ:</label>
                      <input
                        type="text"
                        placeholder="05xxxxxxxx"
                        value={taskEmergencyPhone}
                        onChange={(e) => setTaskEmergencyPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: ADDRESS */}
              {(parsedAssignedTasksList.includes('t_address') || !parsedAssignedTasksList.length) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>4. العنوان السكني والوطني</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">المدينة / الحي:</label>
                      <input
                        type="text"
                        placeholder="مثال: الرياض - حي الصحافة"
                        value={taskAddressCity}
                        onChange={(e) => setTaskAddressCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">العنوان الوطني / رقم المبنى:</label>
                      <input
                        type="text"
                        placeholder="مثال: شارع العليا - مبنى 4022"
                        value={taskAddressDetails}
                        onChange={(e) => setTaskAddressDetails(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: WRITTEN REPLY & FILE ATTACHMENT */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-amber-400 text-xs flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  <span>5. إفادة الفرد المكتوبة وإرفاق المستندات الرسمية للقيادة</span>
                </h4>
                
                <div>
                  <label className="block text-slate-300 font-bold mb-1">إفادة الفرد أو الرد المكتوب:</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب أي ملاحظات أو إفادة بخصوص استكمال هذا الأمر الإداري..."
                    value={taskInstructionReply}
                    onChange={(e) => setTaskInstructionReply(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">إرفاق صورة / مستند رسمي (PDF أو صورة):</label>
                  <div className="flex items-center gap-3 bg-slate-900 p-2.5 border border-slate-800 rounded-xl">
                    <label className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      <span>اختيار الملف</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, false)}
                      />
                    </label>
                    <span className="text-slate-300 text-[11px] font-bold truncate">
                      {taskDocFileName || 'لم يتم إرفاق ملف حتى الآن'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnifiedDirectiveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingTask ? 'جاري الاعتماد...' : 'اعتماد وإرسال كافة متطلبات الأمر الإداري للقيادة'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL FOR DIRECT TASK EXECUTION --- */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-xl w-full my-8 p-6 space-y-6 shadow-2xl dir-rtl">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    إجراء مطلوب من القيادة
                  </span>
                  <h3 className="text-base font-black text-white mt-1">
                    {activeTaskModal === 'custom_instruction' 
                      ? 'تنفيذ التوجيه الإداري المباشر الصادر من القيادة' 
                      : (TASK_INFO_MAP[activeTaskModal]?.label || 'تنفيذ المهمة المطلوبة')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content per Task Type */}
            <form onSubmit={handleSaveTaskExecution} className="space-y-4 text-xs">
              
              {/* TASK TYPE: PHONE & WHATSAPP (t_phone) */}
              {activeTaskModal === 't_phone' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      يتوجب تزويد الإدارة برقم الهاتف المباشر الفعال والواتساب لاستقبال التنبيهات والبلاغات الرسمية العاجلة.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-amber-400" />
                      <span>رقم الجوال الشخصي المباشر:</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 0501234567"
                      value={taskPhone}
                      onChange={(e) => setTaskPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>رقم التواصل بالواتساب (WhatsApp):</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 0501234567"
                      value={taskWhatsapp}
                      onChange={(e) => setTaskWhatsapp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* TASK TYPE: EMERGENCY CONTACT (t_emergency) */}
              {activeTaskModal === 't_emergency' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      يرجى إدخال اسم وقرابة ورقم هاتف أقرب شخص يمكن التواصل معه فوراً في حالات الطوارئ.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>اسم شخص الطوارئ (الاسم الرباعي):</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد عبدالله علي"
                      value={taskEmergencyName}
                      onChange={(e) => setTaskEmergencyName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">صلة القرابة:</label>
                      <select
                        value={taskEmergencyRelation}
                        onChange={(e) => setTaskEmergencyRelation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-amber-500"
                      >
                        <option value="أب">أب</option>
                        <option value="أم">أم</option>
                        <option value="أخ">أخ</option>
                        <option value="أخت">أخت</option>
                        <option value="زوجة">زوجة</option>
                        <option value="ابن">ابن</option>
                        <option value="قريب">قريب / آخر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-amber-400" />
                        <span>رقم هاتف الطوارئ:</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="05xxxxxxxx"
                        value={taskEmergencyPhone}
                        onChange={(e) => setTaskEmergencyPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TASK TYPE: PHOTO UPLOAD (t_photo) */}
              {activeTaskModal === 't_photo' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      يرجى رفع صورة شخصية حديثة وواضحة بالزي العسكري المعتمد وبخلفية فاتحة.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-slate-950/70 border-2 border-dashed border-slate-800 rounded-2xl">
                    {taskPhotoUrl ? (
                      <div className="relative group flex flex-col items-center gap-2">
                        <img
                          src={taskPhotoUrl}
                          alt="معاينة الصورة"
                          className="w-28 h-28 object-cover rounded-2xl border-2 border-amber-500 shadow-xl"
                        />
                        <label className="cursor-pointer text-amber-400 font-bold text-xs flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-amber-500/50 hover:border-amber-400 transition-all">
                          <Camera className="w-4 h-4" />
                          <span>تغيير الصورة المرفقة</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, true)}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center text-center p-4">
                        <Camera className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                        <span className="text-xs font-black text-white">اضغط هنا لاختيار أو التقاط الصورة الشخصية</span>
                        <span className="text-[10px] text-slate-500 mt-1">صيغ الصور المسموحة: JPG, PNG, WEBP (الحد الأقصى 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* TASK TYPE: ADDRESS (t_address) */}
              {activeTaskModal === 't_address' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      يرجى استكمال بيانات العنوان السكني والعنوان الوطني للتواصل البريدي والإداري الرسمي.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span>المدينة / المنطقة السكنية:</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الرياض - حي الصحافة"
                      value={taskAddressCity}
                      onChange={(e) => setTaskAddressCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>تفاصيل الشارع ورقم المبنى / العنوان الوطني:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شارع العليا - مبنى 4022 - الرمز البريدي 12211"
                      value={taskAddressDetails}
                      onChange={(e) => setTaskAddressDetails(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* TASK TYPE: MEDICAL & BLOOD TYPE (t_medical) */}
              {activeTaskModal === 't_medical' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      تأكيد فصيلة الدم والملاحظات الطبية وإرفاق تقرير الفحص الطبي إن توفر.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span>فصيلة الدم المؤكدة:</span>
                    </label>
                    <select
                      value={taskBloodType}
                      onChange={(e) => setTaskBloodType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-black text-sm outline-none focus:border-amber-500"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ملاحظات طبية أو أمراض مزمنة (إن وجد):</label>
                    <textarea
                      rows={2}
                      placeholder="اكتب أي ملاحظات أو تقارير طبية..."
                      value={taskMedicalNotes}
                      onChange={(e) => setTaskMedicalNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-amber-400" />
                      <span>إرفاق صورة / ملف التقرير الطبي (اختياري):</span>
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950 p-3 border border-slate-800 rounded-xl">
                      <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 border border-slate-700">
                        <Upload className="w-4 h-4" />
                        <span>اختر الملف</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, false)}
                        />
                      </label>
                      <span className="text-slate-300 text-[11px] font-bold truncate">
                        {taskDocFileName || 'لم يتم اختيار ملف حتى الآن'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TASK TYPE: CUSTODY REVIEW (t_custody) */}
              {activeTaskModal === 't_custody' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <p className="leading-relaxed text-[11px]">
                      يرجى مراجعة وتأكيد كافة العهد العسكرية المسلمة بذمتك رسمياً.
                    </p>
                  </div>

                  {custodies.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {custodies.map((item) => (
                        <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-white text-xs">{(item as any).itemName || (item as any).item}</h5>
                            <p className="text-[10px] text-slate-400">الرقم التسلسلي: {(item as any).serialNumber || (item as any).serialNo || 'بدون'} | العدد: {item.quantity}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>معاين ومطابق</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">لا توجد عهد عسكرية مسجلة بملفك حالياً.</p>
                  )}

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-bold leading-relaxed flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 shrink-0 text-amber-400" />
                    <span>أقر وأتعهد بمعاينة واستلام جميع العهد المذكورة أعلاه وأنها بحالة تشغيلية جيدة.</span>
                  </div>
                </div>
              )}

              {/* TASK TYPE: CUSTOM MANAGER INSTRUCTION (custom_instruction) */}
              {activeTaskModal === 'custom_instruction' && (
                <div className="space-y-4">
                  <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-1.5">
                    <h5 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <span>التوجيه الصادر من القيادة:</span>
                    </h5>
                    <p className="text-xs text-slate-200 font-bold leading-relaxed whitespace-pre-wrap">
                      {managerInstructions || 'مطلوب استكمال المطلوب ورفع الوثائق للقيادة.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">إفادة / رد الفرد المكتوب:</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="اكتب هنا إفادتك أو التفاصيل المتعلقة بتنفيذ التوجيه..."
                      value={taskInstructionReply}
                      onChange={(e) => setTaskInstructionReply(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>إرفاق الوثيقة / المستند المطلوب رفعه للقيادة (PDF / صورة):</span>
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950 p-3 border border-slate-800 rounded-xl">
                      <label className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md transition-all">
                        <Paperclip className="w-4 h-4" />
                        <span>رفع الملف / الوثيقة</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, false)}
                        />
                      </label>
                      <span className="text-slate-200 text-[11px] font-bold truncate">
                        {taskDocFileName || 'لم يتم رفع ملف حتى الآن'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTaskModal(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingTask ? 'جاري الحفظ والتنفيذ...' : 'حفظ وتنفيذ الإجراء الآن'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- SALARY CERTIFICATE ISSUANCE MODAL --- */}
      {isSalaryCertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl dir-rtl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>إصدار شهادة / خطاب تعريف بالراتب</span>
              </h3>
              <button
                onClick={() => {
                  setIsSalaryCertModalOpen(false);
                  setSalaryCertGeneratedDoc(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!salaryCertGeneratedDoc ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSalaryCertGeneratedDoc({
                    certNumber: `DEF-SAL-${Math.floor(100000 + Math.random() * 900000)}`,
                    issueDate: new Date().toLocaleDateString('ar-SA'),
                    recipient: salaryCertTarget,
                    soldierName: soldier.fullName,
                    rank: soldier.rank,
                    militaryNumber: soldier.militaryNumber,
                    nationalId: soldier.nationalId || '1098822341',
                    totalSalary: '7,354.05'
                  });
                  triggerToast('تم توليد وثيقة التعريف بالراتب المعتمدة بنجاح 📄', 'success');
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الجهة الموجه إليها الخطاب:</label>
                  <select
                    value={salaryCertTarget}
                    onChange={(e) => setSalaryCertTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="إلى من يهمه الأمر (البنوك والجهات الحكومية)">إلى من يهمه الأمر (عام)</option>
                    <option value="مصرف الراجحي">مصرف الراجحي</option>
                    <option value="البنك الأهلي السعودي">البنك الأهلي السعودي (SNB)</option>
                    <option value="صندوق التنمية العقارية">صندوق التنمية العقارية</option>
                    <option value="وزارة الإسكان">وزارة الإسكان</option>
                    <option value="المحكمة العامة والجهات العدلية">المحكمة العامة والجهات العدلية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">تفاصيل إضافية / ملاحظات (اختياري):</label>
                  <input
                    type="text"
                    placeholder="مثال: بغرض التقديم على تمويل عقاري أو شراء سيارة..."
                    value={salaryCertNotes}
                    onChange={(e) => setSalaryCertNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-slate-400">
                  <p className="font-bold text-amber-400">معلومات الخطاب المولد:</p>
                  <p>• يتضمن اسم الفرد، الرتبة، الرقم العسكري، ورقم الهوية الوطنية.</p>
                  <p>• يتضمن صافي الراتب المستحق والبدلات الرسمية.</p>
                  <p>• يحتوي على رمز QR وتوقيع إلكتروني للتحقق الآلي.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSalaryCertModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>توليد وتوثيق الشهادة الآن</span>
                  </button>
                </div>
              </form>
            ) : (
              /* GENERATED CERTIFICATE PREVIEW */
              <div className="space-y-4">
                <div className="bg-white text-slate-950 p-6 rounded-2xl border-4 border-amber-500/50 space-y-4 shadow-2xl relative font-sans text-xs dir-rtl">
                  
                  {/* Top Letterhead */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                    <div>
                      <h4 className="font-black text-sm">المملكة العربية السعودية</h4>
                      <p className="font-bold text-[11px] text-slate-700">وزارة الدفاع • إدارة الشؤون المالية</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="text-left font-mono text-[10px]">
                      <p><strong>الرقم:</strong> {salaryCertGeneratedDoc.certNumber}</p>
                      <p><strong>التاريخ:</strong> {salaryCertGeneratedDoc.issueDate}</p>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center py-2 bg-slate-100 rounded-lg font-black text-sm border border-slate-300">
                    خطاب تعريف بالراتب والاستحقاقات المالية
                  </div>

                  {/* Recipient */}
                  <p className="font-bold text-slate-900">
                    سعادة / <span className="text-amber-700 font-black">{salaryCertGeneratedDoc.recipient}</span> المحترمين
                  </p>

                  <p className="leading-relaxed text-slate-800">
                    تشهد إدارة الشؤون المالية بأن الموضح بياناته أدناه:
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p><strong>الاسم:</strong> {salaryCertGeneratedDoc.soldierName}</p>
                    <p><strong>الرتبة:</strong> {salaryCertGeneratedDoc.rank}</p>
                    <p><strong>الرقم العسكري:</strong> <span className="font-mono">{salaryCertGeneratedDoc.militaryNumber}</span></p>
                    <p><strong>الهوية الوطنية:</strong> <span className="font-mono">{salaryCertGeneratedDoc.nationalId}</span></p>
                  </div>

                  <p className="leading-relaxed text-slate-800">
                    يعمل لدى القطاع العسكري ولا يزال على رأس العمل حتى تاريخه، وأن صافي راتبه الشهري الحالي يبلغ (<strong className="text-emerald-700 font-mono text-sm">{salaryCertGeneratedDoc.totalSalary} ريال سعودي</strong>). وقد أُعطي هذا الخطاب بناءً على طلبه دون تحمل الإدارة أي مسؤولية تجاه حقوق الغير.
                  </p>

                  {/* Official Seal & QR Verification */}
                  <div className="pt-4 border-t border-slate-300 flex items-center justify-between">
                    <div>
                      <p className="font-bold">مدير إدارة الشؤون المالية والإدارية</p>
                      <p className="text-[10px] text-slate-500">التوقيع والختم الإلكتروني المعتمد</p>
                    </div>

                    <div className="w-12 h-12 bg-slate-100 p-1 rounded border border-slate-400 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-slate-900" />
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSalaryCertGeneratedDoc(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                  >
                    تعديل البيانات
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الخطاب المعتمد</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- OFFICIAL MEMORANDUM & SURVEY FORM MODAL --- */}
      <OfficialMemoSurveyModal
        isOpen={isMemoModalOpen}
        onClose={() => setIsMemoModalOpen(false)}
        soldier={soldier}
        request={selectedMemoForFilling}
        unitName={unitName}
        onSubmitted={loadSoldierData}
      />

      {/* --- MOBILE FIXED BOTTOM NAVIGATION BAR --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 shadow-2xl backdrop-blur-lg px-2 py-1.5 flex items-center justify-around dir-rtl pb-safe">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'overview' ? 'text-amber-400 font-black' : 'text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('digital_id')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'digital_id' ? 'text-amber-400 font-black' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>الهوية</span>
        </button>

        <button
          onClick={() => setActiveTab('duty')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'duty' ? 'text-amber-400 font-black' : 'text-slate-400'
          }`}
        >
          <Navigation className="w-5 h-5 text-emerald-400" />
          <span>الخفارات</span>
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'financial' ? 'text-amber-400 font-black' : 'text-slate-400'
          }`}
        >
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>الرواتب</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer relative ${
            activeTab === 'requests' ? 'text-amber-400 font-black' : 'text-slate-400'
          }`}
        >
          <FileText className="w-5 h-5 text-purple-400" />
          <span>الطلبات</span>
          {actionRequests.length > 0 && (
            <span className="absolute top-1 right-2 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {actionRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Android Exit Toast & Modal for Soldier Portal */}
      <AndroidExitToast isVisible={showExitToast} />
      <AndroidExitConfirmModal
        isOpen={isExitConfirmModalOpen}
        onClose={() => setIsExitConfirmModalOpen(false)}
        onConfirmExit={onLogout}
      />

    </div>
  );
}
