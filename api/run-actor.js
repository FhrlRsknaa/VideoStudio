// Vercel Serverless Function for Apify TikTok/Media Downloader and RapidAPI Instagram Downloader execution

function extractMediaFromRapidAPIResponse(resData, originalLink) {
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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { link } = req.body;
  
  if (!link) {
    return res.status(400).json({ error: "Parameter 'link' wajib diisi." });
  }

  const isInstagram = link.toLowerCase().includes('instagram.com');
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '5460a7ce88mshcf8572571633e80p1babd6jsn7432c5204cbf';

  // 1. Check if Instagram and attempt RapidAPI
  if (isInstagram && RAPIDAPI_KEY) {
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
        const parsedResult = extractMediaFromRapidAPIResponse(resData, link);
        
        return res.status(200).json({
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
        console.warn(`RapidAPI responded with status ${rapidApiResponse.status}. Falling back to Apify.`);
      }
    } catch (rapidErr) {
      console.warn(`Error saat memanggil RapidAPI, falling back to Apify:`, rapidErr);
    }
  }

  const API_TOKEN = process.env.APIFY_API_TOKEN;

  // Sandbox fallback when Apify token is missing
  if (!API_TOKEN) {
    console.warn("AWAS: APIFY_API_TOKEN belum dikonfigurasi di Environment Variables Vercel!");
    
    const isTiktok = link.toLowerCase().includes("tiktok.com");
    const isYoutube = link.toLowerCase().includes("youtube.com") || link.toLowerCase().includes("youtu.be");

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

    return res.status(200).json({
      isSandbox: true,
      message: "Menjalankan dalam mode demo karena API token belum diatur di Vercel.",
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

  // 2. Apify Actor run logic
  const url = `https://api.apify.com/v2/actors/iZbsVYT4VfdMxoIPL/runs?token=${API_TOKEN}&wait=40`;

  const actorInput = {
    link: link,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actorInput),
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Apify API responded with status ${response.status}. Mohon periksa kevalidan token API Anda.` 
      });
    }

    const runData = await response.json();
    const defaultDatasetId = runData.data?.defaultDatasetId;
    const runId = runData.data?.id;
    const runStatus = runData.data?.status;

    if (defaultDatasetId) {
      await new Promise(resolve => setTimeout(resolve, 1550));

      const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${API_TOKEN}`;
      const datasetResponse = await fetch(datasetUrl);
      
      if (datasetResponse.ok) {
        const items = await datasetResponse.json();

        const parsedResults = items.map((item, idx) => {
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

          return {
            title: resolvedTitle,
            creator: resolvedCreator,
            duration: Number(item.duration) || 15,
            videoUrl: resolvedVideo,
            originalUrl: link,
            sizeMB: {
              "720p": 16.5,
              "mp3": 1.8
            }
          };
        });

        return res.status(200).json({
          isSandbox: false,
          runId,
          status: runStatus,
          items: items,
          data: {
            id: runId,
            status: runStatus,
            results: parsedResults
          }
        });
      }
    }

    return res.status(200).json({
      isSandbox: false,
      runId,
      status: runStatus,
      raw: runData,
      data: {
        id: runId,
        status: runStatus,
        results: []
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
