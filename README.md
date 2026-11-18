# SOLO – Sampel Online & LHP Online

Aplikasi digital untuk inspeksi sampel kemasan, validasi data LHP, verifikasi MTOL otomatis, dan integrasi Google Sheets bagi tim Produksi. Foto LHP, sachet, dan box dipindai dengan Gemini AI Vision untuk mengekstrak nomor batch dan tanggal kedaluwarsa.

## Teknologi

- React 19 + Vite + Tailwind CSS v4 (frontend, `src/`)
- Netlify Server (Express) untuk API `/api/*` (`netlify/server/index.ts`)
- Google Gemini via Netlify AI Gateway (tanpa API key manual)
- Firebase (login & Firestore) dan Google Sheets API di sisi klien
- Tesseract.js sebagai OCR cadangan di browser

## Menjalankan secara lokal

```bash
npm install
netlify dev --port 8889
```

`netlify dev` menyediakan kredensial AI Gateway secara otomatis. Alternatif tanpa Netlify CLI: isi `GEMINI_API_KEY` di `.env.local` lalu jalankan `npm run dev`.
