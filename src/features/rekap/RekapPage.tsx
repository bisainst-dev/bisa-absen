import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useProfilStore } from '../../stores/useProfilStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { kelasRepo } from '../siswa/kelasRepository';
import { siswaRepo } from '../siswa/siswaRepository';
import { absensiRepo } from '../absensi/absensiRepository';
import { nilaiRepo } from '../nilai/nilaiRepository';
import { jurnalRepo } from '../jurnal/jurnalRepository';
import { guruRepo, type GuruData } from '../guru/guruRepository';
import {
  agregasiRekapAbsensi,
  agregasiRekapNilai,
  formatTanggalIndonesia,
  type KopDanTandaTangan,
} from '../../services/export/rekapAggregator';
import {
  exportRekapAbsensiPdf,
  exportRekapNilaiPdf,
  exportJurnalPdf,
} from '../../services/export/pdfExport';
import {
  exportRekapAbsensiExcel,
  exportRekapNilaiExcel,
  exportJurnalExcel,
} from '../../services/export/excelExport';
import {
  exportRekapAbsensiDocx,
  exportRekapNilaiDocx,
  exportJurnalDocx,
} from '../../services/export/wordExport';
import type { KelasData } from '../siswa/kelasSchema';
import type { SiswaData } from '../siswa/siswaSchema';
import type { AbsensiData } from '../absensi/absensiSchema';
import type { NilaiData } from '../nilai/nilaiSchema';
import type { JurnalData } from '../jurnal/jurnalSchema';
import {
  FileDown,
  UserCheck,
  Award,
  BookOpen,
  Eye,
  FileSpreadsheet,
  FileText,
  Check,
  Printer,
  GraduationCap,
  Search,
  X,
} from 'lucide-react';

