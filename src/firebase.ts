import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore, 
  doc, 
  getDocFromServer, 
  getDocsFromServer,
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch,
  setLogLevel
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { LogbookEntry, UserProfile, GoogleAccount } from './types/logbook';
import { clearGoogleAccount, saveGoogleAccount, loadGoogleAccount } from './utils/storage';

export type ActiveSyncUser = GoogleAccount;

export function getDeterministicUserId(email: string, rawUid?: string): string {
  const clean = (email || '').trim().toLowerCase();
  if (clean) {
    return 'g_' + clean.replace(/[^a-z0-9]/g, '_');
  }
  return rawUid || 'user_anonymous';
}

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with IndexedDB persistent local cache and ignoreUndefinedProperties
function initFirestoreInstance() {
  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = initFirestoreInstance();

// Suppress repetitive background connection retry noise while operating in local offline cache mode
setLogLevel('silent');

// Initialize Firebase Authentication
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test Connection on initial boot as required by Firestore integration guidelines
export async function testConnection() {
  try {
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(false);
      } catch (tokenErr: any) {
        console.warn('Auth token refresh notice:', tokenErr);
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    // Graceful offline fallback - never force logout the user on startup
    console.warn('Connection check notice (operating in local cache mode):', error?.message || error);
  }
}

// Check connection gracefully without blocking app startup
setTimeout(() => {
  testConnection().catch(() => {});
}, 3000);

// ==========================================
// Firestore Cloud Sync Services
// ==========================================

export async function loginWithGoogle(): Promise<ActiveSyncUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      const email = result.user.email || '';
      const uid = getDeterministicUserId(email, result.user.uid);
      const userObj: ActiveSyncUser = {
        uid,
        email,
        displayName: result.user.displayName || email.split('@')[0] || 'Pegawai',
        photoURL: result.user.photoURL || undefined,
        provider: 'google.com',
        lastLogin: new Date().toISOString(),
      };
      saveGoogleAccount(userObj);
      return userObj;
    }
  } catch (error: any) {
    console.warn('Popup sign in notice, checking redirect:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        console.warn('Redirect sign-in notice:', redirectErr);
      }
    }
    throw error;
  }
  return null;
}

export async function connectGoogleAccountDirectly(email: string, displayName?: string): Promise<ActiveSyncUser> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Alamat email Google tidak valid.');
  }

  // Attempt anonymous auth in background so Firebase Auth has an active session
  try {
    if (!auth.currentUser) {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
    }
  } catch (anonErr) {
    console.warn('Anonymous auth notice (proceeding in direct partition mode):', anonErr);
  }

  const uid = getDeterministicUserId(cleanEmail);
  const account: ActiveSyncUser = {
    uid,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0].toUpperCase(),
    photoURL: undefined,
    provider: 'google.com',
    lastLogin: new Date().toISOString(),
  };

  saveGoogleAccount(account);
  return account;
}

export async function logoutUser(): Promise<void> {
  clearGoogleAccount();
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('fbSignOut notice:', err);
  }
}

// Save or Update a single Logbook Entry in Firestore
export async function syncEntryToCloud(userId: string, entry: LogbookEntry): Promise<void> {
  if (!userId) return;
  try {
    const entryRef = doc(db, 'users', userId, 'logbookEntries', entry.id);
    await setDoc(entryRef, {
      ...entry,
      userId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error syncing entry to cloud:', err);
  }
}

// Delete an entry from Firestore
export async function deleteEntryFromCloud(userId: string, entryId: string): Promise<void> {
  if (!userId) return;
  try {
    const entryRef = doc(db, 'users', userId, 'logbookEntries', entryId);
    await deleteDoc(entryRef);
  } catch (err) {
    console.error('Error deleting entry from cloud:', err);
  }
}

// Batch upload all local entries to cloud (e.g. initial cloud migration)
export async function batchSyncEntriesToCloud(userId: string, entries: LogbookEntry[]): Promise<void> {
  if (!userId || entries.length === 0) return;
  try {
    const batch = writeBatch(db);
    entries.forEach((entry) => {
      const ref = doc(db, 'users', userId, 'logbookEntries', entry.id);
      batch.set(ref, { ...entry, userId, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error batch syncing entries to cloud:', err);
  }
}

// Save User Profile to Firestore
export async function syncProfileToCloud(userId: string, profile: UserProfile): Promise<void> {
  if (!userId) return;
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'main');
    await setDoc(profileRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error syncing profile to cloud:', err);
  }
}

// Fetch all entries for a user once
export async function fetchCloudEntries(userId: string): Promise<LogbookEntry[]> {
  if (!userId) return [];
  try {
    const entriesCol = collection(db, 'users', userId, 'logbookEntries');
    const snapshot = await getDocs(entriesCol);
    const list: LogbookEntry[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as LogbookEntry);
    });
    return list;
  } catch (err) {
    console.error('Error fetching cloud entries:', err);
    return [];
  }
}

// Check redirect login result for mobile / standalone PWA browsers
export async function handleGoogleRedirectResult(): Promise<ActiveSyncUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const email = result.user.email || '';
      const uid = getDeterministicUserId(email, result.user.uid);
      const userObj: ActiveSyncUser = {
        uid,
        email,
        displayName: result.user.displayName || email.split('@')[0] || 'Pegawai',
        photoURL: result.user.photoURL || undefined,
        provider: 'google.com',
        lastLogin: new Date().toISOString(),
      };
      saveGoogleAccount(userObj);
      return userObj;
    }
  } catch (err) {
    console.warn('Redirect auth check warning:', err);
  }
  return null;
}

