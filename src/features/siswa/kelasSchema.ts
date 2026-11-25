import { z } from 'zod';

export const KelasSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Nama/label kelas tidak boleh kosong'),
  tingkat: z.string().optional().default(''),
  rombel: z.string().optional().default(''),
  keterangan: z.string().optional().default(''),
});

export type KelasData = z.infer<typeof KelasSchema>;
