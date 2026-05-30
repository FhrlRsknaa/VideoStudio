/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Header from './components/Header';
import Compressor from './components/Compressor';
import Downloader from './components/Downloader';
import { Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'downloader' | 'compress'>('downloader');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-800">
      {/* Header with Segmented Tab Control */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Dynamic Section rendering with gorgeous fluid entry */}
        {activeTab === 'downloader' ? (
          <div>
            {/* Visual Intro banner for Downloader section */}
            <div className="w-full bg-white border-b border-blue-50/30 py-8 px-4 text-center">
              <div className="max-w-2xl mx-auto space-y-2">
                <span className="px-3 py-1 bg-blue-50 text-[11px] font-bold text-blue-700 rounded-full tracking-wider uppercase">
                  TikTok Downloader HD
                </span>
                <h2 className="text-2xl font-extrabold text-[#1f1f1f] tracking-tight sm:text-3xl uppercase">
                  TIKTOK VIDEO DOWNLOADER
                </h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
                  Download video TikTok tanpa watermark secara instan dengan kualitas HD langsung ke galeri gawai Anda.
                </p>
              </div>
            </div>
            
            <Downloader />
          </div>
        ) : (
          <div>
            {/* Visual Intro banner for Compressor section */}
            <div className="w-full bg-white border-b border-blue-50/30 py-8 px-4 text-center">
              <div className="max-w-2xl mx-auto space-y-2">
                <span className="px-3 py-1 bg-blue-50 text-[11px] font-bold text-blue-700 rounded-full tracking-wider uppercase">
                  Optimal 720p 30fps
                </span>
                <h2 className="text-2xl font-extrabold text-[#1f1f1f] tracking-tight sm:text-3xl">
                  BUAT VIDEO KAMU MENJADI HD DI WHATSAAP
                </h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
                  Perkecil ukuran file video Anda menjadi standard resolusi optimal 720p pada frame rate 30 FPS tanpa mengurangi kestabilan sinyal audio asli.
                </p>
              </div>
            </div>

            <Compressor />
          </div>
        )}
      </main>

      {/* Styled Google Material You inspired footer */}
      <footer className="bg-white border-t border-slate-100 py-6 px-4 flex flex-col gap-4 items-center">
        <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0b57d0]" />
            <span>web ini dalam pengembangan jadi maklumin ya kalo masih bug/gagal.</span>
          </div>
          <div>
            <span>© 2026 Video Studio By Fahrul</span>
          </div>
        </div>

        {/* Developer Info Badge with clean rounded border */}
        <div className="border border-[#dee1e5] rounded-full px-5 py-1.5 text-xs text-[#0b57d0] font-semibold bg-[#f0f4f9] hover:bg-[#d3e3fd]/40 transition-colors">
          Developer By Fahrul
        </div>
      </footer>
    </div>
  );
}
