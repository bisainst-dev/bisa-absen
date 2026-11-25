import { describe, it, expect } from 'vitest';
import { ProfilSchema, DEFAULT_PROFIL } from '../features/profil/schema';

describe('ProfilSchema Validation', () => {
  it('harus memvalidasi profil lengkap yang valid', () => {
    const validData = {
      namaPanggilan: 'Pak Budi',
      namaGuru: 'Budi Santoso, M.Pd.',
      nip: '198501012010011001',
      sekolah: 'SD Negeri 1 Merdeka',
      mapel: ['Matematika', 'IPA'],
      kelasDiampu: ['4A', '4B'],
      tahunPelajaran: '2026/2027',
      semester: 'Ganjil' as const,
      kepalaSekolah: 'Dra. Hj. Maryam',
      nipKepsek: '197001011995032001',
      tampilkanKredit: true,
      isOnboarded: true,
    };

    const parsed = ProfilSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('harus menolak profil jika nama panggilan kosong', () => {
    const invalid = {
      ...DEFAULT_PROFIL,
      namaPanggilan: '',
      namaGuru: 'Budi Santoso',
      sekolah: 'SD 1',
      mapel: ['Matematika'],
      kelasDiampu: ['4A'],
      tahunPelajaran: '2026/2027',
    };

    const parsed = ProfilSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('harus menolak profil jika kelas diampu kosong', () => {
    const invalid = {
      ...DEFAULT_PROFIL,
      namaPanggilan: 'Pak Budi',
      namaGuru: 'Budi Santoso',
      sekolah: 'SD 1',
      mapel: ['Matematika'],
      kelasDiampu: [],
      tahunPelajaran: '2026/2027',
    };

    const parsed = ProfilSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
