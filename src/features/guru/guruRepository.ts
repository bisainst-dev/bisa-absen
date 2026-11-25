import { genericRepo } from '../../db/dexie';
import { GuruSchema, type GuruData } from './guruSchema';
import { v4 as uuidv4 } from 'uuid';

export type { GuruData };

export const DEFAULT_GURU_LIST: GuruData[] = [
  {
    id: 'guru-1',
    nama: 'Budi Santoso, S.Pd.',
    nip: '198205122008011005',
    email: 'budi.santoso@sekolah.sch.id',
    mapel: 'Matematika',
    kelas: 'Kelas 7A, Kelas 8A',
    telepon: '081234567890',
    status: 'Aktif',
    createdAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'guru-2',
    nama: 'Ratna Wulandari, M.Pd.',
    nip: '198603182010012014',
    email: 'ratna.w@sekolah.sch.id',
    mapel: 'Bahasa Indonesia',
    kelas: 'Kelas 7B, Kelas 8B',
    telepon: '081398765432',
    status: 'Aktif',
    createdAt: Date.now() - 25 * 86400000,
  },
  {
    id: 'guru-3',
    nama: 'Ahmad Fauzi, S.Si.',
    nip: '198907222014021003',
    email: 'ahmad.fauzi@sekolah.sch.id',
    mapel: 'IPA Terpadu',
    kelas: 'Kelas 8A, Kelas 9A',
    telepon: '085712345678',
    status: 'Aktif',
    createdAt: Date.now() - 20 * 86400000,
  },
  {
    id: 'guru-4',
    nama: 'Dewi Anggraeni, S.Pd.',
    nip: '199102142016032001',
    email: 'dewi.anggraeni@sekolah.sch.id',
    mapel: 'Bahasa Inggris',
    kelas: 'Kelas 7A, Kelas 9B',
    telepon: '081987654321',
    status: 'Aktif',
    createdAt: Date.now() - 15 * 86400000,
  },
];

export const guruRepo = {
  async getAll(): Promise<GuruData[]> {
    const records = await genericRepo.findByKind<GuruData>('guru', false);
    if (records.length === 0) {
      for (const item of DEFAULT_GURU_LIST) {
        await genericRepo.upsert<GuruData>('guru', item.id, item);
      }
      return DEFAULT_GURU_LIST;
    }
    return records.map((r) => GuruSchema.parse(r.data));
  },

  async getById(id: string): Promise<GuruData | undefined> {
    const rec = await genericRepo.getById<GuruData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return GuruSchema.parse(rec.data);
  },

  async create(data: Omit<GuruData, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<GuruData> {
    const id = data.id || uuidv4();
    const createdAt = data.createdAt || Date.now();
    const validated = GuruSchema.parse({ ...data, id, createdAt });
    await genericRepo.upsert<GuruData>('guru', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<GuruData>): Promise<GuruData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Data guru tidak ditemukan');
    const merged = { ...existing, ...data };
    const validated = GuruSchema.parse(merged);
    await genericRepo.upsert<GuruData>('guru', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