// ==========================================
// Shared Employee / NIP Directory Cloud Sync
// Ensures registered colleagues are preserved across all devices & shared links
// ==========================================

export async function syncEmployeeToCloud(employee: UserProfile): Promise<boolean> {
  const cleanNip = employee.nip ? employee.nip.replace(/\D/g, '') : '';
  if (!cleanNip || !employee.nama) return false;

  try {
    const empRef = doc(db, 'employees', cleanNip);
    await setDoc(empRef, {
      nama: employee.nama.trim().toUpperCase(),
      nip: cleanNip,
      jabatan: employee.jabatan || 'Operator Layanan Operasional',
      statusKepegawaian: employee.statusKepegawaian || 'PPPK Paruh Waktu',
      unitKerja: employee.unitKerja || 'Kebun Pemeriksaan Substantif PVT I Manoko',
      instansiInduk: employee.instansiInduk || 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
      kementerian: employee.kementerian || 'Kementerian Pertanian',
      tempatPenetapan: employee.tempatPenetapan || 'Bandung Barat',
      email: employee.email || '',
      fotoProfil: employee.fotoProfil || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error syncing employee to cloud:', err);
    throw err;
  }
}

export async function syncAllEmployeesToCloud(employees: UserProfile[]): Promise<number> {
  if (!employees || employees.length === 0) return 0;
  let successCount = 0;
  for (const emp of employees) {
    try {
      const clean = emp.nip ? emp.nip.replace(/\D/g, '') : '';
      if (clean && emp.nama) {
        await syncEmployeeToCloud(emp);
        successCount++;
      }
    } catch (e) {
      console.warn(`Failed to sync employee ${emp.nama} (${emp.nip}) to cloud:`, e);
    }
  }
  return successCount;
}

export async function deleteEmployeeFromCloud(nip: string): Promise<void> {
  const cleanNip = nip ? nip.replace(/\D/g, '') : '';
  if (!cleanNip) return;

  try {
    const empRef = doc(db, 'employees', cleanNip);
    await deleteDoc(empRef);
  } catch (err) {
    console.error('Error deleting employee from cloud:', err);
    throw err;
  }
}

export async function fetchCloudEmployees(): Promise<UserProfile[]> {
  try {
    const colRef = collection(db, 'employees');

    // 1. Try fetching directly from Firestore backend server to ensure fresh multi-device sync
    try {
      const serverSnap = await getDocsFromServer(colRef);
      const list: UserProfile[] = [];
      serverSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.nip && data.nama) {
          list.push(data as UserProfile);
        }
      });
      if (list.length > 0) {
        return list;
      }
    } catch (serverErr) {
      console.warn('getDocsFromServer notice (falling back to cache):', serverErr);
    }

    // 2. Fallback to standard getDocs (reads cache or server)
    const snapshot = await getDocs(colRef);
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.nip && data.nama) {
        list.push(data as UserProfile);
      }
    });
    return list;
  } catch (err) {
    console.warn('Error fetching cloud employees:', err);
    return [];
  }
}

export function subscribeToCloudEmployees(onUpdate: (employees: UserProfile[]) => void): () => void {
  try {
    const colRef = collection(db, 'employees');
    return onSnapshot(colRef, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.nip && data.nama) {
          list.push(data as UserProfile);
        }
      });
      if (list.length > 0) {
        onUpdate(list);
      }
    }, (error) => {
      console.warn('Employees snapshot warning:', error);
    });
  } catch (err) {
    console.warn('Error subscribing to employees:', err);
    return () => {};
  }
}

