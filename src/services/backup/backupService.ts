import { genericRepo } from '../../db/dexie';
import { pengaturanRepo } from '../../features/pengaturan/repository';
import type { GenericRecord } from '../../types/database';

export interface BackupFileStructure {
  app: 'BISA_ABSEN' | 'SAKU_GURU' | 'ESDUTA_GATE';
  version: 1;
  createdAt: number;
  createdAtFormatted: string;
  checksum: string;
  summary: {
    totalRecords: number;
    kindCounts: Record<string, number>;
  };
  records: GenericRecord[];
}

export interface ValidationResult {
  valid: boolean;
  pesanError?: string;
  backupData?: BackupFileStructure;
}

/**
 * Hash deterministik cepat (FNV-1a 32-bit x2 / DJB2 hex)
 * Bekerja identik di lingkungan Browser dan Node.js (Vitest)
 */
export function calculateChecksum(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 5381;

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 * 33, 1) ^ ch;
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sha-${hex1}${hex2}`;
}

export const backupService = {
  /**
   * Membuat objek struktur cadangan lengkap
   */
  async createBackupObject(): Promise<BackupFileStructure> {
    const records = await genericRepo.exportAll();
    const now = Date.now();
    const dateFormatted = new Date(now).toISOString();

    const kindCounts: Record<string, number> = {};
    for (const r of records) {
      if (r.deleted === 0) {
        kindCounts[r.kind] = (kindCounts[r.kind] || 0) + 1;
      }
    }

    const recordsString = JSON.stringify(records);
    const checksum = calculateChecksum(recordsString);

    const backup: BackupFileStructure = {
      app: 'ESDUTA_GATE',
      version: 1,
      createdAt: now,
      createdAtFormatted: dateFormatted,
      checksum,
      summary: {
        totalRecords: records.length,
        kindCounts,
      },
      records,
    };

    return backup;
  },

  /**
   * Mengunduh berkas .backup.json langsung di peramban
   */
  async downloadBackupFile(): Promise<string> {
    const backupObj = await this.createBackupObject();
    const jsonStr = JSON.stringify(backupObj, null, 2);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Esduta_Gate_${dateStr}.backup.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Perbarui waktu cadangan terakhir
    await pengaturanRepo.updateLastBackup();

    return filename;
  },

  /**
   * Validasi string berkas JSON cadangan
   */
  validateBackupJson(content: string): ValidationResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        valid: false,
        pesanError: 'File ini bukan file cadangan yang valid (format JSON rusak)',
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        pesanError: 'File ini bukan file cadangan (struktur data kosong)',
      };
    }

    const obj = parsed as Record<string, unknown>;

    if (obj.app !== 'BISA_ABSEN' && obj.app !== 'SAKU_GURU' && obj.app !== 'ESDUTA_GATE') {
      return {
        valid: false,
        pesanError: 'File ini bukan file cadangan aplikasi Esduta Gate',
      };
    }

    if (!Array.isArray(obj.records)) {
      return {
        valid: false,
        pesanError: 'File cadangan tidak memuat data rekaman (records)',
      };
    }

    if (typeof obj.checksum !== 'string') {
      return {
        valid: false,
        pesanError: 'File cadangan tidak memiliki penanda integritas (checksum)',
      };
    }

    // Verifikasi Checksum integritas
    const recordsString = JSON.stringify(obj.records);
    const calculated = calculateChecksum(recordsString);

    if (calculated !== obj.checksum) {
      return {
        valid: false,
        pesanError: 'File cadangan tidak valid (checksum tidak cocok atau berkas telah diubah)',
      };
    }

    return {
      valid: true,
      backupData: obj as unknown as BackupFileStructure,
    };
  },

  /**
   * Pulihkan data dari berkas cadangan ke IndexedDB
   */
  async restoreBackup(backupData: BackupFileStructure, overwrite = true): Promise<void> {
    await genericRepo.importAll(backupData.records, overwrite);
    await pengaturanRepo.updateLastBackup();
  },

  /**
   * Periksa apakah cadangan sudah kedaluwarsa (> 7 hari)
   */
  isBackupStale(lastBackupDate: number | null, thresholdDays = 7): boolean {
    if (!lastBackupDate) return true;
    const now = Date.now();
    const diffDays = (now - lastBackupDate) / (1000 * 60 * 60 * 24);
    return diffDays > thresholdDays;
  },
};
