import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

function extractMediaFromRapidAPIResponse(resData: any, originalLink: string) {
  let target = resData;
  if (Array.isArray(resData)) {
    target = resData[0] || {};
  } else if (resData.data) {
    if (Array.isArray(resData.data)) {
      target = resData.data[0] || {};
    } else {
      target = resData.data;
    }
  }

  // Find video/audio/image link from Instagram response
  let resolvedVideo = target.videoUrl || target.video_url || target.downloadUrl || target.download_url || target.url || target.play || target.directUrl || target.link || target.video;
  
  if (!resolvedVideo && target.links && Array.isArray(target.links)) {
    resolvedVideo = target.links[0]?.url || target.links[0]?.link;
  }
  
  const resolvedTitle = target.title || target.caption || target.description || target.text || target.full_name || target.username || `Instagram Media Extracted`;
  
  let resolvedCreator = "Instagram Creator";
  if (target.username || target.full_name) {
    resolvedCreator = target.username || target.full_name;
  } else if (target.owner && typeof target.owner === 'object') {
    resolvedCreator = target.owner.username || target.owner.full_name || "Instagram Creator";
  }

  const resolvedDuration = Number(target.duration) || 12;

  if (!resolvedVideo) {
    resolvedVideo = originalLink;
  }

  return {
    title: resolvedTitle,
    creator: resolvedCreator,
    duration: resolvedDuration,
    videoUrl: resolvedVideo,
    originalUrl: originalLink,
    sizeMB: {
      "1080p": 25.4,
      "720p": 14.8,
      "480p": 7.1,
      "mp3": 1.6
    }
  };
}

function extractMediaFromTikTokResponse(resData: any, originalLink: string) {
  const target = resData.data || {};
  const resolvedVideo = target.play || target.wmplay || originalLink;
  const resolvedTitle = target.title || "TikTok Video Extracted";
  const resolvedCreator = target.author?.nickname || target.author?.unique_id || "TikTok Creator";
  const resolvedDuration = Number(target.duration) || 15;
  const sizeBytes = Number(target.size) || 15000000;
  const musicSizeBytes = Number(target.music_size) || 1500000;
  
  const sizeMB = sizeBytes / (1024 * 1024);
  const musicSizeMB = musicSizeBytes / (1024 * 1024);

  return {
    title: resolvedTitle,
    creator: resolvedCreator,
    duration: resolvedDuration,
    videoUrl: resolvedVideo,
    originalUrl: originalLink,
    sizeMB: {
      "1080p": Number((sizeMB * 1.25).toFixed(1)) || 25.4,
      "720p": Number(sizeMB.toFixed(1)) || 14.8,
      "480p": Number((sizeMB * 0.55).toFixed(1)) || 7.1,
      "mp3": Number(musicSizeMB.toFixed(1)) || 1.6
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API endpoint for running RapidAPI Downloader
  app.post("/api/run-actor", async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
      return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
    }

    const isInstagram = link.toLowerCase().includes('instagram.com');
    const isTikTok = link.toLowerCase().includes('tiktok.com');
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5460a7ce88mshcf8572571633e80p1babd6jsn7432c5204cbf';

    if (!isInstagram && !isTikTok) {
      return res.status(400).json({ error: "Hanya link Instagram & TikTok publik yang didukung saat ini." });
    }

    if (!RAPIDAPI_KEY) {
      return res.status(400).json({ 
        error: "API Key (RAPIDAPI_KEY) belum dikonfigurasi di server." 
      });
    }

    try {
      if (isTikTok) {
        console.log(`Mencoba mengunduh TikTok link via RapidAPI...`);
        const rapidApiUrl = `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(link)}&hd=1`;
        
        const rapidApiResponse = await fetch(rapidApiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
          }
        });
        
        if (rapidApiResponse.ok) {
          const resData = await rapidApiResponse.json();
          console.log(`TikTok RapidAPI Response Code:`, resData.code);
          
          if (resData.code !== 0 || !resData.data) {
            throw new Error(resData.msg || "Gagal memperoleh data video TikTok dari API");
          }

          const parsedResult = extractMediaFromTikTokResponse(resData, link);
          
          return res.json({
            isSandbox: false,
            provider: 'rapidapi',
            status: 'SUCCEEDED',
            data: {
              id: `rapidapi_tiktok_${Date.now()}`,
              status: 'SUCCEEDED',
              results: [parsedResult]
            }
          });
        } else {
          const errorText = await rapidApiResponse.text();
          throw new Error(`RapidAPI responded with status ${rapidApiResponse.status}: ${errorText}`);
        }
      } else {
        console.log(`Mencoba mengunduh Instagram link via RapidAPI...`);
        const rapidApiUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/download?url=${encodeURIComponent(link)}`;
        
        const rapidApiResponse = await fetch(rapidApiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
          }
        });
        
        if (rapidApiResponse.ok) {
          const resData = await rapidApiResponse.json();
          console.log(`RapidAPI Instagram Response:`, resData);
          const parsedResult = extractMediaFromRapidAPIResponse(resData, link);
          
          return res.json({
            isSandbox: false,
            provider: 'rapidapi',
            status: 'SUCCEEDED',
            data: {
              id: `rapidapi_instagram_${Date.now()}`,
              status: 'SUCCEEDED',
              results: [parsedResult]
            }
          });
        } else {
          const errorText = await rapidApiResponse.text();
          throw new Error(`RapidAPI responded with status ${rapidApiResponse.status}: ${errorText}`);
        }
      }
    } catch (rapidErr: any) {
      console.error(`Error saat memanggil RapidAPI:`, rapidErr);
      return res.status(520).json({ 
        error: `Gagal mengambil data via RapidAPI: ${rapidErr.message || 'Error tidak dikenal'}` 
      });
    }
  });

  // Serve static assets and SPA in production. Otherwise, run Vite dev server.
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
