import { Video, Music, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'compress' | 'editor';
  setActiveTab: (tab: 'compress' | 'editor') => void;
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
            <h1 className="text-xl font-bold text-[#0b57d0] tracking-tight">
              VideoStudio
            </h1>
            <p className="text-xs text-[#747775] font-semibold">Compressor & Audio Overlap</p>
          </div>
        </div>

        {/* Material You Style Segmented Control Tab */}
        <nav className="flex bg-[#f0f4f9] p-1.5 rounded-full border border-[#dee1e5]">
          <button
            id="tab-compress"
            onClick={() => setActiveTab('compress')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'compress'
                ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-100'
                : 'text-[#444746] hover:text-[#0b57d0] hover:bg-[#d3e3fd]/40'
            }`}
          >
            <Video className="w-4 h-4" />
            Kompres Video
          </button>
          
          <button
            id="tab-editor"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'editor'
                ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-100'
                : 'text-[#444746] hover:text-[#0b57d0] hover:bg-[#d3e3fd]/40'
            }`}
          >
            <Music className="w-4 h-4" />
            Editor Musik Video
          </button>
        </nav>
      </div>
    </header>
  );
}
