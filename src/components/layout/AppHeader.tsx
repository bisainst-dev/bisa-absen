import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { useProfilStore } from '../../stores/useProfilStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { AuthModal } from '../../features/auth/AuthModal';
import { Badge } from '../ui/Badge';
import { User, Cloud, CloudOff, Building, GraduationCap } from 'lucide-react';
import { DEMO_USERS, DEMO_TENANT } from '../../services/auth/authService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { profil, saveProfil } = useProfilStore();
  const { user, isAuthenticated, impersonateUser } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLoginAsGuru = () => {
    const targetGuru = DEMO_USERS.guru;
    saveProfil({
      namaGuru: targetGuru.namaLengkap,
      namaPanggilan: targetGuru.namaPanggilan,
      sekolah: profil?.sekolah || DEMO_TENANT.namaSekolah,
      nip: '198503152010011012',
      isOnboarded: true,
    });
    impersonateUser(targetGuru);
    navigate('/', { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Esduta Gate"
              className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                  Esduta <span className="text-brand-600 dark:text-brand-400">Gate</span>
                </span>
                {isAuthenticated ? (
                  <Badge variant="brand" className="text-[10px] px-1.5 py-0 uppercase">
                    {user?.peran || 'Cloud'}
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                    Offline
                  </Badge>
                )}
              </div>
              {profil?.sekolah && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-xs">
                  {profil.sekolah}
                </p>
              )}
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tombol Cepat: Login As Guru (Bagi Admin / Operator / Kepsek) */}
            {isAuthenticated && (user?.peran === 'superadmin' || user?.peran === 'operator' || user?.peran === 'kepsek') && (
              <button
                onClick={handleLoginAsGuru}
                className="flex items-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 border border-amber-500 px-2.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                title="Masuk sebagai akun Guru untuk mencoba fitur mengajar & absensi"
              >
                <GraduationCap className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden xs:inline">Login as Guru</span>
                <span className="xs:hidden">Guru</span>
              </button>
            )}

            {/* Tombol Pintas Portal Sekolah (Jika Peran Kepsek / Operator / Superadmin) */}
            {isAuthenticated && (user?.peran === 'kepsek' || user?.peran === 'operator' || user?.peran === 'superadmin') && (
              <Link
                to="/portal"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 px-2.5 py-1.5 rounded-xl hover:bg-brand-100 transition-colors"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Portal {user.peran === 'superadmin' ? 'Admin' : user.peran === 'kepsek' ? 'Kepsek' : 'Operator'}</span>
              </Link>
            )}

            {/* Direct Cloud Database Indicator */}
            {isSupabaseConfigured() ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                title="Database Cloud Supabase Terhubung - Seluruh data langsung disimpan dan terbaca secara realtime di semua browser."
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Cloud DB</span>
              </div>
            ) : (
              <Link
                to="/portal"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400"
                title="Database Cloud belum dikonfigurasi. Klik untuk memasang Supabase di Portal."
              >
                <CloudOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="hidden sm:inline">Offline</span>
              </Link>
            )}

            {profil?.tahunPelajaran && (
              <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-full">
                <span>TP {profil.tahunPelajaran}</span>
                <span className="text-brand-600 dark:text-brand-400">({profil.semester})</span>
              </div>
            )}

            <ThemeToggle compact />

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="touch-target p-1.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title={
                isAuthenticated
                  ? `Akun ${user?.peran}: ${user?.namaLengkap} (Klik untuk kelola akun / keluar)`
                  : 'Mode Offline Lokal (Klik untuk Masuk Cloud)'
              }
              aria-label="Profil Akun"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs shadow-sm">
                {isAuthenticated && user?.namaPanggilan ? (
                  user.namaPanggilan.charAt(0).toUpperCase()
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
