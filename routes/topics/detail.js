// routes/topics/detail.js  →  GET /api/topics/detail?topic=<id>
// Mengembalikan data topik + soal latihan.
// Kompatibel mundur: kolom baru (slug, summary, objectives, examples,
// common_mistakes, videos) dikembalikan bila ada, null bila belum ada.
// Tidak crash bila migrasi 006 belum dijalankan.

import { supabase } from '../_lib/supabase.js';
import { setCors, errorResponse } from '../_lib/auth.js';

// Kolom baru dari migrasi 006 (opsional — null bila belum ada)
const TOPIC_COLS_EXTENDED = 'id, grade, title, content, slug, sort_order, summary, objectives, examples, common_mistakes, videos';
const TOPIC_COLS_BASIC    = 'id, grade, title, content';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const id = parseInt(req.query.topic);
  if (isNaN(id)) return errorResponse(res, 'Tidak ditemukan.', 404);

  // Coba ambil dengan kolom baru; fallback ke kolom lama bila error
  let topic = null;
  let usingExtended = true;

  try {
    const { data, error } = await supabase
      .from('topics')
      .select(TOPIC_COLS_EXTENDED)
      .eq('id', id)
      .single();

    if (error) {
      // Jika error karena kolom belum ada (migrasi belum dijalankan)
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        usingExtended = false;
        console.warn('[topics/detail] Kolom baru belum ada — jalankan migrasi 006. Fallback ke kolom dasar.');
      } else if (!data) {
        return errorResponse(res, 'Tidak ditemukan.', 404);
      } else {
        throw error;
      }
    } else {
      topic = data;
    }
  } catch {
    usingExtended = false;
  }

  // Fallback ke kolom dasar
  if (!topic || !usingExtended) {
    const { data, error } = await supabase
      .from('topics')
      .select(TOPIC_COLS_BASIC)
      .eq('id', id)
      .single();

    if (error || !data) return errorResponse(res, 'Tidak ditemukan.', 404);
    topic = data;
  }

  // Ambil soal latihan (kolom sesuai skema aktual)
  const { data: rawQuestions } = await supabase
    .from('questions')
    .select('id, body, options, points, explanation')
    .eq('topic_id', id)
    .order('id');

  const questions = (rawQuestions || []).map(q => ({
    id: q.id,
    text: q.body,
    options: q.options,
    difficulty: q.points,      // points dipakai sebagai difficulty (1-3)
    explanation: q.explanation || null,
  }));

  return res.status(200).json({ topic, questions });
}
