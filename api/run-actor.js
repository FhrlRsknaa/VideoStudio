// Production Ready Vercel Serverless Function for TikTok No Watermark Downloader & Social Download All In One via RapidAPI

function detectPlatform(url) {
  const urlLower = String(url).toLowerCase();
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return 'instagram';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com')) return 'facebook';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) return 'pinterest';
  if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('t.me') || urlLower.includes('telegram.org')) return 'telegram';
  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  if (urlLower.includes('vimeo.com')) return 'vimeo';
  if (urlLower.includes('threads.net')) return 'threads';
  if (urlLower.includes('bsky.app')) return 'bluesky';
  if (urlLower.includes('mediafire.com')) return 'mediafire';
  if (urlLower.includes('drive.google.com')) return 'google_drive';
  if (urlLower.includes('dropbox.com')) return 'dropbox';
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0] || 'direct';
  } catch (e) {
    return 'direct';
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { link } = req.body;
  console.log("Request URL:", link);

  if (!link) {
    return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
  }

  // Routing Logic: Run TikTok logic if domain matches tiktok.com or vt.tiktok.com
  const isTikTok = /tiktok\.com|vt\.tiktok\.com/i.test(link);

  if (isTikTok) {
    // ==========================================
    // 1. ORIGINAL TIKTOK LOGIC (UNTOUCHED)
    // ==========================================
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      console.warn("RAPIDAPI_KEY belum dikonfigurasi di environment variables.");
      return res.status(500).json({ error: "RAPIDAPI_KEY belum dikonfigurasi" });
    }

    try {
      const rapidApiUrl = `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(link)}&hd=1`;
      
      const response = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      });

      // Unified logging requirement
      console.log("Platform:", "tiktok");
      console.log("URL:", link);
      console.log("Provider:", "TikTok Lama");
      console.log("Status:", response.status);

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
        hdVideo: target.hdplay || target.play || "",
        wmVideo: target.wmplay || "",
        music: target.music || "",
        thumbnail: target.cover || target.origin_cover || ""
      });

    } catch (error) {
      console.error("Internal Server Error (TikTok):", error);
      return res.status(500).json({
        error: `Internal Server Error: ${error.message || 'Error tidak dikenal'}`
      });
    }
  } else {
    // ==========================================
    // 2. NEW SOCIAL DOWNLOAD ALL IN ONE LOGIC
    // ==========================================
    const ALLINONE_API_KEY = process.env.ALLINONE_API_KEY;
    if (!ALLINONE_API_KEY) {
      console.warn("ALLINONE_API_KEY belum dikonfigurasi di environment variables.");
      return res.status(500).json({ error: "ALLINONE_API_KEY belum dikonfigurasi" });
    }

    try {
      const rapidApiUrl = `https://social-download-all-in-one.p.rapidapi.com/v1/social/all?url=${encodeURIComponent(link)}`;
      
      const response = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': ALLINONE_API_KEY,
          'x-rapidapi-host': 'social-download-all-in-one.p.rapidapi.com'
        }
      });

      const platform = detectPlatform(link);
      console.log("Platform:", platform);
      console.log("URL:", link);
      console.log("Provider:", "Social Download All In One");
      console.log("Status:", response.status);

      if (!response.ok) {
        console.error(`Social Download All In One API response status not ok: ${response.status}`);
        return res.status(200).json({
          success: false,
          error: "Gagal mengambil media"
        });
      }

      const data = await response.json();
      console.log("Social Download All In One Response:", data);

      // Parsing properties gracefully (empty string fallback for missing thumbnail / author)
      const topTitle = data.title || data.description || data.desc || "Media File";
      const topAuthor = data.author || data.creator || data.username || data.nickname || "";
      const topThumbnail = data.picture || data.thumbnail || data.thumb || data.cover || data.image || "";
      const topDuration = Number(data.duration) || 0;

      // Extract original links
      const rawLinks = data.links || data.medias || data.download || data.urls || (Array.isArray(data) ? data : []);

      const mediasList = [];
      if (Array.isArray(rawLinks)) {
        for (const item of rawLinks) {
          if (!item) continue;
          const url = item.link || item.url || item.download || item.download_link || "";
          if (!url) continue;

          let type = item.type || "";
          if (typeof type === 'string') {
            type = type.toLowerCase();
          }

          let quality = item.quality || item.resolution || item.format || "";

          mediasList.push({
            url: url,
            type: type,
            quality: quality
          });
        }
      }

      let videoUrl = "";
      let musicUrl = "";

      if (mediasList.length > 0) {
        for (const med of mediasList) {
          const typeLower = String(med.type).toLowerCase();
          const urlLower = String(med.url).toLowerCase();
          const qualityLower = String(med.quality).toLowerCase();

          const isVideo = typeLower.includes('video') || urlLower.includes('.mp4') || (typeLower === "" && !typeLower.includes('audio') && !urlLower.includes('.mp3'));
          const isAudio = typeLower.includes('audio') || typeLower.includes('music') || typeLower.includes('mp3') || urlLower.includes('.mp3') || urlLower.includes('.m4a') || qualityLower.includes('mp3');

          if (isVideo && !videoUrl) {
            videoUrl = med.url;
          }
          if (isAudio && !musicUrl) {
            musicUrl = med.url;
          }
        }
      }

      // Fill in from top level properties if empty
      if (!videoUrl) {
        videoUrl = data.video || data.videoUrl || data.video_url || data.play || data.hdplay || data.download || data.url || data.link || "";
      }
      if (!musicUrl) {
        musicUrl = data.music || data.musicUrl || data.music_url || data.audio || data.audioUrl || data.audio_url || "";
      }

      // Robust fallback of assigning videoUrl to the first matched url if both remain empty
      if (!videoUrl && !musicUrl && mediasList.length > 0) {
        const first = mediasList[0];
        const urlLower = String(first.url).toLowerCase();
        if (urlLower.includes('.mp3') || urlLower.includes('.m4a') || String(first.type).toLowerCase().includes('audio')) {
          musicUrl = first.url;
        } else {
          videoUrl = first.url;
        }
      }

      return res.status(200).json({
        success: true,
        source: platform,
        title: topTitle,
        author: topAuthor,
        thumbnail: topThumbnail,
        duration: topDuration,
        video: videoUrl,
        music: musicUrl,
        medias: rawLinks
      });

    } catch (error) {
      console.error("Social Download All In One Exception:", error);
      return res.status(200).json({
        success: false,
        error: "Gagal mengambil media"
      });
    }
  }
}
