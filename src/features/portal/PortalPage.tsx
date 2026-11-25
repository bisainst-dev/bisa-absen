import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/useAuthStore';
import { DEMO_TENANT } from '../../services/auth/authService';
import { guruRepo, type GuruData } from '../guru/guruRepository';
import {
  Building,
  Users,
  UserCheck,
  CreditCard,
  QrCode,
  ShieldCheck,
  GraduationCap,
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  Award,
  BookOpen,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

export const PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const currentTenant = tenant || DEMO_TENANT;
  const currentRole = user?.peran || 'kepsek';

  const isKepsek = currentRole === 'kepsek';
  const isOperator = currentRole === 'operator';
  const isSuperAdmin = currentRole === 'superadmin';

  const [activeTab, setActiveTab] = useState<'kepsek' | 'operator' | 'billing'>(
    isKepsek ? 'kepsek' : 'operator'
  );

  // Operator tidak boleh membuka billing
  const effectiveTab = isKepsek
    ? 'kepsek'
    : activeTab === 'billing' && !isSuperAdmin
    ? 'operator'
    : activeTab;

  // State Simulasi Modal Pembayaran QRIS
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  // State Data Guru
  const [guruList, setGuruList] = useState<GuruData[]>([]);
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [showGuruListModal, setShowGuruListModal] = useState(false);

  // Form Tambah Guru
  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formTelepon, setFormTelepon] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Muat data guru dari repository
  const loadGuru = async () => {
    try {
      const list = await guruRepo.getAll();
      setGuruList(list);
    } catch (err) {
      console.error('Gagal memuat data guru:', err);
    }
  };

  useEffect(() => {
    loadGuru();
  }, []);

  const handleSimpanGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama lengkap guru wajib diisi');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email akun guru wajib diisi');
      return;
    }
    if (!formMapel.trim()) {
      setFormError('Mata pelajaran yang diampu wajib diisi');
      return;
    }
    if (!formKelas.trim()) {
      setFormError('Kelas yang diampu wajib diisi (contoh: Kelas 7A, 8B)');
      return;
    }

    try {
      await guruRepo.create({
        nama: formNama.trim(),
        nip: formNip.trim(),
        email: formEmail.trim(),
        mapel: formMapel.trim(),
        kelas: formKelas.trim(),
        telepon: formTelepon.trim(),
        status: 'Aktif',
      });

      await loadGuru();
      setFormNama('');
      setFormNip('');
      setFormEmail('');
      setFormMapel('');
      setFormKelas('');
      setFormTelepon('');
      setFormError(null);
      setFormSuccess('Guru berhasil ditambahkan!');
      setTimeout(() => {
        setFormSuccess(null);
        setShowAddGuruModal(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan saat menyimpan data guru');
    }
  };

  const handleHapusGuru = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus guru ${nama}?`)) {
      try {
        await guruRepo.delete(id);
        await loadGuru();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus guru');
      }
    }
  };

  // Data Mock Realistis untuk Tampilan Sekolah SMP Negeri 2 Tanjung
  const mockClassAttendance = [
    { kelas: 'Kelas 7A', guru: 'Pak Budi Santoso, S.Pd.', hadir: 31, total: 32, pct: 96.9, jurnal: true },
    { kelas: 'Kelas 7B', guru: 'Ibu Ratna Wulandari, M.Pd.', hadir: 30, total: 30, pct: 100, jurnal: true },
    { kelas: 'Kelas 8A', guru: 'Pak Ahmad Fauzi, S.Si.', hadir: 28, total: 30, pct: 93.3, jurnal: false },
    { kelas: 'Kelas 8B', guru: 'Ibu Ratna Wulandari, M.Pd.', hadir: 29, total: 31, pct: 93.5, jurnal: true },
    { kelas: 'Kelas 9A', guru: 'Pak Ahmad Fauzi, S.Si.', hadir: 31, total: 32, pct: 96.8, jurnal: false },
    { kelas: 'Kelas 9B', guru: 'Ibu Dewi Anggraeni, S.Pd.', hadir: 29, total: 30, pct: 96.7, jurnal: true },
  ];

  const totalSiswaSekolah = mockClassAttendance.reduce((acc, c) => acc + c.total, 0);
  const totalHadirSekolah = mockClassAttendance.reduce((acc, c) => acc + c.hadir, 0);
  const avgAttendance = ((totalHadirSekolah / totalSiswaSekolah) * 100).toFixed(1);
  const jurnalTerisi = mockClassAttendance.filter((c) => c.jurnal).length;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Header Profil Sekolah */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-teal-950 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {currentTenant.namaSekolah}
                </h1>
                <Badge variant="brand" className="uppercase text-[10px]">
                  {currentTenant.tier.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                NPSN: {currentTenant.npsn || '20104050'} • Jenjang {currentTenant.jenjang} • Status: Aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 px-4 text-right">
              <span className="text-[10px] text-slate-300 block uppercase font-bold">
                {isOperator ? 'Hak Akses' : isKepsek ? 'Jabatan' : 'Status Akun'}
              </span>
              <span className="text-sm font-extrabold text-teal-300">
                {isOperator ? 'Operator Sekolah' : isKepsek ? 'Kepala Sekolah' : 'Super Administrator'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Tab Navigasi Portal */}
      {!isKepsek ? (
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-sm font-bold gap-2">
          {(isSuperAdmin || isOperator) && (
            <button
              onClick={() => setActiveTab('operator')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'operator'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Portal Operator Sekolah</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('kepsek')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'kepsek'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Dashboard Kepala Sekolah</span>
            </button>
          )}

          {/* Menu Paket & Langganan SaaS HANYA untuk Superadmin, tidak muncul untuk Operator */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'billing'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Paket & Langganan SaaS</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-extrabold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span>Dashboard Eksekutif Kepala Sekolah</span>
          </div>
          <Badge variant="brand" className="text-xs">
            Akses Khusus Kepala Sekolah
          </Badge>
        </div>
      )}

      {/* =========================================================================
          TAB 1: DASHBOARD KEPALA SEKOLAH
      ========================================================================= */}
      {effectiveTab === 'kepsek' && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Eksekutif */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 border-l-4 border-l-brand-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Kehadiran Siswa</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{avgAttendance}%</span>
                <span className="text-xs text-emerald-600 font-bold">Baik</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{totalHadirSekolah} dari {totalSiswaSekolah} siswa hadir</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-teal-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Jurnal Terisi</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{jurnalTerisi}</span>
                <span className="text-xs text-slate-400 font-medium">/ {mockClassAttendance.length} Kelas</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {mockClassAttendance.length - jurnalTerisi} kelas belum mengisi jurnal
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Guru Aktif</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{guruList.length}</span>
                <span className="text-xs text-indigo-600 font-bold">Pengampu</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Status aktif mengajar</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Rombel Kelas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{mockClassAttendance.length}</span>
                <span className="text-xs text-amber-600 font-bold">Kelas</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tingkat VII, VIII, IX</p>
            </Card>
          </div>

          {/* Tabel Monitoring Kelas Real-Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Monitoring Kelas Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Data langsung tersinkronisasi dari ponsel masing-masing guru kelas
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/rekap?tab=absensi')} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh Rekap Dinas
              </Button>
            </div>

            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Guru Pengampu</th>
                      <th className="py-3 px-4 text-center">Kehadiran</th>
                      <th className="py-3 px-4 text-center">% Hadir</th>
                      <th className="py-3 px-4 text-center">Jurnal Hari Ini</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {mockClassAttendance.map((row) => (
                      <tr key={row.kelas} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {row.kelas}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {row.guru}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {row.hadir} / {row.total}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              row.pct >= 95
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {row.pct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.jurnal ? (
                            <Badge variant="success" className="text-[10px]">
                              Sudah Diisi
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              Belum Diisi
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => navigate('/rekap?tab=absensi')}
                          >
                            Detail <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PORTAL OPERATOR SEKOLAH
      ========================================================================= */}
      {!isKepsek && effectiveTab === 'operator' && (
        <div className="space-y-6">
          {/* 1. SEKSI FITUR REKAPITULASI (REKAP ABSENSI, REKAP NILAI, REKAP JURNAL) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                  <span>Pusat Rekapitulasi & Laporan Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Akses langsung dan ekspor dokumen laporan absensi, nilai, serta jurnal seluruh kelas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kartu 1: Rekap Absensi */}
              <Card className="p-5 space-y-3 border-t-4 border-t-emerald-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="success" className="text-[10px]">Format Dinas</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Rekap Absensi Siswa
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rekapitulasi kehadiran bulanan, total hadir, sakit, izin, dan alfa per rombel siswa.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=absensi')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Absensi
                </Button>
              </Card>

              {/* Kartu 2: Rekap Nilai */}
              <Card className="p-5 space-y-3 border-t-4 border-t-sky-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <Badge variant="brand" className="text-[10px]">Leger Nilai</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Rekap Nilai Siswa
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Daftar nilai tugas (T1-Tn), ulangan/PH (PH1-PHn), bobot persentase & rata-rata akhir.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=nilai')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Nilai
                </Button>
              </Card>

              {/* Kartu 3: Rekap Jurnal */}
              <Card className="p-5 space-y-3 border-t-4 border-t-indigo-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" className="text-[10px]">Agenda Harian</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Rekap Jurnal Guru
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Laporan materi ajar, jam tatap muka, dan catatan kendala pembelajaran per guru.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=jurnal')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Jurnal
                </Button>
              </Card>
            </div>
          </div>

          {/* 2. SEKSI KELOLA & TAMBAH GURU SEKOLAH */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-teal-600" />
                  <span>Kelola Guru & Staf Pengampu</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {guruList.length} guru aktif terdaftar di {currentTenant.namaSekolah}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowGuruListModal(true)}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Kelola Semua Guru ({guruList.length})
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs"
                  onClick={() => {
                    setFormError(null);
                    setShowAddGuruModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Guru
                </Button>
              </div>
            </div>

            {/* Cuplikan Daftar Guru */}
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Kelas Diampu</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {guruList.slice(0, 5).map((guru) => (
                      <tr key={guru.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {guru.nama}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {guru.nip || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-teal-700 dark:text-teal-300">
                          {guru.mapel}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {guru.kelas}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {guru.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="success" className="text-[10px]">
                            {guru.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleHapusGuru(guru.id, guru.nama)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {guruList.length > 5 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border-t text-center">
                  <button
                    onClick={() => setShowGuruListModal(true)}
                    className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                  >
                    Lihat {guruList.length - 5} guru lainnya...
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* 3. SEKSI MASTER SISWA & PENGATURAN INSTANSI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Master Data Siswa Sekolah
              </h4>
              <p className="text-xs text-slate-500">
                Impor data seluruh siswa dari format Dapodik atau Excel. Guru kelas akan otomatis menerima data rombel masing-masing.
              </p>
              <Button
                size="sm"
                variant="primary"
                className="w-full text-xs justify-center"
                onClick={() => navigate('/siswa')}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Buka Master Siswa
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Kop Sekolah & Pengesahan
              </h4>
              <p className="text-xs text-slate-500">
                Atur nama instansi, logo sekolah, NIP Kepala Sekolah untuk dicetak otomatis pada footer & header dokumen PDF/Word seluruh guru.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs justify-center"
                onClick={() => navigate('/pengaturan')}
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Konfigurasi Kop Resmi
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PAKET & LANGGANAN SAAS (HANYA UNTUK SUPERADMIN)
      ========================================================================= */}
      {isSuperAdmin && effectiveTab === 'billing' && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Pilihan Paket Langganan BISA Absen SaaS
            </h3>
            <p className="text-xs text-slate-500">
              Pilih paket sesuai kebutuhan Anda: guru mandiri atau institusi sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Paket 1: Guru Mandiri */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-slate-200 dark:border-slate-800">
              <div className="space-y-3">
                <Badge variant="neutral">Guru Individu</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Paket Guru Pro
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-brand-600">Rp99.000</span>
                    <span className="text-xs text-slate-400">/ tahun</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Auto Cloud Backup (Penyimpanan Aman)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinkronisasi Multi-Perangkat (HP & Laptop)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Ekspor Dokumen PDF/Excel Tanpa Watermark</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPaymentModal('Guru Pro (Rp99.000)')}
                className="w-full justify-center"
              >
                Pilih Paket Guru Pro
              </Button>
            </Card>

            {/* Paket 2: Sekolah Starter */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-2 border-brand-500 shadow-lg shadow-brand-500/10">
              <div className="absolute -top-3 right-4">
                <Badge variant="brand" className="font-extrabold">PALING LARIS</Badge>
              </div>

              <div className="space-y-3">
                <Badge variant="brand">Sekolah / Madrasah</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Sekolah Dasar / Menengah
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-brand-600">Rp1.200.000</span>
                    <span className="text-xs text-slate-400">/ tahun</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Semua fitur Guru Pro untuk <strong>s/d 25 Guru</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Dashboard Kepala Sekolah</strong> (Monitoring Live)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Portal Operator</strong> (Master siswa & guru)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Kop Sekolah & Pengesahan Otomatis</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowPaymentModal('Sekolah Dasar / Menengah (Rp1.200.000)')}
                className="w-full justify-center"
              >
                Perpanjang / Langganan
              </Button>
            </Card>

            {/* Paket 3: Yayasan */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-slate-200 dark:border-slate-800">
              <div className="space-y-3">
                <Badge variant="neutral">Yayasan Pendidikan</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Enterprise Yayasan
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">Hubungi Kami</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Multi-Sekolah dalam 1 Akun Yayasan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Unlimited Guru & Rombel Siswa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Integrasi API Database Dapodik / Kemenag</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => alert('Silakan hubungi WhatsApp resmi BISA Absen Enterprise: 0812-XXXX-XXXX')}
                className="w-full justify-center"
              >
                Konsultasi Yayasan
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: FORMULIR TAMBAH GURU BARU
      ========================================================================= */}
      {showAddGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 space-y-4 text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Tambah Guru Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan guru pengampu ke {currentTenant.namaSekolah}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddGuruModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSimpanGuru} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    NIP / NUPTK
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: 198503152010012015"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Akun Guru <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="budi@sekolah.sch.id"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Matematika / IPA"
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kelas yang Diampu <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Kelas 7A, Kelas 8B"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nomor HP / WhatsApp
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formTelepon}
                  onChange={(e) => setFormTelepon(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddGuruModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Simpan Guru
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: KELOLA SELURUH DAFTAR GURU
      ========================================================================= */}
      {showGuruListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl p-6 space-y-4 text-left relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Daftar Guru Pengampu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {guruList.length} guru di {currentTenant.namaSekolah}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs"
                  onClick={() => {
                    setShowAddGuruModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Guru
                </Button>
                <button
                  onClick={() => setShowGuruListModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-xl border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold sticky top-0 border-b">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-3">NIP</th>
                    <th className="py-2.5 px-3">Mapel</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Email & HP</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {guruList.map((guru, index) => (
                    <tr key={guru.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {guru.nama}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {guru.nip || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-teal-700 dark:text-teal-300">
                        {guru.mapel}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {guru.kelas}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        <div>{guru.email}</div>
                        {guru.telepon && <div className="text-slate-400">{guru.telepon}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleHapusGuru(guru.id, guru.nama)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowGuruListModal(false)}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SIMULASI PEMBAYARAN QRIS / VA (HANYA UNTUK SUPERADMIN)
      ========================================================================= */}
      {showPaymentModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 space-y-4 text-left relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Pembayaran Instan QRIS & VA
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-500">Paket yang dipilih:</span>
              <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {showPaymentModal}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <div className="w-44 h-44 mx-auto bg-slate-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                <QrCode className="w-24 h-24 text-slate-800 mb-1" />
                <span className="text-[10px] font-bold text-slate-500">QRIS STANDAR NASIONAL</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Scan dengan GoPay, OVO, ShopeePay, BCA Mobile, Livin Mandiri, atau BRImo
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Virtual Account Mandiri:</span>
                <span className="font-mono font-bold">88708 0812345678</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Transaksi:</span>
                <span className="text-amber-600 font-bold">Menunggu Pembayaran</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                alert('Simulasi: Pembayaran berhasil diverifikasi! Lisensi Anda telah diperpanjang.');
                setShowPaymentModal(null);
              }}
            >
              Simulasi Cek Status Pembayaran
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
