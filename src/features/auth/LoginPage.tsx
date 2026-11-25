import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth/authService';
import { syncEngine } from '../../services/sync/syncEngine';
import { useProfilStore } from '../../stores/useProfilStore';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveProfil } = useProfilStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Silakan masukkan alamat email akun Anda');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.loginWithEmail(email.trim());

      // Sinkronkan nama pengguna ke profil aktif lokal agar data konsisten
      await saveProfil({
        namaGuru: user.namaLengkap,
        namaPanggilan: user.namaPanggilan || user.namaLengkap.split(' ')[0],
        sekolah: user.sekolahNama || 'SD Negeri 01 Teladan Mandiri',
        isOnboarded: true,
      });

      // Jalankan sinkronisasi cloud
      await syncEngine.syncNow().catch(() => {});

      // Arahkan ke rute yang sesuai dengan level akun
      if (user.peran === 'kepsek' || user.peran === 'operator') {
        navigate('/portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/30">
            <svg
              className="w-9 h-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="m9 10 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            BISA <span className="text-brand-600 dark:text-brand-400">Absen</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
            Asisten Administrasi Harian Guru & Portal Sekolah Terpadu
          </p>
        </div>

        {/* Card Formulir Login */}
        <Card className="p-6 sm:p-8 space-y-5 shadow-lg border border-slate-200/80 dark:border-slate-800 text-left">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Silakan masukkan email dan kata sandi untuk membuka fitur
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Alamat Email Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: guru@sekolah.sch.id"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
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
                  placeholder="Masukkan kata sandi akun Anda"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center py-3 text-sm font-bold shadow-md shadow-brand-600/20"
              disabled={loading}
            >
              {loading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Masuk ke Aplikasi <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Panduan Akun yang Tersedia */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Contoh Akses Akun:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
              <li>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Guru:</span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEmail('budi@sekolah.sch.id');
                    setPassword('guru123');
                  }}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-mono"
                >
                  budi@sekolah.sch.id
                </button>
              </li>
              <li>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Kepsek:</span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEmail('kepsek@sekolah.sch.id');
                    setPassword('kepsek123');
                  }}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-mono"
                >
                  kepsek@sekolah.sch.id
                </button>
              </li>
              <li>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Operator:</span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEmail('operator@sekolah.sch.id');
                    setPassword('operator123');
                  }}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-mono"
                >
                  operator@sekolah.sch.id
                </button>
              </li>
            </ul>
          </div>
        </Card>

        {/* Footer Keamanan */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Sistem Terautentikasi & Tersinkronisasi Otomatis</span>
        </div>
      </div>
    </div>
  );
};
