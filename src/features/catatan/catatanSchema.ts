import { z } from 'zod';

export const UlangiEnum = z.enum(['sekali', 'harian', 'mingguan']);
export type UlangiPengingat = z.infer<typeof UlangiEnum>;

export const CatatanSchema = z.object({
  id: z.string(),
  judul: z.string().min(1, 'Judul catatan tidak boleh kosong'),
  teks: z.string().optional().default(''),
  waktu: z.string().min(1, 'Waktu catatan wajib ditentukan'),
  ulangi: UlangiEnum.default('sekali'),
  selesai: z.boolean().default(false),
  prioritas: z.enum(['normal', 'penting']).default('normal'),
});

export type CatatanData = z.infer<typeof CatatanSchema>;
