// Vercel Serverless Function for Apify TikTok/Media Downloader actor execution
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

  const API_TOKEN = process.env.APIFY_API_TOKEN;

  if (!API_TOKEN) {
    return res.status(401).json({ 
      error: "APIFY_API_TOKEN belum dikonfigurasi di Environment Variables Vercel!" 
    });
  }

  // Target Apify Actor run API endpoint (wait up to 40 seconds)
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
      // Delay to ensure the dataset has fully populated on Apify side
      await new Promise(resolve => setTimeout(resolve, 1550));

      const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${API_TOKEN}`;
      const datasetResponse = await fetch(datasetUrl);
      
      if (datasetResponse.ok) {
        const items = await datasetResponse.json();

        // Standardize output for client UI compatibility
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
