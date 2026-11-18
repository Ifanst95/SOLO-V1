import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Plus,
  Link,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Sparkles,
  Unlink,
  Download,
} from 'lucide-react';
import {
  createSoloSpreadsheet,
  ensureSoloSheetsExist,
  syncAllToSheet,
} from '../lib/googleSheets';
import { googleSignIn, logoutGoogle, getAccessToken, initAuth } from '../lib/firebase';
import { SampleRecord, LhpRecord, AppConfig } from '../types';
import { exportFullSoloSpreadsheet } from '../lib/excelSpreadsheet';

interface SheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (cfg: AppConfig) => void;
  samples: SampleRecord[];
  lhps: LhpRecord[];
  onSyncSuccess?: (msg: string) => void;
}

export const SheetsModal: React.FC<SheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  samples,
  lhps,
  onSyncSuccess,
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [inputSheetUrl, setInputSheetUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'ok' | 'err';
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      if (config.sheetId) {
        setInputSheetUrl(`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`);
      } else {
        setInputSheetUrl('');
      }
    }
  }, [isOpen, config.sheetId]);

  if (!isOpen) return null;

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    return trimmed;
  };

  const ensureToken = async (): Promise<string> => {
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) {
        throw new Error('Silakan masuk dengan Akun Google terlebih dahulu.');
      }
      token = authRes.accessToken;
      setGoogleUser(authRes.user);
    }
    return token;
  };

  const handleLoginGoogle = async () => {
    setIsLoggingIn(true);
    setFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setFeedback({ text: 'Berhasil login dengan Akun Google!', type: 'ok' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Gagal login Google.', type: 'err' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setFeedback({ text: 'Akun Google telah dikeluarkan.', type: 'ok' });
  };

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
    setFeedback(null);
    try {
      const token = await ensureToken();
      const res = await createSoloSpreadsheet(
        token,
        `SOLO - Database Sampel & LHP (${new Date().toLocaleDateString('id-ID')})`
      );
      const newCfg: AppConfig = {
        ...config,
        sheetId: res.spreadsheetId,
        autoSyncSheets: true,
      };
      onSaveConfig(newCfg);
      setFeedback({
        text: 'Google Spreadsheet baru berhasil dibuat dan dihubungkan!',
        type: 'ok',
      });
      if (samples.length > 0 || lhps.length > 0) {
        syncAllToSheet(token, res.spreadsheetId, samples, lhps).catch(() => {});
      }
      if (onSyncSuccess) onSyncSuccess('Spreadsheet baru berhasil dibuat!');
    } catch (err: any) {
      setFeedback({
        text: err.message || 'Gagal membuat Google Spreadsheet baru.',
        type: 'err',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExistingSheet = async () => {
    const sId = extractSpreadsheetId(inputSheetUrl);
    if (!sId) {
      setFeedback({ text: 'Silakan masukkan Link atau ID Google Spreadsheet.', type: 'err' });
      return;
    }
    setIsConnecting(true);
    setFeedback(null);
    try {
      const token = await ensureToken();
      await ensureSoloSheetsExist(token, sId, true);
      const newCfg: AppConfig = {
        ...config,
        sheetId: sId,
        autoSyncSheets: true,
      };
      onSaveConfig(newCfg);
      setFeedback({
        text: 'Spreadsheet berhasil diverifikasi dan dihubungkan!',
        type: 'ok',
      });
      if (onSyncSuccess) onSyncSuccess('Spreadsheet berhasil dihubungkan!');
    } catch (err: any) {
      setFeedback({
        text: err.message || 'Gagal menghubungkan Spreadsheet.',
        type: 'err',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAllData = async () => {
    if (!config.sheetId) return;
    setIsSyncing(true);
    setFeedback(null);
    try {
      const token = await ensureToken();
      await syncAllToSheet(token, config.sheetId, samples, lhps);
      setFeedback({
        text: `Semua data (${samples.length} sampel, ${lhps.length} log LHP) berhasil disinkronkan ke Google Spreadsheet!`,
        type: 'ok',
      });
      if (onSyncSuccess) onSyncSuccess('Sinkronisasi Google Spreadsheet berhasil!');
    } catch (err: any) {
      setFeedback({
        text: err.message || 'Gagal melakukan sinkronisasi data ke Spreadsheet.',
        type: 'err',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    onSaveConfig({
      ...config,
      sheetId: undefined,
      autoSyncSheets: false,
    });
    setInputSheetUrl('');
    setFeedback({ text: 'Tautan Google Spreadsheet telah dilepas.', type: 'ok' });
  };

  const isConnected = !!config.sheetId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white font-black text-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                  Penyimpanan Google Spreadsheet
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/25 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Online Sync
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Sinkronisasi otomatis hasil inspeksi sampel QC, rekap SBJ, dan log LHP ke Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center space-x-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {googleUser?.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt="Google Avatar"
                  className="w-10 h-10 rounded-full border border-slate-300"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  G
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {googleUser?.displayName || 'Belum Terhubung ke Google'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {googleUser?.email || 'Login untuk mengizinkan sinkronisasi Google Sheets'}
                </div>
              </div>
            </div>
            <div>
              {googleUser ? (
                <button
                  type="button"
                  onClick={handleLogoutGoogle}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ganti Akun</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoginGoogle}
                  disabled={isLoggingIn}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                </button>
              )}
            </div>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
                      Spreadsheet Terhubung
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Putuskan Hubungan</span>
                  </button>
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-medium">Spreadsheet ID:</div>
                  <div className="text-xs font-mono font-bold text-emerald-950 truncate mt-0.5">
                    {config.sheetId}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Google Spreadsheet</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleSyncAllData}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua Data'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportFullSoloSpreadsheet({
                        samples,
                        lhps,
                        fileNamePrefix: 'SOLO_Backup_Spreadsheet',
                      });
                      setFeedback({ text: 'Salinan Spreadsheet (.xlsx) berhasil diunduh.', type: 'ok' });
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unduh Salinan (.xlsx)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Sinkronisasi Otomatis (*Auto-sync*)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Kirim baris baru otomatis setiap kali verifikasi QC selesai divalidasi atau LHP diinput
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoSyncSheets}
                  onChange={(e) =>
                    onSaveConfig({
                      ...config,
                      autoSyncSheets: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                      Opsi 1: Buat Spreadsheet Baru Otomatis (Rekomendasi)
                    </h4>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      Sistem akan membuat Google Spreadsheet di Google Drive Anda dengan 3 tab lengkap berformat rapi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewSheet}
                  disabled={isCreating}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet Baru Sekarang'}</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-800 text-white rounded-xl">
                    <Link className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Opsi 2: Hubungkan Spreadsheet yang Sudah Ada
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Masukkan link atau Spreadsheet ID dari file Google Sheets milik Anda.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={inputSheetUrl}
                    onChange={(e) => setInputSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1Bxi.../edit"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleConnectExistingSheet}
                    disabled={isConnecting || !inputSheetUrl.trim()}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Link className="w-4 h-4" />
                    <span>{isConnecting ? 'Memverifikasi...' : 'Hubungkan Spreadsheet Ini'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-emerald-700 text-white rounded-xl">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Opsi 3: Unduh File Spreadsheet (.xlsx) Offline Langsung
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Download seluruh data sistem dalam format Microsoft Excel / Google Sheets (.xlsx) tanpa perlu login.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportFullSoloSpreadsheet({
                      samples,
                      lhps,
                      fileNamePrefix: 'SOLO_Database_Spreadsheet',
                    });
                    setFeedback({
                      text: 'File Spreadsheet Excel (.xlsx) berhasil diunduh ke komputer Anda.',
                      type: 'ok',
                    });
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Spreadsheet (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total Sampel: <span className="font-bold text-slate-800">{samples.length}</span> &middot; Total LHP: <span className="font-bold text-slate-800">{lhps.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
