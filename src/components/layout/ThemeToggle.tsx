import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { tema, setTema, effectiveTheme } = useThemeStore();

  const cycleTheme = () => {
    if (tema === 'system') setTema('light');
    else if (tema === 'light') setTema('dark');
    else setTema('system');
  };

  const getLabel = () => {
    if (tema === 'system') return 'Sistem';
    if (tema === 'dark') return 'Gelap';
    return 'Terang';
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        className="touch-target p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title={`Tema saat ini: ${getLabel()} (Klik untuk ganti)`}
        aria-label={`Tema: ${getLabel()}`}
      >
        {effectiveTheme === 'dark' ? (
          <Moon className="w-5 h-5 text-teal-400" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500" />
        )}
      </button>
    );
  }

  const options: { mode: 'light' | 'dark' | 'system'; label: string }[] = [
    { mode: 'light', label: 'Terang' },
    { mode: 'dark', label: 'Gelap' },
    { mode: 'system', label: 'Sistem' },
  ];

  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
      {options.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          onClick={() => setTema(opt.mode)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            tema === opt.mode
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-pressed={tema === opt.mode}
        >
          {opt.mode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {opt.mode === 'dark' && <Moon className="w-3.5 h-3.5 text-teal-400" />}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};
