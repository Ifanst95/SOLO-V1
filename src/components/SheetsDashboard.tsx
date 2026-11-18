import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Plus,
  Link,
  CheckCircle2,
  LogIn,
  LogOut,
  Layers,
  Sparkles,
  Database,
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

interface SheetsDashboardProps {
  config: AppConfig;
  onSaveConfig: (cfg: AppConfig) => void;
  samples: SampleRecord[];
  lhps: LhpRecord[];
  onShowToast: (msg: string, type?: 'ok' | 'err' | 'info') => void;
}

export const SheetsDashboard: React.FC<SheetsDashboardProps> = ({
  config,
  onSaveConfig,
  samples,
  lhps,
  onShowToast,
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'sbj' | 'lhp' | 'sample'>('sbj');

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
    if (config.sheetId) {
      setInputUrl(`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`);
    } else {
      setInputUrl('');
    }
  }, [config.sheetId]);

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
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        onShowToast('Berhasil login dengan Akun Google!', 'ok');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Gagal login Google.', 'err');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    onShowToast('Akun Google telah dikeluarkan.', 'info');
  };

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
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
      onShowToast('Google Spreadsheet baru berhasil dibuat dan dihubungkan!', 'ok');
      if (samples.length > 0 || lhps.length > 0) {
        syncAllToSheet(token, res.spreadsheetId, samples, lhps).catch(() => {});
      }
    } catch (err: any) {
      onShowToast(err.message || 'Gagal membuat Google Spreadsheet baru.', 'err');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = async () => {
    const sId = extractSpreadsheetId(inputUrl);
    if (!sId) {
      onShowToast('Masukkan URL atau ID Google Spreadsheet.', 'err');
      return;
    }
    setIsConnecting(true);
    try {
      const token = await ensureToken();
      await ensureSoloSheetsExist(token, sId, true);
      const newCfg: AppConfig = {
        ...config,
        sheetId: sId,
        autoSyncSheets: true,
      };
      onSaveConfig(newCfg);
      onShowToast('Google Spreadsheet berhasil dihubungkan!', 'ok');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghubungkan spreadsheet.', 'err');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAllNow = async () => {
    if (!config.sheetId) {
      onShowToast('Hubungkan spreadsheet terlebih dahulu.', 'err');
      return;
    }
    setIsSyncing(true);
    try {
      const token = await ensureToken();
      await syncAllToSheet(token, config.sheetId, samples, lhps);
      onShowToast(
        `Berhasil menyinkronkan ${samples.length} sampel dan ${lhps.length} data LHP ke Spreadsheet!`,
        'ok'
      );
    } catch (err: any) {
      onShowToast(err.message || 'Gagal melakukan sinkronisasi.', 'err');
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
    setInputUrl('');
    onShowToast('Tautan Google Spreadsheet telah dilepas.', 'info');
  };

  const isConnected = !!config.sheetId;
  const validatedSamples = samples.filter((s) => s.status !== 'pending');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 rounded-3xl p-6 sm:p-8 text-white border border-emerald-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/40 text-white font-black text-2xl shrink-0">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="text-xs uppercase font-extrabold tracking-widest bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/40">
                  Google Workspace
                </span>
                {isConnected ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-300 font-bold">Spreadsheet Aktif</span>
                  </>
                ) : (
                  <span className="text-xs text-amber-300 font-bold">Belum Terhubung</span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                Penyimpanan &amp; Sinkronisasi Google Spreadsheet
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-2xl">
                Hubungkan sistem SOLO ke Google Spreadsheet Anda untuk pencatatan otomatis hasil inspeksi sampel QC, log produksi LHP, dan rekapitulasi SBJ.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                const fileName = exportFullSoloSpreadsheet({
                  samples,
                  lhps,
                  fileNamePrefix: 'SOLO_Database_Spreadsheet',
                });
                onShowToast(`File spreadsheet berhasil diunduh: ${fileName}`, 'ok');
              }}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-emerald-500/40 transition-all cursor-pointer shadow-md"
              title="Unduh seluruh data dalam format Microsoft Excel / Google Sheets (.xlsx) langsung"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Ekspor File (.xlsx)</span>
            </button>
            {isConnected && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-750 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer backdrop-blur-xs"
              >
                <ExternalLink className="w-4 h-4 text-emerald-300" />
                <span>Buka di Google Sheets</span>
              </a>
            )}
            <button
              onClick={handleSyncAllNow}
              disabled={isSyncing || !isConnected}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Status Spreadsheet</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 truncate">
            {isConnected ? 'Terhubung' : 'Terputus'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {config.sheetId ? `ID: ${config.sheetId.slice(0, 16)}...` : 'Belum ada ID'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Sampel SBJ Tervalidasi</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{validatedSamples.length} Data</div>
          <div className="text-[11px] text-teal-600 font-semibold mt-1">
            Tab: DATA_SBJ_SUMMARY
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Log LHP Produksi</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{lhps.length} Baris</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            Tab: DATA_LHP
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Auto-Sync</span>
            <RefreshCw className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">
            {config.autoSyncSheets ? 'Aktif Otomatis' : 'Manual'}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            Real-time row append
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center space-x-3">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt="Google Avatar"
                className="w-12 h-12 rounded-full border border-slate-300"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
                G
              </div>
            )}
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                {googleUser?.displayName || 'Autentikasi Akun Google'}
              </div>
              <div className="text-xs text-slate-500">
                {googleUser?.email || 'Login untuk memberikan otorisasi sinkronisasi ke Google Drive Anda'}
              </div>
            </div>
          </div>
          <div>
            {googleUser ? (
              <button
                type="button"
                onClick={handleLogoutGoogle}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar dari Google</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLoginGoogle}
                disabled={isLoggingIn}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
              </button>
            )}
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-extrabold text-emerald-950">
                    Spreadsheet Berhasil Terhubung
                  </span>
                </div>
                <div className="text-xs font-mono text-emerald-800 mt-1 truncate max-w-xl">
                  ID: {config.sheetId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Sheets</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Putuskan
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Sinkronisasi Otomatis (*Auto-sync*)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Secara otomatis menambahkan baris baru ke Google Sheets setiap kali sampel divalidasi atau LHP diinput.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-emerald-950 font-extrabold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Opsi 1: Buat Spreadsheet Baru Otomatis</span>
                </div>
                <p className="text-xs text-emerald-800/80 mt-1">
                  Sistem akan membuat Google Spreadsheet di Google Drive Anda dengan 3 tab otomatis: DATA_SAMPEL_QC, DATA_LHP, dan DATA_SBJ_SUMMARY.
                </p>
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

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span>Opsi 2: Hubungkan Spreadsheet yang Sudah Ada</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan link atau Spreadsheet ID dari file Google Sheets milik Anda.
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1Bxi.../edit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleConnectExisting}
                  disabled={isConnecting || !inputUrl.trim()}
                  className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Link className="w-4 h-4" />
                  <span>{isConnecting ? 'Memverifikasi...' : 'Hubungkan Spreadsheet'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Pratinjau Data yang Disinkronkan
            </h3>
            <p className="text-xs text-slate-500">
              Data yang dikirim dan tersimpan di tab Google Spreadsheet
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActivePreviewTab('sbj')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'sbj'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DATA_SBJ_SUMMARY ({validatedSamples.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('lhp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'lhp'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DATA_LHP ({lhps.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('sample')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'sample'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DATA_SAMPEL_QC ({samples.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {activePreviewTab === 'sbj' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4">ID Sampel</th>
                  <th className="py-3 px-4">Waktu Validasi</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Mesin</th>
                  <th className="py-3 px-4">Status QC</th>
                  <th className="py-3 px-4">Batch 1</th>
                  <th className="py-3 px-4">Batch 2</th>
                  <th className="py-3 px-4">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validatedSamples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada sampel yang tervalidasi.
                    </td>
                  </tr>
                ) : (
                  validatedSamples.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold">{s.id}</td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{s.validatedAt || s.at}</td>
                      <td className="py-2.5 px-4">{s.op}</td>
                      <td className="py-2.5 px-4">{s.pk}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            s.status === 'ok'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">{s.ocr?.b1 || s.f1 || '-'}</td>
                      <td className="py-2.5 px-4 font-mono">{s.ocr?.b2 || s.f2 || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{s.reasons?.join(', ') || s.other || s.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activePreviewTab === 'lhp' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4">Waktu Input</th>
                  <th className="py-3 px-4">Batch 1</th>
                  <th className="py-3 px-4">Batch 2</th>
                  <th className="py-3 px-4">WO 1</th>
                  <th className="py-3 px-4">Produk 1</th>
                  <th className="py-3 px-4">Exp Date</th>
                  <th className="py-3 px-4">Pack</th>
                  <th className="py-3 px-4">Inner Dus</th>
                  <th className="py-3 px-4">Karton</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lhps.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Belum ada data LHP.
                    </td>
                  </tr>
                ) : (
                  lhps.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{l.at}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{l.b1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{l.b2}</td>
                      <td className="py-2.5 px-4">{l.w1}</td>
                      <td className="py-2.5 px-4">{l.n1}</td>
                      <td className="py-2.5 px-4">{l.ex}</td>
                      <td className="py-2.5 px-4 font-bold">{l.pk}</td>
                      <td className="py-2.5 px-4 font-bold">{l.pf}</td>
                      <td className="py-2.5 px-4 font-bold">{l.pfb}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activePreviewTab === 'sample' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4">ID Sampel</th>
                  <th className="py-3 px-4">Waktu Input</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Mesin Packing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada sampel.
                    </td>
                  </tr>
                ) : (
                  samples.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold">{s.id}</td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{s.at}</td>
                      <td className="py-2.5 px-4">{s.op}</td>
                      <td className="py-2.5 px-4">{s.pk}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            s.status === 'ok'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'nok'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{s.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
