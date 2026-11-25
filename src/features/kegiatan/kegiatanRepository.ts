import { genericRepo } from '../../db/dexie';
import {
  KegiatanSchema,
  AnggotaKegiatanSchema,
  JurnalKegiatanSchema,
  AbsensiKegiatanSchema,
  type KegiatanData,
  type AnggotaKegiatanData,
  type JurnalKegiatanData,
  type AbsensiKegiatanData,
  type StatusKehadiran,
} from './kegiatanSchema';
import { v4 as uuidv4 } from 'uuid';

export const kegiatanRepo = {
  // --- KEGIATAN CRUD ---
  async getAllKegiatan(): Promise<KegiatanData[]> {
    const records = await genericRepo.findByKind<KegiatanData>('kegiatan', false);
    return records
      .map((r) => KegiatanSchema.parse(r.data))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID'));
  },

  async getKegiatanById(id: string): Promise<KegiatanData | undefined> {
    const rec = await genericRepo.getById<KegiatanData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return KegiatanSchema.parse(rec.data);
  },

  async createKegiatan(data: Omit<KegiatanData, 'id'> & { id?: string }): Promise<KegiatanData> {
    const id = data.id || uuidv4();
    const validated = KegiatanSchema.parse({ ...data, id });
    await genericRepo.upsert<KegiatanData>('kegiatan', id, validated);
    return validated;
  },

  async updateKegiatan(id: string, data: Partial<KegiatanData>): Promise<KegiatanData> {
    const existing = await this.getKegiatanById(id);
    if (!existing) throw new Error('Kegiatan tidak ditemukan');
    const validated = KegiatanSchema.parse({ ...existing, ...data });
    await genericRepo.upsert<KegiatanData>('kegiatan', id, validated);
    return validated;
  },

  async deleteKegiatan(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },

  // --- ANGGOTA KEGIATAN LINTAS KELAS ---
  async getAnggotaByKegiatan(kegiatanId: string): Promise<AnggotaKegiatanData[]> {
    const records = await genericRepo.findByKind<AnggotaKegiatanData>('anggotaKegiatan', false);
    return records
      .map((r) => AnggotaKegiatanSchema.parse(r.data))
      .filter((a) => a.kegiatanId === kegiatanId);
  },

  async setAnggota(kegiatanId: string, siswaIds: string[]): Promise<void> {
    const current = await this.getAnggotaByKegiatan(kegiatanId);
    const currentSiswaMap = new Map<string, string>(); // siswaId -> recordId
    for (const c of current) {
      currentSiswaMap.set(c.siswaId, c.id);
    }

    const newSet = new Set(siswaIds);

    // Hapus yang tidak ada di newSet
    for (const [sId, recId] of currentSiswaMap.entries()) {
      if (!newSet.has(sId)) {
        await genericRepo.softDelete(recId);
      }
    }

    // Tambah yang baru
    const todayStr = new Date().toISOString().split('T')[0];
    for (const sId of siswaIds) {
      if (!currentSiswaMap.has(sId)) {
        const id = uuidv4();
        const data: AnggotaKegiatanData = {
          id,
          kegiatanId,
          siswaId: sId,
          tanggalGabung: todayStr,
        };
        await genericRepo.upsert<AnggotaKegiatanData>('anggotaKegiatan', id, data);
      }
    }
  },

  // --- JURNAL KEGIATAN ---
  async getJurnalByKegiatan(kegiatanId: string): Promise<JurnalKegiatanData[]> {
    const records = await genericRepo.findByKind<JurnalKegiatanData>('jurnalKegiatan', false);
    return records
      .map((r) => JurnalKegiatanSchema.parse(r.data))
      .filter((j) => j.kegiatanId === kegiatanId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  },

  async createJurnal(data: Omit<JurnalKegiatanData, 'id'> & { id?: string }): Promise<JurnalKegiatanData> {
    const id = data.id || uuidv4();
    const validated = JurnalKegiatanSchema.parse({ ...data, id });
    await genericRepo.upsert<JurnalKegiatanData>('jurnalKegiatan', id, validated);
    return validated;
  },

  async deleteJurnal(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },

  // --- ABSENSI KEGIATAN ---
  async getAbsensiSession(kegiatanId: string, tanggal: string): Promise<AbsensiKegiatanData | undefined> {
    const records = await genericRepo.findByKind<AbsensiKegiatanData>('absensiKegiatan', false);
    const found = records
      .map((r) => AbsensiKegiatanSchema.parse(r.data))
      .find((a) => a.kegiatanId === kegiatanId && a.tanggal === tanggal);
    return found;
  },

  async saveAbsensiSession(
    kegiatanId: string,
    tanggal: string,
    entri: Array<{ siswaId: string; status: StatusKehadiran }>
  ): Promise<AbsensiKegiatanData> {
    const existing = await this.getAbsensiSession(kegiatanId, tanggal);
    const id = existing ? existing.id : uuidv4();
    const data: AbsensiKegiatanData = {
      id,
      kegiatanId,
      tanggal,
      entri,
    };
    const validated = AbsensiKegiatanSchema.parse(data);
    await genericRepo.upsert<AbsensiKegiatanData>('absensiKegiatan', id, validated);
    return validated;
  },
};
