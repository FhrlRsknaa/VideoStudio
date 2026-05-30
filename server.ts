import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API endpoint for running RapidAPI Downloader
  app.post("/api/run-actor", async (req, res) => {
    const { link } = req.body;
    console.log("Request URL:", link);
    
    if (!link) {
      return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
    }

    // Robust TikTok validation
    const isTikTok = /tiktok\.com/i.test(link);
    if (!isTikTok) {
      console.log("URL TikTok tidak valid (Bukan link tiktok)");
      return res.status(400).json({ error: "URL TikTok tidak valid" });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      console.warn("RAPIDAPI_KEY belum dikonfigurasi di environment variables.");
      return res.status(500).json({ error: "RAPIDAPI_KEY belum dikonfigurasi" });
    }

    try {
      console.log(`Mencoba mengunduh TikTok link via RapidAPI...`);
      const rapidApiUrl = `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(link)}&hd=1`;
      
      const response = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      });
      
      console.log("RapidAPI Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("RapidAPI Response:", errorText);

        let customErrorMessage = `RapidAPI responded with status ${response.status}`;
        if (response.status === 401) {
          customErrorMessage = "Gagal autentikasi ke RapidAPI (401 Unauthorized). Periksa RAPIDAPI_KEY Anda.";
        } else if (response.status === 403) {
          customErrorMessage = "Akses ditolak oleh RapidAPI (403 Forbidden). Pastikan langganan API aktif.";
        } else if (response.status === 429) {
          customErrorMessage = "Batas panggilan API terlampaui (429 Rate Limit). Silakan coba beberapa saat lagi.";
        } else if (response.status >= 500) {
          customErrorMessage = "Kesalahan pada server RapidAPI (500 Internal Server Error).";
        }

        return res.status(response.status).json({
          error: customErrorMessage,
          rawResponse: errorText
        });
      }

      const data = await response.json();
      console.log("RapidAPI Response:", data);

      if (data.code !== 0 || !data.data) {
        return res.status(400).json({
          error: data.msg || "Gagal memperoleh data video TikTok dari API. Pastikan link video TikTok valid.",
          rawResponse: data
        });
      }

      const target = data.data;
      const authorNickname = target.author?.nickname || target.author?.unique_id || "TikTok Creator";

      return res.status(200).json({
        success: true,
        title: target.title || "TikTok Video",
        author: authorNickname,
        video: target.play || target.wmplay || "",
        music: target.music || "",
        thumbnail: target.cover || target.origin_cover || ""
      });

    } catch (rapidErr: any) {
      console.error(`Error saat memanggil RapidAPI:`, rapidErr);
      return res.status(500).json({ 
        error: `Internal Server Error: ${rapidErr.message || 'Error tidak dikenal'}` 
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
