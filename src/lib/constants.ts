export const PACKING_MACHINES = [
  'Hopak 1',
  'Hopak 2',
  'Hopak 3',
  'Hopak 4',
  'Hopak 5',
  'Hopak 6',
  'Hopak 7',
  'Hopak 8',
  'Hopak 9',
  'Packing Omag',
  'Packing Tablet',
  'V2.1',
  'V2.3',
  'V2.4',
];

export const FILLING_MACHINES: string[] = [];
for (let i = 1; i <= 19; i++) {
  if (i !== 17) FILLING_MACHINES.push(`6 Line ${i}`);
}
for (let i = 1; i <= 4; i++) {
  FILLING_MACHINES.push(`10 Line ${i}`);
}
FILLING_MACHINES.push('Filling Omag', 'Filling Tablet');

export const SAMPLE_NOTES = [
  'TIDAK ADA PERLAKUAN KHUSUS',
  'SUDAH DRY CLEANING',
  'SUDAH PARSIAL CLEANING',
];

export const REJECTION_REASONS = [
  'PRINT NO BATCH SACHET/DUS/BAG/BLISTER/STIKER DAN ATAU BOX TIDAK JELAS DAN ATAU TIDAK SESUAI DENGAN LHP',
  'PRINT EXPIRED DATE SACHET/DUS/BAG/BLISTER/STIKER DAN ATAU BOX TIDAK SESUAI',
  'ITEM PRODUK TIDAK SAMA DENGAN LHP DAN ATAU SETTINGAN MESIN TIDAK SESUAI',
  'NO KK YANG DIGUNAKAN TIDAK SESUAI',
  'NO PBE TIDAK SESUAI',
  'KETIDAKSESUAIAN ATURAN VISUAL PRINT KODE BATCH (NORMAL / GABUNGAN / PERBAIKAN)',
];

export const getBoxPhotoDesc = (packingMachine: string) => {
  if (packingMachine.startsWith('Hopak')) {
    return 'Print Box Ns';
  }
  if (packingMachine === 'Packing Tablet') {
    return 'Print Box Tablet';
  }
  if (packingMachine === 'V2.4' || packingMachine === 'Packing Omag') {
    return 'Print Box dan Dus 1 Sampel';
  }
  return 'Print Box dan Dus TS';
};

export const isProdDateRequired = (packingMachine: string) => {
  return !packingMachine.startsWith('Hopak');
};

export const getInspectionParams = (packingMachine: string): string[] => {
  if (packingMachine.startsWith('Hopak')) {
    return [
      'Kejelasan dan Kesesuaian HASIL PRINT NO BATCH DAN EXPIRED SACHET',
      'Kejelasan dan Kesesuaian HASIL PRINT NO BATCH DAN EXPIRED DATE BOX',
      'Kejelasan dan Kesesuaian ITEM PRODUK DENGAN LHP',
      'Kesesuaian Rumus Visual Print Kode Batch (Aturan LHP, Sachet & Box)',
    ];
  }
  if (packingMachine.startsWith('V2')) {
    return [
      'Kejelasan dan Kesesuaian PRINT NO BATCH DUS DAN BOX DENGAN LHP',
      'Kejelasan dan Kesesuaian EXPIRED DATE SACHET, DUS DAN BOX',
      'Kejelasan dan Kesesuaian ITEM PRODUK DAN SETTINGAN MESIN SESUAI DENGAN LHP',
      'Kesesuaian Rumus Visual Print Kode Batch (Aturan LHP, Sachet & Box)',
    ];
  }
  return [
    'Kejelasan dan Kesesuaian PRINT NO BATCH DUS/BAG/BLISTER/STIKER DENGAN LHP',
    'Kejelasan dan Kesesuaian EXPIRED DATE DUS/BAG/BLISTER/STIKER DAN BOX',
    'Kejelasan dan Kesesuaian ITEM DAN NO KK KEMAS YANG DIGUNAKAN',
    'Kejelasan dan Kesesuaian PBE',
    'Kesesuaian Rumus Visual Print Kode Batch (Aturan LHP, Sachet & Box)',
  ];
};

export const SEED_MTOL_DATA = [
  {
    tgl: '2026-10-01',
    wo: '1029481',
    lot: 'FNQI21AG, XFNQI21AG',
    code: 'FG-TOL-001',
    item: 'TOLAK ANGIN CAIR STANDAR 15ML',
    st: 'RELEASED',
  },
  {
    tgl: '2026-10-01',
    wo: '1029482',
    lot: 'FNQI22AG, XFQI22AG',
    code: 'FG-TOL-002',
    item: 'TOLAK ANGIN BEBAS GULA 15ML',
    st: 'RELEASED',
  },
  {
    tgl: '2026-10-01',
    wo: '1029483',
    lot: 'FNQI23AG, XFQI23AG',
    code: 'FG-TOL-003',
    item: 'TOLAK ANGIN FLU 15ML',
    st: 'IN PROGRESS',
  },
  {
    tgl: '2026-10-02',
    wo: '1029484',
    lot: '26J04A',
    code: 'FG-TOL-004',
    item: 'TOLAK ANGIN ANAK 10ML',
    st: 'RELEASED',
  },
  {
    tgl: '2026-10-02',
    wo: '1029485',
    lot: '26J05A, 26J05B',
    code: 'FG-KUK-001',
    item: 'KUKUBIMA ENER-G! ANGGUR',
    st: 'RELEASED',
  },
];

export interface PackingFillingPair {
  filling1: string;
  filling2: string;
  filling3?: string;
  filling4?: string;
}

export const PACKING_FILLING_PAIRS: Record<string, PackingFillingPair> = {
  'Hopak 1': { filling1: '6 Line 1', filling2: '6 Line 2' },
  'Hopak 2': { filling1: '6 Line 3', filling2: '6 Line 4' },
  'Hopak 3': { filling1: '6 Line 5', filling2: '6 Line 6' },
  'Hopak 4': { filling1: '6 Line 7', filling2: '6 Line 8' },
  'Hopak 5': { filling1: '6 Line 9', filling2: '6 Line 10' },
  'Hopak 6': { filling1: '6 Line 11', filling2: '6 Line 12' },
  'Hopak 7': { filling1: '6 Line 13', filling2: '6 Line 14' },
  'Hopak 8': { filling1: '6 Line 15', filling2: '6 Line 16' },
  'Hopak 9': { filling1: '6 Line 1', filling2: '6 Line 2', filling3: '6 Line 3', filling4: '6 Line 4' },
  'Packing Omag': { filling1: 'Filling Omag', filling2: '6 Line 1' },
  'Packing Tablet': { filling1: 'Filling Tablet', filling2: '6 Line 1' },
  'V2.1': { filling1: '10 Line 1', filling2: '10 Line 2' },
  'V2.3': { filling1: '10 Line 3', filling2: '10 Line 4' },
  'V2.4': { filling1: '10 Line 1', filling2: '10 Line 3' },
};

export const getFillingPairForPacking = (packing: string): PackingFillingPair => {
  return PACKING_FILLING_PAIRS[packing] || { filling1: '6 Line 1', filling2: '6 Line 2' };
};
