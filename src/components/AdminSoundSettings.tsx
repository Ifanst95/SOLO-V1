import React, { useState } from 'react';
import {
  Bell,
  Volume2,
  Save,
  UploadCloud,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppConfig } from '../types';
import { playSound } from '../lib/sound';
import { changeAdminPasswordOnServer } from '../lib/cloudApi';

interface AdminSoundSettingsProps {
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

export const AdminSoundSettings: React.FC<AdminSoundSettingsProps> = ({
  config,
  onSaveConfig,
}) => {
  const [tone, setTone] = useState<AppConfig['tone']>(config.tone || 'chime');
  const [vol, setVol] = useState<number>(config.vol ?? 0.7);
  const [customAudio, setCustomAudio] = useState<string | undefined>(config.custom);
  const [isSaved, setIsSaved] = useState(false);

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const handleTestSound = () => {
    playSound(tone, vol, customAudio);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomAudio(dataUrl);
      setTone('custom');
      setIsSaved(false);
      playSound('custom', vol, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppConfig = {
      ...config,
      tone,
      vol,
      custom: customAudio,
    };
    onSaveConfig(updated);
    setIsSaved(true);
    playSound(tone, vol, customAudio);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    if (newPass !== confirmPass) {
      setPassError('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (newPass.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }
    setPassLoading(true);
    try {
      const res = await changeAdminPasswordOnServer(currPass, newPass);
      if (res.success) {
        setPassSuccess('Password admin berhasil diperbarui dan disimpan!');
        setCurrPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setPassError(res.error || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      setPassError('Gagal menghubungi server.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Pengaturan Notifikasi Suara Validasi Produksi
              </h3>
              <p className="text-xs text-slate-500">
                Atur nada alarm, volume, dan file audio yang otomatis berbunyi saat sampel disetujui / ditolak
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-teal-400" />
            <span>Tes Bunyi Alarm</span>
          </button>
        </div>

        {isSaved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pengaturan notifikasi suara berhasil disimpan ke sistem!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pilihan Nada Alarm
              </label>
              <select
                value={tone}
                onChange={(e) => {
                  const nextTone = e.target.value as AppConfig['tone'];
                  setTone(nextTone);
                  setIsSaved(false);
                  playSound(nextTone, vol, customAudio);
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              >
                <option value="chime">Chime (Harmonis &amp; Bersahabat)</option>
                <option value="alarm">Alarm (Tegas &amp; Peringatan Kuat)</option>
                <option value="beep">Beep (Singkat Standar)</option>
                <option value="custom">Suara Custom (Unggah File Audio)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Volume Suara
                </label>
                <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {Math.round(vol * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={vol}
                onChange={(e) => {
                  setVol(Number(e.target.value));
                  setIsSaved(false);
                }}
                className="w-full accent-teal-600 cursor-pointer mt-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                File Audio Custom (.mp3 / .wav)
              </label>
              <label className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer border border-slate-300 transition-colors">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span className="truncate">
                  {customAudio ? 'Ganti File Suara' : 'Unggah File Audio'}
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={handleCustomAudioUpload}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Perubahan suara akan langsung diterapkan untuk seluruh notifikasi hasil validasi
            </span>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Notifikasi Suara</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Keamanan Akun &amp; Kredensial Admin
            </h3>
            <p className="text-xs text-slate-500">
              Ubah password akun admin untuk pengamanan akses sistem
            </p>
          </div>
        </div>

        {passSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Saat Ini
              </label>
              <input
                type="password"
                required
                placeholder="Password lama"
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Baru
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ulangi Password Baru
              </label>
              <input
                type="password"
                required
                placeholder="Ulangi password baru"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passLoading}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              {passLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{passLoading ? 'Menyimpan...' : 'Perbarui Password Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
