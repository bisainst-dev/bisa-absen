import { z } from 'zod';

export const MapelSchema = z.object({
  id: z.string(),
  nama: z.string().min(1, 'Nama mata pelajaran wajib diisi'),
  kode: z.string().optional().default(''),
  kelompok: z.enum(['Umum', 'Peminatan', 'Muatan Lokal', 'Ekstrakurikuler']).default('Umum'),
  createdAt: z.number().default(() => Date.now()),
});

export type MapelData = z.infer<typeof MapelSchema>;

export const DEFAULT_MAPEL_LIST: MapelData[] = [
  { id: 'mapel-1', nama: 'Matematika', kode: 'MTK', kelompok: 'Umum', createdAt: Date.now() - 30 * 86400000 },
  { id: 'mapel-2', nama: 'Bahasa Indonesia', kode: 'BIN', kelompok: 'Umum', createdAt: Date.now() - 28 * 86400000 },
  { id: 'mapel-3', nama: 'Bahasa Inggris', kode: 'BIG', kelompok: 'Umum', createdAt: Date.now() - 26 * 86400000 },
  { id: 'mapel-4', nama: 'IPA Terpadu', kode: 'IPA', kelompok: 'Umum', createdAt: Date.now() - 24 * 86400000 },
  { id: 'mapel-5', nama: 'IPS Terpadu', kode: 'IPS', kelompok: 'Umum', createdAt: Date.now() - 22 * 86400000 },
  { id: 'mapel-6', nama: 'Pendidikan Pancasila / PPKn', kode: 'PPKN', kelompok: 'Umum', createdAt: Date.now() - 20 * 86400000 },
  { id: 'mapel-7', nama: 'Pendidikan Agama & Budi Pekerti', kode: 'PAB', kelompok: 'Umum', createdAt: Date.now() - 18 * 86400000 },
  { id: 'mapel-8', nama: 'PJOK', kode: 'PJOK', kelompok: 'Umum', createdAt: Date.now() - 16 * 86400000 },
  { id: 'mapel-9', nama: 'Seni Budaya', kode: 'SBD', kelompok: 'Umum', createdAt: Date.now() - 14 * 86400000 },
  { id: 'mapel-10', nama: 'Informatika', kode: 'INF', kelompok: 'Umum', createdAt: Date.now() - 12 * 86400000 },
  { id: 'mapel-11', nama: 'Prakarya', kode: 'PKY', kelompok: 'Umum', createdAt: Date.now() - 10 * 86400000 },
  { id: 'mapel-12', nama: 'Bahasa Daerah / Mulok', kode: 'MLK', kelompok: 'Muatan Lokal', createdAt: Date.now() - 8 * 86400000 },
];
