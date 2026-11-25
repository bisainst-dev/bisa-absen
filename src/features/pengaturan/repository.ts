import { genericRepo } from '../../db/dexie';
import { PengaturanSchema, type PengaturanData, DEFAULT_PENGATURAN } from './schema';

const PENGATURAN_ID = 'pengaturan_primary';

export const pengaturanRepo = {
  async getPengaturan(): Promise<PengaturanData> {
    const record = await genericRepo.getById<PengaturanData>(PENGATURAN_ID);
    if (!record || record.deleted === 1) {
      const all = await genericRepo.findByKind<PengaturanData>('pengaturan');
      if (all.length > 0 && all[0].data) {
        return PengaturanSchema.parse(all[0].data);
      }
      return DEFAULT_PENGATURAN;
    }
    return PengaturanSchema.parse(record.data);
  },

  async savePengaturan(data: Partial<PengaturanData>): Promise<PengaturanData> {
    const current = await this.getPengaturan();
    const merged = { ...current, ...data };
    const validated = PengaturanSchema.parse(merged);
    await genericRepo.upsert<PengaturanData>('pengaturan', PENGATURAN_ID, validated);
    return validated;
  },

  async updateLastBackup(): Promise<void> {
    await this.savePengaturan({ lastBackupDate: Date.now() });
  },
};
