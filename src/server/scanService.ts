import { GoogleGenAI, Type } from '@google/genai';

interface ScanRequestPayload {
  photoLhp1?: string;
  photoLhp2?: string;
  photoSachet1?: string;
  photoSachet2?: string;
  photoSachet3?: string;
  photoSachet4?: string;
  photoBox?: string;
}

export interface GeminiExtractedResult {
  b1: string;
  w1: string;
  n1: string;
  b2: string;
  w2: string;
  n2: string;
  sachetCode1: string;
  sachetCode2: string;
  sachetCode3: string;
  sachetCode4: string;
  sachetExp1: string;
  sachetExp2: string;
  sachetExp3: string;
  sachetExp4: string;
  kb: string;
  ex: string;
  pr: string;
  pbe: string;
  rawTexts: {
    lhp1: string;
    lhp2: string;
    sachet1: string;
    sachet2: string;
    sachet3: string;
    sachet4: string;
    box: string;
  };
  engine: string;
}

function parseDataUrl(dataUrl?: string) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

export async function handleScanTextRequest(
  payload: ScanRequestPayload
): Promise<GeminiExtractedResult> {
  const ai = new GoogleGenAI({});
  const parts: any[] = [];

  if (payload.photoLhp1) {
    const p1 = parseDataUrl(payload.photoLhp1);
    if (p1) {
      parts.push({ text: '--- FOTO 1: LHP 1 ---' });
      parts.push({ inlineData: { mimeType: p1.mimeType, data: p1.data } });
    }
  }

  if (payload.photoLhp2) {
    const p2 = parseDataUrl(payload.photoLhp2);
    if (p2) {
      parts.push({ text: '--- FOTO 2: LHP 2 ---' });
      parts.push({ inlineData: { mimeType: p2.mimeType, data: p2.data } });
    }
  }

  if (payload.photoSachet1) {
    const p3 = parseDataUrl(payload.photoSachet1);
    if (p3) {
      parts.push({ text: '--- FOTO 3: SACHET FILLING 1 ---' });
      parts.push({ inlineData: { mimeType: p3.mimeType, data: p3.data } });
    }
  }

  if (payload.photoSachet2) {
    const p4 = parseDataUrl(payload.photoSachet2);
    if (p4) {
      parts.push({ text: '--- FOTO 4: SACHET FILLING 2 ---' });
      parts.push({ inlineData: { mimeType: p4.mimeType, data: p4.data } });
    }
  }

  if (payload.photoSachet3) {
    const p5 = parseDataUrl(payload.photoSachet3);
    if (p5) {
      parts.push({ text: '--- FOTO 5: SACHET FILLING 3 ---' });
      parts.push({ inlineData: { mimeType: p5.mimeType, data: p5.data } });
    }
  }

  if (payload.photoSachet4) {
    const p6 = parseDataUrl(payload.photoSachet4);
    if (p6) {
      parts.push({ text: '--- FOTO 6: SACHET FILLING 4 ---' });
      parts.push({ inlineData: { mimeType: p6.mimeType, data: p6.data } });
    }
  }

  if (payload.photoBox) {
    const p7 = parseDataUrl(payload.photoBox);
    if (p7) {
      parts.push({ text: '--- FOTO 7: BOX DAN DUS ---' });
      parts.push({ inlineData: { mimeType: p7.mimeType, data: p7.data } });
    }
  }

    const promptText = `Anda adalah spesialis Quality Control (QC) kemasan farmasi dan jamu (Sistem SOLO).
Tugas Anda: Membaca teks cetakan inkjet dot-matrix pada foto-foto kemasan secara presisi dan mengekstrak nomor batch serta tanggal kedaluwarsa.

ATURAN SUMBER DAN FORMAT EKSTRAKSI:
1. No Batch LHP 1 (b1): Wajib dibaca dari FOTO 1 (LHP 1) yaitu batch mixing, contoh : FNQK11AA.
2. No Batch LHP 2 (b2): Wajib dibaca dari FOTO 2 (LHP 2) yaitu batch mixing, contoh : FNQK11AB.
3. Kode Batch Box (kb): Wajib dibaca dari FOTO BOX/DUS (Foto 7 / Foto 5), contoh : FGQK17AAAB.
4. Exp Date Box (ex): Wajib dibaca dari FOTO BOX/DUS (Foto 7 / Foto 5) dalam format DD MM YY, contoh : 17 11 28.
5. Sachet Codes (sachetCode1..4): Dibaca dari Foto 3, 4, 5, 6 (sachet filling 1 sampai 4).

TUGAS EKSTRAKSI JSON:
- b1: No Batch LHP 1 murni dari Foto 1 (tanpa spasi, contoh: FNQK11AA)
- w1: WO Mixing LHP 1 jika ada
- n1: Nama item LHP 1 jika ada
- b2: No Batch LHP 2 murni dari Foto 2 (tanpa spasi, jika ada)
- w2: WO Mixing LHP 2 jika ada
- n2: Nama item LHP 2 jika ada
- sachetCode1: Kode cetak pada Sachet Filling 1 (Foto 3)
- sachetCode2: Kode cetak pada Sachet Filling 2 (Foto 4)
- sachetCode3: Kode cetak pada Sachet Filling 3 (Foto 5)
- sachetCode4: Kode cetak pada Sachet Filling 4 (Foto 6)
- sachetExp1: Exp date sachet 1 jika ada
- sachetExp2: Exp date sachet 2 jika ada
- sachetExp3: Exp date sachet 3 jika ada
- sachetExp4: Exp date sachet 4 jika ada
- kb: Kode Batch Box murni dari Foto Box/Dus (tanpa spasi, contoh: FGQK17AAAB)
- ex: Exp Date Box dari Foto Box/Dus (format DD MM YY, contoh: 17 11 28)
- pr: Prod Date dari Foto Box/Dus jika ada
- pbe: Kode PBE jika ada

PENTING: Hanya baca dari gambar yang terlampir. Jika foto tidak ada atau tidak terbaca, kembalikan string kosong "" dan jangan mengarang nomor batch.`;

  parts.push({ text: promptText });

  let responseText = '';
  let engineUsed = 'Gemini 3.1 Flash Lite (Server)';

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              b1: { type: Type.STRING },
              w1: { type: Type.STRING },
              n1: { type: Type.STRING },
              b2: { type: Type.STRING },
              w2: { type: Type.STRING },
              n2: { type: Type.STRING },
              sachetCode1: { type: Type.STRING },
              sachetCode2: { type: Type.STRING },
              sachetCode3: { type: Type.STRING },
              sachetCode4: { type: Type.STRING },
              sachetExp1: { type: Type.STRING },
              sachetExp2: { type: Type.STRING },
              sachetExp3: { type: Type.STRING },
              sachetExp4: { type: Type.STRING },
              kb: { type: Type.STRING },
              ex: { type: Type.STRING },
              pr: { type: Type.STRING },
              pbe: { type: Type.STRING },
              rawTextLhp1: { type: Type.STRING },
              rawTextLhp2: { type: Type.STRING },
              rawTextSachet1: { type: Type.STRING },
              rawTextSachet2: { type: Type.STRING },
              rawTextSachet3: { type: Type.STRING },
              rawTextSachet4: { type: Type.STRING },
              rawTextBox: { type: Type.STRING },
            },
          },
        },
      });
      responseText = response.text || '{}';
      engineUsed = `Gemini AI (${modelName})`;
      break;
    } catch (err: any) {
      console.warn(`Model ${modelName} failed:`, err?.message);
      lastError = err;
    }
  }

  if (!responseText && lastError) {
    throw lastError;
  }

  const d = JSON.parse(responseText.trim() || '{}');

  const cleanVal = (val: any): string => {
    if (!val || typeof val !== 'string') return '';
    const s = val.trim();
    if (/^(n\/a|none|null|undefined|tidak ada|-)$/i.test(s)) return '';
    return s;
  };

  return {
    b1: cleanVal(d.b1),
    w1: cleanVal(d.w1),
    n1: cleanVal(d.n1),
    b2: cleanVal(d.b2),
    w2: cleanVal(d.w2),
    n2: cleanVal(d.n2),
    sachetCode1: cleanVal(d.sachetCode1),
    sachetCode2: cleanVal(d.sachetCode2),
    sachetCode3: cleanVal(d.sachetCode3),
    sachetCode4: cleanVal(d.sachetCode4),
    sachetExp1: cleanVal(d.sachetExp1),
    sachetExp2: cleanVal(d.sachetExp2),
    sachetExp3: cleanVal(d.sachetExp3),
    sachetExp4: cleanVal(d.sachetExp4),
    kb: cleanVal(d.kb),
    ex: cleanVal(d.ex),
    pr: cleanVal(d.pr),
    pbe: cleanVal(d.pbe),
    rawTexts: {
      lhp1: cleanVal(d.rawTextLhp1),
      lhp2: cleanVal(d.rawTextLhp2),
      sachet1: cleanVal(d.rawTextSachet1),
      sachet2: cleanVal(d.rawTextSachet2),
      sachet3: cleanVal(d.rawTextSachet3),
      sachet4: cleanVal(d.rawTextSachet4),
      box: cleanVal(d.rawTextBox),
    },
    engine: engineUsed,
  };
}
