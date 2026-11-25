import { genericRepo } from '../../db/dexie';
import { JurnalSchema, type JurnalData } from './jurnalSchema';
import { v4 as uuidv4 } from 'uuid';

export type CreateJurnalInput = {
  id?: string;
  tanggal: string;
  kelasId: string;
  mapel: string;
  materi: string;
  catatanPertemuanBerikutnya?: string;
  pengingat?: string;
  pertemuanKe?: number;
};

export const jurnalRepo = {
  async getAll(): Promise<JurnalData[]> {
    const records = await genericRepo.findByKind<JurnalData>('jurnal', false);
    return records
      .map((r) => JurnalSchema.parse(r.data))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  },

  async getByKelas(kelasId: string): Promise<JurnalData[]> {
    const all = await this.getAll();
    return all.filter((j) => j.kelasId === kelasId);
  },

  async getByDate(tanggal: string): Promise<JurnalData[]> {
    const all = await this.getAll();
    return all.filter((j) => j.tanggal === tanggal);
  },

  async getById(id: string): Promise<JurnalData | undefined> {
    const rec = await genericRepo.getById<JurnalData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return JurnalSchema.parse(rec.data);
  },

  async create(data: CreateJurnalInput): Promise<JurnalData> {
    const id = data.id || uuidv4();
    const validated = JurnalSchema.parse({
      ...data,
      id,
      materi: data.materi.trim(),
      catatanPertemuanBerikutnya: (data.catatanPertemuanBerikutnya || '').trim(),
      pengingat: (data.pengingat || '').trim(),
    });
    await genericRepo.upsert<JurnalData>('jurnal', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<CreateJurnalInput>): Promise<JurnalData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Jurnal tidak ditemukan');
    const merged = {
      ...existing,
      ...data,
      materi: data.materi !== undefined ? data.materi.trim() : existing.materi,
      catatanPertemuanBerikutnya:
        data.catatanPertemuanBerikutnya !== undefined
          ? data.catatanPertemuanBerikutnya.trim()
          : existing.catatanPertemuanBerikutnya,
      pengingat:
        data.pengingat !== undefined ? data.pengingat.trim() : existing.pengingat,
    };
    const validated = JurnalSchema.parse(merged);
    await genericRepo.upsert<JurnalData>('jurnal', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
