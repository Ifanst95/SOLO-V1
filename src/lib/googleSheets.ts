import { SampleRecord, LhpRecord } from '../types';

export interface CreateSheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const SAMPLE_HEADERS = [
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
];

export const LHP_HEADERS = [
  'Waktu Input',
  'Batch LHP 1',
  'Batch LHP 2',
  'WO Mixing 1',
  'WO Mixing 2',
  'Nama Item 1',
  'Nama Item 2',
  'Exp Date',
  'Kode Batch',
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

export const SBJ_HEADERS = [
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
  'Alasan Reject / Catatan',
  'Waktu Validasi',
];

const verifiedSpreadsheets = new Set<string>();

export const ensureSoloSheetsExist = async (
  accessToken: string,
  spreadsheetId: string,
  force = false
): Promise<{ added: string[]; existing: string[] }> => {
  if (!force && verifiedSpreadsheets.has(spreadsheetId)) {
    return { added: [], existing: ['DATA_SAMPEL_QC', 'DATA_LHP', 'DATA_SBJ_SUMMARY'] };
  }

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal memverifikasi spreadsheet.');
  }

  const metaData = await metaRes.json();
  const existingSheets = metaData.sheets || [];
  const existingTitles = new Set<string>(
    existingSheets.map((s: any) => String(s.properties?.title || '').trim())
  );

  const needed = [
    {
      title: 'DATA_SAMPEL_QC',
      headers: SAMPLE_HEADERS,
      headerRange: "'DATA_SAMPEL_QC'!A1:L1",
      colCount: 14,
    },
    {
      title: 'DATA_LHP',
      headers: LHP_HEADERS,
      headerRange: "'DATA_LHP'!A1:T1",
      colCount: 22,
    },
    {
      title: 'DATA_SBJ_SUMMARY',
      headers: SBJ_HEADERS,
      headerRange: "'DATA_SBJ_SUMMARY'!A1:L1",
      colCount: 16,
    },
  ];

  const missing = needed.filter((n) => !existingTitles.has(n.title));
  if (missing.length > 0) {
    const requests = missing.map((m) => ({
      addSheet: {
        properties: {
          title: m.title,
          gridProperties: {
            rowCount: 1000,
            columnCount: m.colCount,
            frozenRowCount: 1,
          },
        },
      },
    }));

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(
        err.error?.message || 'Gagal membuat tab sheet (DATA_SAMPEL_QC, DATA_LHP, DATA_SBJ_SUMMARY).'
      );
    }

    for (const m of missing) {
      await updateSheetValuesRaw(accessToken, spreadsheetId, m.headerRange, [m.headers]).catch(() => {});
    }
  }

  verifiedSpreadsheets.add(spreadsheetId);
  return {
    added: missing.map((m) => m.title),
    existing: Array.from(existingTitles),
  };
};

export const createSoloSpreadsheet = async (
  accessToken: string,
  title = 'SOLO - Database Sampel & LHP Produksi'
): Promise<CreateSheetResponse> => {
  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'DATA_SAMPEL_QC',
          gridProperties: { rowCount: 1000, columnCount: 14, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DATA_LHP',
          gridProperties: { rowCount: 1000, columnCount: 22, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DATA_SBJ_SUMMARY',
          gridProperties: { rowCount: 1000, columnCount: 16, frozenRowCount: 1 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;

  await Promise.all([
    updateSheetValuesRaw(accessToken, spreadsheetId, "'DATA_SAMPEL_QC'!A1:L1", [SAMPLE_HEADERS]),
    updateSheetValuesRaw(accessToken, spreadsheetId, "'DATA_LHP'!A1:T1", [LHP_HEADERS]),
    updateSheetValuesRaw(accessToken, spreadsheetId, "'DATA_SBJ_SUMMARY'!A1:L1", [SBJ_HEADERS]),
  ]);

  verifiedSpreadsheets.add(spreadsheetId);
  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
};

const updateSheetValuesRaw = async (
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal update range ${range}`);
  }
  return res.json();
};

const appendSheetValuesRaw = async (
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal append ke range ${range}`);
  }
  return res.json();
};

export const appendSampleToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  sample: SampleRecord
) => {
  await ensureSoloSheetsExist(accessToken, spreadsheetId);
  const row = [
    String(sample.id),
    sample.at,
    sample.op,
    sample.pk,
    sample.f1,
    sample.f2,
    sample.pd || '-',
    sample.note,
    sample.status === 'ok' ? 'OKE' : sample.status === 'nok' ? 'TIDAK OKE' : 'MENUNGGU',
    sample.params?.join('; ') || '-',
    [...(sample.reasons || []), sample.other].filter(Boolean).join(' | ') || '-',
    sample.validatedAt || '-',
  ];
  await appendSheetValuesRaw(accessToken, spreadsheetId, "'DATA_SAMPEL_QC'!A:L", [row]);

  if (sample.status !== 'pending') {
    const sbjRow = [
      String(sample.id),
      sample.at,
      sample.op,
      sample.pk,
      sample.f1,
      sample.f2,
      sample.pd || '-',
      sample.note,
      sample.status === 'ok' ? 'OKE' : 'TIDAK OKE',
      sample.params?.join('; ') || '-',
      [...(sample.reasons || []), sample.other].filter(Boolean).join(' | ') || '-',
      sample.validatedAt || '-',
    ];
    await appendSheetValuesRaw(accessToken, spreadsheetId, "'DATA_SBJ_SUMMARY'!A:L", [sbjRow]).catch(
      () => {}
    );
  }
};

