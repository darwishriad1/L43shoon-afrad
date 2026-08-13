import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserCheck, 
  KeyRound, 
  CheckSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Sparkles, 
  Upload, 
  Phone, 
  MapPin, 
  FileText, 
  User, 
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  Plus
} from 'lucide-react';
import { Soldier, SoldierActionRequest } from '../types';
import { triggerToast } from './ToastContainer';

interface SoldierAccountTasksTabProps {
  soldier: Soldier;
  currentUser: { id: string; name: string; role: string };
  onAccountUpdated: () => void;
}

const PRESET_TASKS = [
  { id: 't_phone', label: 'تحديث رقم الهاتف الخاص ورقم التواصل بالواتساب' },
  { id: 't_emergency', label: 'إدخال بيانات أقرب قري أو جهة الاتصال في حالة الطوارئ' },
  { id: 't_photo', label: 'إرفاق الصورة الشخصية بالزي العسكري الرسمي' },
  { id: 't_address', label: 'تأكيد العنوان الوطني والتفصيلي بالسكن الحلي' },
  { id: 't_medical', label: 'تحديث فصيلة الدم والشهادات الطبية الرسمية' },
  { id: 't_custody', label: 'معاينة وتأكيد كشف العهد والأمانات المسلمة' },
];

export default function SoldierAccountTasksTab({
  soldier,
  currentUser,
  onAccountUpdated
}: SoldierAccountTasksTabProps) {
  const isManager = currentUser.role !== 'soldier';

  // Manager Account Config State
  const [hasAccount, setHasAccount] = useState<boolean>(soldier.hasAccount || false);
  const [username, setUsername] = useState<string>(soldier.accountUsername || soldier.militaryNumber || '');
  const [password, setPassword] = useState<string>('');
  const [allowProfileEdit, setAllowProfileEdit] = useState<boolean>(soldier.allowProfileEdit !== false);

  // Sync state when soldier prop changes
  React.useEffect(() => {
    setHasAccount(soldier.hasAccount || false);
    setUsername(soldier.accountUsername || soldier.militaryNumber || '');
    setPassword('');
    setAllowProfileEdit(soldier.allowProfileEdit !== false);
    setUpdatedPhone(soldier.phoneNumber || '');
    setUpdatedEmergency(soldier.emergencyContact || '');
    setUpdatedAddress(soldier.address || '');
    setUpdatedBloodType(soldier.bloodType || '');
    setUpdatedPhotoUrl(soldier.photoUrl || '');
    try {
      if (soldier.assignedTasks) {
        const parsed = JSON.parse(soldier.assignedTasks);
        if (Array.isArray(parsed.tasks)) setSelectedTasks(parsed.tasks);
        if (parsed.instructions) setCustomInstructions(parsed.instructions);
      }
    } catch (e) {}
  }, [soldier]);
  
  // Tasks state
  const [selectedTasks, setSelectedTasks] = useState<string[]>(() => {
    try {
      if (soldier.assignedTasks) {
        const parsed = JSON.parse(soldier.assignedTasks);
        if (Array.isArray(parsed.tasks)) return parsed.tasks;
      }
    } catch (e) {}
    return ['t_phone', 't_emergency', 't_photo'];
  });
  const [customInstructions, setCustomInstructions] = useState<string>(() => {
    try {
      if (soldier.assignedTasks) {
        const parsed = JSON.parse(soldier.assignedTasks);
        return parsed.instructions || '';
      }
    } catch (e) {}
    return '';
  });

  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Soldier Submission State
  const [requestsHistory, setRequestsHistory] = useState<SoldierActionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Request Form
  const [requestTitle, setRequestTitle] = useState('تحديث بيانات التواصل والصورة الشخصية');
  const [requestDesc, setRequestDesc] = useState('');
  const [updatedPhone, setUpdatedPhone] = useState(soldier.phoneNumber || '');
  const [updatedEmergency, setUpdatedEmergency] = useState(soldier.emergencyContact || '');
  const [updatedAddress, setUpdatedAddress] = useState(soldier.address || '');
  const [updatedBloodType, setUpdatedBloodType] = useState(soldier.bloodType || 'O+');
  const [updatedPhotoUrl, setUpdatedPhotoUrl] = useState(soldier.photoUrl || '');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Load request history for this soldier
  const fetchRequestsHistory = async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch('/api/soldier-requests');
      if (res.ok) {
        const data = await res.json();
        const soldierReqs = data.filter((r: SoldierActionRequest) => r.soldierId === soldier.id);
        setRequestsHistory(soldierReqs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequestsHistory();
  }, [soldier.id]);

  // Handle Manager Saving Account Settings
  const handleSaveAccountSettings = async () => {
    try {
      setIsSavingAccount(true);
      const payload = {
        hasAccount,
        username: username.trim() || soldier.militaryNumber,
        password: password.trim(),
        allowProfileEdit,
        assignedTasks: {
          tasks: selectedTasks,
          instructions: customInstructions.trim()
        }
      };

      const res = await fetch(`/api/soldiers/${soldier.id}/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('فشل حفظ إعدادات حساب العسكري');

      triggerToast('تم حفظ إعدادات الحساب والمهام الموكلة بنجاح 🟢', 'success');
      onAccountUpdated();
    } catch (err: any) {
      triggerToast('خطأ أثناء حفظ الحساب: ' + err.message, 'error');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Handle Soldier Photo Upload Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerToast('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUpdatedPhotoUrl(reader.result as string);
      triggerToast('تم رفع الصورة بنجاح وتجهيزها للإرسال', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Handle Soldier Submitting Action Request to Manager
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim()) {
      triggerToast('يرجى كتابة عنوان الطلب الإجراء', 'warning');
      return;
    }

    try {
      setIsSubmittingRequest(true);

      const proposedData: Record<string, any> = {};
      if (updatedPhone !== soldier.phoneNumber) proposedData.phoneNumber = updatedPhone;
      if (updatedEmergency !== soldier.emergencyContact) proposedData.emergencyContact = updatedEmergency;
      if (updatedAddress !== soldier.address) proposedData.address = updatedAddress;
      if (updatedBloodType !== soldier.bloodType) proposedData.bloodType = updatedBloodType;
      if (updatedPhotoUrl && updatedPhotoUrl !== soldier.photoUrl) proposedData.photoUrl = updatedPhotoUrl;

      const payload = {
        soldierId: soldier.id,
        soldierName: soldier.fullName,
        soldierRank: soldier.rank,
        militaryNumber: soldier.militaryNumber,
        unitId: soldier.unitId,
        requestType: 'update_profile',
        title: requestTitle.trim(),
        description: requestDesc.trim(),
        proposedData,
        status: 'pending'
      };

      const res = await fetch('/api/soldier-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('فشل إرسال الإجراء للمدير');

      triggerToast('تم إرسال طلب الإجراء بنجاح وإشعار القائد للمراجعة والاعتماد 📤', 'success');
      setRequestDesc('');
      fetchRequestsHistory();
    } catch (err: any) {
      triggerToast('حدث خطأ أثناء الإرسال: ' + err.message, 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const toggleTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(t => t !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans dir-rtl" dir="rtl">
      
      {/* Top Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 border border-sky-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">إدارة حساب الفرد والمهام الميدانية المعتمدة</h3>
              {soldier.hasAccount ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  حساب مفعل
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold rounded-lg">
                  حساب معطل
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isManager 
                ? 'إمكانية تفعيل حساب العسكري للدخول واستعراض ملفه الشخصي فقط دون صلاحية التعديل المباشر، وتحديد الإجراءات والمهام الموجهة له.'
                : 'استعراض المهام الموجهة إليك من قيادة الوحدة، ورفع طلبات التعديل والإجراءات ليتم معاينتها والموافقة عليها من قبل المدير.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: MANAGER ACCOUNT & TASK SETTINGS PANEL */}
      {isManager && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-black text-white">إعدادات تفعيل الدخول وبيانات الحساب العسكري</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Account Toggle Switch */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">تفعيل حساب الدخول بالتطبيق</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">يسمح للعسكري بالدخول ورؤية ملفه الشامل</span>
              </div>
              <button
                type="button"
                onClick={() => setHasAccount(!hasAccount)}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                  hasAccount ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">اسم المستخدم (Username):</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!hasAccount}
                placeholder="الرقم العسكري تلقائياً"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-50 focus:border-amber-500"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">كلمة المرور (Password):</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!hasAccount}
                placeholder="أدخل كلمة مرور جديدة أو اتركه للتوليد الآمن"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-50 focus:border-amber-500"
              />
            </div>
          </div>

          {/* MANAGER TASK SELECTION & INSTRUCTIONS */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-sky-400" />
                <h4 className="text-sm font-black text-white">الإجراءات والمهام المحددة للفرد لإكمالها</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PRESET_TASKS.map((task) => {
                const isChecked = selectedTasks.includes(task.id);
                return (
                  <label
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span>{task.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom Commander Instructions */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-slate-300 block">توجيهات وتكليفات القائد المباشرة للفرد:</label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                placeholder="اكتب التوجيهات المطلوبة من الفرد عند دخوله التطبيق..."
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Save Account Settings Action Button */}
          <div className="pt-3 flex justify-end">
            <button
              onClick={handleSaveAccountSettings}
              disabled={isSavingAccount}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>حفظ إعدادات الحساب وتوجيه المهام للفرد</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: SOLDIER VIEW — ASSIGNED TASKS CARD LIST */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-black text-white">قائمة المهام والإجراءات الموكلة للفرد</h4>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            عدد المهام المطلوبة: ({selectedTasks.length})
          </span>
        </div>

        {selectedTasks.length === 0 && !customInstructions ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-400 text-xs">لا توجد مهام إضافية مطلوبة في الوقت الحالي. يمكنك استعراض ملفك الشامل فقط.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedTasks.map((taskId) => {
              const preset = PRESET_TASKS.find(t => t.id === taskId);
              if (!preset) return null;
              return (
                <div key={taskId} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{preset.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    مطلوب إكماله
                  </span>
                </div>
              );
            })}

            {customInstructions && (
              <div className="p-4 bg-sky-950/30 border border-sky-500/30 rounded-xl space-y-1">
                <span className="text-xs font-bold text-sky-300 block">توجيهات القائد المباشرة:</span>
                <p className="text-xs text-slate-300 leading-relaxed">{customInstructions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: SOLDIER SUBMIT REQUEST / UPDATE FORM */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-black text-white">تقديم إجراء أو تحديث بيانات للمعاينة والاعتماد من القيادة</h4>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">عنوان الإجراء المطلوبة:</label>
              <input
                type="text"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="مثل: تحديث رقم الاتصال والعنوان الوطني"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">رقم الهاتف الجوال الحديث:</label>
              <input
                type="text"
                value={updatedPhone}
                onChange={(e) => setUpdatedPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">جهة الاتصال في الطوارئ:</label>
              <input
                type="text"
                value={updatedEmergency}
                onChange={(e) => setUpdatedEmergency(e.target.value)}
                placeholder="الاسم - الصلة - الرقم"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">العنوان الوطني:</label>
              <input
                type="text"
                value={updatedAddress}
                onChange={(e) => setUpdatedAddress(e.target.value)}
                placeholder="المدينة - الحي - الشارع"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Photo Upload Option */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {updatedPhotoUrl ? (
                  <img src={updatedPhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">الصورة الشخصية العسكرية الرسمية</span>
                <span className="text-[11px] text-slate-400">يمكنك رفع صورة جديدة ليتم تغييرها بالملف بعد موافقة القائد</span>
              </div>
            </div>

            <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer border border-slate-700 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>اختر صورة</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Detailed Request Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">شرح وتفاصيل الطلب للمدير:</label>
            <textarea
              value={requestDesc}
              onChange={(e) => setRequestDesc(e.target.value)}
              rows={2}
              placeholder="اكتب أسباب أو توضيحات إضافية للقائد..."
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingRequest}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الإجراء إلى المدير للتدقيق والموافقة</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: SUBMITTED REQUESTS HISTORY TABLE */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-black text-white">سجل متابعة وقرارات الطلبات المرفوعة من الفرد</h4>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            الإجمالي: ({requestsHistory.length})
          </span>
        </div>

        {requestsHistory.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-400 text-xs">لم تقم بتقديم أي طلبات أو إجراءات سابقة.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requestsHistory.map((req) => (
              <div key={req.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-white">{req.title}</h5>
                    <span className="text-[10px] text-slate-500">
                      ({new Date(req.submittedAt).toLocaleDateString('ar-EG')})
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-[11px] text-slate-400 mt-1">{req.description}</p>
                  )}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <p className="text-[11px] text-red-400 font-bold mt-1">سبب الرفض: {req.rejectionReason}</p>
                  )}
                </div>

                <div>
                  {req.status === 'pending' && (
                    <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      قيد المعاينة والانتظار
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تمت الموافقة والاعتماد
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold rounded-lg flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      مرفوض من القيادة
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
