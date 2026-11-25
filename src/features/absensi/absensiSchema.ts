import { z } from 'zod';

export const StatusKehadiranEnum = z.enum(['H', 'S', 'I', 'A']);
export type StatusKehadiran = z.infer<typeof StatusKehadiranEnum>;

export const EntriAbsensiSchema = z.object({
  siswaId: z.string(),
  status: StatusKehadiranEnum,
});

export type EntriAbsensi = z.infer<typeof EntriAbsensiSchema>;

export const AbsensiSchema = z.object({
  id: z.string(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  mapel: z.string().min(1, 'Mata pelajaran wajib diisi'),
  entri: z.array(EntriAbsensiSchema),
  catatan: z.string().optional().default(''),
});

export type AbsensiData = z.infer<typeof AbsensiSchema>;

export const STATUS_META: Record<
  StatusKehadiran,
  { label: string; badgeClass: string; textClass: string; bgClass: string }
> = {
  H: {
    label: 'Hadir',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500',
  },
  S: {
    label: 'Sakit',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500',
  },
  I: {
    label: 'Izin',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    textClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-500',
  },
  A: {
    label: 'Alfa',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-500',
  },
};

/**
 * Siklus status berikutnya saat nama siswa diketuk
 * H -> S -> I -> A -> H
 */
export function getNextStatus(current?: StatusKehadiran): StatusKehadiran {
  switch (current) {
    case 'H':
      return 'S';
    case 'S':
      return 'I';
    case 'I':
      return 'A';
    case 'A':
      return 'H';
    default:
      return 'H';
  }
}

export interface RekapKehadiran {
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  persenHadir: number;
}

/**
 * Menghitung rekap H, S, I, A dan persentase hadir
 */
export function hitungRekapKehadiran(entri: EntriAbsensi[]): RekapKehadiran {
  const total = entri.length;
  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alfa = 0;

  for (const item of entri) {
    if (item.status === 'H') hadir++;
    else if (item.status === 'S') sakit++;
    else if (item.status === 'I') izin++;
    else if (item.status === 'A') alfa++;
  }

  const persenHadir = total > 0 ? Number(((hadir / total) * 100).toFixed(1)) : 0;

  return {
    total,
    hadir,
    sakit,
    izin,
    alfa,
    persenHadir,
  };
}
