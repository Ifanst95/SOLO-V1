import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Bell,
} from 'lucide-react';
import { SampleRecord, UserRole } from '../types';

interface OperatorStatusProps {
  samples: SampleRecord[];
  operatorMachine?: string;
  role?: UserRole;
}

export const OperatorStatus: React.FC<OperatorStatusProps> = ({
  samples,
  operatorMachine,
  role = 'operator',
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'ok' | 'nok'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const relevantSamples = role === 'operator' && operatorMachine
    ? samples.filter((s) => s.pk === operatorMachine)
    : samples;

  const filteredSamples = [...relevantSamples]
    .reverse()
    .filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.pk.toLowerCase().includes(term) ||
        s.op.toLowerCase().includes(term) ||
        s.f1.toLowerCase().includes(term) ||
        s.f2.toLowerCase().includes(term) ||
        s.at.toLowerCase().includes(term)
      );
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-snug">Status Validasi Sampel Produksi</h3>
            <p className="text-xs text-teal-100/80">
              Notifikasi suara alarm otomatis berbunyi di perangkat ini saat Admin Produksi menyetujui atau menolak sampel
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
              Filter:
            </span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({relevantSamples.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Menunggu ({relevantSamples.filter((s) => s.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('ok')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'ok'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              OKE ({relevantSamples.filter((s) => s.status === 'ok').length})
            </button>
            <button
              onClick={() => setFilter('nok')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'nok'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Tidak Oke ({relevantSamples.filter((s) => s.status === 'nok').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari mesin / operator..."
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
                <th className="py-3 px-4">Waktu Input</th>
                <th className="py-3 px-4">Mesin Packing</th>
                <th className="py-3 px-4">Mesin Filling</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Status Produksi</th>
                <th className="py-3 px-4">Hasil / Alasan Reject Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data sampel yang cocok.
                  </td>
                </tr>
              ) : (
                filteredSamples.map((s, idx) => (
                  <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {s.at}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {s.pk}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {s.f1} / {s.f2}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{s.op}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {s.status === 'ok' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>OKE</span>
                        </span>
                      )}
                      {s.status === 'nok' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>TIDAK OKE</span>
                        </span>
                      )}
                      {s.status === 'pending' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>MENUNGGU PRODUKSI</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {s.status === 'nok' ? (
                        <div className="space-y-1">
                          {s.reasons?.map((r, i) => (
                            <div
                              key={i}
                              className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                            >
                              &bull; {r}
                            </div>
                          ))}
                          {s.other && (
                            <div className="text-[11px] text-slate-700 italic">
                              Catatan: {s.other}
                            </div>
                          )}
                        </div>
                      ) : s.status === 'ok' ? (
                        <span className="text-emerald-700 font-medium text-xs">
                          {s.params?.join(' &bull; ') || 'Semua parameter sesuai'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sedang diperiksa oleh Admin Produksi...</span>
                      )}
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
