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

        let parsed: MtolRecord[] = [];

        // Method 1: Object rows with fuzzy synonyms prioritizing exact BATCH NO and ITEM DESC
        if (rows && rows.length > 0) {
          parsed = rows
            .map((r) => {
              const keys = Object.keys(r);
              const findKey = (synonyms: string[]) => {
                for (const s of synonyms) {
                  const exact = keys.find((k) => k.trim().toUpperCase() === s.toUpperCase());
                  if (exact !== undefined) return r[exact];
                }
                for (const s of synonyms) {
                  const normS = s.toUpperCase().replace(/[\s_-]/g, '');
                  const normFound = keys.find(
                    (k) => k.trim().toUpperCase().replace(/[\s_-]/g, '') === normS
                  );
                  if (normFound !== undefined) return r[normFound];
                }
                for (const s of synonyms) {
                  const found = keys.find((k) => k.trim().toUpperCase().includes(s.toUpperCase()));
                  if (found !== undefined) return r[found];
                }
                return '';
              };

              const tglVal = findKey(['PLAN START DATE', 'PLAN_START_DATE', 'TGL', 'TANGGAL', 'DATE', 'WAKTU']);
              const woVal = findKey(['BATCH NO', 'BATCH_NO', 'NO BATCH', 'NO_BATCH', 'BATCH', 'WO', 'ORDER']);
              const codeVal = findKey(['ITEM CODE', 'ITEM_CODE', 'KODE ITEM', 'CODE', 'KODE', 'MATERIAL']);
              const itemVal = findKey(['ITEM DESC', 'ITEM_DESC', 'NAMA ITEM', 'DESCRIPTION', 'DESKRIPSI', 'ITEM', 'NAMA PRODUK']);
              const lotVal = findKey(['LOT NUMBER', 'LOT_NUMBER', 'NO LOT', 'LOT', 'BATCH LHP', 'BATCH_LHP']);
              const stVal = findKey(['STATUS', 'ST', 'STATE']);

              return {
                tgl: formatStr(tglVal),
                wo: formatStr(woVal),
                code: formatStr(codeVal),
                item: formatStr(itemVal),
                lot: formatStr(lotVal),
                st: formatStr(stVal) || 'RELEASED',
              };
            })
            .filter((r) => r.wo || r.lot || r.item || r.code);
        }

        // Method 2: Fallback to array-of-arrays (positional / raw rows) with dynamic header column detection
        if (parsed.length === 0) {
          const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          if (rawRows && rawRows.length > 0) {
            let headerRowIdx = -1;
            let batchNoCol = 1;
            let itemDescCol = 3;
            let lotCol = 4;
            let codeCol = 2;
            let dateCol = 0;
            let statusCol = 5;

            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
              const row = rawRows[i];
              if (!row) continue;
              const rowStrs = row.map((c: any) => String(c).trim().toUpperCase());
              
              const bIdx = rowStrs.findIndex((s) => s.includes('BATCH NO') || s.includes('BATCH_NO') || s === 'BATCH' || s === 'WO' || s.includes('NO BATCH'));
              const iIdx = rowStrs.findIndex((s) => s.includes('ITEM DESC') || s.includes('ITEM_DESC') || s === 'ITEM' || s.includes('DESCRIPTION') || s.includes('NAMA ITEM'));

              if (bIdx !== -1 || iIdx !== -1) {
                headerRowIdx = i;
                if (bIdx !== -1) batchNoCol = bIdx;
                if (iIdx !== -1) itemDescCol = iIdx;
                
                const lIdx = rowStrs.findIndex((s) => s.includes('LOT') || s.includes('BATCH LHP'));
                if (lIdx !== -1) lotCol = lIdx;

                const cIdx = rowStrs.findIndex((s) => s.includes('CODE') || s.includes('KODE'));
                if (cIdx !== -1) codeCol = cIdx;

                const dIdx = rowStrs.findIndex((s) => s.includes('DATE') || s.includes('TANGGAL') || s.includes('TGL'));
                if (dIdx !== -1) dateCol = dIdx;

                const sIdx = rowStrs.findIndex((s) => s.includes('STATUS'));
                if (sIdx !== -1) statusCol = sIdx;

                break;
              }
            }

            const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

            for (let i = startIdx; i < rawRows.length; i++) {
              const cols = rawRows[i];
              if (!cols || cols.every((c: any) => String(c).trim() === '')) continue;

              const tgl = formatStr(cols[dateCol] || cols[0] || '');
              const wo = formatStr(cols[batchNoCol] || cols[1] || cols[0] || '');
              const code = formatStr(cols[codeCol] || cols[2] || '');
              const item = formatStr(cols[itemDescCol] || cols[3] || cols[1] || 'Produk Umum');
              const lot = formatStr(cols[lotCol] || cols[4] || wo);
              const st = formatStr(cols[statusCol] || 'RELEASED');

              if (wo || lot || item || code) {
                parsed.push({
                  tgl: tgl.length >= 8 ? tgl : new Date().toISOString().slice(0, 10),
                  wo: wo || lot || 'WO-' + i,
                  code: code || '-',
                  item: item || 'Produk MTOL',
                  lot: lot || wo || '-',
                  st: st || 'RELEASED',
                });
              }
            }
          }
        }

        if (parsed.length === 0) {
          setMsg({
            type: 'err',
            text: 'Gagal membaca data dari file. Pastikan file Excel berisi data baris yang valid.',
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
                <th className="py-3 px-4">BATCH NO</th>
                <th className="py-3 px-4">ITEM DESC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMtol.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-400">
                    Tidak ada data MTOL yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredMtol.map((r, i) => (
                  <tr key={`${r.wo}-${r.lot}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800 whitespace-nowrap">
                      {r.wo}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{r.item}</td>
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
