import React from 'react';
import {
  LogOut,
  User,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { UserRole, ActiveTab } from '../types';

interface NavbarProps {
  role: UserRole;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSwitchRole: () => void;
  onLogout: () => void;
  onOpenThemeModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  activeTab,
  setActiveTab,
  onSwitchRole,
  onLogout,
  onOpenThemeModal,
}) => {
  return (
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
            {onOpenThemeModal && (
              <button
                type="button"
                onClick={onOpenThemeModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-xs"
                title="Ganti Tema & Kustomisasi Tampilan"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ganti Tema</span>
              </button>
            )}

            {role && (
              <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs">
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
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700 cursor-pointer"
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
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
