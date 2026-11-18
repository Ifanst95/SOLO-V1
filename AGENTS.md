# AGENTS.md

## Overview
SOLO (Sampel Online & LHP Online) — a Vite + React SPA originally exported from Google AI Studio and adapted for Netlify. UI text is Indonesian.

## Architecture
- `src/` — React SPA. No client router; screens are switched via state in `src/App.tsx`.
  - `src/components/` — screens (InputSample, InputLhp, DashboardSample, DashboardSbj, DataMtol, SheetsDashboard, …).
  - `src/lib/` — helpers: `ocr.ts` (calls `/api/scan-text`, Tesseract fallback), `firebase.ts`, `googleSheets.ts`, `excelSpreadsheet.ts`, `theme.ts`, `storage.ts`.
  - `src/server/scanService.ts` — Gemini extraction logic, shared by the Netlify Server and local dev.
- `netlify/server/index.ts` — Netlify Server (Express), scoped to `/api/*`. Static assets come from `dist/`.
- `server.ts` and the Vite plugin in `vite.config.ts` — legacy local-dev servers from AI Studio; not used on Netlify.
- `firebase-applet-config.json` — public Firebase web config used by the client.

## Conventions / decisions
- Gemini is called through Netlify AI Gateway with `new GoogleGenAI({})`; do not add API-key checks. Only use models listed in the AI Gateway skill.
- Netlify Server must respond within 20 s; keep the scan request lean (single model call in the normal path).
- Don't add a catch-all `/* /index.html` rewrite — it would shadow the server. The app has no client routes, so none is needed.
- Uses npm (the original bun.lock was dropped).
