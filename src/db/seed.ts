import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as dotenv from 'dotenv';
import { 
  users, 
  units, 
  soldiers, 
  attendance, 
  auditLogs, 
  notifications, 
  systemSettings 
} from './schema.ts';
import { 
  initialUsers, 
  initialUnits, 
  initialSoldiers, 
  generateInitialAttendance, 
  initialAuditLogs, 
  initialNotifications, 
  initialSettings 
} from '../data/mockData.ts';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER, // Seed using admin credentials
  password: process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

const db = drizzle(pool);

async function main() {
  console.log('Seeding database...');

  try {
    // 1. Seed System Settings (id = 1)
    console.log('Seeding system settings...');
    await db.insert(systemSettings).values({
      id: 1,
      warningThreshold: initialSettings.warningThreshold,
      dailyReminderEnabled: initialSettings.dailyReminderEnabled,
      dailyReminderTime: initialSettings.dailyReminderTime,
      autoBackupEnabled: initialSettings.autoBackupEnabled,
      hijriSupport: initialSettings.hijriSupport,
    }).onConflictDoNothing();

    // 2. Seed Users
    console.log('Seeding users...');
    for (const u of initialUsers) {
      await db.insert(users).values({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        unitId: u.unitId,
      }).onConflictDoNothing();
    }

    // 3. Seed Units
    console.log('Seeding units...');
    for (const un of initialUnits) {
      await db.insert(units).values({
        id: un.id,
        name: un.name,
        parentId: un.parentId,
        commanderId: un.commanderId,
        commanderName: un.commanderName,
      }).onConflictDoNothing();
    }

    // 4. Seed Soldiers
    console.log('Seeding soldiers...');
    for (const s of initialSoldiers) {
      await db.insert(soldiers).values({
        id: s.id,
        militaryNumber: s.militaryNumber,
        fullName: s.fullName,
        rank: s.rank,
        unitId: s.unitId,
        isActive: s.isActive,
      }).onConflictDoNothing();
    }

    // 5. Seed Attendance
    console.log('Seeding attendance...');
    const attRecords = generateInitialAttendance();
    // Bulk insert helper or insert in chunks to avoid overloading PG
    const chunkSize = 100;
    for (let i = 0; i < attRecords.length; i += chunkSize) {
      const chunk = attRecords.slice(i, i + chunkSize);
      await db.insert(attendance).values(
        chunk.map(r => ({
          id: r.id,
          soldierId: r.soldierId,
          date: r.date,
          statusCode: r.statusCode,
          recordedBy: r.recordedBy,
          updatedAt: r.updatedAt,
        }))
      ).onConflictDoNothing();
    }

    // 6. Seed Audit Logs
    console.log('Seeding audit logs...');
    for (const log of initialAuditLogs) {
      await db.insert(auditLogs).values({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        actionType: log.actionType,
        tableName: log.tableName,
        details: log.details,
        timestamp: log.timestamp,
      }).onConflictDoNothing();
    }

    // 7. Seed Notifications
    console.log('Seeding notifications...');
    for (const n of initialNotifications) {
      await db.insert(notifications).values({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        type: n.type,
        createdAt: n.createdAt,
      }).onConflictDoNothing();
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

main();
