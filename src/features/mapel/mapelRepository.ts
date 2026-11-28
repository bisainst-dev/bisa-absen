import { genericRepo } from '../../db/dexie';
import { MapelSchema, type MapelData, DEFAULT_MAPEL_LIST } from './mapelSchema';
import { v4 as uuidv4 } from 'uuid';

export type { MapelData };

export const mapelRepo = {
  async getAll(): Promise<MapelData[]> {
    const records = await genericRepo.findByKind<MapelData>('mapel', false);
    if (records.length === 0) {
      for (const item of DEFAULT_MAPEL_LIST) {
        await genericRepo.upsert<MapelData>('mapel', item.id, item);
      }
      return DEFAULT_MAPEL_LIST;
    }
    return records.map((r) => MapelSchema.parse(r.data));
  },

  async getById(id: string): Promise<MapelData | undefined> {
    const rec = await genericRepo.getById<MapelData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return MapelSchema.parse(rec.data);
  },

  async create(data: Omit<MapelData, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<MapelData> {
    const id = data.id || `mapel-${uuidv4()}`;
    const createdAt = data.createdAt || Date.now();
    const validated = MapelSchema.parse({ ...data, id, createdAt });
    await genericRepo.upsert<MapelData>('mapel', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<MapelData>): Promise<MapelData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Data mata pelajaran tidak ditemukan');
    const merged = { ...existing, ...data };
    const validated = MapelSchema.parse(merged);
    await genericRepo.upsert<MapelData>('mapel', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
