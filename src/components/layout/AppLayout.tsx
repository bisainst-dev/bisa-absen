import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <AppHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
