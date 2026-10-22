// routes/topics/index.js → GET /api/topics
// Mengembalikan list semua topics untuk material catalog

import { getSupabaseClient } from '../_lib/supabase.js';
import { setCors, errorResponse } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const supabase = getSupabaseClient();

  try {
    // Get all topics with basic info for catalog
    const { data: topics, error } = await supabase
      .from('topics')
      .select('id, grade, title, content, slug, summary')
      .order('grade', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      // Fallback if new columns don't exist
      if (error.message?.includes('column')) {
        console.warn('[topics/index] Using basic columns (migration 006 not run yet)');
        const { data: basicTopics, error: basicError } = await supabase
          .from('topics')
          .select('id, grade, title, content')
          .order('grade', { ascending: true });

        if (basicError) throw basicError;

        return res.status(200).json({ 
          topics: basicTopics.map(t => ({
            ...t,
            slug: null,
            summary: null
          }))
        });
      }
      throw error;
    }

    // Extract short description from content if summary not available
    const enhancedTopics = topics.map(topic => ({
      ...topic,
      description: topic.summary || (topic.content ? topic.content.substring(0, 100) + '...' : null)
    }));

    return res.status(200).json({ topics: enhancedTopics });
  } catch (err) {
    console.error('Error fetching topics:', err);
    return errorResponse(res, 'Gagal memuat daftar materi.', 500);
  }
}
