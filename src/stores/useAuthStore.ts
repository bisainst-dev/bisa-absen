import { create } from 'zustand';
import type { UserAuthProfile, TenantProfile, UserRole } from '../types/saas';

interface AuthState {
  user: UserAuthProfile | null;
  tenant: TenantProfile | null;
  isAuthenticated: boolean;
  isCloudConnected: boolean;
  login: (user: UserAuthProfile, tenant?: TenantProfile) => void;
  logout: () => void;
  updateUser: (data: Partial<UserAuthProfile>) => void;
  switchRole: (peran: UserRole) => void;
}

const STORAGE_KEY = 'bisa_absen_saas_auth';

function loadInitialState(): { user: UserAuthProfile | null; tenant: TenantProfile | null } {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { user: null, tenant: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Gagal membaca sesi auth lokal:', e);
  }
  return { user: null, tenant: null };
}

const initial = loadInitialState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  tenant: initial.tenant,
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
      } catch (e) {
        console.error(e);
      }
    }
    set({
      user: null,
      tenant: null,
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
}));
