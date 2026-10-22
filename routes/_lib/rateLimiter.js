/**
 * rateLimiter.js — Database-based Rate Limiter untuk Serverless
 * 
 * Karena serverless tidak punya memori bersama antar invokasi,
 * kita pakai tabel database untuk tracking rate limit per user.
 */

import { supabase } from './supabase.js';

/**
 * Rate limiter berbasis database
 * 
 * @param {string} action - Jenis aksi (e.g., 'tutor_message', 'tutor_upload')
 * @param {number} maxAttempts - Max percobaan dalam window
 * @param {number} windowMs - Window waktu dalam milliseconds
 * @returns {Function} Middleware function
 */
export function createRateLimiter(action, maxAttempts, windowMs) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Autentikasi diperlukan untuk rate limiting.' });
    }

    const userId = req.user.id;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    try {
      // Buat tabel rate_limits jika belum ada (idempotent)
      await supabase.rpc('create_rate_limits_table_if_not_exists').catch(() => {
        // Fallback: tabel mungkin sudah ada atau RPC belum dibuat
        // Kita akan handle di query berikutnya
      });

      // Hapus records lama yang sudah melewati window
      await supabase
        .from('rate_limits')
        .delete()
        .eq('user_id', userId)
        .eq('action', action)
        .lt('created_at', windowStart.toISOString());

      // Hitung attempts dalam window
      const { data: attempts, error: countError } = await supabase
        .from('rate_limits')
        .select('id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('action', action)
        .gte('created_at', windowStart.toISOString());

      if (countError) {
        // Jika tabel belum ada, asumsikan tidak ada limit (graceful fallback)
        console.warn('Rate limiter fallback: tabel rate_limits belum ada');
        return next();
      }

      const currentCount = attempts?.length || 0;

      if (currentCount >= maxAttempts) {
        const minutesLeft = Math.ceil(windowMs / 60000);
        return res.status(429).json({
          error: `Terlalu banyak permintaan. Coba lagi dalam ${minutesLeft} menit.`,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Catat attempt baru
      await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          action: action,
          created_at: now.toISOString(),
        });

      // Tambahkan info ke request untuk debugging
      req.rateLimit = {
        limit: maxAttempts,
        current: currentCount + 1,
        remaining: maxAttempts - currentCount - 1,
      };

      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      // Fallback: jangan block request jika rate limiter error
      next();
    }
  };
}

/**
 * Preset rate limiters untuk AI Tutor
 */
export const tutorMessageLimiter = createRateLimiter(
  'tutor_message',
  20,  // max 20 messages
  10 * 60 * 1000  // dalam 10 menit
);

export const tutorUploadLimiter = createRateLimiter(
  'tutor_upload',
  15,  // max 15 uploads
  60 * 60 * 1000  // dalam 1 jam
);

export const tutorConversationLimiter = createRateLimiter(
  'tutor_conversation',
  30,  // max 30 conversations
  60 * 60 * 1000  // dalam 1 jam
);
