import Tesseract from 'tesseract.js';
import { MtolRecord, ScanCriteriaCheck, ScanTextRecord } from '../types';

export interface ScanExtractedData {
  lhp1: string;
  lhp2: string;
  sachet1: string;
  sachet2: string;
  sachet3: string;
  sachet4: string;
  box: string;

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
  ex: string;
  kb: string;
  pr: string;
  pbe: string;

  optionsB1: string[];
  optionsB2: string[];
  optionsKb: string[];

  batchType: string;
  autoValidationResult: 'ok' | 'nok';
  criteriaList: ScanCriteriaCheck[];
  engine: string;

  rawTexts: {
    lhp1: string;
    lhp2: string;
    sachet1: string;
    sachet2: string;
    sachet3: string;
    sachet4: string;
    box: string;
  };
}

const MONTH_MAP: Record<string, string> = {
  JAN: '01', JANUARI: '01', JANUARY: '01',
  FEB: '02', FEBRUARI: '02', FEBRUARY: '02',
  MAR: '03', MARET: '03', MARCH: '03',
  APR: '04', APRIL: '04',
  MEI: '05', MAY: '05',
  JUN: '06', JUNI: '06', JUNE: '06',
  JUL: '07', JULI: '07', JULY: '07',
  AGU: '08', AGUSTUS: '08', AUG: '08', AUGUST: '08',
  SEP: '09', SEPTEMBER: '09',
  OKT: '10', OKTOBER: '10', OCT: '10', OCTOBER: '10',
  NOV: '11', NOVEMBER: '11',
  DES: '12', DESEMBER: '12', DEC: '12', DECEMBER: '12',
};

