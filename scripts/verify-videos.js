#!/usr/bin/env node
/**
 * scripts/verify-videos.js
 * Verifikasi video YouTube di content/materi/*.json via oEmbed API.
 *
 * Jalankan: npm run materi:verify-videos
 *
 * Untuk setiap entri video yang punya youtube_id:
 *  - Panggil https://www.youtube.com/oembed?url=<URL>&format=json
 *  - Status 200 + field title/author_name = video valid dan dapat disematkan
 *  - Status 401/404 atau error = tolak (video hilang / tidak boleh disematkan)
 *
 * Output:
 *  - Tabel: topik | tujuan | status | judul | kanal
 *  - Daftar yang gagal (harus diperbaiki)
 *  - Daftar yang pakai search_query (fallback)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content', 'materi');

// ─── Helper HTTP GET ──────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Verifikasi satu video ────────────────────────────────────────────────────
async function verifyVideo(youtubeId, topicSlug, purpose) {
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  try {
    const { status, body } = await httpsGet(oembedUrl);
    if (status === 200) {
      const data = JSON.parse(body);
      if (data.title && data.author_name) {
        return {
          ok: true,
          youtubeId,
          topicSlug,
          purpose,
          title: data.title,
          channel: data.author_name,
          status,
        };
      }
      return { ok: false, youtubeId, topicSlug, purpose, reason: 'oEmbed tidak mengembalikan title/author_name', status };
    }
    return { ok: false, youtubeId, topicSlug, purpose, reason: `HTTP ${status}`, status };
  } catch (e) {
    return { ok: false, youtubeId, topicSlug, purpose, reason: e.message, status: 0 };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('🎬 B3Matika — Verifikasi Video YouTube\n');
console.log('   Memanggil oEmbed API untuk setiap youtube_id...\n');

if (!existsSync(CONTENT_DIR)) {
  console.error(`❌ Folder tidak ditemukan: ${CONTENT_DIR}`);
  process.exit(1);
}

const files = readdirSync(CONTENT_DIR)
  .filter(f => f.match(/^kelas-\d{2}\.json$/))
  .sort();

const toVerify = [];   // { youtubeId, topicSlug, grade, purpose, file }
const fallbacks = [];  // { topicSlug, grade, purpose, searchQuery }

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  let topics;
  try {
    topics = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    console.error(`❌ JSON tidak valid: ${file}`);
    continue;
  }

  for (const topic of (topics || [])) {
    for (const video of (topic.videos || [])) {
      if (video.youtube_id) {
        toVerify.push({
          youtubeId: video.youtube_id,
          topicSlug: topic.slug,
          grade: topic.grade,
          purpose: video.purpose,
          file,
        });
      } else if (video.search_query) {
        fallbacks.push({
          topicSlug: topic.slug,
          grade: topic.grade,
          purpose: video.purpose,
          searchQuery: video.search_query,
          file,
        });
      }
    }
  }
}

console.log(`  📌 Video dengan youtube_id : ${toVerify.length}`);
console.log(`  🔍 Video dengan search_query (fallback): ${fallbacks.length}\n`);

// Verifikasi semua video
const results = [];
for (const v of toVerify) {
  process.stdout.write(`  Mengecek ${v.youtubeId} (${v.topicSlug}/${v.purpose})... `);
  const result = await verifyVideo(v.youtubeId, v.topicSlug, v.purpose);
  result.grade = v.grade;
  result.file = v.file;
  results.push(result);
  console.log(result.ok ? `✅ "${result.title}"` : `❌ ${result.reason}`);
  // Jeda kecil untuk tidak membebani server
  await new Promise(r => setTimeout(r, 300));
}

// ─── Laporan ──────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.ok);
const failed = results.filter(r => !r.ok);

console.log('\n' + '─'.repeat(70));
console.log('📊 HASIL VERIFIKASI VIDEO:\n');
console.log(`  ✅ Lulus  : ${passed.length}`);
console.log(`  ❌ Gagal  : ${failed.length}`);
console.log(`  🔍 Fallback (search_query): ${fallbacks.length}`);

if (passed.length > 0) {
  console.log('\n✅ VIDEO TERVERIFIKASI:\n');
  console.log('  ' + ['Kelas', 'Slug', 'Tujuan', 'Judul', 'Kanal'].join(' | '));
  console.log('  ' + '-'.repeat(90));
  for (const r of passed) {
    const title = (r.title || '').substring(0, 40).padEnd(40);
    const channel = (r.channel || '').substring(0, 25);
    console.log(`  ${String(r.grade).padEnd(5)} | ${(r.topicSlug || '').substring(0, 35).padEnd(35)} | ${(r.purpose || '').padEnd(10)} | ${title} | ${channel}`);
  }
}

if (failed.length > 0) {
  console.log('\n❌ VIDEO GAGAL VERIFIKASI (harus diganti dengan search_query):\n');
  for (const r of failed) {
    console.log(`  - [${r.file}] ${r.topicSlug} / ${r.purpose}`);
    console.log(`    youtube_id: ${r.youtubeId} | Alasan: ${r.reason}`);
  }
}

if (fallbacks.length > 0) {
  console.log('\n🔍 TOPIK YANG MEMAKAI FALLBACK search_query:\n');
  for (const f of fallbacks) {
    console.log(`  - [Kelas ${f.grade}] ${f.topicSlug} / ${f.purpose}`);
    console.log(`    Query: "${f.searchQuery}"`);
  }
}

// Simpan laporan JSON
const reportPath = join(__dirname, '..', 'content', 'video-verification-report.json');
const report = {
  generatedAt: new Date().toISOString(),
  summary: { passed: passed.length, failed: failed.length, fallbacks: fallbacks.length },
  passed,
  failed,
  fallbacks,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n  📄 Laporan disimpan: ${reportPath}`);

console.log('\n' + '─'.repeat(70));
if (failed.length > 0) {
  console.log('⚠️  Ada video yang gagal verifikasi. Ganti youtube_id dengan search_query.');
  process.exit(1);
} else {
  console.log('✅ Semua video yang punya youtube_id berhasil diverifikasi.');
  process.exit(0);
}
