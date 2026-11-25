import type { GenericRecord, RecordKind } from './database';

export type UserRole = 'guru' | 'kepsek' | 'operator' | 'superadmin';

export type SubscriptionTier = 'free' | 'pro_guru' | 'school_starter' | 'school_enterprise';

export interface TenantProfile {
  id: string; // UUID sekolah / yayasan
  namaSekolah: string;
  npsn?: string;
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' | 'Lainnya';
  tier: SubscriptionTier;
  kuotaSiswa: number;
  kuotaGuru: number;
  langgananAktifSampai: number | null; // Timestamp milidetik
  createdAt: number;
}

export interface UserAuthProfile {
  id: string; // UUID user auth
  email: string;
  namaLengkap: string;
  namaPanggilan?: string;
  peran: UserRole;
  tenantId?: string; // ID sekolah (jika terikat ke institusi)
  sekolahNama?: string;
  avatarUrl?: string;
  telepon?: string;
  token?: string;
}

export interface CloudRecord<T = Record<string, unknown>> extends GenericRecord<T> {
  tenantId?: string;
  userId: string;
  serverUpdatedAt?: number;
}

export interface SyncPushPayload {
  tenantId?: string;
  userId: string;
  records: GenericRecord[];
  clientTimestamp: number;
}

export interface SyncPushResponse {
  success: boolean;
  acceptedCount: number;
  serverTimestamp: number;
  conflictIds?: string[];
}

export interface SyncPullPayload {
  tenantId?: string;
  userId: string;
  lastSyncTimestamp: number;
  kinds?: (RecordKind | string)[];
}

export interface SyncPullResponse {
  success: boolean;
  changes: GenericRecord[];
  serverTimestamp: number;
  hasMore: boolean;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
