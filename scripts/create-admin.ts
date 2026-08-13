import 'dotenv/config';
import pg from 'pg';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/lib/passwords.ts';

const { Client } = pg;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function firstSet(...names: string[]): string {
  for (const name of names) {
    if (process.env[name]) return process.env[name] as string;
  }
  throw new Error(`Missing environment variables: ${names.join(' or ')}`);
}

const rl = createInterface({ input, output });
const ask = (question: string) => rl.question(question);

try {
  const name = (await ask('الاسم الكامل: ')).trim();
  const username = (await ask('اسم المستخدم: ')).trim();
  const email = (await ask('البريد الإلكتروني: ')).trim();
  const password = await ask('كلمة المرور: ');
  const confirm = await ask('تأكيد كلمة المرور: ');

  if (!name || !username || !email || !password) throw new Error('جميع الحقول مطلوبة.');
  if (password.length < 12) throw new Error('كلمة المرور يجب أن تكون 12 حرفًا على الأقل.');
  if (password !== confirm) throw new Error('كلمتا المرور غير متطابقتين.');

  const client = new Client({
    host: required('SQL_HOST'),
    port: Number(process.env.SQL_PORT || 5432),
    database: required('SQL_DB_NAME'),
    user: firstSet('SQL_ADMIN_USER', 'SQL_USER'),
    password: firstSet('SQL_ADMIN_PASSWORD', 'SQL_PASSWORD'),
    ssl: process.env.SQL_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  const existing = await client.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
    [username, email],
  );
  if (existing.rowCount) throw new Error('اسم المستخدم أو البريد الإلكتروني مستخدم مسبقًا.');

  const passwordHash = await hashPassword(password);
  await client.query(
    `INSERT INTO users (id, uid, name, email, username, password, role)
     VALUES ($1, NULL, $2, $3, $4, $5, 'admin')`,
    [randomUUID(), name, email, username, passwordHash],
  );

  console.log(`تم إنشاء الحساب الإداري '${username}' بنجاح.`);
  await client.end();
} catch (error) {
  console.error(`فشل إنشاء الحساب: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
