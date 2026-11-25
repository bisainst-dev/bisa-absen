import { genericRepo } from '../../db/dexie';
import { SiswaSchema, type SiswaData } from './siswaSchema';
import { v4 as uuidv4 } from 'uuid';

export type CreateSiswaInput = {
  id?: string;
  nama: string;
  jenisKelamin: SiswaData['jenisKelamin'];
  kelasId: string;
  nis?: string;
  nisn?: string;
};

export const siswaRepo = {
  async getAll(): Promise<SiswaData[]> {
    const records = await genericRepo.findByKind<SiswaData>('siswa', false);
    return records
      .map((r) => SiswaSchema.parse(r.data))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID'));
  },

  async getByKelasId(kelasId: string): Promise<SiswaData[]> {
    const all = await this.getAll();
    return all.filter((s) => s.kelasId === kelasId);
  },

  async getById(id: string): Promise<SiswaData | undefined> {
    const rec = await genericRepo.getById<SiswaData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return SiswaSchema.parse(rec.data);
  },

  async create(data: CreateSiswaInput): Promise<SiswaData> {
    const id = data.id || uuidv4();
    const validated = SiswaSchema.parse({
      ...data,
      id,
      nama: data.nama.trim(),
      nis: data.nis || '',
      nisn: data.nisn || '',
    });
    await genericRepo.upsert<SiswaData>('siswa', id, validated);
    return validated;
  },

  async bulkCreate(items: CreateSiswaInput[]): Promise<SiswaData[]> {
    const validatedList: SiswaData[] = [];
    for (const item of items) {
      const id = item.id || uuidv4();
      const validated = SiswaSchema.parse({
        ...item,
        id,
        nama: item.nama.trim(),
        nis: item.nis || '',
        nisn: item.nisn || '',
      });
      validatedList.push(validated);
      await genericRepo.upsert<SiswaData>('siswa', id, validated);
    }
    return validatedList;
  },

  async update(id: string, data: Partial<SiswaData>): Promise<SiswaData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Data siswa tidak ditemukan');
    const merged = {
      ...existing,
      ...data,
      nama: data.nama !== undefined ? data.nama.trim() : existing.nama,
    };
    const validated = SiswaSchema.parse(merged);
    await genericRepo.upsert<SiswaData>('siswa', id, validated);
    return validated;
  },

  async moveToClass(siswaId: string, newKelasId: string): Promise<SiswaData> {
    return await this.update(siswaId, { kelasId: newKelasId });
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },

  async countByKelas(kelasId: string): Promise<number> {
    const list = await this.getByKelasId(kelasId);
    return list.length;
  },
};
