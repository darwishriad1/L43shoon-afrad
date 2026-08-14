import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface AndroidExitToastProps {
  isVisible: boolean;
  message?: string;
}

export default function AndroidExitToast({
  isVisible,
  message = 'اضغط مرة أخرى للخروج من التطبيق'
}: AndroidExitToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none font-sans"
          dir="rtl"
        >
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white px-5 py-2.5 rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-black tracking-wide">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 animate-pulse">
              <ArrowRight className="w-3 h-3" />
            </div>
            <span className="text-slate-100">{message}</span>
            <span className="text-[10px] bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
              Android
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AndroidExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export function AndroidExitConfirmModal({
  isOpen,
  onClose,
  onConfirmExit
}: AndroidExitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <LogOut className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            الخروج من تطبيق المنظومة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            أنت الآن في الشاشة الرئيسية (شاشة المؤشرات). هل ترغب في تسجيل الخروج وإغلاق التطبيق؟
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onConfirmExit}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-rose-950/30 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج من التطبيق</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            البقاء في التطبيق
          </button>
        </div>
      </motion.div>
    </div>
  );
}
