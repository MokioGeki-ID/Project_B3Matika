import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dns from 'dns';
import env from '../routes/_lib/env.js';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

let loadedRoutesCount = 0;
const routesDir = resolve(__dirname, '../routes');

async function loadRoutes() {
  function getFiles(dir, prefix = '') {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === '_lib') continue;
        files = files.concat(getFiles(resolve(dir, entry.name), `${prefix}/${entry.name}`));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push({ path: resolve(dir, entry.name), route: `${prefix}/${entry.name.replace('.js', '')}` });
      }
    }
    return files;
  }

  const files = getFiles(routesDir);

  for (const file of files) {
    let routePath = `/api${file.route}`.replace(/\/index$/, '');
    routePath = routePath.replace(/\[(.*?)\]/g, ':$1');

    try {
      const { pathToFileURL } = await import('url');
      const moduleUrl = pathToFileURL(file.path).href;
      const module = await import(moduleUrl);
      const handler = module.default;

      if (handler) {
        loadedRoutesCount++;
        app.all(routePath, async (req, res) => {
          Object.defineProperty(req, 'query', {
            value: { ...req.query, ...req.params },
            writable: true,
            configurable: true,
            enumerable: true
          });
          
          try {
            await handler(req, res);
          } catch (err) {
            console.error(`Error di route ${routePath}:`, err);
            if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal Server Error' });
          }
        });
        
        // Log route registration hanya jika env LOG_ROUTES=1
        if (env.LOG_ROUTES === '1') {
          console.log(`Terhubung: ${routePath}`);
        }
      }
    } catch (e) {
      console.error(`Gagal memuat route ${routePath}:`, e);
    }
  }
}

await loadRoutes();

app.use((req, res) => {
  const requestId = req.headers['x-vercel-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  console.warn(`[404] API Route Not Found: ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  
  res.status(404).json({ 
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Rute API tidak ditemukan.',
      requestId,
    }
  });
});

if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\nBackend lokal berjalan di http://localhost:${PORT}`);
    console.log(`API URL yang bisa diakses: http://localhost:${PORT}/api/home\n`);
  });
}

export default app;
