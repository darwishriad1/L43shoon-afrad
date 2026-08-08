import { pgTable, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // We can use the firebase uid or u1, u2 for system mock/init users
  uid: text('uid').unique(), // Firebase auth uid
  name: text('name').notNull(),
  email: text('email').notNull(),
  username: text('username'), // username for local password login
  password: text('password'), // password for local password login
  role: text('role').notNull(), // 'admin' | 'commander_formation' | 'commander_unit' | 'operations' | 'data_writer' | 'soldier'
  unitId: text('unit_id'), // Restrict to a specific unit if unit-level role
  soldierId: text('soldier_id'), // Link to soldier ID if role is 'soldier'
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'), // Hierarchy
  commanderId: text('commander_id'),
  commanderName: text('commander_name'),
  type: text('type'), // قوات | فرقة | لواء | كتيبة | سرية | فصيلة | مجموعة
  location: text('location'),
  approvedStrength: integer('approved_strength'),
  status: text('status'), // نشط | ملغى | مؤرشف
  code: text('code'),
});

export const soldiers = pgTable('soldiers', {
  id: text('id').primaryKey(),
  militaryNumber: text('military_number').notNull(),
  fullName: text('full_name').notNull(),
  rank: text('rank').notNull(),
  unitId: text('unit_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  nationalId: text('national_id'),
  birthDate: text('birth_date'),
  bloodType: text('blood_type'),
  phoneNumber: text('phone_number'),
  address: text('address'),
  emergencyContact: text('emergency_contact'),
  qualification: text('qualification'),
  specialization: text('specialization'),
  joinDate: text('join_date'),
  battalion: text('battalion'),
  company: text('company'),
  platoon: text('platoon'),
  militaryStatus: text('military_status').default('على رأس العمل').notNull(), // 'على رأس العمل' | 'إجازة' | 'موقوف' | 'منقول'
  medicalHistory: text('medical_history'),
  promotionHistory: text('promotion_history'), // JSON array of promotions
  assignmentsHistory: text('assignments_history'), // JSON array of past assignments
  custodiesHistory: text('custodies_history'), // JSON array of military custody records
  attachments: text('attachments'), // JSON array of attachments
  photoUrl: text('photo_url'), // base64 or URL of soldier's photo
  hasAccount: boolean('has_account').default(false),
  accountUsername: text('account_username'),
  accountPassword: text('account_password'),
  assignedTasks: text('assigned_tasks'),
  allowProfileEdit: boolean('allow_profile_edit').default(true),
}, (table) => {
  return {
    milNumIdx: index('mil_num_idx').on(table.militaryNumber),
    fullNameIdx: index('full_name_idx').on(table.fullName),
    rankIdx: index('rank_idx').on(table.rank),
    unitIdx: index('unit_idx').on(table.unitId),
    activeIdx: index('active_idx').on(table.isActive),
  };
});

export const surveys = pgTable('surveys', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').default('تحديث بيانات').notNull(), // 'تحديث بيانات' | 'استبيان' | 'إقرار' | 'رفع مستند' | 'طلب معلومات' | 'طلب إجازة/خدمة'
  description: text('description').notNull(),
  instructions: text('instructions'),
  targetScope: text('target_scope').default('all').notNull(), // 'all' | 'battalion' | 'company' | 'single' | 'selected'
  targetId: text('target_id'), // unitId, soldierId, or JSON array string of soldier IDs
  deadline: text('deadline'), // YYYY-MM-DD
  isRecurring: boolean('is_recurring').default(false),
  frequency: text('frequency').default('مرة واحدة'), // 'مرة واحدة' | 'شهري' | 'سنوي'
  autoReminder: boolean('auto_reminder').default(true),
  fieldsNeeded: text('fields_needed'), // JSON string array
  status: text('status').default('نشط').notNull(), // 'نشط' | 'مغلق' | 'مكتمل'
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
});

export const soldierRequests = pgTable('soldier_requests', {
  id: text('id').primaryKey(),
  surveyId: text('survey_id'),
  soldierId: text('soldier_id').notNull(),
  soldierName: text('soldier_name').notNull(),
  soldierRank: text('soldier_rank'),
  militaryNumber: text('military_number'),
  unitId: text('unit_id'),
  requestType: text('request_type').notNull(), // 'update_profile' | 'survey' | 'declaration' | 'upload_doc' | 'info_request' | 'leave_request' | 'general'
  title: text('title').notNull(),
  description: text('description').notNull(),
  proposedData: text('proposed_data'), // JSON string of proposed changes / answer form data
  attachments: text('attachments'), // JSON array of file/document URLs
  status: text('status').default('new').notNull(), // 'new' | 'viewed' | 'in_progress' | 'submitted' | 'under_review' | 'needs_amendment' | 'approved' | 'rejected'
  rejectionReason: text('rejection_reason'),
  reviewNotes: text('review_notes'), // Notes from Personnel Affairs for amendments or approval
  historyLogs: text('history_logs'), // JSON array of audit history [{timestamp, action, actor, notes}]
  submittedAt: text('submitted_at').notNull(),
  reviewedAt: text('reviewed_at'),
  reviewedBy: text('reviewed_by'),
}, (table) => {
  return {
    reqSoldierIdx: index('req_soldier_idx').on(table.soldierId),
    reqStatusIdx: index('req_status_idx').on(table.status),
    reqSurveyIdx: index('req_survey_idx').on(table.surveyId),
  };
});

export const sickLeaves = pgTable('sick_leaves', {
  id: text('id').primaryKey(),
  soldierId: text('soldier_id').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  illnessType: text('illness_type').notNull(),
  duration: integer('duration').notNull(), // in days
  doctorName: text('doctor_name').notNull(),
  status: text('status').default('نشط').notNull(), // 'نشط' | 'منتهي'
  hospital: text('hospital'),
  notes: text('notes'),
}, (table) => {
  return {
    sickLeaveSoldierIdx: index('sick_leave_soldier_idx').on(table.soldierId),
  };
});

export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  soldierId: text('soldier_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  statusCode: text('status_code').notNull(), // 'ح' | 'غ' | 'إ' | 'م' | 'ع' | 'ن'
  recordedBy: text('recorded_by').notNull(), // User ID
  updatedAt: text('updated_at').notNull(), // ISO string or text
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  actionType: text('action_type').notNull(), // 'إضافة' | 'تعديل' | 'حذف' | 'استيراد' | 'استعادة'
  tableName: text('table_name').notNull(),
  details: text('details').notNull(),
  timestamp: text('timestamp').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  soldierId: text('soldier_id'),
  targetSoldierId: text('target_soldier_id'),
  militaryNumber: text('military_number'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  type: text('type').notNull(), // 'warning' | 'info' | 'error'
  createdAt: text('created_at').notNull(),
});

export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey(), // Singleton setting (id = 1)
  warningThreshold: integer('warning_threshold').default(70).notNull(),
  dailyReminderEnabled: boolean('daily_reminder_enabled').default(true).notNull(),
  dailyReminderTime: text('daily_reminder_time').default('08:00').notNull(),
  autoBackupEnabled: boolean('auto_backup_enabled').default(true).notNull(),
  hijriSupport: boolean('hijri_support').default(true).notNull(),
  highContrastMode: boolean('high_contrast_mode').default(false),
  printSettings: text('print_settings'),
});
