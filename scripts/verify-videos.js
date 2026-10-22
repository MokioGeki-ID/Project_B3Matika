/**
 * verify-videos.js  — B3Matika Video Verifier
 * ─────────────────────────────────────────────────────────────────────────────
 * Membaca content/videos/*.json (dan content/materi/*.json jika ada field videos)
 * lalu memanggil YouTube oEmbed API untuk memverifikasi setiap youtube_id.
 *
 * Penggunaan:
 *   node scripts/verify-videos.js           # dry-run (hanya laporan)
 *   node scripts/verify-videos.js --write   # tulis hasil ke JSON
 *   node scripts/verify-videos.js --grade 4 # filter satu kelas
 *
 * npm run materi:verify-videos
 * npm run materi:verify-videos -- --write
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────
const OEMBED_BASE  = 'https://www.youtube.com/oembed?format=json&url=';
const TIMEOUT_MS   = 8_000;
const DELAY_MS     = 700;          // jeda antar request agar tidak rate-limit
const MAX_RETRIES  = 2;

const VALID_HOSTS  = ['youtube.com', 'www.youtube.com', 'youtu.be',
                      'www.youtube-nocookie.com', 'youtube-nocookie.com'];

// ── CLI args ──────────────────────────────────────────────────────────────────
const WRITE_MODE   = process.argv.includes('--write');
const GRADE_FILTER = (() => {
  const i = process.argv.indexOf('--grade');
  return i !== -1 ? Number(process.argv[i + 1]) : null;
})();
const TODAY        = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Normalise string untuk perbandingan judul */
function normalise(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Hitung kesamaan kata (Jaccard sederhana) */
function titleSimilarity(a, b) {
  const setA = new Set(normalise(a).split(' ').filter(Boolean));
  const setB = new Set(normalise(b).split(' ').filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  const inter = [...setA].filter(w => setB.has(w)).length;
  const union  = new Set([...setA, ...setB]).size;
  return inter / union;
}

function isValidYouTubeUrl(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return VALID_HOSTS.some(v => v.replace(/^www\./, '') === h);
  } catch { return false; }
}

/**
 * Panggil oEmbed dengan retry.
 * Return: { ok: true, data } | { ok: false, httpStatus, error }
 */
async function fetchOEmbed(youtubeId) {
  const videoUrl  = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembedUrl = OEMBED_BASE + encodeURIComponent(videoUrl);

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res        = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        return { ok: true, httpStatus: res.status, data };
      }
      // 401/403/404 → tidak ada gunanya retry
      return { ok: false, httpStatus: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      if (attempt > MAX_RETRIES) {
        return { ok: false, httpStatus: null, error: err.message };
      }
      await sleep(DELAY_MS * attempt * 2);
    }
  }
}

// ── Baca semua file video ─────────────────────────────────────────────────────

function readVideoFiles() {
  const results = [];

  // content/videos/*.json
  const vidDir = path.join(ROOT, 'content', 'videos');
  if (fs.existsSync(vidDir)) {
    for (const f of fs.readdirSync(vidDir).filter(f => f.endsWith('.json')).sort()) {
      const grade = parseInt(f.match(/\d+/)?.[0] ?? '0', 10);
      if (GRADE_FILTER && grade !== GRADE_FILTER) continue;
      const data  = JSON.parse(fs.readFileSync(path.join(vidDir, f), 'utf-8'));
      results.push({ filePath: path.join(vidDir, f), data, source: 'videos' });
    }
  }

  // content/materi/*.json — field videos di tiap topik
  const matDir = path.join(ROOT, 'content', 'materi');
  if (fs.existsSync(matDir)) {
    for (const f of fs.readdirSync(matDir).filter(f => f.endsWith('.json')).sort()) {
      const grade = parseInt(f.match(/\d+/)?.[0] ?? '0', 10);
      if (GRADE_FILTER && grade !== GRADE_FILTER) continue;
      const topics = JSON.parse(fs.readFileSync(path.join(matDir, f), 'utf-8'));
      const hasVids = topics.some(t => t.videos?.length);
      if (!hasVids) continue;
      // Bungkus ke format yang sama
      results.push({
        filePath : path.join(matDir, f),
        data     : { grade, topics },
        source   : 'materi'
      });
    }
  }

  return results;
}

