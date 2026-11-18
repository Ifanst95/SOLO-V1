import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  Trash2,
} from 'lucide-react';
import {
  PACKING_MACHINES,
  FILLING_MACHINES,
  SAMPLE_NOTES,
  getBoxPhotoDesc,
  isProdDateRequired,
  getFillingPairForPacking,
} from '../lib/constants';
import { SampleRecord } from '../types';

interface InputSampleProps {
  onSubmit: (sample: SampleRecord) => void;
  defaultOperator?: string;
}

export const InputSample: React.FC<InputSampleProps> = ({
  onSubmit,
  defaultOperator = '',
}) => {
  const [operator, setOperator] = useState(defaultOperator || 'Operator Packing');
  const [packingMachine, setPackingMachine] = useState(PACKING_MACHINES[0]);

  const initialPair = getFillingPairForPacking(PACKING_MACHINES[0]);
  const [filling1, setFilling1] = useState(initialPair.filling1);
  const [filling2, setFilling2] = useState(initialPair.filling2);
  const [filling3, setFilling3] = useState(initialPair.filling3 || FILLING_MACHINES[2]);
  const [filling4, setFilling4] = useState(initialPair.filling4 || FILLING_MACHINES[3]);

  const [prodDate, setProdDate] = useState('');
  const [note, setNote] = useState(SAMPLE_NOTES[0]);
  const [currentDateTime, setCurrentDateTime] = useState('');

  // 7 Photos array: [LHP1, LHP2, Sachet1, Sachet2, Sachet3 (Hopak 9), Sachet4 (Hopak 9), Box/Dus]
  // For Hopak 9: Box/Dus is at index 6. For others: Box/Dus is at index 4.
  const [photos, setPhotos] = useState<
    [string, string, string, string, string, string, string]
  >(['', '', '', '', '', '', '']);
  const [, setLoadingCompress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHopak9 = packingMachine === 'Hopak 9';

  useEffect(() => {
    const pair = getFillingPairForPacking(packingMachine);
    setFilling1(pair.filling1);
    setFilling2(pair.filling2);
    if (pair.filling3) setFilling3(pair.filling3);
    if (pair.filling4) setFilling4(pair.filling4);
  }, [packingMachine]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(new Date().toLocaleString('id-ID'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingCompress(index);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 2048;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          setPhotos((prev) => {
            const next = [...prev] as [
              string,
              string,
              string,
              string,
              string,
              string,
              string
            ];
            next[index] = compressedDataUrl;
            return next;
          });
        }
        setLoadingCompress(null);
      };
      img.onerror = () => {
        setErrorMsg('Gagal memproses gambar.');
        setLoadingCompress(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev] as [
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ];
      next[index] = '';
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator.trim()) {
      setErrorMsg('Nama operator wajib diisi.');
      return;
    }

    const boxIndex = isHopak9 ? 6 : 4;
    if (!photos[0] || !photos[2] || !photos[boxIndex]) {
      setErrorMsg(
        isHopak9
          ? 'Harap lengkapi minimal Foto 1 (LHP 1), Foto 3 (Sachet Filling 1), dan Foto 7 (Box dan Dus).'
          : 'Harap lengkapi minimal Foto 1 (LHP 1), Foto 3 (Sachet Filling 1), dan Foto 5 (Box dan Dus).'
      );
      return;
    }

    const needsProd = isProdDateRequired(packingMachine);
    if (needsProd && !prodDate.trim()) {
      setErrorMsg('Mesin ini memerlukan pengisian PROD DATE (Contoh: 20 03 28).');
      return;
    }

    // Normalize photos array for storage:
    // If not Hopak 9, store box at index 6 as well so downstream views expecting img[6] for box work consistently, or keep box at index 4/6.
    const finalPhotos: [string, string, string, string, string, string, string] = isHopak9
      ? photos
      : [photos[0], photos[1], photos[2], photos[3], '', '', photos[4]];

    const newSample: SampleRecord = {
      id: Date.now(),
      at: currentDateTime || new Date().toLocaleString('id-ID'),
      op: operator.trim(),
      pk: packingMachine,
      f1: filling1,
      f2: filling2,
      pd: needsProd ? prodDate.trim() : '',
      note,
      img: finalPhotos,
      status: 'pending',
      params: [],
      reasons: [],
      other: '',
      syncedToSheets: false,
    };
    onSubmit(newSample);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                Form Operator
              </span>
              <span className="text-xs text-teal-200">
                {isHopak9 ? '7 Foto (Hopak 9)' : '5 Foto Sampel Kemasan &amp; LHP'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              {isHopak9 ? 'Input 7 Foto Sampel (Hopak 9)' : 'Input 5 Foto Sampel Kemasan'}
            </h2>
            <p className="text-sm text-teal-100/90 mt-0.5">
              LHP 1 &amp; LHP 2 otomatis mengikuti pasangan mesin packing. Foto 5 &amp; 6 khusus Hopak 9.
            </p>
          </div>
          <div className="bg-teal-950/60 border border-teal-500/30 rounded-xl px-4 py-2.5 flex items-center space-x-2 self-start sm:self-auto">
            <Clock className="w-4 h-4 text-teal-300 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-teal-100">
              {currentDateTime || 'Memuat waktu...'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Info className="w-4 h-4 text-teal-600" />
            <span>Identitas Line &amp; Operator (Otomatis Pasangan Mesin)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nama Operator
              </label>
              <input
                type="text"
                required
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Nama Anda"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Mesin Packing
              </label>
              <select
                value={packingMachine}
                onChange={(e) => setPackingMachine(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
              >
                {PACKING_MACHINES.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 'Hopak 9' ? '⭐ (4 Line Filling)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {isProdDateRequired(packingMachine) && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center space-x-1">
                  <span>PROD DATE (Wajib untuk {packingMachine})</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 20 03 28"
                  value={prodDate}
                  onChange={(e) => setProdDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-amber-50/50 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* PHOTO SLOTS (5 for normal, 7 for Hopak 9) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Slot 0: Foto 1 - LHP 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-extrabold text-xs">
                  Foto 1: LHP 1
                </span>
                {photos[0] && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Terisi</span>
                  </span>
                )}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MESIN FILLING LHP 1 (OTOMATIS)
                </label>
                <input
                  type="text"
                  readOnly
                  value={filling1}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-4">
              {photos[0] ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img src={photos[0]} alt="LHP 1" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(0)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Ambil foto atau unggah</span>
                    <div className="flex items-center space-x-2 w-full pt-1">
                      <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => handleFileChange(0, e)}
                        />
                      </label>
                      <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(0, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slot 1: Foto 2 - LHP 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-extrabold text-xs">
                  Foto 2: LHP 2
                </span>
                {photos[1] && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Terisi</span>
                  </span>
                )}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MESIN FILLING LHP 2 (OTOMATIS)
                </label>
                <input
                  type="text"
                  readOnly
                  value={filling2}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-4">
              {photos[1] ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img src={photos[1]} alt="LHP 2" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(1)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Ambil foto atau unggah</span>
                    <div className="flex items-center space-x-2 w-full pt-1">
                      <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => handleFileChange(1, e)}
                        />
                      </label>
                      <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(1, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slot 2: Foto 3 - Sachet Filling 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-extrabold text-xs">
                  Foto 3: Sachet Filling 1
                </span>
                {photos[2] && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Terisi</span>
                  </span>
                )}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MESIN FILLING 1
                </label>
                <input
                  type="text"
                  readOnly
                  value={filling1}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-4">
              {photos[2] ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img src={photos[2]} alt="Sachet Filling 1" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(2)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Ambil foto atau unggah</span>
                    <div className="flex items-center space-x-2 w-full pt-1">
                      <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => handleFileChange(2, e)}
                        />
                      </label>
                      <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(2, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slot 3: Foto 4 - Sachet Filling 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-extrabold text-xs">
                  Foto 4: Sachet Filling 2
                </span>
                {photos[3] && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Terisi</span>
                  </span>
                )}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MESIN FILLING 2
                </label>
                <input
                  type="text"
                  readOnly
                  value={filling2}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-4">
              {photos[3] ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img src={photos[3]} alt="Sachet Filling 2" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(3)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Ambil foto atau unggah</span>
                    <div className="flex items-center space-x-2 w-full pt-1">
                      <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => handleFileChange(3, e)}
                        />
                      </label>
                      <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(3, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FOTO 5 & 6: HANYA MUNCUL KETIKA DIPILIH HOPAK 9 */}
          {isHopak9 && (
            <>
              {/* Slot 4: Foto 5 - Sachet Filling 3 */}
              <div className="bg-white rounded-2xl p-5 border border-teal-300 shadow-xs flex flex-col justify-between animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-extrabold text-xs">
                      Foto 5: Sachet Filling 3 (Hopak 9)
                    </span>
                    {photos[4] && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Terisi</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      MESIN FILLING 3
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={filling3}
                      className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {photos[4] ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                      <img src={photos[4]} alt="Sachet Filling 3" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(4)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-teal-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-teal-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Camera className="w-8 h-8 text-teal-500" />
                        <span className="text-xs text-slate-600 font-medium">Ambil Foto Sachet 3</span>
                        <div className="flex items-center space-x-2 w-full pt-1">
                          <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Kamera</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              hidden
                              onChange={(e) => handleFileChange(4, e)}
                            />
                          </label>
                          <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Galeri</span>
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => handleFileChange(4, e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Slot 5: Foto 6 - Sachet Filling 4 */}
              <div className="bg-white rounded-2xl p-5 border border-teal-300 shadow-xs flex flex-col justify-between animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-extrabold text-xs">
                      Foto 6: Sachet Filling 4 (Hopak 9)
                    </span>
                    {photos[5] && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Terisi</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      MESIN FILLING 4
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={filling4}
                      className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {photos[5] ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                      <img src={photos[5]} alt="Sachet Filling 4" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(5)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-teal-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-teal-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Camera className="w-8 h-8 text-teal-500" />
                        <span className="text-xs text-slate-600 font-medium">Ambil Foto Sachet 4</span>
                        <div className="flex items-center space-x-2 w-full pt-1">
                          <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Kamera</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              hidden
                              onChange={(e) => handleFileChange(5, e)}
                            />
                          </label>
                          <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Galeri</span>
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => handleFileChange(5, e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Box dan Dus (Index 6 if Hopak 9, Index 4 if not Hopak 9) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-extrabold text-xs border border-amber-200">
                  {isHopak9 ? 'Foto 7: Box dan Dus' : 'Foto 5: Box dan Dus'}
                </span>
                {(isHopak9 ? photos[6] : photos[4]) && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Terisi</span>
                  </span>
                )}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  MESIN PACKING AKTIF
                </label>
                <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800">
                  {packingMachine}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {getBoxPhotoDesc(packingMachine)}
              </div>
            </div>

            <div className="mt-4">
              {(isHopak9 ? photos[6] : photos[4]) ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img
                    src={isHopak9 ? photos[6] : photos[4]}
                    alt="Box dan Dus"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(isHopak9 ? 6 : 4)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 transition-opacity cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Ambil foto box dan dus</span>
                    <div className="flex items-center space-x-2 w-full pt-1">
                      <label className="flex-1 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => handleFileChange(isHopak9 ? 6 : 4, e)}
                        />
                      </label>
                      <label className="flex-1 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(isHopak9 ? 6 : 4, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Catatan & Submit */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Catatan Khusus Sampel
            </label>
            <select
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
            >
              {SAMPLE_NOTES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>
              {isHopak9
                ? 'Kirim 7 Foto Sampel Hopak 9'
                : 'Kirim 5 Foto Sampel ke Admin Produksi'}
            </span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
