export type UserRole = 'admin' | 'commander_formation' | 'commander_unit' | 'operations' | 'data_writer' | 'soldier' | 'pending';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  password?: string | null;
  role: UserRole;
  unitId: string | null; // Restricted unit for unit-level roles
  soldierId?: string | null; // Linked soldier ID if role is 'soldier'
  canManageSettings?: boolean; // Granted explicit permission to manage readiness settings
  canManageReadinessSettings?: boolean;
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
  custodiesHistory?: string | null; // JSON array of military custody records
  attachments?: string | null; // JSON array of attachments
  photoUrl?: string | null; // base64 or URL of soldier's photo
  hasAccount?: boolean;
  accountUsername?: string | null;
  accountPassword?: string | null;
  assignedTasks?: string | null; // JSON string array or text of assigned procedures/tasks
  allowProfileEdit?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  category: 'تحديث بيانات' | 'استبيان' | 'إقرار' | 'رفع مستند' | 'طلب معلومات' | 'طلب إجازة/خدمة';
  description: string;
  instructions?: string | null;
  targetScope: 'all' | 'battalion' | 'company' | 'single' | 'selected';
  targetId?: string | null;
  deadline?: string | null;
  isRecurring?: boolean;
  frequency?: 'مرة واحدة' | 'شهري' | 'سنوي';
  autoReminder?: boolean;
  fieldsNeeded?: string[] | string | null;
  status: 'نشط' | 'مغلق' | 'مكتمل';
  createdBy?: string | null;
  createdAt: string;
}

export type RequestStatus = 
  | 'new'            // جديد
  | 'viewed'         // تم الاطلاع
  | 'in_progress'    // قيد التنفيذ
  | 'submitted'      // تم الإرسال / قيد المراجعة
  | 'under_review'   // قيد المراجعة
  | 'needs_amendment'// يحتاج تعديل
  | 'approved'       // معتمد
  | 'rejected'       // مرفوض
  | 'pending';       // معلق (للتوافقية)

export interface RequestHistoryLog {
  timestamp: string;
  action: string;
  actor: string;
  notes?: string;
}

export interface SoldierActionRequest {
  id: string;
  surveyId?: string | null;
  soldierId: string;
  soldierName: string;
  soldierRank?: string;
  militaryNumber?: string;
  unitId?: string;
  requestType: 'update_profile' | 'survey' | 'declaration' | 'upload_doc' | 'info_request' | 'leave_request' | 'required_task' | 'general';
  title: string;
  description: string;
  proposedData?: Record<string, any> | string; // proposed field updates or answer data
  attachments?: string[] | string | null;
  status: RequestStatus;
  rejectionReason?: string | null;
  reviewNotes?: string | null;
  historyLogs?: RequestHistoryLog[] | string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface MilitaryCustody {
  id: string;
  soldierId: string;
  custodyNumber: string; // رقم العهدة (رقم السلاح / الرقم المميز للمركبة / رقم الأمانة)
  type: string; // نوع العهدة (مثل: بندقية، جهاز اتصال، سيارة، نظارة ليلية، درع واقي، أثاث، إلخ)
  description: string; // وصف العهدة
  quantity: number; // الكمية
  issueDate: string; // تاريخ التسلم (تاريخ العهد) YYYY-MM-DD
  status: 'نشط' | 'منتهٍ' | 'قيد التدقيق' | 'مفقود/متحفظ عليه'; // حالة العهدة
  orderRef?: string; // مرجع الأمر الإداري (إن وجد)
  issuingDept: string; // اسم الجهة المسلمة (الإمداد / التسليح / الفنية / شؤون الأفراد / أخرى)
  issuingOfficer: string; // اسم الموظف أو القائد المسلم
  notes?: string; // ملاحظات وبنود إخلاء الطرف
  individualSigned: boolean; // توقيع الفرد
  officerSigned: boolean; // توقيع المسؤول
  returnDate?: string; // تاريخ الإرجاع / إخلاء الطرف
  createdAt?: string;
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
  diagnosis?: string;
  attachmentUrl?: string | null;
  status: string; // 'نشط' | 'منتهي'
  hospital?: string | null;
  notes?: string | null;
  createdAt?: string;
}

// ح: حضور, غ: غياب, إ: إجازة, م: مهمة, ع: بعذر, ن: نصف يوم, pending: معلق/غير محدد
export type AttendanceStatusCode = 'ح' | 'غ' | 'إ' | 'م' | 'ع' | 'ن' | 'pending';

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

export type PrintTemplateId = 
  | 'royal_gold' 
  | 'military_tactical' 
  | 'navy_official' 
  | 'modern_minimal' 
  | 'slate_executive' 
  | 'luxurious_crest';

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
  templateId?: PrintTemplateId;
}

export interface SystemSettings {
  warningThreshold: number; // e.g. 70%
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM
  autoBackupEnabled: boolean;
  hijriSupport: boolean;
  highContrastMode?: boolean;
  printSettings?: PrintSettings;
}
