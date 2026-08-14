import { Express, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { 
  users, 
  units, 
  soldiers, 
  attendance, 
  sickLeaves, 
  auditLogs, 
  notifications, 
  systemSettings, 
  surveys, 
  soldierRequests 
} from '../db/schema.ts';
import { count, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  getSupabaseClient, 
  testSupabaseConnection 
} from './supabaseService.ts';

// File path for persistent secondary database storage on disk
const SECONDARY_DB_DIR = path.join(process.cwd(), 'data');
const SECONDARY_DB_FILE = path.join(SECONDARY_DB_DIR, 'secondary_redundant_db.json');
const SNAPSHOTS_FILE = path.join(SECONDARY_DB_DIR, 'secondary_snapshots.json');

// In-memory state for secondary database
interface SecondaryDbState {
  isActiveStandby: boolean;
  autoMirrorEnabled: boolean;
  autoMirrorIntervalMinutes: number;
  lastSyncTimestamp: string | null;
  lastSyncDurationMs: number;
  lastSyncHash: string | null;
  totalSyncedRecords: number;
  data: {
    users: any[];
    units: any[];
    soldiers: any[];
    attendance: any[];
    sickLeaves: any[];
    auditLogs: any[];
    notifications: any[];
    systemSettings: any[];
    surveys: any[];
    soldierRequests: any[];
  };
}

interface SnapshotItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  totalRecords: number;
  counts: Record<string, number>;
  hash: string;
  data: any;
}

let secondaryDbState: SecondaryDbState = {
  isActiveStandby: true,
  autoMirrorEnabled: true,
  autoMirrorIntervalMinutes: 10,
  lastSyncTimestamp: null,
  lastSyncDurationMs: 0,
  lastSyncHash: null,
  totalSyncedRecords: 0,
  data: {
    users: [],
    units: [],
    soldiers: [],
    attendance: [],
    sickLeaves: [],
    auditLogs: [],
    notifications: [],
    systemSettings: [],
    surveys: [],
    soldierRequests: []
  }
};

let snapshotsHistory: SnapshotItem[] = [];

// Initialize files from disk
function initSecondaryStorage() {
  try {
    if (!fs.existsSync(SECONDARY_DB_DIR)) {
      fs.mkdirSync(SECONDARY_DB_DIR, { recursive: true });
    }

    if (fs.existsSync(SECONDARY_DB_FILE)) {
      const raw = fs.readFileSync(SECONDARY_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        secondaryDbState = { ...secondaryDbState, ...parsed };
      }
    }

    if (fs.existsSync(SNAPSHOTS_FILE)) {
      const rawSnaps = fs.readFileSync(SNAPSHOTS_FILE, 'utf-8');
      snapshotsHistory = JSON.parse(rawSnaps) || [];
    }
  } catch (err) {
    console.warn('Error initializing secondary storage on disk:', err);
  }
}

initSecondaryStorage();

// Helper to persist secondary DB to disk
function persistSecondaryStorage() {
  try {
    if (!fs.existsSync(SECONDARY_DB_DIR)) {
      fs.mkdirSync(SECONDARY_DB_DIR, { recursive: true });
    }
    fs.writeFileSync(SECONDARY_DB_FILE, JSON.stringify(secondaryDbState, null, 2), 'utf-8');
    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshotsHistory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write secondary db to disk:', err);
  }
}

// Compute checksum hash
function computeDataHash(data: any): string {
  try {
    const serialized = JSON.stringify(data);
    return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
  } catch {
    return `hash_${Date.now()}`;
  }
}

