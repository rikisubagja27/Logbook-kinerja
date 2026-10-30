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
  mergeCloudNipDirectory,
  initRosterFromIDB,
  loadNipDirectory
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
  handleGoogleRedirectResult
} from './firebase';
import { 
  getAllEntriesFromIDB, 
  saveSingleEntryToIDB, 
  deleteEntryFromIDB 
} from './utils/idbStorage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Header } from './components/Header';
import { LogbookForm } from './components/LogbookForm';
import { LogbookList } from './components/LogbookList';
import { OfficialReportView } from './components/OfficialReportView';
import { EPersonalView } from './components/EPersonalView';
import { ProfileView } from './components/ProfileView';
import { PWAInstallButton } from './components/PWAInstallButton';
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

  // Firebase Real-time Cloud Synchronization State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
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
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        saveGoogleAccount({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Pegawai',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          provider: 'google.com',
          lastLogin: new Date().toISOString(),
        });
      } else {
        clearGoogleAccount();
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

    // 5. Load all entries from high-capacity IndexedDB to ensure daily entries are never lost
    getAllEntriesFromIDB().then((idbEntries) => {
      if (idbEntries && idbEntries.length > 0) {
        setEntries((prev) => {
          if (idbEntries.length >= prev.length) {
            return sortLogbookEntriesByDateAscending(idbEntries);
          }
          return prev;
        });
      }
    }).catch((err) => console.warn('IDB load warning:', err));

    return () => {
      unsubscribeAuth();
      unsubscribeEmployees();
      window.removeEventListener('kps-nip-directory-updated', handleDirectoryUpdated);
    };
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
        // If cloud database is empty, seed it with the current local entries so data is preserved!
        isInitialSyncRef.current = true;
        const localList = loadLogbookEntries();
        if (localList.length > 0) {
          batchSyncEntriesToCloud(currentUser.uid, localList);
        }
      } else if (cloudEntries.length > 0) {
        // Sort ascending by date
        const sorted = sortLogbookEntriesByDateAscending(cloudEntries);
        setEntries(sorted);
        saveLogbookEntries(sorted);
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
        {/* PWA Standalone Banner (auto-hides when installed in standalone mode) */}
        <div className="max-w-7xl mx-auto px-4 pt-2 sm:px-6 no-print print:hidden">
          <PWAInstallButton variant="banner" />
        </div>

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
          />
        )}

        {activeTab === 'report' && (
          <OfficialReportView
            entries={entries}
            profile={profile}
            onUpdateEntry={handleSaveEntry}
          />
        )}

        {activeTab === 'cloudsync' && (
          <CloudSyncView
            currentUser={currentUser}
            isSyncing={isSyncing}
            entriesCount={entries.length}
            onManualSync={currentUser ? handleManualSync : undefined}
            onNavigateToProfile={() => setActiveTab('profile')}
            onNavigateToEpersonal={() => setActiveTab('epersonal')}
          />
        )}

        {activeTab === 'epersonal' && (
          <EPersonalView
            currentProfile={profile}
            onSelectProfile={handleSaveProfile}
            onNavigateToProfile={() => setActiveTab('profile')}
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
