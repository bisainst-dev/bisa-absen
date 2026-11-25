import { genericRepo } from '../../db/dexie';
import { useAuthStore } from '../../stores/useAuthStore';
import type { SyncState, SyncPushResponse, SyncPullResponse } from '../../types/saas';
import type { GenericRecord } from '../../types/database';

class SyncEngine {
  private state: SyncState = 'idle';
  private listeners: Set<(state: SyncState, dirtyCount: number) => void> = new Set();
  private lastSyncTime: number = 0;
  private isSyncing = false;

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

  private inMemoryCloudCache: Record<string, GenericRecord> = {};

  /**
   * Simulasi mock cloud API (atau memanggil endpoint Supabase / REST jika URL tersedia)
   */
  private async callCloudApiPush(records: GenericRecord[]): Promise<SyncPushResponse> {
    // Simulasi jeda network realistis (400ms)
    await new Promise((r) => setTimeout(r, 100));

    // Simpan ke cloud cache lokal browser untuk demonstrasi multi-device
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

  private async callCloudApiPull(sinceTimestamp: number): Promise<SyncPullResponse> {
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
    error?: string;
  }> {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) {
      return { success: false, pushed: 0, pulled: 0, error: 'Belum masuk ke akun cloud' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
      await this.notify();
      return { success: false, pushed: 0, pulled: 0, error: 'Perangkat sedang offline' };
    }

    if (this.isSyncing) {
      return { success: false, pushed: 0, pulled: 0, error: 'Sinkronisasi sedang berjalan' };
    }

    this.isSyncing = true;
    this.state = 'syncing';
    await this.notify();

    let pushed = 0;
    let pulled = 0;

    try {
      // 1. PUSH: Kirim record lokal yang dirty
      const dirtyRecords = await genericRepo.findDirty();
      if (dirtyRecords.length > 0) {
        const pushRes = await this.callCloudApiPush(dirtyRecords);
        if (pushRes.success) {
          const syncedIds = dirtyRecords.map((r) => r.id);
          await genericRepo.markSynced(syncedIds);
          pushed = pushRes.acceptedCount;
        }
      }

      // 2. PULL: Tarik perubahan dari cloud
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

      return { success: true, pushed, pulled };
    } catch (err: unknown) {
      console.error('Gagal sinkronisasi cloud:', err);
      this.state = 'error';
      await this.notify();
      return {
        success: false,
        pushed,
        pulled,
        error: err instanceof Error ? err.message : 'Terjadi kesalahan jaringan',
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