export function setupSecondaryDbRoutes(app: Express) {

  // 1. Get Secondary DB Status & Comparison with Primary DB
  app.get('/api/secondary-db/status', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const startTime = Date.now();

      // Query primary DB counts
      const [uCount] = await db.select({ val: count() }).from(users);
      const [sCount] = await db.select({ val: count() }).from(soldiers);
      const [unCount] = await db.select({ val: count() }).from(units);
      const [attCount] = await db.select({ val: count() }).from(attendance);
      const [leavesCount] = await db.select({ val: count() }).from(sickLeaves);
      const [notifsCount] = await db.select({ val: count() }).from(notifications);
      const [logsCount] = await db.select({ val: count() }).from(auditLogs);
      const [surveysCount] = await db.select({ val: count() }).from(surveys);
      const [requestsCount] = await db.select({ val: count() }).from(soldierRequests);

      const primaryCounts: Record<string, number> = {
        users: uCount.val,
        soldiers: sCount.val,
        units: unCount.val,
        attendance: attCount.val,
        sickLeaves: leavesCount.val,
        notifications: notifsCount.val,
        auditLogs: logsCount.val,
        surveys: surveysCount.val,
        soldierRequests: requestsCount.val
      };

      const primaryTotal = Object.values(primaryCounts).reduce((a, b) => a + b, 0);

      // Secondary DB counts
      const secondaryCounts: Record<string, number> = {
        users: secondaryDbState.data.users?.length || 0,
        soldiers: secondaryDbState.data.soldiers?.length || 0,
        units: secondaryDbState.data.units?.length || 0,
        attendance: secondaryDbState.data.attendance?.length || 0,
        sickLeaves: secondaryDbState.data.sickLeaves?.length || 0,
        notifications: secondaryDbState.data.notifications?.length || 0,
        auditLogs: secondaryDbState.data.auditLogs?.length || 0,
        surveys: secondaryDbState.data.surveys?.length || 0,
        soldierRequests: secondaryDbState.data.soldierRequests?.length || 0
      };

      const secondaryTotal = Object.values(secondaryCounts).reduce((a, b) => a + b, 0);
      const latencyMs = Date.now() - startTime;

      // Table Comparison Matrix
      const tableComparison = [
        {
          key: 'soldiers',
          name: 'الأفراد والضباط (القوة الفعلية)',
          primaryCount: primaryCounts.soldiers,
          secondaryCount: secondaryCounts.soldiers,
          inSync: primaryCounts.soldiers === secondaryCounts.soldiers,
          difference: primaryCounts.soldiers - secondaryCounts.soldiers
        },
        {
          key: 'units',
          name: 'السرايا والكتائب والوحدات',
          primaryCount: primaryCounts.units,
          secondaryCount: secondaryCounts.units,
          inSync: primaryCounts.units === secondaryCounts.units,
          difference: primaryCounts.units - secondaryCounts.units
        },
        {
          key: 'attendance',
          name: 'سجلات التحضير والميدان اليومي',
          primaryCount: primaryCounts.attendance,
          secondaryCount: secondaryCounts.attendance,
          inSync: primaryCounts.attendance === secondaryCounts.attendance,
          difference: primaryCounts.attendance - secondaryCounts.attendance
        },
        {
          key: 'sickLeaves',
          name: 'الإجازات والتقارير الطبية',
          primaryCount: primaryCounts.sickLeaves,
          secondaryCount: secondaryCounts.sickLeaves,
          inSync: primaryCounts.sickLeaves === secondaryCounts.sickLeaves,
          difference: primaryCounts.sickLeaves - secondaryCounts.sickLeaves
        },
        {
          key: 'soldierRequests',
          name: 'طلبات وإجراءات الأفراد',
          primaryCount: primaryCounts.soldierRequests,
          secondaryCount: secondaryCounts.soldierRequests,
          inSync: primaryCounts.soldierRequests === secondaryCounts.soldierRequests,
          difference: primaryCounts.soldierRequests - secondaryCounts.soldierRequests
        },
        {
          key: 'surveys',
          name: 'المسوحات والاستبيانات والبرقيات',
          primaryCount: primaryCounts.surveys,
          secondaryCount: secondaryCounts.surveys,
          inSync: primaryCounts.surveys === secondaryCounts.surveys,
          difference: primaryCounts.surveys - secondaryCounts.surveys
        },
        {
          key: 'users',
          name: 'حسابات المستخدمين والأدوار',
          primaryCount: primaryCounts.users,
          secondaryCount: secondaryCounts.users,
          inSync: primaryCounts.users === secondaryCounts.users,
          difference: primaryCounts.users - secondaryCounts.users
        },
        {
          key: 'notifications',
          name: 'التنبيهات والإشعارات التكتيكية',
          primaryCount: primaryCounts.notifications,
          secondaryCount: secondaryCounts.notifications,
          inSync: primaryCounts.notifications === secondaryCounts.notifications,
          difference: primaryCounts.notifications - secondaryCounts.notifications
        },
        {
          key: 'auditLogs',
          name: 'سجلات التدقيق والرقابة الأمنية',
          primaryCount: primaryCounts.auditLogs,
          secondaryCount: secondaryCounts.auditLogs,
          inSync: primaryCounts.auditLogs === secondaryCounts.auditLogs,
          difference: primaryCounts.auditLogs - secondaryCounts.auditLogs
        }
      ];

      const allInSync = tableComparison.every(t => t.inSync);
      const syncPercentage = primaryTotal > 0 
        ? Math.min(100, Math.round((secondaryTotal / primaryTotal) * 100))
        : 100;

      return res.json({
        success: true,
        status: 'online',
        serverTime: new Date().toISOString(),
        latencyMs,
        isActiveStandby: secondaryDbState.isActiveStandby,
        autoMirrorEnabled: secondaryDbState.autoMirrorEnabled,
        autoMirrorIntervalMinutes: secondaryDbState.autoMirrorIntervalMinutes,
        lastSyncTimestamp: secondaryDbState.lastSyncTimestamp,
        lastSyncDurationMs: secondaryDbState.lastSyncDurationMs,
        lastSyncHash: secondaryDbState.lastSyncHash,
        allInSync,
        syncPercentage,
        primaryTotal,
        secondaryTotal,
        primaryCounts,
        secondaryCounts,
        tableComparison,
        snapshotsCount: snapshotsHistory.length,
        storageEngine: 'Dual-Storage Engine (Drizzle ORM + Secondary Redundant Standby JSON/Encrypted Cluster)'
      });
    } catch (error: any) {
      console.error('Secondary DB status error:', error);
      return res.status(500).json({ 
        success: false, 
        status: 'error', 
        error: error.message || 'فشل الاتصال بقاعدة البيانات الاحتياطية' 
      });
    }
  });

  // 2. Upload Everything to Secondary Database (رفع ومزامنة كاملة وشاملة لكل شيء)
  app.post('/api/secondary-db/upload-all', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const startTime = Date.now();

      // Fetch all data from primary tables
      const allUsers = await db.select().from(users);
      const allUnits = await db.select().from(units);
      const allSoldiers = await db.select().from(soldiers);
      const allAttendance = await db.select().from(attendance);
      const allSickLeaves = await db.select().from(sickLeaves);
      const allAuditLogs = await db.select().from(auditLogs);
      const allNotifications = await db.select().from(notifications);
      const allSettings = await db.select().from(systemSettings);
      const allSurveys = await db.select().from(surveys);
      const allRequests = await db.select().from(soldierRequests);

      const dump = {
        users: allUsers,
        units: allUnits,
        soldiers: allSoldiers,
        attendance: allAttendance,
        sickLeaves: allSickLeaves,
        auditLogs: allAuditLogs,
        notifications: allNotifications,
        systemSettings: allSettings,
        surveys: allSurveys,
        soldierRequests: allRequests
      };

      const totalCount = 
        allUsers.length + 
        allUnits.length + 
        allSoldiers.length + 
        allAttendance.length + 
        allSickLeaves.length + 
        allAuditLogs.length + 
        allNotifications.length + 
        allSettings.length + 
        allSurveys.length + 
        allRequests.length;

      const durationMs = Date.now() - startTime;
      const hash = computeDataHash(dump);
      const syncTimestamp = new Date().toISOString();

      // Update secondary DB state
      secondaryDbState.data = dump;
      secondaryDbState.lastSyncTimestamp = syncTimestamp;
      secondaryDbState.lastSyncDurationMs = durationMs;
      secondaryDbState.lastSyncHash = hash;
      secondaryDbState.totalSyncedRecords = totalCount;

      // Also create an automatic snapshot
      const snapshotId = `snap_${Date.now()}`;
      const newSnapshot: SnapshotItem = {
        id: snapshotId,
        name: `نسخة رفع كاملة - ${new Date().toLocaleDateString('ar-YE')}`,
        description: `تم الرفع والمزامنة الشاملة بواسطة ${req.dbUser?.name || 'مدير النظام'} (${totalCount} سجل)`,
        createdAt: syncTimestamp,
        createdBy: req.dbUser?.name || 'مدير النظام',
        totalRecords: totalCount,
        counts: {
          soldiers: allSoldiers.length,
          units: allUnits.length,
          attendance: allAttendance.length,
          sickLeaves: allSickLeaves.length,
          users: allUsers.length
        },
        hash,
        data: dump
      };

      snapshotsHistory.unshift(newSnapshot);
      if (snapshotsHistory.length > 20) {
        snapshotsHistory = snapshotsHistory.slice(0, 20);
      }

      // Persist to disk
      persistSecondaryStorage();

      // Insert audit log
      try {
        await db.insert(auditLogs).values({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: req.dbUser?.id || 'admin',
          userName: req.dbUser?.name || 'مدير النظام',
          userRole: req.dbUser?.role || 'admin',
          actionType: 'استيراد',
          tableName: 'secondary_db_sync',
          details: `تم رفع ومزامنة كافة السجلات (${totalCount} سجل) إلى قاعدة البيانات الاحتياطية بنجاح. البصمة الرقمية: ${hash}`,
          timestamp: syncTimestamp
        });
      } catch {}

      return res.json({
        success: true,
        message: 'تم رفع كافة البيانات والسجلات إلى قاعدة البيانات الاحتياطية بنجاح!',
        syncTimestamp,
        durationMs,
        hash,
        totalRecords: totalCount,
        counts: {
          users: allUsers.length,
          units: allUnits.length,
          soldiers: allSoldiers.length,
          attendance: allAttendance.length,
          sickLeaves: allSickLeaves.length,
          auditLogs: allAuditLogs.length,
          notifications: allNotifications.length,
          surveys: allSurveys.length,
          soldierRequests: allRequests.length
        }
      });
    } catch (error: any) {
      console.error('Upload all to secondary DB error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'حدث خطأ أثناء رفع البيانات للقاعدة الاحتياطية' 
      });
    }
  });

  // 3. Restore Everything from Secondary Database to Primary
  app.post('/api/secondary-db/restore-from-backup', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { snapshotId } = req.body;
      let sourceData = secondaryDbState.data;

      if (snapshotId) {
        const foundSnap = snapshotsHistory.find(s => s.id === snapshotId);
        if (foundSnap && foundSnap.data) {
          sourceData = foundSnap.data;
        }
      }

      if (!sourceData || !sourceData.soldiers || sourceData.soldiers.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'لا توجد بيانات صالحة في قاعدة البيانات الاحتياطية للاسترجاع' 
        });
      }

      const startTime = Date.now();

      // Wipe and replace in primary DB tables carefully
      // 1. Units
      if (sourceData.units && sourceData.units.length > 0) {
        await db.delete(units);
        for (const u of sourceData.units) {
          await db.insert(units).values(u).onConflictDoNothing();
        }
      }

      // 2. Soldiers
      if (sourceData.soldiers && sourceData.soldiers.length > 0) {
        await db.delete(soldiers);
        for (const s of sourceData.soldiers) {
          await db.insert(soldiers).values(s).onConflictDoNothing();
        }
      }

      // 3. Attendance
      if (sourceData.attendance && sourceData.attendance.length > 0) {
        await db.delete(attendance);
        for (const att of sourceData.attendance) {
          await db.insert(attendance).values(att).onConflictDoNothing();
        }
      }

      // 4. Sick Leaves
      if (sourceData.sickLeaves && sourceData.sickLeaves.length > 0) {
        await db.delete(sickLeaves);
        for (const sl of sourceData.sickLeaves) {
          await db.insert(sickLeaves).values(sl).onConflictDoNothing();
        }
      }

      // 5. Soldier Requests
      if (sourceData.soldierRequests && sourceData.soldierRequests.length > 0) {
        await db.delete(soldierRequests);
        for (const sr of sourceData.soldierRequests) {
          await db.insert(soldierRequests).values(sr).onConflictDoNothing();
        }
      }

      // 6. Users
      if (sourceData.users && sourceData.users.length > 0) {
        for (const u of sourceData.users) {
          await db.insert(users).values(u).onConflictDoNothing();
        }
      }

      const durationMs = Date.now() - startTime;

      // Log action
      try {
        await db.insert(auditLogs).values({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: req.dbUser?.id || 'admin',
          userName: req.dbUser?.name || 'مدير النظام',
          userRole: req.dbUser?.role || 'admin',
          actionType: 'استعادة',
          tableName: 'primary_db_restored',
          details: `تمت استعادة كافة البيانات من قاعدة البيانات الاحتياطية بنجاح (${sourceData.soldiers.length} فرد).`,
          timestamp: new Date().toISOString()
        });
      } catch {}

      return res.json({
        success: true,
        message: 'تمت استعادة كافة البيانات من القاعدة الاحتياطية بنجاح!',
        durationMs,
        restoredCounts: {
          soldiers: sourceData.soldiers?.length || 0,
          units: sourceData.units?.length || 0,
          attendance: sourceData.attendance?.length || 0,
          sickLeaves: sourceData.sickLeaves?.length || 0,
          users: sourceData.users?.length || 0
        }
      });
    } catch (error: any) {
      console.error('Restore from secondary DB error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'حدث خطأ أثناء استعادة البيانات من القاعدة الاحتياطية' 
      });
    }
  });

  // 4. Toggle Auto Mirroring
  app.post('/api/secondary-db/toggle-auto-mirror', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const { enabled, intervalMinutes } = req.body;
      if (typeof enabled === 'boolean') {
        secondaryDbState.autoMirrorEnabled = enabled;
      }
      if (intervalMinutes && Number(intervalMinutes) >= 1) {
        secondaryDbState.autoMirrorIntervalMinutes = Number(intervalMinutes);
      }
      persistSecondaryStorage();

      return res.json({
        success: true,
        autoMirrorEnabled: secondaryDbState.autoMirrorEnabled,
        autoMirrorIntervalMinutes: secondaryDbState.autoMirrorIntervalMinutes
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Create Instant Frozen Snapshot in Secondary DB
  app.post('/api/secondary-db/snapshots', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { name, description } = req.body;

      // Fetch primary data
      const allUsers = await db.select().from(users);
      const allUnits = await db.select().from(units);
      const allSoldiers = await db.select().from(soldiers);
      const allAttendance = await db.select().from(attendance);
      const allSickLeaves = await db.select().from(sickLeaves);
      const allAuditLogs = await db.select().from(auditLogs);
      const allNotifications = await db.select().from(notifications);
      const allSettings = await db.select().from(systemSettings);
      const allSurveys = await db.select().from(surveys);
      const allRequests = await db.select().from(soldierRequests);

      const dump = {
        users: allUsers,
        units: allUnits,
        soldiers: allSoldiers,
        attendance: allAttendance,
        sickLeaves: allSickLeaves,
        auditLogs: allAuditLogs,
        notifications: allNotifications,
        systemSettings: allSettings,
        surveys: allSurveys,
        soldierRequests: allRequests
      };

      const totalRecords = 
        allUsers.length + 
        allUnits.length + 
        allSoldiers.length + 
        allAttendance.length + 
        allSickLeaves.length + 
        allAuditLogs.length + 
        allNotifications.length + 
        allSettings.length + 
        allSurveys.length + 
        allRequests.length;

      const hash = computeDataHash(dump);
      const newSnapshot: SnapshotItem = {
        id: `snap_${Date.now()}`,
        name: name || `لقطة تكتيكية مجمدة - ${new Date().toLocaleTimeString('ar-YE')}`,
        description: description || 'لقطة احتياطية يدوية لقاعدة البيانات بالكامل',
        createdAt: new Date().toISOString(),
        createdBy: req.dbUser?.name || 'مدير النظام',
        totalRecords,
        counts: {
          soldiers: allSoldiers.length,
          units: allUnits.length,
          attendance: allAttendance.length,
          sickLeaves: allSickLeaves.length,
          users: allUsers.length
        },
        hash,
        data: dump
      };

      snapshotsHistory.unshift(newSnapshot);
      if (snapshotsHistory.length > 25) {
        snapshotsHistory = snapshotsHistory.slice(0, 25);
      }

      persistSecondaryStorage();

      return res.json({
        success: true,
        message: 'تم حفظ اللقطة الاحتياطية في القاعدة الثانوية بنجاح',
        snapshot: {
          id: newSnapshot.id,
          name: newSnapshot.name,
          createdAt: newSnapshot.createdAt,
          totalRecords: newSnapshot.totalRecords,
          hash: newSnapshot.hash
        }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. List Snapshots
  app.get('/api/secondary-db/snapshots', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const list = snapshotsHistory.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        totalRecords: s.totalRecords,
        counts: s.counts,
        hash: s.hash
      }));

      return res.json({
        success: true,
        snapshots: list
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Delete Snapshot
  app.delete('/api/secondary-db/snapshots/:id', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      snapshotsHistory = snapshotsHistory.filter(s => s.id !== id);
      persistSecondaryStorage();
      return res.json({ success: true, message: 'تم حذف اللقطة بنجاح' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Download / Export Secondary DB Dump
  app.get('/api/secondary-db/export', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const exportPayload = {
        engine: 'Secondary Redundant Standby Database',
        exportDate: new Date().toISOString(),
        exportedBy: req.dbUser?.name || 'مدير النظام',
        checksum: secondaryDbState.lastSyncHash,
        data: secondaryDbState.data
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=secondary_military_backup_${Date.now()}.json`);
      return res.send(JSON.stringify(exportPayload, null, 2));
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. Inspect Full Secondary Database Content (Live Data Viewer API)
  app.get('/api/secondary-db/data', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const { table, search } = req.query;
      const data = secondaryDbState.data;

      const counts = {
        soldiers: data.soldiers?.length || 0,
        units: data.units?.length || 0,
        attendance: data.attendance?.length || 0,
        sickLeaves: data.sickLeaves?.length || 0,
        soldierRequests: data.soldierRequests?.length || 0,
        surveys: data.surveys?.length || 0,
        users: data.users?.length || 0,
        auditLogs: data.auditLogs?.length || 0,
        notifications: data.notifications?.length || 0,
        systemSettings: data.systemSettings?.length || 0,
      };

      const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

      let requestedTableData = null;
      if (table && typeof table === 'string' && (data as any)[table]) {
        let tableRows = (data as any)[table] || [];
        if (search && typeof search === 'string') {
          const s = search.toLowerCase();
          tableRows = tableRows.filter((row: any) => {
            return JSON.stringify(row).toLowerCase().includes(s);
          });
        }
        requestedTableData = tableRows;
      }

      return res.json({
        success: true,
        summary: {
          lastSyncTimestamp: secondaryDbState.lastSyncTimestamp,
          lastSyncHash: secondaryDbState.lastSyncHash,
          totalRecords,
          counts,
          autoMirrorEnabled: secondaryDbState.autoMirrorEnabled,
        },
        data: table ? requestedTableData : data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. Get Supabase Integration Config & Status
  app.get('/api/secondary-db/supabase/config', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const config = getSupabaseConfig();
      const testResult = await testSupabaseConnection();
      return res.json({
        success: true,
        config: {
          url: config.url,
          isConfigured: config.isConfigured,
          connectedAt: config.connectedAt,
          projectName: config.projectName || 'Military-Cloud-Secondary',
          hasAnonKey: !!config.anonKey,
          hasServiceRoleKey: !!config.serviceRoleKey,
        },
        connection: testResult,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 11. Save/Update Supabase Credentials
  app.post('/api/secondary-db/supabase/config', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { url, anonKey, serviceRoleKey, projectName } = req.body;
      const current = getSupabaseConfig();
      const finalUrl = url ? url.trim() : current.url;
      const finalAnonKey = anonKey !== undefined && anonKey.trim() !== '' ? anonKey.trim() : current.anonKey;
      const finalServiceRoleKey = serviceRoleKey !== undefined && serviceRoleKey.trim() !== '' ? serviceRoleKey.trim() : current.serviceRoleKey;

      if (!finalUrl) {
        return res.status(400).json({ 
          success: false, 
          error: 'يرجى إدخال عنوان رابط المشروع Supabase Project URL (مثال: https://xxxxxxxxxxxx.supabase.co).' 
        });
      }

      if (!finalAnonKey && !finalServiceRoleKey) {
        return res.status(400).json({ 
          success: false, 
          error: 'يرجى إدخال مفتاح API (anon public أو service_role) التابع لمشروع Supabase.' 
        });
      }

      const updated = saveSupabaseConfig({
        url: finalUrl,
        anonKey: finalAnonKey,
        serviceRoleKey: finalServiceRoleKey,
        projectName: projectName ? projectName.trim() : current.projectName,
      });

      const testResult = await testSupabaseConnection();

      return res.json({
        success: true,
        message: testResult.success ? 'تم حفظ إعدادات Supabase والاتصال بنجاح.' : 'تم حفظ الإعدادات ولكن الاتصال واجه تنبيهاً.',
        config: {
          url: updated.url,
          isConfigured: updated.isConfigured,
          projectName: updated.projectName,
          hasAnonKey: !!updated.anonKey,
          hasServiceRoleKey: !!updated.serviceRoleKey,
        },
        connection: testResult,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 12. Push All Data Directly to Supabase Cloud Instance (رفع مباشر إلى جداول Supabase)
  app.post('/api/secondary-db/supabase/push-all', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const client = getSupabaseClient();
      const config = getSupabaseConfig();

      if (!client || !config.isConfigured) {
        return res.status(400).json({
          success: false,
          error: 'لم يتم ربط حساب أو مشروع Supabase بعد. يرجى إدخال بيانات الربط أولاً.'
        });
      }

      const startTime = Date.now();

      // Collect data to push
      const allSoldiers = await db.select().from(soldiers);
      const allUnits = await db.select().from(units);
      const allAttendance = await db.select().from(attendance);
      const allSickLeaves = await db.select().from(sickLeaves);
      const allRequests = await db.select().from(soldierRequests);
      const allSurveys = await db.select().from(surveys);
      const allUsers = await db.select().from(users);
      const allLogs = await db.select().from(auditLogs);

      const results: Record<string, { count: number; status: string; error?: string }> = {};

      // Helper function to upsert in Supabase
      const pushTable = async (tableName: string, rows: any[]) => {
        if (!rows || rows.length === 0) {
          results[tableName] = { count: 0, status: 'empty' };
          return;
        }
        try {
          const { error } = await client.from(tableName).upsert(rows, { onConflict: 'id' });
          if (error) {
            results[tableName] = { count: rows.length, status: 'failed', error: error.message };
          } else {
            results[tableName] = { count: rows.length, status: 'synced' };
          }
        } catch (e: any) {
          results[tableName] = { count: rows.length, status: 'failed', error: e.message };
        }
      };

      // 1. Transform and push Units
      const transformedUnits = allUnits.map(u => ({
        id: u.id,
        name: u.name,
        code: u.code || null,
        parent_id: u.parentId || null,
        commander_name: u.commanderName || null,
        commander_rank: null,
        location: u.location || null,
        sort_order: 0
      }));
      await pushTable('units', transformedUnits);

      // 2. Transform and push Soldiers
      const transformedSoldiers = allSoldiers.map(s => ({
        id: s.id,
        military_number: s.militaryNumber || s.id,
        name: s.fullName || 'غير محدد',
        rank: s.rank || 'جندي',
        unit_id: s.unitId || null,
        sub_unit: s.battalion || s.company || s.platoon || null,
        role: s.specialization || null,
        status: s.militaryStatus || (s.isActive ? 'present' : 'absent'),
        blood_type: s.bloodType || null,
        phone_number: s.phoneNumber || null,
        national_id: s.nationalId || null,
        join_date: s.joinDate ? s.joinDate.split('T')[0] : null,
        birth_date: s.birthDate ? s.birthDate.split('T')[0] : null,
        province: s.address || null,
        notes: s.medicalHistory || null,
        avatar_url: s.photoUrl || null
      }));
      await pushTable('soldiers', transformedSoldiers);

      // 3. Transform and push Attendance
      const transformedAttendance = allAttendance.map(a => ({
        id: a.id,
        soldier_id: a.soldierId,
        date: a.date ? a.date.split('T')[0] : new Date().toISOString().split('T')[0],
        status: a.statusCode || 'present',
        period: 'morning',
        unit_id: null,
        notes: null,
        recorded_by: a.recordedBy || null
      }));
      await pushTable('attendance', transformedAttendance);

      // 4. Transform and push Sick Leaves
      const transformedSickLeaves = allSickLeaves.map(sl => ({
        id: sl.id,
        soldier_id: sl.soldierId,
        start_date: sl.startDate ? sl.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: sl.endDate ? sl.endDate.split('T')[0] : new Date().toISOString().split('T')[0],
        duration_days: Number(sl.duration) || 1,
        diagnosis: sl.illnessType || null,
        hospital_name: sl.hospital || null,
        doctor_name: sl.doctorName || null,
        report_number: null,
        report_file_url: null,
        status: sl.status === 'منتهي' ? 'completed' : 'approved',
        approved_by: null,
        notes: sl.notes || null
      }));
      await pushTable('sick_leaves', transformedSickLeaves);

      // 5. Transform and push Soldier Requests
      const transformedRequests = allRequests.map(r => ({
        id: r.id,
        soldier_id: r.soldierId,
        request_type: r.requestType || 'general',
        title: r.title || 'طلب',
        description: r.description || '',
        urgency: 'normal',
        status: r.status || 'pending',
        reviewer_notes: r.reviewNotes || r.rejectionReason || null,
        reviewed_by: r.reviewedBy || null,
        reviewed_at: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null
      }));
      await pushTable('soldier_requests', transformedRequests);

      // 6. Transform and push Surveys
      const transformedSurveys = allSurveys.map(sv => ({
        id: sv.id,
        title: sv.title || 'استبيان',
        description: sv.description || '',
        target_units: sv.targetScope ? [sv.targetScope] : [],
        questions: sv.fieldsNeeded ? (typeof sv.fieldsNeeded === 'string' ? JSON.parse(sv.fieldsNeeded) : sv.fieldsNeeded) : [],
        responses: [],
        is_active: sv.status === 'نشط',
        starts_at: sv.createdAt ? new Date(sv.createdAt).toISOString() : new Date().toISOString(),
        expires_at: sv.deadline ? new Date(sv.deadline).toISOString() : null,
        created_by: sv.createdBy || null
      }));
      await pushTable('surveys', transformedSurveys);

      // 7. Transform and push Users
      const transformedUsers = allUsers.map(u => ({
        id: u.id,
        username: u.username || u.email || u.id,
        password_hash: u.password || null,
        full_name: u.name || 'مستخدم',
        military_number: u.soldierId || null,
        rank: null,
        role: u.role || 'viewer',
        unit_id: u.unitId || null,
        permissions: [],
        is_active: true
      }));
      await pushTable('users', transformedUsers);

      // 8. Transform and push Audit Logs
      const transformedLogs = allLogs.map(l => ({
        id: l.id,
        action: l.actionType || 'تحديث',
        entity_type: l.tableName || 'system',
        entity_id: null,
        user_id: l.userId || null,
        user_name: l.userName || null,
        details: { details: l.details || '', role: l.userRole || '' },
        ip_address: null,
        user_agent: null,
        created_at: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
      }));
      await pushTable('audit_logs', transformedLogs);

      const durationMs = Date.now() - startTime;

      return res.json({
        success: true,
        message: 'تم إرسال ومزامنة السجلات مع قاعدة Supabase السحابية بنجاح.',
        durationMs,
        results,
        projectUrl: config.url,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 13. Incremental / Real-time Record Synchronization to Secondary DB & Supabase
  app.post('/api/secondary-db/sync-record', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { table, action, record, id } = req.body;
      if (!table || !action) {
        return res.status(400).json({ success: false, error: 'Table and action are required' });
      }

      // Map table name to camelCase key in secondaryDbState
      const tableKeyMap: Record<string, string> = {
        soldiers: 'soldiers',
        units: 'units',
        attendance: 'attendance',
        sickLeaves: 'sickLeaves',
        sick_leaves: 'sickLeaves',
        soldierRequests: 'soldierRequests',
        soldier_requests: 'soldierRequests',
        surveys: 'surveys',
        users: 'users',
        auditLogs: 'auditLogs',
        audit_logs: 'auditLogs',
        systemSettings: 'systemSettings',
        system_settings: 'systemSettings',
        notifications: 'notifications'
      };

      const key = tableKeyMap[table] || table;
      if (!secondaryDbState.data[key]) {
        secondaryDbState.data[key] = [];
      }

      const targetList = secondaryDbState.data[key];
      const recordId = id || record?.id || record?.soldierId;

      if (action === 'delete') {
        if (recordId) {
          secondaryDbState.data[key] = targetList.filter((item: any) => item.id !== recordId && item.soldierId !== recordId);
        }
      } else {
        // insert, update, or upsert
        if (record && recordId) {
          const existingIdx = targetList.findIndex((item: any) => item.id === recordId || (record.soldierId && item.soldierId === record.soldierId && item.date === record.date));
          if (existingIdx >= 0) {
            targetList[existingIdx] = { ...targetList[existingIdx], ...record, updatedAt: new Date().toISOString() };
          } else {
            targetList.push({ ...record, createdAt: record.createdAt || new Date().toISOString() });
          }
        }
      }

      secondaryDbState.lastSyncTimestamp = new Date().toISOString();
      persistSecondaryStorage();

      // Also async push to Supabase if connected
      const client = getSupabaseClient();
      let supabaseSynced = false;
      if (client) {
        // Map table name for Supabase snake_case
        const supabaseTableMap: Record<string, string> = {
          soldiers: 'soldiers',
          units: 'units',
          attendance: 'attendance',
          sickLeaves: 'sick_leaves',
          sick_leaves: 'sick_leaves',
          soldierRequests: 'soldier_requests',
          soldier_requests: 'soldier_requests',
          surveys: 'surveys',
          users: 'users',
          auditLogs: 'audit_logs',
          audit_logs: 'audit_logs',
        };
        const sbTable = supabaseTableMap[table] || table;
        try {
          if (action === 'delete' && recordId) {
            await client.from(sbTable).delete().eq('id', recordId);
          } else if (record) {
            let transformedRecord = record;
            if (sbTable === 'units') {
              transformedRecord = {
                id: record.id,
                name: record.name,
                code: record.code || null,
                parent_id: record.parentId || record.parent_id || null,
                commander_name: record.commanderName || record.commander_name || null,
                commander_rank: record.commanderRank || record.commander_rank || null,
                location: record.location || null,
                sort_order: record.sortOrder ?? record.sort_order ?? 0
              };
            } else if (sbTable === 'soldiers') {
              transformedRecord = {
                id: record.id,
                military_number: record.militaryNumber || record.military_number || record.id,
                name: record.fullName || record.name || 'غير محدد',
                rank: record.rank || 'جندي',
                unit_id: record.unitId || record.unit_id || null,
                sub_unit: record.battalion || record.company || record.platoon || record.sub_unit || null,
                role: record.specialization || record.role || null,
                status: record.militaryStatus || record.status || (record.isActive ? 'present' : 'absent'),
                blood_type: record.bloodType || record.blood_type || null,
                phone_number: record.phoneNumber || record.phone_number || null,
                national_id: record.nationalId || record.national_id || null,
                join_date: record.joinDate ? record.joinDate.split('T')[0] : record.join_date || null,
                birth_date: record.birthDate ? record.birthDate.split('T')[0] : record.birth_date || null,
                province: record.address || record.province || null,
                notes: record.medicalHistory || record.notes || null,
                avatar_url: record.photoUrl || record.avatar_url || null
              };
            } else if (sbTable === 'attendance') {
              transformedRecord = {
                id: record.id,
                soldier_id: record.soldierId || record.soldier_id,
                date: record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0],
                status: record.statusCode || record.status || 'present',
                period: record.period || 'morning',
                unit_id: record.unitId || record.unit_id || null,
                notes: record.notes || null,
                recorded_by: record.recordedBy || record.recorded_by || null
              };
            } else if (sbTable === 'sick_leaves') {
              transformedRecord = {
                id: record.id,
                soldier_id: record.soldierId || record.soldier_id,
                start_date: record.startDate ? record.startDate.split('T')[0] : record.start_date || new Date().toISOString().split('T')[0],
                end_date: record.endDate ? record.endDate.split('T')[0] : record.end_date || new Date().toISOString().split('T')[0],
                duration_days: Number(record.duration || record.duration_days) || 1,
                diagnosis: record.illnessType || record.diagnosis || null,
                hospital_name: record.hospital || record.hospital_name || null,
                doctor_name: record.doctorName || record.doctor_name || null,
                report_number: record.reportNumber || record.report_number || null,
                report_file_url: record.reportFileUrl || record.report_file_url || null,
                status: record.status || 'approved',
                approved_by: record.approvedBy || record.approved_by || null,
                notes: record.notes || null
              };
            } else if (sbTable === 'soldier_requests') {
              transformedRecord = {
                id: record.id,
                soldier_id: record.soldierId || record.soldier_id,
                request_type: record.requestType || record.request_type || 'general',
                title: record.title || 'طلب',
                description: record.description || '',
                urgency: record.urgency || 'normal',
                status: record.status || 'pending',
                reviewer_notes: record.reviewerNotes || record.reviewNotes || record.reviewer_notes || null,
                reviewed_by: record.reviewedBy || record.reviewed_by || null,
                reviewed_at: record.reviewedAt ? new Date(record.reviewedAt).toISOString() : record.reviewed_at || null
              };
            } else if (sbTable === 'users') {
              transformedRecord = {
                id: record.id,
                username: record.username || record.email || record.id,
                password_hash: record.password || record.password_hash || null,
                full_name: record.name || record.full_name || 'مستخدم',
                military_number: record.soldierId || record.military_number || null,
                rank: record.rank || null,
                role: record.role || 'viewer',
                unit_id: record.unitId || record.unit_id || null,
                permissions: record.permissions || [],
                is_active: record.is_active ?? true
              };
            } else if (sbTable === 'audit_logs') {
              transformedRecord = {
                id: record.id,
                action: record.actionType || record.action || 'تحديث',
                entity_type: record.tableName || record.entity_type || 'system',
                entity_id: record.entity_id || null,
                user_id: record.userId || record.user_id || null,
                user_name: record.userName || record.user_name || null,
                details: record.details || { details: record.details || '', role: record.userRole || '' },
                ip_address: record.ip_address || null,
                user_agent: record.user_agent || null,
                created_at: record.timestamp ? new Date(record.timestamp).toISOString() : record.created_at || new Date().toISOString()
              };
            }

            await client.from(sbTable).upsert(transformedRecord, { onConflict: 'id' });
          }
          supabaseSynced = true;
        } catch (sbErr) {
          console.warn('Async Supabase push error (non-fatal):', sbErr);
        }
      }

      return res.json({
        success: true,
        message: 'تم تحديث السجل في قاعدة البيانات الاحتياطية',
        table: key,
        action,
        supabaseSynced,
      });
    } catch (error: any) {
      console.warn('Sync record error (non-fatal):', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

}
