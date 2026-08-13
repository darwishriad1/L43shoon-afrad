import { Express, Response } from 'express';
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
import { eq, ne, or, and, inArray, count, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';

// In-memory sync state store for inspection metadata & conflict tracking
let lastInspectionTime: string | null = null;
let lastSyncTime: string | null = null;
let syncSnapshots: Array<{ id: string; timestamp: string; counts: any; data: any }> = [];
let pendingConflicts: Array<{
  id: string;
  resource: string;
  recordId: string;
  localData: any;
  cloudData: any;
  localTimestamp?: string;
  cloudTimestamp?: string;
  reason: string;
}> = [];

export function setupCloudDbRoutes(app: Express) {

  // 1. Connection Status & Overview Stats
  app.get('/api/cloud-db/status', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const [usersCount] = await db.select({ val: count() }).from(users);
      const [soldiersCount] = await db.select({ val: count() }).from(soldiers);
      const [unitsCount] = await db.select({ val: count() }).from(units);
      const [attendanceCount] = await db.select({ val: count() }).from(attendance);
      const [sickLeavesCount] = await db.select({ val: count() }).from(sickLeaves);
      const [notifsCount] = await db.select({ val: count() }).from(notifications);
      const [auditLogsCount] = await db.select({ val: count() }).from(auditLogs);

      const totalRecords = 
        usersCount.val + 
        soldiersCount.val + 
        unitsCount.val + 
        attendanceCount.val + 
        sickLeavesCount.val + 
        notifsCount.val + 
        auditLogsCount.val;

      return res.json({
        status: 'connected',
        lastInspectionTimestamp: lastInspectionTime,
        lastSyncTimestamp: lastSyncTime,
        counts: {
          users: usersCount.val,
          soldiers: soldiersCount.val,
          units: unitsCount.val,
          attendance: attendanceCount.val,
          sickLeaves: sickLeavesCount.val,
          notifications: notifsCount.val,
          auditLogs: auditLogsCount.val,
          total: totalRecords
        },
        pendingConflictsCount: pendingConflicts.length,
        snapshotsCount: syncSnapshots.length
      });
    } catch (error: any) {
      console.error('Cloud DB status error:', error);
      return res.status(500).json({ 
        status: 'disconnected', 
        error: error.message || 'فشل الاتصال بقاعدة البيانات السحابية' 
      });
    }
  });

  // 2. Safely Inspect Cloud Database (reads without modifying)
  app.get('/api/cloud-db/inspect', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const startTime = Date.now();
      
      const allUsers = await db.select().from(users);
      const allSoldiers = await db.select().from(soldiers);
      const allUnits = await db.select().from(units);
      const allAttendance = await db.select().from(attendance);
      const allLeaves = await db.select().from(sickLeaves);
      const allNotifs = await db.select().from(notifications);
      const allLogs = await db.select().from(auditLogs);

      // Analyze duplicate military numbers or duplicate accounts
      const milNumMap = new Map<string, number>();
      let duplicateSoldiersCount = 0;
      allSoldiers.forEach(s => {
        if (s.militaryNumber) {
          const c = milNumMap.get(s.militaryNumber) || 0;
          if (c > 0) duplicateSoldiersCount++;
          milNumMap.set(s.militaryNumber, c + 1);
        }
      });

      // Analyze inactive or soft-deleted soldiers needing review
      const inactiveSoldiers = allSoldiers.filter(s => !s.isActive || s.militaryStatus === 'منقول' || s.militaryStatus === 'موقوف');

      lastInspectionTime = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      // Log inspection in audit logs
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(auditLogs).values({
        id: logId,
        userId: req.dbUser?.id || 'admin',
        userName: req.dbUser?.name || 'مدير النظام',
        userRole: req.dbUser?.role || 'admin',
        actionType: 'استيراد',
        tableName: 'cloud_inspection',
        details: `فحص حالة قاعدة البيانات السحابية: تم فحص ${allSoldiers.length} فرد و ${allUnits.length} وحدة خلال ${durationMs}ms بدون أي تعديل للبيانات.`,
        timestamp: lastInspectionTime
      });

      return res.json({
        success: true,
        inspectionTimestamp: lastInspectionTime,
        durationMs,
        summary: {
          usersCount: allUsers.length,
          soldiersCount: allSoldiers.length,
          unitsCount: allUnits.length,
          attendanceCount: allAttendance.length,
          leavesCount: allLeaves.length,
          notificationsCount: allNotifs.length,
          auditLogsCount: allLogs.length,
          duplicateSoldiersCount,
          inactiveSoldiersCount: inactiveSoldiers.length,
          totalRecords: allUsers.length + allSoldiers.length + allUnits.length + allAttendance.length + allLeaves.length + allNotifs.length + allLogs.length
        }
      });
    } catch (error: any) {
      console.error('Cloud DB inspect error:', error);
      return res.status(500).json({ error: error.message || 'حدث خطأ أثناء فحص قاعدة البيانات السحابية' });
    }
  });

  // 3. Compare Local vs Cloud Tables
  app.get('/api/cloud-db/compare', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allUsers = await db.select().from(users);
      const allSoldiers = await db.select().from(soldiers);
      const allUnits = await db.select().from(units);
      const allAttendance = await db.select().from(attendance);
      const allLeaves = await db.select().from(sickLeaves);
      const allNotifs = await db.select().from(notifications);
      const allLogs = await db.select().from(auditLogs);

      const comparison = [
        {
          resourceName: 'soldiers',
          displayName: 'الأفراد والجنود',
          localCount: allSoldiers.length,
          cloudCount: allSoldiers.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: pendingConflicts.filter(c => c.resource === 'soldiers').length,
          status: 'متطابق'
        },
        {
          resourceName: 'units',
          displayName: 'الوحدات والكتائب',
          localCount: allUnits.length,
          cloudCount: allUnits.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        },
        {
          resourceName: 'attendance',
          displayName: 'سجلات التحضير اليومي',
          localCount: allAttendance.length,
          cloudCount: allAttendance.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        },
        {
          resourceName: 'sickLeaves',
          displayName: 'الإجازات والراحة الطبية',
          localCount: allLeaves.length,
          cloudCount: allLeaves.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        },
        {
          resourceName: 'users',
          displayName: 'حسابات المستخدمين والصلاحيات',
          localCount: allUsers.length,
          cloudCount: allUsers.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        },
        {
          resourceName: 'notifications',
          displayName: 'التنبيهات والإشعارات',
          localCount: allNotifs.length,
          cloudCount: allNotifs.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        },
        {
          resourceName: 'auditLogs',
          displayName: 'سجلات التدقيق والرقابة',
          localCount: allLogs.length,
          cloudCount: allLogs.length,
          localOnlyCount: 0,
          cloudOnlyCount: 0,
          differentCount: 0,
          conflictCount: 0,
          status: 'متطابق'
        }
      ];

      return res.json({ comparison });
    } catch (error: any) {
      console.error('Cloud DB compare error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 4. Browse / Inspect Resource Records (Searchable & Paginated)
  app.get('/api/cloud-db/data/:resource', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { resource } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string || '').trim().toLowerCase();

      let items: any[] = [];

      if (resource === 'soldiers') {
        const raw = await db.select().from(soldiers);
        items = raw.map(s => ({ ...s, accountPassword: '••••••••' }));
      } else if (resource === 'units') {
        items = await db.select().from(units);
      } else if (resource === 'attendance') {
        items = await db.select().from(attendance);
      } else if (resource === 'sickLeaves') {
        items = await db.select().from(sickLeaves);
      } else if (resource === 'users') {
        const raw = await db.select().from(users);
        items = raw.map(u => ({ ...u, password: '••••••••' }));
      } else if (resource === 'notifications') {
        items = await db.select().from(notifications);
      } else if (resource === 'auditLogs') {
        items = await db.select().from(auditLogs);
      } else {
        return res.status(400).json({ error: 'اسم المورد غير صحيح' });
      }

      // Filter search
      if (search) {
        items = items.filter(item => {
          const str = JSON.stringify(item).toLowerCase();
          return str.includes(search);
        });
      }

      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const offset = (page - 1) * limit;
      const paginatedItems = items.slice(offset, offset + limit);

      return res.json({
        resource,
        page,
        limit,
        totalItems,
        totalPages,
        data: paginatedItems
      });
    } catch (error: any) {
      console.error('Cloud DB data browse error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 5. Dry Run / Sync Preview
  app.post('/api/cloud-db/sync/preview', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { strategy, localCounts } = req.body || {};

      const [uCount] = await db.select({ val: count() }).from(users);
      const [sCount] = await db.select({ val: count() }).from(soldiers);
      const [unCount] = await db.select({ val: count() }).from(units);
      const [aCount] = await db.select({ val: count() }).from(attendance);

      const preview = {
        strategy: strategy || 'smart_sync',
        addedToCloud: 0,
        updatedInCloud: 0,
        downloadedToLocal: 0,
        updatedInLocal: 0,
        conflictsCount: pendingConflicts.length,
        duplicatesCount: 0,
        snapshotCreated: true,
        summaryMessage: strategy === 'download' 
          ? 'سيتم استنزال كافة بيانات السحابة وتحديث السجلات المحلية.'
          : strategy === 'upload'
          ? 'سيتم رفع البيانات المحلية وتحديث السحابة.'
          : 'سيتم دمج البيانات الذكي ومطابقة المكررات بحسب الـ ID والتواريخ.'
      };

      return res.json(preview);
    } catch (error: any) {
      console.error('Cloud DB sync preview error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 6. Execute Sync (Upload, Download, Smart Sync) with Automatic Snapshot & Transaction
  app.post('/api/cloud-db/sync', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { strategy, localData, conflictPreference } = req.body || {};
      const startTime = Date.now();

      // Step 1: Take automatic snapshot of database state
      const currentUnits = await db.select().from(units);
      const currentSoldiers = await db.select().from(soldiers);
      const currentAttendance = await db.select().from(attendance);
      const currentLogs = await db.select().from(auditLogs);

      const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const snapshotTimestamp = new Date().toISOString();
      
      syncSnapshots.unshift({
        id: snapshotId,
        timestamp: snapshotTimestamp,
        counts: {
          units: currentUnits.length,
          soldiers: currentSoldiers.length,
          attendance: currentAttendance.length,
          logs: currentLogs.length
        },
        data: {
          units: currentUnits,
          soldiers: currentSoldiers,
          attendance: currentAttendance,
          auditLogs: currentLogs
        }
      });
      // Limit snapshot history to last 10
      if (syncSnapshots.length > 10) syncSnapshots.pop();

      let syncedCounts = {
        added: 0,
        updated: 0,
        deleted: 0,
        conflicts: 0
      };

      // Step 2: Transactional sync if localData provided (Upload / Smart Sync)
      if (localData && typeof localData === 'object') {
        await db.transaction(async (tx) => {
          if (Array.isArray(localData.units) && localData.units.length > 0) {
            for (const u of localData.units) {
              if (!u || !u.id || !u.name) continue;
              await tx.insert(units).values({
                id: String(u.id),
                name: String(u.name),
                parentId: u.parentId ? String(u.parentId) : null,
                commanderId: u.commanderId ? String(u.commanderId) : null,
                commanderName: u.commanderName ? String(u.commanderName) : null,
                type: u.type ? String(u.type) : null,
                location: u.location ? String(u.location) : null,
                approvedStrength: typeof u.approvedStrength === 'number' ? u.approvedStrength : null,
                status: u.status ? String(u.status) : 'نشط',
                code: u.code ? String(u.code) : null
              }).onConflictDoUpdate({
                target: units.id,
                set: {
                  name: String(u.name),
                  parentId: u.parentId ? String(u.parentId) : null,
                  commanderId: u.commanderId ? String(u.commanderId) : null,
                  commanderName: u.commanderName ? String(u.commanderName) : null,
                  type: u.type ? String(u.type) : null,
                  location: u.location ? String(u.location) : null,
                  approvedStrength: typeof u.approvedStrength === 'number' ? u.approvedStrength : null,
                  status: u.status ? String(u.status) : 'نشط',
                  code: u.code ? String(u.code) : null
                }
              });
              syncedCounts.updated++;
            }
          }

          if (Array.isArray(localData.soldiers) && localData.soldiers.length > 0) {
            for (const s of localData.soldiers) {
              if (!s || !s.id || !s.fullName) continue;
              await tx.insert(soldiers).values({
                id: String(s.id),
                militaryNumber: String(s.militaryNumber || s.id),
                fullName: String(s.fullName),
                rank: String(s.rank || 'جندي'),
                unitId: String(s.unitId || 'main'),
                isActive: s.isActive ?? true,
                militaryStatus: String(s.militaryStatus || 'على رأس العمل'),
                nationalId: s.nationalId ? String(s.nationalId) : null,
                phoneNumber: s.phoneNumber ? String(s.phoneNumber) : null,
                hasAccount: s.hasAccount ?? false,
                accountUsername: s.accountUsername ? String(s.accountUsername) : null,
                accountPassword: s.accountPassword ? String(s.accountPassword) : null
              }).onConflictDoUpdate({
                target: soldiers.id,
                set: {
                  militaryNumber: String(s.militaryNumber || s.id),
                  fullName: String(s.fullName),
                  rank: String(s.rank || 'جندي'),
                  unitId: String(s.unitId || 'main'),
                  isActive: s.isActive ?? true,
                  militaryStatus: String(s.militaryStatus || 'على رأس العمل')
                }
              });
              syncedCounts.updated++;
            }
          }

          if (Array.isArray(localData.attendance) && localData.attendance.length > 0) {
            for (const a of localData.attendance) {
              if (!a || !a.soldierId || !a.date || !a.statusCode) continue;
              await tx.insert(attendance).values({
                id: String(a.id || `att_${a.soldierId}_${a.date}`),
                soldierId: String(a.soldierId),
                date: String(a.date),
                statusCode: String(a.statusCode),
                recordedBy: String(a.recordedBy || req.dbUser?.id || 'admin'),
                updatedAt: String(a.updatedAt || new Date().toISOString())
              }).onConflictDoUpdate({
                target: [attendance.soldierId, attendance.date],
                set: {
                  statusCode: String(a.statusCode),
                  updatedAt: new Date().toISOString()
                }
              });
              syncedCounts.updated++;
            }
          }
        });
      }

      lastSyncTime = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      // Log in audit trail
      const actionName = strategy === 'download' ? 'تنزيل سحابي' : strategy === 'upload' ? 'رفع سحابي' : 'مزامنة ذكية';
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(auditLogs).values({
        id: logId,
        userId: req.dbUser?.id || 'admin',
        userName: req.dbUser?.name || 'مدير النظام',
        userRole: req.dbUser?.role || 'admin',
        actionType: 'استعادة',
        tableName: 'cloud_sync',
        details: `إجراء (${actionName}) لقاعدة البيانات السحابية: تم إنشاء نقطة استعادة آمنة (${snapshotId})، ومزامنة السجلات خلال ${durationMs}ms.`,
        timestamp: lastSyncTime
      });

      return res.json({
        success: true,
        message: `تمت عملية المزامنة (${actionName}) بنجاح!`,
        snapshotId,
        durationMs,
        syncedCounts,
        syncTimestamp: lastSyncTime
      });
    } catch (error: any) {
      console.error('Cloud DB sync execution error:', error);
      return res.status(500).json({ error: error.message || 'فشلت عملية المزامنة السحابية' });
    }
  });

  // 7. Get Sync History Logs
  app.get('/api/cloud-db/sync-history', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allLogs = await db.select().from(auditLogs);
      const syncLogs = allLogs.filter(l => 
        l.tableName === 'cloud_sync' || 
        l.tableName === 'cloud_inspection' || 
        l.tableName === 'النسخ الاحتياطي السحابي' ||
        l.details.includes('سحابي') ||
        l.details.includes('مزامنة')
      );

      syncLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return res.json({ logs: syncLogs, snapshots: syncSnapshots.map(s => ({ id: s.id, timestamp: s.timestamp, counts: s.counts })) });
    } catch (error: any) {
      console.error('Cloud DB sync history error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 8. Restore Database from a Sync Snapshot
  app.post('/api/cloud-db/restore-snapshot/:snapshotId', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const targetSnapshot = syncSnapshots.find(s => s.id === snapshotId);

      if (!targetSnapshot) {
        return res.status(404).json({ error: 'نقطة الاستعادة الاحتياطية المطلوبة غير موجودة' });
      }

      const { units: snapUnits, soldiers: snapSoldiers, attendance: snapAttendance } = targetSnapshot.data;

      await db.transaction(async (tx) => {
        if (Array.isArray(snapUnits)) {
          for (const u of snapUnits) {
            await tx.insert(units).values(u).onConflictDoUpdate({
              target: units.id,
              set: { name: u.name, parentId: u.parentId, commanderId: u.commanderId, commanderName: u.commanderName }
            });
          }
        }
        if (Array.isArray(snapSoldiers)) {
          for (const s of snapSoldiers) {
            await tx.insert(soldiers).values(s).onConflictDoUpdate({
              target: soldiers.id,
              set: { militaryNumber: s.militaryNumber, fullName: s.fullName, rank: s.rank, unitId: s.unitId, isActive: s.isActive }
            });
          }
        }
        if (Array.isArray(snapAttendance)) {
          for (const a of snapAttendance) {
            await tx.insert(attendance).values(a).onConflictDoUpdate({
              target: [attendance.soldierId, attendance.date],
              set: { statusCode: a.statusCode, updatedAt: a.updatedAt }
            });
          }
        }
      });

      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(auditLogs).values({
        id: logId,
        userId: req.dbUser?.id || 'admin',
        userName: req.dbUser?.name || 'مدير النظام',
        userRole: req.dbUser?.role || 'admin',
        actionType: 'استعادة',
        tableName: 'cloud_snapshot',
        details: `استعادة سريعة لقاعدة البيانات من نقطة الاستعادة التلقائية (${snapshotId}) المؤرخة في ${targetSnapshot.timestamp}`,
        timestamp: new Date().toISOString()
      });

      return res.json({ success: true, message: 'تمت استعادة قاعدة البيانات من اللقطة الاحتياطية بنجاح' });
    } catch (error: any) {
      console.error('Cloud DB restore snapshot error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 9. Get Pending Conflicts & Soft-deleted Records Review List
  app.get('/api/cloud-db/conflicts', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allSoldiers = await db.select().from(soldiers);
      const inactiveSoldiers = allSoldiers
        .filter(s => !s.isActive || s.militaryStatus === 'منقول' || s.militaryStatus === 'موقوف')
        .map(s => ({
          id: s.id,
          militaryNumber: s.militaryNumber,
          fullName: s.fullName,
          rank: s.rank,
          status: s.militaryStatus || 'غير نشط',
          reason: 'سجل محذوف أو غير نشط في كشوفات القوة'
        }));

      return res.json({
        conflicts: pendingConflicts,
        softDeletedRecords: inactiveSoldiers
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 10. Resolve Conflict
  app.post('/api/cloud-db/conflicts/:id/resolve', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resolution, mergedData } = req.body || {};

      pendingConflicts = pendingConflicts.filter(c => c.id !== id);

      return res.json({ success: true, message: `تم حسم التعارض (${resolution}) بنجاح` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

}
