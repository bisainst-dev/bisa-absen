import { genericRepo } from '../../db/dexie';
import { KelasSchema, type KelasData } from './kelasSchema';
import { v4 as uuidv4 } from 'uuid';

export const kelasRepo = {
  async getAll(): Promise<KelasData[]> {
    const records = await genericRepo.findByKind<KelasData>('kelas', false);
    return records.map((r) => KelasSchema.parse(r.data));
  },

  async getById(id: string): Promise<KelasData | undefined> {
    const rec = await genericRepo.getById<KelasData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return KelasSchema.parse(rec.data);
  },

  async create(data: Omit<KelasData, 'id'> & { id?: string }): Promise<KelasData> {
    const id = data.id || uuidv4();
    const validated = KelasSchema.parse({ ...data, id });
    await genericRepo.upsert<KelasData>('kelas', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<KelasData>): Promise<KelasData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Kelas tidak ditemukan');
    const merged = { ...existing, ...data };
    const validated = KelasSchema.parse(merged);
    await genericRepo.upsert<KelasData>('kelas', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
