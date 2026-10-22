// routes/topics/[id]/videos.js → GET /api/topics/:id/videos
// Mengembalikan videos untuk topic tertentu dari JSONB column

import { getSupabaseClient } from '../../_lib/supabase.js';
import { setCors, errorResponse } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const topicId = parseInt(req.query.id);
  if (isNaN(topicId)) {
    return errorResponse(res, 'Invalid topic ID', 400);
  }

  const supabase = getSupabaseClient();

  try {
    // Get topic with videos JSONB field
    const { data: topic, error } = await supabase
      .from('topics')
      .select('id, videos')
      .eq('id', topicId)
      .single();

    if (error) {
      // Fallback if videos column doesn't exist
      if (error.message?.includes('column') || error.message?.includes('videos')) {
        console.warn('[topics/videos] videos column not found (migration 006 not run yet)');
        return res.status(200).json({ videos: [] });
      }
      
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Topic not found', 404);
      }
      
      throw error;
    }

    if (!topic) {
      return errorResponse(res, 'Topic not found', 404);
    }

    // Parse videos JSONB
    let videos = [];
    
    if (topic.videos && Array.isArray(topic.videos)) {
      // Videos format: [{code: "V1", title: "...", url: "...", duration: "5:30", thumbnail: "..."}]
      videos = topic.videos.map((video, index) => ({
        code: video.code || `V${index + 1}`,
        title: video.title || 'Video Tutorial',
        url: video.url || '',
        duration: video.duration || null,
        thumbnail: video.thumbnail || null
      }));
    }

    return res.status(200).json({ videos });
  } catch (err) {
    console.error('Error fetching videos:', err);
    return errorResponse(res, 'Gagal memuat video.', 500);
  }
}
