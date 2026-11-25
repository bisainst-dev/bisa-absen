import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSiswaExcel,
  normalizeGender,
} from '../services/import/siswaExcelParser';
import type { KelasData } from '../features/siswa/kelasSchema';

describe('normalizeGender', () => {
  it('harus mengenali variasi laki-laki', () => {
    expect(normalizeGender('L')).toBe('L');
    expect(normalizeGender('l')).toBe('L');
    expect(normalizeGender('Laki-laki')).toBe('L');
    expect(normalizeGender('Pria')).toBe('L');
  });

  it('harus mengenali variasi perempuan', () => {
    expect(normalizeGender('P')).toBe('P');
    expect(normalizeGender('p')).toBe('P');
    expect(normalizeGender('Perempuan')).toBe('P');
    expect(normalizeGender('Wanita')).toBe('P');
  });

  it('harus menghasilkan null jika tidak valid atau kosong', () => {
    expect(normalizeGender('')).toBeNull();
    expect(normalizeGender('X')).toBeNull();
    expect(normalizeGender(null)).toBeNull();
  });
});

describe('parseSiswaExcel', () => {
  const dummyClasses: KelasData[] = [
    { id: 'k1', label: '7A', tingkat: '7', rombel: 'A', keterangan: '' },
    { id: 'k2', label: '7B', tingkat: '7', rombel: 'B', keterangan: '' },
  ];

  function createWorkbookBuffer(rows: unknown[][]): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }

  it('harus memvalidasi data siswa yang benar', () => {
    const rows = [
      ['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas'],
      [1, 'Ahmad Pratama', 'L', '7A'],
      [2, 'Bunga Citra', 'P', '7A'],
      [3, 'Dimas Anggara', 'L', '7B'],
    ];

    const buffer = createWorkbookBuffer(rows);
    const result = parseSiswaExcel(buffer, dummyClasses);

    expect(result.errors).toHaveLength(0);
    expect(result.validItems).toHaveLength(3);
    expect(result.validItems[0].nama).toBe('Ahmad Pratama');
    expect(result.validItems[0].jenisKelamin).toBe('L');
    expect(result.validItems[0].kelasId).toBe('k1');
    expect(result.validItems[2].kelasId).toBe('k2');
  });

  it('harus melaporkan error jika jenis kelamin kosong atau tidak valid', () => {
    const rows = [
      ['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas'],
      [1, 'Siswa Tanpa Gender', '', '7A'],
      [2, 'Siswa Gender Aneh', 'UNKNOWN', '7A'],
    ];

    const buffer = createWorkbookBuffer(rows);
    const result = parseSiswaExcel(buffer, dummyClasses);

    expect(result.validItems).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].pesan).toContain('Jenis kelamin kosong atau tidak valid');
    expect(result.errors[1].pesan).toContain('Jenis kelamin kosong atau tidak valid');
  });

  it('harus melaporkan error jika nama siswa kosong', () => {
    const rows = [
      ['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas'],
      [1, '', 'L', '7A'],
    ];

    const buffer = createWorkbookBuffer(rows);
    const result = parseSiswaExcel(buffer, dummyClasses);

    expect(result.validItems).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pesan).toContain('Nama siswa kosong');
  });

  it('harus melaporkan error jika kelas tidak dikenali', () => {
    const rows = [
      ['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas'],
      [1, 'Siti Sarah', 'P', 'Kelas 99 Z'],
    ];

    const buffer = createWorkbookBuffer(rows);
    const result = parseSiswaExcel(buffer, dummyClasses);

    expect(result.validItems).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pesan).toContain("Kelas 'Kelas 99 Z' tidak dikenali");
  });

  it('harus mengimpor 100 siswa dalam waktu kurang dari 2 detik (Kriteria Selesai)', () => {
    const rows: unknown[][] = [['No', 'Nama Siswa', 'Jenis Kelamin', 'Kelas']];
    for (let i = 1; i <= 100; i++) {
      rows.push([i, `Siswa Ke-${i}`, i % 2 === 0 ? 'L' : 'P', '7A']);
    }

    const buffer = createWorkbookBuffer(rows);
    const startTime = performance.now();
    const result = parseSiswaExcel(buffer, dummyClasses);
    const duration = performance.now() - startTime;

    expect(result.errors).toHaveLength(0);
    expect(result.validItems).toHaveLength(100);
    expect(duration).toBeLessThan(2000); // Harus < 2000 ms
  });
});
