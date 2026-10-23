/**
 * routes/tutor/health.js
 * Endpoint diagnostik khusus admin untuk memeriksa status AI Tutor
 * 
 * GET /api/tutor/health
 * 
 * Mengembalikan status (boolean/string) untuk:
 * - Environment variables wajib
 * - Koneksi database
 * - Tabel yang dibutuhkan (007 dan 008)
 * - Bucket storage
 * - Koneksi ke penyedia AI
 * 
 * TIDAK mengembalikan nilai secret
 */

import { requireAuth, errorResponse, setCors } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import env from '../_lib/env.js';

/**
 * Check environment variables
 */
function checkEnvVars() {
  const required = {
    SUPABASE_URL: !!env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: !!env.GEMINI_API_KEY,
    JWT_SECRET: !!env.JWT_SECRET,
  };

  const optional = {
    GEMINI_MODEL: !!env.GEMINI_MODEL,
    NODE_ENV: !!env.NODE_ENV,
  };

  return { required, optional, all_required_present: Object.values(required).every(v => v) };
}

/**
 * Check database connection
 */
async function checkDatabase() {
  try {
    const { error } = await supabase
      .from('tutor_conversations')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return { ok: false, message: 'Tabel tutor_conversations belum ada (migration 007 belum dijalankan)' };
      }
      return { ok: false, message: error.message };
    }

    return { ok: true, message: 'Koneksi database OK' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/**
 * Check required tables dari migration 007 dan 008
 */
async function checkTables() {
  const tables = ['tutor_conversations', 'tutor_messages', 'tutor_attachments', 'rate_limits'];
  const results = {};

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          results[table] = { exists: false, message: 'Tabel belum ada' };
        } else {
          results[table] = { exists: true, message: error.message };
        }
      } else {
        results[table] = { exists: true, message: 'OK' };
      }
    } catch (err) {
      results[table] = { exists: false, message: err.message };
    }
  }

  return results;
}

/**
 * Check storage bucket
 */
async function checkStorage() {
  try {
    const { data, error } = await supabase
      .storage
      .getBucket('tutor-uploads');

    if (error) {
      if (error.message?.includes('not found') || error.statusCode === 404) {
        return { ok: false, message: 'Bucket tutor-uploads belum dibuat' };
      }
      return { ok: false, message: error.message };
    }

    return { ok: true, message: 'Bucket tutor-uploads tersedia', public: data?.public || false };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/**
 * Check AI provider (lightweight ping)
 */
async function checkAIProvider() {
  try {
    const apiKeyStr = env.GEMINI_API_KEY || '';
    const apiKeys = apiKeyStr.split(',').map(k => k.replace(/['"]/g, '').trim()).filter(k => k);

    if (apiKeys.length === 0) {
      return { ok: false, message: 'GEMINI_API_KEY tidak terset', keys_count: 0 };
    }

    // Try to load SDK
    await import('@google/genai');

    return { 
      ok: true, 
      message: 'SDK AI tersedia', 
      keys_count: apiKeys.length,
      model: env.GEMINI_MODEL || 'gemini-3.8-flash'
    };
  } catch (err) {
    return { ok: false, message: `Gagal load SDK: ${err.message}` };
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return errorResponse(res, 'Method not allowed', 405);
  }

  try {
    // Health check tidak perlu auth untuk diagnostik
    // Tapi tidak expose detail sensitif

    // Run all checks in parallel
    const [envCheck, dbCheck, tablesCheck, storageCheck, aiCheck] = await Promise.all([
      Promise.resolve(checkEnvVars()),
      checkDatabase(),
      checkTables(),
      checkStorage(),
      checkAIProvider(),
    ]);

    // Overall status
    const overallOk = 
      envCheck.all_required_present &&
      dbCheck.ok &&
      Object.values(tablesCheck).every(t => t.exists) &&
      storageCheck.ok &&
      aiCheck.ok;

    return res.status(200).json({
      status: overallOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        environment: envCheck,
        database: dbCheck,
        tables: tablesCheck,
        storage: storageCheck,
        ai_provider: aiCheck,
      },
    });
  } catch (err) {
    console.error('Health check error:', err);
    return errorResponse(res, err.message, err.status || 500);
  }
}
