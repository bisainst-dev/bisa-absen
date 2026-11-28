import type { UserAuthProfile, TenantProfile, UserRole } from '../../types/saas';
import { useAuthStore } from '../../stores/useAuthStore';

export const DEMO_TENANT: TenantProfile = {
  id: 'tenant-demo-smpn2',
  namaSekolah: 'SMP Negeri 2 Tanjung',
  npsn: '20104050',
  jenjang: 'SMP',
  tier: 'school_starter',
  kuotaGuru: 25,
  kuotaSiswa: 450,
  langgananAktifSampai: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 tahun ke depan
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
};

export const DEMO_USERS: Record<UserRole, UserAuthProfile> = {
  guru: {
    id: 'usr-guru-budi',
    email: 'budi.santoso@sekolah.sch.id',
    namaLengkap: 'Budi Santoso, S.Pd.',
    namaPanggilan: 'Pak Budi',
    peran: 'guru',
    tenantId: DEMO_TENANT.id,
    sekolahNama: DEMO_TENANT.namaSekolah,
    telepon: '081234567890',
  },
  operator: {
    id: 'usr-ops-hendra',
    email: 'operator@sekolah.sch.id',
    namaLengkap: 'Hendra Gunawan, S.Kom.',
    namaPanggilan: 'Pak Hendra',
    peran: 'operator',
    tenantId: DEMO_TENANT.id,
    sekolahNama: DEMO_TENANT.namaSekolah,
    telepon: '081298765432',
  },
  kepsek: {
    id: 'usr-kepsek-siti',
    email: 'kepsek@sekolah.sch.id',
    namaLengkap: 'Dr. Hj. Siti Fatimah, M.Pd.',
    namaPanggilan: 'Bu Siti',
    peran: 'kepsek',
    tenantId: DEMO_TENANT.id,
    sekolahNama: DEMO_TENANT.namaSekolah,
    telepon: '081122334455',
  },
  superadmin: {
    id: 'usr-admin-bisa',
    email: 'admin@sekolah.sch.id',
    namaLengkap: 'Administrator Utama Esduta Gate',
    namaPanggilan: 'Admin Pusat',
    peran: 'superadmin',
    tenantId: DEMO_TENANT.id,
    sekolahNama: DEMO_TENANT.namaSekolah,
  },
};

export const authService = {
  /**
   * Simulasi login dengan akun demo cepat
   */
  async loginWithDemo(peran: UserRole = 'guru'): Promise<UserAuthProfile> {
    const user = DEMO_USERS[peran];
    const tenant = user.tenantId ? DEMO_TENANT : undefined;
    useAuthStore.getState().login(user, tenant);
    return user;
  },

  /**
   * Login pengguna dengan Email & Password (bisa disambungkan ke Supabase client / REST API)
   */
  async loginWithEmail(email: string): Promise<UserAuthProfile> {
    const lowerEmail = email.toLowerCase().trim();

    // Deteksi Akun Administrator / Super Admin
    if (lowerEmail.includes('admin')) {
      const user: UserAuthProfile = {
        ...DEMO_USERS.superadmin,
        email,
        token: `jwt_token_admin_${Date.now()}`,
      };
      useAuthStore.getState().login(user, DEMO_TENANT);
      return user;
    }

    // Deteksi kecocokan akun terdaftar (Budi Santoso, Hendra, Dr. Siti Fatimah)
    if (lowerEmail.includes('budi') || lowerEmail === DEMO_USERS.guru.email.toLowerCase()) {
      const user = DEMO_USERS.guru;
      useAuthStore.getState().login(user, DEMO_TENANT);
      return user;
    }
    if (lowerEmail.includes('hendra') || lowerEmail.includes('operator') || lowerEmail === DEMO_USERS.operator.email.toLowerCase()) {
      const user = DEMO_USERS.operator;
      useAuthStore.getState().login(user, DEMO_TENANT);
      return user;
    }
    if (lowerEmail.includes('siti') || lowerEmail.includes('kepsek') || lowerEmail === DEMO_USERS.kepsek.email.toLowerCase()) {
      const user = DEMO_USERS.kepsek;
      useAuthStore.getState().login(user, DEMO_TENANT);
      return user;
    }

    // Simulasi respons autentikasi peran lainnya dengan ID stabil deterministik
    const role: UserRole = lowerEmail.includes('operator')
      ? 'operator'
      : lowerEmail.includes('kepsek')
        ? 'kepsek'
        : 'guru';

    const cleanId = `usr_${lowerEmail.replace(/[^a-z0-9]/g, '_')}`;
    const user: UserAuthProfile = {
      id: cleanId,
      email,
      namaLengkap: email.split('@')[0].toUpperCase(),
      namaPanggilan: email.split('@')[0],
      peran: role,
      tenantId: DEMO_TENANT.id,
      sekolahNama: DEMO_TENANT.namaSekolah,
      token: `jwt_token_${cleanId}`,
    };

    useAuthStore.getState().login(user, DEMO_TENANT);
    return user;
  },

  /**
   * Registrasi Akun Pengguna Baru (Guru, Kepsek, atau Operator)
   */
  async register(params: {
    namaLengkap: string;
    namaPanggilan?: string;
    email: string;
    password?: string;
    peran: UserRole;
    sekolahNama?: string;
    nip?: string;
    telepon?: string;
  }): Promise<UserAuthProfile> {
    const user: UserAuthProfile = {
      id: `usr_${Date.now()}`,
      email: params.email.trim(),
      namaLengkap: params.namaLengkap.trim(),
      namaPanggilan: params.namaPanggilan?.trim() || params.namaLengkap.trim().split(' ')[0],
      peran: params.peran,
      tenantId: DEMO_TENANT.id,
      sekolahNama: params.sekolahNama?.trim() || DEMO_TENANT.namaSekolah,
      telepon: params.telepon?.trim(),
      token: `jwt_token_${Date.now()}`,
    };

    useAuthStore.getState().login(user, DEMO_TENANT);
    return user;
  },

  /**
   * Registrasi Guru Mandiri (B2C)
   */
  async registerGuruMandiri(nama: string, email: string): Promise<UserAuthProfile> {
    const user: UserAuthProfile = {
      id: `usr_${Date.now()}`,
      email,
      namaLengkap: nama,
      namaPanggilan: nama.split(' ')[0],
      peran: 'guru',
      token: `jwt_token_${Date.now()}`,
    };

    useAuthStore.getState().login(user);
    return user;
  },

  /**
   * Keluar dari akun cloud (kembali ke penyimpanan lokal HP sepenuhnya)
   */
  async logout(): Promise<void> {
    useAuthStore.getState().logout();
  },
};
