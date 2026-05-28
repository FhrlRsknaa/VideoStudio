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

  // API endpoint for running Apify Actor iZbsVYT4VfdMxoIPL
  app.post("/api/run-actor", async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
      return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
    }

    const API_TOKEN = process.env.APIFY_API_TOKEN;

    if (!API_TOKEN) {
      // High-fidelity sandbox / fallback mock behavior when API token is not yet configured.
      // This ensures the application still works gracefully and demonstrates the capability
      // while requesting the user to fill in the variable.
      console.warn("AWAS: APIFY_API_TOKEN belum dikonfigurasi di Environment Variables!");
      
      // Let's generate a realistic mock response matching Apify actor run response
      // with a slight delay to simulate actual Apify execution.
      return setTimeout(() => {
        const isTiktok = link.includes("tiktok.com");
        const isInstagram = link.includes("instagram.com");
        const isYoutube = link.includes("youtube.com") || link.includes("youtu.be");

        let title = "Media File Demo / Sandbox Mode";
        let videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
        let duration = 30;
        let creator = "@creator_sandbox";

        if (isTiktok) {
          title = "Video TikTok Hasil Simulasi HD (Token Belum Diisi)";
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-light-over-black-background-34899-large.mp4";
          duration = 15;
          creator = "@tiktok_vip_user";
        } else if (isInstagram) {
          title = "Reels Aesthetic Coffee Pour HD";
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-coffee-pouring-into-a-cup-34394-large.mp4";
          duration = 24;
          creator = "@morning_brews";
        } else if (isYoutube) {
          title = "Kyoto Japan Scenic Drone View Travel Vlog";
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
          duration = 120;
          creator = "KyotoTravelers";
        }

        res.json({
          isSandbox: true,
          message: "Menjalankan dalam mode demo karena APIFY_API_TOKEN belum diatur.",
          data: {
            id: `sandbox_run_${Date.now()}`,
            status: "SUCCEEDED",
            isMock: true,
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
      }, 2000);
    }

    // Real API implementation
    const url = `https://api.apify.com/v2/actors/iZbsVYT4VfdMxoIPL/runs?token=${API_TOKEN}&wait=40`;

    const actorInput = {
      link: link,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"]
      }
    };

    try {
      console.log(`Memulai Apify Actor untuk link: ${link}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actorInput),
      });

      if (!response.ok) {
        throw new Error(`Apify API responded with status ${response.status}`);
      }

      const runData = await response.json();
      const runId = runData.data?.id;
      const defaultDatasetId = runData.data?.defaultDatasetId;
      const runStatus = runData.data?.status;

      console.log(`Actor Run ID: ${runId}, Dataset ID: ${defaultDatasetId}, Status: ${runStatus}`);

      // If the actor succeeded or we have a default dataset ID, fetch the items!
      if (defaultDatasetId) {
        console.log(`Mengambil data hasil dari dataset ${defaultDatasetId}...`);
        
        // Wait 1.5 seconds just to make sure items are fully populated in Apify's firehose
        await new Promise(resolve => setTimeout(resolve, 1500));

        const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${API_TOKEN}`;
        const datasetResponse = await fetch(datasetUrl);
        
        if (datasetResponse.ok) {
          const items = await datasetResponse.json();
          console.log(`Berhasil mengambil ${items.length} item dari dataset.`);

          // Resolve extracted video url from returned dataset items
          // Usually, Apify's TikTok or Instagram Reels actors return objects containing direct download urls or music urls.
          return res.json({
            isSandbox: false,
            runId,
            status: runStatus,
            items: items,
            // Format the standard response structure that our frontend can parse easily
            data: {
              id: runId,
              status: runStatus,
              results: items.map((item: any, idx: number) => {
                // Heuristics to find video/audio download link from TikTok/Instagram dataset
                let resolvedVideo = item.videoUrl || item.nowatermarkVideoUrl || item.downloadUrl || item.video_url || item.play || item.directUrl || item.url;
                
                if (!resolvedVideo && item.video) {
                  if (typeof item.video === "string") {
                    resolvedVideo = item.video;
                  } else if (typeof item.video === "object") {
                    resolvedVideo = item.video.play_addr || item.video.downloadAddr || item.video.url || (item.video.url_list && item.video.url_list[0]);
                  }
                }
                if (!resolvedVideo) {
                  resolvedVideo = link;
                }

                const resolvedTitle = item.title || item.description || item.caption || item.desc || `Media File Extracted #${idx + 1}`;
                
                let resolvedCreator = "Unknown Creator";
                if (item.author) {
                  if (typeof item.author === "string") {
                    resolvedCreator = item.author;
                  } else if (typeof item.author === "object") {
                    resolvedCreator = item.author.uniqueId || item.author.username || item.author.nickname || item.author.name || "Unknown Creator";
                  }
                } else {
                  resolvedCreator = item.username || item.owner?.username || item.creator || "Unknown Creator";
                }

                const resolvedDuration = Number(item.duration) || 15;

                return {
                  title: resolvedTitle,
                  creator: resolvedCreator,
                  duration: resolvedDuration,
                  videoUrl: resolvedVideo,
                  originalUrl: link,
                  sizeMB: {
                    "720p": 16.5,
                    "mp3": 1.8
                  }
                };
              })
            }
          });
        }
      }

      // Fallback if dataset items aren't fetched but we have run information
      return res.json({
        isSandbox: false,
        runId,
        status: runStatus,
        message: "Aktivitas Actor dimulai namun dataset belum siap atau kosong.",
        raw: runData
      });

    } catch (error: any) {
      console.error("Terjadi error saat memanggil Apify API:", error);
      return res.status(500).json({ error: error.message });
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
