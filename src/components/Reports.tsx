import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Mail, 
  Clock, 
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  RefreshCw,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  Building2,
  Users,
  Shield,
  Medal,
  HeartPulse,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Search,
  Share2,
  Plus,
  Trash2,
  Save,
  Eye,
  Star,
  PieChart,
  BarChart3,
  Layers,
  Send,
  Sliders,
  UserCheck,
  Briefcase,
  Stethoscope,
  TrendingUp,
  Activity,
  BadgeCheck,
  Compass,
  FileCheck2,
  LayoutGrid,
  Grid
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode, PrintSettings } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { createReportSpreadsheet } from '../lib/sheets';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';

interface ReportsProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  printSettings?: PrintSettings;
  googleAccessToken: string | null;
  onSetGoogleAccessToken: (token: string | null) => void;
}

// 10 Main Categories Configuration matching Application Theme & Icon Launcher Identity
const REPORT_CATEGORIES = [
  {
    id: 'power',
    name: 'القوة والجاهزية البشرية',
    fullName: 'أولاً: تقارير القوة والجاهزية البشرية',
    icon: Users,
    colorName: 'زمردي',
    topLineBg: 'bg-emerald-500',
    tileIconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 group-hover:bg-emerald-100 group-hover:text-emerald-950',
    hoverGlow: 'rgba(16,185,129,0.22)',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs shadow-emerald-500/10',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-extrabold',
    tagBg: 'bg-emerald-50/80 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/90',
    hoverBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    description: 'كشوفات القوة الحالية واليومية والوزن البشري حسب الكتيبة والسرية والرتبة والسلاح.',
    subReports: [
      { id: 'power_current', label: 'كشف القوة الحالي' },
      { id: 'power_daily', label: 'كشف القوة اليومي' },
      { id: 'power_monthly', label: 'كشف القوة الشهري' },
      { id: 'power_battalion', label: 'القوة حسب الكتيبة' },
      { id: 'power_company', label: 'القوة حسب السرية' },
      { id: 'power_platoon', label: 'القوة حسب الفصيلة' },
      { id: 'power_rank', label: 'القوة حسب الرتبة' },
      { id: 'power_weapon', label: 'القوة حسب السلاح' },
      { id: 'power_specialty', label: 'القوة حسب التخصص' },
      { id: 'power_status', label: 'القوة حسب حالة الجاهزية' },
    ]
  },
  {
    id: 'attendance',
    name: 'التحضير والجاهزية',
    fullName: 'ثانياً: تقارير التحضير والجاهزية',
    icon: UserCheck,
    colorName: 'سماوي',
    topLineBg: 'bg-sky-500',
    tileIconBg: 'bg-sky-50 text-sky-700 border-sky-200/80 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200/80 group-hover:bg-sky-100 group-hover:text-sky-950',
    hoverGlow: 'rgba(14,165,233,0.22)',
    bgGradient: 'from-sky-500/10 via-blue-500/5 to-transparent',
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-xs shadow-sky-500/10',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-extrabold',
    tagBg: 'bg-sky-50/80 text-sky-800 border border-sky-200/80 hover:bg-sky-100/90',
    hoverBorder: 'hover:border-sky-500/60 hover:shadow-sky-500/10',
    description: 'تحضيرات الانضباط اليومي، كشوفات الحضور، الغياب، التأخير، والإجازات والمأموريات.',
    subReports: [
      { id: 'att_weekly_7days', label: '📊 تقرير إحصائي أسبوعي تلقائي (آخر 7 أيام)' },
      { id: 'att_daily', label: 'كشف التحضير اليومي' },
      { id: 'att_monthly', label: 'كشف التحضير الشهري' },
      { id: 'att_present', label: 'تقرير الحضور والتمام' },
      { id: 'att_absent', label: 'تقرير الغياب غير المبرر' },
      { id: 'att_late', label: 'تقرير التأخير' },
      { id: 'att_leaves', label: 'تقرير الإجازات والرخص' },
      { id: 'att_missions', label: 'تقرير المأموريات العسكرية' },
      { id: 'att_sick', label: 'تقرير الإجازات المرضية' },
      { id: 'att_frequent_absent', label: 'تقرير المتغيبين المتكررين' },
    ]
  },
  {
    id: 'leaves',
    name: 'الإجازات والحركة',
    fullName: 'ثالثاً: تقارير الإجازات والحركة',
    icon: CalendarRange,
    colorName: 'بنفسجي',
    topLineBg: 'bg-purple-500',
    tileIconBg: 'bg-purple-50 text-purple-700 border-purple-200/80 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500',
    badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200/80 group-hover:bg-purple-100 group-hover:text-purple-950',
    hoverGlow: 'rgba(168,85,247,0.22)',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-transparent',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs shadow-purple-500/10',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-extrabold',
    tagBg: 'bg-purple-50/80 text-purple-800 border border-purple-200/80 hover:bg-purple-100/90',
    hoverBorder: 'hover:border-purple-500/60 hover:shadow-purple-500/10',
    description: 'بيانات الاستحقاقات الرسمية، المتأخرين عن العودة، والإحصائيات الشهرية للإجازات.',
    subReports: [
      { id: 'leave_all', label: 'جميع الإجازات الرسمية' },
      { id: 'leave_ended', label: 'الإجازات المنتهية (المستوفين)' },
      { id: 'leave_active', label: 'الإجازات النشطة (خارج الوحدة)' },
      { id: 'leave_overdue', label: 'المتأخرون عن العودة' },
      { id: 'leave_type', label: 'الإجازات حسب النوع' },
      { id: 'leave_unit', label: 'الإجازات حسب الوحدة' },
      { id: 'leave_stat', label: 'إحصائية الإجازات الشهرية' },
    ]
  },
  {
    id: 'discipline',
    name: 'الانضباط والجزاءات',
    fullName: 'رابعاً: تقارير الانضباط',
    icon: Shield,
    colorName: 'وردي ناري',
    topLineBg: 'bg-rose-500',
    tileIconBg: 'bg-rose-50 text-rose-700 border-rose-200/80 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500',
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200/80 group-hover:bg-rose-100 group-hover:text-rose-950',
    hoverGlow: 'rgba(244,63,94,0.22)',
    bgGradient: 'from-rose-500/10 via-red-500/5 to-transparent',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs shadow-rose-500/10',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-extrabold',
    tagBg: 'bg-rose-50/80 text-rose-800 border border-rose-200/80 hover:bg-rose-100/90',
    hoverBorder: 'hover:border-rose-500/60 hover:shadow-rose-500/10',
    description: 'كشوف العقوبات، الإنذارات، المخالفات، كتب الثناء والتكريم، ومؤشرات الانضباط.',
    subReports: [
      { id: 'disc_penalties', label: 'تقرير العقوبات الجزائية' },
      { id: 'disc_warnings', label: 'تقرير الإنذارات الرسمية' },
      { id: 'disc_violations', label: 'تقرير المخالفات العسكرية' },
      { id: 'disc_honors', label: 'تقرير الثناء والتكريم والأوسمة' },
      { id: 'disc_most_disciplined', label: 'أكثر الأفراد انضباطاً' },
      { id: 'disc_least_disciplined', label: 'أقل الأفراد انضباطاً' },
    ]
  },
  {
    id: 'promotions',
    name: 'الترقيات والخدمة',
    fullName: 'خامساً: الترقيات وسنوات الخدمة',
    icon: TrendingUp,
    colorName: 'كهرماني',
    topLineBg: 'bg-amber-500',
    tileIconBg: 'bg-amber-50 text-amber-700 border-amber-200/80 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200/80 group-hover:bg-amber-100 group-hover:text-amber-950',
    hoverGlow: 'rgba(245,158,11,0.22)',
    bgGradient: 'from-amber-500/10 via-yellow-500/5 to-transparent',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs shadow-amber-500/10',
    badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-extrabold',
    tagBg: 'bg-amber-50/80 text-amber-800 border border-amber-200/80 hover:bg-amber-100/90',
    hoverBorder: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
    description: 'المستحقون للترقية، الأوامر المنفذة، بيانات خدمة الفرد، والمنقولين والمستجدين.',
    subReports: [
      { id: 'prom_eligible', label: 'المستحقون للترقية المستقبليين' },
      { id: 'prom_executed', label: 'الترقيات المنفذة مع أرقام القرار' },
      { id: 'prom_statement', label: 'بيان خدمة شامل لكل فرد' },
      { id: 'prom_years', label: 'تصنيف سنوات الخدمة' },
      { id: 'prom_transferred', label: 'المنقولون من وإلى الوحدة' },
      { id: 'prom_newcomers', label: 'المستجدون (الملتحقون الجدد)' },
      { id: 'prom_end_service', label: 'المنتهية خدمتهم والتقاعد' },
    ]
  },
  {
    id: 'medical',
    name: 'التقارير الطبية',
    fullName: 'سادساً: التقارير الطبية',
    icon: Stethoscope,
    colorName: 'زهري',
    topLineBg: 'bg-pink-500',
    tileIconBg: 'bg-pink-50 text-pink-700 border-pink-200/80 group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-500',
    badgeStyle: 'bg-pink-50 text-pink-800 border-pink-200/80 group-hover:bg-pink-100 group-hover:text-pink-950',
    hoverGlow: 'rgba(236,72,153,0.22)',
    bgGradient: 'from-pink-500/10 via-rose-500/5 to-transparent',
    iconBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 shadow-xs shadow-pink-500/10',
    badgeBg: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30 font-extrabold',
    tagBg: 'bg-pink-50/80 text-pink-800 border border-pink-200/80 hover:bg-pink-100/90',
    hoverBorder: 'hover:border-pink-500/60 hover:shadow-pink-500/10',
    description: 'حالات المرضى الحاليين، الإجازات المرضية، الأمراض المزمنة، والإصابات واللجان.',
    subReports: [
      { id: 'med_patients', label: 'المرضى الحاليون بالمستشفيات/الملاذ' },
      { id: 'med_leaves', label: 'سجل الإجازات المرضية' },
      { id: 'med_chronic', label: 'سجل ذوي الأمراض المزمنة' },
      { id: 'med_referrals', label: 'الإحالات والمراجعات الطبية' },
      { id: 'med_injuries', label: 'إصابات العمل الميداني' },
      { id: 'med_boards', label: 'قرارات اللجان الطبية العسكرية' },
    ]
  },
  {
    id: 'training',
    name: 'التدريب والدورات',
    fullName: 'سابعاً: تقارير التدريب',
    icon: GraduationCap,
    colorName: 'سماوي داكن',
    topLineBg: 'bg-cyan-500',
    tileIconBg: 'bg-cyan-50 text-cyan-700 border-cyan-200/80 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500',
    badgeStyle: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 group-hover:bg-cyan-100 group-hover:text-cyan-950',
    hoverGlow: 'rgba(6,182,212,0.22)',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-transparent',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs shadow-cyan-500/10',
    badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-extrabold',
    tagBg: 'bg-cyan-50/80 text-cyan-800 border border-cyan-200/80 hover:bg-cyan-100/90',
    hoverBorder: 'hover:border-cyan-500/60 hover:shadow-cyan-500/10',
    description: 'الدورات العسكرية المنفذة، القادمة، نتائج الاختبارات والرماية واللياقة البدنية.',
    subReports: [
      { id: 'train_executed', label: 'الدورات المنجزة بتمتير رسمي' },
      { id: 'train_upcoming', label: 'الدورات المجدولة القادمة' },
      { id: 'train_participants', label: 'بيان المشاركين بالدورات' },
      { id: 'train_unqualified', label: 'غير المؤهلين تدريبياً' },
      { id: 'train_exam_results', label: 'نتائج تقييمات الرماية واللياقة' },
    ]
  },
  {
    id: 'admin',
    name: 'القرارات الإدارية',
    fullName: 'ثامناً: التقارير الإدارية',
    icon: Briefcase,
    colorName: 'نيلي',
    topLineBg: 'bg-indigo-500',
    tileIconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500',
    badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200/80 group-hover:bg-indigo-100 group-hover:text-indigo-950',
    hoverGlow: 'rgba(99,102,241,0.22)',
    bgGradient: 'from-indigo-500/10 via-purple-500/5 to-transparent',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs shadow-indigo-500/10',
    badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-extrabold',
    tagBg: 'bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 hover:bg-indigo-100/90',
    hoverBorder: 'hover:border-indigo-500/60 hover:shadow-indigo-500/10',
    description: 'أوامر التعيين، النقل، الندب، الفصل، والتكليفات الإدارية والقرارات الصادرة.',
    subReports: [
      { id: 'admin_appointment', label: 'أوامر التعيين وتثبيت الأفراد' },
      { id: 'admin_transfer', label: 'أوامر النقل وحركة التبعية' },
      { id: 'admin_secondment', label: 'أوامر الندب والإعارة' },
      { id: 'admin_discharge', label: 'أوامر الفصل والتسريح' },
      { id: 'admin_assignment', label: 'أوامر التكليف بالمناصب' },
      { id: 'admin_decisions', label: 'الأوامر الإدارية والقرارات العسكرية' },
    ]
  },
  {
    id: 'analytics',
    name: 'الإحصائيات والمؤشرات',
    fullName: 'تاسعاً: التقارير الإحصائية',
    icon: BarChart3,
    colorName: 'برتقالي',
    topLineBg: 'bg-orange-500',
    tileIconBg: 'bg-orange-50 text-orange-700 border-orange-200/80 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500',
    badgeStyle: 'bg-orange-50 text-orange-800 border-orange-200/80 group-hover:bg-orange-100 group-hover:text-orange-950',
    hoverGlow: 'rgba(249,115,22,0.22)',
    bgGradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
    iconBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 shadow-xs shadow-orange-500/10',
    badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-extrabold',
    tagBg: 'bg-orange-50/80 text-orange-800 border border-orange-200/80 hover:bg-orange-100/90',
    hoverBorder: 'hover:border-orange-500/60 hover:shadow-orange-500/10',
    description: 'الرسوم البيانية والمؤشرات لنسب الجاهزية، توزيع المؤهلات، الأعمار والأسلحة.',
    subReports: [
      { id: 'stat_ranks', label: 'توزيع الرتب العسكرية' },
      { id: 'stat_ages', label: 'توزيع الفئات العمرية' },
      { id: 'stat_qualifications', label: 'توزيع المؤهلات العلمية' },
      { id: 'stat_weapons', label: 'توزيع السلاح والاختصاص' },
      { id: 'stat_specialties', label: 'توزيع التخصصات الميدانية' },
      { id: 'stat_avg_service', label: 'متوسط سنوات الخدمة' },
      { id: 'stat_absent_rate', label: 'معدل الغياب الإجمالي' },
      { id: 'stat_readiness_rate', label: 'معدل الجاهزية القتالية' },
      { id: 'stat_effective_power', label: 'نسبة القوة الفعلية بالميدان' },
    ]
  },
  {
    id: 'smart_center',
    name: 'صانع التقارير الذكي',
    fullName: 'عاشراً: مركز التقارير الذكي والقوالب',
    icon: Sparkles,
    colorName: 'ذهب ملكي',
    topLineBg: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600',
    tileIconBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-black shadow-md border border-amber-300 group-hover:scale-105',
    badgeStyle: 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold',
    hoverGlow: 'rgba(245,158,11,0.35)',
    bgGradient: 'from-amber-500/15 via-yellow-500/10 to-amber-600/5',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/20 border border-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-800 dark:text-amber-200 border border-amber-400/40 font-extrabold',
    tagBg: 'bg-amber-100/80 text-amber-900 border border-amber-300/80 hover:bg-amber-200',
    hoverBorder: 'hover:border-amber-500 hover:shadow-amber-500/20',
    description: 'بناء تقارير مخصصة بدون برمجة، اختيار الأعمدة وتحديد الشروط وحفظ القوالب.',
    subReports: [
      { id: 'smart_builder', label: '✨ صانع التقارير الذكي (Custom Builder)' },
      { id: 'saved_templates', label: '⭐ القوالب والتقارير المفضلة المحفوظة' },
    ]
  }
];

