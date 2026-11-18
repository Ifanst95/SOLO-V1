// Netlify Server: serves the app's API routes. Static frontend is served from dist/.
import express from 'express';
import { handleScanTextRequest } from '../../src/server/scanService.ts';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: true });
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

export const config = {
  path: '/api/*',
};

export default app;
