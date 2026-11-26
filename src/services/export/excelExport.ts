import * as XLSX from 'xlsx';
import type {
  RekapAbsensiResult,
  RekapNilaiResult,
  KopDanTandaTangan,
} from './rekapAggregator';
import type { JurnalData } from '../../features/jurnal/jurnalSchema';

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor Rekapitulasi Absensi ke Excel (.xlsx)
 */
export function exportRekapAbsensiExcel(rekap: RekapAbsensiResult, kop: KopDanTandaTangan) {
  const metaRows = [
    [kop.sekolah.toUpperCase()],
    [kop.judulDokumen.toUpperCase()],
    [`Tahun Pelajaran: ${kop.tahunPelajaran} (${kop.semester})`, '', `Kelas: ${kop.kelasLabel}`, '', `Mapel: ${kop.mapel}`],
    [], // Blank separator
  ];

  const tableHeaders = ['No', 'Nama Siswa', 'L/P', 'Hadir', 'Sakit', 'Izin', 'Alfa', '% Hadir'];
  const dataRows = rekap.baris.map((b) => [
    b.no,
    b.nama,
    b.jenisKelamin,
    b.hadir,
    b.sakit,
    b.izin,
    b.alfa,
    `${b.persenHadir}%`,
  ]);

  const totalRow = [
    '',
    'TOTAL / REKAP KELAS',
    '',
    rekap.totalHadir,
    rekap.totalSakit,
    rekap.totalIzin,
    rekap.totalAlfa,
    `${rekap.rataRataKehadiranKelas}%`,
  ];

  const signatureRows = [
    [],
    [],
    ['Mengetahui,', '', '', '', `Dibuat pada: ${kop.tanggalCetak}`],
    ['Kepala Sekolah,', '', '', '', 'Guru Mata Pelajaran,'],
    [],
    [],
    [kop.namaKepsek || '( ........................................ )', '', '', '', kop.namaGuru || '( ........................................ )'],
    [`NIP. ${kop.nipKepsek || '........................................'}`, '', '', '', `NIP. ${kop.nipGuru || '........................................'}`],
  ];

  if (kop.tampilkanKredit) {
    signatureRows.push([]);
    signatureRows.push(['Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru']);
  }

  const allRows = [...metaRows, tableHeaders, ...dataRows, totalRow, ...signatureRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');
  downloadWorkbook(wb, `Rekap_Absensi_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Ekspor Rekapitulasi Nilai ke Excel (.xlsx)
 */
export function exportRekapNilaiExcel(rekap: RekapNilaiResult, kop: KopDanTandaTangan) {
  const metaRows = [
    [kop.sekolah.toUpperCase()],
    [kop.judulDokumen.toUpperCase()],
    [`Tahun Pelajaran: ${kop.tahunPelajaran} (${kop.semester})`, '', `Kelas: ${kop.kelasLabel}`, '', `Mapel: ${kop.mapel}`],
    [],
  ];

  const tableHeaders = ['No', 'Nama Siswa'];
  for (const c of rekap.kolomList) tableHeaders.push(c.kode);
  tableHeaders.push('Rata-rata');

  const dataRows = rekap.baris.map((b) => {
    const row: (string | number)[] = [b.no, b.nama];
    for (const c of rekap.kolomList) {
      const val = b.nilaiPerKolom[c.kode];
      row.push(val !== null && val !== undefined ? val : '-');
    }
    row.push(b.rataRata !== null ? b.rataRata : '-');
    return row;
  });

  const footerRow: (string | number)[] = ['', 'RATA-RATA KELAS'];
  for (const c of rekap.kolomList) {
    const val = rekap.rataRataPerKolom[c.kode];
    footerRow.push(val !== null ? val : '-');
  }
  footerRow.push(rekap.rataRataKeseluruhan !== null ? rekap.rataRataKeseluruhan : '-');

  const signatureRows = [
    [],
    [],
    ['Mengetahui,', '', '', '', `Dibuat pada: ${kop.tanggalCetak}`],
    ['Kepala Sekolah,', '', '', '', 'Guru Mata Pelajaran,'],
    [],
    [],
    [kop.namaKepsek || '( ........................................ )', '', '', '', kop.namaGuru || '( ........................................ )'],
    [`NIP. ${kop.nipKepsek || '........................................'}`, '', '', '', `NIP. ${kop.nipGuru || '........................................'}`],
  ];

  if (kop.tampilkanKredit) {
    signatureRows.push([]);
    signatureRows.push(['Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru']);
  }

  const allRows = [...metaRows, tableHeaders, ...dataRows, footerRow, ...signatureRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    ...rekap.kolomList.map(() => ({ wch: 10 })),
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
  downloadWorkbook(wb, `Rekap_Nilai_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Ekspor Jurnal Mengajar ke Excel (.xlsx)
 */
export function exportJurnalExcel(jurnalList: JurnalData[], kop: KopDanTandaTangan) {
  const metaRows = [
    [kop.sekolah.toUpperCase()],
    [kop.judulDokumen.toUpperCase()],
    [`Tahun Pelajaran: ${kop.tahunPelajaran} (${kop.semester})`, '', `Kelas: ${kop.kelasLabel}`, '', `Mapel: ${kop.mapel}`],
    [],
  ];

  const tableHeaders = ['No', 'Tanggal', 'Pertemuan Ke', 'Materi Pembelajaran', 'Catatan Lanjutan'];
  const dataRows = jurnalList.map((j, idx) => [
    idx + 1,
    j.tanggal,
    j.pertemuanKe || 1,
    j.materi,
    j.catatanPertemuanBerikutnya || '-',
  ]);

  const signatureRows = [
    [],
    [],
    ['Mengetahui,', '', '', '', `Dibuat pada: ${kop.tanggalCetak}`],
    ['Kepala Sekolah,', '', '', '', 'Guru Mata Pelajaran,'],
    [],
    [],
    [kop.namaKepsek || '( ........................................ )', '', '', '', kop.namaGuru || '( ........................................ )'],
    [`NIP. ${kop.nipKepsek || '........................................'}`, '', '', '', `NIP. ${kop.nipGuru || '........................................'}`],
  ];

  if (kop.tampilkanKredit) {
    signatureRows.push([]);
    signatureRows.push(['Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru']);
  }

  const allRows = [...metaRows, tableHeaders, ...dataRows, ...signatureRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Mengajar');
  downloadWorkbook(wb, `Jurnal_Mengajar_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.xlsx`);
}
