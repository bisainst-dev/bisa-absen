import { describe, it, expect } from 'vitest';
import {
  agregasiRekapAbsensi,
  agregasiRekapNilai,
  formatTanggalIndonesia,
} from '../services/export/rekapAggregator';
import type { SiswaData } from '../features/siswa/siswaSchema';
import type { AbsensiData } from '../features/absensi/absensiSchema';
import type { NilaiData } from '../features/nilai/nilaiSchema';

describe('agregasiRekapAbsensi', () => {
  const dummySiswa: SiswaData[] = [
    { id: 's1', nama: 'Ahmad', jenisKelamin: 'L', kelasId: 'k1', nis: '', nisn: '' },
    { id: 's2', nama: 'Bunga', jenisKelamin: 'P', kelasId: 'k1', nis: '', nisn: '' },
  ];

  it('harus mengagregasi 2 sesi pertemuan dengan kalkulasi H/S/I/A dan % hadir yang presisi', () => {
    const sessions: AbsensiData[] = [
      {
        id: 'sess1',
        tanggal: '2026-11-20',
        kelasId: 'k1',
        mapel: 'Matematika',
        entri: [
          { siswaId: 's1', status: 'H' },
          { siswaId: 's2', status: 'S' },
        ],
        catatan: '',
      },
      {
        id: 'sess2',
        tanggal: '2026-11-22',
        kelasId: 'k1',
        mapel: 'Matematika',
        entri: [
          { siswaId: 's1', status: 'H' },
          { siswaId: 's2', status: 'H' },
        ],
        catatan: '',
      },
    ];

    const result = agregasiRekapAbsensi(dummySiswa, sessions);

    expect(result.totalPertemuan).toBe(2);
    expect(result.baris).toHaveLength(2);

    // Ahmad: Hadir 2x dari 2 pertemuan = 100%
    const ahmad = result.baris.find((b) => b.siswaId === 's1');
    expect(ahmad?.hadir).toBe(2);
    expect(ahmad?.sakit).toBe(0);
    expect(ahmad?.persenHadir).toBe(100.0);

    // Bunga: Hadir 1x, Sakit 1x dari 2 pertemuan = 50%
    const bunga = result.baris.find((b) => b.siswaId === 's2');
    expect(bunga?.hadir).toBe(1);
    expect(bunga?.sakit).toBe(1);
    expect(bunga?.persenHadir).toBe(50.0);

    // Rata-rata kelas: (100 + 50) / 2 = 75.0%
    expect(result.rataRataKehadiranKelas).toBe(75.0);
    expect(result.totalHadir).toBe(3);
    expect(result.totalSakit).toBe(1);
  });

  it('harus menangani kasus jika belum ada sesi pertemuan', () => {
    const result = agregasiRekapAbsensi(dummySiswa, []);
    expect(result.totalPertemuan).toBe(0);
    expect(result.baris[0].persenHadir).toBe(0);
    expect(result.rataRataKehadiranKelas).toBe(0);
  });
});

describe('agregasiRekapNilai', () => {
  const dummySiswa: SiswaData[] = [
    { id: 's1', nama: 'Ahmad', jenisKelamin: 'L', kelasId: 'k1', nis: '', nisn: '' },
    { id: 's2', nama: 'Bunga', jenisKelamin: 'P', kelasId: 'k1', nis: '', nisn: '' },
  ];

  const columns: NilaiData[] = [
    {
      id: 'c1',
      kelasId: 'k1',
      mapel: 'Matematika',
      semester: 'Ganjil',
      tahunPelajaran: '2026/2027',
      jenis: 'Tugas',
      kode: 'T1',
      judul: 'Tugas 1',
      entri: [
        { siswaId: 's1', nilai: 80 },
        { siswaId: 's2', nilai: 90 },
      ],
    },
    {
      id: 'c2',
      kelasId: 'k1',
      mapel: 'Matematika',
      semester: 'Ganjil',
      tahunPelajaran: '2026/2027',
      jenis: 'PH',
      kode: 'PH1',
      judul: 'Penilaian Harian 1',
      entri: [
        { siswaId: 's1', nilai: 85 },
        { siswaId: 's2', nilai: 95 },
      ],
    },
  ];

  it('harus mengagregasi nilai siswa per kolom beserta rata-rata siswa dan kelas', () => {
    const result = agregasiRekapNilai(dummySiswa, columns);

    expect(result.kolomList).toHaveLength(2);
    expect(result.baris).toHaveLength(2);

    // Ahmad: T1=80, PH1=85 -> Rata-rata 82.5
    const ahmad = result.baris[0];
    expect(ahmad.nilaiPerKolom['T1']).toBe(80);
    expect(ahmad.nilaiPerKolom['PH1']).toBe(85);
    expect(ahmad.rataRata).toBe(82.5);

    // Bunga: T1=90, PH1=95 -> Rata-rata 92.5
    const bunga = result.baris[1];
    expect(bunga.nilaiPerKolom['T1']).toBe(90);
    expect(bunga.nilaiPerKolom['PH1']).toBe(95);
    expect(bunga.rataRata).toBe(92.5);

    // Rata-rata kolom: T1=(80+90)/2=85, PH1=(85+95)/2=90
    expect(result.rataRataPerKolom['T1']).toBe(85.0);
    expect(result.rataRataPerKolom['PH1']).toBe(90.0);

    // Rata-rata keseluruhan kelas: (82.5 + 92.5)/2 = 87.5
    expect(result.rataRataKeseluruhan).toBe(87.5);
  });
});

describe('formatTanggalIndonesia', () => {
  it('harus memformat tanggal dalam bahasa Indonesia yang baku', () => {
    const date = new Date(2026, 10, 25); // 25 November 2026
    const formatted = formatTanggalIndonesia(date);
    expect(formatted).toContain('25');
    expect(formatted).toContain('November');
    expect(formatted).toContain('2026');
  });
});
