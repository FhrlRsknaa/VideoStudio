import { Video, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function Header({ theme, setTheme }: HeaderProps) {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-[#dee1e5] dark:border-slate-800/80 sticky top-0 z-50 px-6 py-4 transition-colors duration-500">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-[#0b57d0] dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors duration-500">
            <Video className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#0b57d0] dark:text-blue-400 tracking-tight flex items-center gap-1.5 transition-colors duration-500">
                VideoDownloader
              </h1>
              <p className="text-xs text-[#747775] dark:text-slate-400 font-semibold transition-colors duration-500">( UJI PENGEMBANGAN )</p>
            </div>

            {/* Smooth Large Micro-Animated Sliding Toggle for PUTIH / GELAP */}
            <div className="relative flex items-center bg-[#f0f4f9] dark:bg-slate-800 p-1 rounded-full border border-[#dee1e5] dark:border-slate-700/80 transition-all duration-500 select-none shadow-inner h-10 w-44">
              {/* Sliding Background Indicator Pill */}
              <div
                className="absolute top-1 bottom-1 w-[84px] rounded-full bg-white dark:bg-slate-900 shadow border border-slate-200/50 dark:border-slate-800 transition-all duration-500 ease-out"
                style={{
                  transform: theme === 'dark' ? 'translateX(84px)' : 'translateX(0px)',
                }}
              />
              
              {/* Putih Button */}
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  localStorage.setItem('theme', 'light');
                }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full rounded-full transition-colors duration-300 focus:outline-none cursor-pointer text-xs ${
                  theme === 'light'
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Sun className={`w-3.5 h-3.5 transition-transform duration-500 ${theme === 'light' ? 'rotate-12 scale-110' : 'scale-90'}`} />
                <span>Putih</span>
              </button>

              {/* Gelap Button */}
              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  localStorage.setItem('theme', 'dark');
                }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full rounded-full transition-colors duration-300 focus:outline-none cursor-pointer text-xs ${
                  theme === 'dark'
                    ? 'text-indigo-600 dark:text-blue-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Moon className={`w-3.5 h-3.5 transition-transform duration-500 ${theme === 'dark' ? '-rotate-12 scale-110' : 'scale-90'}`} />
                <span>Gelap</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
