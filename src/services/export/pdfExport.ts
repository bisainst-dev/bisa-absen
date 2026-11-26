import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  RekapAbsensiResult,
  RekapNilaiResult,
  KopDanTandaTangan,
} from './rekapAggregator';
import type { JurnalData } from '../../features/jurnal/jurnalSchema';

/**
 * Render Header Kop Resmi Dokumen Sekolah
 */
function drawKop(doc: jsPDF, kop: KopDanTandaTangan): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 45);
  doc.text(kop.sekolah.toUpperCase(), pageWidth / 2, startY, { align: 'center' });

  doc.setFontSize(11);
  doc.text(kop.judulDokumen.toUpperCase(), pageWidth / 2, startY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 95);
  const subInfo = `Tahun Pelajaran: ${kop.tahunPelajaran} (${kop.semester})  |  Kelas: ${kop.kelasLabel}  |  Mapel: ${kop.mapel}`;
  doc.text(subInfo, pageWidth / 2, startY + 11, { align: 'center' });

  // Garis batas kop
  const lineY = startY + 14;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.2);
  doc.line(15, lineY, pageWidth - 15, lineY);
  doc.setLineWidth(0.4);
  doc.line(15, lineY + 1, pageWidth - 15, lineY + 1);

  return lineY + 7;
}

/**
 * Render Blok Tanda Tangan Guru & Kepala Sekolah
 */
function drawSignatures(doc: jsPDF, kop: KopDanTandaTangan, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Pastikan cukup ruang untuk tanda tangan (butuh minimal 45 mm)
  if (startY + 45 > pageHeight - 15) {
    doc.addPage();
    startY = 20;
  }

  const leftX = 25;
  const rightX = pageWidth - 65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 30, 45);

  // Kiri: Kepala Sekolah
  doc.text('Mengetahui,', leftX, startY);
  doc.text('Kepala Sekolah,', leftX, startY + 4.5);

  const ttdNamaY = startY + 24;
  doc.setFont('helvetica', 'bold');
  doc.text(kop.namaKepsek || '( ........................................ )', leftX, ttdNamaY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${kop.nipKepsek || '........................................'}`, leftX, ttdNamaY + 4.5);

  // Kanan: Guru Kelas / Mapel
  doc.text(`Dibuat pada: ${kop.tanggalCetak}`, rightX, startY);
  doc.text('Guru Mata Pelajaran,', rightX, startY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(kop.namaGuru || '( ........................................ )', rightX, ttdNamaY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${kop.nipGuru || '........................................'}`, rightX, ttdNamaY + 4.5);

  // Footer kredit jika diaktifkan
  if (kop.tampilkanKredit) {
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 160);
    doc.text(
      'Dokumen resmi diolah secara otomatis via Saku Guru - Asisten Administrasi Guru',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }
}

/**
 * Ekspor Rekapitulasi Absensi ke PDF (A4 Portrait)
 */
export function exportRekapAbsensiPdf(rekap: RekapAbsensiResult, kop: KopDanTandaTangan) {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const tableStartY = drawKop(doc, kop);

  const headers = [['No', 'Nama Siswa', 'L/P', 'Hadir', 'Sakit', 'Izin', 'Alfa', '% Hadir']];
  const rows = rekap.baris.map((b) => [
    b.no,
    b.nama,
    b.jenisKelamin,
    b.hadir,
    b.sakit,
    b.izin,
    b.alfa,
    `${b.persenHadir}%`,
  ]);

  // Tambahkan baris total
  rows.push([
    '',
    'TOTAL PERTEMUAN / REKAPITULASI KELAS',
    '',
    String(rekap.totalHadir),
    String(rekap.totalSakit),
    String(rekap.totalIzin),
    String(rekap.totalAlfa),
    `${rekap.rataRataKehadiranKelas}%`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: headers,
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [13, 148, 136], // brand teal-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 65 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight row total
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 250]; // brand-50
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || 160;
  drawSignatures(doc, kop, lastTableY + 10);

  doc.save(`Rekap_Absensi_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Ekspor Rekapitulasi Nilai ke PDF (A4 Landscape jika kolom > 4, Portrait jika sedikit)
 */
export function exportRekapNilaiPdf(rekap: RekapNilaiResult, kop: KopDanTandaTangan) {
  const isLandscape = rekap.kolomList.length > 4;
  const doc = new jsPDF({ format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' });
  const tableStartY = drawKop(doc, kop);

  const headCols = ['No', 'Nama Siswa'];
  for (const c of rekap.kolomList) headCols.push(c.kode);
  headCols.push('Rata-rata');

  const rows = rekap.baris.map((b) => {
    const row = [String(b.no), b.nama];
    for (const c of rekap.kolomList) {
      const val = b.nilaiPerKolom[c.kode];
      row.push(val !== null && val !== undefined ? String(val) : '-');
    }
    row.push(b.rataRata !== null ? String(b.rataRata) : '-');
    return row;
  });

  // Baris Rata-rata Kelas
  const footerRow = ['', 'RATA-RATA KELAS'];
  for (const c of rekap.kolomList) {
    const val = rekap.rataRataPerKolom[c.kode];
    footerRow.push(val !== null ? String(val) : '-');
  }
  footerRow.push(rekap.rataRataKeseluruhan !== null ? String(rekap.rataRataKeseluruhan) : '-');
  rows.push(footerRow);

  autoTable(doc, {
    startY: tableStartY,
    head: [headCols],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 118, 110], // teal-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: isLandscape ? 65 : 55 },
    },
    didParseCell: (data) => {
      // Align center for numeric score columns
      if (data.column.index >= 2) {
        data.cell.styles.halign = 'center';
      }
      // Highlight footer row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 250];
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || 160;
  drawSignatures(doc, kop, lastTableY + 10);

  doc.save(`Rekap_Nilai_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Ekspor Jurnal Mengajar ke PDF (A4 Portrait)
 */
export function exportJurnalPdf(jurnalList: JurnalData[], kop: KopDanTandaTangan) {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const tableStartY = drawKop(doc, kop);

  const headers = [['No', 'Tanggal', 'P.Ke', 'Materi Pembelajaran', 'Catatan Lanjutan']];
  const rows = jurnalList.map((j, idx) => [
    idx + 1,
    j.tanggal,
    j.pertemuanKe || 1,
    j.materi,
    j.catatanPertemuanBerikutnya || '-',
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: headers,
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'left', cellWidth: 75 },
      4: { halign: 'left', cellWidth: 55 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || 160;
  drawSignatures(doc, kop, lastTableY + 10);

  doc.save(`Jurnal_Mengajar_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.pdf`);
}
