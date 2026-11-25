import { z } from 'zod';

export const PengaturanSchema = z.object({
  tema: z.enum(['light', 'dark', 'system']).default('system'),
  pengingatAktif: z.boolean().default(true),
  suaraPengingat: z.boolean().default(true),
  suaraTts: z.boolean().default(true),
  jamSenyapAktif: z.boolean().default(false),
  jamSenyapMulai: z.string().default('21:00'),
  jamSenyapSelesai: z.string().default('06:00'),
  snoozeDurasiMenit: z.number().default(5),
  tampilkanKreditDokumen: z.boolean().default(true),
  lastBackupDate: z.number().nullable().default(null),
});

export type PengaturanData = z.infer<typeof PengaturanSchema>;

export const DEFAULT_PENGATURAN: PengaturanData = {
  tema: 'system',
  pengingatAktif: true,
  suaraPengingat: true,
  suaraTts: true,
  jamSenyapAktif: false,
  jamSenyapMulai: '21:00',
  jamSenyapSelesai: '06:00',
  snoozeDurasiMenit: 5,
  tampilkanKreditDokumen: true,
  lastBackupDate: null,
};
