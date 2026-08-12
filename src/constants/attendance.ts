import { AttendanceStatusCode } from '../types';

export const ATTENDANCE_STATUS_MAP: Record<AttendanceStatusCode, {
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}> = {
  'ح': {
    label: 'حاضر',
    shortLabel: 'حاضر',
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
  },
  'غ': {
    label: 'غائب',
    shortLabel: 'غائب',
    colorClass: 'text-rose-700 dark:text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    badgeClass: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
  },
  'إ': {
    label: 'إجازة',
    shortLabel: 'إجازة',
    colorClass: 'text-blue-700 dark:text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    badgeClass: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30'
  },
  'م': {
    label: 'مهمة / مأمورية',
    shortLabel: 'مهمة',
    colorClass: 'text-purple-700 dark:text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    badgeClass: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30'
  },
  'ع': {
    label: 'بعذر / مرضية',
    shortLabel: 'بعذر',
    colorClass: 'text-amber-700 dark:text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
  },
  'ن': {
    label: 'نصف يوم',
    shortLabel: 'نصف يوم',
    colorClass: 'text-teal-700 dark:text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/30',
    badgeClass: 'bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-500/30'
  },
  'pending': {
    label: 'قيد التحضير',
    shortLabel: 'لم يحضر',
    colorClass: 'text-orange-700 dark:text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    badgeClass: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30'
  }
};

export const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function normalizeStatusCode(code?: string | null): AttendanceStatusCode | '' {
  if (!code) return '';
  const trimmed = code.trim();
  if (trimmed === 'ح' || trimmed === 'حاضر') return 'ح';
  if (trimmed === 'غ' || trimmed === 'غائب') return 'غ';
  if (trimmed === 'إ' || trimmed === 'إجازة' || trimmed === 'إجازة رسمية') return 'إ';
  if (trimmed === 'م' || trimmed === 'مهمة' || trimmed === 'مأمورية') return 'م';
  if (trimmed === 'ع' || trimmed === 'بعذر' || trimmed === 'مرضية' || trimmed === 'عذر') return 'ع';
  if (trimmed === 'ن' || trimmed === 'نصف يوم') return 'ن';
  if (['ح', 'غ', 'إ', 'م', 'ع', 'ن'].includes(trimmed)) return trimmed as AttendanceStatusCode;
  return '';
}
