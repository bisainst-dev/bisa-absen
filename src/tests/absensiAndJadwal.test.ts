import { describe, it, expect } from 'vitest';
import {
  getNextStatus,
  hitungRekapKehadiran,
  AbsensiSchema,
  type EntriAbsensi,
} from '../features/absensi/absensiSchema';
import { JadwalSchema } from '../features/jadwal/jadwalSchema';
import { JurnalSchema } from '../features/jurnal/jurnalSchema';

describe('Absensi Calculations & Logic', () => {
  it('harus memutar siklus status kehadiran dengan benar (H -> S -> I -> A -> H)', () => {
    expect(getNextStatus('H')).toBe('S');
    expect(getNextStatus('S')).toBe('I');
    expect(getNextStatus('I')).toBe('A');
    expect(getNextStatus('A')).toBe('H');
    expect(getNextStatus(undefined)).toBe('H');
  });

  it('harus menghitung rekap H, S, I, A dan % hadir secara tepat', () => {
    const entri: EntriAbsensi[] = [
      { siswaId: 's1', status: 'H' },
      { siswaId: 's2', status: 'H' },
      { siswaId: 's3', status: 'H' },
      { siswaId: 's4', status: 'S' },
      { siswaId: 's5', status: 'I' },
      { siswaId: 's6', status: 'A' },
      { siswaId: 's7', status: 'H' },
      { siswaId: 's8', status: 'H' },
      { siswaId: 's9', status: 'H' },
      { siswaId: 's10', status: 'H' },
    ];

    const rekap = hitungRekapKehadiran(entri);
    expect(rekap.total).toBe(10);
    expect(rekap.hadir).toBe(7);
    expect(rekap.sakit).toBe(1);
    expect(rekap.izin).toBe(1);
    expect(rekap.alfa).toBe(1);
    // 7 hadir dari 10 murid = 70.0%
    expect(rekap.persenHadir).toBe(70.0);
  });

  it('harus menghasilkan 100% jika semua murid hadir', () => {
    const entri: EntriAbsensi[] = [
      { siswaId: 's1', status: 'H' },
      { siswaId: 's2', status: 'H' },
    ];
    const rekap = hitungRekapKehadiran(entri);
    expect(rekap.persenHadir).toBe(100);
  });

  it('harus menghasilkan 0% jika tidak ada murid', () => {
    const rekap = hitungRekapKehadiran([]);
    expect(rekap.total).toBe(0);
    expect(rekap.persenHadir).toBe(0);
  });

  it('harus memvalidasi struktur AbsensiSchema dengan tanggal YYYY-MM-DD', () => {
    const valid = {
      id: 'abs_1',
      tanggal: '2026-11-25',
      kelasId: 'k_1',
      mapel: 'Matematika',
      entri: [{ siswaId: 's_1', status: 'H' as const }],
      catatan: 'Pertemuan lancar',
    };
    expect(AbsensiSchema.safeParse(valid).success).toBe(true);

    const invalidDate = {
      ...valid,
      tanggal: '25-11-2026', // format salah
    };
    expect(AbsensiSchema.safeParse(invalidDate).success).toBe(false);
  });
});

describe('JadwalSchema Validation', () => {
  it('harus memvalidasi jadwal dengan format jam HH:mm yang benar', () => {
    const valid = {
      id: 'j_1',
      hari: 1, // Senin
      jamMulai: '07:30',
      jamSelesai: '09:00',
      kelasId: 'k_1',
      mapel: 'Bahasa Indonesia',
      pengingat: { aktif: true, menitSebelum: 10 },
    };
    expect(JadwalSchema.safeParse(valid).success).toBe(true);
  });

  it('harus menolak jadwal jika hari diluar 1-7 atau format jam salah', () => {
    const invalidHari = {
      id: 'j_2',
      hari: 8, // di luar 1-7
      jamMulai: '07:30',
      jamSelesai: '09:00',
      kelasId: 'k_1',
      mapel: 'IPA',
    };
    expect(JadwalSchema.safeParse(invalidHari).success).toBe(false);

    const invalidJam = {
      id: 'j_3',
      hari: 1,
      jamMulai: '7:30', // harus 07:30
      jamSelesai: '09:00',
      kelasId: 'k_1',
      mapel: 'IPA',
    };
    expect(JadwalSchema.safeParse(invalidJam).success).toBe(false);
  });
});

describe('JurnalSchema Validation', () => {
  it('harus memvalidasi jurnal mengajar dengan materi lengkap', () => {
    const valid = {
      id: 'jur_1',
      tanggal: '2026-11-25',
      kelasId: 'k_1',
      mapel: 'Matematika',
      materi: 'Bangun Datar Segiempat',
      catatanPertemuanBerikutnya: 'Tugas hal 30',
      pengingat: 'Bawa penggaris',
      pertemuanKe: 3,
    };
    expect(JurnalSchema.safeParse(valid).success).toBe(true);
  });

  it('harus menolak jurnal jika materi kosong', () => {
    const invalid = {
      id: 'jur_2',
      tanggal: '2026-11-25',
      kelasId: 'k_1',
      mapel: 'Matematika',
      materi: '',
    };
    expect(JurnalSchema.safeParse(invalid).success).toBe(false);
  });
});
