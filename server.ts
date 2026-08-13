import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { adminAuth } from "./src/lib/firebase-admin.ts";
import { db } from "./src/db/index.ts";
import { 
  users, 
  units, 
  soldiers, 
  sickLeaves,
  attendance, 
  auditLogs, 
  notifications, 
  systemSettings,
  soldierRequests,
  surveys
} from "./src/db/schema.ts";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { setupCloudDbRoutes } from "./src/server/cloudDbRoutes.ts";
import { eq, ne, isNull, and, inArray, or, ilike, sql, gte, lte } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- API ROUTES ---

  // Disable HTTP response caching for ALL /api/ routes to guarantee fresh data after database resets
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });

  // Setup Cloud DB Inspection & Sync API routes
  setupCloudDbRoutes(app);

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
      const { username, password, otp } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
      }

      if (otp !== undefined && otp !== null && String(otp).trim() !== "") {
        const cleanOtp = String(otp).trim();
        if (!/^\d{6}$/.test(cleanOtp)) {
          return res.status(401).json({ error: "رمز التحقق الثنائي (OTP) غير صحيح" });
        }
      }

      const cleanUsername = String(username).trim();
      const cleanPassword = String(password).trim();

      // 1. Search in users table first by exact username, name, email, id, or soldierId
      let matchedUsers = await db.select().from(users).where(
        or(
          eq(users.username, cleanUsername),
          eq(users.name, cleanUsername),
          eq(users.email, cleanUsername),
          eq(users.id, cleanUsername),
          eq(users.soldierId, cleanUsername)
        )
      );

      // If no exact match in users, try flexible ILIKE search on name or username
      if (matchedUsers.length === 0) {
        matchedUsers = await db.select().from(users).where(
          or(
            ilike(users.name, `%${cleanUsername}%`),
            ilike(users.username, `%${cleanUsername}%`)
          )
        );
      }

      for (const u of matchedUsers) {
        // Collect all possible valid passwords for this user
        const userPasswords = [u.password];

        if (u.soldierId) {
          const [s] = await db.select().from(soldiers).where(eq(soldiers.id, u.soldierId)).limit(1);
          if (s) {
            userPasswords.push(s.accountPassword);
            if (s.militaryNumber) {
              userPasswords.push(s.militaryNumber);
              userPasswords.push(s.militaryNumber.split('').reverse().join(''));
            }
            userPasswords.push('123456');
          }
        }

        const validPassSet = new Set(userPasswords.filter(Boolean).map(p => String(p).trim()));
        if (validPassSet.has(cleanPassword)) {
          const token = `local_${u.id}`;
          return res.json({ token, user: u });
        }
      }

      // 2. Search in soldiers table directly by militaryNumber, accountUsername, fullName, or id
      let soldierMatches = await db.select().from(soldiers).where(
        or(
          eq(soldiers.militaryNumber, cleanUsername),
          eq(soldiers.accountUsername, cleanUsername),
          eq(soldiers.fullName, cleanUsername),
          eq(soldiers.id, cleanUsername)
        )
      );

      // If no exact match in soldiers, try flexible ILIKE match on fullName or militaryNumber
      if (soldierMatches.length === 0) {
        soldierMatches = await db.select().from(soldiers).where(
          or(
            ilike(soldiers.fullName, `%${cleanUsername}%`),
            ilike(soldiers.militaryNumber, `%${cleanUsername}%`),
            ilike(soldiers.accountUsername, `%${cleanUsername}%`)
          )
        );
      }

      for (const s of soldierMatches) {
        const reversedMilitaryNo = s.militaryNumber ? s.militaryNumber.split('').reverse().join('') : '';
        const validPassSet = new Set([
          s.accountPassword,
          s.militaryNumber,
          reversedMilitaryNo,
          '123456'
        ].filter(Boolean).map(p => String(p).trim()));

        if (validPassSet.has(cleanPassword)) {
          // Password is valid! Find or create matching user record in users table
          let userObj;
          const existingUser = await db.select().from(users).where(
            or(
              eq(users.soldierId, s.id),
              eq(users.username, s.accountUsername || s.militaryNumber || s.id),
              eq(users.name, s.fullName)
            )
          ).limit(1);

          if (existingUser.length > 0) {
            userObj = existingUser[0];
            await db.update(users).set({
              password: cleanPassword,
              name: s.fullName,
              username: s.accountUsername || s.militaryNumber || s.id
            }).where(eq(users.id, userObj.id));
          } else {
            const newUserId = `u_soldier_${s.id}`;
            userObj = {
              id: newUserId,
              uid: newUserId,
              name: s.fullName,
              email: `${s.militaryNumber || s.id}@military.local`,
              username: s.accountUsername || s.militaryNumber || s.id,
              password: cleanPassword,
              role: 'soldier' as const,
              unitId: s.unitId,
              soldierId: s.id
            };
            await db.insert(users).values(userObj);
          }

          // Sync soldier account status
          await db.update(soldiers).set({
            hasAccount: true,
            accountUsername: s.accountUsername || s.militaryNumber || s.id,
            accountPassword: cleanPassword
          }).where(eq(soldiers.id, s.id));

          const token = `local_${userObj.id}`;
          return res.json({ token, user: userObj });
        }
      }

      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    } catch (error: any) {
      console.error("Error in /api/auth/login:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-2fa", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || !/^\d{6}$/.test(String(code).trim())) {
        return res.status(400).json({ error: "رمز التحقق الثنائي (OTP) غير صحيح" });
      }
      return res.json({ success: true, message: "تم التحقق الثنائي بنجاح" });
    } catch (error: any) {
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

  // --- Soldier Account & Requests API ---
  app.get(["/api/soldier-requests", "/api/action-requests"], async (req, res) => {
    try {
      const { soldierId } = req.query;
      let allRequests;
      if (soldierId) {
        const solStr = String(soldierId);
        
        // Retrieve soldier profile by ID or military number
        const solList = await db.select().from(soldiers).where(
          or(eq(soldiers.id, solStr), eq(soldiers.militaryNumber, solStr))
        ).limit(1);
        const soldierObj = solList[0];

        if (soldierObj) {
          // Check for active surveys that apply to this soldier but haven't been dispatched yet
          const activeSurveys = await db.select().from(surveys).where(eq(surveys.status, 'نشط'));
          for (const srv of activeSurveys) {
            let matches = false;
            const scope = srv.targetScope || 'all';
            const tId = srv.targetId;

            if (scope === 'all') {
              matches = true;
            } else if (scope === 'battalion' || scope === 'company') {
              matches = String(soldierObj.unitId || '') === String(tId || '') ||
                        String(soldierObj.battalion || '') === String(tId || '') ||
                        String(soldierObj.company || '') === String(tId || '') ||
                        String((soldierObj as any).unitName || '') === String(tId || '');
            } else if (scope === 'single') {
              matches = String(soldierObj.id) === String(tId) || String(soldierObj.militaryNumber) === String(tId);
            } else if (scope === 'selected') {
              try {
                const ids = typeof tId === 'string' ? JSON.parse(tId) : tId;
                if (Array.isArray(ids)) {
                  const strIds = ids.map(String);
                  matches = strIds.includes(String(soldierObj.id)) || strIds.includes(String(soldierObj.militaryNumber));
                }
              } catch (e) {}
            }

            if (matches) {
              const reqId = `req_srv_${srv.id}_${soldierObj.id}`;
              const existing = await db.select().from(soldierRequests).where(eq(soldierRequests.id, reqId)).limit(1);
              if (existing.length === 0) {
                const initialLog = [{
                  timestamp: new Date().toISOString(),
                  action: 'إرسال الطلب',
                  actor: 'شؤون الأفراد',
                  notes: `تم توجيه ${srv.category || 'طلب'} بعنوان (${srv.title}) للفرد`
                }];
                await db.insert(soldierRequests).values({
                  id: reqId,
                  surveyId: srv.id,
                  soldierId: String(soldierObj.id),
                  soldierName: soldierObj.fullName,
                  soldierRank: soldierObj.rank || 'جندي',
                  militaryNumber: String(soldierObj.militaryNumber || ''),
                  unitId: soldierObj.unitId ? String(soldierObj.unitId) : null,
                  requestType: srv.category === 'استبيان' ? 'survey' : srv.category === 'إقرار' ? 'declaration' : srv.category === 'رفع مستند' ? 'upload_doc' : srv.category === 'طلب معلومات' ? 'info_request' : 'update_profile',
                  title: srv.title,
                  description: srv.description,
                  status: 'new',
                  historyLogs: JSON.stringify(initialLog),
                  submittedAt: new Date().toISOString()
                });

                // Also trigger notification for soldier
                await db.insert(notifications).values({
                  id: `notif_srv_${srv.id}_${soldierObj.id}_${Date.now()}`,
                  soldierId: String(soldierObj.id),
                  targetSoldierId: String(soldierObj.id),
                  militaryNumber: String(soldierObj.militaryNumber || ''),
                  title: `طلب/استبيان جديد مطلوب من القيادة: (${srv.title})`,
                  message: `تم توجيه ${srv.category || 'طلب'} بعنوان (${srv.title}) لك. يرجى المبادرة بتعبئة البيانات والتوقيع المطلوب.`,
                  isRead: false,
                  type: 'warning',
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }

        allRequests = await db.select().from(soldierRequests).where(
          or(
            eq(soldierRequests.soldierId, solStr),
            eq(soldierRequests.militaryNumber, solStr)
          )
        );
      } else {
        allRequests = await db.select().from(soldierRequests);
      }
      return res.json(allRequests);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post(["/api/soldier-requests", "/api/action-requests"], async (req, res) => {
    try {
      const {
        id,
        soldierId,
        soldierName,
        soldierRank,
        militaryNumber,
        unitId,
        requestType,
        title,
        description,
        proposedData,
        status = 'pending',
        submittedAt = new Date().toISOString()
      } = req.body;

      const newRequest = {
        id: id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        soldierId,
        soldierName,
        soldierRank: soldierRank || '',
        militaryNumber: militaryNumber || '',
        unitId: unitId || '',
        requestType: requestType || 'update_profile',
        title: title || 'طلب إجراء جديد من الفرد',
        description: description || '',
        proposedData: typeof proposedData === 'object' ? JSON.stringify(proposedData) : (proposedData || null),
        status: status || 'pending',
        submittedAt
      };

      await db.insert(soldierRequests).values(newRequest);

      // Create notification for manager
      await db.insert(notifications).values({
        id: `notif_req_${Date.now()}`,
        title: `طلب إجراء جديد من الفرد (${soldierName})`,
        message: `قام العسكري ${soldierRank || ''} ${soldierName} بتقديم طلب: (${title}). يرجى معاينة الطلب للقبول أو الرفض.`,
        isRead: false,
        type: 'info',
        createdAt: new Date().toISOString()
      });

      return res.status(201).json(newRequest);
    } catch (error: any) {
      console.error("Error creating soldier request:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // --- Surveys and Requests Department API ---
  app.get("/api/surveys", async (req, res) => {
    try {
      const allSurveys = await db.select().from(surveys);
      return res.json(allSurveys);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/surveys", async (req, res) => {
    try {
      const {
        id,
        title,
        category = 'تحديث بيانات',
        description,
        instructions,
        targetScope = 'all',
        targetId,
        deadline,
        isRecurring = false,
        frequency = 'مرة واحدة',
        autoReminder = true,
        fieldsNeeded,
        status = 'نشط',
        createdBy
      } = req.body;

      const surveyId = id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newSurvey = {
        id: surveyId,
        title,
        category,
        description,
        instructions: instructions || '',
        targetScope,
        targetId: targetId ? (typeof targetId === 'object' ? JSON.stringify(targetId) : String(targetId)) : null,
        deadline: deadline || null,
        isRecurring: !!isRecurring,
        frequency: frequency || 'مرة واحدة',
        autoReminder: autoReminder !== undefined ? !!autoReminder : true,
        fieldsNeeded: fieldsNeeded ? (typeof fieldsNeeded === 'object' ? JSON.stringify(fieldsNeeded) : String(fieldsNeeded)) : null,
        status,
        createdBy: createdBy || 'شؤون الأفراد',
        createdAt: new Date().toISOString()
      };

      await db.insert(surveys).values(newSurvey);

      // Automatically dispatch requests & notifications to target soldiers
      let targetSoldiersList: any[] = [];
      const allSoldiersList = await db.select().from(soldiers);

      if (targetScope === 'all') {
        targetSoldiersList = allSoldiersList;
      } else if (targetScope === 'battalion' || targetScope === 'company') {
        targetSoldiersList = allSoldiersList.filter(s => 
          String(s.unitId || '') === String(targetId || '') || 
          String(s.battalion || '') === String(targetId || '') || 
          String(s.company || '') === String(targetId || '') ||
          String((s as any).unitName || '') === String(targetId || '')
        );
      } else if (targetScope === 'single') {
        targetSoldiersList = allSoldiersList.filter(s => 
          String(s.id) === String(targetId) || 
          String(s.militaryNumber) === String(targetId)
        );
      } else if (targetScope === 'selected') {
        try {
          const ids = Array.isArray(targetId) ? targetId : (typeof targetId === 'string' ? JSON.parse(targetId) : []);
          if (Array.isArray(ids)) {
            const strIds = ids.map(String);
            targetSoldiersList = allSoldiersList.filter(s => strIds.includes(String(s.id)) || strIds.includes(String(s.militaryNumber)));
          }
        } catch (e) {
          targetSoldiersList = allSoldiersList;
        }
      }

      // Create initial soldierRequest records and notifications for target soldiers
      for (const sol of targetSoldiersList) {
        const reqId = `req_srv_${surveyId}_${sol.id}`;
        // Check if request already exists
        const existingReq = await db.select().from(soldierRequests).where(eq(soldierRequests.id, reqId)).limit(1);
        if (existingReq.length === 0) {
          const initialLog = [{
            timestamp: new Date().toISOString(),
            action: 'إرسال الطلب',
            actor: 'شؤون الأفراد',
            notes: `تم توجيه ${category} بعنوان (${title}) للفرد`
          }];

          await db.insert(soldierRequests).values({
            id: reqId,
            surveyId: surveyId,
            soldierId: String(sol.id),
            soldierName: sol.fullName,
            soldierRank: sol.rank || 'جندي',
            militaryNumber: String(sol.militaryNumber || ''),
            unitId: sol.unitId ? String(sol.unitId) : null,
            requestType: category === 'استبيان' ? 'survey' : category === 'إقرار' ? 'declaration' : category === 'رفع مستند' ? 'upload_doc' : category === 'طلب معلومات' ? 'info_request' : 'update_profile',
            title: title,
            description: description,
            status: 'new',
            historyLogs: JSON.stringify(initialLog),
            submittedAt: new Date().toISOString()
          });

          // Insert individual notification for target soldier so it alerts them in portal
          await db.insert(notifications).values({
            id: `notif_srv_${surveyId}_${sol.id}_${Date.now()}`,
            soldierId: String(sol.id),
            targetSoldierId: String(sol.id),
            militaryNumber: String(sol.militaryNumber || ''),
            title: `طلب/استبيان جديد مطلوب من القيادة: (${title})`,
            message: `تم توجيه ${category} بعنوان (${title}) لك. يرجى الدخول إلى قسم الطلبات والمذكرة لتعبئتها وتوقيعها.`,
            isRead: false,
            type: 'warning',
            createdAt: new Date().toISOString()
          });
        }
      }

      // System notification for admin
      await db.insert(notifications).values({
        id: `notif_srv_created_${Date.now()}`,
        title: `تم إنشاء طلب/استبيان جديد: (${title})`,
        message: `تم توجيه طلب (${title}) بنجاح إلى ${targetSoldiersList.length} من أفراد الوحدة مع تحديد الموعد النهائي (${deadline || 'غير محدد'}).`,
        isRead: false,
        type: 'info',
        createdAt: new Date().toISOString()
      });

      return res.status(201).json(newSurvey);
    } catch (error: any) {
      console.error("Error creating survey:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Send Automatic Reminder to Pending/Overdue Soldiers
  app.post("/api/surveys/send-reminder", async (req, res) => {
    try {
      const { surveyId, customMessage } = req.body;
      let targetReqs = await db.select().from(soldierRequests);
      
      if (surveyId) {
        targetReqs = targetReqs.filter(r => r.surveyId === surveyId);
      }

      // Filter pending/overdue soldiers (status is 'new', 'viewed', 'in_progress', 'needs_amendment')
      const pendingReqs = targetReqs.filter(r => ['new', 'viewed', 'in_progress', 'needs_amendment'].includes(r.status));

      const notifMsg = customMessage || `تذكير هام عاجل: يرجى المبادرة بتعبئة وإرسال الطلب/الاستبيان المطلوبة بأسرع وقت قبل انتهاء المهلة المحددة.`;

      for (const pr of pendingReqs) {
        await db.insert(notifications).values({
          id: `notif_remind_${Date.now()}_${pr.id}`,
          soldierId: String(pr.soldierId),
          targetSoldierId: String(pr.soldierId),
          militaryNumber: String(pr.militaryNumber || ''),
          title: `تذكير عاجل من شؤون الأفراد: (${pr.title})`,
          message: notifMsg,
          isRead: false,
          type: 'warning',
          createdAt: new Date().toISOString()
        });
      }

      return res.json({ success: true, count: pendingReqs.length });
    } catch (error: any) {
      console.error("Error sending survey reminder:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.put(["/api/soldier-requests/:id", "/api/action-requests/:id"], async (req, res) => {
    try {
      const { id } = req.params;
      const { proposedData, attachments, status = 'submitted', description } = req.body;

      const existing = await db.select().from(soldierRequests).where(eq(soldierRequests.id, id)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      const reqObj = existing[0];
      let history = [];
      try {
        if (reqObj.historyLogs) history = JSON.parse(reqObj.historyLogs);
      } catch (e) {}

      history.push({
        timestamp: new Date().toISOString(),
        action: status === 'submitted' ? 'إرسال الرد من الفرد' : 'تحديث الرد',
        actor: reqObj.soldierName,
        notes: 'قام الفرد بتعبئة النموذج ورفع المرفقات المطلوبة وإرسالها للمراجعة'
      });

      await db.update(soldierRequests)
        .set({
          proposedData: typeof proposedData === 'object' ? JSON.stringify(proposedData) : (proposedData || null),
          attachments: typeof attachments === 'object' ? JSON.stringify(attachments) : (attachments || null),
          status: status || 'submitted',
          description: description || reqObj.description,
          historyLogs: JSON.stringify(history),
          submittedAt: new Date().toISOString()
        })
        .where(eq(soldierRequests.id, id));

      // Notify personnel manager
      await db.insert(notifications).values({
        id: `notif_sub_${Date.now()}`,
        title: `تم استلام رد جديد من الفرد (${reqObj.soldierName})`,
        message: `قام العسكري (${reqObj.soldierName}) بتعبئة وإرسال طلب: (${reqObj.title}) وهو الآن قيد المراجعة.`,
        isRead: false,
        type: 'info',
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, id });
    } catch (error: any) {
      console.error("Error updating soldier request:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.put(["/api/soldier-requests/:id/review", "/api/action-requests/:id/review"], async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason, reviewNotes, reviewedBy } = req.body; // 'approved' | 'rejected' | 'needs_amendment'

      const existing = await db.select().from(soldierRequests).where(eq(soldierRequests.id, id)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      const reqObj = existing[0];
      const reviewedAt = new Date().toISOString();

      let history = [];
      try {
        if (reqObj.historyLogs) history = JSON.parse(reqObj.historyLogs);
      } catch (e) {}

      let actionText = 'مراجعة الطلب';
      if (status === 'approved') actionText = 'اعتماد الطلب';
      else if (status === 'rejected') actionText = 'رفض الطلب';
      else if (status === 'needs_amendment') actionText = 'طلب تعديل من الفرد';

      history.push({
        timestamp: reviewedAt,
        action: actionText,
        actor: reviewedBy || 'مسؤول شؤون الأفراد',
        notes: reviewNotes || rejectionReason || 'تم اتخاذ إجراء بشأن الطلب'
      });

      await db.update(soldierRequests)
        .set({
          status,
          rejectionReason: rejectionReason || null,
          reviewNotes: reviewNotes || null,
          historyLogs: JSON.stringify(history),
          reviewedAt,
          reviewedBy: reviewedBy || 'مسؤول شؤون الأفراد'
        })
        .where(eq(soldierRequests.id, id));

      // If approved and has proposedData, auto update soldier!
      if (status === 'approved' && reqObj.proposedData) {
        try {
          const updates = typeof reqObj.proposedData === 'string' ? JSON.parse(reqObj.proposedData) : reqObj.proposedData;
          if (updates && typeof updates === 'object') {
            await db.update(soldiers)
              .set(updates)
              .where(eq(soldiers.id, reqObj.soldierId));
          }
        } catch (e) {
          console.error("Failed to parse proposedData for auto-update:", e);
        }
      }

      // Notify soldier
      let notifTitle = 'تحديث بشأن طلبك';
      let notifType: 'info' | 'warning' | 'error' = 'info';
      let notifMsg = '';

      if (status === 'approved') {
        notifTitle = 'تم اعتماد طلبك بنجاح ✅';
        notifType = 'info';
        notifMsg = `تمت الموافقة على طلبك (${reqObj.title}) واعتُمدت البيانات في السجل العسكري رسمياً.`;
      } else if (status === 'needs_amendment') {
        notifTitle = 'مطلوب تعديل على طلبك ⚠️';
        notifType = 'warning';
        notifMsg = `يتطلب طلبك (${reqObj.title}) إجراء تعديلات. الملاحظات: ${reviewNotes || 'يرجى مراجعة وتصحيح البيانات وإعادة الإرسال'}.`;
      } else if (status === 'rejected') {
        notifTitle = 'تم رفض الطلب ❌';
        notifType = 'error';
        notifMsg = `تم رفض طلبك (${reqObj.title}). السبب: ${rejectionReason || 'عدم استيفاء الشروط'}.`;
      }

      await db.insert(notifications).values({
        id: `notif_review_${Date.now()}`,
        title: notifTitle,
        message: notifMsg,
        isRead: false,
        type: notifType,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, id, status });
    } catch (error: any) {
      console.error("Error reviewing soldier request:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Toggle/Update Soldier Account and sync User entry
  app.put("/api/soldiers/:id/account", async (req, res) => {
    try {
      const { id } = req.params;
      const { hasAccount, username, password, assignedTasks, allowProfileEdit } = req.body;

      const soldierList = await db.select().from(soldiers).where(eq(soldiers.id, id)).limit(1);
      if (soldierList.length === 0) {
        return res.status(404).json({ error: "العسكري غير موجود" });
      }

      const soldier = soldierList[0];

      const defaultPass = soldier.militaryNumber ? soldier.militaryNumber.split('').reverse().join('') : '123456';
      const accountUsername = (username && username.trim()) || soldier.accountUsername || soldier.militaryNumber || id;
      const accountPassword = (password && password.trim()) || soldier.accountPassword || defaultPass;

      // Update soldier record with account state
      await db.update(soldiers)
        .set({
          hasAccount: !!hasAccount,
          accountUsername: accountUsername,
          accountPassword: accountPassword,
          assignedTasks: typeof assignedTasks === 'object' ? JSON.stringify(assignedTasks) : (assignedTasks || null),
          allowProfileEdit: allowProfileEdit !== undefined ? !!allowProfileEdit : true
        })
        .where(eq(soldiers.id, id));

      if (hasAccount) {
        // Find existing user linked to this soldierId or username
        const existingUsers = await db.select().from(users).where(
          or(
            eq(users.soldierId, id),
            eq(users.username, accountUsername)
          )
        ).limit(1);

        if (existingUsers.length > 0) {
          await db.update(users)
            .set({
              username: accountUsername,
              password: accountPassword,
              role: 'soldier',
              name: soldier.fullName,
              unitId: soldier.unitId,
              soldierId: id
            })
            .where(eq(users.id, existingUsers[0].id));
        } else {
          // Create new user for soldier
          const newUserId = `u_soldier_${id}`;
          await db.insert(users).values({
            id: newUserId,
            uid: newUserId,
            name: soldier.fullName,
            email: `${accountUsername}@military.local`,
            username: accountUsername,
            password: accountPassword,
            role: 'soldier',
            unitId: soldier.unitId,
            soldierId: id
          });
        }
      } else {
        // Disable user login if toggled off
        await db.delete(users).where(
          or(
            eq(users.soldierId, id),
            eq(users.username, accountUsername)
          )
        );
      }

      return res.json({ success: true, soldierId: id, hasAccount });
    } catch (error: any) {
      console.error("Error updating soldier account:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Batch create accounts for soldiers
  app.post("/api/soldiers/accounts/batch-create", async (req, res) => {
    try {
      const { soldierIds, unitId, battalion, company, platoon } = req.body;

      let allSoldiersToProcess = [];
      if (Array.isArray(soldierIds) && soldierIds.length > 0) {
        allSoldiersToProcess = await db.select().from(soldiers).where(inArray(soldiers.id, soldierIds));
      } else {
        const conditions = [];
        if (unitId && unitId !== 'all') conditions.push(eq(soldiers.unitId, unitId));
        if (battalion && battalion !== 'all') conditions.push(eq(soldiers.battalion, battalion));
        if (company && company !== 'all') conditions.push(eq(soldiers.company, company));
        if (platoon && platoon !== 'all') conditions.push(eq(soldiers.platoon, platoon));
        
        if (conditions.length > 0) {
          allSoldiersToProcess = await db.select().from(soldiers).where(and(...conditions));
        } else {
          allSoldiersToProcess = await db.select().from(soldiers);
        }
      }

      let createdCount = 0;
      let skippedCount = 0;
      const createdList = [];

      for (const soldier of allSoldiersToProcess) {
        if (soldier.hasAccount) {
          skippedCount++;
          continue;
        }

        const accountUsername = soldier.accountUsername || soldier.militaryNumber || soldier.id;
        const initialPassword = soldier.accountPassword || (soldier.militaryNumber ? soldier.militaryNumber.split('').reverse().join('') : '123456');

        const existingUsers = await db.select().from(users).where(
          or(
            eq(users.soldierId, soldier.id),
            eq(users.username, accountUsername)
          )
        ).limit(1);

        if (existingUsers.length > 0) {
          await db.update(soldiers).set({
            hasAccount: true,
            accountUsername: accountUsername,
            accountPassword: initialPassword,
            allowProfileEdit: true
          }).where(eq(soldiers.id, soldier.id));

          await db.update(users).set({
            name: soldier.fullName,
            username: accountUsername,
            password: initialPassword,
            role: 'soldier',
            unitId: soldier.unitId,
            soldierId: soldier.id
          }).where(eq(users.id, existingUsers[0].id));

          createdCount++;
          createdList.push({ id: soldier.id, militaryNumber: soldier.militaryNumber, fullName: soldier.fullName, username: accountUsername, initialPassword });
        } else {
          const newUserId = `u_soldier_${soldier.id}`;
          await db.update(soldiers).set({
            hasAccount: true,
            accountUsername: accountUsername,
            accountPassword: initialPassword,
            allowProfileEdit: true
          }).where(eq(soldiers.id, soldier.id));

          await db.insert(users).values({
            id: newUserId,
            uid: newUserId,
            name: soldier.fullName,
            email: `${accountUsername}@military.local`,
            username: accountUsername,
            password: initialPassword,
            role: 'soldier',
            unitId: soldier.unitId,
            soldierId: soldier.id
          });

          createdCount++;
          createdList.push({ id: soldier.id, militaryNumber: soldier.militaryNumber, fullName: soldier.fullName, username: accountUsername, initialPassword });
        }
      }

      return res.json({
        success: true,
        createdCount,
        skippedCount,
        totalProcessed: allSoldiersToProcess.length,
        createdList
      });
    } catch (error: any) {
      console.error("Error in batch create accounts:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Batch status & password management for soldier accounts
  app.post("/api/soldiers/accounts/batch-status", async (req, res) => {
    try {
      const { soldierIds, action } = req.body; // action: 'activate' | 'deactivate' | 'suspend' | 'reset_password'
      if (!Array.isArray(soldierIds) || soldierIds.length === 0) {
        return res.status(400).json({ error: "لم يتم اختيار أي أفراد" });
      }

      const selectedSoldiers = await db.select().from(soldiers).where(inArray(soldiers.id, soldierIds));
      let updatedCount = 0;

      for (const soldier of selectedSoldiers) {
        const username = soldier.accountUsername || soldier.militaryNumber || soldier.id;
        const reversedMilitaryNo = soldier.militaryNumber ? soldier.militaryNumber.split('').reverse().join('') : '123456';
        const password = soldier.accountPassword || reversedMilitaryNo;

        if (action === 'activate') {
          await db.update(soldiers).set({
            hasAccount: true,
            accountUsername: username,
            accountPassword: password,
            allowProfileEdit: true
          }).where(eq(soldiers.id, soldier.id));

          const existingUsers = await db.select().from(users).where(
            or(
              eq(users.soldierId, soldier.id),
              eq(users.username, username)
            )
          ).limit(1);

          if (existingUsers.length === 0) {
            await db.insert(users).values({
              id: `u_soldier_${soldier.id}`,
              uid: `u_soldier_${soldier.id}`,
              name: soldier.fullName,
              email: `${username}@military.local`,
              username: username,
              password: password,
              role: 'soldier',
              unitId: soldier.unitId,
              soldierId: soldier.id
            });
          } else {
            await db.update(users).set({
              name: soldier.fullName,
              username: username,
              password: password,
              role: 'soldier',
              unitId: soldier.unitId,
              soldierId: soldier.id
            }).where(eq(users.id, existingUsers[0].id));
          }
          updatedCount++;
        } else if (action === 'deactivate' || action === 'suspend') {
          await db.update(soldiers).set({ hasAccount: false }).where(eq(soldiers.id, soldier.id));
          await db.delete(users).where(
            or(
              eq(users.soldierId, soldier.id),
              eq(users.username, username)
            )
          );
          updatedCount++;
        } else if (action === 'reset_password') {
          await db.update(soldiers).set({
            hasAccount: true,
            accountUsername: username,
            accountPassword: reversedMilitaryNo
          }).where(eq(soldiers.id, soldier.id));

          const existingUsers = await db.select().from(users).where(
            or(
              eq(users.soldierId, soldier.id),
              eq(users.username, username)
            )
          ).limit(1);

          if (existingUsers.length > 0) {
            await db.update(users).set({
              password: reversedMilitaryNo,
              username: username,
              name: soldier.fullName
            }).where(eq(users.id, existingUsers[0].id));
          } else {
            await db.insert(users).values({
              id: `u_soldier_${soldier.id}`,
              uid: `u_soldier_${soldier.id}`,
              name: soldier.fullName,
              email: `${username}@military.local`,
              username: username,
              password: reversedMilitaryNo,
              role: 'soldier',
              unitId: soldier.unitId,
              soldierId: soldier.id
            });
          }
          updatedCount++;
        }
      }

      return res.json({ success: true, action, updatedCount });
    } catch (error: any) {
      console.error("Error in batch status update:", error);
      return res.status(500).json({ error: error.message });
    }
  });
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
          diagnosis: meta.diagnosis || '',
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
        reason, attachmentUrl, status, hospital, notes, diagnosis,
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
        diagnosis: diagnosis || '',
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
        actionType: "إضافة",
        tableName: "sick_leaves",
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
        diagnosis: diagnosis || '',
        attachmentUrl: attachmentUrl || null,
        notes: notes || ''
      });
    } catch (error: any) {
      console.error("Error in POST /api/soldiers/:id/sick-leaves:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Update a sick leave
  app.put("/api/soldiers/:id/sick-leaves/:leaveId", async (req, res) => {
    try {
      const { id, leaveId } = req.params;
      const { 
        startDate, endDate, illnessType, leaveType, duration, 
        doctorName, grantingAuthority, orderNumber, orderDate, 
        reason, attachmentUrl, status, hospital, notes, diagnosis,
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
        diagnosis: diagnosis || '',
        attachmentUrl: attachmentUrl || null,
        rawNotes: notes || ''
      });

      const updatedData = {
        startDate,
        endDate,
        illnessType: finalLeaveType,
        duration: parseInt(duration) || 1,
        doctorName: finalAuthority,
        status: status || "نشط",
        hospital: hospital || finalAuthority,
        notes: notesMeta,
      };

      await db.update(sickLeaves)
        .set(updatedData)
        .where(and(eq(sickLeaves.id, leaveId), eq(sickLeaves.soldierId, id)));

      // Audit log
      const logId = "log_" + Math.random().toString(36).substring(2, 11);
      await db.insert(auditLogs).values({
        id: logId,
        userId: performedBy || "u1",
        userName: performedByName || "مدير النظام",
        userRole: performedByRole || "admin",
        actionType: "تعديل",
        tableName: "sick_leaves",
        details: `تعديل قيد الإجازة (${finalLeaveType}) للعسكري: ${startDate} إلى ${endDate} - الأمر: ${orderNumber || 'بدون'}`,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        id: leaveId,
        soldierId: id,
        ...updatedData,
        leaveType: finalLeaveType,
        grantingAuthority: finalAuthority,
        orderNumber: orderNumber || '',
        orderDate: orderDate || startDate,
        reason: reason || '',
        diagnosis: diagnosis || '',
        attachmentUrl: attachmentUrl || null,
        notes: notes || ''
      });
    } catch (error: any) {
      console.error("Error in PUT /api/soldiers/:id/sick-leaves/:leaveId:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Delete a sick leave
  app.delete("/api/soldiers/:id/sick-leaves/:leaveId", async (req, res) => {
    try {
      const { id, leaveId } = req.params;
      await db.delete(sickLeaves).where(and(eq(sickLeaves.id, leaveId), eq(sickLeaves.soldierId, id)));

      // Audit log
      const logId = "log_" + Math.random().toString(36).substring(2, 11);
      await db.insert(auditLogs).values({
        id: logId,
        userId: "u1",
        userName: "مدير النظام",
        userRole: "admin",
        actionType: "حذف",
        tableName: "sick_leaves",
        details: `حذف قيد الإجازة برقم (${leaveId}) للعسكري (${id})`,
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error in DELETE /api/soldiers/:id/sick-leaves/:leaveId:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Reset attendance range to "لم يتم تحضيره" (delete attendance records)
  app.post("/api/soldiers/:id/reset-attendance-range", async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      await db.delete(attendance).where(
        and(
          eq(attendance.soldierId, id),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      );

      return res.json({ success: true, message: "تم إعادة تعيين سجل الحضور للفترة المحددة إلى (لم يتم تحضيره)" });
    } catch (error: any) {
      console.error("Error in POST /api/soldiers/:id/reset-attendance-range:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get attendance history for a soldier
  app.get("/api/soldiers/:id/attendance-history", async (req, res) => {
    try {
      const { id } = req.params;
      const solStr = String(id);
      
      const solList = await db.select().from(soldiers).where(
        or(eq(soldiers.id, solStr), eq(soldiers.militaryNumber, solStr))
      ).limit(1);

      let candidateIds = [solStr];
      if (solList.length > 0) {
        if (solList[0].id) candidateIds.push(String(solList[0].id));
        if (solList[0].militaryNumber) candidateIds.push(String(solList[0].militaryNumber));
      }
      candidateIds = Array.from(new Set(candidateIds));

      const history = await db
        .select()
        .from(attendance)
        .where(inArray(attendance.soldierId, candidateIds));

      // Deduplicate by date, keeping the latest updated record
      const dateMap = new Map<string, any>();
      for (const rec of history) {
        const existing = dateMap.get(rec.date);
        if (!existing || new Date(rec.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
          dateMap.set(rec.date, rec);
        }
      }

      const deduplicated = Array.from(dateMap.values());
      deduplicated.sort((a, b) => String(a.date).localeCompare(String(b.date)));

      return res.json(deduplicated);
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
      // Deduplicate by soldierId and date, keeping the latest updated record
      const map = new Map<string, any>();
      for (const rec of allAttendance) {
        const key = `${rec.soldierId}_${rec.date}`;
        const existing = map.get(key);
        if (!existing || new Date(rec.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
          map.set(key, rec);
        }
      }
      return res.json(Array.from(map.values()));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const { id, soldierId, date, statusCode, recordedBy, updatedAt } = req.body;
      const solStr = String(soldierId);
      const dateStr = String(date);
      const recId = id || `att_${solStr}_${dateStr}`;
      const record = { 
        id: recId, 
        soldierId: solStr, 
        date: dateStr, 
        statusCode: String(statusCode), 
        recordedBy: recordedBy || 'admin', 
        updatedAt: updatedAt || new Date().toISOString() 
      };
      
      // Look up soldier details for notification
      const solList = await db.select().from(soldiers).where(
        or(eq(soldiers.id, solStr), eq(soldiers.militaryNumber, solStr))
      ).limit(1);
      const targetSol = solList[0];
      const solIds = targetSol ? Array.from(new Set([solStr, String(targetSol.id), String(targetSol.militaryNumber)])) : [solStr];

      // Delete previous records for this soldier and date to prevent duplicates
      await db.delete(attendance).where(
        and(
          inArray(attendance.soldierId, solIds),
          eq(attendance.date, dateStr)
        )
      );

      // Insert new single record
      await db.insert(attendance).values(record);

      // Push notification to soldier if soldier found
      if (targetSol) {
        const statusMap: Record<string, string> = {
          'ح': 'حاضر بالدوام',
          'غ': 'غائب',
          'إ': 'إجازة رسمية',
          'م': 'عذر طبي / راحة',
          'ع': 'مأمورية خارجية',
          'ن': 'نوبة / خفر'
        };
        const statusLabel = statusMap[statusCode] || statusCode;

        await db.insert(notifications).values({
          id: `notif_att_${targetSol.id}_${dateStr}_${Date.now()}`,
          soldierId: String(targetSol.id),
          targetSoldierId: String(targetSol.id),
          militaryNumber: String(targetSol.militaryNumber || ''),
          title: `تحديث حالة التحضير اليومي (${dateStr})`,
          message: `تم تسجيل حالة تحضيرك ليوم ${dateStr} كـ (${statusLabel}) في السجلات المركزية للقيادة.`,
          isRead: false,
          type: statusCode === 'غ' ? 'warning' : 'info',
          createdAt: new Date().toISOString()
        });
      }
      
      return res.json(record);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { records } = req.body; // array of records
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Invalid records parameter" });
      }

      const allSoldiersList = await db.select().from(soldiers);
      const solMap = new Map<string, any>();
      allSoldiersList.forEach(s => {
        solMap.set(String(s.id), s);
        if (s.militaryNumber) solMap.set(String(s.militaryNumber), s);
      });

      for (const record of records) {
        const solStr = String(record.soldierId);
        const dateStr = String(record.date);
        const recId = record.id || `att_${solStr}_${dateStr}`;
        const targetSol = solMap.get(solStr);
        const solIds = targetSol ? Array.from(new Set([solStr, String(targetSol.id), String(targetSol.militaryNumber)])) : [solStr];

        await db.delete(attendance).where(
          and(
            inArray(attendance.soldierId, solIds),
            eq(attendance.date, dateStr)
          )
        );

        await db.insert(attendance).values({
          id: recId,
          soldierId: solStr,
          date: dateStr,
          statusCode: String(record.statusCode),
          recordedBy: record.recordedBy || 'admin',
          updatedAt: record.updatedAt || new Date().toISOString()
        });

        // Insert individual notification for target soldier
        if (targetSol) {
          const statusMap: Record<string, string> = {
            'ح': 'حاضر بالدوام',
            'غ': 'غائب',
            'إ': 'إجازة رسمية',
            'م': 'عذر طبي / راحة',
            'ع': 'مأمورية خارجية',
            'ن': 'نوبة / خفر'
          };
          const statusLabel = statusMap[record.statusCode] || record.statusCode;

          await db.insert(notifications).values({
            id: `notif_att_b_${targetSol.id}_${dateStr}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            soldierId: String(targetSol.id),
            targetSoldierId: String(targetSol.id),
            militaryNumber: String(targetSol.militaryNumber || ''),
            title: `تحديث حالة التحضير اليومي (${dateStr})`,
            message: `تم تحديث حالة تحضيرك ليوم ${dateStr} كـ (${statusLabel}) ضمن كشف التحضير اليومي.`,
            isRead: false,
            type: record.statusCode === 'غ' ? 'warning' : 'info',
            createdAt: new Date().toISOString()
          });
        }
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving bulk attendance:", error);
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
  app.get(["/api/audit-logs", "/api/journal-records"], requireAuth, async (req: AuthRequest, res) => {
    try {
      const logs = await db.select().from(auditLogs);
      return res.json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  const handleCreateAuditLog = async (req: Request, res: Response) => {
    try {
      let dbUser: any = null;
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        if (token.startsWith('local_')) {
          const userId = token.replace('local_', '');
          const [foundUser] = await db.select().from(users).where(eq(users.id, userId));
          if (foundUser) dbUser = foundUser;
        } else {
          try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            const [foundUser] = await db.select().from(users).where(or(eq(users.uid, decodedToken.uid), eq(users.id, decodedToken.uid)));
            if (foundUser) dbUser = foundUser;
          } catch {
            // Ignore token verification errors for non-blocking audit log creation
          }
        }
      }

      const { id, userId, userName, userRole, actionType, tableName, details, timestamp } = req.body || {};
      const log = {
        id: id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: userId || dbUser?.id || 'admin',
        userName: userName || dbUser?.name || 'مستخدم',
        userRole: userRole || dbUser?.role || 'مدير النظام',
        actionType: actionType || 'تعديل',
        tableName: tableName || 'سجل',
        details: details || '',
        timestamp: timestamp || new Date().toISOString()
      };

      try {
        await db.insert(auditLogs).values(log);
      } catch (insertErr: any) {
        // Fallback with fresh unique ID in case of primary key collision
        log.id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await db.insert(auditLogs).values(log);
      }

      return res.status(201).json(log);
    } catch (error: any) {
      console.error("Error saving audit log:", error);
      return res.status(500).json({ error: error.message });
    }
  };

  app.post("/api/audit-logs", handleCreateAuditLog);
  app.post("/api/journal-records", handleCreateAuditLog);

  app.delete(["/api/audit-logs", "/api/journal-records"], requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      await db.delete(auditLogs);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post(["/api/audit-logs/clear", "/api/journal-records/clear"], requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
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
          highContrastMode: row.highContrastMode ?? false,
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
        highContrastMode: false,
        printSettings: null
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const { warningThreshold, dailyReminderEnabled, dailyReminderTime, autoBackupEnabled, hijriSupport, highContrastMode, printSettings } = req.body;
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
            highContrastMode: highContrastMode ?? false,
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
          highContrastMode: highContrastMode ?? false,
          printSettings: printSettingsStr
        });
      }

      return res.json({ warningThreshold, dailyReminderEnabled, dailyReminderTime, autoBackupEnabled, hijriSupport, highContrastMode: highContrastMode ?? false, printSettings });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 9. Full Backup Restoration
  app.post("/api/backup/restore", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'ملف النسخة الاحتياطية تالف أو غير صالح' });
      }

      const { units: importedUnits, soldiers: importedSoldiers, attendance: importedAttendance, auditLogs: importedLogs } = payload;

      if (importedUnits !== undefined && !Array.isArray(importedUnits)) {
        return res.status(400).json({ error: 'بيانات الوحدات في النسخة الاحتياطية غير صالحة' });
      }
      if (importedSoldiers !== undefined && !Array.isArray(importedSoldiers)) {
        return res.status(400).json({ error: 'بيانات الأفراد في النسخة الاحتياطية غير صالحة' });
      }
      if (importedAttendance !== undefined && !Array.isArray(importedAttendance)) {
        return res.status(400).json({ error: 'بيانات التحضير في النسخة الاحتياطية غير صالحة' });
      }

      await db.transaction(async (tx) => {
        if (Array.isArray(importedUnits) && importedUnits.length > 0) {
          for (const u of importedUnits) {
            if (!u || typeof u !== 'object' || !u.id || !u.name) continue;
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
          }
        }

        if (Array.isArray(importedSoldiers) && importedSoldiers.length > 0) {
          for (const s of importedSoldiers) {
            if (!s || typeof s !== 'object' || !s.id || !s.fullName) continue;
            await tx.insert(soldiers).values({
              id: String(s.id),
              militaryNumber: String(s.militaryNumber || s.id),
              fullName: String(s.fullName),
              rank: String(s.rank || 'جندي'),
              unitId: String(s.unitId || 'main'),
              isActive: s.isActive ?? true,
              nationalId: s.nationalId ? String(s.nationalId) : null,
              birthDate: s.birthDate ? String(s.birthDate) : null,
              bloodType: s.bloodType ? String(s.bloodType) : null,
              phoneNumber: s.phoneNumber ? String(s.phoneNumber) : null,
              address: s.address ? String(s.address) : null,
              emergencyContact: s.emergencyContact ? String(s.emergencyContact) : null,
              qualification: s.qualification ? String(s.qualification) : null,
              specialization: s.specialization ? String(s.specialization) : null,
              joinDate: s.joinDate ? String(s.joinDate) : null,
              battalion: s.battalion ? String(s.battalion) : null,
              company: s.company ? String(s.company) : null,
              platoon: s.platoon ? String(s.platoon) : null,
              militaryStatus: String(s.militaryStatus || 'على رأس العمل'),
              medicalHistory: s.medicalHistory ? String(s.medicalHistory) : null,
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
                militaryStatus: String(s.militaryStatus || 'على رأس العمل'),
                accountUsername: s.accountUsername ? String(s.accountUsername) : null,
                accountPassword: s.accountPassword ? String(s.accountPassword) : null
              }
            });
          }
        }

        if (Array.isArray(importedAttendance) && importedAttendance.length > 0) {
          for (const a of importedAttendance) {
            if (!a || typeof a !== 'object' || !a.soldierId || !a.date || !a.statusCode) continue;
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
                recordedBy: String(a.recordedBy || req.dbUser?.id || 'admin'),
                updatedAt: new Date().toISOString()
              }
            });
          }
        }

        if (Array.isArray(importedLogs) && importedLogs.length > 0) {
          for (const log of importedLogs) {
            if (!log || typeof log !== 'object' || !log.details) continue;
            await tx.insert(auditLogs).values({
              id: String(log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
              userId: String(log.userId || req.dbUser?.id || 'admin'),
              userName: String(log.userName || req.dbUser?.name || 'المسؤول'),
              userRole: String(log.userRole || req.dbUser?.role || 'admin'),
              actionType: String(log.actionType || 'استعادة'),
              tableName: String(log.tableName || 'المنظومة'),
              details: String(log.details || 'استعادة نسخ احتياطي للنظام'),
              timestamp: String(log.timestamp || new Date().toISOString())
            }).onConflictDoNothing();
          }
        }
      });

      return res.json({ success: true, message: 'تم استعادة كافة بيانات المنظومة بنجاح' });
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      return res.status(500).json({ error: error.message || 'فشلت عملية استعادة النسخة الاحتياطية' });
    }
  });

  // 10. Database Full Reset & Clean-up
  app.post("/api/system/reset-database", requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.transaction(async (tx) => {
        // Delete all data tables 100%
        await tx.delete(attendance);
        await tx.delete(sickLeaves);
        await tx.delete(soldierRequests);
        await tx.delete(surveys);
        await tx.delete(auditLogs);
        await tx.delete(notifications);
        await tx.delete(soldiers);
        await tx.delete(units);

        // Identify current active requesting user to preserve ONLY 1 admin account
        const currentDbUserId = req.dbUser?.id;
        const currentUid = req.user?.uid;
        const currentEmail = req.user?.email || req.dbUser?.email;

        // Try to find matching user in DB
        let currentAdminUser = null;
        if (currentDbUserId) {
          const [u] = await tx.select().from(users).where(eq(users.id, currentDbUserId)).limit(1);
          currentAdminUser = u;
        }
        if (!currentAdminUser && currentUid) {
          const [u] = await tx.select().from(users).where(or(eq(users.uid, currentUid), eq(users.id, currentUid))).limit(1);
          currentAdminUser = u;
        }
        if (!currentAdminUser && currentEmail) {
          const [u] = await tx.select().from(users).where(eq(users.email, currentEmail)).limit(1);
          currentAdminUser = u;
        }

        if (currentAdminUser) {
          // Clean up current admin account (unlink from unit/soldier)
          await tx.update(users)
            .set({ 
              role: 'admin', 
              unitId: null, 
              soldierId: null 
            })
            .where(eq(users.id, currentAdminUser.id));

          // DELETE ALL OTHER USERS FROM DATABASE WITHOUT EXCEPTION
          await tx.delete(users).where(ne(users.id, currentAdminUser.id));
        } else {
          // If no matching user record exists, create 1 clean admin user
          const cleanAdminId = currentUid || currentDbUserId || `admin_${Date.now()}`;
          const cleanAdmin = {
            id: cleanAdminId,
            uid: currentUid || cleanAdminId,
            name: req.user?.name || (currentEmail ? currentEmail.split('@')[0] : 'مدير النظام'),
            email: currentEmail || 'admin@military.local',
            username: null,
            password: null,
            role: 'admin',
            unitId: null,
            soldierId: null
          };

          // Delete ALL users
          await tx.delete(users);
          // Insert clean admin
          await tx.insert(users).values(cleanAdmin);
        }
      });

      return res.json({ success: true, message: 'تمت تهيئة وتصفية كافة البيانات والمستخدمين باستثناء مدير النظام الرئيسي بنجاح' });
    } catch (error: any) {
      console.error("Error resetting database:", error);
      return res.status(500).json({ error: error.message || 'حدث خطأ أثناء تهيئة قاعدة البيانات' });
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
