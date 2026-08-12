import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  ShieldCheck, 
  FileText, 
  AlertCircle, 
  X, 
  Check, 
  ArrowRight,
  Eye,
  Sparkles,
  Phone,
  Calendar,
  Building,
  Award
} from 'lucide-react';
import { SoldierActionRequest, Soldier, Unit } from '../types';
import { triggerToast } from './ToastContainer';

interface SoldierRequestsReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: SoldierActionRequest[];
  soldiers: Soldier[];
  units: Unit[];
  onReviewRequest: (requestId: string, status: 'approved' | 'rejected', rejectionReason?: string) => Promise<void>;
}

export default function SoldierRequestsReviewModal({
  isOpen,
  onClose,
  requests,
  soldiers,
  units,
  onReviewRequest,
}: SoldierRequestsReviewModalProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<SoldierActionRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') {
      return r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review' || r.status === 'new';
    }
    return r.status === filterStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review' || r.status === 'new').length;

  const handleApprove = async (req: SoldierActionRequest) => {
    try {
      setIsSubmitting(true);
      await onReviewRequest(req.id, 'approved');
      triggerToast(`تمت الموافقة على طلب العسكري (${req.soldierName}) بنجاح واعتماد التعديلات.`, 'success');
      setSelectedRequest(null);
    } catch (err: any) {
      triggerToast('حدث خطأ أثناء اعتماد الطلب: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (req: SoldierActionRequest) => {
    try {
      setIsSubmitting(true);
      await onReviewRequest(req.id, 'rejected', rejectionReasonInput);
      triggerToast(`تم رفض طلب العسكري (${req.soldierName}).`, 'info');
      setSelectedRequest(null);
      setShowRejectForm(false);
      setRejectionReasonInput('');
    } catch (err: any) {
      triggerToast('حدث خطأ أثناء رفض الطلب: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get soldier details
  const getSoldier = (soldierId: string) => soldiers.find(s => s.id === soldierId);
  const getUnitName = (unitId?: string) => units.find(u => u.id === unitId)?.name || 'غير محدد';

  // Translation for field keys in proposedData
  const fieldLabels: Record<string, string> = {
    phoneNumber: 'رقم الهاتف والتواصل',
    emergencyContact: 'جهة الاتصال بالطوارئ',
    address: 'العنوان الوطني والتفصيلي',
    bloodType: 'فصيلة الدم',
    qualification: 'المؤهل العلمي والشهادات',
    specialization: 'التخصص العسكري / المهني',
    photoUrl: 'الصورة الشخصية الرسمية',
    birthDate: 'تاريخ الميلاد',
    nationalId: 'رقم الهوية الوطنية',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 font-sans dir-rtl" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-[96vw] max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        >
          {/* Mobile pull indicator */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white">مركز مراجعة وإعتماد طلبات وإجراءات الأفراد</h2>
                  {pendingCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded-full animate-pulse">
                      {pendingCount} معلق
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  معاينة تدقيق إجراءات وطلبات التعديل المقدمة من منسوبي القوة واتخاذ قرار الموافقة أو الرفض
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 px-3 rounded-2xl bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/80 font-extrabold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
              <span>إغلاق</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>قيد المراجعة والانتظار ({requests.filter(r => r.status === 'pending').length})</span>
              </button>

              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'approved'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>المقبولة والمعتمدة ({requests.filter(r => r.status === 'approved').length})</span>
              </button>

              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'rejected'
                    ? 'bg-red-500 text-white shadow-md shadow-red-950/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>المرفوضة ({requests.filter(r => r.status === 'rejected').length})</span>
              </button>

              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                جميع الطلبات ({requests.length})
              </button>
            </div>
          </div>

          {/* Modal Content Grid */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Main Column: Requests List */}
            <div className={`${selectedRequest ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3 transition-all`}>
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">لا توجد طلبات أو إجراءات مطابقة في هذا الفلتر</p>
                  <p className="text-slate-500 text-xs mt-1">عند قيام الفرد بإكمال إشعار أو تحديث ملفه الشخصي ستظهر الطلبات هنا فوراً.</p>
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const soldier = getSoldier(req.soldierId);
                  const isSelected = selectedRequest?.id === req.id;

                  return (
                    <motion.div
                      key={req.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowRejectForm(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected 
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-950/30' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 font-bold text-sm overflow-hidden">
                            {soldier?.photoUrl ? (
                              <img src={soldier.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                {req.soldierRank || soldier?.rank || 'عسكري'}
                              </span>
                              <h4 className="text-sm font-bold text-white">{req.soldierName}</h4>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>الرقم العسكري: {req.militaryNumber || soldier?.militaryNumber}</span>
                              <span>•</span>
                              <span>التشكيل: {getUnitName(req.unitId || soldier?.unitId)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {(req.status === 'pending' || req.status === 'submitted' || req.status === 'under_review' || req.status === 'new') && (
                            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {req.status === 'submitted' ? 'تم الإرسال - بانتظار الاعتماد' : 'معلق'}
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              مقبول
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-bold rounded-lg flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              مرفوض
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">{req.title}</span>
                        <span>{new Date(req.submittedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Right Column: Selected Request Preview & Action Panel */}
            {selectedRequest && (
              <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  {/* Title & Request Meta */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        تفاصيل وتدقيق الإجراء المقدم
                      </span>
                      <h3 className="text-base font-black text-white mt-2">{selectedRequest.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">تاريخ التقديم: {new Date(selectedRequest.submittedAt).toLocaleString('ar-EG')}</p>
                    </div>

                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="إغلاق المعاينة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Soldier Profile Card Header */}
                  <div className="mt-4 p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-300 font-bold">
                      {getSoldier(selectedRequest.soldierId)?.photoUrl ? (
                        <img src={getSoldier(selectedRequest.soldierId)?.photoUrl || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedRequest.soldierName}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="text-amber-300 font-semibold">{selectedRequest.soldierRank}</span>
                        <span>•</span>
                        <span>الرقم العسكري: {selectedRequest.militaryNumber}</span>
                        <span>•</span>
                        <span>التشكيل: {getUnitName(selectedRequest.unitId)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description / Soldier Notes */}
                  {selectedRequest.description && (
                    <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                      <p className="text-xs font-bold text-slate-300 mb-1">ملاحظات وسبب الطلب المكتوب من الفرد:</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{selectedRequest.description}</p>
                    </div>
                  )}

                  {/* Proposed Data Side-by-Side Comparison */}
                  <div className="mt-4">
                    <h4 className="text-xs font-black text-amber-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      معاينة مقارنة التعديلات الميدانية المرفوعة من الفرد:
                    </h4>

                    {selectedRequest.proposedData ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {Object.entries(
                          typeof selectedRequest.proposedData === 'string'
                            ? JSON.parse(selectedRequest.proposedData)
                            : selectedRequest.proposedData
                        ).map(([key, newValue]) => {
                          const currentSoldier = getSoldier(selectedRequest.soldierId);
                          const currentValue = currentSoldier ? (currentSoldier as any)[key] : '—';
                          const label = fieldLabels[key] || key;

                          return (
                            <div key={key} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5">
                              <span className="font-bold text-slate-200 block border-b border-slate-800/80 pb-1">
                                {label}
                              </span>
                              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                                  <span className="text-[10px] text-slate-500 font-semibold block">القيمة الحالية بالمنظومة:</span>
                                  <span className="text-slate-400 font-medium break-all">{currentValue || 'غير مسجل'}</span>
                                </div>
                                <div className="p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                                  <span className="text-[10px] text-emerald-400 font-semibold block">القيمة المطلوبة من الفرد:</span>
                                  <span className="text-emerald-200 font-bold break-all">{String(newValue) || '—'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-900 rounded-xl border border-slate-800">
                        هذا الطلب عبارة عن إجراء/استكمال عذر أو مهمة عامة بدون تغيير بيانات حقول حرة.
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'submitted' || selectedRequest.status === 'under_review' || selectedRequest.status === 'new') ? (
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    {!showRejectForm ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(selectedRequest)}
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>اعتماد قبول الطلب وتعديل سجل الفرد</span>
                        </button>

                        <button
                          onClick={() => setShowRejectForm(true)}
                          disabled={isSubmitting}
                          className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رفض الطلب</span>
                        </button>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
                        <label className="text-xs font-bold text-red-300 block">سبب الرفض الموجه للعسكري:</label>
                        <textarea
                          value={rejectionReasonInput}
                          onChange={(e) => setRejectionReasonInput(e.target.value)}
                          placeholder="اكتب أسباب عدم اعتماد الطلب ليصل العسكري إشعار بذلك..."
                          rows={2}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setShowRejectForm(false)}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleReject(selectedRequest)}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg"
                          >
                            تأكيد الرفض
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">حالة القرار النهائي:</span>
                    <span className={selectedRequest.status === 'approved' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {selectedRequest.status === 'approved' ? 'تمت الموافقة والاعتماد' : `تم الرفض (${selectedRequest.rejectionReason || 'بدون سبب مكتوب'})`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
