/**
 * routes/tutor/uploads.js
 * Endpoint untuk request signed URL upload ke storage
 * 
 * POST /api/tutor/uploads
 * Body: { 
 *   conversation_id: string (UUID),
 *   file_name: string,
 *   mime_type: string,
 *   size_bytes: number
 * }
 * 
 * Response: {
 *   upload_url: string (signed URL untuk upload),
 *   attachment_id: string (UUID untuk reference),
 *   storage_path: string
 * }
 */

import { requireAuth, errorResponse, setCors } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { tutorUploadLimiter } from '../_lib/rateLimiter.js';
import crypto from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];

const UPLOAD_URL_EXPIRY = 60 * 5; // 5 minutes

/**
 * Helper: Validasi UUID
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Helper: Get safe file extension from mime type
 */
function getExtensionFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return map[mimeType] || 'bin';
}

/**
 * Helper: Sanitize filename (remove special chars, max 100 chars)
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'file';
  
  // Remove path separators and special chars
  let safe = filename
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
  
  return safe || 'file';
}

/**
 * POST /api/tutor/uploads
 * Generate signed upload URL
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405);
  }

  try {
    const { user } = await requireAuth(req);

    // Rate limiting — inject req.user agar rateLimiter bisa membaca user ID
    req.user = user;
    await new Promise((resolve, reject) => {
      tutorUploadLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { conversation_id, file_name, mime_type, size_bytes } = req.body || {};

    // Validasi conversation_id
    if (!conversation_id || !isValidUUID(conversation_id)) {
      return errorResponse(res, 'ID obrolan tidak valid.', 422);
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('tutor_conversations')
      .select('id, user_id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return errorResponse(res, 'Obrolan tidak ditemukan atau Anda tidak punya akses.', 404);
    }

    // Validasi file_name
    if (!file_name || typeof file_name !== 'string') {
      return errorResponse(res, 'Nama file tidak valid.', 422);
    }

    const safeName = sanitizeFilename(file_name);
    if (safeName.length === 0 || safeName.length > 120) {
      return errorResponse(res, 'Nama file harus 1-120 karakter.', 422);
    }

    // Validasi mime_type
    if (!mime_type || !ALLOWED_MIME_TYPES.includes(mime_type)) {
      return errorResponse(res, 
        'Tipe file tidak didukung. Hanya JPEG, PNG, WebP, PDF, TXT, dan DOCX yang diizinkan.', 
        422
      );
    }

    // Validasi size_bytes
    if (!Number.isInteger(size_bytes) || size_bytes <= 0 || size_bytes > MAX_FILE_SIZE) {
      return errorResponse(res, `Ukuran file harus 1 byte - 5 MB (Anda: ${Math.round(size_bytes / 1024)} KB).`, 422);
    }

    // Generate storage path: <user_id>/<conversation_id>/<uuid>.<ext>
    const fileId = crypto.randomUUID();
    const extension = getExtensionFromMime(mime_type);
    const storagePath = `${user.id}/${conversation_id}/${fileId}.${extension}`;

    // Create tutor_attachments record (status: pending)
    const { data: attachment, error: attError } = await supabase
      .from('tutor_attachments')
      .insert({
        id: fileId,
        user_id: user.id,
        conversation_id: conversation_id,
        message_id: null, // Will be linked when message is sent
        storage_path: storagePath,
        file_name: safeName,
        mime_type: mime_type,
        size_bytes: size_bytes,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attError) {
      console.error('Create attachment record error:', attError);
      
      if (attError.code === '42P01') {
        return res.status(503).json({
          error: 'Fitur upload belum aktif. Silakan hubungi admin.',
          feature_disabled: true
        });
      }
      
      return errorResponse(res, 'Gagal membuat record lampiran.', 500);
    }

    // Generate signed upload URL
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('tutor-uploads')
      .createSignedUploadUrl(storagePath, {
        upsert: false, // Don't overwrite if exists
      });

    if (uploadError) {
      console.error('Create signed URL error:', uploadError);
      
      // Cleanup attachment record
      await supabase
        .from('tutor_attachments')
        .delete()
        .eq('id', fileId);
      
      // Check if bucket not exists
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return res.status(503).json({
          error: 'Storage bucket belum dikonfigurasi. Silakan hubungi admin untuk menjalankan migration 007.',
          feature_disabled: true
        });
      }
      
      return errorResponse(res, 'Gagal membuat URL upload. Coba lagi.', 500);
    }

    return res.status(200).json({
      upload_url: uploadData.signedUrl,
      attachment_id: fileId,
      storage_path: storagePath,
      token: uploadData.token, // Supabase storage token
      expires_in: UPLOAD_URL_EXPIRY,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}
