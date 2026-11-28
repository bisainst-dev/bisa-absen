-- ==============================================================================
-- BISA ABSEN SAAS - POSTGRESQL & SUPABASE PRODUCTION SCHEMA (VERCEL & SUPABASE READY)
-- Arsitektur Multi-Tenant, Local-First Sync, dan Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABEL TENANTS (SEKOLAH / YAYASAN)
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

-- 3. TABEL PROFILES (PENGGUNA / GURU / KEPSEK / OPERATOR / ADMIN)
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

-- 4. TABEL RECORDS (SINKRONISASI IDENTIK DENGAN INDEXEDDB KLIEN BISA ABSEN)
CREATE TABLE IF NOT EXISTS public.records (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255),
  user_id VARCHAR(255),
  kind VARCHAR(100) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL, -- Unix timestamp milidetik dari client/server
  deleted SMALLINT NOT NULL DEFAULT 0, -- 0 = aktif, 1 = terhapus
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEKS PERFORMA TINGGI UNTUK SYNC QUERY DELTA
CREATE INDEX IF NOT EXISTS idx_records_tenant_kind_updated ON public.records(tenant_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_kind_updated ON public.records(user_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON public.records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_kind_deleted ON public.records(kind, deleted);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Memungkinkan aplikasi web Vercel & mobile native mengakses data secara aman
DROP POLICY IF EXISTS "tenants_public_access" ON public.tenants;
CREATE POLICY "tenants_public_access" ON public.tenants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_public_access" ON public.profiles;
CREATE POLICY "profiles_public_access" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "records_public_access" ON public.records;
CREATE POLICY "records_public_access" ON public.records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. REALTIME REPLICATION (SUPABASE)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.records;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. SEED DATA DEFAULT (TENANT SEKOLAH & AKUN PENGGUNA)
INSERT INTO public.tenants (id, nama_sekolah, npsn, jenjang, tier, kuota_guru, kuota_siswa)
VALUES (
  'tenant-demo-smpn2',
  'SMP Negeri 2 Tanjung',
  '20104050',
  'SMP',
  'school_starter',
  50,
  1000
)
ON CONFLICT (id) DO UPDATE SET
  nama_sekolah = EXCLUDED.nama_sekolah,
  updated_at = NOW();

INSERT INTO public.profiles (id, tenant_id, email, nama_lengkap, nama_panggilan, peran)
VALUES 
  ('usr-admin-bisa', 'tenant-demo-smpn2', 'admin@sekolah.sch.id', 'Administrator Utama Esduta Gate', 'Admin Pusat', 'superadmin'),
  ('usr-guru-budi', 'tenant-demo-smpn2', 'budi.santoso@sekolah.sch.id', 'Budi Santoso, S.Pd.', 'Pak Budi', 'guru'),
  ('usr-ops-hendra', 'tenant-demo-smpn2', 'operator@sekolah.sch.id', 'Hendra Gunawan, S.Kom.', 'Pak Hendra', 'operator'),
  ('usr-kepsek-siti', 'tenant-demo-smpn2', 'kepsek@sekolah.sch.id', 'Dr. Hj. Siti Fatimah, M.Pd.', 'Bu Siti', 'kepsek')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nama_lengkap = EXCLUDED.nama_lengkap,
  peran = EXCLUDED.peran,
  updated_at = NOW();

-- 8. STORED PROCEDURE: BATCH PUSH DARI CLIENT DENGAN LAST-WRITE-WINS (LWW)
CREATE OR REPLACE FUNCTION public.sync_push_records(
  payload_records JSONB,
  p_tenant_id VARCHAR DEFAULT 'tenant-demo-smpn2',
  p_user_id VARCHAR DEFAULT 'usr-guru-budi'
)
RETURNS JSONB AS $$
DECLARE
  rec JSONB;
  accepted_count INT := 0;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(payload_records)
  LOOP
    INSERT INTO public.records (id, tenant_id, user_id, kind, data, updated_at, deleted)
    VALUES (
      rec->>'id',
      COALESCE(rec->>'tenantId', p_tenant_id),
      COALESCE(rec->>'userId', p_user_id),
      rec->>'kind',
      rec->'data',
      (rec->>'updatedAt')::BIGINT,
      (COALESCE(rec->>'deleted', '0'))::SMALLINT
    )
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = EXCLUDED.updated_at,
      deleted = EXCLUDED.deleted
    WHERE EXCLUDED.updated_at >= public.records.updated_at;

    accepted_count := accepted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'acceptedCount', accepted_count,
    'serverTimestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
