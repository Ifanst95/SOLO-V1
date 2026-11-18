import React, { useState } from 'react';
import {
  X,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Square,
} from 'lucide-react';
import { ThemeConfig, ThemeColorPreset, ThemeRadius, ThemeDensity } from '../types';
import { THEME_PRESETS, DEFAULT_THEME, applyTheme } from '../lib/theme';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onSaveTheme: (newTheme: ThemeConfig) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme,
}) => {
  const [theme, setTheme] = useState<ThemeConfig>({ ...currentTheme });

  React.useEffect(() => {
    if (isOpen) {
      setTheme({ ...currentTheme });
    }
  }, [isOpen, currentTheme]);

  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => {
      const updated = { ...prev, ...updates };
      applyTheme(updated);
      return updated;
    });
  };

  const handlePresetSelect = (preset: ThemeColorPreset) => {
    const found = THEME_PRESETS.find((p) => p.id === preset);
    if (found?.isDarkDefault && theme.mode === 'light') {
      handleUpdate({ preset, mode: 'dark' });
    } else {
      handleUpdate({ preset });
    }
  };

  const handleReset = () => {
    setTheme({ ...DEFAULT_THEME });
    applyTheme(DEFAULT_THEME);
  };

  const handleCancelAndClose = () => {
    applyTheme(currentTheme);
    onClose();
  };

  const handleSaveAndClose = () => {
    onSaveTheme(theme);
    applyTheme(theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div
          className="px-6 py-4 text-white flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, #0f172a, var(--theme-primary, #0d9488), #0f172a)',
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Pengaturan &amp; Kustomisasi Tema</h3>
              <p className="text-xs text-white/80">
                Pilih palet warna, mode gelap, dan ukuran tampilan sesuai kenyamanan Anda
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelAndClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Pratinjau Langsung (Live Preview)</span>
              <span className="text-[11px] text-teal-600 font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 inline" />
                <span>Real-Time</span>
              </span>
            </div>
            <div
              className="p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs"
              style={{
                borderColor: 'var(--theme-primary, #0d9488)',
                backgroundColor: 'var(--theme-primary-light, rgba(13,148,136,0.1))',
              }}
            >
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-sm font-extrabold" style={{ color: 'var(--theme-primary, #0d9488)' }}>
                  SOLO System Produksi
                </div>
                <div className="text-xs text-slate-600">
                  Inspeksi Sampel QC &amp; Pelaporan Hasil Produksi
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 text-white text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-primary, #0d9488)',
                  borderRadius: 'var(--theme-radius, 12px)',
                }}
              >
                Contoh Tombol Aksi
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-slate-600" />
                <span>1. Pilihan Warna Tema</span>
              </label>
              <span className="text-xs text-slate-400">Pilih atau kustomisasi bebas</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEME_PRESETS.map((p) => {
                const isSelected = theme.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900 bg-slate-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-6 h-6 rounded-full border border-black/10 shadow-xs flex items-center justify-center"
                        style={{
                          backgroundColor:
                            p.id === 'custom' && theme.customColor ? theme.customColor : p.primary,
                        }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {p.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 leading-tight">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {p.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {theme.preset === 'custom' && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="color"
                    value={theme.customColor || '#8b5cf6'}
                    onChange={(e) => handleUpdate({ customColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer overflow-hidden p-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-purple-900">Pilih Warna Favorit Anda</div>
                    <div className="text-[11px] text-purple-700 font-mono">
                      Kode Hex: {theme.customColor || '#8b5cf6'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => handleUpdate({ customColor: hex })}
                      className="w-5 h-5 rounded-full border border-white/80 shadow-xs cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Sun className="w-4 h-4 text-slate-600" />
              <span>2. Mode Tampilan (Terang / Gelap)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate({ mode: 'light' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  theme.mode === 'light'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Mode Terang</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdate({ mode: 'dark' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  theme.mode === 'dark'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Moon className="w-4 h-4 text-blue-400" />
                <span>Mode Gelap</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdate({ mode: 'system' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  theme.mode === 'system'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Laptop className="w-4 h-4 text-slate-400" />
                <span>Otomatis</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Square className="w-4 h-4 text-slate-600" />
              <span>3. Gaya Sudut Kotak &amp; Tombol</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sharp', label: 'Tegas / Kotak (4px)', desc: 'Industrial Presisi' },
                { id: 'rounded', label: 'Modern (12px)', desc: 'Standar Rapi' },
                { id: 'soft', label: 'Lembut (22px)', desc: 'Ekstra Halus' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleUpdate({ radius: r.id as ThemeRadius })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme.radius === r.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{r.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      theme.radius === r.id ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>4. Ukuran Font &amp; Kepadatan Layar</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact', label: 'Ringkas (14.5px)', desc: 'Layar HP Operator' },
                { id: 'normal', label: 'Normal (16px)', desc: 'Standar Seimbang' },
                { id: 'spacious', label: 'Lapang (17.5px)', desc: 'Teks Besar & Jelas' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleUpdate({ density: d.id as ThemeDensity })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme.density === d.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{d.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      theme.density === d.id ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {d.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCancelAndClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-primary, #0d9488)',
              }}
            >
              Simpan &amp; Terapkan Tema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
