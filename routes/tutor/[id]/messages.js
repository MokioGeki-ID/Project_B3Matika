/**
 * routes/tutor/[id]/messages.js
 * Endpoints untuk messages dalam conversation
 * 
 * GET  /api/tutor/:id/messages       — Get conversation messages
 * POST /api/tutor/:id/messages       — Send message (with AI response)
 */

import { requireAuth, errorResponse, setCors } from '../../_lib/auth.js';
import { supabase } from '../../_lib/supabase.js';
import { tutorMessageLimiter } from '../../_lib/rateLimiter.js';

const MAX_CONTENT_LENGTH = 4000;
const MAX_ATTACHMENTS = 3;
const SIGNED_URL_EXPIRY = 300; // 5 minutes

/**
 * Helper: Validasi UUID
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/tutor/:id/messages
 * Retrieve all messages in conversation with signed URLs for attachments
 */
async function getMessages(req, res) {
  try {
    const { user } = await requireAuth(req);
    const conversationId = req.query.id;

    if (!conversationId || !isValidUUID(conversationId)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    // Verify ownership
    const { data: conversation, error: convError } = await supabase
      .from('tutor_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('tutor_messages')
      .select('id, role, content, meta, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Get messages error:', msgError);
      return errorResponse(res, 'Gagal memuat pesan.', 500);
    }

    // Fetch attachments untuk messages ini
    const messageIds = messages.map(m => m.id);
    const { data: attachments } = await supabase
      .from('tutor_attachments')
      .select('id, message_id, file_name, mime_type, size_bytes, storage_path, created_at')
      .in('message_id', messageIds)
      .eq('status', 'attached');

    // Generate signed URLs untuk attachments
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        const { data: signedUrl, error: urlError } = await supabase
          .storage
          .from('tutor-uploads')
          .createSignedUrl(att.storage_path, SIGNED_URL_EXPIRY);

        return {
          id: att.id,
          message_id: att.message_id,
          file_name: att.file_name,
          mime_type: att.mime_type,
          size_bytes: att.size_bytes,
          url: urlError ? null : signedUrl.signedUrl,
          created_at: att.created_at,
        };
      })
    );

    // Group attachments by message_id
    const attachmentsByMessage = attachmentsWithUrls.reduce((acc, att) => {
      if (!acc[att.message_id]) acc[att.message_id] = [];
      acc[att.message_id].push(att);
      return acc;
    }, {});

    // Attach to messages
    const messagesWithAttachments = messages.map(m => ({
      ...m,
      attachments: attachmentsByMessage[m.id] || [],
    }));

    return res.status(200).json({
      messages: messagesWithAttachments,
      conversation_id: conversationId,
    });
  } catch (err) {
    console.error('Get messages error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * POST /api/tutor/:id/messages
 * Send message dan dapatkan AI response
 * Body: { content: string, attachment_ids?: string[] }
 */
async function sendMessage(req, res) {
  try {
    const { user } = await requireAuth(req);
    const conversationId = req.query.id;

    if (!conversationId || !isValidUUID(conversationId)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    // Rate limiting
    await new Promise((resolve, reject) => {
      tutorMessageLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { content, attachment_ids } = req.body || {};

    // Validasi content
    if (!content || typeof content !== 'string') {
      return errorResponse(res, 'Pesan tidak boleh kosong.', 422);
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return errorResponse(res, 'Pesan tidak boleh kosong.', 422);
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      return errorResponse(res, `Pesan maksimal ${MAX_CONTENT_LENGTH} karakter.`, 422);
    }

    // Validasi attachment_ids
    if (attachment_ids && !Array.isArray(attachment_ids)) {
      return errorResponse(res, 'attachment_ids harus berupa array.', 422);
    }

    if (attachment_ids && attachment_ids.length > MAX_ATTACHMENTS) {
      return errorResponse(res, `Maksimal ${MAX_ATTACHMENTS} lampiran per pesan.`, 422);
    }

    // Validasi UUID attachment_ids
    if (attachment_ids && attachment_ids.some(id => !isValidUUID(id))) {
      return errorResponse(res, 'ID lampiran tidak valid.', 422);
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('tutor_conversations')
      .select('id, user_id, title, tone, topic_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    // Verify attachments ownership (status pending, belum attached)
    let attachments = [];
    if (attachment_ids && attachment_ids.length > 0) {
      const { data: atts, error: attError } = await supabase
        .from('tutor_attachments')
        .select('id, storage_path, file_name, mime_type, size_bytes, status')
        .in('id', attachment_ids)
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('status', 'pending');

      if (attError) {
        return errorResponse(res, 'Gagal memvalidasi lampiran.', 500);
      }

      if (!atts || atts.length !== attachment_ids.length) {
        return errorResponse(res, 'Beberapa lampiran tidak valid atau sudah digunakan.', 422);
      }

      attachments = atts;
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: trimmedContent,
        meta: {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Save user message error:', userMsgError);
      return errorResponse(res, 'Gagal menyimpan pesan.', 500);
    }

    // Attach files to message
    if (attachments.length > 0) {
      const { error: attachError } = await supabase
        .from('tutor_attachments')
        .update({
          message_id: userMessage.id,
          status: 'attached',
        })
        .in('id', attachment_ids);

      if (attachError) {
        console.error('Attach files error:', attachError);
        // Non-blocking error, continue
      }
    }

    // Update conversation last_message_at
    await supabase
      .from('tutor_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Auto-generate title jika masih "Obrolan baru"
    if (conversation.title === 'Obrolan baru') {
      const autoTitle = trimmedContent.slice(0, 60).trim();
      await supabase
        .from('tutor_conversations')
        .update({ title: autoTitle || 'Obrolan baru' })
        .eq('id', conversationId);
    }

    // Fetch recent messages untuk context AI (max 20 terakhir)
    const { data: recentMessages } = await supabase
      .from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);

    const history = (recentMessages || []).reverse();

    // TODO: Call AI model dengan context
    // Untuk sekarang, return success dan frontend akan handle AI call
    // (Akan diimplementasi di tahap berikutnya setelah material context builder siap)

    return res.status(201).json({
      message: userMessage,
      conversation_id: conversationId,
      attachments: attachments.map(a => ({
        id: a.id,
        file_name: a.file_name,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
      })),
      // Temporary: frontend harus call /api/chat untuk AI response
      // Nanti akan diintegrasikan langsung di sini
      ai_response_pending: true,
    });
  } catch (err) {
    console.error('Send message error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      return await getMessages(req, res);
    } else if (req.method === 'POST') {
      return await sendMessage(req, res);
    } else {
      return errorResponse(res, 'Method not allowed', 405);
    }
  } catch (err) {
    console.error('Messages handler error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}
