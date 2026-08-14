import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// File path for saved Supabase project settings if user enters custom credentials in UI
const SUPABASE_CONFIG_FILE = path.join(process.cwd(), 'data', 'supabase_config.json');

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  projectName?: string;
  connectedAt?: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfig: SupabaseConfig = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  isConfigured: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
};

export function getSupabaseConfig(): SupabaseConfig {
  try {
    if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
      const raw = fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && (parsed.anonKey || parsed.serviceRoleKey)) {
        return {
          ...parsed,
          isConfigured: true,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading supabase config from disk:', err);
  }

  // Fallback to environment variables
  const envUrl = process.env.SUPABASE_URL || '';
  const envKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    url: envUrl,
    anonKey: envKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    isConfigured: !!(envUrl && envKey),
  };
}

export function saveSupabaseConfig(config: Partial<SupabaseConfig>): SupabaseConfig {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const current = getSupabaseConfig();
  const finalUrl = config.url !== undefined ? config.url : current.url;
  const finalAnonKey = config.anonKey !== undefined ? config.anonKey : current.anonKey;
  const finalServiceRoleKey = config.serviceRoleKey !== undefined ? config.serviceRoleKey : current.serviceRoleKey;
  const finalProjectName = config.projectName !== undefined ? config.projectName : (current.projectName || 'Military-Cloud-Secondary');

  const updated: SupabaseConfig = {
    ...current,
    url: finalUrl,
    anonKey: finalAnonKey,
    serviceRoleKey: finalServiceRoleKey,
    projectName: finalProjectName,
    connectedAt: new Date().toISOString(),
    isConfigured: !!(finalUrl && (finalAnonKey || finalServiceRoleKey)),
  };

  fs.writeFileSync(SUPABASE_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  cachedClient = null; // reset client to reinitialize
  cachedConfig = updated;
  return updated;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || (!config.anonKey && !config.serviceRoleKey)) {
    return null;
  }

  const keyToUse = config.serviceRoleKey || config.anonKey;

  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return cachedClient;
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  projectUrl?: string;
  dashboardUrl?: string;
  tables?: string[];
  latencyMs?: number;
}> {
  const config = getSupabaseConfig();
  if (!config.url || (!config.anonKey && !config.serviceRoleKey)) {
    return {
      success: false,
      message: 'لم يتم تكوين بيانات الاتصال بـ Supabase بعد (يرجى إدخال Project URL ومفتاح API).',
    };
  }

  const startTime = Date.now();
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'تعذر تهيئة عميل Supabase Client.',
    };
  }

  try {
    // Attempt a light ping/query
    const { error } = await client.from('soldiers').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    // Derive Supabase Dashboard URL if standard supabase.co domain
    let dashboardUrl = config.url;
    try {
      const urlObj = new URL(config.url);
      const projectRef = urlObj.hostname.split('.')[0];
      if (urlObj.hostname.includes('supabase.co')) {
        dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;
      }
    } catch {
      // keep fallback
    }

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, it's still connected to Supabase
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          success: true,
          message: 'تم الاتصال بخادم Supabase بنجاح (الجداول قيد الإنشاء/المزامنة).',
          projectUrl: config.url,
          dashboardUrl,
          latencyMs,
        };
      }
      return {
        success: false,
        message: `خطأ من خادم Supabase: ${error.message}`,
        projectUrl: config.url,
        dashboardUrl,
      };
    }

    return {
      success: true,
      message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح وبسرعة استجابة ممتازة.',
      projectUrl: config.url,
      dashboardUrl,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `فشل الاتصال: ${err.message}`,
    };
  }
}
