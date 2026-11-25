import { genericRepo } from '../../db/dexie';
import { CatatanSchema, type CatatanData } from './catatanSchema';
import { v4 as uuidv4 } from 'uuid';

export const catatanRepo = {
  async getAll(): Promise<CatatanData[]> {
    const records = await genericRepo.findByKind<CatatanData>('catatan', false);
    return records
      .map((r) => CatatanSchema.parse(r.data))
      .sort((a, b) => {
        // Yang belum selesai di atas
        if (a.selesai !== b.selesai) return a.selesai ? 1 : -1;
        return b.waktu.localeCompare(a.waktu);
      });
  },

  async getById(id: string): Promise<CatatanData | undefined> {
    const rec = await genericRepo.getById<CatatanData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return CatatanSchema.parse(rec.data);
  },

  async create(data: Omit<CatatanData, 'id'> & { id?: string }): Promise<CatatanData> {
    const id = data.id || uuidv4();
    const validated = CatatanSchema.parse({ ...data, id });
    await genericRepo.upsert<CatatanData>('catatan', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<CatatanData>): Promise<CatatanData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Catatan tidak ditemukan');
    const validated = CatatanSchema.parse({ ...existing, ...data });
    await genericRepo.upsert<CatatanData>('catatan', id, validated);
    return validated;
  },

  async toggleSelesai(id: string): Promise<CatatanData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Catatan tidak ditemukan');
    return await this.update(id, { selesai: !existing.selesai });
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
