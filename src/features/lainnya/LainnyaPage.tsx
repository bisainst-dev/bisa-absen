import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfilStore } from '../../stores/useProfilStore';
import { authService } from '../../services/auth/authService';
import { AuthModal } from '../auth/AuthModal';
import {
  Users,
  Award,
  Sparkles,
  ClipboardList,
  FileDown,
  Database,
  Settings,
  ChevronRight,
  ShieldCheck,
  Building,
  LogOut,
  Cloud,
  GraduationCap,
  Calendar,
  UserCheck,
  BookOpen,
} from 'lucide-react';

export const LainnyaPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const currentRole = user?.peran || 'guru';
  const isSuperAdmin = currentRole === 'superadmin';
  const isKepsek = currentRole === 'kepsek';
  const isOperator = currentRole === 'operator';
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Filter Menu Berdasarkan Hak Akses Level Akun
  const menuList = isSuperAdmin
    ? [
      {
        to: '/portal',
        title: 'Portal Manajemen & Pengawasan Sekolah',
        desc: 'Statistik realtime, monitoring guru, dan paket langganan SaaS',
        icon: Building,
        color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
      },
      {
        to: '/portal',
        title: 'Kelola Akun Guru & Rombel',
        desc: 'Tambah akun guru, penugasan mata pelajaran, dan wali kelas',
        icon: GraduationCap,
        color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
      },
      {
        to: '/siswa',
        title: 'Master Siswa Sekolah',
        desc: 'Basis data seluruh siswa, kenaikan kelas, dan impor Excel/Dapodik',
        icon: Users,
        color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
      },
      {
        to: '/absensi',
        title: 'Absensi Harian Guru & Siswa',
        desc: 'Pantau dan isi kehadiran siswa per kelas dan mata pelajaran',
        icon: UserCheck,
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      },
      {
        to: '/jurnal',
        title: 'Jurnal & Agenda Mengajar',
        desc: 'Catatan materi pertemuan, kendala kelas, dan tindak lanjut',
        icon: BookOpen,
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      },
      {
        to: '/jadwal',
        title: 'Jadwal Pembelajaran',
        desc: 'Agenda jam mengajar mingguan dan kalender akademik',
        icon: Calendar,
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      },
      {
        to: '/nilai',
        title: 'Penilaian Siswa',
        desc: 'Daftar nilai tugas, penilaian harian, dan rata-rata',
        icon: Award,
        color: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
      },
      {
        to: '/rekap',
        title: 'Rekap & Ekspor Laporan Dinas',
        desc: 'Cetak dan unduh berkas resmi PDF, Excel, dan Word',
        icon: FileDown,
        color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
      },
      {
        to: '/kegiatan',
        title: 'Ekstrakurikuler & Les Tambahan',
        desc: 'Pengelolaan kegiatan non-akademik siswa lintas kelas',
        icon: Sparkles,
        color: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400',
      },
      {
        to: '/catatan',
        title: 'Catatan Siswa & Pengingat',
        desc: 'Log bimbingan konseling dan catatan perkembangan siswa',
        icon: ClipboardList,
        color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
      },
      {
        to: '/backup',
        title: 'Cadangan & Pemulihan Database',
        desc: 'Ekspor berkas .backup.json dan audit keutuhan data sistem',
        icon: Database,
        color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
      },
      {
        to: '/pengaturan',
        title: 'Pengaturan Sekolah & Kop Dinas',
        desc: 'Nama sekolah, logo, NIP kepala sekolah, dan konfigurasi sistem',
        icon: Settings,
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      },
    ]
    : isKepsek
    ? [
      {
        to: '/portal',
        title: 'Dashboard Eksekutif Kepala Sekolah',
        desc: 'Monitoring absensi seluruh kelas & jurnal guru live',
        icon: ShieldCheck,
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      },
      {
        to: '/rekap',
        title: 'Rekap & Unduh Dokumen Sekolah',
        desc: 'Ekspor laporan kehadiran dan nilai format resmi dinas',
        icon: FileDown,
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      },
      {
        to: '/backup',
        title: 'Cadangan & Pulihkan Data',
        desc: 'Simpan file cadangan .backup.json & pulihkan',
        icon: Database,
        color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
      },
      {
        to: '/pengaturan',
        title: 'Pengaturan Sekolah & Profil',
        desc: 'Nama sekolah, kop dinas, tema, dan preferensi',
        icon: Settings,
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      },
    ]
    : isOperator
      ? [
        {
          to: '/portal',
          title: 'Portal Operator Sekolah',
          desc: 'Dashboard manajemen utama sekolah dan statistik',
          icon: Building,
          color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
        },
        {
          to: '/portal',
          title: 'Master Mata Pelajaran',
          desc: 'Kelola kurikulum mata pelajaran sekolah, kode, dan kelompok',
          icon: BookOpen,
          color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        },
        {
          to: '/pengaturan',
          title: 'Kop Sekolah & Pengesahan',
          desc: 'Nama sekolah resmi, logo, dan NIP Kepala Sekolah',
          icon: Settings,
          color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        },
        {
          to: '/siswa',
          title: 'Kelola & Impor Siswa Sekolah',
          desc: 'Daftar seluruh siswa dan impor template Excel/Dapodik',
          icon: Users,
          color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
        },
        {
          to: '/rekap',
          title: 'Rekap Absensi, Nilai & Jurnal',
          desc: 'Ekspor laporan kehadiran, nilai, dan agenda mengajar dinas',
          icon: FileDown,
          color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        },
        {
          to: '/backup',
          title: 'Cadangan & Pulihkan Data',
          desc: 'Simpan file cadangan .backup.json & pulihkan',
          icon: Database,
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        },
      ]
      : [
        // Guru HANYA melihat dan mengakses fitur guru (Portal disembunyikan sepenuhnya!)
        {
          to: '/siswa',
          title: 'Kelola Siswa & Kelas',
          desc: 'Daftar siswa, pindah kelas, dan impor Excel',
          icon: Users,
          color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
        },
        {
          to: '/nilai',
          title: 'Penilaian Siswa',
          desc: 'Input nilai T1..Tn, PH1..PHn & rata-rata otomatis',
          icon: Award,
          color: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
        },
        {
          to: '/kegiatan',
          title: 'Ekstrakurikuler & Les',
          desc: 'Anggota lintas kelas, absensi kegiatan, jurnal les',
          icon: Sparkles,
          color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        },
        {
          to: '/catatan',
          title: 'Catatan & Pengingat',
          desc: 'Pengingat harian/mingguan dan catatan penting',
          icon: ClipboardList,
          color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
        },
        {
          to: '/rekap',
          title: 'Rekap & Unduh Dokumen',
          desc: 'Ekspor laporan ke PDF, Excel, dan Word',
          icon: FileDown,
          color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        },
        {
          to: '/backup',
          title: 'Cadangan & Pulihkan Data',
          desc: 'Simpan file cadangan .backup.json & pulihkan',
          icon: Database,
          color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        },
        {
          to: '/pengaturan',
          title: 'Pengaturan & Profil',
          desc: 'Biodata guru, sekolah, tema, dan preferensi',
          icon: Settings,
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        },
      ];

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await authService.logout();
  };

  const handleResetTeacher = async () => {
    setShowLogoutConfirm(false);
    await authService.logout();
    await useProfilStore.getState().resetProfil();
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Menu Lainnya
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isKepsek
            ? 'Portal kepengawasan dan pelaporan eksekutif sekolah'
            : isOperator
              ? 'Pengelolaan master data dan konfigurasi sekolah'
              : 'Akses modul administrasi harian mengajar guru'}
        </p>
      </div>

      {/* Daftar Menu Dinamis Sesuai Peran Akun */}
      <div className="space-y-2.5">
        {menuList.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.color} group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </Link>
          );
        })}
      </div>

      {/* Bagian Manajemen Akun & Menu Logout untuk Semua Akun */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Akun & Sesi Pengguna
        </h2>

        {isAuthenticated && user ? (
          <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold">
                  {user.namaPanggilan?.charAt(0) || user.namaLengkap.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {user.namaLengkap}
                    </h4>
                    <Badge variant="brand" className="uppercase text-[10px]">
                      {user.peran}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-xs justify-center"
              >
                <LogOut className="w-4 h-4 mr-1.5" /> Keluar Akun (Logout)
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Mode Offline Lokal
                </h4>
                <p className="text-xs text-slate-500">
                  Data tersimpan di HP. Hubungkan cloud untuk sinkronisasi antar-perangkat.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs"
            >
              Masuk Akun
            </Button>
          </Card>
        )}
      </div>

      {/* Info Aplikasi */}
      <Card className="p-4 bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Esduta Gate v1.0.0
            </p>
            <p className="mt-0.5 text-[11px]">
              Platform Administrasi Guru Terpadu • Siap Online & Offline.
            </p>
          </div>
        </div>
      </Card>

      {/* Modal Konfirmasi Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Keluar Akun
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apakah Anda yakin ingin keluar dari akun ini?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Pilih tindakan yang Anda inginkan:
            </p>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-center text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Keluar Akun Cloud (Mode Offline)
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleResetTeacher}
                className="w-full justify-center text-xs"
              >
                Ganti Guru / Reset Sesi Pengguna
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full justify-center text-xs"
              >
                Batal
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
