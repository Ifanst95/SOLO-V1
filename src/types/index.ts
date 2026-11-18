export interface ScanCriteriaCheck {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  detected: string;
  note: string;
}

export interface ScanTextRecord {
  lhp1?: string;
  lhp2?: string;
  sachet1?: string;
  sachet2?: string;
  sachet3?: string;
  sachet4?: string;
  box?: string;

  batchLhp1?: string;
  batchLhp2?: string;
  sachetCode1?: string;
  sachetCode2?: string;
  sachetCode3?: string;
  sachetCode4?: string;
  boxCode?: string;
  boxExp?: string;

  batchType?: string;
  autoValidationResult?: 'ok' | 'nok';
  criteriaList?: ScanCriteriaCheck[];
  engineUsed?: string;
  analyzedAt?: string;
}

export interface SampleRecord {
  id: number;
  at: string;
  op: string;
  pk: string;
  f1: string;
  f2: string;
  pd?: string;
  note: string;
  // 7 Photos: [Foto 1 LHP 1, Foto 2 LHP 2, Foto 3 Sachet Filling 1, Foto 4 Sachet Filling 2, Foto 5 Sachet Filling 3, Foto 6 Sachet Filling 4, Foto 7 Box dan Dus]
  img: [string, string, string, string, string, string, string];
  scanText?: ScanTextRecord;
  // Kept for backward compatibility
  ocr?: {
    f1?: string;
    f2?: string;
    b1?: string;
    b2?: string;
    w1?: string;
    w2?: string;
    nm?: string;
    ex?: string;
    pd?: string;
    kb?: string;
    pbe?: string;
    engine?: string;
    [key: string]: string | undefined;
  };
  status: 'pending' | 'ok' | 'nok';
  params: string[];
  reasons: string[];
  other?: string;
  validatedAt?: string;
  syncedToSheets?: boolean;
}

export interface LhpRecord {
  id?: number;
  at: string;
  b1: string;
  b2: string;
  w1: string;
  w2: string;
  n1: string;
  n2: string;
  ex: string;
  kb: string;
  pr?: string;
  pbe?: string;
  sb: string | number;
  pf: string | number;
  pfb: string | number;
  pk: string | number;
  kl: string;
  tt: string;
  ct: string;
  sp?: string;
  mtol: 'Sesuai' | 'Cek' | 'Manual';
  syncedToSheets?: boolean;
}

export interface MtolRecord {
  tgl: string;
  wo: string;
  code: string;
  item: string;
  lot: string;
  st: string;
}

export type ThemeColorPreset =
  | 'teal'
  | 'emerald'
  | 'ocean'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'obsidian'
  | 'custom';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeRadius = 'sharp' | 'rounded' | 'soft';
export type ThemeDensity = 'compact' | 'normal' | 'spacious';

export interface ThemeConfig {
  preset: ThemeColorPreset;
  mode: ThemeMode;
  customColor?: string;
  radius: ThemeRadius;
  density: ThemeDensity;
}

export interface AppConfig {
  tone: 'chime' | 'alarm' | 'beep' | 'custom';
  vol: number;
  custom?: string;
  sheetId?: string;
  autoSyncSheets: boolean;
  theme?: ThemeConfig;
}

export interface AppDatabase {
  samples: SampleRecord[];
  lhps: LhpRecord[];
  mtol: MtolRecord[];
  cfg: AppConfig;
}

export type UserRole = 'operator' | 'admin' | null;
export type ActiveTab = 'isam' | 'ilhp' | 'stat' | 'dsam' | 'dsbj' | 'mtol';