export const RekapPage: React.FC = () => {
  const { profil } = useProfilStore();
  const { user } = useAuthStore();
  const isAdminOrOperator = user?.peran === 'superadmin' || user?.peran === 'operator' || user?.peran === 'kepsek';

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialReport =
    tabParam === 'nilai' || tabParam === 'jurnal' || tabParam === 'absensi'
      ? tabParam
      : 'absensi';
  const [activeReport, setActiveReport] = useState<'absensi' | 'nilai' | 'jurnal'>(initialReport);

  useEffect(() => {
    if (tabParam === 'absensi' || tabParam === 'nilai' || tabParam === 'jurnal') {
      setActiveReport(tabParam);
    }
  }, [tabParam]);

  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaData[]>([]);
  const [absensiSessions, setAbsensiSessions] = useState<AbsensiData[]>([]);
  const [nilaiColumns, setNilaiColumns] = useState<NilaiData[]>([]);
  const [jurnalItems, setJurnalItems] = useState<JurnalData[]>([]);
  const [guruList, setGuruList] = useState<GuruData[]>([]);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(() => searchParams.get('guruId') || '');
  const [guruSearchText, setGuruSearchText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState<string>('');

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function init() {
      try {
        const [kList, sList, aList, nList, jList, gList] = await Promise.all([
          kelasRepo.getAll(),
          siswaRepo.getAll(),
          absensiRepo.getAll(),
          nilaiRepo.getAll(),
          jurnalRepo.getAll(),
          guruRepo.getAll(),
        ]);

        setKelasList(kList);
        setSiswaList(sList);
        setAbsensiSessions(aList);
        setNilaiColumns(nList);
        setJurnalItems(jList);
        setGuruList(gList);

        const initialKelasId = kList[0]?.id || '';
        let initialMapel =
          profil?.mapel && profil.mapel.length > 0 ? profil.mapel[0] : 'Matematika';
        const initialSem = profil?.semester || 'Ganjil';
        const initialTP = profil?.tahunPelajaran || '2026/2027';

        const qGuruId = searchParams.get('guruId');
        if (qGuruId) {
          setSelectedGuruId(qGuruId);
          const found = gList.find((g) => g.id === qGuruId);
          if (found?.mapel) {
            initialMapel = found.mapel;
          }
        }

        setSelectedKelasId(initialKelasId);
        setSelectedMapel(initialMapel);
        setSelectedSemester(initialSem);
        setSelectedTahunPelajaran(initialTP);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [profil, searchParams]);

  const filteredGuruOptions = useMemo(() => {
    if (!guruSearchText.trim()) return guruList;
    const q = guruSearchText.toLowerCase();
    return guruList.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        (g.nip && g.nip.includes(q)) ||
        (g.mapel && g.mapel.toLowerCase().includes(q)) ||
        (g.kelas && g.kelas.toLowerCase().includes(q))
    );
  }, [guruList, guruSearchText]);

  const selectedGuru = useMemo(() => {
    return guruList.find((g) => g.id === selectedGuruId);
  }, [guruList, selectedGuruId]);

  const availableMapelList = useMemo(() => {
    const set = new Set<string>();
    if (selectedGuru?.mapel) set.add(selectedGuru.mapel);
    profil?.mapel?.forEach((m) => set.add(m));
    guruList.forEach((g) => { if (g.mapel) set.add(g.mapel); });
    absensiSessions.forEach((a) => { if (a.mapel) set.add(a.mapel); });
    nilaiColumns.forEach((n) => { if (n.mapel) set.add(n.mapel); });
    jurnalItems.forEach((j) => { if (j.mapel) set.add(j.mapel); });
    if (set.size === 0) {
      ['Matematika', 'Bahasa Indonesia', 'IPA Terpadu', 'Bahasa Inggris', 'Pendidikan Agama', 'PJOK', 'IPS', 'Informatika', 'Seni Budaya', 'PPKn'].forEach((m) => set.add(m));
    }
    return Array.from(set);
  }, [selectedGuru, profil, guruList, absensiSessions, nilaiColumns, jurnalItems]);

  const selectedKelas = useMemo(() => {
    return kelasList.find((k) => k.id === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelasId === selectedKelasId);
  }, [siswaList, selectedKelasId]);

  // Sesi absensi terpilih
  const filteredAbsensiSessions = useMemo(() => {
    return absensiSessions.filter(
      (a) =>
        a.kelasId === selectedKelasId &&
        (!selectedMapel || a.mapel.toLowerCase() === selectedMapel.toLowerCase())
    );
  }, [absensiSessions, selectedKelasId, selectedMapel]);

  // Rekap Absensi Terkalkulasi
  const rekapAbsensi = useMemo(() => {
    return agregasiRekapAbsensi(classStudents, filteredAbsensiSessions);
  }, [classStudents, filteredAbsensiSessions]);

  // Kolom Nilai Terpilih
  const filteredNilaiColumns = useMemo(() => {
    return nilaiColumns.filter(
      (n) =>
        n.kelasId === selectedKelasId &&
        n.mapel.toLowerCase() === selectedMapel.toLowerCase() &&
        n.semester === selectedSemester &&
        n.tahunPelajaran === selectedTahunPelajaran
    );
  }, [nilaiColumns, selectedKelasId, selectedMapel, selectedSemester, selectedTahunPelajaran]);

  // Rekap Nilai Terkalkulasi
  const rekapNilai = useMemo(() => {
    return agregasiRekapNilai(classStudents, filteredNilaiColumns);
  }, [classStudents, filteredNilaiColumns]);

  // Jurnal Terpilih
  const filteredJurnalItems = useMemo(() => {
    return jurnalItems.filter(
      (j) =>
        j.kelasId === selectedKelasId &&
        (!selectedMapel || j.mapel.toLowerCase() === selectedMapel.toLowerCase())
    );
  }, [jurnalItems, selectedKelasId, selectedMapel]);

  // Kop dan tanda tangan data
  const kopData: KopDanTandaTangan = useMemo(() => {
    let judul = 'REKAPITULASI KEHADIRAN SISWA';
    if (activeReport === 'nilai') judul = 'REKAPITULASI PENILAIAN SISWA';
    else if (activeReport === 'jurnal') judul = 'JURNAL AGENDA PEMBELAJARAN GURU';

    const guruName = selectedGuru ? selectedGuru.nama : (profil?.namaGuru || 'Budi Santoso, S.Pd.');
    const guruNip = selectedGuru ? (selectedGuru.nip || '') : (profil?.nip || '');

    return {
      judulDokumen: judul,
      sekolah: profil?.sekolah || 'SMP Negeri 2 Tanjung',
      tahunPelajaran: selectedTahunPelajaran || '2026/2027',
      semester: selectedSemester,
      kelasLabel: selectedKelas ? selectedKelas.label : '-',
      mapel: selectedMapel,
      namaGuru: guruName,
      nipGuru: guruNip,
      namaKepsek: profil?.kepalaSekolah || 'Dr. Hj. Siti Fatimah, M.Pd.',
      nipKepsek: profil?.nipKepsek || '197508151999032001',
      tampilkanKredit: profil?.tampilkanKredit ?? true,
      tanggalCetak: formatTanggalIndonesia(),
    };
  }, [profil, activeReport, selectedTahunPelajaran, selectedSemester, selectedKelas, selectedMapel, selectedGuru]);

  // Export handlers
  const handleExportPdf = () => {
    try {
      if (activeReport === 'absensi') {
        exportRekapAbsensiPdf(rekapAbsensi, kopData);
      } else if (activeReport === 'nilai') {
        exportRekapNilaiPdf(rekapNilai, kopData);
      } else if (activeReport === 'jurnal') {
        exportJurnalPdf(filteredJurnalItems, kopData);
      }
      showToast('Berkas PDF berhasil diunduh!');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal mengekspor PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      if (activeReport === 'absensi') {
        exportRekapAbsensiExcel(rekapAbsensi, kopData);
      } else if (activeReport === 'nilai') {
        exportRekapNilaiExcel(rekapNilai, kopData);
      } else if (activeReport === 'jurnal') {
        exportJurnalExcel(filteredJurnalItems, kopData);
      }
      showToast('Berkas Excel (.xlsx) berhasil diunduh!');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal mengekspor Excel');
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      if (activeReport === 'absensi') {
        await exportRekapAbsensiDocx(rekapAbsensi, kopData);
      } else if (activeReport === 'nilai') {
        await exportRekapNilaiDocx(rekapNilai, kopData);
      } else if (activeReport === 'jurnal') {
        await exportJurnalDocx(filteredJurnalItems, kopData);
      }
      showToast('Berkas Word (.docx) berhasil diunduh!');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal mengekspor Word');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat modul rekapitulasi...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-700/20 text-sm font-bold animate-in fade-in">
          <Check className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileDown className="w-7 h-7 text-brand-600" />
            Rekap & Unduh Dokumen
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cetak dan ekspor laporan resmi kelas ke PDF (A4 rapi), Excel (.xlsx), dan Word (.docx)
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-rose-600/20"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            PDF (A4)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Excel (.xlsx)
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isExporting}
            onClick={handleExportDocx}
            className="bg-sky-600 hover:bg-sky-700 text-white border-none shadow-sky-600/20"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Word (.docx)
          </Button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveReport('absensi')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
            activeReport === 'absensi'
              ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-400'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Rekap Absensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('nilai')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
            activeReport === 'nilai'
              ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-400'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Rekap Nilai Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('jurnal')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
            activeReport === 'jurnal'
              ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Jurnal Mengajar</span>
        </button>
      </div>

      {/* Filter Options Card */}
      <Card className="p-4 bg-white dark:bg-slate-900 border space-y-4">
        {/* Pencarian & Pemilihan Guru Pengampu (Khusus Admin & Operator) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                  Pencarian Guru Pengampu
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih guru untuk merekap nilai, absen, atau jurnal pembelajaran mereka
                </p>
              </div>
            </div>

            {isAdminOrOperator && (
              <Badge variant="warning" className="text-[10px]">
                Akses Admin / Operator
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Input Pencarian Guru */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Ketik untuk mencari nama / NIP / mapel guru..."
                value={guruSearchText}
                onChange={(e) => setGuruSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Dropdown Hasil Pencarian Guru */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedGuruId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedGuruId(id);
                  const found = guruList.find((g) => g.id === id);
                  if (found?.mapel) {
                    setSelectedMapel(found.mapel);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">
                  {selectedGuru ? '-- Ganti Pilihan Guru --' : `-- Guru Default (${profil?.namaGuru || 'Profil Saya'}) --`}
                </option>
                {filteredGuruOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} - {g.mapel || 'Semua Mapel'} (NIP: {g.nip || '-'})
                  </option>
                ))}
              </select>

              {selectedGuru && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuruId('');
                    setGuruSearchText('');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors shrink-0"
                  title="Reset pilihan guru"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tag Guru Terpilih Saat Ini */}
          {selectedGuru && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">Guru Ditampilkan:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border font-bold text-amber-700 dark:text-amber-400">
                {selectedGuru.nama}
              </span>
              {selectedGuru.nip && (
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border text-slate-500">
                  NIP. {selectedGuru.nip}
                </span>
              )}
              {selectedGuru.mapel && (
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 font-semibold">
                  Mapel: {selectedGuru.mapel}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kelas</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mapel</label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              {availableMapelList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tahun Pelajaran</label>
            <input
              type="text"
              value={selectedTahunPelajaran}
              onChange={(e) => setSelectedTahunPelajaran(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* PRATINJAU DOKUMEN (LIVE PREVIEW BEFORE DOWNLOAD) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-brand-600" />
            Pratinjau Dokumen Cetak (Format A4 Standar)
          </h2>
          <span className="text-xs text-slate-400">
            Tampilan persis sesuai berkas cetak PDF/Word
          </span>
        </div>

        {/* Lembar Kerja Dokumen A4 Putih */}
        <div className="p-6 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6 text-slate-900 dark:text-slate-100">
          {/* 1. KOP RESMI */}
          <div className="text-center space-y-1 border-b-2 border-slate-900 dark:border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-black tracking-wide">
              {kopData.sekolah.toUpperCase()}
            </h2>
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-brand-700 dark:text-brand-300">
              {kopData.judulDokumen}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tahun Pelajaran: {kopData.tahunPelajaran} ({kopData.semester}) &nbsp;|&nbsp; Kelas:{' '}
              {kopData.kelasLabel} &nbsp;|&nbsp; Mata Pelajaran: {kopData.mapel}
            </p>
          </div>

          {/* 2. TABEL DATA SESUAI TIPE LAPORAN */}
          {activeReport === 'absensi' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center font-bold">
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-10">No</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Nama Siswa</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-12">L/P</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-16">Hadir</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-16">Sakit</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-16">Izin</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-16">Alfa</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-20">% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapAbsensi.baris.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                          Belum ada data siswa atau absensi untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      rekapAbsensi.baris.map((b) => (
                        <tr key={b.siswaId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-slate-500 font-semibold">
                            {b.no}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 font-bold">
                            {b.nama}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center">
                            {b.jenisKelamin}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-semibold text-emerald-600">
                            {b.hadir}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-semibold text-amber-600">
                            {b.sakit}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-semibold text-sky-600">
                            {b.izin}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-semibold text-rose-600">
                            {b.alfa}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-extrabold">
                            {b.persenHadir}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {rekapAbsensi.baris.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-center">
                        <td colSpan={3} className="border border-slate-300 dark:border-slate-700 p-2 text-right">
                          TOTAL / REKAP KELAS ({rekapAbsensi.totalPertemuan} Pertemuan) :
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-emerald-600">
                          {rekapAbsensi.totalHadir}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-amber-600">
                          {rekapAbsensi.totalSakit}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-sky-600">
                          {rekapAbsensi.totalIzin}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-rose-600">
                          {rekapAbsensi.totalAlfa}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 font-black text-brand-600">
                          {rekapAbsensi.rataRataKehadiranKelas}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {activeReport === 'nilai' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center font-bold">
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-10">No</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Nama Siswa</th>
                      {rekapNilai.kolomList.map((col) => (
                        <th
                          key={col.id}
                          className="border border-slate-300 dark:border-slate-700 p-2 min-w-[50px]"
                        >
                          {col.kode}
                        </th>
                      ))}
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        Rata-rata
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapNilai.baris.length === 0 ? (
                      <tr>
                        <td
                          colSpan={rekapNilai.kolomList.length + 3}
                          className="p-6 text-center text-slate-400 italic"
                        >
                          Belum ada kolom penilaian tersimpan di semester ini.
                        </td>
                      </tr>
                    ) : (
                      rekapNilai.baris.map((b) => (
                        <tr key={b.siswaId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-slate-500 font-semibold">
                            {b.no}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 font-bold">
                            {b.nama}
                          </td>
                          {rekapNilai.kolomList.map((col) => {
                            const val = b.nilaiPerKolom[col.kode];
                            return (
                              <td
                                key={col.id}
                                className="border border-slate-300 dark:border-slate-700 p-2 text-center font-medium"
                              >
                                {val !== null && val !== undefined ? val : '-'}
                              </td>
                            );
                          })}
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-black bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                            {b.rataRata !== null ? b.rataRata : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {rekapNilai.baris.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-center">
                        <td colSpan={2} className="border border-slate-300 dark:border-slate-700 p-2 text-right">
                          RATA-RATA KELAS :
                        </td>
                        {rekapNilai.kolomList.map((col) => (
                          <td
                            key={col.id}
                            className="border border-slate-300 dark:border-slate-700 p-2 text-brand-600"
                          >
                            {rekapNilai.rataRataPerKolom[col.kode] ?? '-'}
                          </td>
                        ))}
                        <td className="border border-slate-300 dark:border-slate-700 p-2 font-black text-emerald-700 bg-emerald-100/60 dark:bg-emerald-950/60">
                          {rekapNilai.rataRataKeseluruhan ?? '-'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {activeReport === 'jurnal' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center font-bold">
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-10">No</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-28">Tanggal</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 w-16">P. Ke</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Materi Pembelajaran</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Catatan Lanjutan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJurnalItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                          Belum ada catatan jurnal mengajar untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredJurnalItems.map((j, idx) => (
                        <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-slate-500 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-medium">
                            {j.tanggal}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-bold">
                            {j.pertemuanKe || 1}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 font-medium">
                            {j.materi}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400">
                            {j.catatanPertemuanBerikutnya || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. BLOK TANDA TANGAN RESMI */}
          <div className="pt-8 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Sekolah,</p>
              <div className="h-16" />
              <p className="font-bold underline">
                {kopData.namaKepsek || '( ........................................ )'}
              </p>
              <p className="text-slate-500">NIP. {kopData.nipKepsek || '........................................'}</p>
            </div>

            <div className="space-y-1 text-right">
              <p>Dibuat pada: {kopData.tanggalCetak}</p>
              <p className="font-bold">Guru Mata Pelajaran,</p>
              <div className="h-16" />
              <p className="font-bold underline">
                {kopData.namaGuru || '( ........................................ )'}
              </p>
              <p className="text-slate-500">NIP. {kopData.nipGuru || '........................................'}</p>
            </div>
          </div>

          {/* Footer Kredit */}
          {kopData.tampilkanKredit && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
              Dokumen resmi diolah secara otomatis via Esduta Gate - Asisten Administrasi Guru
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