export const appendLhpToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  lhp: LhpRecord
) => {
  await ensureSoloSheetsExist(accessToken, spreadsheetId);
  const row = [
    lhp.at,
    lhp.b1,
    lhp.b2 || '-',
    lhp.w1 || '-',
    lhp.w2 || '-',
    lhp.n1 || '-',
    lhp.n2 || '-',
    lhp.ex || '-',
    lhp.kb || '-',
    lhp.pr || '-',
    lhp.pbe || '-',
    String(lhp.sb || 0),
    String(lhp.pf || 0),
    String(lhp.pfb || 0),
    String(lhp.pk || 0),
    lhp.kl || '-',
    lhp.tt || '-',
    lhp.ct || '-',
    lhp.sp || '-',
    lhp.mtol || '-',
  ];
  await appendSheetValuesRaw(accessToken, spreadsheetId, "'DATA_LHP'!A:T", [row]);
};

export const syncAllToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  samples: SampleRecord[],
  lhps: LhpRecord[]
): Promise<{ samplesCount: number; lhpsCount: number }> => {
  await ensureSoloSheetsExist(accessToken, spreadsheetId);

  const unsyncedSamples = samples.filter((s) => !s.syncedToSheets);
  if (unsyncedSamples.length > 0) {
    const rows = unsyncedSamples.map((s) => [
      String(s.id),
      s.at,
      s.op,
      s.pk,
      s.f1,
      s.f2,
      s.pd || '-',
      s.note,
      s.status === 'ok' ? 'OKE' : s.status === 'nok' ? 'TIDAK OKE' : 'MENUNGGU',
      s.params?.join('; ') || '-',
      [...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-',
      s.validatedAt || '-',
    ]);
    await appendSheetValuesRaw(accessToken, spreadsheetId, "'DATA_SAMPEL_QC'!A:L", rows);
    unsyncedSamples.forEach((s) => (s.syncedToSheets = true));
  }

  const unsyncedLhps = lhps.filter((l) => !l.syncedToSheets);
  if (unsyncedLhps.length > 0) {
    const rows = unsyncedLhps.map((l) => [
      l.at,
      l.b1,
      l.b2 || '-',
      l.w1 || '-',
      l.w2 || '-',
      l.n1 || '-',
      l.n2 || '-',
      l.ex || '-',
      l.kb || '-',
      l.pr || '-',
      l.pbe || '-',
      String(l.sb || 0),
      String(l.pf || 0),
      String(l.pfb || 0),
      String(l.pk || 0),
      l.kl || '-',
      l.tt || '-',
      l.ct || '-',
      l.sp || '-',
      l.mtol || '-',
    ]);
    await appendSheetValuesRaw(accessToken, spreadsheetId, "'DATA_LHP'!A:T", rows);
    unsyncedLhps.forEach((l) => (l.syncedToSheets = true));
  }

  return {
    samplesCount: unsyncedSamples.length,
    lhpsCount: unsyncedLhps.length,
  };
};

export const verifySpreadsheetAccess = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> => {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error('Spreadsheet tidak ditemukan atau tidak memiliki hak akses.');
  }
  const data = await res.json();
  const sheetNames = data.sheets?.map((s: any) => String(s.properties?.title || '').trim()) || [];
  return {
    title: data.properties?.title || 'Spreadsheet',
    sheetNames,
  };
};