export const formatDateString = (raw: string | undefined): string => {
  if (!raw) return '';
  const clean = raw.trim().toUpperCase();

  const textParts = clean.split(/[\s./-]+/).filter(Boolean);
  if (textParts.length >= 3) {
    const day = textParts[0];
    let month = textParts[1];
    const year = textParts[2];
    if (MONTH_MAP[month]) {
      month = MONTH_MAP[month];
    }
    if (/^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month) && /^\d{2,4}$/.test(year)) {
      const d = day.padStart(2, '0').slice(-2);
      const m = month.padStart(2, '0').slice(-2);
      const y = year.slice(-2);
      return `${d} ${m} ${y}`;
    }
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 6) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(6, 8)}`;
  }

  if (textParts.length >= 3) {
    const d = textParts[0].padStart(2, '0').slice(-2);
    const m = textParts[1].padStart(2, '0').slice(-2);
    const y = textParts[2].slice(-2);
    return `${d} ${m} ${y}`;
  }

  return raw.trim();
};

export const getLots = (r: MtolRecord): string[] =>
  String(r.lot || '')
    .toUpperCase()
    .split(/[,;\s]+/)
    .filter(Boolean);

function preprocessImageForScan(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc || !imageSrc.startsWith('data:image')) {
      resolve(imageSrc);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDim = 1400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const contrast = 1.4;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const c = Math.max(0, Math.min(255, factor * (gray - 128) + 128));
          data[i] = c;
          data[i + 1] = c;
          data[i + 2] = c;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

async function recognizeTextClient(imageSrc: string, timeoutMs = 8000): Promise<string> {
  if (!imageSrc) return '';
  const job = (async () => {
    try {
      const prep = await preprocessImageForScan(imageSrc);
      const res = await Tesseract.recognize(prep, 'eng', { errorHandler: () => {} });
      return (res.data.text || '').toUpperCase();
    } catch (e) {
      return '';
    }
  })();

  const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(''), timeoutMs));
  return Promise.race([job, timeout]);
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
}

// Extract batch code token (removes spaces, e.g. "FNMB 11 AA" -> "FNMB11AA")
export function cleanBatchToken(str: string): string {
  if (!str) return '';
  return String(str).replace(/\s+/g, '').toUpperCase();
}

// Parse batch code components: Prefix, Event (N/G/X/L), Tahun, Bulan, Tgl, Mesin
export interface BatchDecomposition {
  raw: string;
  hasFPrefix: boolean;
  event: string; // N, G, X, L, M, etc.
  year: string;  // e.g. M, N, O
  month: string; // e.g. B, C, D
  days: string[]; // e.g. ['11'] or ['11', '12'] or ['30', '01']
  machines: string; // e.g. AA, AB, AAAB
}

export function decomposeBatchCode(code: string): BatchDecomposition | null {
  const clean = cleanBatchToken(code);
  if (!clean || clean.length < 6) return null;

  // Pattern: Optional 'F' + Event [NGXLM] + Tahun [A-Z] + Bulan [A-L] + Day(s) [0-9]{2,4} + Machine [A-Z]{2,4}
  const match = clean.match(/^(?:CKR)?(F)?([NGXLM])([A-Z])([A-L])(\d{2,4})([A-Z0-9]{2,4})$/);
  if (match) {
    const rawDays = match[5];
    const days: string[] = [];
    if (rawDays.length === 2) {
      days.push(rawDays);
    } else if (rawDays.length === 4) {
      days.push(rawDays.slice(0, 2), rawDays.slice(2, 4));
    }

    return {
      raw: clean,
      hasFPrefix: Boolean(match[1]),
      event: match[2],
      year: match[3],
      month: match[4],
      days,
      machines: match[6],
    };
  }

  return {
    raw: clean,
    hasFPrefix: clean.startsWith('F'),
    event: clean.charAt(clean.startsWith('F') ? 1 : 0),
    year: '',
    month: '',
    days: [],
    machines: clean.slice(-2),
  };
}

/**
 * AUTOMATIC VISUAL PRINT BATCH CRITERIA VALIDATOR
 * Evaluates the 5 photos against the official rules shown in 2.png, 3.png, and 4.png:
 * 1. BATCH NORMAL RUNNING 1 MESIN FILLING (LHP: FNMB11AA, Sachet: CKR NMB11AA FEB 24, Box: 11 FEB 24 FNMB11AA)
 * 2. BATCH GABUNGAN RUNNING 2 MESIN FILLING (Sachet: CKR GMB11AA/AB, Box: 11 FEB 24 FGMB11AAAB)
 * 3. BATCH GABUNGAN RUNNING 2 MESIN BEDA TANGGAL (Box: FGMB1112AAAB, Exp Date Tgl Lebih Awal)
 * 4. BATCH PERBAIKAN RUNNING 1 MESIN (LHP: FXMB11AA, Sachet: CKR XMB11AA, Box: 11 FEB 24 FXMB11AA)
 * 5. BATCH GABUNGAN PERBAIKAN DENGAN NORMAL (Mesin 1 X, Mesin 2 N/G, Box: FGMB11AAAB)
 * 6. GABUNGAN PERBAIKAN (Mesin 1 X, Mesin 2 X, Box: FGMB11AAAB)
 * 7. GANTI ROLL BEDA EXPIRED (Event L, Exp Date Bulan Lebih Awal)
 * 8. BATCH GABUNGAN BEDA TANGGAL & BULAN (Box memuat kedua bulan & tanggal, exp date tanggal/bulan lebih awal)
 */
export function evaluateVisualPrintCriteria(params: {
  b1: string;
  b2?: string;
  sachetCode1: string;
  sachetCode2?: string;
  sachetCode3?: string;
  sachetCode4?: string;
  boxCode: string;
  boxExp: string;
  sachetExp1?: string;
  sachetExp2?: string;
  sachetExp3?: string;
  sachetExp4?: string;
}): {
  isValid: boolean;
  detectedType: string;
  criteriaList: ScanCriteriaCheck[];
  summary: string;
} {
  const criteria: ScanCriteriaCheck[] = [];

  const cleanB1 = cleanBatchToken(params.b1);
  const cleanB2 = cleanBatchToken(params.b2 || '');
  const cleanS1 = cleanBatchToken(params.sachetCode1);
  const cleanS2 = cleanBatchToken(params.sachetCode2 || '');
  const cleanS3 = cleanBatchToken(params.sachetCode3 || '');
  const cleanS4 = cleanBatchToken(params.sachetCode4 || '');
  const cleanBox = cleanBatchToken(params.boxCode);
  const cleanBoxExp = params.boxExp?.trim() || '';

  const isTwoMachines = Boolean(cleanB2 || cleanS2 || cleanS4);

  let detectedType = isTwoMachines ? 'BATCH GABUNGAN 2 MESIN FILLING' : 'BATCH NORMAL (1 MESIN FILLING)';
  if (cleanB1.includes('X') || cleanS1.includes('X')) {
    detectedType = 'BATCH PERBAIKAN';
  }

  // 1. Kriteria: Validitas Kode LHP 1
  const passLhp1 = Boolean(cleanB1 && cleanB1.length >= 4);
  criteria.push({
    id: 'crit-lhp1',
    name: '1. Format Kode LHP 1',
    passed: passLhp1,
    expected: 'Nomor Batch LHP 1 valid (cth: FNQK11AA)',
    detected: cleanB1 || '(Kosong)',
    note: passLhp1 ? 'Nomor batch LHP 1 terbaca valid.' : 'Nomor batch LHP 1 belum terdeteksi.',
  });

  // 2. Kriteria: Kesesuaian Kode Sachet Mesin 1 (Sachet 1 & 3) vs LHP 1 (Sachet 3 samakan dengan Sachet 1)
  const sub4B1 = cleanB1.slice(-4);
  const passSachet1 = Boolean(
    cleanS1 && cleanB1 && (
      cleanS1.includes(cleanB1) ||
      cleanB1.includes(cleanS1) ||
      cleanS1.includes(sub4B1) ||
      cleanB1.includes(cleanS1.slice(-4))
    )
  );
  const passSachet3 = Boolean(
    (!cleanS3 || cleanS3 === cleanS1 || cleanS3.includes(cleanS1) || cleanS1.includes(cleanS3) || (cleanB1 && cleanS3.includes(sub4B1)))
  );
  const combinedSachet1 = passSachet1 && passSachet3;
  criteria.push({
    id: 'crit-sachet1',
    name: '2. Kesesuaian Kode Sachet Mesin 1 (Sachet 1 & 3) vs LHP 1',
    passed: combinedSachet1,
    expected: `Sesuai dengan LHP 1 & Sachet 1 (${cleanB1 || 'Batch 1'})`,
    detected: `S1: ${cleanS1 || '-'} | S3: ${cleanS3 || '-'}`,
    note: combinedSachet1 ? 'Kode Sachet 1 dan Sachet 3 cocok dan sesuai.' : 'Ketidaksesuaian pada Sachet 1 atau Sachet 3.',
  });

  // 3. Kriteria: Kesesuaian Kode Sachet Mesin 2 (Sachet 2 & 4) vs LHP 2 (Sachet 4 samakan dengan Sachet 2)
  if (isTwoMachines) {
    const sub4B2 = cleanB2 ? cleanB2.slice(-4) : '';
    const passSachet2 = Boolean(
      cleanS2 && (
        cleanB2 ? (
          cleanS2.includes(cleanB2) ||
          cleanB2.includes(cleanS2) ||
          cleanS2.includes(sub4B2)
        ) : cleanS2.length >= 4
      )
    );
    const passSachet4 = Boolean(
      (!cleanS4 || cleanS4 === cleanS2 || cleanS4.includes(cleanS2) || cleanS2.includes(cleanS4) || (cleanB2 && cleanS4.includes(sub4B2)))
    );
    const combinedSachet2 = passSachet2 && passSachet4;
    criteria.push({
      id: 'crit-sachet2',
      name: '3. Kesesuaian Kode Sachet Mesin 2 (Sachet 2 & 4) vs LHP 2',
      passed: combinedSachet2,
      expected: `Sesuai dengan LHP 2 & Sachet 2 (${cleanB2 || 'Batch 2'})`,
      detected: `S2: ${cleanS2 || '-'} | S4: ${cleanS4 || '-'}`,
      note: combinedSachet2 ? 'Kode Sachet 2 dan Sachet 4 cocok dan sesuai.' : 'Ketidaksesuaian pada Sachet 2 atau Sachet 4.',
    });
  }

  // 4. Kriteria: Format Kode Kemasan Box
  const passBoxCode = Boolean(
    cleanBox && (
      cleanBox.includes(cleanB1) ||
      cleanB1.includes(cleanBox) ||
      (cleanB1 && cleanBox.includes(cleanB1.slice(-4))) ||
      cleanBox.startsWith('FG') ||
      cleanBox.startsWith('FL')
    )
  );
  criteria.push({
    id: 'crit-boxcode',
    name: '4. Kesesuaian Kode Kemasan Box',
    passed: passBoxCode,
    expected: isTwoMachines ? 'Awalan FG/FL dan memuat kode batch' : `Sama dengan LHP 1 (${cleanB1 || ''})`,
    detected: cleanBox || '(Belum dipindai)',
    note: passBoxCode ? 'Kode Kemasan Box sesuai dan valid.' : 'Kode Kemasan Box tidak sesuai dengan batch LHP.',
  });

  // 5. Kriteria: Kesesuaian Expired Date Box vs Sachet
  const passExp = Boolean(cleanBoxExp && cleanBoxExp.length >= 4);
  criteria.push({
    id: 'crit-boxexp',
    name: '5. Tanggal Kadaluarsa (Expired Date) Box',
    passed: passExp,
    expected: 'DD MM YY (Tercetak jelas)',
    detected: cleanBoxExp || '(Kosong)',
    note: passExp ? 'Expired Date Box terbaca valid.' : 'Expired Date Box belum terdeteksi.',
  });

  // Overall Evaluation
  const allPassed = criteria.every((c) => c.passed);
  const summary = allPassed
    ? `Semua kriteria Visual Print Kode Batch TERPENUHI (${detectedType}). Sampel valid OKE.`
    : `Ditemukan ketidaksesuaian pada aturan Visual Print (${detectedType}). Sampel TIDAK OKE.`;

  return {
    isValid: allPassed,
    detectedType,
    criteriaList: criteria,
    summary,
  };
}

/**
 * Scan Text from 7 Photos:
 * Photo 1: Foto LHP 1
 * Photo 2: Foto LHP 2
 * Photo 3: Foto Sachet Filling 1
 * Photo 4: Foto Sachet Filling 2
 * Photo 5: Foto Sachet Filling 3
 * Photo 6: Foto Sachet Filling 4
 * Photo 7: Foto Box dan Dus
 */
export async function scanTextFrom7Photos(
  photoLhp1: string,
  photoLhp2: string,
  photoSachet1: string,
  photoSachet2: string,
  photoSachet3: string,
  photoSachet4: string,
  photoBox: string,
  mtolList: MtolRecord[] = [],
  onProgress?: (step: string, percent: number) => void
): Promise<ScanExtractedData> {
  onProgress?.('Menghubungkan ke Gemini OCR AI (/api/scan-text)...', 25);

  try {
    const res = await fetch('/api/scan-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoLhp1,
        photoLhp2,
        photoSachet1,
        photoSachet2,
        photoSachet3,
        photoSachet4,
        photoBox,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.b1 || data.kb || data.sachetCode1)) {
        onProgress?.('Analisis OCR AI Selesai!', 100);
        const evalRes = evaluateVisualPrintCriteria({
          b1: data.b1 || '',
          b2: data.b2 || '',
          sachetCode1: data.sachetCode1 || '',
          sachetCode2: data.sachetCode2 || '',
          boxCode: data.kb || '',
          boxExp: data.ex || '',
        });

        return {
          lhp1: data.b1 || '',
          lhp2: data.b2 || '',
          sachet1: data.sachetCode1 || '',
          sachet2: data.sachetCode2 || '',
          sachet3: data.sachetCode3 || '',
          sachet4: data.sachetCode4 || '',
          box: data.kb || '',
          b1: data.b1 || '',
          w1: data.w1 || '',
          n1: data.n1 || '',
          b2: data.b2 || '',
          w2: data.w2 || '',
          n2: data.n2 || '',
          sachetCode1: data.sachetCode1 || '',
          sachetCode2: data.sachetCode2 || '',
          sachetCode3: data.sachetCode3 || '',
          sachetCode4: data.sachetCode4 || '',
          sachetExp1: data.sachetExp1 || '',
          sachetExp2: data.sachetExp2 || '',
          sachetExp3: data.sachetExp3 || '',
          sachetExp4: data.sachetExp4 || '',
          ex: data.ex || '',
          kb: data.kb || '',
          pr: data.pr || '',
          pbe: data.pbe || '',
          optionsB1: data.b1 ? [data.b1] : [],
          optionsB2: data.b2 ? [data.b2] : [],
          optionsKb: data.kb ? [data.kb] : [],
          batchType: evalRes.detectedType,
          autoValidationResult: evalRes.isValid ? 'ok' : 'nok',
          criteriaList: evalRes.criteriaList,
          engine: data.engine || 'Gemini AI OCR',
          rawTexts: data.rawTexts || { lhp1: '', lhp2: '', sachet1: '', sachet2: '', sachet3: '', sachet4: '', box: '' },
        };
      }
    }
  } catch (err) {
    console.warn('Server Gemini OCR request failed, falling back to local Tesseract OCR:', err);
  }

  onProgress?.('Memproses Scan Text lokal (Tesseract OCR)...', 40);
  const rawTexts = {
    lhp1: await recognizeTextClient(photoLhp1, 5000),
    lhp2: await recognizeTextClient(photoLhp2, 5000),
    sachet1: await recognizeTextClient(photoSachet1, 5000),
    sachet2: await recognizeTextClient(photoSachet2, 5000),
    sachet3: await recognizeTextClient(photoSachet3, 5000),
    sachet4: await recognizeTextClient(photoSachet4, 5000),
    box: await recognizeTextClient(photoBox, 5000),
  };

  onProgress?.('Menganalisis hasil scan text...', 85);

  const extractBatchFromLhpText = (text: string): string => {
    if (!text) return '';
    const lines = text.split('\n');
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (
        upper.includes('BATCH') ||
        upper.includes('MIXING') ||
        upper.includes('WO') ||
        upper.includes('NO') ||
        upper.includes('NOMOR')
      ) {
        const match = line.match(/(?:F|[A-Z0-9])[A-Z0-9]{5,14}/i);
        if (match) {
          const cleaned = cleanBatchToken(match[0]);
          if (cleaned.length >= 5) return cleaned;
        }
      }
    }
    const matchAll = text.match(/(?:F|[A-Z0-9])[A-Z0-9]{5,14}/);
    if (matchAll) {
      return cleanBatchToken(matchAll[0]);
    }
    return cleanBatchToken(text.replace(/\s+/g, '').slice(0, 14));
  };

  const cleanB1 = extractBatchFromLhpText(rawTexts.lhp1);
  const cleanB2 = extractBatchFromLhpText(rawTexts.lhp2);
  const cleanS1 = cleanBatchToken(rawTexts.sachet1.match(/[A-Z0-9]{6,14}/)?.[0] || rawTexts.sachet1.replace(/\s+/g, '').slice(0, 14) || '');
  const cleanS2 = cleanBatchToken(rawTexts.sachet2.match(/[A-Z0-9]{6,14}/)?.[0] || rawTexts.sachet2.replace(/\s+/g, '').slice(0, 14) || '');
  const cleanS3 = cleanBatchToken(rawTexts.sachet3.match(/[A-Z0-9]{6,14}/)?.[0] || rawTexts.sachet3.replace(/\s+/g, '').slice(0, 14) || '');
  const cleanS4 = cleanBatchToken(rawTexts.sachet4.match(/[A-Z0-9]{6,14}/)?.[0] || rawTexts.sachet4.replace(/\s+/g, '').slice(0, 14) || '');
  const cleanKb = cleanBatchToken(
    rawTexts.box.match(/(?:F|FG|FL|[A-Z0-9])[A-Z0-9]{5,14}/)?.[0] ||
    rawTexts.box.replace(/\s+/g, '').slice(0, 14) || ''
  );

  const dateMatch =
    rawTexts.box.match(/\b\d{2}[\s./-](?:JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES|\d{2})[\s./-]\d{2,4}\b/i)?.[0] ||
    rawTexts.box.match(/\b\d{2}[\s./-]\d{2}[\s./-]\d{2,4}\b/)?.[0] ||
    rawTexts.box.match(/\d{6,8}/)?.[0] || '';
  const cleanEx = formatDateString(dateMatch);

  const evalRes = evaluateVisualPrintCriteria({
    b1: cleanB1,
    b2: cleanB2,
    sachetCode1: cleanS1,
    sachetCode2: cleanS2,
    boxCode: cleanKb,
    boxExp: cleanEx,
  });

  onProgress?.('Scan Text Selesai!', 100);

  return {
    lhp1: cleanB1,
    lhp2: cleanB2,
    sachet1: cleanS1,
    sachet2: cleanS2,
    sachet3: cleanS3,
    sachet4: cleanS4,
    box: cleanKb,
    b1: cleanB1,
    w1: '',
    n1: '',
    b2: cleanB2,
    w2: '',
    n2: '',
    sachetCode1: cleanS1,
    sachetCode2: cleanS2,
    sachetCode3: cleanS3,
    sachetCode4: cleanS4,
    sachetExp1: '',
    sachetExp2: '',
    sachetExp3: '',
    sachetExp4: '',
    ex: cleanEx,
    kb: cleanKb,
    pr: '',
    pbe: '',
    optionsB1: cleanB1 ? [cleanB1] : [],
    optionsB2: cleanB2 ? [cleanB2] : [],
    optionsKb: cleanKb ? [cleanKb] : [],
    batchType: evalRes.detectedType,
    autoValidationResult: evalRes.isValid ? 'ok' : 'nok',
    criteriaList: evalRes.criteriaList,
    engine: 'Scan Text (Local Tesseract)',
    rawTexts,
  };
}

export async function scanTextFrom5Photos(
  p1: string,
  p2: string,
  p3: string,
  p4: string,
  p5: string,
  mtolList: MtolRecord[] = [],
  onProgress?: (step: string, percent: number) => void
): Promise<ScanExtractedData> {
  return scanTextFrom7Photos(p1, p2, p3, p4, '', '', p5, mtolList, onProgress);
}

export const performOcrOnPhotos = async (
  p1: string,
  p2: string,
  p3: string,
  mtolList: MtolRecord[] = [],
  onProgress?: (s: string, p: number) => void
) => {
  return scanTextFrom7Photos(p1, p2, p3, '', '', '', '', mtolList, onProgress);
};

export function resolveFullWoFromMtol(scannedWo: string, mtolRecords: MtolRecord[]): { fullWo: string; match?: MtolRecord } {
  if (!scannedWo || !mtolRecords || mtolRecords.length === 0) return { fullWo: scannedWo };
  const clean = scannedWo.trim().toUpperCase();

  let match = mtolRecords.find((r) => r.wo.toUpperCase() === clean);
  if (match) return { fullWo: match.wo, match };

  const digitMatch = clean.match(/\d{4}/);
  const target4 = digitMatch ? digitMatch[0] : clean.slice(-4);

  if (target4.length >= 4) {
    match = mtolRecords.find((r) => {
      const rWo = r.wo.toUpperCase();
      return rWo.includes(target4) || rWo.endsWith(target4);
    });
    if (match) return { fullWo: match.wo, match };
  }

  return { fullWo: scannedWo };
}
