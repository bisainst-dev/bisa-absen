import { create } from 'zustand';
import { profilRepo } from '../features/profil/repository';
import type { ProfilData } from '../features/profil/schema';

interface ProfilState {
  profil: ProfilData | null;
  loading: boolean;
  hasLoaded: boolean;
  loadProfil: () => Promise<ProfilData>;
  saveProfil: (data: Partial<ProfilData>) => Promise<ProfilData>;
  resetProfil: () => Promise<void>;
}

export const useProfilStore = create<ProfilState>((set) => ({
  profil: null,
  loading: true,
  hasLoaded: false,

  loadProfil: async () => {
    set({ loading: true });
    try {
      const data = await profilRepo.getProfil();
      set({ profil: data, loading: false, hasLoaded: true });
      return data;
    } catch (err) {
      console.error('Error loading profil:', err);
      set({ loading: false, hasLoaded: true });
      throw err;
    }
  },

  saveProfil: async (data: Partial<ProfilData>) => {
    try {
      const updated = await profilRepo.saveProfil(data);
      set({ profil: updated });
      return updated;
    } catch (err) {
      console.error('Error saving profil:', err);
      throw err;
    }
  },

  resetProfil: async () => {
    try {
      await profilRepo.resetProfil();
      set({ profil: null, hasLoaded: false });
    } catch (err) {
      console.error('Error resetting profil:', err);
      throw err;
    }
  },
}));
