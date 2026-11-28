import Dexie, { type Table } from 'dexie';
import type { GenericRecord } from '../types/database';
import { getSupabase } from '../lib/supabaseClient';
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
 * Direct Cloud First: Jika Supabase terhubung, baca & tulis langsung ke Supabase Cloud
 * sehingga seluruh browser dan perangkat selalu memiliki data yang 100% sama seketika.
 * Dexie tetap diperbarui di latar belakang sebagai cache lokal cepat & fallback saat offline.
 */
export const genericRepo = {
  async findByKind<T>(kind: string, includeDeleted = false): Promise<GenericRecord<T>[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const auth = useAuthStore.getState();
        const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';

        let q = supabase.from('records').select('*').eq('kind', kind);
        if (!includeDeleted) {
          q = q.eq('deleted', 0);
        }
        if (tenantId) {
          q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        }

        const { data, error } = await q.order('updated_at', { ascending: false });
        if (!error && data) {
          const cloudRecords: GenericRecord<T>[] = data.map((row) => ({
            id: row.id,
            kind: row.kind,
            data: row.data as T,
            updatedAt: Number(row.updated_at),
            deleted: (row.deleted ?? 0) as 0 | 1,
            dirty: 0,
          }));

          // Sinkronkan ke cache Dexie di latar belakang
          try {
            await db.records.bulkPut(cloudRecords as GenericRecord[]);
          } catch {}

          return cloudRecords;
        }
      } catch (err) {
        console.warn('[genericRepo] Gagal query cloud Supabase, beralih ke cache lokal:', err);
      }
    }

    // Fallback ke cache Dexie lokal
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
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('records').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          const cloudRec: GenericRecord<T> = {
            id: data.id,
            kind: data.kind,
            data: data.data as T,
            updatedAt: Number(data.updated_at),
            deleted: (data.deleted ?? 0) as 0 | 1,
            dirty: 0,
          };
          try {
            await db.records.put(cloudRec as GenericRecord);
          } catch {}
          return cloudRec;
        }
      } catch (err) {
        console.warn('[genericRepo] Gagal getById dari Supabase:', err);
      }
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

    // 2. Simpan LANGSUNG ke Database Cloud Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const auth = useAuthStore.getState();
        const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';
        const userId = auth.user?.id || 'usr-guru-budi';

        await supabase.from('records').upsert(
          {
            id,
            tenant_id: tenantId,
            user_id: userId,
            kind,
            data: data as Record<string, unknown>,
            updated_at: now,
            deleted: record.deleted,
          },
          { onConflict: 'id' }
        );
      } catch (err) {
        console.warn('[genericRepo] Gagal langsung menulis ke Supabase:', err);
      }
    }

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

    // Direct Cloud Update ke Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('records')
          .update({
            deleted: 1,
            updated_at: now,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('[genericRepo] Gagal softDelete di Supabase:', err);
      }
    }

    notifyDBChange();
  },

  async hardDelete(id: string): Promise<void> {
    await db.records.delete(id);

    // Direct Cloud Delete di Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('records').delete().eq('id', id);
      } catch (err) {
        console.warn('[genericRepo] Gagal hardDelete di Supabase:', err);
      }
    }

    notifyDBChange();
  },

  async countByKind(kind: string): Promise<number> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const auth = useAuthStore.getState();
        const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';

        let q = supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .eq('kind', kind)
          .eq('deleted', 0);

        if (tenantId) {
          q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        }

        const { count, error } = await q;
        if (!error && typeof count === 'number') {
          return count;
        }
      } catch {}
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
