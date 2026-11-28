import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { AppRoutes } from './AppRoutes';

const NativeIntegration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Sembunyikan Splash Screen setelah aplikasi siap
    SplashScreen.hide().catch(() => {});

    // Konfigurasi Status Bar
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0d9488' }).catch(() => {});

    // Penanganan tombol Back fisik Android
    let backListener: { remove: () => void } | null = null;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/portal') {
        CapApp.exitApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        CapApp.exitApp();
      }
    }).then((handle) => {
      backListener = handle;
    });

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [navigate, location]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NativeIntegration />
      <AppRoutes />
    </BrowserRouter>
  );
};

