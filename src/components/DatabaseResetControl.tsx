import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Clock, 
  Sparkles,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerToast } from './ToastContainer';

interface DatabaseResetControlProps {
  onResetDatabase: () => Promise<void> | void;
  isCompact?: boolean;
}

export default function DatabaseResetControl({ onResetDatabase, isCompact = false }: DatabaseResetControlProps) {
  const HOLD_DURATION = 5000; // 5 seconds in milliseconds

  // First Hold States (Main Button)
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);

  // Modal Confirmation States
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Second Hold States (Modal Button)
  const [isModalHolding, setIsModalHolding] = useState(false);
  const [modalProgress, setModalProgress] = useState(0);
  const [modalSecondsLeft, setModalSecondsLeft] = useState(5);

  // Final Dialog Confirmation State ("هل أنت متأكد؟ موافق أو إلغاء")
  const [showFinalModal, setShowFinalModal] = useState(false);

  const [isExecutingReset, setIsExecutingReset] = useState(false);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const modalTimerRef = useRef<any>(null);
  const modalStartTimeRef = useRef<number>(0);

  // --- Main Button Hold Logic ---
  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (isExecutingReset) return;

    setIsHolding(true);
    startTimeRef.current = Date.now();
    setProgress(0);
    setSecondsLeft(5);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      const remainingSec = Math.max(0, Math.ceil((HOLD_DURATION - elapsed) / 1000));

      setProgress(currentProgress);
      setSecondsLeft(remainingSec);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsHolding(false);
        setProgress(100);
        setSecondsLeft(0);
        
        // Trigger modal confirmation
        setShowConfirmModal(true);
        triggerToast('تم اكتمال الضغط الأولي! يرجى التأكيد المزدوج في نافذة الأمان.', 'info');
      }
    }, 40);
  };

  const cancelHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
    setSecondsLeft(5);
  };

  // --- Modal Button Hold Logic (Second 5-Second Hold) ---
  const startModalHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (isExecutingReset) return;

    setIsModalHolding(true);
    modalStartTimeRef.current = Date.now();
    setModalProgress(0);
    setModalSecondsLeft(5);

    if (modalTimerRef.current) clearInterval(modalTimerRef.current);

    modalTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - modalStartTimeRef.current;
      const currentProgress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      const remainingSec = Math.max(0, Math.ceil((HOLD_DURATION - elapsed) / 1000));

      setModalProgress(currentProgress);
      setModalSecondsLeft(remainingSec);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(modalTimerRef.current);
        modalTimerRef.current = null;
        setIsModalHolding(false);
        setModalProgress(100);
        setModalSecondsLeft(0);

        // Open final dialog "هل أنت متأكد موافق أو لا"
        setShowFinalModal(true);
        triggerToast('اكتمل الضغط الأمني الثاني. يرجى تأكيد القرار النهائي.', 'warning');
      }
    }, 40);
  };

  const cancelModalHold = () => {
    if (modalTimerRef.current) {
      clearInterval(modalTimerRef.current);
      modalTimerRef.current = null;
    }
    setIsModalHolding(false);
    setModalProgress(0);
    setModalSecondsLeft(5);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    };
  }, []);

  const handleConfirmReset = async () => {
    setIsExecutingReset(true);
    try {
      await onResetDatabase();
      triggerToast('تمت تصفية قاعدة البيانات بالكامل وتحديث النظام. أصبح التطبيق نظيفاً جداً الآن!', 'success');
      setShowFinalModal(false);
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('Error in database reset:', err);
      triggerToast('حدث خطأ أثناء تصفية قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally {
      setIsExecutingReset(false);
      cancelHold();
      cancelModalHold();
    }
  };

  return (
    <div className="w-full space-y-4 font-sans dir-rtl text-right" dir="rtl">
      {/* Control Card Container */}
      <div className="bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-3xl border border-rose-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-rose-900/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-200 flex items-center gap-2">
                <span>زر التهيئة وتصفية قاعدة البيانات</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                  مسح شامل 100%
                </span>
              </h3>
              <p className="text-xs text-rose-300/80 mt-0.5">
                تأمين وحماية ثلاثية: ضغط ٥ ثوانٍ ثم تأكيد بالضغط ٥ ثوانٍ ثم موافقة نهائية
              </p>
            </div>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="bg-rose-950/40 border border-rose-900/50 rounded-2xl p-4 mb-5 text-xs text-rose-200/90 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>ماذا يحدث عند تنفيذ التهيئة؟ (مع نسخ احتياطي تلقائي)</span>
          </div>
          <p>
            سيتم تلقائياً إنشاء وتنزيل **نسخة احتياطية آمنة شاملة (JSON)** لكل بيانات المنظومة الحالية قبل تفريغ قاعدة البيانات، ثم يتم مسح بيانات السيرفر (الوحدات، الأفراد، كشوفات التحضير) لتجهيز التطبيق للعمل من جديد.
          </p>
        </div>

        {/* 5-Second Hold Button */}
        <div className="space-y-3">
          <div className="relative">
            <button
              type="button"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              disabled={isExecutingReset}
              className={`w-full relative overflow-hidden py-4 px-6 rounded-2xl font-black text-sm transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-3 border shadow-lg ${
                isHolding
                  ? 'bg-rose-900 text-white border-rose-500 shadow-rose-900/50 scale-[0.99]'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/80 shadow-rose-900/30 active:scale-98'
              }`}
            >
              {/* Animated Progress Bar Overlay */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-rose-500 to-amber-500 opacity-90 transition-all duration-75 ease-linear pointer-events-none"
                style={{ width: `${progress}%` }}
              />

              <div className="relative z-10 flex items-center justify-center gap-3">
                {isExecutingReset ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>جاري تصفية قاعدة البيانات بالكامل...</span>
                  </>
                ) : isHolding ? (
                  <>
                    <Clock className="w-5 h-5 text-amber-300 animate-spin" />
                    <span className="text-amber-200 font-mono text-base">
                      استمر بالضغط الأولي: {secondsLeft} ثوانٍ ({Math.round(progress)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 text-rose-200 animate-bounce" />
                    <span>زر التهيئة: اضغط مع الاستمرار لمدة ٥ ثوانٍ للبدء</span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Progress Indicator Track */}
          <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden border border-rose-900/50 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                progress > 80 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 px-1 font-mono">
            <span>{isHolding ? `اكتمال: ${Math.round(progress)}%` : 'اضغط باستمرار للبدء'}</span>
            <span>الخطوة 1 من 3 (٥ ثوانٍ)</span>
          </div>
        </div>
      </div>

      {/* STEP 2: Full-Screen Confirmation Modal (With Required 5-Second Hold) */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-[98%] max-w-2xl bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 text-right shadow-2xl shadow-rose-950/90 relative overflow-hidden dir-rtl"
              dir="rtl"
            >
              {/* Top Accent Stripe */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); cancelModalHold(); }}
                className="absolute top-4 left-4 p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    الخطوة 2: تأكيد الأمان بالضغط المستمر (٥ ثوانٍ)
                  </h2>
                  <p className="text-xs sm:text-sm text-rose-300 font-bold mt-1">
                    اضغط باستمرار على زر التأكيد أدناه لمدة ٥ ثوانٍ أخرى للتأكيد الأمني
                  </p>
                </div>
              </div>

              {/* Warning Content List */}
              <div className="bg-rose-950/40 border border-rose-900/80 rounded-2xl p-5 mb-6 space-y-3 text-xs sm:text-sm text-rose-100">
                <p className="font-bold text-amber-300 text-sm">
                  🛡️ حماية أمان تلقائية: يتم استخراج وتنزيل نسخة احتياطية فورية قبل المسح!
                </p>
                <ul className="space-y-2 text-slate-200 list-disc list-inside">
                  <li>سيتم **حفظ وتنزيل ملف نسخة احتياطية (JSON)** تحتوي كل السجلات الحالية تلقائياً.</li>
                  <li>سيتم شطب **التشكيلات والكتائب والضباط والأفراد** من السيرفر.</li>
                  <li>سيتم تصفية **كشوفات التحضير اليومية والغياب والحالات والطلبات**.</li>
                  <li>سيعود التطبيق **نظيفاً بالكامل**، مع الإبقاء على **مدير النظام الرئيسي**.</li>
                </ul>
              </div>

              {/* Modal 5-Second Hold Action Button */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onMouseDown={startModalHold}
                  onMouseUp={cancelModalHold}
                  onMouseLeave={cancelModalHold}
                  onTouchStart={startModalHold}
                  onTouchEnd={cancelModalHold}
                  onTouchCancel={cancelModalHold}
                  disabled={isExecutingReset}
                  className={`w-full relative overflow-hidden py-4 px-6 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-3 border shadow-lg ${
                    isModalHolding
                      ? 'bg-rose-950 text-white border-amber-400 shadow-rose-900/60 scale-[0.99]'
                      : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-900/40 active:scale-98'
                  }`}
                >
                  {/* Progress overlay */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-amber-500 via-rose-500 to-rose-700 opacity-90 transition-all duration-75 ease-linear pointer-events-none"
                    style={{ width: `${modalProgress}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {isModalHolding ? (
                      <>
                        <Clock className="w-5 h-5 text-amber-300 animate-spin" />
                        <span className="text-amber-200 font-mono text-base font-black">
                          استمر بالضغط للتأكيد: {modalSecondsLeft} ثوانٍ ({Math.round(modalProgress)}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-amber-300" />
                        <span>اضغط باستمرار هنا لمدة ٥ ثوانٍ للتأكيد الثاني</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Progress Indicator Track */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-rose-900/50 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-amber-400"
                    style={{ width: `${modalProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 px-1 font-mono">
                  <span>{isModalHolding ? `التأكيد: ${Math.round(modalProgress)}%` : 'اضغط باستمرار على الزر أعلاه'}</span>
                  <button
                    type="button"
                    onClick={() => { setShowConfirmModal(false); cancelModalHold(); }}
                    className="text-rose-400 hover:underline cursor-pointer font-sans"
                  >
                    إلغاء والتراجع
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEP 3: Final Confirmation Popup ("هل أنت متأكد؟ موافق أو إلغاء") */}
      <AnimatePresence>
        {showFinalModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="w-full max-w-md bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-7 text-right shadow-2xl shadow-rose-950/90 relative overflow-hidden dir-rtl"
              dir="rtl"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 mx-auto mb-4 animate-bounce">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white text-center mb-2">
                القرار النهائي: هل أنت متأكد؟
              </h3>
              
              <p className="text-xs sm:text-sm text-slate-300 text-center leading-relaxed mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                سيتم تنزيل النسخة الاحتياطية تلقائياً فوراً وتفريغ جميع سجلات المنظومة من السيرفر بشكل نهائي.
                <br />
                <span className="font-bold text-amber-300 block mt-2">هل تريد الاستمرار والموافقة النهائية؟</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isExecutingReset}
                  className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-98"
                >
                  {isExecutingReset ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التنفيذ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>موافق</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowFinalModal(false);
                    setShowConfirmModal(false);
                    cancelModalHold();
                  }}
                  disabled={isExecutingReset}
                  className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  <span>لا / إلغاء</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
