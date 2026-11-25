-- ==============================================================================
-- BISA ABSEN SAAS - POSTGRESQL & SUPABASE PRODUCTION SCHEMA
-- Arsitektur Multi-Tenant, Local-First Sync, dan Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPE ENUM
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('guru', 'kepsek', 'operator', 'superadmin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier_enum AS ENUM ('free', 'pro_guru', 'school_starter', 'school_enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL TENANTS (SEKOLAH / YAYASAN)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_sekolah VARCHAR(255) NOT NULL,
  npsn VARCHAR(20),
  jenjang VARCHAR(50) DEFAULT 'SD',
  alamat TEXT,
  tier subscription_tier_enum NOT NULL DEFAULT 'free',
  kuota_guru INT NOT NULL DEFAULT 10,
  kuota_siswa INT NOT NULL DEFAULT 350,
  langganan_aktif_sampai TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL PROFILES (PENGGUNA / GURU / KEPSEK / OPERATOR)
-- Terintegrasi dengan auth.users pada Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  nama_lengkap VARCHAR(255) NOT NULL,
  nama_panggilan VARCHAR(100),
  nip VARCHAR(50),
  peran user_role_enum NOT NULL DEFAULT 'guru',
  avatar_url TEXT,
  telepon VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL GENERIK RECORDS (SINKRONISASI IDENTIK DENGAN INDEXEDDB KLIEN)
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL, -- Unix timestamp milidetik dari client/server
  deleted SMALLINT NOT NULL DEFAULT 0, -- 0 = aktif, 1 = terhapus
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEKS PERFORMA TINGGI UNTUK SYNC QUERY DELTA
CREATE INDEX IF NOT EXISTS idx_records_tenant_kind_updated ON public.records(tenant_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_kind_updated ON public.records(user_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON public.records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_kind_deleted ON public.records(kind, deleted);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Helper function: Dapatkan profil user yang sedang login
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS public.profiles AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Kebijakan Tenants:
-- User hanya bisa melihat profil sekolah mereka sendiri
CREATE POLICY "Tenants: View own tenant"
  ON public.tenants FOR SELECT
  USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- Kebijakan Profiles:
-- User bisa melihat profil dalam satu sekolah yang sama
CREATE POLICY "Profiles: View same tenant"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Profiles: Update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Kebijakan Records (Inti Multi-Tenant Sync):
-- 1. SELECT: Guru melihat datanya sendiri + data master sekolah (kelas, siswa) yang dibagikan operator
CREATE POLICY "Records: Select policy"
  ON public.records FOR SELECT
  USING (
    -- Guru mandiri (tanpa tenant): hanya melihat miliknya sendiri
    (tenant_id IS NULL AND user_id = auth.uid())
    -- Guru dalam sekolah: melihat datanya sendiri atau data master kelas/siswa yang diunggah operator
    OR (
      tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      AND (
        user_id = auth.uid()
        OR kind IN ('kelas', 'siswa', 'jadwal')
        OR (SELECT peran FROM public.profiles WHERE id = auth.uid()) IN ('operator', 'kepsek', 'superadmin')
      )
    )
  );

-- 2. INSERT / UPDATE: Guru mengubah datanya sendiri, Operator bisa mengubah kelas/siswa sekolah
CREATE POLICY "Records: Insert policy"
  ON public.records FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      tenant_id IS NULL
      OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Records: Update policy"
  ON public.records FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR (
      tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      AND (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'operator'
    )
  );

-- 3. DELETE (Soft delete biasanya lewat UPDATE deleted=1, ini proteksi hard delete)
CREATE POLICY "Records: Delete policy"
  ON public.records FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      AND (SELECT peran FROM public.profiles WHERE id = auth.uid()) = 'operator'
    )
  );

-- 7. STORED PROCEDURE: BATCH PUSH DARI CLIENT SYNC
-- Menerima array record JSON dari IndexedDB client dan meng-upsert dengan resolusi konflik Last-Write-Wins (LWW)
CREATE OR REPLACE FUNCTION public.sync_push_records(
  payload_records JSONB
)
RETURNS JSONB AS $$
DECLARE
  rec JSONB;
  accepted_count INT := 0;
  client_uid UUID := auth.uid();
  user_tenant_id UUID;
BEGIN
  -- Dapatkan tenant_id user
  SELECT tenant_id INTO user_tenant_id FROM public.profiles WHERE id = client_uid;

  FOR rec IN SELECT * FROM jsonb_array_elements(payload_records)
  LOOP
    INSERT INTO public.records (id, tenant_id, user_id, kind, data, updated_at, deleted)
    VALUES (
      (rec->>'id')::UUID,
      user_tenant_id,
      client_uid,
      rec->>'kind',
      rec->'data',
      (rec->>'updatedAt')::BIGINT,
      (COALESCE(rec->>'deleted', '0'))::SMALLINT
    )
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = EXCLUDED.updated_at,
      deleted = EXCLUDED.deleted
    WHERE EXCLUDED.updated_at >= public.records.updated_at; -- Last-Write-Wins (hanya timpa jika timestamp lebih baru)

    accepted_count := accepted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'acceptedCount', accepted_count,
    'serverTimestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. STORED PROCEDURE: BATCH PULL DELTA DARI SERVER
CREATE OR REPLACE FUNCTION public.sync_pull_records(
  last_sync_timestamp BIGINT
)
RETURNS JSONB AS $$
DECLARE
  client_uid UUID := auth.uid();
  user_tenant_id UUID;
  result_records JSONB;
BEGIN
  SELECT tenant_id INTO user_tenant_id FROM public.profiles WHERE id = client_uid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'kind', r.kind,
        'data', r.data,
        'updatedAt', r.updated_at,
        'deleted', r.deleted,
        'dirty', 0
      )
    ),
    '[]'::JSONB
  ) INTO result_records
  FROM public.records r
  WHERE
    r.updated_at > last_sync_timestamp
    AND (
      (user_tenant_id IS NULL AND r.user_id = client_uid)
      OR (
        r.tenant_id = user_tenant_id
        AND (
          r.user_id = client_uid
          OR r.kind IN ('kelas', 'siswa', 'jadwal')
        )
      )
    );

  RETURN jsonb_build_object(
    'success', true,
    'changes', result_records,
    'serverTimestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
