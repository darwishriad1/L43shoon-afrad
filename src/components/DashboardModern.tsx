import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpLeft, BarChart3, CalendarCheck2, CheckCircle2, ChevronLeft, Clock3, FileBarChart2, Filter, Gauge, LayoutGrid, ListFilter, Search, ShieldCheck, Sparkles, Users, XCircle, Zap } from 'lucide-react';
import { AttendanceRecord, AuditLog, PrintSettings, Soldier, Unit, User as UserType } from '../types';
import { normalizeStatusCode } from '../utils/attendanceStatus';

interface DashboardModernProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  users?: UserType[];
  auditLogs?: AuditLog[];
  onNavigate?: (tab: string) => void;
  onViewSoldierProfile?: (soldierId: string) => void;
  currentUser?: { id: string; name: string; role: string; unitId: string | null };
  printSettings?: PrintSettings;
  onAddLog?: (actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة', tableName: string, details: string) => void;
}

type UnitReadiness = Unit & { active: number; present: number; absent: number; leave: number; readiness: number };

const todayKey = () => new Date().toISOString().slice(0, 10);
const formatNumber = (value: number) => new Intl.NumberFormat('ar-EG').format(value);

export default function DashboardModern({ units, soldiers, attendance, users = [], auditLogs = [], onNavigate, onViewSoldierProfile, currentUser }: DashboardModernProps) {
  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'units'>('overview');
  const today = todayKey();

  const activeSoldiers = useMemo(() => soldiers.filter(soldier => soldier.isActive), [soldiers]);
  const todayAttendance = useMemo(() => attendance.filter(record => record.date === today), [attendance, today]);
  const attendanceMap = useMemo(() => new Map(todayAttendance.map(record => [record.soldierId, normalizeStatusCode(record.statusCode)])), [todayAttendance]);

  const unitStats = useMemo<UnitReadiness[]>(() => units.map(unit => {
    const members = activeSoldiers.filter(soldier => soldier.unitId === unit.id);
    const present = members.filter(soldier => ['ح', 'ن', 'م'].includes(attendanceMap.get(soldier.id) || '')).length;
    const absent = members.filter(soldier => attendanceMap.get(soldier.id) === 'غ').length;
    const leave = members.filter(soldier => ['إ', 'ع'].includes(attendanceMap.get(soldier.id) || '')).length;
    return { ...unit, active: members.length, present, absent, leave, readiness: members.length ? Math.round((present / members.length) * 100) : 0 };
  }).sort((a, b) => b.readiness - a.readiness), [units, activeSoldiers, attendanceMap]);

  const presentCount = activeSoldiers.filter(soldier => ['ح', 'ن', 'م'].includes(attendanceMap.get(soldier.id) || '')).length;
  const absentCount = activeSoldiers.filter(soldier => attendanceMap.get(soldier.id) === 'غ').length;
  const unrecordedCount = activeSoldiers.length - todayAttendance.filter(record => activeSoldiers.some(soldier => soldier.id === record.soldierId)).length;
  const readiness = activeSoldiers.length ? Math.round((presentCount / activeSoldiers.length) * 100) : 0;
  const pendingCount = useMemo(() => auditLogs.filter(log => ['استيراد', 'تعديل'].includes(log.actionType)).slice(0, 5).length, [auditLogs]);

  const filteredSoldiers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return activeSoldiers.filter(soldier => {
      const matchesUnit = unitFilter === 'all' || soldier.unitId === unitFilter;
      const matchesQuery = !normalized || [soldier.fullName, soldier.militaryNumber, soldier.rank].some(value => String(value || '').toLowerCase().includes(normalized));
      return matchesUnit && matchesQuery;
    }).slice(0, 8);
  }, [activeSoldiers, query, unitFilter]);

  const topUnits = unitStats.slice(0, 5);
  const attentionUnits = unitStats.filter(unit => unit.active > 0 && unit.readiness < 70).slice(0, 4);

  return (
    <section className="modern-dashboard" dir="rtl">
      <div className="modern-dashboard__hero">
        <div className="modern-dashboard__hero-copy">
          <div className="modern-dashboard__eyebrow"><span className="modern-live-dot" /> الموقف التشغيلي المباشر <span className="modern-dashboard__date">{today}</span></div>
          <h1>مركز قيادة الجاهزية</h1>
          <p>صورة تنفيذية مختصرة للقوة والحضور والوحدات التي تحتاج متابعة فورية.</p>
          <div className="modern-dashboard__hero-actions">
            <button type="button" onClick={() => onNavigate?.('attendance')}><CalendarCheck2 className="h-4 w-4" /> فتح كشف اليوم</button>
            <button type="button" className="secondary" onClick={() => onNavigate?.('reports')}><FileBarChart2 className="h-4 w-4" /> إنشاء تقرير</button>
          </div>
        </div>
        <div className="modern-dashboard__hero-meter" aria-label={`نسبة الجاهزية ${readiness}%`}>
          <div className="modern-meter-ring" style={{ '--meter-value': `${Math.max(readiness, 2)}%` } as React.CSSProperties}><strong>{readiness}%</strong><span>الجاهزية</span></div>
          <div className="modern-dashboard__hero-meta"><span><Activity className="h-4 w-4" /> تحديث اليوم</span><b>{formatNumber(todayAttendance.length)} سجل حضور</b></div>
        </div>
      </div>

      <div className="modern-kpi-grid">
        <article className="modern-kpi modern-kpi--navy"><div className="modern-kpi__icon"><Users /></div><span>القوة الفعلية</span><strong>{formatNumber(activeSoldiers.length)}</strong><small>فرد على رأس القوة</small></article>
        <article className="modern-kpi modern-kpi--teal"><div className="modern-kpi__icon"><CheckCircle2 /></div><span>حاضر / مهمة</span><strong>{formatNumber(presentCount)}</strong><small>{activeSoldiers.length ? Math.round((presentCount / activeSoldiers.length) * 100) : 0}% من القوة</small></article>
        <article className="modern-kpi modern-kpi--red"><div className="modern-kpi__icon"><XCircle /></div><span>غياب مسجل</span><strong>{formatNumber(absentCount)}</strong><small>يحتاج تحققاً ومتابعة</small></article>
        <article className="modern-kpi modern-kpi--gold"><div className="modern-kpi__icon"><Clock3 /></div><span>غير مسجل</span><strong>{formatNumber(Math.max(unrecordedCount, 0))}</strong><small>استكمال التحضير اليومي</small></article>
      </div>

      <div className="modern-dashboard__toolbar">
        <div className="modern-view-switcher"><button type="button" className={viewMode === 'overview' ? 'active' : ''} onClick={() => setViewMode('overview')}><LayoutGrid /> نظرة عامة</button><button type="button" className={viewMode === 'units' ? 'active' : ''} onClick={() => setViewMode('units')}><ListFilter /> الوحدات</button></div>
        <div className="modern-dashboard__quick-state"><ShieldCheck className="h-4 w-4" /> الجلسة: <b>{currentUser?.name || 'المستخدم الموثق'}</b></div>
      </div>

      {viewMode === 'overview' ? <div className="modern-dashboard__grid">
        <article className="modern-panel modern-panel--wide">
          <div className="modern-panel__heading"><div><span className="modern-panel__kicker">مقارنة الوحدات</span><h2>أفضل مستويات الجاهزية</h2></div><button type="button" onClick={() => setViewMode('units')}>عرض الكل <ChevronLeft /></button></div>
          <div className="modern-unit-list">{topUnits.map(unit => <button type="button" key={unit.id} className="modern-unit-row" onClick={() => { setUnitFilter(unit.id); setViewMode('units'); }}><span className="modern-unit-rank">{topUnits.indexOf(unit) + 1}</span><span className="modern-unit-name"><b>{unit.name}</b><small>{formatNumber(unit.active)} فرد • {formatNumber(unit.present)} حاضر</small></span><span className="modern-bar"><i style={{ width: `${unit.readiness}%` }} /></span><strong className={unit.readiness < 70 ? 'low' : ''}>{unit.readiness}%</strong></button>)}</div>
          {topUnits.length === 0 && <div className="modern-empty"><BarChart3 /> لا توجد وحدات مسجلة بعد.</div>}
        </article>

        <article className="modern-panel modern-panel--side"><div className="modern-panel__heading"><div><span className="modern-panel__kicker">مركز الانتباه</span><h2>يحتاج متابعة</h2></div><AlertTriangle className="text-amber-500" /></div>{attentionUnits.length ? <div className="modern-attention-list">{attentionUnits.map(unit => <button type="button" key={unit.id} onClick={() => { setUnitFilter(unit.id); setViewMode('units'); }}><span><AlertTriangle /><b>{unit.name}</b></span><strong>{unit.readiness}%</strong><small>جاهزية أقل من الحد التشغيلي</small></button>)}</div> : <div className="modern-success"><CheckCircle2 /><b>الموقف مستقر</b><span>لا توجد وحدات تحت حد المتابعة.</span></div>}</article>

        <article className="modern-panel modern-panel--wide modern-search-panel"><div className="modern-panel__heading"><div><span className="modern-panel__kicker">الوصول السريع</span><h2>ابحث في القوة</h2></div><Search className="text-slate-400" /></div><div className="modern-search-controls"><div className="modern-search-input"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="الاسم أو الرقم العسكري أو الرتبة" /></div><select value={unitFilter} onChange={event => setUnitFilter(event.target.value)}><option value="all">كل الوحدات</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></div><div className="modern-soldier-results">{filteredSoldiers.map(soldier => <button type="button" key={soldier.id} onClick={() => onViewSoldierProfile?.(soldier.id)}><span className="modern-avatar">{soldier.fullName?.slice(0, 1) || 'ف'}</span><span><b>{soldier.fullName}</b><small>{soldier.rank} • {soldier.militaryNumber}</small></span><ArrowUpLeft /></button>)}{query && !filteredSoldiers.length && <div className="modern-empty small"><Search /> لا توجد نتائج مطابقة.</div>}</div></article>

        <article className="modern-panel modern-panel--side modern-operations-panel"><div className="modern-panel__heading"><div><span className="modern-panel__kicker">تشغيل</span><h2>إجراءات ميدانية</h2></div><Zap className="text-emerald-600" /></div><div className="modern-operation-grid"><button type="button" onClick={() => onNavigate?.('attendance')}><CalendarCheck2 /><span>تحضير اليوم</span></button><button type="button" onClick={() => onNavigate?.('org_manager')}><Users /><span>إدارة الأفراد</span></button><button type="button" onClick={() => onNavigate?.('reports')}><FileBarChart2 /><span>تقارير رسمية</span></button><button type="button" onClick={() => onNavigate?.('settings')}><Gauge /><span>إعدادات النظام</span></button></div><div className="modern-activity-line"><span className="modern-live-dot" /> {formatNumber(users.length)} حسابات • {formatNumber(pendingCount)} عمليات حديثة</div></article>
      </div> : <div className="modern-panel modern-panel--full"><div className="modern-panel__heading"><div><span className="modern-panel__kicker">تفاصيل الوحدات</span><h2>الموقف التفصيلي</h2></div><div className="modern-filter-label"><Filter /> {unitFilter === 'all' ? 'كل الوحدات' : units.find(unit => unit.id === unitFilter)?.name}</div></div><div className="modern-unit-table">{unitStats.filter(unit => unitFilter === 'all' || unit.id === unitFilter).map(unit => <div className="modern-unit-table-row" key={unit.id}><div><b>{unit.name}</b><span>{unit.active} فرد فعّال</span></div><span>{unit.present} حاضر</span><span>{unit.absent} غياب</span><span>{unit.leave} إجازة/عذر</span><strong className={unit.readiness < 70 ? 'low' : ''}>{unit.readiness}%</strong></div>)}</div></div>}

      <footer className="modern-dashboard__footer"><span><Sparkles /> شاشة مؤشرات جديدة — مركز قيادة الجاهزية</span><span>بيانات اليوم: {today}</span></footer>
    </section>
  );
}
