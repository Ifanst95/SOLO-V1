import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleScanTextRequest } from './src/server/scanService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: true,
  });
});

app.post('/api/scan-text', async (req, res) => {
  try {
    const result = await handleScanTextRequest(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/scan-text:', err);
    res.status(500).json({ error: err.message || 'Failed to scan text' });
  }
});

// Vite middleware in development or static serve in production
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (prod: ${isProd})`);
});
