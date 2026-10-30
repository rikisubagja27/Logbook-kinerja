import { LogbookEntry, UserProfile } from '../types/logbook';

const DB_NAME = 'kps1_manoko_logbook_db';
const DB_VERSION = 2;
const STORE_NAME = 'entries';
const OFFICERS_STORE_NAME = 'officers';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung pada peramban ini'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(OFFICERS_STORE_NAME)) {
        db.createObjectStore(OFFICERS_STORE_NAME, { keyPath: 'nip' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });
}

/**
 * Retrieve all logbook entries from high-capacity IndexedDB
 */
export async function getAllEntriesFromIDB(): Promise<LogbookEntry[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as LogbookEntry[]) || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('IDB getAllEntries error:', err);
    return [];
  }
}

/**
 * Persist all entries to IndexedDB (supports unlimited gigabytes of entries + photos)
 */
export async function saveEntriesToIDB(entries: LogbookEntry[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing records in store to maintain exact sync
      store.clear();

      entries.forEach((entry) => {
        store.put(entry);
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB saveEntries error:', err);
  }
}

/**
 * Save or update a single entry into IndexedDB
 */
export async function saveSingleEntryToIDB(entry: LogbookEntry): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(entry);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB saveSingleEntry error:', err);
  }
}

/**
 * Delete a single entry from IndexedDB
 */
export async function deleteEntryFromIDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB deleteEntry error:', err);
  }
}

/**
 * Retrieve all registered officers/employees from IndexedDB
 */
export async function getOfficersFromIDB(): Promise<UserProfile[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(OFFICERS_STORE_NAME)) {
        resolve([]);
        return;
      }
      const transaction = db.transaction([OFFICERS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(OFFICERS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as UserProfile[]) || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('IDB getOfficers error:', err);
    return [];
  }
}

/**
 * Persist entire officer roster to IndexedDB
 */
export async function saveOfficersToIDB(officers: UserProfile[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(OFFICERS_STORE_NAME)) {
        resolve();
        return;
      }
      const transaction = db.transaction([OFFICERS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OFFICERS_STORE_NAME);

      store.clear();

      officers.forEach((officer) => {
        if (officer.nip) {
          store.put(officer);
        }
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB saveOfficers error:', err);
  }
}

/**
 * Save or update a single officer in IndexedDB
 */
export async function saveSingleOfficerToIDB(officer: UserProfile): Promise<void> {
  if (!officer.nip) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(OFFICERS_STORE_NAME)) {
        resolve();
        return;
      }
      const transaction = db.transaction([OFFICERS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OFFICERS_STORE_NAME);
      store.put(officer);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB saveSingleOfficer error:', err);
  }
}

/**
 * Delete a single officer from IndexedDB
 */
export async function deleteOfficerFromIDB(nip: string): Promise<void> {
  if (!nip) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(OFFICERS_STORE_NAME)) {
        resolve();
        return;
      }
      const transaction = db.transaction([OFFICERS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OFFICERS_STORE_NAME);
      store.delete(nip);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IDB deleteOfficer error:', err);
  }
}
