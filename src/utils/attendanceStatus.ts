import { AttendanceStatusCode } from '../types';

/**
 * توحيد رموز حالات الحضور القادمة من البيانات القديمة أو النماذج النصية.
 */
export const normalizeStatusCode = (code: string | null | undefined): string => {
  if (!code) return 'pending';
  const c = String(code).trim();
  if (c === 'ح' || c === 'حاضر' || c.startsWith('حاضر')) return 'ح';
  if (c === 'غ' || c === 'غائب' || c.startsWith('غائب')) return 'غ';
  if (c === 'إ' || c === 'إجازة' || c.startsWith('إجاز')) return 'إ';
  if (c === 'م' || c === 'مهمة' || c.startsWith('مهم')) return 'م';
  if (c === 'ع' || c === 'بعذر' || c === 'عذر' || c.includes('عذر')) return 'ع';
  if (c === 'ن' || c === 'نصف يوم' || c === 'نصف دوام' || c.includes('نصف')) return 'ن';
  if (c === 'pending') return 'pending';
  return c;
};

export const isKnownAttendanceStatus = (code: string | null | undefined): code is AttendanceStatusCode | 'pending' => {
  return ['ح', 'غ', 'إ', 'م', 'ع', 'ن', 'pending'].includes(normalizeStatusCode(code));
};
