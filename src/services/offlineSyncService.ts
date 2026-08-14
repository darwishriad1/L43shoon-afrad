import { AttendanceRecord, AttendanceStatusCode } from '../types';

export interface OfflineQueueItem {
  id: string;
  type: 'single_attendance' | 'bulk_attendance';
  records: {
    id?: string;
    soldierId: string;
    date: string;
    statusCode: AttendanceStatusCode | string;
    recordedBy?: string;
    updatedAt?: string;
  }[];
  summary: string;
  soldierNames?: string[];
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retryCount: number;
}

export interface SyncedHistoryItem {
  id: string;
  queueId: string;
  recordsCount: number;
  summary: string;
  soldierNames?: string[];
  dates: string[];
  statusCodes: string[];
  syncedAt: string;
}

const DB_NAME = 'MilitaryAttendance_IndexedDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for pending offline mutations queue
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store for history of synced items (audit trail & verification)
        if (!db.objectStoreNames.contains('synced_history')) {
          const historyStore = db.createObjectStore('synced_history', { keyPath: 'id' });
          historyStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        }

        // Store for local cached attendance records
        if (!db.objectStoreNames.contains('cached_attendance')) {
          const cacheStore = db.createObjectStore('cached_attendance', { keyPath: 'id' });
          cacheStore.createIndex('soldierId', 'soldierId', { unique: false });
          cacheStore.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

export const offlineSyncService = {
  /**
   * Check if the device is currently online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  /**
   * Add unsynced attendance operation to IndexedDB offline queue
   */
  async addToQueue(
    records: { soldierId: string; date: string; statusCode: AttendanceStatusCode | string; id?: string; recordedBy?: string }[],
    summary: string,
    soldierNames?: string[]
  ): Promise<OfflineQueueItem> {
    const queueItem: OfflineQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: records.length === 1 ? 'single_attendance' : 'bulk_attendance',
      records: records.map(r => ({
        ...r,
        id: r.id || `att_${r.soldierId}_${r.date}_${Date.now()}`,
        updatedAt: new Date().toISOString()
      })),
      summary,
      soldierNames: soldierNames || [],
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    try {
      const db = await getIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['offline_queue'], 'readwrite');
        const store = tx.objectStore('offline_queue');
        const req = store.put(queueItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // Also update local cache store
      await this.cacheAttendanceRecords(queueItem.records);

      // Dispatch event to update UI indicators
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: { item: queueItem } }));
      }
    } catch (err) {
      console.warn('Failed to write to IndexedDB, fallback to memory:', err);
    }

    return queueItem;
  },

  /**
   * Get all pending items waiting in the offline queue
   */
  async getPendingQueue(): Promise<OfflineQueueItem[]> {
    try {
      const db = await getIndexedDB();
      return new Promise<OfflineQueueItem[]>((resolve, reject) => {
        const tx = db.transaction(['offline_queue'], 'readonly');
        const store = tx.objectStore('offline_queue');
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as OfflineQueueItem[]) || [];
          // Sort oldest first (FIFO) for sequential sync
          items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error reading from IndexedDB queue:', err);
      return [];
    }
  },

  /**
   * Get all synced history items from IndexedDB
   */
  async getSyncedHistory(): Promise<SyncedHistoryItem[]> {
    try {
      const db = await getIndexedDB();
      return new Promise<SyncedHistoryItem[]>((resolve, reject) => {
        const tx = db.transaction(['synced_history'], 'readonly');
        const store = tx.objectStore('synced_history');
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as SyncedHistoryItem[]) || [];
          // Sort newest first
          items.sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error reading synced history:', err);
      return [];
    }
  },

  /**
   * Cache attendance records in IndexedDB
   */
  async cacheAttendanceRecords(records: any[]): Promise<void> {
    try {
      const db = await getIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['cached_attendance'], 'readwrite');
        const store = tx.objectStore('cached_attendance');
        records.forEach(rec => {
          const recId = rec.id || `att_${rec.soldierId}_${rec.date}`;
          store.put({ ...rec, id: recId });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Error updating cached attendance in IndexedDB:', err);
    }
  },

  /**
   * Clear all synced history records
   */
  async clearSyncedHistory(): Promise<void> {
    try {
      const db = await getIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['synced_history'], 'readwrite');
        const store = tx.objectStore('synced_history');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error clearing synced history:', err);
    }
  },

  /**
   * Synchronize pending items in the offline queue to the server
   * Crucial rule: ONLY pending items are synced, once synced they are removed from the queue
   * so they are NEVER re-synced in subsequent sync rounds.
   */
  async syncPendingQueue(
    onProgress?: (syncedCount: number, total: number) => void
  ): Promise<{ syncedRecordsCount: number; batchesCount: number; syncedHistory: SyncedHistoryItem[] }> {
    if (!this.isOnline()) {
      return { syncedRecordsCount: 0, batchesCount: 0, syncedHistory: [] };
    }

    const pendingQueue = await this.getPendingQueue();
    if (pendingQueue.length === 0) {
      return { syncedRecordsCount: 0, batchesCount: 0, syncedHistory: [] };
    }

    const db = await getIndexedDB();
    const newSyncedHistoryList: SyncedHistoryItem[] = [];
    let totalSyncedRecords = 0;

    for (let i = 0; i < pendingQueue.length; i++) {
      const item = pendingQueue[i];

      try {
        // Send bulk attendance records to server
        const response = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: item.records })
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        // Successfully synced!
        const dates: string[] = Array.from(new Set(item.records.map(r => r.date)));
        const statusCodes: string[] = Array.from(new Set(item.records.map(r => String(r.statusCode))));

        const historyItem: SyncedHistoryItem = {
          id: `synced_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          queueId: item.id,
          recordsCount: item.records.length,
          summary: item.summary || `مزامنة ${item.records.length} سجل حضور`,
          soldierNames: item.soldierNames || [],
          dates,
          statusCodes,
          syncedAt: new Date().toISOString()
        };

        // 1. Save to synced_history store
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['synced_history'], 'readwrite');
          const store = tx.objectStore('synced_history');
          const req = store.put(historyItem);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        // 2. Remove from offline_queue so it is never processed again!
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['offline_queue'], 'readwrite');
          const store = tx.objectStore('offline_queue');
          const req = store.delete(item.id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        totalSyncedRecords += item.records.length;
        newSyncedHistoryList.push(historyItem);

        if (onProgress) {
          onProgress(i + 1, pendingQueue.length);
        }
      } catch (err: any) {
        console.error(`Failed to sync queue item ${item.id}:`, err);
        // Update item retry count and error message in offline_queue
        await new Promise<void>((resolve) => {
          const tx = db.transaction(['offline_queue'], 'readwrite');
          const store = tx.objectStore('offline_queue');
          store.put({
            ...item,
            status: 'failed',
            error: err.message || 'فشلت المزامنة',
            retryCount: (item.retryCount || 0) + 1
          });
          tx.oncomplete = () => resolve();
        });
      }
    }

    // Dispatch completion custom event
    if (typeof window !== 'undefined' && totalSyncedRecords > 0) {
      window.dispatchEvent(
        new CustomEvent('offline-sync-completed', {
          detail: {
            syncedRecordsCount: totalSyncedRecords,
            batchesCount: newSyncedHistoryList.length,
            historyItems: newSyncedHistoryList
          }
        })
      );
    }

    return {
      syncedRecordsCount: totalSyncedRecords,
      batchesCount: newSyncedHistoryList.length,
      syncedHistory: newSyncedHistoryList
    };
  }
};
