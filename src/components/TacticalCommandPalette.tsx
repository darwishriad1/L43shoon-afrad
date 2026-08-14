import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  User, 
  Shield, 
  Activity, 
  FileText, 
  Calendar, 
  Settings, 
  Sparkles, 
  BadgeCheck, 
  ChevronLeft, 
  Radio, 
  Building2, 
  Database,
  ArrowRight,
  Flame
} from 'lucide-react';
import { Soldier, Unit } from '../types';

interface TacticalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  soldiers: Soldier[];
  units: Unit[];
  onNavigateTab: (tabId: string) => void;
  onSelectSoldier: (soldier: Soldier) => void;
  onOpenMilitaryCard?: (soldier: Soldier) => void;
}

export default function TacticalCommandPalette({
  isOpen,
  onClose,
  soldiers = [],
  units = [],
  onNavigateTab,
  onSelectSoldier,
  onOpenMilitaryCard
}: TacticalCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigation Items
  const navItems = [
    { id: 'dashboard', title: 'لوحة القيادة والمؤشرات العامة', icon: Activity, category: 'شاشات المنظومة' },
    { id: 'tactical_readiness', title: 'مركز السيطرة والجاهزية القتالية التكتيكية ⚡', icon: Shield, category: 'شاشات المنظومة' },
    { id: 'guard_roster', title: 'المولد الذكي لنوبات الحراسة والخفارات الميدانية 🛡️', icon: Shield, category: 'شاشات المنظومة' },
    { id: 'attendance', title: 'كشف التحضير والتواجد اليومي الميداني', icon: Calendar, category: 'شاشات المنظومة' },
    { id: 'org', title: 'الهيكل التنظيمي وشؤون الأفراد والكتائب', icon: Building2, category: 'شاشات المنظومة' },
    { id: 'special_sections', title: 'الأقسام الإدارية والخدمات والتسليح', icon: FileText, category: 'شاشات المنظومة' },
    { id: 'reports', title: 'التقارير والإحصائيات العسكرية المتقدمة', icon: FileText, category: 'شاشات المنظومة' },
    { id: 'settings', title: 'الإعدادات والمزامنة السحابية والنسخ الاحتياطي', icon: Settings, category: 'شاشات المنظومة' },
    { id: 'settings', title: 'قاعدة البيانات الاحتياطية المزدوجة ورفع كل شيء (Hot Standby DB)', icon: Database, category: 'شاشات المنظومة' },
  ];

  // Filtered Results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return navItems.map(item => ({ type: 'nav' as const, data: item }));
    }

    const results: Array<
      | { type: 'nav'; data: typeof navItems[0] }
      | { type: 'soldier'; data: Soldier }
      | { type: 'unit'; data: Unit }
    > = [];

    // Match Nav
    navItems.forEach(item => {
      if (item.title.toLowerCase().includes(q)) {
        results.push({ type: 'nav', data: item });
      }
    });

    // Match Soldiers
    soldiers.forEach(soldier => {
      const matchName = soldier.fullName.toLowerCase().includes(q);
      const matchMil = soldier.militaryNumber.includes(q);
      const matchPhone = soldier.phoneNumber?.includes(q);
      const matchRank = soldier.rank.toLowerCase().includes(q);

      if (matchName || matchMil || matchPhone || matchRank) {
        results.push({ type: 'soldier', data: soldier });
      }
    });

    // Match Units
    units.forEach(unit => {
      if (unit.name.toLowerCase().includes(q) || unit.commanderName?.toLowerCase().includes(q)) {
        results.push({ type: 'unit', data: unit });
      }
    });

    return results.slice(0, 15);
  }, [query, soldiers, units]);

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredResults[selectedIndex];
      if (current) {
        if (current.type === 'nav') {
          onNavigateTab(current.data.id);
          onClose();
        } else if (current.type === 'soldier') {
          onSelectSoldier(current.data);
          onClose();
        } else if (current.type === 'unit') {
          onNavigateTab('org');
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-3 font-sans" dir="rtl">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Search Header Input */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث بالاسم، الرقم العسكري، الرتبة، الوحدة، أو اكتب أمراً..."
            className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.type === 'nav') {
                const IconComponent = item.data.icon;
                return (
                  <button
                    key={`nav_${item.data.id}`}
                    type="button"
                    onClick={() => {
                      onNavigateTab(item.data.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black block">{item.data.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.data.category}</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                );
              }

              if (item.type === 'soldier') {
                const soldier = item.data;
                return (
                  <div
                    key={`soldier_${soldier.id}`}
                    onClick={() => {
                      onSelectSoldier(soldier);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                        {soldier.rank.slice(0, 3)}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                          {soldier.rank} / {soldier.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          رقم: {soldier.militaryNumber} • {soldier.unitId} • {soldier.phoneNumber || 'لا يوجد هاتف'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMilitaryCard?.(soldier);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black transition-colors"
                      >
                        بطاقة عسكرية
                      </button>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              }

              if (item.type === 'unit') {
                const unit = item.data;
                return (
                  <button
                    key={`unit_${unit.id}`}
                    type="button"
                    onClick={() => {
                      onNavigateTab('org');
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                          {unit.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          القائد: {unit.commanderName || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                );
              }

              return null;
            })
          ) : (
            <div className="p-8 text-center text-xs font-bold text-slate-400">
              لا توجد نتائج مطابقة لـ "{query}"
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span>استخدم <strong className="font-mono text-indigo-600 dark:text-indigo-400">↑ ↓</strong> للتنقل</span>
            <span>و <strong className="font-mono text-indigo-600 dark:text-indigo-400">ENTER</strong> للاختيار</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:underline cursor-pointer text-slate-600 dark:text-slate-300"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
