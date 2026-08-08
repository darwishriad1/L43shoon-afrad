import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const triggerToast = (message: string, type: ToastType = 'success', duration = 4000) => {
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { message, type, duration },
    })
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Global window event listener for easy dispatch anywhere
  useEffect(() => {
    const handleGlobalToast = (e: CustomEvent<{ message: string; type?: ToastType; duration?: number }>) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'success', e.detail.duration || 4000);
      }
    };

    window.addEventListener('app-toast' as any, handleGlobalToast);
    return () => {
      window.removeEventListener('app-toast' as any, handleGlobalToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div 
        className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-6 z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100%-2rem)] sm:w-auto pointer-events-none font-sans"
        dir="rtl"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            let bgStyle = 'bg-slate-900/95 border-emerald-500/50 text-slate-100 shadow-emerald-950/30';
            let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
            let badgeText = 'نجاح';
            let badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

            if (toast.type === 'error') {
              bgStyle = 'bg-slate-900/95 border-red-500/50 text-slate-100 shadow-red-950/30';
              icon = <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
              badgeText = 'تنبيه';
              badgeStyle = 'bg-red-500/20 text-red-300 border-red-500/30';
            } else if (toast.type === 'warning') {
              bgStyle = 'bg-slate-900/95 border-amber-500/50 text-slate-100 shadow-amber-950/30';
              icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
              badgeText = 'تحذير';
              badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            } else if (toast.type === 'info') {
              bgStyle = 'bg-slate-900/95 border-blue-500/50 text-slate-100 shadow-blue-950/30';
              icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
              badgeText = 'إشعار';
              badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 border rounded-2xl shadow-xl backdrop-blur-md ${bgStyle}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${badgeStyle}`}>
                        {badgeText}
                      </span>
                    </div>
                    <p className="text-xs font-bold mt-0.5 leading-snug text-slate-100">
                      {toast.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
