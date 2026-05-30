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
      const cleanUrl = link.split("?")[0];
      const rapidApiUrl = `https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink`;
      
      const response = await fetch(rapidApiUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": ALLINONE_API_KEY,
          "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com"
        },
        body: JSON.stringify({
          url: cleanUrl
        })
      });

      const rawText = await response.text();
      const platform = detectPlatform(link);
      const provider = "Social Download All In One";

      if (!response.ok) {
        let apiErrorMsg = "";
        try {
          const parsedErr = JSON.parse(rawText);
          apiErrorMsg = parsedErr.message || parsedErr.error || parsedErr.msg || rawText;
        } catch (e) {
          apiErrorMsg = rawText;
        }
        apiErrorMsg = apiErrorMsg || `HTTP error ${response.status}`;

        console.log("Platform:", platform);
        console.log("Original URL:", link);
        console.log("Clean URL:", cleanUrl);
        console.log("Provider:", provider);
        console.log("Status:", response.status);
        console.log("Raw Response:", rawText);

        return res.status(200).json({
          success: false,
          status: response.status,
          error: apiErrorMsg,
          raw: rawText
        });
      }

      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.log("Platform:", platform);
        console.log("Original URL:", link);
        console.log("Clean URL:", cleanUrl);
        console.log("Provider:", provider);
        console.log("Status:", response.status);
        console.log("Raw Response:", rawText);

        return res.status(200).json({
          success: false,
          status: response.status,
          error: "Response dari API bukan format JSON yang valid",
          raw: rawText
        });
      }

      console.log("Platform:", platform);
      console.log("Original URL:", link);
      console.log("Clean URL:", cleanUrl);
      console.log("Provider:", provider);
      console.log("Status:", response.status);
      console.log("Raw Response:", JSON.stringify(data, null, 2));

      if (data.success === false) {
        return res.status(200).json({
          success: false,
          status: response.status,
          error: data.message || data.error || data.msg || "API returned success false",
          raw: rawText
        });
      }

      // Normalisasi response
      const medias = data.medias || [];
      const videos = medias.filter(m => m && m.type === "video");
      const audios = medias.filter(m => m && m.type === "audio");

      const video = videos[0]?.url || videos[0]?.link || "";
      const music = audios[0]?.url || audios[0]?.link || "";

      const title = data.title || "";
      const author = data.author || data.username || "";
      const thumbnail = data.thumbnail || "";

      // Semua provider harus mengembalikan format:
      return res.status(200).json({
        success: true,
        source: platform,
        title: title,
        author: author,
        thumbnail: thumbnail,
        duration: data.duration || 0,
        video: video,
        music: music,
        medias: medias
      });

    } catch (error) {
      console.error("Social Download All In One Exception:", error);
      return res.status(200).json({
        success: false,
        status: 500,
        error: `Internal Server Error: ${error.message || 'Error tidak dikenal'}`,
        raw: error.stack || String(error)
      });
    }
  }
}
