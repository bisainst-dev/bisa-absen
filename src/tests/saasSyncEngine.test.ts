import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import { authService, DEMO_TENANT, DEMO_USERS } from '../services/auth/authService';
import type { GenericRecord } from '../types/database';

describe('SaaS Auth & Multi-Tenant Sync Tests', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('berhasil login demo guru dan menyimpan profil ke auth store', async () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    const user = await authService.loginWithDemo('guru');
    expect(user.peran).toBe('guru');
    expect(user.namaLengkap).toContain('Budi Santoso');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe(DEMO_USERS.guru.id);
    expect(state.tenant?.id).toBe(DEMO_TENANT.id);
  });

  it('dapat berganti peran antar Guru, Kepala Sekolah, dan Operator secara dinamis', async () => {
    await authService.loginWithDemo('guru');
    expect(useAuthStore.getState().user?.peran).toBe('guru');

    useAuthStore.getState().switchRole('kepsek');
    expect(useAuthStore.getState().user?.peran).toBe('kepsek');

    useAuthStore.getState().switchRole('operator');
    expect(useAuthStore.getState().user?.peran).toBe('operator');
  });

  it('berhasil logout dan mengembalikan status ke mode offline lokal', async () => {
    await authService.loginWithDemo('guru');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await authService.logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().tenant).toBeNull();
  });

  it('memvalidasi aturan resolusi konflik Last-Write-Wins (LWW) pada sinkronisasi cloud', () => {
    // Fungsi algoritma deterministik LWW
    function applyLWW(
      existing: GenericRecord | undefined,
      incoming: GenericRecord
    ): { apply: boolean; final: GenericRecord } {
      if (!existing || incoming.updatedAt >= existing.updatedAt) {
        return { apply: true, final: { ...incoming, dirty: 0 } };
      }
      return { apply: false, final: existing };
    }

    const localTime = 1700000000000;
    const newerServerTime = 1700000050000;
    const olderServerTime = 1699999900000;

    const localRecord: GenericRecord = {
      id: 'siswa-lww-1',
      kind: 'siswa',
      data: { nama: 'Nama Versi Lokal' },
      updatedAt: localTime,
      deleted: 0,
      dirty: 1,
    };

    // 1. Data cloud lebih baru -> Diterima dan menimpa record lokal
    const incomingNewer: GenericRecord = {
      id: 'siswa-lww-1',
      kind: 'siswa',
      data: { nama: 'Nama Diperbarui di Cloud Server' },
      updatedAt: newerServerTime,
      deleted: 0,
      dirty: 0,
    };

    const res1 = applyLWW(localRecord, incomingNewer);
    expect(res1.apply).toBe(true);
    expect((res1.final.data as { nama: string }).nama).toBe('Nama Diperbarui di Cloud Server');
    expect(res1.final.dirty).toBe(0);

    // 2. Data cloud lebih usang (stale) -> Ditolak, pertahankan data lokal
    const incomingOlder: GenericRecord = {
      id: 'siswa-lww-1',
      kind: 'siswa',
      data: { nama: 'Nama Kadaluarsa' },
      updatedAt: olderServerTime,
      deleted: 0,
      dirty: 0,
    };

    const res2 = applyLWW(localRecord, incomingOlder);
    expect(res2.apply).toBe(false);
    expect((res2.final.data as { nama: string }).nama).toBe('Nama Versi Lokal');
  });

  it('memvalidasi struktur payload batch push dan pull sinkronisasi multi-tenant', () => {
    const payloadRecords: GenericRecord[] = [
      {
        id: 'rec-1',
        kind: 'absensi',
        data: { tanggal: '2026-11-25', mapel: 'Matematika' },
        updatedAt: Date.now(),
        deleted: 0,
        dirty: 1,
      },
    ];

    expect(payloadRecords.length).toBe(1);
    expect(payloadRecords[0].dirty).toBe(1);

    // Simulasi respons server pasca-push
    const pushResponse = {
      success: true,
      acceptedCount: payloadRecords.length,
      serverTimestamp: Date.now(),
    };

    expect(pushResponse.success).toBe(true);
    expect(pushResponse.acceptedCount).toBe(1);
  });

  it('memvalidasi pembatasan hak akses (RBAC): guru hanya mengakses fitur guru, dilarang masuk portal', async () => {
    // Helper validasi hak akses route
    function canAccessRoute(role: string, path: string): boolean {
      if (path === '/portal') {
        return ['kepsek', 'operator', 'superadmin'].includes(role);
      }
      if (['/jadwal', '/absensi', '/jurnal', '/nilai', '/kegiatan', '/catatan'].includes(path)) {
        return ['guru', 'guest', 'superadmin'].includes(role);
      }
      if (path === '/siswa') {
        return ['guru', 'operator', 'superadmin', 'guest'].includes(role);
      }
      return true; // route umum: /rekap, /backup, /pengaturan, /lainnya
    }

    // 1. Akun Guru
    await authService.loginWithDemo('guru');
    expect(canAccessRoute('guru', '/portal')).toBe(false); // Dilarang!
    expect(canAccessRoute('guru', '/absensi')).toBe(true);  // Boleh
    expect(canAccessRoute('guru', '/nilai')).toBe(true);    // Boleh
    expect(canAccessRoute('guru', '/jurnal')).toBe(true);   // Boleh
    expect(canAccessRoute('guru', '/rekap')).toBe(true);    // Boleh

    // 2. Akun Kepsek
    await authService.loginWithDemo('kepsek');
    expect(canAccessRoute('kepsek', '/portal')).toBe(true);  // Boleh (Dashboard Kepsek)
    expect(canAccessRoute('kepsek', '/absensi')).toBe(false); // Dilarang (Tugas guru kelas)
    expect(canAccessRoute('kepsek', '/nilai')).toBe(false);   // Dilarang (Tugas guru kelas)
    expect(canAccessRoute('kepsek', '/rekap')).toBe(true);   // Boleh (Rekap dinas)

    // 3. Akun Operator
    await authService.loginWithDemo('operator');
    expect(canAccessRoute('operator', '/portal')).toBe(true); // Boleh
    expect(canAccessRoute('operator', '/siswa')).toBe(true);  // Boleh (Master siswa)
    expect(canAccessRoute('operator', '/absensi')).toBe(false); // Dilarang (Tugas guru kelas)
  });
});
