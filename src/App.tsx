/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Downloader from './components/Downloader';
import { Info, MessageCircle } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-800 transition-colors duration-500">
      {/* Header */}
      <Header theme={theme} setTheme={setTheme} />

      {/* Main Content Area */}
      <main className="flex-grow">
        <div>
          {/* Visual Intro banner for Downloader section */}
          <div className="w-full bg-white dark:bg-slate-900 border-b border-blue-50/10 dark:border-slate-800/60 py-8 px-4 text-center transition-colors duration-500">
            <div className="max-w-2xl mx-auto space-y-2">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-[11px] font-bold text-blue-700 dark:text-blue-300 rounded-full tracking-wider uppercase transition-colors duration-500">
                Video Downloader HD
              </span>
              <h2 className="text-2xl font-extrabold text-[#1f1f1f] dark:text-slate-100 tracking-tight sm:text-3xl uppercase transition-colors duration-500">
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

      {/* Styled Google Material You inspired footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 py-6 px-4 flex flex-col gap-4 items-center transition-colors duration-500">
        <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-slate-400 font-medium transition-colors duration-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0b57d0] dark:text-blue-400" />
            <span>web ini dalam pengembangan jadi maklumin ya kalo masih bug/gagal.</span>
          </div>
          <div>
            <span>© 2026 Video Downloader By Fhrl</span>
          </div>
        </div>

        {/* Developer Info Badge with clean rounded border and WhatsApp redirect */}
        <a 
          href="https://wa.me/6285186814906"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 border border-emerald-400 dark:border-emerald-600 rounded-full px-5 py-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 transition-all duration-300 shadow-sm hover:shadow active:scale-95 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm">
            <MessageCircle className="w-3.5 h-3.5 text-white fill-white stroke-[#25D366] stroke-[0.5px]" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[9px] text-[#128C7E] dark:text-[#25D366] font-bold uppercase tracking-wider group-hover:text-emerald-700">Ada saran? Call Me</span>
            <span className="text-emerald-900 dark:text-emerald-100 font-extrabold text-[11px] group-hover:text-emerald-950">Developer By Fahrul</span>
          </div>
        </a>
      </footer>
    </div>
  );
}
