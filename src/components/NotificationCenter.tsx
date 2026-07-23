import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Clock, 
  Sparkles, 
  Radio, 
  FileText, 
  UserX, 
  CheckCircle2, 
  X,
  ChevronLeft,
  Info,
  Layers,
  Zap
} from 'lucide-react';
import { Notification, Unit, Soldier, AttendanceRecord } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  onToggleRead: (id: string) => void;
  onNavigateTab?: (tabId: string) => void;
  units?: Unit[];
  soldiers?: Soldier[];
  attendance?: AttendanceRecord[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  setNotifications,
  onToggleRead,
  onNavigateTab,
  units = [],
  soldiers = [],
  attendance = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'critical' | 'readiness' | 'system'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Helper to play tactical chime using Web Audio API
  const playTacticalChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  const handleOpenToggle = () => {
    if (!isOpen && unreadCount > 0) {
      playTacticalChime();
    }
    setIsOpen(!isOpen);
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
  };

  // Generate a live real tactical alert dynamically
  const handleSimulateTacticalAlert = () => {
    const alertTypes = [
      {
        title: 'بلاغ عملياتي عاجل: تعميم الجاهزية رقم (2026/89)',
        message: 'رفع مستوى الاستعداد القتالي بجميع الوحدات الميدانية وإجراء فحص دوري للتحضير.',
        type: 'warning' as const
      },
      {
        title: 'إنذار غياب ميداني: الكتيبة الأولى',
        message: 'تم رصد 4 حالات غياب بدون عذر في القوة الميدانية اليوم. يرجى اتخاذ الإجراءات الإدارية.',
        type: 'error' as const
      },
      {
        title: 'تنبيه أمني: محاولة خروج مع إجازة بدون تصريح',
        message: 'نظام المراقبة والتحضير سجل عدم مطابقة في تصاريح المغادرة اليومية.',
        type: 'warning' as const
      },
      {
        title: 'تأكيد مزامنة الكشوفات',
        message: 'تمت مزامنة جميع سجلات التحضير اليومية بنجاح مع السيرفر الرئيسي لقيادة اللواء.',
        type: 'info' as const
      }
    ];

    const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const newNotif: Notification = {
      id: `notif_sim_${Date.now()}`,
      title: randomAlert.title,
      message: randomAlert.message,
      isRead: false,
      type: randomAlert.type,
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => [newNotif, ...prev]);
    playTacticalChime();
  };

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeCategory === 'critical') return n.type === 'error' || n.type === 'warning';
      if (activeCategory === 'readiness') return n.title.includes('جاهزية') || n.title.includes('غياب') || n.title.includes('تحضير');
      if (activeCategory === 'system') return n.type === 'info' || n.title.includes('مزامنة') || n.title.includes('أمن');
      return true;
    });
  }, [notifications, activeCategory]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpenToggle}
        className={`relative p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer select-none active:scale-95 ${
          isOpen
            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : unreadCount > 0
            ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
        }`}
        title="مركز التنبيهات والإنذارات العملياتية"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Pulse Ring when unread exists */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-rose-600 to-red-600 text-white text-[9px] font-black items-center justify-center border border-slate-950 shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay for mobile */}
            <div 
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] sm:hidden"
              onClick={() => setIsOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed sm:absolute left-2 right-2 sm:right-auto sm:left-0 mt-3 w-auto sm:w-96 bg-slate-900/95 text-slate-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-700/80 backdrop-blur-xl z-50 overflow-hidden font-sans dir-rtl"
              dir="rtl"
            >
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xs sm:text-sm text-slate-100">
                        التنبيهات والإنذارات العملياتية
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                          {unreadCount} جديد
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">
                      متابعة الجاهزية والبلاغات الفورية لقيادة اللواء
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Sound Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={soundEnabled ? 'إيقاف صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                <button
                  onClick={handleSimulateTacticalAlert}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-bold transition-all active:scale-95 cursor-pointer"
                  title="إنشاء إنذار اختباري فورياً"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>توليد بلاغ عملياتي</span>
                </button>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}

                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="مسح جميع التنبيهات"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 cursor-pointer ${
                    activeCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  الكل ({notifications.length})
                </button>

                <button
                  onClick={() => setActiveCategory('critical')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    activeCategory === 'critical'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-rose-400 hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  الإنذارات الحرجة ({notifications.filter(n => n.type === 'error' || n.type === 'warning').length})
                </button>

                <button
                  onClick={() => setActiveCategory('readiness')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    activeCategory === 'readiness'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  الجاهزية ({notifications.filter(n => n.title.includes('جاهزية') || n.title.includes('غياب')).length})
                </button>

                <button
                  onClick={() => setActiveCategory('system')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 cursor-pointer ${
                    activeCategory === 'system'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-sky-400 hover:bg-slate-800'
                  }`}
                >
                  النظام ({notifications.filter(n => n.type === 'info').length})
                </button>
              </div>

              {/* Notification List Container */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">لا توجد تنبيهات جديدة في هذه الفئة</p>
                    <p className="text-[10px] text-slate-500">جميع المؤشرات والإنذارات الميدانية مستقرة وحالتها طبيعية</p>
                  </div>
                ) : (
                  filteredNotifications.map(n => {
                    const isError = n.type === 'error';
                    const isWarning = n.type === 'warning';

                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 5 }}
                        className={`p-3 rounded-xl border transition-all duration-200 relative group ${
                          !n.isRead
                            ? isError
                              ? 'bg-rose-950/40 border-rose-500/40 text-slate-100 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                              : isWarning
                              ? 'bg-amber-950/40 border-amber-500/40 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                              : 'bg-sky-950/30 border-sky-500/30 text-slate-100'
                            : 'bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-100 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isError
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            }`}>
                              {isError ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : isWarning ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-black ${
                                  isError ? 'text-rose-300' : isWarning ? 'text-amber-300' : 'text-sky-300'
                                }`}>
                                  {n.title}
                                </h4>

                                {!n.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                                )}
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                {n.message}
                              </p>

                              <div className="flex items-center gap-3 pt-1 text-[9px] text-slate-400 font-mono">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {n.createdAt.includes('T') ? new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : n.createdAt}
                                </span>

                                <span>•</span>

                                <button
                                  onClick={() => onToggleRead(n.id)}
                                  className="text-amber-400 hover:underline font-sans font-bold cursor-pointer"
                                >
                                  {n.isRead ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer */}
              <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-center flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono text-slate-500">نظام المراقبة والتنبيه الآلي</span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onNavigateTab) onNavigateTab('attendance');
                  }}
                  className="text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض كشوفات الجاهزية</span>
                  <ChevronLeft className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
