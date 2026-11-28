import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfilStore } from '../../stores/useProfilStore';
import { DEMO_TENANT, DEMO_USERS } from '../../services/auth/authService';
import { guruRepo, type GuruData } from '../guru/guruRepository';
import {
  Building,
  Users,
  UserCheck,
  CreditCard,
  QrCode,
  ShieldCheck,
  GraduationCap,
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  Award,
  BookOpen,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  Settings,
  LogIn,
  KeyRound,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Server,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../../lib/supabaseClient';
import { syncEngine } from '../../services/sync/syncEngine';

const DATABASE_SQL_SCHEMA = `-- BISA ABSEN SAAS - POSTGRESQL & SUPABASE PRODUCTION SCHEMA
-- Tabel Tenants (Sekolah / Yayasan)
CREATE TABLE IF NOT EXISTS public.tenants (
  id VARCHAR(255) PRIMARY KEY,
  nama_sekolah VARCHAR(255) NOT NULL,
  npsn VARCHAR(50),
  jenjang VARCHAR(50) DEFAULT 'SD',
  alamat TEXT,
  tier VARCHAR(50) NOT NULL DEFAULT 'school_starter',
  kuota_guru INT NOT NULL DEFAULT 50,
  kuota_siswa INT NOT NULL DEFAULT 1000,
  langganan_aktif_sampai TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel Profiles (Guru / Kepsek / Operator / Admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES public.tenants(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  nama_panggilan VARCHAR(100),
  nip VARCHAR(50),
  peran VARCHAR(50) NOT NULL DEFAULT 'guru',
  avatar_url TEXT,
  telepon VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel Records (Sync Inti BISA Absen)
CREATE TABLE IF NOT EXISTS public.records (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255),
  user_id VARCHAR(255),
  kind VARCHAR(100) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index Performa Tinggi
CREATE INDEX IF NOT EXISTS idx_records_tenant_kind ON public.records(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON public.records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_kind_deleted ON public.records(kind, deleted);

-- RLS & Public Access
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_public_access" ON public.tenants;
CREATE POLICY "tenants_public_access" ON public.tenants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_public_access" ON public.profiles;
CREATE POLICY "profiles_public_access" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "records_public_access" ON public.records;
CREATE POLICY "records_public_access" ON public.records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Realtime Replication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.records;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Data Awal Sekolah & Akun
INSERT INTO public.tenants (id, nama_sekolah, npsn, jenjang)
VALUES ('tenant-demo-smpn2', 'SMP Negeri 2 Tanjung', '20104050', 'SMP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, tenant_id, email, nama_lengkap, nama_panggilan, peran)
VALUES 
  ('usr-admin-bisa', 'tenant-demo-smpn2', 'admin@sekolah.sch.id', 'Administrator Utama Esduta Gate', 'Admin Pusat', 'superadmin'),
  ('usr-guru-budi', 'tenant-demo-smpn2', 'budi.santoso@sekolah.sch.id', 'Budi Santoso, S.Pd.', 'Pak Budi', 'guru'),
  ('usr-ops-hendra', 'tenant-demo-smpn2', 'operator@sekolah.sch.id', 'Hendra Gunawan, S.Kom.', 'Pak Hendra', 'operator'),
  ('usr-kepsek-siti', 'tenant-demo-smpn2', 'kepsek@sekolah.sch.id', 'Dr. Hj. Siti Fatimah, M.Pd.', 'Bu Siti', 'kepsek')
ON CONFLICT (id) DO NOTHING;`;

export const PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, impersonateUser } = useAuthStore();
  const { profil, saveProfil } = useProfilStore();
  const currentTenant = tenant || DEMO_TENANT;
  const currentRole = user?.peran || 'kepsek';

  const isKepsek = currentRole === 'kepsek';
  const isOperator = currentRole === 'operator';
  const isSuperAdmin = currentRole === 'superadmin';

  const handleImpersonateGuru = (guru: GuruData) => {
    const userProfile = {
      id: `usr_${guru.id}`,
      email: guru.email,
      namaLengkap: guru.nama,
      namaPanggilan: guru.nama.split(' ')[0],
      peran: 'guru' as const,
      tenantId: currentTenant.id,
      sekolahNama: kopSekolah || currentTenant.namaSekolah,
      telepon: guru.telepon,
    };
    saveProfil({
      namaGuru: guru.nama,
      namaPanggilan: guru.nama.split(' ')[0],
      sekolah: kopSekolah || currentTenant.namaSekolah,
      nip: guru.nip,
      mapel: guru.mapel ? [guru.mapel] : undefined,
      kelasDiampu: guru.kelas ? guru.kelas.split(',').map((k) => k.trim()) : undefined,
      isOnboarded: true,
    });
    impersonateUser(userProfile);
    navigate('/', { replace: true });
  };

  const handleImpersonateRole = (role: 'guru' | 'kepsek' | 'operator') => {
    const target = DEMO_USERS[role];
    saveProfil({
      namaGuru: target.namaLengkap,
      namaPanggilan: target.namaPanggilan,
      sekolah: kopSekolah || currentTenant.namaSekolah,
      nip: target.peran === 'guru' ? '198503152010011012' : undefined,
      isOnboarded: true,
    });
    impersonateUser(target);
    if (role === 'guru') {
      navigate('/', { replace: true });
    } else {
      navigate('/portal', { replace: true });
    }
  };

  const [activeTab, setActiveTab] = useState<'kepsek' | 'operator' | 'billing' | 'database'>(
    isKepsek ? 'kepsek' : 'operator'
  );

  // Operator tidak boleh membuka billing
  const effectiveTab = isKepsek
    ? 'kepsek'
    : activeTab === 'billing' && !isSuperAdmin
    ? 'operator'
    : activeTab;

  // State Konfigurasi Database Cloud (Supabase / Vercel)
  const [dbConfig, setDbConfig] = useState(getSupabaseConfig());
  const [inputDbUrl, setInputDbUrl] = useState(dbConfig.url);
  const [inputDbKey, setInputDbKey] = useState(dbConfig.anonKey);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
    tableReady?: boolean;
    recordCount?: number;
  } | null>(null);
  const [dbCopied, setDbCopied] = useState(false);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbSyncResult, setDbSyncResult] = useState<string | null>(null);

  // State Simulasi Modal Pembayaran QRIS (Superadmin)
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  // State Data Guru
  const [guruList, setGuruList] = useState<GuruData[]>([]);
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [showGuruListModal, setShowGuruListModal] = useState(false);

  // Form Tambah Guru
  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formTelepon, setFormTelepon] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // State Modal Kop Sekolah & Pengesahan
  const [showKopModal, setShowKopModal] = useState(false);
  const [kopSekolah, setKopSekolah] = useState('');
  const [kopKepsek, setKopKepsek] = useState('');
  const [kopNipKepsek, setKopNipKepsek] = useState('');
  const [kopTP, setKopTP] = useState('');
  const [kopSemester, setKopSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [kopTampilkanKredit, setKopTampilkanKredit] = useState(true);
  const [kopSuccess, setKopSuccess] = useState<string | null>(null);

  // Muat data guru dari repository
  const loadGuru = async () => {
    try {
      const list = await guruRepo.getAll();
      setGuruList(list);
    } catch (err) {
      console.error('Gagal memuat data guru:', err);
    }
  };

  useEffect(() => {
    loadGuru();
  }, []);

  // Sinkronisasi data kop sekolah dari profil store
  useEffect(() => {
    if (profil) {
      setKopSekolah(profil.sekolah || currentTenant.namaSekolah || 'SMP Negeri 2 Tanjung');
      setKopKepsek(profil.kepalaSekolah || 'Dr. Hj. Siti Fatimah, M.Pd.');
      setKopNipKepsek(profil.nipKepsek || '197208151998032004');
      setKopTP(profil.tahunPelajaran || '2026/2027');
      setKopSemester(profil.semester || 'Ganjil');
      setKopTampilkanKredit(profil.tampilkanKredit ?? true);
    }
  }, [profil, currentTenant.namaSekolah]);

  const handleSimpanGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama lengkap guru wajib diisi');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email akun guru wajib diisi');
      return;
    }
    if (!formMapel.trim()) {
      setFormError('Mata pelajaran yang diampu wajib diisi');
      return;
    }
    if (!formKelas.trim()) {
      setFormError('Kelas yang diampu wajib diisi (contoh: Kelas 7A, 8B)');
      return;
    }

    try {
      await guruRepo.create({
        nama: formNama.trim(),
        nip: formNip.trim(),
        email: formEmail.trim(),
        mapel: formMapel.trim(),
        kelas: formKelas.trim(),
        telepon: formTelepon.trim(),
        status: 'Aktif',
      });

      await loadGuru();
      setFormNama('');
      setFormNip('');
      setFormEmail('');
      setFormMapel('');
      setFormKelas('');
      setFormTelepon('');
      setFormError(null);
      setFormSuccess('Guru berhasil ditambahkan!');
      setTimeout(() => {
        setFormSuccess(null);
        setShowAddGuruModal(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan saat menyimpan data guru');
    }
  };

  const handleHapusGuru = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus guru ${nama}?`)) {
      try {
        await guruRepo.delete(id);
        await loadGuru();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus guru');
      }
    }
  };

  const handleSimpanKop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveProfil({
        sekolah: kopSekolah.trim(),
        kepalaSekolah: kopKepsek.trim(),
        nipKepsek: kopNipKepsek.trim(),
        tahunPelajaran: kopTP.trim(),
        semester: kopSemester,
        tampilkanKredit: kopTampilkanKredit,
      });

      setKopSuccess('Kop sekolah & data pengesahan berhasil disimpan!');
      setTimeout(() => {
        setKopSuccess(null);
        setShowKopModal(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data kop sekolah');
    }
  };

  // Data Mock Realistis untuk Tampilan Sekolah SMP Negeri 2 Tanjung
  const mockClassAttendance = [
    { kelas: 'Kelas 7A', guru: 'Pak Budi Santoso, S.Pd.', hadir: 31, total: 32, pct: 96.9, jurnal: true },
    { kelas: 'Kelas 7B', guru: 'Ibu Ratna Wulandari, M.Pd.', hadir: 30, total: 30, pct: 100, jurnal: true },
    { kelas: 'Kelas 8A', guru: 'Pak Ahmad Fauzi, S.Si.', hadir: 28, total: 30, pct: 93.3, jurnal: false },
    { kelas: 'Kelas 8B', guru: 'Ibu Ratna Wulandari, M.Pd.', hadir: 29, total: 31, pct: 93.5, jurnal: true },
    { kelas: 'Kelas 9A', guru: 'Pak Ahmad Fauzi, S.Si.', hadir: 31, total: 32, pct: 96.8, jurnal: false },
    { kelas: 'Kelas 9B', guru: 'Ibu Dewi Anggraeni, S.Pd.', hadir: 29, total: 30, pct: 96.7, jurnal: true },
  ];

  const totalSiswaSekolah = mockClassAttendance.reduce((acc, c) => acc + c.total, 0);
  const totalHadirSekolah = mockClassAttendance.reduce((acc, c) => acc + c.hadir, 0);
  const avgAttendance = ((totalHadirSekolah / totalSiswaSekolah) * 100).toFixed(1);
  const jurnalTerisi = mockClassAttendance.filter((c) => c.jurnal).length;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Header Profil Sekolah */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-teal-950 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {kopSekolah || currentTenant.namaSekolah}
                </h1>
                <span className="uppercase text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {currentTenant.tier.replace('_', ' ')}
                </span>
              </div>
              <p className="text-white/80 text-xs mt-0.5">
                NPSN: {currentTenant.npsn || '20104050'} • Jenjang {currentTenant.jenjang} • Kepala Sekolah: {kopKepsek || 'Dr. Hj. Siti Fatimah, M.Pd.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 px-4 text-right border border-white/10">
              <span className="text-[10px] text-white/70 block uppercase font-bold">
                {isOperator ? 'Hak Akses' : isKepsek ? 'Jabatan' : 'Status Akun'}
              </span>
              <span className="text-sm font-extrabold text-teal-400">
                {isOperator ? 'Operator Sekolah' : isKepsek ? 'Kepala Sekolah' : 'Super Administrator'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Tab Navigasi Portal */}
      {!isKepsek ? (
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-sm font-bold gap-2">
          {(isSuperAdmin || isOperator) && (
            <button
              onClick={() => setActiveTab('operator')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'operator'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Portal Operator Sekolah</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('kepsek')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'kepsek'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Dashboard Kepala Sekolah</span>
            </button>
          )}

          {/* Menu Paket & Langganan SaaS HANYA untuk Superadmin, tidak muncul untuk Operator */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'billing'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Paket & Langganan SaaS</span>
            </button>
          )}

          {/* Tab Konfigurasi & Status Database Cloud (Supabase / Vercel) */}
          {(isSuperAdmin || isOperator) && (
            <button
              onClick={() => setActiveTab('database')}
              className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
                effectiveTab === 'database'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-brand-600 dark:hover:text-brand-400'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Database & Cloud Sync</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-extrabold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Dashboard Eksekutif Kepala Sekolah</span>
          </div>
          <Badge variant="brand" className="text-xs">
            Akses Khusus Kepala Sekolah
          </Badge>
        </div>
      )}

      {/* =========================================================================
          PANEL KHUSUS SUPER ADMIN & OPERATOR: LOGIN AS USER / IMPERSONASI
      ========================================================================= */}
      {(isSuperAdmin || isOperator) && (
        <Card className="p-4 sm:p-5 border-2 border-amber-400/70 dark:border-amber-500/50 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/20 space-y-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Mode Impersonasi (Login Sebagai Pengguna)
                  </h4>
                  <Badge variant="warning" className="text-[10px]">Akses Admin</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Masuk ke akun peran lain untuk memantau tampilan dan menguji akses secara langsung:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={() => handleImpersonateRole('guru')}
              className="p-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 hover:border-teal-500 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Pak Budi (Guru)</div>
                <div className="text-[11px] text-slate-500 truncate">Fitur Mengajar & Absensi</div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-teal-600 ml-auto shrink-0 opacity-60 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleImpersonateRole('kepsek')}
              className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 hover:border-amber-500 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Dr. Hj. Siti (Kepsek)</div>
                <div className="text-[11px] text-slate-500 truncate">Monitoring & Rekap Dinas</div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-amber-600 ml-auto shrink-0 opacity-60 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleImpersonateRole('operator')}
              className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:shadow-sm transition-all text-left flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Building className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Hendra (Operator)</div>
                <div className="text-[11px] text-slate-500 truncate">Master Siswa & Rombel</div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-indigo-600 ml-auto shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 1: DASHBOARD KEPALA SEKOLAH
      ========================================================================= */}
      {effectiveTab === 'kepsek' && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Eksekutif */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 border-l-4 border-l-brand-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Kehadiran Siswa</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{avgAttendance}%</span>
                <span className="text-xs text-emerald-600 font-bold">Baik</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{totalHadirSekolah} dari {totalSiswaSekolah} siswa hadir</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-teal-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Jurnal Terisi</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{jurnalTerisi}</span>
                <span className="text-xs text-slate-400 font-medium">/ {mockClassAttendance.length} Kelas</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {mockClassAttendance.length - jurnalTerisi} kelas belum mengisi jurnal
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Guru Aktif</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{guruList.length}</span>
                <span className="text-xs text-indigo-600 font-bold">Pengampu</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Status aktif mengajar</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-xs text-slate-500 font-bold block uppercase">Rombel Kelas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{mockClassAttendance.length}</span>
                <span className="text-xs text-amber-600 font-bold">Kelas</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tingkat VII, VIII, IX</p>
            </Card>
          </div>

          {/* Tabel Monitoring Kelas Real-Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Monitoring Kelas Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Data langsung tersinkronisasi dari ponsel masing-masing guru kelas
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/rekap?tab=absensi')} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh Rekap Dinas
              </Button>
            </div>

            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Guru Pengampu</th>
                      <th className="py-3 px-4 text-center">Kehadiran</th>
                      <th className="py-3 px-4 text-center">% Hadir</th>
                      <th className="py-3 px-4 text-center">Jurnal Hari Ini</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {mockClassAttendance.map((row) => (
                      <tr key={row.kelas} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {row.kelas}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {row.guru}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {row.hadir} / {row.total}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              row.pct >= 95
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {row.pct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.jurnal ? (
                            <Badge variant="success" className="text-[10px]">
                              Sudah Diisi
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              Belum Diisi
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => navigate('/rekap?tab=absensi')}
                          >
                            Detail <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PORTAL OPERATOR SEKOLAH
      ========================================================================= */}
      {!isKepsek && effectiveTab === 'operator' && (
        <div className="space-y-6">
          {/* =========================================================================
              1. MENU OPERATOR UTAMA: TAMBAH GURU, KOP SEKOLAH & PENGESAHAN, MASTER SISWA
          ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-brand-600" />
                  <span>Menu Administrasi Utama Operator Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola guru pengampu, kop resmi sekolah & pengesahan, serta master data siswa
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* MENU 1: TAMBAH & KELOLA GURU */}
              <Card className="p-5 space-y-3 border-t-4 border-t-brand-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <Badge variant="brand" className="text-[10px]">{guruList.length} Guru</Badge>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                      Tambah & Kelola Guru
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Daftarkan guru pengampu baru, atur mata pelajaran yang diampu, dan tentukan rombel kelas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs justify-center"
                    onClick={() => {
                      setFormError(null);
                      setShowAddGuruModal(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> + Tambah Guru Baru
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs justify-center"
                    onClick={() => setShowGuruListModal(true)}
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" /> Lihat Semua Guru ({guruList.length})
                  </Button>
                </div>
              </Card>

              {/* MENU 2: KOP SEKOLAH & PENGESAHAN */}
              <Card className="p-5 space-y-3 border-t-4 border-t-amber-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <Badge variant="warning" className="text-[10px]">Dokumen Resmi</Badge>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                      Kop Sekolah & Pengesahan
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Atur nama resmi instansi, logo, NIP & Nama Kepala Sekolah untuk cetak otomatis di lembar dokumen PDF/Word.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs justify-center"
                    onClick={() => setShowKopModal(true)}
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" /> Atur Kop & Pengesahan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs justify-center"
                    onClick={() => navigate('/pengaturan')}
                  >
                    Buka Pengaturan Lengkap
                  </Button>
                </div>
              </Card>

              {/* MENU 3: MASTER DATA SISWA */}
              <Card className="p-5 space-y-3 border-t-4 border-t-brand-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral" className="text-[10px]">Dapodik/Excel</Badge>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                      Master Data Siswa Sekolah
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Kelola basis data siswa seluruh rombel dan impor massal dari format Dapodik atau template Excel.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs justify-center"
                    onClick={() => navigate('/siswa')}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Buka Master Siswa
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* =========================================================================
              2. SEKSI FITUR REKAPITULASI (REKAP ABSENSI, REKAP NILAI, REKAP JURNAL)
          ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <span>Pusat Rekapitulasi & Laporan Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Akses langsung dan ekspor dokumen laporan absensi, nilai, serta jurnal seluruh kelas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kartu 1: Rekap Absensi */}
              <Card className="p-5 space-y-3 border-t-4 border-t-brand-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="brand" className="text-[10px]">Format Dinas</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    Rekap Absensi Siswa
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rekapitulasi kehadiran bulanan, total hadir, sakit, izin, dan alfa per rombel siswa.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=absensi')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Absensi
                </Button>
              </Card>

              {/* Kartu 2: Rekap Nilai */}
              <Card className="p-5 space-y-3 border-t-4 border-t-amber-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <Badge variant="warning" className="text-[10px]">Leger Nilai</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    Rekap Nilai Siswa
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Daftar nilai tugas (T1-Tn), ulangan/PH (PH1-PHn), bobot persentase & rata-rata akhir.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=nilai')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Nilai
                </Button>
              </Card>

              {/* Kartu 3: Rekap Jurnal */}
              <Card className="p-5 space-y-3 border-t-4 border-t-brand-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" className="text-[10px]">Agenda Harian</Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    Rekap Jurnal Guru
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Laporan materi ajar, jam tatap muka, dan catatan kendala pembelajaran per guru.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs justify-center"
                  onClick={() => navigate('/rekap?tab=jurnal')}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Buka Rekap Jurnal
                </Button>
              </Card>
            </div>
          </div>

          {/* =========================================================================
              3. TABEL RINGKAS GURU TERDAFTAR
          ========================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-teal-600" />
                  <span>Daftar Guru Pengampu ({guruList.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Guru yang terdaftar mengajar di {kopSekolah || currentTenant.namaSekolah}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs"
                  onClick={() => {
                    setFormError(null);
                    setShowAddGuruModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Guru Baru
                </Button>
              </div>
            </div>

            {/* Tabel Cuplikan Guru */}
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Kelas Diampu</th>
                      <th className="py-3 px-4">Email Akun</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {guruList.slice(0, 5).map((guru) => (
                      <tr key={guru.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {guru.nama}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {guru.nip || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-teal-700 dark:text-teal-300">
                          {guru.mapel}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {guru.kelas}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {guru.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="success" className="text-[10px]">
                            {guru.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(isSuperAdmin || isOperator) && (
                              <>
                                <button
                                  onClick={() => handleImpersonateGuru(guru)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                                  title={`Login sebagai ${guru.nama}`}
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Login as Guru</span>
                                </button>
                                <button
                                  onClick={() => navigate(`/rekap?guruId=${guru.id}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
                                  title={`Buka rekap nilai, absen, & jurnal ${guru.nama}`}
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  <span>Rekap</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleHapusGuru(guru.id, guru.nama)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                              title="Hapus Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {guruList.length > 5 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border-t text-center">
                  <button
                    onClick={() => setShowGuruListModal(true)}
                    className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                  >
                    Lihat seluruh {guruList.length} guru...
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PAKET & LANGGANAN SAAS (HANYA UNTUK SUPERADMIN)
      ========================================================================= */}
      {isSuperAdmin && effectiveTab === 'billing' && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Pilihan Paket Langganan Esduta Gate SaaS
            </h3>
            <p className="text-xs text-slate-500">
              Pilih paket sesuai kebutuhan Anda: guru mandiri atau institusi sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Paket 1: Guru Mandiri */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-slate-200 dark:border-slate-800">
              <div className="space-y-3">
                <Badge variant="neutral">Guru Individu</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Paket Guru Pro
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-brand-600">Rp99.000</span>
                    <span className="text-xs text-slate-400">/ tahun</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Auto Cloud Backup (Penyimpanan Aman)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinkronisasi Multi-Perangkat (HP & Laptop)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Ekspor Dokumen PDF/Excel Tanpa Watermark</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPaymentModal('Guru Pro (Rp99.000)')}
                className="w-full justify-center"
              >
                Pilih Paket Guru Pro
              </Button>
            </Card>

            {/* Paket 2: Sekolah Starter */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-2 border-brand-500 shadow-lg shadow-brand-500/10">
              <div className="absolute -top-3 right-4">
                <Badge variant="brand" className="font-extrabold">PALING LARIS</Badge>
              </div>

              <div className="space-y-3">
                <Badge variant="brand">Sekolah / Madrasah</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Sekolah Dasar / Menengah
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-brand-600">Rp1.200.000</span>
                    <span className="text-xs text-slate-400">/ tahun</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Semua fitur Guru Pro untuk <strong>s/d 25 Guru</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Dashboard Kepala Sekolah</strong> (Monitoring Live)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Portal Operator</strong> (Master siswa & guru)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Kop Sekolah & Pengesahan Otomatis</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowPaymentModal('Sekolah Dasar / Menengah (Rp1.200.000)')}
                className="w-full justify-center"
              >
                Perpanjang / Langganan
              </Button>
            </Card>

            {/* Paket 3: Yayasan */}
            <Card className="p-5 space-y-4 relative flex flex-col justify-between border-slate-200 dark:border-slate-800">
              <div className="space-y-3">
                <Badge variant="neutral">Yayasan Pendidikan</Badge>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Enterprise Yayasan
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">Hubungi Kami</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Multi-Sekolah dalam 1 Akun Yayasan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Unlimited Guru & Rombel Siswa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Integrasi API Database Dapodik / Kemenag</span>
                  </li>
                </ul>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => alert('Silakan hubungi WhatsApp resmi Esduta Gate Enterprise: 0812-XXXX-XXXX')}
                className="w-full justify-center"
              >
                Konsultasi Yayasan
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: STATUS & PENGATURAN DATABASE CLOUD (VERCEL & SUPABASE)
      ========================================================================= */}
      {(isSuperAdmin || isOperator) && effectiveTab === 'database' && (
        <div className="space-y-6">
          {/* Header Tab Database */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Pusat Database Cloud & Sinkronisasi Realtime
                  </h3>
                  <Badge variant={isSupabaseConfigured() ? 'success' : 'warning'}>
                    {isSupabaseConfigured() ? 'Cloud Terhubung' : 'Mode Offline Lokal'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menghubungkan aplikasi web Vercel dan aplikasi Android native ke database terpusat Supabase / PostgreSQL.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setDbTesting(true);
                  setDbTestResult(null);
                  const res = await testSupabaseConnection();
                  setDbTestResult(res);
                  setDbTesting(false);
                }}
                disabled={dbTesting}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${dbTesting ? 'animate-spin' : ''}`} />
                {dbTesting ? 'Menguji...' : 'Uji Koneksi DB'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  setDbSyncing(true);
                  setDbSyncResult(null);
                  const res = await syncEngine.syncNow();
                  if (res.success) {
                    setDbSyncResult(`Sinkronisasi Berhasil! ${res.pushed} data dikirim, ${res.pulled} data ditarik.`);
                  } else {
                    setDbSyncResult(`Gagal Sinkronisasi: ${res.error || 'Terjadi kesalahan'}`);
                  }
                  setDbSyncing(false);
                }}
                disabled={dbSyncing}
              >
                <Cloud className={`w-3.5 h-3.5 mr-1.5 ${dbSyncing ? 'animate-spin' : ''}`} />
                {dbSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sekarang'}
              </Button>
            </div>
          </div>

          {/* Alert Hasil Uji / Sinkronisasi */}
          {dbTestResult && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-start gap-3 ${
                dbTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {dbTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="space-y-1">
                <span className="font-extrabold block">
                  {dbTestResult.success ? 'Koneksi Berhasil' : 'Perhatian Koneksi'}
                </span>
                <p className="text-xs">{dbTestResult.message}</p>
              </div>
            </div>
          )}

          {dbSyncResult && (
            <div className="p-4 rounded-2xl border bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
              <span>{dbSyncResult}</span>
            </div>
          )}

          {/* Grid: Form Koneksi & Status Arsitektur */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Formulir Pengaturan Supabase */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-600" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Konfigurasi Endpoint Supabase
                  </h4>
                </div>
                {dbConfig.source !== 'none' && (
                  <Badge variant="neutral" className="text-[10px]">
                    Sumber: {dbConfig.source === 'env' ? 'Vercel Env' : 'Tersimpan di Browser'}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Project URL Supabase
                  </label>
                  <Input
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    value={inputDbUrl}
                    onChange={(e) => setInputDbUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Dapatkan dari Dashboard Supabase &gt; Project Settings &gt; API &gt; Project URL
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Project API Key (anon / public)
                  </label>
                  <Input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputDbKey}
                    onChange={(e) => setInputDbKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Dapatkan dari Dashboard Supabase &gt; Project Settings &gt; API &gt; Project API keys (anon public)
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!inputDbUrl.trim() || !inputDbKey.trim()) {
                        alert('Silakan masukkan Project URL dan Anon Key Supabase terlebih dahulu.');
                        return;
                      }
                      saveSupabaseConfig(inputDbUrl, inputDbKey);
                      setDbConfig(getSupabaseConfig());
                      syncEngine.setupRealtimeSubscription();
                      alert('Konfigurasi database cloud berhasil disimpan! Menguji koneksi...');
                      testSupabaseConnection().then(setDbTestResult);
                    }}
                  >
                    Simpan & Hubungkan Database
                  </Button>

                  {dbConfig.source === 'custom' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin memutuskan database dan kembali ke mode offline lokal?')) {
                          clearSupabaseConfig();
                          setDbConfig(getSupabaseConfig());
                          setInputDbUrl('');
                          setInputDbKey('');
                          setDbTestResult(null);
                        }
                      }}
                    >
                      Putuskan Database
                    </Button>
                  )}
                </div>
              </div>

              {/* Panduan Deployment Vercel Permanen */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  💡 Tips Pemasangan Permanen di Vercel:
                </span>
                <p>
                  Agar semua guru dan perangkat langsung terhubung otomatis tanpa input manual, pasang dua variabel berikut di <strong>Vercel Dashboard &gt; Settings &gt; Environment Variables</strong>:
                </p>
                <div className="p-2 rounded bg-slate-900 text-teal-400 font-mono text-[11px] space-y-0.5">
                  <div>VITE_SUPABASE_URL = {inputDbUrl || 'https://your-id.supabase.co'}</div>
                  <div>VITE_SUPABASE_ANON_KEY = {inputDbKey ? inputDbKey.slice(0, 20) + '...' : 'anon-key...'}</div>
                </div>
              </div>
            </Card>

            {/* Card 2: Skrip SQL Schema Supabase / Vercel */}
            <Card className="p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Skrip SQL Schema Database (1-Click Run)
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(DATABASE_SQL_SCHEMA);
                      setDbCopied(true);
                      setTimeout(() => setDbCopied(false), 3000);
                    }}
                    className="text-xs"
                  >
                    {dbCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Salin SQL Schema
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  Jalankan skrip ini sekali di <strong>Supabase SQL Editor</strong> atau <strong>Vercel Postgres Query Console</strong> untuk membuat tabel <code>tenants</code>, <code>profiles</code>, dan <code>records</code> beserta hak akses realtime.
                </p>

                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
                    {DATABASE_SQL_SCHEMA}
                  </pre>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
                <span>Tabel siap sync: tenants, profiles, records</span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline flex items-center gap-1 font-bold"
                >
                  Buka Supabase Dashboard
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: FORMULIR TAMBAH GURU BARU
      ========================================================================= */}
      {showAddGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 space-y-4 text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Tambah Guru Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan guru pengampu ke {kopSekolah || currentTenant.namaSekolah}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddGuruModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSimpanGuru} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    NIP / NUPTK
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: 198503152010012015"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Akun Guru <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="budi@sekolah.sch.id"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Matematika / IPA"
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kelas yang Diampu <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Kelas 7A, Kelas 8B"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nomor HP / WhatsApp
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formTelepon}
                  onChange={(e) => setFormTelepon(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddGuruModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Simpan Guru
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: KELOLA SELURUH DAFTAR GURU
      ========================================================================= */}
      {showGuruListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl p-6 space-y-4 text-left relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Daftar Guru Pengampu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {guruList.length} guru di {kopSekolah || currentTenant.namaSekolah}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs"
                  onClick={() => {
                    setShowAddGuruModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Guru
                </Button>
                <button
                  onClick={() => setShowGuruListModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-xl border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold sticky top-0 border-b">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-3">NIP</th>
                    <th className="py-2.5 px-3">Mapel</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Email & HP</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {guruList.map((guru, index) => (
                    <tr key={guru.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {guru.nama}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {guru.nip || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-teal-700 dark:text-teal-300">
                        {guru.mapel}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {guru.kelas}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        <div>{guru.email}</div>
                        {guru.telepon && <div className="text-slate-400">{guru.telepon}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(isSuperAdmin || isOperator) && (
                            <>
                              <button
                                onClick={() => handleImpersonateGuru(guru)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                                title={`Login sebagai ${guru.nama}`}
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Login as Guru</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowGuruListModal(false);
                                  navigate(`/rekap?guruId=${guru.id}`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
                                title={`Buka rekap nilai, absen, & jurnal ${guru.nama}`}
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>Rekap</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleHapusGuru(guru.id, guru.nama)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowGuruListModal(false)}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: PENGATURAN KOP SEKOLAH & PENGESAHAN DOKUMEN
      ========================================================================= */}
      {showKopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 space-y-4 text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Kop Sekolah & Pengesahan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi kop surat resmi dan data Kepala Sekolah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKopModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {kopSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{kopSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSimpanKop} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Resmi Sekolah / Instansi <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: SMP Negeri 2 Tanjung"
                  value={kopSekolah}
                  onChange={(e) => setKopSekolah(e.target.value)}
                  className="w-full text-xs font-bold"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  Dicetak pada baris utama kop dokumen resmi laporan absensi, nilai, dan jurnal.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tahun Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: 2026/2027"
                    value={kopTP}
                    onChange={(e) => setKopTP(e.target.value)}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Semester Aktif
                  </label>
                  <select
                    value={kopSemester}
                    onChange={(e) => setKopSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                  Pejabat Penandatangan Dokumen (Kepala Sekolah)
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Lengkap Kepala Sekolah & Gelar
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Dr. Hj. Siti Fatimah, M.Pd."
                    value={kopKepsek}
                    onChange={(e) => setKopKepsek(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    NIP Kepala Sekolah
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: 197208151998032004"
                    value={kopNipKepsek}
                    onChange={(e) => setKopNipKepsek(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kopTampilkanKredit}
                    onChange={(e) => setKopTampilkanKredit(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Sertakan catatan kaki resmi aplikasi pada ekspor berkas dinas
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKopModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Simpan Kop & Pengesahan
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: SIMULASI PEMBAYARAN QRIS / VA (HANYA UNTUK SUPERADMIN)
      ========================================================================= */}
      {showPaymentModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 space-y-4 text-left relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Pembayaran Instan QRIS & VA
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-500">Paket yang dipilih:</span>
              <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {showPaymentModal}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <div className="w-44 h-44 mx-auto bg-slate-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                <QrCode className="w-24 h-24 text-slate-800 mb-1" />
                <span className="text-[10px] font-bold text-slate-500">QRIS STANDAR NASIONAL</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Scan dengan GoPay, OVO, ShopeePay, BCA Mobile, Livin Mandiri, atau BRImo
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Virtual Account Mandiri:</span>
                <span className="font-mono font-bold">88708 0812345678</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Transaksi:</span>
                <span className="text-amber-600 font-bold">Menunggu Pembayaran</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                alert('Simulasi: Pembayaran berhasil diverifikasi! Lisensi Anda telah diperpanjang.');
                setShowPaymentModal(null);
              }}
            >
              Simulasi Cek Status Pembayaran
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
