import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ShieldCheck, Activity, Plus, HeartPulse, 
  Calendar, Phone, MapPin, Award, ChevronUp, Paperclip, 
  Printer, Edit, ArrowLeftRight, AlertCircle, History, 
  Download, Trash2, User, RefreshCw, FileText, CheckCircle2, Upload,
  Lock, Check, Building, Camera, X, MessageSquare
} from 'lucide-react';
import { Soldier, SickLeave, AttendanceRecord, AuditLog, User as SystemUser, Unit } from '../types';
import { fetchWithRetry, safeJson } from '../lib/api';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import WhatsAppShareModal from './WhatsAppShareModal';

interface SoldierProfileProps {
  soldierId: string;
  currentUser: { id: string; name: string; role: string; unitId?: string | null };
  units: Unit[];
  onClose: () => void;
  onSoldierUpdated?: () => void;
  onOpenTransfer?: (soldier: Soldier) => void;
}

export default function SoldierProfile({ 
  soldierId, 
  currentUser, 
  units, 
  onClose,
  onSoldierUpdated,
  onOpenTransfer
}: SoldierProfileProps) {
  
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy loaded states per tab
  const [activeTab, setActiveTab] = useState<'personal' | 'military' | 'medical' | 'attendance' | 'timeline' | 'operational_history'>('personal');
  const [sickLeavesList, setSickLeavesList] = useState<SickLeave[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);
  
  const [loadingTab, setLoadingTab] = useState(false);

  // Modals inside Profile
  const [isSickLeaveModalOpen, setIsSickLeaveModalOpen] = useState(false);
  const [isGrantLeaveModalOpen, setIsGrantLeaveModalOpen] = useState(false);
  const [printableLeavePass, setPrintableLeavePass] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // New Grant Leave Form States
  const [leaveType, setLeaveType] = useState<'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'>('استحقاق');
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
  const isOfficer = soldier.rank.includes('عميد') || 
                    soldier.rank.includes('عقيد') || 
                    soldier.rank.includes('مقدم') || 
                    soldier.rank.includes('رائد') || 
                    soldier.rank.includes('نقيب') || 
                    soldier.rank.includes('ملازم');

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

      // 1. Post to leaves API
      const response = await fetchWithRetry(`/api/soldiers/${soldierId}/sick-leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          illnessType: leaveType,
          leaveType: leaveType,
          duration: finalDuration,
          doctorName: finalAuthority,
          grantingAuthority: finalAuthority,
          orderNumber: leaveOrderNumber || 'بدون أمر',
          orderDate: leaveOrderDate || leaveStartDate,
          reason: leaveReason || 'إجازة رسمية',
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

      // 2. Update soldier military status to "إجازة"
      await fetchWithRetry(`/api/soldiers/${soldierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...soldier,
          militaryStatus: 'إجازة'
        })
      });

      // 3. Register attendance code 'إ' for each day of leave
      const attendanceRecords = [];
      let curDate = new Date(leaveStartDate);
      const stopDate = new Date(leaveEndDate);
      while (curDate <= stopDate) {
        const dateStr = curDate.toISOString().split('T')[0];
        attendanceRecords.push({
          id: `att_${soldierId}_${dateStr}`,
          soldierId: soldierId,
          date: dateStr,
          statusCode: 'إ',
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
          title: `منح إجازة (${leaveType}) للمنسوب ${soldier?.rank} / ${soldier?.fullName}`,
          message: `تم منح إجازة (${leaveType}) برقم أمر (${leaveOrderNumber || 'غير محدد'}) لمدة ${finalDuration} أيام اعتباراً من ${leaveStartDate} إلى ${leaveEndDate} بقرار من (${finalAuthority}).`,
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
        leaveType,
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
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate mt-0.5">
              الرقم العسكري: <span className="font-mono text-emerald-400 tracking-wider">{soldier.militaryNumber}</span> • {soldierUnitName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            className="p-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl transition-all cursor-pointer border border-rose-500/20 min-h-[40px] flex items-center justify-center"
            title="إغلاق الشاشة"
          >
            <X className="w-4 h-4" />
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
                        {soldier.militaryStatus === 'على رأس العمل' || soldier.status === 'على رأس العمل' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            على رأس العمل
                          </span>
                        ) : soldier.militaryStatus === 'إجازة' || soldier.status === 'إجازة' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            إجازة رسمية
                          </span>
                        ) : soldier.militaryStatus === 'موقوف' || soldier.status === 'موقوف' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            موقوف
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400">
                            {soldier.militaryStatus || soldier.status || 'منقول'}
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
                          {soldier.phoneNumber || soldier.phone || '0540000000'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Tactical Quick Actions Panel (لوحة الأوامر والإجراءات السريعة للفرد) */}
                <div className="bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-2xl print:hidden shadow-lg">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span>لوحة الأوامر والإجراءات السريعة للفرد</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                      صلاحيات: {currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'commander' ? 'قائد وحدة' : 'ركن عمليات'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
                    
                    {/* Grant Leave Button (منح إجازة) */}
                    {currentUser.role !== 'operations' ? (
                      <button
                        onClick={() => setIsGrantLeaveModalOpen(true)}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                      >
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[11px] font-black text-slate-200 group-hover:text-emerald-300 leading-tight">منح إجازة</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1.5 opacity-40 text-center min-h-[70px]">
                        <div className="p-2 bg-slate-800 text-slate-500 rounded-lg">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 leading-tight">منح إجازة</span>
                      </div>
                    )}

                    {/* Medical Record Shortcut */}
                    <button
                      onClick={() => setActiveTab('medical')}
                      className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                    >
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <HeartPulse className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-slate-200 group-hover:text-emerald-300 leading-tight">السجل الطبي</span>
                    </button>

                    {/* Attendance Shortcut */}
                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                    >
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-slate-200 group-hover:text-indigo-300 leading-tight">التحضير والغياب</span>
                    </button>

                    {/* Transfer Soldier */}
                    {currentUser.role !== 'operations' && onOpenTransfer ? (
                      <button
                        onClick={() => onOpenTransfer(soldier)}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                      >
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                          <ArrowLeftRight className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black text-slate-200 group-hover:text-amber-300 leading-tight">نقل وتبعية</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1.5 opacity-40 text-center min-h-[70px]">
                        <div className="p-2 bg-slate-800 text-slate-500 rounded-lg">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 leading-tight">نقل وتبعية</span>
                      </div>
                    )}

                    {/* Edit Data */}
                    {currentUser.role !== 'operations' ? (
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                      >
                        <div className="p-2 bg-slate-800 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors">
                          <Edit className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-[11px] font-black text-slate-200 leading-tight">تعديل الملف</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 border border-slate-800/50 rounded-xl gap-1.5 opacity-40 text-center min-h-[70px]">
                        <div className="p-2 bg-slate-800 text-slate-500 rounded-lg">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 leading-tight">تعديل الملف</span>
                      </div>
                    )}

                    {/* Attachments */}
                    <button
                      onClick={() => setIsAttachmentModalOpen(true)}
                      className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl gap-1.5 transition-all group cursor-pointer text-center min-h-[70px] shadow-sm active:scale-95"
                    >
                      <div className="p-2 bg-slate-800 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors">
                        <Paperclip className="w-4 h-4 text-slate-300" />
                      </div>
                      <span className="text-[11px] font-black text-slate-200 leading-tight">مرفقات الخدمة</span>
                    </button>

                    {/* Print Sellsheet */}
                    <button
                      onClick={handlePrint}
                      className="flex flex-col items-center justify-center p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 rounded-xl gap-1.5 transition-all group cursor-pointer text-center col-span-2 sm:col-span-1 min-h-[70px] shadow-md shadow-amber-950/30 active:scale-95"
                    >
                      <div className="p-2 bg-slate-950/10 rounded-lg">
                        <Printer className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-[11px] font-black leading-tight">طباعة السجل</span>
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
                                            downloadElementAsPdf('printable-leave-pass', `نموذج_إجازة_${soldier.militaryNumber}_${leave.startDate}`);
                                          }, 250);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-purple-200 shadow-3xs"
                                        title="تنزيل نموذج الإجازة والأمر الإداري بصيغة PDF"
                                      >
                                        <Download className="w-3 h-3 text-purple-600" />
                                        <span>تحميل PDF</span>
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

            {/* TAB 4: Attendance & Discipline History */}
            {activeTab === 'attendance' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Attendance Analytics KPI */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 font-sans">
                    <p className="text-[11px] text-slate-400 font-black">نسبة الانضباط والحضور</p>
                    <h3 className={`text-2xl font-black ${attendanceRate >= 80 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {attendanceRate}%
                    </h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 font-sans">
                    <p className="text-[11px] text-slate-400 font-black">أيام الحضور (ح)</p>
                    <h3 className="text-2xl font-black text-slate-800">{presentDays}</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 font-sans">
                    <p className="text-[11px] text-slate-400 font-black">أيام الغياب (غ)</p>
                    <h3 className="text-2xl font-black text-rose-600">{absentDays}</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 font-sans">
                    <p className="text-[11px] text-slate-400 font-black">المأموريات والمهام (م)</p>
                    <h3 className="text-2xl font-black text-indigo-700">{dutyDays}</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 font-sans col-span-2 md:col-span-1">
                    <p className="text-[11px] text-slate-400 font-black">إجمالي السجلات المدخلة</p>
                    <h3 className="text-2xl font-black text-slate-500">{totalDays} أيام</h3>
                  </div>
                </div>

                {/* Historical records list */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Calendar className="w-4 h-4 text-emerald-800" />
                    <h5 className="text-xs font-black text-slate-800">بيانات كشف الحضور التفصيلي اليومي</h5>
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
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[300px] overflow-y-auto">
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
                              statusText = 'غياب بعذر معتمد';
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

            {/* TAB 5: Timeline of Procedures (السجل الزمني للإجراءات) */}
            {activeTab === 'timeline' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-2 print:hidden">
                  <History className="w-4 h-4 text-emerald-800" />
                  <h5 className="text-xs font-black text-slate-800">التدقيق الزمني لإجراءات وتعديلات ملف الفرد</h5>
                </div>

                {loadingTab ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold font-sans">
                    <RefreshCw className="w-5 h-5 text-emerald-800 animate-spin mx-auto mb-2" />
                    جاري تتبع وحساب السجل التاريخي للعمليات...
                  </div>
                ) : auditLogsList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold font-sans">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    لا توجد تعديلات عسكرية أو إجراءات مدونة في هذا الملف مسبقاً.
                  </div>
                ) : (
                  <div className="relative pr-6 border-r-2 border-slate-200 space-y-6 font-sans">
                    {auditLogsList.map((log, index) => (
                      <div key={log.id} className="relative space-y-1.5">
                        {/* Timeline Node Icon/Dot */}
                        <div className="absolute -right-[31px] top-1 bg-white p-1 rounded-full border-2 border-emerald-700">
                          <Check className="w-3 h-3 text-emerald-800" />
                        </div>
                        
                        <div className="text-[10px] text-slate-400 font-mono font-bold">
                          {new Date(log.timestamp).toLocaleString('ar-EG')}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl max-w-2xl">
                          <div className="flex justify-between items-start">
                            <h6 className="font-extrabold text-xs text-slate-800">{log.actionType} {log.tableName === 'soldiers' ? 'ملف الفرد' : log.tableName}</h6>
                            <span className="text-[10px] bg-slate-200/60 px-2 py-0.5 rounded-md font-bold text-slate-600">
                              رصد بواسطة: {log.userName} ({log.userRole})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 font-bold leading-relaxed">{log.details}</p>
                        </div>
                      </div>
                    ))}
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
            <div className="bg-slate-900 text-white p-4 font-bold text-xs flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>معاينة وتأكيد طباعة نموذج إجازة رسمية</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة التصريح</span>
                </button>
                <button
                  onClick={() => downloadElementAsPdf('printable-leave-pass', `تصريح_إجازة_${soldier.militaryNumber}_${printableLeavePass.startDate}`)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل PDF</span>
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
            <div className="p-8 space-y-5 text-slate-800 font-sans print:p-6" id="printable-leave-pass">
              {/* Document Military Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                <div className="text-right text-xs font-black space-y-0.5">
                  <p className="text-slate-900">المملكة العربية السعودية</p>
                  <p className="text-slate-800">وزارة الدفاع - القيادة العامة</p>
                  <p className="text-emerald-800 font-extrabold">{soldierUnitName || 'كتيبة المشاة الآلية الثانية'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">مرجع: {printableLeavePass.orderNumber || printableLeavePass.id}</p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 rounded-full flex items-center justify-center mx-auto mb-1">
                    <ShieldCheck className="w-8 h-8 text-slate-900" />
                  </div>
                  <span className="text-[9px] bg-rose-100 text-rose-900 font-black px-2 py-0.5 rounded border border-rose-300">
                    سـرّي ومـحـدود
                  </span>
                </div>
                <div className="text-left text-xs font-black space-y-0.5 font-mono">
                  <p>التاريخ: {printableLeavePass.orderDate || new Date().toISOString().split('T')[0]}</p>
                  <p>الصفحات: 01 / 01</p>
                  <p className="text-[10px] text-slate-500">الرمز: LVE-PASS-SA</p>
                </div>
              </div>

              {/* Form Title */}
              <div className="text-center bg-slate-100 border border-slate-300 p-3 rounded-xl">
                <h3 className="text-base font-black text-slate-900">تصريح ونموذج إجازة رسمية</h3>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  نوع الإجازة: <span className="font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">{printableLeavePass.leaveType || printableLeavePass.illnessType || 'إجازة رسمية'}</span>
                </p>
              </div>

              {/* Soldier Info Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-900 text-white font-black p-2 text-right">
                  أولاً: بيانات صاحب التصريح (الفرد)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 font-sans">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الاسم الكامل:</span>
                    <span className="font-black text-slate-900">{soldier.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الرتبة العسكرية:</span>
                    <span className="font-black text-slate-900">{soldier.rank}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الرقم العسكري:</span>
                    <span className="font-mono font-black text-slate-900">{soldier.militaryNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الهوية الوطنية:</span>
                    <span className="font-mono font-black text-slate-900">{soldier.nationalId || 'غير مدون'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الوحدة والتشكيل:</span>
                    <span className="font-black text-slate-900">{soldierUnitName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">السرية / الفصيلة:</span>
                    <span className="font-black text-slate-900">{soldier.company || 'السرية الأولى'} - {soldier.platoon || 'الفصيلة الأولى'}</span>
                  </div>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-900 text-white font-black p-2 text-right">
                  ثانياً: تفاصيل مدة الإجازة والجهة المانحة
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-white font-sans">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ بداية الإجازة:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ نهاية الإجازة:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">عدد الأيام المعتمدة:</span>
                    <span className="font-black text-emerald-800 text-sm">{printableLeavePass.duration} أيام</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">الجهة المانحة للإجازة:</span>
                    <span className="font-black text-slate-900">{printableLeavePass.grantingAuthority || printableLeavePass.doctorName || 'الكتيبة'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">رقم الأمر الإداري:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderNumber || 'بدون رقم أمر'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">تاريخ الأمر:</span>
                    <span className="font-mono font-black text-slate-900">{printableLeavePass.orderDate || printableLeavePass.startDate}</span>
                  </div>
                  {printableLeavePass.reason && (
                    <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-bold block text-[10px]">سبب ومبررات الإجازة:</span>
                      <span className="font-bold text-slate-800">{printableLeavePass.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Warnings */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1 font-bold">
                <p className="font-black">📌 تعليمات الانضباط العسكري والعودة:</p>
                <p>• يتوجب على الفرد التواجد في مقر وحدته في تمام الساعة 06:00 صباحاً من اليوم التالي لتاريخ انتهاء الإجازة.</p>
                <p>• أي تأخر غير مبرر يخضع الفرد لمساءلة انضباطية وفق قانون الخدمة العسكرية.</p>
              </div>

              {/* Signatures & Seal Block */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 text-center text-xs font-bold">
                <div className="space-y-5">
                  <p className="text-slate-600">ركن القوة البشرية</p>
                  <p className="font-black text-slate-800">التوقيع: .....................</p>
                </div>
                <div className="space-y-5">
                  <p className="text-slate-600">ركن العمليات</p>
                  <p className="font-black text-slate-800">التوقيع: .....................</p>
                </div>
                <div className="space-y-5">
                  <p className="text-slate-600">اعتماد قائد الكتيبة / التشكيل</p>
                  <p className="font-black text-slate-800">الختم والتوقيع: .....................</p>
                </div>
              </div>

            </div>

            {/* Footer Modal Actions */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex justify-between items-center print:hidden">
              <span className="text-xs text-slate-500 font-bold">يمكنك طباعة هذا النموذج أو حفظه كملف PDF لتوثيق الإجازة.</span>
              <button
                onClick={() => setPrintableLeavePass(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                إغلاق المعاينة
              </button>
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
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div className="space-y-0.5 text-slate-500 font-bold text-[10px]">
                    <p>الرقم المرجعي: {selectedTransfer.id.toUpperCase()}</p>
                    <p>التصنيف: سري جداً // داخلي</p>
                  </div>
                  <div className="text-center">
                    <h4 className="font-black text-slate-900 text-xs">شؤون القوة والملاك العسكري</h4>
                    <p className="text-[10px] text-emerald-800 font-bold mt-0.5">قرار إداري نقل عسكري</p>
                  </div>
                  <div className="text-left text-slate-500 font-bold text-[10px]">
                    <p>تاريخ الأمر: {selectedTransfer.orderDate}</p>
                    <p>الجهة: {selectedTransfer.issuedBy}</p>
                  </div>
                </div>

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

                {/* Footer seal mockup */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-150 font-sans">
                  <div className="text-center font-bold text-[10px] text-slate-400">
                    <p>نظام التموضع والهيكلة الإلكتروني</p>
                    <p className="font-mono text-[8px] uppercase mt-0.5">VERIFIED RECORD ID: {selectedTransfer.id}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold block">
                      ختم إلكتروني معتمد
                    </span>
                    <p className="text-[9px] text-slate-400 font-sans">تاريخ رصد المعاملة: {selectedTransfer.date}</p>
                  </div>
                </div>
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

      {/* WhatsApp Custom Share Modal */}
      <WhatsAppShareModal
        soldier={soldier}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        units={units}
        attendanceRecords={attendanceHistory}
      />

      </div>
    </div>
  );
}
