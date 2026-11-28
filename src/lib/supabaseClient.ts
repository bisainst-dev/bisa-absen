import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'bisa_absen_supabase_url';
const STORAGE_KEY_ANON_KEY = 'bisa_absen_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

/**
 * Mendapatkan konfigurasi Supabase saat ini (dari environment Vercel atau penyimpanan lokal)
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  if (typeof localStorage !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim();
    const customKey = localStorage.getItem(STORAGE_KEY_ANON_KEY)?.trim();
    if (customUrl && customKey) {
      return {
        url: customUrl,
        anonKey: customKey,
        source: 'custom',
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
  };
}

/**
 * Cek apakah database Supabase sudah terkonfigurasi
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

/**
 * Dapatkan instance Supabase Client (Singleton)
 */
export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && cachedUrl === config.url && cachedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedUrl = config.url;
    cachedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('[Supabase] Gagal inisialisasi client:', err);
    return null;
  }
}

/**
 * Simpan konfigurasi Supabase kustom (berguna saat user belum memasang di environment Vercel)
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON_KEY, anonKey.trim());
  }
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}

/**
 * Hapus konfigurasi Supabase kustom
 */
export function clearSupabaseConfig(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON_KEY);
  }
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}

/**
 * Menguji koneksi database Supabase secara langsung
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tableReady?: boolean;
  recordCount?: number;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: 'URL atau Anon Key Supabase belum diatur.',
    };
  }

  try {
    // Tes query ke tabel records
    const { data, count, error } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      if (error.code === '42P01') {
        // Table does not exist
        return {
          success: false,
          tableReady: false,
          message:
            'Koneksi Supabase berhasil, namun tabel "records" belum dibuat. Silakan jalankan SQL Schema di SQL Editor Supabase.',
        };
      }
      return {
        success: false,
        message: `Koneksi ditolak: ${error.message} (${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      tableReady: true,
      recordCount: count ?? data?.length ?? 0,
      message: `Database Cloud Terhubung! Total ${count ?? data?.length ?? 0} record cloud ditemukan.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menghubungi server database: ${errorMessage}`,
    };
  }
}
