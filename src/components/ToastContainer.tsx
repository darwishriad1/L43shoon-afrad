import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  createdAt: number;
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
    const newItem: ToastItem = { id, message, type, duration, createdAt: Date.now() };
    
    // Keep max 4 toasts at a time to prevent screen cluttering
    setToasts((prev) => [newItem, ...prev.slice(0, 3)]);

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
      
      {/* Toast Overlay Container - Placed at the Top Center of the screen */}
      <div 
        className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2.5 max-w-lg w-[calc(100%-1.5rem)] sm:w-auto min-w-[320px] sm:min-w-[380px] pointer-events-none font-sans"
        dir="rtl"
        id="app-global-toast-container"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            // Theme-conscious styling with high contrast in both Dark & Light modes
            let config = {
              cardClasses: 'bg-slate-900/95 dark:bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/20 text-slate-100 dark:text-slate-100',
              lightCardOverrides: 'light-toast-success',
              iconWrapper: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
              icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
              badgeText: 'تم بنجاح',
              badgeClasses: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              progressBar: 'bg-emerald-500'
            };

            if (toast.type === 'error') {
              config = {
                cardClasses: 'bg-slate-900/95 dark:bg-slate-950/95 border-rose-500/50 shadow-rose-950/20 text-slate-100 dark:text-slate-100',
                lightCardOverrides: 'light-toast-error',
                iconWrapper: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
                icon: <AlertCircle className="w-5 h-5 shrink-0" />,
                badgeText: 'تنبيه خطأ',
                badgeClasses: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                progressBar: 'bg-rose-500'
              };
            } else if (toast.type === 'warning') {
              config = {
                cardClasses: 'bg-slate-900/95 dark:bg-slate-950/95 border-amber-500/50 shadow-amber-950/20 text-slate-100 dark:text-slate-100',
                lightCardOverrides: 'light-toast-warning',
                iconWrapper: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
                badgeText: 'تحذير ميداني',
                badgeClasses: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                progressBar: 'bg-amber-500'
              };
            } else if (toast.type === 'info') {
              config = {
                cardClasses: 'bg-slate-900/95 dark:bg-slate-950/95 border-sky-500/50 shadow-sky-950/20 text-slate-100 dark:text-slate-100',
                lightCardOverrides: 'light-toast-info',
                iconWrapper: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
                icon: <Info className="w-5 h-5 shrink-0" />,
                badgeText: 'إشعار توثيق',
                badgeClasses: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
                progressBar: 'bg-sky-500'
              };
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -25, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`pointer-events-auto relative w-full overflow-hidden border rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-200 ${config.cardClasses} ${config.lightCardOverrides}`}
              >
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Icon container */}
                    <div className={`p-2 rounded-xl border shrink-0 shadow-xs flex items-center justify-center ${config.iconWrapper}`}>
                      {config.icon}
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wide uppercase ${config.badgeClasses}`}>
                          {config.badgeText}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] font-extrabold leading-relaxed select-text line-clamp-2">
                        {toast.message}
                      </p>
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="p-1.5 text-slate-400 hover:text-white dark:hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer shrink-0 active:scale-90"
                    title="إغلاق التنبيه"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Animated auto-dismiss progress bar */}
                {toast.duration && toast.duration > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                    className={`h-0.5 opacity-80 ${config.progressBar}`}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
