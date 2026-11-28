import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, impersonator, stopImpersonating } = useAuthStore();
  const navigate = useNavigate();

  const handleReturnToAdmin = () => {
    stopImpersonating();
    navigate('/portal', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Banner Mode Impersonasi / Login as User */}
      {impersonator && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              Mode Administrator: Anda sedang masuk sebagai <strong>{user?.namaLengkap}</strong> ({user?.peran.toUpperCase()})
            </span>
          </div>
          <button
            onClick={handleReturnToAdmin}
            className="bg-slate-950 hover:bg-black text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ml-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Akun Admin</span>
          </button>
        </div>
      )}
      <AppHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
