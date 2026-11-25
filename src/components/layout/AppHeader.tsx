import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { useProfilStore } from '../../stores/useProfilStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { syncEngine } from '../../services/sync/syncEngine';
import type { SyncState } from '../../types/saas';
import { AuthModal } from '../../features/auth/AuthModal';
import { Badge } from '../ui/Badge';
import { User, Cloud, CloudOff, RefreshCw, Building } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { profil } = useProfilStore();
  const { user, isAuthenticated } = useAuthStore();
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsub = syncEngine.subscribe((state, count) => {
      setSyncState(state);
      setDirtyCount(count);
    });
    return unsub;
  }, []);

  const handleSyncClick = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      syncEngine.syncNow();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 group-hover:bg-brand-700 transition-colors flex items-center justify-center text-white shadow-md shadow-brand-600/20">
              <svg
                className="w-6 h-6"
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
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                  BISA <span className="text-brand-600 dark:text-brand-400">Absen</span>
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
            {/* Tombol Pintas Portal Sekolah (Jika Peran Kepsek / Operator) */}
            {isAuthenticated && (user?.peran === 'kepsek' || user?.peran === 'operator') && (
              <Link
                to="/portal"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 px-2.5 py-1.5 rounded-xl hover:bg-brand-100 transition-colors"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Portal {user.peran === 'kepsek' ? 'Kepsek' : 'Operator'}</span>
              </Link>
            )}

            {/* Cloud Sync Status Indicator */}
            <button
              onClick={handleSyncClick}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                !isAuthenticated
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                  : syncState === 'syncing'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 animate-pulse'
                  : dirtyCount > 0
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
              }`}
              title={
                !isAuthenticated
                  ? 'Klik untuk masuk / hubungkan ke Cloud Sekolah'
                  : `${dirtyCount} data belum tersinkron. Klik untuk sinkronkan.`
              }
            >
              {!isAuthenticated ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lokal</span>
                </>
              ) : syncState === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Sync...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">
                    {dirtyCount > 0 ? `${dirtyCount} Sync` : 'Cloud'}
                  </span>
                </>
              )}
            </button>

            {profil?.tahunPelajaran && (
              <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
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
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
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
