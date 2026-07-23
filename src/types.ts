export type UserRole = 'admin' | 'commander_formation' | 'commander_unit' | 'operations' | 'data_writer';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  password?: string | null;
  role: UserRole;
  unitId: string | null; // Restricted unit for unit-level roles
}

export interface Unit {
  id: string;
  name: string;
  parentId: string | null; // Multi-level hierarchy
  commanderId: string | null;
  commanderName: string | null;
  type?: string | null; // قوات | فرقة | لواء | كتيبة | سرية | فصيلة | مجموعة
  location?: string | null;
  approvedStrength?: number | null;
  status?: string | null; // نشط | ملغى | مؤرشف
  code?: string | null;
}

export interface Soldier {
  id: string;
  militaryNumber: string;
  fullName: string;
  rank: string;
  unitId: string;
  isActive: boolean;
  nationalId?: string | null;
  birthDate?: string | null;
  bloodType?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  joinDate?: string | null;
  battalion?: string | null;
  company?: string | null;
  platoon?: string | null;
  militaryStatus?: string | null; // 'على رأس العمل' | 'إجازة' | 'موقوف' | 'منقول'
  medicalHistory?: string | null;
  promotionHistory?: string | null; // JSON array of promotions
  assignmentsHistory?: string | null; // JSON array of past assignments
  attachments?: string | null; // JSON array of attachments
  photoUrl?: string | null; // base64 or URL of soldier's photo
}

export interface SickLeave {
  id: string;
  soldierId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  illnessType: string; // e.g. 'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'
  leaveType?: string; // 'استحقاق' | 'إذن' | 'طارئة' | 'مرضية'
  duration: number; // in days
  doctorName: string; // Doctor or granting authority
  grantingAuthority?: string; // 'الكتيبة' | 'قائد اللواء' | 'مكتب القائد' | 'ركن القوة البشرية' | 'الخدمات الطبية' | 'أخرى'
  orderNumber?: string;
  orderDate?: string;
  reason?: string;
  attachmentUrl?: string | null;
  status: string; // 'نشط' | 'منتهي'
  hospital?: string | null;
  notes?: string | null;
  createdAt?: string;
}

// ح: حضور, غ: غياب, إ: إجازة, م: مهمة, ع: بعذر, ن: نصف يوم
export type AttendanceStatusCode = 'ح' | 'غ' | 'إ' | 'م' | 'ع' | 'ن';

export interface AttendanceRecord {
  id: string;
  soldierId: string;
  date: string; // YYYY-MM-DD
  statusCode: AttendanceStatusCode;
  recordedBy: string; // User ID
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  actionType: 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة';
  tableName: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'warning' | 'info' | 'error';
  createdAt: string;
}

export interface PrintSettings {
  logoUrl?: string | null;
  signatureUrl?: string | null;
  sealUrl?: string | null;
  countryName?: string;
  ministryName?: string;
  commandName?: string;
  unitName?: string;
  headerText?: string;
  footerText?: string;
  showLogo?: boolean;
  showSignature?: boolean;
  showSeal?: boolean;
  paperSize?: 'A4' | 'A5' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export interface SystemSettings {
  warningThreshold: number; // e.g. 70%
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM
  autoBackupEnabled: boolean;
  hijriSupport: boolean;
  printSettings?: PrintSettings;
}
