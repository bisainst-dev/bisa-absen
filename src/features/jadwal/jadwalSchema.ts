import { z } from 'zod';

export const JadwalSchema = z.object({
  id: z.string(),
  hari: z.number().min(1).max(7), // 1 = Senin, 7 = Minggu
  jamMulai: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Format jam mulai harus HH:mm'),
  jamSelesai: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Format jam selesai harus HH:mm'),
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  mapel: z.string().min(1, 'Mata pelajaran wajib diisi'),
  pengingat: z
    .object({
      aktif: z.boolean().default(true),
      menitSebelum: z.number().default(10),
    })
    .default({ aktif: true, menitSebelum: 10 }),
});

export type JadwalData = z.infer<typeof JadwalSchema>;

export const NAMA_HARI: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};
