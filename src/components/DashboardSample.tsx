import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ZoomIn,
  ZoomOut,
  Sun,
  Contrast,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  Sliders,
  AlertTriangle,
  Info,
  Maximize2,
  X,
  LayoutGrid,
  Square,
  Sparkles,
  Move,
  FileSpreadsheet,
  FileText,
  BookOpen,
} from 'lucide-react';
import {
  getInspectionParams,
  REJECTION_REASONS,
  getBoxPhotoDesc,
} from '../lib/constants';
import { SampleRecord, AppConfig, MtolRecord } from '../types';
import { exportSamplesSpreadsheetXlsx } from '../lib/excelSpreadsheet';
import {
  scanTextFrom7Photos,
  ScanExtractedData,
  evaluateVisualPrintCriteria,
  resolveFullWoFromMtol,
  cropImageHalf,
} from '../lib/ocr';
import { playSound } from '../lib/sound';
import { AdminSoundSettings } from './AdminSoundSettings';

interface DashboardSampleProps {
  samples: SampleRecord[];
  onValidate: (
    sampleId: number,
    status: 'ok' | 'nok',
    params: string[],
    reasons: string[],
    other: string,
    ocrData: SampleRecord['ocr']
  ) => void;
  config?: AppConfig;
  onSaveConfig?: (newConfig: AppConfig) => void;
  mtolData?: MtolRecord[];
  onUpdateSampleOcr?: (sampleId: number, ocrData: SampleRecord['ocr']) => void;
}

