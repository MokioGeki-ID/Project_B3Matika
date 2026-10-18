#!/usr/bin/env node
/**
 * scripts/validate-materi.js
 * Validasi struktur dan kualitas file JSON konten materi.
 *
 * Jalankan: npm run materi:validate
 *
 * Memeriksa:
 *  - JSON Schema (struktur wajib setiap topik)
 *  - Kelengkapan semua butir cakupan per kelas
 *  - Minimal 3 contoh per topik
 *  - Langkah tidak kosong
 *  - 2 entri video ATAU search_query tersedia
 *  - Panjang konten wajar
 *  - LaTeX syntax dasar (dollar sign balanced)
 *  - Kunci jawaban soal baru (answer dalam rentang options)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'materi');

// ─── Cakupan kurikulum (sumber kebenaran) ───────────────────────────────────
const CAKUPAN = {
  1: [
    'bilangan-cacah-sampai-20',
    'penjumlahan-pengurangan-dasar',
    'nilai-tempat-puluhan-satuan',
    'bangun-datar-bangun-ruang-sederhana',
    'pengukuran-satuan-tidak-baku',
    'diagram-gambar-sederhana',
  ],
  2: [
    'bilangan-cacah-sampai-100',
    'penjumlahan-menyimpan-pengurangan-meminjam',
    'dasar-perkalian-pembagian',
    'pengukuran-panjang-berat-waktu-uang',
    'pecahan-sederhana',
  ],
  3: [
    'bilangan-cacah-hingga-ribuan',
    'garis-bilangan-dasar',
    'perkalian-pembagian',
    'operasi-pecahan-sederhana',
    'keliling-luas-persegi-persegi-panjang',
    'sudut-siku-siku-lancip-tumpul',
  ],
  4: [
    'kelipatan-faktor-kpk-fpb',
    'pecahan-senilai-desimal-persen',
    'pembulatan-penaksiran',
    'sifat-bangun-datar-sudut',
    'statistika-penyajian-data-diagram-batang',
    'keliling-luas-persegi-panjang',
  ],
  5: [
    'operasi-hitung-pecahan',
    'kecepatan-debit-skala-jarak-waktu',
    'volume-kubus-balok',
    'penyajian-data-diagram-lingkaran',
    'penyajian-data-diagram-garis',
  ],
  6: [
    'bilangan-bulat-negatif-operasi-campuran',
    'rasio-proporsi-perbandingan',
    'luas-keliling-lingkaran',
    'volume-luas-permukaan-bangun-ruang',
    'statistika-mean-median-modus',
  ],
  7: [
    'bilangan-bulat-rasional',
    'bentuk-aljabar',
    'persamaan-pertidaksamaan-linear-satu-variabel',
    'rasio-perbandingan-senilai-berbalik-nilai',
    'aritmetika-sosial',
    'statistika-penyajian-data-kelompok',
  ],
  8: [
    'relasi-fungsi',
    'persamaan-garis-lurus',
    'sistem-persamaan-linear-dua-variabel',
    'teorema-pythagoras',
    'bangun-ruang-sisi-datar',
    'statistika-dasar',
    'peluang-dasar',
  ],
  9: [
    'eksponen-bentuk-akar',
    'persamaan-kuadrat',
    'fungsi-kuadrat',
    'transformasi-geometri',
    'kesebangunan-kekongruenan',
    'bangun-ruang-sisi-lengkung',
  ],
  10: [
    'eksponen-logaritma',
    'barisan-deret-aritmetika-geometri',
    'vektor-r2-r3',
    'trigonometri-dasar',
    'sistem-persamaan-linear-tiga-variabel',
    'fungsi-kuadrat-lanjutan',
    'statistika-analitis-peluang',
  ],
  11: [
    'komposisi-fungsi-invers',
    'persamaan-lingkaran',
    'logika-matematika',
    'matriks',
    'transformasi-geometri-matriks',
    'kombinatorika',
    'peluang-kejadian-majemuk',
  ],
  12: [
    'limit-fungsi',
    'turunan-fungsi',
    'integral',
    'geometri-dimensi-tiga',
    'polinomial',
    'distribusi-normal-statistika-inferensial',
    'matematika-finansial',
  ],
};

// ─── Helper ──────────────────────────────────────────────────────────────────
const errors = [];
const warnings = [];
let totalTopics = 0;
let validTopics = 0;

function err(file, slug, msg) {
  errors.push(`  ❌ [${file}] ${slug}: ${msg}`);
}
function warn(file, slug, msg) {
  warnings.push(`  ⚠️  [${file}] ${slug}: ${msg}`);
}

function checkLatex(content, file, slug) {
  // Cek dollar sign balanced
  const singles = (content.match(/(?<!\$)\$(?!\$)/g) || []).length;
  const doubles = (content.match(/\$\$/g) || []).length;
  if (singles % 2 !== 0) warn(file, slug, `LaTeX inline $...$ mungkin tidak seimbang (${singles} tanda $)`);
  if (doubles % 2 !== 0) warn(file, slug, `LaTeX display $$...$$ mungkin tidak seimbang (${doubles} tanda $$)`);
}

function validateTopic(topic, file) {
  totalTopics++;
  const slug = topic.slug || '(tanpa slug)';

  // Wajib ada
  const required = ['grade', 'slug', 'title', 'sort_order', 'summary', 'objectives', 'content', 'examples', 'common_mistakes', 'videos'];
  for (const field of required) {
    if (topic[field] === undefined || topic[field] === null) {
      err(file, slug, `Field wajib '${field}' tidak ada`);
    }
  }

  // grade
  if (topic.grade < 1 || topic.grade > 12) err(file, slug, `grade harus 1-12, dapat ${topic.grade}`);

  // summary: 2-3 kalimat
  if (topic.summary) {
    const sentences = topic.summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentences < 2) warn(file, slug, `summary sebaiknya 2-3 kalimat (dapat ${sentences})`);
  }

  // objectives: 3-5 item
  if (Array.isArray(topic.objectives)) {
    if (topic.objectives.length < 3) err(file, slug, `objectives minimal 3 item, dapat ${topic.objectives.length}`);
    if (topic.objectives.length > 5) warn(file, slug, `objectives sebaiknya maks 5 item, dapat ${topic.objectives.length}`);
    topic.objectives.forEach((o, i) => {
      if (typeof o !== 'string' || o.trim().length === 0) err(file, slug, `objectives[${i}] kosong atau bukan string`);
    });
  } else {
    err(file, slug, 'objectives harus berupa array');
  }

  // content: panjang wajar
  if (topic.content) {
    const len = topic.content.length;
    const grade = topic.grade;
    const minLen = grade <= 6 ? 200 : grade <= 9 ? 400 : 600;
    const maxLen = grade <= 6 ? 3000 : grade <= 9 ? 5000 : 8000;
    if (len < minLen) warn(file, slug, `Konten terlalu pendek: ${len} karakter (min ${minLen})`);
    if (len > maxLen) warn(file, slug, `Konten sangat panjang: ${len} karakter (maks ${maxLen})`);
    checkLatex(topic.content, file, slug);
  }

  // examples: minimal 3
  if (Array.isArray(topic.examples)) {
    if (topic.examples.length < 3) err(file, slug, `Minimal 3 contoh, dapat ${topic.examples.length}`);
    topic.examples.forEach((ex, i) => {
      if (!ex.level) err(file, slug, `examples[${i}].level wajib ada`);
      if (!ex.problem) err(file, slug, `examples[${i}].problem wajib ada`);
      if (!Array.isArray(ex.steps) || ex.steps.length === 0) err(file, slug, `examples[${i}].steps harus array tidak kosong`);
      else {
        ex.steps.forEach((s, j) => {
          if (typeof s !== 'string' || s.trim().length === 0) err(file, slug, `examples[${i}].steps[${j}] kosong`);
        });
      }
      if (!ex.answer) err(file, slug, `examples[${i}].answer wajib ada`);
    });
    const levels = new Set(topic.examples.map(e => e.level));
    if (!levels.has('mudah')) warn(file, slug, 'Tidak ada contoh level "mudah"');
    if (!levels.has('sedang')) warn(file, slug, 'Tidak ada contoh level "sedang"');
    if (!levels.has('sulit')) warn(file, slug, 'Tidak ada contoh level "sulit"');
  } else {
    err(file, slug, 'examples harus berupa array');
  }

  // common_mistakes: 2-3 item
  if (Array.isArray(topic.common_mistakes)) {
    if (topic.common_mistakes.length < 2) err(file, slug, `Minimal 2 common_mistakes, dapat ${topic.common_mistakes.length}`);
    topic.common_mistakes.forEach((m, i) => {
      if (!m.mistake) err(file, slug, `common_mistakes[${i}].mistake wajib ada`);
      if (!m.fix) err(file, slug, `common_mistakes[${i}].fix wajib ada`);
    });
  } else {
    err(file, slug, 'common_mistakes harus berupa array');
  }

  // videos: 2 entri, atau search_query
  if (Array.isArray(topic.videos)) {
    const hasVideo = topic.videos.some(v => v.youtube_id || v.search_query);
    if (!hasVideo) err(file, slug, 'Setiap video harus punya youtube_id ATAU search_query');
    if (topic.videos.length < 2) warn(file, slug, `Sebaiknya 2 video (konsep + contoh-soal), dapat ${topic.videos.length}`);
    topic.videos.forEach((v, i) => {
      if (!['konsep', 'contoh-soal'].includes(v.purpose)) err(file, slug, `videos[${i}].purpose harus "konsep" atau "contoh-soal"`);
      if (v.youtube_id && v.youtube_id.length !== 11) warn(file, slug, `videos[${i}].youtube_id tampak tidak valid (panjang bukan 11 karakter)`);
      if (v.youtube_id && !v.verified_at) err(file, slug, `videos[${i}] punya youtube_id tapi tidak ada verified_at`);
      // Cek tidak ada domain non-YouTube
      if (v.url && !v.url.includes('youtube.com') && !v.url.includes('youtu.be')) {
        err(file, slug, `videos[${i}].url bukan URL YouTube`);
      }
    });
  } else {
    err(file, slug, 'videos harus berupa array');
  }

  // questions (opsional, untuk topik baru)
  if (Array.isArray(topic.questions)) {
    topic.questions.forEach((q, i) => {
      if (!q.body) err(file, slug, `questions[${i}].body wajib ada`);
      if (!Array.isArray(q.options) || q.options.length < 2) err(file, slug, `questions[${i}].options harus array min 2`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.options || []).length) {
        err(file, slug, `questions[${i}].answer=${q.answer} di luar rentang options`);
      }
      if (![1, 2, 3].includes(q.points)) warn(file, slug, `questions[${i}].points sebaiknya 1-3`);
    });
  }

  if (!errors.find(e => e.includes(slug))) validTopics++;
}

// ─── Cek kelengkapan cakupan kurikulum ───────────────────────────────────────
function checkCoverage(allTopics) {
  console.log('\n📋 KELENGKAPAN CAKUPAN KURIKULUM:\n');
  let missingCount = 0;
  for (let grade = 1; grade <= 12; grade++) {
    const required = CAKUPAN[grade] || [];
    const existing = allTopics.filter(t => t.grade === grade).map(t => t.slug);
    const missing = required.filter(s => !existing.includes(s));
    const extra = existing.filter(s => !required.includes(s));

    if (missing.length > 0) {
      console.log(`  Kelas ${grade}: ❌ Belum ada: ${missing.join(', ')}`);
      missingCount += missing.length;
    } else {
      console.log(`  Kelas ${grade}: ✅ Lengkap (${existing.length} topik)`);
    }
    if (extra.length > 0) {
      console.log(`  Kelas ${grade}: ℹ️  Slug di luar cakupan: ${extra.join(', ')}`);
    }
  }
  if (missingCount > 0) {
    console.log(`\n  ⚠️  Total topik kurikulum yang belum ada: ${missingCount}`);
  }
  return missingCount;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('🔍 B3Matika — Validasi Konten Materi\n');
console.log(`   Direktori: ${CONTENT_DIR}\n`);

if (!existsSync(CONTENT_DIR)) {
  console.error(`❌ Folder tidak ditemukan: ${CONTENT_DIR}`);
  console.error('   Buat folder content/materi/ dan isi file kelas-01.json dst.');
  process.exit(1);
}

const files = readdirSync(CONTENT_DIR)
  .filter(f => f.match(/^kelas-\d{2}\.json$/))
  .sort();

if (files.length === 0) {
  console.error('❌ Tidak ada file kelas-XX.json di content/materi/');
  process.exit(1);
}

console.log(`📁 Ditemukan ${files.length} file:\n`);

const allTopics = [];

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  let topics;
  try {
    topics = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    errors.push(`❌ [${file}] JSON tidak valid: ${e.message}`);
    continue;
  }
  if (!Array.isArray(topics)) {
    errors.push(`❌ [${file}] Root harus berupa array`);
    continue;
  }
  console.log(`  ${file}: ${topics.length} topik`);
  topics.forEach(t => validateTopic(t, file));
  allTopics.push(...topics);
}

const missingCount = checkCoverage(allTopics);

// ─── Laporan ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log('📊 RINGKASAN VALIDASI:\n');
console.log(`  Total topik     : ${totalTopics}`);
console.log(`  Valid (no error): ${validTopics}`);
console.log(`  Error           : ${errors.length}`);
console.log(`  Peringatan      : ${warnings.length}`);
console.log(`  Missing cakupan : ${missingCount}`);

if (errors.length > 0) {
  console.log('\n❌ ERROR:\n');
  errors.forEach(e => console.log(e));
}
if (warnings.length > 0) {
  console.log('\n⚠️  PERINGATAN:\n');
  warnings.forEach(w => console.log(w));
}

console.log('\n' + '─'.repeat(60));
if (errors.length === 0 && missingCount === 0) {
  console.log('✅ Semua validasi lulus!');
  process.exit(0);
} else {
  console.log('❌ Validasi gagal. Perbaiki error di atas sebelum import.');
  process.exit(1);
}
