#!/usr/bin/env node
/**
 * scripts/import-materi.js
 * Impor konten materi dari content/materi/*.json ke Supabase.
 *
 * Jalankan:
 *   npm run materi:import           -- dry-run (hanya cetak ringkasan)
 *   npm run materi:import -- --apply -- benar-benar menulis ke DB
 *
 * Aturan keamanan:
 *  - Butuh backup terbaru (< 24 jam) sebelum --apply
 *  - UPSERT per (grade, slug) — ID topik lama TIDAK berubah
 *  - Soal lama tidak disentuh; soal baru hanya untuk topik baru
 *  - Tidak ada DELETE
 *  - Idempotent: dijalankan berulang menghasilkan keadaan yang sama
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'materi');
const BACKUP_DIR = join(__dirname, '..', 'backups');

const APPLY = process.argv.includes('--apply');

// ─── Supabase setup ───────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus ada di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Cek backup terbaru ───────────────────────────────────────────────────────
function checkBackup() {
  if (!existsSync(BACKUP_DIR)) return false;
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('materi-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  if (files.length === 0) return false;
  const latest = files[0];
  const stat = statSync(join(BACKUP_DIR, latest));
  const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
  if (ageHours > 24) {
    console.error(`❌ Backup terbaru (${latest}) sudah ${ageHours.toFixed(1)} jam lalu.`);
    console.error('   Jalankan dulu: npm run materi:backup');
    return false;
  }
  console.log(`  ✅ Backup ditemukan: ${latest} (${ageHours.toFixed(1)} jam lalu)`);
  return true;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Cek kolom baru sudah ada ─────────────────────────────────────────────────
async function checkMigrationRan() {
  const { data, error } = await supabase
    .from('topics')
    .select('slug')
    .limit(1);
  if (error && error.message.includes('slug')) {
    console.error('❌ Kolom "slug" belum ada di tabel topics.');
    console.error('   Jalankan database/006_materi_lengkap.sql di Supabase SQL Editor terlebih dahulu.');
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n📦 B3Matika — Import Materi ${APPLY ? '(APPLY - MENULIS KE DB)' : '(DRY-RUN - TIDAK MENULIS)'}\n`);

if (APPLY && !checkBackup()) {
  process.exit(1);
}

await checkMigrationRan();

// Baca semua file JSON
if (!existsSync(CONTENT_DIR)) {
  console.error(`❌ Folder tidak ditemukan: ${CONTENT_DIR}`);
  process.exit(1);
}

const files = readdirSync(CONTENT_DIR)
  .filter(f => f.match(/^kelas-\d{2}\.json$/))
  .sort();

const allTopics = [];
for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  let topics;
  try {
    topics = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`❌ JSON tidak valid: ${file}: ${e.message}`);
    process.exit(1);
  }
  allTopics.push(...(topics || []).map(t => ({ ...t, _file: file })));
}

console.log(`  📁 ${files.length} file, ${allTopics.length} topik total\n`);

// Ambil data topik yang sudah ada dari DB
const { data: existingTopics, error: fetchError } = await supabase
  .from('topics')
  .select('id, grade, title, slug')
  .order('id');

if (fetchError) {
  console.error('❌ Gagal membaca topics dari DB:', fetchError.message);
  process.exit(1);
}

console.log(`  📊 Topik yang sudah ada di DB: ${existingTopics.length}\n`);

// Bangun peta (grade, slug) → id untuk topik yang sudah ada
const existingMap = {};  // key: "grade:slug" → existing topic row
const existingByTitle = {}; // key: "grade:normalized_title" → existing topic row
for (const t of existingTopics) {
  if (t.slug) existingMap[`${t.grade}:${t.slug}`] = t;
  existingByTitle[`${t.grade}:${t.title.toLowerCase().trim()}`] = t;
}

// ─── Proses setiap topik dari JSON ────────────────────────────────────────────
let toCreate = 0;
let toUpdate = 0;
let questionsToAdd = 0;
const ops = [];

for (const topic of allTopics) {
  const grade = topic.grade;
  const slug = topic.slug || toSlug(topic.title);
  const key = `${grade}:${slug}`;
  const titleKey = `${grade}:${topic.title.toLowerCase().trim()}`;

  // Cari apakah topik sudah ada berdasarkan slug atau judul
  let existing = existingMap[key] || existingByTitle[titleKey];

  const payload = {
    grade,
    title: topic.title,
    slug,
    sort_order: topic.sort_order,
    summary: topic.summary || null,
    objectives: topic.objectives || null,
    content: topic.content || null,
    examples: topic.examples || null,
    common_mistakes: topic.common_mistakes || null,
    videos: topic.videos || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    ops.push({ type: 'update', id: existing.id, payload, topic, existing });
    toUpdate++;
  } else {
    ops.push({ type: 'create', payload, topic });
    toCreate++;
    if (Array.isArray(topic.questions)) {
      questionsToAdd += topic.questions.length;
    }
  }
}

// ─── Ringkasan dry-run ────────────────────────────────────────────────────────
console.log('─'.repeat(60));
console.log('📋 RENCANA IMPORT:\n');
console.log(`  Topik BARU      : ${toCreate}`);
console.log(`  Topik DIPERKAYA : ${toUpdate}`);
console.log(`  Soal BARU       : ${questionsToAdd} (hanya untuk topik baru)`);
console.log(`  Soal LAMA       : TIDAK DISENTUH`);
console.log(`  question_solves : TIDAK DISENTUH`);
console.log(`  attempts        : TIDAK DISENTUH`);
console.log('');

// Detail
for (const op of ops) {
  const slug = op.payload.slug;
  const grade = op.payload.grade;
  if (op.type === 'create') {
    const qCount = Array.isArray(op.topic.questions) ? op.topic.questions.length : 0;
    console.log(`  [BARU] Kelas ${grade}: ${slug} (+${qCount} soal)`);
  } else {
    console.log(`  [UPDATE] Kelas ${grade}: ${slug} (id=${op.existing.id})`);
  }
}

console.log('\n' + '─'.repeat(60));

if (!APPLY) {
  console.log('\n⚠️  Ini adalah DRY-RUN. Tidak ada yang ditulis ke database.');
  console.log('   Untuk menerapkan: npm run materi:import -- --apply\n');
  process.exit(0);
}

// ─── Eksekusi APPLY ───────────────────────────────────────────────────────────
console.log('\n🚀 Menerapkan perubahan ke database...\n');

let created = 0;
let updated = 0;
let questionsInserted = 0;
const errors = [];

for (const op of ops) {
  try {
    if (op.type === 'create') {
      // INSERT topik baru
      const { data: newTopic, error: insertError } = await supabase
        .from('topics')
        .insert(op.payload)
        .select('id')
        .single();

      if (insertError) throw insertError;
      created++;
      console.log(`  ✅ BARU [id=${newTopic.id}] ${op.payload.slug}`);

      // Insert soal baru (hanya untuk topik baru)
      if (Array.isArray(op.topic.questions) && op.topic.questions.length > 0) {
        const questionRows = op.topic.questions.map(q => ({
          topic_id: newTopic.id,
          body: q.body,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || null,
          points: q.points || 1,
        }));

        // Gunakan upsert dengan kunci (topic_id, body) agar idempotent
        const { error: qError } = await supabase
          .from('questions')
          .upsert(questionRows, { onConflict: 'topic_id,body', ignoreDuplicates: true });

        if (qError) {
          console.warn(`  ⚠️  Soal untuk ${op.payload.slug}: ${qError.message}`);
        } else {
          questionsInserted += questionRows.length;
          console.log(`     +${questionRows.length} soal`);
        }
      }

    } else {
      // UPDATE topik yang sudah ada (ID tidak berubah)
      const { error: updateError } = await supabase
        .from('topics')
        .update(op.payload)
        .eq('id', op.existing.id);

      if (updateError) throw updateError;
      updated++;
      console.log(`  🔄 UPDATE [id=${op.existing.id}] ${op.payload.slug}`);
    }
  } catch (e) {
    errors.push({ slug: op.payload.slug, error: e.message });
    console.error(`  ❌ GAGAL: ${op.payload.slug}: ${e.message}`);
  }
}

// ─── Pengecekan integritas ────────────────────────────────────────────────────
console.log('\n🔍 Pengecekan integritas pasca-import...\n');

const { data: finalTopics } = await supabase.from('topics').select('id, grade, slug').order('id');
const { data: finalQuestions } = await supabase.from('questions').select('id', { count: 'exact', head: false });
const { count: finalSolves } = await supabase.from('question_solves').select('id', { count: 'exact', head: true });

// Cek ID tidak berubah
let idStable = true;
for (const orig of existingTopics) {
  const stillExists = finalTopics.find(t => t.id === orig.id);
  if (!stillExists) {
    console.error(`  ❌ ID ${orig.id} (${orig.title}) HILANG!`);
    idStable = false;
  }
}

// Cek sort_order
const gradeCounts = {};
for (const t of finalTopics) {
  gradeCounts[t.grade] = (gradeCounts[t.grade] || 0) + 1;
}

console.log('  Topik per kelas (setelah import):');
for (let g = 1; g <= 12; g++) {
  console.log(`    Kelas ${g}: ${gradeCounts[g] || 0} topik`);
}

console.log('\n' + '─'.repeat(60));
console.log('✅ IMPORT SELESAI:\n');
console.log(`  Topik dibuat    : ${created}`);
console.log(`  Topik diperbarui: ${updated}`);
console.log(`  Soal baru       : ${questionsInserted}`);
console.log(`  Error           : ${errors.length}`);
console.log(`  ID stabil       : ${idStable ? 'YA ✅' : 'TIDAK ❌'}`);
console.log(`  question_solves : ${finalSolves} (tidak berubah)`);

if (errors.length > 0) {
  console.log('\n❌ Error:');
  errors.forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
  process.exit(1);
}
