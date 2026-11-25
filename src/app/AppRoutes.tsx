import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { OnboardingPage } from '../features/profil/OnboardingPage';
import { BerandaPage } from '../features/beranda/BerandaPage';
import { JadwalPage } from '../features/jadwal/JadwalPage';
import { AbsensiPage } from '../features/absensi/AbsensiPage';
import { JurnalPage } from '../features/jurnal/JurnalPage';
import { SiswaPage } from '../features/siswa/SiswaPage';
import { NilaiPage } from '../features/nilai/NilaiPage';
import { KegiatanPage } from '../features/kegiatan/KegiatanPage';
import { CatatanPage } from '../features/catatan/CatatanPage';
import { RekapPage } from '../features/rekap/RekapPage';
import { BackupPage } from '../features/backup/BackupPage';
import { PengaturanPage } from '../features/pengaturan/PengaturanPage';
import { LainnyaPage } from '../features/lainnya/LainnyaPage';
import { PortalPage } from '../features/portal/PortalPage';
import { LoginPage } from '../features/auth/LoginPage';
import { useProfilStore } from '../stores/useProfilStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';

// Komponen Pembatas Hak Akses Berdasarkan Level Akun (RBAC)
const RoleGuard: React.FC<{
  allowedRoles: ('guru' | 'kepsek' | 'operator' | 'superadmin' | 'guest')[];
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ allowedRoles, children, fallbackPath = '/' }) => {
  const { user } = useAuthStore();
  const currentRole = user?.peran || 'guest';

  const isAllowed =
    allowedRoles.includes(currentRole) ||
    (currentRole === 'guest' && allowedRoles.includes('guru'));

  if (!isAllowed) {
    // Arahkan ke fallback yang sesuai dengan level akun
    const targetFallback =
      fallbackPath !== '/'
        ? fallbackPath
        : currentRole === 'kepsek'
        ? '/portal'
        : currentRole === 'operator'
        ? '/portal'
        : '/';

    return <Navigate to={targetFallback} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { profil, loading, hasLoaded, loadProfil } = useProfilStore();
  const { user, isAuthenticated } = useAuthStore();
  const { initTheme } = useThemeStore();
  const location = useLocation();

  useEffect(() => {
    initTheme();
    loadProfil();
  }, [initTheme, loadProfil]);

  if (loading && !hasLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mb-3 animate-pulse">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Menyiapkan BISA Absen...
        </p>
      </div>
    );
  }

  // 1. JIKA BELUM MASUK / SETELAH LOGOUT:
  // Semua fitur terkunci rapat. Hanya halaman login yang dapat diakses!
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 2. JIKA SUDAH MASUK (AUTHENTICATED):
  const isOnboarded = Boolean(profil?.isOnboarded);
  const isOnboardingRoute = location.pathname === '/onboarding';

  // Jika guru belum mengisi data onboarding, arahkan ke onboarding
  if (!isOnboarded && !isOnboardingRoute && user?.peran === 'guru') {
    return <Navigate to="/onboarding" replace />;
  }

  if (isOnboarded && isOnboardingRoute) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route element={<AppLayout />}>
        {/* Beranda: Guru ke Beranda Mengajar, Kepsek & Operator ke Portal */}
        <Route
          path="/"
          element={
            user?.peran === 'kepsek' || user?.peran === 'operator' ? (
              <Navigate to="/portal" replace />
            ) : (
              <BerandaPage />
            )
          }
        />

        {/* Fitur Khusus Guru (Guru HANYA Mengakses Fitur Guru) */}
        <Route
          path="/jadwal"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <JadwalPage />
            </RoleGuard>
          }
        />
        <Route
          path="/absensi"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <AbsensiPage />
            </RoleGuard>
          }
        />
        <Route
          path="/jurnal"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <JurnalPage />
            </RoleGuard>
          }
        />
        <Route
          path="/nilai"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <NilaiPage />
            </RoleGuard>
          }
        />
        <Route
          path="/kegiatan"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <KegiatanPage />
            </RoleGuard>
          }
        />
        <Route
          path="/catatan"
          element={
            <RoleGuard allowedRoles={['guru', 'superadmin']} fallbackPath="/portal">
              <CatatanPage />
            </RoleGuard>
          }
        />

        {/* Fitur Kelola Siswa: Guru & Operator */}
        <Route
          path="/siswa"
          element={
            <RoleGuard allowedRoles={['guru', 'operator', 'superadmin']} fallbackPath="/portal">
              <SiswaPage />
            </RoleGuard>
          }
        />

        {/* Fitur Khusus Kepsek & Operator (Guru Dilarang Masuk ke Portal) */}
        <Route
          path="/portal"
          element={
            <RoleGuard allowedRoles={['kepsek', 'operator', 'superadmin']} fallbackPath="/">
              <PortalPage />
            </RoleGuard>
          }
        />

        {/* Fitur Umum Semua Akun yang Terautentikasi */}
        <Route path="/rekap" element={<RekapPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/pengaturan" element={<PengaturanPage />} />
        <Route path="/lainnya" element={<LainnyaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
