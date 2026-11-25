import { create } from 'zustand';
import { pengaturanRepo } from '../features/pengaturan/repository';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  tema: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTema: (tema: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyThemeToDocument(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  tema: 'system',
  effectiveTheme: 'light',

  initTheme: async () => {
    try {
      const pengaturan = await pengaturanRepo.getPengaturan();
      const tema = pengaturan.tema || 'system';
      const effectiveTheme = tema === 'system' ? getSystemTheme() : tema;
      applyThemeToDocument(effectiveTheme);
      set({ tema, effectiveTheme });

      // Listen for system changes if mode is 'system'
      if (typeof window !== 'undefined' && window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (get().tema === 'system') {
            const newEff = e.matches ? 'dark' : 'light';
            applyThemeToDocument(newEff);
            set({ effectiveTheme: newEff });
          }
        });
      }
    } catch (e) {
      console.error('Failed to init theme:', e);
    }
  },

  setTema: async (tema: ThemeMode) => {
    const effectiveTheme = tema === 'system' ? getSystemTheme() : tema;
    applyThemeToDocument(effectiveTheme);
    set({ tema, effectiveTheme });
    try {
      await pengaturanRepo.savePengaturan({ tema });
    } catch (e) {
      console.error('Failed to save theme setting:', e);
    }
  },
}));
