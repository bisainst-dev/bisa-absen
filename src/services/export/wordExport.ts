import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import type {
  RekapAbsensiResult,
  RekapNilaiResult,
  KopDanTandaTangan,
} from './rekapAggregator';
import type { JurnalData } from '../../features/jurnal/jurnalSchema';

function downloadDocxBlob(blob: Blob, filename: string) {
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
 * Buat Kop & Informasi Dokumen Formal
 */
function createDocxKop(kop: KopDanTandaTangan): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: kop.sekolah.toUpperCase(),
          bold: true,
          size: 26, // 13pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: kop.judulDokumen.toUpperCase(),
          bold: true,
          size: 22, // 11pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Tahun Pelajaran: ${kop.tahunPelajaran} (${kop.semester})  |  Kelas: ${kop.kelasLabel}  |  Mapel: ${kop.mapel}`,
          size: 18,
          color: '555555',
        }),
      ],
    }),
  ];
}

/**
 * Buat Blok Tanda Tangan Formal
 */
function createDocxSignatures(kop: KopDanTandaTangan): Table {
  const invisibleBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorders = {
    top: invisibleBorder,
    bottom: invisibleBorder,
    left: invisibleBorder,
    right: invisibleBorder,
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({ text: 'Mengetahui,', spacing: { after: 50 } }),
              new Paragraph({ text: 'Kepala Sekolah,', spacing: { after: 600 } }), // Ruang tanda tangan
              new Paragraph({
                children: [
                  new TextRun({
                    text: kop.namaKepsek || '( ........................................ )',
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                text: `NIP. ${kop.nipKepsek || '........................................'}`,
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({ text: `Dibuat pada: ${kop.tanggalCetak}`, spacing: { after: 50 } }),
              new Paragraph({ text: 'Guru Mata Pelajaran,', spacing: { after: 600 } }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: kop.namaGuru || '( ........................................ )',
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                text: `NIP. ${kop.nipGuru || '........................................'}`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Ekspor Rekapitulasi Absensi ke Word (.docx)
 */
export async function exportRekapAbsensiDocx(
  rekap: RekapAbsensiResult,
  kop: KopDanTandaTangan
) {
  const tableRows: TableRow[] = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: ['No', 'Nama Siswa', 'L/P', 'H', 'S', 'I', 'A', '% Hadir'].map(
        (text, i) =>
          new TableCell({
            width: { size: i === 1 ? 40 : 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'E2E8F0' },
            children: [
              new Paragraph({
                alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    })
  );

  // Data Rows
  for (const b of rekap.baris) {
    tableRows.push(
      new TableRow({
        children: [
          String(b.no),
          b.nama,
          b.jenisKelamin,
          String(b.hadir),
          String(b.sakit),
          String(b.izin),
          String(b.alfa),
          `${b.persenHadir}%`,
        ].map(
          (text, i) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun({ text, size: 18 })],
                }),
              ],
            })
        ),
      })
    );
  }

  // Total Row
  tableRows.push(
    new TableRow({
      children: [
        '',
        'TOTAL / REKAP KELAS',
        '',
        String(rekap.totalHadir),
        String(rekap.totalSakit),
        String(rekap.totalIzin),
        String(rekap.totalAlfa),
        `${rekap.rataRataKehadiranKelas}%`,
      ].map(
        (text, i) =>
          new TableCell({
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const children: (Paragraph | Table)[] = [
    ...createDocxKop(kop),
    table,
    new Paragraph({ text: '', spacing: { after: 300 } }),
    createDocxSignatures(kop),
  ];

  if (kop.tampilkanKredit) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: 'Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru',
            size: 16,
            color: '888888',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `Rekap_Absensi_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.docx`);
}

/**
 * Ekspor Rekapitulasi Nilai ke Word (.docx)
 */
export async function exportRekapNilaiDocx(
  rekap: RekapNilaiResult,
  kop: KopDanTandaTangan
) {
  const tableRows: TableRow[] = [];

  const headers = ['No', 'Nama Siswa', ...rekap.kolomList.map((c) => c.kode), 'Rata-rata'];
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (text, i) =>
          new TableCell({
            shading: { fill: 'E2E8F0' },
            children: [
              new Paragraph({
                alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    })
  );

  for (const b of rekap.baris) {
    const rowCells = [
      String(b.no),
      b.nama,
      ...rekap.kolomList.map((c) => {
        const v = b.nilaiPerKolom[c.kode];
        return v !== null && v !== undefined ? String(v) : '-';
      }),
      b.rataRata !== null ? String(b.rataRata) : '-',
    ];

    tableRows.push(
      new TableRow({
        children: rowCells.map(
          (text, i) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun({ text, size: 18 })],
                }),
              ],
            })
        ),
      })
    );
  }

  // Footer Row
  const footerCells = [
    '',
    'RATA-RATA KELAS',
    ...rekap.kolomList.map((c) => {
      const v = rekap.rataRataPerKolom[c.kode];
      return v !== null ? String(v) : '-';
    }),
    rekap.rataRataKeseluruhan !== null ? String(rekap.rataRataKeseluruhan) : '-',
  ];

  tableRows.push(
    new TableRow({
      children: footerCells.map(
        (text, i) =>
          new TableCell({
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const children: (Paragraph | Table)[] = [
    ...createDocxKop(kop),
    table,
    new Paragraph({ text: '', spacing: { after: 300 } }),
    createDocxSignatures(kop),
  ];

  if (kop.tampilkanKredit) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: 'Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru',
            size: 16,
            color: '888888',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `Rekap_Nilai_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.docx`);
}

/**
 * Ekspor Jurnal Mengajar ke Word (.docx)
 */
export async function exportJurnalDocx(
  jurnalList: JurnalData[],
  kop: KopDanTandaTangan
) {
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: ['No', 'Tanggal', 'P.Ke', 'Materi Pembelajaran', 'Catatan Lanjutan'].map(
        (text, i) =>
          new TableCell({
            shading: { fill: 'E2E8F0' },
            children: [
              new Paragraph({
                alignment: i >= 3 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    })
  );

  for (let idx = 0; idx < jurnalList.length; idx++) {
    const j = jurnalList[idx];
    tableRows.push(
      new TableRow({
        children: [
          String(idx + 1),
          j.tanggal,
          String(j.pertemuanKe || 1),
          j.materi,
          j.catatanPertemuanBerikutnya || '-',
        ].map(
          (text, i) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: i >= 3 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun({ text, size: 18 })],
                }),
              ],
            })
        ),
      })
    );
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const children: (Paragraph | Table)[] = [
    ...createDocxKop(kop),
    table,
    new Paragraph({ text: '', spacing: { after: 300 } }),
    createDocxSignatures(kop),
  ];

  if (kop.tampilkanKredit) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: 'Dokumen diolah otomatis via Saku Guru - Asisten Administrasi Guru',
            size: 16,
            color: '888888',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `Jurnal_Mengajar_${kop.kelasLabel}_${kop.mapel.replace(/\s+/g, '_')}.docx`);
}
