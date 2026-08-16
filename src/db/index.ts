import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false
  });
};

export const pool = createPool();

pool.on('error', (err: any) => {
  // Prevent unhandled errors on idle clients from crashing Node process
  console.warn('Postgres pool background client notification:', err?.message || err);
});

export const db = drizzle(pool, { schema });


