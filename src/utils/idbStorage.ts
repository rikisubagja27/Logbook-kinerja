import { LogbookEntry } from '../types/logbook';

const DB_NAME = 'kps1_manoko_logbook_db';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

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
