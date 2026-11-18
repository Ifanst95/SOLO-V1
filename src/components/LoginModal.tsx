import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Palette,
} from 'lucide-react';
import { UserRole } from '../types';
import { loginAdminOnServer } from '../lib/cloudApi';

interface LoginModalProps {
  onLogin: (role: UserRole, operatorName?: string) => void;
  onOpenThemeModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onOpenThemeModal }) => {
  const [selectedRole, setSelectedRole] = useState<'operator' | 'admin'>('operator');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [opName, setOpName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('solo_admin_user');
      localStorage.removeItem('solo_admin_pass');
    } catch (e) {
      // ignore
    }
  }, []);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await loginAdminOnServer(adminUser, adminPass);
      if (res.success) {
        onLogin('admin');
      } else {
        setErrorMsg(res.error || 'Username atau password admin tidak valid.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses autentikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin('operator', opName.trim() || 'Operator Kemas');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {onOpenThemeModal && (
        <button
          type="button"
          onClick={onOpenThemeModal}
          className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs backdrop-blur-xs transition-colors cursor-pointer shadow-md"
          title="Ganti Tema & Tampilan"
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>Ganti Tema</span>
        </button>
      )}

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200/80 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-8 text-white text-center relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-400 to-teal-200 flex items-center justify-center shadow-xl shadow-teal-500/25 text-slate-950 font-black text-3xl tracking-tight mb-3">
            S
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SOLO SYSTEM</h1>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-extrabold uppercase tracking-widest mt-1.5">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Sampel Online &amp; LHP Online</span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 max-w-xs mx-auto leading-relaxed">
            Sistem inspeksi kualitas kemasan farmasi &amp; pelaporan hasil produksi terpusat
          </p>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
          <button
            onClick={() => {
              setSelectedRole('operator');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center space-x-2 cursor-pointer ${
              selectedRole === 'operator'
                ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>OPERATOR PRODUKSI</span>
          </button>
          <button
            onClick={() => {
              setSelectedRole('admin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center space-x-2 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-white text-amber-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>ADMIN PRODUKSI</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {selectedRole === 'operator' ? (
            <form onSubmit={handleOperatorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Operator (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso / Line 1"
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-colors"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Akses langsung pengambilan foto sampel kemasan &amp; input LHP harian
                </span>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-200/70 rounded-xl text-xs text-teal-950 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-teal-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Fitur Operator:</span>
                </div>
                <p className="text-[11px] text-teal-800/90 leading-tight">
                  &bull; 5 Foto Sampel &amp; Validasi QC real-time<br />
                  &bull; Scan Text Otomatis No Batch &amp; Exp Date<br />
                  &bull; Perhitungan Pallet &amp; Box Otomatis
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <span>Masuk Sebagai Operator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username Admin
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Masukkan username"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk Sebagai Admin'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500 z-10">
        <p>Sistem SOLO Produksi &copy; {new Date().getFullYear()} &middot; Terintegrasi Cloud Realtime</p>
      </div>
    </div>
  );
};
