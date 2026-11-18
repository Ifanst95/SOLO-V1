import { ThemeConfig, ThemeColorPreset } from '../types';

export interface PresetInfo {
  id: ThemeColorPreset;
  name: string;
  badge: string;
  primary: string;
  hover: string;
  light: string;
  text: string;
  description: string;
  isDarkDefault?: boolean;
}

export const THEME_PRESETS: PresetInfo[] = [
  {
    id: 'teal',
    name: 'Teal Medis (Default)',
    badge: 'Klinik & QC',
    primary: '#0d9488',
    hover: '#0f766e',
    light: 'rgba(13, 148, 136, 0.12)',
    text: '#0f766e',
    description: 'Nuansa klinik farmasi & inspeksi steril yang sejuk dan menenangkan mata.',
  },
  {
    id: 'emerald',
    name: 'Farmasi Emerald',
    badge: 'Steril & QA',
    primary: '#059669',
    hover: '#047857',
    light: 'rgba(5, 150, 105, 0.12)',
    text: '#047857',
    description: 'Warna hijau higienis standar jaminan mutu (QA) industri farmasi.',
  },
  {
    id: 'ocean',
    name: 'Ocean Sapphire',
    badge: 'Presisi & Fokus',
    primary: '#0284c7',
    hover: '#0369a1',
    light: 'rgba(2, 132, 199, 0.12)',
    text: '#0369a1',
    description: 'Biru presisi dengan kontras tinggi untuk pemantauan data statistik.',
  },
  {
    id: 'indigo',
    name: 'Cyber Indigo',
    badge: 'Teknologi Tinggi',
    primary: '#4f46e5',
    hover: '#4338ca',
    light: 'rgba(79, 70, 229, 0.12)',
    text: '#4338ca',
    description: 'Tampilan modern futuristik dengan nuansa sistem pabrik pintar.',
  },
  {
    id: 'amber',
    name: 'Industrial Amber',
    badge: 'Manufaktur & Safety',
    primary: '#d97706',
    hover: '#b45309',
    light: 'rgba(217, 119, 6, 0.12)',
    text: '#b45309',
    description: 'Warna kontras hangat yang sangat jelas terbaca di area produksi mesin.',
  },
  {
    id: 'rose',
    name: 'Crimson Ruby',
    badge: 'Ketajaman Visual',
    primary: '#e11d48',
    hover: '#be123c',
    light: 'rgba(225, 29, 72, 0.12)',
    text: '#be123c',
    description: 'Merah elegan dengan visibilitas luar biasa untuk status inspeksi kritis.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Night',
    badge: 'Shift Malam / Gelap',
    primary: '#38bdf8',
    hover: '#0284c7',
    light: 'rgba(56, 189, 248, 0.18)',
    text: '#38bdf8',
    description: 'Didesain khusus untuk shift malam, menghemat mata dan daya baterai.',
    isDarkDefault: true,
  },
  {
    id: 'custom',
    name: 'Warna Kustom Sendiri',
    badge: 'Bebas Pilih Warna',
    primary: '#8b5cf6',
    hover: '#7c3aed',
    light: 'rgba(139, 92, 246, 0.12)',
    text: '#6d28d9',
    description: 'Tentukan warna favorit Anda dengan pemilih warna digital (Color Picker).',
  },
];

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'teal',
  mode: 'light',
  customColor: '#0d9488',
  radius: 'rounded',
  density: 'normal',
};

const THEME_STORAGE_KEY = 'solo_theme_config';

export const loadTheme = (): ThemeConfig => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME, ...parsed };
    }
  } catch (e) {
    console.warn('Gagal membaca preferensi tema:', e);
  }
  return DEFAULT_THEME;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

export const adjustHexColor = (hex: string, percent: number): string => {
  try {
    const { r, g, b } = hexToRgb(hex);
    const factor = 1 + percent / 100;
    const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
    const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
    const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
};

export const applyTheme = (config: ThemeConfig) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  let primary = '#0d9488';
  let hover = '#0f766e';
  let light = 'rgba(13, 148, 136, 0.12)';
  let text = '#0f766e';

  if (config.preset === 'custom' && config.customColor) {
    primary = config.customColor;
    hover = adjustHexColor(primary, -15);
    const { r, g, b } = hexToRgb(primary);
    light = `rgba(${r}, ${g}, ${b}, 0.14)`;
    text = adjustHexColor(primary, -25);
  } else {
    const found = THEME_PRESETS.find((p) => p.id === config.preset);
    if (found) {
      primary = found.primary;
      hover = found.hover;
      light = found.light;
      text = found.text;
    }
  }

  const { r, g, b } = hexToRgb(primary);
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-primary-hover', hover);
  root.style.setProperty('--theme-primary-light', light);
  root.style.setProperty('--theme-primary-text', text);
  root.style.setProperty('--theme-primary-rgb', `${r}, ${g}, ${b}`);

  let radiusPx = '12px';
  if (config.radius === 'sharp') radiusPx = '4px';
  else if (config.radius === 'soft') radiusPx = '22px';
  root.style.setProperty('--theme-radius', radiusPx);

  let fontScale = '16px';
  if (config.density === 'compact') fontScale = '14.5px';
  else if (config.density === 'spacious') fontScale = '17.5px';
  root.style.setProperty('--theme-font-size', fontScale);

  let isDark = false;
  if (config.mode === 'dark' || (config.preset === 'obsidian' && config.mode !== 'light')) {
    isDark = true;
  } else if (config.mode === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    // ignore
  }
};
