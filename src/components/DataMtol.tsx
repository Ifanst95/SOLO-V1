import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MtolRecord } from '../types';
import { SEED_MTOL_DATA } from '../lib/constants';

interface DataMtolProps {
  mtolData: MtolRecord[];
  onUpdateMtol: (data: MtolRecord[]) => void;
}

export const DataMtol: React.FC<DataMtolProps> = ({ mtolData, onUpdateMtol }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

        const formatStr = (v: any) =>
          v instanceof Date
            ? v.toISOString().slice(0, 10)
            : String(v ?? '').trim();

        const parsed: MtolRecord[] = rows
          .filter((r) => formatStr(r['BATCH NO'] || r['BATCH_NO'] || r['wo']))
          .map((r) => ({
            tgl: formatStr(r['PLAN START DATE'] || r['PLAN_START_DATE'] || r['tgl']),
            wo: formatStr(r['BATCH NO'] || r['BATCH_NO'] || r['wo']),
            code: formatStr(r['ITEM CODE'] || r['ITEM_CODE'] || r['code']),
            item: formatStr(r['ITEM DESC'] || r['ITEM_DESC'] || r['item']),
            lot: formatStr(r['LOT NUMBER'] || r['LOT_NUMBER'] || r['lot']),
            st: formatStr(r['STATUS'] || r['st']),
          }));

        if (parsed.length === 0) {
          setMsg({
            type: 'err',
            text: 'Format file tidak sesuai. Kolom "BATCH NO" tidak ditemukan dalam baris data.',
          });
          return;
        }

        onUpdateMtol(parsed);
        setMsg({
          type: 'ok',
          text: `Berhasil mengimpor ${parsed.length} baris data MTOL baru.`,
        });
      } catch (err: any) {
        setMsg({
          type: 'err',
          text: `Gagal membaca file spreadsheet: ${err.message}`,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadMtolSpreadsheet = () => {
    if (mtolData.length === 0) {
      setMsg({ type: 'err', text: 'Tidak ada data MTOL untuk diunduh.' });
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = [
      ['PLAN START DATE', 'BATCH NO', 'ITEM CODE', 'ITEM DESC', 'LOT NUMBER', 'STATUS'],
      ...mtolData.map((m) => [m.tgl, m.wo, m.code, m.item, m.lot, m.st]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'MASTER_MTOL');
    XLSX.writeFile(wb, `MTOL_Master_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMsg({ type: 'ok', text: 'Spreadsheet MTOL (.xlsx) berhasil diunduh.' });
  };

  const handleResetToSeed = () => {
    if (window.confirm('Reset data MTOL ke data template bawaan?')) {
      onUpdateMtol(SEED_MTOL_DATA);
      setMsg({ type: 'ok', text: 'Data MTOL berhasil direset ke template bawaan.' });
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Hapus seluruh data MTOL? Validasi otomatis LHP akan dinonaktifkan.')) {
      onUpdateMtol([]);
      setMsg({ type: 'ok', text: 'Seluruh data MTOL telah dihapus.' });
    }
  };

  const filteredMtol = mtolData.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.wo.toLowerCase().includes(term) ||
      r.item.toLowerCase().includes(term) ||
      r.lot.toLowerCase().includes(term) ||
      r.code.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase font-extrabold tracking-widest bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
            Master Data Produksi
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black mt-1">Data MTOL (Mixing &amp; Packaging Plan)</h2>
        <p className="text-sm text-slate-300 mt-0.5">
          Sumber referensi cross-check Nomer Batch (LOT NUMBER), WO Mixing (BATCH NO), dan Nama Item Produk
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'ok' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Unggah File MTOL Baru (.xlsx / .csv)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Format header standar: <b>PLAN START DATE</b>, <b>BATCH NO</b> (= WO Mixing),{' '}
              <b>LOT NUMBER</b> (= Nomer Batch LHP), <b>ITEM DESC</b>, <b>ITEM CODE</b>, <b>STATUS</b>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadMtolSpreadsheet}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Unduh data MTOL saat ini ke file Spreadsheet Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Spreadsheet (.xlsx)</span>
            </button>
            <button
              onClick={handleResetToSeed}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Template</span>
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-2xl p-6 text-center hover:bg-teal-50/60 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-teal-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">Pilih file MTOL dari komputer</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format Microsoft Excel (.xlsx, .xls) atau .csv</p>
          <label className="inline-flex items-center space-x-1.5 mt-3 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>Pilih File MTOL</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Daftar Baris MTOL Tersimpan</h4>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredMtol.length} dari total {mtolData.length} baris
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari WO, Batch, Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tgl Plan</th>
                <th className="py-3 px-4">BATCH NO (WO Mixing)</th>
                <th className="py-3 px-4">LOT NUMBER (Batch LHP)</th>
                <th className="py-3 px-4">ITEM CODE</th>
                <th className="py-3 px-4">ITEM DESC (Nama Produk)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMtol.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data MTOL yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredMtol.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {r.tgl || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800 whitespace-nowrap">
                      {r.wo}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {r.lot}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {r.code || '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{r.item}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {r.st || 'RELEASED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
