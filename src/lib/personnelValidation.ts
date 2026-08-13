export interface SoldierPayload {
  militaryNumber?: unknown;
  fullName?: unknown;
  rank?: unknown;
  unitId?: unknown;
  isActive?: unknown;
  nationalId?: unknown;
  birthDate?: unknown;
  bloodType?: unknown;
  phoneNumber?: unknown;
  address?: unknown;
  emergencyContact?: unknown;
  qualification?: unknown;
  specialization?: unknown;
  joinDate?: unknown;
  battalion?: unknown;
  company?: unknown;
  platoon?: unknown;
  militaryStatus?: unknown;
  medicalHistory?: unknown;
  promotionHistory?: unknown;
  assignmentsHistory?: unknown;
  attachments?: unknown;
  photoUrl?: unknown;
}

const nullableTextFields = [
  'nationalId', 'birthDate', 'bloodType', 'phoneNumber', 'address', 'emergencyContact',
  'qualification', 'specialization', 'joinDate', 'battalion', 'company', 'platoon',
  'medicalHistory', 'promotionHistory', 'assignmentsHistory', 'attachments', 'photoUrl',
] as const;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
const nullableText = (value: unknown) => {
  const valueText = text(value);
  return valueText ? valueText : null;
};

const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
const validJsonIfPresent = (value: string | null) => {
  if (!value) return true;
  try { JSON.parse(value); return true; } catch { return false; }
};

export function normalizeSoldierPayload(payload: SoldierPayload, partial = false) {
  const normalized: Record<string, unknown> = {};
  const required = ['militaryNumber', 'fullName', 'rank', 'unitId'] as const;

  for (const field of required) {
    if (!partial || payload[field] !== undefined) normalized[field] = text(payload[field]);
  }
  if (!partial || payload.isActive !== undefined) normalized.isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);
  if (!partial || payload.militaryStatus !== undefined) normalized.militaryStatus = text(payload.militaryStatus) || 'على رأس العمل';

  for (const field of nullableTextFields) {
    if (!partial || payload[field] !== undefined) normalized[field] = nullableText(payload[field]);
  }

  return normalized;
}

export function validateSoldierPayload(payload: SoldierPayload, partial = false): string | null {
  const normalized = normalizeSoldierPayload(payload, partial);
  for (const field of ['militaryNumber', 'fullName', 'rank', 'unitId']) {
    if (!partial || payload[field] !== undefined) {
      const value = String(normalized[field] || '');
      if (!value) return `الحقل ${field} مطلوب`;
      if (value.length > 180) return `الحقل ${field} طويل جداً`;
    }
  }

  for (const field of ['birthDate', 'joinDate']) {
    if (normalized[field] && !validDate(String(normalized[field]))) return `صيغة ${field} يجب أن تكون YYYY-MM-DD`;
  }

  for (const field of ['promotionHistory', 'assignmentsHistory', 'attachments', 'medicalHistory']) {
    if (normalized[field] && !validJsonIfPresent(String(normalized[field]))) return `بيانات ${field} يجب أن تكون JSON صحيحة`;
  }

  if (normalized.phoneNumber && !/^[0-9+()\-\s]{7,30}$/.test(String(normalized.phoneNumber))) return 'رقم الهاتف غير صالح';
  return null;
}
