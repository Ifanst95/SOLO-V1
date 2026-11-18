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
  boxCode: string;
  boxExp: string;
  sachetExp1?: string;
  sachetExp2?: string;
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
  const cleanBox = cleanBatchToken(params.boxCode);
  const cleanBoxExp = params.boxExp?.trim() || '';

  const isTwoMachines = Boolean(cleanB2 || cleanS2);

  // Decompositions
  const dLhp1 = decomposeBatchCode(cleanB1);
  const dLhp2 = cleanB2 ? decomposeBatchCode(cleanB2) : null;
  const dS1 = decomposeBatchCode(cleanS1);
  const dS2 = cleanS2 ? decomposeBatchCode(cleanS2) : null;
  const dBox = decomposeBatchCode(cleanBox);

  // Determine Batch Type
  let detectedType = 'BATCH NORMAL (1 MESIN FILLING)';
  if (dLhp1?.event === 'X' && !isTwoMachines) {
    detectedType = 'BATCH PERBAIKAN (1 MESIN FILLING)';
  } else if (isTwoMachines) {
    if (dLhp1?.event === 'X' && dLhp2?.event === 'X') {
      detectedType = 'GABUNGAN PERBAIKAN (2 MESIN FILLING)';
    } else if (dLhp1?.event === 'X' || dLhp2?.event === 'X') {
      detectedType = 'BATCH GABUNGAN PERBAIKAN DENGAN NORMAL (2 MESIN FILLING)';
    } else if (dLhp1?.days[0] && dLhp2?.days[0] && dLhp1.days[0] !== dLhp2.days[0]) {
      if (dLhp1?.month && dLhp2?.month && dLhp1.month !== dLhp2.month) {
        detectedType = 'BATCH GABUNGAN 2 MESIN FILLING BEDA TANGGAL DAN BULAN';
      } else {
        detectedType = 'BATCH GABUNGAN RUNNING 2 MESIN FILLING BEDA TANGGAL';
      }
    } else if (dS1?.event === 'L' || dS2?.event === 'L') {
      detectedType = 'GANTI ROLL BEDA EXPIRED (2 MESIN FILLING)';
    } else {
      detectedType = 'BATCH GABUNGAN RUNNING 2 MESIN FILLING';
    }
  }

  // 1. Kriteria: Validitas Kode LHP 1
  const passLhp1 = Boolean(cleanB1 && cleanB1.length >= 6);
  criteria.push({
    id: 'crit-lhp1',
    name: '1. Format Kode LHP 1',
    passed: passLhp1,
    expected: 'F[Event][Thn][Bln][Tgl][Mesin] (cth: FNMB11AA / FXMB11AA)',
    detected: cleanB1 || '(Kosong)',
    note: passLhp1 ? 'Format nomor batch LHP 1 terbaca valid.' : 'Nomor batch LHP 1 belum terdeteksi.',
  });

  // 2. Kriteria: Kesesuaian Kode Sachet 1 vs LHP 1
  let passSachet1 = false;
  let sachet1Note = '';
  if (dLhp1 && dS1) {
    const yearMatch = !dLhp1.year || !dS1.year || dLhp1.year === dS1.year;
    const monthMatch = !dLhp1.month || !dS1.month || dLhp1.month === dS1.month;
    const dayMatch = !dLhp1.days[0] || !dS1.days[0] || dLhp1.days[0] === dS1.days[0];
    const machineMatch = cleanS1.includes('AA') || cleanB1.includes(dS1.machines);

    if (isTwoMachines) {
      // Pada batch gabungan 2 mesin, event sachet 1 harus 'G' (atau 'X' jika perbaikan)
      const validEvent = dS1.event === 'G' || dS1.event === 'X' || dS1.event === 'L';
      passSachet1 = yearMatch && monthMatch && dayMatch && validEvent;
      sachet1Note = passSachet1
        ? `Sesuai aturan Gabungan: Event Sachet 1 '${dS1.event}', Tgl '${dS1.days[0] || '-'}', Mesin '${dS1.machines}'`
        : `Event Sachet 1 harus 'G'/'X' pada batch gabungan. Terdeteksi: '${dS1.event}'.`;
    } else {
      // 1 Mesin Normal (Event 'N') atau Perbaikan ('X')
      const expectedEvent = dLhp1.event === 'X' ? 'X' : 'N';
      const eventMatch = dS1.event === expectedEvent;
      passSachet1 = yearMatch && monthMatch && dayMatch && eventMatch;
      sachet1Note = passSachet1
        ? `Sesuai aturan: Event Sachet '${dS1.event}', Tgl '${dS1.days[0]}', Mesin '${dS1.machines}'`
        : `Event Sachet 1 harus '${expectedEvent}' untuk batch ${detectedType}. Terdeteksi: '${dS1.event}'.`;
    }
  } else {
    passSachet1 = Boolean(cleanS1 && cleanB1 && (cleanS1.includes(cleanB1.slice(-4)) || cleanB1.includes(cleanS1.slice(-4))));
    sachet1Note = passSachet1 ? 'Kesesuaian dasar kode sachet 1 cocok dengan LHP 1' : 'Kode Sachet 1 tidak cocok dengan LHP 1';
  }

  criteria.push({
    id: 'crit-sachet1',
    name: '2. Kesesuaian Kode Sachet Mesin 1 vs LHP 1',
    passed: passSachet1,
    expected: isTwoMachines ? 'CKR G[Thn][Bln][Tgl]AA / CKR X...' : 'CKR N[Thn][Bln][Tgl]AA / CKR X...',
    detected: cleanS1 || '(Belum dipindai)',
    note: sachet1Note,
  });

  // 3. Kriteria: Kesesuaian Kode Sachet Mesin 2 vs LHP 2 (Jika 2 Mesin)
  if (isTwoMachines) {
    let passSachet2 = false;
    let sachet2Note = '';
    if (dLhp2 && dS2) {
      const yearMatch = !dLhp2.year || !dS2.year || dLhp2.year === dS2.year;
      const monthMatch = !dLhp2.month || !dS2.month || dLhp2.month === dS2.month;
      const dayMatch = !dLhp2.days[0] || !dS2.days[0] || dLhp2.days[0] === dS2.days[0];
      const validEvent = dS2.event === 'G' || dS2.event === 'X' || dS2.event === 'L';
      passSachet2 = yearMatch && monthMatch && dayMatch && validEvent;
      sachet2Note = passSachet2
        ? `Sesuai aturan Gabungan Mesin 2: Event Sachet 2 '${dS2.event}', Mesin '${dS2.machines}'`
        : `Kode Sachet 2 tidak cocok dengan LHP 2. Terdeteksi: '${dS2.event}' / '${dS2.machines}'.`;
    } else {
      passSachet2 = Boolean(cleanS2 && cleanB2 && (cleanS2.includes(cleanB2.slice(-4)) || cleanB2.includes(cleanS2.slice(-4))));
      sachet2Note = passSachet2 ? 'Kode Sachet Mesin 2 sesuai dengan LHP 2' : 'Kode Sachet Mesin 2 tidak cocok';
    }

    criteria.push({
      id: 'crit-sachet2',
      name: '3. Kesesuaian Kode Sachet Mesin 2 vs LHP 2',
      passed: passSachet2,
      expected: 'CKR G[Thn][Bln][Tgl]AB / CKR X...',
      detected: cleanS2 || '(Belum dipindai)',
      note: sachet2Note,
    });
  }

  // 4. Kriteria: Format Kode Kemasan Box
  let passBoxCode = false;
  let boxCodeNote = '';
  if (!isTwoMachines) {
    // 1 Mesin: Kode Box harus sama persis dengan LHP 1 (misal FNMB11AA atau FXMB11AA)
    passBoxCode = cleanBox === cleanB1 || cleanBox.endsWith(cleanB1) || cleanBox.includes(cleanB1);
    boxCodeNote = passBoxCode
      ? `Kode Box '${cleanBox}' cocok persis dengan LHP 1 '${cleanB1}'`
      : `Kode Box harus sama persis dengan LHP 1 (${cleanB1}). Terbaca: '${cleanBox}'.`;
  } else {
    // 2 Mesin: Kode Box harus berawalan 'FG' (atau 'FL' jika ganti roll) dan berakhiran 'AAAB'
    const startsWithFG = cleanBox.startsWith('FG') || cleanBox.startsWith('FL') || cleanBox.includes('FG');
    const endsWithAAAB = cleanBox.endsWith('AAAB') || cleanBox.includes('AAAB');

    // Jika beda tanggal, harus memuat kedua tanggal (misal 1112 atau 3001)
    let datesIncluded = true;
    if (dLhp1?.days[0] && dLhp2?.days[0] && dLhp1.days[0] !== dLhp2.days[0]) {
      const combinedDays = `${dLhp1.days[0]}${dLhp2.days[0]}`;
      datesIncluded = cleanBox.includes(combinedDays) || (cleanBox.includes(dLhp1.days[0]) && cleanBox.includes(dLhp2.days[0]));
    }

    passBoxCode = startsWithFG && endsWithAAAB && datesIncluded;
    boxCodeNote = passBoxCode
      ? `Sesuai SOP Gabungan 2 Mesin: Awalan FG/FL, Akhiran gabungan mesin 'AAAB'${datesIncluded ? ', Memuat kedua tanggal' : ''}`
      : `Kode Box gabungan 2 mesin wajib diawali FG/FL dan diakhiri 'AAAB'. Terbaca: '${cleanBox}'.`;
  }

  criteria.push({
    id: 'crit-boxcode',
    name: '4. Kesesuaian Kode Kemasan Box',
    passed: passBoxCode,
    expected: isTwoMachines ? 'FG[Thn][Bln][Tgl]AAAB (cth: FGMB11AAAB / FGMB1112AAAB)' : 'Sama dengan LHP 1 (cth: FNMB11AA)',
    detected: cleanBox || '(Belum dipindai)',
    note: boxCodeNote,
  });

  // 5. Kriteria: Kesesuaian Expired Date Box vs Sachet
  let passExp = Boolean(cleanBoxExp && cleanBoxExp.length >= 6);
  let expNote = '';
  if (passExp) {
    // Jika beda tanggal atau ganti roll: periksa apakah tanggal lebih awal digunakan
    if (dLhp1?.days[0] && dLhp2?.days[0] && dLhp1.days[0] !== dLhp2.days[0]) {
      const minDay = Math.min(Number(dLhp1.days[0]), Number(dLhp2.days[0])).toString().padStart(2, '0');
      const boxDay = cleanBoxExp.slice(0, 2);
      if (boxDay === minDay || cleanBoxExp.startsWith(minDay)) {
        expNote = `Sesuai aturan SOP: Expired Box (${cleanBoxExp}) menggunakan tanggal LEBIH AWAL (${minDay}).`;
      } else {
        expNote = `Box wajib menggunakan tanggal lebih awal (${minDay}). Terdeteksi: ${cleanBoxExp}.`;
      }
    } else {
      expNote = `Format Exp Date Box (${cleanBoxExp}) valid dan tercetak jelas.`;
    }
  } else {
    expNote = 'Expired Date Box belum terdeteksi dari Foto 5 (Box dan Dus).';
  }

  criteria.push({
    id: 'crit-boxexp',
    name: '5. Tanggal Kadaluarsa (Expired Date) Box',
    passed: passExp,
    expected: 'DD MM YY (Gunakan tanggal/bulan lebih awal jika beda)',
    detected: cleanBoxExp || '(Kosong)',
    note: expNote,
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

  onProgress?.('Memproses Scan Text lokal (Tesseract OCR)...', 30);
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
