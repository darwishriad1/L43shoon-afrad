import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, FileBarChart2, LayoutDashboard, Plus, Search, Settings2, ShieldCheck, Users, X, Zap } from 'lucide-react';

interface CommandCenterProps {
  onNavigate: (tab: string) => void;
  soldierCount: number;
  unitCount: number;
  pendingRequests: number;
}

const actions = [
  { id: 'dashboard', label: 'لوحة المؤشرات', description: 'الموقف التنفيذي والجاهزية', icon: LayoutDashboard, tab: 'dashboard', tone: 'bg-emerald-100 text-emerald-700' },
  { id: 'attendance', label: 'تسجيل التحضير', description: 'فتح كشف الحضور اليومي', icon: CalendarCheck2, tab: 'attendance', tone: 'bg-blue-100 text-blue-700' },
  { id: 'org_manager', label: 'إدارة القوة', description: 'الأفراد والوحدات والبحث', icon: Users, tab: 'org_manager', tone: 'bg-violet-100 text-violet-700' },
  { id: 'reports', label: 'التقارير الرسمية', description: 'استخراج وطباعة التقارير', icon: FileBarChart2, tab: 'reports', tone: 'bg-amber-100 text-amber-700' },
  { id: 'settings', label: 'الإعدادات', description: 'النسخ الاحتياطي والصلاحيات', icon: Settings2, tab: 'settings', tone: 'bg-slate-200 text-slate-700' },
];

export default function CommandCenter({ onNavigate, soldierCount, unitCount, pendingRequests }: CommandCenterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter(action => `${action.label} ${action.description}`.toLowerCase().includes(normalized));
  }, [query]);

  const navigate = (tab: string) => {
    onNavigate(tab);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="command-trigger group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
        title="مركز الإجراءات السريعة — Ctrl+K"
      >
        <Zap className="h-4 w-4 text-emerald-600 transition-transform group-hover:rotate-12" />
        <span className="hidden md:inline">إجراء سريع</span>
        <kbd className="hidden xl:inline rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">Ctrl K</kbd>
      </button>

      {open && (
        <div className="command-overlay fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/55 p-3 pt-[12vh] backdrop-blur-sm sm:p-6" dir="rtl" onMouseDown={() => setOpen(false)}>
          <section className="command-panel w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
              <Search className="h-5 w-5 shrink-0 text-emerald-600" />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ابحث عن قسم أو إجراء..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
              <div className="rounded-2xl bg-emerald-50 p-3"><span className="text-[10px] font-bold text-emerald-700">قوة فعالة</span><strong className="mt-1 block text-xl font-black text-emerald-900">{soldierCount}</strong></div>
              <div className="rounded-2xl bg-blue-50 p-3"><span className="text-[10px] font-bold text-blue-700">الوحدات</span><strong className="mt-1 block text-xl font-black text-blue-900">{unitCount}</strong></div>
              <div className="rounded-2xl bg-amber-50 p-3"><span className="text-[10px] font-bold text-amber-700">طلبات معلقة</span><strong className="mt-1 block text-xl font-black text-amber-900">{pendingRequests}</strong></div>
            </div>

            <div className="border-t border-slate-100 p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-black text-slate-500">اختصارات التشغيل</span><span className="text-[10px] text-slate-400">اختر للانتقال الفوري</span></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredActions.map(action => {
                  const Icon = action.icon;
                  return <button key={action.id} type="button" onClick={() => navigate(action.tab)} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-right transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tone}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0"><strong className="block text-xs font-black text-slate-800">{action.label}</strong><small className="mt-0.5 block truncate text-[10px] text-slate-500">{action.description}</small></span>
                  </button>;
                })}
              </div>
              {filteredActions.length === 0 && <div className="p-6 text-center text-sm font-bold text-slate-400">لا توجد نتائج مطابقة.</div>}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> جلسة تشغيل آمنة</span><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ctrl + K</span></div>
          </section>
        </div>
      )}
    </>
  );
}
