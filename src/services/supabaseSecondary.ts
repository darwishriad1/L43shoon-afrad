import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiClient } from './api';

export type SyncAction = 'insert' | 'update' | 'delete' | 'upsert';

export interface SupabaseSecondaryConfig {
  url: string;
  anonKey?: string;
  isConfigured: boolean;
  projectName?: string;
}

let clientInstance: SupabaseClient | null = null;
let cachedConfig: SupabaseSecondaryConfig | null = null;

/**
 * Transform camelCase app record to snake_case Supabase table format
 */
export function transformRecordForSupabase(table: string, record: any): any {
  if (!record || typeof record !== 'object') return record;

  if (table === 'soldiers') {
    return {
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
  }

  if (table === 'units') {
    return {
      id: record.id,
      name: record.name,
      code: record.code || null,
      parent_id: record.parentId || record.parent_id || null,
      commander_name: record.commanderName || record.commander_name || null,
      commander_rank: record.commanderRank || record.commander_rank || null,
      location: record.location || null,
      sort_order: record.sortOrder ?? record.sort_order ?? 0
    };
  }

  if (table === 'attendance') {
    return {
      id: record.id,
      soldier_id: record.soldierId || record.soldier_id,
      date: record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0],
      status: record.statusCode || record.status || 'present',
      period: record.period || 'morning',
      unit_id: record.unitId || record.unit_id || null,
      notes: record.notes || null,
      recorded_by: record.recordedBy || record.recorded_by || null
    };
  }

  if (table === 'sick_leaves' || table === 'sickLeaves') {
    return {
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
  }

  if (table === 'soldier_requests' || table === 'soldierRequests') {
    return {
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
  }

  if (table === 'surveys') {
    return {
      id: record.id,
      title: record.title || 'استبيان',
      description: record.description || '',
      target_units: record.target_units || (record.targetScope ? [record.targetScope] : []),
      questions: record.questions || (record.fieldsNeeded ? (typeof record.fieldsNeeded === 'string' ? JSON.parse(record.fieldsNeeded) : record.fieldsNeeded) : []),
      responses: record.responses || [],
      is_active: record.is_active ?? (record.status === 'نشط'),
      starts_at: record.starts_at || (record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString()),
      expires_at: record.expires_at || (record.deadline ? new Date(record.deadline).toISOString() : null),
      created_by: record.created_by || record.createdBy || null
    };
  }

  if (table === 'users') {
    return {
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
  }

  if (table === 'audit_logs' || table === 'auditLogs') {
    return {
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

  return record;
}

/**
 * Get or initialize the client-side Supabase client for the secondary/backup database
 */
export function getSecondarySupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  // Check Vite environment variables first
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    try {
      clientInstance = createClient(envUrl, envKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return clientInstance;
    } catch (e) {
      console.warn('Failed to initialize client-side Supabase from env:', e);
    }
  }

  return null;
}

/**
 * Configure or initialize Supabase secondary client dynamically
 */
export function initSecondarySupabase(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return clientInstance;
  } catch (e) {
    console.error('Error initializing Supabase client:', e);
    return null;
  }
}

/**
 * Asynchronously synchronizes any record mutation using 'upsert' instead of 'insert'
 * to prevent duplicate primary key conflicts and guarantee updates to existing records.
 */
export async function syncToSecondaryDB(
  table: string,
  actionOrRecord: SyncAction | any,
  maybeRecord?: any,
  maybeId?: string
): Promise<void> {
  // Fire and forget asynchronously
  setTimeout(async () => {
    try {
      // Default to upsert to ensure existing records are updated and new ones inserted without key collision
      let action: SyncAction = 'upsert';
      let record: any = null;
      let id: string | undefined = maybeId;

      if (typeof actionOrRecord === 'string' && ['insert', 'update', 'delete', 'upsert'].includes(actionOrRecord)) {
        action = actionOrRecord === 'delete' ? 'delete' : 'upsert';
        record = maybeRecord;
      } else {
        record = actionOrRecord;
        if (typeof maybeRecord === 'string') {
          action = maybeRecord === 'delete' ? 'delete' : 'upsert';
        }
      }

      if (!id && record) {
        id = record.id || record.soldierId || record.userId;
      }

      // 1. Sync through backend secondary DB endpoint (updates memory standby + server Supabase)
      try {
        await apiClient.post('/api/secondary-db/sync-record', {
          table,
          action,
          record,
          id,
        });
      } catch (apiErr) {
        console.debug('Secondary DB server sync notification:', apiErr);
      }

      // 2. Direct client-side Supabase sync if client is available
      const sbClient = getSecondarySupabaseClient();
      if (sbClient) {
        const tableMap: Record<string, string> = {
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
        const sbTable = tableMap[table] || table;

        if (action === 'delete' && id) {
          await sbClient.from(sbTable).delete().eq('id', id);
        } else if (record) {
          const transformed = transformRecordForSupabase(sbTable, record);
          await sbClient.from(sbTable).upsert(transformed, { onConflict: 'id' });
        }
      }
    } catch (err) {
      console.warn('Async secondary Supabase replication note:', err);
    }
  }, 0);
}

/**
 * Service object with helper functions for managing the secondary Supabase instance
 */
export const supabaseSecondaryService = {
  getClient: getSecondarySupabaseClient,
  init: initSecondarySupabase,
  sync: syncToSecondaryDB,
  transformRecord: transformRecordForSupabase,

  async getConfig(): Promise<SupabaseSecondaryConfig> {
    try {
      const res = await apiClient.get<{ config: SupabaseSecondaryConfig }>('/api/secondary-db/supabase/config');
      cachedConfig = res.config;
      return res.config;
    } catch {
      return {
        url: '',
        isConfigured: false,
      };
    }
  },

  async saveConfig(config: { url: string; anonKey?: string; projectName?: string }): Promise<any> {
    const res = await apiClient.post<{ success: boolean; config: SupabaseSecondaryConfig; connection: any }>(
      '/api/secondary-db/supabase/config',
      config
    );
    if (config.url && config.anonKey) {
      initSecondarySupabase(config.url, config.anonKey);
    }
    return res;
  },

  async pushAll(): Promise<any> {
    return apiClient.post('/api/secondary-db/supabase/push-all');
  },

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const res = await apiClient.get<{ connection: { success: boolean; message: string; latencyMs?: number } }>(
      '/api/secondary-db/supabase/config'
    );
    return res.connection;
  }
};

