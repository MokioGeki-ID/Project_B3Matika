/**
 * routes/tutor/conversations.js
 * Endpoints untuk list dan create conversations AI Tutor
 * 
 * GET    /api/tutor/conversations                — List conversations (paginated)
 * POST   /api/tutor/conversations                — Create new conversation
 * 
 * Note: GET/PATCH/DELETE by ID ada di conversations/[id].js
 */

import { requireAuth, errorResponse, setCors } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { tutorConversationLimiter } from '../_lib/rateLimiter.js';

const PAGE_SIZE = 20;

/**
 * Helper: Validasi UUID
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Helper: Sanitize title (trim, max 80 chars)
 */
function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') return 'Obrolan baru';
  return title.trim().slice(0, 80) || 'Obrolan baru';
}

/**
 * Helper: Validasi tone
 */
function isValidTone(tone) {
  return ['baku', 'santai'].includes(tone);
}

/**
 * GET /api/tutor/conversations?cursor=...
 * List conversations dengan pagination
 */
async function listConversations(req, res) {
  try {
    const { user } = await requireAuth(req);
    const cursor = req.query.cursor || null;

    // Query dengan subquery untuk message_count
    let query = supabase
      .from('tutor_conversations')
      .select(`
        id, 
        title, 
        tone, 
        topic_id, 
        created_at, 
        updated_at, 
        last_message_at,
        message_count:tutor_messages(count)
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (cursor) {
      query = query.lt('last_message_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('List conversations error:', error);
      
      // Jika tabel belum ada (migration 007 belum dijalankan)
      if (error.code === '42P01') {
        return res.status(503).json({
          error: 'Fitur riwayat obrolan belum aktif. Silakan hubungi admin untuk mengaktifkan migration 007.',
          feature_disabled: true
        });
      }
      
      return errorResponse(res, 'Gagal memuat riwayat obrolan.', 500);
    }

    // Transform message_count dari array ke number
    const conversations = (data || []).map(conv => ({
      ...conv,
      message_count: Array.isArray(conv.message_count) ? conv.message_count[0]?.count || 0 : 0
    }));

    const hasMore = conversations.length > PAGE_SIZE;
    const conversationsSlice = hasMore ? conversations.slice(0, PAGE_SIZE) : conversations;
    const nextCursor = hasMore ? conversations[PAGE_SIZE - 1].last_message_at : null;

    return res.status(200).json({
      conversations: conversationsSlice,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error('List conversations error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * POST /api/tutor/conversations
 * Create new conversation
 * Body: { topic_id?: number, title?: string, tone?: 'baku'|'santai' }
 */
async function createConversation(req, res) {
  try {
    const { user } = await requireAuth(req);

    // Rate limiting — inject req.user agar rateLimiter bisa membaca user ID
    req.user = user;
    await new Promise((resolve, reject) => {
      tutorConversationLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { topic_id, title, tone } = req.body || {};

    // Validasi topic_id jika ada
    if (topic_id !== undefined && topic_id !== null) {
      if (!Number.isInteger(topic_id) || topic_id <= 0) {
        return errorResponse(res, 'topic_id harus berupa angka positif.', 422);
      }

      // Verifikasi topic exists
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('id')
        .eq('id', topic_id)
        .single();

      if (topicError || !topic) {
        return errorResponse(res, 'Topik tidak ditemukan.', 404);
      }
    }

    // Validasi tone
    const finalTone = tone && isValidTone(tone) ? tone : 'baku';

    // Insert conversation
    const { data: conversation, error } = await supabase
      .from('tutor_conversations')
      .insert({
        user_id: user.id,
        title: title ? sanitizeTitle(title) : 'Obrolan baru',
        tone: finalTone,
        topic_id: topic_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create conversation error:', error);
      
      if (error.code === '42P01') {
        return res.status(503).json({
          error: 'Fitur riwayat obrolan belum aktif. Silakan hubungi admin.',
          feature_disabled: true
        });
      }
      
      return errorResponse(res, 'Gagal membuat obrolan baru.', 500);
    }

    return res.status(201).json({ conversation });
  } catch (err) {
    console.error('Create conversation error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * Main handler - route dispatcher
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      return await listConversations(req, res);
    } else if (req.method === 'POST') {
      return await createConversation(req, res);
    } else {
      return errorResponse(res, 'Method not allowed', 405);
    }
  } catch (err) {
    console.error('Conversations handler error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}
