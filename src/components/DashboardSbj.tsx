import React, { useState } from 'react';
import {
  Download,
  Search,
  Layers,
  FileCheck,
  FileSpreadsheet,
  Table,
} from 'lucide-react';
import { SampleRecord, LhpRecord } from '../types';
import {
  exportFullSoloSpreadsheet,
  exportLhpSpreadsheetXlsx,
  exportSamplesSpreadsheetXlsx,
} from '../lib/excelSpreadsheet';

interface DashboardSbjProps {
  samples: SampleRecord[];
  lhps: LhpRecord[];
}

export const DashboardSbj: React.FC<DashboardSbjProps> = ({
  samples,
  lhps,
}) => {
  const [activeTab, setActiveTab] = useState<'sbj' | 'lhp'>('sbj');
  const [search, setSearch] = useState('');

  const validatedSamples = samples.filter((s) => s.status !== 'pending');
  const [notification, setNotification] = useState<string | null>(null);

  const showTempNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExportFullExcel = () => {
    if (samples.length === 0 && lhps.length === 0) {
      showTempNotif('Belum ada data untuk diekspor ke spreadsheet.');
      return;
    }
    const fileName = exportFullSoloSpreadsheet({
      samples,
      lhps,
      fileNamePrefix: 'SOLO_Rekap_Produksi_SBJ',
    });
    showTempNotif(`Spreadsheet berhasil diekspor: ${fileName}`);
  };

  const handleExportTabExcel = () => {
    if (activeTab === 'sbj') {
      if (validatedSamples.length === 0) {
        showTempNotif('Belum ada data sampel tervalidasi untuk diekspor.');
        return;
      }
      exportSamplesSpreadsheetXlsx(validatedSamples, `Rekap_Sampel_SBJ_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showTempNotif('Spreadsheet Sampel SBJ (.xlsx) berhasil diunduh.');
    } else {
      if (lhps.length === 0) {
        showTempNotif('Belum ada data LHP untuk diekspor.');
        return;
      }
      exportLhpSpreadsheetXlsx(lhps, `Data_LHP_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showTempNotif('Spreadsheet LHP (.xlsx) berhasil diunduh.');
    }
  };

  const downloadLhpCsv = () => {
    if (lhps.length === 0) {
      showTempNotif('Belum ada data LHP untuk diunduh.');
      return;
    }
    const headers = [
      'Waktu Input',
      'Batch LHP 1',
      'Batch LHP 2',
      'WO Mixing 1',
      'WO Mixing 2',
      'Item 1',
      'Item 2',
      'Exp Date',
      'Kode Batch',
      'Prod Date',
      'PBE',
      'Std Box/Pallet',
      'Pallet Full',
      'Pallet Full (Box)',
      'Pallet Koma',
      'Koma Lebih',
      'Total Produksi',
      'Counter Terakhir',
      'Sampel Port',
      'Status MTOL',
    ];
    const rows = lhps.map((l) => [
      l.at,
      l.b1,
      l.b2 || '-',
      l.w1 || '-',
      l.w2 || '-',
      l.n1 || '-',
      l.n2 || '-',
      l.ex || '-',
      l.kb || '-',
      l.pr || '-',
      l.pbe || '-',
      l.sb,
      l.pf,
      l.pfb,
      l.pk,
      l.kl,
      l.tt,
      l.ct,
      l.sp || '-',
      l.mtol,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lhp_rekap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSbjCsv = () => {
    if (validatedSamples.length === 0) {
      showTempNotif('Belum ada data sampel tervalidasi untuk diunduh.');
      return;
    }
    const headers = [
      'ID Sampel',
      'Waktu Input',
      'Nama Operator',
      'Mesin Packing',
      'Filling LHP 1',
      'Filling LHP 2',
      'Prod Date',
      'Catatan Operator',
      'Status Validasi Produksi',
      'Parameter Hasil',
      'Alasan Reject / Catatan',
      'Waktu Validasi',
    ];
    const rows = validatedSamples.map((s) => [
      s.id,
      s.at,
      s.op,
      s.pk,
      s.f1,
      s.f2,
      s.pd || '-',
      s.note,
      s.status === 'ok' ? 'OKE' : 'TIDAK OKE',
      s.params?.join('; ') || '-',
      [...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-',
      s.validatedAt || '-',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_validasi_produksi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {notification && (
        <div className="fixed top-20 right-5 z-50 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold animate-in fade-in flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-extrabold tracking-widest bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
              Laporan &amp; Rekapitulasi
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
              <FileSpreadsheet className="w-3 h-3" />
              <span>Spreadsheet Ready</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1">Dashboard SBJ &amp; Data LHP Produksi</h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Rekapitulasi sampel tervalidasi dan log LHP operator siap cetak &amp; simpan ke spreadsheet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportFullExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-emerald-500/30"
            title="Download seluruh data dalam format Spreadsheet Excel (.xlsx) rapi"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Ekspor Semua (.xlsx)</span>
          </button>
          <button
            onClick={handleExportTabExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold rounded-xl border border-teal-500/40 transition-colors cursor-pointer"
            title={`Download ${activeTab === 'sbj' ? 'Sampel SBJ' : 'Data LHP'} dalam format Spreadsheet Excel (.xlsx)`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{activeTab === 'sbj' ? 'Excel SBJ' : 'Excel LHP'}</span>
          </button>
          <button
            onClick={activeTab === 'sbj' ? downloadSbjCsv : downloadLhpCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Unduh dalam format CSV sederhana"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('sbj')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sbj'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4 text-teal-400" />
            <span>1. Rekap Sampel Tervalidasi Produksi ({validatedSamples.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('lhp')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'lhp'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-400" />
            <span>2. Data LHP Operator ({lhps.length})</span>
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari mesin, operator, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {activeTab === 'sbj' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Waktu Input</th>
                  <th className="py-3 px-3">Mesin Packing</th>
                  <th className="py-3 px-3">Mesin Filling 1 / 2</th>
                  <th className="py-3 px-3">Operator</th>
                  <th className="py-3 px-3">PROD DATE</th>
                  <th className="py-3 px-3">Status Validasi</th>
                  <th className="py-3 px-3">Parameter Inspeksi</th>
                  <th className="py-3 px-3">Catatan / Alasan Reject</th>
                  <th className="py-3 px-3">Waktu Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validatedSamples.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada data sampel yang divalidasi oleh Admin.
                    </td>
                  </tr>
                ) : (
                  validatedSamples
                    .filter((s) => {
                      if (!search) return true;
                      const term = search.toLowerCase();
                      return (
                        s.pk.toLowerCase().includes(term) ||
                        s.op.toLowerCase().includes(term) ||
                        s.f1.toLowerCase().includes(term) ||
                        s.f2.toLowerCase().includes(term) ||
                        s.at.toLowerCase().includes(term)
                      );
                    })
                    .map((s, idx) => (
                      <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{s.at}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{s.pk}</td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {s.f1} / {s.f2}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">{s.op}</td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">{s.pd || '-'}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {s.status === 'ok' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              OKE
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                              REJECT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-xs whitespace-normal">
                          {s.params?.join(' &bull; ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-rose-700 font-semibold max-w-xs whitespace-normal">
                          {[...(s.reasons || []), s.other].filter(Boolean).join(' | ') || '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {s.validatedAt || '-'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lhp' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Waktu Input</th>
                  <th className="py-3 px-4">Batch LHP 1</th>
                  <th className="py-3 px-4">Batch LHP 2</th>
                  <th className="py-3 px-4">WO Mixing</th>
                  <th className="py-3 px-4">Nama Item</th>
                  <th className="py-3 px-4">EXP DATE</th>
                  <th className="py-3 px-4">KODE BATCH</th>
                  <th className="py-3 px-4">TOTAL HASIL</th>
                  <th className="py-3 px-4">COUNTER</th>
                  <th className="py-3 px-4">SAMPEL PORT</th>
                  <th className="py-3 px-4 text-center">MTOL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lhps.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Belum ada data input LHP dari operator.
                    </td>
                  </tr>
                ) : (
                  lhps
                    .filter((l) => {
                      if (!search) return true;
                      const term = search.toLowerCase();
                      return (
                        l.b1.toLowerCase().includes(term) ||
                        (l.b2 || '').toLowerCase().includes(term) ||
                        (l.kb || '').toLowerCase().includes(term) ||
                        (l.w1 || '').toLowerCase().includes(term) ||
                        (l.n1 || '').toLowerCase().includes(term)
                      );
                    })
                    .map((l, idx) => (
                      <tr key={`${l.id ?? l.b1}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{l.at}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{l.b1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{l.b2 || '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {l.w1}{l.w2 && l.w2 !== l.w1 ? ` / ${l.w2}` : ''}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{l.n1 || '-'}</td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">{l.ex}</td>
                        <td className="py-3 px-4 font-mono uppercase whitespace-nowrap">{l.kb}</td>
                        <td className="py-3 px-4 font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/50">{l.tt}</td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">{l.ct}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{l.sp || '-'}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              l.mtol === 'Sesuai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.mtol}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
