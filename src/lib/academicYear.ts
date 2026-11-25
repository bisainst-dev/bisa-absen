/**
 * Utility untuk menghitung tahun pelajaran & semester secara otomatis
 * Aturan:
 * - Juli (bulan 7) – Desember (bulan 12) = Semester Ganjil (Tahun X / X+1)
 * - Januari (bulan 1) – Juni (bulan 6) = Semester Genap (Tahun X-1 / X)
 */

export function getAutoTahunPelajaran(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

export function getAutoSemester(date = new Date()): 'Ganjil' | 'Genap' {
  const month = date.getMonth() + 1;
  return month >= 7 ? 'Ganjil' : 'Genap';
}

/**
 * Sapaan dinamis berdasarkan jam lokal
 * 04:00 - 10:59 -> Pagi
 * 11:00 - 14:59 -> Siang
 * 15:00 - 18:29 -> Sore
 * 18:30 - 03:59 -> Malam
 */
export function getWaktuSapaan(date = new Date()): 'Pagi' | 'Siang' | 'Sore' | 'Malam' {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 4 * 60 && totalMinutes < 11 * 60) {
    return 'Pagi';
  } else if (totalMinutes >= 11 * 60 && totalMinutes < 15 * 60) {
    return 'Siang';
  } else if (totalMinutes >= 15 * 60 && totalMinutes < 18 * 60 + 30) {
    return 'Sore';
  } else {
    return 'Malam';
  }
}

export function getDinamisGreeting(namaPanggilan?: string): string {
  const sapaan = getWaktuSapaan();
  if (!namaPanggilan || !namaPanggilan.trim()) {
    return `Selamat ${sapaan}!`;
  }
  return `Selamat ${sapaan}, ${namaPanggilan}!`;
}
