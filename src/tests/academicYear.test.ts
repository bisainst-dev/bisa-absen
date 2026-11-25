import { describe, it, expect } from 'vitest';
import {
  getAutoTahunPelajaran,
  getAutoSemester,
  getWaktuSapaan,
  getDinamisGreeting,
} from '../lib/academicYear';

describe('academicYear & greeting utilities', () => {
  it('harus menghitung semester ganjil untuk bulan Juli-Desember', () => {
    // 15 Juli 2026
    const juliDate = new Date(2026, 6, 15);
    expect(getAutoSemester(juliDate)).toBe('Ganjil');
    expect(getAutoTahunPelajaran(juliDate)).toBe('2026/2027');

    // 10 November 2026
    const novDate = new Date(2026, 10, 10);
    expect(getAutoSemester(novDate)).toBe('Ganjil');
    expect(getAutoTahunPelajaran(novDate)).toBe('2026/2027');
  });

  it('harus menghitung semester genap untuk bulan Januari-Juni', () => {
    // 20 Februari 2027
    const febDate = new Date(2027, 1, 20);
    expect(getAutoSemester(febDate)).toBe('Genap');
    expect(getAutoTahunPelajaran(febDate)).toBe('2026/2027');

    // 5 Mei 2027
    const meiDate = new Date(2027, 4, 5);
    expect(getAutoSemester(meiDate)).toBe('Genap');
    expect(getAutoTahunPelajaran(meiDate)).toBe('2026/2027');
  });

  it('harus menghasilkan sapaan dinamis dengan nama panggilan guru', () => {
    const greeting = getDinamisGreeting('Bu Ratna');
    expect(greeting).toContain('Bu Ratna');
    expect(greeting).toMatch(/Selamat (Pagi|Siang|Sore|Malam), Bu Ratna!/);

    const emptyGreeting = getDinamisGreeting('');
    expect(emptyGreeting).toMatch(/Selamat (Pagi|Siang|Sore|Malam)!/);
  });

  it('harus menentukan waktu sapaan sesuai jam', () => {
    // 07:30 -> Pagi
    const pagi = new Date(2026, 0, 1, 7, 30);
    expect(getWaktuSapaan(pagi)).toBe('Pagi');

    // 12:15 -> Siang
    const siang = new Date(2026, 0, 1, 12, 15);
    expect(getWaktuSapaan(siang)).toBe('Siang');

    // 16:45 -> Sore
    const sore = new Date(2026, 0, 1, 16, 45);
    expect(getWaktuSapaan(sore)).toBe('Sore');

    // 21:00 -> Malam
    const malam = new Date(2026, 0, 1, 21, 0);
    expect(getWaktuSapaan(malam)).toBe('Malam');
  });
});
