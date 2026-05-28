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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API endpoint for running RapidAPI Instagram Downloader
  app.post("/api/run-actor", async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
      return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
    }

    const isInstagram = link.toLowerCase().includes('instagram.com');
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5460a7ce88mshcf8572571633e80p1babd6jsn7432c5204cbf';

    if (isInstagram) {
      if (!RAPIDAPI_KEY) {
        return res.status(400).json({ 
          error: "API Key (RAPIDAPI_KEY) belum dikonfigurasi di Environment Variables Vercel atau server lokal Anda." 
        });
      }

      try {
        console.log(`Mencoba mengunduh Instagram link via RapidAPI...`);
        
        // Determine if profile or media post/reel/story
        const isProfile = !link.includes('/p/') && !link.includes('/reel/') && !link.includes('/tv/') && !link.includes('/stories/');
        const endpointParam = isProfile ? `Userinfo` : `get-info`;
        
        const rapidApiUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/?${endpointParam}=${encodeURIComponent(link)}`;
        
        const rapidApiResponse = await fetch(rapidApiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
          }
        });
        
        if (rapidApiResponse.ok) {
          const resData = await rapidApiResponse.json();
          console.log(`RapidAPI Response:`, resData);
          const parsedResult = extractMediaFromRapidAPIResponse(resData, link);
          
          return res.json({
            isSandbox: false,
            provider: 'rapidapi',
            status: 'SUCCEEDED',
            data: {
              id: `rapidapi_${Date.now()}`,
              status: 'SUCCEEDED',
              results: [parsedResult]
            }
          });
        } else {
          const errorText = await rapidApiResponse.text();
          throw new Error(`RapidAPI responded with status ${rapidApiResponse.status}: ${errorText}`);
        }
      } catch (rapidErr: any) {
        console.error(`Error saat memanggil RapidAPI:`, rapidErr);
        return res.status(520).json({ 
          error: `Gagal mengambil data dari Instagram via RapidAPI: ${rapidErr.message || 'Error tidak dikenal'}` 
        });
      }
    } else {
      // High-fidelity fallback simulation for non-Instagram platforms (TikTok, YouTube, Twitter) since Apify was completely removed
      console.log(`Bukan link Instagram. Menyajikan simulasi berkualitas tinggi untuk platform lain...`);
      
      const isTiktok = link.toLowerCase().includes("tiktok.com");
      const isYoutube = link.toLowerCase().includes("youtube.com") || link.toLowerCase().includes("youtu.be");
      const isTwitter = link.toLowerCase().includes("twitter.com") || link.toLowerCase().includes("x.com");

      let title = "Media File Demo / Sandbox Mode";
      let videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
      let duration = 30;
      let creator = "@creator_sandbox";

      if (isTiktok) {
        title = "Video TikTok Hasil Simulasi HD (Eksklusif RapidAPI Mode)";
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-light-over-black-background-34899-large.mp4";
        duration = 15;
        creator = "@tiktok_vip_user";
      } else if (isYoutube) {
        title = "Kyoto Japan Scenic Drone View Travel Vlog";
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
        duration = 120;
        creator = "KyotoTravelers";
      } else if (isTwitter) {
        title = "Breaking News Launch Trailer - Aesthetic Footage";
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4";
        duration = 45;
        creator = "@tech_insider";
      }

      return res.json({
        isSandbox: true,
        message: "Video selain Instagram disimulasikan karena server telah difokuskan ke RapidAPI (Apify dihapus).",
        data: {
          id: `sandbox_${Date.now()}`,
          status: "SUCCEEDED",
          results: [
            {
              title,
              creator,
              duration,
              videoUrl,
              originalUrl: link,
              sizeMB: {
                "1080p": 38.6,
                "720p": 21.2,
                "480p": 10.5,
                "mp3": 3.1
              }
            }
          ]
        }
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
