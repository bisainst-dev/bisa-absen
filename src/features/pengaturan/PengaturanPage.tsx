import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { Badge } from '../../components/ui/Badge';
import { useProfilStore } from '../../stores/useProfilStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/auth/authService';
import { AuthModal } from '../auth/AuthModal';
import { pengaturanRepo } from './repository';
import {
  School,
  Moon,
  Bell,
  Volume2,
  FileText,
  Check,
  HelpCircle,
  LogOut,
  Cloud,
} from 'lucide-react';

export const PengaturanPage: React.FC = () => {
  const { profil, saveProfil } = useProfilStore();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form states profil
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [namaGuru, setNamaGuru] = useState('');
  const [nip, setNip] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [tahunPelajaran, setTahunPelajaran] = useState('');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepsek, setNipKepsek] = useState('');
  const [tampilkanKredit, setTampilkanKredit] = useState(true);

  // Pengaturan states
  const [pengingatAktif, setPengingatAktif] = useState(true);
  const [suaraPengingat, setSuaraPengingat] = useState(true);
  const [suaraTts, setSuaraTts] = useState(true);
  const [jamSenyapAktif, setJamSenyapAktif] = useState(false);
  const [jamSenyapMulai, setJamSenyapMulai] = useState('21:00');
  const [jamSenyapSelesai, setJamSenyapSelesai] = useState('06:00');

  useEffect(() => {
    async function loadData() {
      if (profil) {
        setNamaPanggilan(profil.namaPanggilan);
        setNamaGuru(profil.namaGuru);
        setNip(profil.nip || '');
        setSekolah(profil.sekolah);
        setTahunPelajaran(profil.tahunPelajaran);
        setSemester(profil.semester || 'Ganjil');
        setKepalaSekolah(profil.kepalaSekolah || '');
        setNipKepsek(profil.nipKepsek || '');
        setTampilkanKredit(profil.tampilkanKredit ?? true);
      }
      const p = await pengaturanRepo.getPengaturan();
      setPengingatAktif(p.pengingatAktif);
      setSuaraPengingat(p.suaraPengingat);
      setSuaraTts(p.suaraTts);
      setJamSenyapAktif(p.jamSenyapAktif);
      setJamSenyapMulai(p.jamSenyapMulai);
      setJamSenyapSelesai(p.jamSenyapSelesai);
      setLoading(false);
    }
    loadData();
  }, [profil]);

  const handleSaveAll = async () => {
    try {
      await saveProfil({
        namaPanggilan,
        namaGuru,
        nip,
        sekolah,
        tahunPelajaran,
        semester,
        kepalaSekolah,
        nipKepsek,
        tampilkanKredit,
      });

      await pengaturanRepo.savePengaturan({
        pengingatAktif,
        suaraPengingat,
        suaraTts,
        jamSenyapAktif,
        jamSenyapMulai,
        jamSenyapSelesai,
        tampilkanKreditDokumen: tampilkanKredit,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan perubahan');
    }
  };

  const handleTestTts = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Halo ${namaPanggilan || 'Ibu Guru'}, ini adalah uji coba pengingat suara BISA Absen.`
      );
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Browser Anda tidak mendukung Web Speech API');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Pengaturan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola profil guru, preferensi tampilan, dan pengingat.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4" />
            Tersimpan!
          </div>
        )}
      </div>

      {/* 1. Tampilan Tema */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Mode Tampilan
              </h3>
              <p className="text-xs text-slate-500">Pilih tema terang, gelap, atau ikuti sistem perangkat</p>
            </div>
          </div>
        </div>
        <div className="pt-1">
          <ThemeToggle />
        </div>
      </Card>

      {/* 2. Biodata & Sekolah */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Biodata Guru & Sekolah
            </h3>
            <p className="text-xs text-slate-500">Digunakan untuk kop laporan, rekap absensi, dan nilai</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Panggilan"
              value={namaPanggilan}
              onChange={(e) => setNamaPanggilan(e.target.value)}
              helperText="Untuk sapaan ramah di Beranda"
            />
            <Input
              label="Nama Lengkap & Gelar"
              value={namaGuru}
              onChange={(e) => setNamaGuru(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="NIP"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="-"
            />
            <Input
              label="Nama Sekolah"
              value={sekolah}
              onChange={(e) => setSekolah(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tahun Pelajaran"
              value={tahunPelajaran}
              onChange={(e) => setTahunPelajaran(e.target.value)}
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Semester
              </label>
              <select
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                value={semester}
                onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Input
              label="Nama Kepala Sekolah"
              value={kepalaSekolah}
              onChange={(e) => setKepalaSekolah(e.target.value)}
              placeholder="Nama Kepala Sekolah"
            />
            <Input
              label="NIP Kepala Sekolah"
              value={nipKepsek}
              onChange={(e) => setNipKepsek(e.target.value)}
              placeholder="NIP Kepala Sekolah"
            />
          </div>
        </div>
      </Card>

      {/* 3. Pengingat & Suara */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Pengingat Mengajar & Notifikasi
            </h3>
            <p className="text-xs text-slate-500">Notifikasi jadwal mengajar & suara sapaan</p>
          </div>
        </div>

        {/* Kejujuran Teknis Alert */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <HelpCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <p>
            <strong>Catatan Teknis:</strong> Pengingat bekerja paling baik jika aplikasi dipasang (Install PWA) ke layar utama dan izin notifikasi diberikan pada peramban.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Aktifkan Pengingat Jadwal
              </p>
              <p className="text-xs text-slate-500">Kirim pemberitahuan sebelum jam mengajar dimulai</p>
            </div>
            <input
              type="checkbox"
              checked={pengingatAktif}
              onChange={(e) => setPengingatAktif(e.target.checked)}
              className="w-5 h-5 rounded text-brand-600 accent-brand-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Suara Panggilan / Speech TTS
              </p>
              <p className="text-xs text-slate-500">Menyebut nama panggilan Bapak/Ibu saat jadwal tiba</p>
            </div>
            <input
              type="checkbox"
              checked={suaraTts}
              onChange={(e) => setSuaraTts(e.target.checked)}
              className="w-5 h-5 rounded text-brand-600 accent-brand-600"
            />
          </label>

          <div className="pt-2 flex justify-start">
            <Button type="button" variant="outline" size="sm" onClick={handleTestTts}>
              <Volume2 className="w-4 h-4 mr-1.5" /> Uji Suara Pengingat
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Format Laporan & Kredit */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Format Dokumen Cetak
            </h3>
            <p className="text-xs text-slate-500">Pengaturan footer dan atribusi dokumen</p>
          </div>
        </div>

        <label className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              Tampilkan Catatan Kaki 'Dibuat dengan BISA Absen'
            </p>
            <p className="text-xs text-slate-500">Dapat dimatikan bila menginginkan dokumen polos</p>
          </div>
          <input
            type="checkbox"
            checked={tampilkanKredit}
            onChange={(e) => setTampilkanKredit(e.target.checked)}
            className="w-5 h-5 rounded text-brand-600 accent-brand-600"
          />
        </label>
      </Card>

      {/* 5. Akun & Sesi Pengguna (Menu Logout untuk Semua Akun) */}
      <Card className="space-y-4 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Akun & Sinkronisasi Cloud
            </h3>
            <p className="text-xs text-slate-500">Status koneksi akun dan pengelolaan sesi</p>
          </div>
        </div>

        {isAuthenticated && user ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-base">
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
                {user.sekolahNama && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                    {user.sekolahNama}
                  </p>
                )}
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
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Sedang Menggunakan Mode Offline Lokal
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Semua data Anda tersimpan aman di HP ini. Masuk ke akun cloud untuk sinkronisasi antar-perangkat.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs whitespace-nowrap"
            >
              Masuk / Hubungkan Cloud
            </Button>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="primary" size="lg" onClick={handleSaveAll} className="w-full sm:w-auto">
          Simpan Semua Pengaturan
        </Button>
      </div>

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
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await authService.logout();
                }}
                className="w-full justify-center text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Keluar Akun Cloud (Mode Offline)
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await authService.logout();
                  await useProfilStore.getState().resetProfil();
                }}
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
