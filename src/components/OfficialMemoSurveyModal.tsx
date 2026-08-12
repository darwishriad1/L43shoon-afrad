import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  X, 
  Upload, 
  User, 
  Phone, 
  MapPin, 
  UserCheck, 
  Camera, 
  Award, 
  Clock, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  Lock, 
  Building, 
  Check,
  Paperclip,
  PenTool
} from 'lucide-react';
import { Soldier, SoldierActionRequest } from '../types';
import { fetchWithRetry } from '../lib/api';
import { triggerToast } from './ToastContainer';

interface OfficialMemoSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  soldier: Soldier;
  request: SoldierActionRequest | null;
  unitName?: string;
  onSubmitted: () => void;
}

export default function OfficialMemoSurveyModal({
  isOpen,
  onClose,
  soldier,
  request,
  unitName = 'الكتيبة الرئيسية',
  onSubmitted,
}: OfficialMemoSurveyModalProps) {
  // Form state
  const [phoneNumber, setPhoneNumber] = useState(soldier.phoneNumber || '');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState(soldier.emergencyContact || '');
  const [emergencyRelation, setEmergencyRelation] = useState('أب');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [cityAddress, setCityAddress] = useState(soldier.address?.split('-')?.[0]?.trim() || soldier.address || '');
  const [detailAddress, setDetailAddress] = useState(soldier.address?.split('-')?.[1]?.trim() || '');
  const [bloodType, setBloodType] = useState(soldier.bloodType || 'O+');
  const [medicalNotes, setMedicalNotes] = useState(soldier.medicalHistory || '');
  const [qualification, setQualification] = useState(soldier.qualification || '');
  const [specialization, setSpecialization] = useState(soldier.specialization || '');
  const [photoUrl, setPhotoUrl] = useState(soldier.photoUrl || '');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [soldierNotesReply, setSoldierNotesReply] = useState('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values when request changes
  useEffect(() => {
    if (soldier) {
      setPhoneNumber(soldier.phoneNumber || '');
      setEmergencyName(soldier.emergencyContact || '');
      setCityAddress(soldier.address || '');
      setBloodType(soldier.bloodType || 'O+');
      setMedicalNotes(soldier.medicalHistory || '');
      setQualification(soldier.qualification || '');
      setSpecialization(soldier.specialization || '');
      setPhotoUrl(soldier.photoUrl || '');
    }

    if (request && request.proposedData) {
      try {
        const data = typeof request.proposedData === 'string' ? JSON.parse(request.proposedData) : request.proposedData;
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (data.emergencyContact) setEmergencyName(data.emergencyContact);
        if (data.address) setCityAddress(data.address);
        if (data.bloodType) setBloodType(data.bloodType);
        if (data.medicalHistory) setMedicalNotes(data.medicalHistory);
        if (data.qualification) setQualification(data.qualification);
        if (data.specialization) setSpecialization(data.specialization);
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
      } catch (e) {
        // ignore parse error
      }
    }
    if (request?.description) {
      setSoldierNotesReply(request.description);
    }
  }, [soldier, request]);

  if (!isOpen) return null;

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
      triggerToast('حجم الملف كبير جداً (الأقصى 5 ميجابايت)', 'warning');
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      if (isPhoto) {
        setPhotoUrl(base64);
        triggerToast('تم رفع الصورة الشخصية الرسمية بنجاح 📷', 'success');
      } else {
        setAttachmentName(file.name);
        setAttachmentBase64(base64);
        triggerToast(`تم إرفاق المستند (${file.name}) بنجاح 📎`, 'success');
      }
    } catch (err) {
      triggerToast('حدث خطأ أثناء تحميل الملف', 'error');
    }
  };

  const handleSubmitOfficialMemo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureConfirmed) {
      triggerToast('يرجى الموافقة والتأكيد على الإقرار العسكري والتوقيع الإلكتروني أولاً', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullAddress = detailAddress ? `${cityAddress} - ${detailAddress}` : cityAddress;
      const fullPhone = whatsappNumber ? `${phoneNumber} (واتساب: ${whatsappNumber})` : phoneNumber;
      const emergencyInfo = emergencyName ? `${emergencyName} (${emergencyRelation}) - هاتف: ${emergencyPhone || 'غير مدون'}` : soldier.emergencyContact;

      const proposedDataObj: Record<string, any> = {
        phoneNumber: fullPhone,
        emergencyContact: emergencyInfo,
        address: fullAddress,
        bloodType: bloodType,
        medicalHistory: medicalNotes,
        qualification: qualification,
        specialization: specialization,
      };

      if (photoUrl) proposedDataObj.photoUrl = photoUrl;

      let attachmentsList: any[] = [];
      if (attachmentBase64) {
        attachmentsList.push({
          id: `doc_${Date.now()}`,
          name: attachmentName || 'مستند مرفق بناءً على المذكرة الرسمية',
          data: attachmentBase64,
          uploadedAt: new Date().toISOString()
        });
      }

      const memoTitle = request?.title || 'تعبئة استبيان ومذكرة بيانات الخدمة العسكرية الرسمية';
      const requestId = request?.id || `req_memo_${Date.now()}`;

      // Submit or Update the action request with status = 'submitted'
      await fetchWithRetry(`/api/action-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldierId: soldier.id,
          soldierName: soldier.fullName,
          soldierRank: soldier.rank,
          militaryNumber: soldier.militaryNumber,
          unitId: soldier.unitId,
          requestType: request?.requestType || 'survey',
          title: memoTitle,
          description: soldierNotesReply || 'قام الفرد بتعبئة النموذج والاستبيان وتوثيق توقيعه الإلكتروني بنجاح',
          proposedData: proposedDataObj,
          attachments: attachmentsList.length > 0 ? attachmentsList : null,
          status: 'submitted'
        })
      });

      // Also create a direct notification for management/command
      await fetchWithRetry('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `notif_sub_${Date.now()}`,
          title: `استلام استبيان ومذكرة موقعة من الفرد: (${soldier.rank} / ${soldier.fullName})`,
          message: `قام الفرد بتعبئة المذكرة الرسمية (${memoTitle}) وتوثيق البيانات والتوقيع الإلكتروني. الطلب الآن بانتظار الاعتماد الإداري.`,
          isRead: false,
          type: 'info',
          createdAt: new Date().toISOString()
        })
      });

      triggerToast('تم توقيع وتوثيق الاستبيان والمذكرة الرسمية وإرسالها بنجاح للقيادة، وهي الآن قيد المراجعة والتدقيق الإداري 🟢', 'success');
      onSubmitted();
      onClose();
    } catch (err: any) {
      console.error("Failed to submit official memo:", err);
      triggerToast('حدث خطأ أثناء إرسال المذكرة: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refNumber = request?.id ? `MEM-2026-${request.id.slice(-5).toUpperCase()}` : `MEM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const formattedToday = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto font-sans dir-rtl" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-[96vw] max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        >
          {/* Mobile pull indicator */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

          {/* Top Bar / Controls */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>مذكرة رسمية: {refNumber}</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-md hidden sm:inline-block">
                مصنفة عسكرياً: سري وعاجل
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                title="طباعة المذكرة"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">طباعة / حفظ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 px-3 rounded-2xl bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/80 font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>

          {/* MAIN FORM PAPER BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-slate-900 text-slate-100">
            
            {/* OFFICIAL FORMAL HEADER SHEET */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
              
              {/* Header Stamp Background */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 opacity-80" />

              <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-b border-slate-800 pb-6 text-center md:text-right">
                {/* Right Header Info */}
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-white text-sm">المملكة العربية السعودية</h4>
                  <p className="text-slate-300 font-bold">وزارة الدفاع / القوات المسلحة</p>
                  <p className="text-slate-400 text-[11px]">قيادة الوحدة والسيطرة - شؤون الأفراد</p>
                </div>

                {/* Center Emblem / Crest */}
                <div className="flex flex-col items-center justify-center space-y-1 text-center">
                  <div className="w-14 h-14 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase mt-1">
                    المكتب الإداري الموحد
                  </span>
                </div>

                {/* Left Document Meta */}
                <div className="space-y-1.5 text-xs md:text-left text-slate-300">
                  <p><span className="text-slate-500">رقم القيد:</span> <strong className="font-mono text-amber-400">{refNumber}</strong></p>
                  <p><span className="text-slate-500">تاريخ الإصدار:</span> <strong className="font-mono text-slate-200">{formattedToday}</strong></p>
                  <p><span className="text-slate-500">الحالة الإدارية:</span> <strong className="text-emerald-400 font-bold">نموذج رسمي بانتظار الاعتماد</strong></p>
                </div>
              </div>

              {/* RECIPIENT & COMMANDER SUBJECT BOX */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">صادرة من الجهة القيادية:</span>
                    <strong className="text-amber-400 font-black text-xs flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>شؤون الأفراد والسيطرة - {unitName}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">موجهة إلى الفرد العسكري:</span>
                    <strong className="text-white font-black text-xs flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{soldier.rank} / {soldier.fullName} (رقم عسكري: {soldier.militaryNumber})</span>
                    </strong>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>موضوع المذكرة / الاستبيان المطلوب:</span>
                  </h4>
                  <p className="text-sm font-black text-white bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {request?.title || 'استبيان تحديث البيانات الشخصية وتوثيق ملف الخدمة العسكرية'}
                  </p>
                  {request?.description && (
                    <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl">
                      <strong className="text-amber-400 block mb-1">توجيه القائد / المدير المباشر:</strong>
                      <span>{request.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* FORM SECTIONS */}
              <form onSubmit={handleSubmitOfficialMemo} className="space-y-6 text-xs">
                
                {/* SECTION 1: PHONE & CONTACT */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>أولاً: بيانات وسائط الاتصال والجوال المباشر والواتساب</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم الهاتف الشخصي المباشر:</label>
                      <input
                        type="text"
                        required
                        placeholder="05xxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رقم الواتساب لاستقبال التنبيهات:</label>
                      <input
                        type="text"
                        placeholder="05xxxxxxxx"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: EMERGENCY CONTACT */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>ثانياً: بيانات جهة اتصالات الطوارئ المعتمدة</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-slate-300 font-bold mb-1">اسم قريب الطوارئ (رباعي):</label>
                      <input
                        type="text"
                        placeholder="اسم القريب الرباعي"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">صلة القرابة:</label>
                      <select
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-xs outline-none focus:border-amber-500"
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
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ADDRESS & MEDICAL */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>ثالثاً: العنوان السكني والوطني وفصيلة الدم</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">المدينة / الحي:</label>
                      <input
                        type="text"
                        placeholder="الرياض - حي الصحافة"
                        value={cityAddress}
                        onChange={(e) => setCityAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">العنوان الوطني التفصيلي:</label>
                      <input
                        type="text"
                        placeholder="شارع العليا - مبنى 4022"
                        value={detailAddress}
                        onChange={(e) => setDetailAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">فصيلة الدم:</label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-black text-xs outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ملاحظات أو قيود طبية (إن وجدت):</label>
                    <input
                      type="text"
                      placeholder="اكتب أية ملاحظات صحية أو حساسيات أو قيود لياقية مسجلة..."
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* SECTION 4: PHOTO & ATTACHMENTS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>رابعاً: رفع الصورة الشخصية والمستندات والشهادات الرسمية</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Photo Uploader */}
                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="الصورة"
                          className="w-16 h-16 object-cover rounded-xl border-2 border-amber-500 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                          <User className="w-7 h-7" />
                        </div>
                      )}
                      <div className="space-y-1.5 w-full">
                        <span className="text-slate-200 font-bold block">الصورة الشخصية العسكرية</span>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/40 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع / التقاط صورة</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, true)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* File Attachment */}
                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-2">
                      <span className="text-slate-200 font-bold block">إرفاق مستند رسمي / شهادة (PDF أو صورة)</span>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>اختيار ملف</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, false)}
                          />
                        </label>
                        <span className="text-slate-400 text-[11px] truncate">
                          {attachmentName || 'لم يتم إرفاق ملف إضافي'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: WRITTEN STATEMENT REPLY */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="font-black text-amber-400 text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <PenTool className="w-4 h-4 text-amber-400" />
                    <span>خامساً: إفادة وملاحظات الفرد العسكري المكتوبة</span>
                  </h4>

                  <textarea
                    rows={3}
                    placeholder="اكتب هنا إفادتك أو أية إجابات وملاحظات بخصوص موضوع هذا الاستبيان..."
                    value={soldierNotesReply}
                    onChange={(e) => setSoldierNotesReply(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                {/* OFFICIAL DECLARATION & ELECTRONIC SIGNATURE BLOCK */}
                <div className="bg-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="soldierDecl"
                      checked={signatureConfirmed}
                      onChange={(e) => setSignatureConfirmed(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                    <label htmlFor="soldierDecl" className="text-xs text-slate-200 font-bold leading-relaxed cursor-pointer select-none">
                      <strong className="text-amber-400 block mb-0.5">الإقرار والاعتماد العسكري الرسمي:</strong>
                      أقر أنا الفرد <strong className="text-white">{soldier.rank} / {soldier.fullName}</strong> صاحب الرقم العسكري (<strong className="text-amber-300 font-mono">{soldier.militaryNumber}</strong>)، بصحة كافة البيانات والشهادات والمرفقات المدونة بهذه المذكرة، وأتعهد بتحمل المسؤولية العسكرية والإدارية الكاملة عن دقتها.
                    </label>
                  </div>

                  {signatureConfirmed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تم توثيق التوقيع الإلكتروني بتاريخ: {formattedToday}</span>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-950 px-2.5 py-1 rounded border border-amber-500/30">
                        SIG-{soldier.militaryNumber}-{Date.now().toString().slice(-6)}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* SUBMISSION FOOTER */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer min-h-[48px]"
                  >
                    إلغاء وإغلاق ✕
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !signatureConfirmed}
                    className="w-full sm:flex-1 py-3.5 px-7 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? 'جاري الاعتماد وتوثيق التوقيع...' : 'توقيع واعتماد الاستبيان وإرساله للقيادة'}</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