export const DashboardSample: React.FC<DashboardSampleProps> = ({
  samples,
  onValidate,
  config,
  onSaveConfig,
  mtolData = [],
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Selected sample
  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [checkedReasons, setCheckedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');

  // Queue filter
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'ok' | 'nok'>('all');
  const [queueSearch, setQueueSearch] = useState('');

  // Automatic Sample Validation (Scan Text 7 Photos)
  const [isAutoValidating, setIsAutoValidating] = useState(false);
  const [autoScanResult, setAutoScanResult] = useState<ScanExtractedData | null>(null);
  const [scanStepText, setScanStepText] = useState('');
  const [shelfLifeMonths, setShelfLifeMonths] = useState<number | ''>(24);
  const [showSopModal, setShowSopModal] = useState(false);
  const [sopTab, setSopTab] = useState<'p1' | 'p2' | 'p3'>('p1');

  // Editable scan text fields for live admin correction & re-evaluation
  const [isEditingScanValues, setIsEditingScanValues] = useState(false);
  const [scanEditB1, setScanEditB1] = useState('');
  const [scanEditB2, setScanEditB2] = useState('');
  const [scanEditS1, setScanEditS1] = useState('');
  const [scanEditS2, setScanEditS2] = useState('');
  const [scanEditS3, setScanEditS3] = useState('');
  const [scanEditS4, setScanEditS4] = useState('');
  const [scanEditBox, setScanEditBox] = useState('');
  const [scanEditExp, setScanEditExp] = useState('');

  const photoTitles = [
    'Foto 1: LHP 1',
    'Foto 2: LHP 2',
    'Foto 3: Sachet Filling 1',
    'Foto 4: Sachet Filling 2',
    'Foto 5: Sachet Filling 3',
    'Foto 6: Sachet Filling 4',
    'Foto 7: Box dan Dus',
  ];

  const handleOpenDetail = (sample: SampleRecord) => {
    setSelectedSampleId(sample.id);
    setPhotoIndex(0);
    setViewMode('single');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(1);
    setContrast(1);
    setIsHighContrastMode(false);
    setAutoScanResult(null);
    setIsEditingScanValues(false);

    const defaultParams = getInspectionParams(sample.pk);
    setParamValues(
      sample.params && sample.params.length === defaultParams.length
        ? sample.params
        : defaultParams.map(() => 'OKE')
    );
    setCheckedReasons(sample.reasons || []);
    setOtherReason(sample.other || '');
  };

  const handleRunAutoValidation = async () => {
    if (!selectedSample) return;
    setIsAutoValidating(true);
    setScanStepText('Memulai Scan Text pada 7 foto sampel...');
    try {
      const imgArr = selectedSample.img || [];
      let pLhp1 = '';
      let pLhp2 = '';
      let pS1 = '';
      let pS2 = '';
      let pBox = '';

      if (imgArr.length >= 7 && (imgArr[1] || (imgArr[0] && imgArr[1]))) {
        pLhp1 = imgArr[0] || '';
        pLhp2 = imgArr[1] || '';
        pS1 = imgArr[2] || '';
        pS2 = imgArr[3] || '';
        pBox = imgArr[6] || imgArr[4] || '';
      } else {
        const pLhp = imgArr[0] || '';
        pLhp1 = await cropImageHalf(pLhp, 'top');
        pLhp2 = await cropImageHalf(pLhp, 'bottom');
        pS1 = imgArr[2] || imgArr[1] || '';
        pS2 = imgArr[3] || imgArr[2] || '';
        pBox = imgArr[6] || imgArr[3] || imgArr[4] || '';
      }

      const res = await scanTextFrom7Photos(
        pLhp1,
        pLhp2,
        pS1,
        pS2,
        '',
        '',
        pBox,
        mtolData,
        (step) => setScanStepText(step),
        Number(shelfLifeMonths) || undefined,
        selectedSample.pd,
        selectedSample.pk
      );

      if (res.w1) {
        const { fullWo } = resolveFullWoFromMtol(res.w1, mtolData);
        res.w1 = fullWo;
      }
      if (res.w2) {
        const { fullWo } = resolveFullWoFromMtol(res.w2, mtolData);
        res.w2 = fullWo;
      }

      setAutoScanResult(res);
      setScanEditB1(res.b1 || '');
      setScanEditB2(res.b2 || '');
      setScanEditS1(res.sachetCode1 || '');
      setScanEditS2(res.sachetCode2 || '');
      setScanEditS3(res.sachetCode3 || '');
      setScanEditS4(res.sachetCode4 || '');
      setScanEditBox(res.kb || '');
      setScanEditExp(res.ex || '');

      if (res.autoValidationResult === 'ok') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        playSound('chime', config?.vol, config?.custom);
      } else {
        playSound('alarm', config?.vol, config?.custom);
      }
    } catch (err: any) {
      alert(`Gagal validasi otomatis: ${err.message}`);
    } finally {
      setIsAutoValidating(false);
      setScanStepText('');
    }
  };

  const handleReEvaluateManual = () => {
    if (!autoScanResult) return;
    const reEval = evaluateVisualPrintCriteria({
      b1: scanEditB1,
      b2: scanEditB2,
      sachetCode1: scanEditS1,
      sachetCode2: scanEditS2,
      sachetCode3: scanEditS3,
      sachetCode4: scanEditS4,
      boxCode: scanEditBox,
      boxExp: scanEditExp,
      shelfLifeMonths: Number(shelfLifeMonths) || undefined,
      prodDate: selectedSample?.pd,
      packingMachine: selectedSample?.pk,
    });

    setAutoScanResult({
      ...autoScanResult,
      b1: scanEditB1,
      b2: scanEditB2,
      sachetCode1: scanEditS1,
      sachetCode2: scanEditS2,
      sachetCode3: scanEditS3,
      sachetCode4: scanEditS4,
      kb: scanEditBox,
      ex: scanEditExp,
      batchType: reEval.detectedType,
      autoValidationResult: reEval.isValid ? 'ok' : 'nok',
      criteriaList: reEval.criteriaList,
    });

    if (reEval.isValid) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      playSound('chime', config?.vol, config?.custom);
    } else {
      playSound('alarm', config?.vol, config?.custom);
    }
  };

  const handleApplyAutoResult = (targetStatus: 'ok' | 'nok') => {
    if (!autoScanResult) return;

    if (targetStatus === 'ok') {
      const defaultParams = getInspectionParams(selectedSample?.pk || '');
      setParamValues(defaultParams.map(() => 'OKE'));
      setCheckedReasons([]);
      setOtherReason('');
    } else {
      const defaultParams = getInspectionParams(selectedSample?.pk || '');
      setParamValues(defaultParams.map(() => 'TIDAK OKE'));
      const failedNotes = autoScanResult.criteriaList
        .filter((c) => !c.passed)
        .map((c) => c.note);

      setCheckedReasons([
        'KETIDAKSESUAIAN ATURAN VISUAL PRINT KODE BATCH (NORMAL / GABUNGAN / PERBAIKAN)',
      ]);
      setOtherReason(failedNotes.join('; '));
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(1);
    setContrast(1);
    setIsHighContrastMode(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(8, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(1, Number((prev - 0.5).toFixed(1))));
  };

  const handleSetPresetZoom = (val: number) => {
    setZoom(val);
    if (val === 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoom((prev) => {
        const next = Math.max(1, Math.min(8, Number((prev + delta).toFixed(2))));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [selectedSampleId, photoIndex, viewMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleToggleReason = (reason: string) => {
    setCheckedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleCommitValidation = (status: 'ok' | 'nok') => {
    if (!selectedSample) return;
    if (status === 'nok' && checkedReasons.length === 0 && !otherReason.trim()) {
      alert('Pilih minimal satu alasan penolakan jika sampel TIDAK OKE.');
      return;
    }
    if (status === 'ok') {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#0f766e', '#10b981', '#38bdf8', '#fbbf24'],
        });
      } catch (e) {
        // ignore
      }
    }
    onValidate(
      selectedSample.id,
      status,
      paramValues,
      checkedReasons,
      otherReason.trim(),
      selectedSample.ocr || {}
    );
    setSelectedSampleId(null);
  };

  // QUEUE VIEW
  if (!selectedSample) {
    const filteredQueue = [...samples]
      .reverse()
      .filter((s) => {
        if (queueFilter !== 'all' && s.status !== queueFilter) return false;
        if (!queueSearch) return true;
        const term = queueSearch.toLowerCase();
        return (
          s.pk.toLowerCase().includes(term) ||
          s.op.toLowerCase().includes(term) ||
          s.f1.toLowerCase().includes(term) ||
          s.f2.toLowerCase().includes(term) ||
          s.at.toLowerCase().includes(term)
        );
      });

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Admin Produksi Dashboard
              </span>
              <span className="text-xs text-slate-300">Scan Text &amp; Visual Print 5 Foto</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">Antrean Validasi Sampel Produksi</h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Pilih sampel untuk membuka 5 foto resolusi penuh, jalankan validasi otomatis kriteria Visual Print atau inspeksi mandiri
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
            <div>
              <div className="text-2xl font-black text-amber-400 leading-tight">
                {samples.filter((s) => s.status === 'pending').length}
              </div>
              <div className="text-[11px] text-slate-400">Menunggu Produksi</div>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div>
              <div className="text-2xl font-black text-emerald-400 leading-tight">
                {samples.filter((s) => s.status === 'ok').length}
              </div>
              <div className="text-[11px] text-slate-400">Disetujui OKE</div>
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
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  queueFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({samples.length})
              </button>
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  queueFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Menunggu ({samples.filter((s) => s.status === 'pending').length})
              </button>
              <button
                onClick={() => setQueueFilter('ok')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  queueFilter === 'ok'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                OKE ({samples.filter((s) => s.status === 'ok').length})
              </button>
              <button
                onClick={() => setQueueFilter('nok')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  queueFilter === 'nok'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Tidak Oke ({samples.filter((s) => s.status === 'nok').length})
              </button>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  placeholder="Cari mesin / operator..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetList = filteredQueue.length > 0 ? filteredQueue : samples;
                  if (targetList.length > 0) {
                    exportSamplesSpreadsheetXlsx(
                      targetList,
                      `Sampel_QC_${new Date().toISOString().slice(0, 10)}.xlsx`
                    );
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Unduh data antrian sampel dalam format Spreadsheet Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Ekspor Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Waktu Input</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Mesin Packing</th>
                  <th className="py-3 px-4">Filling LHP 1 / 2</th>
                  <th className="py-3 px-4">5 Foto Kemasan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Inspeksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada sampel yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((s, idx) => (
                    <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{s.at}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{s.op}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{s.pk}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {s.f1} / {s.f2}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {s.img.slice(0, 5).map((src, i) => (
                            <img
                              key={`thumb-${idx}-${i}`}
                              src={src || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Crect width="24" height="24" fill="%23334155"/%3E%3C/svg%3E'}
                              alt={`Thumb ${i + 1}`}
                              className="w-6 h-6 object-cover rounded border border-slate-300 bg-slate-900"
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.status === 'ok' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>OKE</span>
                          </span>
                        )}
                        {s.status === 'nok' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>TIDAK OKE</span>
                          </span>
                        )}
                        {s.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>MENUNGGU</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(s)}
                          className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspeksi 5 Foto</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {config && onSaveConfig && (
          <AdminSoundSettings config={config} onSaveConfig={onSaveConfig} />
        )}
      </div>
    );
  }

  // INSPECTION VIEW (5 PHOTOS)
  const inspectionParams = getInspectionParams(selectedSample.pk);
  const activePhotoSrc = selectedSample.img[photoIndex] || '';

  const computedFilter = `brightness(${brightness}) contrast(${
    isHighContrastMode ? contrast * 1.8 : contrast
  })`;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSelectedSampleId(null)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black text-slate-900">{selectedSample.pk}</span>
              <span className="text-xs font-mono text-slate-500">{selectedSample.at}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Operator: {selectedSample.op}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
              <span>Filling: {selectedSample.f1} / {selectedSample.f2}</span>
              {selectedSample.pd && <span> &bull; Prod Date: {selectedSample.pd}</span>}
              <span> &bull; Catatan: <i>{selectedSample.note}</i></span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* SOP Button */}
          <button
            type="button"
            onClick={() => setShowSopModal(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Buka SOP Visual Print Kode Batch (Aturan Normal / Gabungan / Perbaikan)"
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Lihat Poster SOP Visual Print</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Fokus Zoom</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>5 Foto Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* AUTO-VALIDATION CONTROLLER BANNER */}
      {selectedSample?.pk && !['Packing Omag', 'Packing Tablet', 'V2.1', 'V2.3'].includes(selectedSample.pk) && (
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-lg border border-teal-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-widest bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  Fitur Otomatis
                </span>
                <span className="text-xs text-amber-300 font-bold">Rule Engine Visual Print</span>
              </div>
              <h3 className="text-lg font-black mt-0.5">
                Validasi Sampel Otomatis (Scan Text 5 Foto)
              </h3>
              <p className="text-xs text-slate-300">
                Mencocokkan otomatis hasil scan teks LHP 1, LHP 2, Sachet 1, Sachet 2, dan Box sesuai poster SOP Visual Print Kode Batch
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-teal-500/30 flex items-center space-x-2">
              <label className="text-[11px] font-bold text-teal-300 uppercase whitespace-nowrap">Umur Simpan (Bulan):</label>
              <input
                type="number"
                min="1"
                max="120"
                value={shelfLifeMonths}
                onChange={(e) => setShelfLifeMonths(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="24"
                className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleRunAutoValidation}
              disabled={isAutoValidating}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/30 transition-all flex items-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isAutoValidating ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isAutoValidating ? 'Sedang Memindai & Menguji...' : '⚡ Jalankan Validasi Otomatis'}</span>
            </button>
          </div>
        </div>

        {isAutoValidating && (
          <div className="mt-3 p-3 bg-slate-800/80 rounded-xl border border-teal-500/30 flex items-center space-x-3 text-xs text-teal-200">
            <RotateCcw className="w-4 h-4 animate-spin text-teal-400 shrink-0" />
            <span>{scanStepText || 'Memproses teks dari 5 foto sampel...'}</span>
          </div>
        )}

        {/* AUTO VALIDATION RESULT CARD */}
        {autoScanResult && (
          <div className="mt-4 bg-slate-950/90 rounded-2xl p-5 border border-teal-500/40 text-white space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  Jenis Batch Terdeteksi:
                </span>
                <div className="text-base font-black text-amber-300 mt-0.5">
                  {autoScanResult.batchType}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {autoScanResult.autoValidationResult === 'ok' ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>HASIL OTOMATIS: OKE</span>
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30 flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>HASIL OTOMATIS: TIDAK OKE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Extracted Matrix from 5 photos with toggle to edit/correct */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Hasil Ekstraksi 5 Foto Sampel:
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingScanValues(!isEditingScanValues)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isEditingScanValues ? 'Selesai Edit' : 'Koreksi Manual Teks'}</span>
                </button>
              </div>

              {!isEditingScanValues ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">1. LHP 1</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.b1 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">2. LHP 2</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.b2 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">3. Sachet 1</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.sachetCode1 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">4. Sachet 2</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.sachetCode2 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">5. Sachet 3</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.sachetCode3 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block">6. Sachet 4</span>
                    <span className="font-mono font-bold text-slate-100 truncate block mt-0.5">
                      {autoScanResult.sachetCode4 || '-'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-bold block">7. Box &amp; Dus</span>
                    <span className="font-mono font-bold text-amber-200 truncate block mt-0.5">
                      {autoScanResult.kb || '-'} (EXP: {autoScanResult.ex || '-'})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 rounded-xl border border-teal-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 1: Batch LHP 1
                      </label>
                      <input
                        type="text"
                        value={scanEditB1}
                        onChange={(e) => setScanEditB1(e.target.value.toUpperCase())}
                        placeholder="Contoh: FNMB11AA"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 2: Batch LHP 2
                      </label>
                      <input
                        type="text"
                        value={scanEditB2}
                        onChange={(e) => setScanEditB2(e.target.value.toUpperCase())}
                        placeholder="Contoh: FNMB11AB"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 3: Sachet Filling 1
                      </label>
                      <input
                        type="text"
                        value={scanEditS1}
                        onChange={(e) => setScanEditS1(e.target.value.toUpperCase())}
                        placeholder="Contoh: CKR GMB11AA"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 4: Sachet Filling 2
                      </label>
                      <input
                        type="text"
                        value={scanEditS2}
                        onChange={(e) => setScanEditS2(e.target.value.toUpperCase())}
                        placeholder="Contoh: CKR GMB11AB"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 5: Sachet Filling 3
                      </label>
                      <input
                        type="text"
                        value={scanEditS3}
                        onChange={(e) => setScanEditS3(e.target.value.toUpperCase())}
                        placeholder="Contoh: CKR GMB11AC"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        Foto 6: Sachet Filling 4
                      </label>
                      <input
                        type="text"
                        value={scanEditS4}
                        onChange={(e) => setScanEditS4(e.target.value.toUpperCase())}
                        placeholder="Contoh: CKR GMB11AD"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-300 block mb-0.5">
                        Foto 7: Kode Batch Box
                      </label>
                      <input
                        type="text"
                        value={scanEditBox}
                        onChange={(e) => setScanEditBox(e.target.value.toUpperCase())}
                        placeholder="Contoh: FGMB11AAAB"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-300 block mb-0.5">
                        Foto 7: Exp Date Box (DD MM YY)
                      </label>
                      <input
                        type="text"
                        value={scanEditExp}
                        onChange={(e) => setScanEditExp(e.target.value)}
                        placeholder="Contoh: 11 02 24"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleReEvaluateManual}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Re-Evaluasi Kriteria SOP dengan Teks Terkoreksi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Criteria Checklist */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Uji 5 Kriteria SOP Visual Print:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {autoScanResult.criteriaList.map((crit, idx) => (
                  <div
                    key={`${crit.id}-${idx}`}
                    className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      crit.passed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        {crit.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="font-bold text-slate-100">{crit.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 ml-6">{crit.note}</p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 shrink-0 ml-6 sm:ml-0">
                      Terdeteksi: <b className="text-slate-100">{crit.detected}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Action */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Terapkan hasil pencocokan scan text ini:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyAutoResult(autoScanResult.autoValidationResult)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    autoScanResult.autoValidationResult === 'ok'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  Terapkan Hasil ({autoScanResult.autoValidationResult === 'ok' ? 'OKE' : 'TIDAK OKE'}) ke Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyAutoResult(autoScanResult.autoValidationResult);
                    handleCommitValidation(autoScanResult.autoValidationResult);
                  }}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer ${
                    autoScanResult.autoValidationResult === 'ok'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-rose-700 hover:bg-rose-600 text-white'
                  }`}
                >
                  {autoScanResult.autoValidationResult === 'ok' ? '✓ Langsung Setujui (OKE)' : '✕ Langsung Tolak (TIDAK OKE)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: 5 PHOTOS CANVAS & CONTROLS */}
        <div className="lg:col-span-7 space-y-4">
          {/* 7 Thumbnails */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
              const isSelected = photoIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPhotoIndex(idx as 0 | 1 | 2 | 3 | 4 | 5 | 6);
                    if (viewMode === 'grid') setViewMode('single');
                    handleResetView();
                  }}
                  className={`p-2 rounded-xl text-left transition-all border relative flex flex-col justify-between cursor-pointer ${
                    isSelected && viewMode === 'single'
                      ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-slate-800 truncate mb-1 block">
                    {photoTitles[idx].split(':')[1] || photoTitles[idx]}
                  </span>
                  <div className="w-full h-16 bg-slate-900 rounded-lg overflow-hidden relative">
                    {selectedSample.img[idx] ? (
                      <img
                        src={selectedSample.img[idx]}
                        alt={photoTitles[idx]}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                        Belum ada
                      </div>
                    )}
                    {isSelected && viewMode === 'single' && (
                      <div className="absolute inset-0 border-2 border-teal-500 bg-teal-500/10 pointer-events-none rounded-lg" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {viewMode === 'single' ? (
            <div className="space-y-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs font-bold flex items-center justify-between">
                <span>
                  Sedang Memeriksa <b>{photoTitles[photoIndex]}</b>
                </span>
                <button
                  onClick={() => setIsFullscreenOpen(true)}
                  className="px-2 py-1 bg-white hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-lg border border-teal-300 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Tampilan Layar Penuh"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              </div>

              <div
                ref={viewportRef}
                className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-[480px] shadow-inner select-none cursor-grab active:cursor-grabbing"
              >
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                >
                  {activePhotoSrc ? (
                    <img
                      src={activePhotoSrc}
                      alt={photoTitles[photoIndex]}
                      draggable={false}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        filter: computedFilter,
                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                      }}
                      className="max-w-none max-h-none object-contain pointer-events-none origin-center"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">Foto tidak tersedia</div>
                  )}
                </div>

                <div className="absolute top-3 left-3 flex items-center space-x-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700 text-white shadow-lg">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="p-1.5 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-teal-300 min-w-14 text-center">
                    {zoom.toFixed(1)}x
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 8}
                    className="p-1.5 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-700 mx-1" />
                  {[1, 2, 4, 6, 8].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSetPresetZoom(preset)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        Math.round(zoom) === preset && zoom !== 1
                          ? 'bg-teal-500 text-slate-950 font-black'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>

                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  <button
                    onClick={handleResetView}
                    className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl border border-slate-700 backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                    <span>Reset View</span>
                  </button>
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] text-slate-300 border border-slate-700 pointer-events-none flex items-center space-x-1.5">
                  <Move className="w-3 h-3 text-teal-400" />
                  <span>Scroll mouse untuk zoom &bull; Drag untuk geser</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-teal-600" />
                    <span>Pengatur Ketajaman &amp; Kontras Tinta Inkjet</span>
                  </span>
                  <button
                    onClick={() => setIsHighContrastMode(!isHighContrastMode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isHighContrastMode
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                    <span>Mode Tajam Ekstra {isHighContrastMode ? '(Aktif)' : ''}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center space-x-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Kecerahan ({brightness.toFixed(1)})</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center space-x-1">
                        <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Kontras ({contrast.toFixed(1)})</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">
                      {photoTitles[idx]}
                    </span>
                    <button
                      onClick={() => {
                        setPhotoIndex(idx as 0 | 1 | 2 | 3 | 4);
                        setViewMode('single');
                        handleSetPresetZoom(2);
                      }}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom Foto Ini</span>
                    </button>
                  </div>
                  <div className="h-64 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                    {selectedSample.img[idx] ? (
                      <img
                        src={selectedSample.img[idx]}
                        alt={photoTitles[idx]}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs">Foto tidak tersedia</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: PARAMETERS & MANUAL/AUTO APPROVAL */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <Info className="w-4 h-4 text-teal-600" />
              <span>Detail Sampel Terunggah</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Mesin Packing</span>
                <span className="font-bold text-slate-800 text-sm">{selectedSample.pk}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Operator</span>
                <span className="font-bold text-slate-800 text-sm">{selectedSample.op}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Mesin Filling 1</span>
                <span className="font-semibold text-slate-800">{selectedSample.f1}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Mesin Filling 2</span>
                <span className="font-semibold text-slate-800">{selectedSample.f2}</span>
              </div>
              {selectedSample.pd && (
                <div className="col-span-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-800 block font-bold">
                    PROD DATE TERINPUT
                  </span>
                  <span className="font-mono font-bold text-amber-950 text-sm">
                    {selectedSample.pd}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>Parameter Hasil Inspeksi Visual Admin</span>
            </h4>
            <div className="space-y-2.5">
              {inspectionParams.map((paramTitle, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 leading-tight mb-2">
                    {idx + 1}. {paramTitle}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...paramValues];
                        next[idx] = 'OKE';
                        setParamValues(next);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        paramValues[idx] === 'OKE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      OKE (Sesuai)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...paramValues];
                        next[idx] = 'TIDAK OKE';
                        setParamValues(next);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        paramValues[idx] === 'TIDAK OKE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      TIDAK OKE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Alasan Reject (Pilih jika TIDAK OKE)</span>
            </h4>
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  className={`flex items-start space-x-2 text-xs p-2 rounded-xl border transition-colors cursor-pointer ${
                    checkedReasons.includes(reason)
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                      : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedReasons.includes(reason)}
                    onChange={() => handleToggleReason(reason)}
                    className="mt-0.5 accent-rose-600 rounded"
                  />
                  <span className="leading-snug">
                    <b>{idx + 1}.</b> {reason}
                  </span>
                </label>
              ))}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan Tambahan (Input Manual)
                </label>
                <input
                  type="text"
                  placeholder="Keterangan penolakan tambahan..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-lg">
            <button
              onClick={() => handleCommitValidation('nok')}
              className="flex-1 py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>TOLAK (TIDAK OKE)</span>
            </button>
            <button
              onClick={() => handleCommitValidation('ok')}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>SETUJUI (OKE)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SOP VISUAL PRINT KODE BATCH */}
      {showSopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Panduan SOP Visual Print Kode Batch
                  </h3>
                  <p className="text-xs text-amber-100">
                    Standar penulisan kode batch LHP, kemasan sachet, dan box kemasan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSopModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-100 px-6 py-2 gap-2 text-xs font-bold">
              <button
                onClick={() => setSopTab('p1')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  sopTab === 'p1' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Poster 1: Normal, Gabungan &amp; Perbaikan
              </button>
              <button
                onClick={() => setSopTab('p2')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  sopTab === 'p2' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Poster 2: Gabungan Perbaikan &amp; Ganti Roll
              </button>
              <button
                onClick={() => setSopTab('p3')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  sopTab === 'p3' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Poster 3: Beda Tanggal &amp; Bulan
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
              {sopTab === 'p1' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <img src="2.png" alt="Visual Print Kode Batch Halaman 1" className="w-full object-contain" />
                  </div>
                </div>
              )}

              {sopTab === 'p2' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <img src="3.png" alt="Visual Print Kode Batch Halaman 2" className="w-full object-contain" />
                  </div>
                </div>
              )}

              {sopTab === 'p3' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <img src="4.png" alt="Visual Print Kode Batch Halaman 3" className="w-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSopModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOM MODAL */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in">
          <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <span className="font-extrabold text-sm text-teal-300">{photoTitles[photoIndex]}</span>
              <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300">
                Zoom: {zoom.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white ml-2 cursor-pointer"
                title="Tutup Fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none bg-slate-950"
          >
            {activePhotoSrc && (
              <img
                src={activePhotoSrc}
                alt="Fullscreen Inspection"
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  filter: computedFilter,
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="max-w-none max-h-none object-contain pointer-events-none origin-center"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
