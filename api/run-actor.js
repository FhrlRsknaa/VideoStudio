// Production Ready Vercel Serverless Function for TikTok No Watermark Downloader via RapidAPI
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

  // Robust TikTok URL validation
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

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({
      error: `Internal Server Error: ${error.message || 'Error tidak dikenal'}`
    });
  }
}
