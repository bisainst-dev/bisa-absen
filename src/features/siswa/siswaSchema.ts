import { z } from 'zod';

export const JenisKelaminEnum = z.enum(['L', 'P'], {
  errorMap: () => ({ message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan)' }),
});

export type JenisKelamin = z.infer<typeof JenisKelaminEnum>;

export const SiswaSchema = z.object({
  id: z.string(),
  nama: z.string().min(1, 'Nama siswa tidak boleh kosong'),
  jenisKelamin: JenisKelaminEnum,
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  nis: z.string().optional().default(''),
  nisn: z.string().optional().default(''),
});

export type SiswaData = z.infer<typeof SiswaSchema>;
