import { genericRepo } from '../../db/dexie';
import { ProfilSchema, type ProfilData, DEFAULT_PROFIL } from './schema';
import { getAutoTahunPelajaran, getAutoSemester } from '../../lib/academicYear';

const PROFIL_ID = 'profil_primary';

export const profilRepo = {
  async getProfil(): Promise<ProfilData> {
    const record = await genericRepo.getById<ProfilData>(PROFIL_ID);
    if (!record || record.deleted === 1) {
      // Periksa apakah ada record profil lain
      const all = await genericRepo.findByKind<ProfilData>('profil');
      if (all.length > 0 && all[0].data) {
        return ProfilSchema.parse(all[0].data);
      }
      return {
        ...DEFAULT_PROFIL,
        tahunPelajaran: getAutoTahunPelajaran(),
        semester: getAutoSemester(),
      };
    }
    return ProfilSchema.parse(record.data);
  },

  async saveProfil(data: Partial<ProfilData>): Promise<ProfilData> {
    const current = await this.getProfil();
    const merged = { ...current, ...data };
    const validated = ProfilSchema.parse(merged);
    await genericRepo.upsert<ProfilData>('profil', PROFIL_ID, validated);
    return validated;
  },

  async isConfigured(): Promise<boolean> {
    const profil = await this.getProfil();
    return Boolean(profil.isOnboarded && profil.namaGuru && profil.sekolah);
  },

  async resetProfil(): Promise<void> {
    await genericRepo.softDelete(PROFIL_ID);
  },
};
