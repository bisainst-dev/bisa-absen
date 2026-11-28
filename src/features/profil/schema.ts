import { z } from 'zod';

export const ProfilSchema = z.object({
  namaPanggilan: z.string().min(1, 'Nama panggilan tidak boleh kosong'),
  namaGuru: z.string().min(1, 'Nama lengkap guru tidak boleh kosong'),
  nip: z.string().optional().default(''),
  sekolah: z.string().min(1, 'Nama sekolah tidak boleh kosong'),
  mapel: z.array(z.string()).min(1, 'Pilih atau masukkan minimal 1 mata pelajaran'),
  kelasDiampu: z.array(z.string()).min(1, 'Masukkan minimal 1 kelas yang diampu'),
  tahunPelajaran: z.string().min(1, 'Tahun pelajaran wajib diisi'),
  semester: z.enum(['Ganjil', 'Genap']).default('Ganjil'),
  kepalaSekolah: z.string().optional().default(''),
  nipKepsek: z.string().optional().default(''),
  tampilkanKredit: z.boolean().default(true),
  isOnboarded: z.boolean().default(false),
});

export type ProfilData = z.infer<typeof ProfilSchema>;

export const DEFAULT_PROFIL: ProfilData = {
  namaPanggilan: '',
  namaGuru: '',
  nip: '',
  sekolah: 'SMP Negeri 2 Tanjung',
  mapel: [],
  kelasDiampu: [],
  tahunPelajaran: '',
  semester: 'Ganjil',
  kepalaSekolah: 'Dr. Hj. Siti Fatimah, M.Pd.',
  nipKepsek: '197208151998032004',
  tampilkanKredit: true,
  isOnboarded: false,
};
