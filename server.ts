import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { 
  users, 
  units, 
  soldiers, 
  sickLeaves,
  attendance, 
  auditLogs, 
  notifications, 
  systemSettings 
} from "./src/db/schema.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { eq, and, inArray, or, ilike, sql } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure database schema migrations/columns exist
  try {
    await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS print_settings text;`);
  } catch (err) {
    console.warn("Auto-migration notice:", err);
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- API ROUTES ---

  // 1. Authenticate / get or create current user
  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const firebaseUid = req.user?.uid;
      const email = req.user?.email || "";
      const name = req.user?.name || email.split("@")[0] || "مستخدم جديد";

      if (!firebaseUid) {
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Look up user by UID or by ID
      let existingUser = await db.select().from(users).where(eq(users.uid, firebaseUid)).limit(1);
      if (existingUser.length === 0) {
        existingUser = await db.select().from(users).where(eq(users.id, firebaseUid)).limit(1);
      }

      if (existingUser.length > 0) {
        return res.json(existingUser[0]);
      }

      // If user does not exist in the system, register them with 'admin' role to allow full system testing
      const newUser = {
        id: `u_${Date.now()}`,
        uid: firebaseUid,
        name: name,
        email: email,
        username: null,
        password: null,
        role: "admin",
        unitId: null,
      };

      await db.insert(users).values(newUser);
      return res.json(newUser);
    } catch (error: any) {
      console.error("Error in /api/users/me:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Local Login Endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
      }

      const userList = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (userList.length === 0) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const user = userList[0];
      if (user.password !== password) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const token = `local_${user.id}`;
      return res.json({ token, user });
    } catch (error: any) {
      console.error("Error in /api/auth/login:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 2. Users CRUD
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      return res.json(allUsers);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { id, name, email, username, password, role, unitId } = req.body;
      const newUser = {
        id,
        uid: id, // Set uid equal to id so they can be looked up in users/me
        name,
        email: email || `${username}@military.local`,
        username: username || null,
        password: password || null,
        role,
        unitId: unitId || null
      };
      await db.insert(users).values(newUser);
      return res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, username, password, role, unitId } = req.body;
      await db.update(users)
        .set({ 
          name, 
          email: email || `${username}@military.local`, 
          username: username || null, 
          password: password || null, 
          role, 
          unitId: unitId || null 
        })
        .where(eq(users.id, id));
      return res.json({ id, name, email, username, password, role, unitId });
    } catch (error: any) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/delete", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user via POST:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 3. Units CRUD
  app.get("/api/units", async (req, res) => {
    try {
      const allUnits = await db.select().from(units);
      return res.json(allUnits);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const { id, name, parentId, commanderId, commanderName, type, location, approvedStrength, status, code } = req.body;
      const newUnit = { 
        id, 
        name, 
        parentId: parentId || null, 
        commanderId: commanderId || null, 
        commanderName: commanderName || null,
        type: type || null,
        location: location || null,
        approvedStrength: approvedStrength ? parseInt(approvedStrength) : null,
        status: status || 'نشط',
        code: code || null
      };
      await db.insert(units).values(newUnit);
      return res.status(201).json(newUnit);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, parentId, commanderId, commanderName, type, location, approvedStrength, status, code } = req.body;
      await db.update(units)
        .set({ 
          name, 
          parentId: parentId || null, 
          commanderId: commanderId || null, 
          commanderName: commanderName || null,
          type: type || null,
          location: location || null,
          approvedStrength: approvedStrength ? parseInt(approvedStrength) : null,
          status: status || 'نشط',
          code: code || null
        })
        .where(eq(units.id, id));
      return res.json({ id, name, parentId, commanderId, commanderName, type, location, approvedStrength, status, code });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(units).where(eq(units.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/units/:id/delete", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(units).where(eq(units.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 4. Soldiers CRUD
  app.get("/api/soldiers/search", async (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      const rank = req.query.rank as string | undefined;
      const unitId = req.query.unitId as string | undefined;
      const isActiveStr = req.query.isActive as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const conditions = [];

      if (q && q.trim() !== "") {
        const pattern = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(soldiers.fullName, pattern),
            ilike(soldiers.militaryNumber, pattern)
          )
        );
      }

      if (rank && rank !== "all") {
        conditions.push(eq(soldiers.rank, rank));
      }

      if (unitId && unitId !== "all") {
        conditions.push(eq(soldiers.unitId, unitId));
      }

      if (isActiveStr && isActiveStr !== "all") {
        conditions.push(eq(soldiers.isActive, isActiveStr === "true"));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(soldiers)
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({
          count: sql<number>`count(*)`
        })
        .from(soldiers)
        .where(whereClause);

      const totalCount = countResult[0]?.count || 0;

      return res.json({
        results,
        totalCount
      });
    } catch (error: any) {
      console.error("Error in /api/soldiers/search:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/soldiers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.select().from(soldiers).where(eq(soldiers.id, id)).limit(1);
      if (result.length === 0) {
        return res.status(404).json({ error: "العسكري غير موجود" });
      }
      return res.json(result[0]);
    } catch (error: any) {
      console.error("Error in GET /api/soldiers/:id:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/soldiers", async (req, res) => {
    try {
      const allSoldiers = await db.select().from(soldiers);
      return res.json(allSoldiers);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/soldiers", async (req, res) => {
    try {
      const { id, militaryNumber, fullName, rank, unitId, isActive, photoUrl } = req.body;
      const newSoldier = { id, militaryNumber, fullName, rank, unitId, isActive, photoUrl: photoUrl || null };
      await db.insert(soldiers).values(newSoldier);
      return res.status(201).json(newSoldier);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/soldiers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        militaryNumber, 
        fullName, 
        rank, 
        unitId, 
        isActive,
        nationalId,
        birthDate,
        bloodType,
        phoneNumber,
        address,
        emergencyContact,
        qualification,
        specialization,
        joinDate,
        battalion,
        company,
        platoon,
        militaryStatus,
        medicalHistory,
        promotionHistory,
        assignmentsHistory,
        attachments,
        photoUrl
      } = req.body;

      await db.update(soldiers)
        .set({ 
          militaryNumber, 
          fullName, 
          rank, 
          unitId, 
          isActive,
          nationalId: nationalId !== undefined ? nationalId : null,
          birthDate: birthDate !== undefined ? birthDate : null,
          bloodType: bloodType !== undefined ? bloodType : null,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : null,
          address: address !== undefined ? address : null,
          emergencyContact: emergencyContact !== undefined ? emergencyContact : null,
          qualification: qualification !== undefined ? qualification : null,
          specialization: specialization !== undefined ? specialization : null,
          joinDate: joinDate !== undefined ? joinDate : null,
          battalion: battalion !== undefined ? battalion : null,
          company: company !== undefined ? company : null,
          platoon: platoon !== undefined ? platoon : null,
          militaryStatus: militaryStatus || 'على رأس العمل',
          medicalHistory: medicalHistory !== undefined ? medicalHistory : null,
          promotionHistory: promotionHistory !== undefined ? promotionHistory : null,
          assignmentsHistory: assignmentsHistory !== undefined ? assignmentsHistory : null,
          attachments: attachments !== undefined ? attachments : null,
          photoUrl: photoUrl !== undefined ? photoUrl : null
        })
        .where(eq(soldiers.id, id));

      return res.json({ 
        id, 
        militaryNumber, 
        fullName, 
        rank, 
        unitId, 
        isActive,
        nationalId,
        birthDate,
        bloodType,
        phoneNumber,
        address,
        emergencyContact,
        qualification,
        specialization,
        joinDate,
        battalion,
        company,
        platoon,
        militaryStatus: militaryStatus || 'على رأس العمل',
        medicalHistory,
        promotionHistory,
        assignmentsHistory,
        attachments,
        photoUrl
      });
    } catch (error: any) {
      console.error("Error in PUT /api/soldiers/:id:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get sick leaves / general leaves for a soldier
  app.get("/api/soldiers/:id/sick-leaves", async (req, res) => {
    try {
      const { id } = req.params;
      const leaves = await db
        .select()
        .from(sickLeaves)
        .where(eq(sickLeaves.soldierId, id));

      // Parse metadata stored in notes if JSON
      const enriched = leaves.map(l => {
        let meta: any = {};
        if (l.notes && l.notes.trim().startsWith('{')) {
          try {
            meta = JSON.parse(l.notes);
          } catch (e) {
            meta = {};
          }
        }
        return {
          ...l,
          leaveType: meta.leaveType || l.illnessType || 'استحقاق',
          grantingAuthority: meta.grantingAuthority || l.doctorName || 'الكتيبة',
          orderNumber: meta.orderNumber || l.notes || '',
          orderDate: meta.orderDate || l.startDate,
          reason: meta.reason || '',
          attachmentUrl: meta.attachmentUrl || null,
          notes: meta.rawNotes !== undefined ? meta.rawNotes : l.notes
        };
      });

      return res.json(enriched);
    } catch (error: any) {
      console.error("Error in GET /api/soldiers/:id/sick-leaves:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Add leave for a soldier
  app.post("/api/soldiers/:id/sick-leaves", async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        startDate, endDate, illnessType, leaveType, duration, 
        doctorName, grantingAuthority, orderNumber, orderDate, 
        reason, attachmentUrl, status, hospital, notes, 
        performedBy, performedByName, performedByRole 
      } = req.body;

      const finalLeaveType = leaveType || illnessType || "استحقاق";
      const finalAuthority = grantingAuthority || doctorName || "الكتيبة";
      const notesMeta = JSON.stringify({
        leaveType: finalLeaveType,
        grantingAuthority: finalAuthority,
        orderNumber: orderNumber || '',
        orderDate: orderDate || startDate,
        reason: reason || '',
        attachmentUrl: attachmentUrl || null,
        rawNotes: notes || ''
      });

      const newLeave = {
        id: "sl_" + Math.random().toString(36).substring(2, 11),
        soldierId: id,
        startDate,
        endDate,
        illnessType: finalLeaveType,
        duration: parseInt(duration) || 1,
        doctorName: finalAuthority,
        status: status || "نشط",
        hospital: hospital || finalAuthority,
        notes: notesMeta,
      };
      await db.insert(sickLeaves).values(newLeave);

      // Create an audit log of this action
      const logId = "log_" + Math.random().toString(36).substring(2, 11);
      await db.insert(auditLogs).values({
        id: logId,
        userId: performedBy || "u1",
        userName: performedByName || "مدير النظام",
        userRole: performedByRole || "admin",
        actionType: "تعديل",
        tableName: "soldiers",
        details: `إصدار إجازة (${finalLeaveType}) للعسكري: ${startDate} إلى ${endDate} - الأمر: ${orderNumber || 'بدون'}`,
        timestamp: new Date().toISOString(),
      });

      return res.status(201).json({
        ...newLeave,
        leaveType: finalLeaveType,
        grantingAuthority: finalAuthority,
        orderNumber: orderNumber || '',
        orderDate: orderDate || startDate,
        reason: reason || '',
        attachmentUrl: attachmentUrl || null,
        notes: notes || ''
      });
    } catch (error: any) {
      console.error("Error in POST /api/soldiers/:id/sick-leaves:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get attendance history for a soldier
  app.get("/api/soldiers/:id/attendance-history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await db
        .select()
        .from(attendance)
        .where(eq(attendance.soldierId, id));
      return res.json(history);
    } catch (error: any) {
      console.error("Error in GET /api/soldiers/:id/attendance-history:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get procedural audit logs for a soldier
  app.get("/api/soldiers/:id/audit-logs", async (req, res) => {
    try {
      const { id } = req.params;
      const soldierResult = await db.select().from(soldiers).where(eq(soldiers.id, id)).limit(1);
      if (soldierResult.length === 0) {
        return res.status(404).json({ error: "العسكري غير موجود" });
      }
      const soldier = soldierResult[0];

      // Retrieve all logs, then filter for those mentioning this soldier's ID, name, or military number
      const allLogs = await db.select().from(auditLogs);
      const filteredLogs = allLogs.filter(log => {
        const details = log.details || "";
        return details.includes(soldier.id) || 
               details.includes(soldier.fullName) || 
               details.includes(soldier.militaryNumber);
      });

      // Sort logs by timestamp desc
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return res.json(filteredLogs);
    } catch (error: any) {
      console.error("Error in GET /api/soldiers/:id/audit-logs:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/soldiers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(soldiers).where(eq(soldiers.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/soldiers/:id/delete", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(soldiers).where(eq(soldiers.id, id));
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 5. Attendance CRUD
  app.get("/api/attendance", async (req, res) => {
    try {
      const allAttendance = await db.select().from(attendance);
      return res.json(allAttendance);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const { id, soldierId, date, statusCode, recordedBy, updatedAt } = req.body;
      const record = { id, soldierId, date, statusCode, recordedBy, updatedAt };
      
      // Upsert
      await db.insert(attendance)
        .values(record)
        .onConflictDoUpdate({
          target: attendance.id,
          set: { statusCode, recordedBy, updatedAt }
        });
      
      return res.json(record);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { records } = req.body; // array of records
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Invalid records parameter" });
      }

      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        for (const record of chunk) {
          await db.insert(attendance)
            .values(record)
            .onConflictDoUpdate({
              target: attendance.id,
              set: { statusCode: record.statusCode, recordedBy: record.recordedBy, updatedAt: record.updatedAt }
            });
        }
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/units/bulk", async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Invalid records parameter" });
      }

      for (const record of records) {
        await db.insert(units)
          .values(record)
          .onConflictDoUpdate({
            target: units.id,
            set: { name: record.name, parentId: record.parentId, commanderId: record.commanderId, commanderName: record.commanderName }
          });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/soldiers/bulk", async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Invalid records parameter" });
      }

      for (const record of records) {
        await db.insert(soldiers)
          .values(record)
          .onConflictDoUpdate({
            target: soldiers.id,
            set: { militaryNumber: record.militaryNumber, fullName: record.fullName, rank: record.rank, unitId: record.unitId, isActive: record.isActive }
          });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 6. Audit Logs CRUD
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const logs = await db.select().from(auditLogs);
      return res.json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/journal-records", async (req, res) => {
    try {
      const logs = await db.select().from(auditLogs);
      return res.json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const { id, userId, userName, userRole, actionType, tableName, details, timestamp } = req.body;
      const log = { id, userId, userName, userRole, actionType, tableName, details, timestamp };
      await db.insert(auditLogs).values(log);
      return res.status(201).json(log);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/journal-records", async (req, res) => {
    try {
      const { id, userId, userName, userRole, actionType, tableName, details, timestamp } = req.body;
      const log = { id, userId, userName, userRole, actionType, tableName, details, timestamp };
      await db.insert(auditLogs).values(log);
      return res.status(201).json(log);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/audit-logs", async (req, res) => {
    try {
      await db.delete(auditLogs);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-logs/clear", async (req, res) => {
    try {
      await db.delete(auditLogs);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/journal-records", async (req, res) => {
    try {
      await db.delete(auditLogs);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/journal-records/clear", async (req, res) => {
    try {
      await db.delete(auditLogs);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 7. Notifications CRUD
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifs = await db.select().from(notifications);
      return res.json(notifs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const { id, title, message, isRead, type, createdAt } = req.body;
      const notif = { id, title, message, isRead, type, createdAt };
      await db.insert(notifications).values(notif);
      return res.status(201).json(notif);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { isRead } = req.body;
      await db.update(notifications)
        .set({ isRead })
        .where(eq(notifications.id, id));
      return res.json({ id, isRead });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 8. Settings CRUD
  app.get("/api/settings", async (req, res) => {
    try {
      const settingsResult = await db.select().from(systemSettings).where(eq(systemSettings.id, 1)).limit(1);
      if (settingsResult.length > 0) {
        const row: any = settingsResult[0];
        let parsedPrintSettings = null;
        if (row.printSettings) {
          try {
            parsedPrintSettings = JSON.parse(row.printSettings);
          } catch (e) {
            parsedPrintSettings = null;
          }
        }
        return res.json({
          ...row,
          printSettings: parsedPrintSettings
        });
      }
      // Return default if not initialized (though seeded)
      return res.json({
        id: 1,
        warningThreshold: 70,
        dailyReminderEnabled: true,
        dailyReminderTime: "08:30",
        autoBackupEnabled: true,
        hijriSupport: true,
        printSettings: null
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const { warningThreshold, dailyReminderEnabled, dailyReminderTime, autoBackupEnabled, hijriSupport, printSettings } = req.body;
      const printSettingsStr = printSettings ? JSON.stringify(printSettings) : null;
      
      // Check if row exists, or insert
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.id, 1)).limit(1);
      if (existing.length > 0) {
        await db.update(systemSettings)
          .set({ 
            warningThreshold, 
            dailyReminderEnabled, 
            dailyReminderTime, 
            autoBackupEnabled, 
            hijriSupport,
            printSettings: printSettingsStr 
          })
          .where(eq(systemSettings.id, 1));
      } else {
        await db.insert(systemSettings).values({
          id: 1,
          warningThreshold: warningThreshold || 70,
          dailyReminderEnabled: dailyReminderEnabled !== undefined ? dailyReminderEnabled : true,
          dailyReminderTime: dailyReminderTime || '08:30',
          autoBackupEnabled: autoBackupEnabled !== undefined ? autoBackupEnabled : true,
          hijriSupport: hijriSupport !== undefined ? hijriSupport : true,
          printSettings: printSettingsStr
        });
      }

      return res.json({ warningThreshold, dailyReminderEnabled, dailyReminderTime, autoBackupEnabled, hijriSupport, printSettings });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
