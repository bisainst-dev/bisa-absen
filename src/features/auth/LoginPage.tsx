import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth/authService';
import { syncEngine } from '../../services/sync/syncEngine';
import { useProfilStore } from '../../stores/useProfilStore';
import type { UserRole } from '../../types/saas';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  GraduationCap,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveProfil } = useProfilStore();

  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form State: Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form State: Registrasi
  const [regPeran, setRegPeran] = useState<UserRole>('guru');
  const [regNamaLengkap, setRegNamaLengkap] = useState('');
  const [regNamaPanggilan, setRegNamaPanggilan] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSekolah, setRegSekolah] = useState('SMP Negeri 2 Tanjung');
  const [regNip, setRegNip] = useState('');
  const [regMapel, setRegMapel] = useState('Matematika');
  const [regKelas, setRegKelas] = useState('Kelas 7A');
  const [regTelepon, setRegTelepon] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Handler Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLoginError('Silakan masukkan alamat email akun Anda');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const user = await authService.loginWithEmail(email.trim());

      // Langsung tandai isOnboarded: true agar tidak pernah masuk ke halaman onboarding
      await saveProfil({
        namaGuru: user.namaLengkap,
        namaPanggilan: user.namaPanggilan || user.namaLengkap.split(' ')[0],
        sekolah: user.sekolahNama || 'SMP Negeri 2 Tanjung',
        isOnboarded: true,
      });

      // Sinkronisasi cloud
      await syncEngine.syncNow().catch(() => { });

      // Arahkan ke rute sesuai peran
      if (user.peran === 'kepsek' || user.peran === 'operator') {
        navigate('/portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setLoginError('Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handler Registrasi Akun Baru
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regNamaLengkap.trim()) {
      setRegError('Nama lengkap wajib diisi');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Alamat email akun wajib diisi');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Kata sandi minimal 6 karakter');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setRegLoading(true);

    try {
      const user = await authService.register({
        namaLengkap: regNamaLengkap.trim(),
        namaPanggilan: regNamaPanggilan.trim() || regNamaLengkap.trim().split(' ')[0],
        email: regEmail.trim(),
        password: regPassword,
        peran: regPeran,
        sekolahNama: regSekolah.trim() || 'SMP Negeri 2 Tanjung',
        telepon: regTelepon.trim() || undefined,
      });

      // Update profil lokal guru jika peran guru
      await saveProfil({
        namaGuru: user.namaLengkap,
        namaPanggilan: user.namaPanggilan || user.namaLengkap.split(' ')[0],
        sekolah: user.sekolahNama || 'SMP Negeri 2 Tanjung',
        nip: regNip.trim() || undefined,
        mapel: regPeran === 'guru' && regMapel.trim() ? [regMapel.trim()] : undefined,
        kelasDiampu: regPeran === 'guru' && regKelas.trim() ? regKelas.split(',').map((k) => k.trim()) : undefined,
        isOnboarded: true,
      });

      setRegSuccess('Akun berhasil didaftarkan! Mengalihkan ke aplikasi...');

      await syncEngine.syncNow().catch(() => { });

      setTimeout(() => {
        if (user.peran === 'kepsek' || user.peran === 'operator') {
          navigate('/portal', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      setRegError(err instanceof Error ? err.message : 'Gagal mendaftar akun');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="Esduta Gate"
            className="w-24 h-24 mx-auto object-contain drop-shadow-md animate-in zoom-in-90 duration-300"
          />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Esduta <span className="text-brand-600 dark:text-brand-400">Gate</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
            Asisten Administrasi Harian Guru & Portal Sekolah Terpadu
          </p>
        </div>

        {/* Card Formulir: Switch Tab Masuk / Daftar */}
        <Card className="p-6 sm:p-8 space-y-5 shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-left">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'register'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Akun</span>
            </button>
          </div>

          {/* =========================================================================
              FORM 1: MASUK (LOGIN)
          ========================================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Masuk ke Akun Anda
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Masukkan email dan kata sandi akun Anda
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: guru@sekolah.sch.id"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center py-3 text-sm font-bold shadow-md shadow-brand-600/20"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span>Memverifikasi Akun...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Masuk ke Aplikasi <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Tombol beralih ke daftar akun */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Daftar Akun Baru di Sini
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              FORM 2: DAFTAR AKUN BARU (REGISTRASI)
          ========================================================================= */}
          {activeTab === 'register' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Daftar Akun Baru
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lengkapi identitas untuk membuat akun sekolah Anda
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Pilihan Peran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Daftar Sebagai <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegPeran('guru')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${regPeran === 'guru'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                        }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mx-auto mb-1" />
                      Guru
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPeran('kepsek')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${regPeran === 'kepsek'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                        }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1" />
                      Kepsek
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPeran('operator')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${regPeran === 'operator'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                        }`}
                    >
                      <Building className="w-3.5 h-3.5 mx-auto mb-1" />
                      Operator
                    </button>
                  </div>
                </div>

                {/* Nama Lengkap & Nama Panggilan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={regNamaLengkap}
                      onChange={(e) => setRegNamaLengkap(e.target.value)}
                      placeholder="Contoh: Budi Santoso, S.Pd."
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Panggilan
                    </label>
                    <Input
                      type="text"
                      value={regNamaPanggilan}
                      onChange={(e) => setRegNamaPanggilan(e.target.value)}
                      placeholder="Contoh: Pak Budi"
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Email Akun */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Email Akun <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="budi@sekolah.sch.id"
                    className="text-xs"
                    required
                  />
                </div>

                {/* Password & Konfirmasi Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ulangi Sandi <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi sandi"
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Nama Sekolah */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Sekolah
                  </label>
                  <Input
                    type="text"
                    value={regSekolah}
                    onChange={(e) => setRegSekolah(e.target.value)}
                    placeholder="Contoh: SMP Negeri 2 Tanjung"
                    className="text-xs"
                  />
                </div>

                {/* NIP & No. Telepon / WA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIP / NUPTK
                    </label>
                    <Input
                      type="text"
                      value={regNip}
                      onChange={(e) => setRegNip(e.target.value)}
                      placeholder="Opsional"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor HP / WhatsApp
                    </label>
                    <Input
                      type="text"
                      value={regTelepon}
                      onChange={(e) => setRegTelepon(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Khusus Peran Guru: Mapel & Kelas */}
                {regPeran === 'guru' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mata Pelajaran Utama
                      </label>
                      <Input
                        type="text"
                        value={regMapel}
                        onChange={(e) => setRegMapel(e.target.value)}
                        placeholder="Contoh: Matematika"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Kelas yang Diampu
                      </label>
                      <Input
                        type="text"
                        value={regKelas}
                        onChange={(e) => setRegKelas(e.target.value)}
                        placeholder="Contoh: Kelas 7A, 8A"
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center py-3 text-sm font-bold shadow-md shadow-brand-600/20 mt-2"
                  disabled={regLoading}
                >
                  {regLoading ? (
                    <span>Mendaftarkan Akun...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Daftar & Masuk Sekarang <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Tombol beralih ke login */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Masuk di Sini
                  </button>
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Footer Keamanan */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Sistem Terautentikasi & Tersinkronisasi Otomatis</span>
        </div>
      </div>
    </div>
  );
};
