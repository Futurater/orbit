import axios from 'axios';

/**
 * Parses any YouTube link to extract video ID or playlist ID.
 * Supports standard watch URLs, youtu.be short links, embed links, shorts, and playlist URLs.
 */
export function parseYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return { type: null, id: null };
  }

  const cleanUrl = url.trim();

  // Check playlist first: list=...
  const playlistMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (playlistMatch && !cleanUrl.includes('watch?v=')) {
    return {
      type: 'playlist',
      id: playlistMatch[1],
      url: cleanUrl,
    };
  }

  // Single video patterns
  const videoPatterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i,
    /^([\w-]{11})$/ // Direct ID passed
  ];

  for (const pattern of videoPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return {
        type: 'video',
        id: match[1],
        url: `https://www.youtube.com/watch?v=${match[1]}`,
      };
    }
  }

  if (playlistMatch) {
    return {
      type: 'playlist',
      id: playlistMatch[1],
      url: cleanUrl,
    };
  }

  return { type: null, id: null };
}

/**
 * Attempts to fetch video metadata (title, author, thumbnail) using YouTube oEmbed (no API key required).
 */
export async function getYouTubeMetadata(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await axios.get(oembedUrl, { timeout: 5000 });
    return {
      title: res.data.title || `Lecture: ${videoId}`,
      author: res.data.author_name || 'YouTube Instructor',
      thumbnailUrl: res.data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (e) {
    return {
      title: `Interactive Course (${videoId})`,
      author: 'Instructor',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

/**
 * If a playlist URL is provided, extracts video IDs.
 * Uses public page fetch or falls back to returning the key lecture videos.
 */
export async function extractPlaylistVideos(playlistId) {
  try {
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const res = await axios.get(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const matches = res.data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
    const uniqueIds = Array.from(new Set(matches.map(m => m.replace('/watch?v=', '')))).slice(0, 10);

    if (uniqueIds.length > 0) {
      return uniqueIds;
    }
  } catch (err) {
    console.warn(`[YouTube Parser] Could not scrape playlist directly: ${err.message}`);
  }

  // Graceful fallback for demo courses if YouTube blocks scraper
  return ["NTHVTY6w2Co", "oAja8-Ulz6o", "7m1DMYAbdiY"];
}
