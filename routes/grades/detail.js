// routes/grades/detail.js  →  GET /api/grades/detail?grade=<g>
// Mengembalikan daftar topik untuk satu kelas, urut berdasarkan sort_order.
// Kompatibel mundur: bila sort_order belum ada, urutkan berdasarkan id.

import { supabase } from '../_lib/supabase.js';
import { setCors, errorResponse } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const grade = parseInt(req.query.grade);
  if (isNaN(grade) || grade < 1 || grade > 12)
    return errorResponse(res, 'Kelas tidak valid.', 422);

  try {
    // Coba select dengan sort_order; fallback ke tanpa sort_order
    let topics = null;
    let useSortOrder = true;

    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, grade, title, slug, sort_order, summary')
        .eq('grade', grade)
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        useSortOrder = false;
        console.warn('[grades/detail] Kolom sort_order belum ada — fallback ke urutan id.');
      } else {
        topics = data;
      }
    } catch {
      useSortOrder = false;
    }

    // Fallback ke urutan id
    if (!topics || !useSortOrder) {
      const { data, error } = await supabase
        .from('topics')
        .select('id, grade, title')
        .eq('grade', grade)
        .order('id');

      if (error) {
        console.error('Supabase topics error:', error);
        throw error;
      }
      topics = data;
    }

    console.log(`[DEBUG] Grades API: ${topics?.length || 0} baris untuk grade ${grade}.`);

    // Hitung soal per topik
    const topicIds = (topics || []).map(t => t.id);
    let questionsCountMap = {};

    if (topicIds.length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('topic_id')
        .in('topic_id', topicIds);

      (questions || []).forEach(q => {
        questionsCountMap[q.topic_id] = (questionsCountMap[q.topic_id] || 0) + 1;
      });
    }

    const topicsWithCount = (topics || []).map(t => ({
      ...t,
      questions_count: questionsCountMap[t.id] || 0,
    }));

    return res.status(200).json({ grade, topics: topicsWithCount });
  } catch (err) {
    console.error('Catch block in grades API:', err);
    return res.status(200).json({ grade, topics: [] });
  }
}