// Available Columns for Smart Report Center
const ALL_AVAILABLE_COLUMNS = [
  { key: 'militaryNumber', label: 'الرقم العسكري', defaultSelected: true },
  { key: 'fullName', label: 'الاسم الكامل', defaultSelected: true },
  { key: 'rank', label: 'الرتبة', defaultSelected: true },
  { key: 'unitName', label: 'الوحدة العسكرية', defaultSelected: true },
  { key: 'subUnit', label: 'السرية / الفصيلة', defaultSelected: true },
  { key: 'weapon', label: 'السلاح', defaultSelected: true },
  { key: 'specialty', label: 'التخصص العسكري', defaultSelected: true },
  { key: 'joinDate', label: 'تاريخ التجنيد', defaultSelected: true },
  { key: 'status', label: 'موقف الجاهزية / التحضير', defaultSelected: true },
  { key: 'phone', label: 'رقم الهاتف', defaultSelected: false },
  { key: 'nationalId', label: 'الرقم الوطني / الهوية', defaultSelected: false },
  { key: 'qualification', label: 'المؤهل العلمي', defaultSelected: false },
  { key: 'governorate', label: 'المحافظة / السكن', defaultSelected: false },
  { key: 'bloodType', label: 'فصيلة الدم', defaultSelected: false },
  { key: 'birthDate', label: 'تاريخ الميلاد', defaultSelected: false },
  { key: 'notes', label: 'الملاحظات والقرارات', defaultSelected: false },
];

