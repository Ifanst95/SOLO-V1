import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { InputSample } from './components/InputSample';
import { InputLhp } from './components/InputLhp';
import { OperatorStatus } from './components/OperatorStatus';
import { DashboardSample } from './components/DashboardSample';
import { DashboardSbj } from './components/DashboardSbj';
import { DataMtol } from './components/DataMtol';
import { ThemeModal } from './components/ThemeModal';
import { loadDatabase, saveDatabase } from './lib/storage';
import {
  fetchCloudDatabase,
  saveSampleToCloud,
  validateSampleOnCloud,
  saveLhpToCloud,
  saveMtolToCloud,
  saveConfigToCloud,
  deleteSampleFromCloud,
  deleteLhpFromCloud,
} from './lib/cloudApi';
import { initAuth, db as firestoreDb } from './lib/firebase';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { playSound } from './lib/sound';
import { loadTheme, applyTheme } from './lib/theme';
import {
  AppDatabase,
  SampleRecord,
  LhpRecord,
  MtolRecord,
  UserRole,
  ActiveTab,
  AppConfig,
  ThemeConfig,
} from './types';
import { CheckCircle2, XCircle, BellRing } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(loadDatabase);
  const [role, setRole] = useState<UserRole>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('isam');
  const [operatorName, setOperatorName] = useState('Operator Shift 1');
  const [operatorMachine, setOperatorMachine] = useState<string>('Hopak 1');

  const handleRoleChange = (newRole: UserRole, customOpName?: string, customMachine?: string) => {
    setRole(newRole);
    if (customOpName) setOperatorName(customOpName);
    if (customMachine) setOperatorMachine(customMachine);
    if (newRole === 'operator') {
      setActiveTab('isam');
    } else if (newRole === 'admin') {
      setActiveTab('dsam');
    }
  };

  const [theme, setTheme] = useState<ThemeConfig>(() => db.cfg.theme || loadTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleSaveTheme = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    handleUpdateConfig({ ...db.cfg, theme: newTheme });
    showToast('Tema tampilan berhasil disimpan!');
  };

  const prevSamplesRef = useRef<SampleRecord[]>(db.samples);

  const [toast, setToast] = useState<{
    message: string;
    type: 'ok' | 'err' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    saveDatabase(db);
    prevSamplesRef.current = db.samples;
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    try {
      const unsubSamples = onSnapshot(
        collection(firestoreDb, 'samples'),
        (snapshot) => {
          if (!isMounted) return;
          const remoteSamples: SampleRecord[] = [];
          snapshot.forEach((d) => remoteSamples.push(d.data() as SampleRecord));
          if (remoteSamples.length > 0) {
            setDb((prev) => {
              const prevMap = new Map(prevSamplesRef.current.map((s) => [s.id, s.status]));
              for (const s of remoteSamples) {
                const oldStatus = prevMap.get(s.id);
                if (oldStatus === 'pending' && (s.status === 'ok' || s.status === 'nok')) {
                  playSound(prev.cfg.tone, prev.cfg.vol, prev.cfg.custom);
                  showToast(
                    `Hasil Validasi Mesin ${s.pk}: ${s.status === 'ok' ? 'OKE' : 'TIDAK OKE'}`,
                    s.status === 'ok' ? 'ok' : 'err'
                  );
                }
              }
              return { ...prev, samples: remoteSamples };
            });
          }
        },
        (err) => {
          console.warn('Samples real-time sync paused (quota/network):', err.message);
        }
      );

      const unsubLhps = onSnapshot(
        collection(firestoreDb, 'lhps'),
        (snapshot) => {
          if (!isMounted) return;
          const remoteLhps: LhpRecord[] = [];
          snapshot.forEach((d) => remoteLhps.push(d.data() as LhpRecord));
          if (remoteLhps.length > 0) {
            setDb((prev) => ({ ...prev, lhps: remoteLhps }));
          }
        },
        (err) => {
          console.warn('LHPs real-time sync paused (quota/network):', err.message);
        }
      );

      const unsubMtol = onSnapshot(
        doc(firestoreDb, 'master_data', 'mtol'),
        (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists() && docSnap.data().records) {
            const records = docSnap.data().records as MtolRecord[];
            setDb((prev) => ({ ...prev, mtol: records }));
          }
        },
        (err) => {
          console.warn('MTOL real-time sync paused (quota/network):', err.message);
        }
      );

      const unsubCfg = onSnapshot(
        doc(firestoreDb, 'settings', 'config'),
        (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            const cfgData = docSnap.data() as AppConfig;
            setDb((prev) => ({ ...prev, cfg: { ...prev.cfg, ...cfgData } }));
          }
        },
        (err) => {
          console.warn('Config real-time sync paused (quota/network):', err.message);
        }
      );

      return () => {
        isMounted = false;
        unsubSamples();
        unsubLhps();
        unsubMtol();
        unsubCfg();
      };
    } catch (err) {
      console.warn('Real-time sync setup failed, using initial fetch:', err);
      fetchCloudDatabase().then((cloudData) => {
        if (cloudData && isMounted) {
          setDb((prev) => ({
            ...prev,
            samples: cloudData.samples.length > 0 ? cloudData.samples : prev.samples,
            lhps: cloudData.lhps.length > 0 ? cloudData.lhps : prev.lhps,
            mtol: cloudData.mtol.length > 0 ? cloudData.mtol : prev.mtol,
            cfg: { ...prev.cfg, ...cloudData.cfg },
          }));
        }
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);



  const handleSubmitSample = async (sample: SampleRecord) => {
    const updatedSamples = [...db.samples, sample];
    setDb((prev) => ({ ...prev, samples: updatedSamples }));
    showToast(`Sampel mesin ${sample.pk} berhasil dikirim ke Admin Produksi.`);
    setActiveTab('stat');

    saveSampleToCloud(sample);
  };

  const handleSubmitLhp = async (lhp: LhpRecord) => {
    const updatedLhps = [...db.lhps, lhp];
    setDb((prev) => ({ ...prev, lhps: updatedLhps }));
    showToast(`Data LHP Batch ${lhp.b1} berhasil disimpan.`);
    setActiveTab('stat');

    saveLhpToCloud(lhp);
  };

  const handleValidateSample = async (
    sampleId: number,
    status: 'ok' | 'nok',
    params: string[],
    reasons: string[],
    other: string,
    ocrData: SampleRecord['ocr']
  ) => {
    const validatedAt = new Date().toLocaleString('id-ID');
    const updatedSamples = db.samples.map((s) => {
      if (s.id === sampleId) {
        return {
          ...s,
          status,
          params,
          reasons,
          other,
          ocr: { ...s.ocr, ...ocrData },
          validatedAt,
        };
      }
      return s;
    });
    setDb((prev) => ({ ...prev, samples: updatedSamples }));

    playSound(db.cfg.tone, db.cfg.vol, db.cfg.custom);
    showToast(
      `Sampel berhasil divalidasi: ${status === 'ok' ? 'OKE' : 'TIDAK OKE'}`
    );

    validateSampleOnCloud(sampleId, status, params, reasons, other, ocrData);
  };

  const handleDeleteSample = async (sampleId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data sampel ini?')) return;
    const updatedSamples = db.samples.filter((s) => s.id !== sampleId);
    setDb((prev) => ({ ...prev, samples: updatedSamples }));
    showToast('Data sampel berhasil dihapus.', 'info');
    deleteSampleFromCloud(sampleId);
  };

  const handleDeleteLhp = async (lhpId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data LHP ini?')) return;
    const updatedLhps = db.lhps.filter((l) => (l.id || l.b1) !== lhpId);
    setDb((prev) => ({ ...prev, lhps: updatedLhps }));
    showToast('Data LHP berhasil dihapus.', 'info');
    deleteLhpFromCloud(lhpId);
  };

  const handleUpdateMtol = (data: MtolRecord[]) => {
    setDb((prev) => ({ ...prev, mtol: data }));
    saveMtolToCloud(data);
    showToast(`Master data MTOL diperbarui (${data.length} baris).`);
  };

  const handleUpdateConfig = (cfg: AppConfig) => {
    setDb((prev) => ({ ...prev, cfg }));
    saveConfigToCloud(cfg);
  };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-200 ${
        !role ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-bold ${
              toast.type === 'ok'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-500/40'
                : toast.type === 'err'
                ? 'bg-rose-950 text-rose-100 border-rose-500/40'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'err' ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <BellRing className="w-4 h-4 text-teal-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {!role ? (
        <>
          <LoginModal
            onLogin={handleRoleChange}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
          />
          <ThemeModal
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
            currentTheme={theme}
            onSaveTheme={handleSaveTheme}
          />
        </>
      ) : (
        <>
          <Navbar
            role={role}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSwitchRole={() => setRole(null)}
            onLogout={() => setRole(null)}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
          />

          <main className="flex-1 p-3 sm:p-6 lg:p-8">
            <div className="animate-in fade-in duration-200">
              {role === 'operator' && activeTab === 'isam' && (
                <InputSample
                  defaultOperator={operatorName}
                  defaultMachine={operatorMachine}
                  role={role}
                  onSubmit={handleSubmitSample}
                />
              )}
              {role === 'operator' && activeTab === 'ilhp' && (
                <InputLhp
                  mtolData={db.mtol}
                  samples={db.samples}
                  defaultMachine={operatorMachine}
                  role={role}
                  onSubmit={handleSubmitLhp}
                />
              )}
              {role === 'operator' && activeTab === 'stat' && (
                <OperatorStatus
                  samples={db.samples}
                  operatorMachine={operatorMachine}
                  role={role}
                />
              )}

              {role === 'admin' && activeTab === 'dsam' && (
                <DashboardSample
                  samples={db.samples}
                  onValidate={handleValidateSample}
                  config={db.cfg}
                  onSaveConfig={(newCfg) => {
                    handleUpdateConfig(newCfg);
                    showToast('Pengaturan suara berhasil disimpan!');
                  }}
                  mtolData={db.mtol}
                  onDeleteSample={handleDeleteSample}
                  operatorMachine={operatorMachine}
                  role={role}
                  onUpdateSampleOcr={(id, newOcr) => {
                    setDb((prev) => ({
                      ...prev,
                      samples: prev.samples.map((s) =>
                        s.id === id ? { ...s, ocr: { ...s.ocr, ...newOcr } } : s
                      ),
                    }));
                  }}
                />
              )}
              {role === 'admin' && activeTab === 'dsbj' && (
                <DashboardSbj
                  samples={db.samples}
                  lhps={db.lhps}
                  onDeleteSample={handleDeleteSample}
                  onDeleteLhp={handleDeleteLhp}
                  operatorMachine={operatorMachine}
                  role={role}
                />
              )}
              {role === 'admin' && activeTab === 'mtol' && (
                <DataMtol mtolData={db.mtol} onUpdateMtol={handleUpdateMtol} />
              )}
            </div>
          </main>

          <ThemeModal
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
            currentTheme={theme}
            onSaveTheme={handleSaveTheme}
          />
        </>
      )}
    </div>
  );

}
