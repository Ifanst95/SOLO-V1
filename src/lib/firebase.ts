import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: any = null;

const waitForGsi = (maxWaitMs = 3000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve(true);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > maxWaitMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else if (cachedUser && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      cachedUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: any;
  accessToken: string;
} | null> => {
  isSigningIn = true;
  try {
    const hasGsi = await waitForGsi(2000);
    const clientId = firebaseConfig.oAuthClientId;
    if (hasGsi && clientId) {
      try {
        const tokenResponse = await new Promise<{ access_token: string }>((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES.join(' '),
            callback: (resp: any) => {
              if (resp.error) {
                reject(new Error(resp.error_description || resp.error));
              } else if (resp.access_token) {
                resolve(resp);
              } else {
                reject(new Error('Tidak ada access token dari Google Identity Services.'));
              }
            },
          });
          client.requestAccessToken();
        });
        cachedAccessToken = tokenResponse.access_token;
        let userInfo: any = {
          displayName: 'Pengguna Google',
          email: 'google-user@domain.com',
        };
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${cachedAccessToken}` },
          });
          if (userRes.ok) {
            const data = await userRes.json();
            userInfo = {
              displayName: data.name || data.email,
              email: data.email,
              photoURL: data.picture,
            };
          }
        } catch (e) {
          console.warn('Could not fetch userinfo:', e);
        }
        cachedUser = userInfo;
        return { user: userInfo, accessToken: cachedAccessToken };
      } catch (gisErr: any) {
        if (gisErr.message?.includes('popup_closed') || gisErr.message?.includes('access_denied')) {
          throw gisErr;
        }
      }
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan token akses dari Google Auth.');
      }
      cachedAccessToken = credential.accessToken;
      cachedUser = result.user;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        throw new Error(
          `Domain "${currentHost}" belum diotorisasi di Firebase Authentication. Tambahkan domain ini ke Firebase Console > Authentication > Settings > Authorized Domains.`
        );
      }
      throw fbErr;
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const setManualAccessToken = (token: string, userEmail = 'Akun Google Terhubung') => {
  cachedAccessToken = token.trim();
  cachedUser = {
    displayName: userEmail,
    email: userEmail,
  };
  return { user: cachedUser, accessToken: cachedAccessToken };
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore
  }
  cachedAccessToken = null;
  cachedUser = null;
};
