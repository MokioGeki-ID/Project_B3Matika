/**
 * tutorContext.js — Material & Video Context Builder untuk AI Tutor
 * 
 * Membangun konteks materi dan video dari database untuk dikirim ke AI model
 */

import { supabase } from './supabase.js';

/**
 * Build catalog of topics (ringkasan untuk AI)
 * Filter by user grade if available (±1 grade for flexibility)
 * 
 * @param {number|null} userGrade - Kelas pengguna (1-12) atau null
 * @returns {Promise<Array>} Topic catalog
 */
export async function buildTopicCatalog(userGrade = null) {
  try {
    let query = supabase
      .from('topics')
      .select('id, grade, title, slug')
      .order('grade', { ascending: true })
      .order('title', { ascending: true });

    // Filter by grade range if provided
    if (userGrade && Number.isInteger(userGrade) && userGrade >= 1 && userGrade <= 12) {
      const minGrade = Math.max(1, userGrade - 1);
      const maxGrade = Math.min(12, userGrade + 2);
      query = query.gte('grade', minGrade).lte('grade', maxGrade);
    }

    const { data: topics, error } = await query;

    if (error) {
      console.error('Build topic catalog error:', error);
      return [];
    }

    return (topics || []).map(t => ({
      id: t.id,
      grade: t.grade,
      title: t.title,
      slug: t.slug,
    }));
  } catch (err) {
    console.error('Build topic catalog error:', err);
    return [];
  }
}

/**
 * Get video list untuk topik tertentu
 * Hanya video terverifikasi (dengan youtube_id)
 * 
 * @param {number} topicId - Topic ID
 * @returns {Promise<Array>} Video list dengan kode (V1, V2, ...)
 */
export async function getTopicVideos(topicId) {
  try {
    const { data: topic, error } = await supabase
      .from('topics')
      .select('id, title, videos')
      .eq('id', topicId)
      .single();

    if (error || !topic) {
      return [];
    }

    const videos = topic.videos || [];
    
    // Filter hanya video yang terverifikasi (ada youtube_id)
    const verified = videos
      .filter(v => v.youtube_id && v.status === 'terverifikasi')
      .map((v, idx) => ({
        code: `V${idx + 1}`,
        purpose: v.purpose, // 'konsep' or 'contoh-soal'
        title: v.title,
        channel: v.channel,
        url: v.url,
        youtube_id: v.youtube_id,
      }));

    return verified;
  } catch (err) {
    console.error('Get topic videos error:', err);
    return [];
  }
}

/**
 * Build context string untuk AI (topic catalog)
 * Format yang mudah diparsing oleh AI
 */
export function formatTopicCatalogForAI(topics) {
  if (!topics || topics.length === 0) {
    return 'Belum ada katalog materi yang tersedia.';
  }

  let catalog = 'KATALOG MATERI TERSEDIA:\n\n';
  
  let currentGrade = null;
  for (const topic of topics) {
    if (topic.grade !== currentGrade) {
      currentGrade = topic.grade;
      catalog += `\n=== KELAS ${currentGrade} ===\n`;
    }
    catalog += `- [ID:${topic.id}] ${topic.title}\n`;
  }

  catalog += '\nUntuk menyarankan materi, gunakan format: TOPIK[${id}] dalam jawabanmu.\n';
  catalog += 'Contoh: "Kamu bisa pelajari lebih lanjut di TOPIK[42] tentang Teorema Pythagoras."\n';

  return catalog;
}

/**
 * Build context string untuk AI (video list)
 */
