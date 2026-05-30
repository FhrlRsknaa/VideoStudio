import { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Link as LinkIcon, 
  Globe, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Pause, 
  Video, 
  Music, 
  Info, 
  CheckCircle2, 
  Youtube, 
  Instagram, 
  Twitter, 
  FileDown, 
  X, 
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MockVideoMetadata {
  title: string;
  creator: string;
  duration: number;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'direct';
  thumbnailUrl: string;
  videoUrl: string;
  musicUrl?: string;
  sizeMB: {
    '1080p'?: number;
    '720p': number;
    '480p'?: number;
    'mp3': number;
  };
}

export default function Downloader() {
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Selected video and resolution states
  const [videoMetadata, setVideoMetadata] = useState<MockVideoMetadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p' | '480p' | 'mp3'>('720p');
  
  // Processing states
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStep, setDownloadStep] = useState('');
  const [downloadFinished, setDownloadFinished] = useState(false);

  // Player controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load a video URL analyzer calling our Express backend api
  const handleAnalyze = async (targetUrl: string = urlInput) => {
    if (!targetUrl.trim()) {
      setErrorMsg('Harap masukkan link video terlebih dahulu.');
      return;
    }

    if (!targetUrl.toLowerCase().startsWith('http://') && !targetUrl.toLowerCase().startsWith('https://')) {
      setErrorMsg('Harap masukkan link URL video yang valid (dimulai dengan http:// atau https://).');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setVideoMetadata(null);
    setDownloadFinished(false);

    try {
      const response = await fetch('/api/run-actor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: targetUrl }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Gagal menganalisis video (Status ${response.status})`);
      }

      const resData = await response.json();
      
      if (resData.success) {
        setVideoMetadata({
          title: resData.title || 'Video',
          creator: resData.author || 'Creator',
          duration: resData.duration || 15,
          platform: (resData.source as any) || 'direct',
          thumbnailUrl: resData.thumbnail || '',
          videoUrl: resData.video || '',
          musicUrl: resData.music || '',
          sizeMB: {
            '720p': 14.8,
            'mp3': 1.6
          }
        });
        
        setSelectedQuality('720p');
      } else {
        throw new Error(resData.error || 'Gagal memperoleh data video dari server.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan tidak terduga saat menghubungi server media.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
      handleAnalyze(text);
    } catch (err) {
      // Clipboard fallback if permissions blocked in preview iframe
      setErrorMsg('Sistem clipboard browser diblokir. Harap tempelkan URL secara manual.');
    }
  };

  const triggerDownloadProgress = async () => {
    if (!videoMetadata) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadFinished(false);
    setDownloadStep('Menghubungkan ke server media asli...');

    const fileExt = selectedQuality === 'mp3' ? 'mp3' : 'mp4';
    const cleanTitle = videoMetadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `video_downloader_${cleanTitle}.${fileExt}`;

    const targetUrl = selectedQuality === 'mp3' && videoMetadata.musicUrl ? videoMetadata.musicUrl : videoMetadata.videoUrl;

    if (!targetUrl) {
      setIsDownloading(false);
      setErrorMsg('Format video tidak tersedia.');
      return;
    }

    try {
      // Direct stream download tracker
      const response = await fetch(targetUrl, {
        referrerPolicy: 'no-referrer'
      });

      if (!response.ok) {
        throw new Error(`Koneksi langsung ditolak (Status ${response.status})`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body || totalBytes === 0) {
        // Instant non-simulated down flow
        setDownloadProgress(100);
        setDownloadStep('Mengunduh instan...');
        const blob = await response.blob();
        triggerBlobDownload(blob, filename);
        return;
      }

      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const percent = Math.min(Math.round((receivedBytes / totalBytes) * 100), 100);
        setDownloadProgress(percent);
        setDownloadStep(`Mengunduh file: ${percent}% (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`);
      }

      const finalBlob = new Blob(chunks, { type: selectedQuality === 'mp3' ? 'audio/mp3' : 'video/mp4' });
      triggerBlobDownload(finalBlob, filename);

    } catch (err) {
      console.warn('Real content streaming blocked due to CORS background locks. Using standard browser helper window.', err);
      // Perfect bulletproof fall back path that triggers immediately without simulation
      setDownloadProgress(100);
      setDownloadStep('Menyelesaikan kaitan file media...');
      
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.referrerPolicy = 'no-referrer';
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDownloading(false);
      setDownloadFinished(true);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    setIsDownloading(false);
    setDownloadFinished(true);
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatVideoLength = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-600" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'tiktok':
        return (
          <span className="font-extrabold text-black dark:text-white text-xs bg-slate-100 px-1.5 py-0.5 rounded border">
            TikTok
          </span>
        );
      case 'twitter':
        return <Twitter className="w-5 h-5 text-blue-400" />;
      default:
        return <Globe className="w-5 h-5 text-[#0b57d0]" />;
    }
  };

  return (
    <div id="downloader-container" className="w-full max-w-4xl mx-auto py-8 px-4 space-y-8">
      
      {/* Search Input Box */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-sm border border-[#e0e3e7] dark:border-slate-800 space-y-6 transition-colors duration-500">
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#1f1f1f] dark:text-slate-200 flex items-center gap-2 animate-colors duration-500">
            <LinkIcon className="w-4 h-4 text-[#0b57d0] dark:text-blue-400" />
            Tempel Link URL Video Disini
          </label>
          <div className="relative flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <input
                id="downloader-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Masukkan link video/media publik..."
                className="w-full pl-11 pr-24 py-4 bg-[#f8f9fa] dark:bg-slate-850 border border-[#c2c7cf] dark:border-slate-700 hover:border-[#0b57d0] dark:hover:border-blue-500 focus:border-[#0b57d0] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0b57d0] rounded-2xl text-sm font-medium text-[#1f1f1f] dark:text-slate-150 placeholder:text-[#747775] dark:placeholder:text-slate-400 transition-all outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#747775]" />
              
              <button
                id="btn-downloader-paste"
                onClick={handlePaste}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#d3e3fd] dark:bg-slate-800 hover:bg-[#b4d1f9] dark:hover:bg-slate-755 text-[#0b57d0] dark:text-blue-400 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Tempel dari Clipboard"
              >
                Tempel Link
              </button>
            </div>
            
            <button
              id="btn-downloader-analyze"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || !urlInput}
              className="px-8 py-4 bg-[#0b57d0] hover:bg-[#0842a0] disabled:bg-slate-200 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              {isAnalyzing ? 'Menganalisis...' : 'Analisis File'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm p-4 rounded-2xl flex items-center gap-2.5 border border-red-100 dark:border-red-900/30 transition-colors duration-550">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#d3e3fd] dark:border-blue-900/40 border-t-[#0b57d0] dark:border-t-blue-450 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-[#1f1f1f] dark:text-slate-200 transition-colors">Menghubungkan ke server media...</p>
            <p className="text-xs text-[#747775] dark:text-slate-400 mt-1 transition-colors">Mengekstrak informasi tag, video, dan link kualitas.</p>
          </div>
        </div>
      )}

      {/* Result Panel & Mini Player */}
      <AnimatePresence mode="wait">
        {videoMetadata && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Left Column: Mini Video Preview Player */}
            <div className="bg-[#1f1f1f] rounded-[32px] p-4 flex flex-col justify-between relative overflow-hidden aspect-video border border-[#dee1e5]">
              
              {/* Media Element Player */}
              <video
                id="downloader-mini-preview-video"
                ref={videoRef}
                src={videoMetadata.videoUrl}
                playsInline
                loop
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2xl shadow-xl"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Float Watermark Indicator */}
              <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-md text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow flex items-center gap-1.5 border border-white/10">
                {getPlatformIcon(videoMetadata.platform)}
                <span>Mini Preview</span>
              </div>

              {/* Float Controls Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white">
                <button
                  id="btn-downloader-play"
                  onClick={toggleVideoPlayback}
                  className="w-9 h-9 rounded-full bg-[#0b57d0] text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-white/75 font-semibold uppercase tracking-wider">Durasi</p>
                  <p className="font-mono text-sm font-bold">{formatVideoLength(videoMetadata.duration)}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Download Configuration Options */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 border border-[#e0e3e7] dark:border-slate-800 flex flex-col justify-between transition-colors duration-500">
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-[#d3e3fd] dark:bg-blue-950/40 text-[#0b57d0] dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold transition-colors">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#1f1f1f] dark:text-slate-100 line-clamp-2 leading-snug transition-colors">
                      {videoMetadata.title}
                    </h4>
                    <p className="text-xs text-[#747775] dark:text-slate-400 font-semibold mt-1 transition-colors">
                      Kreator: <strong className="text-[#1f1f1f] dark:text-slate-200 font-bold">{videoMetadata.creator}</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#f0f4f9] dark:border-slate-800 space-y-3 transition-colors">
                  <span className="text-xs font-bold text-[#747775] dark:text-slate-450 block uppercase tracking-wider transition-colors">
                    Pilih Format & Kualitas Download:
                  </span>
                  
                  <div className="space-y-2">
                    {(Object.keys(videoMetadata.sizeMB) as Array<keyof typeof videoMetadata.sizeMB>).map((quality) => {
                      const size = videoMetadata.sizeMB[quality];
                      if (size === undefined) return null;

                      const isSelected = selectedQuality === quality;
                      const isMp3 = quality === 'mp3';
                      const qualityStr = String(quality);

                      return (
                        <button
                          key={qualityStr}
                          id={`downloader-quality-${qualityStr}`}
                          onClick={() => setSelectedQuality(quality as any)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#f0f4f9] dark:bg-slate-800 border-[#0b57d0] dark:border-blue-500 text-[#0b57d0] dark:text-blue-400 font-bold' 
                              : 'bg-white dark:bg-slate-900 border-[#dee1e5] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800/40 text-[#444746] dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#0b57d0] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#444746] dark:text-slate-450'}`}>
                              {isMp3 ? <Music className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                            </div>
                            <div className="text-left">
                              <p className={`text-sm font-bold uppercase tracking-tight ${isSelected ? 'text-[#0b57d0] dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {isMp3 ? 'Audio MP3' : 'Format MP4 Video'}
                              </p>
                              <p className="text-[10px] text-[#747775] dark:text-slate-400 font-medium">
                                {isMp3 ? 'Mengekstrak file suara saja • Kompresi Tinggi' : '720p Resolusi Normal'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2.5 py-1.5 rounded-full font-bold ${
                              isSelected ? 'bg-[#0b57d0] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#1f1f1f] dark:text-slate-200'
                            }`}>
                              ~ {size.toFixed(1)} MB
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Start Download button section */}
              <div className="pt-6 border-t border-[#f0f4f9] dark:border-slate-800 space-y-4 transition-colors">
                
                {/* Downloading State */}
                {isDownloading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#444746] font-bold">
                      <span>{downloadStep}</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#e1e3e1] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#0b57d0] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Finished Success Message */}
                {downloadFinished && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-850 rounded-2xl flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0" />
                    <span>File Berhasil Diunduh! Silahkan periksa bilah download komputer/HP Anda.</span>
                  </div>
                )}

                {/* Main Trigger Button */}
                {!isDownloading && (
                  <button
                    id="btn-downloader-start"
                    onClick={triggerDownloadProgress}
                    className="w-full py-4 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-bold text-sm shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>Mulai Download ({selectedQuality === 'mp3' ? 'MP3 Audio' : 'MP4 720p'})</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