export default function Reports({ 
  units, 
  soldiers, 
  attendance, 
  currentUser,
  printSettings,
  googleAccessToken, 
  onSetGoogleAccessToken 
}: ReportsProps) {

  // Restrict access if necessary
  const isRestrictedUser = useMemo(() => {
    return currentUser && currentUser.role !== 'admin' && currentUser.role !== 'commander_formation' && Boolean(currentUser.unitId);
  }, [currentUser]);

  const allowedUnits = useMemo(() => {
    if (isRestrictedUser && currentUser?.unitId) {
      return units.filter(u => u.id === currentUser.unitId);
    }
    return units;
  }, [units, isRestrictedUser, currentUser]);

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Navigation & Category Search State
  const [activeCategory, setActiveCategory] = useState<string>('power');
  const [activeSubReport, setActiveSubReport] = useState<string>('power_current');
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [categoriesViewMode, setCategoriesViewMode] = useState<'icons' | 'cards'>('icons');
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'ranks' | 'weapons' | 'units' | 'demographics'>('overview');

  // Filter categories by user search query
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return REPORT_CATEGORIES;
    const q = categorySearchQuery.toLowerCase().trim();
    return REPORT_CATEGORIES.filter(cat => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchDesc = cat.description.toLowerCase().includes(q);
      const matchSub = cat.subReports.some(sub => sub.label.toLowerCase().includes(q));
      return matchName || matchDesc || matchSub;
    });
  }, [categorySearchQuery]);

  // Universal Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(isRestrictedUser && currentUser?.unitId ? currentUser.unitId : 'all');
  const [selectedRank, setSelectedRank] = useState<string>('all');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Active Filters Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedUnitId !== 'all' && !(isRestrictedUser && selectedUnitId === currentUser?.unitId)) count++;
    if (selectedRank !== 'all') count++;
    if (selectedWeapon !== 'all') count++;
    if (startDate !== '2026-07-01') count++;
    return count;
  }, [searchQuery, selectedUnitId, selectedRank, selectedWeapon, startDate, isRestrictedUser, currentUser]);

  const handleResetFilters = () => {
    setSearchQuery('');
    if (!isRestrictedUser) setSelectedUnitId('all');
    setSelectedRank('all');
    setSelectedWeapon('all');
    setStartDate('2026-07-01');
  };

  // Smart Builder States
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    ALL_AVAILABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key)
  );
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; category: string; subReport: string; columns: string[]; filters: any }>>(() => {
    const defaultTemplates = [
      {
        id: 'tpl_1',
        name: 'قالب 1: كشف الجاهزية والربط القتالي الميداني',
        category: 'smart_center',
        subReport: 'smart_builder',
        columns: ['militaryNumber', 'fullName', 'rank', 'unitName', 'weapon', 'status', 'specialty'],
        filters: { unitId: 'all', rank: 'all', weapon: 'all' }
      },
      {
        id: 'tpl_2',
        name: 'قالب 2: تقرير موقف الحضور والغياب اليومي الشامل',
        category: 'smart_center',
        subReport: 'smart_builder',
        columns: ['militaryNumber', 'fullName', 'rank', 'unitName', 'status', 'joinDate', 'notes'],
        filters: { unitId: 'all', rank: 'all', weapon: 'all' }
      },
      {
        id: 'tpl_3',
        name: 'قالب 3: بيان الإجازات والحالات المرضية والحركة الميدانية',
        category: 'smart_center',
        subReport: 'smart_builder',
        columns: ['militaryNumber', 'fullName', 'rank', 'unitName', 'status', 'bloodType', 'phone'],
        filters: { unitId: 'all', rank: 'all', weapon: 'all' }
      },
      {
        id: 'tpl_4',
        name: 'قالب 4: تقرير توزيع الأسلحة والتخصصات الفنية والقتالية',
        category: 'smart_center',
        subReport: 'smart_builder',
        columns: ['militaryNumber', 'fullName', 'rank', 'unitName', 'weapon', 'specialty', 'qualification'],
        filters: { unitId: 'all', rank: 'all', weapon: 'مشاة' }
      }
    ];
    try {
      const saved = localStorage.getItem('military_saved_report_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultTemplates;
  });

  // Export / Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);

  // Email Schedule Modal
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [isScheduled, setIsScheduled] = useState(false);

  // Ranks & Weapons Lists for Filtering
  const availableRanks = useMemo(() => {
    const ranks = Array.from(new Set(soldiers.map(s => s.rank).filter(Boolean)));
    return ranks.length > 0 ? ranks : ['ملازم أول', 'نقيب', 'مساعد', 'رقيب أول', 'رقيب', 'عريف', 'جندي أول', 'جندي'];
  }, [soldiers]);

  const availableWeapons = useMemo(() => {
    const weapons = Array.from(new Set(soldiers.map(s => (s as any).weapon || 'مشاة').filter(Boolean)));
    return weapons.length > 0 ? weapons : ['مشاة', 'مدرعات', 'مدفعية', 'إشارة', 'مهندسين', 'استطلاع', 'إمداد وتموين'];
  }, [soldiers]);

  // Handler for category switch and full screen open
  const handleSelectCategory = (catId: string, openFullScreen = true) => {
    setActiveCategory(catId);
    const cat = REPORT_CATEGORIES.find(c => c.id === catId);
    if (cat && cat.subReports.length > 0) {
      setActiveSubReport(cat.subReports[0].id);
    }
    if (openFullScreen) {
      setIsFullScreenMode(true);
    }
  };

  // Toggle Column Selection for Smart Builder
  const handleToggleColumn = (colKey: string) => {
    if (selectedColumns.includes(colKey)) {
      if (selectedColumns.length <= 2) {
        alert('يجب أن يتضمن التقرير عمودين على الأقل');
        return;
      }
      setSelectedColumns(selectedColumns.filter(c => c !== colKey));
    } else {
      setSelectedColumns([...selectedColumns, colKey]);
    }
  };

  // Save Custom Report Template
  const handleSaveTemplate = () => {
    if (!templateNameInput.trim()) {
      alert('يرجى كتابة اسم القالب المخصص للتقرير');
      return;
    }

    const newTpl = {
      id: `tpl_${Date.now()}`,
      name: templateNameInput.trim(),
      category: activeCategory,
      subReport: activeSubReport,
      columns: [...selectedColumns],
      filters: { selectedUnitId, selectedRank, selectedWeapon, selectedStatus, startDate, endDate }
    };

    const updated = [newTpl, ...savedTemplates];
    setSavedTemplates(updated);
    try {
      localStorage.setItem('military_saved_report_templates', JSON.stringify(updated));
    } catch {}

    setTemplateNameInput('');
    alert(`تم حفظ التقرير كقالب مخصص باسم "${newTpl.name}" بنجاح!`);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا القالب المحفوظ؟')) return;
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem('military_saved_report_templates', JSON.stringify(updated));
    } catch {}
  };

  const handleApplyTemplate = (tpl: any) => {
    if (tpl.columns && tpl.columns.length > 0) {
      setSelectedColumns(tpl.columns);
    }
    if (tpl.filters) {
      if (tpl.filters.selectedUnitId) setSelectedUnitId(tpl.filters.selectedUnitId);
      if (tpl.filters.selectedRank) setSelectedRank(tpl.filters.selectedRank);
      if (tpl.filters.selectedWeapon) setSelectedWeapon(tpl.filters.selectedWeapon);
      if (tpl.filters.selectedStatus) setSelectedStatus(tpl.filters.selectedStatus);
    }
    setActiveCategory('smart_center');
    setActiveSubReport('smart_builder');
    alert(`تم تطبيق القالب المخصص: "${tpl.name}"`);
  };

  // Auto-set recommended columns when active sub-report changes
  useEffect(() => {
    if (activeCategory === 'smart_center') return; // preserve custom builder columns

    if (activeCategory === 'leave') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'status', 'joinDate', 'phone', 'notes']);
    } else if (activeCategory === 'discipline') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'weapon', 'status', 'notes']);
    } else if (activeCategory === 'promotions') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'joinDate', 'qualification', 'status', 'notes']);
    } else if (activeCategory === 'medical') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'qualification', 'governorate', 'status', 'notes']);
    } else if (activeCategory === 'training') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'weapon', 'specialty', 'qualification', 'notes']);
    } else if (activeCategory === 'administrative') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'joinDate', 'status', 'notes']);
    } else if (activeCategory === 'stat') {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'weapon', 'specialty', 'status']);
    } else {
      setSelectedColumns(['militaryNumber', 'fullName', 'rank', 'unitName', 'subUnit', 'weapon', 'specialty', 'joinDate', 'status']);
    }
  }, [activeCategory, activeSubReport]);

  // Dynamic Generator for Active Report Table Rows
  const reportTableData = useMemo(() => {
    let list = [...soldiers].filter(s => s.isActive);

    // Filter by Restricted Unit
    if (isRestrictedUser && currentUser?.unitId) {
      list = list.filter(s => s.unitId === currentUser.unitId);
    } else if (selectedUnitId !== 'all') {
      list = list.filter(s => s.unitId === selectedUnitId);
    }

    // Filter by Rank
    if (selectedRank !== 'all') {
      list = list.filter(s => s.rank === selectedRank);
    }

    // Filter by Weapon
    if (selectedWeapon !== 'all') {
      list = list.filter(s => ((s as any).weapon || 'مشاة') === selectedWeapon);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.militaryNumber && s.militaryNumber.toLowerCase().includes(q)) ||
        (s.phoneNumber && s.phoneNumber.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      );
    }

    // ----------------------------------------------------
    // Sub-Report Specific Business Logic & Filtering (Unified Status)
    // ----------------------------------------------------
    const getEffectiveStatusCode = (soldier: Soldier) => {
      const att = attendance.find(a => a.soldierId === soldier.id && a.date === endDate) || 
                  attendance.find(a => a.soldierId === soldier.id);
      
      if (att && att.statusCode) {
        return att.statusCode;
      }
      if (soldier.militaryStatus === 'إجازة' || soldier.militaryStatus === 'إجازة مرضية') return 'إ';
      if (soldier.militaryStatus === 'غياب' || soldier.militaryStatus === 'موقوف') return 'غ';
      if (soldier.militaryStatus === 'مهمة') return 'م';
      return 'ح';
    };

    if (activeSubReport === 'att_present') {
      list = list.filter(s => getEffectiveStatusCode(s) === 'ح');
    } else if (activeSubReport === 'att_absent') {
      list = list.filter(s => {
        const code = getEffectiveStatusCode(s);
        return code === 'غ' || s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف';
      });
    } else if (activeSubReport === 'att_late') {
      list = list.filter(s => getEffectiveStatusCode(s) === 'ن');
    } else if (activeSubReport === 'att_leaves' || activeSubReport === 'leave_all' || activeSubReport === 'leave_active') {
      list = list.filter(s => {
        const code = getEffectiveStatusCode(s);
        return code === 'إ' || code === 'ع' || s.militaryStatus === 'إجازة' || s.militaryStatus === 'إجازة مرضية';
      });
    } else if (activeSubReport === 'leave_ended' || activeSubReport === 'leave_overdue') {
      list = list.filter(s => {
        const code = getEffectiveStatusCode(s);
        return code === 'غ' || (s as any).notes?.includes('متأخر') || (s as any).notes?.includes('تجاوز الإجازة');
      });
    } else if (activeSubReport === 'att_missions') {
      list = list.filter(s => {
        const code = getEffectiveStatusCode(s);
        return code === 'م' || s.militaryStatus === 'مهمة';
      });
    } else if (activeSubReport === 'att_sick' || activeSubReport === 'med_patients' || activeSubReport === 'med_leaves') {
      list = list.filter(s => {
        const code = getEffectiveStatusCode(s);
        return code === 'ع' || s.militaryStatus === 'إجازة مرضية' || Boolean(s.medicalHistory);
      });
    } else if (activeSubReport === 'att_frequent_absent' || activeSubReport === 'disc_least_disciplined') {
      list = list.filter(s => {
        const absCount = attendance.filter(a => a.soldierId === s.id && a.statusCode === 'غ').length;
        return absCount >= 1 || s.militaryStatus === 'موقوف' || (s as any).notes?.includes('غياب');
      });
    } else if (activeSubReport === 'disc_penalties' || activeSubReport === 'disc_violations' || activeSubReport === 'disc_warnings') {
      list = list.filter(s => s.militaryStatus === 'موقوف' || Boolean((s as any).notes?.includes('عقوبة') || (s as any).notes?.includes('إنذار') || (s as any).notes?.includes('مخالفة')));
    } else if (activeSubReport === 'disc_honors' || activeSubReport === 'disc_most_disciplined') {
      list = list.filter(s => {
        const absCount = attendance.filter(a => a.soldierId === s.id && a.statusCode === 'غ').length;
        return absCount === 0 && s.militaryStatus !== 'موقوف';
      });
    } else if (activeSubReport === 'prom_eligible') {
      list = list.filter(s => {
        if (!s.joinDate) return true;
        const joinYear = parseInt(s.joinDate.split('-')[0]) || 2020;
        return joinYear <= 2023;
      });
    } else if (activeSubReport === 'prom_newcomers') {
      list = list.filter(s => {
        if (!s.joinDate) return false;
        const joinYear = parseInt(s.joinDate.split('-')[0]) || 2020;
        return joinYear >= 2024;
      });
    } else if (activeSubReport === 'prom_transferred' || activeSubReport === 'admin_transfer') {
      list = list.filter(s => s.militaryStatus === 'منقول' || Boolean((s as any).notes?.includes('نقل')));
    } else if (activeSubReport === 'power_company') {
      list = list.filter(s => Boolean(s.company));
    } else if (activeSubReport === 'power_platoon') {
      list = list.filter(s => Boolean(s.platoon));
    } else if (activeSubReport === 'power_battalion') {
      list = list.filter(s => Boolean(s.battalion || s.unitId));
    } else if (activeSubReport === 'med_chronic') {
      list = list.filter(s => Boolean(s.medicalHistory));
    } else if (activeSubReport === 'train_unqualified') {
      list = list.filter(s => !s.qualification || s.qualification.includes('ثانوية') || s.qualification.includes('أساسي'));
    } else if (activeSubReport === 'train_executed' || activeSubReport === 'train_participants') {
      list = list.filter(s => Boolean(s.specialization));
    }

    // Map rows with attendance or specialized sub-report context
    return list.map((s, index) => {
      const unitObj = units.find(u => u.id === s.unitId);
      const unitName = unitObj?.name || 'القيادة العامة';

      const attCode = getEffectiveStatusCode(s);
      const attStatusLabel = attCode === 'ح' ? 'حاضر' : 
                             attCode === 'غ' ? (s.militaryStatus === 'موقوف' ? 'موقوف' : 'غياب') : 
                             attCode === 'إ' ? 'إجازة' : 
                             attCode === 'م' ? 'مهمة' : 
                             attCode === 'ع' ? 'بعذر (مرضية)' : 'نصف يوم';

      // Dynamic sub-report custom note or status override
      let dynamicNote = (s as any).notes || 'جاهزية عالية ومعتمد بالنظام';
      if (activeSubReport === 'prom_eligible') {
        dynamicNote = 'مستحق للترقية الدورية بناءً على الأقدمية في الخدمة العسكرية';
      } else if (activeSubReport === 'disc_honors' || activeSubReport === 'disc_most_disciplined') {
        dynamicNote = 'انضباط عالي وشهادة شكر وتقدير لم يتم تسجيل أي غياب';
      } else if (activeSubReport === 'med_patients' || activeSubReport === 'med_chronic') {
        dynamicNote = s.medicalHistory ? `حالة صحية: ${s.medicalHistory}` : 'تحت المتابعة الطبية بالعيادة الميدانية';
      } else if (activeSubReport === 'train_executed') {
        dynamicNote = `أكمل دورة التخصص الميداني بنجاح (${s.specialization || 'مشاة عامة'})`;
      }

      return {
        id: s.id,
        sequence: index + 1,
        militaryNumber: s.militaryNumber,
        fullName: s.fullName,
        rank: s.rank,
        unitName,
        subUnit: s.company ? `س${s.company} / ف${s.platoon || '1'}` : 'الكتيبة الأولى',
        weapon: (s as any).weapon || 'مشاة',
        specialty: s.specialization || 'خدمة عامة',
        joinDate: s.joinDate || '2021-03-01',
        status: attStatusLabel,
        phone: s.phoneNumber || '770000000',
        nationalId: s.nationalId || '101928374',
        qualification: s.qualification || 'ثانوية عامة',
        governorate: s.address || 'صنعاء',
        bloodType: s.bloodType || 'O+',
        birthDate: s.birthDate || '1995-05-12',
        notes: dynamicNote
      };
    });
  }, [soldiers, units, attendance, isRestrictedUser, currentUser, selectedUnitId, selectedRank, selectedWeapon, searchQuery, endDate, activeSubReport]);

  // Overall Statistics for current active dataset
  const reportStats = useMemo(() => {
    const total = reportTableData.length;
    const presentCount = reportTableData.filter(r => r.status === 'حاضر').length;
    const absentCount = reportTableData.filter(r => r.status === 'غياب').length;
    const leaveCount = reportTableData.filter(r => r.status === 'إجازة').length;
    const missionCount = reportTableData.filter(r => r.status === 'مهمة').length;

    const readinessPercentage = total > 0 ? Math.round(((presentCount + missionCount) / total) * 100) : 100;

    return {
      total,
      presentCount,
      absentCount,
      leaveCount,
      missionCount,
      readinessPercentage
    };
  }, [reportTableData]);

  // Statistical Breakdown Metrics for Analytics Category View
  const statDistributions = useMemo(() => {
    const total = reportTableData.length || 1;

    // Ranks Distribution
    const rankMap: Record<string, number> = {};
    let officersCount = 0;
    let ncoCount = 0;
    let soldiersCount = 0;

    reportTableData.forEach(r => {
      const rank = r.rank || 'جندي';
      rankMap[rank] = (rankMap[rank] || 0) + 1;

      if (rank && ['لواء', 'عميد', 'عقيد', 'مقدم', 'رائد', 'نقيب', 'ملازم أول', 'ملازم'].some(o => rank.includes(o))) {
        officersCount++;
      } else if (['مساعد', 'رقيب أول', 'رقيب', 'عريف'].some(n => rank.includes(n))) {
        ncoCount++;
      } else {
        soldiersCount++;
      }
    });

    const commandTiers = [
      { name: 'ضباط قيادة', value: officersCount, color: '#F59E0B' },
      { name: 'صف ضباط', value: ncoCount, color: '#10B981' },
      { name: 'جنود وأفراد', value: soldiersCount, color: '#0EA5E9' },
    ];

    // Status / Attendance Distribution
    const statusMap: Record<string, number> = {};
    reportTableData.forEach(r => {
      const st = r.status || 'حاضر';
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    const statusChartData = [
      { name: 'حاضر بالميدان', count: statusMap['حاضر'] || 0, color: '#10B981' },
      { name: 'إجازة رسمية', count: statusMap['إجازة'] || 0, color: '#A855F7' },
      { name: 'مهمة خارجية', count: statusMap['مهمة'] || 0, color: '#0EA5E9' },
      { name: 'غياب / موقوف', count: (statusMap['غياب'] || 0) + (statusMap['موقوف'] || 0), color: '#F43F5E' },
    ];

    // Qualifications Distribution
    const qualMap: Record<string, number> = {};
    reportTableData.forEach(r => {
      const q = r.qualification || 'ثانوية عامة';
      qualMap[q] = (qualMap[q] || 0) + 1;
    });

    // Weapons Distribution
    const weaponMap: Record<string, number> = {};
    reportTableData.forEach(r => {
      const w = r.weapon || 'مشاة';
      weaponMap[w] = (weaponMap[w] || 0) + 1;
    });

    // Units / Battalion Comparison
    const unitMap: Record<string, { total: number; present: number }> = {};
    reportTableData.forEach(r => {
      const u = r.unitName || 'القيادة العامة';
      if (!unitMap[u]) {
        unitMap[u] = { total: 0, present: 0 };
      }
      unitMap[u].total += 1;
      if (r.status === 'حاضر' || r.status === 'مهمة') {
        unitMap[u].present += 1;
      }
    });

    const unitsChartData = Object.entries(unitMap).map(([unitName, data]) => ({
      unitName: unitName.length > 18 ? unitName.substring(0, 18) + '...' : unitName,
      fullUnitName: unitName,
      total: data.total,
      present: data.present,
      readinessPct: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    }));

    // Age Groups Distribution
    const ageMap = {
      '18 - 25 سنة': 0,
      '26 - 32 سنة': 0,
      '33 - 40 سنة': 0,
      '41+ سنة': 0
    };
    reportTableData.forEach(r => {
      if (r.birthDate) {
        const birthYear = parseInt(r.birthDate.split('-')[0]) || 1995;
        const age = 2026 - birthYear;
        if (age <= 25) ageMap['18 - 25 سنة']++;
        else if (age <= 32) ageMap['26 - 32 سنة']++;
        else if (age <= 40) ageMap['33 - 40 سنة']++;
        else ageMap['41+ سنة']++;
      } else {
        ageMap['26 - 32 سنة']++;
      }
    });

    const ageChartData = Object.entries(ageMap).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));

    // Service Years Distribution
    const serviceMap = {
      'أقل من 3 سنوات': 0,
      '3 - 6 سنوات': 0,
      '7 - 10 سنوات': 0,
      'أكثر من 10 سنوات': 0
    };
    reportTableData.forEach(r => {
      if (r.joinDate) {
        const joinYear = parseInt(r.joinDate.split('-')[0]) || 2020;
        const serviceYears = 2026 - joinYear;
        if (serviceYears < 3) serviceMap['أقل من 3 سنوات']++;
        else if (serviceYears <= 6) serviceMap['3 - 6 سنوات']++;
        else if (serviceYears <= 10) serviceMap['7 - 10 سنوات']++;
        else serviceMap['أكثر من 10 سنوات']++;
      } else {
        serviceMap['3 - 6 سنوات']++;
      }
    });

    const serviceChartData = Object.entries(serviceMap).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));

    // 7-day Readiness Trend
    const readinessTrend = [
      { day: 'السبت', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage - 3)), present: Math.max(1, reportStats.presentCount - 4), leave: Math.max(0, reportStats.leaveCount + 2) },
      { day: 'الأحد', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage - 1)), present: Math.max(1, reportStats.presentCount - 1), leave: Math.max(0, reportStats.leaveCount + 1) },
      { day: 'الإثنين', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage + 1)), present: Math.max(1, reportStats.presentCount + 2), leave: Math.max(0, reportStats.leaveCount - 1) },
      { day: 'الثلاثاء', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage)), present: reportStats.presentCount, leave: reportStats.leaveCount },
      { day: 'الأربعاء', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage + 2)), present: Math.max(1, reportStats.presentCount + 3), leave: Math.max(0, reportStats.leaveCount - 2) },
      { day: 'الخميس', readiness: Math.min(100, Math.max(70, reportStats.readinessPercentage - 2)), present: Math.max(1, reportStats.presentCount - 3), leave: Math.max(0, reportStats.leaveCount + 3) },
      { day: 'اليوم', readiness: reportStats.readinessPercentage, present: reportStats.presentCount, leave: reportStats.leaveCount }
    ];

    return {
      total,
      commandTiers,
      statusChartData,
      unitsChartData,
      ageChartData,
      serviceChartData,
      readinessTrend,
      ranks: Object.entries(rankMap).map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) })),
      qualifications: Object.entries(qualMap).map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) })),
      weapons: Object.entries(weaponMap).map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) })),
    };
  }, [reportTableData, reportStats]);

  // 7-day Weekly Statistical Attendance Summary Calculation
  const weekly7DaysData = useMemo(() => {
    // Generate dates array for last 7 days ending at endDate or todayStr
    const end = endDate ? new Date(endDate) : new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    let targetSoldiers = soldiers.filter(s => s.isActive);
    if (isRestrictedUser && currentUser?.unitId) {
      targetSoldiers = targetSoldiers.filter(s => s.unitId === currentUser.unitId);
    } else if (selectedUnitId !== 'all') {
      targetSoldiers = targetSoldiers.filter(s => s.unitId === selectedUnitId);
    }
    if (selectedRank !== 'all') {
      targetSoldiers = targetSoldiers.filter(s => s.rank === selectedRank);
    }
    if (selectedWeapon !== 'all') {
      targetSoldiers = targetSoldiers.filter(s => ((s as any).weapon || 'مشاة') === selectedWeapon);
    }

    const totalForce = targetSoldiers.length;

    // Daily breakdown for each of the 7 days
    const dailySummaries = dates.map(dateStr => {
      const dateObj = new Date(dateStr);
      const dayName = arabicDayNames[dateObj.getDay()] || 'اليوم';

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let missionCount = 0;
      let sickCount = 0;
      let halfCount = 0;

      targetSoldiers.forEach(s => {
        const att = attendance.find(a => a.soldierId === s.id && a.date === dateStr);
        let code = att?.statusCode;
        if (!code) {
          if (s.militaryStatus === 'إجازة') code = 'إ';
          else if (s.militaryStatus === 'إجازة مرضية') code = 'ع';
          else if (s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف') code = 'غ';
          else if (s.militaryStatus === 'مهمة') code = 'م';
          else code = 'ح';
        }

        if (code === 'ح') presentCount++;
        else if (code === 'غ') absentCount++;
        else if (code === 'إ') leaveCount++;
        else if (code === 'م') missionCount++;
        else if (code === 'ع') sickCount++;
        else if (code === 'ن') halfCount++;
        else presentCount++;
      });

      const effectivePresent = presentCount + missionCount + (halfCount * 0.5);
      const readinessPct = totalForce > 0 ? Math.round((effectivePresent / totalForce) * 100) : 100;

      return {
        dateStr,
        dayName,
        displayDate: `${dayName} (${dateStr.split('-').slice(1).join('/')})`,
        totalForce,
        presentCount,
        absentCount,
        leaveCount,
        missionCount,
        sickCount,
        halfCount,
        readinessPct,
      };
    });

    const totalReadinessSum = dailySummaries.reduce((acc, d) => acc + d.readinessPct, 0);
    const avgReadinessPct = dailySummaries.length > 0 ? Math.round(totalReadinessSum / dailySummaries.length) : 0;

    const totalPresentSum = dailySummaries.reduce((acc, d) => acc + d.presentCount, 0);
    const totalAbsentSum = dailySummaries.reduce((acc, d) => acc + d.absentCount, 0);
    const totalLeaveSum = dailySummaries.reduce((acc, d) => acc + d.leaveCount, 0);
    const totalMissionSum = dailySummaries.reduce((acc, d) => acc + d.missionCount, 0);

    let peakDay = dailySummaries[0];
    let lowestDay = dailySummaries[0];
    dailySummaries.forEach(d => {
      if (d.readinessPct > (peakDay?.readinessPct || 0)) peakDay = d;
      if (d.readinessPct < (lowestDay?.readinessPct || 100)) lowestDay = d;
    });

    const targetUnits = allowedUnits.filter(u => selectedUnitId === 'all' || u.id === selectedUnitId);
    const unitSummaries = targetUnits.map(unit => {
      const uSoldiers = targetSoldiers.filter(s => s.unitId === unit.id);
      const uTotal = uSoldiers.length;

      let uPresentSum = 0;
      let uAbsentSum = 0;
      let uLeaveSum = 0;

      const uDailyPct = dates.map(dateStr => {
        let uPres = 0;
        uSoldiers.forEach(s => {
          const att = attendance.find(a => a.soldierId === s.id && a.date === dateStr);
          let code = att?.statusCode;
          if (!code) {
            if (s.militaryStatus === 'إجازة' || s.militaryStatus === 'إجازة مرضية') code = 'إ';
            else if (s.militaryStatus === 'غياب' || s.militaryStatus === 'موقوف') code = 'غ';
            else if (s.militaryStatus === 'مهمة') code = 'م';
            else code = 'ح';
          }
          if (code === 'ح' || code === 'م') uPres++;
          if (code === 'غ') uAbsentSum++;
          if (code === 'إ' || code === 'ع') uLeaveSum++;
        });
        uPresentSum += uPres;
        return uTotal > 0 ? Math.round((uPres / uTotal) * 100) : 100;
      });

      const uAvgPct = uDailyPct.length > 0 ? Math.round(uDailyPct.reduce((a, b) => a + b, 0) / uDailyPct.length) : 100;

      return {
        unitId: unit.id,
        unitName: unit.name,
        uTotal,
        uAvgPct,
        uPresentAvg: Math.round(uPresentSum / dates.length),
        uAbsentAvg: Math.round(uAbsentSum / dates.length),
        uLeaveAvg: Math.round(uLeaveSum / dates.length),
        uDailyPct,
      };
    });

    return {
      startDate: dates[0],
      endDate: dates[6],
      dates,
      totalForce,
      dailySummaries,
      avgReadinessPct,
      totalPresentSum,
      totalAbsentSum,
      totalLeaveSum,
      totalMissionSum,
      peakDay,
      lowestDay,
      unitSummaries,
    };
  }, [soldiers, attendance, allowedUnits, selectedUnitId, selectedRank, selectedWeapon, endDate, isRestrictedUser, currentUser]);

  // Export handlers
  const handleExportCSV = () => {
    if (reportTableData.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    const headers = ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(c => c.label);
    const rows = reportTableData.map(r => {
      return selectedColumns.map(colKey => `"${(r[colKey as keyof typeof r] || '').toString().replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_القوة_البشرية_${activeSubReport}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (reportTableData.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    const cols = ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; direction: rtl; text-align: right; }
          th { background-color: #0f172a; color: #ffffff; border: 1px solid #334155; padding: 8px; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; }
        </style>
      </head>
      <body>
        <h3>الجمهورية اليمنية - وزارة الدفاع - تقرير القوة البشرية الرسمي</h3>
        <p>التاريخ: ${todayStr} | إجمالي السجلات: ${reportTableData.length}</p>
        <table>
          <thead>
            <tr>
              ${cols.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${reportTableData.map(r => `
              <tr>
                ${cols.map(c => `<td>${r[c.key as keyof typeof r] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_القوة_العسكرية_${todayStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConnectSheets = async () => {
    try {
      setIsExportingSheets(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        onSetGoogleAccessToken(credential.accessToken);
        alert('تم ربط حساب Google بنجاح!');
        return credential.accessToken;
      }
    } catch (err: any) {
      alert(`خطأ الربط: ${err.message || 'فشل الاتصال بـ Google'}`);
    } finally {
      setIsExportingSheets(false);
    }
    return null;
  };

  const handleExportGoogleSheets = async () => {
    let token = googleAccessToken;
    if (!token) {
      if (!confirm('يتطلب التصدير المباشر لـ Google Sheets تسجيل الدخول بحساب Google. هل تريد الاستمرار؟')) return;
      token = await handleConnectSheets();
      if (!token) return;
    }

    try {
      setIsExportingSheets(true);
      const sheet = await createReportSpreadsheet(token, `تقرير_القوة_${todayStr}`, {
        startDate,
        endDate,
        unitName: selectedUnitId === 'all' ? 'جميع الوحدات' : units.find(u => u.id === selectedUnitId)?.name || 'القيادة',
        reportStats,
        filteredRecords: [],
        soldiers,
        units
      });
      alert(`تم تصدير التقرير لـ Google Sheets بنجاح!\nالرابط: ${sheet.url}`);
    } catch (err: any) {
      alert(`فشل التصدير: ${err.message}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* ------------------------------------------------------------- */}
      {/* FULL SCREEN CATEGORY REPORT MODAL / PAGE VIEW */}
      {/* ------------------------------------------------------------- */}
      {isFullScreenMode && (
        <div className="fixed inset-0 z-[120] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans animate-in fade-in duration-200" dir="rtl">
          {/* Top Sticky Header */}
          <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <button
                onClick={() => setIsFullScreenMode(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shrink-0"
              >
                <span>← العودة لأقسام التقارير</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white leading-tight">
                    {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.subReports.find(s => s.id === activeSubReport)?.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Export / Actions Toolbar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportGoogleSheets}
                disabled={isExportingSheets}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Share2 className="w-4 h-4" />
                <span>Sheets</span>
              </button>
            </div>
          </div>

          {/* Sub-Reports Horizontal Swipeable Pill Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-2 shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2">
              {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.subReports.map(sub => {
                const isSubActive = activeSubReport === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubReport(sub.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                      isSubActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Full-Screen Content Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">


            {/* Compact Single-Bar Filter & Customization Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
              {/* Primary Compact Bar (Single Bar Height) */}
              <div className="p-2 sm:p-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                {/* Search Input & Filter Icon */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0">
                    <Filter className="w-4 h-4" />
                  </div>

                  {/* Embedded Compact Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث سريع بالاسم أو الرقم العسكري..."
                      className="w-full bg-slate-950 border border-slate-800/80 pr-8 pl-8 py-1.5 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side Info & Expand Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Total Records Counter */}
                  <div className="bg-slate-950 border border-slate-800/80 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-400 hidden sm:inline">السجلات:</span>
                    <span className="text-amber-400 font-mono font-black">{reportTableData.length}</span>
                    <span className="text-slate-400 text-[10px]">فرد</span>
                  </div>

                  {/* Active Filters Clear Button */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="مسح التصفية"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>إعادة ضبط ({activeFiltersCount})</span>
                    </button>
                  )}

                  {/* Expand/Collapse Dropdown Toggle Button */}
                  <button
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isFilterExpanded || activeFiltersCount > 0
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تصفية وتخصيص الكشف</span>
                    <span className="sm:hidden">التصفية</span>
                    {isFilterExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Dropdown Drawer for Detailed Filters */}
              <AnimatePresence>
                {isFilterExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800/80 bg-slate-950/95 p-3 sm:p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span>خيارات ومعايير التصفية التفصيلية:</span>
                      </span>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إلغاء الفلاتر</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {/* Unit Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">الكتيبة / الوحـدة:</label>
                        <select
                          value={selectedUnitId}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-bold text-white focus:border-amber-500 outline-none"
                        >
                          {!isRestrictedUser && <option value="all">جميع الكتائب والوحدات</option>}
                          {allowedUnits.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rank Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">الرتبـة العسكرية:</label>
                        <select
                          value={selectedRank}
                          onChange={(e) => setSelectedRank(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-bold text-white focus:border-amber-500 outline-none"
                        >
                          <option value="all">جميع الرتب</option>
                          {availableRanks.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* Weapon Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">السلاح / الاختصاص:</label>
                        <select
                          value={selectedWeapon}
                          onChange={(e) => setSelectedWeapon(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-bold text-white focus:border-amber-500 outline-none"
                        >
                          <option value="all">جميع الأسلحة</option>
                          {availableWeapons.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date Picker */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">تاريخ الكشف المعروض:</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-bold text-white font-mono focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Smart Builder Customizer */}
            {activeCategory === 'smart_center' && activeSubReport === 'smart_builder' && (
              <div className="bg-slate-900 border border-amber-500/40 p-4 rounded-2xl text-white space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-400">صانع التقارير الذكي (Smart Builder)</h3>
                    <p className="text-[11px] text-slate-400 font-bold">حدد الأعمدة لحفظ قالب التقرير الخاص بك.</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={templateNameInput}
                      onChange={(e) => setTemplateNameInput(e.target.value)}
                      placeholder="اسم القالب..."
                      className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-white w-full sm:w-40"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shrink-0 cursor-pointer"
                    >
                      حفظ 💾
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {ALL_AVAILABLE_COLUMNS.map(col => {
                    const isSelected = selectedColumns.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        onClick={() => handleToggleColumn(col.key)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>{col.label}</span>
                        <span>{isSelected ? '✅' : '➕'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saved Templates */}
            {activeCategory === 'smart_center' && activeSubReport === 'saved_templates' && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-white space-y-3">
                <h3 className="text-sm font-black text-amber-400 border-b border-slate-800 pb-2">القوالب المحفوظة</h3>
                {savedTemplates.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">لا توجد قوالب محفوظة.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {savedTemplates.map(tpl => (
                      <div key={tpl.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-black text-xs text-amber-300">{tpl.name}</h5>
                          <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-slate-500 hover:text-rose-400 text-xs">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleApplyTemplate(tpl)}
                          className="w-full py-1.5 bg-amber-500 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
                        >
                          تطبيق القالب ⚡
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Statistical Charts & Interactive Analytics Dashboard */}
            {(activeCategory === 'analytics' || activeCategory === 'stat') && (
              <div className="bg-slate-900 border border-orange-500/30 p-4 sm:p-5 rounded-2xl text-white space-y-5 shadow-2xl relative overflow-hidden">
                {/* Header Banner for Analytics */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 rounded-xl shadow-lg shadow-orange-500/20">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                        <span>المنظومة الإحصائية والبيانية للكتائب والقوات</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-md font-bold">
                          تحليل ديناميكي مباشر
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        رسوم بيانية تفاعلية ومؤشرات أداء الجاهزية العسكرية وتوزيع السلاح والرتب
                      </p>
                    </div>
                  </div>

                  {/* Sub-tab Navigation Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                    {[
                      { id: 'overview', label: '🚀 نظرة عامة', icon: Activity },
                      { id: 'ranks', label: '⚔️ الهيكل والرتب', icon: Shield },
                      { id: 'weapons', label: '🎯 الأسلحة', icon: Medal },
                      { id: 'units', label: '🏢 الكتائب والوحدات', icon: Building2 },
                      { id: 'demographics', label: '🎓 المؤهلات والسن', icon: GraduationCap },
                    ].map(tab => {
                      const TabIcon = tab.icon;
                      const isActive = analyticsTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setAnalyticsTab(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                              : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <TabIcon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1. OVERVIEW TAB */}
                {analyticsTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Top KPI Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl space-y-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[11px] text-slate-400 font-bold block">إجمالي القوة الفعلية</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{reportStats.total}</span>
                          <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">100%</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">قيد الخدمة الميدانية</span>
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl space-y-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[11px] text-slate-400 font-bold block">معدل الجاهزية القتالية</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{reportStats.readinessPercentage}%</span>
                          <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">ممتاز</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">حاضر ومهمات خارجية</span>
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl space-y-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[11px] text-slate-400 font-bold block">المرابطون بالحشود</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">{reportStats.presentCount}</span>
                          <span className="text-[10px] text-sky-500 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full">
                            {Math.round((reportStats.presentCount / (reportStats.total || 1)) * 100)}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">حضور ميداني مباشر</span>
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl space-y-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[11px] text-slate-400 font-bold block">الإجازات والمهمات</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-black text-purple-400 font-mono">{reportStats.leaveCount + reportStats.missionCount}</span>
                          <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">
                            {reportStats.leaveCount} إجازة
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">خارج الميدان بتكليف</span>
                      </div>
                    </div>

                    {/* Main Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Area Chart: 7-day Readiness Trend */}
                      <div className="lg:col-span-2 bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                            <span>مؤشر مسار الجاهزية القتالية والحضور (الأسبوعي)</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">تتبع يومي</span>
                        </div>
                        <div className="h-[220px] sm:h-[260px] w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statDistributions.readinessTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                                </linearGradient>
                                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                              <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                              <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#F8FAFC' }}
                                labelStyle={{ fontWeight: 'bold', color: '#F59E0B' }}
                              />
                              <Area type="monotone" dataKey="readiness" name="نسبة الجاهزية %" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#readinessGrad)" />
                              <Area type="monotone" dataKey="present" name="عدد الحاضرين" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Donut Chart: Command Hierarchy Breakdown */}
                      <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <span>توزيع الهيكل العسكري</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">الضباط والأفراد</span>
                        </div>
                        <div className="h-[200px] w-full relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={statDistributions.commandTiers}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {statDistributions.commandTiers.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                          {/* Center Text inside Donut */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-slate-400">إجمالي القوة</span>
                            <span className="text-lg font-black text-white font-mono">{reportStats.total}</span>
                          </div>
                        </div>

                        {/* Legend Items */}
                        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-center">
                          {statDistributions.commandTiers.map(tier => (
                            <div key={tier.name} className="space-y-0.5">
                              <div className="flex items-center justify-center gap-1 text-slate-300">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: tier.color }} />
                                <span className="truncate">{tier.name}</span>
                              </div>
                              <span className="text-xs font-mono font-black text-white block">{tier.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. RANKS TAB */}
                {analyticsTab === 'ranks' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        <span>التوزيع التفصيلي للرتب العسكرية</span>
                      </h4>
                      <div className="h-[280px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statDistributions.ranks} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                            <YAxis stroke="#64748B" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#FFF' }} />
                            <Bar dataKey="count" name="عدد الأفراد" fill="#F59E0B" radius={[8, 8, 0, 0]}>
                              {statDistributions.ranks.map((entry, index) => (
                                <Cell key={`rank-cell-${index}`} fill={index % 2 === 0 ? '#F59E0B' : '#D97706'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Progress list for ranks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {statDistributions.ranks.map(r => (
                        <div key={r.label} className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-200">{r.label}</span>
                            <span className="text-amber-400 font-mono">{r.count} فرد ({r.pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. WEAPONS TAB */}
                {analyticsTab === 'weapons' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black text-emerald-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Medal className="w-4 h-4" />
                        <span>توزيع الأسلحة والاختصاصات الميدانية</span>
                      </h4>
                      <div className="h-[280px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statDistributions.weapons} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis type="number" stroke="#64748B" fontSize={11} />
                            <YAxis dataKey="label" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#FFF' }} />
                            <Bar dataKey="count" name="عدد القوة بالفرع" fill="#10B981" radius={[0, 8, 8, 0]}>
                              {statDistributions.weapons.map((entry, index) => (
                                <Cell key={`weapon-cell-${index}`} fill={index % 2 === 0 ? '#10B981' : '#059669'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {statDistributions.weapons.map(w => (
                        <div key={w.label} className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1">
                          <span className="text-[11px] text-slate-400 font-bold block">{w.label}</span>
                          <div className="flex items-baseline justify-between">
                            <span className="text-base font-black text-emerald-400 font-mono">{w.count} فرد</span>
                            <span className="text-[10px] text-slate-500 font-bold">{w.pct}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${w.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. UNITS TAB */}
                {analyticsTab === 'units' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black text-sky-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        <span>مقارنة الجاهزية القتالية بين الكتائب والوحدات</span>
                      </h4>
                      <div className="h-[280px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statDistributions.unitsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis dataKey="unitName" stroke="#94A3B8" fontSize={11} interval={0} angle={-20} textAnchor="end" />
                            <YAxis stroke="#64748B" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#FFF' }} />
                            <Bar dataKey="present" name="الحاضرين بالميدان" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="total" name="إجمالي القوة المسجلة" fill="#334155" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {statDistributions.unitsChartData.map(u => (
                        <div key={u.fullUnitName} className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-200">{u.fullUnitName}</span>
                            <span className="text-xs font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                              {u.readinessPct}% جاهزية
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                            <span>الحاضرين: <strong className="text-emerald-400 font-mono">{u.present}</strong></span>
                            <span>الإجمالي: <strong className="text-slate-200 font-mono">{u.total}</strong></span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${u.readinessPct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. DEMOGRAPHICS TAB */}
                {analyticsTab === 'demographics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Educational Qualifications */}
                    <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black text-purple-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" />
                        <span>توزيع المؤهلات العلمية والأكاديمية</span>
                      </h4>
                      <div className="space-y-2.5 pt-1">
                        {statDistributions.qualifications.map(q => (
                          <div key={q.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-300">
                              <span>{q.label}</span>
                              <span className="font-mono text-purple-300">{q.count} فرد ({q.pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${q.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Age Groups & Service Years */}
                    <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-4">
                      <h4 className="text-xs font-black text-rose-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>الفئات العمرية ومتوسط سنوات الخدمة</span>
                      </h4>

                      <div className="space-y-3">
                        <span className="text-[11px] font-extrabold text-slate-400 block">الفئات العمرية للأفراد:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {statDistributions.ageChartData.map(a => (
                            <div key={a.label} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block">{a.label}</span>
                              <span className="text-sm font-black text-rose-400 font-mono">{a.count} فرد ({a.pct}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-extrabold text-slate-400 block">سنوات الخدمة العسكرية:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {statDistributions.serviceChartData.map(s => (
                            <div key={s.label} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block">{s.label}</span>
                              <span className="text-sm font-black text-amber-300 font-mono">{s.count} فرد ({s.pct}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SPECIALIZED 7-DAY WEEKLY STATISTICAL REPORT VIEW */}
            {activeSubReport === 'att_weekly_7days' ? (
              <div className="space-y-5">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/40 p-5 rounded-2xl text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        تلقائي مباشر ⚡
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        الفترة: من {weekly7DaysData.startDate} إلى {weekly7DaysData.endDate} (آخر 7 أيام)
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-sky-400" />
                      <span>التقرير الإحصائي الأسبوعي التلقائي - ملخص تحضير وجاهزية القوة</span>
                    </h3>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      رصد إحصائي شامل ومستمر لنتائج الحضور والغياب والانضباط الميداني لكافة الكتائب والوحدات على مدار الـ 7 أيام الماضية.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                      <Printer className="w-4 h-4" />
                      <span>معاينة وطباعة PDF للتقرير الأسبوعي 🖨️</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 relative overflow-hidden">
                    <span className="text-xs text-slate-400 font-bold block">متوسط الجاهزية الأسبوعية</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400 font-mono">{weekly7DaysData.avgReadinessPct}%</span>
                      <span className="text-[10px] text-emerald-400 font-bold">آخر 7 أيام</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${weekly7DaysData.avgReadinessPct}%` }} />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-xs text-slate-400 font-bold block">أعلى يوم في الجاهزية</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-emerald-400">{weekly7DaysData.peakDay?.dayName || 'اليوم'}</span>
                      <span className="text-xs text-emerald-300 font-mono font-black">({weekly7DaysData.peakDay?.readinessPct}%)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold block">تاريخ {weekly7DaysData.peakDay?.dateStr}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-xs text-slate-400 font-bold block">إجمالي حالات الحضور</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-sky-400 font-mono">{weekly7DaysData.totalPresentSum}</span>
                      <span className="text-[10px] text-slate-400 font-bold">حالة حضور</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold block">+ {weekly7DaysData.totalMissionSum} مأموريات عسكرية</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-xs text-slate-400 font-bold block">مؤشر الانضباط العام</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-emerald-400">
                        {weekly7DaysData.avgReadinessPct >= 85 ? 'عالي ومستقر 🛡️' : weekly7DaysData.avgReadinessPct >= 70 ? 'متوسط ومستقر ⚡' : 'تحت المتابعة ⚠️'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold block">إجمالي الغياب: {weekly7DaysData.totalAbsentSum} فرد</span>
                  </div>
                </div>

                {/* Recharts Readiness Trend Chart */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-sky-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>مخطط بياني لمؤشر الجاهزية اليومي (آخر 7 أيام)</span>
                  </h4>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weekly7DaysData.dailySummaries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="dayName" stroke="#94A3B8" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#FFF' }} />
                        <Area type="monotone" dataKey="readinessPct" name="نسبة الجاهزية %" stroke="#0EA5E9" fillOpacity={1} fill="url(#readinessGrad)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 7-Day Daily Attendance Breakdown Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
                  <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-xs">جدول التفاصيل والإحصاء اليومي للتحضير (آخر 7 أيام)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">القوة الكلية المستهدفة: {weekly7DaysData.totalForce} فرد</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black">
                          <th className="p-2.5 border-l border-slate-800 text-center w-10">#</th>
                          <th className="p-2.5 border-l border-slate-800 whitespace-nowrap text-amber-400">اليوم والتاريخ</th>
                          <th className="p-2.5 border-l border-slate-800 text-center">القوة الكلية</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-emerald-400">الحاضرون (ح)</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-rose-400">الغياب (غ)</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-purple-400">الإجازات (إ)</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-sky-400">المأموريات (م)</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-amber-300">عذر/مرضية (ع)</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-amber-400">نسبة الجاهزية</th>
                          <th className="p-2.5 border-l border-slate-800 text-center">التقييم اليومي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekly7DaysData.dailySummaries.map((day, idx) => (
                          <tr key={day.dateStr} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950/60'}>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 border-l border-slate-800 font-black text-white whitespace-nowrap">
                              {day.displayDate}
                            </td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-slate-200">{day.totalForce}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-emerald-400">{day.presentCount}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-rose-400">{day.absentCount}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-purple-300">{day.leaveCount}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-sky-300">{day.missionCount}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-amber-300">{day.sickCount}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-amber-400">
                              {day.readinessPct}%
                            </td>
                            <td className="p-2.5 border-l border-slate-800 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                day.readinessPct >= 85 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                day.readinessPct >= 70 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {day.readinessPct >= 85 ? 'ممتاز' : day.readinessPct >= 70 ? 'جيد' : 'منخفض'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unit Comparison Matrix for 7 Days */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
                  <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <span className="font-extrabold text-xs">مقارنة متوسط التحضير والجاهزية للكتائب والوحدات خلال الـ 7 أيام</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black">
                          <th className="p-2.5 border-l border-slate-800 text-center w-10">#</th>
                          <th className="p-2.5 border-l border-slate-800 whitespace-nowrap text-sky-300">الوحدة / الكتيبة</th>
                          <th className="p-2.5 border-l border-slate-800 text-center">إجمالي القوة</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-emerald-400">متوسط الحضور</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-rose-400">متوسط الغياب</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-purple-400">متوسط الإجازات</th>
                          <th className="p-2.5 border-l border-slate-800 text-center text-amber-400">متوسط الجاهزية</th>
                          <th className="p-2.5 border-l border-slate-800 text-center">التقييم الأسبوعي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekly7DaysData.unitSummaries.map((unit, idx) => (
                          <tr key={unit.unitId} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950/60'}>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 border-l border-slate-800 font-black text-white whitespace-nowrap">{unit.unitName}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-slate-200">{unit.uTotal}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-emerald-400">{unit.uPresentAvg}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-rose-400">{unit.uAbsentAvg}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-purple-300">{unit.uLeaveAvg}</td>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-black text-amber-400">{unit.uAvgPct}%</td>
                            <td className="p-2.5 border-l border-slate-800 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                unit.uAvgPct >= 85 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                unit.uAvgPct >= 70 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {unit.uAvgPct >= 85 ? 'جاهزية عالية' : unit.uAvgPct >= 70 ? 'جاهزية مقبولة' : 'تتطلب المتابعة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Executive Recommendations Box */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-white space-y-2">
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>الملاحظات التحليلية والتوصيات القيادية الأسبوعية</span>
                  </h4>
                  <ul className="text-xs text-slate-300 font-medium space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>بلغ متوسط مؤشر الجاهزية الميدانية الإجمالي للـ 7 أيام الماضية <strong className="text-amber-400 font-mono">{weekly7DaysData.avgReadinessPct}%</strong>.</li>
                    <li>أظهرت النتائج أن يوم <strong className="text-emerald-400">{weekly7DaysData.peakDay?.dayName}</strong> سجل أعلى نسبة انضباط وجاهزية بنسبة <strong className="text-emerald-400 font-mono">{weekly7DaysData.peakDay?.readinessPct}%</strong>.</li>
                    <li>تم تسجيل متوسط حالات غياب بلغت <strong className="text-rose-400 font-mono">{Math.round(weekly7DaysData.totalAbsentSum / 7)}</strong> فرد يومياً على مستوى الوحدات، ويُنصح بمتابعة الشؤون الإدارية المستوفين للإجازات.</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Main Full-Screen Data Table */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-xs">
                      جدول معاينة التقرير الرسمي ({REPORT_CATEGORIES.find(c => c.id === activeCategory)?.name})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{todayStr}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black">
                        <th className="p-2.5 border-l border-slate-800 w-10 text-center">#</th>
                        {ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                          <th key={col.key} className="p-2.5 border-l border-slate-800 whitespace-nowrap text-amber-400 font-bold">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportTableData.length === 0 ? (
                        <tr>
                          <td colSpan={selectedColumns.length + 1} className="p-8 text-center text-slate-500 font-bold">
                            لا توجد بيانات مطابقة لشروط الفلترة المحددة.
                          </td>
                        </tr>
                      ) : (
                        reportTableData.map((row, idx) => (
                          <tr key={row.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950/60 hover:bg-slate-800/80 transition-colors'}>
                            <td className="p-2.5 border-l border-slate-800 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            {ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => {
                              const val = row[col.key as keyof typeof row];
                              return (
                                <td key={col.key} className="p-2.5 border-l border-slate-800 whitespace-nowrap font-bold text-slate-200">
                                  {col.key === 'militaryNumber' ? (
                                    <span className="font-mono text-emerald-400 font-black">{val}</span>
                                  ) : col.key === 'status' ? (
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                      val === 'حاضر' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                      val === 'غياب' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                      val === 'إجازة' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {val}
                                    </span>
                                  ) : (
                                    val || '-'
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN REPORTS DASHBOARD (LANDING PAGE OVERVIEW) */}
      {/* ------------------------------------------------------------- */}

      {/* Quick Launch Weekly PDF Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-amber-500/30 p-4 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950">جديد ✨</span>
              <h3 className="text-sm font-black text-amber-300">التقرير الإحصائي الأسبوعي التلقائي (آخر 7 أيام)</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              عرض ملخص التحضير والجاهزية للـ 7 أيام الماضية تلقائياً وتصديره بصيغة PDF معتمدة للطباعة.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setActiveCategory('attendance');
            setActiveSubReport('att_weekly_7days');
            setIsFullScreenMode(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 w-full md:w-auto"
        >
          <FileText className="w-4 h-4" />
          <span>توليد التقرير الأسبوعي (PDF) ↗</span>
        </button>
      </div>

      {/* Search & Layout View Control Bar for Categories */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={categorySearchQuery}
            onChange={e => setCategorySearchQuery(e.target.value)}
            placeholder="البحث في الأقسام ونماذج التقارير والكشوف..."
            className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all"
          />
          {categorySearchQuery && (
            <button
              onClick={() => setCategorySearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-xs font-bold text-slate-500">
            <span>عرض {filteredCategories.length} من {REPORT_CATEGORIES.length} أقسام رئيسية</span>
            {categorySearchQuery && (
              <button
                onClick={() => setCategorySearchQuery('')}
                className="text-amber-600 hover:underline text-xs font-black cursor-pointer mr-2"
              >
                إعادة تعيين
              </button>
            )}
          </div>

          {/* View Switcher Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setCategoriesViewMode('icons')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                categoriesViewMode === 'icons' 
                  ? 'bg-white text-slate-900 shadow-xs font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="تصميم الأيقونات التفاعلية"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
              <span>لوحة الأيقونات</span>
            </button>
            <button
              onClick={() => setCategoriesViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                categoriesViewMode === 'cards' 
                  ? 'bg-white text-slate-900 shadow-xs font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض الكروت التفصيلية"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>كروت مفصلة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 10 Categories Container (Tactile Tile Launcher or Detailed Cards) */}
      {categoriesViewMode === 'icons' ? (
        /* ICON LAUNCHER TILE GRID - COMPACT MOBILE OPTIMIZED LAUNCHER TILES */
        <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden space-y-3">
          {/* Section Sub-header */}
          <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100/90">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wide">أقسام التقارير والكشوفات العسكرية الميدانية</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/70 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0" />
              10 أقسام نشطة
            </span>
          </div>

          {/* 10 Compact Tiles Grid - 2 cols on mobile, 5 cols on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 relative z-10">
            {filteredCategories.map(cat => {
              const CatIcon = cat.icon;

              return (
                <motion.button 
                  key={cat.id}
                  whileHover={{ y: -3, scale: 1.02, boxShadow: `0 10px 20px -8px ${cat.hoverGlow}` }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelectCategory(cat.id, true)}
                  className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50/70 border border-slate-200/85 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-all duration-200 cursor-pointer group relative min-h-[108px] sm:min-h-[128px] w-full overflow-hidden text-center"
                  title={cat.fullName || cat.name}
                >
                  {/* Top Bar Color Accent */}
                  <div className={`absolute top-0 inset-x-0 h-[3px] ${cat.topLineBg} rounded-t-xl transition-all duration-300 group-hover:h-[5px]`} />

                  {/* Centered Compact Tactile Icon Tile */}
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center border ${cat.tileIconBg} transition-all duration-300 shadow-xs group-hover:scale-105 shrink-0 mt-0.5`}>
                    <CatIcon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 transition-transform duration-300 group-hover:rotate-3" />
                  </div>

                  {/* Category Title */}
                  <span className="text-[10px] sm:text-xs font-black text-slate-800 group-hover:text-amber-600 transition-colors leading-tight mt-1 px-0.5 line-clamp-1 w-full">
                    {cat.name}
                  </span>

                  {/* Sub-reports Count Badge */}
                  <span className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black rounded-md sm:rounded-lg border ${cat.badgeStyle} transition-all duration-300 truncate max-w-full mt-0.5`}>
                    {cat.subReports.length} كشوفات
                  </span>

                  {/* Hover Action Indicator */}
                  <span className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 group-hover:text-amber-600 transition-colors flex items-center justify-center gap-0.5 w-full pt-1 border-t border-slate-100/60 mt-0.5">
                    <span>فتح القسم</span>
                    <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filteredCategories.map(cat => {
            const CatIcon = cat.icon;

            return (
              <div
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id, true)}
                className={`bg-white hover:bg-slate-50/90 border border-slate-200/90 ${cat.hoverBorder} p-4.5 rounded-3xl transition-all duration-200 shadow-xs hover:shadow-xl cursor-pointer flex flex-col justify-between space-y-3.5 group relative overflow-hidden`}
              >
                {/* Card Header & Icon */}
                <div className="flex items-center justify-between w-full">
                  <div className={`p-3 rounded-2xl transition-all duration-200 group-hover:scale-105 ${cat.iconBg}`}>
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${cat.badgeBg}`}>
                    {cat.subReports.length} كشوف
                  </span>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors flex items-center justify-between">
                    <span>{cat.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                {/* Quick Sub-report Tags Preview */}
                <div className="space-y-1 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {cat.subReports.slice(0, 2).map(sub => (
                      <span
                        key={sub.id}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors truncate max-w-[130px] ${cat.tagBg}`}
                        title={sub.label}
                      >
                        {sub.label}
                      </span>
                    ))}
                    {cat.subReports.length > 2 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                        +{cat.subReports.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom CTA Bar */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-600 group-hover:text-amber-700">
                  <span>معاينة ملء الشاشة ↗</span>
                  <span className="text-base group-hover:-translate-x-1.5 transition-transform">←</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Printable Report View Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto" dir="rtl">
          <div className="bg-white text-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl my-8 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm">
                  {activeSubReport === 'att_weekly_7days' 
                    ? 'معاينة طباعة التقرير الإحصائي الأسبوعي التلقائي (PDF)' 
                    : 'معاينة طباعة التقرير الرسمي'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadElementAsPdf(
                    'official-report-printable-area', 
                    activeSubReport === 'att_weekly_7days' 
                      ? `التقرير_الإحصائي_الأسبوعي_${weekly7DaysData.startDate}_إلى_${weekly7DaysData.endDate}.pdf` 
                      : `تقرير_القوة_${todayStr}.pdf`
                  )}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div id="official-report-printable-area" className="p-8 space-y-6 font-sans bg-white text-slate-900 min-h-[800px]">
              {/* Official Header */}
              <PrintHeader 
                printSettings={printSettings}
                documentTitle={activeSubReport === 'att_weekly_7days' ? 'التقرير الإحصائي الأسبوعي التلقائي للتحضير والجاهزية العسكرية' : (REPORT_CATEGORIES.find(c => c.id === activeCategory)?.name || 'تقرير القوة العسكرية الرسمي')}
                documentRef={activeSubReport === 'att_weekly_7days' ? `REP-WEEKLY-${weekly7DaysData.endDate.replace(/-/g, '')}` : `REP-${Date.now().toString().slice(-6)}`}
                documentDate={todayStr}
              />

              {activeSubReport === 'att_weekly_7days' ? (
                /* Dedicated 7-Day Weekly Printable PDF Layout */
                <div className="space-y-6">
                  {/* Summary Period Box */}
                  <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-900 border-b border-slate-300 pb-2">
                      <span>فترة التقرير: من {weekly7DaysData.startDate} إلى {weekly7DaysData.endDate} (آخر 7 أيام)</span>
                      <span>القوة الكلية: {weekly7DaysData.totalForce} فرد</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-slate-500 font-bold block text-[11px]">متوسط الجاهزية</span>
                        <span className="text-base font-black text-slate-900 block font-mono">{weekly7DaysData.avgReadinessPct}%</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-slate-500 font-bold block text-[11px]">إجمالي الحضور</span>
                        <span className="text-base font-black text-emerald-800 block font-mono">{weekly7DaysData.totalPresentSum}</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-slate-500 font-bold block text-[11px]">إجمالي الغياب</span>
                        <span className="text-base font-black text-rose-800 block font-mono">{weekly7DaysData.totalAbsentSum}</span>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-slate-500 font-bold block text-[11px]">إجمالي الإجازات</span>
                        <span className="text-base font-black text-purple-800 block font-mono">{weekly7DaysData.totalLeaveSum}</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Daily Summary Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900 border-r-4 border-slate-900 pr-2">
                      أولاً: جدول تفاصيل وإحصائيات التحضير اليومي لآخر 7 أيام
                    </h4>
                    <table className="w-full text-right border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 border-b border-slate-400 font-black text-[11px]">
                          <th className="p-2 border border-slate-400 w-8 text-center">#</th>
                          <th className="p-2 border border-slate-400">اليوم والتاريخ</th>
                          <th className="p-2 border border-slate-400 text-center">القوة الكلية</th>
                          <th className="p-2 border border-slate-400 text-center">حاضر (ح)</th>
                          <th className="p-2 border border-slate-400 text-center">غياب (غ)</th>
                          <th className="p-2 border border-slate-400 text-center">إجازة (إ)</th>
                          <th className="p-2 border border-slate-400 text-center">مأمورية (م)</th>
                          <th className="p-2 border border-slate-400 text-center">مرضية (ع)</th>
                          <th className="p-2 border border-slate-400 text-center">نسبة الجاهزية</th>
                          <th className="p-2 border border-slate-400 text-center">التقييم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekly7DaysData.dailySummaries.map((d, i) => (
                          <tr key={d.dateStr} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{i + 1}</td>
                            <td className="p-1.5 border border-slate-300 font-bold">{d.displayDate}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{d.totalForce}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-emerald-900">{d.presentCount}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-rose-900">{d.absentCount}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{d.leaveCount}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{d.missionCount}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{d.sickCount}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black">{d.readinessPct}%</td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold">
                              {d.readinessPct >= 85 ? 'ممتاز' : d.readinessPct >= 70 ? 'جيد' : 'منخفض'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. Units Readiness Comparison Matrix Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900 border-r-4 border-slate-900 pr-2">
                      ثانياً: مقارنة مؤشرات الجاهزية والتمام بين الكتائب والوحدات (أسبوعي)
                    </h4>
                    <table className="w-full text-right border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 border-b border-slate-400 font-black text-[11px]">
                          <th className="p-2 border border-slate-400 w-8 text-center">#</th>
                          <th className="p-2 border border-slate-400">اسم الكتيبة / السرية</th>
                          <th className="p-2 border border-slate-400 text-center">إجمالي القوة</th>
                          <th className="p-2 border border-slate-400 text-center">متوسط الحضور</th>
                          <th className="p-2 border border-slate-400 text-center">متوسط الغياب</th>
                          <th className="p-2 border border-slate-400 text-center">متوسط الإجازات</th>
                          <th className="p-2 border border-slate-400 text-center">متوسط الجاهزية %</th>
                          <th className="p-2 border border-slate-400 text-center">التقييم العام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekly7DaysData.unitSummaries.map((u, i) => (
                          <tr key={u.unitId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{i + 1}</td>
                            <td className="p-1.5 border border-slate-300 font-black">{u.unitName}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{u.uTotal}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-emerald-900">{u.uPresentAvg}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-rose-900">{u.uAbsentAvg}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{u.uLeaveAvg}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-black">{u.uAvgPct}%</td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold">
                              {u.uAvgPct >= 85 ? 'جاهزية عالية' : u.uAvgPct >= 70 ? 'جاهزية مقبولة' : 'تتطلب المتابعة'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 3. Executive Commentary */}
                  <div className="border border-slate-300 p-3.5 rounded-xl bg-slate-50 space-y-1.5 text-xs text-slate-800">
                    <span className="font-black text-slate-900 block">ثالثاً: الملاحظات والتوصيات الإحصائية التلقائية:</span>
                    <ul className="list-disc list-inside space-y-1 leading-relaxed font-medium">
                      <li>بلغ متوسط الجاهزية القتالية والميدانية الإجمالي لآخر 7 أيام <strong>{weekly7DaysData.avgReadinessPct}%</strong>.</li>
                      <li>سجل يوم <strong>{weekly7DaysData.peakDay?.dayName} ({weekly7DaysData.peakDay?.dateStr})</strong> أعلى نسبة تمام وانضباط بـ <strong>{weekly7DaysData.peakDay?.readinessPct}%</strong>.</li>
                      <li>يوصى برفع تقرير الانضباط للقيادة والتوجيه بحصر المتغيبين بدون عذر مقبول واتخاذ الإجراءات العسكرية النظامية.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Standard Printable Table */
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block">إجمالي القوة:</span>
                      <span className="font-black text-slate-900 text-sm block">{reportStats.total}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">الحضور:</span>
                      <span className="font-black text-emerald-800 text-sm block">{reportStats.presentCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">الغياب:</span>
                      <span className="font-black text-rose-800 text-sm block">{reportStats.absentCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">نسبة الجاهزية:</span>
                      <span className="font-black text-amber-800 text-sm block">{reportStats.readinessPercentage}%</span>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 border-b border-slate-300 font-black">
                        <th className="p-2 border border-slate-300 w-10 text-center">#</th>
                        {ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                          <th key={col.key} className="p-2 border border-slate-300">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportTableData.map((r, index) => (
                        <tr key={r.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-800">{index + 1}</td>
                          {ALL_AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                            <td key={col.key} className="p-2 border border-slate-300 font-bold text-slate-900">
                              {r[col.key as keyof typeof r] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <PrintFooter printSettings={printSettings} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
