/**
 * generate-sql-parts.js
 * Membagi output menjadi 3 file SQL terpisah yang lebih kecil:
 *   part1_schema.sql   — ALTER TABLE + sequence reset + index
 *   part2_topics.sql   — UPDATE + INSERT topics
 *   part3_questions.sql — INSERT questions
 *
 * Jalankan: node scripts/generate-sql-parts.js
 */

import fs  from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'materi');
const DB_DIR      = path.join(__dirname, '..', 'database');

function sq(str) {
  if (str == null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}
function jsonSq(val) {
  if (val == null) return 'NULL';
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

// Baca semua topik
const files = fs.readdirSync(CONTENT_DIR)
  .filter(f => f.startsWith('kelas-') && f.endsWith('.json'))
  .sort();

const allTopics = [];
for (const file of files) {
  const topics = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
  allTopics.push(...topics);
}

// ── PART 1: Schema ──────────────────────────────────────────────────────────
const p1 = [];
p1.push('-- PART 1: Schema — jalankan PERTAMA');
p1.push('-- Supabase SQL Editor → New query → paste → RUN');
p1.push('-- Tunggu sukses sebelum lanjut ke part2.');
p1.push('');
p1.push('BEGIN;');
p1.push('');
p1.push('ALTER TABLE public.topics');
p1.push('  ADD COLUMN IF NOT EXISTS slug             VARCHAR(100),');
p1.push('  ADD COLUMN IF NOT EXISTS sort_order       SMALLINT,');
p1.push('  ADD COLUMN IF NOT EXISTS summary          TEXT,');
p1.push('  ADD COLUMN IF NOT EXISTS objectives       JSONB,');
p1.push('  ADD COLUMN IF NOT EXISTS examples         JSONB,');
p1.push('  ADD COLUMN IF NOT EXISTS common_mistakes  JSONB,');
p1.push('  ADD COLUMN IF NOT EXISTS videos           JSONB;');
p1.push('');
p1.push('ALTER TABLE public.questions');
p1.push('  ADD COLUMN IF NOT EXISTS explanation  TEXT,');
p1.push('  ADD COLUMN IF NOT EXISTS points       SMALLINT DEFAULT 1;');
p1.push('');
p1.push('CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_grade_slug');
p1.push('  ON public.topics (grade, slug)');
p1.push('  WHERE slug IS NOT NULL;');
p1.push('');
p1.push('CREATE INDEX IF NOT EXISTS idx_topics_grade_sort');
p1.push('  ON public.topics (grade, sort_order);');
p1.push('');
// Reset sequence — kunci mencegah duplicate key
p1.push('-- Reset sequence agar INSERT baru tidak bentrok dengan ID yang sudah ada');
p1.push('DO $$');
p1.push('DECLARE');
p1.push('  max_id_topics   BIGINT;');
p1.push('  max_id_questions BIGINT;');
p1.push('BEGIN');
p1.push('  SELECT COALESCE(MAX(id), 0) INTO max_id_topics    FROM public.topics;');
p1.push('  SELECT COALESCE(MAX(id), 0) INTO max_id_questions FROM public.questions;');
p1.push('  PERFORM setval(pg_get_serial_sequence(\'public.topics\',    \'id\'), GREATEST(max_id_topics,    1));');
p1.push('  PERFORM setval(pg_get_serial_sequence(\'public.questions\', \'id\'), GREATEST(max_id_questions, 1));');
p1.push('END $$;');
p1.push('');
p1.push('COMMIT;');
p1.push('');
p1.push('-- Verifikasi:');
p1.push('-- SELECT column_name FROM information_schema.columns');
p1.push('-- WHERE table_name=\'topics\' AND table_schema=\'public\';');

fs.writeFileSync(path.join(DB_DIR, 'part1_schema.sql'), p1.join('\n'), 'utf-8');

// ── PART 2: Topics ─────────────────────────────────────────────────────────
const p2 = [];
p2.push('-- PART 2: Topics — jalankan SETELAH part1 berhasil');
p2.push('-- UPDATE topik yang sudah ada (by grade+title)');
p2.push('-- INSERT topik baru (WHERE NOT EXISTS)');
p2.push('');
p2.push('BEGIN;');
p2.push('');
p2.push('-- Pastikan sequence aman (jalankan setiap part)');
p2.push('DO $$');
p2.push('DECLARE max_id BIGINT;');
p2.push('BEGIN');
p2.push('  SELECT COALESCE(MAX(id), 0) INTO max_id FROM public.topics;');
p2.push('  PERFORM setval(pg_get_serial_sequence(\'public.topics\', \'id\'), GREATEST(max_id, 1));');
p2.push('END $$;');
p2.push('');

for (const t of allTopics) {
  const g   = t.grade;
  const tit = sq(t.title);
  p2.push(`-- Kelas ${g}: ${t.title}`);
  p2.push(`UPDATE public.topics SET`);
  p2.push(`  slug            = ${sq(t.slug)},`);
  p2.push(`  sort_order      = ${t.sort_order ?? 'NULL'},`);
  p2.push(`  summary         = ${sq(t.summary)},`);
  p2.push(`  content         = ${sq(t.content)},`);
  p2.push(`  objectives      = ${jsonSq(t.objectives)},`);
  p2.push(`  examples        = ${jsonSq(t.examples)},`);
  p2.push(`  common_mistakes = ${jsonSq(t.common_mistakes)},`);
  p2.push(`  videos          = ${jsonSq(t.videos)}`);
  p2.push(`WHERE grade = ${g} AND title = ${tit};`);
  p2.push('');
  p2.push(`INSERT INTO public.topics (grade, slug, title, sort_order, summary, content, objectives, examples, common_mistakes, videos)`);
  p2.push(`SELECT ${g}, ${sq(t.slug)}, ${tit}, ${t.sort_order ?? 'NULL'},`);
  p2.push(`  ${sq(t.summary)}, ${sq(t.content)},`);
  p2.push(`  ${jsonSq(t.objectives)}, ${jsonSq(t.examples)},`);
  p2.push(`  ${jsonSq(t.common_mistakes)}, ${jsonSq(t.videos)}`);
  p2.push(`WHERE NOT EXISTS (`);
  p2.push(`  SELECT 1 FROM public.topics WHERE grade = ${g} AND title = ${tit}`);
  p2.push(`);`);
  p2.push('');
}

p2.push('UPDATE public.topics SET sort_order = id WHERE sort_order IS NULL;');
p2.push('');
p2.push('COMMIT;');
p2.push('');
p2.push('-- Verifikasi:');
p2.push('-- SELECT grade, count(*), count(slug) AS punya_slug FROM topics GROUP BY grade ORDER BY grade;');

fs.writeFileSync(path.join(DB_DIR, 'part2_topics.sql'), p2.join('\n'), 'utf-8');

// ── PART 3: Questions ──────────────────────────────────────────────────────
const p3 = [];
p3.push('-- PART 3: Questions — jalankan SETELAH part2 berhasil');
p3.push('-- INSERT soal baru (WHERE NOT EXISTS — tidak timpa soal lama)');
p3.push('');
p3.push('BEGIN;');
p3.push('');
p3.push('-- Pastikan sequence aman');
p3.push('DO $$');
p3.push('DECLARE max_id BIGINT;');
p3.push('BEGIN');
p3.push('  SELECT COALESCE(MAX(id), 0) INTO max_id FROM public.questions;');
p3.push('  PERFORM setval(pg_get_serial_sequence(\'public.questions\', \'id\'), GREATEST(max_id, 1));');
p3.push('END $$;');
p3.push('');

let totalQ = 0;
for (const t of allTopics) {
  if (!t.questions?.length) continue;
  p3.push(`-- Soal Kelas ${t.grade}: ${t.title}`);
  for (const q of t.questions) {
    totalQ++;
    p3.push(`INSERT INTO public.questions (topic_id, body, options, answer, explanation, points)`);
    p3.push(`SELECT t.id, ${sq(q.body)}, ${jsonSq(q.options)}, to_jsonb(${q.answer ?? 0}::int), ${sq(q.explanation ?? null)}, ${q.points ?? 1}`);
    p3.push(`FROM public.topics t`);
    p3.push(`WHERE t.grade = ${t.grade} AND t.title = ${sq(t.title)}`);
    p3.push(`  AND NOT EXISTS (`);
    p3.push(`    SELECT 1 FROM public.questions qq`);
    p3.push(`    WHERE qq.topic_id = t.id AND qq.body = ${sq(q.body)}`);
    p3.push(`  );`);
  }
  p3.push('');
}

p3.push('COMMIT;');
p3.push('');
p3.push('-- Verifikasi akhir:');
p3.push('-- SELECT t.grade, t.title, count(q.id) AS soal');
p3.push('-- FROM topics t LEFT JOIN questions q ON q.topic_id = t.id');
p3.push('-- GROUP BY t.grade, t.title ORDER BY t.grade, t.sort_order;');

fs.writeFileSync(path.join(DB_DIR, 'part3_questions.sql'), p3.join('\n'), 'utf-8');

// Ringkasan
const s1 = (fs.statSync(path.join(DB_DIR, 'part1_schema.sql')).size   / 1024).toFixed(1);
const s2 = (fs.statSync(path.join(DB_DIR, 'part2_topics.sql')).size   / 1024).toFixed(1);
const s3 = (fs.statSync(path.join(DB_DIR, 'part3_questions.sql')).size / 1024).toFixed(1);

console.log(`\n✅ Berhasil dibuat 3 file di database/:`);
console.log(`   part1_schema.sql    ${s1} KB  — ALTER TABLE + sequence reset`);
console.log(`   part2_topics.sql    ${s2} KB  — UPDATE + INSERT ${allTopics.length} topik`);
console.log(`   part3_questions.sql ${s3} KB  — INSERT ${totalQ} soal`);
console.log('');
console.log('📋 CARA PAKAI (urut):');
console.log('   1. Supabase SQL Editor → New query → paste part1_schema.sql → RUN');
console.log('   2. New query lagi → paste part2_topics.sql → RUN');
console.log('   3. New query lagi → paste part3_questions.sql → RUN');
console.log('   Selesai! Cek dengan query verifikasi di akhir tiap file.');
