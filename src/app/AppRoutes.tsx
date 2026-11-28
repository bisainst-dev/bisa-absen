import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
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
import { syncEngine } from '../services/sync/syncEngine';

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
  const { loading, hasLoaded, loadProfil } = useProfilStore();
  const { user, isAuthenticated } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    loadProfil();
  }, [initTheme, loadProfil]);

  // Otomatis sinkronisasi data cloud saat pengguna login / membuka aplikasi
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Eksekusi sync langsung saat startup / reload
    syncEngine.syncNow().catch((err) => {
      console.warn('[AppRoutes] Auto-sync on startup failed:', err);
    });

    // 2. Sinkronisasi berkala setiap 30 detik saat online
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncEngine.syncNow().catch(() => {});
      }
    }, 30000);

    // 3. Sinkronisasi saat tab aktif kembali (user berpindah browser / tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && typeof navigator !== 'undefined' && navigator.onLine) {
        syncEngine.syncNow().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  if (loading && !hasLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <img
          src="/logo.png"
          alt="Esduta Gate"
          className="w-16 h-16 object-contain mb-3 animate-pulse drop-shadow-md"
        />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Menyiapkan Esduta Gate...
        </p>
      </div>
    );
  }

  // 1. JIKA BELUM MASUK / SETELAH LOGOUT:
  // Langsung tampilkan halaman login saat akses alamat utama
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 2. JIKA SUDAH MASUK (AUTHENTICATED):
  // Halaman onboarding dihilangkan sepenuhnya, langsung ke rute utama
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />

      <Route element={<AppLayout />}>
        {/* Beranda: Guru ke Beranda Mengajar, Kepsek/Operator/Superadmin ke Portal */}
        <Route
          path="/"
          element={
            user?.peran === 'kepsek' || user?.peran === 'operator' || user?.peran === 'superadmin' ? (
              <Navigate to="/portal" replace />
            ) : (
              <BerandaPage />
            )
          }
        />

        {/* Fitur Khusus Guru */}
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

        {/* Fitur Khusus Kepsek & Operator */}
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
