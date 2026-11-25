import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/auth/authService';
import { syncEngine } from '../../services/sync/syncEngine';
import {
  Cloud,
  X,
  Lock,
  Mail,
  LogOut,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, tenant, isAuthenticated } = useAuthStore();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    try {
      await authService.loginWithEmail(emailInput.trim());
      await syncEngine.syncNow();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await authService.logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {isAuthenticated && user ? (
          /* Tampilan Jika Sudah Login */
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-lg">
                {user.namaPanggilan?.charAt(0) || user.namaLengkap.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {user.namaLengkap}
                  </h3>
                  <Badge variant="brand" className="uppercase text-[10px]">
                    {user.peran}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{user.email}</p>
                {tenant && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                    {tenant.namaSekolah}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Status: <strong>Tersambung ke Cloud</strong>. Data Anda otomatis tersinkronisasi antar-perangkat saat terhubung ke internet.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncEngine.syncNow()}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sinkronkan Sekarang
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
                className="text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Keluar Akun
              </Button>
            </div>
          </div>
        ) : (
          /* Tampilan Form Login Resmi (Tanpa Menu Demo) */
          <div className="space-y-5 text-left">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                <Cloud className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Masuk ke Akun Cloud BISA Absen
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gunakan alamat email dan kata sandi akun sekolah atau akun guru Anda untuk mulai sinkronisasi.
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email Akun Sekolah / Guru
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kata sandi akun Anda"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-2.5 mt-2"
                disabled={loading}
              >
                {loading ? 'Menghubungkan...' : 'Masuk ke Akun Cloud'}
              </Button>
            </form>

            <div className="pt-2 text-center border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Tetap gunakan Mode Offline Lokal (Tanpa Akun)
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
