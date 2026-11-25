import { describe, it, expect } from 'vitest';
import {
  hitungRataRataSiswa,
  hitungRataRataKelas,
  NilaiSchema,
} from '../features/nilai/nilaiSchema';
import { KegiatanSchema, JurnalKegiatanSchema } from '../features/kegiatan/kegiatanSchema';
import { CatatanSchema } from '../features/catatan/catatanSchema';

describe('Perhitungan Nilai Rata-rata (Kriteria Selesai)', () => {
  it('harus menghitung rata-rata siswa dari daftar nilai angka dengan tepat', () => {
    // 80, 90, 85 -> rata-rata 85
    expect(hitungRataRataSiswa([80, 90, 85])).toBe(85.0);

    // 70, 75, 80 -> rata-rata 75
    expect(hitungRataRataSiswa([70, 75, 80])).toBe(75.0);

    // Pembulatan 1 desimal: 80, 85, 82 -> (247 / 3) = 82.333.. -> 82.3
    expect(hitungRataRataSiswa([80, 85, 82])).toBe(82.3);
  });

  it('harus mengabaikan nilai null atau undefined (parsial)', () => {
    // Siswa baru ikut 2 dari 4 tugas: 80, null, 90, undefined -> rata-rata (170/2) = 85.0
    expect(hitungRataRataSiswa([80, null, 90, undefined])).toBe(85.0);
  });

  it('harus menghasilkan null jika seluruh nilai kosong/null', () => {
    expect(hitungRataRataSiswa([])).toBeNull();
    expect(hitungRataRataSiswa([null, null])).toBeNull();
  });

  it('harus menghitung rata-rata kelas dari kumpulan rata-rata siswa', () => {
    // Rata-rata 3 siswa: 85.0, 75.0, 80.0 -> rata-rata kelas 80.0
    expect(hitungRataRataKelas([85.0, 75.0, 80.0])).toBe(80.0);

    // Mengabaikan siswa yang belum memiliki nilai (null)
    expect(hitungRataRataKelas([85.0, null, 75.0])).toBe(80.0);
    expect(hitungRataRataKelas([null, null])).toBeNull();
  });
});

describe('NilaiSchema Validation', () => {
  it('harus memvalidasi kolom nilai yang valid', () => {
    const valid = {
      id: 'col_1',
      kelasId: 'k1',
      mapel: 'Matematika',
      semester: 'Ganjil' as const,
      tahunPelajaran: '2026/2027',
      jenis: 'Tugas' as const,
      kode: 'T1',
      judul: 'Tugas Pecahan',
      entri: [
        { siswaId: 's1', nilai: 85 },
        { siswaId: 's2', nilai: null },
      ],
    };
    expect(NilaiSchema.safeParse(valid).success).toBe(true);
  });

  it('harus menolak jika nilai diluar rentang 0-100', () => {
    const invalid = {
      id: 'col_2',
      kelasId: 'k1',
      mapel: 'Matematika',
      semester: 'Ganjil' as const,
      tahunPelajaran: '2026/2027',
      jenis: 'Tugas' as const,
      kode: 'T1',
      entri: [{ siswaId: 's1', nilai: 105 }], // > 100
    };
    expect(NilaiSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('KegiatanSchema & JurnalKegiatan Validation', () => {
  it('harus memvalidasi kegiatan ekskul / les', () => {
    const valid = {
      id: 'keg_1',
      nama: 'Pramuka Penggalang',
      jenis: 'Ekstrakurikuler' as const,
      jadwalDeskripsi: 'Jumat 14:00',
      pembimbing: 'Kak Surya',
    };
    expect(KegiatanSchema.safeParse(valid).success).toBe(true);
  });

  it('harus memvalidasi jurnal kegiatan', () => {
    const valid = {
      id: 'jur_keg_1',
      kegiatanId: 'keg_1',
      tanggal: '2026-11-25',
      ringkasan: 'Latihan baris berbaris dan semaphore',
      catatan: 'Seluruh peserta hadir tepat waktu',
    };
    expect(JurnalKegiatanSchema.safeParse(valid).success).toBe(true);
  });
});

describe('CatatanSchema Validation', () => {
  it('harus memvalidasi catatan pengingat harian/mingguan', () => {
    const valid = {
      id: 'cat_1',
      judul: 'Rapat Rencana PTS',
      teks: 'Ruang Guru Lantai 2',
      waktu: '2026-11-26T13:00',
      ulangi: 'mingguan' as const,
      selesai: false,
      prioritas: 'penting' as const,
    };
    expect(CatatanSchema.safeParse(valid).success).toBe(true);
  });
});
