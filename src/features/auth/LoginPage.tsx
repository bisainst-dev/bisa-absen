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

  // Form State: Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

        {/* Card Formulir: Masuk Akun */}
        <Card className="p-6 sm:p-8 space-y-5 shadow-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-left">
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
          </div>
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
