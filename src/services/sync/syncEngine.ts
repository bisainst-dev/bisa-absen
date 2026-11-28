import { genericRepo, onDBChange } from '../../db/dexie';
import { useAuthStore } from '../../stores/useAuthStore';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import type { SyncState, SyncPushResponse, SyncPullResponse } from '../../types/saas';
import type { GenericRecord } from '../../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

class SyncEngine {
  private state: SyncState = 'idle';
  private listeners: Set<(state: SyncState, dirtyCount: number) => void> = new Set();
  private lastSyncTime: number = 0;
  private isSyncing = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private inMemoryCloudCache: Record<string, GenericRecord> = {};
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.lastSyncTime = Number(localStorage.getItem('bisa_absen_last_sync_time') || '0');
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
        this.syncNow().catch(console.error);
      });
      window.addEventListener('offline', () => {
        this.state = 'offline';
        this.notify();
      });
    }

    // Inisialisasi Realtime jika Supabase sudah terkonfigurasi
    this.setupRealtimeSubscription();

    // Auto-sync listener setiap ada perubahan data lokal di Dexie
    onDBChange(() => {
      this.triggerDebouncedSync(1200);
    });
  }

  /**
   * Memicu sinkronisasi cloud otomatis secara debounce saat data lokal berubah
   */
  public triggerDebouncedSync(delayMs = 1200): void {
    if (typeof window === 'undefined') return;
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      const auth = useAuthStore.getState();
      if (auth.isAuthenticated && navigator.onLine) {
        this.syncNow().catch((err) => {
          console.warn('[SyncEngine] Auto-sync debounced failed:', err);
        });
      }
    }, delayMs);
  }

  public setupRealtimeSubscription(): void {
    const supabase = getSupabase();
    if (!supabase) {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
      return;
    }

    if (this.realtimeChannel) return;

    try {
      this.realtimeChannel = supabase
        .channel('bisa_absen_records_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'records' },
          async (payload) => {
            const row = (payload.new || payload.old) as {
              id?: string;
              kind?: string;
              data?: Record<string, unknown>;
              updated_at?: number | string;
              deleted?: number;
            } | null;

            if (row && row.id && row.kind) {
              const incoming: GenericRecord = {
                id: row.id,
                kind: row.kind,
                data: row.data || {},
                updatedAt: Number(row.updated_at || Date.now()),
                deleted: (row.deleted ?? 0) as 0 | 1,
                dirty: 0,
              };
              await genericRepo.upsertFromCloud([incoming]);
              this.notify();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[SyncEngine] Gagal inisialisasi Supabase Realtime channel:', err);
    }
  }

  public getState(): SyncState {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return this.state;
  }

  public subscribe(fn: (state: SyncState, dirtyCount: number) => void): () => void {
    this.listeners.add(fn);
    this.getDirtyCount().then((count) => fn(this.getState(), count));
    return () => this.listeners.delete(fn);
  }

  private async notify() {
    const count = await this.getDirtyCount();
    const currentState = this.getState();
    this.listeners.forEach((fn) => fn(currentState, count));
  }

  public async getDirtyCount(): Promise<number> {
    try {
      const dirtyRecords = await genericRepo.findDirty();
      return dirtyRecords.length;
    } catch {
      return 0;
    }
  }

  /**
   * PUSH: Kirim data lokal yang kotor ke Database Cloud (Supabase atau Vercel)
   */
  private async callCloudApiPush(records: GenericRecord[]): Promise<SyncPushResponse> {
    const supabase = getSupabase();

    if (supabase) {
      const auth = useAuthStore.getState();
      const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';
      const userId = auth.user?.id || 'usr-guru-budi';

      const rows = records.map((r) => ({
        id: r.id,
        tenant_id: tenantId,
        user_id: userId,
        kind: r.kind,
        data: r.data,
        updated_at: r.updatedAt,
        deleted: r.deleted ?? 0,
      }));

      const { error } = await supabase.from('records').upsert(rows, { onConflict: 'id' });

      if (error) {
        throw new Error(`Gagal push ke Supabase: ${error.message}`);
      }

      return {
        success: true,
        acceptedCount: records.length,
        serverTimestamp: Date.now(),
      };
    }

    // Fallback: Penyimpanan lokal browser jika Supabase belum disambungkan
    await new Promise((r) => setTimeout(r, 100));
    const cloudRecordsKey = 'bisa_absen_cloud_records_mock';
    let existingCloud: Record<string, GenericRecord> = this.inMemoryCloudCache;
    if (typeof localStorage !== 'undefined') {
      try {
        existingCloud = JSON.parse(localStorage.getItem(cloudRecordsKey) || '{}');
      } catch {
        existingCloud = {};
      }
    }

    for (const rec of records) {
      existingCloud[rec.id] = rec;
      this.inMemoryCloudCache[rec.id] = rec;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cloudRecordsKey, JSON.stringify(existingCloud));
      } catch (e) {
        console.error(e);
      }
    }

    return {
      success: true,
      acceptedCount: records.length,
      serverTimestamp: Date.now(),
    };
  }

  /**
   * PULL: Ambil data terbaru dari Database Cloud (Supabase atau Vercel)
   */
  private async callCloudApiPull(sinceTimestamp: number): Promise<SyncPullResponse> {
    const supabase = getSupabase();

    if (supabase) {
      const auth = useAuthStore.getState();
      const tenantId = auth.tenant?.id || auth.user?.tenantId || 'tenant-demo-smpn2';
      // Berikan toleransi 5 detik untuk mengantisipasi perbedaan jam perangkat (clock skew)
      const effectiveSince = Math.max(0, sinceTimestamp - 5000);

      let query = supabase
        .from('records')
        .select('*')
        .gt('updated_at', effectiveSince);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Gagal pull dari Supabase: ${error.message}`);
      }

      const changes: GenericRecord[] = (data || []).map((row: {
        id: string;
        kind: string;
        data: Record<string, unknown>;
        updated_at: number | string;
        deleted?: number;
      }) => ({
        id: row.id,
        kind: row.kind,
        data: row.data,
        updatedAt: Number(row.updated_at),
        deleted: (row.deleted ?? 0) as 0 | 1,
        dirty: 0,
      }));

      return {
        success: true,
        changes,
        serverTimestamp: Date.now(),
        hasMore: false,
      };
    }

    // Fallback: Mock local cache
    await new Promise((r) => setTimeout(r, 100));
    const cloudRecordsKey = 'bisa_absen_cloud_records_mock';
    let existingCloud: Record<string, GenericRecord> = this.inMemoryCloudCache;
    if (typeof localStorage !== 'undefined') {
      try {
        existingCloud = JSON.parse(localStorage.getItem(cloudRecordsKey) || '{}');
      } catch {
        existingCloud = {};
      }
    }

    const changes = Object.values(existingCloud).filter(
      (r) => r.updatedAt > sinceTimestamp
    );

    return {
      success: true,
      changes,
      serverTimestamp: Date.now(),
      hasMore: false,
    };
  }

  /**
   * Eksekusi sinkronisasi dua arah (Push -> Pull)
   */
  public async syncNow(): Promise<{
    success: boolean;
    pushed: number;
    pulled: number;
    isCloudConnected: boolean;
    error?: string;
  }> {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        isCloudConnected: isSupabaseConfigured(),
        error: 'Belum masuk ke akun',
      };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
      await this.notify();
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        isCloudConnected: isSupabaseConfigured(),
        error: 'Perangkat sedang offline',
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        isCloudConnected: isSupabaseConfigured(),
        error: 'Sinkronisasi sedang berjalan',
      };
    }

    this.isSyncing = true;
    this.state = 'syncing';
    await this.notify();

    let pushed = 0;
    let pulled = 0;
    const isCloudConnected = isSupabaseConfigured();

    try {
      // Pastikan channel realtime aktif jika cloud terpasang
      if (isCloudConnected && !this.realtimeChannel) {
        this.setupRealtimeSubscription();
      }

      // 1. PUSH: Kirim record lokal yang kotor (dirty)
      const dirtyRecords = await genericRepo.findDirty();
      if (dirtyRecords.length > 0) {
        const pushRes = await this.callCloudApiPush(dirtyRecords);
        if (pushRes.success) {
          const syncedIds = dirtyRecords.map((r) => r.id);
          await genericRepo.markSynced(syncedIds);
          pushed = pushRes.acceptedCount;
        }
      }

      // 2. PULL: Tarik perubahan delta dari cloud
      const pullRes = await this.callCloudApiPull(this.lastSyncTime);
      if (pullRes.success && pullRes.changes.length > 0) {
        pulled = await genericRepo.upsertFromCloud(pullRes.changes);
      }

      this.lastSyncTime = Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bisa_absen_last_sync_time', String(this.lastSyncTime));
      }

      this.state = 'synced';
      await this.notify();

      // Kembalikan ke idle setelah 3 detik
      setTimeout(() => {
        if (this.state === 'synced') {
          this.state = 'idle';
          this.notify();
        }
      }, 3000);

      return { success: true, pushed, pulled, isCloudConnected };
    } catch (err: unknown) {
      console.error('Gagal sinkronisasi cloud:', err);
      this.state = 'error';
      await this.notify();
      return {
        success: false,
        pushed,
        pulled,
        isCloudConnected,
        error: err instanceof Error ? err.message : 'Terjadi kesalahan jaringan',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sinkronisasi penuh paksa (Full Sync):
   * Menandai SEMUA data lokal sebagai kotor (dirty: 1) dan mengunggah semuanya ke cloud,
   * serta menarik semua perubahan yang ada di cloud.
   */
  public async syncAllForce(): Promise<{
    success: boolean;
    pushed: number;
    pulled: number;
    isCloudConnected: boolean;
    error?: string;
  }> {
    await genericRepo.markAllDirty();
    this.lastSyncTime = 0;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('bisa_absen_last_sync_time');
    }
    return this.syncNow();
  }

  /**
   * Tarik paksa SEMUA data dari cloud tanpa mengunggah data lokal (Force Pull)
   */
  public async pullAllForce(): Promise<{
    success: boolean;
    pulled: number;
    isCloudConnected: boolean;
    error?: string;
  }> {
    this.lastSyncTime = 0;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('bisa_absen_last_sync_time');
    }
    const isCloudConnected = isSupabaseConfigured();
    try {
      this.state = 'syncing';
      await this.notify();
      const pullRes = await this.callCloudApiPull(0);
      let pulled = 0;
      if (pullRes.success && pullRes.changes.length > 0) {
        pulled = await genericRepo.upsertFromCloud(pullRes.changes);
      }
      this.lastSyncTime = Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bisa_absen_last_sync_time', String(this.lastSyncTime));
      }
      this.state = 'synced';
      await this.notify();
      return { success: true, pulled, isCloudConnected };
    } catch (err: unknown) {
      this.state = 'error';
      await this.notify();
      return {
        success: false,
        pulled: 0,
        isCloudConnected,
        error: err instanceof Error ? err.message : 'Gagal menarik data cloud',
      };
    }
  }
}

export const syncEngine = new SyncEngine();
