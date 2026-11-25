import { z } from 'zod';

export const JurnalSchema = z.object({
  id: z.string(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  mapel: z.string().min(1, 'Mata pelajaran wajib diisi'),
  materi: z.string().min(1, 'Materi pembelajaran tidak boleh kosong'),
  catatanPertemuanBerikutnya: z.string().optional().default(''),
  pengingat: z.string().optional().default(''), // pesan pengingat untuk pertemuan selanjutnya
  pertemuanKe: z.number().optional().default(1),
});

export type JurnalData = z.infer<typeof JurnalSchema>;
