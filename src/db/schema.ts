import { pgTable, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // We can use the firebase uid or u1, u2 for system mock/init users
  uid: text('uid').unique(), // Firebase auth uid
  name: text('name').notNull(),
  email: text('email').notNull(),
  username: text('username'), // username for local password login
  password: text('password'), // password for local password login
  role: text('role').notNull(), // 'admin' | 'commander_formation' | 'commander_unit' | 'operations' | 'data_writer'
  unitId: text('unit_id'), // Restrict to a specific unit if unit-level role
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
  attachments: text('attachments'), // JSON array of attachments
  photoUrl: text('photo_url'), // base64 or URL of soldier's photo
}, (table) => {
  return {
    milNumIdx: index('mil_num_idx').on(table.militaryNumber),
    fullNameIdx: index('full_name_idx').on(table.fullName),
    rankIdx: index('rank_idx').on(table.rank),
    unitIdx: index('unit_idx').on(table.unitId),
    activeIdx: index('active_idx').on(table.isActive),
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
  printSettings: text('print_settings'),
});
