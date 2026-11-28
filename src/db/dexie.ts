import Dexie, { type Table } from 'dexie';
import type { GenericRecord } from '../types/database';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/useAuthStore';

export class BisaAbsenDB extends Dexie {
  records!: Table<GenericRecord, string>;

  constructor() {
    super('BisaAbsenDB');
    this.version(1).stores({
      records: 'id, kind, updatedAt, deleted, dirty',
    });
  }
}

export const db = new BisaAbsenDB();

type DBChangeListener = () => void;
const dbChangeListeners: Set<DBChangeListener> = new Set();

export function onDBChange(fn: DBChangeListener): () => void {
  dbChangeListeners.add(fn);
  return () => dbChangeListeners.delete(fn);
}

export function notifyDBChange(): void {
  dbChangeListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[Dexie] Error in db change listener:', e);
    }
  });
}

/**
 * Repository generik untuk tabel records.
 * Direct Server Database (aaPanel / MySQL / REST API):
 * Setiap baca & tulis langsung terhubung ke server backend / MySQL aaPanel.
 * Seluruh browser dan perangkat melihat data yang 100% sama seketika.
 * Dexie tetap diperbarui di latar belakang sebagai cache lokal cepat & fallback saat offline.
 */
export const genericRepo = {
  async findByKind<T>(kind: string, includeDeleted = false): Promise<GenericRecord<T>[]> {
    const auth = useAuthStore.getState();
    const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';

    // 1. Ambil data langsung dari Database Server aaPanel / MySQL
    const serverRecords = await apiClient.getRecords<T>(kind, includeDeleted, tenantId);
    if (serverRecords) {
      try {
        await db.records.bulkPut(serverRecords as GenericRecord[]);
      } catch {}
      return serverRecords;
    }

    // 2. Fallback ke Dexie jika server belum dijalankan / saat offline / unit test
    let collection = db.records.where('kind').equals(kind);
    if (!includeDeleted) {
      collection = collection.filter((r) => r.deleted === 0);
    }
    const items = await collection.toArray();
    return items as GenericRecord<T>[];
  },

  async findActiveByKind<T>(kind: string): Promise<T[]> {
    const records = await this.findByKind<T>(kind, false);
    return records.map((r) => ({
      ...r.data,
      _recordId: r.id,
      _updatedAt: r.updatedAt,
    }));
  },

  async getById<T>(id: string): Promise<GenericRecord<T> | undefined> {
    const serverRec = await apiClient.getRecordById<T>(id);
    if (serverRec) {
      try {
        await db.records.put(serverRec as GenericRecord);
      } catch {}
      return serverRec;
    }

    const rec = await db.records.get(id);
    return rec as GenericRecord<T> | undefined;
  },

  async upsert<T>(
    kind: string,
    id: string,
    data: T,
    options: { dirty?: 0 | 1; deleted?: 0 | 1 } = {}
  ): Promise<GenericRecord<T>> {
    const existing = await db.records.get(id);
    const now = Date.now();
    const record: GenericRecord<T> = {
      id,
      kind,
      data,
      updatedAt: now,
      deleted: options.deleted ?? (existing?.deleted ?? 0),
      dirty: 0,
    };

    // 1. Simpan ke Dexie lokal
    try {
      await db.records.put(record as GenericRecord);
    } catch {}

    // 2. Simpan LANGSUNG ke Database Server aaPanel
    const auth = useAuthStore.getState();
    const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';
    const userId = auth.user?.id || 'usr-guru-budi';

    apiClient
      .saveRecord({
        id,
        kind,
        data,
        updatedAt: now,
        deleted: record.deleted,
        tenantId,
        userId,
      })
      .catch((err) => {
        console.warn('[genericRepo] Gagal menyimpan ke server backend aaPanel:', err);
      });

    notifyDBChange();
    return record;
  },

  async softDelete(id: string): Promise<void> {
    const now = Date.now();
    const existing = await db.records.get(id);
    if (existing) {
      await db.records.update(id, {
        deleted: 1,
        dirty: 0,
        updatedAt: now,
      });
    }

    // Direct Delete ke server aaPanel
    apiClient.deleteRecord(id, true).catch(() => {});
    notifyDBChange();
  },

  async hardDelete(id: string): Promise<void> {
    await db.records.delete(id);
    apiClient.deleteRecord(id, false).catch(() => {});
    notifyDBChange();
  },

  async countByKind(kind: string): Promise<number> {
    const auth = useAuthStore.getState();
    const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';

    const serverCount = await apiClient.countRecords(kind, tenantId);
    if (typeof serverCount === 'number') {
      return serverCount;
    }

    return await db.records
      .where('kind')
      .equals(kind)
      .filter((r) => r.deleted === 0)
      .count();
  },

  async exportAll(): Promise<GenericRecord[]> {
    return await db.records.toArray();
  },

  async findDirty(): Promise<GenericRecord[]> {
    return await db.records.where('dirty').equals(1).toArray();
  },

  async markAllDirty(): Promise<number> {
    const all = await db.records.toArray();
    await db.transaction('rw', db.records, async () => {
      for (const rec of all) {
        await db.records.update(rec.id, { dirty: 1 });
      }
    });
    return all.length;
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.transaction('rw', db.records, async () => {
      for (const id of ids) {
        await db.records.update(id, { dirty: 0 });
      }
    });
  },

  async upsertFromCloud(incoming: GenericRecord[]): Promise<number> {
    let appliedCount = 0;
    await db.transaction('rw', db.records, async () => {
      for (const rec of incoming) {
        const existing = await db.records.get(rec.id);
        // Terapkan Last-Write-Wins: hanya perbarui jika data lokal tidak lebih baru
        if (!existing || rec.updatedAt >= existing.updatedAt) {
          await db.records.put({
            ...rec,
            dirty: 0, // data dari cloud berstatus bersih (synced)
          });
          appliedCount++;
        }
      }
    });
    return appliedCount;
  },

  async importAll(records: GenericRecord[], overwrite = true): Promise<void> {
    await db.transaction('rw', db.records, async () => {
      if (overwrite) {
        await db.records.clear();
      }
      await db.records.bulkPut(records);
    });
  },

  async clearDatabase(): Promise<void> {
    await db.records.clear();
  },
};
