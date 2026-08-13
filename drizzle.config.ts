import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL || (() => {
  const host = process.env.SQL_HOST;
  const port = process.env.SQL_PORT || '5432';
  const database = process.env.SQL_DB_NAME;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  if (!host || !database || !user || !password) return undefined;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
})();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: databaseUrl ? { url: databaseUrl } : { url: 'postgresql://missing:missing@localhost:5432/missing' },
  strict: true,
  verbose: true,
});
