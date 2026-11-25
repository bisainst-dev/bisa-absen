import { genericRepo } from '../../db/dexie';
import { JadwalSchema, type JadwalData } from './jadwalSchema';
import { v4 as uuidv4 } from 'uuid';

export type CreateJadwalInput = {
  id?: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  kelasId: string;
  mapel: string;
  pengingat?: {
    aktif: boolean;
    menitSebelum: number;
  };
};

export const jadwalRepo = {
  async getAll(): Promise<JadwalData[]> {
    const records = await genericRepo.findByKind<JadwalData>('jadwal', false);
    return records
      .map((r) => JadwalSchema.parse(r.data))
      .sort((a, b) => {
        if (a.hari !== b.hari) return a.hari - b.hari;
        return a.jamMulai.localeCompare(b.jamMulai);
      });
  },

  async getByHari(hari: number): Promise<JadwalData[]> {
    const all = await this.getAll();
    return all.filter((j) => j.hari === hari);
  },

  async getById(id: string): Promise<JadwalData | undefined> {
    const rec = await genericRepo.getById<JadwalData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return JadwalSchema.parse(rec.data);
  },

  async create(data: CreateJadwalInput): Promise<JadwalData> {
    const id = data.id || uuidv4();
    const validated = JadwalSchema.parse({
      ...data,
      id,
      pengingat: data.pengingat || { aktif: true, menitSebelum: 10 },
    });
    await genericRepo.upsert<JadwalData>('jadwal', id, validated);
    return validated;
  },

  async update(id: string, data: Partial<CreateJadwalInput>): Promise<JadwalData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Jadwal tidak ditemukan');
    const merged = {
      ...existing,
      ...data,
      pengingat: data.pengingat || existing.pengingat,
    };
    const validated = JadwalSchema.parse(merged);
    await genericRepo.upsert<JadwalData>('jadwal', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },

  /**
   * Salin jadwal dari satu hari ke hari lain.
   * Aturan bisnis: Tidak menghapus jadwal yang sudah ada di hari tujuan.
   */
  async copyDaySchedule(sourceHari: number, targetHari: number): Promise<JadwalData[]> {
    if (sourceHari === targetHari) return [];
    const sourceItems = await this.getByHari(sourceHari);
    if (sourceItems.length === 0) return [];

    const createdList: JadwalData[] = [];
    for (const item of sourceItems) {
      const newId = uuidv4();
      const validated = JadwalSchema.parse({
        ...item,
        id: newId,
        hari: targetHari,
      });
      await genericRepo.upsert<JadwalData>('jadwal', newId, validated);
      createdList.push(validated);
    }
    return createdList;
  },
};
