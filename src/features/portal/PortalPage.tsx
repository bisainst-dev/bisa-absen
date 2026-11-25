import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { DEMO_TENANT } from '../../services/auth/authService';
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
} from 'lucide-react';

export const PortalPage: React.FC = () => {
  const { user, tenant } = useAuthStore();
  const currentTenant = tenant || DEMO_TENANT;
  const currentRole = user?.peran || 'kepsek';

  const isKepsek = currentRole === 'kepsek';
  const isOperator = currentRole === 'operator';
  const isSuperAdmin = currentRole === 'superadmin';

  const [activeTab, setActiveTab] = useState<'kepsek' | 'operator' | 'billing'>(
    isKepsek ? 'kepsek' : 'operator'
  );

  const effectiveTab = isKepsek ? 'kepsek' : activeTab;

  // State Simulasi Modal Pembayaran QRIS
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  // Data Mock Realistis untuk Tampilan Sekolah
  const mockClassAttendance = [
    { kelas: 'Kelas 1A', guru: 'Ibu Ratna, S.Pd.', hadir: 28, total: 30, pct: 93.3, jurnal: true },
    { kelas: 'Kelas 2A', guru: 'Pak Ahmad, S.Pd.', hadir: 30, total: 30, pct: 100, jurnal: true },
    { kelas: 'Kelas 3B', guru: 'Ibu Dewi, S.Pd.', hadir: 27, total: 29, pct: 93.1, jurnal: false },
    { kelas: 'Kelas 4A', guru: 'Pak Budi Santoso, S.Pd.', hadir: 29, total: 30, pct: 96.7, jurnal: true },
    { kelas: 'Kelas 5A', guru: 'Pak Danang, M.Pd.', hadir: 26, total: 28, pct: 92.8, jurnal: false },
    { kelas: 'Kelas 6B', guru: 'Ibu Nurhayati, S.Pd.', hadir: 31, total: 32, pct: 96.8, jurnal: true },
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
              <span className="text-[10px] text-slate-300 block uppercase font-bold">Masa Aktif Lisensi</span>
              <span className="text-sm font-extrabold text-teal-300">340 Hari Tersisa</span>
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

          {(isSuperAdmin || isOperator) && (
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
              <span className="text-xs text-slate-500 font-bold block uppercase">Total Siswa Aktif</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalSiswaSekolah}</span>
                <span className="text-xs text-slate-400">Siswa</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Terbagi dalam 6 rombongan belajar</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-sky-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Jurnal Mengajar Hari Ini</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{jurnalTerisi} / {mockClassAttendance.length}</span>
                <span className="text-xs text-sky-600 font-bold">Kelas</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Guru telah mengisi catatan kelas</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Tidak Hadir (S/I/A)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{totalSiswaSekolah - totalHadirSekolah}</span>
                <span className="text-xs text-slate-400">Siswa</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Sakit: 5, Izin: 3, Alfa: 1</p>
            </Card>
          </div>

          {/* Tabel Kehadiran Realtime Seluruh Kelas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Monitoring Absensi & Jurnal Kelas Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Data langsung tersinkronisasi dari ponsel masing-masing guru kelas
                </p>
              </div>

              <Button size="sm" variant="outline" className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Unduh Laporan Dinas (PDF)
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
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
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                            Rincian <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Master Data Siswa Sekolah
              </h4>
              <p className="text-xs text-slate-500">
                Impor data siswa satu sekolah sekaligus dari format Dapodik atau Excel. Guru kelas akan otomatis menerima data siswa masing-masing.
              </p>
              <Button size="sm" variant="primary" className="w-full text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Impor Excel Massal
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Kelola Akun & Penugasan Guru
              </h4>
              <p className="text-xs text-slate-500">
                Atur akun guru pengampu, kelas yang diampu, dan hak akses jurnal mengajar di SMP Negeri 2 Tanjung.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs">
                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Atur 14 Guru Pengampu
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Kop Sekolah & Pengesahan
              </h4>
              <p className="text-xs text-slate-500">
                Atur nama instansi, logo sekolah, NIP Kepala Sekolah untuk dicetak otomatis pada footer & header dokumen PDF/Word seluruh guru.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs">
                Konfigurasi Kop Resmi
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PAKET & LANGGANAN SAAS (BILLING & PAYMENT GATEWAY)
      ========================================================================= */}
      {!isKepsek && effectiveTab === 'billing' && (
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

            {/* Paket 2: Sekolah Starter (POPULER) */}
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
                    <span><strong>Portal Operator</strong> (Impor massal data siswa)</span>
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

            {/* Paket 3: Yayasan / Multi-Sekolah */}
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

      {/* Modal Simulasi Pembayaran QRIS / VA */}
      {showPaymentModal && (
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

            {/* Simulasi Gambar QRIS */}
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
