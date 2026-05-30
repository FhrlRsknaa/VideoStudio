import { Video, Music, Sparkles, Download, MessageCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'downloader' | 'compress';
  setActiveTab: (tab: 'downloader' | 'compress') => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <header className="w-full bg-white border-b border-[#dee1e5] sticky top-0 z-50 px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0b57d0] rounded-xl flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0b57d0] tracking-tight flex items-center gap-1.5">
              VideoStudio
            </h1>
            <p className="text-xs text-[#747775] font-semibold">( UJI PENGEMBANGAN )</p>
          </div>
        </div>

        {/* Material You Style Segmented Control Tab */}
        <nav className="flex bg-[#f0f4f9] p-1.5 rounded-full border border-[#dee1e5]">
          <button
            id="tab-downloader"
            onClick={() => setActiveTab('downloader')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'downloader'
                ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-100'
                : 'text-[#444746] hover:text-[#0b57d0] hover:bg-[#d3e3fd]/40'
            }`}
          >
            <Download className="w-4 h-4" />
            Tiktok Downloader
          </button>

          <button
            id="tab-compress"
            onClick={() => setActiveTab('compress')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'compress'
                ? 'bg-[#0c592a] text-white shadow-md shadow-emerald-100'
                : 'text-[#444746] hover:text-[#0b57d0] hover:bg-[#d3e3fd]/40'
            }`}
          >
            <div className="relative flex items-center justify-center w-5 h-5 mr-0.5">
              <Video className="w-4 h-4" />
              <MessageCircle className="w-3 h-3 absolute -top-1 -right-1 text-emerald-500 fill-emerald-500 stroke-white stroke-[2px]" />
            </div>
            WhatsApp HD
          </button>
        </nav>
      </div>
    </header>
  );
}
