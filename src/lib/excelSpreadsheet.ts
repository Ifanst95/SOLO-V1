import * as XLSX from 'xlsx';
import { SampleRecord, LhpRecord, MtolRecord } from '../types';

export const SAMPLE_EXCEL_HEADERS = [
  'ID Sampel',
  'Waktu Input',
  'Nama Operator',
  'Mesin Packing',
  'Filling LHP 1',
  'Filling LHP 2',
  'Prod Date',
  'Catatan Operator',
  'Status Validasi',
  'Parameter Inspeksi',
  'Alasan Reject / Catatan',
  'Waktu Validasi',
  'Batch 1 (Scan Text)',
  'Batch 2 (Scan Text)',
  'WO 1 (Scan Text)',
  'WO 2 (Scan Text)',
  'Nama Item (Scan Text)',
  'Exp Date (Scan Text)',
  'Kode Batch (Scan Text)',
  'PBE (Scan Text)',
];

export const LHP_EXCEL_HEADERS = [
  'ID',
  'Waktu Input',
  'No Batch LHP 1',
  'No Batch LHP 2',
  'WO Mixing 1',
  'WO Mixing 2',
  'Nama Item 1',
  'Nama Item 2',
  'Exp Date',
  'Kode Batch Dus',
  'Prod Date',
  'PBE',
  'Std Box/Pallet',
  'Pallet Full',
  'Pallet Full (Box)',
  'Pallet Koma',
  'Koma Lebih',
  'Total Produksi',
  'Counter Terakhir',
  'Sampel Port',
  'Status MTOL',
];

export const SBJ_EXCEL_HEADERS = [
  'ID Sampel',
  'Waktu Input',
  'Nama Operator',
  'Mesin Packing',
  'Filling LHP 1',
  'Filling LHP 2',
  'Prod Date',
  'Catatan Operator',
  'Status Validasi Produksi',
  'Parameter Hasil',
  'Alasan Reject / Keterangan',
  'Waktu Validasi',
];

export const MTOL_EXCEL_HEADERS = [
  'Tanggal',
  'No WO',
  'Kode Item',
  'Nama Item Produk',
  'No Lot / Batch',
  'Status',
];

function calculateColWidths(data: (string | number | undefined | null)[][]): { wch: number }[] {
  if (!data || data.length === 0) return [];
  const colCount = Math.max(...data.map((r) => r.length));
  const widths: number[] = new Array(colCount).fill(10);
  for (const row of data) {
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      const strLen = val != null ? String(val).length : 0;
      if (strLen > widths[c]) {
        widths[c] = Math.min(Math.max(strLen + 2, 10), 50);
      }
    }
  }
  return widths.map((w) => ({ wch: w }));
}

