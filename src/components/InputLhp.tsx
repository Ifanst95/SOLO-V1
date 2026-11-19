import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Database,
  Sparkles,
  RotateCcw,
  Check,
  Cpu,
  Calendar,
  Tag,
  Box,
} from 'lucide-react';
import { LhpRecord, MtolRecord, SampleRecord } from '../types';
import { scanTextFrom7Photos, ScanExtractedData } from '../lib/ocr';
import { PACKING_MACHINES } from '../lib/constants';

interface InputLhpProps {
  mtolData: MtolRecord[];
  samples?: SampleRecord[];
  onSubmit: (lhp: LhpRecord) => void;
}

export const InputLhp: React.FC<InputLhpProps> = ({
  mtolData,
  samples = [],
  onSubmit,
}) => {
  const [b1, setB1] = useState('');
  const [b2, setB2] = useState('');
  const [w1, setW1] = useState('');
  const [w2, setW2] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');

  const [ex, setEx] = useState('');
  const [kb, setKb] = useState('');
  const [pr, setPr] = useState('');
  const [pbe, setPbe] = useState('');

  const [sb, setSb] = useState<number | ''>(50);
  const [pf, setPf] = useState<number | ''>(5);
  const [pk, setPk] = useState<number | ''>(0);
  const [klNum, setKlNum] = useState<number | ''>(0);
  const [klUnit, setKlUnit] = useState('DUS');
  const [ct, setCt] = useState('');
  const [spNum, setSpNum] = useState<number | ''>('');
  const [spUnit, setSpUnit] = useState('DUS');

  const [scannedBatch1, setScannedBatch1] = useState('');
  const [scannedBatch2, setScannedBatch2] = useState('');
  const [optionsB1, setOptionsB1] = useState<string[]>([]);
  const [optionsB2, setOptionsB2] = useState<string[]>([]);
  const [optionsKb, setOptionsKb] = useState<string[]>([]);

  const [filterMachine, setFilterMachine] = useState<string>(
    samples.length > 0 ? samples[samples.length - 1].pk : PACKING_MACHINES[0]
  );

  useEffect(() => {
    if (samples.length > 0 && !samples.some((s) => s.pk === filterMachine)) {
      setFilterMachine(samples[samples.length - 1].pk);
    }
  }, [samples]);

  const filteredSamples = samples.filter((s) => s.pk === filterMachine);
  const latestSample = filteredSamples.length > 0 ? filteredSamples[filteredSamples.length - 1] : null;
  const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);

  useEffect(() => {
    if (filteredSamples.length > 0) {
      if (!selectedSampleId || !filteredSamples.some((s) => s.id === selectedSampleId)) {
        setSelectedSampleId(filteredSamples[filteredSamples.length - 1].id);
      }
    } else {
      setSelectedSampleId(null);
    }
  }, [filterMachine, samples]);

  const activeSample = filteredSamples.find((s) => s.id === selectedSampleId) || latestSample;

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [engineUsed, setEngineUsed] = useState<string | null>(null);
  const [scanFilledNotice, setScanFilledNotice] = useState<string | null>(null);

  const autoScannedIdRef = useRef<number | null>(null);

  const [validationMessages, setValidationMessages] = useState<{
    lhp1?: { status: 'ok' | 'error'; text: string; match?: MtolRecord };
    lhp2?: { status: 'ok' | 'error'; text: string; match?: MtolRecord };
  }>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getLots = (r: MtolRecord) =>
    String(r.lot || '')
      .toUpperCase()
      .split(/[,;\s]+/)
      .filter(Boolean);

  useEffect(() => {
    if (!mtolData || mtolData.length === 0) {
      setValidationMessages({});
      return;
    }
    const messages: typeof validationMessages = {};

    const cleanB1 = b1.trim().toUpperCase();
    const cleanW1 = w1.trim().toUpperCase();
    const cleanN1 = n1.trim().toUpperCase();

    if (cleanB1 || cleanW1) {
      let match1 = mtolData.find(
        (x) => cleanW1 && (x.wo.toUpperCase() === cleanW1 || x.wo.toUpperCase().endsWith(cleanW1.slice(-4)) || x.wo.toUpperCase().includes(cleanW1))
      );
      if (!match1 && cleanB1) {
        match1 = mtolData.find((x) => getLots(x).some((l) => l.includes(cleanB1) || cleanB1.includes(l)));
      }
      if (!match1) {
        match1 = mtolData.find(
          (x) =>
            (cleanW1 && (x.wo.toUpperCase() === cleanW1 || x.wo.toUpperCase().endsWith(cleanW1.slice(-4)))) ||
            (cleanB1 && getLots(x).some((l) => l.includes(cleanB1) || cleanB1.includes(l)))
        );
      }

      if (!match1) {
        messages.lhp1 = {
          status: 'error',
          text: 'Batch / WO Mixing tidak ditemukan di data MTOL.',
        };
      } else {
        const itemDiffers = cleanN1 && match1.item.toUpperCase() !== cleanN1;
        messages.lhp1 = {
          status: itemDiffers ? 'error' : 'ok',
          text: `MTOL Sesuai: WO ${match1.wo} — ${match1.item}${
            itemDiffers ? ' (Nama item berbeda dari MTOL!)' : ''
          }`,
          match: match1,
        };
      }
    }

    const cleanB2 = b2.trim().toUpperCase();
    const cleanW2 = w2.trim().toUpperCase();
    const cleanN2 = n2.trim().toUpperCase();

    if (cleanB2 || cleanW2) {
      let match2 = mtolData.find(
        (x) => cleanW2 && (x.wo.toUpperCase() === cleanW2 || x.wo.toUpperCase().endsWith(cleanW2.slice(-4)) || x.wo.toUpperCase().includes(cleanW2))
      );
      if (!match2 && cleanB2) {
        match2 = mtolData.find((x) => getLots(x).some((l) => l.includes(cleanB2) || cleanB2.includes(l)));
      }
      if (!match2) {
        match2 = mtolData.find(
          (x) =>
            (cleanW2 && (x.wo.toUpperCase() === cleanW2 || x.wo.toUpperCase().endsWith(cleanW2.slice(-4)))) ||
            (cleanB2 && getLots(x).some((l) => l.includes(cleanB2) || cleanB2.includes(l)))
        );
      }

      if (!match2) {
        messages.lhp2 = {
          status: 'error',
          text: 'Batch / WO Mixing tidak ditemukan di data MTOL.',
        };
      } else {
        const itemDiffers = cleanN2 && match2.item.toUpperCase() !== cleanN2;
        messages.lhp2 = {
          status: itemDiffers ? 'error' : 'ok',
          text: `MTOL Sesuai: WO ${match2.wo} — ${match2.item}${
            itemDiffers ? ' (Nama item berbeda dari MTOL!)' : ''
          }`,
          match: match2,
        };
      }
    }

    setValidationMessages(messages);
  }, [b1, b2, w1, w2, n1, n2, mtolData]);

  const palletFullBoxes = (Number(pf) || 0) * (Number(sb) || 0);
  const totalBoxes = palletFullBoxes + (Number(pk) || 0);
  const totalString = `${totalBoxes} BOX${
    Number(klNum) > 0 ? ` ${klNum} ${klUnit}` : ''
  }`;

  const handleFillMtol = (lhpNum: 1 | 2, match: MtolRecord) => {
    if (lhpNum === 1) {
      setW1(match.wo);
      setN1(match.item);
      if (!b1 && !scannedBatch1) {
        setB1((getLots(match)[0] || match.lot).replace(/\s+/g, '').toUpperCase());
      }
    } else {
      setW2(match.wo);
      setN2(match.item);
      if (!b2 && !scannedBatch2) {
        setB2((getLots(match)[1] || getLots(match)[0] || match.lot).replace(/\s+/g, '').toUpperCase());
      }
    }
  };

  const resolveFullWoFromMtol = (scannedWo: string, mtolRecords: MtolRecord[]): { fullWo: string; match?: MtolRecord } => {
    if (!scannedWo || !mtolRecords || mtolRecords.length === 0) return { fullWo: scannedWo };
    const clean = scannedWo.trim().toUpperCase();

    // 1. Exact match on full WO
    let match = mtolRecords.find((r) => r.wo.toUpperCase() === clean);
    if (match) return { fullWo: match.wo, match };

    // 2. Match by 4 digits (extract 4 digits from clean, or take last 4 characters/digits)
    const digitMatch = clean.match(/\d{4}/);
    const target4 = digitMatch ? digitMatch[0] : clean.slice(-4);

    if (target4.length >= 4) {
      match = mtolRecords.find((r) => {
        const rWo = r.wo.toUpperCase();
        return rWo.includes(target4) || rWo.endsWith(target4);
      });
      if (match) return { fullWo: match.wo, match };
    }

    return { fullWo: scannedWo };
  };

  const handleWo1Change = (val: string) => {
    const { fullWo, match } = resolveFullWoFromMtol(val, mtolData);
    setW1(fullWo);
    if (match) {
      setN1(match.item);
      if (!b1 && !scannedBatch1) {
        const lots = getLots(match);
        setB1((lots[0] || match.lot).replace(/\s+/g, '').toUpperCase());
      }
    } else {
      const clean = val.trim().toUpperCase();
      if (clean.length >= 4 && mtolData.length > 0) {
        const fallbackMatch = mtolData.find(
          (r) => r.wo.toUpperCase() === clean || r.wo.endsWith(clean.slice(-4)) || r.wo.includes(clean.slice(-4))
        );
        if (fallbackMatch) {
          setW1(fallbackMatch.wo);
          setN1(fallbackMatch.item);
          if (!b1 && !scannedBatch1) {
            const lots = getLots(fallbackMatch);
            setB1((lots[0] || fallbackMatch.lot).replace(/\s+/g, '').toUpperCase());
          }
        }
      }
    }
  };

  const handleWo2Change = (val: string) => {
    const { fullWo, match } = resolveFullWoFromMtol(val, mtolData);
    setW2(fullWo);
    if (match) {
      setN2(match.item);
      if (!b2 && !scannedBatch2) {
        const lots = getLots(match);
        setB2((lots[1] || lots[0] || match.lot).replace(/\s+/g, '').toUpperCase());
      }
    } else {
      const clean = val.trim().toUpperCase();
      if (clean.length >= 4 && mtolData.length > 0) {
        const fallbackMatch = mtolData.find(
          (r) => r.wo.toUpperCase() === clean || r.wo.endsWith(clean.slice(-4)) || r.wo.includes(clean.slice(-4))
        );
        if (fallbackMatch) {
          setW2(fallbackMatch.wo);
          setN2(fallbackMatch.item);
          if (!b2 && !scannedBatch2) {
            const lots = getLots(fallbackMatch);
            setB2((lots[1] || lots[0] || fallbackMatch.lot).replace(/\s+/g, '').toUpperCase());
          }
        }
      }
    }
  };

  const handleRunScanText = async (isAuto = false) => {
    if (!activeSample) {
      if (!isAuto) {
        setErrorMsg('Belum ada foto sampel yang tersedia untuk scan text.');
      }
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);
    setScanFilledNotice(null);

    try {
      const p1 = activeSample.img[0] || '';
      const p2 = activeSample.img[1] || '';
      const p3 = activeSample.img[2] || '';
      const p4 = activeSample.img[3] || '';
      const p5 = activeSample.img[4] || '';
      const p6 = activeSample.img[5] || '';
      const p7 = activeSample.img[6] || '';

      const result: ScanExtractedData = await scanTextFrom7Photos(
        p1,
        p2,
        p3,
        p4,
        p5,
        p6,
        p7,
        mtolData,
        (status, pct) => {
          setScanStatusText(status);
          setScanProgress(pct);
        }
      );

      if (result.b1) {
        const cleanB1 = result.b1.replace(/\s+/g, '').toUpperCase();
        setB1(cleanB1);
        setScannedBatch1(cleanB1);
      }
      if (result.optionsB1) setOptionsB1(result.optionsB1);
      if (result.w1) {
        const { fullWo, match } = resolveFullWoFromMtol(result.w1, mtolData);
        setW1(fullWo);
        if (match) {
          setN1(match.item);
          if (!b1 && !scannedBatch1) {
            const lots = getLots(match);
            setB1((lots[0] || match.lot).replace(/\s+/g, '').toUpperCase());
          }
        } else if (result.n1) {
          setN1(result.n1);
        }
      }

      if (result.b2) {
        const cleanB2 = result.b2.replace(/\s+/g, '').toUpperCase();
        setB2(cleanB2);
        setScannedBatch2(cleanB2);
      }
      if (result.optionsB2) setOptionsB2(result.optionsB2);
      if (result.w2) {
        const { fullWo, match } = resolveFullWoFromMtol(result.w2, mtolData);
        setW2(fullWo);
        if (match) {
          setN2(match.item);
          if (!b2 && !scannedBatch2) {
            const lots = getLots(match);
            setB2((lots[1] || lots[0] || match.lot).replace(/\s+/g, '').toUpperCase());
          }
        } else if (result.n2) {
          setN2(result.n2);
        }
      }

      if (result.kb) setKb(result.kb.replace(/\s+/g, '').toUpperCase());
      if (result.ex) setEx(result.ex);
      if (result.pr) setPr(result.pr);
      if (result.pbe) setPbe(result.pbe);
      if (result.optionsKb) setOptionsKb(result.optionsKb);

      setEngineUsed(result.engine);

      const msgDetail = [
        result.b1 ? `Batch 1: ${result.b1}` : '',
        result.kb ? `Kode Box: ${result.kb}` : '',
        result.ex ? `EXP: ${result.ex}` : '',
      ]
        .filter(Boolean)
        .join(' — ');

      setScanFilledNotice(
        isAuto
          ? `Scan Text Otomatis Selesai: ${msgDetail || 'Data terisi ke form LHP'}`
          : `Scan Text Ulang Selesai: ${msgDetail || 'Data terisi ke form LHP'}`
      );
    } catch (err: any) {
      if (!isAuto) {
        setErrorMsg(`Gagal memindai teks: ${err.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeSample && autoScannedIdRef.current !== activeSample.id) {
      autoScannedIdRef.current = activeSample.id;
      handleRunScanText(true);
    }
  }, [activeSample?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b1.trim()) {
      setErrorMsg('Nomer Batch LHP 1 wajib diisi.');
      return;
    }
    if (!ex.trim()) {
      setErrorMsg('Exp Date wajib diisi (Contoh: 21 03 28).');
      return;
    }
    if (!kb.trim()) {
      setErrorMsg('Kode Batch wajib diisi.');
      return;
    }

    const mtolStatus =
      validationMessages.lhp1?.status === 'ok' &&
      (!b2 || validationMessages.lhp2?.status === 'ok')
        ? 'Sesuai'
        : 'Cek';

    const lhp: LhpRecord = {
      id: Date.now(),
      at: new Date().toLocaleString('id-ID'),
      packingMachine: activeSample ? activeSample.pk : filterMachine,
      b1: b1.replace(/\s+/g, '').toUpperCase(),
      b2: b2.replace(/\s+/g, '').toUpperCase(),
      w1: w1.trim(),
      w2: w2.trim(),
      n1: n1.trim(),
      n2: n2.trim(),
      ex: ex.trim(),
      kb: kb.replace(/\s+/g, '').toUpperCase(),
      pr: pr.trim(),
      pbe: pbe.trim(),
      sb: sb || 0,
      pf: pf || 0,
      pfb: palletFullBoxes,
      pk: pk || 0,
      kl: klNum ? `${klNum} ${klUnit}` : '',
      tt: totalString,
      ct: ct.trim(),
      sp: spNum ? `${spNum} ${spUnit}` : '',
      mtol: mtolStatus,
      syncedToSheets: false,
    };
    onSubmit(lhp);

    setB1('');
    setB2('');
    setW1('');
    setW2('');
    setN1('');
    setN2('');
    setEx('');
    setKb('');
    setPr('');
    setPbe('');
    setPf('');
    setPk('');
    setKlNum(0);
    setCt('');
    setSpNum('');
    setErrorMsg(null);
    setScanFilledNotice(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase font-extrabold tracking-widest bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
            Form Operator
          </span>
          <span className="text-xs text-teal-200">Tahap 2 / Rekap Produksi</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black mt-1">Input LHP (Laporan Hasil Produksi)</h2>
        <p className="text-sm text-teal-100/90 mt-0.5">
          NO BATCH LHP 1 &amp; 2 dari Scan Text &bull; EXP DATE &amp; KODE BATCH dari Foto 5 (Box dan Dus)
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {scanFilledNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scanFilledNotice}</span>
        </div>
      )}

      {/* SCAN TEXT CONTROLLER CARD */}
      <div className="bg-white rounded-2xl p-5 border border-teal-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Scan Text Otomatis dari 5 Foto Sampel Mesin yang Sama
                </h3>
                {engineUsed && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center space-x-1">
                    <Cpu className="w-3 h-3" />
                    <span>{engineUsed}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Hanya menampilkan data inputan dari mesin packing yang sama
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <label className="text-xs font-bold text-slate-700">Mesin:</label>
              <select
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                {PACKING_MACHINES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {activeSample && (
              <button
                type="button"
                onClick={() => handleRunScanText(false)}
                disabled={isScanning}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Memindai...' : 'Scan Ulang'}</span>
              </button>
            )}
          </div>
        </div>

        {activeSample ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
              <span>
                Sampel Terhubung: <b className="text-slate-800">{activeSample.pk}</b> ({activeSample.at})
              </span>
              {filteredSamples.length > 1 && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-400">Pilih Sampel Mesin Ini:</span>
                  <select
                    value={selectedSampleId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedSampleId(id);
                      autoScannedIdRef.current = null;
                    }}
                    className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                  >
                    {filteredSamples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.pk} ({s.at})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Thumbnail Active Photos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { title: '1. Foto LHP', src: activeSample.img[0] },
                { title: '2. Sachet 1', src: activeSample.img[2] },
                { title: '3. Sachet 2', src: activeSample.img[3] },
                { title: '4. Foto Box', src: activeSample.img[6] },
              ]
                .filter((item) => Boolean(item.src))
                .map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-700 block truncate mb-1">
                      {item.title}
                    </span>
                    <div className="h-16 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                      <img src={item.src} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
            </div>

            {isScanning && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-teal-800 font-bold">
                  <span>{scanStatusText || 'Sedang memindai teks...'}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            Belum ada foto sampel yang diinput. Ambil foto pada tab <b>1. Input Sampel Foto</b> agar scan text dapat membaca otomatis.
          </div>
        )}
      </div>

      {/* HASIL SCAN TEXT KEMASAN */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-5 border border-teal-500/40 text-white shadow-lg space-y-3">
        <div className="flex items-center space-x-2 border-b border-teal-500/20 pb-2.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-sm text-teal-200">
            Hasil Scan Text Cetakan Kemasan
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-800/90 p-3 rounded-xl border border-teal-500/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-teal-300 font-bold">
              <span className="flex items-center space-x-1">
                <Tag className="w-3 h-3 text-teal-400" />
                <span>No Batch LHP 1</span>
              </span>
            </div>
            <div className="my-1.5 font-mono font-black text-lg text-teal-100 tracking-wider truncate">
              {b1 || scannedBatch1 || '-'}
            </div>
            <div className="text-[10px] text-teal-400 font-semibold flex items-center justify-between">
              <span>Dari Foto 1</span>
              {scannedBatch1 && b1 !== scannedBatch1 && (
                <button
                  type="button"
                  onClick={() => setB1(scannedBatch1)}
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Terapkan
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-800/90 p-3 rounded-xl border border-teal-500/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-teal-300 font-bold">
              <span className="flex items-center space-x-1">
                <Tag className="w-3 h-3 text-teal-400" />
                <span>No Batch LHP 2</span>
              </span>
            </div>
            <div className="my-1.5 font-mono font-black text-lg text-teal-100 tracking-wider truncate">
              {b2 || scannedBatch2 || '-'}
            </div>
            <div className="text-[10px] text-teal-400 font-semibold flex items-center justify-between">
              <span>Dari Foto 2</span>
              {scannedBatch2 && b2 !== scannedBatch2 && (
                <button
                  type="button"
                  onClick={() => setB2(scannedBatch2)}
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Terapkan
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-800/90 p-3 rounded-xl border border-amber-500/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
              <span className="flex items-center space-x-1">
                <Box className="w-3 h-3 text-amber-400" />
                <span>Kode Batch Box</span>
              </span>
            </div>
            <div className="my-1.5 font-mono font-black text-lg text-amber-100 tracking-wider truncate">
              {kb || '-'}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold">
              Dari Foto 5 (Box dan Dus)
            </div>
          </div>

          <div className="bg-slate-800/90 p-3 rounded-xl border border-amber-500/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Exp Date</span>
              </span>
            </div>
            <div className="my-1.5 font-mono font-black text-lg text-amber-100 tracking-wider truncate">
              {ex || '-'}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold">
              Dari Foto 5 (Format DD MM YY)
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: BATCH & WO MIXING */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Validasi Batch &amp; WO Mixing (Hasil Scan Text)</span>
              </h3>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {mtolData.length > 0 ? `${mtolData.length} baris MTOL termuat` : 'MTOL belum dimuat'}
            </span>
          </div>

          {mtolData.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-teal-900 flex items-center space-x-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Pilih Cepat MTOL:</span>
              </span>
              {mtolData.slice(0, 5).map((r, idx) => {
                const lots = getLots(r);
                return (
                  <button
                    key={`${r.wo}-${r.lot}-${idx}`}
                    type="button"
                    onClick={() => {
                      setW1(r.wo);
                      setN1(r.item);
                      if (!b1 && !scannedBatch1) {
                        setB1((lots[0] || r.lot).replace(/\s+/g, '').toUpperCase());
                      }
                      if (lots[1]) {
                        setW2(r.wo);
                        setN2(r.item);
                        if (!b2 && !scannedBatch2) {
                          setB2(lots[1].replace(/\s+/g, '').toUpperCase());
                        }
                      }
                    }}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      w1 === r.wo
                        ? 'bg-teal-700 text-white border-teal-800 font-bold shadow-xs'
                        : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-100/70'
                    }`}
                  >
                    WO {r.wo} ({lots[0] || r.lot}{lots[1] ? ` / ${lots[1]}` : ''})
                  </button>
                );
              })}
            </div>
          )}

          {/* LHP 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                LHP 1 (Primer)
              </span>
              {validationMessages.lhp1?.match && (
                <button
                  type="button"
                  onClick={() => handleFillMtol(1, validationMessages.lhp1!.match!)}
                  className="text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  <span>Isi Otomatis dari MTOL</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NO BATCH LHP 1 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: FNQI22AW"
                  value={b1}
                  onChange={(e) => setB1(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  NO WO MIXING LHP 1
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1029481"
                  value={w1}
                  onChange={(e) => handleWo1Change(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Item Produk LHP 1
                </label>
                <input
                  type="text"
                  placeholder="Nama item produk"
                  value={n1}
                  onChange={(e) => setN1(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {validationMessages.lhp1 && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                  validationMessages.lhp1.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {validationMessages.lhp1.status === 'ok' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{validationMessages.lhp1.text}</span>
              </div>
            )}
          </div>

          {/* LHP 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                LHP 2 (Sekunder / Opsional)
              </span>
              {validationMessages.lhp2?.match && (
                <button
                  type="button"
                  onClick={() => handleFillMtol(2, validationMessages.lhp2!.match!)}
                  className="text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  <span>Isi Otomatis dari MTOL</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NO BATCH LHP 2
                </label>
                <input
                  type="text"
                  placeholder="Contoh: FNQI22AW"
                  value={b2}
                  onChange={(e) => setB2(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  NO WO MIXING LHP 2
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1029481"
                  value={w2}
                  onChange={(e) => handleWo2Change(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Item Produk LHP 2
                </label>
                <input
                  type="text"
                  placeholder="Nama item produk"
                  value={n2}
                  onChange={(e) => setN2(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {validationMessages.lhp2 && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                  validationMessages.lhp2.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {validationMessages.lhp2.status === 'ok' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{validationMessages.lhp2.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: KODE BATCH & EXP DATE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Kode Batch &amp; Tanggal Kadaluarsa (Dari Foto 5: Box dan Dus)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                EXP DATE (DD MM YY) *
              </label>
              <input
                type="text"
                required
                placeholder="21 03 28"
                value={ex}
                onChange={(e) => setEx(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                KODE BATCH BOX *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: FGMB11AAAB"
                value={kb}
                onChange={(e) => setKb(e.target.value.replace(/\s+/g, '').toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PROD DATE
              </label>
              <input
                type="text"
                placeholder="20 03 28"
                value={pr}
                onChange={(e) => setPr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PBE (Opsional)
              </label>
              <input
                type="text"
                placeholder="KW A12121"
                value={pbe}
                onChange={(e) => setPbe(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PALLET & COUNTER */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-teal-600" />
            <span>Kalkulator Pallet, Box &amp; Counter Produksi</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                STANDAR BOX / PALLET
              </label>
              <input
                type="number"
                min="0"
                value={sb}
                onChange={(e) => setSb(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                JUMLAH PALLET FULL
              </label>
              <input
                type="number"
                min="0"
                value={pf}
                onChange={(e) => setPf(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PALLET FULL (BOX)
              </label>
              <input
                type="text"
                readOnly
                value={palletFullBoxes}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PALLET KOMA (BOX)
              </label>
              <input
                type="number"
                min="0"
                value={pk}
                onChange={(e) => setPk(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                KOMA LEBIH
              </label>
              <div className="flex space-x-1">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={klNum}
                  onChange={(e) => setKlNum(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-2/3 px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
                />
                <select
                  value={klUnit}
                  onChange={(e) => setKlUnit(e.target.value)}
                  className="w-1/3 px-2 py-2 text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg"
                >
                  <option>DUS</option>
                  <option>PAK</option>
                  <option>DISPENSER</option>
                  <option>BLISTER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                TOTAL HASIL (OTOMATIS)
              </label>
              <input
                type="text"
                readOnly
                value={totalString}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                COUNTER TERAKHIR
              </label>
              <input
                type="text"
                placeholder="Misal: 14520"
                value={ct}
                onChange={(e) => setCt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                SAMPEL PORT
              </label>
              <div className="flex space-x-1">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={spNum}
                  onChange={(e) => setSpNum(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-2/3 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
                />
                <select
                  value={spUnit}
                  onChange={(e) => setSpUnit(e.target.value)}
                  className="w-1/3 px-2 py-2 text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg"
                >
                  <option>DUS</option>
                  <option>PAK</option>
                  <option>DISPENSER</option>
                  <option>BLISTER</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
          >
            <span>Simpan LHP ke Database &amp; Sheets</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
