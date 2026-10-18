#!/usr/bin/env node
/**
 * scripts/backup-materi.js
 * Ekspor data topics, questions, dan ringkasan question_solves ke JSON bertanggal.
 *
 * Jalankan: npm run materi:backup
 *
 * Output: backups/materi-backup-YYYY-MM-DD_HH-MM-SS.json
 * Folder backups/ ada di .gitignore (tidak ikut ke GitHub).
 *
 * Script import-materi.js menolak berjalan tanpa backup terbaru (< 24 jam).
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '..', 'backups');

// ─── Supabase setup ───────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus ada di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('💾 B3Matika — Backup Materi\n');

// Buat folder backups jika belum ada
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`  📁 Folder dibuat: ${BACKUP_DIR}`);
}

// Ambil semua topics
console.log('  Mengambil tabel topics...');
const { data: topics, error: topicsError } = await supabase
  .from('topics')
  .select('*')
  .order('id');
if (topicsError) {
  console.error('❌ Gagal mengambil topics:', topicsError.message);
  process.exit(1);
}

// Ambil semua questions
console.log('  Mengambil tabel questions...');
const { data: questions, error: questionsError } = await supabase
  .from('questions')
  .select('*')
  .order('id');
if (questionsError) {
  console.error('❌ Gagal mengambil questions:', questionsError.message);
  process.exit(1);
}

// Hitung question_solves (tidak ekspor detail untuk privasi, hanya jumlah)
console.log('  Menghitung question_solves...');
const { count: solvesCount, error: solvesError } = await supabase
  .from('question_solves')
  .select('id', { count: 'exact', head: true });
if (solvesError) {
  console.warn('  ⚠️  Gagal menghitung question_solves:', solvesError.message);
}

// Hitung attempts
const { count: attemptsCount } = await supabase
  .from('attempts')
  .select('id', { count: 'exact', head: true });

// Susun backup
const backup = {
  createdAt: new Date().toISOString(),
  version: '006',
  summary: {
    topics: topics.length,
    questions: questions.length,
    question_solves: solvesCount ?? '(tidak dapat dihitung)',
    attempts: attemptsCount ?? '(tidak dapat dihitung)',
  },
  topics,
  questions,
};

// Nama file bertanggal
const now = new Date();
const dateStr = now.toISOString()
  .replace('T', '_')
  .replace(/:/g, '-')
  .split('.')[0];
const filename = `materi-backup-${dateStr}.json`;
const filePath = join(BACKUP_DIR, filename);

writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');

console.log('\n✅ Backup berhasil!\n');
console.log(`  📄 File  : ${filePath}`);
console.log(`  📊 Topics: ${backup.summary.topics}`);
console.log(`  📝 Soal  : ${backup.summary.questions}`);
console.log(`  👤 Solves: ${backup.summary.question_solves}`);
console.log(`  🔁 Attempts: ${backup.summary.attempts}`);
console.log('\n  Simpan file ini dengan aman. Jangan commit ke GitHub.');
