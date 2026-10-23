/**
 * routes/tutor/conversations/[id].js
 * Single conversation endpoint
 * 
 * GET    /api/tutor/conversations/:id    — Get conversation
 * PATCH  /api/tutor/conversations/:id    — Update conversation
 * DELETE /api/tutor/conversations/:id    — Delete conversation
 */

import { requireAuth, errorResponse, setCors } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';

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
 * GET /api/tutor/conversations/:id
 * Get single conversation by ID
 */
async function getConversation(req, res) {
  try {
    const { user } = await requireAuth(req);
    const conversationId = req.query.id;

    if (!conversationId || !isValidUUID(conversationId)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    // Query dengan ownership check dan message_count
    const { data: conversation, error } = await supabase
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
      .eq('id', conversationId)
      .eq('user_id', user.id)  // IDOR protection
      .single();

    if (error || !conversation) {
      if (error?.code === '42P01') {
        return res.status(503).json({
          error: 'Fitur riwayat obrolan belum aktif.',
          feature_disabled: true
        });
      }
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    // Transform message_count dari array ke number
    const conversationData = {
      ...conversation,
      message_count: Array.isArray(conversation.message_count) ? conversation.message_count[0]?.count || 0 : 0
    };

    return res.status(200).json({ conversation: conversationData });
  } catch (err) {
    console.error('Get conversation error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * PATCH /api/tutor/conversations/:id
 * Update conversation (rename, change tone)
 */
async function updateConversation(req, res) {
  try {
    const { user } = await requireAuth(req);
    const conversationId = req.query.id;

    if (!conversationId || !isValidUUID(conversationId)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    const { title, tone } = req.body || {};

    if (!title && !tone) {
      return errorResponse(res, 'Tidak ada yang diubah.', 422);
    }

    // Build update object
    const updates = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      updates.title = sanitizeTitle(title);
      if (updates.title.length < 1 || updates.title.length > 80) {
        return errorResponse(res, 'Judul harus 1-80 karakter.', 422);
      }
    }

    if (tone !== undefined) {
      if (!isValidTone(tone)) {
        return errorResponse(res, 'Gaya bahasa tidak valid. Pilih "baku" atau "santai".', 422);
      }
      updates.tone = tone;
    }

    // Update dengan ownership check
    const { data: conversation, error } = await supabase
      .from('tutor_conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('user_id', user.id)  // IDOR protection
      .select()
      .single();

    if (error || !conversation) {
      if (error?.code === '42P01') {
        return res.status(503).json({
          error: 'Fitur riwayat obrolan belum aktif.',
          feature_disabled: true
        });
      }
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    return res.status(200).json({ conversation });
  } catch (err) {
    console.error('Update conversation error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * DELETE /api/tutor/conversations/:id
 * Delete conversation beserta messages & attachments
 */
async function deleteConversation(req, res) {
  try {
    const { user } = await requireAuth(req);
    const conversationId = req.query.id;

    if (!conversationId || !isValidUUID(conversationId)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    // Verify ownership terlebih dahulu
    const { data: conversation, error: fetchError } = await supabase
      .from('tutor_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !conversation) {
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    // Ambil daftar attachments untuk hapus dari storage
    const { data: attachments } = await supabase
      .from('tutor_attachments')
      .select('storage_path')
      .eq('conversation_id', conversationId);

    // Hapus conversation (cascade akan hapus messages & attachments rows)
    const { error: deleteError } = await supabase
      .from('tutor_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete conversation error:', deleteError);
      return errorResponse(res, 'Gagal menghapus obrolan.', 500);
    }

    // Hapus files dari storage (background, jangan block response)
    if (attachments && attachments.length > 0) {
      const filePaths = attachments.map(a => a.storage_path);
      supabase.storage
        .from('tutor-uploads')
        .remove(filePaths)
        .then(({ error: storageError }) => {
          if (storageError) {
            console.error('Storage cleanup warning:', storageError);
          }
        })
        .catch(err => {
          console.error('Storage cleanup error:', err);
        });
    }

    return res.status(200).json({
      message: 'Obrolan berhasil dihapus.',
      deleted_id: conversationId,
    });
  } catch (err) {
    console.error('Delete conversation error:', err);
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
      return await getConversation(req, res);
    } else if (req.method === 'PATCH') {
      return await updateConversation(req, res);
    } else if (req.method === 'DELETE') {
      return await deleteConversation(req, res);
    } else {
      return errorResponse(res, 'Method not allowed', 405);
    }
  } catch (err) {
    console.error('Conversation ID handler error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}
