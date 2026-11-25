import { genericRepo } from '../../db/dexie';
import { AbsensiSchema, type AbsensiData, type EntriAbsensi } from './absensiSchema';
import { v4 as uuidv4 } from 'uuid';

export const absensiRepo = {
  async getAll(): Promise<AbsensiData[]> {
    const records = await genericRepo.findByKind<AbsensiData>('absensi', false);
    return records
      .map((r) => AbsensiSchema.parse(r.data))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  },

  async getByKelas(kelasId: string): Promise<AbsensiData[]> {
    const all = await this.getAll();
    return all.filter((a) => a.kelasId === kelasId);
  },

  async getByDate(tanggal: string): Promise<AbsensiData[]> {
    const all = await this.getAll();
    return all.filter((a) => a.tanggal === tanggal);
  },

  async findSession(
    tanggal: string,
    kelasId: string,
    mapel: string
  ): Promise<AbsensiData | undefined> {
    const all = await this.getAll();
    return all.find(
      (a) =>
        a.tanggal === tanggal &&
        a.kelasId === kelasId &&
        a.mapel.toLowerCase() === mapel.toLowerCase()
    );
  },

  async saveSession(
    tanggal: string,
    kelasId: string,
    mapel: string,
    entri: EntriAbsensi[],
    catatan = ''
  ): Promise<AbsensiData> {
    const existing = await this.findSession(tanggal, kelasId, mapel);
    const id = existing ? existing.id : uuidv4();
    const data: AbsensiData = {
      id,
      tanggal,
      kelasId,
      mapel,
      entri,
      catatan,
    };
    const validated = AbsensiSchema.parse(data);
    await genericRepo.upsert<AbsensiData>('absensi', id, validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
