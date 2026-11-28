import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  UserCheck,
  BookOpen,
  MoreHorizontal,
  ShieldCheck,
  Building,
  FileDown,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export const BottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const currentRole = user?.peran || 'guru';

  // Navigasi Khusus Sesuai Level Akun
  const navItems =
    currentRole === 'superadmin'
      ? [
          { to: '/portal', label: 'Portal Admin', icon: Building },
          { to: '/absensi', label: 'Absensi', icon: UserCheck },
          { to: '/siswa', label: 'Siswa', icon: Users },
          { to: '/rekap', label: 'Rekap Dinas', icon: FileDown },
          { to: '/lainnya', label: 'Semua Menu', icon: MoreHorizontal },
        ]
      : currentRole === 'kepsek'
      ? [
          { to: '/', label: 'Beranda', icon: Home },
          { to: '/portal', label: 'Monitoring', icon: ShieldCheck },
          { to: '/rekap', label: 'Rekap Dinas', icon: FileDown },
          { to: '/lainnya', label: 'Lainnya', icon: MoreHorizontal },
        ]
      : currentRole === 'operator'
      ? [
          { to: '/', label: 'Beranda', icon: Home },
          { to: '/portal', label: 'Portal', icon: Building },
          { to: '/siswa', label: 'Master Siswa', icon: Users },
          { to: '/rekap', label: 'Rekap', icon: FileDown },
          { to: '/lainnya', label: 'Lainnya', icon: MoreHorizontal },
        ]
      : [
          // Guru HANYA melihat navigasi tugas mengajar guru
          { to: '/', label: 'Beranda', icon: Home },
          { to: '/jadwal', label: 'Jadwal', icon: Calendar },
          { to: '/absensi', label: 'Absensi', icon: UserCheck },
          { to: '/jurnal', label: 'Jurnal', icon: BookOpen },
          { to: '/lainnya', label: 'Lainnya', icon: MoreHorizontal },
        ];

  const gridColsClass = navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 transition-colors pb-safe"
      aria-label="Navigasi Utama"
    >
      <div className={`max-w-md mx-auto grid ${gridColsClass} h-16`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center touch-target py-1 transition-all ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/60 scale-105'
                        : 'group-hover:scale-105'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[11px] leading-tight tracking-tight mt-0.5">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
