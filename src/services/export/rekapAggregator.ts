import type { SiswaData } from '../../features/siswa/siswaSchema';
import type { AbsensiData } from '../../features/absensi/absensiSchema';
import type { NilaiData } from '../../features/nilai/nilaiSchema';
import { hitungRataRataSiswa, hitungRataRataKelas } from '../../features/nilai/nilaiSchema';

export interface RekapAbsensiBaris {
  no: number;
  siswaId: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  totalPertemuan: number;
  persenHadir: number;
}

export interface RekapAbsensiResult {
  baris: RekapAbsensiBaris[];
  totalPertemuan: number;
  rataRataKehadiranKelas: number;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlfa: number;
}

/**
 * Agregasi seluruh sesi absensi kelas ke dalam rekap per siswa
 */
export function agregasiRekapAbsensi(
  siswaList: SiswaData[],
  sessions: AbsensiData[]
): RekapAbsensiResult {
  const totalPertemuan = sessions.length;
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlfa = 0;

  const baris: RekapAbsensiBaris[] = siswaList.map((siswa, idx) => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alfa = 0;

    for (const session of sessions) {
      const entri = session.entri.find((e) => e.siswaId === siswa.id);
      const status = entri ? entri.status : 'H'; // default Hadir
      if (status === 'H') hadir++;
      else if (status === 'S') sakit++;
      else if (status === 'I') izin++;
      else if (status === 'A') alfa++;
    }

    totalHadir += hadir;
    totalSakit += sakit;
    totalIzin += izin;
    totalAlfa += alfa;

    const persenHadir =
      totalPertemuan > 0 ? Number(((hadir / totalPertemuan) * 100).toFixed(1)) : 0;

    return {
      no: idx + 1,
      siswaId: siswa.id,
      nama: siswa.nama,
      jenisKelamin: siswa.jenisKelamin,
      hadir,
      sakit,
      izin,
      alfa,
      totalPertemuan,
      persenHadir,
    };
  });

  const sumPersen = baris.reduce((acc, curr) => acc + curr.persenHadir, 0);
  const rataRataKehadiranKelas =
    baris.length > 0 ? Number((sumPersen / baris.length).toFixed(1)) : 0;

  return {
    baris,
    totalPertemuan,
    rataRataKehadiranKelas,
    totalHadir,
    totalSakit,
    totalIzin,
    totalAlfa,
  };
}

export interface RekapNilaiBaris {
  no: number;
  siswaId: string;
  nama: string;
  nilaiPerKolom: Record<string, number | null>; // kode kolom -> nilai
  rataRata: number | null;
}

export interface RekapNilaiResult {
  kolomList: Array<{ id: string; kode: string; jenis: string; judul?: string }>;
  baris: RekapNilaiBaris[];
  rataRataPerKolom: Record<string, number | null>;
  rataRataKeseluruhan: number | null;
}

/**
 * Agregasi tabel nilai siswa per kolom dan hitungan rata-rata
 */
export function agregasiRekapNilai(
  siswaList: SiswaData[],
  columns: NilaiData[]
): RekapNilaiResult {
  const kolomList = columns.map((c) => ({
    id: c.id,
    kode: c.kode,
    jenis: c.jenis,
    judul: c.judul,
  }));

  const baris: RekapNilaiBaris[] = siswaList.map((siswa, idx) => {
    const nilaiPerKolom: Record<string, number | null> = {};
    const scores: (number | null)[] = [];

    for (const col of columns) {
      const entri = col.entri.find((e) => e.siswaId === siswa.id);
      const val = entri && entri.nilai !== undefined && entri.nilai !== null ? entri.nilai : null;
      nilaiPerKolom[col.kode] = val;
      scores.push(val);
    }

    const rataRata = hitungRataRataSiswa(scores);

    return {
      no: idx + 1,
      siswaId: siswa.id,
      nama: siswa.nama,
      nilaiPerKolom,
      rataRata,
    };
  });

  const rataRataPerKolom: Record<string, number | null> = {};
  for (const col of columns) {
    const colScores = siswaList.map((s) => {
      const entri = col.entri.find((e) => e.siswaId === s.id);
      return entri && entri.nilai !== null ? entri.nilai : null;
    });
    rataRataPerKolom[col.kode] = hitungRataRataSiswa(colScores);
  }

  const allAverages = baris.map((b) => b.rataRata);
  const rataRataKeseluruhan = hitungRataRataKelas(allAverages);

  return {
    kolomList,
    baris,
    rataRataPerKolom,
    rataRataKeseluruhan,
  };
}

export interface KopDanTandaTangan {
  judulDokumen: string;
  sekolah: string;
  tahunPelajaran: string;
  semester: string;
  kelasLabel: string;
  mapel: string;
  namaGuru: string;
  nipGuru: string;
  namaKepsek: string;
  nipKepsek: string;
  tampilkanKredit: boolean;
  tanggalCetak: string;
}

export function formatTanggalIndonesia(date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
