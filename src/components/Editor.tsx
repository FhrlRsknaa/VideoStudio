import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Upload, Video, Music, Download, CheckCircle2, AlertTriangle, RefreshCw, Sliders, Volume2, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoMetadata } from '../types';

export default function Editor() {
  // Video A (Target Video)
  const [videoAFile, setVideoAFile] = useState<File | null>(null);
  const [videoAUrl, setVideoAUrl] = useState<string | null>(null);
  const [metadataA, setMetadataA] = useState<VideoMetadata | null>(null);

  // Video B (Source of audio)
  const [videoBFile, setVideoBFile] = useState<File | null>(null);
  const [videoBUrl, setVideoBUrl] = useState<string | null>(null);
  const [metadataB, setMetadataB] = useState<VideoMetadata | null>(null);

  // Mixer/Editor controls
  const [volumeA, setVolumeA] = useState<number>(0.2); // Original volume (20% default)
  const [volumeB, setVolumeB] = useState<number>(0.8); // Extracted music volume (80% default)
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [editedBlobUrl, setEditedBlobUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // HTML references
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean-up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (videoAUrl) URL.revokeObjectURL(videoAUrl);
      if (videoBUrl) URL.revokeObjectURL(videoBUrl);
      if (editedBlobUrl) URL.revokeObjectURL(editedBlobUrl);
    };
  }, [videoAUrl, videoBUrl, editedBlobUrl]);

  const handleVideoAChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideoA(file);
  };

  const handleVideoBChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideoB(file);
  };

  const loadVideoA = (file: File) => {
    setEditedBlobUrl(null);
    setProgress(0);
    setErrorText(null);

    const url = URL.createObjectURL(file);
    setVideoAUrl(url);
    setVideoAFile(file);

    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setMetadataA({
        name: file.name,
        size: file.size,
        type: file.type,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
      });
    };
    tempVideo.onerror = () => {
      setErrorText('Gagal memuat metadata Video A. Codec mungkin tidak didukung.');
    };
  };

  const loadVideoB = (file: File) => {
    setEditedBlobUrl(null);
    setProgress(0);
    setErrorText(null);

    const url = URL.createObjectURL(file);
    setVideoBUrl(url);
    setVideoBFile(file);

    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setMetadataB({
        name: file.name,
        size: file.size,
        type: file.type,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
      });
    };
    tempVideo.onerror = () => {
      setErrorText('Gagal memuat metadata Video B. Codec mungkin tidak didukung.');
    };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start the Audio Extraction and Mixing engine
  const startMixing = async () => {
    if (!videoAUrl || !videoBUrl || !metadataA || !metadataB) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Menyiapkan editor & ekstraktor audio...');
      setErrorText(null);

      // Set target output dimensions (Using Video A dimensions to keep quality or compress to optimal resolution)
      const isPortrait = metadataA.height > metadataA.width;
      const ratio = metadataA.width / metadataA.height;
      
      // Let's output at up to 720p 30fps to make it very fast and responsive
      let targetWidth = 1280;
      let targetHeight = 720;

      if (isPortrait) {
        targetHeight = 1280;
        targetWidth = Math.round(1280 * ratio);
        if (targetWidth % 2 !== 0) targetWidth += 1;
      } else {
        targetWidth = 1280;
        targetHeight = Math.round(1280 / ratio);
        if (targetHeight % 2 !== 0) targetHeight += 1;
      }

      // Initialize renderer canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas element not found');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not retrieve canvas context');

      // Initialize the hidden video players
      const videoA = videoARef.current;
      const videoB = videoBRef.current;
      if (!videoA || !videoB) throw new Error('Video player references are missing');

      videoA.src = videoAUrl;
      videoB.src = videoBUrl;

      // Unmute/Mute configuration
      videoA.muted = true; // We always grab direct audio from sound nodes natively so keep players visually silent
      videoB.muted = true;

      videoA.currentTime = 0;
      videoB.currentTime = 0;

      // Sync playback rate
      videoA.playbackRate = 1.0;
      videoB.playbackRate = 1.0;

      // Ensure both are ready
      await Promise.all([
        new Promise<void>((resolve) => {
          const onCanPlay = () => {
            videoA.removeEventListener('canplay', onCanPlay);
            resolve();
          };
          videoA.addEventListener('canplay', onCanPlay);
        }),
        new Promise<void>((resolve) => {
          const onCanPlay = () => {
            videoB.removeEventListener('canplay', onCanPlay);
            resolve();
          };
          videoB.addEventListener('canplay', onCanPlay);
        })
      ]);

      // Create Web Audio Mixing node graphs
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      // Connect source elements to context
      const sourceA = audioCtx.createMediaElementSource(videoA);
      const sourceB = audioCtx.createMediaElementSource(videoB);

      // Create volume control nodes
      const gainA = audioCtx.createGain();
      const gainB = audioCtx.createGain();

      gainA.gain.value = volumeA;
      gainB.gain.value = volumeB;

      sourceA.connect(gainA);
      sourceB.connect(gainB);

      // Connect to a MediaStreamDestination to record
      const dest = audioCtx.createMediaStreamDestination();
      gainA.connect(dest);
      gainB.connect(dest);

      // Direct mix audio track
      const mixedAudioTrack = dest.stream.getAudioTracks()[0];

      // Capture original visual canvas
      const canvasStream = canvas.captureStream(30);
      const videoTrack = canvasStream.getVideoTracks()[0];

      // Assemble final output streams
      const outputTracks: MediaStreamTrack[] = [];
      if (videoTrack) outputTracks.push(videoTrack);
      if (mixedAudioTrack) outputTracks.push(mixedAudioTrack);

      const finalStream = new MediaStream(outputTracks);

      // Set up recorder options
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a')) {
        mimeType = 'video/mp4;codecs=avc1,mp4a';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      }

      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 1500000,
      });
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: chunks[0]?.type || 'video/mp4' });
        const finalUrl = URL.createObjectURL(finalBlob);
        setEditedBlobUrl(finalUrl);
        setIsProcessing(false);
        setStatusMessage('');
        setProgress(100);
      };

      // Playback renderer frames loop
      const drawFrame = () => {
        if (videoA.paused || videoA.ended) return;

        // Render target frames A onto canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(videoA, 0, 0, targetWidth, targetHeight);

        // Calculate progress
        const currentProgress = (videoA.currentTime / metadataA.duration) * 100;
        setProgress(Math.min(currentProgress, 99));
        setStatusMessage(`Sedang menggabungkan musik: ${Math.round(currentProgress)}% (${formatTime(videoA.currentTime)} / ${formatTime(metadataA.duration)})`);

        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };

      // Fire both playbacks and recording
      recorder.start();
      videoA.play();
      videoB.play();
      drawFrame();

      // Trigger completion on Video A finish
      videoA.onended = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        videoB.pause();
        if (recorder.state !== 'inactive') recorder.stop();
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      };

    } catch (err: any) {
      console.error(err);
      setErrorText(`Terjadi kesalahan penggabungan: ${err.message || 'Browser tidak mendukung format codec ini.'}`);
      setIsProcessing(false);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    }
  };

  const cancelMixing = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (videoARef.current) videoARef.current.pause();
    if (videoBRef.current) videoBRef.current.pause();
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
  };

  const resetAll = () => {
    cancelMixing();
    setVideoAFile(null);
    setVideoAUrl(null);
    setMetadataA(null);
    setVideoBFile(null);
    setVideoBUrl(null);
    setMetadataB(null);
    setEditedBlobUrl(null);
  };

  return (
    <div id="editor-section" className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Target and Source File Container Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* VIDEO A - Main Visual Video target */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] relative overflow-hidden flex flex-col justify-between min-h-[225px]">
          <div>
            <div className="flex gap-3 items-center mb-4">
              <div className="w-9 h-9 rounded-full bg-[#d3e3fd] text-[#0b57d0] flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1f1f]">Video Utama (Visual Target)</h3>
                <p className="text-[11px] text-[#444746]">Video tempat Anda ingin menambahkan/mengubah musik.</p>
              </div>
            </div>

            {!videoAFile ? (
              <div className="border border-dashed border-[#c2c7cf] hover:border-[#0b57d0] rounded-2xl p-6 text-center cursor-pointer bg-[#f8f9fa] hover:bg-[#eff4f9] transition-all relative">
                <input
                  id="target-video-selector"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoAChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 text-[#747775] mx-auto mb-2" />
                <span className="text-xs font-semibold text-[#0b57d0] block">Pilih Video Utama</span>
                <span className="text-[10px] text-[#747775] block mt-1">MP4, WebM, dll.</span>
              </div>
            ) : (
              <div className="bg-[#eff4f9] rounded-2xl p-4 border border-[#dee1e5] flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Video className="w-5 h-5 text-[#0b57d0]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#1f1f1f] line-clamp-1 max-w-[140px] sm:max-w-xs">{metadataA?.name}</h4>
                    <span className="text-[10px] text-[#444746] block mt-0.5 font-medium">
                      {metadataA ? `${formatTime(metadataA.duration)} • ${formatBytes(metadataA.size)}` : 'Memuat...'}
                    </span>
                  </div>
                </div>
                <button
                  id="btn-remove-video-a"
                  onClick={() => {
                    setVideoAFile(null);
                    setVideoAUrl(null);
                    setMetadataA(null);
                  }}
                  disabled={isProcessing}
                  className="text-[11px] font-bold text-[#0b57d0] hover:text-[#0842a0] hover:underline cursor-pointer"
                >
                  Ubah
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#747775] mt-4 font-medium">Seluruh visual, bentuk, dan resolusi dari Video A akan terus dipertahankan secara utuh.</p>
        </div>

        {/* REPLACING AUDIO FROM VIDEO B - Extraction Source */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] relative overflow-hidden flex flex-col justify-between min-h-[225px]">
          <div>
            <div className="flex gap-3 items-center mb-4">
              <div className="w-9 h-9 rounded-full bg-[#d3e3fd] text-[#0b57d0] flex items-center justify-center font-bold">
                B
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1f1f]">Video Soundscape (Ekstrak Audio B)</h3>
                <p className="text-[11px] text-[#444746]">Video sumber musik yang akan diekstrak audionya.</p>
              </div>
            </div>

            {!videoBFile ? (
              <div className="border border-dashed border-[#c2c7cf] hover:border-[#0b57d0] rounded-2xl p-6 text-center cursor-pointer bg-[#f8f9fa] hover:bg-[#eff4f9] transition-all relative">
                <input
                  id="source-audio-selector"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoBChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Music className="w-6 h-6 text-[#747775] mx-auto mb-2" />
                <span className="text-xs font-semibold text-[#0b57d0] block">Pilih Video Ekstrak Musik</span>
                <span className="text-[10px] text-[#747775] block mt-1">Ekstrak audio berkualitas tinggi</span>
              </div>
            ) : (
              <div className="bg-[#eff4f9] rounded-2xl p-4 border border-[#dee1e5] flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Music className="w-5 h-5 text-[#0b57d0] animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-[#1f1f1f] line-clamp-1 max-w-[140px] sm:max-w-xs">{metadataB?.name}</h4>
                    <span className="text-[10px] text-[#0b57d0] block mt-0.5 font-bold">
                      Audio Extracted Successfully
                    </span>
                  </div>
                </div>
                <button
                  id="btn-remove-video-b"
                  onClick={() => {
                    setVideoBFile(null);
                    setVideoBUrl(null);
                    setMetadataB(null);
                  }}
                  disabled={isProcessing}
                  className="text-[11px] font-bold text-[#0b57d0] hover:text-[#0842a0] hover:underline cursor-pointer"
                >
                  Ubah
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#747775] mt-4 font-medium">Aplikasi ini secara cerdas akan mengekstrak sinyal audio dari video pilihan Anda secara virtual.</p>
        </div>

      </div>

      {videoAFile && videoBFile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 mt-6"
        >
          {/* Audio Mixing Console Design */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7]">
            <h3 className="text-base font-bold text-[#1f1f1f] mb-5 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0b57d0]" />
              Kontrol Audio Mixer & Volume Studio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slider A */}
              <div className="space-y-2 p-4 bg-[#f1f3f4] rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#1f1f1f] flex items-center gap-1">
                    <Volume2 className="w-4 h-4 text-[#0b57d0]" />
                    Original Volume (Video A)
                  </span>
                  <span className="text-xs font-semibold text-[#0b57d0] font-mono">{Math.round(volumeA * 100)}%</span>
                </div>
                <input
                  id="mixer-volume-a"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumeA}
                  onChange={(e) => setVolumeA(parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-[#dee1e5] rounded-lg appearance-none cursor-pointer accent-[#0b57d0]"
                />
                <span className="text-[10px] text-[#747775] block font-medium">Geser ke 0% jika ingin membuang suara asli dari Video A sepenuhnya.</span>
              </div>

              {/* Slider B */}
              <div className="space-y-2 p-4 bg-[#f1f3f4] rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#1f1f1f] flex items-center gap-1">
                    <Music className="w-4 h-4 text-[#0b57d0]" />
                    Background Music Volume (Extracted Video B)
                  </span>
                  <span className="text-xs font-semibold text-[#0b57d0] font-mono">{Math.round(volumeB * 100)}%</span>
                </div>
                <input
                  id="mixer-volume-b"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumeB}
                  onChange={(e) => setVolumeB(parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-[#dee1e5] rounded-lg appearance-none cursor-pointer accent-[#0b57d0]"
                />
                <span className="text-[10px] text-[#747775] block font-medium">Geser ke arah kanan untuk memperkuat volume instrumen/musik hasil ekstraksi.</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorText && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p>{errorText}</p>
            </div>
          )}

          {/* Renderer Canvas Section container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Action Card Controls */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] flex flex-col justify-between min-h-[300px]">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1f1f1f]">Status Proses Editor</h3>

                {!isProcessing && !editedBlobUrl && (
                  <div className="space-y-4 pt-4">
                    <p className="text-xs text-[#444746] leading-relaxed">
                      Siap untuk memadukan visual dari Video A dengan musik yang diekstrak dari Video B berdasarkan proporsi mixer yang ditentukan.
                    </p>
                    
                    {/* Visual warning on longer tracks */}
                    {metadataA && metadataB && metadataB.duration < metadataA.duration && (
                      <div className="p-3 bg-amber-50 border border-amber-100 text-[11px] text-amber-800 rounded-xl leading-relaxed flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>Durasi audio B lebih pendek dari durasi video A. Audio B akan berhenti berputar secara normal saat habis.</span>
                      </div>
                    )}

                    <button
                      id="btn-start-mixing"
                      onClick={startMixing}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-bold shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                      Mulai Gabungkan Musik
                    </button>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between text-sm text-[#444746]">
                      <span>{statusMessage}</span>
                      <span className="font-bold">{Math.round(progress)}%</span>
                    </div>

                    <div className="w-full h-3 bg-[#e1e3e1] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#0b57d0] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>

                    <div className="flex justify-center gap-3 mt-4">
                      <button
                        id="btn-cancel-mixing"
                        onClick={cancelMixing}
                        className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-full transition-colors cursor-pointer"
                      >
                        Batalkan Sesi
                      </button>
                    </div>
                  </div>
                )}

                {editedBlobUrl && (
                  <div className="border border-green-150 bg-green-50/25 rounded-2xl p-5 text-center space-y-4">
                    <div className="flex justify-center text-green-600">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-green-800">Video Musik Berhasil Disatukan!</h4>
                      <p className="text-xs text-[#444746] mt-1">Audio yang diekstrak telah dipadukan dengan Visual Video A.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <a
                        id="btn-download-edited-v"
                        href={editedBlobUrl}
                        download={`edited_${metadataA?.name || 'video_music'}`}
                        className="px-6 py-3 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-bold shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Video Hasil Edit
                      </a>
                      <button
                        id="btn-mix-again"
                        onClick={() => {
                          setEditedBlobUrl(null);
                          setProgress(0);
                        }}
                        className="px-5 py-3 border border-[#dee1e5] text-[#444746] rounded-full font-bold hover:bg-[#f1f3f4] transition-colors text-sm cursor-pointer"
                      >
                        Atur Mixer Baru
                      </button>
                    </div>
                  </div>
                )}

              </div>
              <span className="text-[11px] text-[#747775] block text-center mt-4 font-medium">
                Proses penggabungan berjalan secara simultan menggunakan Web Audio Node Graph.
              </span>
            </div>

            {/* Visual Canvas Target Player preview */}
            <div className="bg-[#1f1f1f] rounded-[32px] p-4 shadow-inner flex flex-col items-center justify-center relative overflow-hidden aspect-video border border-[#dee1e5]">
              <canvas
                id="editor-canvas"
                ref={canvasRef}
                className={`max-w-full max-h-full rounded-xl shadow-lg border border-gray-800 ${
                  isProcessing ? 'block' : 'hidden'
                }`}
              />

              {/* Secret references mapping player tags */}
              <video ref={videoARef} className="hidden" playsInline crossOrigin="anonymous" />
              <video ref={videoBRef} className="hidden" playsInline crossOrigin="anonymous" />

              {/* Target screen info box */}
              {!isProcessing && !editedBlobUrl && (
                <div className="text-center text-gray-500 p-8 space-y-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto border border-gray-700">
                    <Sliders className="w-6 h-6 text-[#0b57d0]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Pratinjau Layar Mixer</p>
                    <p className="text-[11px] text-gray-400 mt-1">Layar akan menampilkan video utama saat proses penggabungan audio dimulai.</p>
                  </div>
                </div>
              )}

              {/* Show output result */}
              {editedBlobUrl && !isProcessing && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <video
                    id="edited-playback-v"
                    src={editedBlobUrl}
                    controls
                    className="max-h-[85%] max-w-full rounded-lg shadow-2xl"
                  />
                  <div className="absolute top-3 left-3 bg-[#0b57d0]/90 text-white font-bold text-[10px] uppercase tracking-wide px-2 py-1 rounded-md shadow flex items-center gap-1.5 backdrop-blur-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pratinjau Hasil Edit Musik
                  </div>
                </div>
              )}

              {/* Processing Overlay blur */}
              {isProcessing && (
                <div className="absolute bottom-3 right-3 bg-[#0b57d0]/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow flex items-center gap-1.5 backdrop-blur-sm animate-pulse">
                  <span>MIXING SOUND LANES...</span>
                </div>
              )}
            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
}
