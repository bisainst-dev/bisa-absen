import { z } from 'zod';
import { StatusKehadiranEnum, type StatusKehadiran } from '../absensi/absensiSchema';

export const KegiatanSchema = z.object({
  id: z.string(),
  nama: z.string().min(1, 'Nama kegiatan tidak boleh kosong'),
  jenis: z.enum(['Ekstrakurikuler', 'Les', 'Klub']).default('Ekstrakurikuler'),
  jadwalDeskripsi: z.string().optional().default(''),
  pembimbing: z.string().optional().default(''),
});

export type KegiatanData = z.infer<typeof KegiatanSchema>;

export const AnggotaKegiatanSchema = z.object({
  id: z.string(),
  kegiatanId: z.string(),
  siswaId: z.string(),
  tanggalGabung: z.string().optional().default(''),
});

export type AnggotaKegiatanData = z.infer<typeof AnggotaKegiatanSchema>;

export const JurnalKegiatanSchema = z.object({
  id: z.string(),
  kegiatanId: z.string(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  ringkasan: z.string().min(1, 'Ringkasan kegiatan tidak boleh kosong'),
  catatan: z.string().optional().default(''),
});

export type JurnalKegiatanData = z.infer<typeof JurnalKegiatanSchema>;

export const AbsensiKegiatanSchema = z.object({
  id: z.string(),
  kegiatanId: z.string(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  entri: z.array(
    z.object({
      siswaId: z.string(),
      status: StatusKehadiranEnum,
    })
  ),
});

export type AbsensiKegiatanData = z.infer<typeof AbsensiKegiatanSchema>;
export type { StatusKehadiran };
