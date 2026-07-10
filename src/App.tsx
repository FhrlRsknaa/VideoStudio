/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Downloader from './components/Downloader';
import { Info, MessageCircle, Smartphone, X, Check, Github } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [theme]);

  // Register Service Worker and listen to installation prompts
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('ServiceWorker registered with scope: ', reg.scope))
          .catch(err => console.error('ServiceWorker registration failed: ', err));
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if launched in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA user choice outcome: ${outcome}`);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // If the prompt event is not fired (e.g. on iOS, unsupported browser, or inside preview iframe)
      // open our beautiful custom instructions modal.
      setShowPwaModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-800 transition-colors duration-500">
      {/* Header */}
      <Header theme={theme} setTheme={setTheme} />

      {/* Main Content Area */}
      <main className="flex-grow">
        <div>
          {/* Visual Intro banner for Downloader section */}
          <div className="w-full bg-white dark:bg-slate-900 border-b border-blue-50/10 dark:border-slate-800/60 py-8 px-4 text-center transition-colors duration-500">
            <div className="max-w-2xl mx-auto space-y-3 flex flex-col items-center">
              
              {/* PWA Install Button instead of static badge */}
              {isInstalled ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 rounded-full tracking-wider uppercase transition-colors duration-500 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terinstal di Perangkat
                </div>
              ) : (
                <button
                  id="pwa-install-btn"
                  onClick={handleInstallPwa}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-[11px] font-bold text-blue-700 dark:text-blue-300 rounded-full tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm border border-blue-100 dark:border-blue-900/50"
                  title="Pasang aplikasi ini di layar utama gawai Anda"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Tambahkan ke Home Screen
                </button>
              )}

              <h2 className="text-2xl font-extrabold text-[#1f1f1f] dark:text-slate-100 tracking-tight sm:text-3xl uppercase transition-colors duration-500 mt-1">
                VIDEO DOWNLOADER
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed transition-colors duration-500">
                Download video tiktok,instagram,fesnuk,twitter disini
              </p>
            </div>
          </div>
          
          <Downloader />
        </div>
      </main>

      {/* Beautiful Modal for PWA Installation Instructions */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#0b57d0] dark:text-blue-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100">Instal Aplikasi</h3>
              </div>
              <button 
                onClick={() => setShowPwaModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm text-slate-600 dark:text-slate-300 overflow-y-auto flex-grow pr-1">
              <p className="leading-relaxed">
                Anda dapat menambahkan **VideoDownloader** langsung ke layar utama (home screen) perangkat Anda agar dapat diakses instan layaknya aplikasi native.
              </p>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
                <div className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Petunjuk Manual Sesuai Browser:
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Android (Chrome/Edge)</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klik ikon <span className="font-semibold">titik tiga</span> di kanan atas browser, lalu pilih <span className="font-semibold text-blue-600 dark:text-blue-400">"Instal aplikasi"</span> atau <span className="font-semibold text-blue-600 dark:text-blue-400">"Tambahkan ke Layar utama"</span>.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">iOS / iPhone (Safari)</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klik tombol <span className="font-semibold">Bagikan (Share / ikon panah ke atas)</span> di bagian bawah, scroll ke bawah lalu pilih <span className="font-semibold text-blue-600 dark:text-blue-400">"Tambahkan ke Layar Utama"</span>.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Laptop / PC (Chrome/Edge)</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klik tombol <span className="font-semibold text-blue-600 dark:text-blue-400">Instal</span> (ikon monitor dengan panah ke bawah) di bagian kanan kolom alamat URL browser Anda.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end flex-shrink-0">
              <button 
                onClick={() => setShowPwaModal(false)}
                className="px-5 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Google Material You inspired footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 py-6 px-4 flex flex-col gap-4 items-center transition-colors duration-500">
        <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-slate-400 font-medium transition-colors duration-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0b57d0] dark:text-blue-400" />
            <span>web downloader video ini gratis tanpa iklan :) </span>
          </div>
          <div>
            <span>© 2026 Video Downloader</span>
          </div>
        </div>

        {/* Developer Info Badge with clean rounded border and GitHub redirect */}
        <a 
          href="https://github.com/FhrlRsknaa"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 border border-slate-300 dark:border-slate-700 rounded-full px-5 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm hover:shadow active:scale-95 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-sm">
            <Github className="w-3.5 h-3.5 text-white dark:text-slate-900" />
          </div>
          <span className="text-slate-950 dark:text-white font-extrabold text-xs leading-none">Developer By Fhrl</span>
        </a>
      </footer>
    </div>
  );
}