export function exportFullSoloSpreadsheet({
  samples = [],
  lhps = [],
  mtol = [],
  fileNamePrefix = 'SOLO_Penyimpanan_Spreadsheet',
}: {
  samples: SampleRecord[];
  lhps: LhpRecord[];
  mtol?: MtolRecord[];
  fileNamePrefix?: string;
}) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);

  const sampleRows: (string | number)[][] = [SAMPLE_EXCEL_HEADERS];
  for (const s of samples) {
    sampleRows.push([
      s.id,
      s.at || '-',
      s.op || '-',
      s.pk || '-',
      s.f1 || '-',
      s.f2 || '-',
      s.pd || '-',
      s.note || '-',
      s.status === 'ok' ? 'OKE' : s.status === 'nok' ? 'TIDAK OKE' : 'MENUNGGU VALIDASI',
      s.params?.join('; ') || '-',
      [...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-',
      s.validatedAt || '-',
      s.ocr?.b1 || '-',
      s.ocr?.b2 || '-',
      s.ocr?.w1 || '-',
      s.ocr?.w2 || '-',
      s.ocr?.nm || '-',
      s.ocr?.ex || '-',
      s.ocr?.kb || '-',
      s.ocr?.pbe || '-',
    ]);
  }
  const wsSamples = XLSX.utils.aoa_to_sheet(sampleRows);
  wsSamples['!cols'] = calculateColWidths(sampleRows);
  XLSX.utils.book_append_sheet(wb, wsSamples, 'DATA_SAMPEL_QC');

  const lhpRows: (string | number)[][] = [LHP_EXCEL_HEADERS];
  for (const l of lhps) {
    lhpRows.push([
      l.id ?? '-',
      l.at || '-',
      l.b1 || '-',
      l.b2 || '-',
      l.w1 || '-',
      l.w2 || '-',
      l.n1 || '-',
      l.n2 || '-',
      l.ex || '-',
      l.kb || '-',
      l.pr || '-',
      l.pbe || '-',
      l.sb ?? 0,
      l.pf ?? 0,
      l.pfb ?? 0,
      l.pk ?? 0,
      l.kl || '-',
      l.tt || '-',
      l.ct || '-',
      l.sp || '-',
      l.mtol || 'Sesuai',
    ]);
  }
  const wsLhp = XLSX.utils.aoa_to_sheet(lhpRows);
  wsLhp['!cols'] = calculateColWidths(lhpRows);
  XLSX.utils.book_append_sheet(wb, wsLhp, 'DATA_LHP');

  const validatedSamples = samples.filter((s) => s.status !== 'pending');
  const sbjRows: (string | number)[][] = [SBJ_EXCEL_HEADERS];
  for (const s of validatedSamples) {
    sbjRows.push([
      s.id,
      s.at || '-',
      s.op || '-',
      s.pk || '-',
      s.f1 || '-',
      s.f2 || '-',
      s.pd || '-',
      s.note || '-',
      s.status === 'ok' ? 'OKE' : 'TIDAK OKE',
      s.params?.join('; ') || '-',
      [...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-',
      s.validatedAt || '-',
    ]);
  }
  const wsSbj = XLSX.utils.aoa_to_sheet(sbjRows);
  wsSbj['!cols'] = calculateColWidths(sbjRows);
  XLSX.utils.book_append_sheet(wb, wsSbj, 'REKAP_SBJ_PRODUKSI');

  if (mtol && mtol.length > 0) {
    const mtolRows: (string | number)[][] = [MTOL_EXCEL_HEADERS];
    for (const m of mtol) {
      mtolRows.push([
        m.tgl || '-',
        m.wo || '-',
        m.code || '-',
        m.item || '-',
        m.lot || '-',
        m.st || 'RELEASED',
      ]);
    }
    const wsMtol = XLSX.utils.aoa_to_sheet(mtolRows);
    wsMtol['!cols'] = calculateColWidths(mtolRows);
    XLSX.utils.book_append_sheet(wb, wsMtol, 'MASTER_MTOL');
  }

  const fileName = `${fileNamePrefix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

export function exportLhpSpreadsheetXlsx(lhps: LhpRecord[], fileName = 'LHP_Produksi.xlsx') {
  const wb = XLSX.utils.book_new();
  const lhpRows: (string | number)[][] = [LHP_EXCEL_HEADERS];
  for (const l of lhps) {
    lhpRows.push([
      l.id ?? '-',
      l.at || '-',
      l.b1 || '-',
      l.b2 || '-',
      l.w1 || '-',
      l.w2 || '-',
      l.n1 || '-',
      l.n2 || '-',
      l.ex || '-',
      l.kb || '-',
      l.pr || '-',
      l.pbe || '-',
      l.sb ?? 0,
      l.pf ?? 0,
      l.pfb ?? 0,
      l.pk ?? 0,
      l.kl || '-',
      l.tt || '-',
      l.ct || '-',
      l.sp || '-',
      l.mtol || 'Sesuai',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(lhpRows);
  ws['!cols'] = calculateColWidths(lhpRows);
  XLSX.utils.book_append_sheet(wb, ws, 'DATA_LHP');
  XLSX.writeFile(wb, fileName);
}

export function exportSamplesSpreadsheetXlsx(samples: SampleRecord[], fileName = 'Sampel_QC.xlsx') {
  const wb = XLSX.utils.book_new();
  const sampleRows: (string | number)[][] = [SAMPLE_EXCEL_HEADERS];
  for (const s of samples) {
    sampleRows.push([
      s.id,
      s.at || '-',
      s.op || '-',
      s.pk || '-',
      s.f1 || '-',
      s.f2 || '-',
      s.pd || '-',
      s.note || '-',
      s.status === 'ok' ? 'OKE' : s.status === 'nok' ? 'TIDAK OKE' : 'MENUNGGU VALIDASI',
      s.params?.join('; ') || '-',
      [...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-',
      s.validatedAt || '-',
      s.ocr?.b1 || '-',
      s.ocr?.b2 || '-',
      s.ocr?.w1 || '-',
      s.ocr?.w2 || '-',
      s.ocr?.nm || '-',
      s.ocr?.ex || '-',
      s.ocr?.kb || '-',
      s.ocr?.pbe || '-',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = calculateColWidths(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'DATA_SAMPEL_QC');
  XLSX.writeFile(wb, fileName);
}
