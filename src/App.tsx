import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LogbookEntry, 
  UserProfile 
} from './types/logbook';
import { 
  loadLogbookEntries, 
  saveLogbookEntries, 
  loadUserProfile, 
  saveUserProfile,
  sortLogbookEntriesByDateAscending,
  saveGoogleAccount,
  clearGoogleAccount,
  loadGoogleAccount,
  mergeCloudNipDirectory,
  initRosterFromIDB,
  loadNipDirectory,
  recoverAllLogbookPhotos,
  isDummySampleEntry
} from './utils/storage';
import { 
  auth, 
  db, 
  syncEntryToCloud, 
  deleteEntryFromCloud, 
  syncProfileToCloud, 
  batchSyncEntriesToCloud,
  subscribeToCloudEmployees,
  fetchCloudEmployees,
  syncAllEmployeesToCloud,
  handleGoogleRedirectResult,
  ActiveSyncUser,
  getDeterministicUserId,
  restoreUserDataFromCloud
} from './firebase';
import { 
  getAllEntriesFromIDB, 
  saveSingleEntryToIDB, 
  deleteEntryFromIDB 
} from './utils/idbStorage';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Header } from './components/Header';
import { LogbookForm } from './components/LogbookForm';
import { LogbookList } from './components/LogbookList';
import { OfficialReportView } from './components/OfficialReportView';
import { EPersonalView } from './components/EPersonalView';
import { ProfileView } from './components/ProfileView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppUpdateNotification } from './components/AppUpdateNotification';
import { CloudSyncView } from './components/CloudSyncView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'report' | 'cloudsync' | 'profile' | 'epersonal'>('form');
  const [entries, setEntries] = useState<LogbookEntry[]>(() => loadLogbookEntries());
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [officerDirectory, setOfficerDirectory] = useState<UserProfile[]>(() => loadNipDirectory());
  const [isRefreshingOfficers, setIsRefreshingOfficers] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);

  // Firebase Real-time Cloud Synchronization State - persistent across reloads
  const [currentUser, setCurrentUser] = useState<ActiveSyncUser | null>(() => {
    const cached = loadGoogleAccount();
    if (cached && cached.email) {
      return cached;
    }
    return null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialSyncRef = useRef(false);

  const handleRefreshOfficers = useCallback(async () => {
    setIsRefreshingOfficers(true);
    try {
      const idbList = await initRosterFromIDB();
      if (idbList.length > 0) {
        setOfficerDirectory(idbList);
        await syncAllEmployeesToCloud(idbList);
      }
      const cloudList = await fetchCloudEmployees();
      if (cloudList && cloudList.length > 0) {
        const merged = mergeCloudNipDirectory(cloudList);
        setOfficerDirectory(merged);
      }
    } catch (err) {
      console.warn('Roster refresh warning:', err);
    } finally {
      setIsRefreshingOfficers(false);
    }
  }, []);

  // Monitor Authentication State & Check Redirect Result
  useEffect(() => {
    handleGoogleRedirectResult().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    }).catch(() => {});

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email || '';
        const uid = getDeterministicUserId(email, user.uid);
        const userObj: ActiveSyncUser = {
          uid,
          email,
          displayName: user.displayName || email.split('@')[0] || 'Pegawai',
          photoURL: user.photoURL || undefined,
          provider: 'google.com',
          lastLogin: new Date().toISOString(),
        };
        saveGoogleAccount(userObj);
        setCurrentUser(userObj);
      }
    });

    // 1. Initial async load from IndexedDB and auto-heal/push local roster to Cloud Firestore
    initRosterFromIDB().then((idbOfficers) => {
      if (idbOfficers && idbOfficers.length > 0) {
        setOfficerDirectory(idbOfficers);
        // Push local officers to cloud so colleagues on shared devices immediately get them!
        syncAllEmployeesToCloud(idbOfficers).catch(() => {});
      }
    }).catch(() => {});

    // 2. Fetch fresh employees directly from Cloud Firestore
    fetchCloudEmployees().then((cloudEmps) => {
      if (cloudEmps && cloudEmps.length > 0) {
        const merged = mergeCloudNipDirectory(cloudEmps);
        setOfficerDirectory(merged);
      }
    }).catch(() => {});

    // 3. Realtime subscribe to shared employee roster so registered colleagues appear on all devices
    const unsubscribeEmployees = subscribeToCloudEmployees((cloudEmps) => {
      if (cloudEmps && cloudEmps.length > 0) {
        const merged = mergeCloudNipDirectory(cloudEmps);
        setOfficerDirectory(merged);
      }
    });

    // 4. Listen to local custom event triggered by IndexedDB or other tabs
    const handleDirectoryUpdated = (e: any) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setOfficerDirectory(e.detail);
      }
    };
    window.addEventListener('kps-nip-directory-updated', handleDirectoryUpdated);

    // 5. Load all entries from high-capacity IndexedDB to ensure daily entries and photos are never lost
    getAllEntriesFromIDB().then((idbEntries) => {
      // Cek apakah halaman dibuka dengan mode baru / dibagikan (?mode=baru atau ?share=new)
      try {
        const url = new URL(window.location.href);
        if (
          url.searchParams.get('mode') === 'baru' || 
          url.searchParams.get('share') === 'new' ||
          url.searchParams.get('baru') === '1'
        ) {
          setEntries([]);
          saveLogbookEntries([]);
          return;
        }
      } catch (_) {}

      // Jika data IDB hanya berupa entri sampel lawas, jangan masukkan
      if (idbEntries && idbEntries.length > 0 && idbEntries.every((e) => isDummySampleEntry(e.id))) {
        setEntries([]);
        saveLogbookEntries([]);
        return;
      }

      setEntries((prev) => {
        const map = new Map<string, LogbookEntry>();
        prev.filter((e) => !isDummySampleEntry(e.id)).forEach((e) => map.set(e.id, e));

        if (idbEntries && idbEntries.length > 0) {
          idbEntries.filter((e) => !isDummySampleEntry(e.id)).forEach((idbEntry) => {
            const current = map.get(idbEntry.id);
            // Prioritize whichever has photos
            const fotoSebelum = idbEntry.fotoSebelum || current?.fotoSebelum;
            const fotoSesudah = idbEntry.fotoSesudah || current?.fotoSesudah;
            map.set(idbEntry.id, {
              ...(current || idbEntry),
              fotoSebelum,
              fotoSesudah,
            });
          });
        }

        const merged = sortLogbookEntriesByDateAscending(Array.from(map.values()));
        const { updatedEntries } = recoverAllLogbookPhotos(merged);
        saveLogbookEntries(updatedEntries);
        return updatedEntries;
      });
    }).catch((err) => console.warn('IDB load warning:', err));

    return () => {
      unsubscribeAuth();
      unsubscribeEmployees();
      window.removeEventListener('kps-nip-directory-updated', handleDirectoryUpdated);
    };
  }, []);

  // Bersihkan parameter url dan inisialisasi aplikasi bersih jika dibagikan (?mode=baru)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const isShareNew = 
        url.searchParams.get('mode') === 'baru' ||
        url.searchParams.get('share') === 'new' ||
        url.searchParams.get('baru') === '1' ||
        url.searchParams.get('bagikan') === '1';

      if (isShareNew) {
        // Otomatis kosongkan logbook untuk pengguna/perangkat baru
        saveLogbookEntries([]);
        setEntries([]);
      }

      if (
        url.searchParams.has('mode') ||
        url.searchParams.has('action') ||
        url.searchParams.has('dikte') ||
        url.searchParams.has('share') ||
        url.searchParams.has('baru') ||
        url.searchParams.has('bagikan') ||
        url.hash === '#dikte' ||
        url.hash === '#/dikte'
      ) {
        url.searchParams.delete('mode');
        url.searchParams.delete('action');
        url.searchParams.delete('dikte');
        url.searchParams.delete('share');
        url.searchParams.delete('baru');
        url.searchParams.delete('bagikan');
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
        const cleanHash = (url.hash === '#dikte' || url.hash === '#/dikte') ? '' : url.hash;
        window.history.replaceState({}, document.title, url.pathname + cleanQuery + cleanHash);
      }
    } catch (_) {}
  }, []);

  // Listen to Firestore Realtime Data when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncing(true);

    // 1. Listen to user's Logbook Entries in Firestore
    const entriesCol = collection(db, 'users', currentUser.uid, 'logbookEntries');
    const unsubscribeEntries = onSnapshot(entriesCol, (snapshot) => {
      setIsSyncing(false);
      const cloudEntries: LogbookEntry[] = [];
      snapshot.forEach((docSnap) => {
        cloudEntries.push(docSnap.data() as LogbookEntry);
      });

      if (cloudEntries.length === 0 && !isInitialSyncRef.current) {
        // If cloud database is empty, only seed if local entries are real non-dummy entries!
        isInitialSyncRef.current = true;
        const localList = loadLogbookEntries().filter((e) => !isDummySampleEntry(e.id));
        if (localList.length > 0) {
          batchSyncEntriesToCloud(currentUser.uid, localList);
        } else {
          // New user starts completely blank
          setEntries([]);
          saveLogbookEntries([]);
        }
      } else if (cloudEntries.length > 0) {
        // MERGE: Keep union of local and cloud entries, never include dummy entries
        setEntries((prev) => {
          const map = new Map<string, LogbookEntry>();
          cloudEntries.filter((e) => !isDummySampleEntry(e.id)).forEach((cloudEntry) => {
            const local = prev.find((p) => p.id === cloudEntry.id);
            const fotoSebelum = cloudEntry.fotoSebelum || local?.fotoSebelum;
            const fotoSesudah = cloudEntry.fotoSesudah || local?.fotoSesudah;
            map.set(cloudEntry.id, {
              ...cloudEntry,
              fotoSebelum,
              fotoSesudah,
            });
          });
          // Preserve any local entries that aren't yet in cloud, and upload them
          prev.filter((e) => !isDummySampleEntry(e.id)).forEach((e) => {
            if (!map.has(e.id)) {
              map.set(e.id, e);
              syncEntryToCloud(currentUser.uid, e);
            }
          });
          const merged = sortLogbookEntriesByDateAscending(Array.from(map.values()));
          const { updatedEntries } = recoverAllLogbookPhotos(merged);
          saveLogbookEntries(updatedEntries);
          return updatedEntries;
        });
      }
    }, (error) => {
      console.warn('Firestore entries snapshot warning:', error);
      setIsSyncing(false);
    });

    // 2. Listen to user's Profile in Firestore
    const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'main');
    const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudProfile = docSnap.data() as UserProfile;
        setProfile((prev) => {
          const merged = { ...prev, ...cloudProfile };
          saveUserProfile(merged);
          return merged;
        });
      } else {
        // First time cloud sync: upload local profile
        const currentLocal = loadUserProfile();
        syncProfileToCloud(currentUser.uid, currentLocal);
      }
    }, (error) => {
      console.warn('Firestore profile snapshot warning:', error);
    });

    return () => {
      unsubscribeEntries();
      unsubscribeProfile();
    };
  }, [currentUser]);

  // Sync entries to local & cloud, always keeping sorted chronologically
  const handleSaveEntry = (newOrUpdatedEntry: LogbookEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === newOrUpdatedEntry.id);
      let updated: LogbookEntry[];
      if (exists) {
        updated = prev.map((e) => (e.id === newOrUpdatedEntry.id ? newOrUpdatedEntry : e));
      } else {
        updated = [...prev, newOrUpdatedEntry];
      }
      const sorted = sortLogbookEntriesByDateAscending(updated);
      saveLogbookEntries(sorted);
      return sorted;
    });

    // Save to high-capacity IndexedDB
    saveSingleEntryToIDB(newOrUpdatedEntry).catch((err) => {
      console.warn('IDB single save warning:', err);
    });

    // Sync to Firestore Cloud immediately if logged in
    if (currentUser) {
      syncEntryToCloud(currentUser.uid, newOrUpdatedEntry);
    }

    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveLogbookEntries(updated);
      return updated;
    });

    // Delete from IndexedDB
    deleteEntryFromIDB(id).catch((err) => {
      console.warn('IDB single delete warning:', err);
    });

    // Delete from Firestore Cloud immediately if logged in
    if (currentUser) {
      deleteEntryFromCloud(currentUser.uid, id);
    }

    if (editingEntry?.id === id) {
      setEditingEntry(null);
    }
  };

  const handleEditEntry = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportBackup = (imported: LogbookEntry[]) => {
    const sorted = sortLogbookEntriesByDateAscending(imported);
    setEntries(sorted);
    saveLogbookEntries(sorted);

    if (currentUser) {
      batchSyncEntriesToCloud(currentUser.uid, sorted);
    }
  };

  // Langsung susun tanggal secara berurutan dan sinkronkan ke Laporan Resmi & Cloud
  const handleSortAndSyncEntries = (sorted: LogbookEntry[]) => {
    const fullySorted = sortLogbookEntriesByDateAscending(sorted);
    setEntries(fullySorted);
    saveLogbookEntries(fullySorted);

    if (currentUser) {
      batchSyncEntriesToCloud(currentUser.uid, fullySorted);
    }
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    saveUserProfile(updatedProfile);

    // Sync to Firestore Cloud immediately if logged in
    if (currentUser) {
      syncProfileToCloud(currentUser.uid, updatedProfile);
    }
  };

  // Manual Trigger to force re-upload / sync local data to cloud
  const handleManualSync = useCallback(async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      await batchSyncEntriesToCloud(currentUser.uid, entries);
      await syncProfileToCloud(currentUser.uid, profile);
      alert('Data berhasil disinkronkan ke Cloud Firebase!');
    } catch (err: any) {
      alert('Gagal menyinkronkan data: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, entries, profile]);

  // Fitur Pemulihan Foto (Recovery): Mengembalikan seluruh foto dokumentasi yang hilang secara ketat sesuai tanggal
  const handleRecoverPhotos = useCallback((): { count: number; dates: string[] } => {
    let result = { count: 0, dates: [] as string[] };
    setEntries((prev) => {
      const { updatedEntries, recoveredCount, recoveredDates } = recoverAllLogbookPhotos(prev);
      result = { count: recoveredCount, dates: recoveredDates };
      saveLogbookEntries(updatedEntries);
      if (currentUser && recoveredCount > 0) {
        batchSyncEntriesToCloud(currentUser.uid, updatedEntries).catch((e) => {
          console.warn('Sync recovered photos to cloud warning:', e);
        });
      }
      return updatedEntries;
    });
    return result;
  }, [currentUser]);

  // Fitur Pemulihan Cadangan Data (Restore): Mengambil seluruh logbook dan foto dari Cloud Firestore
  const handleRestoreFromCloud = useCallback(async (): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!currentUser) {
      return { success: false, count: 0, error: 'Silakan masuk dengan akun Google terlebih dahulu untuk memulihkan data.' };
    }
    setIsSyncing(true);
    try {
      const { entries: cloudList, profile: cloudProfile } = await restoreUserDataFromCloud(currentUser.uid);
      if (!cloudList || cloudList.length === 0) {
        return { 
          success: false, 
          count: 0, 
          error: `Tidak ditemukan data cadangan di akun Google Cloud (${currentUser.email}). Pastikan akun Google yang Anda hubungkan sudah benar.` 
        };
      }

      const nonDummy = cloudList.filter((e) => !isDummySampleEntry(e.id));
      const targetList = nonDummy.length > 0 ? nonDummy : cloudList;
      const sorted = sortLogbookEntriesByDateAscending(targetList);
      const { updatedEntries } = recoverAllLogbookPhotos(sorted);

      saveLogbookEntries(updatedEntries);
      if (updatedEntries.length > 0) {
        for (const item of updatedEntries) {
          await saveSingleEntryToIDB(item);
        }
      }

      if (cloudProfile) {
        saveUserProfile(cloudProfile);
        setProfile(cloudProfile);
      }

      setEntries(updatedEntries);
      return { success: true, count: updatedEntries.length };
    } catch (err: any) {
      console.error('Failed to restore from cloud:', err);
      return { success: false, count: 0, error: err?.message || 'Gagal memulihkan cadangan data dari Google Cloud.' };
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  return (
    <div className="min-h-screen app-bg-gradient flex flex-col font-sans text-stone-900 selection:bg-emerald-400 selection:text-stone-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'form') setEditingEntry(null);
          setActiveTab(tab);
        }}
        profile={profile}
        officers={officerDirectory}
        onSelectProfile={handleSaveProfile}
        onRefreshOfficers={handleRefreshOfficers}
        isRefreshingOfficers={isRefreshingOfficers}
      />

      {/* Offline Status Alert */}
      <OfflineIndicator />

      {/* PWA App Update Notification & Feedback Toast */}
      <AppUpdateNotification />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 space-y-4">
        {activeTab === 'form' && (
          <LogbookForm
            onSaveEntry={handleSaveEntry}
            onCancelEdit={() => setEditingEntry(null)}
            editingEntry={editingEntry}
            onNavigateToReport={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'list' && (
          <LogbookList
            entries={entries}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onAddNew={() => {
              setEditingEntry(null);
              setActiveTab('form');
            }}
            onImportBackup={handleImportBackup}
            onRecoverPhotos={handleRecoverPhotos}
            onSortEntries={handleSortAndSyncEntries}
          />
        )}

        {activeTab === 'report' && (
          <OfficialReportView
            entries={entries}
            profile={profile}
            onUpdateEntry={handleSaveEntry}
            onRecoverPhotos={handleRecoverPhotos}
          />
        )}

        {activeTab === 'cloudsync' && (
          <CloudSyncView
            currentUser={currentUser}
            isSyncing={isSyncing}
            entriesCount={entries.length}
            profileEmail={profile.email}
            profileName={profile.nama}
            onAccountConnected={(acc) => setCurrentUser(acc)}
            onLogout={() => setCurrentUser(null)}
            onManualSync={currentUser ? handleManualSync : undefined}
            onRestoreFromCloud={handleRestoreFromCloud}
            onNavigateToProfile={() => setActiveTab('profile')}
            onNavigateToEpersonal={() => setActiveTab('epersonal')}
          />
        )}

        {activeTab === 'epersonal' && (
          <EPersonalView
            currentProfile={profile}
            officers={officerDirectory}
            onSelectProfile={handleSaveProfile}
            onNavigateToProfile={() => setActiveTab('profile')}
            onRefreshOfficers={handleRefreshOfficers}
            isRefreshingOfficers={isRefreshingOfficers}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onNavigateToEpersonal={() => setActiveTab('epersonal')}
            onNavigateToCloudSync={() => setActiveTab('cloudsync')}
          />
        )}
      </main>

      {/* Quiet Government Footer */}
      <footer className="bg-stone-950/85 backdrop-blur-md border-t border-emerald-500/20 py-6 px-4 sm:px-6 text-center text-xs text-stone-400 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-300">Logbook Kinerja Kps 1 manoko</span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span className="text-stone-300">Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian (PVTPP)</span>
          </div>
          <div className="text-stone-400">
            Kementerian Pertanian Republik Indonesia · Kebun Pemeriksaan Substantif Manoko, Lembang
          </div>
        </div>
      </footer>
    </div>
  );
}
