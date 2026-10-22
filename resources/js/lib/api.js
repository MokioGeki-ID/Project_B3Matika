/**
 * Pembungkus fetch untuk API Laravel (/api/*).
 * Token Sanctum disimpan di localStorage dan dikirim sebagai Bearer token.
 * Error API selalu berbentuk { "error": "pesan" }.
 *
 * Base URL dikonfigurasi melalui env variable VITE_API_URL.
 * - Development lokal  : kosongkan (default ke '/api', proxy via Vite atau Laragon)
 * - Production Vercel  : isi dengan URL backend, misal https://b3matika-api.railway.app/api
 */
export const TOKEN_KEY = 'b3_token';

// API sekarang berjalan di Vercel serverless functions (/api/*)
// Tidak perlu env variable terpisah — sama-sama di vercel.app
const BASE_URL = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  // Jika body sudah berupa string (sudah di-stringify sebelumnya), kirim apa adanya.
  // Jika body berupa object, stringify di sini. Ini mencegah double-stringify.
  const bodyStr = body
    ? (typeof body === 'string' ? body : JSON.stringify(body))
    : undefined;

  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json', // wajib agar Laravel membalas JSON, bukan redirect HTML
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: bodyStr,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // Response bukan JSON (misal HTML error page dari Vercel/CDN)
    data = {};
  }
  if (!res.ok) {
    const fallback =
      res.status === 401 ? 'Sesi tidak valid, silakan masuk kembali.' :
      res.status === 403 ? 'Akses ditolak.' :
      res.status === 404 ? 'Endpoint tidak ditemukan.' :
      res.status === 429 ? 'Terlalu banyak permintaan, coba lagi nanti.' :
      res.status >= 500 ? 'Terjadi kesalahan pada server.' :
      'Terjadi kesalahan.';
    const message = (typeof data.error === 'string' && data.error) ? data.error : fallback;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Shorthand methods agar komponen bisa memanggil:
 *   api.get('/endpoint')
 *   api.post('/endpoint', bodyObj)
 *   api.patch('/endpoint', bodyObj)
 *   api.delete('/endpoint')
 *
 * Catatan: parameter `params` / `_opts` pada get() diabaikan karena
 * querystring harus sudah disertakan di dalam `path`.
 * Contoh: api.get('/tutor/conversations?page=1')
 */
api.get = (path, _opts) => api(path, { method: 'GET' });
api.post = (path, body) => api(path, { method: 'POST', body });
api.patch = (path, body) => api(path, { method: 'PATCH', body });
api.put = (path, body) => api(path, { method: 'PUT', body });
api.delete = (path) => api(path, { method: 'DELETE' });