// ── Verify satu video ─────────────────────────────────────────────────────────

async function verifyVideo(entry) {
  const { youtube_id, url, gemini_claim_title, gemini_claim_channel } = entry;

  // Validasi URL host
  if (url && !isValidYouTubeUrl(url)) {
    return { ...entry, status: 'ditolak', reject_reason: 'host tidak valid', httpStatus: null };
  }

  const result = await fetchOEmbed(youtube_id);

  if (!result.ok) {
    return {
      ...entry,
      status      : 'ditolak',
      reject_reason: result.error,
      httpStatus  : result.httpStatus,
      title       : null,
      channel     : null
    };
  }

  const { title: oTitle, author_name: oChannel } = result.data;

  if (!oTitle || !oChannel) {
    return {
      ...entry,
      status      : 'ditolak',
      reject_reason: 'oEmbed tidak mengembalikan title/author_name',
      httpStatus  : result.httpStatus
    };
  }

  const sim = titleSimilarity(oTitle, gemini_claim_title ?? '');
  const titleMismatch = sim < 0.25;   // kurang dari 25% kata sama = sangat berbeda

  return {
    ...entry,
    status       : titleMismatch ? 'judul_tidak_cocok' : 'terverifikasi',
    httpStatus   : result.httpStatus,
    title        : oTitle,       // ← dari oEmbed (bukan Gemini)
    channel      : oChannel,     // ← dari oEmbed (bukan Gemini)
    verified_at  : TODAY,
    title_similarity: Math.round(sim * 100),
    title_mismatch  : titleMismatch
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  B3Matika — verify-videos.js`);
  console.log(`  Mode : ${WRITE_MODE ? 'WRITE (menulis ke JSON)' : 'DRY-RUN (hanya laporan)'}`);
  if (GRADE_FILTER) console.log(`  Filter kelas : ${GRADE_FILTER}`);
  console.log(`  Tanggal: ${TODAY}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const fileEntries = readVideoFiles();
  if (!fileEntries.length) {
    console.error('❌ Tidak ada file video ditemukan (content/videos/ kosong atau tidak ada).');
    process.exit(1);
  }

  // Kumpulkan semua video untuk proses
  const allJobs = [];
  for (const fe of fileEntries) {
    for (const topic of fe.data.topics ?? []) {
      for (const v of topic.videos ?? []) {
        if (!v.youtube_id) continue;
        allJobs.push({ fileEntry: fe, topic, video: v });
      }
    }
  }

  console.log(`📋 Total video ditemukan: ${allJobs.length}`);
  console.log(`   Mulai verifikasi oEmbed (jeda ${DELAY_MS}ms antar request)...\n`);

  const stats = { terverifikasi: 0, ditolak: 0, judul_tidak_cocok: 0, error_jaringan: 0 };
  const log   = [];

  // Jalankan berurutan — jangan parallel (rate limit YouTube)
  for (let i = 0; i < allJobs.length; i++) {
    const { fileEntry, topic, video } = allJobs[i];
    const prefix = `[${String(i + 1).padStart(2, '0')}/${allJobs.length}]`;

    process.stdout.write(`${prefix} K${String(fileEntry.data.grade).padStart(2,'0')} ${topic.slug} [${video.purpose}] ${video.youtube_id} ... `);

    const result = await verifyVideo(video);

    if (result.httpStatus === null && result.status === 'ditolak') stats.error_jaringan++;
    else if (result.status === 'ditolak')        stats.ditolak++;
    else if (result.status === 'judul_tidak_cocok') stats.judul_tidak_cocok++;
    else                                          stats.terverifikasi++;

    const icon = result.status === 'terverifikasi' ? '✅'
               : result.status === 'judul_tidak_cocok' ? '⚠️ '
               : '❌';

    const label = result.status === 'terverifikasi'
      ? `✅ "${result.title?.slice(0, 60)}"`
      : result.status === 'judul_tidak_cocok'
      ? `⚠️  judul beda ${result.title_similarity}% — "${result.title?.slice(0, 50)}"`
      : `❌ ${result.reject_reason ?? result.status} (HTTP ${result.httpStatus})`;

    console.log(label);

    log.push({
      grade   : fileEntry.data.grade,
      slug    : topic.slug,
      purpose : video.purpose,
      youtube_id: video.youtube_id,
      status  : result.status,
      httpStatus: result.httpStatus,
      oembed_title   : result.title ?? null,
      oembed_channel : result.channel ?? null,
      gemini_claim_title  : video.gemini_claim_title,
      gemini_claim_channel: video.gemini_claim_channel,
      title_similarity    : result.title_similarity ?? null,
      reject_reason       : result.reject_reason ?? null,
      verified_at         : result.verified_at ?? null,
      url: video.url
    });

    // Tulis kembali ke file JSON jika --write
    if (WRITE_MODE && result.status !== 'ditolak') {
      // Update video entry in topic
      const idx = topic.videos.indexOf(video);
      if (idx !== -1) {
        topic.videos[idx] = {
          ...video,
          status     : result.status,
          title      : result.title,
          channel    : result.channel,
          verified_at: result.verified_at
        };
      }
    }

    if (i < allJobs.length - 1) await sleep(DELAY_MS);
  }

  // Tulis file JSON yang ter-update
  if (WRITE_MODE) {
    const written = new Set();
    for (const { fileEntry } of allJobs) {
      if (written.has(fileEntry.filePath)) continue;
      written.add(fileEntry.filePath);
      fs.writeFileSync(fileEntry.filePath, JSON.stringify(fileEntry.data, null, 2), 'utf-8');
    }
    console.log(`\n💾 File JSON diperbarui: ${written.size} file`);
  }

  // Simpan log JSON ke reports/ (tidak masuk GitHub)
  const reportsDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
  const logFile = path.join(reportsDir, `verify-videos-${TODAY}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ generated_at: new Date().toISOString(), stats, log }, null, 2));

  // ── Ringkasan ─────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(51)}`);
  console.log(`  RINGKASAN VERIFIKASI  (${allJobs.length} video total)`);
  console.log(`${'─'.repeat(51)}`);
  console.log(`  ✅ terverifikasi     : ${stats.terverifikasi}`);
  console.log(`  ⚠️  judul_tidak_cocok : ${stats.judul_tidak_cocok}`);
  console.log(`  ❌ ditolak           : ${stats.ditolak}`);
  console.log(`  🔌 error jaringan    : ${stats.error_jaringan}`);
  console.log(`${'─'.repeat(51)}`);
  console.log(`  Log disimpan: ${logFile}`);
  console.log(`${'═'.repeat(51)}\n`);

  // Daftar yang perlu tindakan
  const needAction = log.filter(l => l.status !== 'terverifikasi');
  if (needAction.length) {
    console.log('⚠️  VIDEO YANG PERLU TINDAKAN:\n');
    for (const v of needAction) {
      console.log(`  K${v.grade} ${v.slug} [${v.purpose}]`);
      console.log(`    ID      : ${v.youtube_id}`);
      console.log(`    Status  : ${v.status}`);
      if (v.reject_reason)      console.log(`    Alasan  : ${v.reject_reason} (HTTP ${v.httpStatus})`);
      if (v.oembed_title)       console.log(`    oEmbed  : "${v.oembed_title}"`);
      if (v.title_similarity != null) console.log(`    Kecocokan judul: ${v.title_similarity}%`);
      console.log();
    }
  }

  console.log('Selesai. Jalankan dengan --write untuk menyimpan hasil ke JSON.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
