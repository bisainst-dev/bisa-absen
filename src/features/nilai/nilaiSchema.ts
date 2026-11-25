import { z } from 'zod';

export const JenisNilaiEnum = z.enum(['Tugas', 'PH']);
export type JenisNilai = z.infer<typeof JenisNilaiEnum>;

export const EntriNilaiSiswaSchema = z.object({
  siswaId: z.string(),
  nilai: z.number().min(0).max(100).nullable(),
});

export type EntriNilaiSiswa = z.infer<typeof EntriNilaiSiswaSchema>;

export const NilaiSchema = z.object({
  id: z.string(),
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  mapel: z.string().min(1, 'Mata pelajaran wajib diisi'),
  semester: z.enum(['Ganjil', 'Genap']),
  tahunPelajaran: z.string().min(1, 'Tahun pelajaran wajib diisi'),
  jenis: JenisNilaiEnum,
  kode: z.string().min(1, 'Kode penilaian wajib diisi (misal T1 atau PH1)'),
  judul: z.string().optional().default(''), // keterangan misal: "Tugas Pecahan"
  entri: z.array(EntriNilaiSiswaSchema),
});

export type NilaiData = z.infer<typeof NilaiSchema>;

/**
 * Menghitung rata-rata nilai siswa dari daftar nilai angka yang valid
 */
export function hitungRataRataSiswa(nilaiList: (number | null | undefined)[]): number | null {
  const validNumbers = nilaiList.filter((n): n is number => typeof n === 'number' && !isNaN(n));
  if (validNumbers.length === 0) return null;
  const sum = validNumbers.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / validNumbers.length).toFixed(1));
}

/**
 * Menghitung rata-rata kelas dari array rata-rata siswa
 */
export function hitungRataRataKelas(rataRataSiswaList: (number | null)[]): number | null {
  const valid = rataRataSiswaList.filter((r): r is number => typeof r === 'number' && !isNaN(r));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / valid.length).toFixed(1));
}
