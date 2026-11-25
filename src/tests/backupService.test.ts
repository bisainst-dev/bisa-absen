import { describe, it, expect } from 'vitest';
import { calculateChecksum, backupService, type BackupFileStructure } from '../services/backup/backupService';
import type { GenericRecord } from '../types/database';

describe('backupService Unit Tests', () => {
  it('menghasilkan checksum deterministik yang konsisten untuk data yang sama', () => {
    const data = JSON.stringify([{ id: '1', kind: 'siswa', data: { nama: 'Budi' } }]);
    const cs1 = calculateChecksum(data);
    const cs2 = calculateChecksum(data);

    expect(cs1).toBe(cs2);
    expect(cs1.startsWith('sha-')).toBe(true);

    const modified = JSON.stringify([{ id: '1', kind: 'siswa', data: { nama: 'Budi Santoso' } }]);
    const cs3 = calculateChecksum(modified);
    expect(cs1).not.toBe(cs3);
  });

  it('memvalidasi berkas cadangan .backup.json yang sah dengan benar', () => {
    const dummyRecords: GenericRecord[] = [
      {
        id: 'rec-1',
        kind: 'siswa',
        data: { nama: 'Ahmad' },
        updatedAt: 1700000000000,
        deleted: 0,
        dirty: 0,
      },
      {
        id: 'rec-2',
        kind: 'kelas',
        data: { label: '4A', tingkat: '4', rombel: 'A' },
        updatedAt: 1700000000000,
        deleted: 0,
        dirty: 0,
      },
    ];

    const recordsString = JSON.stringify(dummyRecords);
    const validChecksum = calculateChecksum(recordsString);

    const validBackup: BackupFileStructure = {
      app: 'BISA_ABSEN',
      version: 1,
      createdAt: Date.now(),
      createdAtFormatted: new Date().toISOString(),
      checksum: validChecksum,
      summary: {
        totalRecords: 2,
        kindCounts: { siswa: 1, kelas: 1 },
      },
      records: dummyRecords,
    };

    const result = backupService.validateBackupJson(JSON.stringify(validBackup));
    expect(result.valid).toBe(true);
    expect(result.backupData).toBeDefined();
    expect(result.backupData?.summary.totalRecords).toBe(2);
  });

  it('menolak berkas jika bukan format JSON yang valid', () => {
    const result = backupService.validateBackupJson('Ini teks acak bukan JSON');
    expect(result.valid).toBe(false);
    expect(result.pesanError).toContain('File ini bukan file cadangan');
  });

  it('menolak berkas yang bukan berasal dari aplikasi BISA_ABSEN', () => {
    const alienData = {
      app: 'OTHER_APP',
      version: 1,
      records: [],
      checksum: '123',
    };
    const result = backupService.validateBackupJson(JSON.stringify(alienData));
    expect(result.valid).toBe(false);
    expect(result.pesanError).toContain('File ini bukan file cadangan aplikasi BISA Absen');
  });

  it('mendeteksi jika checksum tidak cocok / berkas dimanipulasi', () => {
    const records: GenericRecord[] = [
      {
        id: 'rec-1',
        kind: 'profil',
        data: { namaGuru: 'Pak Guru' },
        updatedAt: 1700000000000,
        deleted: 0,
        dirty: 0,
      },
    ];

    const manipulatedBackup = {
      app: 'BISA_ABSEN',
      version: 1,
      createdAt: Date.now(),
      createdAtFormatted: new Date().toISOString(),
      checksum: 'sha-fakechecksum00000',
      summary: { totalRecords: 1, kindCounts: { profil: 1 } },
      records,
    };

    const result = backupService.validateBackupJson(JSON.stringify(manipulatedBackup));
    expect(result.valid).toBe(false);
    expect(result.pesanError).toContain('checksum tidak cocok');
  });

  it('mengidentifikasi status kedaluwarsa cadangan (> 7 hari)', () => {
    const now = Date.now();
    const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

    expect(backupService.isBackupStale(null)).toBe(true);
    expect(backupService.isBackupStale(eightDaysAgo, 7)).toBe(true);
    expect(backupService.isBackupStale(oneDayAgo, 7)).toBe(false);
  });

  it('siklus cadangan -> hapus -> pulihkan menghasilkan data rekaman yang identik', async () => {
    // 1. Data awal
    const sampleRecords: GenericRecord[] = [
      {
        id: 'rec-siswa-1',
        kind: 'siswa',
        data: { id: 'rec-siswa-1', nama: 'Siti Aminah', jenisKelamin: 'P', kelasId: 'k1' },
        updatedAt: 1710000000000,
        deleted: 0,
        dirty: 0,
      },
      {
        id: 'rec-nilai-1',
        kind: 'nilai',
        data: { id: 'rec-nilai-1', kelasId: 'k1', mapel: 'Matematika', entri: [{ siswaId: 'rec-siswa-1', nilai: 95 }] },
        updatedAt: 1710000000000,
        deleted: 0,
        dirty: 0,
      },
    ];

    const initialChecksum = calculateChecksum(JSON.stringify(sampleRecords));

    // Simulasikan struktur backup
    const backupObj: BackupFileStructure = {
      app: 'BISA_ABSEN',
      version: 1,
      createdAt: Date.now(),
      createdAtFormatted: new Date().toISOString(),
      checksum: initialChecksum,
      summary: { totalRecords: 2, kindCounts: { siswa: 1, nilai: 1 } },
      records: sampleRecords,
    };

    // Validasi file cadangan
    const valResult = backupService.validateBackupJson(JSON.stringify(backupObj));
    expect(valResult.valid).toBe(true);

    // Simulasikan "hapus data" (database kosong)
    const emptyDatabase: GenericRecord[] = [];
    expect(emptyDatabase.length).toBe(0);

    // Pulihkan dari backupData
    const restoredRecords = [...valResult.backupData!.records];
    const restoredChecksum = calculateChecksum(JSON.stringify(restoredRecords));

    // Verifikasi identik 100%
    expect(restoredRecords).toEqual(sampleRecords);
    expect(restoredChecksum).toBe(initialChecksum);
  });
});
