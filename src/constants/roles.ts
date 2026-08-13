import { UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير النظام',
  commander_formation: 'قائد تشكيل',
  commander_unit: 'قائد وحدة فرعية',
  operations: 'ركن عمليات',
  data_writer: 'كاتب بيانات',
  soldier: 'فرد / جندي',
  pending: 'بانتظار اعتماد المدير'
};

export const MILITARY_RANKS = [
  'جندي',
  'جندي أول',
  'عريف',
  'وكيل رقيب',
  'رقيب',
  'رقيب أول',
  'رئيس رقباء',
  'ملازم',
  'ملازم أول',
  'نقيب',
  'رائد',
  'مقدم',
  'عقيد',
  'عميد',
  'لواء',
  'فريق',
  'فريق أول'
];

export const UNIT_TYPES = [
  'قيادة تشكيل',
  'قوات',
  'فرقة',
  'لواء',
  'كتيبة',
  'سرية',
  'فصيلة',
  'مجموعة'
];
