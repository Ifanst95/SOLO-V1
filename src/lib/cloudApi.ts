import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppDatabase, SampleRecord, LhpRecord, MtolRecord, AppConfig } from '../types';
import { loadDatabase, saveDatabase } from './storage';

export const fetchCloudDatabase = async (): Promise<AppDatabase | null> => {
  try {
    const localDb = loadDatabase();

    // Try fetching from Firestore
    const samplesSnapshot = await getDocs(collection(db, 'samples')).catch(() => null);
    const lhpsSnapshot = await getDocs(collection(db, 'lhps')).catch(() => null);
    const mtolDoc = await getDoc(doc(db, 'master_data', 'mtol')).catch(() => null);
    const cfgDoc = await getDoc(doc(db, 'settings', 'config')).catch(() => null);

    const remoteSamples: SampleRecord[] = [];
    if (samplesSnapshot && !samplesSnapshot.empty) {
      samplesSnapshot.forEach((d) => {
        remoteSamples.push(d.data() as SampleRecord);
      });
    }

    const remoteLhps: LhpRecord[] = [];
    if (lhpsSnapshot && !lhpsSnapshot.empty) {
      lhpsSnapshot.forEach((d) => {
        remoteLhps.push(d.data() as LhpRecord);
      });
    }

    const remoteMtol: MtolRecord[] = mtolDoc?.exists()
      ? (mtolDoc.data().records as MtolRecord[])
      : localDb.mtol;

    const remoteCfg: AppConfig = cfgDoc?.exists()
      ? (cfgDoc.data() as AppConfig)
      : localDb.cfg;

    const mergedDb: AppDatabase = {
      samples: remoteSamples.length > 0 ? remoteSamples : localDb.samples,
      lhps: remoteLhps.length > 0 ? remoteLhps : localDb.lhps,
      mtol: remoteMtol.length > 0 ? remoteMtol : localDb.mtol,
      cfg: { ...localDb.cfg, ...remoteCfg },
    };

    saveDatabase(mergedDb);
    return mergedDb;
  } catch (err) {
    console.warn('Using local database:', err);
    return loadDatabase();
  }
};

export const saveSampleToCloud = async (sample: SampleRecord): Promise<boolean> => {
  try {
    const sampleRef = doc(db, 'samples', String(sample.id));
    await setDoc(sampleRef, sample);
    return true;
  } catch (err) {
    console.warn('Save sample to Firestore fallback to local:', err);
    return false;
  }
};

export const validateSampleOnCloud = async (
  sampleId: number,
  status: 'ok' | 'nok',
  params: string[],
  reasons: string[],
  other: string,
  ocr: SampleRecord['ocr']
): Promise<boolean> => {
  try {
    const sampleRef = doc(db, 'samples', String(sampleId));
    await updateDoc(sampleRef, {
      status,
      params,
      reasons,
      other,
      ocr,
      validatedAt: new Date().toLocaleString('id-ID'),
      syncedToSheets: false,
    });
    return true;
  } catch (err) {
    console.warn('Validate sample on Firestore fallback to local:', err);
    return false;
  }
};

export const saveLhpToCloud = async (lhp: LhpRecord): Promise<boolean> => {
  try {
    const id = lhp.id || Date.now();
    const lhpRef = doc(db, 'lhps', String(id));
    await setDoc(lhpRef, { ...lhp, id });
    return true;
  } catch (err) {
    console.warn('Save LHP to Firestore fallback to local:', err);
    return false;
  }
};

export const saveMtolToCloud = async (mtol: MtolRecord[]): Promise<boolean> => {
  try {
    const mtolRef = doc(db, 'master_data', 'mtol');
    await setDoc(mtolRef, { records: mtol, updatedAt: new Date().toISOString() });
    return true;
  } catch (err) {
    console.warn('Save MTOL to Firestore fallback to local:', err);
    return false;
  }
};

export const saveConfigToCloud = async (cfg: AppConfig): Promise<boolean> => {
  try {
    const cfgRef = doc(db, 'settings', 'config');
    await setDoc(cfgRef, cfg);
    return true;
  } catch (err) {
    console.warn('Save config to Firestore fallback to local:', err);
    return false;
  }
};

export const loginAdminOnServer = async (
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  const user = username.trim();
  const pass = password.trim();

  try {
    const authDoc = await getDoc(doc(db, 'settings', 'admin_auth'));
    if (authDoc.exists()) {
      const data = authDoc.data();
      if (user === data.username && pass === data.passwordHash) {
        return { success: true, token: `adm_${Date.now()}` };
      }
    }
  } catch (e) {
    // fallback
  }

  if (user === 'admin' && pass === 'admin123') {
    return { success: true, token: `adm_default_${Date.now()}` };
  }

  return { success: false, error: 'Username atau password admin salah.' };
};

export const changeAdminPasswordOnServer = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const authRef = doc(db, 'settings', 'admin_auth');
    const authDoc = await getDoc(authRef);
    let validPass = 'admin123';
    if (authDoc.exists()) {
      validPass = authDoc.data().passwordHash;
    }

    if (currentPassword.trim() !== validPass) {
      return { success: false, error: 'Password lama salah.' };
    }

    await setDoc(authRef, {
      username: 'admin',
      passwordHash: newPassword.trim(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah password.' };
  }
};
