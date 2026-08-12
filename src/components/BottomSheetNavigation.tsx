import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Table,
  Users,
  Sparkles,
  FilePieChart,
  ShieldCheck,
  Settings,
  Info,
  X,
  LogOut,
  Bell,
  Command,
  Activity,
  Zap,
  Check,
  HeartPulse,
  Package,
  ClipboardCheck,
  Clock,
  Search
} from 'lucide-react';
import { User } from '../types';

interface BottomSheetNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onOpenRequestsModal?: () => void;
  unreadRequestsCount?: number;
  onLogout?: () => void;
}

// Live Tactical Analog Clock Component (الساعة التناظرية الميدانية الكبيرة)
function TacticalAnalogClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  // Angle calculations for clock hands
  const secondDeg = (seconds / 60) * 360;
  const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = (((hours % 12) + minutes / 60) / 12) * 360;

  const formattedDigital = time.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="relative overflow-hidden p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] my-1 group">
      {/* Subtle background glow effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3">
        {/* Large Analog Clock Face */}
        <div className="flex items-center gap-3 sm:gap-5 w-full justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)] flex items-center justify-center shrink-0">
              {/* Hour numerals */}
              <span className="absolute top-1 text-xs sm:text-sm font-black text-amber-300">12</span>
              <span className="absolute right-2 text-xs sm:text-sm font-black text-amber-300">3</span>
              <span className="absolute bottom-1 text-xs sm:text-sm font-black text-amber-300">6</span>
              <span className="absolute left-2 text-xs sm:text-sm font-black text-amber-300">9</span>

              {/* Sub tick marks */}
              <div className="absolute inset-2 rounded-full border border-amber-500/25" />

              {/* Clock Hands Container */}
              <div className="relative w-full h-full">
                {/* Hour Hand */}
                <div
                  className="absolute top-1/2 left-1/2 w-1.5 h-7 sm:h-8 bg-gradient-to-t from-amber-500 to-amber-300 rounded-full origin-bottom shadow-md transition-transform duration-300"
                  style={{ transform: `translateX(-50%) translateY(-100%) rotate(${hourDeg}deg)` }}
                />
                {/* Minute Hand */}
                <div
                  className="absolute top-1/2 left-1/2 w-1 h-9 sm:h-11 bg-gradient-to-t from-teal-400 to-teal-200 rounded-full origin-bottom shadow-md transition-transform duration-300"
                  style={{ transform: `translateX(-50%) translateY(-100%) rotate(${minuteDeg}deg)` }}
                />
                {/* Second Hand */}
                <div
                  className="absolute top-1/2 left-1/2 w-[2px] h-10 sm:h-12 bg-rose-500 rounded-full origin-bottom transition-transform duration-100 shadow-lg"
                  style={{ transform: `translateX(-50%) translateY(-100%) rotate(${secondDeg}deg)` }}
                />
                {/* Center Cap Pin */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-amber-300 border-2 border-slate-950 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg z-10" />
              </div>
            </div>

            {/* Clock Labels & Extra Large Digital Readout */}
            <div className="text-right">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] sm:text-xs font-black text-amber-400 uppercase tracking-wider">
                  التوقيت الميداني الموحد
                </span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-mono tracking-widest drop-shadow-md" dir="ltr">
                {formattedDigital}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-300 mt-0.5 flex items-center gap-1.5">
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Live Synchronized Badge */}
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-xs font-black text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              تزامن حي
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BottomSheetNavigation({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentUser,
  onOpenRequestsModal,
  unreadRequestsCount = 0,
  onLogout
}: BottomSheetNavigationProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'ops' | 'services' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSelectTab = (tabId: string, customAction?: () => void) => {
    if (customAction) {
      customAction();
    } else {
      setActiveTab(tabId);
    }
    onClose();
  };

  // Quick navigation grid items (Structured in 3 columns per row)
  const quickNavItems = [
    {
      id: 'dashboard',
      title: 'لوحة القيادة',
      subtitle: 'المؤشرات والجاهزية',
      icon: LayoutDashboard,
      category: 'ops',
      iconColor: 'text-emerald-400 drop-shadow-[0_2px_12px_rgba(52,211,153,0.5)]',
      badge: 'الرئيسية'
    },
    {
      id: 'attendance',
      title: 'كشف التحضير',
      subtitle: 'الحضور والغياب',
      icon: Table,
      category: 'ops',
      iconColor: 'text-teal-400 drop-shadow-[0_2px_12px_rgba(45,212,191,0.5)]',
      badge: 'اليومي'
    },
    {
      id: 'org_manager',
      title: 'سجلات القوة',
      subtitle: 'الضباط والأفراد',
      icon: Users,
      category: 'ops',
      iconColor: 'text-blue-400 drop-shadow-[0_2px_12px_rgba(96,165,250,0.5)]',
      badge: 'التشكيلات'
    },
    {
      id: 'special_sections',
      title: 'الخدمات المميزة',
      subtitle: 'الأقسام والطلبات',
      icon: Sparkles,
      category: 'services',
      iconColor: 'text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]',
      badge: 'خاص'
    },
    {
      id: 'requests_modal',
      title: 'طلبات الأفراد',
      subtitle: 'الإجازات والاستئذان',
      icon: ClipboardCheck,
      category: 'services',
      iconColor: 'text-rose-400 drop-shadow-[0_2px_12px_rgba(251,113,133,0.5)]',
      badge: unreadRequestsCount > 0 ? `${unreadRequestsCount} معلقة` : 'متابعة',
      action: onOpenRequestsModal
    },
    {
      id: 'reports',
      title: 'التقارير والطباعة',
      subtitle: 'تصدير المستخرجات',
      icon: FilePieChart,
      category: 'services',
      iconColor: 'text-sky-400 drop-shadow-[0_2px_12px_rgba(56,189,248,0.5)]',
      badge: 'إحصائيات'
    },
    {
      id: 'duty_roster',
      title: 'جدول الخفارات',
      subtitle: 'النوبات والخدمات',
      icon: Clock,
      category: 'ops',
      iconColor: 'text-violet-400 drop-shadow-[0_2px_12px_rgba(167,139,250,0.5)]',
      badge: 'جديد',
      targetTab: 'special_sections'
    },
    {
      id: 'medical_care',
      title: 'الرعاية الطبية',
      subtitle: 'المستشفيات والتقارير',
      icon: HeartPulse,
      category: 'services',
      iconColor: 'text-red-400 drop-shadow-[0_2px_12px_rgba(248,113,113,0.5)]',
      badge: 'صحي',
      targetTab: 'special_sections'
    },
    {
      id: 'armory_supplies',
      title: 'العُهد والتجهيز',
      subtitle: 'العتاد والمهمات',
      icon: Package,
      category: 'ops',
      iconColor: 'text-orange-400 drop-shadow-[0_2px_12px_rgba(251,146,60,0.5)]',
      badge: 'مخزون',
      targetTab: 'special_sections'
    },
    ...(currentUser.role === 'admin'
      ? [
          {
            id: 'users_permissions',
            title: 'إدارة الصلاحيات',
            subtitle: 'المشرفين والحسابات',
            icon: ShieldCheck,
            category: 'admin',
            iconColor: 'text-purple-400 drop-shadow-[0_2px_12px_rgba(192,132,252,0.5)]',
            badge: 'إدارة'
          }
        ]
      : []),
    {
      id: 'settings',
      title: 'إعدادات المنظومة',
      subtitle: 'التهيئة والنسخ',
      icon: Settings,
      category: 'admin',
      iconColor: 'text-slate-300 drop-shadow-[0_2px_12px_rgba(203,213,225,0.4)]',
      badge: 'النظام'
    },
    {
      id: 'about',
      title: 'حول المنظومة',
      subtitle: 'الدعم والتحديثات',
      icon: Info,
      category: 'admin',
      iconColor: 'text-indigo-400 drop-shadow-[0_2px_12px_rgba(129,140,248,0.5)]',
      badge: 'v4.2.0'
    }
  ];

  const filteredItems = quickNavItems.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
        {/* Backdrop Overlay with Rich Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Bottom Sheet Drawer Main Content with Drag to Dismiss */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.02, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 250) {
              onClose();
            }
          }}
          className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-t-2 border-amber-500/90 rounded-t-[2.5rem] p-3 sm:p-4.5 shadow-[0_-15px_40px_rgba(0,0,0,0.85)] text-right dir-rtl z-10 space-y-2.5 font-sans select-none max-h-[94vh] overflow-y-auto touch-pan-y"
          dir="rtl"
        >
          {/* Animated Gold Glowing Top Accent Line */}
          <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.8)]" />

          {/* Top Grab Handle */}
          <div className="flex justify-center -mt-0.5 pb-0.5 cursor-grab active:cursor-grabbing">
            <div className="w-16 h-1.5 bg-slate-700/80 hover:bg-amber-400 rounded-full transition-colors shadow-sm" />
          </div>

          {/* User Profile Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
                  <Command className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>الوصول السريع للأقسام</span>
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-black shadow-sm">
                    السيطرة الميدانية
                  </span>
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] font-extrabold text-slate-300 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentUser.name}</span>
                    <span className="text-amber-400 font-black">
                      ({currentUser.role === 'admin' ? 'مشرف النظام' : 'مستخدم'})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Requests Notification Modal Trigger */}
              {onOpenRequestsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenRequestsModal();
                    onClose();
                  }}
                  className="relative p-2.5 rounded-2xl bg-slate-800/90 text-amber-400 hover:bg-amber-500/20 transition-all border border-slate-700/60 cursor-pointer"
                  title="الطلبات والإشعارات"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-slate-900">
                      {unreadRequestsCount}
                    </span>
                  )}
                </button>
              )}

              {/* RED CLOSE BUTTON IN TOP HEADER (زر الإغلاق في الأعلى) */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center px-3 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:from-rose-700 active:to-red-700 text-white font-extrabold text-xs transition-all cursor-pointer border border-rose-400/60 shadow-md shadow-rose-950/70 hover:scale-105 active:scale-95 gap-1.5"
                title="إغلاق القائمة"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
                <span className="hidden sm:inline">إغلاق</span>
              </button>
            </div>
          </div>

          {/* Live Tactical Analog Clock (ساعة تناظرية حية أعلى الشاشة) */}
          <TacticalAnalogClock />

          {/* Quick Search & Category Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن قسم أو خدمة سريعة..."
                  className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] font-black shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('ops')}
                  className={`px-2.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === 'ops'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  الميداني
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('services')}
                  className={`px-2.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === 'services'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  الخدمات
                </button>
              </div>
            </div>
          </div>

          {/* Quick Access Grid Header Label */}
          <div className="flex items-center justify-between text-[11px] font-black text-slate-400 px-1 pt-0.5">
            <span className="flex items-center gap-1.5 text-amber-400 font-extrabold">
              <Zap className="w-4 h-4 fill-amber-400/20" />
              <span>أزرار التنقل السريع (3 في كل سطر):</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-md font-mono border border-slate-700">
              {filteredItems.length} أزرار
            </span>
          </div>

          {/* Clean Modern Quick Grid Icons - EXACTLY 3 COLUMNS PER ROW (grid-cols-3) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {filteredItems.map((item) => {
              const ItemIcon = item.icon;
              const targetTabId = item.targetTab || item.id;
              const isActive = activeTab === targetTabId && item.id !== 'requests_modal';

              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSelectTab(targetTabId, item.action)}
                  className={`relative p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-500/25 to-orange-500/15 border-amber-400 text-amber-300 shadow-xl shadow-amber-950/70 ring-2 ring-amber-400/60'
                      : 'bg-slate-850/90 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200 shadow-md'
                  }`}
                >
                  {/* Active Indicator Checkmark */}
                  {isActive && (
                    <span className="absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md animate-pulse">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  {/* Top Badge Label */}
                  {item.badge && !isActive && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-black bg-slate-900/90 text-amber-300 border border-slate-700/80 px-1.5 py-0.2 rounded-full truncate max-w-[62px]">
                      {item.badge}
                    </span>
                  )}

                  {/* Clean Elegant Floating Icon (without surrounding box) */}
                  <div className="my-2.5 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
                    <ItemIcon className={`w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2] ${item.iconColor} group-hover:rotate-6 transition-all duration-300`} />
                  </div>

                  {/* Title */}
                  <span className="text-[11px] sm:text-xs font-black leading-tight text-white group-hover:text-amber-300 transition-colors w-full truncate">
                    {item.title}
                  </span>

                  {/* Subtitle */}
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5 truncate w-full">
                    {item.subtitle}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Bottom Footer Actions & System Status */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/60" />
              <span className="font-extrabold text-white text-[11px]">
                حالة المنظومة: <span className="text-emerald-400">جاهزية واستقرار كلي</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-black transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              )}

              {/* RED CLOSE BUTTON AT THE BOTTOM */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:from-rose-700 active:to-red-700 text-white font-extrabold text-xs transition-all cursor-pointer border border-rose-400/60 shadow-lg shadow-rose-950/80 hover:scale-105 active:scale-95"
                title="إغلاق القائمة"
              >
                <X className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>إغلاق القائمة</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


