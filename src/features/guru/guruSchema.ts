import { z } from 'zod';

export const GuruSchema = z.object({
  id: z.string(),
  nama: z.string().min(1, 'Nama lengkap guru tidak boleh kosong'),
  nip: z.string().optional().default(''),
  email: z.string().min(1, 'Email tidak boleh kosong'),
  mapel: z.string().min(1, 'Mata pelajaran wajib diisi'),
  kelas: z.string().min(1, 'Kelas yang diampu wajib diisi'),
  telepon: z.string().optional().default(''),
  status: z.enum(['Aktif', 'Cuti', 'Nonaktif']).default('Aktif'),
  createdAt: z.number().default(() => Date.now()),
});

export type GuruData = z.infer<typeof GuruSchema>;
