/**
 * YouTube Helper Utilities
 * Provides robust handling for YouTube URLs, thumbnails, and embed support
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * 
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if invalid
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;

  // Remove whitespace
  url = url.trim();

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchPattern = /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/;
  let match = url.match(watchPattern);
  if (match && match[1]) return match[1];

  // Pattern 2: youtu.be/VIDEO_ID
  const shortPattern = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  match = url.match(shortPattern);
  if (match && match[1]) return match[1];

  // Pattern 3: youtube.com/embed/VIDEO_ID
  const embedPattern = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;
  match = url.match(embedPattern);
  if (match && match[1]) return match[1];

  // Pattern 4: youtube.com/v/VIDEO_ID
  const vPattern = /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/;
  match = url.match(vPattern);
  if (match && match[1]) return match[1];

  // Pattern 5: If it's just the ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Normalize YouTube URL to standard watch URL
 * 
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - Normalized URL or null if invalid
 */
export function normalizeYouTubeUrl(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get YouTube embed URL
 * 
 * @param {string} url - YouTube URL or video ID
 * @param {Object} options - Embed options
 * @param {boolean} options.autoplay - Enable autoplay (default: false)
 * @param {boolean} options.controls - Show controls (default: true)
 * @param {number} options.start - Start time in seconds (default: 0)
 * @returns {string|null} - Embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(url, options = {}) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const {
    autoplay = false,
    controls = true,
    start = 0,
    modestbranding = true,
    rel = false
  } = options;

  const params = new URLSearchParams({
    ...(autoplay && { autoplay: '1' }),
    ...(controls && { controls: '1' }),
    ...(start > 0 && { start: start.toString() }),
    ...(modestbranding && { modestbranding: '1' }),
    ...(rel === false && { rel: '0' })
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Get YouTube thumbnail URL with multiple quality options
 * Falls back to lower quality if high quality unavailable
 * 
 * Quality options:
 * - maxresdefault: 1280x720 (best, but not always available)
 * - sddefault: 640x480
 * - hqdefault: 480x360
 * - mqdefault: 320x180 (most reliable)
 * - default: 120x90
 * 
 * @param {string} url - YouTube URL or video ID
 * @param {string} quality - Quality preference (default: 'mqdefault')
 * @returns {string|null} - Thumbnail URL or null if invalid
 */
export function getYouTubeThumbnail(url, quality = 'mqdefault') {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // Quality mapping with fallback chain
  const qualityOptions = {
    maxres: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
    default: 'default'
  };

  const thumbnailQuality = qualityOptions[quality] || 'mqdefault';
  
  return `https://img.youtube.com/vi/${videoId}/${thumbnailQuality}.jpg`;
}

/**
 * Get multiple thumbnail URLs for fallback strategy
 * Returns array of URLs ordered by quality (high to low)
 * 
 * @param {string} url - YouTube URL or video ID
 * @returns {string[]} - Array of thumbnail URLs
 */
export function getYouTubeThumbnailWithFallbacks(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return [];

  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/default.jpg`
  ];
}

/**
 * Validate if YouTube URL is properly formatted
 * Does NOT check if video exists on YouTube
 * 
 * @param {string} url - YouTube URL
 * @returns {boolean} - True if URL format is valid
 */
export function isValidYouTubeUrl(url) {
  return extractYouTubeId(url) !== null;
}

/**
 * Parse video duration from ISO 8601 format (PT#M#S) to readable format
 * Example: PT5M30S -> "5:30"
 * 
 * @param {string} isoDuration - ISO 8601 duration string
 * @returns {string} - Formatted duration (MM:SS or H:MM:SS)
 */
export function parseYouTubeDuration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return '0:00';

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get YouTube video info from URL (client-side only - no API key required)
 * Uses oEmbed endpoint for basic metadata
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<Object>} - Video metadata
 */
export async function getYouTubeVideoInfo(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error('Video not found or unavailable');
    }

    const data = await response.json();
    
    return {
      videoId,
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
      thumbnailWidth: data.thumbnail_width,
      thumbnailHeight: data.thumbnail_height,
      html: data.html
    };
  } catch (error) {
    console.error('Failed to fetch YouTube video info:', error);
    throw error;
  }
}

/**
 * Check if YouTube video exists and is accessible
 * Uses oEmbed endpoint (no API key required)
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<boolean>} - True if video is accessible
 */
export async function checkYouTubeVideoExists(url) {
  try {
    await getYouTubeVideoInfo(url);
    return true;
  } catch {
    return false;
  }
}
