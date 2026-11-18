import React, { useState } from 'react';
import {
  LogOut,
  User,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  Smartphone,
  X,
  Palette,
  FileSpreadsheet,
} from 'lucide-react';
import { UserRole, ActiveTab } from '../types';

interface NavbarProps {
  role: UserRole;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSwitchRole: () => void;
  onLogout: () => void;
  googleUser?: any;
  sheetId?: string;
  isSyncing?: boolean;
  onOpenSheetsModal?: () => void;
  onOpenThemeModal?: () => void;
  isSheetsConnected?: boolean;
  isCloudConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  activeTab,
  setActiveTab,
  onSwitchRole,
  onLogout,
  onOpenThemeModal,
  onOpenSheetsModal,
  isSheetsConnected = false,
  isCloudConnected = true,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-slate-950 font-black text-xl tracking-tight">
                S
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
                    SOLO
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Produksi &amp; LHP Online
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Sistem Sampel &amp; Validasi Produksi Terintegrasi
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 border border-slate-700 text-teal-300"
                title="Sistem tersinkronisasi online di internet antar perangkat"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isCloudConnected ? 'Cloud Online' : 'Mode Offline'}</span>
              </div>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
                title="Akses Online Dimana Saja"
              >
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Akses Online</span>
              </button>

              <button
                type="button"
                onClick={onOpenThemeModal}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Ganti Tema & Kustomisasi Tampilan"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ganti Tema</span>
              </button>

              {onOpenSheetsModal && (
                <button
                  type="button"
                  onClick={onOpenSheetsModal}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSheetsConnected
                      ? 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border-emerald-600/60'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                  }`}
                  title="Penyimpanan & Sinkronisasi Google Spreadsheet"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isSheetsConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Spreadsheet</span>
                  {isSheetsConnected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                </button>
              )}

              {role && (
                <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                  {role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-amber-300">Admin</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5 text-teal-400" />
                      <span className="font-semibold text-teal-300">Operator</span>
                    </>
                  )}
                </div>
              )}

              {role ? (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={onSwitchRole}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700 cursor-pointer"
                  >
                    Ganti Peran
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Keluar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {role && (
            <div className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none text-xs sm:text-sm">
              {role === 'operator' ? (
                <>
                  <button
                    onClick={() => setActiveTab('isam')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'isam'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    1. Input Sampel Foto
                  </button>
                  <button
                    onClick={() => setActiveTab('ilhp')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'ilhp'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    2. Input LHP &amp; Pallet
                  </button>
                  <button
                    onClick={() => setActiveTab('stat')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'stat'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    3. Status Validasi
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('dsam')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'dsam'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    1. Dashboard Sampel &amp; Inspeksi
                  </button>
                  <button
                    onClick={() => setActiveTab('dsbj')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'dsbj'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    2. Dashboard SBJ &amp; LHP
                  </button>
                  <button
                    onClick={() => setActiveTab('mtol')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'mtol'
                        ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    3. Data MTOL Produksi
                  </button>
                  <button
                    onClick={() => setActiveTab('sheets')}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === 'sheets'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                    <span>4. Penyimpanan Spreadsheet</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Akses Online Dimana Saja</h3>
                  <p className="text-xs text-slate-300">
                    Gunakan website ini di HP, tablet, atau PC di seluruh area pabrik
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Link Publik Aplikasi:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all flex items-center space-x-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-2">
                <div className="flex items-center space-x-2 text-teal-900 font-bold">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>Tips Penggunaan di HP Operator &amp; Tablet QC:</span>
                </div>
                <ul className="text-teal-950/80 space-y-1 list-disc list-inside">
                  <li>Buka link di browser Chrome (Android) atau Safari (iPhone).</li>
                  <li>
                    Pilih menu browser <b>"Tambahkan ke Layar Utama" (Add to Home screen)</b> untuk menginstal aplikasi SOLO seperti aplikasi bawaan HP.
                  </li>
                  <li>Kamera dan foto sampel dapat langsung diunggah secara real-time dari jalur mesin kemas.</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
