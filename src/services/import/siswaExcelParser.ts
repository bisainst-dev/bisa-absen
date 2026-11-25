import * as XLSX from 'xlsx';
import type { KelasData } from '../../features/siswa/kelasSchema';
import type { JenisKelamin } from '../../features/siswa/siswaSchema';

export interface ParsedSiswaRow {
  nama: string;
  jenisKelamin: JenisKelamin;
  kelasId: string;
  kelasLabel: string;
  baris: number;
}

export interface ImportErrorRow {
  baris: number;
  pesan: string;
  rawData?: Record<string, unknown>;
}

export interface ParseSiswaExcelResult {
  validItems: ParsedSiswaRow[];
  errors: ImportErrorRow[];
  totalRows: number;
}

/**
 * Normalisasi jenis kelamin dari teks Excel
 */
export function normalizeGender(val: unknown): JenisKelamin | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toUpperCase();
  if (str === 'L' || str === 'LAKI-LAKI' || str === 'LAKI - LAKI' || str === 'PRIA' || str === 'M') {
    return 'L';
  }
  if (str === 'P' || str === 'PEREMPUAN' || str === 'WANITA' || str === 'F') {
    return 'P';
  }
  return null;
}

/**
 * Validasi dan parsing berkas Excel siswa
 */
export function parseSiswaExcel(
  fileBuffer: ArrayBuffer,
  availableClasses: KelasData[],
  defaultKelasId?: string
): ParseSiswaExcelResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { validItems: [], errors: [{ baris: 1, pesan: 'File Excel kosong atau tidak memiliki lembar kerja' }], totalRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  // Ambil array of rows (2D array)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawRows.length <= 1) {
    return { validItems: [], errors: [{ baris: 1, pesan: 'File Excel tidak memiliki baris data' }], totalRows: 0 };
  }

  // Baris pertama diasumsikan header
  const headerRow = rawRows[0] as unknown[];
  let namaColIdx = -1;
  let jkColIdx = -1;
  let kelasColIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || '').trim().toLowerCase();
    if (h.includes('nama') || h === 'siswa' || h === 'nama siswa') {
      namaColIdx = i;
    } else if (
      h === 'jenis kelamin' ||
      h === 'jk' ||
      h === 'l/p' ||
      h === 'gender' ||
      h.includes('kelamin')
    ) {
      jkColIdx = i;
    } else if (h === 'kelas' || h === 'rombel' || h === 'tingkat') {
      kelasColIdx = i;
    }
  }

  // Jika header tidak otomatis terdeteksi dengan nama kolom, coba fallback index standar (0: No, 1: Nama, 2: JK, 3: Kelas)
  if (namaColIdx === -1 && headerRow.length >= 2) {
    namaColIdx = 1;
  }
  if (jkColIdx === -1 && headerRow.length >= 3) {
    jkColIdx = 2;
  }
  if (kelasColIdx === -1 && headerRow.length >= 4) {
    kelasColIdx = 3;
  }

  const classMapByLabel = new Map<string, KelasData>();
  for (const c of availableClasses) {
    classMapByLabel.set(c.label.trim().toLowerCase(), c);
  }

  const defaultClass = defaultKelasId
    ? availableClasses.find((c) => c.id === defaultKelasId)
    : undefined;

  const validItems: ParsedSiswaRow[] = [];
  const errors: ImportErrorRow[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const rowNumber = r + 1; // 1-based baris excel
    const row = rawRows[r] as unknown[];
    if (!row || row.length === 0) continue;

    // Periksa apakah baris benar-benar kosong
    const isBlank = row.every((c) => c === null || c === undefined || String(c).trim() === '');
    if (isBlank) continue;

    const rawNama = row[namaColIdx] !== undefined ? String(row[namaColIdx]).trim() : '';
    const rawJk = row[jkColIdx] !== undefined ? row[jkColIdx] : '';
    const rawKelas = kelasColIdx !== -1 && row[kelasColIdx] !== undefined ? String(row[kelasColIdx]).trim() : '';

    // Validasi Nama
    if (!rawNama) {
      errors.push({
        baris: rowNumber,
        pesan: 'Nama siswa kosong',
        rawData: { row },
      });
      continue;
    }

    // Validasi Jenis Kelamin
    const gender = normalizeGender(rawJk);
    if (!gender) {
      errors.push({
        baris: rowNumber,
        pesan: 'Jenis kelamin kosong atau tidak valid (isi L atau P)',
        rawData: { nama: rawNama, jk: rawJk },
      });
      continue;
    }

    // Penentuan Kelas
    let resolvedKelas: KelasData | undefined = undefined;

    if (rawKelas) {
      resolvedKelas = classMapByLabel.get(rawKelas.toLowerCase());
      if (!resolvedKelas) {
        errors.push({
          baris: rowNumber,
          pesan: `Kelas '${rawKelas}' tidak dikenali dalam daftar kelas Anda`,
          rawData: { nama: rawNama, kelas: rawKelas },
        });
        continue;
      }
    } else if (defaultClass) {
      resolvedKelas = defaultClass;
    } else {
      errors.push({
        baris: rowNumber,
        pesan: 'Kolom kelas kosong dan belum memilih kelas tujuan impor',
        rawData: { nama: rawNama },
      });
      continue;
    }

    validItems.push({
      nama: rawNama,
      jenisKelamin: gender,
      kelasId: resolvedKelas.id,
      kelasLabel: resolvedKelas.label,
      baris: rowNumber,
    });
  }

  return {
    validItems,
    errors,
    totalRows: validItems.length + errors.length,
  };
}

/**
 * Membuat dan mengunduh berkas template Excel untuk guru
 */
export function generateExcelTemplate(defaultKelasLabel = '1A') {
  const headers = ['No', 'Nama Siswa', 'Jenis Kelamin (L/P)', 'Kelas'];
  const sampleData = [
    [1, 'Ahmad Fauzi', 'L', defaultKelasLabel],
    [2, 'Annisa Rahmawati', 'P', defaultKelasLabel],
    [3, 'Bima Arya Pratama', 'L', defaultKelasLabel],
    [4, 'Cantika Putri Lestari', 'P', defaultKelasLabel],
  ];

  const wsData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Lebar kolom yang nyaman
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 22 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Template_Data_Siswa_${defaultKelasLabel.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