export function formatVideosForAI(videos, topicTitle) {
  if (!videos || videos.length === 0) {
    return `Belum ada video tutorial terverifikasi untuk topik "${topicTitle}". Sarankan pengguna mencari di YouTube atau lihat materi teks.`;
  }

  let videoContext = `VIDEO TUTORIAL TERSEDIA untuk "${topicTitle}":\n\n`;
  
  const konsepVideos = videos.filter(v => v.purpose === 'konsep');
  const soalVideos = videos.filter(v => v.purpose === 'contoh-soal');

  if (konsepVideos.length > 0) {
    videoContext += 'VIDEO KONSEP:\n';
    konsepVideos.forEach(v => {
      videoContext += `- ${v.code}: "${v.title}" oleh ${v.channel}\n`;
    });
    videoContext += '\n';
  }

  if (soalVideos.length > 0) {
    videoContext += 'VIDEO CONTOH SOAL:\n';
    soalVideos.forEach(v => {
      videoContext += `- ${v.code}: "${v.title}" oleh ${v.channel}\n`;
    });
    videoContext += '\n';
  }

  videoContext += 'Untuk merekomendasikan video, gunakan KODE (mis: V1, V2) dalam jawabanmu.\n';
  videoContext += 'Contoh: "Coba tonton V1 untuk penjelasan konsep dasar, lalu V2 untuk melihat cara mengerjakan soal."\n';
  videoContext += 'JANGAN mengarang ID YouTube atau link video lain!\n';

  return videoContext;
}

/**
 * Extract topic IDs yang disarankan AI dari response
 * Format: TOPIK[123] atau TOPIK[456]
 * 
 * @param {string} aiResponse - Response dari AI
 * @returns {Array<number>} Array of topic IDs
 */
export function extractTopicIds(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') return [];
  
  const regex = /TOPIK\[(\d+)\]/g;
  const matches = [...aiResponse.matchAll(regex)];
  
  return matches
    .map(m => parseInt(m[1], 10))
    .filter(id => !isNaN(id) && id > 0);
}

/**
 * Extract video codes yang direkomendasikan AI dari response
 * Format: V1, V2, V3, dll.
 * 
 * @param {string} aiResponse - Response dari AI
 * @returns {Array<string>} Array of video codes
 */
export function extractVideoCodes(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') return [];
  
  const regex = /\bV(\d+)\b/g;
  const matches = [...aiResponse.matchAll(regex)];
  
  return matches
    .map(m => `V${m[1]}`)
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique
}

/**
 * Replace video codes dengan link YouTube yang aman
 * Hapus semua YouTube link yang tidak ada di daftar resmi
 * 
 * @param {string} aiResponse - Response dari AI
 * @param {Array} videos - Video list dengan codes
 * @returns {string} Cleaned response
 */
export function replaceVideoCodesWithLinks(aiResponse, videos) {
  if (!aiResponse || typeof aiResponse !== 'string') return aiResponse;
  if (!videos || videos.length === 0) return aiResponse;

  let cleaned = aiResponse;

  // Replace valid video codes dengan info lengkap
  videos.forEach(video => {
    const codeRegex = new RegExp(`\\b${video.code}\\b`, 'g');
    const replacement = `${video.code} ("${video.title}" oleh ${video.channel})`;
    cleaned = cleaned.replace(codeRegex, replacement);
  });

  // Hapus semua YouTube link yang tidak ada di daftar resmi
  // Pattern: youtube.com/watch?v=xxxxx atau youtu.be/xxxxx
  const validIds = new Set(videos.map(v => v.youtube_id));
  
  // Match YouTube URLs
  const ytUrlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  
  cleaned = cleaned.replace(ytUrlRegex, (match, videoId) => {
    if (validIds.has(videoId)) {
      return match; // Keep valid links
    } else {
      return '[link dihapus: video tidak terverifikasi]'; // Remove invalid links
    }
  });

  return cleaned;
}

/**
 * Build meta object untuk message berisi topic & video recommendations
 * 
 * @param {string} aiResponse - Response dari AI
 * @param {Array} videos - Video list dengan codes
 * @returns {Object} Meta object
 */
export function buildMessageMeta(aiResponse, videos = []) {
  const topicIds = extractTopicIds(aiResponse);
  const videoCodes = extractVideoCodes(aiResponse);
  
  const recommendedVideos = videoCodes
    .map(code => videos.find(v => v.code === code))
    .filter(Boolean);

  return {
    recommended_topics: topicIds,
    recommended_videos: recommendedVideos.map(v => ({
      code: v.code,
      title: v.title,
      channel: v.channel,
      url: v.url,
      purpose: v.purpose,
    })),
  };
}
