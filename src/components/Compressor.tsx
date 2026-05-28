import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { Upload, Video, Download, CheckCircle2, AlertTriangle, Play, Pause, RefreshCw, Sliders, Info, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoMetadata } from '../types';

export default function Compressor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedBlobUrl, setCompressedBlobUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [muteDuringProcess, setMuteDuringProcess] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean-up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (compressedBlobUrl) URL.revokeObjectURL(compressedBlobUrl);
    };
  }, [videoUrl, compressedBlobUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideo(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadVideo(file);
    } else {
      setErrorText('Format file tidak didukung. Harap upload video.');
    }
  };

  const loadVideo = (file: File) => {
    setErrorText(null);
    setCompressedBlobUrl(null);
    setCompressedSize(null);
    setProgress(0);

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFile(file);

    // Create a temporary video element to extract dimensions and duration
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setMetadata({
        name: file.name,
        size: file.size,
        type: file.type,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
      });
    };
    tempVideo.onerror = () => {
      setErrorText('Gagal memuat metadata video. File mungkin corrupt atau codec tidak didukung.');
    };
  };

  // Humanize byte sizes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Convert seconds to readable minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Core compression engine
  const startCompression = async () => {
    if (!videoUrl || !metadata) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Menyiapkan kompresor...');
      setErrorText(null);

      // 1. Calculate Target Dimensions for 720p (Max 1280x720 or 720x1280)
      const isPortrait = metadata.height > metadata.width;
      const ratio = metadata.width / metadata.height;
      let targetWidth = 1280;
      let targetHeight = 720;

      if (isPortrait) {
        targetHeight = 1280;
        targetWidth = Math.round(1280 * ratio);
        if (targetWidth % 2 !== 0) targetWidth += 1; // Even number requirement for standard codecs
      } else {
        targetWidth = 1280;
        targetHeight = Math.round(1280 / ratio);
        if (targetHeight % 2 !== 0) targetHeight += 1;
      }

      // Initialize the visible canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas element not available');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // 2. Set up HTML5 Video Element
      const video = videoRef.current;
      if (!video) throw new Error('Video player reference not available');
      video.src = videoUrl;
      video.currentTime = 0;
      video.playbackRate = 1.0; // Play at normal speed to ensure audio and frames sync beautifully.
      video.muted = muteDuringProcess;

      // Ensure loaded
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        video.addEventListener('canplay', onCanPlay);
        setTimeout(() => resolve(), 5000); // Fail-safe
      });

      // 3. Set up Web Audio API to capture pure audio track from source
      let audioStream: MediaStream | null = null;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        
        // Mute or unmute the local display sound
        const localGain = audioCtx.createGain();
        localGain.gain.value = muteDuringProcess ? 0 : 1;

        source.connect(dest);
        source.connect(localGain);
        localGain.connect(audioCtx.destination);

        audioStream = dest.stream;
      } catch (audioErr) {
        console.warn('Web Audio node initialization skipped/failed. Audio might not be combined.', audioErr);
      }

      // 4. Capture canvas stream at exactly 30fps
      const canvasStream = canvas.captureStream(30);

      // 5. Merge tracks
      const tracks: MediaStreamTrack[] = [];
      
      // Add video track
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (videoTrack) tracks.push(videoTrack);

      // Add audio track
      if (audioStream) {
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) tracks.push(audioTrack);
      }

      const combinedStream = new MediaStream(tracks);

      // 6. Set up MediaRecorder
      // Choose best supported format
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a')) {
        mimeType = 'video/mp4;codecs=avc1,mp4a';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 1500000, // 1.5 Mbps for beautiful high-compression 720p
      };

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: chunks[0]?.type || 'video/mp4' });
        const finalUrl = URL.createObjectURL(finalBlob);
        setCompressedBlobUrl(finalUrl);
        setCompressedSize(finalBlob.size);
        setIsProcessing(false);
        setStatusMessage('');
        setProgress(100);
      };

      // 7. Render frames frame-by-frame loop
      const renderLoop = () => {
        if (video.paused || video.ended) return;

        // Draw video frame onto canvas keeping dimensions matched
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Update progress bar
        const currentProgress = (video.currentTime / metadata.duration) * 100;
        setProgress(Math.min(currentProgress, 99));
        setStatusMessage(`Sedang mengompres: ${Math.round(currentProgress)}% (${formatTime(video.currentTime)} / ${formatTime(metadata.duration)})`);

        animationFrameRef.current = requestAnimationFrame(renderLoop);
      };

      // 8. Start recording & playback
      recorder.start();
      video.play();
      renderLoop();

      // Monitor end
      video.onended = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

    } catch (err: any) {
      console.error(err);
      setErrorText(`Terjadi kesalahan pengompresan: ${err.message || 'Browser tidak mendukung format video/audio.'}`);
      setIsProcessing(false);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    }
  };

  const cancelProcess = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
  };

  const resetAll = () => {
    cancelProcess();
    setVideoFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setCompressedBlobUrl(null);
    setCompressedSize(null);
  };

  return (
    <div id="compressor-section" className="w-full max-w-4xl mx-auto py-8 px-4">
      <AnimatePresence mode="wait">
        {!videoFile ? (
          /* Dropzone */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full"
          >
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[#c2c7cf] rounded-[32px] p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 bg-[#f8f9fa] hover:bg-[#eff4f9] flex flex-col items-center group relative overflow-hidden"
            >
              <input
                id="video-upload-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-full bg-[#d3e3fd] text-[#0b57d0] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#1f1f1f] mb-1">Upload video Anda</h3>
              <p className="text-sm text-[#444746] max-w-md mx-auto leading-relaxed">
                Tarik & letakkan file video Anda di sini, atau klik untuk memilih dari komputer Anda.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <span className="px-3 py-1 bg-[#d3e3fd] text-xs text-[#0b57d0] font-bold rounded-full">MP4, WebM, MOV</span>
                <span className="px-3 py-1 bg-[#d3e3fd] text-xs text-[#0b57d0] font-bold rounded-full">Resolusi Bebas</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Editor Workscreen */
          <motion.div
            key="workscreen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Header block info design */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#d3e3fd] text-[#0b57d0] flex items-center justify-center font-bold">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1f1f1f] line-clamp-1 max-w-sm sm:max-w-md">{metadata?.name}</h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#444746] mt-1">
                    <span>Durasi: <strong className="text-[#1f1f1f]">{metadata ? formatTime(metadata.duration) : '...'}</strong></span>
                    <span>•</span>
                    <span>Ukuran: <strong className="text-[#1f1f1f]">{metadata ? formatBytes(metadata.size) : '...'}</strong></span>
                    <span>•</span>
                    <span>Resolusi: <strong className="text-[#1f1f1f]">{metadata ? `${metadata.width}x${metadata.height}` : '...'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  id="btn-compress-reset"
                  onClick={resetAll}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-[#c2c7cf] text-[#444746] text-sm font-semibold rounded-full hover:bg-[#f8f9fa] disabled:opacity-50 transition-colors"
                >
                  Ganti Video
                </button>
              </div>
            </div>

            {/* Target Output Config Panel */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-[#1f1f1f] mb-4 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#0b57d0]" />
                  Konfigurasi Output Target
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#f1f3f4] rounded-2xl">
                    <span className="text-sm font-semibold text-[#444746]">Resolusi</span>
                    <span className="px-3 py-1 bg-[#0b57d0] text-xs font-bold text-white rounded-full">720p (HD)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f1f3f4] rounded-2xl">
                    <span className="text-sm font-semibold text-[#444746]">Frame Rate</span>
                    <span className="px-3 py-1 bg-[#0b57d0] text-xs font-bold text-white rounded-full">30 FPS</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f1f3f4] rounded-2xl">
                    <span className="text-sm font-semibold text-[#444746]">Bitrate Audio & Video</span>
                    <span className="px-3 py-1 bg-[#d3e3fd] text-xs font-bold text-[#0b57d0] rounded-full">High-Compression (Optimal)</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <input
                    id="chk-mute"
                    type="checkbox"
                    checked={muteDuringProcess}
                    onChange={(e) => setMuteDuringProcess(e.target.checked)}
                    disabled={isProcessing}
                    className="w-4 h-4 text-[#0b57d0] border-[#c2c7cf] rounded focus:ring-[#0b57d0] cursor-pointer"
                  />
                  <label htmlFor="chk-mute" className="text-xs font-semibold text-[#444746] cursor-pointer select-none">
                    Senyapkan video saat melakukan proses kompresi
                  </label>
                </div>
              </div>

              {/* Warning/Info Box on Client Processing */}
              <div className="flex flex-col justify-between bg-[#eff4f9] rounded-2xl p-5 border border-[#dee1e5]">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#0b57d0] flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#0b57d0]" />
                    Bagaimana cara kerjanya?
                  </h4>
                  <p className="text-xs text-[#444746] leading-relaxed">
                    Aplikasi ini menggunakan teknologi <strong>HTML5 Canvas</strong> dan <strong>MediaStream Recording</strong> langsung di dalam browser Anda. Keuntungan:
                  </p>
                  <ul className="list-disc pl-4 text-xs text-[#444746] space-y-1 mt-2">
                    <li>Pemrosesan lokal tanpa upload server - <strong>100% aman & cepat!</strong></li>
                    <li>Sangat hemat kuota karena tidak perlu mengirim video ratusan MB ke server.</li>
                    <li>Kompresi dilakukan real-time seiring berputarnya video.</li>
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-[#d3e3fd]/40 rounded-xl flex items-center gap-2 text-[#444746] text-xs">
                  <ShieldAlert className="w-4 h-4 text-[#0b57d0] flex-shrink-0" />
                  <span>Harap tidak meminimalisir tab ini selagi kompresi sedang berlangsung.</span>
                </div>
              </div>
            </div>

            {/* Error Message Box */}
            {errorText && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 flex items-center gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p>{errorText}</p>
              </div>
            )}

            {/* Canvas/Progress Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Action / Player View */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e3e7] flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#1f1f1f]">Kompresor Control & Status</h3>
                  
                  {!isProcessing && !compressedBlobUrl && (
                    <div className="py-8 text-center space-y-4">
                      <p className="text-sm text-[#444746]">Video siap untuk dikompresi ke format 720p 30fps.</p>
                      <button
                        id="btn-start-compression"
                        onClick={startCompression}
                        className="w-full sm:w-auto px-8 py-3.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-bold shadow-md shadow-blue-100 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                        Mulai Proses Kompresi
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-4 py-4">
                      <div className="flex justify-between text-sm text-[#444746]">
                        <span>{statusMessage}</span>
                        <span className="font-bold">{Math.round(progress)}%</span>
                      </div>
                      
                      {/* Material You Progress Indicator */}
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
                          id="btn-cancel-compression"
                          onClick={cancelProcess}
                          className="px-5 py-2 bg-red-50 hover:bg-red-100 text-[#0b57d0] border border-red-200 text-xs rounded-full transition-colors flex items-center gap-1 cursor-pointer font-bold"
                        >
                          Batalkan Proses
                        </button>
                      </div>
                    </div>
                  )}

                  {compressedBlobUrl && (
                    <div className="border border-green-150 bg-green-50/20 rounded-2xl p-5 text-center space-y-4">
                      <div className="flex justify-center text-green-600">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">Kompresi Selesai!</h4>
                        <p className="text-xs text-[#444746] mt-1">Video berhasil dikompresi ke standard ultra-compress 720p 30fps.</p>
                      </div>

                      {/* Display Compares of sizes */}
                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto py-2">
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center">
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Sebelum</span>
                          <span className="text-sm font-bold text-[#1f1f1f]">{formatBytes(metadata?.size || 0)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-green-100 text-center">
                          <span className="text-[10px] text-green-500 block font-semibold uppercase">Setelah</span>
                          <span className="text-sm font-bold text-green-600">{compressedSize ? formatBytes(compressedSize) : '...'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                        <a
                          id="btn-download-compressed-v"
                          href={compressedBlobUrl}
                          download={`compressed_720p_${metadata?.name || 'video'}`}
                          className="px-6 py-3 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-bold shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download Video Kompresi
                        </a>
                        <button
                          id="btn-recompress"
                          onClick={() => {
                            setCompressedBlobUrl(null);
                            setCompressedSize(null);
                            setProgress(0);
                          }}
                          className="px-5 py-3 border border-[#dee1e5] text-[#444746] rounded-full font-bold hover:bg-[#f1f3f4] transition-colors text-sm cursor-pointer"
                        >
                          Ulangi Kompresi
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtext info for browser compatibility */}
                <span className="text-[11px] text-gray-400 block text-center mt-4">
                  Hasil download browser otomatis menggunakan format optimal (MP4 / WebM).
                </span>
              </div>

              {/* Right Viewport Canvas */}
              <div className="bg-[#1f1f1f] rounded-[32px] p-4 shadow-inner flex flex-col items-center justify-center relative overflow-hidden aspect-video border border-[#dee1e5]">
                {/* Real-time Renderer Canvas Indicator */}
                <canvas
                  id="compressor-canvas"
                  ref={canvasRef}
                  className={`max-w-full max-h-full rounded-xl shadow-lg border border-gray-800 ${
                    isProcessing ? 'block' : 'hidden'
                  }`}
                />

                {/* Video elements used internally */}
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                  crossOrigin="anonymous"
                />

                {/* Placeholder design while not processing */}
                {!isProcessing && !compressedBlobUrl && (
                  <div className="text-center text-gray-500 p-8 space-y-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto border border-gray-700">
                      <Video className="w-6 h-6 text-[#0b57d0]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Pratinjau Layar Kompresor</p>
                      <p className="text-xs text-gray-400 mt-1">Kanvas interaktif akan memutar video secara real-time saat Anda memulai kompresi.</p>
                    </div>
                  </div>
                )}

                {/* Display Output player after compression is complete */}
                {compressedBlobUrl && !isProcessing && (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <video
                      id="compressed-playback-v"
                      src={compressedBlobUrl}
                      controls
                      className="max-h-[85%] max-w-full rounded-lg shadow-2xl"
                    />
                    <div className="absolute top-3 left-3 bg-[#0b57d0]/90 text-white font-bold text-[10px] uppercase tracking-wide px-2 py-1 rounded-md shadow flex items-center gap-1.5 backdrop-blur-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pratinjau Hasil Kompresi
                    </div>
                  </div>
                )}

                {/* Processing Overlay blur */}
                {isProcessing && (
                  <div className="absolute bottom-3 right-3 bg-[#0b57d0]/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow flex items-center gap-1.5 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    RENDERING FRAME...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
