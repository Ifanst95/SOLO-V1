import { AppDatabase } from '../types';
import { SEED_MTOL_DATA } from './constants';

const STORAGE_KEY = 'solo_app_db_v2';

const DEFAULT_DB: AppDatabase = {
  samples: [
    {
      id: 1727827200000,
      at: '01/10/2026, 14:15:00',
      op: 'Ahmad S.',
      pk: 'Hopak 1',
      f1: '6 Line 1',
      f2: '6 Line 2',
      pd: '',
      note: 'TIDAK ADA PERLAKUAN KHUSUS',
      img: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      ],
      ocr: {
        f1: '6 Line 1',
        f2: '6 Line 2',
        b1: 'FNQI21AG',
        b2: 'XFNQI21AG',
        w1: '1029481',
        w2: '1029481',
        nm: 'TOLAK ANGIN CAIR STANDAR 15ML',
        ex: '28 10 28',
        kb: 'FGQI2223AAAB',
        pbe: 'KW A12121',
      },
      status: 'ok',
      params: ['OKE', 'OKE', 'OKE'],
      reasons: [],
      validatedAt: '01/10/2026, 14:20:12',
      syncedToSheets: false,
    },
  ],
  lhps: [
    {
      id: 1,
      at: '01/10/2026, 14:22:00',
      b1: 'FNQI21AG',
      b2: 'XFNQI21AG',
      w1: '1029481',
      w2: '1029481',
      n1: 'TOLAK ANGIN CAIR STANDAR 15ML',
      n2: 'TOLAK ANGIN CAIR STANDAR 15ML',
      ex: '28 10 28',
      kb: 'FGQI2223AAAB',
      pr: '',
      pbe: 'KW A12121',
      sb: 50,
      pf: 5,
      pfb: 250,
      pk: 20,
      kl: '12 DUS',
      tt: '270 BOX 12 DUS',
      ct: '14520',
      sp: '2 DUS',
      mtol: 'Sesuai',
      syncedToSheets: false,
    },
  ],
  mtol: SEED_MTOL_DATA,
  cfg: {
    tone: 'chime',
    vol: 0.7,
    autoSyncSheets: true,
  },
};

export const loadDatabase = (): AppDatabase => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_DB,
        ...parsed,
        cfg: { ...DEFAULT_DB.cfg, ...(parsed.cfg || {}) },
        mtol: parsed.mtol && parsed.mtol.length > 0 ? parsed.mtol : SEED_MTOL_DATA,
      };
    }
  } catch (err) {
    console.error('Failed to load database from localStorage:', err);
  }
  return DEFAULT_DB;
};

export const saveDatabase = (db: AppDatabase) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
};
