import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore, 
  doc, 
  getDocFromServer, 
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
import { LogbookEntry, UserProfile } from './types/logbook';

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
    // If there is a cached user session with an invalid or expired token, validate it first
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(false);
      } catch (tokenErr: any) {
        console.warn('Stale auth session detected, resetting to allow clean sign-in.');
        await fbSignOut(auth);
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.includes('token-service-api') || msg.includes('securetoken.googleapis.com')) {
      try {
        await fbSignOut(auth);
      } catch {}
    }
  }
}

// Check connection gracefully without blocking app startup
setTimeout(() => {
  testConnection().catch(() => {});
}, 1500);

// ==========================================
// Firestore Cloud Sync Services
// ==========================================

export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Popup sign in failed, trying redirect:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
    } else {
      throw error;
    }
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
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
export async function handleGoogleRedirectResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
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

export async function syncEmployeeToCloud(employee: UserProfile): Promise<void> {
  const cleanNip = employee.nip ? employee.nip.replace(/\D/g, '') : '';
  if (!cleanNip) return;

  try {
    const empRef = doc(db, 'employees', cleanNip);
    await setDoc(empRef, {
      nama: employee.nama,
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
  } catch (err) {
    console.error('Error syncing employee to cloud:', err);
  }
}

export async function deleteEmployeeFromCloud(nip: string): Promise<void> {
  const cleanNip = nip ? nip.replace(/\D/g, '') : '';
  if (!cleanNip) return;

  try {
    const empRef = doc(db, 'employees', cleanNip);
    await deleteDoc(empRef);
  } catch (err) {
    console.error('Error deleting employee from cloud:', err);
  }
}

export async function fetchCloudEmployees(): Promise<UserProfile[]> {
  try {
    const colRef = collection(db, 'employees');
    const snapshot = await getDocs(colRef);
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UserProfile);
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
        list.push(docSnap.data() as UserProfile);
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

