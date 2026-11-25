import Dexie, { type Table } from 'dexie';
import type { GenericRecord } from '../types/database';

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

/**
 * Repository generik untuk tabel records
 */
export const genericRepo = {
  async findByKind<T>(kind: string, includeDeleted = false): Promise<GenericRecord<T>[]> {
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
      dirty: options.dirty ?? 1,
    };
    await db.records.put(record as GenericRecord);
    return record;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await db.records.get(id);
    if (existing) {
      await db.records.update(id, {
        deleted: 1,
        dirty: 1,
        updatedAt: Date.now(),
      });
    }
  },

  async hardDelete(id: string): Promise<void> {
    await db.records.delete(id);
  },

  async countByKind(kind: string): Promise<number> {
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
