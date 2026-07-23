import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Award, 
  HeartHandshake, 
  Briefcase, 
  FileText, 
  Clock, 
  UserCheck, 
  Calendar, 
  Search, 
  Plus, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Users, 
  Compass, 
  Bookmark, 
  ChevronRight, 
  Filter, 
  Download, 
  X, 
  Check, 
  BadgeAlert, 
  TrendingUp, 
  PackageCheck, 
  FileCheck, 
  Building2, 
  Flame, 
  ShieldAlert, 
  Sparkle,
  PhoneCall,
  UserPlus
} from 'lucide-react';
import { Soldier, Unit } from '../types';

interface SpecialSectionsProps {
  soldiers: Soldier[];
  units: Unit[];
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  onNavigateToSoldier?: (soldierId: string) => void;
}

export default function SpecialSections({ soldiers = [], units = [], currentUser, onNavigateToSoldier }: SpecialSectionsProps) {
  const isRestrictedUser = useMemo(() => {
    return currentUser && currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
  }, [currentUser]);

  const scopedSoldiers = useMemo(() => {
    if (isRestrictedUser && currentUser?.unitId) {
      return soldiers.filter(s => s.unitId === currentUser.unitId);
    }
    return soldiers;
  }, [soldiers, isRestrictedUser, currentUser]);

  const scopedUnits = useMemo(() => {
    if (isRestrictedUser && currentUser?.unitId) {
      return units.filter(u => u.id === currentUser.unitId);
    }
    return units;
  }, [units, isRestrictedUser, currentUser]);

  const [activeSubTab, setActiveSubTab] = useState<'leaves' | 'promotions' | 'welfare' | 'equipment' | 'archive' | 'discipline'>('leaves');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('ALL');
  
  // Modal states for interactive actions
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for modals
  const [selectedSoldierId, setSelectedSoldierId] = useState('');
  const [leaveType, setLeaveType] = useState('إجازة عادية');
  const [leaveDays, setLeaveDays] = useState('7');
  const [leaveNotes, setLeaveNotes] = useState('');

  const [promotedSoldierId, setPromotedSoldierId] = useState('');
  const [newRank, setNewRank] = useState('عريف');
  const [promotionReason, setPromotionReason] = useState('استحقاق الأقدمية والانضباط القتالي');

  const [welfareSoldierId, setWelfareSoldierId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState<'شهيد' | 'جريح' | 'مساعدة مالية'>('مساعدة مالية');
  const [welfareAmount, setWelfareAmount] = useState('50000');
  const [welfareNotes, setWelfareNotes] = useState('');

  const [equipmentSoldierId, setEquipmentSoldierId] = useState('');
  const [equipmentType, setEquipmentType] = useState('كلاشنكوف A47 مع 4 مخازن');
  const [equipmentSerial, setEquipmentSerial] = useState('AK-99238');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mock initial data for services
  const [leavesList, setLeavesList] = useState([
    { id: '1', soldierName: 'أحمد علي حسن الشحري', militaryNo: 'MIL-1002', unit: 'الكتيبة الأولى - السرية 1', type: 'إجازة ميدانية', days: '7 أيام', status: 'سارية', returnDate: '2026-07-25' },
    { id: '2', soldierName: 'صالح محمد قاسم العولقي', militaryNo: 'MIL-1005', unit: 'الكتيبة الأولى - السرية 2', type: 'إجازة مرضية', days: '14 يوم', status: 'متأخر 2 يوم', returnDate: '2026-07-19' },
    { id: '3', soldierName: 'خالد عبد الرزاق اليافعي', militaryNo: 'MIL-1012', unit: 'كتيبة الدعم واللوجستيات', type: 'أمر تحرك وتكليف', days: '3 أيام', status: 'عائد حديثاً', returnDate: '2026-07-21' },
  ]);

  const [promotionsList, setPromotionsList] = useState([
    { id: '1', soldierName: 'فهد ناصر الماربي', militaryNo: 'MIL-1008', currentRank: 'جندي', targetRank: 'عريف', serviceYears: '4 سنوات', disciplineScore: '98%', status: 'مستحق الترقية القادمة' },
    { id: '2', soldierName: 'عمر طارق الضالعي', militaryNo: 'MIL-1015', currentRank: 'عريف', targetRank: 'رقيب', serviceYears: '6 سنوات', disciplineScore: '95%', status: 'قيد الاعتماد من القيادة' },
    { id: '3', soldierName: 'سعيد عبد الله الصبيحي', militaryNo: 'MIL-1020', currentRank: 'رقيب', targetRank: 'رقيب أول', serviceYears: '8 سنوات', disciplineScore: '99%', status: 'تمت الترقية مؤخراً' },
  ]);

  const [welfareList, setWelfareList] = useState([
    { id: '1', soldierName: 'الشهيد البطل / سالم عبد الرب العولقي', militaryNo: 'MIL-088', unit: 'الكتيبة الثانية', category: 'شهيد الواجب', benefit: 'راتب شهري كامل + سلة غذائية + إعانة سكن', status: 'معتمد رسمياً' },
    { id: '2', soldierName: 'الجريح / محسن علي أحمد الحرازي', militaryNo: 'MIL-142', unit: 'الكتيبة الأولى', category: 'جريح معركة', benefit: 'علاج طبي متخصص + إعانة علاجية 200,000 ريال', status: 'قيد الصرف' },
    { id: '3', soldierName: 'الجندي / عادل سعيد الحضرمي', militaryNo: 'MIL-1025', unit: 'كتيبة المدفعية', category: 'مساعدة اجتماعية', benefit: 'سلفة زواج وإعانة عائلية 100,000 ريال', status: 'تم الصرف' },
  ]);

  const [equipmentList, setEquipmentList] = useState([
    { id: '1', soldierName: 'محمد قائد الشبواني', militaryNo: 'MIL-1003', item: 'آلي كلاشنكوف AK-47 + 4 مخازن + سترة تكتيكية', serial: 'AK-884920', issueDate: '2025-01-10', status: 'بحوزة الفرد' },
    { id: '2', soldierName: 'عبد القادر صالح المهرية', militaryNo: 'MIL-1018', item: 'جهاز لاسلكي تكتيكي HYT + منظار ليلي', serial: 'R-7721', issueDate: '2025-03-15', status: 'مخزنة في المخزن أثناء الإجازة' },
    { id: '3', soldierName: 'عبد الله محسن الردفاني', militaryNo: 'MIL-1033', item: 'مسدس طارق 9 ملم + جفرة عسكرية', serial: 'P-9912', issueDate: '2024-11-20', status: 'بحوزة الفرد' },
  ]);

  const [archivesList, setArchivesList] = useState([
    { id: '1', docNo: 'REF-2026-88', title: 'أمر إداري بشأن تنظيم آلية التحضير اليومي والنداء الآلي', date: '2026-07-01', issuer: 'قائد اللواء 43 عمالقة', category: 'توجيه عملياتي' },
    { id: '2', docNo: 'REF-2026-92', title: 'قرار حصر وتحديث بيانات العهد الفردية وتصاريح السلاح', date: '2026-07-10', issuer: 'رئيس أركان اللواء', category: 'تنظيمي إداري' },
    { id: '3', docNo: 'REF-2026-101', title: 'تعميم حوافز ومكافآت الانضباط القتالي والسيطرة الميدانية', date: '2026-07-18', issuer: 'ركن إدارة شؤون الأفراد', category: 'مالي وإداري' },
  ]);

  // Handlers for modal forms
  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const soldier = soldiers.find(s => s.id === selectedSoldierId);
    const name = soldier ? soldier.fullName : 'جندي ميداني';
    const milNo = soldier ? (soldier.militaryNumber || 'MIL-NEW') : 'MIL-NEW';
    const unitObj = soldier ? units.find(u => u.id === soldier.unitId) : null;
    const unitName = unitObj ? unitObj.name : 'الكتيبة العامة';

    const newEntry = {
      id: Date.now().toString(),
      soldierName: name,
      militaryNo: milNo,
      unit: unitName,
      type: leaveType,
      days: `${leaveDays} أيام`,
      status: 'سارية',
      returnDate: new Date(Date.now() + parseInt(leaveDays) * 86400000).toISOString().split('T')[0]
    };

    setLeavesList([newEntry, ...leavesList]);
    setActiveModal(null);
    showToast(`تم توثيق ${leaveType} للفرد (${name}) بنجاح.`);
  };

  const handleAddPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    const soldier = soldiers.find(s => s.id === promotedSoldierId);
    const name = soldier ? soldier.fullName : 'جندي';
    const milNo = soldier ? (soldier.militaryNumber || 'MIL-NEW') : 'MIL-NEW';
    const currRank = soldier ? (soldier.rank || 'جندي') : 'جندي';

    const newEntry = {
      id: Date.now().toString(),
      soldierName: name,
      militaryNo: milNo,
      currentRank: currRank,
      targetRank: newRank,
      serviceYears: '3 سنوات',
      disciplineScore: '97%',
      status: 'قيد الاعتماد من القيادة'
    };

    setPromotionsList([newEntry, ...promotionsList]);
    setActiveModal(null);
    showToast(`تم رفع مقترح ترقية الفرد (${name}) إلى رتبة ${newRank}.`);
  };

  const handleAddWelfare = (e: React.FormEvent) => {
    e.preventDefault();
    const soldier = soldiers.find(s => s.id === welfareSoldierId);
    const name = soldier ? soldier.fullName : 'فرد في اللواء';
    const milNo = soldier ? (soldier.militaryNumber || 'MIL-NEW') : 'MIL-NEW';
    const unitObj = soldier ? units.find(u => u.id === soldier.unitId) : null;
    const unitName = unitObj ? unitObj.name : 'قيادة اللواء';

    const newEntry = {
      id: Date.now().toString(),
      soldierName: name,
      militaryNo: milNo,
      unit: unitName,
      category: welfareCategory,
      benefit: `إعانة بمبلغ ${parseInt(welfareAmount).toLocaleString()} ريال - ${welfareNotes}`,
      status: 'معتمد رسمياً'
    };

    setWelfareList([newEntry, ...welfareList]);
    setActiveModal(null);
    showToast(`تم تسجيل المساعدة/الرعاية الاجتماعية للفرد (${name}) بنجاح.`);
  };

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    const soldier = soldiers.find(s => s.id === equipmentSoldierId);
    const name = soldier ? soldier.fullName : 'فرد عسكري';
    const milNo = soldier ? (soldier.militaryNumber || 'MIL-NEW') : 'MIL-NEW';

    const newEntry = {
      id: Date.now().toString(),
      soldierName: name,
      militaryNo: milNo,
      item: equipmentType,
      serial: equipmentSerial,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'بحوزة الفرد'
    };

    setEquipmentList([newEntry, ...equipmentList]);
    setActiveModal(null);
    showToast(`تم صرف وتسجيل العهدة العسكرية (${equipmentType}) للفرد (${name}).`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-right select-none font-sans pb-12" dir="rtl">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black">{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Section Banner - Executive Military Command Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-slate-100 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-15"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>إدارة شؤون الأفراد والسيطرة الميدانية - اللواء 43 عمالقة</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              لوحة الأقسام والخدمات الإدارية والعملياتية المتميزة
            </h1>
            
            <p className="text-xs text-slate-300 font-bold max-w-2xl leading-relaxed">
              منظومة إدارية متكاملة لربط الإجازات، الترقيات، رعاية الشهداء والجرحى، العهد العسكرية الفردية والأرشيف الرقمي للتوجيهات بحرفية عالية.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto shrink-0">
            <div className="bg-slate-800/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي القوة</span>
              <span className="text-base font-black text-emerald-400">{soldiers.length || 120} فرد</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">في الإجازة/التكليف</span>
              <span className="text-base font-black text-amber-400">{leavesList.length} أفراد</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-700 text-center hidden sm:block">
              <span className="text-[10px] text-slate-400 font-bold block">العهد المسجلة</span>
              <span className="text-base font-black text-cyan-400">{equipmentList.length} قطعة</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs for Special Sections */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-1 overflow-x-auto font-sans">
        
        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'leaves'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>الإجازات والمهمات الميدانية</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'leaves' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {leavesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('promotions')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'promotions'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>الترقيات والدورات التدريبية</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'promotions' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {promotionsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('welfare')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'welfare'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>رعاية الشهداء والجرحى والمساعدات</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'welfare' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {welfareList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('equipment')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'equipment'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>العهد والتجهيزات العسكرية</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'equipment' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {equipmentList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('archive')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'archive'
              ? 'bg-emerald-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الأرشيف والقرارات الإدارية</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'archive' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {archivesList.length}
          </span>
        </button>

      </div>

      {/* 3. SUB TAB 1: LEAVES & FIELD MISSIONS */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>سجل الإجازات والتصاريح العسكرية والمهمات الميدانية</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">توثيق طلبات الخروج وأوامر الحركة ومتابعة متأخري العودة في الميدان</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveModal('add_leave')}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار إجازة / تصريح جديد</span>
                </button>
              </div>
            </div>

            {/* Table / List */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                  <tr>
                    <th className="p-3">اسم الفرد / الضابط</th>
                    <th className="p-3">الرقم العسكري</th>
                    <th className="p-3">الكتيبة / السرية</th>
                    <th className="p-3">نوع التصريح / الإجازة</th>
                    <th className="p-3">المدة</th>
                    <th className="p-3">تاريخ العودة المتوقع</th>
                    <th className="p-3">الحالة الميدانية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {leavesList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-black text-slate-900">{item.soldierName}</td>
                      <td className="p-3 font-mono text-emerald-800">{item.militaryNo}</td>
                      <td className="p-3 text-slate-600">{item.unit}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{item.days}</td>
                      <td className="p-3 font-mono text-slate-600">{item.returnDate}</td>
                      <td className="p-3">
                        {item.status.includes('متأخر') ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-black text-[10px] flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3 h-3" />
                            {item.status}
                          </span>
                        ) : item.status === 'سارية' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-black text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.status}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-bold text-[10px] w-fit block">
                            {item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* 4. SUB TAB 2: PROMOTIONS & COURSES */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>سجل الترقيات العسكرية والدورات التخصصية</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">متابعة المستحقين للترقية وسجلات الدورات القتالية والتأهيل العسكري</p>
              </div>

              <button
                onClick={() => setActiveModal('add_promotion')}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>رفع مقترح ترقية جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {promotionsList.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-extrabold">
                      {item.militaryNo}
                    </span>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      نسبة الانضباط: {item.disciplineScore}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.soldierName}</h4>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">سنوات الخدمة: {item.serviceYears}</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">الرتبة الحالية</span>
                      <span className="font-black text-slate-700">{item.currentRank}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 font-bold block">الرتبة المستحقة</span>
                      <span className="font-black text-emerald-800">{item.targetRank}</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-extrabold text-slate-700 pt-1 border-t border-slate-200/60 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 5. SUB TAB 3: WELFARE & MARTYRS */}
      {activeSubTab === 'welfare' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-700" />
                  <span>قسم الرعاية الاجتماعية وشؤون الشهداء والجرحى</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">متابعة ملفات الشرف والمكافآت والإعانات المالية والعلاجية لأبطال اللواء</p>
              </div>

              <button
                onClick={() => setActiveModal('add_welfare')}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل إعانة / ملف رعاية</span>
              </button>
            </div>

            <div className="space-y-3">
              {welfareList.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-full font-black text-[10px]">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">{item.militaryNo}</span>
                      <span className="text-[10px] text-slate-400 font-bold">• {item.unit}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{item.soldierName}</h4>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">{item.benefit}</p>
                  </div>

                  <div className="shrink-0 self-end md:self-center">
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black inline-block">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 6. SUB TAB 4: EQUIPMENT & ARMS */}
      {activeSubTab === 'equipment' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span>كشوفات العهد العسكرية والأسلحة والتجهيزات الفردية</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">توثيق الأسلحة الشخصية والأجهزة اللاسلكية والتجهيزات المسلمة لكل فرد</p>
              </div>

              <button
                onClick={() => setActiveModal('add_equipment')}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>تسليم عهدة عسكرية جديدة</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                  <tr>
                    <th className="p-3">الفرد المستلم</th>
                    <th className="p-3">الرقم العسكري</th>
                    <th className="p-3">تفاصيل العهدة المسلمة</th>
                    <th className="p-3">الرقم التسلسلي (S/N)</th>
                    <th className="p-3">تاريخ الصرف</th>
                    <th className="p-3">حالة العهدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {equipmentList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-black text-slate-900">{item.soldierName}</td>
                      <td className="p-3 font-mono text-emerald-800">{item.militaryNo}</td>
                      <td className="p-3 text-slate-800">{item.item}</td>
                      <td className="p-3 font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit">{item.serial}</td>
                      <td className="p-3 font-mono text-slate-500">{item.issueDate}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-black text-[10px]">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* 7. SUB TAB 5: ARCHIVE & DIRECTIVES */}
      {activeSubTab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>الأرشيف الرقمي للقرارات والتوجيهات والتعاميم القيادية</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">توثيق وأرشفة القرارات الإدارية والعملياتية لسهولة الرجوع إليها</p>
              </div>
            </div>

            <div className="space-y-3">
              {archivesList.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded font-black">
                        {item.docNo}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{item.category}</span>
                      <span className="text-[10px] text-slate-400 font-mono">• {item.date}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-bold">جهة الإصدار: {item.issuer}</p>
                  </div>

                  <button 
                    onClick={() => showToast(`جارٍ تحميل واستعراض أصل الوثيقة الرقمية (${item.docNo})`)}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>تحميل القرار</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD LEAVE --- */}
      {activeModal === 'add_leave' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>إصدار إجازة / امر تحرك ميداني جديد</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLeave} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">اختر الفرد / الضابط:</label>
                <select
                  value={selectedSoldierId}
                  onChange={(e) => setSelectedSoldierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  required
                >
                  <option value="">-- اختر الفرد من القوة --</option>
                  {soldiers.map(s => {
                    const uName = units.find(u => u.id === s.unitId)?.name || 'قيادة اللواء';
                    return (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.militaryNumber || 'بدون رقم'}) - {uName}</option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">نوع التصريح / الإجازة:</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="إجازة عادية">إجازة عادية</option>
                    <option value="إجازة مرضية">إجازة مرضية</option>
                    <option value="إجازة استثنائية">إجازة استثنائية</option>
                    <option value="أمر تحرك ومهمة">أمر تحرك ومهمة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">عدد الأيام:</label>
                  <input
                    type="number"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    min="1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black shadow-xs"
                >
                  حفظ وتوثيق الإجازة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD PROMOTION --- */}
      {activeModal === 'add_promotion' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <span>رفع مقترح ترقية عسكرية</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPromotion} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">الفرد المستحق:</label>
                <select
                  value={promotedSoldierId}
                  onChange={(e) => setPromotedSoldierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- اختر الفرد --</option>
                  {soldiers.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} - رتبة: {s.rank || 'جندي'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">الرتبة الجديدة المقترحة:</label>
                <select
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="عريف">عريف</option>
                  <option value="رقيب">رقيب</option>
                  <option value="رقيب أول">رقيب أول</option>
                  <option value="مساعد">مساعد</option>
                  <option value="ملازم ثانٍ">ملازم ثانٍ</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black shadow-xs"
                >
                  رفع المقترح للقيادة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD WELFARE --- */}
      {activeModal === 'add_welfare' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-700" />
                <span>تسجيل مساعدة / ملف رعاية اجتماعية</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWelfare} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">اسم الفرد / أسرة الشهيد أو الجريح:</label>
                <select
                  value={welfareSoldierId}
                  onChange={(e) => setWelfareSoldierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- اختر المستفيد --</option>
                  {soldiers.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.militaryNumber || 'بدون رقم'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">الفئة:</label>
                  <select
                    value={welfareCategory}
                    onChange={(e) => setWelfareCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="مساعدة مالية">مساعدة مالية</option>
                    <option value="جريح">جريح معركة</option>
                    <option value="شهيد">شهيد واجب</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">المبلغ / المستحق (ريال):</label>
                  <input
                    type="number"
                    value={welfareAmount}
                    onChange={(e) => setWelfareAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black shadow-xs"
                >
                  حفظ وتسجيل الرعاية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: ADD EQUIPMENT --- */}
      {activeModal === 'add_equipment' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <span>تسليم وصرف عهدة عسكرية فردية</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">الفرد المستلم:</label>
                <select
                  value={equipmentSoldierId}
                  onChange={(e) => setEquipmentSoldierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- اختر الفرد المستلم --</option>
                  {soldiers.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.militaryNumber || 'بدون رقم'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">بيان السلاح / العهدة:</label>
                <input
                  type="text"
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">الرقم التسلسلي للسلاح (Serial No):</label>
                <input
                  type="text"
                  value={equipmentSerial}
                  onChange={(e) => setEquipmentSerial(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black shadow-xs"
                >
                  اعتماد تسليم العهدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
