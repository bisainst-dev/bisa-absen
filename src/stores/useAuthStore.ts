import { create } from 'zustand';
import type { UserAuthProfile, TenantProfile, UserRole } from '../types/saas';

interface AuthState {
  user: UserAuthProfile | null;
  tenant: TenantProfile | null;
  impersonator: UserAuthProfile | null;
  isAuthenticated: boolean;
  isCloudConnected: boolean;
  login: (user: UserAuthProfile, tenant?: TenantProfile) => void;
  logout: () => void;
  updateUser: (data: Partial<UserAuthProfile>) => void;
  switchRole: (peran: UserRole) => void;
  impersonateUser: (targetUser: UserAuthProfile) => void;
  stopImpersonating: () => void;
}

const STORAGE_KEY = 'bisa_absen_saas_auth';
const IMPERSONATOR_KEY = 'bisa_absen_saas_impersonator';

function loadInitialState(): {
  user: UserAuthProfile | null;
  tenant: TenantProfile | null;
  impersonator: UserAuthProfile | null;
} {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { user: null, tenant: null, impersonator: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawImpersonator = localStorage.getItem(IMPERSONATOR_KEY);
    const parsed = raw ? JSON.parse(raw) : { user: null, tenant: null };
    const impersonator = rawImpersonator ? JSON.parse(rawImpersonator) : null;
    return {
      user: parsed.user || null,
      tenant: parsed.tenant || null,
      impersonator,
    };
  } catch (e) {
    console.error('Gagal membaca sesi auth lokal:', e);
  }
  return { user: null, tenant: null, impersonator: null };
}

const initial = loadInitialState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  tenant: initial.tenant,
  impersonator: initial.impersonator,
  isAuthenticated: !!initial.user,
  isCloudConnected: !!initial.user,

  login: (user, tenant) => {
    const newState = {
      user,
      tenant: tenant || null,
      isAuthenticated: true,
      isCloudConnected: true,
    };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, tenant }));
      } catch (e) {
        console.error(e);
      }
    }
    set(newState);
  },

  logout: () => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMPERSONATOR_KEY);
      } catch (e) {
        console.error(e);
      }
    }
    set({
      user: null,
      tenant: null,
      impersonator: null,
      isAuthenticated: false,
      isCloudConnected: false,
    });
  },

  updateUser: (data) => {
    const curUser = get().user;
    if (!curUser) return;
    const updated = { ...curUser, ...data };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: updated, tenant: get().tenant })
        );
      } catch (e) {
        console.error(e);
      }
    }
    set({ user: updated });
  },

  switchRole: (peran) => {
    const curUser = get().user;
    if (!curUser) return;
    const updated = { ...curUser, peran };
    get().login(updated, get().tenant || undefined);
  },

  impersonateUser: (targetUser) => {
    const currentAdmin = get().impersonator || get().user;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(IMPERSONATOR_KEY, JSON.stringify(currentAdmin));
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: targetUser, tenant: get().tenant })
        );
      } catch (e) {
        console.error(e);
      }
    }
    set({
      user: targetUser,
      impersonator: currentAdmin,
      isAuthenticated: true,
    });
  },

  stopImpersonating: () => {
    const admin = get().impersonator;
    if (!admin) return;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(IMPERSONATOR_KEY);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: admin, tenant: get().tenant })
        );
      } catch (e) {
        console.error(e);
      }
    }
    set({
      user: admin,
      impersonator: null,
      isAuthenticated: true,
    });
  },
}));

